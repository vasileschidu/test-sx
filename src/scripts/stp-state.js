/**
 * Global STP state store for dashboard pages.
 * Source of truth: localStorage key.
 */
(function () {
  "use strict";

  // v3: global STP setup progression state.
  var STORAGE_KEY = "sx_global_stp_state_v3";
  var LEGACY_STATUS_KEY = "sx_global_stp_status_v2";
  var STATUS_ENABLED = "enabled";
  var STATUS_DISABLED = "disabled";
  var STATUS_IN_PROGRESS = "in_progress";
  var STEP_OPT_IN_REQUIRED = "opt_in_required";
  var STEP_TERMINAL_COMPLETED = "terminal_completed_tid_mid_received";
  var STEP_BANK_VERIFICATION_REQUIRED = "bank_verification_required";
  var STEP_AGREEMENT_SIGNATURE_PENDING = "agreement_signature_pending";
  var STEP_COMPLETED = "completed";
  // Who the Visa agreement email went to and when, for the pending banner.
  var AGREEMENT_REQUEST_KEY = "sx_stp_agreement_request_v1";
  // Who accepted the Visa agreement in the portal and when ("Confirmed at").
  var AGREEMENT_SIGNATURE_KEY = "sx_stp_agreement_signature_v1";
  var RUNTIME_CONFIG_PATHS = [
    "../../../src/data/public-runtime-config.json",
    "/src/data/public-runtime-config.json",
    "./src/data/public-runtime-config.json",
  ];
  var runtimeConfigPromise = null;
  var listeners = [];

  function normalizeStatus(value) {
    if (
      value === STATUS_ENABLED ||
      value === STATUS_DISABLED ||
      value === STATUS_IN_PROGRESS
    )
      return value;
    return STATUS_DISABLED;
  }

  function normalizeStep(value) {
    if (
      value === STEP_OPT_IN_REQUIRED ||
      value === STEP_TERMINAL_COMPLETED ||
      value === STEP_BANK_VERIFICATION_REQUIRED ||
      value === STEP_AGREEMENT_SIGNATURE_PENDING ||
      value === STEP_COMPLETED
    )
      return value;
    return STEP_OPT_IN_REQUIRED;
  }

  function stateFromStatus(status) {
    var normalized = normalizeStatus(status);
    if (normalized === STATUS_ENABLED) {
      return { stpStatus: STATUS_ENABLED, stpStep: STEP_COMPLETED };
    }
    if (normalized === STATUS_IN_PROGRESS) {
      return {
        stpStatus: STATUS_IN_PROGRESS,
        stpStep: STEP_BANK_VERIFICATION_REQUIRED,
      };
    }
    return { stpStatus: STATUS_DISABLED, stpStep: STEP_OPT_IN_REQUIRED };
  }

  function normalizeState(input) {
    var stpStatus = normalizeStatus(input && input.stpStatus);
    var stpStep = normalizeStep(input && input.stpStep);
    if (stpStatus === STATUS_ENABLED) stpStep = STEP_COMPLETED;
    else if (stpStatus === STATUS_DISABLED) stpStep = STEP_OPT_IN_REQUIRED;
    else if (stpStep === STEP_OPT_IN_REQUIRED || stpStep === STEP_COMPLETED)
      stpStep = STEP_BANK_VERIFICATION_REQUIRED;
    return { stpStatus: stpStatus, stpStep: stpStep };
  }

  function readStoredState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return normalizeState(JSON.parse(raw));
      }
      // Backward compatibility with legacy status-only key.
      var legacy = normalizeStatus(localStorage.getItem(LEGACY_STATUS_KEY));
      if (legacy === STATUS_ENABLED) return stateFromStatus(STATUS_ENABLED);
      return { stpStatus: STATUS_DISABLED, stpStep: STEP_OPT_IN_REQUIRED };
    } catch (error) {
      return { stpStatus: STATUS_DISABLED, stpStep: STEP_OPT_IN_REQUIRED };
    }
  }

  var currentState = readStoredState();

  function notify() {
    listeners.slice().forEach(function (listener) {
      try {
        listener(currentState.stpStatus, currentState);
      } catch (error) {
        console.error("STPState listener failed:", error);
      }
    });
    window.dispatchEvent(
      new CustomEvent("sx:stp-status-change", {
        detail: {
          status: currentState.stpStatus,
          stpStatus: currentState.stpStatus,
          stpStep: currentState.stpStep,
        },
      }),
    );
  }

  function persistState(nextState) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    } catch (error) {
      console.error("Unable to persist STP status:", error);
    }
  }

  function getStpStatus() {
    return currentState.stpStatus;
  }

  function getStpState() {
    return {
      stpStatus: currentState.stpStatus,
      stpStep: currentState.stpStep,
    };
  }

  function setStpStatus(nextStatus) {
    var nextState = stateFromStatus(nextStatus);
    if (
      nextState.stpStatus === currentState.stpStatus &&
      nextState.stpStep === currentState.stpStep
    ) {
      return currentState.stpStatus;
    }
    currentState = nextState;
    persistState(currentState);
    notify();
    return currentState.stpStatus;
  }

  function setStpStep(nextStep) {
    var normalizedStep = normalizeStep(nextStep);
    var nextState;
    if (normalizedStep === STEP_COMPLETED)
      nextState = { stpStatus: STATUS_ENABLED, stpStep: STEP_COMPLETED };
    else if (normalizedStep === STEP_OPT_IN_REQUIRED)
      nextState = { stpStatus: STATUS_DISABLED, stpStep: STEP_OPT_IN_REQUIRED };
    else nextState = { stpStatus: STATUS_IN_PROGRESS, stpStep: normalizedStep };
    if (nextState.stpStep !== STEP_AGREEMENT_SIGNATURE_PENDING) {
      clearAgreementRequest();
    }
    if (nextState.stpStep === STEP_OPT_IN_REQUIRED) {
      try {
        localStorage.removeItem(AGREEMENT_SIGNATURE_KEY);
      } catch (error) {}
    }
    if (
      nextState.stpStatus === currentState.stpStatus &&
      nextState.stpStep === currentState.stpStep
    ) {
      return currentState.stpStep;
    }
    currentState = nextState;
    persistState(currentState);
    notify();
    return currentState.stpStep;
  }

  function getAgreementRequest() {
    try {
      var raw = localStorage.getItem(AGREEMENT_REQUEST_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      return parsed && parsed.email ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function saveAgreementRequest(request) {
    try {
      localStorage.setItem(AGREEMENT_REQUEST_KEY, JSON.stringify(request));
    } catch (error) {
      console.error("Unable to persist STP agreement request:", error);
    }
  }

  // "An email was sent to [email] on [date] at [time]" from the Figma banner.
  function getAgreementSentText() {
    var request = getAgreementRequest();
    if (!request) return "An email was sent to sign the Visa agreement.";
    var sentAt = new Date(request.sentAt);
    // Non-allowlisted addresses never get the email (test mode).
    var lead =
      request.delivered === false
        ? "Test mode, no email delivered to "
        : "An email was sent to ";
    if (isNaN(sentAt.getTime())) return lead + request.email + ".";
    return (
      lead +
      request.email +
      " on " +
      sentAt.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }) +
      " at " +
      sentAt.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    );
  }

  function getAgreementSignature() {
    try {
      var raw = localStorage.getItem(AGREEMENT_SIGNATURE_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      return parsed && parsed.signedAt ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function saveAgreementSignature(signature) {
    try {
      localStorage.setItem(AGREEMENT_SIGNATURE_KEY, JSON.stringify(signature));
    } catch (error) {
      console.error("Unable to persist STP agreement signature:", error);
    }
  }

  function clearAgreementRequest() {
    try {
      localStorage.removeItem(AGREEMENT_REQUEST_KEY);
    } catch (error) {}
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  }

  function loadRuntimeConfig() {
    if (runtimeConfigPromise) return runtimeConfigPromise;
    var load =
      window.DataSource && typeof window.DataSource.load === "function"
        ? window.DataSource.load(RUNTIME_CONFIG_PATHS)
        : fetch(RUNTIME_CONFIG_PATHS[0]).then(function (response) {
            if (!response.ok) throw new Error("Config not found");
            return response.json();
          });
    runtimeConfigPromise = Promise.resolve(load)
      .catch(function () {
        return {};
      })
      .then(function (config) {
        return {
          tokenServiceBaseUrl: String(
            (config && config.tokenServiceBaseUrl) || "",
          )
            .trim()
            .replace(/\/+$/, ""),
          allowedTestEmails: (Array.isArray(config && config.allowedTestEmails)
            ? config.allowedTestEmails
            : []
          )
            .map(function (email) {
              return String(email || "")
                .trim()
                .toLowerCase();
            })
            .filter(Boolean),
        };
      });
    return runtimeConfigPromise;
  }

  function isAllowlistedEmail(email) {
    var normalized = String(email || "")
      .trim()
      .toLowerCase();
    return loadRuntimeConfig().then(function (config) {
      return config.allowedTestEmails.indexOf(normalized) !== -1;
    });
  }

  // Sends the Visa agreement email through the same token service as
  // SMART Disburse. Like SMART Disburse test sends, only allowlisted
  // addresses get a real email; any other address moves the setup to
  // "Pending Agreement Signature" without sending anything.
  function sendAgreementEmail(options) {
    options = options || {};
    var email = String(options.email || "").trim();
    if (!isValidEmail(email)) {
      return Promise.reject(new Error("Enter a valid email address."));
    }
    return loadRuntimeConfig().then(function (config) {
      var normalized = email.toLowerCase();
      var allowed = config.allowedTestEmails.indexOf(normalized) !== -1;
      var finish = function (result) {
        var wasPending =
          currentState.stpStep === STEP_AGREEMENT_SIGNATURE_PENDING;
        saveAgreementRequest({
          email: email,
          recipientName: String(options.recipientName || "").trim(),
          note: String(options.note || "").trim(),
          sentAt: new Date().toISOString(),
          delivered: result.delivered,
        });
        setStpStep(STEP_AGREEMENT_SIGNATURE_PENDING);
        // A resend keeps the same step, so listeners would not hear about
        // the new address and time otherwise.
        if (wasPending) notify();
        return result;
      };
      if (!allowed) {
        return finish({ email: email, delivered: false, allowed: false });
      }
      if (!config.tokenServiceBaseUrl) {
        throw new Error("Email service is not configured for this environment.");
      }
      return fetch(config.tokenServiceBaseUrl + "/send-test-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flow: "stp",
          email: email,
          recipientName: String(options.recipientName || "").trim(),
          senderName: String(options.senderName || "SMART Hub").trim(),
          sandbox: false,
          verifyBaseUrl: window.location.origin + window.location.pathname,
        }),
      })
        .then(function (response) {
          return response
            .json()
            .catch(function () {
              return {};
            })
            .then(function (payload) {
              if (!response.ok || payload.ok === false) {
                throw new Error(
                  payload.error || "Request failed with " + response.status,
                );
              }
              return payload;
            });
        })
        .catch(function (error) {
          if (error && error.message === "Failed to fetch") {
            throw new Error(
              "Could not reach the email service. Refresh the page and try again.",
            );
          }
          throw error;
        })
        .then(function (payload) {
          return finish({
            email: email,
            delivered: payload.delivery === "brevo",
            allowed: true,
          });
        });
    });
  }

  function subscribe(listener) {
    if (typeof listener !== "function") return function () {};
    listeners.push(listener);
    listener(currentState.stpStatus, currentState);
    return function unsubscribe() {
      listeners = listeners.filter(function (item) {
        return item !== listener;
      });
    };
  }

  var STP_ASSET_ROOT = "../../../src/assets/";
  var AGREEMENT_PAGE_COUNT = 8;
  var CLOSE_ICON_20 =
    '<svg viewBox="0 0 20 20" fill="currentColor" class="size-5" aria-hidden="true"><path fill-rule="evenodd" d="M4.22 4.22a.75.75 0 0 1 1.06 0L10 8.94l4.72-4.72a.75.75 0 1 1 1.06 1.06L11.06 10l4.72 4.72a.75.75 0 1 1-1.06 1.06L10 11.06l-4.72 4.72a.75.75 0 1 1-1.06-1.06L8.94 10 4.22 5.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>';

  // Something on the page cancels the native Escape close of <dialog>, so
  // the STP dialogs close themselves (unless busy).
  function closeOnEscape(dialog, isBusy) {
    dialog.addEventListener("cancel", function (event) {
      event.preventDefault();
      if (isBusy && isBusy()) return;
      if (dialog.open) dialog.close();
    });
  }

  function ensureInlineOptInStyles() {
    if (document.getElementById("sx-inline-stp-style")) return;
    var style = document.createElement("style");
    style.id = "sx-inline-stp-style";
    style.textContent =
      "#sx-inline-stp-dialog .pp-stp-modal-card-figure {" +
      "  transform: translateY(-1.5rem);" +
      "  transform-origin: center;" +
      "}" +
      '#sx-inline-stp-dialog[data-card-animating="true"] .pp-stp-modal-card-figure {' +
      "  animation: ppStpCardPayLoop 8000ms cubic-bezier(0.16, 1, 0.3, 1) infinite;" +
      "}" +
      "@keyframes ppStpCardPayLoop {" +
      "  0% { opacity: 0; transform: translate3d(-96px, -180px, 0) rotate(-18deg) skewX(-8deg) scale(0.92); }" +
      "  18% { opacity: 1; transform: translate3d(0, calc(-0.95rem - 58px), 0) rotate(0deg) skewX(0deg) scale(1); animation-timing-function: ease-in-out; }" +
      "  32% { opacity: 1; transform: translate3d(0, -0.1rem, 0) rotate(0deg) skewX(0deg) scale(1); animation-timing-function: ease-in-out; }" +
      "  42% { opacity: 1; transform: translate3d(0, -0.1rem, 0) rotate(0deg) skewX(0deg) scale(1); animation-timing-function: ease-in-out; }" +
      "  55% { opacity: 1; transform: translate3d(0, calc(-0.95rem - 58px), 0) rotate(0deg) skewX(0deg) scale(1); }" +
      "  88.75% { opacity: 1; transform: translate3d(0, calc(-0.95rem - 58px), 0) rotate(0deg) skewX(0deg) scale(1); animation-timing-function: ease-in; }" +
      "  100% { opacity: 0; transform: translate3d(96px, calc(-0.95rem - 58px), 0) rotate(18deg) skewX(8deg) scale(0.92); }" +
      "}" +
      "@media (prefers-reduced-motion: reduce) {" +
      '  #sx-inline-stp-dialog[data-card-animating="true"] .pp-stp-modal-card-figure { animation: none; }' +
      "  #sx-inline-stp-dialog .pp-stp-modal-card-figure { opacity: 1; transform: translateY(-0.85rem); }" +
      "}";
    document.head.appendChild(style);
  }

  // One blurred decorative ellipse of the illustration panel (Figma
  // "Ellipse 11052"). The SVG keeps its own root size; the wrapper only
  // positions and rotates it.
  function ellipseMarkup(file, boxClass, innerClass) {
    return (
      '<div class="absolute flex items-center justify-center ' +
      boxClass +
      '">' +
      '<div class="relative shrink-0 opacity-30 ' +
      innerClass +
      '">' +
      '<img src="' +
      STP_ASSET_ROOT +
      "stp-agreement/" +
      file +
      '" alt="" class="absolute top-1/2 left-1/2 block max-w-none -translate-x-1/2 -translate-y-1/2" />' +
      "</div></div>"
    );
  }

  function howItWorksItem(index, text) {
    return (
      '<li class="flex items-start gap-3">' +
      '<span class="flex w-5 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-100 py-0.5 text-xs/4 font-medium text-gray-800 dark:border-white/10 dark:bg-white/10 dark:text-gray-200">' +
      index +
      "</span>" +
      '<p class="min-w-0 flex-1 text-sm/5 font-normal text-gray-900 dark:text-gray-300">' +
      text +
      "</p>" +
      "</li>"
    );
  }

  var FIELD_INPUT_CLASS =
    "block h-10 w-full rounded-md bg-white px-3 text-base/6 font-medium text-gray-900 shadow-xs outline-1 -outline-offset-1 outline-gray-300 placeholder:font-normal placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500";
  var FIELD_LABEL_CLASS =
    "text-sm/5 font-medium text-gray-700 dark:text-gray-200";
  var SMALL_PRIMARY_BUTTON_CLASS =
    "inline-flex w-fit items-center justify-center rounded-md bg-blue-600 px-2.5 py-1.5 text-sm/5 font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-blue-600";

  function escapeText(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function textFieldMarkup(id, label, type, placeholder, attrs) {
    return (
      '<div class="flex flex-col gap-1">' +
      '<label for="' +
      id +
      '" class="' +
      FIELD_LABEL_CLASS +
      '">' +
      label +
      "</label>" +
      '<input id="' +
      id +
      '" type="' +
      type +
      '" placeholder="' +
      placeholder +
      '" ' +
      attrs +
      ' class="' +
      FIELD_INPUT_CLASS +
      '" />' +
      "</div>"
    );
  }

  // One "Are you authorized to sign?" option. Selecting it expands its form
  // under the option (Figma: "Yes" / "No" option cards).
  function signerOptionMarkup(value, label, formHtml) {
    return (
      '<div class="flex flex-col">' +
      '<label class="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-4 has-checked:rounded-b-none has-checked:bg-gray-50 dark:border-white/10 dark:has-checked:bg-white/5">' +
      '<input type="radio" name="sx-stp-signer" value="' +
      value +
      '" data-inline-stp-signer class="relative size-4 shrink-0 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white not-checked:before:hidden checked:border-blue-600 checked:bg-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-white/20 dark:bg-white/5 dark:checked:border-blue-500 dark:checked:bg-blue-500" />' +
      '<span class="text-sm/5 font-medium text-slate-950 dark:text-white">' +
      label +
      "</span>" +
      "</label>" +
      '<div data-inline-stp-signer-form="' +
      value +
      '" class="-mt-px hidden flex-col gap-4 rounded-b-lg border border-gray-200 p-4 dark:border-white/10">' +
      formHtml +
      "</div>" +
      "</div>"
    );
  }

  function selfSignFormMarkup() {
    return (
      textFieldMarkup(
        "sx-stp-self-first-name",
        "First Name",
        "text",
        "Enter first name",
        'autocomplete="given-name" data-self-field',
      ) +
      textFieldMarkup(
        "sx-stp-self-last-name",
        "Last Name",
        "text",
        "Enter last name",
        'autocomplete="family-name" data-self-field',
      ) +
      '<p class="rounded-md border border-gray-200 bg-gray-50 p-2 text-xs/4 font-normal text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">Please confirm acceptance of the VISA AR Manager Participation Agreement.</p>' +
      '<button type="button" data-inline-stp-accept disabled class="' +
      SMALL_PRIMARY_BUTTON_CLASS +
      '">Confirm Acceptance</button>'
    );
  }

  function delegateFormMarkup() {
    return (
      textFieldMarkup(
        "sx-stp-signer-first-name",
        "First Name",
        "text",
        "Enter first name",
        'autocomplete="off" data-delegate-field',
      ) +
      textFieldMarkup(
        "sx-stp-signer-last-name",
        "Last Name",
        "text",
        "Enter last name",
        'autocomplete="off" data-delegate-field',
      ) +
      textFieldMarkup(
        "sx-stp-signer-email",
        "Email",
        "email",
        "example@email.com",
        'autocomplete="off" data-delegate-field',
      ) +
      '<div class="flex flex-col gap-2">' +
      '<div class="flex flex-col gap-1">' +
      '<label for="sx-stp-signer-note" class="' +
      FIELD_LABEL_CLASS +
      '">Note</label>' +
      '<textarea id="sx-stp-signer-note" rows="2" maxlength="100" aria-describedby="sx-stp-signer-note-hint" data-delegate-field class="block w-full rounded-md bg-white px-3 py-2 text-base/6 font-medium text-gray-900 shadow-xs outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 dark:bg-white/5 dark:text-white dark:outline-white/10"></textarea>' +
      "</div>" +
      '<p id="sx-stp-signer-note-hint" class="text-sm/5 font-normal text-gray-500 dark:text-gray-400">Maximum 100 characters</p>' +
      "</div>" +
      '<p data-inline-stp-delegate-error role="alert" class="hidden text-sm/5 font-normal text-red-600 dark:text-red-400"></p>' +
      '<button type="button" data-inline-stp-delegate disabled class="' +
      SMALL_PRIMARY_BUTTON_CLASS +
      '">Send signing request</button>'
    );
  }

  function summaryRowMarkup(label, valueHtml) {
    return (
      '<div class="flex flex-wrap gap-y-1">' +
      '<dt class="min-w-[180px] flex-1 text-sm/5 font-medium text-gray-900 dark:text-white">' +
      label +
      "</dt>" +
      '<dd class="min-w-[180px] flex-1 text-sm/5 font-normal break-words text-gray-600 dark:text-gray-400">' +
      valueHtml +
      "</dd>" +
      "</div>"
    );
  }

  function statusBadgeMarkup(tone, label) {
    var tones = {
      green:
        "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300",
      blue: "border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-300",
    };
    return (
      '<span class="inline-flex items-center rounded-sm border px-2 py-0.5 text-xs/4 font-medium ' +
      tones[tone] +
      '">' +
      label +
      "</span>"
    );
  }

  // Figma: "Acknowledgement complete" / "Waiting for acknowledgement".
  function summaryCardMarkup(title, rowsHtml, footerHtml) {
    var divider = '<div class="h-px bg-gray-200 dark:bg-white/10"></div>';
    return (
      '<div class="flex flex-col gap-4 rounded-lg border border-gray-200 py-4 dark:border-white/10">' +
      '<p class="px-4 text-sm/5 font-semibold text-gray-900 dark:text-white">' +
      title +
      "</p>" +
      divider +
      '<dl class="flex flex-col gap-2 px-4">' +
      rowsHtml +
      "</dl>" +
      (footerHtml
        ? divider +
          '<p class="px-4 text-sm/5 font-normal text-gray-500 dark:text-gray-400">' +
          footerHtml +
          "</p>"
        : "") +
      "</div>"
    );
  }

  function formatSignedAt(date) {
    return date.toLocaleString("en-US");
  }

  function formatSentAt(date) {
    return date.toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function delegateNoticeMarkup(name) {
    return (
      '<span class="font-medium text-gray-700 dark:text-gray-200">' +
      escapeText(name) +
      "</span> will receive an email with a secure link to review and acknowledge the Visa AR Manager Participation Agreement."
    );
  }

  var STEP_CHECK_ICON =
    '<svg viewBox="0 0 20 20" fill="currentColor" class="size-3.5" aria-hidden="true"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd"/></svg>';

  // Timeline row of the "complete the steps below" view. status is "done",
  // "current" or "todo"; the connector below a row is blue until the
  // current step and gray after it.
  function setupStepMarkup(index, title, opts) {
    var status = opts.status;
    var badgeClass =
      status === "done"
        ? "size-5 border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500"
        : status === "current"
          ? "w-5 border-blue-400 bg-blue-100 py-0.5 text-xs/4 font-medium text-blue-700 dark:border-blue-400 dark:bg-blue-400/10 dark:text-blue-300"
          : "w-5 border-gray-200 bg-gray-100 py-0.5 text-xs/4 font-medium text-gray-800 dark:border-white/10 dark:bg-white/10 dark:text-gray-200";
    var gray = "w-[1.5px] bg-gray-200 dark:bg-white/10";
    var connector = opts.last
      ? ""
      : status === "done"
        ? '<span class="w-[1.5px] flex-1 bg-blue-600 dark:bg-blue-500"></span>'
        : status === "current"
          ? '<span class="w-[1.5px] flex-1 bg-blue-400"></span><span class="h-2.5 ' +
            gray +
            '"></span>'
          : '<span class="flex-1 ' + gray + '"></span>';
    var leadIn = opts.first
      ? ""
      : '<span class="h-2.5 ' +
        (opts.previousDone ? "w-[1.5px] bg-blue-600 dark:bg-blue-500" : gray) +
        '"></span>';
    return (
      '<li class="flex gap-3"' +
      (status === "current" ? ' aria-current="step"' : "") +
      ">" +
      '<div class="flex w-5 shrink-0 flex-col items-center" aria-hidden="true">' +
      leadIn +
      '<span class="flex items-center justify-center rounded-full border-[1.5px] ' +
      badgeClass +
      '">' +
      (status === "done" ? STEP_CHECK_ICON : index) +
      "</span>" +
      connector +
      "</div>" +
      '<div class="flex min-w-0 flex-1 flex-col gap-2.5 ' +
      (opts.first ? "pb-3" : opts.last ? "py-2" : "pt-2 pb-3") +
      '">' +
      '<p class="text-sm/5 font-medium text-slate-950 dark:text-white">' +
      title +
      (status === "done" ? '<span class="sr-only"> (completed)</span>' : "") +
      "</p>" +
      (opts.bodyHtml || "") +
      "</div>" +
      "</li>"
    );
  }

  var STEP_BODY_CLASS =
    "text-sm/5 font-normal text-gray-700 dark:text-gray-300";
  var STEP_BUTTON_CLASS =
    "inline-flex w-fit items-center justify-center rounded-md bg-blue-600 px-2.5 py-1.5 text-sm/5 font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

  // Which set up step is current for the stored STP state (1-4; 5 = all done).
  function currentSetupStep() {
    if (currentState.stpStep === STEP_COMPLETED) return 5;
    if (currentState.stpStep === STEP_BANK_VERIFICATION_REQUIRED) return 3;
    if (currentState.stpStep === STEP_TERMINAL_COMPLETED) return 2;
    return 1;
  }

  function setupStepsMarkup() {
    var current = currentSetupStep();
    var request = getAgreementRequest();
    function status(index) {
      return index < current ? "done" : index === current ? "current" : "todo";
    }
    function opts(index, bodyHtml) {
      return {
        status: status(index),
        first: index === 1,
        last: index === 4,
        previousDone: index > 1 && status(index - 1) === "done",
        bodyHtml: bodyHtml || "",
      };
    }

    var agreementBody = "";
    if (current === 1 && request) {
      var sentAt = new Date(request.sentAt);
      agreementBody =
        (isNaN(sentAt.getTime())
          ? ""
          : '<p class="-mt-2 ' +
            STEP_BODY_CLASS +
            '">Sent - ' +
            formatSentAt(sentAt) +
            "</p>") +
        '<p class="' +
        STEP_BODY_CLASS +
        '"><span class="font-medium text-slate-950 dark:text-white">' +
        escapeText(request.recipientName || request.email) +
        "</span> will receive an email with a secure link to review and acknowledge the Visa AR Manager Participation Agreement.</p>";
    } else if (current === 1) {
      agreementBody =
        '<p class="' +
        STEP_BODY_CLASS +
        '">Review and sign the Visa AR Manager Participation Agreement.</p>' +
        '<button type="button" data-stp-agreement-review-trigger="setup-steps" class="' +
        STEP_BUTTON_CLASS +
        '">Review agreement</button>';
    }

    if (current > 1) {
      var signature = getAgreementSignature();
      var signedAt = signature ? new Date(signature.signedAt) : null;
      if (signedAt && !isNaN(signedAt.getTime())) {
        agreementBody =
          '<p class="-mt-2 ' +
          STEP_BODY_CLASS +
          '">Confirmed at - ' +
          formatSentAt(signedAt) +
          "</p>";
      }
    }

    var paymentBody =
      current === 2
        ? '<p class="' +
          STEP_BODY_CLASS +
          '">Use the provided virtual card to run a <span class="font-medium text-slate-950 dark:text-white">$0 transaction.</span> This will give us the information we need to confirm eligibility</p>' +
          verificationCardThumbMarkup()
        : "";
    var verifyBody =
      current === 3
        ? '<p class="' +
          STEP_BODY_CLASS +
          '">We will send a small test deposit to your bank account. You will need to confirm the exact amount to complete setup.</p>' +
          '<button type="button" data-stp-verify-trigger="setup-steps" class="' +
          STEP_BUTTON_CLASS +
          '">Verify now</button>'
        : "";

    return (
      setupStepMarkup(
        1,
        current === 1
          ? "Pending Agreement Signature"
          : "Agreement Signature (Acknowledged)",
        opts(1, agreementBody),
      ) +
      setupStepMarkup(
        2,
        "Process the Verification Card",
        opts(2, paymentBody),
      ) +
      setupStepMarkup(
        3,
        "Verify Your Bank Account (Micro Deposit)",
        opts(3, verifyBody),
      ) +
      setupStepMarkup(
        4,
        "Automatic Card Processing Setup Complete",
        opts(4),
      )
    );
  }

  // Figma: SMART Exchange / Scenario 5 "STP Enabled Later in Portal" and
  // "Step 1. Agreement Signature (Acknowledged)".
  // Steps: "intro" (Enable Automatic Card Processing), "learn" (the same,
  // read-only), "review" (Review & Sign Agreement) and "steps" (complete the
  // steps below, after delegating the signature).
  function ensureInlineOptInDialog() {
    var existing = document.getElementById("sx-inline-stp-dialog");
    if (existing) return existing;

    ensureInlineOptInStyles();

    var dialog = document.createElement("dialog");
    dialog.id = "sx-inline-stp-dialog";
    dialog.setAttribute("aria-labelledby", "sx-inline-stp-title");
    dialog.className =
      "fixed inset-0 m-0 size-auto max-h-none max-w-none border-0 p-0 bg-transparent backdrop:bg-transparent";
    dialog.innerHTML =
      '<div class="fixed inset-0 z-[100] bg-gray-900/75 transition-opacity duration-300 ease-out motion-reduce:transition-none"></div>' +
      '<div class="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">' +
      '  <div data-inline-stp-panel class="relative flex max-h-[calc(100vh-2rem)] w-full max-w-[800px] flex-col overflow-y-auto rounded-3xl bg-white shadow-xl md:grid md:h-[752px] md:grid-cols-3 md:gap-2 md:overflow-hidden md:p-2 dark:bg-gray-900 dark:ring-1 dark:ring-white/10">' +
      '    <button type="button" data-inline-stp-close class="absolute top-4 right-4 z-20 rounded-md bg-gray-100 p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-white/10 dark:text-gray-400 dark:hover:bg-white/20 dark:hover:text-gray-200">' +
      '      <span class="sr-only">Close</span>' +
      CLOSE_ICON_20 +
      "    </button>" +
      '    <div class="relative shrink-0 p-2 md:p-0">' +
      '      <div class="relative h-[220px] overflow-hidden rounded-2xl md:h-full" style="background-image: linear-gradient(180deg, #ECF2FF 0%, #F8F4FF 100%);">' +
      '        <div class="pointer-events-none absolute inset-x-0 top-[calc(50%-308px)] h-[68px]" aria-hidden="true">' +
      ellipseMarkup(
        "ellipse-top-1.svg",
        "top-[-67.08px] left-[-115.29px] h-[229.764px] w-[496.082px]",
        "h-[110.605px] w-[483.853px] rotate-[-14.7deg]",
      ) +
      ellipseMarkup(
        "ellipse-top-2.svg",
        "top-[-80.07px] left-[-109.4px] h-[293.122px] w-[526.571px]",
        "h-[131.768px] w-[511.741px] rotate-[-19.25deg]",
      ) +
      "        </div>" +
      '        <div class="absolute inset-0 md:inset-x-0 md:top-[calc(50%-240px)] md:bottom-auto md:h-[480px]">' +
      '          <img data-inline-stp-terminal src="' +
      STP_ASSET_ROOT +
      'illustrations/terminal.svg" alt="" class="absolute -bottom-[100px] left-1/2 h-[192px] w-[332px] max-w-none -translate-x-[56%] md:bottom-[80px]" />' +
      '          <div class="absolute inset-0 flex -translate-x-3 items-center justify-center">' +
      '            <img data-inline-stp-card src="' +
      STP_ASSET_ROOT +
      'illustrations/card.svg" alt="" class="pp-stp-modal-card-figure h-[169px] w-[292px] max-w-none" />' +
      "          </div>" +
      "        </div>" +
      '        <div class="pointer-events-none absolute inset-x-0 top-[calc(50%+240px)] h-[68px]" aria-hidden="true">' +
      ellipseMarkup(
        "ellipse-bottom-1.svg",
        "top-[-17.08px] left-[-195.29px] h-[229.764px] w-[496.082px]",
        "h-[110.605px] w-[483.853px] rotate-[-14.7deg]",
      ) +
      ellipseMarkup(
        "ellipse-bottom-2.svg",
        "top-[-30.07px] left-[-189.4px] h-[293.122px] w-[526.571px]",
        "h-[131.768px] w-[511.741px] rotate-[-19.25deg]",
      ) +
      "        </div>" +
      "      </div>" +
      "    </div>" +
      '    <div data-inline-stp-content class="flex min-w-0 flex-1 flex-col gap-9 px-4 pt-4 md:col-span-2 md:min-h-0 md:min-w-[360px] md:px-0 md:pt-0">' +
      '      <div data-inline-stp-scroll class="flex flex-col md:min-h-0 md:flex-1 md:overflow-y-auto md:px-9 md:pt-9">' +
      // Step 1: Enable Automatic Card Processing
      '      <div data-inline-stp-step="intro" class="flex flex-col gap-6">' +
      '        <h2 id="sx-inline-stp-title" class="pr-10 text-2xl/8 font-semibold text-slate-950 md:text-3xl/9 dark:text-white">Enable Automatic Card Processing</h2>' +
      '        <p class="text-base/6 font-normal text-slate-950 md:text-lg/6 dark:text-gray-100">Say goodbye to manual card processing. Once enrolled, VISA will securely transmit your transactions to your existing merchant processor. No more manual work on your side.</p>' +
      '        <div class="flex flex-col gap-4">' +
      '          <p class="text-sm/5 font-semibold text-gray-900 dark:text-white">How it works:</p>' +
      '          <ol class="flex flex-col gap-4">' +
      howItWorksItem(
        1,
        "Continue processing payments manually until set up is complete.",
      ) +
      howItWorksItem(
        2,
        "We’ll confirm eligibility and initiate one small (micro) deposit into the account the business currently uses to settle card payments (typically deposited in 2-3 business days).",
      ) +
      howItWorksItem(
        3,
        "Verify the micro deposit and set up is complete (Opt-out is available).",
      ) +
      "          </ol>" +
      "        </div>" +
      "      </div>" +
      // Step 2: Review & Sign Agreement
      '      <div data-inline-stp-step="review" class="hidden flex-col gap-6">' +
      '        <div data-inline-stp-review-top class="flex flex-col gap-2">' +
      '          <h2 class="pr-10 text-2xl/8 font-semibold text-slate-950 md:text-3xl/9 dark:text-white">Review &amp; Sign Agreement</h2>' +
      '          <p class="text-sm/5 font-normal text-gray-700 dark:text-gray-300">Signing the attached agreement allows your company to participate in automated card processing through the Visa network.</p>' +
      "        </div>" +
      '        <div data-inline-stp-review-pending class="flex flex-col gap-1 rounded-lg bg-gray-50 p-4 dark:bg-white/5">' +
      '          <div class="flex items-start gap-3">' +
      '            <img src="' +
      STP_ASSET_ROOT +
      'stp-agreement/icon-agreement-20.svg" alt="" width="20" height="20" class="size-5 shrink-0" />' +
      '            <p class="min-w-0 flex-1 text-sm/5 font-semibold text-slate-950 dark:text-white">Visa AR Manager Participation Agreement</p>' +
      "          </div>" +
      '          <div class="pl-8">' +
      '            <button type="button" data-inline-stp-review-agreement class="cursor-pointer rounded-sm text-sm/5 font-semibold text-blue-600 underline hover:text-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-blue-400 dark:hover:text-blue-300">Review agreement</button>' +
      "          </div>" +
      "        </div>" +
      '        <div data-inline-stp-review-opened class="relative hidden flex-col gap-5">' +
      '          <div data-inline-stp-review-form class="flex flex-col gap-5 transition-opacity">' +
      '            <div class="flex items-center gap-1 rounded-lg border border-gray-200 bg-emerald-50 p-4 dark:border-white/10 dark:bg-emerald-500/10">' +
      '              <div class="flex min-w-0 flex-1 items-center gap-3">' +
      '                <img src="' +
      STP_ASSET_ROOT +
      'stp-agreement/icon-agreement-opened-20.svg" alt="" width="20" height="20" class="size-5 shrink-0" />' +
      '                <p class="min-w-0 flex-1 text-sm/5 font-semibold text-slate-950 dark:text-white">Agreement was opened</p>' +
      "              </div>" +
      '              <div class="shrink-0 pl-8">' +
      '                <button type="button" data-inline-stp-review-agreement class="cursor-pointer rounded-sm text-sm/5 font-semibold whitespace-nowrap text-gray-700 underline hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-gray-300 dark:hover:text-white">Review again</button>' +
      "              </div>" +
      "            </div>" +
      "            <fieldset>" +
      '              <legend class="text-sm/5 font-semibold text-gray-900 dark:text-white">Are you authorized to sign?</legend>' +
      '              <div class="mt-4 flex flex-col gap-3">' +
      signerOptionMarkup(
        "self",
        "Yes, I am authorized to sign",
        selfSignFormMarkup(),
      ) +
      signerOptionMarkup(
        "other",
        "No, send to an authorized signer",
        delegateFormMarkup(),
      ) +
      "              </div>" +
      "            </fieldset>" +
      "          </div>" +
      '          <div data-inline-stp-loading role="status" class="absolute inset-0 hidden items-center justify-center">' +
      '            <svg viewBox="0 0 40 40" fill="none" class="size-10 animate-spin" aria-hidden="true"><circle cx="20" cy="20" r="17" stroke="#E5E7EB" stroke-width="3"/><path d="M20 3a17 17 0 0 1 17 17" stroke="#2563EB" stroke-width="3" stroke-linecap="round"/></svg>' +
      '            <span class="sr-only">Saving…</span>' +
      "          </div>" +
      "        </div>" +
      '        <div data-inline-stp-review-result class="hidden flex-col"></div>' +
      "      </div>" +
      // Step 3: complete the steps below (signature delegated)
      '      <div data-inline-stp-step="steps" class="hidden flex-col">' +
      '        <h2 class="pr-10 pb-6 text-2xl/8 font-semibold text-slate-950 md:text-3xl/9 dark:text-white">To enable automatic card processing, complete the steps below.</h2>' +
      '        <ol data-inline-stp-setup-steps class="flex flex-col"></ol>' +
      "      </div>" +
      "      </div>" +
      '      <div data-inline-stp-actions class="flex w-full shrink-0 flex-col items-stretch gap-3 pb-4 md:min-h-[80px] md:flex-row md:items-end md:justify-between md:px-9 md:pb-7">' +
      '        <button type="button" data-inline-stp-next class="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-2.5 text-base/6 font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Next</button>' +
      '        <button type="button" data-inline-stp-confirm disabled class="hidden items-center justify-center rounded-md bg-blue-600 px-6 py-2.5 text-base/6 font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-blue-600">Confirm</button>' +
      '        <button type="button" data-inline-stp-close class="inline-flex items-center justify-center rounded-md px-2.5 py-1.5 text-sm/5 font-semibold text-gray-700 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-gray-300 dark:hover:bg-white/10">Remind me later</button>' +
      "      </div>" +
      "    </div>" +
      "  </div>" +
      "</div>";

    document.body.appendChild(dialog);

    function q(selector) {
      return dialog.querySelector(selector);
    }

    var terminalEl = q("[data-inline-stp-terminal]");
    var cardEl = q("[data-inline-stp-card]");
    var steps = {
      intro: q('[data-inline-stp-step="intro"]'),
      review: q('[data-inline-stp-step="review"]'),
      steps: q('[data-inline-stp-step="steps"]'),
    };
    var reviewTop = q("[data-inline-stp-review-top]");
    var reviewPending = q("[data-inline-stp-review-pending]");
    var reviewOpened = q("[data-inline-stp-review-opened]");
    var reviewForm = q("[data-inline-stp-review-form]");
    var reviewResult = q("[data-inline-stp-review-result]");
    var loadingEl = q("[data-inline-stp-loading]");
    var setupStepsEl = q("[data-inline-stp-setup-steps]");
    var panelEl = q("[data-inline-stp-panel]");
    var scrollEl = q("[data-inline-stp-scroll]");
    var actionsEl = q("[data-inline-stp-actions]");
    var nextEl = q("[data-inline-stp-next]");
    var confirmEl = q("[data-inline-stp-confirm]");
    var acceptEl = q("[data-inline-stp-accept]");
    var delegateEl = q("[data-inline-stp-delegate]");
    var delegateErrorEl = q("[data-inline-stp-delegate-error]");
    var signerEls = dialog.querySelectorAll("[data-inline-stp-signer]");
    var selfFirst = q("#sx-stp-self-first-name");
    var selfLast = q("#sx-stp-self-last-name");
    var signerFirst = q("#sx-stp-signer-first-name");
    var signerLast = q("#sx-stp-signer-last-name");
    var signerEmail = q("#sx-stp-signer-email");
    var signerNote = q("#sx-stp-signer-note");
    var dotTimers = [];
    // pending -> opened -> signed | delegated
    var reviewState = "pending";
    var isBusy = false;
    // Bumped on every reset so a request finishing after close is ignored.
    var runId = 0;

    function toggleFlex(el, show) {
      if (!el) return;
      el.classList.toggle("hidden", !show);
      el.classList.toggle("flex", show);
    }

    function selectedSigner() {
      var checked = q("[data-inline-stp-signer]:checked");
      return checked ? checked.value : "";
    }

    function selfFormValid() {
      return !!(selfFirst.value.trim() && selfLast.value.trim());
    }

    function delegateFormValid() {
      return !!(
        signerFirst.value.trim() &&
        signerLast.value.trim() &&
        isValidEmail(signerEmail.value)
      );
    }

    function setDelegateError(message) {
      delegateErrorEl.textContent = message || "";
      delegateErrorEl.classList.toggle("hidden", !message);
    }

    function renderReview() {
      var opened = reviewState !== "pending";
      var done = reviewState === "signed" || reviewState === "delegated";
      toggleFlex(reviewPending, !opened);
      toggleFlex(reviewOpened, opened && !done);
      toggleFlex(reviewResult, done);
      // Figma spaces every state after "Review agreement" wider (36 / 12px).
      steps.review.classList.toggle("gap-6", !opened);
      steps.review.classList.toggle("gap-9", opened);
      reviewTop.classList.toggle("gap-2", !opened);
      reviewTop.classList.toggle("gap-3", opened);

      var signer = selectedSigner();
      dialog
        .querySelectorAll("[data-inline-stp-signer-form]")
        .forEach(function (form) {
          toggleFlex(
            form,
            form.getAttribute("data-inline-stp-signer-form") === signer,
          );
        });

      toggleFlex(loadingEl, isBusy);
      reviewForm.classList.toggle("opacity-30", isBusy);
      reviewForm.classList.toggle("pointer-events-none", isBusy);
      reviewForm.inert = isBusy;
      acceptEl.disabled = isBusy || !selfFormValid();
      delegateEl.disabled = isBusy || !delegateFormValid();
      confirmEl.disabled = !done;
    }

    function renderSignedCard(name, signedAt) {
      reviewResult.innerHTML = summaryCardMarkup(
        "Acknowledgement Complete",
        summaryRowMarkup("Status", statusBadgeMarkup("green", "Completed")) +
          summaryRowMarkup("Signed by", escapeText(name)) +
          summaryRowMarkup("Confirmed at", formatSignedAt(signedAt)),
      );
    }

    function renderDelegatedCard(request) {
      var sentAt = new Date(request.sentAt);
      reviewResult.innerHTML = summaryCardMarkup(
        "Waiting for acknowledgement",
        summaryRowMarkup("Status", statusBadgeMarkup("blue", "In Process")) +
          summaryRowMarkup("Delegated to", escapeText(request.recipientName)) +
          summaryRowMarkup("Email", escapeText(request.email)) +
          summaryRowMarkup(
            "Send at",
            isNaN(sentAt.getTime()) ? "" : formatSentAt(sentAt),
          ),
        delegateNoticeMarkup(request.recipientName),
      );
    }

    function renderSetupSteps() {
      setupStepsEl.innerHTML = setupStepsMarkup();
    }

    // "learn" and "steps" are read-only: no actions, 568px tall on desktop.
    function showStep(step) {
      var compact = step === "learn" || step === "steps";
      var visible = step === "learn" ? "intro" : step;
      panelEl.classList.toggle("md:h-[752px]", !compact);
      panelEl.classList.toggle("md:h-[568px]", compact);
      scrollEl.classList.toggle("pb-6", compact);
      scrollEl.classList.toggle("md:pb-9", compact);
      toggleFlex(actionsEl, !compact);
      Object.keys(steps).forEach(function (key) {
        toggleFlex(steps[key], key === visible);
      });
      var isReview = visible === "review";
      nextEl.classList.toggle("hidden", isReview);
      nextEl.classList.toggle("inline-flex", !isReview);
      confirmEl.classList.toggle("hidden", !isReview);
      confirmEl.classList.toggle("inline-flex", isReview);
      if (visible === "steps") renderSetupSteps();
      dialog.querySelectorAll("h2").forEach(function (h) {
        h.removeAttribute("id");
      });
      var heading = steps[visible].querySelector("h2");
      if (heading) heading.id = "sx-inline-stp-title";
      scrollEl.scrollTop = 0;
      renderReview();
    }

    function resetDialog() {
      runId += 1;
      reviewState = "pending";
      isBusy = false;
      signerEls.forEach(function (input) {
        input.checked = false;
      });
      [selfFirst, selfLast, signerFirst, signerLast, signerEmail, signerNote]
        .filter(Boolean)
        .forEach(function (input) {
          input.value = "";
        });
      reviewResult.innerHTML = "";
      setDelegateError("");
      showStep("intro");
    }

    function clearDotTimers() {
      dotTimers.forEach(function (id) {
        clearTimeout(id);
      });
      dotTimers = [];
    }

    function runTerminalDots() {
      if (!terminalEl) return;
      clearDotTimers();
      terminalEl.src = STP_ASSET_ROOT + "illustrations/terminal.svg";
      var frames = [
        { t: 1850, src: "illustrations/terminal-dot1.svg" },
        { t: 1980, src: "illustrations/terminal-dot2.svg" },
        { t: 2110, src: "illustrations/terminal-dot3.svg" },
        { t: 2240, src: "illustrations/terminal-dot4.svg" },
        { t: 2850, src: "illustrations/terminal.svg" },
      ];
      frames.forEach(function (frame) {
        dotTimers.push(
          setTimeout(function () {
            if (!dialog.open) return;
            terminalEl.src = STP_ASSET_ROOT + frame.src;
          }, frame.t),
        );
      });
    }

    function startInlineAnimation() {
      if (!cardEl) return;
      dialog.removeAttribute("data-card-animating");
      void dialog.offsetWidth;
      dialog.setAttribute("data-card-animating", "true");
      runTerminalDots();
    }

    // The spinner stays up at least this long so it never just flickers.
    function withMinimumDelay(promise) {
      var delay = new Promise(function (resolve) {
        setTimeout(resolve, 1200);
      });
      return Promise.all([promise, delay]).then(function (results) {
        return results[0];
      });
    }

    dialog.querySelectorAll("[data-inline-stp-close]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (dialog.open) dialog.close();
      });
    });

    nextEl.addEventListener("click", function () {
      showStep("review");
    });

    dialog
      .querySelectorAll("[data-inline-stp-review-agreement]")
      .forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (reviewState === "pending") reviewState = "opened";
          renderReview();
          safelyShowDialog(ensureAgreementViewerDialog());
        });
      });

    signerEls.forEach(function (input) {
      input.addEventListener("change", function () {
        setDelegateError("");
        renderReview();
      });
    });

    dialog
      .querySelectorAll("[data-self-field], [data-delegate-field]")
      .forEach(function (input) {
        input.addEventListener("input", function () {
          if (input.hasAttribute("data-delegate-field")) setDelegateError("");
          renderReview();
        });
      });

    // "Yes, I am authorized to sign" -> Confirm Acceptance.
    acceptEl.addEventListener("click", function () {
      if (acceptEl.disabled) return;
      var name = selfFirst.value.trim() + " " + selfLast.value.trim();
      var run = runId;
      isBusy = true;
      renderReview();
      withMinimumDelay(Promise.resolve()).then(function () {
        var signedAt = new Date();
        saveAgreementSignature({
          name: name,
          signedAt: signedAt.toISOString(),
        });
        // Signed: next the $0.00 verification card is processed at the
        // terminal to capture MID / TID.
        setStpStep(STEP_TERMINAL_COMPLETED);
        if (run !== runId) return;
        isBusy = false;
        reviewState = "signed";
        renderSignedCard(name, signedAt);
        renderReview();
      });
    });

    // "No, send to an authorized signer" -> Send signing request.
    delegateEl.addEventListener("click", function () {
      if (delegateEl.disabled) return;
      var recipientName =
        signerFirst.value.trim() + " " + signerLast.value.trim();
      setDelegateError("");
      var run = runId;
      isBusy = true;
      renderReview();
      var send = Promise.resolve(
        typeof window.getMyCompanyProfile === "function"
          ? window.getMyCompanyProfile().catch(function () {
              return null;
            })
          : null,
      ).then(function (profile) {
        return sendAgreementEmail({
          email: signerEmail.value.trim(),
          recipientName: recipientName,
          note: signerNote.value.trim(),
          senderName:
            (profile && (profile.legalName || profile.dbaName)) || "SMART Hub",
        });
      });
      withMinimumDelay(send)
        .then(function (result) {
          if (run !== runId) return;
          isBusy = false;
          reviewState = "delegated";
          renderDelegatedCard(getAgreementRequest() || result);
          renderReview();
          // Only allowlisted addresses really get the email (test mode).
          if (!result.delivered && typeof window.showGlobalTopToast === "function") {
            window.showGlobalTopToast(
              result.allowed
                ? "Signing request created for " +
                    result.email +
                    ". Live email sending is not enabled for this environment."
                : result.email + " is not allowlisted, so no email was sent.",
              { tone: "info" },
            );
          }
        })
        .catch(function (error) {
          if (run !== runId) return;
          isBusy = false;
          renderReview();
          setDelegateError(
            (error && error.message) || "Failed to send the signing request.",
          );
        });
    });

    confirmEl.addEventListener("click", function () {
      if (confirmEl.disabled) return;
      showStep("steps");
    });

    closeOnEscape(dialog);
    dialog.addEventListener("close", function () {
      clearDotTimers();
      if (terminalEl)
        terminalEl.src = STP_ASSET_ROOT + "illustrations/terminal.svg";
      dialog.removeAttribute("data-card-animating");
      resetDialog();
    });

    new MutationObserver(function () {
      if (dialog.open) startInlineAnimation();
      else clearDotTimers();
    }).observe(dialog, { attributes: true, attributeFilter: ["open"] });

    dialog.sxShowStep = showStep;
    resetDialog();
    return dialog;
  }

  // The temporary $0.00 virtual card Transcard issues when no payment is
  // available; processing it at the terminal captures MID / TID.
  var VERIFICATION_CARD = {
    amount: "$0.00",
    last4: "5612",
    number: "5444 1234 0000 5612",
    expiryShort: "12/26",
    expiry: "12/2026",
    cvc: "999",
    holderName: "Transcard",
    holderAddress: [
      "3476 Commerce Ave.",
      "Suite 1010",
      "Hayward, Wisconsin 54843",
      "United States",
    ],
  };

  var VISA_FLAG_SVG =
    '<svg width="24" height="16" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Visa" role="img"><rect width="24" height="16" rx="1.2" fill="url(#sx-vc-visa-grad-ID)"/><path d="M12.309 7.05313C12.2987 7.85651 13.0305 8.30487 13.5818 8.57141C14.1483 8.84493 14.3385 9.0203 14.3364 9.26485C14.3321 9.6392 13.8845 9.80438 13.4656 9.81081C12.7349 9.82208 12.3101 9.61506 11.9722 9.45846L11.709 10.6807C12.0479 10.8357 12.6754 10.9708 13.3262 10.9767C14.8536 10.9767 15.853 10.2286 15.8584 9.06857C15.8644 7.5964 13.8061 7.51489 13.8202 6.85684C13.8251 6.65733 14.0169 6.44442 14.4374 6.39025C14.6455 6.3629 15.2201 6.34198 15.8714 6.63963L16.127 5.45708C15.7768 5.33051 15.3266 5.2093 14.7661 5.2093C13.3283 5.2093 12.3171 5.96764 12.309 7.05313ZM18.5836 5.3112C18.3047 5.3112 18.0696 5.47263 17.9647 5.7204L15.7827 10.8899H17.3091L17.6129 10.057H19.4781L19.6543 10.8899H20.9996L19.8257 5.3112H18.5836ZM18.7971 6.81822L19.2376 8.91304H18.0312L18.7971 6.81822ZM10.4583 5.3112L9.25517 10.8899H10.7096L11.9122 5.3112H10.4583ZM8.3066 5.3112L6.79266 9.10825L6.18028 5.87969C6.1084 5.51929 5.82464 5.3112 5.50953 5.3112H3.03459L3 5.47317C3.50807 5.58257 4.08532 5.75902 4.43502 5.9478C4.64906 6.0631 4.71013 6.16393 4.7804 6.43798L5.9403 10.8899H7.47747L9.83404 5.3112H8.3066Z" fill="white"/><defs><linearGradient id="sx-vc-visa-grad-ID" x1="10.7812" y1="16" x2="15.6708" y2="0.32624" gradientUnits="userSpaceOnUse"><stop stop-color="#222357"/><stop offset="1" stop-color="#254AA5"/></linearGradient></defs></svg>';

  function visaFlagMarkup(id) {
    return VISA_FLAG_SVG.replace(/sx-vc-visa-grad-ID/g, "sx-vc-visa-grad-" + id);
  }

  var EYE_ICON =
    '<svg viewBox="0 0 20 20" fill="currentColor" class="size-[18px] shrink-0" aria-hidden="true"><path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/><path fill-rule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clip-rule="evenodd"/></svg>';

  var COPY_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4 shrink-0 text-gray-400 dark:text-gray-500" aria-hidden="true"><path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z"/><path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z"/></svg>';

  // Figma: card thumbnail + "Reveal Card Details" in the set up steps.
  function verificationCardThumbMarkup() {
    return (
      '<div class="flex w-fit items-center rounded-md bg-gray-100 dark:bg-white/10">' +
      '<div class="flex h-[46px] w-[71px] shrink-0 flex-col items-end gap-0.5 rounded-md bg-slate-950 p-2" aria-hidden="true">' +
      '<div class="flex min-h-0 flex-1 items-center justify-end">' +
      visaFlagMarkup("thumb").replace('width="24" height="16"', 'width="20" height="13.33"') +
      "</div>" +
      '<p class="font-mono text-[10px] leading-3 whitespace-nowrap text-gray-200">\u2022\u2022\u2022\u2022 ' +
      VERIFICATION_CARD.last4 +
      "</p>" +
      "</div>" +
      '<div class="p-1.5">' +
      '<button type="button" data-stp-reveal-card class="inline-flex items-center justify-center gap-1 rounded-md bg-blue-600 px-2.5 py-1.5 text-sm/5 font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Reveal Card Details' +
      EYE_ICON +
      "</button>" +
      "</div>" +
      "</div>"
    );
  }

  function vcDetailRow(label, valueHtml) {
    return (
      '<div class="grid grid-cols-2 gap-x-6 gap-y-1">' +
      '<span class="text-sm/5 font-medium text-gray-900 dark:text-gray-100">' +
      label +
      "</span>" +
      valueHtml +
      "</div>"
    );
  }

  function vcCopyValue(id, value) {
    return (
      '<button type="button" data-copy-id="' +
      id +
      '" class="copy-btn -ml-1.5 inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-md px-1.5 text-gray-700 transition-colors hover:bg-gray-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-gray-300 dark:hover:bg-white/20">' +
      '<span id="' +
      id +
      '" class="text-sm/5 font-normal">' +
      value +
      "</span>" +
      '<span class="sr-only">Copy</span>' +
      COPY_ICON +
      "</button>"
    );
  }

  // Figma: "Modal/VC" — details of the $0.00 verification card.
  function ensureVerificationCardDialog() {
    var existing = document.getElementById("sx-stp-vc-dialog");
    if (existing) return existing;
    var card = VERIFICATION_CARD;
    var plain = function (value) {
      return (
        '<span class="text-sm/5 font-normal text-gray-700 dark:text-gray-300">' +
        value +
        "</span>"
      );
    };

    var dialog = document.createElement("dialog");
    dialog.id = "sx-stp-vc-dialog";
    dialog.setAttribute("aria-label", "Verification card details");
    dialog.className =
      "fixed inset-0 m-0 size-auto max-h-none max-w-none border-0 p-0 bg-transparent backdrop:bg-transparent";
    dialog.innerHTML =
      '<div class="fixed inset-0 z-[120] bg-gray-900/75"></div>' +
      '<div class="fixed inset-0 z-[130] flex items-center justify-center overflow-y-auto p-4 sm:p-6">' +
      '  <div class="relative w-full max-w-[512px] overflow-hidden rounded-[10px] bg-white shadow-lg ring-1 ring-black/5 dark:bg-gray-900 dark:ring-white/10">' +
      '    <div class="flex h-14 items-end justify-end px-4 pt-4">' +
      '      <button type="button" data-vc-close class="flex size-10 items-center justify-center rounded-full hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:hover:bg-white/10">' +
      '        <span class="sr-only">Close</span>' +
      '        <img src="' +
      STP_ASSET_ROOT +
      'stp-agreement/icon-x-24.svg" alt="" width="24" height="24" class="size-6" />' +
      "      </button>" +
      "    </div>" +
      '    <div class="flex flex-col items-center gap-4 p-4 sm:p-6">' +
      '      <div class="relative h-[200px] w-full max-w-[320px] shrink-0 overflow-hidden rounded-xl bg-[#142435] p-5 shadow-lg ring-[0.94px] ring-white/30 ring-inset" aria-hidden="true">' +
      '        <div class="flex h-full flex-col">' +
      '          <div class="flex items-center justify-end">' +
      '            <span class="rounded-full bg-white/20 px-1.5 text-[11px]/4 text-white">CVV : \u2022\u2022\u2022</span>' +
      "          </div>" +
      '          <div class="flex h-[108px] flex-col justify-end">' +
      '            <div class="flex h-8 items-end gap-2">' +
      '              <p class="flex-1 text-2xl/8 font-bold text-white">' +
      card.amount +
      "</p>" +
      '              <svg xmlns="http://www.w3.org/2000/svg" width="19" height="28" viewBox="0 0 19 28" fill="none" class="shrink-0"><path d="M1.63451 14.0121C1.63451 16.3874 0 16.4362 0 17.3061C0 17.7886 0.415193 18.1801 0.926639 18.1801C1.17182 18.1801 1.60287 17.9797 1.60287 17.9797C2.76417 17.003 3.51553 15.5899 3.51553 14.0121C3.51553 12.4514 2.78131 11.0119 1.60683 10.0167C1.60683 10.0167 0.805383 9.3695 0.216164 10.1419C-0.228056 10.7246 0.266249 11.2756 0.540427 11.5497C1.18896 12.1983 1.63451 13.059 1.63451 14.0121ZM6.37329 14.0121C6.37329 16.2925 5.37282 18.3304 3.77784 19.7843L3.79103 19.7948C3.67372 19.9412 3.60515 20.1217 3.60515 20.3195C3.60515 20.8032 4.02038 21.1947 4.53182 21.1947C4.78359 21.1947 5.01162 21.0998 5.17903 20.9456L5.18959 20.9548C7.07851 19.1779 8.25431 16.7196 8.25431 13.9883C8.25431 11.269 7.07851 8.81719 5.18959 7.04294L5.17771 7.05348C5.01162 6.90058 4.78359 6.80567 4.53182 6.80567C4.02038 6.80567 3.60515 7.19716 3.60515 7.68093C3.60515 7.87733 3.67372 8.05924 3.78971 8.20555L3.7818 8.21215C5.38732 9.68454 6.37329 11.7461 6.37329 14.0121ZM7.8681 5.0591C11.8964 9.08741 11.6275 13.9501 11.6275 13.9501C11.6275 18.2025 9.67792 21.0998 7.85359 22.9531C7.64927 23.1126 7.52009 23.3552 7.52009 23.6254C7.52009 24.1079 7.93531 24.4994 8.44676 24.4994C8.71566 24.4994 8.95691 24.3926 9.12563 24.2212C9.12563 24.2212 13.5085 20.4131 13.5085 14.0239C13.5085 7.48848 9.12563 3.77917 9.12563 3.77917C8.95559 3.60781 8.71434 3.49973 8.44676 3.49973C7.93531 3.49973 7.52009 3.89254 7.52009 4.37499C7.52009 4.6518 7.65588 4.89829 7.8681 5.0591ZM11.8384 1.52644C17.1071 6.68968 17.0623 13.1737 17.0623 14.0002C17.0623 14.0002 17.5803 20.6002 11.8437 26.4758C11.671 26.6524 11.5378 26.8672 11.5378 27.1246C11.5378 27.6081 11.9531 28 12.4645 28C12.7809 28 13.2396 27.6343 13.2396 27.6343C19.4745 21.3107 18.942 14.0002 18.942 14.0002C18.942 5.62065 13.2857 0.375671 13.2857 0.375671C13.1183 0.148949 12.7809 -1.90735e-06 12.4645 -1.90735e-06C11.9531 -1.90735e-06 11.5378 0.392813 11.5378 0.875259C11.5378 1.1323 11.6552 1.3643 11.8423 1.5238L11.8384 1.52644Z" fill="white"/></svg>' +
      "            </div>" +
      '            <div class="mt-0 flex flex-col items-start gap-2">' +
      '              <p class="text-lg/6 font-normal text-white">\u2022\u2022\u2022\u2022 ' +
      card.last4 +
      "</p>" +
      '              <div class="flex items-center gap-1 pl-14">' +
      '                <p class="font-mono text-[7px] leading-normal font-bold text-white uppercase">Expiration<br />Date</p>' +
      '                <p class="text-sm/5 font-normal text-white">' +
      card.expiryShort +
      "</p>" +
      "              </div>" +
      "            </div>" +
      "          </div>" +
      '          <div class="flex h-9 items-end gap-4">' +
      '            <p class="flex-1 text-sm/5 font-normal text-white uppercase">' +
      card.holderName +
      "</p>" +
      '            <svg xmlns="http://www.w3.org/2000/svg" width="59" height="18" viewBox="0 0 59 18" fill="none" class="shrink-0"><path d="M49.0149 11.5661L50.911 6.68624C50.8879 6.73859 51.3015 5.67937 51.5423 5.02376L51.8689 6.53035L52.9693 11.5632H49.0117V11.5661H49.0149ZM11.5564 9.78621L12.0496 12.209L16.7013 0.317736H21.7424L14.2524 17.7318H9.22275L5.1113 2.98625C5.04534 2.74336 4.8883 2.53396 4.67367 2.40225C3.19221 1.6366 1.6228 1.05585 0 0.672661L0.0638636 0.305067H7.72453C8.76417 0.347157 9.60175 0.672659 9.88025 1.78224L11.5543 9.79564V9.78621H11.5564ZM23.6395 0.170012H28.399L25.4215 17.6176H20.6682L23.6395 0.164774V0.170012ZM54.8874 0.317736H51.2167C50.0744 0.317736 49.2138 0.631828 48.7155 1.76465L41.6568 17.7558H46.6509L47.6496 15.1331L53.7451 15.1397C53.8885 15.7531 54.3293 17.7558 54.3293 17.7558H58.7339L54.8874 0.317736ZM42.6954 0.737259C41.3312 0.239948 39.8885 -0.00985909 38.4353 0.000297546C33.7375 0.000297546 30.4197 2.36666 30.3956 5.76397C30.3663 8.25994 32.7534 9.66602 34.5594 10.5002C36.4125 11.3579 37.0313 11.8982 37.0261 12.6645C37.0145 13.8297 35.5456 14.3585 34.1804 14.3585C32.3042 14.3585 31.2792 14.0968 29.7025 13.4424L29.1183 13.1693L28.4524 17.0807C29.5947 17.5559 31.653 17.9644 33.7784 18C38.7734 18 42.0379 15.6473 42.0766 12.0331C42.1175 10.0385 40.8255 8.53309 38.1065 7.28825C36.4534 6.48009 35.4284 5.93986 35.4284 5.12113C35.4284 4.39558 36.3068 3.62093 38.1421 3.62093C39.3629 3.59151 40.5763 3.81975 41.7029 4.29287L42.1437 4.4896L42.8106 0.71035L42.6954 0.737259Z" fill="white"/></svg>' +
      "          </div>" +
      "        </div>" +
      "      </div>" +
      '      <div class="flex w-full flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">' +
      vcDetailRow("Cardholder Name", plain(card.holderName)) +
      vcDetailRow(
        "Cardholder Address",
        plain(card.holderAddress.join("<br />")),
      ) +
      vcDetailRow(
        "Type",
        '<span class="inline-flex w-fit items-center">' +
          visaFlagMarkup("details").replace(
            'width="24" height="16"',
            'width="30" height="20"',
          ) +
          "</span>",
      ) +
      vcDetailRow("Card Number", vcCopyValue("sx-vc-number", card.number)) +
      vcDetailRow("Expires", vcCopyValue("sx-vc-expiry", card.expiry)) +
      vcDetailRow("CVC2", vcCopyValue("sx-vc-cvc2", card.cvc)) +
      "      </div>" +
      "    </div>" +
      "  </div>" +
      "</div>";

    document.body.appendChild(dialog);
    closeOnEscape(dialog);
    dialog.querySelectorAll("[data-vc-close]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (dialog.open) dialog.close();
      });
    });
    // Prototype: once the card details were used at the terminal, Transcard
    // receives MID / TID and the set up moves on to the micro deposit.
    dialog.addEventListener("close", function () {
      if (currentState.stpStep !== STEP_TERMINAL_COMPLETED) return;
      closeOpenStpDialogs();
      setStpStep(STEP_BANK_VERIFICATION_REQUIRED);
    });
    return dialog;
  }

  function openVerificationCardModal() {
    return safelyShowDialog(ensureVerificationCardDialog());
  }

  // Figma: "Visa AR Manager Participation Agreement" document modal.
  function ensureAgreementViewerDialog() {
    var existing = document.getElementById("sx-stp-agreement-dialog");
    if (existing) return existing;

    var pages = "";
    for (var i = 1; i <= AGREEMENT_PAGE_COUNT; i += 1) {
      pages +=
        '<img src="' +
        STP_ASSET_ROOT +
        "stp-agreement/visa-agreement-page-" +
        i +
        '.jpg" alt="Visa AR Manager Participation Agreement, page ' +
        i +
        " of " +
        AGREEMENT_PAGE_COUNT +
        '" loading="lazy" class="block aspect-[1612/2086] w-full shrink-0 bg-white object-cover" />';
    }

    var dialog = document.createElement("dialog");
    dialog.id = "sx-stp-agreement-dialog";
    dialog.setAttribute("aria-labelledby", "sx-stp-agreement-title");
    dialog.className =
      "fixed inset-0 m-0 size-auto max-h-none max-w-none border-0 p-0 bg-transparent backdrop:bg-transparent";
    dialog.innerHTML =
      '<div class="fixed inset-0 z-[120] bg-gray-900/75"></div>' +
      '<div class="fixed inset-0 z-[130] flex items-center justify-center p-4 sm:p-6 md:py-12">' +
      '  <div class="flex h-full max-h-[928px] w-full max-w-[1048px] flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-900 dark:ring-1 dark:ring-white/10">' +
      '    <div class="flex shrink-0 items-center gap-2 border-b border-gray-200 py-2 pr-4 pl-6 dark:border-white/10">' +
      '      <h2 id="sx-stp-agreement-title" class="min-w-0 flex-1 text-base/6 font-medium text-gray-900 dark:text-white">Visa AR Manager Participation Agreement</h2>' +
      '      <button type="button" data-agreement-close class="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:hover:bg-white/10">' +
      '        <span class="sr-only">Close</span>' +
      '        <img src="' +
      STP_ASSET_ROOT +
      'stp-agreement/icon-x-24.svg" alt="" width="24" height="24" class="size-6" />' +
      "      </button>" +
      "    </div>" +
      '    <div class="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">' +
      '      <div class="flex flex-col gap-4 rounded-sm border border-gray-200 bg-gray-50 p-2 sm:p-4 dark:border-white/10 dark:bg-white/5">' +
      pages +
      "      </div>" +
      "    </div>" +
      '    <div class="flex shrink-0 items-center justify-end border-t border-gray-200 px-6 py-5 dark:border-white/10">' +
      '      <button type="button" data-agreement-close class="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-base/6 font-semibold text-gray-700 shadow-xs hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">Close Agreement</button>' +
      "    </div>" +
      "  </div>" +
      "</div>";

    document.body.appendChild(dialog);
    closeOnEscape(dialog);
    dialog.querySelectorAll("[data-agreement-close]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (dialog.open) dialog.close();
      });
    });
    return dialog;
  }

  function ensureInlineVerifyDialog() {
    var existing = document.getElementById("sx-inline-stp-verify-dialog");
    if (existing) return existing;

    var dialog = document.createElement("dialog");
    dialog.id = "sx-inline-stp-verify-dialog";
    dialog.className =
      "fixed inset-0 m-0 size-auto max-h-none max-w-none border-0 p-0 bg-transparent backdrop:bg-transparent";
    dialog.innerHTML =
      '<div class="fixed inset-0 z-[100] bg-gray-900/75 transition-opacity duration-300 ease-out motion-reduce:transition-none"></div>' +
      '<div class="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">' +
      '  <div class="relative w-full max-w-lg transform overflow-hidden rounded-xl bg-white text-left shadow-xl dark:bg-gray-900 dark:ring-1 dark:ring-white/10">' +
      '    <div class="flex self-stretch flex-col items-end justify-end px-4 pt-4">' +
      '      <button type="button" data-inline-verify-close class="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-300">' +
      '        <span class="sr-only">Close</span>' +
      '        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="size-5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>' +
      "      </button>" +
      "    </div>" +
      '    <div class="flex flex-col gap-6 p-6 px-8 pt-0">' +
      '      <div class="flex flex-col items-center text-center">' +
      '        <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">' +
      '          <path d="M21.2374 4.35593C21.6993 4.04802 22.301 4.04802 22.7629 4.35593L39.2629 15.3559C39.8947 15.7772 40.0655 16.6309 39.6442 17.2627C39.223 17.8946 38.3693 18.0653 37.7374 17.6441L22.0001 7.15254L6.26286 17.6441C5.63101 18.0653 4.77731 17.8946 4.35608 17.2627C3.93484 16.6309 4.10558 15.7772 4.73743 15.3559L21.2374 4.35593Z" fill="#3B82F6"/>' +
      '          <path fill-rule="evenodd" clip-rule="evenodd" d="M37.125 18.9429V37.125H38.5C39.2594 37.125 39.875 37.7406 39.875 38.5C39.875 39.2594 39.2594 39.875 38.5 39.875H5.5C4.74061 39.875 4.125 39.2594 4.125 38.5C4.125 37.7406 4.74061 37.125 5.5 37.125H6.875V18.9429C6.875 18.2658 7.36794 17.6895 8.03686 17.5845C12.5873 16.8705 17.2508 16.5 22 16.5C26.7492 16.5 31.4127 16.8705 35.9631 17.5845C36.6321 17.6895 37.125 18.2658 37.125 18.9429ZM23.375 23.375C23.375 22.6156 22.7594 22 22 22C21.2406 22 20.625 22.6156 20.625 23.375V35.75C20.625 36.5094 21.2406 37.125 22 37.125C22.7594 37.125 23.375 36.5094 23.375 35.75V23.375ZM28.875 22C29.6344 22 30.25 22.6156 30.25 23.375V35.75C30.25 36.5094 29.6344 37.125 28.875 37.125C28.1156 37.125 27.5 36.5094 27.5 35.75V23.375C27.5 22.6156 28.1156 22 28.875 22ZM16.5 23.375C16.5 22.6156 15.8844 22 15.125 22C14.3656 22 13.75 22.6156 13.75 23.375V35.75C13.75 36.5094 14.3656 37.125 15.125 37.125C15.8844 37.125 16.5 36.5094 16.5 35.75V23.375Z" fill="#3B82F6"/>' +
      "        </svg>" +
      '        <div class="mt-6 flex flex-col items-center gap-2">' +
      '          <h2 class="text-center text-lg/6 font-semibold text-gray-900 dark:text-white">Bank Account Verification</h2>' +
      '          <p class="text-center text-sm/5 font-normal text-gray-500 dark:text-gray-400">This step ensures funds are settling to your account. Once the deposit amount is confirmed, set up for automatic card processing will be complete.</p>' +
      "        </div>" +
      "      </div>" +
      '      <div class="flex flex-col gap-2">' +
      '        <label for="sx-inline-deposit-amount" class="block text-sm/6 font-medium text-gray-900 dark:text-white">Enter exact deposit amount</label>' +
      '        <div class="grid grid-cols-1">' +
      '          <input id="sx-inline-deposit-amount" type="text" inputmode="decimal" pattern="[0-9]*[.]?[0-9]*" placeholder="0.00" aria-invalid="false" class="col-start-1 row-start-1 block w-full rounded-md bg-white py-2 pr-10 pl-3 text-sm font-normal text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500" />' +
      '          <svg id="sx-inline-deposit-amount-error-icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="pointer-events-none col-start-1 row-start-1 mr-3 hidden size-5 self-center justify-self-end text-red-500 sm:size-4"><path d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14ZM8 4a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd" fill-rule="evenodd"/></svg>' +
      "        </div>" +
      '        <p id="sx-inline-deposit-amount-error" class="hidden text-sm text-red-600 dark:text-red-400">Only numbers and one decimal point are allowed.</p>' +
      "      </div>" +
      "    </div>" +
      '    <div class="flex justify-end gap-3 border-t border-gray-200 px-6 py-5 dark:border-white/10">' +
      '      <button type="button" data-inline-verify-close class="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-700 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-white/5 dark:text-white dark:ring-white/10 dark:hover:bg-white/10">Cancel</button>' +
      '      <button id="sx-inline-verify-deposit-btn" type="button" disabled class="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300 disabled:hover:bg-blue-300">Verify</button>' +
      "    </div>" +
      "  </div>" +
      "</div>";
    document.body.appendChild(dialog);

    var input = dialog.querySelector("#sx-inline-deposit-amount");
    var verifyBtn = dialog.querySelector("#sx-inline-verify-deposit-btn");
    var closeBtns = dialog.querySelectorAll("[data-inline-verify-close]");
    var errorMsg = dialog.querySelector("#sx-inline-deposit-amount-error");
    var errorIcon = dialog.querySelector(
      "#sx-inline-deposit-amount-error-icon",
    );
    var hasError = false;
    var isVerifying = false;

    function setError(show) {
      hasError = show;
      if (!input || !errorMsg || !errorIcon) return;
      input.setAttribute("aria-invalid", show ? "true" : "false");
      errorMsg.classList.toggle("hidden", !show);
      errorIcon.classList.toggle("hidden", !show);
    }
    function sanitizeDecimal(raw) {
      var cleaned = String(raw || "").replace(/[^0-9.]/g, "");
      var firstDot = cleaned.indexOf(".");
      if (firstDot === -1) return cleaned;
      return (
        cleaned.slice(0, firstDot + 1) +
        cleaned.slice(firstDot + 1).replace(/\./g, "")
      );
    }
    function updateVerifyState() {
      if (!verifyBtn || !input) return;
      if (isVerifying) {
        verifyBtn.disabled = true;
        return;
      }
      verifyBtn.disabled = hasError || !/\d/.test(input.value);
    }

    function setVerifyLoading(loading) {
      isVerifying = loading;
      closeBtns.forEach(function (btn) {
        btn.disabled = loading;
      });
      if (!verifyBtn) return;
      if (loading) {
        verifyBtn.disabled = true;
        verifyBtn.classList.add("bg-indigo-500");
        verifyBtn.classList.remove("hover:bg-blue-500");
        verifyBtn.innerHTML =
          '<span class="inline-flex items-center whitespace-nowrap">' +
          '<svg class="mr-3 size-5 animate-spin text-white" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
          '<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>' +
          '<path class="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"></path>' +
          "</svg>" +
          "<span>Verifying...</span>" +
          "</span>";
      } else {
        verifyBtn.classList.remove("bg-indigo-500");
        verifyBtn.classList.add("hover:bg-blue-500");
        verifyBtn.textContent = "Verify";
      }
      updateVerifyState();
    }

    if (input) {
      input.addEventListener("input", function () {
        var clean = sanitizeDecimal(input.value);
        setError(clean !== input.value);
        input.value = clean;
        updateVerifyState();
      });
    }
    if (verifyBtn) {
      verifyBtn.addEventListener("click", function () {
        if (verifyBtn.disabled) return;
        if (isVerifying) return;
        setVerifyLoading(true);
        window.setTimeout(function () {
          setStpStep(STEP_COMPLETED);
          setVerifyLoading(false);
          var showSuccess = function () {
            var successDialog = ensureInlineVerifySuccessDialog();
            if (
              successDialog &&
              typeof successDialog.showModal === "function" &&
              !successDialog.open
            ) {
              successDialog.showModal();
            }
          };
          // Wait for the deposit dialog to finish closing so the two never stack.
          if (dialog.open) {
            dialog.addEventListener("close", showSuccess, { once: true });
            dialog.close();
          } else {
            showSuccess();
          }
        }, 3000);
      });
    }
    closeBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (isVerifying) return;
        if (dialog.open) dialog.close();
      });
    });
    dialog.addEventListener("cancel", function (event) {
      if (isVerifying) event.preventDefault();
    });
    dialog.addEventListener("close", function () {
      if (input) input.value = "";
      setError(false);
      setVerifyLoading(false);
      updateVerifyState();
    });

    setVerifyLoading(false);
    updateVerifyState();
    return dialog;
  }

  function ensureInlineVerifySuccessDialog() {
    var existing = document.getElementById(
      "sx-inline-stp-verify-success-dialog",
    );
    if (existing) return existing;

    var dialog = document.createElement("dialog");
    dialog.id = "sx-inline-stp-verify-success-dialog";
    dialog.className =
      "fixed inset-0 m-0 size-auto max-h-none max-w-none border-0 p-0 bg-transparent backdrop:bg-transparent";
    dialog.innerHTML =
      '<div class="fixed inset-0 z-[100] bg-gray-900/75 transition-opacity duration-300 ease-out motion-reduce:transition-none"></div>' +
      '<div class="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">' +
      '  <div class="relative w-full max-w-lg transform overflow-hidden rounded-xl bg-white text-left shadow-xl dark:bg-gray-900 dark:ring-1 dark:ring-white/10">' +
      '    <div class="flex self-stretch flex-col items-end justify-end px-4 pt-4">' +
      '      <button type="button" data-inline-verify-success-close class="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-300">' +
      '        <span class="sr-only">Close</span>' +
      '        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="size-5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>' +
      "      </button>" +
      "    </div>" +
      '    <div class="flex flex-col gap-6 p-6 px-8 pt-0">' +
      '      <div class="flex flex-col items-center text-center">' +
      '        <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44" fill="none">' +
      '          <path fill-rule="evenodd" clip-rule="evenodd" d="M4.125 22C4.125 12.1279 12.1279 4.125 22 4.125C31.8721 4.125 39.875 12.1279 39.875 22C39.875 31.8721 31.8721 39.875 22 39.875C12.1279 39.875 4.125 31.8721 4.125 22ZM28.6189 18.6742C29.0603 18.0563 28.9171 17.1975 28.2992 16.7561C27.6813 16.3147 26.8225 16.4579 26.3811 17.0758L20.4495 25.38L17.4723 22.4027C16.9353 21.8658 16.0647 21.8658 15.5277 22.4027C14.9908 22.9397 14.9908 23.8103 15.5277 24.3473L19.6527 28.4723C19.9385 28.7581 20.3356 28.9037 20.7384 28.8703C21.1412 28.837 21.509 28.6281 21.7439 28.2992L28.6189 18.6742Z" fill="#10B981"/>' +
      "        </svg>" +
      '        <div class="mt-6 flex flex-col items-center gap-2">' +
      '          <h2 class="text-center text-lg/6 font-semibold text-gray-900 dark:text-white">Bank Account Verified Successfully!</h2>' +
      '          <p class="text-center text-sm/5 font-normal text-gray-500 dark:text-gray-400">Automatic card processing is set up, card payments will be processed automatically and you&#39;ll receive a notification.</p>' +
      "        </div>" +
      "      </div>" +
      "    </div>" +
      '    <div class="flex w-full border-t border-gray-200 px-6 py-5 dark:border-white/10">' +
      '      <button type="button" data-inline-verify-success-done class="w-full rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Done</button>' +
      "    </div>" +
      "  </div>" +
      "</div>";

    document.body.appendChild(dialog);
    dialog
      .querySelectorAll("[data-inline-verify-success-close]")
      .forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (dialog.open) dialog.close();
        });
      });
    var doneBtn = dialog.querySelector("[data-inline-verify-success-done]");
    if (doneBtn) {
      doneBtn.addEventListener("click", function () {
        var url = new URL(window.location.href);
        url.pathname = url.pathname.replace(
          /[^/]*$/,
          "payment-preferences.html",
        );
        window.location.href = url.toString();
      });
    }
    return dialog;
  }

  function safelyShowDialog(dialog) {
    if (!dialog || typeof dialog.showModal !== "function") return false;
    if (dialog.open) return true;
    try {
      dialog.showModal();
      return true;
    } catch (error) {
      return false;
    }
  }

  function openEnrollDialog(step) {
    var dialog = ensureInlineOptInDialog();
    if (dialog.open) {
      dialog.sxShowStep(step);
      return true;
    }
    dialog.sxShowStep(step);
    return safelyShowDialog(dialog);
  }

  // Opt in starts at "Enable Automatic Card Processing".
  function openOptInModal() {
    return openEnrollDialog("intro");
  }

  // The agreement email and the "Review" action land on "Review & Sign".
  function openAgreementReviewModal() {
    return openEnrollDialog("review");
  }

  // The opt-in banner's Learn more explains the program; once set up has
  // started, Learn more shows the remaining set up steps instead.
  function openLearnMoreModal(trigger) {
    if (trigger === "topbar-blue") return openEnrollDialog("learn");
    return openSetupStepsModal();
  }

  function openSetupStepsModal() {
    return openEnrollDialog("steps");
  }

  function openVerifyModal() {
    var existing = document.getElementById("pp-verify-deposit-dialog");
    if (safelyShowDialog(existing)) {
      return true;
    }
    var dialog = ensureInlineVerifyDialog();
    return safelyShowDialog(dialog);
  }

  function bindDelegatedStpTriggers() {
    if (
      document.documentElement.getAttribute("data-stp-trigger-bound") === "true"
    )
      return;
    document.documentElement.setAttribute("data-stp-trigger-bound", "true");
    document.addEventListener("click", function (event) {
      var target = event.target;
      if (!target || typeof target.closest !== "function") return;

      var goToPaymentsTrigger = target.closest(
        '[data-stp-go-to-payments], #pp-stp-go-to-payments-btn, a[href*="supplier-portal.html?guide=card-rows"]',
      );
      if (goToPaymentsTrigger) {
        closeOpenStpDialogs();
        if (typeof setStpStep === "function")
          setStpStep(STEP_TERMINAL_COMPLETED);
        return;
      }

      var optInTrigger = target.closest("[data-stp-opt-in-trigger]");
      if (optInTrigger) {
        event.preventDefault();
        openOptInModal();
        return;
      }

      var verifyTrigger = target.closest("[data-stp-verify-trigger]");
      if (verifyTrigger) {
        event.preventDefault();
        // From the set up steps view, swap to the deposit dialog.
        if (verifyTrigger.closest("#sx-inline-stp-dialog")) closeOpenStpDialogs();
        openVerifyModal();
        return;
      }

      var revealCardTrigger = target.closest("[data-stp-reveal-card]");
      if (revealCardTrigger) {
        event.preventDefault();
        openVerificationCardModal();
        return;
      }

      var reviewTrigger = target.closest(
        '[data-stp-agreement-review-trigger="setup-steps"]',
      );
      if (reviewTrigger) {
        event.preventDefault();
        openAgreementReviewModal();
        return;
      }

      var learnMoreTrigger = target.closest("[data-stp-learn-more-trigger]");
      if (learnMoreTrigger) {
        event.preventDefault();
        openLearnMoreModal(
          learnMoreTrigger.getAttribute("data-stp-learn-more-trigger"),
        );
      }
    });
  }

  function closeOpenStpDialogs() {
    [
      "sx-stp-agreement-dialog",
      "sx-stp-vc-dialog",
      "sx-inline-stp-dialog",
      "sx-inline-stp-verify-dialog",
      "sx-inline-stp-verify-success-dialog",
    ].forEach(function (id) {
      var dialog = document.getElementById(id);
      if (dialog && dialog.open && typeof dialog.close === "function") {
        try {
          dialog.close();
        } catch (error) {}
      }
    });
  }

  window.addEventListener("storage", function (event) {
    if (event.key !== STORAGE_KEY && event.key !== LEGACY_STATUS_KEY) return;
    var next = readStoredState();
    if (
      next.stpStatus === currentState.stpStatus &&
      next.stpStep === currentState.stpStep
    )
      return;
    currentState = next;
    notify();
  });

  window.STPState = {
    getStpState: getStpState,
    getStpStatus: getStpStatus,
    setStpStatus: setStpStatus,
    setStpStep: setStpStep,
    subscribe: subscribe,
    openOptInModal: openOptInModal,
    openAgreementReviewModal: openAgreementReviewModal,
    getAgreementRequest: getAgreementRequest,
    getAgreementSentText: getAgreementSentText,
    sendAgreementEmail: sendAgreementEmail,
    isAllowlistedEmail: isAllowlistedEmail,
    openSetupStepsModal: openSetupStepsModal,
    openLearnMoreModal: openLearnMoreModal,
    openVerifyModal: openVerifyModal,
    openVerificationCardModal: openVerificationCardModal,
    STATUS_ENABLED: STATUS_ENABLED,
    STATUS_DISABLED: STATUS_DISABLED,
    STATUS_IN_PROGRESS: STATUS_IN_PROGRESS,
    STEP_OPT_IN_REQUIRED: STEP_OPT_IN_REQUIRED,
    STEP_TERMINAL_COMPLETED: STEP_TERMINAL_COMPLETED,
    STEP_BANK_VERIFICATION_REQUIRED: STEP_BANK_VERIFICATION_REQUIRED,
    STEP_AGREEMENT_SIGNATURE_PENDING: STEP_AGREEMENT_SIGNATURE_PENDING,
    STEP_COMPLETED: STEP_COMPLETED,
  };

  bindDelegatedStpTriggers();
})();

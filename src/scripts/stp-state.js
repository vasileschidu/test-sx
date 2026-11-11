/**
 * Global STP state store for dashboard pages.
 * Source of truth: localStorage key.
 */
(function () {
  "use strict";

  // STP walkthrough demo (?case=<id>, sx-demo-case.js): its STP state lives
  // under "<key>:<id>", so the general portal keeps its own. The signer's
  // sign-agreement.html opens without ?case= (email link): it uses the stored case.
  function demoScope() {
    try {
      var id = new URLSearchParams(window.location.search).get("case");
      if (!id && /\/sx-enroll\/sign-agreement\.html$/.test(window.location.pathname)) {
        var stored = JSON.parse(localStorage.getItem("sx_demo_case_v1") || "null");
        id = stored && stored.id;
      }
      return id ? ":" + id : "";
    } catch (error) {
      return "";
    }
  }
  var SCOPE = demoScope();

  // v3: global STP setup progression state.
  var STORAGE_KEY = "sx_global_stp_state_v3" + SCOPE;
  var LEGACY_STATUS_KEY = "sx_global_stp_status_v2" + SCOPE;
  var STATUS_ENABLED = "enabled";
  var STATUS_DISABLED = "disabled";
  var STATUS_IN_PROGRESS = "in_progress";
  var STEP_OPT_IN_REQUIRED = "opt_in_required";
  var STEP_TERMINAL_COMPLETED = "terminal_completed_tid_mid_received";
  var STEP_BANK_VERIFICATION_REQUIRED = "bank_verification_required";
  var STEP_AGREEMENT_SIGNATURE_PENDING = "agreement_signature_pending";
  var STEP_COMPLETED = "completed";
  // Who the Visa agreement email went to and when, for the pending banner.
  var AGREEMENT_REQUEST_KEY = "sx_stp_agreement_request_v1" + SCOPE;
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

  // ?stp=reset (demo): back to the start — "Opt in" banner / step 1 — by
  // dropping the stored progression and agreement request, then the param.
  (function resetFromUrl() {
    try {
      var params = new URLSearchParams(window.location.search);
      if (params.get("stp") !== "reset") return;
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_STATUS_KEY);
      localStorage.removeItem(AGREEMENT_REQUEST_KEY);
      params.delete("stp");
      var query = params.toString();
      history.replaceState(null, "", window.location.pathname + (query ? "?" + query : "") + window.location.hash);
    } catch (e) {}
  })();

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
    // A signed request is kept as a record (the signer link then shows
    // "expired"); any other request ends with the pending step.
    if (nextState.stpStep !== STEP_AGREEMENT_SIGNATURE_PENDING) {
      var request = getAgreementRequest();
      if (!request || request.status !== "signed") clearAgreementRequest();
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

  // The other signer acknowledged the agreement from the email link
  // (src/pages/sx-enroll/sign-agreement.html). Call before setStpStep.
  function markAgreementSigned(info) {
    var request = getAgreementRequest();
    if (!request) return null;
    var signed = Object.assign({}, request, {
      status: "signed",
      signedBy: String((info && info.signedBy) || "").trim(),
      signedAt: (info && info.signedAt) || new Date().toISOString(),
    });
    saveAgreementRequest(signed);
    return signed;
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

  // Presenter setting from the STP case launcher: extra addresses that may
  // get real emails in this browser (on top of the config allowlist).
  var EXTRA_ALLOWED_KEY = "sx_extra_allowed_emails_v1";

  function getExtraAllowedEmails() {
    try {
      var parsed = JSON.parse(localStorage.getItem(EXTRA_ALLOWED_KEY) || "[]");
      return Array.isArray(parsed)
        ? parsed
            .map(function (email) {
              return String(email || "")
                .trim()
                .toLowerCase();
            })
            .filter(Boolean)
        : [];
    } catch (error) {
      return [];
    }
  }

  function isAllowedIn(config, normalized) {
    return (
      config.allowedTestEmails.indexOf(normalized) !== -1 ||
      getExtraAllowedEmails().indexOf(normalized) !== -1
    );
  }

  // Only the runtime config's allowlist (the launcher offers the per-browser
  // opt-in for every other address).
  function isConfigAllowlistedEmail(email) {
    var normalized = String(email || "")
      .trim()
      .toLowerCase();
    return loadRuntimeConfig().then(function (config) {
      return config.allowedTestEmails.indexOf(normalized) !== -1;
    });
  }

  function isAllowlistedEmail(email) {
    var normalized = String(email || "")
      .trim()
      .toLowerCase();
    return loadRuntimeConfig().then(function (config) {
      return isAllowedIn(config, normalized);
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
      var allowed = isAllowedIn(config, normalized);
      var finish = function (result) {
        var wasPending =
          currentState.stpStep === STEP_AGREEMENT_SIGNATURE_PENDING;
        saveAgreementRequest({
          email: email,
          recipientName: String(options.recipientName || "").trim(),
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
          // options.linkUrl: the page the email button opens (the worker
          // drops its query); default = the page that sends the email.
          verifyBaseUrl:
            String(options.linkUrl || "").trim() ||
            window.location.origin + window.location.pathname,
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

  function ensureInlineOptInStyles() {
    if (document.getElementById("sx-inline-stp-style")) return;
    var style = document.createElement("style");
    style.id = "sx-inline-stp-style";
    style.textContent =
      "#sx-inline-stp-dialog {" +
      "  --pp-stp-loop-ms: 8000;" +
      "  --pp-stp-dot-1-ms: 2700;" +
      "  --pp-stp-dot-2-ms: 2820;" +
      "  --pp-stp-dot-3-ms: 2940;" +
      "  --pp-stp-dot-4-ms: 3060;" +
      "  --pp-stp-dot-reset-ms: 7000;" +
      "}" +
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

  function ensureInlineOptInDialog() {
    var existing = document.getElementById("sx-inline-stp-dialog");
    if (existing) return existing;

    ensureInlineOptInStyles();

    var dialog = document.createElement("dialog");
    dialog.id = "sx-inline-stp-dialog";
    dialog.className =
      "fixed inset-0 m-0 size-auto max-h-none max-w-none border-0 p-0 bg-transparent backdrop:bg-transparent";
    dialog.innerHTML =
      '<div class="fixed inset-0 z-[100] bg-gray-900/75 transition-opacity duration-300 ease-out motion-reduce:transition-none"></div>' +
      '<div class="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">' +
      '  <div class="relative flex h-auto max-h-[calc(100vh-2rem)] w-full max-w-[800px] flex-col overflow-y-auto rounded-3xl bg-white shadow-xl md:overflow-hidden dark:bg-gray-900 dark:ring-1 dark:ring-white/10 md:flex-row">' +
      '    <button type="button" data-inline-stp-close class="absolute top-4 right-4 z-20 rounded-md bg-gray-900/8 p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:bg-white/10 dark:text-gray-400 dark:hover:bg-white/20 dark:hover:text-gray-200">' +
      '      <span class="sr-only">Close</span>' +
      '      <svg viewBox="0 0 20 20" fill="currentColor" class="size-5"><path fill-rule="evenodd" d="M4.22 4.22a.75.75 0 0 1 1.06 0L10 8.94l4.72-4.72a.75.75 0 1 1 1.06 1.06L11.06 10l4.72 4.72a.75.75 0 1 1-1.06 1.06L10 11.06l-4.72 4.72a.75.75 0 1 1-1.06-1.06L8.94 10 4.22 5.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>' +
      "    </button>" +
      '    <div class="relative p-2 md:w-64 md:shrink-0">' +
      '      <div class="relative h-[220px] overflow-hidden rounded-2xl md:h-[608px]" style="background-image: linear-gradient(180deg, #ECF2FF 0%, #F8F4FF 100%);">' +
      '        <img data-inline-stp-terminal src="../../../src/assets/illustrations/terminal.svg" alt="" class="absolute -bottom-[100px] left-1/2 h-[192px] w-[332px] max-w-none -translate-x-[56%] md:bottom-[80px]" />' +
      '        <div class="absolute inset-0 flex -translate-x-3 items-center justify-center">' +
      '          <img data-inline-stp-card src="../../../src/assets/illustrations/card.svg" alt="" class="pp-stp-modal-card-figure h-[169px] w-[292px] max-w-none" />' +
      "        </div>" +
      "      </div>" +
      "    </div>" +
      '    <div class="flex flex-1 flex-col p-4 md:p-9">' +
      '      <div class="my-auto flex flex-col gap-4">' +
      '        <h3 class="text-xl font-semibold leading-8 text-slate-950 md:text-[30px] md:leading-[36px] dark:text-white">Enable Automatic Card Processing</h3>' +
      '        <p class="text-sm font-medium leading-6 text-slate-950 md:text-[18px] dark:text-gray-100">When enabled, eligible virtual card payments will be processed automatically through your existing merchant processor.</p>' +
      '        <details class="w-full rounded-md bg-gray-100 p-3 md:hidden">' +
      '          <summary class="flex cursor-pointer list-none items-center justify-between text-sm font-medium leading-6 text-slate-950 dark:text-white">' +
      "            <span>How it works</span>" +
      '            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4 text-gray-500 dark:text-gray-400"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08Z" clip-rule="evenodd"/></svg>' +
      "          </summary>" +
      '          <div class="mt-2 flex flex-col gap-1.5 text-sm font-normal leading-6 text-gray-700 dark:text-gray-300">' +
      '            <div class="flex items-start gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" class="mt-0.5 shrink-0"><path fill-rule="evenodd" clip-rule="evenodd" d="M16.7045 4.15347C17.034 4.4045 17.0976 4.87509 16.8466 5.20457L8.84657 15.7046C8.71541 15.8767 8.51627 15.9838 8.30033 15.9983C8.08439 16.0129 7.87271 15.9334 7.71967 15.7804L3.21967 11.2804C2.92678 10.9875 2.92678 10.5126 3.21967 10.2197C3.51256 9.92682 3.98744 9.92682 4.28033 10.2197L8.17351 14.1129L15.6534 4.29551C15.9045 3.96603 16.3751 3.90243 16.7045 4.15347Z" fill="#2563EB"/></svg><p>Eligible virtual card payments are securely transmitted to your processor.</p></div>' +
      '            <div class="flex items-start gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" class="mt-0.5 shrink-0"><path fill-rule="evenodd" clip-rule="evenodd" d="M16.7045 4.15347C17.034 4.4045 17.0976 4.87509 16.8466 5.20457L8.84657 15.7046C8.71541 15.8767 8.51627 15.9838 8.30033 15.9983C8.08439 16.0129 7.87271 15.9334 7.71967 15.7804L3.21967 11.2804C2.92678 10.9875 2.92678 10.5126 3.21967 10.2197C3.51256 9.92682 3.98744 9.92682 4.28033 10.2197L8.17351 14.1129L15.6534 4.29551C15.9045 3.96603 16.3751 3.90243 16.7045 4.15347Z" fill="#2563EB"/></svg><p>Funds settle as usual.</p></div>' +
      '            <div class="flex items-start gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" class="mt-0.5 shrink-0"><path fill-rule="evenodd" clip-rule="evenodd" d="M16.7045 4.15347C17.034 4.4045 17.0976 4.87509 16.8466 5.20457L8.84657 15.7046C8.71541 15.8767 8.51627 15.9838 8.30033 15.9983C8.08439 16.0129 7.87271 15.9334 7.71967 15.7804L3.21967 11.2804C2.92678 10.9875 2.92678 10.5126 3.21967 10.2197C3.51256 9.92682 3.98744 9.92682 4.28033 10.2197L8.17351 14.1129L15.6534 4.29551C15.9045 3.96603 16.3751 3.90243 16.7045 4.15347Z" fill="#2563EB"/></svg><p>You can turn this off anytime.</p></div>' +
      "          </div>" +
      "        </details>" +
      '        <div class="hidden w-full flex-col gap-1.5 md:flex">' +
      '          <p class="text-sm font-medium leading-6 text-slate-950 dark:text-white">How it works</p>' +
      '          <div class="flex items-start gap-1.5 text-sm font-normal leading-6 text-gray-700 dark:text-gray-300"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" class="mt-0.5 shrink-0"><path fill-rule="evenodd" clip-rule="evenodd" d="M16.7045 4.15347C17.034 4.4045 17.0976 4.87509 16.8466 5.20457L8.84657 15.7046C8.71541 15.8767 8.51627 15.9838 8.30033 15.9983C8.08439 16.0129 7.87271 15.9334 7.71967 15.7804L3.21967 11.2804C2.92678 10.9875 2.92678 10.5126 3.21967 10.2197C3.51256 9.92682 3.98744 9.92682 4.28033 10.2197L8.17351 14.1129L15.6534 4.29551C15.9045 3.96603 16.3751 3.90243 16.7045 4.15347Z" fill="#2563EB"/></svg><p>Eligible virtual card payments are securely transmitted to your processor.</p></div>' +
      '          <div class="flex items-start gap-1.5 text-sm font-normal leading-6 text-gray-700 dark:text-gray-300"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" class="mt-0.5 shrink-0"><path fill-rule="evenodd" clip-rule="evenodd" d="M16.7045 4.15347C17.034 4.4045 17.0976 4.87509 16.8466 5.20457L8.84657 15.7046C8.71541 15.8767 8.51627 15.9838 8.30033 15.9983C8.08439 16.0129 7.87271 15.9334 7.71967 15.7804L3.21967 11.2804C2.92678 10.9875 2.92678 10.5126 3.21967 10.2197C3.51256 9.92682 3.98744 9.92682 4.28033 10.2197L8.17351 14.1129L15.6534 4.29551C15.9045 3.96603 16.3751 3.90243 16.7045 4.15347Z" fill="#2563EB"/></svg><p>Funds settle as usual.</p></div>' +
      '          <div class="flex items-start gap-1.5 text-sm font-normal leading-6 text-gray-700 dark:text-gray-300"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" class="mt-0.5 shrink-0"><path fill-rule="evenodd" clip-rule="evenodd" d="M16.7045 4.15347C17.034 4.4045 17.0976 4.87509 16.8466 5.20457L8.84657 15.7046C8.71541 15.8767 8.51627 15.9838 8.30033 15.9983C8.08439 16.0129 7.87271 15.9334 7.71967 15.7804L3.21967 11.2804C2.92678 10.9875 2.92678 10.5126 3.21967 10.2197C3.51256 9.92682 3.98744 9.92682 4.28033 10.2197L8.17351 14.1129L15.6534 4.29551C15.9045 3.96603 16.3751 3.90243 16.7045 4.15347Z" fill="#2563EB"/></svg><p>You can turn this off anytime.</p></div>' +
      "        </div>" +
      '        <app-checkbox class="mt-4" data-inline-stp-agree>I agree to the Visa AR Manager <a href="#" class="text-blue-600 underline dark:text-blue-400">Participation Agreement</a>.</app-checkbox>' +
      '        <p data-inline-stp-delegate-row hidden class="type-description text-tertiary">Not the authorized signer? <button type="button" data-inline-stp-delegate class="cursor-pointer rounded-sm type-link text-brand underline underline-offset-2 hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"></button></p>' +
      "      </div>" +
      '      <div class="mt-6 flex w-full flex-col items-stretch gap-3 md:mt-8 md:flex-row md:items-center md:justify-between">' +
      '        <button type="button" data-inline-stp-confirm disabled class="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-6 py-2.5 text-base font-semibold text-white shadow-xs hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300 disabled:hover:bg-blue-300 md:w-auto">Confirm</button>' +
      '        <button type="button" data-inline-stp-close class="inline-flex w-full items-center justify-center rounded-md px-2.5 py-1.5 text-center text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10 md:ml-auto md:w-auto">Remind me later</button>' +
      "      </div>" +
      "    </div>" +
      "  </div>" +
      "</div>";

    document.body.appendChild(dialog);

    var terminalEl = dialog.querySelector("[data-inline-stp-terminal]");
    var cardEl = dialog.querySelector("[data-inline-stp-card]");
    var agreeEl = dialog.querySelector("[data-inline-stp-agree]");
    var confirmEl = dialog.querySelector("[data-inline-stp-confirm]");
    var dotTimers = [];

    function clearDotTimers() {
      dotTimers.forEach(function (id) {
        clearTimeout(id);
      });
      dotTimers = [];
    }

    function runTerminalDots() {
      if (!terminalEl) return;
      clearDotTimers();
      terminalEl.src = "../../../src/assets/illustrations/terminal.svg";
      var frames = [
        { t: 1850, src: "../../../src/assets/illustrations/terminal-dot1.svg" },
        { t: 1980, src: "../../../src/assets/illustrations/terminal-dot2.svg" },
        { t: 2110, src: "../../../src/assets/illustrations/terminal-dot3.svg" },
        { t: 2240, src: "../../../src/assets/illustrations/terminal-dot4.svg" },
        { t: 2850, src: "../../../src/assets/illustrations/terminal.svg" },
      ];
      frames.forEach(function (frame) {
        dotTimers.push(
          setTimeout(function () {
            if (!dialog.open) return;
            terminalEl.src = frame.src;
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

    dialog.querySelectorAll("[data-inline-stp-close]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (dialog.open) dialog.close();
      });
    });

    if (agreeEl && confirmEl) {
      agreeEl.addEventListener("change", function () {
        confirmEl.disabled = !agreeEl.checked;
      });
      confirmEl.addEventListener("click", function () {
        if (confirmEl.disabled) return;
        if (dialog.open) dialog.close();
        // Agreement accepted here (self-sign): STP waits for a card payment.
        var C = demoCase();
        if (C) C.optIn({ self: true }).then(openSetupStepsModal);
        else {
          setStpStep(STEP_TERMINAL_COMPLETED);
          openSetupStepsModal();
        }
      });
    }

    // STP walkthrough instance: "Send to <signer> instead" (Batch 3 email +
    // sign-agreement.html flow) for a contact who can't sign.
    var delegateEl = dialog.querySelector("[data-inline-stp-delegate]");
    if (delegateEl) {
      delegateEl.addEventListener("click", function () {
        var C = demoCase();
        if (!C || delegateEl.disabled) return;
        delegateEl.disabled = true;
        delegateEl.textContent = "Sending…";
        C.optIn({ self: false })
          .then(function () {
            if (dialog.open) dialog.close();
            openSetupStepsModal();
          })
          .catch(function () {})
          .then(function () {
            delegateEl.disabled = false;
            syncDelegate();
          });
      });
    }
    function syncDelegate() {
      if (!delegateEl) return;
      var C = demoCase();
      var c = C && C.get();
      var signer = (c && c.signer) || {};
      var name = [signer.firstName, signer.lastName].filter(Boolean).join(" ");
      var show = Boolean(C && signer.email);
      var row = dialog.querySelector("[data-inline-stp-delegate-row]");
      if (row) row.hidden = !show;
      if (show) delegateEl.textContent = "Send it to " + (name || signer.email);
    }
    syncDelegate();

    dialog.addEventListener("close", function () {
      clearDotTimers();
      if (terminalEl)
        terminalEl.src = "../../../src/assets/illustrations/terminal.svg";
      if (agreeEl) agreeEl.checked = false;
      if (confirmEl) confirmEl.disabled = true;
      dialog.removeAttribute("data-card-animating");
    });

    new MutationObserver(function () {
      if (dialog.open) {
        startInlineAnimation();
        syncDelegate();
      } else clearDotTimers();
    }).observe(dialog, { attributes: true, attributeFilter: ["open"] });

    return dialog;
  }

  // ---- Agreement pending dialog (layout of Figma 36762:106435) -------------
  // While the agreement waits for the signer: who it was sent to, when, and
  // Resend / Send to another person in case the signer doesn't respond.

  var PENDING_BADGE =
    "inline-flex w-fit items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 inset-ring inset-ring-blue-700/10";

  function pendingRow(label, valueHtml) {
    return (
      '<div class="grid grid-cols-2 gap-4">' +
      '<span class="text-sm font-medium text-gray-900 dark:text-gray-100">' + label + "</span>" +
      '<span class="min-w-0 text-sm text-gray-700 dark:text-gray-300">' + valueHtml + "</span>" +
      "</div>"
    );
  }

  function renderPendingDialog(dialog) {
    var body = dialog.querySelector("[data-stp-pending-body]");
    if (!body) return;
    var request = getAgreementRequest() || {};
    var C = demoCase();
    var who = request.recipientName || request.email || "The authorized signer";
    var signerLink =
      C && request.delivered === false
        ? '<a href="' + escapeText(C.urls().sign + "&email=" + encodeURIComponent(request.email)) + '" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 rounded-sm text-sm font-semibold text-blue-600 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-blue-400 dark:hover:text-blue-300">Open signer&rsquo;s link<span class="sr-only"> (opens in a new tab)</span></a>'
        : "";
    body.innerHTML =
      '<section aria-label="Waiting for acknowledgement" class="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5">' +
      '<h2 class="border-b border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 dark:border-white/10 dark:text-white">Waiting for Acknowledgement</h2>' +
      '<div class="flex flex-col gap-2 p-4">' +
      pendingRow("Status", '<span class="' + PENDING_BADGE + '">Pending Signature</span>') +
      (request.recipientName ? pendingRow("Sent to", escapeText(request.recipientName)) : "") +
      pendingRow("Email", '<span class="break-all">' + escapeText(request.email || "") + "</span>") +
      (request.sentAt ? pendingRow("Sent at", escapeText(formatStepDate(request.sentAt))) : "") +
      "</div>" +
      // Test mode only: no email went out, the presenter opens the link here.
      (request.delivered === false
        ? '<div class="flex flex-col gap-2 border-t border-gray-200 px-4 py-3 dark:border-white/10">' +
          '<p class="text-xs text-gray-500 dark:text-gray-400">Test mode, no email delivered to ' + escapeText(request.email) + ".</p>" +
          signerLink +
          "</div>"
        : "") +
      "</section>" +
      '<p class="text-sm text-gray-500 dark:text-gray-400"><span class="font-medium text-gray-900 dark:text-white">' + escapeText(who) +
      "</span> will receive an email with a secure link to review and acknowledge the Visa AR Manager Participation Agreement. No response yet? Resend it, or send it to another authorized signer.</p>" +
      '<div class="flex flex-wrap items-center gap-3">' +
      '<button type="button" data-stp-resend class="' + SETUP_CTA_CLASS + ' disabled:cursor-not-allowed disabled:bg-blue-300">Resend</button>' +
      '<button type="button" data-stp-send-other class="' + SETUP_SECONDARY_CLASS + '">Send to another person</button>' +
      "</div>" +
      '<p data-stp-send-status role="status" class="text-sm/5 text-gray-500 dark:text-gray-400"></p>' +
      sendOtherForm();
  }

  function ensurePendingDialog() {
    var existing = document.getElementById("sx-inline-stp-pending-dialog");
    if (existing) return existing;
    var dialog = document.createElement("dialog");
    dialog.id = "sx-inline-stp-pending-dialog";
    dialog.setAttribute("aria-labelledby", "sx-stp-pending-title");
    dialog.className =
      "fixed inset-0 m-0 size-auto max-h-none max-w-none border-0 p-0 bg-transparent backdrop:bg-transparent";
    dialog.innerHTML =
      '<div class="fixed inset-0 z-[100] bg-gray-900/75 transition-opacity duration-300 ease-out motion-reduce:transition-none"></div>' +
      '<div class="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">' +
      '  <div class="relative flex h-auto max-h-[calc(100vh-2rem)] w-full max-w-[800px] flex-col overflow-y-auto rounded-3xl bg-white shadow-xl md:overflow-hidden dark:bg-gray-900 dark:ring-1 dark:ring-white/10 md:flex-row">' +
      '    <button type="button" data-stp-pending-close class="absolute top-4 right-4 z-20 rounded-md bg-gray-900/8 p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:bg-white/10 dark:text-gray-400 dark:hover:bg-white/20 dark:hover:text-gray-200">' +
      '      <span class="sr-only">Close</span>' +
      '      <svg viewBox="0 0 20 20" fill="currentColor" class="size-5"><path fill-rule="evenodd" d="M4.22 4.22a.75.75 0 0 1 1.06 0L10 8.94l4.72-4.72a.75.75 0 1 1 1.06 1.06L11.06 10l4.72 4.72a.75.75 0 1 1-1.06 1.06L10 11.06l-4.72 4.72a.75.75 0 1 1-1.06-1.06L8.94 10 4.22 5.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>' +
      "    </button>" +
      // Hugs the content. Card + terminal keep the opt-in dialog's sizes and
      // horizontal offsets, as one group centred vertically in the panel.
      '    <div class="relative flex p-2 md:w-64 md:shrink-0">' +
      '      <div class="relative flex h-[220px] flex-1 items-start overflow-hidden rounded-2xl md:h-auto md:items-center" style="background-image: linear-gradient(180deg, #ECF2FF 0%, #F8F4FF 100%);">' +
      '        <div class="relative mt-6 h-[309px] w-full shrink-0 md:mt-0">' +
      '          <img src="../../../src/assets/illustrations/terminal.svg" alt="" class="absolute top-[117px] left-1/2 h-[192px] w-[332px] max-w-none -translate-x-[56%]" />' +
      '          <div class="absolute inset-x-0 top-0 flex -translate-x-3 justify-center">' +
      '            <img src="../../../src/assets/illustrations/card.svg" alt="" class="h-[169px] w-[292px] max-w-none" />' +
      "          </div>" +
      "        </div>" +
      "      </div>" +
      "    </div>" +
      '    <div class="flex flex-1 flex-col p-4 md:p-9">' +
      '      <div class="flex flex-col gap-6">' +
      '        <div class="flex flex-col gap-2 md:pr-8">' +
      '          <h3 id="sx-stp-pending-title" class="text-xl font-semibold leading-8 text-slate-950 md:text-[30px] md:leading-[36px] dark:text-white">Waiting for the agreement signature.</h3>' +
      '          <p class="text-sm leading-6 text-gray-600 dark:text-gray-300">Signing the attached agreement allows your company to participate in automated card processing through the Visa network.</p>' +
      "        </div>" +
      '        <div data-stp-pending-body class="flex flex-col gap-4"></div>' +
      "      </div>" +
      "    </div>" +
      "  </div>" +
      "</div>";
    document.body.appendChild(dialog);

    dialog.addEventListener("click", function (event) {
      var target = event.target;
      if (!target || typeof target.closest !== "function") return;
      if (target.closest("[data-stp-pending-close]")) {
        if (dialog.open) dialog.close();
      } else if (target.closest("[data-stp-resend]")) {
        var request = getAgreementRequest();
        if (request)
          sendFromPending(dialog, target.closest("[data-stp-resend]"), {
            email: request.email,
            recipientName: request.recipientName,
          });
      } else if (target.closest("[data-stp-send-other]")) {
        var form = dialog.querySelector("[data-stp-send-other-form]");
        if (form) {
          form.hidden = false;
          form.querySelector("input").focus();
        }
      } else if (target.closest("[data-stp-send-other-cancel]")) {
        var openForm = dialog.querySelector("[data-stp-send-other-form]");
        if (openForm) openForm.hidden = true;
        dialog.querySelector("[data-stp-send-other]").focus();
      }
    });
    dialog.addEventListener("input", function (event) {
      var input = event.target;
      if (input.getAttribute("aria-invalid") !== "true") return;
      input.setAttribute("aria-invalid", "false");
      var error = dialog.querySelector("#" + input.id + "-error");
      if (error) error.classList.add("hidden");
    });
    dialog.addEventListener("submit", function (event) {
      var form = event.target.closest("[data-stp-send-other-form]");
      if (!form) return;
      event.preventDefault();
      var first = form.querySelector("#stp-other-first");
      var last = form.querySelector("#stp-other-last");
      var email = form.querySelector("#stp-other-email");
      var bad = [
        [first, first.value.trim() ? "" : "Enter a first name"],
        [last, last.value.trim() ? "" : "Enter a last name"],
        [email, isValidEmail(email.value.trim()) ? "" : "Enter a valid email address"],
      ].filter(function (pair) {
        var error = form.querySelector("#" + pair[0].id + "-error");
        pair[0].setAttribute("aria-invalid", pair[1] ? "true" : "false");
        if (error) {
          error.textContent = pair[1];
          error.classList.toggle("hidden", !pair[1]);
        }
        return pair[1];
      });
      if (bad.length) {
        bad[0][0].focus();
        return;
      }
      sendFromPending(dialog, form.querySelector('[type="submit"]'), {
        email: email.value.trim(),
        recipientName: (first.value.trim() + " " + last.value.trim()).trim(),
        firstName: first.value.trim(),
        lastName: last.value.trim(),
      });
    });
    // Signed in another tab while open: show the next steps instead.
    subscribe(function (status, state) {
      if (!dialog.open) return;
      if (state && state.stpStep !== STEP_AGREEMENT_SIGNATURE_PENDING) {
        dialog.close();
        openSetupStepsModal();
      }
    });
    return dialog;
  }

  // On the case instance the case's signer changes too, so the signer page
  // accepts the new link.
  function sendFromPending(dialog, button, to) {
    var label = button.textContent;
    button.disabled = true;
    button.textContent = "Sending…";
    var C = demoCase();
    var send;
    if (C) {
      if (to.firstName)
        C.update({ signer: { firstName: to.firstName, lastName: to.lastName, email: to.email } });
      send = C.optIn({ self: false });
    } else {
      send = sendAgreementEmail({ email: to.email, recipientName: to.recipientName });
    }
    send
      .then(function () {
        renderPendingDialog(dialog);
        dialog.querySelector("[data-stp-send-status]").textContent = "Sent to " + to.email + ".";
      })
      .catch(function (error) {
        var status = dialog.querySelector("[data-stp-send-status]");
        if (status) status.textContent = (error && error.message) || "Could not send the email.";
      })
      .then(function () {
        button.disabled = false;
        button.textContent = label;
      });
  }

  function openPendingDialog() {
    var dialog = ensurePendingDialog();
    renderPendingDialog(dialog);
    return safelyShowDialog(dialog);
  }

  function ensureInlineNextStepsDialog() {
    var existing = document.getElementById("sx-inline-stp-next-steps-dialog");
    if (existing) return existing;

    var dialog = document.createElement("dialog");
    dialog.id = "sx-inline-stp-next-steps-dialog";
    dialog.className =
      "fixed inset-0 m-0 size-auto max-h-none max-w-none border-0 p-0 bg-transparent backdrop:bg-transparent";
    dialog.innerHTML =
      '<div class="fixed inset-0 z-[100] bg-gray-900/75 transition-opacity duration-300 ease-out motion-reduce:transition-none"></div>' +
      '<div class="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">' +
      '  <div class="relative flex h-auto max-h-[calc(100vh-2rem)] w-full max-w-[800px] flex-col overflow-y-auto rounded-3xl bg-white shadow-xl md:overflow-hidden dark:bg-gray-900 dark:ring-1 dark:ring-white/10">' +
      '    <button type="button" data-inline-next-close class="absolute top-4 right-4 z-20 rounded-md bg-gray-900/8 p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:bg-white/10 dark:text-gray-400 dark:hover:bg-white/20 dark:hover:text-gray-200">' +
      '      <span class="sr-only">Close</span>' +
      '      <svg viewBox="0 0 20 20" fill="currentColor" class="size-5"><path fill-rule="evenodd" d="M4.22 4.22a.75.75 0 0 1 1.06 0L10 8.94l4.72-4.72a.75.75 0 1 1 1.06 1.06L11.06 10l4.72 4.72a.75.75 0 1 1-1.06 1.06L10 11.06l-4.72 4.72a.75.75 0 1 1-1.06-1.06L8.94 10 4.22 5.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>' +
      "    </button>" +
      '    <div class="grid h-auto w-full grid-cols-1 gap-0 md:grid-cols-3">' +
      '      <div class="col-span-1 p-2 md:w-64 md:shrink-0">' +
      '        <div class="relative h-[220px] overflow-hidden rounded-2xl md:h-full" style="background-image: linear-gradient(180deg, #ECF2FF 0%, #F8F4FF 100%);">' +
      '          <img src="../../../src/assets/illustrations/Receivables%20Table.svg" alt="" class="absolute left-1/2 top-2 h-auto w-[300px] max-w-none -translate-x-1/2 md:left-auto md:right-6 md:top-[132px] md:w-[430px] md:translate-x-0" />' +
      "        </div>" +
      "      </div>" +
      '      <div class="col-span-2 flex min-h-0 w-full flex-col p-4 md:px-9 md:py-20">' +
      '        <div class="my-auto flex flex-col gap-6">' +
      '          <h2 class="text-3xl font-semibold leading-9 text-slate-950 dark:text-white">To enable automatic card processing, complete the steps below.</h2>' +
      '          <ol data-inline-next-steps class="flex flex-col gap-0"></ol>' +
      "        </div>" +
      "      </div>" +
      "    </div>" +
      "  </div>" +
      "</div>";

    document.body.appendChild(dialog);
    dialog.querySelectorAll("[data-inline-next-close]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (dialog.open) dialog.close();
      });
    });
    // The step list is re-rendered on every open (renderSetupSteps); its
    // Verify now / Review CTAs are delegated here.
    dialog.addEventListener("click", function (event) {
      var target = event.target;
      if (!target || typeof target.closest !== "function") return;
      if (target.closest("[data-inline-next-verify]")) {
        if (dialog.open) dialog.close();
        openVerifyModal();
      } else if (target.closest("[data-inline-next-review]")) {
        if (dialog.open) dialog.close();
        openAgreementReviewModal();
      } else if (target.closest("[data-stp-opt-in-trigger]")) {
        if (dialog.open) dialog.close();
      }
    });
    // Live: another tab signs / verifies while the list is open.
    subscribe(function (status, state) {
      if (dialog.open) renderSetupSteps(dialog, state);
    });
    return dialog;
  }

  // Query that keeps a Supplier Portal demo instance (?case=<id>) on links.
  function demoCaseQuery(prefix) {
    var C = window.SXDemoCase;
    if (!C || typeof C.isPortalInstance !== "function" || !C.isPortalInstance())
      return "";
    var current = C.get();
    return current && current.id
      ? prefix + "case=" + encodeURIComponent(current.id)
      : "";
  }

  function demoCardProcessed() {
    var C = window.SXDemoCase;
    if (!C || typeof C.isPortalInstance !== "function" || !C.isPortalInstance())
      return false;
    var current = C.get();
    return Boolean(current && current.enrol && current.enrol.cardProcessed);
  }

  /**
   * The set-up steps, one at a time: done steps show a check + title, only the
   * current step shows its description and single CTA, future steps are muted.
   * Derived from the STP step (+ the demo case's cardProcessed on an instance):
   *   opt_in_required             → "Opt in" step current (prepended)
   *   agreement_signature_pending → "Sign the Visa agreement" current (prepended)
   *   terminal_completed_…        → Process Any Payment current
   *   bank_verification_required  → 1–2 done, Verify Your Bank Account current
   *   completed                   → all done
   */
  function getSetupSteps(state) {
    var step = (state && state.stpStep) || currentState.stpStep;
    var processed = demoCardProcessed();
    // Demo instance: the case payment waits on Action Required, so open that tab.
    var demoQuery = demoCaseQuery("&");
    var paymentsHref =
      "supplier-portal.html?guide=card-rows" +
      demoQuery +
      (demoQuery && !processed ? "&tab=action-required" : "");
    var steps = [];
    if (step === STEP_OPT_IN_REQUIRED) {
      steps.push({
        title: "Opt in and Sign the Visa Agreement",
        text: "Review and sign the Visa AR Manager Participation Agreement.",
        cta: '<button type="button" data-stp-opt-in-trigger="setup-steps" class="' + SETUP_CTA_CLASS + '">Opt in</button>',
      });
    } else if (step === STEP_AGREEMENT_SIGNATURE_PENDING) {
      // openSetupStepsModal shows the pending dialog for this state instead.
      var pendingRequest = getAgreementRequest();
      steps.push({
        key: "agreement",
        title: "Pending Agreement Signature",
        meta: pendingRequest && pendingRequest.sentAt ? "Sent - " + formatStepDate(pendingRequest.sentAt) : "",
      });
    } else {
      var signed = getAgreementRequest();
      var C2 = demoCase();
      var c2 = C2 && C2.get();
      var signedAt =
        (signed && signed.signedAt) ||
        (c2 && c2.enrol && c2.enrol.agreement && c2.enrol.agreement.confirmedAt) ||
        "";
      steps.push({
        key: "agreement",
        title: "Agreement Signature (Acknowledged)",
        meta: signedAt ? "Confirmed at - " + formatStepDate(signedAt) : "",
      });
    }
    steps.push(
      {
        key: "process",
        title: "Process Any Card Payment",
        text: "Go to Payments and process any available virtual card using your terminal. This links your Merchant and Terminal IDs.",
        cta: '<a href="' + paymentsHref + '" data-stp-go-to-payments class="' + SETUP_CTA_CLASS + '">Go to Payments</a>',
      },
      {
        key: "verify",
        title: "Verify Your Bank Account (Penny Test)",
        text: "We sent a small test deposit to your bank account. Confirm the exact amount to complete setup.",
        cta: '<button type="button" data-inline-next-verify class="' + SETUP_CTA_CLASS + '">Verify now</button>',
      },
      { key: "active", title: "Automatic Card Processing Activated" },
    );
    // Index of the current step; everything before it is done.
    // Steps: 0 agreement · 1 process · 2 verify · 3 active.
    var current = 0;
    if (step === STEP_TERMINAL_COMPLETED) current = processed ? 2 : 1;
    else if (step === STEP_BANK_VERIFICATION_REQUIRED) current = 2;
    else if (step === STEP_COMPLETED) current = steps.length;
    return steps.map(function (item, index) {
      var status = index < current ? "done" : index === current ? "current" : "upcoming";
      // A card processed before the agreement was signed already gave the
      // MID / TID: step 2 shows done while step 1 is still pending.
      if (item.key === "process" && processed && status === "upcoming") status = "done";
      return Object.assign({}, item, {
        status: status,
        number: index + 1,
        last: index === steps.length - 1,
      });
    });
  }

  var SETUP_CTA_CLASS =
    "inline-flex w-fit shrink-0 cursor-pointer items-center justify-center self-start rounded-md bg-blue-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";
  var SETUP_SECONDARY_CLASS =
    "inline-flex w-fit shrink-0 cursor-pointer items-center justify-center self-start rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10 dark:text-white dark:inset-ring-white/10 dark:hover:bg-white/20";
  var SETUP_INPUT_CLASS =
    "mt-1 block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 hover:outline-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 aria-invalid:outline-red-500 aria-invalid:focus:outline-red-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:hover:outline-white/20";

  // "04/06/2026, 11:53:17 AM" (Figma set-up steps).
  function formatStepDate(iso) {
    var date = new Date(iso);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  // "Send to another person": first / last name + email, hidden until asked.
  function sendOtherForm() {
    function field(id, label, type, autocomplete) {
      return (
        "<div>" +
        '<label for="' + id + '" class="block text-sm/6 font-medium text-gray-900 dark:text-white">' + label + "</label>" +
        '<input id="' + id + '" type="' + type + '" autocomplete="' + autocomplete + '" aria-describedby="' + id + '-error" class="' + SETUP_INPUT_CLASS + '" />' +
        '<p id="' + id + '-error" class="mt-1 hidden text-sm text-red-600 dark:text-red-400"></p>' +
        "</div>"
      );
    }
    return (
      '<form data-stp-send-other-form hidden novalidate class="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 dark:border-white/10">' +
      '<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">' +
      field("stp-other-first", "First name", "text", "off") +
      field("stp-other-last", "Last name", "text", "off") +
      "</div>" +
      field("stp-other-email", "Email", "email", "off") +
      '<div class="flex items-center justify-end gap-3">' +
      '<button type="button" data-stp-send-other-cancel class="' + SETUP_SECONDARY_CLASS + '">Cancel</button>' +
      '<button type="submit" class="' + SETUP_CTA_CLASS + ' disabled:cursor-not-allowed disabled:bg-blue-300">Send</button>' +
      "</div>" +
      "</form>"
    );
  }

  var SETUP_CHECK_ICON =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-3 text-white"><path fill-rule="evenodd" clip-rule="evenodd" d="M16.7045 4.15347C17.034 4.4045 17.0976 4.87509 16.8466 5.20457L8.84657 15.7046C8.71541 15.8767 8.51627 15.9838 8.30033 15.9983C8.08439 16.0129 7.87271 15.9334 7.71967 15.7804L3.21967 11.2804C2.92678 10.9875 2.92678 10.5126 3.21967 10.2197C3.51256 9.92682 3.98744 9.92682 4.28033 10.2197L8.17351 14.1129L15.6534 4.29551C15.9045 3.96603 16.3751 3.90243 16.7045 4.15347Z"/></svg>';

  function escapeText(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderSetupSteps(dialog, state) {
    var list = dialog && dialog.querySelector("[data-inline-next-steps]");
    if (!list) return;
    list.innerHTML = getSetupSteps(state)
      .map(function (item) {
        var done = item.status === "done";
        var isCurrent = item.status === "current";
        var marker = done
          ? '<span class="flex size-5 items-center justify-center rounded-full bg-blue-600 dark:bg-blue-500">' + SETUP_CHECK_ICON + "</span>"
          : isCurrent
            ? '<span class="flex size-5 items-center justify-center rounded-full border border-blue-400 bg-blue-100 text-xs font-semibold text-blue-700 dark:border-blue-400/50 dark:bg-blue-500/20 dark:text-blue-300">' + item.number + "</span>"
            : '<span class="flex size-5 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-xs font-medium text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-400">' + item.number + "</span>";
        var line = item.last
          ? ""
          : '<span class="w-px flex-1 ' + (done ? "bg-blue-600 dark:bg-blue-500" : "bg-gray-200 dark:bg-white/10") + '"></span>';
        var titleClass = isCurrent
          ? "font-semibold text-gray-900 dark:text-white"
          : done
            ? "font-medium text-gray-900 dark:text-white"
            : "font-medium text-gray-500 dark:text-gray-400";
        var body =
          '<p class="text-sm/5 ' + titleClass + '">' + escapeText(item.title) + "</p>" +
          ((done || isCurrent) && item.meta
            ? '<p class="-mt-1 text-sm/5 font-normal text-gray-500 dark:text-gray-400">' + escapeText(item.meta) + "</p>"
            : "") +
          (isCurrent && item.text
            ? '<p class="text-sm/5 font-normal text-gray-700 dark:text-gray-300">' + item.text + "</p>"
            : "") +
          (isCurrent && item.cta ? item.cta : "");
        return (
          '<li class="flex gap-3" data-setup-step="' + (item.key || "agreement") + '" data-setup-status="' + item.status + '"' + (isCurrent ? ' aria-current="step"' : "") + ">" +
          '<div class="flex w-5 shrink-0 flex-col items-center gap-1">' + marker + line + "</div>" +
          '<div class="flex min-w-0 flex-col gap-2 ' + (item.last ? "" : "pb-6") + '">' + body + "</div>" +
          "</li>"
        );
      })
      .join("");
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
      '          <p class="text-center text-sm/5 font-normal text-gray-500 dark:text-gray-400">A small test deposit was sent to the business card settlement account, this may take 2-3 days to appear depending on the card processor.</p>' +
      "        </div>" +
      "      </div>" +
      '      <div class="flex flex-col gap-2">' +
      '        <label for="sx-inline-deposit-amount" class="block text-sm/6 font-medium text-gray-900 dark:text-white">Amount received</label>' +
      '        <div class="flex items-center rounded-md bg-white pl-3 outline-1 -outline-offset-1 outline-gray-300 has-[input:focus]:outline-2 has-[input:focus]:-outline-offset-2 has-[input:focus]:outline-blue-600 has-[input[aria-invalid=true]]:outline-red-500 dark:bg-white/5 dark:outline-white/10">' +
      '          <span aria-hidden="true" class="shrink-0 text-sm text-gray-500 select-none dark:text-gray-400">$</span>' +
      '          <input id="sx-inline-deposit-amount" type="text" inputmode="decimal" pattern="[0-9]*[.]?[0-9]*" placeholder="0.00" aria-invalid="false" aria-describedby="sx-inline-deposit-amount-help sx-inline-deposit-amount-error" class="block min-w-0 grow bg-transparent py-2 pr-3 pl-1 text-sm font-normal text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-white dark:placeholder:text-gray-500" />' +
      '          <svg id="sx-inline-deposit-amount-error-icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="pointer-events-none mr-3 hidden size-5 shrink-0 text-red-500 sm:size-4"><path d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14ZM8 4a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd" fill-rule="evenodd"/></svg>' +
      "        </div>" +
      '        <p id="sx-inline-deposit-amount-help" class="text-sm text-gray-500 dark:text-gray-400">Enter the exact amount you received.</p>' +
      '        <p id="sx-inline-deposit-amount-error" class="hidden text-sm text-red-600 dark:text-red-400">Only numbers and one decimal point are allowed.</p>' +
      '        <p data-stp-demo-deposit-note hidden class="type-caption text-tertiary">Demo: any amount verifies, e.g. $0.12.</p>' +
      "      </div>" +
      '      <div class="flex flex-col gap-2 rounded-md bg-gray-50 p-3 dark:bg-white/5">' +
      '        <p class="type-title-small text-default">Not seeing it yet? This may take 2-3 days.</p>' +
      '        <ul class="list-disc space-y-1 pl-5 type-description text-secondary"><li>Banks may take a little time to post the micro-deposit.</li><li>The deposit will appear in your card settlement account.</li><li>Card processors have varying settlement times.</li></ul>' +
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
      '          <p class="text-center text-sm/5 font-normal text-gray-500 dark:text-gray-400">Automatic card processing is set up, all future card payments will be processed automatically with notifications sent.</p>' +
      '          <p class="mt-2 text-center text-sm/5 font-normal text-gray-500 dark:text-gray-400">Manually processing on any previous card payments that are Pending Your Action.</p>' +
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

  // The STP walkthrough case instance (SXDemoCase on a ?case= page), or null.
  function demoCase() {
    var C = window.SXDemoCase;
    return C && typeof C.isPortalInstance === "function" && C.isPortalInstance()
      ? C
      : null;
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

  function openOptInModal() {
    // The case instance opts in the same way on every page: the agreement
    // dialog with "sign myself" or "send to the signer" (Figma Scenario 4).
    if (demoCase()) return safelyShowDialog(ensureInlineOptInDialog());
    // Pages with the agreement email step (Payment Preferences) start there;
    // the agreement itself is reviewed from the email or the Review button.
    var sendDialog = document.getElementById("pp-stp-send-agreement-dialog");
    if (safelyShowDialog(sendDialog)) {
      return true;
    }
    return openAgreementReviewModal();
  }

  function openAgreementReviewModal() {
    if (demoCase()) return safelyShowDialog(ensureInlineOptInDialog());
    var dialog = document.getElementById("pp-enable-stp-dialog");
    if (safelyShowDialog(dialog)) {
      return true;
    }
    var inlineDialog = ensureInlineOptInDialog();
    if (safelyShowDialog(inlineDialog)) {
      return true;
    }
    return false;
  }

  function openSetupStepsModal() {
    if (currentState.stpStep === STEP_AGREEMENT_SIGNATURE_PENDING)
      return openPendingDialog();
    var dialog = ensureInlineNextStepsDialog();
    renderSetupSteps(dialog, currentState);
    return safelyShowDialog(dialog);
  }

  // Demo note under the deposit field, only on the case instance.
  function syncDemoDepositNote(dialog) {
    if (!dialog) return;
    var note = dialog.querySelector("[data-stp-demo-deposit-note]");
    if (note) note.hidden = !demoCase();
  }

  function openVerifyModal() {
    var existing = document.getElementById("pp-verify-deposit-dialog");
    syncDemoDepositNote(existing);
    if (safelyShowDialog(existing)) {
      return true;
    }
    var dialog = ensureInlineVerifyDialog();
    syncDemoDepositNote(dialog);
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
        openVerifyModal();
        return;
      }

      var learnMoreTrigger = target.closest("[data-stp-learn-more-trigger]");
      if (learnMoreTrigger) {
        event.preventDefault();
        openSetupStepsModal();
      }
    });
  }

  function closeOpenStpDialogs() {
    [
      "pp-enable-stp-dialog",
      "pp-stp-next-steps-dialog",
      "sx-inline-stp-dialog",
      "sx-inline-stp-next-steps-dialog",
      "sx-inline-stp-verify-dialog",
      "sx-inline-stp-verify-success-dialog",
      "sx-inline-stp-pending-dialog",
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
    markAgreementSigned: markAgreementSigned,
    sendAgreementEmail: sendAgreementEmail,
    isAllowlistedEmail: isAllowlistedEmail,
    isConfigAllowlistedEmail: isConfigAllowlistedEmail,
    getExtraAllowedEmails: getExtraAllowedEmails,
    EXTRA_ALLOWED_KEY: EXTRA_ALLOWED_KEY,
    openSetupStepsModal: openSetupStepsModal,
    openVerifyModal: openVerifyModal,
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

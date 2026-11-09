/**
 * sx-enroll.js — SMART Exchange enrolment for the STP walkthrough
 * (src/pages/sx-enroll/, Figma 9DRzbyv7FDCDYFYN5ZGuwZ "STP Enabled During
 * Payment Flow" 33456:52272).
 *
 * The pages reuse the SMART Disburse onboarding shell and scripts without
 * changing them (onboarding-sidebar / -stepper / -mobile-header / -modal /
 * -field / -sign / -consents, review-documents.js). This file adapts them:
 *   - window.OB_FLOW_STEPS: the 7 enrolment steps (links keep ?case=; signing is on Submit of the summary).
 *   - window.OB_MOBILE_MENU: Contact Us, plus Decline Payment before the
 *     payment is submitted (OBDecline → declined.html).
 *   - window.SDOnboardingContext: a small adapter (getState / saveState) on
 *     sessionStorage `sx-enroll-state`, so OBConsents, OBModal's Contact Us
 *     and review-documents.js keep their state; senderName / billNumber come
 *     from the demo case.
 *   - window.OBGo: wrapped to map SD hops (review-documents.js → paywall.html)
 *     onto this flow and to keep ?case= on every page change.
 *
 * Data: the demo case (SXDemoCase, sx-demo-case.js). Missing or unknown
 * ?case= → a notice with a link to the case launcher instead of the step.
 *
 * Load order in <head>: sx-demo-case.js → onboarding-transitions.js →
 * sx-enroll.js → onboarding-sidebar.js → … → onboarding-stepper.js.
 * Step pages set <body data-sx-step="…">; the Automatic Card Processing and
 * final pages add sx-enroll-acp.js / sx-enroll-complete.js.
 */
(function () {
  "use strict";

  var ASSETS = "../../assets/onboarding/";

  var CASE_ID = (function () {
    try {
      return new URLSearchParams(window.location.search).get("case") || "";
    } catch (error) {
      return "";
    }
  })();

  // Per case, so a tab reused for a new case never shows the previous case's answers.
  var STATE_KEY = "sx-enroll-state:" + CASE_ID;

  /** "payment.html" → "payment.html?case=SX-…" (keeps any hash). */
  function withCase(href) {
    if (!href || !CASE_ID) return href;
    var hash = "";
    var at = href.indexOf("#");
    if (at !== -1) {
      hash = href.slice(at);
      href = href.slice(0, at);
    }
    if (/[?&]case=/.test(href)) return href + hash;
    return (
      href +
      (href.indexOf("?") === -1 ? "?" : "&") +
      "case=" +
      encodeURIComponent(CASE_ID) +
      hash
    );
  }

  // ---- Steps (stepper + mobile header) -------------------------------------

  var STEPS = [
    { id: "confirm-identity", label: "Confirm Identity" },
    { id: "confirm-business-details", label: "Confirm Business Details" },
    { id: "review-documents", label: "Review Documents" },
    { id: "payment", label: "Confirm Payment" },
    { id: "card-processing", label: "Automatic Card Processing" },
    { id: "create-account", label: "Create SMART Exchange" },
    { id: "summary", label: "Complete" },
  ];
  window.OB_FLOW_STEPS = STEPS.map(function (step) {
    return {
      id: step.id,
      label: step.label,
      href: withCase(step.id + ".html"),
    };
  });

  window.OB_MOBILE_MENU = [
    {
      label: "Contact Us",
      icon:
        '<img src="' +
        ASSETS +
        'icon-envelope-mini.svg" alt="" width="20" height="20" class="block size-5">',
      onSelect: function () {
        if (window.OBContact) window.OBContact.open();
      },
    },
  ];
  // Decline Payment until the payment is submitted (not on the end screens).
  if (!/\/(complete|declined|sign-agreement)\.html$/.test(window.location.pathname))
    window.OB_MOBILE_MENU.push({
      label: "Decline Payment",
      icon:
        '<img src="' +
        ASSETS +
        'icon-x-circle-mini.svg" alt="" width="20" height="20" class="block size-5">',
      onSelect: function () {
        if (window.OBDecline) window.OBDecline.open();
      },
    });

  // ---- Session state + SD context adapter ----------------------------------

  function getState() {
    try {
      var parsed = JSON.parse(sessionStorage.getItem(STATE_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function saveState(patch) {
    var next = Object.assign(getState(), patch || {});
    try {
      sessionStorage.setItem(STATE_KEY, JSON.stringify(next));
    } catch (error) {}
    return next;
  }

  function currentCase() {
    var c = window.SXDemoCase ? window.SXDemoCase.get() : null;
    return c && c.id === CASE_ID ? c : null;
  }

  if (!window.SDOnboardingContext) {
    window.SDOnboardingContext = {
      getState: function () {
        var c = currentCase();
        return Object.assign(
          c
            ? {
                senderName: c.payer.name,
                billNumber: c.payment.invoice,
                payableContext: {
                  senderName: c.payer.name,
                  amountFormatted: money(c.payment.amount, c.payment.currency),
                },
              }
            : {},
          getState(),
        );
      },
      saveState: saveState,
    };
  }

  // ---- Navigation ----------------------------------------------------------

  // SD hops used inside the shared scripts → this flow's pages.
  var ROUTES = { "paywall.html": "payment.html" };

  function route(href) {
    var file = String(href || "");
    if (ROUTES[file]) file = ROUTES[file];
    return withCase(file);
  }

  if (typeof window.OBGo === "function") {
    var sdGo = window.OBGo;
    window.OBGo = function (href) {
      sdGo(route(href));
    };
  }

  function go(href) {
    if (window.OBGo) window.OBGo(href);
    else window.location.href = route(href);
  }

  // ---- Formatting ----------------------------------------------------------

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[ch];
    });
  }

  function money(amount, currency) {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency || "USD",
      }).format(Number(amount) || 0);
    } catch (error) {
      return "$" + (Number(amount) || 0).toFixed(2);
    }
  }

  /** 3526 → { integer: "$3,526", decimal: ".00" } */
  function amountParts(amount, currency) {
    var text = money(amount, currency);
    var m = text.match(/^(.*?)(\.\d{2})$/);
    return m ? { integer: m[1], decimal: m[2] } : { integer: text, decimal: "" };
  }

  function contactName(c) {
    return [c.supplier.contactFirst, c.supplier.contactLast]
      .filter(Boolean)
      .join(" ");
  }

  /** "04/06/2026, 11:53:17 AM" as in the Figma acknowledgement cards. */
  function stamp(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function longDate(iso) {
    var d = new Date(String(iso).length === 10 ? iso + "T00:00:00" : iso);
    if (isNaN(d.getTime())) return String(iso || "");
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  }

  // ---- Shared bits of markup -----------------------------------------------

  /** Description list row (components skill). */
  function row(label, valueHtml, extra) {
    return (
      '<div class="grid grid-cols-2 gap-4 self-stretch">' +
      '<span class="text-sm font-medium text-gray-900 dark:text-white">' +
      esc(label) +
      "</span>" +
      '<span class="min-w-0 text-sm font-normal break-words text-gray-700 dark:text-gray-300' +
      (extra ? " " + extra : "") +
      '">' +
      valueHtml +
      "</span>" +
      "</div>"
    );
  }

  /** OBField text input with label, error icon and error line. */
  function textField(id, label, value, opts) {
    var F = window.OBField;
    opts = opts || {};
    return (
      '<div class="flex w-full flex-col gap-1" data-sx-field="' +
      id +
      '">' +
      '<label for="' +
      id +
      '" class="' +
      F.LABEL +
      '">' +
      esc(label) +
      "</label>" +
      '<div class="relative">' +
      (opts.multiline
        ? '<textarea id="' +
          id +
          '" rows="' +
          (opts.rows || 4) +
          '" aria-invalid="false" aria-describedby="' +
          id +
          '-error"' +
          (opts.maxLength ? ' maxlength="' + opts.maxLength + '"' : "") +
          ' class="' +
          F.TEXTAREA +
          ' resize-y">' +
          esc(value) +
          "</textarea>"
        : '<input id="' +
          id +
          '" type="' +
          (opts.type || "text") +
          '" value="' +
          esc(value) +
          '" autocomplete="' +
          (opts.autocomplete || "off") +
          '" aria-invalid="false" aria-describedby="' +
          id +
          '-error"' +
          (opts.disabled ? " disabled" : "") +
          (opts.placeholder ? ' placeholder="' + esc(opts.placeholder) + '"' : "") +
          ' class="' +
          F.INPUT +
          (opts.inputClass ? " " + opts.inputClass : "") +
          '">' +
          F.errorIcon()) +
      (opts.after || "") +
      "</div>" +
      (opts.helper
        ? '<p class="' + F.HELPER + '">' + esc(opts.helper) + "</p>"
        : "") +
      '<p id="' +
      id +
      '-error" class="hidden ' +
      F.ERROR_TEXT +
      '"></p>' +
      "</div>"
    );
  }

  function fieldError(input, message) {
    var helper = document.getElementById(input.id + "-error");
    window.OBField.setError(input, !!message, helper, message || "");
  }

  var SPINNER =
    '<svg class="size-4 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>' +
    '<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z"></path></svg>';

  /** Button loading state: disabled, spinner + label; returns a restore fn. */
  function setLoading(button, label) {
    var html = button.innerHTML;
    var wasDisabled = button.disabled;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.innerHTML = SPINNER + "<span>" + esc(label) + "</span>";
    return function restore() {
      button.innerHTML = html;
      button.disabled = wasDisabled;
      button.removeAttribute("aria-busy");
    };
  }

  // ---- Missing case notice -------------------------------------------------

  function renderNotice() {
    var launcher = window.SXDemoCase
      ? window.SXDemoCase.urls().launcher
      : "../demo/stp-case.html";
    var content = document.querySelector("[data-ob-content]");
    if (!content) return;
    content.innerHTML =
      '<div class="flex flex-col gap-6 px-4 pt-10 pb-10 lg:px-14 lg:pt-14">' +
      '<div role="status" class="flex w-full max-w-md flex-col gap-3 rounded-lg border border-default bg-tertiary p-4">' +
      '<p class="type-title-small text-default">No demo case found</p>' +
      '<p class="type-description text-tertiary">' +
      (CASE_ID
        ? "The case " + esc(CASE_ID) + " is not in this browser anymore. "
        : "This enrolment link needs a demo case. ") +
      "Create one in the case launcher and start the enrolment from there.</p>" +
      '<a href="' +
      esc(launcher) +
      '" class="inline-flex w-fit items-center gap-1.5 rounded-sm text-sm font-semibold text-blue-600 dark:text-blue-400 transition-colors hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400">' +
      "Open the case launcher" +
      '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path fill-rule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.19L10.22 5.53a.75.75 0 1 1 1.06-1.06l5 5a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 1 1-1.06-1.06l3.72-3.72H3.75A.75.75 0 0 1 3 10Z" clip-rule="evenodd" /></svg>' +
      "</a>" +
      "</div>" +
      "</div>";
  }

  // ---- Page registry -------------------------------------------------------

  var pages = {};

  function page(name, init) {
    pages[name] = init;
  }

  function keepCaseOnLinks() {
    if (!CASE_ID) return;
    var links = document.querySelectorAll("a[href]");
    for (var i = 0; i < links.length; i += 1) {
      var href = links[i].getAttribute("href");
      if (/^[\w-]+\.html(#.*)?$/.test(href))
        links[i].setAttribute("href", withCase(href));
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    keepCaseOnLinks();
    var step = document.body.getAttribute("data-sx-step");
    var ready = (window.SXDemoCase ? window.SXDemoCase.ready() : Promise.resolve())
      .then(function () {
        var c = currentCase();
        if (!c) {
          renderNotice();
          return;
        }
        if (pages[step]) return pages[step](c);
      })
      .catch(function (error) {
        console.error("[sx-enroll]", error);
      });
    if (window.OnboardingTransitions && window.OnboardingTransitions.waitFor)
      window.OnboardingTransitions.waitFor(ready);
  });

  // =========================================================================
  // Steps
  // =========================================================================

  // ---- Declined (sidebar / mobile menu → OBDecline) --------------------------

  page("declined", function (c) {
    var declined = window.SDOnboardingContext.getState().declined || {};
    if (declined.reason && !(c.enrol && c.enrol.declined))
      window.SXDemoCase.update({ enrol: { declined: declined } });
    document.querySelector("[data-sx-declined-reason]").textContent = declined.reason || "—";
    document.querySelector("[data-sx-declined-note]").textContent = declined.note || "";
  });

  // ---- Welcome -------------------------------------------------------------

  page("welcome", function (c) {
    var set = function (sel, text) {
      var nodes = document.querySelectorAll(sel);
      for (var i = 0; i < nodes.length; i += 1) nodes[i].textContent = text;
    };
    set("[data-sx-supplier]", c.supplier.name);
    set("[data-sx-amount]", money(c.payment.amount, c.payment.currency));
    set("[data-sx-payer]", c.payer.name);
    var learn = document.querySelector("[data-sx-learn]");
    if (learn)
      learn.addEventListener("click", function () {
        var M = window.OBModal;
        M.open(
          '<div class="flex flex-col gap-4 px-8 pb-8">' +
            M.illustration("icon-info-circle-blue.svg", "bg-blue-50 dark:bg-blue-500/10") +
            '<h2 id="sx-learn-title" class="text-xl font-bold text-gray-900 dark:text-white">' +
            esc(c.payer.name) +
            " is enhancing the way they pay you</h2>" +
            '<div class="flex flex-col gap-4 text-sm text-gray-500 dark:text-gray-400">' +
            "<p>" +
            esc(c.payer.name) +
            " has partnered with Transcard to move payments and documents online and retire the paper-based process.</p>" +
            "<p>With SMART Exchange you see every payment from " +
            esc(c.payer.name) +
            " in one place, with faster processing and better tracking and reconciliation.</p>" +
            "<p>Questions about the change? Use <span class=\"font-semibold text-gray-900 dark:text-white\">Contact Us</span> in the menu.</p>" +
            "</div>" +
            "</div>",
          "sx-learn-title",
        );
      });
  });

  // ---- 1. Confirm Identity -------------------------------------------------

  page("confirm-identity", function (c) {
    var card = document.querySelector("[data-sx-identity]");
    var next = document.querySelector("[data-sx-next]");
    var saved = getState().identity || {};
    var tinDigits = String(c.supplier.tin || "").replace(/\D/g, "");
    card.innerHTML =
      textField("sx-invoice", "Invoice Number", saved.invoice || c.payment.invoice, {
        placeholder: "e.g. INV-1001",
      }) +
      textField("sx-vendor", "Your Vendor ID", saved.vendorId || tinDigits.slice(-4), {
        placeholder: "e.g. 0000",
      });
    var invoice = document.getElementById("sx-invoice");
    var vendor = document.getElementById("sx-vendor");
    var touched = {};

    function message(input) {
      var v = input.value.trim();
      if (input === invoice) {
        if (!v) return "Invoice Number is required";
        if (v.toLowerCase() !== String(c.payment.invoice).toLowerCase())
          return "This invoice number doesn’t match the payment (" + c.payment.invoice + ").";
        return "";
      }
      if (!v) return "Your Vendor ID is required";
      if (v.length < 4) return "Enter at least 4 characters";
      return "";
    }

    function sync() {
      [invoice, vendor].forEach(function (input) {
        if (touched[input.id]) fieldError(input, message(input));
      });
      next.disabled = !invoice.value.trim() || !vendor.value.trim();
    }

    [invoice, vendor].forEach(function (input) {
      input.addEventListener("input", sync);
      input.addEventListener("blur", function () {
        touched[input.id] = true;
        sync();
      });
    });

    document.querySelector("[data-sx-form]").addEventListener("submit", function (event) {
      event.preventDefault();
      touched[invoice.id] = touched[vendor.id] = true;
      sync();
      var bad = [invoice, vendor].filter(function (i) {
        return message(i);
      })[0];
      if (bad) {
        bad.focus();
        return;
      }
      saveState({
        identity: { invoice: invoice.value.trim(), vendorId: vendor.value.trim() },
      });
      go("confirm-business-details.html");
    });
    sync();
  });

  // ---- 2. Confirm Business Details -----------------------------------------

  page("confirm-business-details", function (c) {
    var body = document.querySelector("[data-sx-business]");
    var editBtn = document.querySelector("[data-sx-business-edit]");
    var next = document.querySelector("[data-sx-next]");
    var nameEls = document.querySelectorAll("[data-sx-supplier]");
    var revealed = false;

    function paintName() {
      for (var i = 0; i < nameEls.length; i += 1)
        nameEls[i].textContent = c.supplier.name;
    }

    function tinHtml() {
      var digits = String(c.supplier.tin || "").replace(/\D/g, "");
      var text = revealed ? c.supplier.tin : "•••••" + digits.slice(-4);
      return (
        '<span class="inline-flex items-center gap-1.5">' +
        "<span>" +
        esc(text) +
        "</span>" +
        '<button type="button" data-sx-tin-toggle aria-pressed="' +
        revealed +
        '" class="inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-white/15 hover:text-gray-600 focus-visible:outline-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400">' +
        '<span class="sr-only">' +
        (revealed ? "Hide" : "Show") +
        " TIN</span>" +
        (revealed
          ? '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path fill-rule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z" clip-rule="evenodd" /><path d="m10.748 13.93 2.523 2.523a9.987 9.987 0 0 1-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 0 1 0-1.186A10.007 10.007 0 0 1 2.839 6.02L6.07 9.252a4 4 0 0 0 4.678 4.678Z" /></svg>'
          : '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /><path fill-rule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clip-rule="evenodd" /></svg>') +
        "</button></span>"
      );
    }

    function renderView() {
      editBtn.hidden = false;
      next.disabled = false;
      body.innerHTML =
        row("Business Legal Name", '<span data-ob-skeleton>' + esc(c.supplier.name) + "</span>") +
        row("Business Address", '<span data-ob-skeleton>' + esc(c.supplier.address) + "</span>", "whitespace-pre-line") +
        row("Taxpayer Identification Number (TIN)", tinHtml()) +
        row("Primary Contact Name", '<span data-ob-skeleton>' + esc(contactName(c)) + "</span>") +
        row("Primary Contact Email Address", '<span data-ob-skeleton>' + esc(c.supplier.email) + "</span>") +
        row("Primary Contact Phone Number", '<span data-ob-skeleton>' + esc(c.supplier.phone) + "</span>");
      paintName();
    }

    function renderEdit() {
      var M = window.OBModal;
      editBtn.hidden = true;
      next.disabled = true;
      body.innerHTML =
        '<div class="flex w-full flex-col gap-4">' +
        textField("sx-biz-name", "Business Legal Name", c.supplier.name, { autocomplete: "organization" }) +
        textField("sx-biz-address", "Business Address", c.supplier.address, { multiline: true, rows: 4 }) +
        '<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">' +
        textField("sx-biz-first", "Contact First Name", c.supplier.contactFirst, { autocomplete: "given-name" }) +
        textField("sx-biz-last", "Contact Last Name", c.supplier.contactLast, { autocomplete: "family-name" }) +
        "</div>" +
        textField("sx-biz-email", "Contact Email Address", c.supplier.email, { type: "email", autocomplete: "email" }) +
        textField("sx-biz-phone", "Contact Phone Number", c.supplier.phone, { type: "tel", autocomplete: "tel" }) +
        '<div class="flex justify-end gap-2">' +
        '<button type="button" data-sx-biz-cancel class="' + M.SECONDARY_BUTTON_MD + '">Cancel</button>' +
        '<button type="button" data-sx-biz-save class="' + M.PRIMARY_BUTTON_MD + '">Save</button>' +
        "</div>" +
        "</div>";
      var inputs = {
        name: document.getElementById("sx-biz-name"),
        address: document.getElementById("sx-biz-address"),
        contactFirst: document.getElementById("sx-biz-first"),
        contactLast: document.getElementById("sx-biz-last"),
        email: document.getElementById("sx-biz-email"),
        phone: document.getElementById("sx-biz-phone"),
      };
      var labels = {
        name: "Business Legal Name",
        address: "Business Address",
        contactFirst: "Contact First Name",
        contactLast: "Contact Last Name",
        email: "Contact Email Address",
        phone: "Contact Phone Number",
      };
      function check(key) {
        var v = inputs[key].value.trim();
        var msg = !v ? labels[key] + " is required" : key === "email" && !isEmail(v) ? "Enter a valid email address" : "";
        fieldError(inputs[key], msg);
        return !msg;
      }
      Object.keys(inputs).forEach(function (key) {
        inputs[key].addEventListener("blur", function () {
          check(key);
        });
        inputs[key].addEventListener("input", function () {
          if (inputs[key].getAttribute("aria-invalid") === "true") check(key);
        });
      });
      body.querySelector("[data-sx-biz-cancel]").addEventListener("click", function () {
        renderView();
        editBtn.focus();
      });
      body.querySelector("[data-sx-biz-save]").addEventListener("click", function () {
        var bad = Object.keys(inputs).filter(function (key) {
          return !check(key);
        });
        if (bad.length) {
          inputs[bad[0]].focus();
          return;
        }
        var patch = {};
        Object.keys(inputs).forEach(function (key) {
          patch[key] = inputs[key].value.trim();
        });
        c = window.SXDemoCase.update({ supplier: patch }) || c;
        renderView();
        editBtn.focus();
      });
      inputs.name.focus();
    }

    body.addEventListener("click", function (event) {
      if (!event.target.closest("[data-sx-tin-toggle]")) return;
      revealed = !revealed;
      renderView();
      body.querySelector("[data-sx-tin-toggle]").focus();
    });
    editBtn.addEventListener("click", renderEdit);
    next.addEventListener("click", function () {
      if (!next.disabled) go("review-documents.html");
    });
    renderView();
  });

  // ---- 5. Confirm Payment --------------------------------------------------

  page("payment", function (c) {
    var M = window.OBModal;
    var parts = amountParts(c.payment.amount, c.payment.currency);
    document.querySelector("[data-pay-integer]").textContent = parts.integer;
    document.querySelector("[data-pay-decimal]").textContent = parts.decimal;
    document.querySelector("[data-pay-sender]").textContent = c.payer.name;

    function info(icon, title, html) {
      M.open(
        '<div class="flex flex-col items-center gap-6 px-6 pb-6">' +
          '<div class="flex w-full flex-col items-center gap-4">' +
          M.illustration(icon, "bg-blue-50 dark:bg-blue-500/10") +
          '<div class="flex w-full flex-col items-center gap-2 text-center">' +
          '<h2 id="pay-dialog-title" class="text-lg leading-6 font-medium text-gray-900 dark:text-white">' +
          esc(title) +
          "</h2>" +
          html +
          "</div></div></div>",
        "pay-dialog-title",
        {
          footer:
            '<div class="flex flex-col px-6 pb-6"><button type="button" data-ob-modal-close class="' +
            M.PRIMARY_BUTTON +
            '">OK</button></div>',
        },
      );
    }

    document.querySelector('[data-pay-chip="message"]').addEventListener("click", function () {
      info(
        "icon-chat-alt-lined.svg",
        "A note from " + c.payer.name,
        '<p class="text-sm leading-5 text-gray-500 dark:text-gray-400">Payment for invoice ' +
          esc(c.payment.invoice) +
          ". Thank you for your business.</p>",
      );
    });
    document.querySelector('[data-pay-chip="expiration"]').addEventListener("click", function () {
      var initiated = new Date(c.payment.dateInitiated + "T00:00:00");
      if (isNaN(initiated.getTime())) initiated = new Date();
      initiated.setDate(initiated.getDate() + 90);
      info(
        "icon-calendar-lined.svg",
        "Expiration",
        '<p class="text-sm leading-5 text-gray-500 dark:text-gray-400">This card payment can be processed until the date below. After that the card is closed.</p>' +
          '<p class="text-sm leading-5 font-medium text-gray-900 dark:text-white">Expiration Date: ' +
          esc(longDate(initiated.toISOString())) +
          "</p>",
      );
    });
    document.querySelector("[data-sx-method]").addEventListener("click", function () {
      saveState({ paymentMethod: "card" });
      go("card-processing.html");
    });
  });

  // ---- 7. Create SMART Exchange --------------------------------------------

  var RULES = {
    length: function (v) {
      return v.length >= 8;
    },
    upper: function (v) {
      return /[A-Z]/.test(v);
    },
    lower: function (v) {
      return /[a-z]/.test(v);
    },
    number: function (v) {
      return /[0-9]/.test(v);
    },
    special: function (v) {
      return /[^A-Za-z0-9]/.test(v);
    },
    sequence: function (v) {
      return !hasRun(v, 4);
    },
  };

  /** True when `value` holds a step-by-one run (1234, dcba) of `len` (create-account.js). */
  function hasRun(value, len) {
    var run = 1;
    var direction = 0;
    for (var i = 1; i < value.length; i += 1) {
      var delta = value.charCodeAt(i) - value.charCodeAt(i - 1);
      if (delta === 1 || delta === -1) {
        if (delta === direction) run += 1;
        else {
          direction = delta;
          run = 2;
        }
        if (run >= len) return true;
      } else {
        direction = 0;
        run = 1;
      }
    }
    return false;
  }

  var EYE =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5" data-eye-open><path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /><path fill-rule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clip-rule="evenodd" /></svg>';

  function eyeButton(id) {
    return (
      '<button type="button" data-sx-eye="' +
      id +
      '" aria-pressed="false" class="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-600 focus-visible:outline-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400">' +
      '<span class="sr-only">Show password</span>' +
      EYE +
      "</button>"
    );
  }

  page("create-account", function (c) {
    var customer = document.querySelector("[data-sx-payer]");
    if (customer) customer.textContent = c.payer.name;
    var account = (c.enrol && c.enrol.account) || {};
    var form = document.querySelector("[data-sx-account]");
    var next = document.querySelector("[data-sx-next]");
    form.innerHTML =
      '<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">' +
      textField("sx-first", "First Name", account.firstName || c.supplier.contactFirst, { autocomplete: "given-name" }) +
      textField("sx-last", "Last Name", account.lastName || c.supplier.contactLast, { autocomplete: "family-name" }) +
      "</div>" +
      textField("sx-email", "Email", c.supplier.email, {
        type: "email",
        disabled: true,
        inputClass: "pr-10",
        helper: "Your username. It’s the contact email on file.",
        after:
          '<svg viewBox="0 0 20 20" fill="currentColor" aria-label="Verified" role="img" class="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-green-600"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" /></svg>',
      }) +
      textField("sx-password", "Create Password", "", {
        type: "password",
        autocomplete: "new-password",
        inputClass: "pr-10 aria-invalid:pr-10",
        after: eyeButton("sx-password"),
      }) +
      textField("sx-confirm", "Confirm Password", "", {
        type: "password",
        autocomplete: "new-password",
        inputClass: "pr-10 aria-invalid:pr-10",
        after: eyeButton("sx-confirm"),
      }) +
      document.getElementById("sx-rules-template").innerHTML;

    // The eye button sits where the error icon would; keep only the eye.
    ["sx-password", "sx-confirm"].forEach(function (id) {
      var icon = document.getElementById(id).parentElement.querySelector("[data-ob-field-icon]");
      if (icon) icon.remove();
    });

    var first = document.getElementById("sx-first");
    var last = document.getElementById("sx-last");
    var password = document.getElementById("sx-password");
    var confirm = document.getElementById("sx-confirm");
    var rules = form.querySelector("[data-sx-rules]");
    var touched = {};

    function paintRules(value) {
      var all = true;
      Object.keys(RULES).forEach(function (key) {
        var li = rules.querySelector('[data-rule="' + key + '"]');
        var ok = RULES[key](value);
        if (!ok) all = false;
        var icon = li.querySelector("[data-rule-icon]");
        icon.classList.toggle("text-green-600", ok);
        icon.classList.toggle("text-gray-400", !ok);
        icon.classList.toggle("dark:text-gray-500", !ok);
        li.classList.toggle("text-gray-900", ok);
        li.classList.toggle("dark:text-white", ok);
        li.classList.toggle("text-gray-700", !ok);
        li.classList.toggle("dark:text-gray-300", !ok);
      });
      return all;
    }

    function sync() {
      var rulesOk = paintRules(password.value);
      if (touched.first) fieldError(first, first.value.trim() ? "" : "First Name is required");
      if (touched.last) fieldError(last, last.value.trim() ? "" : "Last Name is required");
      if (touched.password)
        fieldError(password, !password.value ? "Create a password" : rulesOk ? "" : "The password doesn’t meet every rule below");
      if (touched.confirm)
        fieldError(confirm, !confirm.value ? "Confirm your password" : confirm.value === password.value ? "" : "Passwords don’t match");
      next.disabled = !(first.value.trim() && last.value.trim() && rulesOk && confirm.value && confirm.value === password.value);
    }

    [["first", first], ["last", last], ["password", password], ["confirm", confirm]].forEach(function (pair) {
      pair[1].addEventListener("input", sync);
      pair[1].addEventListener("blur", function () {
        touched[pair[0]] = true;
        sync();
      });
    });

    form.addEventListener("click", function (event) {
      var eye = event.target.closest("[data-sx-eye]");
      if (!eye) return;
      var input = document.getElementById(eye.getAttribute("data-sx-eye"));
      var show = input.type === "password";
      input.type = show ? "text" : "password";
      eye.setAttribute("aria-pressed", String(show));
      eye.querySelector(".sr-only").textContent = show ? "Hide password" : "Show password";
    });

    next.addEventListener("click", function () {
      if (next.disabled) return;
      var patch = {
        enrol: {
          account: {
            username: c.supplier.email,
            firstName: first.value.trim(),
            lastName: last.value.trim(),
            createdAt: new Date().toISOString(),
          },
        },
        supplier: { contactFirst: first.value.trim(), contactLast: last.value.trim() },
      };
      window.SXDemoCase.update(patch);
      go("summary.html");
    });
    sync();
  });

  // ---- 8. Summary ("Almost Done") ------------------------------------------

  page("summary", function (c) {
    var parts = amountParts(c.payment.amount, c.payment.currency);
    document.querySelector("[data-pay-integer]").textContent = parts.integer;
    document.querySelector("[data-pay-decimal]").textContent = parts.decimal;
    var digits = String(c.supplier.tin || "").replace(/\D/g, "");
    document.querySelector("[data-sx-business]").innerHTML =
      row("Business Legal Name", esc(c.supplier.name)) +
      row("Business Address", esc(c.supplier.address), "whitespace-pre-line") +
      row("Taxpayer Identification Number (TIN)", "•••••" + esc(digits.slice(-4))) +
      row("Primary Contact Name", esc(contactName(c))) +
      row("Primary Contact Email Address", esc(c.supplier.email)) +
      row("Primary Contact Phone Number", esc(c.supplier.phone));
    document.querySelector("[data-sx-cardholder]").innerHTML =
      row("Cardholder Name", esc(c.payer.name)) +
      row("Cardholder Address", esc(c.payer.address), "whitespace-pre-line") +
      row("Type", document.getElementById("sx-visa-badge").innerHTML) +
      row(
        "Automatic Card Processing",
        c.enrol && c.enrol.stp === "on"
          ? c.enrol.signer === "other"
            ? "Enrolled · waiting for the authorized signer"
            : "Enrolled · agreement accepted"
          : "Not enrolled",
      );

    var submit = document.querySelector("[data-sx-submit]");
    var list = document.querySelector("[data-sx-consents]");
    var loaded = window.OBModal.loadJson("../../data/sd-virtual-card.json", ["agreements"]).then(function (data) {
      if (!data) return;
      window.OBConsents.mount(list, data.agreements, {
        stateKey: "consents",
        documentScroll: true,
        onChange: function (all) {
          submit.disabled = !all;
        },
      });
    });
    // Submit = sign: the shared "Sign to authorize payment" dialog (OBSign), then complete.
    submit.addEventListener("click", function () {
      if (submit.disabled) return;
      window.OBSign.open({
        name: contactName(c),
        onSigned: function (signature) {
          saveState({
            signature: {
              method: signature.method,
              name: signature.name || contactName(c),
              signedAt: new Date().toISOString(),
            },
          });
          window.SXDemoCase.update({ enrol: { completedAt: new Date().toISOString() } });
          window.OBModal.close();
          go("complete.html");
        },
      });
    });
    return loaded;
  });

  /**
   * SX look for the shared SD sidebar (onboarding-sidebar.js renders it on
   * DOMContentLoaded, after this script's listener, hence the timeout): the
   * SMART Exchange logo from Figma (36525:48449) and a 48px side padding so
   * "Automatic Card Processing" stays on one line.
   */
  function applySidebarLook() {
    var slots = document.querySelectorAll("[data-ob-sidebar]");
    for (var i = 0; i < slots.length; i += 1) {
      slots[i].classList.replace("px-14", "px-12");
      var logo = slots[i].querySelector('img[src$="menu-logo.svg"]');
      if (!logo) continue;
      var mark = logo.parentNode;
      mark.classList.remove("rotate-180");
      logo.src = "../../assets/sx-enroll/sx-menu-logo.svg";
      logo.width = 26;
      logo.height = 26;
      logo.className = "absolute inset-0 block size-full";
    }
  }
  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(applySidebarLook, 0);
  });

  /**
   * Document dialogs (SX only): the Review Documents viewer (review-documents.js
   * → OBModal, max 752px tall with a 24px top/bottom gap) and the Visa agreement
   * on Automatic Card Processing (sx-enroll-acp.js) fill the screen
   * instead, with the same 16px gap on every side. The document area scrolls
   * inside; header and footer stay visible. OBModal itself is unchanged: the
   * call is wrapped and the frame padding swapped after it opens.
   */
  var VIEWER_PANEL =
    "relative flex h-[calc(100dvh-2rem)] w-full max-w-[1048px] flex-col overflow-hidden rounded-lg bg-white dark:bg-gray-900 shadow-lg ring-1 ring-black/5 dark:ring-white/10";

  var FULL_HEIGHT_DIALOGS = ["doc-viewer-title", "sx-agreement-title"];

  function fullHeightViewer() {
    var M = window.OBModal;
    if (!M || M.sxViewerWrapped) return;
    M.sxViewerWrapped = true;
    var open = M.open;
    M.open = function (body, labelledBy, opts) {
      if (FULL_HEIGHT_DIALOGS.indexOf(labelledBy) === -1)
        return open.apply(M, arguments);
      var backdrop = open.call(
        M,
        body,
        labelledBy,
        Object.assign({}, opts, { panelClass: VIEWER_PANEL }),
      );
      var frame = backdrop.querySelector("[data-ob-modal-frame]");
      if (frame) {
        frame.classList.remove("px-4", "py-6");
        frame.classList.add("p-4");
      }
      return backdrop;
    };
  }
  document.addEventListener("DOMContentLoaded", fullHeightViewer);

  window.SXEnroll = {
    CASE_ID: CASE_ID,
    page: page,
    go: go,
    withCase: withCase,
    getState: getState,
    saveState: saveState,
    currentCase: currentCase,
    esc: esc,
    money: money,
    amountParts: amountParts,
    contactName: contactName,
    stamp: stamp,
    longDate: longDate,
    isEmail: isEmail,
    row: row,
    textField: textField,
    fieldError: fieldError,
    setLoading: setLoading,
  };
})();

/**
 * sx-preboarding.js — SMART Exchange Preboarding, token flow, new user
 * (TCDM-5263; Figma [R3] SMART Exchange 9DRzbyv7FDCDYFYN5ZGuwZ, page
 * "↳ Preboarding (w/ and no token)", section "w/ Token Flow" → "EMAIL DOESN'T
 * EXIST" 38223:39783).
 *
 * Preboarding is sent with NO payment: the supplier confirms identity and
 * business, picks a preferred payment method, creates an account and lands in
 * the SMART Exchange portal. It is parallel to "onboarding with payment"
 * (src/pages/sx-onboarding/, sx-onboarding.js), not a version of it, and edits
 * none of its files. Like sx-onboarding.js it reuses the SMART Disburse shell
 * unchanged (onboarding-sidebar / -stepper / -mobile-header / -modal / -field /
 * -consents / -bank / -transitions):
 *   - window.OB_FLOW_STEPS: the 5 Figma steps (Confirm Identity, Business
 *     Details, Payment Preference, Create an Account, Complete).
 *   - window.OB_MOBILE_MENU: Contact Us only (nothing to decline).
 *   - window.SDOnboardingContext: getState / saveState on sessionStorage
 *     `sx-preboarding-state` (OBConsents, OBContact read it).
 *
 * Data: src/data/sx-preboarding.json, copied once per tab into sessionStorage
 * `sx-preboarding-sample`. Pages set <body data-pb-step="…">; the business,
 * bank and check forms live in sx-preboarding-forms.js (loaded after this).
 *
 * Method ("card" | "bank-account" | "check" | "later") is saved in the state.
 * Figma's preboarding card path has no Automatic Card Processing step (no
 * payment to process), so none is shown here.
 *
 * On Submit (summary) the result is written to localStorage for the Supplier
 * Portal's Payment Preferences (payment-preferences-page.js):
 *   `sx_preboarding_v1`     { business, method, bankAccount, checkAddress, completedAt }
 *   `pp_default_methods_v1` ["payers-card" | <bank id> | <address id>]
 */
(function () {
  "use strict";

  var ASSETS = "../../assets/onboarding/";
  var STATE_KEY = "sx-preboarding-state";
  var SAMPLE_KEY = "sx-preboarding-sample";
  var DATA_PATH = "../../data/sx-preboarding.json";
  // Read by payment-preferences-page.js (Supplier Portal, default `pp_` prefix only).
  var PORTAL_KEY = "sx_preboarding_v1";
  var PORTAL_DEFAULTS_KEY = "pp_default_methods_v1";

  // ---- Steps (stepper + mobile header) -------------------------------------

  window.OB_FLOW_STEPS = [
    { id: "confirm-identity", label: "Confirm Identity", href: "confirm-identity.html" },
    { id: "business-details", label: "Business Details", href: "business-details.html" },
    {
      id: "payment-preference",
      label: "Payment Preference",
      href: "payment-preference.html",
      alsoMatches: ["accept-card", "bank-account", "paper-check"],
    },
    { id: "create-account", label: "Create an Account", href: "create-account.html" },
    { id: "summary", label: "Complete", href: null },
  ];

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

  // ---- Session state --------------------------------------------------------

  function isPlainObject(value) {
    return value !== null && typeof value === "object" && Object.prototype.toString.call(value) === "[object Object]";
  }

  function getState() {
    try {
      var parsed = JSON.parse(sessionStorage.getItem(STATE_KEY) || "{}");
      return isPlainObject(parsed) ? parsed : {};
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

  function readSample() {
    try {
      var parsed = JSON.parse(sessionStorage.getItem(SAMPLE_KEY) || "null");
      return isPlainObject(parsed) && parsed.id ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function loadSample() {
    if (readSample() || !window.DataSource) return Promise.resolve(readSample());
    return window.DataSource.load(DATA_PATH).then(function (data) {
      if (!isPlainObject(data)) return null;
      var sample = JSON.parse(JSON.stringify(data));
      delete sample._comment;
      try {
        sessionStorage.setItem(SAMPLE_KEY, JSON.stringify(sample));
      } catch (error) {}
      return sample;
    });
  }

  if (!window.SDOnboardingContext) {
    window.SDOnboardingContext = {
      getState: function () {
        var s = readSample();
        return Object.assign(s ? { senderName: s.buyer.name } : {}, getState());
      },
      saveState: saveState,
    };
  }

  /** The business as confirmed on Business Details (falls back to the sample). */
  function business(s) {
    var saved = getState().business;
    if (saved) return saved;
    var sup = s.supplier;
    return {
      contactFirst: sup.contactFirst,
      contactLast: sup.contactLast,
      email: sup.email,
      phone: sup.phone,
      name: sup.name,
      dba: sup.dba,
      dbaSameAsLegal: !!sup.dbaSameAsLegal,
      tin: sup.tin,
      address: Object.assign({}, sup.address),
    };
  }

  function method() {
    return String(getState().method || "");
  }

  // ---- Navigation -----------------------------------------------------------

  function go(href) {
    if (window.OBGo) window.OBGo(href);
    else window.location.href = href;
  }

  // ---- Formatting -----------------------------------------------------------

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  }

  function digits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  var STATE_NAMES = {};
  function setStateNames(map) {
    STATE_NAMES = map || {};
  }

  /** { line1, line2, line3, city, state, zip, country } → 4-line address. */
  function addressText(a) {
    if (!a) return "";
    var cityLine = [a.city, [STATE_NAMES[a.state] || a.state, a.zip].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", ");
    return [a.line1, a.line2, a.line3, cityLine, a.country === "US" || !a.country ? "United States" : a.country]
      .filter(function (line) {
        return line && String(line).trim();
      })
      .join("\n");
  }

  function contactName(b) {
    return [b.contactFirst, b.contactLast].filter(Boolean).join(" ");
  }

  // ---- Classes (copied from the components skill / sx-onboarding pages) ----

  var FOCUS =
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400";
  // Select field trigger at Text Field [New] size (smart-enroll/business-information.js).
  var SELECT_TRIGGER =
    "group/select grid h-10 w-full cursor-default grid-cols-1 rounded-md bg-white py-1.5 pr-2 pl-3 text-left text-base/6 text-gray-900 shadow-xs outline-1 -outline-offset-1 outline-gray-300 hover:outline-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 " +
    "aria-invalid:outline-red-300 aria-invalid:hover:outline-red-400 aria-invalid:focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:hover:outline-gray-300 " +
    "dark:bg-white/5 dark:text-white dark:outline-white/10 dark:hover:outline-white/20 dark:focus-visible:outline-blue-500 dark:aria-invalid:outline-red-400/50 dark:aria-invalid:focus-visible:outline-red-500 dark:disabled:bg-white/10 dark:disabled:text-gray-400 dark:disabled:hover:outline-white/10";
  var SELECT_CHEVRON =
    "col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-500 group-hover/select:text-gray-700 group-disabled/select:text-gray-400 sm:size-4 dark:text-gray-400 dark:group-hover/select:text-gray-200 dark:group-disabled/select:text-gray-500";
  var OPTIONS =
    "max-h-72 w-(--button-width) overflow-auto rounded-md bg-white py-1 text-base shadow-lg outline-1 outline-black/5 [--anchor-gap:--spacing(1)] transition transition-discrete data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-100 data-leave:ease-in motion-reduce:transition-none sm:text-sm dark:bg-gray-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10";
  var OPTION =
    "group/option relative block cursor-default py-2 pr-9 pl-3 text-gray-900 select-none focus:bg-blue-600 focus:text-white focus:outline-hidden dark:text-white dark:focus:bg-blue-500";
  // Radio (sx-onboarding-acp.js RADIO) + error ring.
  var RADIO =
    "relative size-4 shrink-0 cursor-pointer appearance-none rounded-full border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 before:absolute before:inset-1 before:rounded-full before:bg-white not-checked:before:hidden not-checked:hover:border-gray-400 dark:not-checked:hover:border-white/20 checked:border-blue-600 dark:checked:border-blue-500 checked:bg-blue-600 dark:checked:bg-blue-500 aria-invalid:border-red-300 dark:aria-invalid:border-red-400/50 " +
    FOCUS +
    " disabled:cursor-not-allowed disabled:border-gray-300 dark:disabled:border-white/10 disabled:bg-gray-100 dark:disabled:bg-white/10 disabled:before:bg-gray-400 dark:disabled:before:bg-white/30";
  var LINK =
    "cursor-pointer rounded-sm text-sm leading-5 font-medium text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300 " +
    FOCUS;

  var ICON = {
    info: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4.5"><path fill-rule="evenodd" clip-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" /></svg>',
    selector:
      '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="' +
      SELECT_CHEVRON +
      '"><path d="M5.22 10.22a.75.75 0 0 1 1.06 0L8 11.94l1.72-1.72a.75.75 0 1 1 1.06 1.06l-2.25 2.25a.75.75 0 0 1-1.06 0l-2.25-2.25a.75.75 0 0 1 0-1.06ZM10.78 5.78a.75.75 0 0 1-1.06 0L8 4.06 6.28 5.78a.75.75 0 0 1-1.06-1.06l2.25-2.25a.75.75 0 0 1 1.06 0l2.25 2.25a.75.75 0 0 1 0 1.06Z" clip-rule="evenodd" fill-rule="evenodd" /></svg>',
    check:
      '<span class="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-600 group-not-aria-selected/option:hidden group-focus/option:text-white in-[el-selectedcontent]:hidden dark:text-blue-400"><svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" /></svg></span>',
    envelope:
      '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-gray-400 dark:text-gray-500"><path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z" /><path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z" /></svg>',
    eye: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /><path fill-rule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clip-rule="evenodd" /></svg>',
    eyeSmallOpen:
      '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /><path fill-rule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clip-rule="evenodd" /></svg>',
    eyeSmallShut:
      '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path fill-rule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z" clip-rule="evenodd" /><path d="m10.748 13.93 2.523 2.523a9.987 9.987 0 0 1-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 0 1 0-1.186A10.007 10.007 0 0 1 2.839 6.02L6.07 9.252a4 4 0 0 0 4.678 4.678Z" /></svg>',
  };

  // ---- Shared bits of markup ------------------------------------------------

  /** Description list row (components skill), value may be HTML. */
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
      "</span></div>"
    );
  }

  /** Information circle + Tooltip (components skill; smart-enroll infoTip). */
  function infoTip(id, label, text) {
    return (
      '<span class="group/info relative inline-flex size-6 shrink-0 items-center justify-center">' +
      '<span tabindex="0" role="button" aria-describedby="' +
      esc(id) +
      '" class="inline-flex size-full cursor-help items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus-visible:bg-white focus-visible:text-gray-500 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-300 dark:focus-visible:bg-transparent dark:focus-visible:text-gray-300 dark:focus-visible:outline-blue-400">' +
      '<span class="sr-only">' +
      esc(label) +
      "</span>" +
      ICON.info +
      "</span>" +
      '<span id="' +
      esc(id) +
      '" role="tooltip" class="pointer-events-none invisible absolute top-full left-1/2 z-30 mt-3 w-max max-w-64 -translate-x-2/5 rounded-lg bg-gray-900 p-3 text-left text-sm/5 font-normal text-gray-100 opacity-0 shadow-xs transition-opacity duration-150 group-hover/info:visible group-hover/info:opacity-100 group-has-focus-visible/info:visible group-has-focus-visible/info:opacity-100 before:absolute before:-top-1 before:left-2/5 before:size-3 before:-translate-x-1/2 before:rotate-45 before:rounded-[2px] before:bg-inherit sm:max-w-[343px] dark:bg-gray-950 dark:ring-1 dark:ring-white/10">' +
      esc(text) +
      "</span></span>"
    );
  }

  /** Label row: label (+ info tip) left, "Optional" right (smart-enroll labelRow). */
  function labelRow(id, label, opts) {
    opts = opts || {};
    var F = window.OBField;
    return (
      '<div class="flex min-h-5 items-center justify-between gap-2">' +
      '<span class="flex min-w-0 items-center gap-1">' +
      (opts.noFor
        ? '<span id="' + id + '-label" class="' + F.LABEL + '">' + esc(label) + "</span>"
        : '<label for="' + id + '" class="' + F.LABEL + '">' + esc(label) + "</label>") +
      (opts.tip ? infoTip(id + "-tip", "About " + label, opts.tip) : "") +
      "</span>" +
      (opts.optional ? '<span class="shrink-0 ' + F.HELPER + '">Optional</span>' : "") +
      (opts.corner || "") +
      "</div>"
    );
  }

  /**
   * OBField text input with label row, error icon and error line.
   * opts: type, autocomplete, placeholder, inputmode, maxLength, optional, tip,
   * helper, lead ("envelope" | "flag"), after (HTML in the input box), disabled.
   */
  function textField(id, label, value, opts) {
    var F = window.OBField;
    opts = opts || {};
    var lead = "";
    var pad = "";
    if (opts.lead === "envelope") {
      lead = ICON.envelope;
      pad = " pl-10";
    } else if (opts.lead === "flag") {
      lead =
        '<span aria-hidden="true" class="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center border-r border-gray-300 dark:border-white/10"><img src="' +
        ASSETS +
        'flag-us.svg" alt="" width="20" height="14" class="h-3.5 w-5 rounded-xs"></span>';
      pad = " pl-14";
    }
    return (
      '<div class="flex w-full min-w-0 flex-col gap-1" data-pb-field="' +
      id +
      '">' +
      labelRow(id, label, opts) +
      '<div class="relative">' +
      lead +
      '<input id="' +
      id +
      '" type="' +
      (opts.type || "text") +
      '" value="' +
      esc(value) +
      '" autocomplete="' +
      (opts.autocomplete || "off") +
      '"' +
      (opts.inputmode ? ' inputmode="' + opts.inputmode + '"' : "") +
      (opts.maxLength ? ' maxlength="' + opts.maxLength + '"' : "") +
      (opts.placeholder ? ' placeholder="' + esc(opts.placeholder) + '"' : "") +
      (opts.disabled ? " disabled" : "") +
      ' aria-invalid="false" aria-describedby="' +
      id +
      "-error" +
      (opts.helper ? " " + id + "-helper" : "") +
      '" class="' +
      F.INPUT +
      pad +
      (opts.inputClass ? " " + opts.inputClass : "") +
      '">' +
      (opts.after ? "" : F.errorIcon()) +
      (opts.after || "") +
      "</div>" +
      (opts.helper ? '<p id="' + id + '-helper" class="' + F.HELPER + '">' + esc(opts.helper) + "</p>" : "") +
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

  /** el-select field (components skill trigger at Text Field size). options: [{ value, label, html? }]. */
  function selectField(id, label, options, value, opts) {
    opts = opts || {};
    var list = options
      .map(function (o) {
        return (
          '<el-option value="' +
          esc(o.value) +
          '" class="' +
          OPTION +
          '">' +
          (o.html ||
            '<span class="block truncate font-normal group-aria-selected/option:font-semibold">' + esc(o.label) + "</span>") +
          ICON.check +
          "</el-option>"
        );
      })
      .join("");
    return (
      '<div class="flex w-full min-w-0 flex-col gap-1" data-pb-field="' +
      id +
      '">' +
      labelRow(id, label, opts) +
      '<el-select id="' +
      id +
      '-select" name="' +
      id +
      '"' +
      (value ? ' value="' + esc(value) + '"' : "") +
      ' class="block">' +
      '<button type="button" id="' +
      id +
      '" aria-invalid="false" aria-describedby="' +
      id +
      '-error" class="' +
      SELECT_TRIGGER +
      '">' +
      '<el-selectedcontent class="col-start-1 row-start-1 flex min-w-0 items-center gap-2 pr-6 font-medium text-gray-900 dark:text-white">' +
      (value ? "" : '<span class="truncate font-normal text-gray-400 dark:text-gray-500">' + esc(opts.placeholder || "Select") + "</span>") +
      "</el-selectedcontent>" +
      ICON.selector +
      "</button>" +
      '<el-options anchor="bottom start" popover class="' +
      OPTIONS +
      '">' +
      list +
      "</el-options></el-select>" +
      '<p id="' +
      id +
      '-error" class="hidden ' +
      window.OBField.ERROR_TEXT +
      '"></p>' +
      "</div>"
    );
  }

  /** Current value of a selectField. */
  function selectValue(id) {
    var el = document.getElementById(id + "-select");
    if (!el) return "";
    if (typeof el.value === "string" && el.value) return el.value;
    var selected = el.querySelector('el-option[aria-selected="true"]');
    return selected ? selected.getAttribute("value") || "" : el.getAttribute("value") || "";
  }

  function selectError(id, message) {
    var trigger = document.getElementById(id);
    var line = document.getElementById(id + "-error");
    if (!trigger) return;
    trigger.setAttribute("aria-invalid", message ? "true" : "false");
    if (line) {
      line.textContent = message || "";
      line.classList.toggle("hidden", !message);
    }
  }

  /** The US flag + name for the Country select (only the US for now). */
  function countryOption(label) {
    return {
      value: "US",
      label: label,
      html:
        '<span class="flex items-center gap-2"><img src="' +
        ASSETS +
        'flag-us.svg" alt="" width="20" height="14" class="h-3.5 w-5 shrink-0 rounded-xs"><span class="truncate font-normal group-aria-selected/option:font-semibold in-[el-selectedcontent]:font-medium">' +
        esc(label) +
        "</span></span>",
    };
  }

  /** Info notice (onboarding-bank.js OBBank.notice "info" look). */
  function infoNotice(text) {
    return (
      '<div role="note" class="flex w-full items-start gap-3 rounded-md bg-blue-50 p-4 dark:bg-blue-500/10">' +
      '<img src="' +
      ASSETS +
      'icon-info-circle-blue.svg" alt="" width="20" height="20" class="size-5 shrink-0">' +
      '<p class="min-w-0 flex-1 text-sm leading-5 text-blue-800 dark:text-blue-300">' +
      esc(text) +
      "</p></div>"
    );
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

  /** Masked TIN with the show / hide eye (sx-onboarding confirm-business-details). */
  function tinHtml(tin, revealed) {
    var d = digits(tin);
    if (!d) return "—";
    return (
      '<span class="inline-flex items-center gap-1.5"><span>' +
      esc(revealed ? tin : "•••••" + d.slice(-4)) +
      "</span>" +
      '<button type="button" data-pb-tin-toggle aria-pressed="' +
      !!revealed +
      '" class="inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-gray-400 hover:bg-gray-200 hover:text-gray-600 active:bg-gray-300 dark:text-gray-400 dark:hover:bg-white/15 dark:hover:text-white dark:active:bg-white/20 focus-visible:outline-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400">' +
      '<span class="sr-only">' +
      (revealed ? "Hide" : "Show") +
      " TIN</span>" +
      (revealed ? ICON.eyeSmallShut : ICON.eyeSmallOpen) +
      "</button></span>"
    );
  }

  // ---- Payment Preferences hand-off ----------------------------------------

  function slug(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  /**
   * Writes the preferred method where the Supplier Portal's Payment Preferences
   * picks it up (payment-preferences-page.js): the new bank account / check
   * address and the primary Global Preferences slot.
   */
  function writePortalDefault(s) {
    var st = getState();
    var b = business(s);
    var m = st.method || "later";
    var record = { business: { name: b.name }, method: m, completedAt: new Date().toISOString() };
    var slot = "";
    if (m === "card") slot = "payers-card";
    if (m === "bank-account" && st.bank) {
      var acct = digits(st.bank.account);
      var last4 = acct.slice(-4);
      record.bankAccount = {
        id: "pb-bank-" + last4,
        displayName: (st.bank.type === "savings" ? "Savings" : "Checking") + " Account",
        name: st.bank.holder || b.name,
        last4: last4,
        routingNumber: digits(st.bank.routing),
        accountNumber: acct,
        maskedAccount: "•••••••••" + last4,
        maskedRouting: "•••••" + digits(st.bank.routing).slice(-4),
        accountType: st.bank.type,
        address: addressText(b.address),
        isDefault: !!st.bank.isDefault,
      };
      slot = record.bankAccount.id;
    }
    if (m === "check" && st.check) {
      var addr = st.check.sameAsBusiness ? b.address : st.check.address;
      var text = addressText(addr);
      record.checkAddress = {
        id: "pb-addr-" + slug(addr.city + "-" + addr.zip),
        displayName: b.name,
        name: b.name,
        address: text,
        cityState: [addr.city, addr.state].filter(Boolean).join(", "),
      };
      slot = record.checkAddress.id;
    }
    try {
      localStorage.setItem(PORTAL_KEY, JSON.stringify(record));
      if (slot) localStorage.setItem(PORTAL_DEFAULTS_KEY, JSON.stringify([slot]));
    } catch (error) {}
    return record;
  }

  // ---- Page registry ---------------------------------------------------------

  var pages = {};
  function page(name, init) {
    pages[name] = init;
  }

  function renderNotice() {
    var content = document.querySelector("[data-ob-content]");
    if (!content) return;
    content.innerHTML =
      '<div class="flex flex-col gap-6 px-4 pt-10 pb-10 lg:px-14 lg:pt-14">' +
      '<div role="status" class="flex w-full max-w-md flex-col gap-3 rounded-lg border border-default bg-tertiary p-4">' +
      '<p class="type-title-small text-default">Invitation not available</p>' +
      '<p class="type-description text-tertiary">The sample invitation could not be loaded. Reload the page to try again.</p>' +
      "</div></div>";
  }

  document.addEventListener("DOMContentLoaded", function () {
    var step = document.body.getAttribute("data-pb-step");
    var ready = loadSample()
      .then(function (s) {
        if (!s) {
          renderNotice();
          return;
        }
        if (pages[step]) return pages[step](s);
      })
      .catch(function (error) {
        console.error("[sx-preboarding]", error);
      });
    if (window.OnboardingTransitions && window.OnboardingTransitions.waitFor)
      window.OnboardingTransitions.waitFor(ready);
  });

  /** SX logo in the shared SD sidebar + Contact only (same look as sx-onboarding.js). */
  function applySidebarLook() {
    var slots = document.querySelectorAll("[data-ob-sidebar]");
    for (var i = 0; i < slots.length; i += 1) {
      slots[i].classList.replace("px-14", "px-12");
      var footer = slots[i].querySelector(".w-\\[212px\\]");
      if (footer) footer.classList.add("self-center");
      var logo = slots[i].querySelector('img[src$="menu-logo.svg"]');
      if (!logo) continue;
      logo.parentNode.classList.remove("rotate-180");
      logo.src = "../../assets/sx-onboarding/sx-menu-logo.svg";
      logo.width = 26;
      logo.height = 26;
      logo.className = "absolute inset-0 block size-full";
    }
  }
  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(applySidebarLook, 0);
  });

  // Bank / check pages: "I'd rather get paid with card" switches the method.
  document.addEventListener("click", function (event) {
    if (!event.target.closest("[data-pb-use-card]")) return;
    saveState({ method: "card" });
    go("accept-card.html");
  });

  function setText(selector, text) {
    var nodes = document.querySelectorAll(selector);
    for (var i = 0; i < nodes.length; i += 1) nodes[i].textContent = text;
  }

  // =========================================================================
  // Steps
  // =========================================================================

  // ---- Welcome (Figma 38223:36208, Learn More 38223:36261) ------------------

  page("welcome", function (s) {
    setText("[data-pb-supplier]", business(s).name);
    var learn = document.querySelector("[data-pb-learn]");
    if (!learn) return;
    learn.addEventListener("click", function () {
      var M = window.OBModal;
      var buyer = esc(s.buyer.name);
      var strong = function (text) {
        return '<span class="font-semibold text-gray-900 dark:text-white">' + esc(text) + "</span>";
      };
      M.open(
        '<div class="flex flex-col gap-4 px-6 pb-6">' +
          '<img src="' +
          ASSETS +
          'icon-info-circle-blue.svg" alt="" width="24" height="24" class="size-6">' +
          '<h2 id="pb-learn-title" class="type-title-modal text-default">' +
          buyer +
          " is enhancing the way they will be paying you</h2>" +
          '<div class="flex flex-col gap-3 text-sm text-gray-500 dark:text-gray-400">' +
          "<p>" +
          strong(s.buyer.name) +
          " has partnered with Transcard to transition to digital payment interactions and remove the legacy paper-based process.</p>" +
          "<p>With the new solution, the speed of sending payments and documentation is greatly enhanced with improved tracking, reporting, and reconciliation.</p>" +
          "<p>For more details on the changes we are making, you can contact " +
          strong(s.buyer.name) +
          " by emailing " +
          strong(s.buyer.email) +
          " or calling " +
          strong(s.buyer.phone) +
          ", your reference code is " +
          strong(s.referenceCode) +
          ".</p>" +
          "</div></div>",
        "pb-learn-title",
      );
    });
  });

  // ---- 1. Confirm Identity (Figma 38223:36414 / 36386 / error 36442) --------

  page("confirm-identity", function (s) {
    var max = (s.identity && s.identity.maxAttempts) || 3;
    var identity = getState().identity || {};
    var used = identity.attemptsUsed || 0;
    if (used >= max) {
      window.location.replace("too-many-attempts.html");
      return;
    }
    var card = document.querySelector("[data-pb-identity]");
    var alertBox = document.querySelector("[data-pb-identity-alert]");
    var next = document.querySelector("[data-pb-next]");
    card.insertAdjacentHTML(
      "afterbegin",
      textField("pb-tax-id", "Tax ID", identity.taxId || "", { inputmode: "numeric", maxLength: 20 }) +
        textField("pb-vendor-id", "Your Vendor ID", identity.vendorId || "", { maxLength: 20 }),
    );
    var inputs = [document.getElementById("pb-tax-id"), document.getElementById("pb-vendor-id")];
    var labels = { "pb-tax-id": "Tax ID", "pb-vendor-id": "Your Vendor ID" };

    function sync() {
      next.disabled = !inputs.every(function (i) {
        return i.value.trim();
      });
    }
    inputs.forEach(function (input) {
      input.addEventListener("input", function () {
        // Editing clears the wrong-answer look on this field.
        if (input.getAttribute("aria-invalid") === "true") fieldError(input, "");
        sync();
      });
      input.addEventListener("blur", function () {
        if (!input.value.trim()) fieldError(input, labels[input.id] + " is required");
      });
    });

    document.querySelector("[data-pb-form]").addEventListener("submit", function (event) {
      event.preventDefault();
      if (next.disabled) return;
      // Prototype rule (as SMART Disburse): an answer made only of zeros is wrong.
      var wrong = inputs.some(function (i) {
        return /^0+$/.test(digits(i.value)) && !/[^0\s-]/.test(i.value);
      });
      if (wrong) {
        used += 1;
        saveState({ identity: { attemptsUsed: used } });
        if (used >= max) {
          go("too-many-attempts.html");
          return;
        }
        // As designed: every answer is flagged, without saying which one was wrong.
        inputs.forEach(function (i) {
          window.OBField.setError(i, true);
        });
        alertBox.querySelector("[data-pb-remaining]").textContent = max - used;
        alertBox.querySelector("[data-pb-max]").textContent = max;
        alertBox.hidden = false;
        next.disabled = true;
        return;
      }
      saveState({
        identity: {
          attemptsUsed: 0,
          taxId: inputs[0].value.trim(),
          vendorId: inputs[1].value.trim(),
          confirmedAt: new Date().toISOString(),
        },
      });
      go("business-details.html");
    });
    sync();
  });

  // ---- Too many attempts (Figma 38223:36596) --------------------------------

  page("too-many-attempts", function (s) {
    setText("[data-pb-buyer]", s.buyer.name);
    setText("[data-pb-buyer-email]", s.buyer.email);
  });

  // ---- 3. Payment Preference (Figma 38223:36887 / 36966 / 37042) ------------

  var METHOD_PAGE = { card: "accept-card.html", "bank-account": "bank-account.html", check: "paper-check.html" };

  page("payment-preference", function () {
    var radios = document.querySelectorAll('input[name="pb-method"]');
    var saved = method();
    // Figma shows a row always selected; the first one by default.
    var initial = METHOD_PAGE[saved] ? saved : "card";
    for (var i = 0; i < radios.length; i += 1) radios[i].checked = radios[i].value === initial;
    document.querySelector("[data-pb-next]").addEventListener("click", function () {
      var picked = document.querySelector('input[name="pb-method"]:checked');
      if (!picked) return;
      saveState({ method: picked.value });
      go(METHOD_PAGE[picked.value]);
    });
    document.querySelector("[data-pb-later]").addEventListener("click", function () {
      // TODO(confirm): Figma has no frame for "I'll choose it later"; no default is saved.
      saveState({ method: "later" });
      go("create-account.html");
    });
  });

  // ---- Accept Payer's Card (Figma 38223:37370) ------------------------------

  page("accept-card", function (s) {
    saveState({ method: "card" });
    setText("[data-pb-card-name]", s.buyer.name);
  });

  /** Back from Create Account: the method page that came before it. */
  function methodPage() {
    return METHOD_PAGE[method()] || "payment-preference.html";
  }

  // ---- 4. Create an Account (Figma 38223:46168 / 45848 / 45928 / 46008 / 46088 / 45745)

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

  function eyeButton(id) {
    return (
      '<button type="button" data-pb-eye="' +
      id +
      '" aria-pressed="false" aria-controls="' +
      id +
      '" class="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-300 focus-visible:outline-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400">' +
      '<span class="sr-only">Show password</span>' +
      ICON.eye +
      "</button>"
    );
  }

  page("create-account", function (s) {
    var b = business(s);
    setText("[data-pb-buyer]", s.buyer.name);
    var back = document.querySelector("[data-pb-back]");
    if (back) back.setAttribute("href", methodPage());
    var account = getState().account || {};
    var form = document.querySelector("[data-pb-account]");
    var next = document.querySelector("[data-pb-next]");
    form.innerHTML =
      '<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">' +
      textField("pb-first", "First Name", account.firstName || b.contactFirst, { autocomplete: "given-name" }) +
      textField("pb-last", "Last Name", account.lastName || b.contactLast, { autocomplete: "family-name" }) +
      "</div>" +
      textField("pb-username", "Username", account.username || b.email, {
        type: "email",
        autocomplete: "username",
        helper: "This should be your current email address",
      }) +
      textField("pb-password", "Create Password", "", {
        type: "password",
        autocomplete: "new-password",
        inputClass: "pr-10 aria-invalid:pr-10",
        after: eyeButton("pb-password"),
      }) +
      textField("pb-confirm", "Confirm Password", "", {
        type: "password",
        autocomplete: "new-password",
        inputClass: "pr-10 aria-invalid:pr-10",
        after: eyeButton("pb-confirm"),
      }) +
      document.getElementById("pb-rules-template").innerHTML;

    var first = document.getElementById("pb-first");
    var last = document.getElementById("pb-last");
    var username = document.getElementById("pb-username");
    var password = document.getElementById("pb-password");
    var confirm = document.getElementById("pb-confirm");
    var rules = form.querySelector("[data-pb-rules]");
    var touched = {};
    var taken = "";

    function paintRules(value) {
      var all = true;
      Object.keys(RULES).forEach(function (key) {
        var li = rules.querySelector('[data-rule="' + key + '"]');
        var ok = RULES[key](value);
        if (!ok) all = false;
        var icon = li.querySelector("[data-rule-icon]");
        icon.classList.toggle("text-green-600", ok);
        icon.classList.toggle("dark:text-green-500", ok);
        icon.classList.toggle("text-gray-400", !ok);
        icon.classList.toggle("dark:text-gray-500", !ok);
      });
      return all;
    }

    function usernameMessage() {
      var v = username.value.trim();
      if (!v) return "Username is required";
      if (!isEmail(v)) return "Enter a valid email address";
      if (taken && v.toLowerCase() === taken) return "taken";
      return "";
    }

    function setTaken(on) {
      var line = document.getElementById("pb-username-error");
      var helper = document.getElementById("pb-username-helper");
      window.OBField.setError(username, on, null);
      helper.classList.toggle("hidden", on);
      line.innerHTML = on
        ? 'An account with this email already exists. Please contact us at <a href="mailto:support@transcard.com" class="rounded-sm underline hover:text-red-700 dark:hover:text-red-300 ' +
          FOCUS +
          '">support@transcard.com</a>.'
        : "";
      line.classList.toggle("hidden", !on);
    }

    function sync() {
      var rulesOk = paintRules(password.value);
      if (touched.first) fieldError(first, first.value.trim() ? "" : "First Name is required");
      if (touched.last) fieldError(last, last.value.trim() ? "" : "Last Name is required");
      var u = usernameMessage();
      if (u === "taken") setTaken(true);
      else if (touched.username) {
        setTaken(false);
        fieldError(username, u);
      }
      if (touched.password)
        fieldError(password, !password.value ? "Create a password" : rulesOk ? "" : "The password doesn’t meet every rule below");
      if (touched.confirm)
        fieldError(
          confirm,
          !confirm.value ? "Confirm your password" : confirm.value === password.value ? "" : "Passwords don’t match",
        );
      next.disabled = !(
        first.value.trim() &&
        last.value.trim() &&
        !u &&
        rulesOk &&
        confirm.value &&
        confirm.value === password.value
      );
    }

    [
      ["first", first],
      ["last", last],
      ["username", username],
      ["password", password],
      ["confirm", confirm],
    ].forEach(function (pair) {
      pair[1].addEventListener("input", sync);
      pair[1].addEventListener("blur", function () {
        touched[pair[0]] = true;
        sync();
      });
    });

    form.addEventListener("click", function (event) {
      var eye = event.target.closest("[data-pb-eye]");
      if (!eye) return;
      var input = document.getElementById(eye.getAttribute("data-pb-eye"));
      var show = input.type === "password";
      input.type = show ? "text" : "password";
      eye.setAttribute("aria-pressed", String(show));
      eye.querySelector(".sr-only").textContent = show ? "Hide password" : "Show password";
    });

    next.addEventListener("click", function () {
      if (next.disabled) return;
      var restore = setLoading(next, "Checking…");
      // Prototype: the "email already exists" check (Figma edge case 38223:45745).
      setTimeout(function () {
        restore();
        var email = username.value.trim().toLowerCase();
        var existing = (s.existingEmails || []).map(function (e) {
          return String(e).toLowerCase();
        });
        if (existing.indexOf(email) !== -1) {
          taken = email;
          touched.username = true;
          sync();
          username.focus();
          return;
        }
        saveState({
          account: {
            username: username.value.trim(),
            firstName: first.value.trim(),
            lastName: last.value.trim(),
            createdAt: new Date().toISOString(),
          },
        });
        go("summary.html");
      }, 600);
    });
    sync();
  });

  // ---- 5. Almost Done (Figma card 38223:38613, bank 39301:278851, check 39301:281113)

  var MASTERCARD =
    '<span class="inline-flex h-4 w-6 items-center justify-center rounded-xs bg-gray-950 dark:ring-1 dark:ring-white/15"><img src="' +
    ASSETS +
    'cc-mastercard.svg" alt="Mastercard" width="16" height="10" class="h-2.5 w-4"></span>';

  page("summary", function (s) {
    var st = getState();
    var b = business(s);
    var m = st.method || "later";
    var revealed = false;
    var bizBox = document.querySelector("[data-pb-business]");
    function paintBusiness() {
      bizBox.innerHTML =
        row("Business Legal Name", esc(b.name)) +
        row("Business Address", esc(addressText(b.address)), "whitespace-pre-line") +
        row("Taxpayer Identification Number (TIN)", tinHtml(b.tin, revealed)) +
        row("Primary Contact Name", esc(contactName(b))) +
        row("Primary Contact Email Address", esc(b.email)) +
        row("Primary Contact Phone Number", esc(b.phone ? "+1 " + b.phone.replace(/^\+1\s*/, "") : "—"));
    }
    bizBox.addEventListener("click", function (event) {
      if (!event.target.closest("[data-pb-tin-toggle]")) return;
      revealed = !revealed;
      paintBusiness();
      bizBox.querySelector("[data-pb-tin-toggle]").focus();
    });

    var methodBox = document.querySelector("[data-pb-method]");
    var back = document.querySelector("[data-pb-back]");
    if (back) back.setAttribute("href", "create-account.html");
    var rows = "";
    if (m === "card")
      rows =
        row("Cardholder Name", esc(s.buyer.name)) +
        row("Cardholder Address", esc(s.buyer.address), "whitespace-pre-line") +
        row("Type", MASTERCARD);
    else if (m === "bank-account" && st.bank)
      rows = row("Routing Number", esc(st.bank.routing)) + row("Account Number", esc(st.bank.account));
    else if (m === "check" && st.check)
      rows = row(
        "Billing Address",
        esc(addressText(st.check.sameAsBusiness ? b.address : st.check.address)),
        "whitespace-pre-line",
      );
    // TODO(confirm): Figma has no summary for "I'll choose it later": no method box.
    methodBox.innerHTML = rows;
    methodBox.hidden = !rows;

    var submit = document.querySelector("[data-pb-submit]");
    var list = document.querySelector("[data-pb-consents]");
    var M = window.OBModal;
    var loaded = M.loadJson("../../data/sd-virtual-card.json", ["agreements", "stateCodes"]).then(function (data) {
      if (!data) return;
      setStateNames(data.stateCodes);
      paintBusiness();
      if (methodBox.innerHTML && m === "check")
        methodBox.innerHTML = row(
          "Billing Address",
          esc(addressText(st.check.sameAsBusiness ? b.address : st.check.address)),
          "whitespace-pre-line",
        );
      window.OBConsents.mount(list, data.agreements, {
        stateKey: "consents",
        documentScroll: true,
        onChange: function (all) {
          submit.disabled = !all;
        },
      });
    });
    paintBusiness();

    submit.addEventListener("click", function () {
      if (submit.disabled) return;
      // Figma Pending 38728:48548: "We're processing your request" over the page.
      M.open(
        '<div role="status" class="flex flex-col items-center gap-6 px-6 py-12">' +
          '<img src="' +
          ASSETS +
          'loader.svg" alt="" width="44" height="44" class="size-11 animate-spin motion-reduce:animate-none dark:hidden">' +
          '<img src="' +
          ASSETS +
          'loader-dark.svg" alt="" width="44" height="44" class="hidden size-11 animate-spin motion-reduce:animate-none dark:block">' +
          '<div class="flex flex-col items-center gap-2 text-center">' +
          '<p id="pb-processing" class="type-title-modal text-default">We’re processing your request</p>' +
          '<p class="type-description text-tertiary">Please wait</p>' +
          "</div></div>",
        "pb-processing",
        { bare: true },
      );
      // Demo: summary.html?fail=1 shows "We have run into an issue." (Figma 38663:300068).
      var fail = /[?&]fail=1\b/.test(window.location.search);
      setTimeout(function () {
        if (fail) {
          M.close();
          go("issue.html");
          return;
        }
        saveState({ completedAt: new Date().toISOString() });
        writePortalDefault(s);
        M.close();
        go("complete.html");
      }, 1500);
    });
    return loaded;
  });

  // ---- Account Created Successfully (Figma 39702:152173 / 152258) ------------

  page("complete", function (s) {
    var account = getState().account || {};
    setText("[data-pb-username]", account.username || business(s).email);
    var widget = document.querySelector("[data-pb-feedback]");
    if (!widget) return;
    widget.addEventListener("click", function (event) {
      if (event.target.closest("[data-pb-feedback-close]")) {
        widget.hidden = true;
        return;
      }
      var face = event.target.closest("[data-pb-face]");
      if (!face) return;
      saveState({ feedback: Number(face.getAttribute("data-pb-face")) });
      widget.querySelector("[data-pb-feedback-ask]").hidden = true;
      var thanks = widget.querySelector("[data-pb-feedback-thanks]");
      thanks.hidden = false;
      thanks.focus();
    });
  });

  window.SXPreboarding = {
    page: page,
    go: go,
    getState: getState,
    saveState: saveState,
    business: business,
    method: method,
    esc: esc,
    digits: digits,
    isEmail: isEmail,
    addressText: addressText,
    setStateNames: setStateNames,
    row: row,
    infoTip: infoTip,
    textField: textField,
    fieldError: fieldError,
    selectField: selectField,
    selectValue: selectValue,
    selectError: selectError,
    countryOption: countryOption,
    infoNotice: infoNotice,
    setLoading: setLoading,
    RADIO: RADIO,
    LINK: LINK,
    writePortalDefault: writePortalDefault,
  };
})();

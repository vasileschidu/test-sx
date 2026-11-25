/**
 * smart-enroll/sign-up.js
 * SMART Enroll Speedy Sign up (TCDM-5243, T3): 3 steps on one page, then the application.
 * Spec: wiki/products/smart-enroll/flows/speedy-sign-up.md (D-9).
 * Figma [R1] SMART Enroll jLooCmHwqJcYV5p5d8BHnO: step 1 28400:43229 / 28400:43289 / 28667:87991 (consents 28400:43349),
 * step 2 28416:1664 / 28416:7482, step 3 28416:7678 / 28416:8156 / 28667:88052.
 *
 * Page: src/pages/smart-enroll/sign-up.html (?step=1|2|3, never past the furthest step reached).
 * Data: src/data/smart-enroll-sign-up.json (matches), src/data/sd-virtual-card.json (states, agreements),
 *       src/data/smart-enroll.json (support phone / email for Contact Us).
 * Reuses: OBField (inputs, errors), OBConsents (Terms of Use / Privacy Policy Review → checkbox),
 *         OBModal (Contact Us dialog, copyButton), shared.js. Bullets = onboarding-substeps.js bullet().
 *
 * State — sessionStorage `se_signup_v1` (JSON), read by the Business Information tab (T4):
 *   {
 *     version: 1,
 *     step: 1 | 2 | 3,            current step
 *     reached: 1 | 2 | 3,         furthest step reached
 *     business: { legalName, legalAddress, country, city, state, zip, email, phone },   Step 1 as typed
 *     consents: { terms: bool, privacy: bool },                                           Step 1 (OBConsents)
 *     matchId: string | null,     Step 2 pick (id from smart-enroll-sign-up.json)
 *     match: { id, name, legalAddress, city, state, zip, country } | null,
 *     manualReview: bool,         true after "No, this isn't my business." (D-9)
 *     contact: { firstName, lastName, role, email, phone },                               Step 3
 *     prefill: { legalName, legalAddress, country, city, state, zip, email, phone },      what Business
 *                                 Information shows: the match's name/address over Step 1, Step 1 email/phone
 *     submittedAt: ISO string | null
 *   }
 * window.SmartEnrollSignUp = { STORAGE_KEY, getState() }.
 */
window.SmartEnrollSignUp = (function () {
  "use strict";

  var STORAGE_KEY = "se_signup_v1";
  var DATA = {
    matches: "../../data/smart-enroll-sign-up.json",
    agreements: "../../data/sd-virtual-card.json",
    enroll: "../../data/smart-enroll.json",
  };
  var APPLICATION_URL = "application.html?tab=business-information&status=not-submitted";

  /* ---------- classes (components skill; SMART System button sizes, DS-001) ---------- */

  var FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400";
  var BTN_PRIMARY_XL =
    "inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-blue-600 px-3.5 py-2.5 text-base font-semibold text-white shadow-xs hover:bg-blue-500 " + FOCUS +
    " disabled:cursor-not-allowed disabled:bg-blue-300 dark:bg-blue-500 dark:shadow-none dark:hover:bg-blue-400 dark:disabled:bg-blue-500/40 dark:disabled:text-white/60 sm:w-50";
  var BTN_SECONDARY_XL =
    "inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-white px-3.5 py-2.5 text-base font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 " + FOCUS +
    " dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/20 sm:w-50";
  var BTN_SECONDARY_MD =
    "inline-flex shrink-0 cursor-pointer items-center rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 " + FOCUS +
    " dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/20";
  // Radio Group/Card (Figma 28416:7503): px-6 py-4, rounded-lg, shadow-xs; checked = 2px blue-600 border.
  var RADIO_CARD =
    "relative flex cursor-pointer items-center rounded-lg border border-gray-200 bg-white px-4 py-4 text-gray-900 shadow-xs sm:px-6 hover:bg-gray-50 " +
    "has-checked:border-blue-600 has-checked:ring-1 has-checked:ring-blue-600 has-checked:ring-inset " +
    "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-blue-600 " +
    "dark:border-white/10 dark:bg-white/5 dark:text-white dark:shadow-none dark:hover:bg-white/10 dark:has-checked:border-blue-400 dark:has-checked:ring-blue-400 dark:has-focus-visible:outline-blue-400";

  /* ---------- icons ---------- */

  var ICON = {
    chevronRight: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>',
    chevronLeft: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd" /></svg>',
    chevronDown: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-gray-400 dark:text-gray-500"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>',
    info: function (cls) {
      return '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="' + cls + '"><path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clip-rule="evenodd" /></svg>';
    },
    building: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 shrink-0 text-blue-600 dark:text-blue-400"><path fill-rule="evenodd" d="M4 16.5v-13h-.25a.75.75 0 0 1 0-1.5h12.5a.75.75 0 0 1 0 1.5H16v13h.25a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1-.75-.75v-2.5a.75.75 0 0 0-.75-.75h-2.5a.75.75 0 0 0-.75.75v2.5a.75.75 0 0 1-.75.75h-3.5a.75.75 0 0 1 0-1.5H4Zm3-11a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1ZM7.5 9a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1ZM11 5.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm.5 3.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1Z" clip-rule="evenodd" /></svg>',
    spinner: '<svg class="size-5 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z"></path></svg>',
  };

  // Progress bullets = onboarding-substeps.js bullet() (Figma Progress Indicator/Bullet: check / ringed dot / gray dot).
  var ASSETS = "../../assets/onboarding/";
  var DARK = '<span class="hidden size-5 shrink-0 items-center justify-center dark:flex">';
  var CHECK = '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-3 text-white"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" /></svg>';
  function bullet(stateName) {
    if (stateName === "done") {
      return '<img src="' + ASSETS + 'substep-complete.svg" alt="" width="20" height="20" class="size-5 shrink-0 dark:hidden">' +
        DARK + '<span class="flex size-4 items-center justify-center rounded-full bg-blue-500">' + CHECK + "</span></span>";
    }
    if (stateName === "current") {
      return '<img src="' + ASSETS + 'substep-current.svg" alt="" width="20" height="20" class="size-5 shrink-0 dark:hidden">' +
        DARK + '<span class="block size-2.5 rounded-full bg-blue-500 ring-4 ring-blue-500/30"></span></span>';
    }
    return '<span class="flex size-5 shrink-0 items-center justify-center"><span class="block size-2.5 rounded-full bg-gray-200 dark:bg-white/10"></span></span>';
  }

  /* ---------- fields (Figma order) ---------- */

  var BUSINESS_FIELDS = [
    { id: "legalName", label: "Business Legal Name", autocomplete: "organization", col: "sm:col-start-1" },
    { id: "legalAddress", label: "Business Legal Address", autocomplete: "street-address", col: "sm:col-span-2" },
    { id: "country", label: "Country", type: "select", options: "countries", flag: true, col: "sm:col-start-1" },
    { id: "city", label: "City", autocomplete: "address-level2", col: "sm:col-start-1" },
    { id: "state", label: "State / Province", type: "select", options: "states" },
    { id: "zip", label: "Zip / Postal Code", autocomplete: "postal-code", col: "sm:col-start-1" },
    { id: "email", label: "Main Business Email Address", type: "email", autocomplete: "email", placeholder: "yourbusiness@example.com", col: "sm:col-start-1" },
    { id: "phone", label: "Main Business Phone Number", type: "tel", autocomplete: "tel", placeholder: "+1 (000) 000-0000" },
  ];
  var CONTACT_FIELDS = [
    { id: "firstName", label: "First Name", autocomplete: "given-name" },
    { id: "lastName", label: "Last Name", autocomplete: "family-name" },
    { id: "role", label: "What's your role within the business?", autocomplete: "organization-title", col: "sm:col-start-1" },
    // Figma 28416:7678: the email from Step 1, read-only.
    { id: "email", label: "Email Address", type: "email", disabled: true, col: "sm:col-start-1" },
    { id: "phone", label: "Phone Number", type: "tel", autocomplete: "tel", placeholder: "+1 (242) 112-3213" },
  ];

  var state;
  var data = { matches: [], states: [], countries: ["United States"], agreements: [], support: {} };
  var refs = {};

  /* ---------- helpers ---------- */

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function blankState() {
    return {
      version: 1,
      step: 1,
      reached: 1,
      business: { legalName: "", legalAddress: "", country: "United States", city: "", state: "", zip: "", email: "", phone: "" },
      consents: {},
      matchId: null,
      match: null,
      manualReview: false,
      contact: { firstName: "", lastName: "", role: "", email: "", phone: "" },
      prefill: null,
      submittedAt: null,
    };
  }

  function load() {
    var saved = null;
    try {
      saved = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY));
    } catch (e) {
      saved = null;
    }
    var s = blankState();
    if (saved && saved.version === 1) {
      Object.keys(s).forEach(function (k) {
        if (saved[k] === undefined) return;
        s[k] = s[k] && typeof s[k] === "object" && !Array.isArray(s[k]) ? Object.assign(s[k], saved[k] || {}) : saved[k];
      });
    }
    return s;
  }

  function save() {
    state.prefill = computePrefill();
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* private mode: keep going in memory */
    }
  }

  function computePrefill() {
    var b = state.business;
    var m = state.match;
    return {
      legalName: m ? m.name : b.legalName,
      legalAddress: m ? m.legalAddress : b.legalAddress,
      country: m ? m.country : b.country,
      city: m ? m.city : b.city,
      state: m ? m.state : b.state,
      zip: m ? m.zip : b.zip,
      email: b.email,
      phone: b.phone,
    };
  }

  // OBConsents keeps acceptance through SDOnboardingContext (getState / saveState): point it at our state.
  window.SDOnboardingContext = window.SDOnboardingContext || {
    getState: function () {
      return state || {};
    },
    saveState: function (patch) {
      Object.assign(state, patch || {});
      save();
      updateStep1Next();
    },
  };

  /* ---------- markup ---------- */

  function fieldHtml(prefix, f, value) {
    var F = window.OBField;
    var id = "su-" + prefix + "-" + f.id;
    var control;
    var common = ' id="' + id + '" name="' + f.id + '" data-su-field="' + prefix + "." + f.id + '" aria-invalid="false" aria-describedby="' + id + '-error"';
    if (f.type === "select") {
      var list = data[f.options] || [];
      var empty = !value;
      control =
        '<select' + common + ' data-empty="' + empty + '" class="' + F.INPUT +
        " cursor-pointer appearance-none pr-10 aria-invalid:pr-16 data-[empty=true]:font-normal data-[empty=true]:text-gray-400 dark:data-[empty=true]:text-gray-500 aria-invalid:data-[empty=true]:text-red-300" +
        (f.flag ? " pl-10" : "") + '">' +
        (f.flag ? "" : '<option value="">Select</option>') +
        list.map(function (o) {
          return '<option' + (o === value ? " selected" : "") + ">" + esc(o) + "</option>";
        }).join("") +
        "</select>" +
        (f.flag
          ? '<span aria-hidden="true" class="pointer-events-none absolute top-1/2 left-3 block h-3.75 w-5 -translate-y-1/2 overflow-hidden rounded-xs shadow-xs">' +
            '<img src="' + ASSETS + 'flag-us.svg" alt="" width="20" height="15" class="block size-full"></span>'
          : "") +
        ICON.chevronDown +
        F.errorIcon("right-10!");
    } else {
      control =
        '<input' + common + ' type="' + (f.type || "text") + '"' +
        (f.autocomplete ? ' autocomplete="' + f.autocomplete + '"' : "") +
        (f.type === "tel" ? ' inputmode="tel"' : "") +
        (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : "") +
        (f.disabled ? " disabled" : "") +
        ' value="' + esc(value) + '" class="' + F.INPUT + '">' +
        F.errorIcon();
    }
    return (
      '<div class="flex min-w-0 flex-col gap-1' + (f.col ? " " + f.col : "") + '">' +
      '<label for="' + id + '" class="' + F.LABEL + '">' + esc(f.label) + "</label>" +
      '<div class="relative">' + control + "</div>" +
      '<p id="' + id + '-error" class="hidden ' + F.ERROR_TEXT + '"></p>' +
      "</div>"
    );
  }

  function headingHtml(title, subtitle, text) {
    return (
      '<h1 tabindex="-1" data-su-heading class="type-title-page text-default focus:outline-none">' + esc(title) + "</h1>" +
      '<div class="flex flex-col gap-5">' +
      '<div class="flex flex-col gap-2">' +
      (subtitle ? '<h2 class="type-title-modal text-default">' + esc(subtitle) + "</h2>" : "") +
      text +
      "</div>" +
      '<div class="h-px w-full bg-gray-200 dark:bg-white/10"></div>' +
      "</div>"
    );
  }

  function renderStep1() {
    var b = state.business;
    refs.steps[1].innerHTML =
      headingHtml(
        "First things first: Tell us about your business",
        "Business Information",
        '<p class="type-description text-tertiary">We need some information to verify the authenticity of your company before you can start using SMART Hub. The information you provide will be reviewed by our compliance team.</p>'
      ) +
      '<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-6">' +
      BUSINESS_FIELDS.map(function (f) { return fieldHtml("business", f, b[f.id]); }).join("") +
      "</div>" +
      // Consent of Terms (Figma 28400:43326): Review opens the text; the checkbox shows once accepted.
      '<div class="flex w-full flex-col gap-3 pt-8 sm:max-w-161.5">' +
      '<p class="flex items-start gap-1">' + ICON.info("mt-px size-4 shrink-0 text-gray-400 dark:text-gray-500") +
      '<span class="type-caption text-tertiary">Must review Terms and Conditions and Privacy Policy before proceeding to the next step.</span></p>' +
      '<ul data-su-consents role="list" class="flex w-full flex-col divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200 dark:divide-white/10 dark:border-white/10"></ul>' +
      "</div>" +
      '<div class="flex flex-col gap-6 border-t border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-end dark:border-white/10">' +
      '<p class="type-body text-tertiary">Only two more steps to go!</p>' +
      '<button type="submit" data-su-next="1" disabled class="' + BTN_PRIMARY_XL + '">Next Step' + ICON.chevronRight + "</button>" +
      "</div>";

    var list = refs.steps[1].querySelector("[data-su-consents]");
    var agreements = data.agreements.filter(function (a) { return a.id === "terms" || a.id === "privacy"; });
    if (agreements.length && window.OBConsents) {
      window.OBConsents.mount(list, agreements, {
        stateKey: "consents",
        documentScroll: true,
        onChange: updateStep1Next,
      });
    }
    updateStep1Next();
  }

  function consentsDone() {
    var c = state.consents || {};
    return !!(c.terms && c.privacy);
  }

  function updateStep1Next() {
    var btn = refs.steps && refs.steps[1].querySelector('[data-su-next="1"]');
    if (btn) btn.disabled = !consentsDone();
  }

  function matchHtml(m) {
    var address = m.legalAddress + ", " + m.city + " " + m.zip;
    return (
      '<label class="' + RADIO_CARD + '">' +
      '<input type="radio" name="su-match" value="' + esc(m.id) + '"' + (state.matchId === m.id ? " checked" : "") + ' class="sr-only">' +
      '<span class="flex min-w-0 flex-1 flex-col gap-1">' +
      '<span class="type-label-large text-default">' + esc(m.name) + "</span>" +
      '<span class="flex min-w-0 items-start gap-1">' + ICON.building +
      '<span class="min-w-0 flex-1 truncate type-body text-tertiary" title="' + esc(address) + '">' + esc(address) + "</span></span>" +
      "</span></label>"
    );
  }

  function renderStep2() {
    refs.steps[2].innerHTML =
      headingHtml(
        "Is this your business? If so, click on the link below.",
        "",
        '<p class="type-body-large text-secondary">Here’s what our search found. Don’t worry if we didn’t find your business, you can input the information that we need for our onboarding process.</p>'
      ) +
      '<fieldset class="flex min-w-0 flex-col gap-4" aria-describedby="su-match-error">' +
      '<legend class="sr-only">Business records found</legend>' +
      '<div class="flex gap-3 rounded-md bg-blue-50 p-4 dark:bg-blue-400/10">' + ICON.info("size-5 shrink-0 text-blue-500 dark:text-blue-400") +
      '<p class="type-body text-blue-700 dark:text-blue-300">If the address for your company record is outdated you’ll be able to update it at a later stage.</p></div>' +
      data.matches.map(matchHtml).join("") +
      "</fieldset>" +
      // TODO(confirm): Figma shows no state for Next Step without a pick; the prototype asks for one.
      '<p id="su-match-error" role="alert" class="hidden ' + window.OBField.ERROR_TEXT + '">Select your business, or choose “No, this isn’t my business.”</p>' +
      '<div class="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:gap-6">' +
      '<button type="button" data-su-no-match class="' + BTN_SECONDARY_MD + ' self-start">No, this isn’t my business.</button>' +
      '<p class="flex items-start gap-2">' + ICON.info("size-5 shrink-0 text-gray-400 dark:text-gray-500") +
      '<span class="type-body text-secondary">Manual procedure may extend processing time</span></p>' +
      "</div>" +
      footerHtml(2);
  }

  function renderStep3() {
    var c = state.contact;
    c.email = state.business.email;
    if (!c.phone) c.phone = state.business.phone;
    refs.steps[3].innerHTML =
      headingHtml(
        "Tell us how to contact you",
        "Your Contact Information",
        '<p class="type-description text-tertiary">Let our onboarding team know how to get in touch with you if they have any questions or need additional information.</p>'
      ) +
      '<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-6">' +
      CONTACT_FIELDS.map(function (f) { return fieldHtml("contact", f, c[f.id]); }).join("") +
      "</div>" +
      footerHtml(3);
  }

  function footerHtml(step) {
    return (
      '<div class="mt-4 flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">' +
      '<button type="button" data-su-back="' + step + '" class="' + BTN_SECONDARY_XL + '">' + ICON.chevronLeft + "Back</button>" +
      '<button type="submit" data-su-next="' + step + '" class="' + BTN_PRIMARY_XL + '">Next Step' + ICON.chevronRight + "</button>" +
      "</div>"
    );
  }

  function renderBullets() {
    var step = state.step;
    refs.label.textContent = "Step " + step + " of 3";
    refs.bullets.innerHTML = [1, 2, 3].map(function (i) {
      var s = i < step ? "done" : i === step ? "current" : "next";
      var text = "Step " + i + (s === "done" ? ", completed" : s === "current" ? ", current" : "");
      return '<li class="flex"' + (s === "current" ? ' aria-current="step"' : "") + '><span class="sr-only">' + text + "</span>" + bullet(s) + "</li>";
    }).join("");
  }

  /* ---------- validation ---------- */

  function fieldsOf(step) {
    return Array.prototype.slice.call(refs.steps[step].querySelectorAll("[data-su-field]"));
  }

  function labelOf(field) {
    var l = document.querySelector('label[for="' + field.id + '"]');
    return l ? l.textContent : "This field";
  }

  function messageFor(field) {
    if (field.disabled) return "";
    var v = String(field.value || "").trim();
    if (!v) return labelOf(field) + " is required";
    // TODO(confirm): Figma has no invalid-email message; wording from the SD virtual card form.
    if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "Enter a valid email address";
    return "";
  }

  function showError(field, msg) {
    window.OBField.setError(field, !!msg, document.getElementById(field.id + "-error"), msg);
  }

  function validate(step) {
    var first = null;
    fieldsOf(step).forEach(function (field) {
      var msg = messageFor(field);
      showError(field, msg);
      if (msg && !first) first = field;
    });
    if (first) first.focus();
    return !first;
  }

  /* ---------- navigation ---------- */

  function show(step, opts) {
    opts = opts || {};
    step = Math.max(1, Math.min(step, state.reached));
    state.step = step;
    save();
    if (step === 3) renderStep3();
    [1, 2, 3].forEach(function (i) { refs.steps[i].hidden = i !== step; });
    renderBullets();
    var url = new URL(window.location.href);
    url.searchParams.set("step", String(step));
    if (opts.push) window.history.pushState({ step: step }, "", url);
    else window.history.replaceState({ step: step }, "", url);
    if (opts.focus) {
      window.scrollTo(0, 0);
      var h = refs.steps[step].querySelector("[data-su-heading]");
      if (h) h.focus({ preventScroll: true });
    }
  }

  function go(step) {
    state.reached = Math.max(state.reached, step);
    show(step, { push: true, focus: true });
  }

  function next(step) {
    if (step === 1) {
      if (!consentsDone()) return;
      if (validate(1)) go(2);
    } else if (step === 2) {
      var picked = refs.steps[2].querySelector('input[name="su-match"]:checked');
      var err = document.getElementById("su-match-error");
      if (!picked) {
        err.classList.remove("hidden");
        var firstRadio = refs.steps[2].querySelector('input[name="su-match"]');
        if (firstRadio) firstRadio.focus();
        return;
      }
      err.classList.add("hidden");
      go(3);
    } else if (step === 3) {
      if (!validate(3)) return;
      submit();
    }
  }

  function submit() {
    var btn = refs.steps[3].querySelector('[data-su-next="3"]');
    var back = refs.steps[3].querySelector('[data-su-back="3"]');
    btn.disabled = true;
    back.disabled = true;
    btn.setAttribute("aria-busy", "true");
    btn.innerHTML = ICON.spinner + "<span>Next Step</span>";
    state.submittedAt = new Date().toISOString();
    save();
    var delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 900;
    window.setTimeout(function () {
      window.location.href = APPLICATION_URL;
    }, delay);
  }

  function pickMatch(id) {
    var m = data.matches.filter(function (x) { return x.id === id; })[0] || null;
    state.matchId = m ? m.id : null;
    state.match = m ? Object.assign({}, m) : null;
    if (m) state.manualReview = false;
    var err = document.getElementById("su-match-error");
    if (err) err.classList.add("hidden");
    save();
  }

  function noMatch() {
    state.matchId = null;
    state.match = null;
    state.manualReview = true;
    refs.steps[2].querySelectorAll('input[name="su-match"]').forEach(function (r) { r.checked = false; });
    var err = document.getElementById("su-match-error");
    if (err) err.classList.add("hidden");
    go(3);
  }

  /* ---------- Contact Us (TODO(confirm): no SMART Enroll Contact Us frame; SMART Hub support from smart-enroll.json) ---------- */

  function openContact() {
    var M = window.OBModal;
    var phone = data.support.phone || "";
    var email = data.support.email || "";
    var link = "type-label text-brand hover:underline";
    function row(label, valueHtml, value) {
      return '<div class="flex flex-col gap-0.5"><dt class="type-body text-tertiary">' + label + "</dt>" +
        '<dd class="flex items-center gap-3.5"><span class="min-w-0 flex-1 truncate">' + valueHtml + "</span>" + M.copyButton(label, value) + "</dd></div>";
    }
    M.open(
      '<div class="flex flex-col items-center gap-6 px-6 pb-6">' +
        '<div class="flex w-full flex-col items-center gap-4">' +
          M.illustration("icon-menu-lined.svg", "bg-blue-50 dark:bg-blue-500/10") +
          '<h2 id="su-contact-title" class="type-title-modal w-full text-center text-default">Contact Us</h2>' +
          '<p class="type-description text-center text-tertiary">Contact a Transcard SMART Specialist to help</p>' +
        "</div>" +
        '<dl class="flex w-full flex-col gap-2">' +
          row("Phone Number", '<a href="tel:' + esc(phone.replace(/[^\d+]/g, "")) + '" class="' + link + '">' + esc(phone) + "</a>", phone) +
          row("Email Address", '<a href="mailto:' + esc(email) + '" class="' + link + '">' + esc(email) + "</a>", email) +
        "</dl>" +
      "</div>",
      "su-contact-title",
      { footer: '<div class="flex flex-col px-6 pb-6"><button type="button" data-ob-modal-close class="' + BTN_PRIMARY_XL.replace(" sm:w-50", "") + '">OK</button></div>' }
    );
  }

  /* ---------- events ---------- */

  function onInput(event) {
    var field = event.target.closest("[data-su-field]");
    if (!field) return;
    var parts = field.getAttribute("data-su-field").split(".");
    state[parts[0]][parts[1]] = field.value;
    if (field.tagName === "SELECT") field.setAttribute("data-empty", String(!field.value));
    // Clear the error as soon as the field is fixed (re-checked on Next Step).
    if (field.getAttribute("aria-invalid") === "true" && !messageFor(field)) showError(field, "");
    save();
  }

  function bind() {
    refs.form.addEventListener("input", onInput);
    refs.form.addEventListener("change", function (event) {
      if (event.target.name === "su-match") pickMatch(event.target.value);
      else onInput(event);
    });
    refs.form.addEventListener("submit", function (event) {
      event.preventDefault();
      next(state.step);
    });
    refs.form.addEventListener("click", function (event) {
      var el;
      if ((el = event.target.closest("[data-su-back]"))) {
        show(Number(el.getAttribute("data-su-back")) - 1, { push: true, focus: true });
      } else if (event.target.closest("[data-su-no-match]")) {
        noMatch();
      }
    });
    document.querySelector("[data-su-contact]").addEventListener("click", openContact);
    window.addEventListener("popstate", function () {
      var step = Number(new URLSearchParams(window.location.search).get("step")) || 1;
      show(step, { focus: true });
    });
  }

  /* ---------- boot ---------- */

  function init(results) {
    var matches = results[0] || {};
    var vc = results[1] || {};
    var enroll = results[2] || {};
    data.matches = matches.matches || [];
    data.states = vc.states || [];
    data.countries = vc.countries || data.countries;
    data.agreements = vc.agreements || [];
    data.support = enroll.support || {};
    if (state.matchId && !state.match) pickMatch(state.matchId);

    renderStep1();
    renderStep2();
    var fromUrl = Number(new URLSearchParams(window.location.search).get("step"));
    show(fromUrl || state.step || 1);
    bind();
  }

  function boot() {
    state = load();
    refs.form = document.querySelector("[data-su-form]");
    refs.label = document.querySelector("[data-su-step-label]");
    refs.bullets = document.querySelector("[data-su-bullets]");
    refs.steps = {
      1: document.querySelector('[data-su-step="1"]'),
      2: document.querySelector('[data-su-step="2"]'),
      3: document.querySelector('[data-su-step="3"]'),
    };
    var DS = window.DataSource;
    function get(path) {
      return DS.load(path).catch(function (e) {
        console.error("[SmartEnrollSignUp]", path, e);
        return null;
      });
    }
    Promise.all([get(DATA.matches), get(DATA.agreements), get(DATA.enroll)]).then(init);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  return {
    STORAGE_KEY: STORAGE_KEY,
    getState: function () {
      return state ? JSON.parse(JSON.stringify(state)) : null;
    },
  };
})();

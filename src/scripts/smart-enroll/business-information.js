/**
 * smart-enroll/business-information.js
 * SMART Enroll — Business Information tab (TCDM-5244, T4). Fills the tab slot through SmartEnroll.registerTab.
 * Spec: wiki/products/smart-enroll/flows/business-information.md.
 * Figma [R1] SMART Enroll jLooCmHwqJcYV5p5d8BHnO: 28471:37074 (initial), 28570:56408 (DBA = YES),
 * 28570:55462 (delete confirm), 28476:47758 (dropdowns + tooltips), 28632:81938 (errors).
 *
 * Needs (page): shell.js (SmartEnroll), file-upload.js (FileUpload), onboarding-field.js (OBField),
 * onboarding-modal.js (OBModal, delete confirm), @tailwindplus/elements (el-select).
 *
 * Fields: OBField text inputs, el-select selects (components skill trigger, h-10 / text-base like Text Field [New]),
 * T1 File Upload (one file each; the pencil = "Upload another" replaces it; Delete asks first).
 * Required: 14 (+ DBA Name and the DBA statement when DBA = YES). "<Field> is required." shows under each empty
 * one after Next Step (blocked while something is missing) or Submit; errors clear as fields are filled.
 * Values: sessionStorage SmartEnroll.storageKey('business-information') = { <businessId>: model }.
 *
 * Pre-fill: sessionStorage `se_signup_v1` from Speedy Sign up (T3) when present, else smart-enroll.json.
 *   { version: 1, prefill: { legalName, legalAddress, country, city, state, zip, email, phone },
 *     contact: { firstName, lastName, role, email, phone }, business, match, manualReview, … }
 * `prefill` (else `business`) fills the company fields of the first business (the one Sign up created / matched);
 * `contact` fills Applicant Information. Missing keys fall back to smart-enroll.json.
 */
(function () {
  "use strict";

  var TAB = "business-information";
  var SIGNUP_KEY = "se_signup_v1";
  var BUSINESS_KEY = "se_business_v1";
  var SIGNUP_STEP2 = "sign-up.html?step=2"; // TODO(confirm) T3 page path for Speedy Sign up Step 2.

  var STRUCTURES = [
    "Sole Proprietorship",
    "General Partnership",
    "Limited Liability Company (LLC)",
    "Corporations (C-Corp and S-Corp)",
  ];
  // TIN is only an option here — no separate TIN field (Figma comments 2026-10-20).
  var ORG_ID_TYPES = [
    "Tax Identification Number",
    "Bank Party Identification",
    "Central Bank Identification Number",
    "Legal entity identification",
    "Business identification code",
    "GS1GLN Identifier",
    "Employer Identification Number",
    "Data Universal Numbering System",
    "Country Identification Code",
    "Certificate Of Incorporation Number",
    "Clearing Identification Number",
    "Customer Number",
    "Business Number",
  ];
  var STATES = {
    AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut",
    DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
    IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
    MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
    NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
    NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
    RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah",
    VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  };

  // Required fields in form order (errors + progress). DBA ones only count when DBA = YES.
  var REQUIRED = [
    { key: "legalName", label: "Business Legal Name" },
    { key: "structure", label: "Business Structure", select: true },
    { key: "address", label: "Legal Address" },
    { key: "city", label: "City" },
    { key: "zip", label: "ZIP / Postal Code" },
    { key: "state", label: "State / Province", select: true },
    { key: "phone", label: "Main Business Phone Number" },
    { key: "email", label: "Main Business Email Address" },
    { key: "website", label: "Business Website URL" },
    { key: "csEmail", label: "Email" },
    { key: "csPhone", label: "Phone Number" },
    { key: "orgIdType", label: "Organization Identification Type", select: true },
    { key: "orgIdNumber", label: "ID number" },
    { key: "dba", label: "Doing Business As (DBA)", choice: true }, // TODO(confirm) message not in Figma.
    { key: "dbaName", label: "DBA Name", dba: true }, // TODO(confirm) message not in Figma.
    { key: "dbaStatement", label: "Fictitious / DBA business name statement", dba: true, file: true },
  ];

  /* ---------- classes (components skill; SMART System sizes) ---------- */

  var FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400";
  // Select field trigger (components skill) at Text Field [New] size: h-10, text-base/6, + error / disabled states.
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
  // Input with leading add-on (components skill, `$ 0.00`) at Text Field [New] size, for "http://".
  var ADDON_WRAP =
    "relative flex h-10 items-center rounded-md bg-white pl-3 shadow-xs outline-1 -outline-offset-1 outline-gray-300 hover:outline-gray-400 " +
    "has-[input:focus]:outline-2 has-[input:focus]:-outline-offset-2 has-[input:focus]:outline-blue-600 " +
    "has-[input[aria-invalid=true]]:outline-red-300 has-[input[aria-invalid=true]]:hover:outline-red-400 has-[input[aria-invalid=true]:focus]:outline-red-500 " +
    "has-[input:disabled]:cursor-not-allowed has-[input:disabled]:bg-gray-50 has-[input:disabled]:hover:outline-gray-300 " +
    "dark:bg-white/5 dark:outline-white/10 dark:hover:outline-white/20 dark:has-[input:focus]:outline-blue-400 dark:has-[input[aria-invalid=true]]:outline-red-400/50 " +
    "dark:has-[input:disabled]:bg-white/10 dark:has-[input:disabled]:hover:outline-white/10";
  var ADDON_INPUT =
    "block h-full min-w-0 grow bg-transparent pr-3 pl-1 text-base/6 font-medium text-gray-900 placeholder:font-normal placeholder:text-gray-400 focus:outline-none aria-invalid:pr-10 aria-invalid:text-red-900 disabled:cursor-not-allowed disabled:text-gray-500 dark:text-white dark:placeholder:text-gray-500 dark:aria-invalid:text-red-300 dark:disabled:text-gray-400";
  // YES / NO (Figma "SE/Info Tabs/Business Information/Questions"): Secondary md as a radio, checked = blue tint.
  var CHOICE =
    "relative inline-flex min-w-12 cursor-pointer items-center justify-center rounded-md bg-white px-2.5 py-1.5 type-button text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 " +
    "has-checked:bg-blue-50 has-checked:text-blue-700 has-checked:inset-ring-blue-300 has-checked:hover:bg-blue-100 " +
    "group-data-invalid/yn:inset-ring-red-300 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-blue-600 " +
    "has-disabled:cursor-not-allowed has-disabled:opacity-60 has-disabled:hover:bg-white has-disabled:has-checked:hover:bg-blue-50 " +
    "dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/20 " +
    "dark:has-checked:bg-blue-500/15 dark:has-checked:text-blue-300 dark:has-checked:inset-ring-blue-400/40 dark:has-checked:hover:bg-blue-500/25 " +
    "dark:group-data-invalid/yn:inset-ring-red-400/50 dark:has-focus-visible:outline-blue-400 dark:has-disabled:hover:bg-white/10 dark:has-disabled:has-checked:hover:bg-blue-500/15";
  var BTN_SECONDARY_XL =
    "inline-flex w-full cursor-pointer items-center justify-center rounded-md bg-white px-3.5 py-2.5 text-base font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 " + FOCUS +
    " dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/20";
  var BTN_DANGER_XL =
    "inline-flex w-full cursor-pointer items-center justify-center rounded-md bg-red-600 px-3.5 py-2.5 text-base font-semibold text-white shadow-xs hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 dark:bg-red-500 dark:shadow-none dark:hover:bg-red-400 dark:focus-visible:outline-red-400";
  var CLOSE_X =
    "rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-300 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400";
  var GRAY_BOX = "rounded-md bg-gray-50 p-4 dark:bg-white/5";
  var DIVIDER = "border-t border-default";

  /* ---------- icons ---------- */

  var ICON = {
    info: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4.5"><path fill-rule="evenodd" clip-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" /></svg>',
    infoBanner: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 shrink-0 text-blue-500 dark:text-blue-400"><path fill-rule="evenodd" clip-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" /></svg>',
    selector: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="' + SELECT_CHEVRON + '"><path d="M5.22 10.22a.75.75 0 0 1 1.06 0L8 11.94l1.72-1.72a.75.75 0 1 1 1.06 1.06l-2.25 2.25a.75.75 0 0 1-1.06 0l-2.25-2.25a.75.75 0 0 1 0-1.06ZM10.78 5.78a.75.75 0 0 1-1.06 0L8 4.06 6.28 5.78a.75.75 0 0 1-1.06-1.06l2.25-2.25a.75.75 0 0 1 1.06 0l2.25 2.25a.75.75 0 0 1 0 1.06Z" clip-rule="evenodd" fill-rule="evenodd" /></svg>',
    check: '<span class="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-600 group-not-aria-selected/option:hidden group-focus/option:text-white in-[el-selectedcontent]:hidden dark:text-blue-400"><svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" /></svg></span>',
    phone: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-gray-400 peer-aria-[invalid=true]:hidden dark:text-gray-500"><path fill-rule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.716 3.223a1.5 1.5 0 0 1-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 0 0 6.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 0 1 1.767-1.052l3.223.716A1.5 1.5 0 0 1 18 15.352V16.5a1.5 1.5 0 0 1-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 0 1 2.43 8.326 13.019 13.019 0 0 1 2 5V3.5Z" clip-rule="evenodd" /></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="size-6 text-red-600 dark:text-red-400"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>',
    close: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="size-5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>',
  };

  /* ---------- helpers ---------- */

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function read(key) {
    try { return JSON.parse(window.sessionStorage.getItem(key)); } catch (e) { return null; }
  }

  function write(key, value) {
    try { window.sessionStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode */ }
  }

  function str(v) {
    return v == null ? "" : String(v).trim();
  }

  function pick(list, value) {
    var v = str(value).toLowerCase();
    if (!v) return "";
    var hit = list.filter(function (o) { return o.toLowerCase() === v; })[0];
    return hit || list.filter(function (o) { return o.toLowerCase().indexOf(v) === 0 || v.indexOf(o.toLowerCase()) === 0; })[0] || "";
  }

  function stateName(value) {
    var v = str(value);
    if (!v) return "";
    if (STATES[v.toUpperCase()]) return STATES[v.toUpperCase()];
    return pick(Object.keys(STATES).map(function (k) { return STATES[k]; }), v);
  }

  /** "120 Harbor View Drive, Suite 400, Portland, OR 97209" → address, address2, city, state, zip. */
  function splitAddress(full) {
    var parts = str(full).split(",").map(str).filter(Boolean);
    var out = { address: "", address2: "", city: "", state: "", zip: "" };
    if (!parts.length) return out;
    var last = /^([A-Za-z .]+?)\s+(\d{5}(?:-\d{4})?)$/.exec(parts[parts.length - 1]);
    if (last && parts.length >= 3) {
      out.state = stateName(last[1]);
      out.zip = last[2];
      out.city = parts[parts.length - 2];
      out.address = parts[0];
      out.address2 = parts.slice(1, parts.length - 2).join(", ");
    } else {
      out.address = parts.join(", ");
    }
    return out;
  }

  function stripScheme(url) {
    return str(url).replace(/^https?:\/\//i, "");
  }

  /* ---------- model ---------- */

  var data = null;
  var businessId = null;
  var models = {}; // businessId → model
  var showErrors = false;
  var view = null; // { el, uploads: {}, ctx }

  function currentBusiness() {
    var list = (data && data.businesses) || [];
    return list.filter(function (b) { return b.id === businessId; })[0] || list[0] || {};
  }

  function signup() {
    var s = read(SIGNUP_KEY);
    return s && typeof s === "object" ? s : null;
  }

  function prefill() {
    var biz = currentBusiness();
    var s = signup();
    // Speedy Sign up (T3) `prefill` = the business it created / matched: the first business of the list.
    var first = ((data && data.businesses) || [])[0] || {};
    var sp = s && (s.prefill || s.business);
    var sb = sp && typeof sp === "object" && biz.id === first.id ? sp : null;
    var addr = splitAddress(biz.legalAddress);
    if (sb) {
      // Step 1 keeps the address parts apart; legalAddress is the street (split it if it carries the rest).
      var street = splitAddress(sb.legalAddress);
      var whole = street.city !== "";
      addr = {
        address: whole ? street.address : str(sb.legalAddress),
        address2: whole ? street.address2 : "",
        city: str(sb.city) || street.city,
        zip: str(sb.zip) || street.zip,
        state: stateName(sb.state) || street.state,
      };
    }
    // Sign up doesn't ask structure, website or organization ID: those stay from smart-enroll.json.
    var src = {
      legalName: (sb && sb.legalName) || biz.legalName || biz.name,
      phone: (sb && sb.phone) || biz.phone,
      email: (sb && sb.email) || biz.email,
      structure: biz.structure,
      website: biz.website,
      orgIdType: biz.orgIdType,
      orgIdNumber: biz.orgIdNumber,
    };
    return {
      legalName: str(src.legalName),
      referenceId: "",
      structure: pick(STRUCTURES, src.structure),
      stockSymbol: "",
      address: addr.address,
      address2: addr.address2,
      city: addr.city,
      zip: addr.zip,
      state: addr.state,
      phone: str(src.phone),
      email: str(src.email),
      website: stripScheme(src.website),
      csEmail: "",
      csPhone: "",
      orgIdType: pick(ORG_ID_TYPES, src.orgIdType),
      orgIdNumber: str(src.orgIdNumber),
      dba: "",
      dbaName: "",
      files: { icon: [], logo: [], dbaStatement: [] },
      bannerDismissed: false,
    };
  }

  function model() {
    if (!models[businessId]) models[businessId] = prefill();
    return models[businessId];
  }

  function save() {
    write(window.SmartEnroll.storageKey(TAB), models);
  }

  function applicant() {
    var s = signup();
    var c = (s && (s.contact || s.applicant)) || (data && data.applicant) || {};
    return {
      name: str(c.name) || [str(c.firstName), str(c.lastName)].filter(Boolean).join(" "),
      role: str(c.role),
      email: str(c.email),
      phone: str(c.phone),
    };
  }

  function activeRequired(m) {
    return REQUIRED.filter(function (f) { return !f.dba || m.dba === "yes"; });
  }

  function isFilled(m, f) {
    if (f.file) return ((m.files || {})[f.key] || []).length > 0;
    return str(m[f.key]) !== "";
  }

  function missing(m) {
    return activeRequired(m).filter(function (f) { return !isFilled(m, f); });
  }

  function report() {
    var m = model();
    var req = activeRequired(m);
    window.SmartEnroll.setProgress(TAB, { required: req.length, filled: req.length - missing(m).length });
  }

  /* ---------- markup ---------- */

  /** SMART System Information circle + Tooltip (components skill; same as shell.js infoTip). */
  function infoTip(id, label, text) {
    return (
      '<span class="group/info relative inline-flex size-5 shrink-0 items-center justify-center">' +
      '<span tabindex="0" role="button" aria-describedby="' + esc(id) + '" class="inline-flex cursor-help rounded-full text-gray-400 hover:text-gray-900 focus-visible:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 dark:text-gray-500 dark:hover:text-white dark:focus-visible:text-white dark:focus-visible:outline-blue-400">' +
      '<span class="sr-only">' + esc(label) + "</span>" + ICON.info + "</span>" +
      '<span id="' + esc(id) + '" role="tooltip" class="pointer-events-none invisible absolute top-full left-1/2 z-30 mt-3 w-max max-w-64 -translate-x-2/5 rounded-lg bg-gray-900 p-3 text-left text-sm/5 font-normal text-gray-100 opacity-0 shadow-xs transition-opacity duration-150 group-hover/info:visible group-hover/info:opacity-100 group-has-focus-visible/info:visible group-has-focus-visible/info:opacity-100 before:absolute before:-top-1 before:left-2/5 before:size-3 before:-translate-x-1/2 before:rotate-45 before:rounded-[2px] before:bg-inherit sm:max-w-[343px] dark:bg-gray-950 dark:ring-1 dark:ring-white/10">' +
      esc(text) + "</span></span>"
    );
  }

  function labelRow(forId, label, opts) {
    opts = opts || {};
    var F = window.OBField;
    var tag = opts.noFor ? "span" : "label";
    return (
      '<div class="flex items-center justify-between gap-2">' +
      '<span class="flex min-w-0 items-center gap-1">' +
      "<" + tag + (opts.noFor ? ' id="' + esc(forId) + '-label"' : ' for="' + esc(forId) + '"') + ' class="' + F.LABEL + '">' + esc(label) + "</" + tag + ">" +
      (opts.tip ? infoTip(forId + "-tip", "About " + label, opts.tip) : "") +
      "</span>" +
      (opts.optional ? '<span class="shrink-0 ' + F.HELPER + '">Optional</span>' : "") +
      "</div>"
    );
  }

  function errorLine(id) {
    return '<p id="' + esc(id) + '-error" class="hidden ' + window.OBField.ERROR_TEXT + '"></p>';
  }

  /** OBField text field: label row + input + error line. */
  function textField(key, label, value, opts) {
    opts = opts || {};
    var F = window.OBField;
    var id = "se-bi-" + key;
    return (
      '<div class="flex min-w-0 flex-col gap-1"' + (opts.wrapAttr ? " " + opts.wrapAttr : "") + ">" +
      labelRow(id, label, opts) +
      '<div class="relative">' +
      '<input id="' + id + '" name="' + esc(key) + '" data-se-bi-field="' + esc(key) + '" type="' + (opts.type || "text") + '"' +
      (opts.autocomplete ? ' autocomplete="' + opts.autocomplete + '"' : "") +
      (opts.placeholder ? ' placeholder="' + esc(opts.placeholder) + '"' : "") +
      (opts.disabled ? " disabled" : "") +
      ' value="' + esc(value) + '" aria-invalid="false" aria-describedby="' + id + '-error" class="peer ' + F.INPUT + (opts.phone ? " pr-10" : "") + '" />' +
      (opts.phone ? ICON.phone : "") +
      F.errorIcon() +
      "</div>" +
      errorLine(id) +
      "</div>"
    );
  }

  function websiteField(value) {
    var F = window.OBField;
    var id = "se-bi-website";
    return (
      '<div class="flex min-w-0 flex-col gap-1">' +
      labelRow(id, "Business Website URL") +
      '<div class="' + ADDON_WRAP + '">' +
      '<span aria-hidden="true" class="shrink-0 text-base text-gray-500 select-none dark:text-gray-400">http://</span>' +
      '<input id="' + id + '" name="website" data-se-bi-field="website" type="text" inputmode="url" autocomplete="url" value="' + esc(value) + '" aria-invalid="false" aria-describedby="' + id + '-error" class="' + ADDON_INPUT + '" />' +
      F.errorIcon() +
      "</div>" +
      errorLine(id) +
      "</div>"
    );
  }

  function selectField(key, label, options, value, placeholder) {
    var id = "se-bi-" + key;
    var opts = options.map(function (o) {
      return '<el-option value="' + esc(o) + '" class="' + OPTION + '"><span class="block truncate font-normal group-aria-selected/option:font-semibold">' + esc(o) + "</span>" + ICON.check + "</el-option>";
    }).join("");
    return (
      '<div class="flex min-w-0 flex-col gap-1">' +
      '<span class="flex items-center gap-1"><label for="' + id + '" class="' + window.OBField.LABEL + '">' + esc(label) + "</label></span>" +
      '<el-select name="' + esc(key) + '" data-se-bi-select="' + esc(key) + '"' + (value ? ' value="' + esc(value) + '"' : "") + ' class="block">' +
      '<button type="button" id="' + id + '" aria-invalid="false" aria-describedby="' + id + '-error" class="' + SELECT_TRIGGER + '">' +
      '<el-selectedcontent class="col-start-1 row-start-1 flex items-center gap-2 pr-6 font-medium text-gray-900 group-disabled/select:text-gray-500 dark:text-white dark:group-disabled/select:text-gray-400">' +
      (value ? "" : '<span class="truncate font-normal text-gray-400 dark:text-gray-500">' + esc(placeholder) + "</span>") +
      "</el-selectedcontent>" +
      ICON.selector +
      "</button>" +
      '<el-options anchor="bottom start" popover class="' + OPTIONS + '">' + opts + "</el-options>" +
      "</el-select>" +
      errorLine(id) +
      "</div>"
    );
  }

  function countryField() {
    var id = "se-bi-country";
    return (
      '<div class="flex min-w-0 flex-col gap-1">' +
      '<span class="flex items-center gap-1"><label for="' + id + '" class="' + window.OBField.LABEL + '">Country</label></span>' +
      '<el-select name="country" value="US" class="block">' +
      '<button type="button" id="' + id + '" disabled class="' + SELECT_TRIGGER + '">' +
      '<el-selectedcontent class="col-start-1 row-start-1 flex items-center gap-2 pr-6 font-medium text-gray-500 dark:text-gray-400"></el-selectedcontent>' +
      ICON.selector +
      "</button>" +
      '<el-options anchor="bottom start" popover class="' + OPTIONS + '">' +
      '<el-option value="US" class="' + OPTION + '"><span class="flex items-center gap-2"><img src="../../assets/onboarding/flag-us.svg" alt="" width="20" height="14" class="h-3.5 w-5 shrink-0 rounded-xs" /><span class="truncate">United States</span></span></el-option>' +
      "</el-options></el-select>" +
      "</div>"
    );
  }

  function uploadBlock(key, label, description, tip) {
    var id = "se-bi-" + key;
    return (
      '<div class="flex min-w-0 flex-col gap-2">' +
      '<div class="flex flex-col gap-1">' +
      labelRow(id, label, { noFor: true, optional: true, tip: tip }) +
      '<p class="type-description-small text-tertiary">' + esc(description) + "</p>" +
      "</div>" +
      '<div data-se-bi-upload="' + esc(key) + '"></div>' +
      "</div>"
    );
  }

  function dbaChoice(m) {
    function opt(value, text) {
      return '<label class="' + CHOICE + '"><input type="radio" name="se-bi-dba" value="' + value + '" data-se-bi-dba' + (m.dba === value ? " checked" : "") + ' class="sr-only" />' + text + "</label>";
    }
    return (
      '<div class="flex flex-col gap-1">' +
      '<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">' +
      '<p id="se-bi-dba-label" class="' + window.OBField.LABEL + ' text-default">Do you operate under a fictitious name / Doing Business As (DBA)?</p>' +
      '<div role="radiogroup" aria-labelledby="se-bi-dba-label" aria-describedby="se-bi-dba-error" data-se-bi-dba-group class="group/yn flex shrink-0 gap-3">' +
      opt("yes", "YES") + opt("no", "NO") +
      "</div></div>" +
      errorLine("se-bi-dba") +
      "</div>"
    );
  }

  function dbaFields(m) {
    var id = "se-bi-dbaStatement";
    return (
      '<div data-se-bi-dba-fields class="flex flex-col gap-5' + (m.dba === "yes" ? "" : " hidden") + '">' +
      textField("dbaName", "Please input your Fictitious / Doing Business As (DBA) name:", m.dbaName, { placeholder: "DBA Name" }) +
      '<div class="flex min-w-0 flex-col gap-2">' +
      '<span id="' + id + '-label" class="' + window.OBField.LABEL + '">Fictitious / DBA business name statement</span>' +
      '<div data-se-bi-upload="dbaStatement"></div>' +
      "</div></div>"
    );
  }

  function banner(m, readOnly) {
    if (m.bannerDismissed || readOnly) return "";
    return (
      '<div data-se-bi-banner class="flex items-center gap-3 rounded-md bg-blue-50 px-4 py-2.5 dark:bg-blue-500/10 dark:outline dark:outline-blue-500/20">' +
      ICON.infoBanner +
      '<p class="min-w-0 flex-1 type-label text-blue-700 dark:text-blue-300">Not your business?</p>' +
      '<a href="' + SIGNUP_STEP2 + '" class="shrink-0 rounded-sm type-link text-blue-600 hover:text-blue-800 ' + FOCUS + ' dark:text-blue-400 dark:hover:text-blue-200">Change<span class="sr-only"> business</span></a>' +
      '<button type="button" data-se-bi-banner-close class="' + CLOSE_X + '"><span class="sr-only">Close</span>' + ICON.close + "</button>" +
      "</div>"
    );
  }

  function readOnlyField(id, label, value, type) {
    var F = window.OBField;
    return (
      '<div class="flex min-w-0 flex-col gap-1">' +
      '<label for="' + id + '" class="' + F.LABEL + '">' + esc(label) + "</label>" +
      '<input id="' + id + '" type="' + (type || "text") + '" value="' + esc(value) + '" disabled class="' + F.INPUT + '" />' +
      "</div>"
    );
  }

  function formHtml(m, ctx) {
    var a = applicant();
    return (
      '<div class="flex flex-col gap-6">' +
      banner(m, ctx.readOnly) +
      // Name + Reference ID
      '<div class="grid grid-cols-1 gap-x-16 gap-y-5 md:grid-cols-2">' +
      textField("legalName", "Business Legal Name", m.legalName, { autocomplete: "organization" }) +
      textField("referenceId", "Reference ID", m.referenceId, {
        optional: true,
        tip: "Please enter any internal identifier in this field. This number is used for your internal tracking and reference purposes.",
      }) +
      "</div>" +
      '<div class="' + DIVIDER + '"></div>' +
      // Icon + Logo
      '<div class="grid grid-cols-1 gap-x-16 gap-y-6 md:grid-cols-2">' +
      uploadBlock("icon", "Business Icon", "Your icon will be used as a web browser and app icon to customize your site.", "Icon must be square shaped and at least 16x16 pixels.") +
      uploadBlock("logo", "Business Logo", "Your logo will be used to customize your site.", "Logo must be 512 pixels in height and will be cropped to fit the container.") +
      "</div>" +
      '<div class="' + DIVIDER + '"></div>' +
      // Company details: two columns
      '<div class="grid grid-cols-1 gap-x-16 gap-y-5 md:grid-cols-2">' +
      '<div class="flex min-w-0 flex-col gap-5">' +
      selectField("structure", "Business Structure", STRUCTURES, m.structure, "Select entity form") +
      countryField() +
      textField("address", "Legal Address", m.address, { autocomplete: "address-line1" }) +
      textField("address2", "Address Line 2", m.address2, { optional: true, autocomplete: "address-line2" }) +
      textField("city", "City", m.city, { autocomplete: "address-level2" }) +
      '<div class="grid grid-cols-2 gap-5">' +
      textField("zip", "ZIP / Postal Code", m.zip, { autocomplete: "postal-code" }) +
      selectField("state", "State / Province", Object.keys(STATES).map(function (k) { return STATES[k]; }), m.state, "Select state") +
      "</div></div>" +
      '<div class="flex min-w-0 flex-col gap-5">' +
      textField("stockSymbol", "Stock Symbol", m.stockSymbol, { optional: true }) +
      textField("phone", "Main Business Phone Number", m.phone, { type: "tel", autocomplete: "tel", phone: true }) +
      textField("email", "Main Business Email Address", m.email, { type: "email", autocomplete: "email" }) +
      websiteField(m.website) +
      '<div role="group" aria-labelledby="se-bi-cs-title" class="flex min-w-0 flex-col gap-5 ' + GRAY_BOX + '">' +
      '<p id="se-bi-cs-title" class="type-label text-default">Your Customer Service Contact</p>' +
      textField("csEmail", "Email", m.csEmail, { type: "email", placeholder: "example@mail.com" }) +
      textField("csPhone", "Phone Number", m.csPhone, { type: "tel", phone: true, placeholder: "+1 (000) 000-0000" }) +
      "</div>" +
      "</div></div>" +
      // Organization identification
      '<div class="grid grid-cols-1 gap-x-16 gap-y-5 md:grid-cols-2">' +
      selectField("orgIdType", "Organization Identification Type", ORG_ID_TYPES, m.orgIdType, "Please select ID type") +
      textField("orgIdNumber", "ID number", m.orgIdNumber) +
      "</div>" +
      // DBA
      '<div class="flex flex-col gap-5 ' + GRAY_BOX + '">' + dbaChoice(m) + dbaFields(m) + "</div>" +
      // Applicant Information (read-only)
      '<section aria-labelledby="se-bi-applicant-title" class="mt-6 flex flex-col gap-5">' +
      '<div class="flex flex-col gap-1 border-b border-default pb-5">' +
      '<h2 id="se-bi-applicant-title" class="type-title-card text-default">Applicant Information</h2>' +
      '<p class="type-description text-tertiary">We\'ll contact you with the progress of your application or request for additional information.</p>' +
      "</div>" +
      '<div class="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">' +
      readOnlyField("se-bi-applicant-name", "Applicant Name", a.name) +
      readOnlyField("se-bi-applicant-role", "Applicant Business Role", a.role) +
      readOnlyField("se-bi-applicant-email", "Applicant Email", a.email, "email") +
      readOnlyField("se-bi-applicant-phone", "Applicant Phone Number", a.phone, "tel") +
      "</div></section>" +
      '<p data-se-bi-live class="sr-only" aria-live="polite"></p>' +
      "</div>"
    );
  }

  /* ---------- errors ---------- */

  function fieldEl(key) {
    return view && view.el.querySelector("#se-bi-" + key);
  }

  function setFieldError(f, on) {
    var msg = on ? f.label + " is required." : "";
    if (f.file) {
      var up = view.uploads[f.key];
      if (up) up.setError(on ? msg : null);
      return;
    }
    var errEl = view.el.querySelector("#se-bi-" + (f.choice ? "dba" : f.key) + "-error");
    if (f.choice) {
      var group = view.el.querySelector("[data-se-bi-dba-group]");
      if (group) group.toggleAttribute("data-invalid", on);
    } else {
      var el = fieldEl(f.key);
      if (!el) return;
      if (f.select) el.setAttribute("aria-invalid", on ? "true" : "false");
      else window.OBField.setError(el, on);
    }
    if (errEl) {
      errEl.textContent = msg;
      errEl.classList.toggle("hidden", !on);
    }
  }

  function renderErrors() {
    if (!view) return;
    var m = model();
    var missed = showErrors && !view.ctx.readOnly ? missing(m) : [];
    REQUIRED.forEach(function (f) {
      setFieldError(f, missed.indexOf(f) !== -1);
    });
    return missed;
  }

  /** Next Step / Submit: show every missing field, scroll to the first (no focus, so the red stroke stays). */
  function validate() {
    showErrors = true;
    var missed = renderErrors() || missing(model());
    if (view && missed.length) {
      var f = missed[0];
      var target = f.file
        ? view.el.querySelector('[data-se-bi-upload="' + f.key + '"]')
        : f.choice ? view.el.querySelector("[data-se-bi-dba-group]") : fieldEl(f.key);
      if (target && target.scrollIntoView) target.scrollIntoView({ block: "center", behavior: "smooth" });
      var live = view.el.querySelector("[data-se-bi-live]");
      if (live) {
        live.textContent = "";
        setTimeout(function () { live.textContent = missed.length + (missed.length === 1 ? " required field is" : " required fields are") + " missing."; }, 30);
      }
    }
    return missed.length === 0;
  }

  /* ---------- delete confirm (Figma 28570:55462) ---------- */

  function confirmDelete(onConfirm) {
    if (!window.OBModal) { onConfirm(); return; }
    window.OBModal.open(
      '<div class="flex flex-col items-center gap-6 px-6 pb-6">' +
      '<span class="inline-flex size-11 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10">' + ICON.warning + "</span>" +
      '<h2 id="se-bi-delete-title" class="text-center type-title-modal text-default">Are you sure you want to do this?</h2>' +
      "</div>",
      "se-bi-delete-title",
      {
        footer:
          '<div class="flex flex-col gap-3 px-6 pb-6">' +
          '<button type="button" data-se-bi-delete-confirm class="' + BTN_DANGER_XL + '">Delete</button>' +
          '<button type="button" data-ob-modal-close class="' + BTN_SECONDARY_XL + '">Cancel</button>' +
          "</div>",
      }
    );
    var btn = document.querySelector("[data-se-bi-delete-confirm]");
    if (btn) {
      btn.addEventListener("click", function () {
        window.OBModal.close();
        onConfirm();
      });
    }
  }

  /* ---------- uploads ---------- */

  var UPLOADS = {
    icon: { label: "Business Icon", accept: ".png,.jpg,.jpeg,.svg,.ico", acceptLabel: "PNG, JPG, SVG, ICO up to 8MB" }, // TODO(confirm) formats
    logo: { label: "Business Logo", accept: ".png,.jpg,.jpeg,.svg", acceptLabel: "PNG, JPG, SVG up to 8MB" }, // TODO(confirm) formats
    dbaStatement: { label: "Fictitious / DBA business name statement", accept: ".pdf,.xls,.xlsx,.csv", acceptLabel: "PDF, Excel (.xls, .xlsx), CSV up to 8MB" },
  };

  function mountUploads(el, m, readOnly) {
    view.uploads = {};
    if (!window.FileUpload) return;
    Object.keys(UPLOADS).forEach(function (key) {
      var mountEl = el.querySelector('[data-se-bi-upload="' + key + '"]');
      if (!mountEl) return;
      var u = UPLOADS[key];
      var up = window.FileUpload.mount(mountEl, {
        id: "se-bi-" + key,
        name: key,
        label: u.label,
        accept: u.accept,
        acceptLabel: u.acceptLabel,
        maxSizeMb: 8,
        multiple: false,
        disabled: readOnly,
        files: (m.files && m.files[key]) || [],
        onChange: function (files) {
          model().files[key] = files;
          changed();
        },
      });
      view.uploads[key] = up;
      // Delete asks first (Figma 28570:55462). Capture so FileUpload's own remove never runs unconfirmed.
      mountEl.addEventListener("click", function (e) {
        var rm = e.target.closest && e.target.closest("[data-fu-remove]");
        if (!rm) return;
        e.stopPropagation();
        e.preventDefault();
        confirmDelete(function () {
          up.setFiles([]);
          model().files[key] = [];
          changed();
          if (up.input) up.input.focus();
        });
      }, true);
    });
  }

  /* ---------- render + events ---------- */

  function changed() {
    save();
    report();
    if (showErrors) renderErrors();
  }

  function render(el, ctx) {
    if (!window.OBField) {
      el.innerHTML = '<p class="type-body text-danger">Business Information needs onboarding-field.js.</p>';
      return;
    }
    boot(ctx.data);
    view = { el: el, ctx: ctx, uploads: {} };
    var m = model();
    el.innerHTML = formHtml(m, ctx);
    mountUploads(el, m, ctx.readOnly);
    report();
    renderErrors();

    // rerender() reuses the same element: bind once.
    if (el.hasAttribute("data-se-bi-bound")) return;
    el.setAttribute("data-se-bi-bound", "");
    el.addEventListener("input", function (e) {
      var key = e.target.getAttribute && e.target.getAttribute("data-se-bi-field");
      if (!key) return;
      model()[key] = e.target.value;
      changed();
    });
    el.addEventListener("change", function (e) {
      var t = e.target;
      var sel = t.closest && t.closest("[data-se-bi-select]");
      if (sel) {
        model()[sel.getAttribute("data-se-bi-select")] = sel.value || "";
        changed();
        return;
      }
      if (t.hasAttribute && t.hasAttribute("data-se-bi-dba")) {
        var mm = model();
        mm.dba = t.value;
        var box = el.querySelector("[data-se-bi-dba-fields]");
        if (box) box.classList.toggle("hidden", mm.dba !== "yes");
        changed();
      }
    });
    el.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest("[data-se-bi-banner-close]")) {
        model().bannerDismissed = true;
        save();
        var b = el.querySelector("[data-se-bi-banner]");
        if (b) b.remove();
        var first = el.querySelector("#se-bi-legalName");
        if (first) first.focus();
      }
    });
  }

  /** Reads the stored values and the current business once (the first render runs before SmartEnroll.ready). */
  function boot(d) {
    if (data && businessId) return;
    data = d;
    businessId = read(BUSINESS_KEY) || ((d.businesses || [])[0] || {}).id;
    var stored = read(window.SmartEnroll.storageKey(TAB));
    if (stored && typeof stored === "object") models = stored;
  }

  window.SmartEnroll.registerTab(TAB, render);

  // Progress counts from the first paint, also when the page opens on another tab.
  window.SmartEnroll.ready.then(function (d) {
    boot(d);
    report();
  });

  // Read-only flips (demo status): redraw so the banner, uploads and errors follow; values live in the model.
  window.SmartEnroll.on("readonly-change", function () {
    if (view) window.SmartEnroll.rerender(TAB);
  });

  window.SmartEnroll.on("business-change", function (detail) {
    businessId = (detail.business || {}).id || businessId;
    showErrors = false;
    report();
    if (view) window.SmartEnroll.rerender(TAB);
  });

  // Submit (last tab): mark the missing fields so they show when the user comes back here.
  window.SmartEnroll.on("submit", function () {
    if (!window.SmartEnroll.isReadOnly()) { showErrors = true; renderErrors(); }
  });

  // Next Step on this tab: stay and show the errors while a required field is empty. Capture runs before the
  // shell's document click handler.
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t.closest || !t.closest("[data-se-next]")) return;
    if (window.SmartEnroll.getActiveTab() !== TAB || window.SmartEnroll.isReadOnly() || !data) return;
    if (!validate()) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, true);
})();

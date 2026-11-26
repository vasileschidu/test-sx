/**
 * smart-enroll/ownership.js
 * SMART Enroll — Ownership tab (TCDM-5245, T5). Fills the `ownership` slot of the T1 shell via
 * SmartEnroll.registerTab. Spec: wiki/products/smart-enroll/flows/ownership.md (D-5, D-6).
 * Figma [R1] SMART Enroll jLooCmHwqJcYV5p5d8BHnO, section 29777:35602: initial 29761:29724,
 * Individual < 20% 30219:50256, Additional Details Individual 30219:54511 / Legal Entity 30219:68324,
 * errors 30198:47456, total 100% 30219:75173, remove confirm 30219:79063.
 *
 * Beneficial Ownership (breakdown to 100%, the new design everywhere — D-5):
 *   - "+ Add Owner" opens an "Owner N" form: Entity Type (Individual / Legal Entity), names,
 *     "Is the ownership share equal or higher than 20%?" (No / Yes), Ownership Share or Voting Rights.
 *   - Additional Details only for 20%+ (answer Yes, or no answer yet and a share of 20 or more) (D-6).
 *   - Save collapses the owner to "Name · N% ownership"; the chevron re-opens it ("Save changes",
 *     disabled until something changed); Remove → OBModal confirm. One form open at a time.
 *   - Total breakdown counts saved owners; a share that would take it over 100 shows the error as
 *     the user types and blocks Save. "+ Add Owner" hides at 100%.
 * Legal Entity: Organization Document (T1 File Upload, one file, required).
 * Progress (T1 API): required = 2 + owners (+1 while a new owner is open), filled = saved owners
 * + total exactly 100 + document → tab ✓ only at 100% with everything saved.
 * Read-only statuses: every owner is shown open with its values, no actions (the shell disables the fieldset).
 * Values live in sessionStorage SmartEnroll.storageKey('ownership') = { owners: [...], doc: [...] }.
 *
 * Needs: shell.js (SmartEnroll), onboarding-field.js (OBField), onboarding-modal.js (OBModal),
 * file-upload.js (FileUpload), @tailwindplus/elements (el-select).
 * TODO(confirm): total > 100 error text; DOB / email / phone format messages; country + state lists.
 */
(function () {
  "use strict";

  var SE = window.SmartEnroll;
  if (!SE) return;

  var TAB = "ownership";
  var FLAGS = "../../../assets/icons/consumer-portal/flags/";

  var MSG = {
    select: "Please select an option.",
    share: "Ownership Share or Voting Rights is required.",
    shareYes: "Enter an ownership share of 20% or more.",
    shareNo: "Enter an ownership share below 20%",
    over: "The total ownership can't exceed 100%.", // TODO(confirm): not drawn in Figma.
    date: "Enter a valid date.", // TODO(confirm)
    email: "Enter a valid email address.", // TODO(confirm)
    phone: "Enter a valid phone number.", // TODO(confirm)
  };

  var COUNTRIES = [
    { value: "US", label: "United States of America (the)", flag: "us-20.svg" },
    { value: "CA", label: "Canada", flag: "ca-20.svg" },
    { value: "MX", label: "Mexico", flag: "mx-20.svg" },
    { value: "GB", label: "United Kingdom of Great Britain and Northern Ireland (the)", flag: "gb-20.svg" },
    { value: "ES", label: "Spain", flag: "es-20.svg" },
  ];
  var STATES = [
    ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"], ["CO", "Colorado"],
    ["CT", "Connecticut"], ["DE", "Delaware"], ["DC", "District of Columbia"], ["FL", "Florida"], ["GA", "Georgia"],
    ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"],
    ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"], ["MA", "Massachusetts"],
    ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"],
    ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"],
    ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"],
    ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"],
    ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"],
    ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
  ].map(function (s) { return { value: s[0], label: s[1] }; });
  var ID_TYPES = [
    { value: "passport", label: "Passport" },
    { value: "drivers-license", label: "Driver's License" },
    { value: "ssn", label: "SSN" },
    { value: "other", label: "Other government issued ID" },
  ];

  var UPLOAD = { accept: ".png,.jpg,.jpeg,.gif", acceptLabel: "PNG, JPG, GIF up to 10MB", maxSizeMb: 10 };

  /* Additional Details (Figma 30219:54511 Individual, 30219:68324 Legal Entity). Two columns from md;
     `pair` = two half-width fields on one row. */
  var DETAILS = {
    individual: {
      left: [
        { key: "dob", label: "Date of Birth", kind: "date", placeholder: "MM-DD-YYYY", icon: "calendar" },
        { key: "country", label: "Country", kind: "select", options: COUNTRIES, initial: "US" },
        { key: "address1", label: "Address Line 1", autocomplete: "address-line1" },
        { key: "address2", label: "Address Line 2", optional: true, autocomplete: "address-line2" },
        { key: "city", label: "City", autocomplete: "address-level2" },
        { pair: [
          { key: "state", label: "State / Province", kind: "select", options: STATES },
          { key: "zip", label: "Zip / Postal Code", autocomplete: "postal-code" },
        ] },
      ],
      right: [
        { key: "phone", label: "Phone Number", kind: "phone", placeholder: "+1 (000) 000-0000", icon: "phone" },
        { key: "email", label: "Email", kind: "email", placeholder: "example@gmail.com", icon: "envelope" },
        { key: "nationality", label: "Nationality", kind: "select", options: COUNTRIES, initial: "US" },
        { key: "idType", label: "ID", kind: "select", options: ID_TYPES, placeholder: "Select ID type" },
        { key: "idNumber", label: "ID Number", placeholder: "Enter ID number" },
        { key: "idCountry", label: "ID Issuing Country", kind: "select", options: COUNTRIES, placeholder: "Select country" },
      ],
    },
    legal: {
      left: [
        { key: "address", label: "Address", autocomplete: "street-address" },
        { pair: [
          { key: "zip", label: "ZIP / Postal Code", autocomplete: "postal-code" },
          { key: "city", label: "City", autocomplete: "address-level2" },
        ] },
        { pair: [
          { key: "building", label: "Building", optional: true },
          { key: "apt", label: "Apt.", optional: true },
        ] },
        { key: "state", label: "State / Province", kind: "select", options: STATES },
        { key: "country", label: "Country", kind: "select", options: COUNTRIES, initial: "US" },
      ],
      right: [
        { key: "bizPhone", label: "Business Contact Number", kind: "phone", placeholder: "+1 (000) 000-0000", icon: "phone" },
        { key: "bizEmail", label: "Business Email", kind: "email", optional: true, placeholder: "example@gmail.com", icon: "envelope" },
        { key: "incCountry", label: "Country of Incorporation", kind: "select", options: COUNTRIES, initial: "US" },
      ],
    },
  };

  /* ---------- classes (components skill / shell.js; SMART System button sizes) ---------- */

  var FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400";
  var CARD = "rounded-lg bg-gray-50 p-4 sm:p-5 dark:bg-white/5";
  var DIVIDER = "border-t border-gray-200 dark:border-white/10";
  var LABEL = "type-label text-secondary";
  var OPTIONAL = '<span class="shrink-0 type-label text-gray-400 dark:text-gray-500">Optional</span>';
  // Add Owner pill (Figma SE Add Owner 4929:491770): white pill, gray-200 border, user-add icon in a 2px gray-300 ring,
  // blue label; hover = ring blue-400. SE draws no focus: shared focus-visible outline (a11y). Logged DS-060.
  var ADD_OWNER = "group/add inline-flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 bg-white py-1 pr-4 pl-1 type-button text-blue-600 transition-colors hover:text-blue-700 active:bg-gray-50 " + FOCUS +
    " dark:border-white/10 dark:bg-white/5 dark:text-blue-400 dark:hover:text-blue-300 dark:active:bg-white/10";
  var ADD_OWNER_ICON = "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-gray-400 ring-2 ring-gray-300 transition-colors group-hover/add:ring-blue-400 dark:text-gray-500 dark:ring-white/15 dark:group-hover/add:ring-blue-400/60";
  // Link secondary (Remove) — text button, hover tint like the shell's footer nav.
  var BTN_REMOVE = "inline-flex shrink-0 cursor-pointer items-center rounded-md px-2 py-1 type-button text-gray-700 hover:bg-gray-100 hover:text-gray-900 " + FOCUS + " dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white";
  // Button/Gray 28px icon button (expand / collapse).
  var BTN_TOGGLE = "group/tg inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 active:bg-gray-300 " + FOCUS + " dark:bg-white/10 dark:text-gray-400 dark:hover:bg-white/20 dark:hover:text-white dark:active:bg-white/25";
  // Primary md (Save / Save changes) and a text Cancel of the same height.
  var BTN_PRIMARY = "inline-flex cursor-pointer items-center justify-center rounded-md bg-blue-600 px-2.5 py-1.5 type-button text-white shadow-xs hover:bg-blue-500 active:bg-blue-700 " + FOCUS +
    " disabled:cursor-not-allowed disabled:bg-blue-300 disabled:hover:bg-blue-300 dark:bg-blue-500 dark:shadow-none dark:hover:bg-blue-400 dark:active:bg-blue-600 dark:disabled:bg-blue-500/40 dark:disabled:text-white/60 dark:disabled:hover:bg-blue-500/40";
  var BTN_CANCEL = "inline-flex cursor-pointer items-center justify-center rounded-md px-2.5 py-1.5 type-button text-gray-900 hover:bg-gray-100 active:bg-gray-200 " + FOCUS + " dark:text-white dark:hover:bg-white/10 dark:active:bg-white/15";
  // Dialog buttons (shell.js remove add-on confirm).
  var BTN_SECONDARY_XL = "inline-flex w-full cursor-pointer items-center justify-center rounded-md bg-white px-3.5 py-2.5 text-base font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 " + FOCUS +
    " dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/20";
  var BTN_DANGER_XL = "inline-flex w-full cursor-pointer items-center justify-center rounded-md bg-red-600 px-3.5 py-2.5 text-base font-semibold text-white shadow-xs hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 dark:bg-red-500 dark:shadow-none dark:hover:bg-red-400 dark:focus-visible:outline-red-400";
  var BADGE = "inline-flex shrink-0 items-center rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs/4 font-medium text-gray-800 dark:border-white/15 dark:bg-white/10 dark:text-gray-300";
  // Radio (sx-enroll-acp.js) + hover and error.
  var RADIO = "relative size-4 shrink-0 cursor-pointer appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white not-checked:before:hidden " +
    "not-checked:hover:border-gray-400 group-hover/radio:not-checked:border-gray-400 checked:border-blue-600 checked:bg-blue-600 checked:hover:bg-blue-500 group-hover/radio:checked:bg-blue-500 group-hover/radio:checked:border-blue-500 aria-invalid:border-red-300 aria-invalid:not-checked:hover:border-red-400 " + FOCUS +
    " disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 " +
    "dark:border-white/10 dark:bg-white/5 dark:not-checked:hover:border-white/20 dark:group-hover/radio:not-checked:border-white/20 dark:checked:border-blue-500 dark:checked:bg-blue-500 dark:group-hover/radio:checked:border-blue-400 dark:group-hover/radio:checked:bg-blue-400 dark:aria-invalid:border-red-400/50 " +
    "dark:disabled:border-white/10 dark:disabled:bg-white/10 dark:disabled:before:bg-white/30";
  // Select trigger: skill snippet at the OBField height (h-10, text-base), every state (card-manager-linked-add.js).
  var SELECT_TRIGGER =
    "group/select grid h-10 w-full cursor-default grid-cols-1 items-center rounded-md bg-white py-0 pr-2 pl-3 text-left text-base/6 font-medium text-gray-900 shadow-xs " +
    "outline-1 -outline-offset-1 outline-gray-300 hover:outline-gray-400 " +
    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 " +
    "aria-expanded:outline-2 aria-expanded:-outline-offset-2 aria-expanded:outline-blue-600 " +
    "aria-invalid:outline-red-300 aria-invalid:hover:outline-red-400 aria-invalid:focus-visible:outline-red-600 aria-invalid:aria-expanded:outline-red-600 " +
    "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:outline-gray-200 " +
    "dark:bg-white/5 dark:text-white dark:outline-white/10 dark:hover:outline-white/20 " +
    "dark:focus-visible:outline-blue-500 dark:aria-expanded:outline-blue-500 " +
    "dark:aria-invalid:outline-red-400/50 dark:aria-invalid:focus-visible:outline-red-500 dark:aria-invalid:aria-expanded:outline-red-500 " +
    "dark:disabled:bg-white/10 dark:disabled:text-gray-400 dark:disabled:outline-white/5";
  var SELECT_OPTIONS =
    "max-h-60 w-(--button-width) overflow-auto rounded-md bg-white py-1 text-base shadow-lg outline-1 outline-black/5 " +
    "[--anchor-gap:--spacing(1)] transition transition-discrete data-closed:opacity-0 " +
    "data-enter:duration-100 data-enter:ease-out data-leave:duration-100 data-leave:ease-in " +
    "motion-reduce:transition-none sm:text-sm dark:bg-gray-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10";
  var SELECT_OPTION =
    "group/option relative block cursor-default py-2 pr-9 pl-3 text-gray-900 select-none focus:bg-blue-600 focus:text-white focus:outline-hidden dark:text-white dark:focus:bg-blue-500";

  /* ---------- icons (Heroicons v2 mini unless noted) ---------- */

  var ICON = {
    plus: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>',
    chevron: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 transition-transform duration-200 group-aria-expanded/tg:rotate-180 motion-reduce:transition-none"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" /></svg>',
    selector: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-500 group-hover/select:text-gray-700 sm:size-4 dark:text-gray-400 dark:group-hover/select:text-gray-200"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.22 10.22a.75.75 0 0 1 1.06 0L8 11.94l1.72-1.72a.75.75 0 1 1 1.06 1.06l-2.25 2.25a.75.75 0 0 1-1.06 0l-2.25-2.25a.75.75 0 0 1 0-1.06ZM10.78 5.78a.75.75 0 0 1-1.06 0L8 4.06 6.28 5.78a.75.75 0 0 1-1.06-1.06l2.25-2.25a.75.75 0 0 1 1.06 0l2.25 2.25a.75.75 0 0 1 0 1.06Z" /></svg>',
    check: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" /></svg>',
    checkCircle: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 shrink-0 text-green-500 dark:text-green-400"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" /></svg>',
    alertCircle: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 shrink-0 text-red-500 dark:text-red-400"><path fill-rule="evenodd" clip-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" /></svg>',
    // Heroicons v2 outline user-plus (Figma empty state, dashed circle).
    userPlus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="size-5"><path stroke-linecap="round" stroke-linejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" /></svg>',
    // Figma "percent" leading icon (drawn: two dots and a slash).
    percent: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true" class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-gray-400 dark:text-gray-500"><path d="M15 5 5 15" /><circle cx="6.5" cy="6.5" r="1.75" /><circle cx="13.5" cy="13.5" r="1.75" /></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="size-6 text-red-600 dark:text-red-400"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>',
  };
  // Trailing field icons (decorative; hidden while the field shows its error icon).
  var FIELD_ICON = {
    calendar: '<path fill-rule="evenodd" clip-rule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" />',
    phone: '<path fill-rule="evenodd" clip-rule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.513 2.31a1.5 1.5 0 0 1-1.02 1.756l-.97.322c.477 1.233 1.21 2.371 2.153 3.314a10.04 10.04 0 0 0 3.314 2.153l.322-.97a1.5 1.5 0 0 1 1.756-1.02l2.31.513A1.5 1.5 0 0 1 18 14.352V15.5a1.5 1.5 0 0 1-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 0 1 2.43 8.326 13.019 13.019 0 0 1 2 5V3.5Z" />',
    envelope: '<path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z" /><path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z" />',
  };

  /* ---------- state ---------- */

  var state = {
    owners: [], // saved: { id, type, firstName, lastName, legalName, answer, share, details: {}, govId: [] }
    doc: [], // Organization Document (file meta)
    openId: null, // owner being edited (saved id or the draft id)
    draft: null, // a new, not yet saved owner
    tried: {}, // form id → Save was pressed (show every error)
    touched: {}, // field id → blurred once
  };
  var view = { root: null, readOnly: false, uploads: [], loaded: false };

  /* ---------- helpers ---------- */

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function uid() {
    return "o" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  /** "12.5" → 1250 (hundredths); null when empty or not a number. */
  function cents(value) {
    var s = String(value == null ? "" : value).trim();
    if (!s || !/^\d*\.?\d*$/.test(s) || s === ".") return null;
    return Math.round(parseFloat(s) * 100);
  }

  function pct(c) {
    return String(Math.round(c) / 100).replace(/\.0+$/, "");
  }

  function load() {
    var raw = null;
    try { raw = JSON.parse(window.sessionStorage.getItem(SE.storageKey(TAB))); } catch (e) { raw = null; }
    state.owners = raw && Array.isArray(raw.owners) ? raw.owners : [];
    state.doc = raw && Array.isArray(raw.doc) ? raw.doc : [];
    view.loaded = true;
  }

  function persist() {
    try {
      window.sessionStorage.setItem(SE.storageKey(TAB), JSON.stringify({ owners: state.owners, doc: state.doc }));
    } catch (e) { /* private mode: keep in memory */ }
  }

  function ownerById(id) {
    if (state.draft && state.draft.id === id) return state.draft;
    return state.owners.filter(function (o) { return o.id === id; })[0] || null;
  }

  function isDraft(id) {
    return !!(state.draft && state.draft.id === id);
  }

  function savedTotal(exceptId) {
    return state.owners.reduce(function (sum, o) { return o.id === exceptId ? sum : sum + (cents(o.share) || 0); }, 0);
  }

  function displayName(o) {
    return o.type === "legal" ? o.legalName : [o.firstName, o.lastName].filter(Boolean).join(" ");
  }

  function ownerNumber(o) {
    var i = state.owners.indexOf(o);
    return (i === -1 ? state.owners.length : i) + 1;
  }

  /** Additional Details apply for 20%+: answer Yes, or no answer yet and a share of 20 or more. */
  function needsDetails(answer, shareCents) {
    return answer === "yes" || (!answer && shareCents != null && shareCents >= 2000);
  }

  function fieldsOf(type) {
    var d = DETAILS[type === "legal" ? "legal" : "individual"];
    var out = [];
    d.left.concat(d.right).forEach(function (f) { if (f.pair) out.push(f.pair[0], f.pair[1]); else out.push(f); });
    return out;
  }

  function fid(ownerId, key) {
    return "se-own-" + ownerId + "-" + key;
  }

  /* ---------- progress (T1 API) ---------- */

  function progress() {
    var total = savedTotal();
    var required = 2 + state.owners.length + (state.draft ? 1 : 0);
    var filled = state.owners.length + (total === 10000 ? 1 : 0) + (state.doc.length ? 1 : 0);
    SE.setProgress(TAB, { required: required, filled: filled });
  }

  /* ---------- markup: fields ---------- */

  function labelRow(id, label, optional, tag) {
    var el = tag === "span" ? '<span id="' + id + '-label" class="' + LABEL + '">' : '<label for="' + id + '" class="' + LABEL + '">';
    return '<div class="flex items-center justify-between gap-2">' + el + esc(label) + (tag === "span" ? "</span>" : "</label>") + (optional ? OPTIONAL : "") + "</div>";
  }

  function errorLine(id, extra) {
    return '<p id="' + id + '-error" class="hidden ' + (extra ? extra + " " : "") + window.OBField.ERROR_TEXT + '"></p>';
  }

  function textField(ownerId, f, value, scope) {
    var F = window.OBField;
    var id = fid(ownerId, (scope ? scope + "-" : "") + f.key);
    var type = f.kind === "email" ? "email" : f.kind === "phone" ? "tel" : "text";
    var inputmode = f.kind === "phone" || f.kind === "date" ? ' inputmode="numeric"' : f.kind === "share" ? ' inputmode="decimal"' : "";
    var trailing = f.icon
      ? '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-gray-400 peer-aria-invalid:hidden dark:text-gray-500">' + FIELD_ICON[f.icon] + "</svg>"
      : "";
    return (
      '<div data-own-field="' + f.key + '" class="flex min-w-0 flex-col gap-1">' +
      labelRow(id, f.label, f.optional) +
      '<div class="relative">' +
      (f.kind === "share" ? ICON.percent : "") +
      '<input id="' + id + '" data-f="' + f.key + '" type="' + type + '"' + inputmode +
      ' autocomplete="' + (f.autocomplete || "off") + '"' +
      (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : "") +
      (f.maxlength ? ' maxlength="' + f.maxlength + '"' : "") +
      ' value="' + esc(value) + '" aria-invalid="false" aria-describedby="' + id + '-error"' +
      ' class="peer ' + F.INPUT + (f.kind === "share" ? " pl-10" : "") + (f.icon ? " pr-10" : "") + '">' +
      trailing + F.errorIcon() +
      "</div>" + errorLine(id) + "</div>"
    );
  }

  function flag(file) {
    return '<span class="relative inline-flex h-3 w-4 shrink-0 overflow-hidden rounded-xs ring-1 ring-black/10 dark:ring-white/10"><img src="' + FLAGS + file + '" alt="" class="size-full object-cover"></span>';
  }

  function selectField(ownerId, f, value, scope) {
    var id = fid(ownerId, (scope ? scope + "-" : "") + f.key);
    var options = f.options.map(function (o) {
      return (
        '<el-option value="' + esc(o.value) + '" class="' + SELECT_OPTION + '">' +
        '<span class="flex items-center gap-2">' + (o.flag ? flag(o.flag) : "") +
        '<span class="block truncate font-normal group-aria-selected/option:font-semibold in-[el-selectedcontent]:font-medium">' + esc(o.label) + "</span></span>" +
        '<span class="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-600 group-not-aria-selected/option:hidden group-focus/option:text-white in-[el-selectedcontent]:hidden dark:text-blue-400">' + ICON.check + "</span>" +
        "</el-option>"
      );
    }).join("");
    var placeholder = '<span class="truncate font-normal text-gray-400 dark:text-gray-500">' + (f.placeholder ? esc(f.placeholder) : "&nbsp;") + "</span>";
    return (
      '<div data-own-field="' + f.key + '" class="flex min-w-0 flex-col gap-1">' +
      labelRow(id, f.label, f.optional, "span") +
      '<el-select id="' + id + '" data-f="' + f.key + '" name="' + id + '"' + (value ? ' value="' + esc(value) + '"' : "") + ' class="block">' +
      '<button type="button" aria-labelledby="' + id + '-label" aria-describedby="' + id + '-error" aria-invalid="false" class="' + SELECT_TRIGGER + '">' +
      '<el-selectedcontent class="col-start-1 row-start-1 flex min-w-0 items-center gap-2 pr-6">' + placeholder + "</el-selectedcontent>" +
      ICON.selector + "</button>" +
      '<el-options anchor="bottom start" popover class="' + SELECT_OPTIONS + '">' + options + "</el-options>" +
      "</el-select>" + errorLine(id) + "</div>"
    );
  }

  function field(ownerId, f, values, scope) {
    var v = values[f.key];
    if (!v && f.initial) v = f.initial;
    return f.kind === "select" ? selectField(ownerId, f, v, scope) : textField(ownerId, f, v, scope);
  }

  function column(ownerId, list, values, scope) {
    return '<div class="flex min-w-0 flex-col gap-4">' + list.map(function (f) {
      return f.pair
        ? '<div class="grid grid-cols-2 gap-4">' + field(ownerId, f.pair[0], values, scope) + field(ownerId, f.pair[1], values, scope) + "</div>"
        : field(ownerId, f, values, scope);
    }).join("") + "</div>";
  }

  function radioGroup(ownerId, key, legend, options, value) {
    var id = fid(ownerId, key);
    return (
      '<fieldset data-own-field="' + key + '" aria-describedby="' + id + '-error">' +
      '<legend class="' + LABEL + '">' + esc(legend) + "</legend>" +
      '<div class="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">' +
      options.map(function (o) {
        return '<label class="group/radio inline-flex cursor-pointer items-center gap-2 type-body text-secondary hover:text-default has-disabled:cursor-not-allowed has-disabled:hover:text-secondary">' +
          '<input type="radio" name="' + id + '" value="' + o.value + '" data-f="' + key + '"' + (value === o.value ? " checked" : "") + ' aria-invalid="false" class="' + RADIO + '">' +
          "<span>" + esc(o.label) + "</span></label>";
      }).join("") +
      "</div>" + errorLine(id, "mt-2") + "</fieldset>"
    );
  }

  function uploadRow(id, title, text) {
    return (
      '<div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6">' +
      '<div class="flex min-w-0 flex-col gap-1">' +
      '<span id="' + id + '-title" class="type-label-large text-default">' + esc(title) + "</span>" +
      '<p data-own-upload-desc="' + id + '" class="type-description text-tertiary">' + esc(text) + "</p></div>" +
      '<div data-own-upload="' + id + '" class="w-full shrink-0 md:w-78"></div></div>'
    );
  }

  /** SE error frames (5413:371099, 5406:343819): the upload description turns red with the dropzone. */
  function flagUploadDesc(slotId, on) {
    var d = view.root && view.root.querySelector('[data-own-upload-desc="' + slotId + '"]');
    if (!d) return;
    d.classList.toggle("text-tertiary", !on);
    d.classList.toggle("text-red-600", on);
    d.classList.toggle("dark:text-red-400", on);
  }

  /** Organization Document is required (progress counts it); shown after Next Step / Submit. */
  function applyDocError() {
    if (!view.root || view.readOnly) return;
    var on = !!state.docTried && !state.doc.length;
    var up = view.docUpload;
    if (up) up.setError(on ? "Organization Document is required." : null);
    flagUploadDesc("se-own-orgdoc", on);
  }

  /* ---------- markup: owner card ---------- */

  function headerHtml(o, open) {
    var saved = !isDraft(o.id);
    var name = saved ? displayName(o) : "Owner " + ownerNumber(o);
    var panelId = "se-own-" + o.id + "-panel";
    return (
      '<div class="flex items-center gap-3">' +
      '<div class="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">' +
      '<h3 id="se-own-' + o.id + '-title" class="min-w-0 truncate type-title-card text-default" title="' + esc(name) + '">' + esc(name) + "</h3>" +
      (saved ? '<span class="' + BADGE + '">' + esc(pct(cents(o.share) || 0)) + "% ownership</span>" : "") +
      "</div>" +
      (saved && !view.readOnly ? '<button type="button" data-own-remove="' + o.id + '" class="' + BTN_REMOVE + '">Remove<span class="sr-only"> ' + esc(name) + "</span></button>" : "") +
      (view.readOnly ? "" :
        '<button type="button" data-own-toggle="' + o.id + '" aria-expanded="' + open + '"' + (open ? ' aria-controls="' + panelId + '"' : "") + ' data-tooltip="' + (open ? "Collapse" : "Expand") + '" class="' + BTN_TOGGLE + '">' +
        '<span class="sr-only">' + (open ? "Collapse " : "Expand ") + esc(name) + "</span>" + ICON.chevron + "</button>") +
      "</div>"
    );
  }

  function formHtml(o) {
    var id = o.id;
    var d = o.details || {};
    var shareC = cents(o.share);
    var details = needsDetails(o.answer, shareC);
    var type = o.type === "legal" ? "legal" : "individual";
    var saved = !isDraft(id);
    var detailsHtml = function (t) {
      var spec = DETAILS[t];
      return (
        '<div data-own-details="' + t + '"' + (details && type === t ? "" : " hidden") + ' class="flex flex-col gap-6">' +
        '<div class="flex flex-col gap-6">' +
        '<div class="flex flex-col gap-1 pt-2"><h4 class="type-label-large text-default">Additional Details</h4>' +
        '<p class="type-description text-tertiary">This will be used to contact you and notify of onboarding progress, approval or request for additional requirements, if necessary.</p></div>' +
        '<div class="' + DIVIDER + '"></div>' +
        '<div class="grid gap-4 md:grid-cols-2 md:gap-x-16">' + column(id, spec.left, d, t) + column(id, spec.right, d, t) + "</div>" +
        "</div>" +
        (t === "individual"
          ? '<div class="' + DIVIDER + '"></div>' + uploadRow(fid(id, "govId"), "Attach the Government Issued Identification", "Legible and not expired, one of: Passport, Drive License, ID card")
          : "") +
        "</div>"
      );
    };
    return (
      '<form id="se-own-' + id + '-panel" data-own-form="' + id + '" novalidate autocomplete="off" aria-labelledby="se-own-' + id + '-title" class="mt-5 flex flex-col gap-6 border-t border-gray-200 pt-6 dark:border-white/10">' +
      '<div class="flex flex-col gap-4">' +
      radioGroup(id, "type", "Entity Type", [{ value: "individual", label: "Individual" }, { value: "legal", label: "Legal Entity" }], type) +
      '<div data-own-names="individual"' + (type === "individual" ? "" : " hidden") + ' class="grid gap-4 md:grid-cols-2 md:gap-x-16">' +
      textField(id, { key: "firstName", label: "First Name", autocomplete: "off" }, o.firstName) +
      textField(id, { key: "lastName", label: "Last Name", autocomplete: "off" }, o.lastName) +
      "</div>" +
      '<div data-own-names="legal"' + (type === "legal" ? "" : " hidden") + ">" +
      textField(id, { key: "legalName", label: "Business Legal Name", autocomplete: "off" }, o.legalName) +
      "</div></div>" +
      '<div class="' + DIVIDER + '"></div>' +
      '<div class="flex flex-col gap-4">' +
      radioGroup(id, "answer", "Is the ownership share equal or higher than 20%?", [{ value: "no", label: "No" }, { value: "yes", label: "Yes" }], o.answer) +
      '<div class="md:w-1/2 md:pr-8">' +
      textField(id, { key: "share", kind: "share", label: "Ownership Share or Voting Rights", placeholder: "0.00", maxlength: 6 }, o.share) +
      "</div></div>" +
      detailsHtml("individual") + detailsHtml("legal") +
      (view.readOnly ? "" :
        '<div class="flex items-center gap-2">' +
        '<button type="submit" data-own-save class="' + BTN_PRIMARY + '"' + (saved ? " disabled" : "") + ">" + (saved ? "Save changes" : "Save") + "</button>" +
        '<button type="button" data-own-cancel="' + id + '" class="' + BTN_CANCEL + '">Cancel</button></div>') +
      "</form>"
    );
  }

  function ownerHtml(o) {
    var open = view.readOnly || state.openId === o.id;
    return (
      '<li data-own-card="' + o.id + '" class="' + CARD + '">' +
      headerHtml(o, open) + (open ? formHtml(o) : "") +
      "</li>"
    );
  }

  function totalHtml() {
    var total = savedTotal();
    var done = total === 10000;
    var flagged = !done && (state.owners.length > 0 || Object.keys(state.tried).length > 0);
    return (
      '<span class="type-body-large text-tertiary">Total breakdown</span>' +
      '<span class="inline-flex items-center gap-2">' +
      '<span class="type-body-large text-secondary"><span class="font-semibold ' + (flagged ? "text-red-600 dark:text-red-400" : "text-default") + '">' + pct(total) + "</span> / 100%</span>" +
      (done ? ICON.checkCircle + '<span class="sr-only">(complete)</span>' : flagged ? ICON.alertCircle + '<span class="sr-only">(must be exactly 100%)</span>' : "") +
      "</span>"
    );
  }

  function emptyHtml() {
    return (
      '<div class="flex items-center gap-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-white/15 dark:bg-white/5">' +
      '<span aria-hidden="true" class="inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-dashed border-gray-300 text-gray-400 dark:border-white/20 dark:text-gray-500">' + ICON.userPlus + "</span>" +
      '<div class="flex min-w-0 flex-col gap-1"><h2 id="se-own-breakdown-title" class="type-title-card text-default">Add owners to provide the business ownership breakdown</h2>' +
      '<p class="type-description text-tertiary">The total must be of 100%.</p></div></div>'
    );
  }

  function showAddOwner() {
    if (view.readOnly || savedTotal() >= 10000) return false;
    // Figma: hidden while the very first owner is being filled; shown once one is saved.
    return state.owners.length > 0 || !state.draft;
  }

  function pageHtml() {
    var list = state.owners.slice();
    if (state.draft) list.push(state.draft);
    return (
      '<div class="flex flex-col gap-12">' +
      '<section aria-labelledby="se-own-breakdown-title" class="flex flex-col gap-2">' +
      (list.length
        ? '<h2 id="se-own-breakdown-title" class="type-label-large text-default">Provide the business ownership breakdown</h2>' +
          '<ul role="list" class="flex flex-col gap-2">' + list.map(ownerHtml).join("") + "</ul>"
        : emptyHtml()) +
      '<div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 pt-2">' +
      (showAddOwner() ? '<button type="button" data-own-add class="' + ADD_OWNER + '"><span aria-hidden="true" class="' + ADD_OWNER_ICON + '">' + ICON.userPlus + "</span>Add Owner</button>" : "<span></span>") +
      '<p data-own-total aria-live="polite" class="ml-auto flex items-center gap-4">' + totalHtml() + "</p>" +
      "</div></section>" +
      '<section aria-labelledby="se-own-legal-title" class="flex flex-col gap-4">' +
      '<div class="flex flex-col gap-1"><h2 id="se-own-legal-title" class="type-title-card text-default">Legal Entity</h2>' +
      '<p class="type-description text-tertiary">Please provide the documents related to your business organization.</p></div>' +
      '<div class="' + DIVIDER + '"></div>' +
      uploadRow("se-own-orgdoc", "Attach the Organization Document", "Articles of Incorporation, Articles of Association or Articles of Organization") +
      "</section></div>"
    );
  }

  /* ---------- render ---------- */

  function destroyUploads() {
    view.uploads.forEach(function (u) { if (u && u.destroy) u.destroy(); });
    view.uploads = [];
  }

  function mountUpload(slotId, opts) {
    var el = view.root.querySelector('[data-own-upload="' + slotId + '"]');
    if (!el || !window.FileUpload) return null;
    var up = window.FileUpload.mount(el, {
      id: slotId,
      name: slotId,
      label: opts.label,
      accept: UPLOAD.accept,
      acceptLabel: UPLOAD.acceptLabel,
      maxSizeMb: UPLOAD.maxSizeMb,
      disabled: view.readOnly,
      files: opts.files || [],
      onChange: opts.onChange,
    });
    view.uploads.push(up);
    return up;
  }

  function render() {
    if (!view.root) return;
    destroyUploads();
    view.root.innerHTML = pageHtml();
    view.docUpload = mountUpload("se-own-orgdoc", {
      label: "Attach the Organization Document",
      files: state.doc,
      onChange: function (files) { state.doc = files; persist(); progress(); applyDocError(); },
    });
    applyDocError();
    view.root.querySelectorAll("[data-own-form]").forEach(bindForm);
    progress();
  }

  function cardEl(id) {
    return view.root.querySelector('[data-own-card="' + id + '"]');
  }

  function focusLater(el) {
    if (el) setTimeout(function () { el.focus(); }, 30);
  }

  /* ---------- form: read, validate, visibility ---------- */

  function readForm(form) {
    var get = function (key) {
      var el = form.querySelector('[data-f="' + key + '"]:not([type="radio"])');
      return el ? String(el.value || "").trim() : "";
    };
    var radio = function (key) {
      var el = form.querySelector('[data-f="' + key + '"]:checked');
      return el ? el.value : "";
    };
    var type = radio("type") || "individual";
    var out = {
      type: type,
      firstName: get("firstName"),
      lastName: get("lastName"),
      legalName: get("legalName"),
      answer: radio("answer"),
      share: get("share"),
      details: {},
      govId: form._govId ? form._govId.getFiles() : [],
    };
    var box = form.querySelector('[data-own-details="' + type + '"]');
    fieldsOf(type).forEach(function (f) {
      var el = box.querySelector('[data-f="' + f.key + '"]');
      out.details[f.key] = el ? String(el.value || "").trim() : "";
    });
    return out;
  }

  function validDate(v) {
    var m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(v);
    if (!m) return false;
    var d = new Date(+m[3], +m[1] - 1, +m[2]);
    return d.getMonth() === +m[1] - 1 && d.getDate() === +m[2] && d < new Date() && +m[3] > 1900;
  }

  /** Errors by field key for the current values (only for what is visible). */
  function errorsFor(id, v) {
    var e = {};
    if (v.type === "legal") {
      if (!v.legalName) e.legalName = "Business Legal Name is required.";
    } else {
      if (!v.firstName) e.firstName = "First Name is required.";
      if (!v.lastName) e.lastName = "Last Name is required.";
    }
    if (!v.answer) e.answer = MSG.select;
    var c = cents(v.share);
    if (v.share === "" || c == null) e.share = MSG.share;
    else if (c > 10000 || savedTotal(id) + c > 10000) e.share = MSG.over;
    else if (v.answer === "yes" && c < 2000) e.share = MSG.shareYes;
    else if (v.answer === "no" && c >= 2000) e.share = MSG.shareNo;
    if (needsDetails(v.answer, c)) {
      fieldsOf(v.type).forEach(function (f) {
        var val = v.details[f.key];
        if (!val) { if (!f.optional) e[f.key] = f.label + " is required."; return; }
        if (f.kind === "date" && !validDate(val)) e[f.key] = MSG.date;
        if (f.kind === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) e[f.key] = MSG.email;
        if (f.kind === "phone" && val.replace(/\D/g, "").length !== 11) e[f.key] = MSG.phone;
      });
      if (v.type === "individual" && !v.govId.length) e.govId = "Government Issued Identification is required.";
    }
    return e;
  }

  /** Visible wrapper of a field (the Individual and Legal details share keys such as zip / city). */
  function wrapFor(form, key) {
    var all = form.querySelectorAll('[data-own-field="' + key + '"]');
    for (var i = 0; i < all.length; i += 1) { if (!all[i].closest("[hidden]")) return all[i]; }
    return null;
  }

  function controlFor(form, key) {
    if (key === "govId") return form.querySelector('[data-own-upload] input[type="file"]');
    var wrap = wrapFor(form, key);
    if (!wrap) return null;
    var ctl = wrap.querySelector("[data-f]");
    if (!ctl) return null;
    if (ctl.tagName === "EL-SELECT") return ctl.querySelector("button");
    return ctl;
  }

  /** Shows the errors of touched fields (all after Save; the > 100 error at once). Returns the first shown key. */
  function applyErrors(form, errs) {
    var id = form.getAttribute("data-own-form");
    var tried = !!state.tried[id];
    var first = null;
    form.querySelectorAll("[data-own-field]").forEach(function (wrap) {
      var key = wrap.getAttribute("data-own-field");
      var hidden = !!wrap.closest("[hidden]");
      var ctl = wrap.querySelector("[data-f]");
      var p = wrap.querySelector(":scope > p[id$='-error']");
      if (!ctl || !p) return;
      var touchKey = ctl.type === "radio" ? ctl.name : ctl.id;
      var show = !hidden && !!errs[key] && (tried || !!state.touched[touchKey] || errs[key] === MSG.over);
      p.textContent = show ? errs[key] : "";
      p.classList.toggle("hidden", !show);
      if (ctl.type === "radio") {
        wrap.querySelectorAll('input[type="radio"]').forEach(function (r) { r.setAttribute("aria-invalid", show ? "true" : "false"); });
      } else if (ctl.tagName === "EL-SELECT") {
        ctl.querySelector("button").setAttribute("aria-invalid", show ? "true" : "false");
      } else {
        window.OBField.setError(ctl, show);
      }
      if (show && !first) first = key;
    });
    // Government Issued Identification: the File Upload shows its own error line.
    var gov = form._govId;
    if (gov) {
      var govShow = !!errs.govId && (tried || !!state.touched[fid(id, "govId")]);
      if (govShow) { gov.setError(errs.govId); form._govErr = true; if (!first) first = "govId"; }
      else if (form._govErr) { gov.setError(null); form._govErr = false; }
      flagUploadDesc(fid(id, "govId"), govShow);
    }
    return first;
  }

  function syncVisibility(form, v) {
    form.querySelectorAll("[data-own-names]").forEach(function (el) { el.hidden = el.getAttribute("data-own-names") !== v.type; });
    var on = needsDetails(v.answer, cents(v.share));
    form.querySelectorAll("[data-own-details]").forEach(function (el) { el.hidden = !(on && el.getAttribute("data-own-details") === v.type); });
  }

  function snapshot(v) {
    return JSON.stringify([v.type, v.firstName, v.lastName, v.legalName, v.answer, v.share, v.details, v.govId.map(function (f) { return f.name; })]);
  }

  function refresh(form) {
    var id = form.getAttribute("data-own-form");
    var v = readForm(form);
    syncVisibility(form, v);
    v = readForm(form);
    var errs = errorsFor(id, v);
    applyErrors(form, errs);
    var save = form.querySelector("[data-own-save]");
    if (save && !isDraft(id)) save.disabled = snapshot(v) === form._initial;
    return errs;
  }

  /* ---------- input masks ---------- */

  function maskShare(value) {
    var s = value.replace(/[^\d.]/g, "");
    var dot = s.indexOf(".");
    if (dot !== -1) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, "").slice(0, 2);
    var intPart = dot === -1 ? s : s.slice(0, dot);
    if (intPart.length > 3) s = intPart.slice(0, 3) + (dot === -1 ? "" : s.slice(dot));
    return s;
  }

  function maskDate(value) {
    var d = value.replace(/\D/g, "").slice(0, 8);
    if (d.length > 4) return d.slice(0, 2) + "-" + d.slice(2, 4) + "-" + d.slice(4);
    if (d.length > 2) return d.slice(0, 2) + "-" + d.slice(2);
    return d;
  }

  function maskPhone(value) {
    var d = value.replace(/\D/g, "");
    if (d.charAt(0) === "1") d = d.slice(1);
    d = d.slice(0, 10);
    if (!d) return "";
    var out = "+1 (" + d.slice(0, 3);
    if (d.length > 3) out += ") " + d.slice(3, 6);
    if (d.length > 6) out += "-" + d.slice(6);
    return out;
  }

  function bindForm(form) {
    var id = form.getAttribute("data-own-form");
    var o = ownerById(id);
    var gov = fid(id, "govId");
    form._govId = mountUpload(gov, {
      label: "Attach the Government Issued Identification",
      files: (o && o.govId) || [],
      onChange: function () { state.touched[gov] = true; refresh(form); },
    });
    if (view.readOnly) return;
    form._initial = snapshot(readForm(form));

    form.addEventListener("input", function (e) {
      var t = e.target;
      var key = t.getAttribute && t.getAttribute("data-f");
      if (t.tagName === "INPUT" && t.type !== "radio" && t.type !== "file") {
        var masked = key === "share" ? maskShare(t.value) : key === "dob" ? maskDate(t.value) : /phone/i.test(key || "") ? maskPhone(t.value) : t.value;
        if (masked !== t.value) t.value = masked;
      }
      refresh(form);
    });
    form.addEventListener("change", function (e) {
      if (e.target.type === "radio") state.touched[e.target.name] = true;
      refresh(form);
    });
    // el-select fires change on itself; mark it touched once a value is picked.
    form.querySelectorAll("el-select").forEach(function (sel) {
      sel.addEventListener("change", function () { state.touched[sel.id] = true; refresh(form); });
    });
    form.addEventListener("focusout", function (e) {
      var t = e.target;
      if (t.tagName === "INPUT" && t.type !== "radio" && t.type !== "file" && t.id) {
        state.touched[t.id] = true;
        refresh(form);
      }
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      save(form);
    });
  }

  /* ---------- actions ---------- */

  function save(form) {
    var id = form.getAttribute("data-own-form");
    state.tried[id] = true;
    var errs = refresh(form);
    var keys = Object.keys(errs);
    if (keys.length) {
      var ctl = controlFor(form, applyErrors(form, errs));
      var total = view.root.querySelector("[data-own-total]");
      if (total) total.innerHTML = totalHtml();
      if (ctl) ctl.focus();
      return;
    }
    var v = readForm(form);
    if (!needsDetails(v.answer, cents(v.share))) { v.details = {}; v.govId = []; }
    if (v.type === "legal") { v.firstName = ""; v.lastName = ""; v.govId = []; } else { v.legalName = ""; }
    v.id = id;
    if (isDraft(id)) {
      state.owners.push(v);
      state.draft = null;
    } else {
      state.owners = state.owners.map(function (o) { return o.id === id ? v : o; });
    }
    delete state.tried[id];
    state.openId = null;
    persist();
    render();
    focusLater(view.root.querySelector('[data-own-toggle="' + id + '"]'));
  }

  function cancel(id) {
    delete state.tried[id];
    if (isDraft(id)) {
      state.draft = null;
      state.openId = null;
      render();
      focusLater(view.root.querySelector("[data-own-add]"));
      return;
    }
    state.openId = null;
    render();
    focusLater(view.root.querySelector('[data-own-toggle="' + id + '"]'));
  }

  function toggle(id) {
    // Keep what was typed in a collapsed new owner; edits to a saved owner are dropped (one form open).
    var openForm = state.openId && view.root.querySelector('[data-own-form="' + state.openId + '"]');
    if (openForm && isDraft(state.openId)) {
      var v = readForm(openForm);
      v.id = state.draft.id;
      state.draft = v;
    }
    state.openId = state.openId === id ? null : id;
    render();
    var btn = view.root.querySelector('[data-own-toggle="' + id + '"]');
    focusLater(btn);
  }

  function addOwner() {
    if (state.draft) {
      state.openId = state.draft.id;
      render();
    } else {
      state.draft = { id: uid(), type: "individual", firstName: "", lastName: "", legalName: "", answer: "", share: "", details: {}, govId: [] };
      state.openId = state.draft.id;
      render();
    }
    var card = cardEl(state.draft.id);
    if (card) {
      card.scrollIntoView({ block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      focusLater(card.querySelector('input[data-f="type"]:checked'));
    }
  }

  function removeOwner(id) {
    var o = ownerById(id);
    if (!o) return;
    var done = function () {
      var i = state.owners.indexOf(o);
      state.owners = state.owners.filter(function (x) { return x.id !== id; });
      if (state.openId === id) state.openId = null;
      delete state.tried[id];
      persist();
      render();
      var next = state.owners[i] || state.owners[i - 1];
      focusLater(next ? view.root.querySelector('[data-own-remove="' + next.id + '"]') : view.root.querySelector("[data-own-add]"));
    };
    if (!window.OBModal) { done(); return; }
    // Figma 30219:79063: warning icon, "Are you sure you want to do this?", Confirm (danger) / Cancel (secondary), X.
    window.OBModal.open(
      '<div class="flex flex-col items-center gap-6 px-6 pb-6">' +
      '<span class="inline-flex size-11 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10">' + ICON.warning + "</span>" +
      '<div class="flex w-full flex-col gap-2 text-center">' +
      '<h2 id="se-own-remove-title" class="type-title-modal text-default">Are you sure you want to do this?</h2>' +
      '<p class="sr-only">' + esc(displayName(o)) + " will be removed from the ownership breakdown.</p>" +
      "</div></div>",
      "se-own-remove-title",
      {
        footer:
          '<div class="flex flex-col gap-3 px-6 pb-6">' +
          '<button type="button" data-own-remove-confirm class="' + BTN_DANGER_XL + '">Confirm</button>' +
          '<button type="button" data-ob-modal-close class="' + BTN_SECONDARY_XL + '">Cancel</button>' +
          "</div>",
      }
    );
    var confirm = document.querySelector("[data-own-remove-confirm]");
    if (confirm) {
      confirm.addEventListener("click", function () {
        window.OBModal.close();
        done();
      });
    }
  }

  function onClick(e) {
    var t = e.target.closest("[data-own-add], [data-own-toggle], [data-own-remove], [data-own-cancel]");
    if (!t || !view.root.contains(t) || view.readOnly) return;
    if (t.hasAttribute("data-own-add")) addOwner();
    else if (t.hasAttribute("data-own-toggle")) toggle(t.getAttribute("data-own-toggle"));
    else if (t.hasAttribute("data-own-remove")) removeOwner(t.getAttribute("data-own-remove"));
    else if (t.hasAttribute("data-own-cancel")) cancel(t.getAttribute("data-own-cancel"));
  }

  /* ---------- wire to the shell ---------- */

  SE.registerTab(TAB, function (el, ctx) {
    if (!view.loaded) load();
    if (view.root !== el) {
      view.root = el;
      el.addEventListener("click", onClick);
    }
    view.readOnly = !!ctx.readOnly;
    if (view.readOnly) { state.draft = null; state.openId = null; }
    render();
  });

  SE.on("readonly-change", function (detail) {
    if (!view.root) return;
    view.readOnly = !!detail.readOnly;
    if (view.readOnly) { state.draft = null; state.openId = null; state.tried = {}; }
    render();
  });

  // Next Step / Submit from this tab: flag what is missing (open form, total, Organization Document) so it shows here.
  function flagMissing() {
    if (SE.isReadOnly()) return;
    state.docTried = true;
    if (state.openId) state.tried[state.openId] = true;
    else if (state.owners.length || state.draft) state.tried.total = true;
    if (view.root && view.loaded) {
      render();
      var open = state.openId && view.root.querySelector('[data-own-form="' + state.openId + '"]');
      if (open) refresh(open);
    }
  }
  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("[data-se-next]") && SE.getActiveTab() === TAB) flagMissing();
  }, true);
  SE.on("submit", flagMissing);

  // Progress from the saved values even before the tab is opened.
  SE.ready.then(function () {
    if (!view.loaded) load();
    progress();
  });
})();

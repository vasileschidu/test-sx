/**
 * smart-enroll/merchant-services.js
 * SMART Enroll — Merchant Services add-on (TCDM-5248, T8): fills the Financial and Business Plan tab slots.
 * Spec: wiki/products/smart-enroll/flows/merchant-services.md (D-3 BlueSnap default, D-4 signer copy).
 * Figma [R1] SMART Enroll jLooCmHwqJcYV5p5d8BHnO: Financial 28582:53698 (BlueSnap 30397:62328),
 * change processor 28582:56003, attestation Yes 30243:53172 / No 30251:71007, Business Plan 28141:35114.
 *
 * Page: src/pages/smart-enroll/application.html. Data: src/data/smart-enroll-merchant.json.
 * Needs: shell.js (window.SmartEnroll), file-upload.js, onboarding-field.js (OBField), onboarding-modal.js (OBModal),
 * checkbox.css, shared.js (data-tooltip, showGlobalTopToast), @tailwindplus/elements (el-select, el-autocomplete).
 *
 * State per tab in sessionStorage (SmartEnroll.storageKey): Financial { processor, selecting, v, files, att },
 * Business Plan { files }. Removing the add-on drops both (shell) and clears the copy here (addon-discard).
 * Progress: requiredFin() / requiredBp() list every required answer for the current answers; the counts go to
 * SmartEnroll.setProgress on every change, also before the tab is opened.
 */
(function () {
  "use strict";

  var SE = window.SmartEnroll;
  if (!SE) return;

  var ADDON = "merchant";
  var FIN = "financial";
  var BP = "business-plan";
  var DATA_PATH = "../../data/smart-enroll-merchant.json";
  var ASSETS = "../../assets/smart-enroll/";

  var cfg = null;
  var base = null;
  var S = { fin: blankFin(), bp: blankBp() };
  var roots = {};
  var uploads = { fin: {}, bp: {} };
  var openYears = { 1: true, 2: false, 3: false };

  /* ---------- classes (components skill + SMART System button sizes, as in shell.js) ---------- */

  var FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400";
  var PRIMARY =
    "inline-flex cursor-pointer items-center justify-center gap-1.5 bg-blue-600 font-semibold text-white shadow-xs hover:bg-blue-500 " + FOCUS +
    " disabled:cursor-not-allowed disabled:bg-blue-300 dark:bg-blue-500 dark:shadow-none dark:hover:bg-blue-400 dark:disabled:bg-blue-500/40 dark:disabled:text-white/60";
  var BTN_PRIMARY_MD = "rounded-md px-2.5 py-1.5 text-sm " + PRIMARY;
  var BTN_PRIMARY_LG = "rounded-md px-3 py-2 text-base " + PRIMARY;
  var BTN_PRIMARY_XL = "rounded-md px-3.5 py-2.5 text-base " + PRIMARY;
  var SECONDARY =
    "inline-flex cursor-pointer items-center justify-center gap-1.5 bg-white font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 " + FOCUS +
    " disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/20";
  var BTN_SECONDARY_LG = "rounded-md px-3 py-2 text-base " + SECONDARY;
  var BTN_SECONDARY_XL = "w-full rounded-md px-3.5 py-2.5 text-base " + SECONDARY;
  // Button/Gray (components skill), md.
  var BTN_GRAY_MD =
    "inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-200 hover:text-gray-700 active:bg-gray-300 " + FOCUS +
    " disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20 dark:hover:text-white";
  // Link primary (shell.js LINK).
  var LINK =
    "inline-flex cursor-pointer items-center gap-1.5 rounded-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors " + FOCUS +
    " disabled:cursor-not-allowed disabled:text-gray-400 dark:text-blue-400 dark:hover:text-blue-300 dark:disabled:text-gray-500";
  // Select trigger at Text Field height (card-manager-account-picker.js TRIGGER_CLS) + chevron hover tone.
  var SELECT_TRIGGER =
    "group/select grid h-10 w-full cursor-default grid-cols-1 items-center rounded-md bg-white py-0 pr-2 pl-3 text-left text-base/6 text-gray-900 shadow-xs " +
    "outline-1 -outline-offset-1 outline-gray-300 hover:outline-gray-400 " +
    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 " +
    "aria-expanded:outline-2 aria-expanded:-outline-offset-2 aria-expanded:outline-blue-600 " +
    "aria-invalid:outline-red-300 aria-invalid:focus-visible:outline-red-600 " +
    "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:outline-gray-200 disabled:hover:outline-gray-200 " +
    "dark:bg-white/5 dark:text-white dark:outline-white/10 dark:hover:outline-white/20 " +
    "dark:focus-visible:outline-blue-500 dark:aria-expanded:outline-blue-500 " +
    "dark:aria-invalid:outline-red-400/50 dark:aria-invalid:focus-visible:outline-red-500 " +
    "dark:disabled:bg-white/10 dark:disabled:text-gray-500 dark:disabled:outline-white/5 dark:disabled:hover:outline-white/5";
  var OPTIONS =
    "max-h-72 w-(--button-width) overflow-auto rounded-md bg-white py-1 text-base shadow-lg outline-1 outline-black/5 [--anchor-gap:--spacing(1)] " +
    "transition transition-discrete data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-100 data-leave:ease-in motion-reduce:transition-none " +
    "sm:text-sm dark:bg-gray-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10";
  var OPTION =
    "group/option relative block cursor-default py-2 pr-9 pl-3 text-gray-900 select-none focus:bg-blue-600 focus:text-white focus:outline-hidden dark:text-white dark:focus:bg-blue-500";
  // Radio (sx-onboarding-acp.js RADIO) and radio card label row.
  var RADIO =
    "relative size-4 shrink-0 cursor-pointer appearance-none rounded-full border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 before:absolute before:inset-1 before:rounded-full before:bg-white not-checked:before:hidden checked:border-blue-600 dark:checked:border-blue-500 checked:bg-blue-600 dark:checked:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400 disabled:cursor-not-allowed disabled:border-gray-300 dark:disabled:border-white/10 disabled:bg-gray-100 dark:disabled:bg-white/10 disabled:before:bg-gray-400 dark:disabled:before:bg-white/30";
  var RADIO_ROW =
    "flex cursor-pointer items-center gap-3 px-4 py-3 text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-white/5 has-checked:bg-gray-50 dark:has-checked:bg-white/5 has-disabled:cursor-not-allowed has-disabled:hover:bg-white dark:has-disabled:hover:bg-gray-900";
  // Toggle switch (components skill) + Tailwind Plus dark pair.
  var TOGGLE =
    "group relative inline-flex w-11 shrink-0 cursor-pointer rounded-full bg-gray-200 p-0.5 inset-ring inset-ring-gray-900/5 outline-offset-2 outline-blue-600 transition-colors duration-200 ease-in-out has-checked:bg-blue-600 has-focus-visible:outline-2 has-disabled:cursor-not-allowed has-disabled:opacity-50 " +
    "dark:bg-white/5 dark:inset-ring-white/10 dark:outline-blue-500 dark:has-checked:bg-blue-500";
  var BADGE_BLUE = "inline-flex w-fit items-center rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs/4 font-medium text-blue-800 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-400";
  var GROUP = "flex flex-col gap-4 rounded-lg bg-gray-50 p-4 dark:bg-white/5";
  var GROUP_INNER = "flex flex-col gap-4 rounded-lg bg-white p-4 dark:bg-gray-900";
  var GRID2 = "grid grid-cols-1 gap-x-9 gap-y-5 md:grid-cols-2";

  /* ---------- icons ---------- */

  var ICON = {
    card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="size-7"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" /></svg>',
    check: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 shrink-0 text-green-500 dark:text-green-400"><path fill-rule="evenodd" clip-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" /></svg>',
    checkSelected: '<span class="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-600 group-not-aria-selected/option:hidden group-focus/option:text-white in-[el-selectedcontent]:hidden dark:text-blue-400"><svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" /></svg></span>',
    chevronRight: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>',
    arrowRight: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="size-4"><path fill-rule="evenodd" d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z" clip-rule="evenodd" /></svg>',
    selector: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-500 group-hover/select:text-gray-700 sm:size-4 dark:text-gray-400 dark:group-hover/select:text-gray-200"><path d="M5.22 10.22a.75.75 0 0 1 1.06 0L8 11.94l1.72-1.72a.75.75 0 1 1 1.06 1.06l-2.25 2.25a.75.75 0 0 1-1.06 0l-2.25-2.25a.75.75 0 0 1 0-1.06ZM10.78 5.78a.75.75 0 0 1-1.06 0L8 4.06 6.28 5.78a.75.75 0 0 1-1.06-1.06l2.25-2.25a.75.75 0 0 1 1.06 0l2.25 2.25a.75.75 0 0 1 0 1.06Z" clip-rule="evenodd" fill-rule="evenodd" /></svg>',
    calendar: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" /></svg>',
    search: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clip-rule="evenodd" /></svg>',
    // Figma Icon20/Solid "percent" (path from the Financial frame), currentColor.
    percent: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" clip-rule="evenodd" d="M6 7C6.55228 7 7 6.55228 7 6C7 5.44772 6.55228 5 6 5C5.44772 5 5 5.44772 5 6C5 6.55228 5.44772 7 6 7ZM6 9C7.65685 9 9 7.65685 9 6C9 4.34315 7.65685 3 6 3C4.34315 3 3 4.34315 3 6C3 7.65685 4.34315 9 6 9ZM14 15C14.5523 15 15 14.5523 15 14C15 13.4477 14.5523 13 14 13C13.4477 13 13 13.4477 13 14C13 14.5523 13.4477 15 14 15ZM14 17C15.6569 17 17 15.6569 17 14C17 12.3431 15.6569 11 14 11C12.3431 11 11 12.3431 11 14C11 15.6569 12.3431 17 14 17ZM16.2071 5.20711C16.5976 4.81658 16.5976 4.18342 16.2071 3.79289C15.8166 3.40237 15.1834 3.40237 14.7929 3.79289L3.79289 14.7929C3.40237 15.1834 3.40237 15.8166 3.79289 16.2071C4.18342 16.5976 4.81658 16.5976 5.20711 16.2071L16.2071 5.20711Z" /></svg>',
    phone: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.513 2.31a1.5 1.5 0 0 1-1.02 1.756l-.75.25a.75.75 0 0 0-.429 1.036 10.53 10.53 0 0 0 4.787 4.787.75.75 0 0 0 1.036-.43l.25-.75a1.5 1.5 0 0 1 1.756-1.02l2.31.514A1.5 1.5 0 0 1 18 13.352V14.5a1.5 1.5 0 0 1-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 0 1 2.43 6.326 13.019 13.019 0 0 1 2 3.5Z" clip-rule="evenodd" /></svg>',
    envelope: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z" /><path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z" /></svg>',
    bank: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 shrink-0 text-gray-500 dark:text-gray-400"><path fill-rule="evenodd" d="M9.674 2.075a.75.75 0 0 1 .652 0l7.25 3.5A.75.75 0 0 1 17 6.957V16.5h.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H3V6.957a.75.75 0 0 1-.576-1.382l7.25-3.5ZM11 6a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM7.5 9.75a.75.75 0 0 0-1.5 0v5.5a.75.75 0 0 0 1.5 0v-5.5Zm3.25 0a.75.75 0 0 0-1.5 0v5.5a.75.75 0 0 0 1.5 0v-5.5Zm3.25 0a.75.75 0 0 0-1.5 0v5.5a.75.75 0 0 0 1.5 0v-5.5Z" clip-rule="evenodd" /></svg>',
    pencil: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="size-4"><path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.262a1.75 1.75 0 0 0 0-2.474Z" /><path d="M4.75 3.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25V9A.75.75 0 0 1 14 9v2.25A2.75 2.75 0 0 1 11.25 14h-6.5A2.75 2.75 0 0 1 2 11.25v-6.5A2.75 2.75 0 0 1 4.75 2H7a.75.75 0 0 1 0 1.5H4.75Z" /></svg>',
    plus: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>',
    minus: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" d="M4 10a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 10Z" clip-rule="evenodd" /></svg>',
    info: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-gray-400 dark:text-gray-500"><path fill-rule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 8a.75.75 0 0 0 0 1.5h.75v1.75a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8.25 8h-1.5Z" clip-rule="evenodd" /></svg>',
    warningMini: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 shrink-0 text-amber-400 dark:text-amber-500"><path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd" /></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="size-6 text-amber-600 dark:text-amber-400"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>',
    checkCircle: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="mt-0.5 size-5 shrink-0 text-green-500 dark:text-green-400"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" /></svg>',
    spinner: '<svg class="size-4 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z"></path></svg>',
  };

  /* ---------- helpers ---------- */

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function F() {
    return window.OBField;
  }

  function blankFin() {
    return { processor: "bluesnap", selecting: false, v: { currency: "USD" }, files: {}, att: {} };
  }

  function blankBp() {
    return { files: {} };
  }

  function read(key) {
    try { return JSON.parse(window.sessionStorage.getItem(key)); } catch (e) { return null; }
  }

  function write(key, value) {
    try { window.sessionStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage full or blocked */ }
  }

  function save(which) {
    write(SE.storageKey(which === "bp" ? BP : FIN), S[which]);
  }

  function restore() {
    var fin = read(SE.storageKey(FIN));
    var bp = read(SE.storageKey(BP));
    S.fin = fin && typeof fin === "object" ? Object.assign(blankFin(), fin) : blankFin();
    S.bp = bp && typeof bp === "object" ? Object.assign(blankBp(), bp) : blankBp();
  }

  /* ---------- demo seed (shell Demo status: Pending Approval / Approved / Declined / Suspended = submitted complete) ---------- */

  var DEMO_FILE = { name: "resume_back_end_developer.pdf", size: 245760, type: "PDF" };

  function demoFin() {
    var v = {
      parentCompany: "Brightline Holdings", currency: "USD", mcc: cfg.mccCodes[0].value, incorporationDate: "03-15-2012",
      productDescription: "Wholesale supply of packaging and office products to retail chains.",
      revenueSources: "Product sales to retail and wholesale customers.", industry: "Wholesale trade", employees: "48",
      salesVolume: "4,200,000.00", operatingStatus: "active", taxId: "93-1234567",
      regulated: "no", cardPayments: "no", pci: "yes", pciLevel: (cfg.pciLevels[2] || cfg.pciLevels[0]).value,
      volume12: "1,200,000.00", growth: "8.00", advanceOrders: "no",
      purchaseProcess: "Customers order online or through their account manager, pay by card or ACH, and receive goods within 3 to 5 business days.",
      subscription: "no", termsPublic: "yes", fraudProgram: "no", terminated: "no", ftcComplaint: "no",
    };
    v["geo_" + cfg.regions[0].id] = "100";
    [1, 2, 3].forEach(function (y) {
      v["y" + y + "Volume"] = (400000 * y).toLocaleString("en-US", { minimumFractionDigits: 2 });
      v["y" + y + "Count"] = String(1600 * y);
      v["y" + y + "Average"] = "250.00";
      v["y" + y + "Highest"] = "12,000.00";
      v["y" + y + "Refund"] = "1.00";
      v["y" + y + "Chargeback"] = "0.20";
    });
    var files = { termsFile: [DEMO_FILE] };
    cfg.proofingDocuments.forEach(function (d) { if (!d.optional) files["doc-" + d.id] = [DEMO_FILE]; });
    var a = SE.getPeople()[0] || {};
    return {
      processor: "bluesnap", selecting: false, v: v, files: files,
      att: { choice: "yes", accepted: { at: new Date().toISOString(), by: [a.firstName, a.lastName].filter(Boolean).join(" ") || "Jordan Ellis" } },
    };
  }

  /** Completed demo statuses: fill both tabs once with valid answers (the shell's restore later drops these keys). */
  function seedDemo() {
    if (!SE.isDemoSeeded || !SE.isDemoSeeded() || !SE.hasAddon(ADDON)) return;
    if (requiredFin().every(Boolean) && hasFiles("bp", "businessPlan")) return;
    S.fin = demoFin();
    S.bp = { files: { businessPlan: [DEMO_FILE] } };
    save("fin");
    save("bp");
  }

  function toast(message, tone) {
    if (typeof window.showGlobalTopToast === "function") window.showGlobalTopToast(message, { tone: tone || "success" });
  }

  function val(name) {
    var x = S.fin.v[name];
    return x == null ? "" : x;
  }

  function has(name) {
    var x = S.fin.v[name];
    return x === true || (x != null && x !== false && String(x).trim() !== "");
  }

  function hasFiles(which, key) {
    return ((S[which].files || {})[key] || []).length > 0;
  }

  function isOwn() {
    return !S.fin.selecting && S.fin.processor !== "bluesnap";
  }

  function recommended() {
    return cfg.processors.recommended;
  }

  function processorName() {
    return S.fin.processor === "bluesnap" ? recommended().name : S.fin.processor;
  }

  function yearStart() {
    return Number(val("yearStart")) || new Date().getFullYear();
  }

  /* ---------- required answers → progress ---------- */

  function requiredFin() {
    var out = [];
    var v = S.fin.v;
    function req(ok) { out.push(!!ok); }
    ["parentCompany", "currency", "incorporationDate", "productDescription", "revenueSources", "industry", "employees", "salesVolume", "operatingStatus", "taxId"]
      .forEach(function (n) { req(has(n)); });
    if (S.fin.selecting) { req(false); return out; }
    if (isOwn()) {
      ["ownMcc", "ownMaxMonthly", "ownAccountNumber", "ownMerchantNumber", "ownIndustry", "contactFirst", "contactLast", "contactPhone", "contactEmail"]
        .forEach(function (n) { req(has(n)); });
      req(has("accountType"));
      if (v.accountType === "existing") req(has("bankAccount"));
      if (v.accountType === "new") req(has("abaNumber"));
      req(hasFiles("fin", "varSheet"));
      return out;
    }
    req(has("regulated"));
    if (v.regulated === "yes") req(hasFiles("fin", "license"));
    req(cfg.regions.some(function (r) { return has("geo_" + r.id); }));
    req(has("cardPayments"));
    if (v.cardPayments === "yes") {
      req(cfg.cardPeriods.some(function (p) { return cfg.cards.some(function (c) { return v["card_" + p.id + "_" + c.id] === true; }); }));
      req(has("breach"));
      if (v.breach === "yes") req(has("breachDescription"));
      req(has("violation"));
      if (v.violation === "yes") req(has("violationDescription"));
      req(has("providers"));
      if (v.providers === "yes") req(has("providersList"));
      req(hasFiles("fin", "transactionalFile"));
      ["chargebackHistory", "refundHistory", "averageTicket", "highestTicket", "deliveryPeriod"].forEach(function (n) { req(has(n)); });
    }
    req(has("pci"));
    if (v.pci === "yes") req(has("pciLevel"));
    if (v.pci === "no" && v.pciSelfCertify === true) req(has("pciDate"));
    req(has("volume12"));
    req(has("growth"));
    [1, 2, 3].forEach(function (y) {
      req(["Volume", "Count", "Average", "Highest", "Refund", "Chargeback"].every(function (k) { return has("y" + y + k); }));
    });
    req(has("advanceOrders"));
    if (v.advanceOrders === "yes") req(cfg.delayPeriods.some(function (d) { return has("delay_" + d.id); }));
    req(has("purchaseProcess"));
    req(has("subscription"));
    if (v.subscription === "yes") req(has("subscriptionPeriod"));
    req(has("termsPublic"));
    if (v.termsPublic === "yes") req(hasFiles("fin", "termsFile"));
    ["fraudProgram", "terminated", "ftcComplaint"].forEach(function (n) { req(has(n)); });
    cfg.proofingDocuments.forEach(function (d) { if (!d.optional) req(hasFiles("fin", "doc-" + d.id)); });
    var att = S.fin.att || {};
    req((att.choice === "yes" && att.accepted) || (att.choice === "no" && att.request));
    return out;
  }

  function counts(list) {
    return { required: list.length, filled: list.filter(Boolean).length };
  }

  function pushProgress() {
    if (!cfg || !SE.hasAddon(ADDON)) return;
    SE.setProgress(FIN, counts(requiredFin()));
    SE.setProgress(BP, counts([hasFiles("bp", "businessPlan")]));
  }

  /* ---------- field builders (OBField "Text Field [New]") ---------- */

  function labelRow(id, text, opts) {
    return (
      '<div class="' + (opts && opts.srLabel ? "sr-only" : "flex items-center justify-between gap-2") + '">' +
      '<label for="' + id + '" class="' + F().LABEL + '">' + esc(text) + "</label>" +
      (opts && opts.optional ? '<span class="type-description text-tertiary">Optional</span>' : "") +
      "</div>"
    );
  }

  function errorLine(id) {
    return '<p id="' + id + '-error" class="hidden ' + F().ERROR_TEXT + '"></p>';
  }

  /**
   * opts: type, inputmode, placeholder, optional, helper, prefix ('percent' | 'phone' | 'envelope' | flag file),
   * suffix ('USD' | 'percent'), kind ('money' | 'percent' | 'int'), autocomplete, disabled, after (HTML next to the input)
   */
  function textField(name, label, opts) {
    opts = opts || {};
    var id = "ms-" + name;
    var pad = "";
    var prefix = "";
    var suffix = "";
    if (opts.prefix) {
      pad += " pl-10";
      var inner = opts.prefix === "percent" ? ICON.percent : opts.prefix === "phone" ? ICON.phone : opts.prefix === "envelope" ? ICON.envelope
        : '<img src="' + ASSETS + esc(opts.prefix) + '" alt="" width="20" height="15" class="h-3.75 w-5 rounded-xs ring-1 ring-black/10" />';
      prefix = '<span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400 dark:text-gray-500">' + inner + "</span>";
    }
    if (opts.suffix) {
      pad += opts.suffix === "USD" ? " pr-14" : " pr-10";
      suffix = '<span class="pointer-events-none absolute inset-y-0 right-3 flex items-center type-body-large text-gray-500 dark:text-gray-400">' +
        (opts.suffix === "percent" ? ICON.percent : esc(opts.suffix)) + "</span>";
    }
    var isDate = opts.type === "date";
    if (isDate) {
      // R1 Financial: text field "mm-dd-yyyy" + calendar icon (masked like Ownership Date of Birth), not the native picker.
      opts.kind = "date"; opts.inputmode = "numeric"; opts.placeholder = "mm-dd-yyyy"; opts.maxlength = 10; opts.type = "text";
      pad += " pr-10";
      suffix = '<span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400 dark:text-gray-500">' + ICON.calendar + "</span>";
    }
    var describedBy = (opts.helper ? id + "-help " : "") + id + "-error";
    return (
      '<div class="flex min-w-0 flex-col gap-1">' +
      labelRow(id, label, opts) +
      '<div class="relative">' + prefix +
      '<input id="' + id + '" name="' + esc(name) + '" data-ms-field="' + esc(name) + '"' + (opts.kind ? ' data-ms-kind="' + opts.kind + '"' : "") +
      ' type="' + (opts.type || "text") + '"' + (opts.inputmode ? ' inputmode="' + opts.inputmode + '"' : "") +
      ' value="' + esc(val(name)) + '" autocomplete="' + (opts.autocomplete || "off") + '"' +
      (opts.placeholder ? ' placeholder="' + esc(opts.placeholder) + '"' : "") +
      (opts.maxlength ? ' maxlength="' + opts.maxlength + '"' : "") +
      (opts.disabled ? " disabled" : "") +
      ' aria-invalid="false" aria-describedby="' + describedBy + '" class="' + F().INPUT + pad + '">' +
      suffix + (opts.suffix || isDate ? "" : F().errorIcon()) +
      "</div>" +
      (opts.after || "") +
      (opts.helper ? '<p id="' + id + '-help" class="' + F().HELPER + '">' + esc(opts.helper) + "</p>" : "") +
      errorLine(id) +
      "</div>"
    );
  }

  function textArea(name, label, opts) {
    opts = opts || {};
    var id = "ms-" + name;
    return (
      '<div class="flex min-w-0 flex-col gap-1">' +
      labelRow(id, label, opts) +
      '<textarea id="' + id + '" name="' + esc(name) + '" data-ms-field="' + esc(name) + '" rows="' + (opts.rows || 4) + '"' +
      (opts.maxlength ? ' maxlength="' + opts.maxlength + '"' : "") +
      ' aria-invalid="false" aria-describedby="' + (opts.helper ? id + "-help " : "") + id + '-error" class="' + F().TEXTAREA + ' resize-y">' + esc(val(name)) + "</textarea>" +
      (opts.helper ? '<p id="' + id + '-help" class="' + F().HELPER + '">' + esc(opts.helper) + "</p>" : "") +
      errorLine(id) +
      "</div>"
    );
  }

  function selectField(name, label, options, opts) {
    opts = opts || {};
    var id = "ms-" + name;
    var current = String(val(name));
    var picked = options.filter(function (o) { return o.value === current; })[0];
    return (
      '<div class="flex min-w-0 flex-col gap-1">' +
      labelRow(id, label, opts) +
      '<el-select id="' + id + '-select" name="' + esc(name) + '" data-ms-field="' + esc(name) + '"' + (picked ? ' value="' + esc(current) + '"' : "") + ' class="block">' +
      '<button type="button" id="' + id + '" class="' + SELECT_TRIGGER + '">' +
      '<el-selectedcontent class="col-start-1 row-start-1 flex min-w-0 items-center gap-2 pr-6 text-gray-900 dark:text-white">' +
      (picked ? "" : '<span class="truncate text-gray-400 dark:text-gray-500">' + esc(opts.placeholder || "Select") + "</span>") +
      "</el-selectedcontent>" + ICON.selector + "</button>" +
      '<el-options anchor="bottom start" popover class="' + OPTIONS + '">' +
      options.map(function (o) {
        var flag = o.flag ? '<img src="' + ASSETS + esc(o.flag) + '" alt="" width="20" height="14" class="h-3.5 w-5 shrink-0 rounded-xs ring-1 ring-black/10 dark:ring-white/10" />' : "";
        return '<el-option value="' + esc(o.value) + '" class="' + OPTION + '">' +
          '<span class="flex items-center gap-2">' + flag + '<span class="block truncate font-normal group-aria-selected/option:font-semibold">' + esc(o.label) + "</span></span>" + ICON.checkSelected + "</el-option>";
      }).join("") +
      "</el-options></el-select>" +
      errorLine(id) +
      "</div>"
    );
  }

  /** YES / NO question (Figma "Master Info Logic Group"): text left, two choice pills right. */
  function yesNo(name, question) {
    var qid = "ms-" + name + "-q";
    var current = val(name);
    return (
      '<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">' +
      '<p id="' + qid + '" class="type-label text-default">' + esc(question) + "</p>" +
      '<div role="radiogroup" aria-labelledby="' + qid + '" class="flex shrink-0 gap-4">' + window.SmartEnroll.ui.yesNo({ name: "ms-" + name, value: current, attrs: ' data-ms-field="' + esc(name) + '"' }) + "</div>" +
      "</div>"
    );
  }

  /** Visible only when field === value (data-ms-when). */
  function when(field, value, html, extra) {
    return '<div data-ms-when="' + field + ":" + value + '"' + (val(field) === value || (value === "true" && S.fin.v[field] === true) ? "" : " hidden") +
      ' class="' + (extra || "flex flex-col gap-4") + '">' + html + "</div>";
  }

  function toggleRow(name, title, text) {
    var id = "ms-" + name;
    return (
      '<div class="flex items-start justify-between gap-6 rounded-lg bg-gray-50 p-4 dark:bg-white/5">' +
      '<div class="flex min-w-0 flex-col gap-1"><span id="' + id + '-label" class="type-label text-default">' + esc(title) + "</span>" +
      '<span id="' + id + '-desc" class="type-description text-tertiary">' + esc(text) + "</span></div>" +
      '<div class="' + TOGGLE + '">' +
      '<span class="size-5 rounded-full bg-white shadow-xs ring-1 ring-gray-900/5 transition-transform duration-200 ease-in-out group-has-checked:translate-x-5 motion-reduce:transition-none"></span>' +
      '<input type="checkbox" role="switch" id="' + id + '" name="' + esc(name) + '" data-ms-field="' + esc(name) + '"' + (S.fin.v[name] === true ? " checked" : "") +
      ' aria-labelledby="' + id + '-label" aria-describedby="' + id + '-desc" class="absolute inset-0 size-full cursor-pointer appearance-none focus:outline-hidden disabled:cursor-not-allowed" />' +
      "</div></div>"
    );
  }

  /** "Attach the X" row: text left, T1 File Upload right (mounted after render). */
  function uploadRow(which, key, name, description, opts) {
    opts = opts || {};
    return (
      '<div class="grid grid-cols-1 items-center gap-3 md:grid-cols-2 md:gap-9">' +
      '<div class="flex min-w-0 flex-col gap-1">' +
      '<p id="ms-up-' + esc(key) + '-title" class="type-label-large text-default">Attach the ' + esc(name) + "</p>" +
      (description ? '<p class="type-description text-tertiary">' + esc(description) + "</p>" : "") +
      "</div>" +
      '<div class="flex min-w-0 flex-col gap-1">' +
      '<div data-ms-upload="' + esc(key) + '" data-ms-upload-tab="' + which + '" data-ms-upload-label="' + esc(name) + '"' + (opts.multiple ? " data-ms-multiple" : "") + "></div>" +
      (opts.optional ? '<p class="type-caption text-tertiary">Optional attachment</p>' : "") +
      "</div></div>"
    );
  }

  function sectionHeader(id, title, text, border) {
    return (
      '<div class="flex flex-col gap-1' + (border ? " border-b border-gray-200 pb-4 dark:border-white/10" : "") + '">' +
      '<h2 id="' + id + '" class="type-title-card text-default">' + esc(title) + "</h2>" +
      (text ? '<p class="type-description text-tertiary">' + esc(text) + "</p>" : "") +
      "</div>"
    );
  }

  /* ---------- Financial: Business and Financial Information ---------- */

  function businessInfoHtml() {
    return (
      '<section aria-label="Business and Financial Information" class="' + GRID2 + '">' +
      textField("parentCompany", "Parent Company", { autocomplete: "organization" }) +
      selectField("currency", "Currency", cfg.currencies, { placeholder: "Select currency" }) +
      textField("incorporationDate", "Date of Incorporation", { type: "date" }) +
      selectField("mcc", "Merchant Category Code (MCC Code)", cfg.mccCodes, { optional: true, placeholder: "Select category code" }) +
      textArea("productDescription", "Give us a short business and/or product line description:", { helper: "Provide a short description of your product line, preferably 1 or 2 sentences." }) +
      textArea("revenueSources", "Describe your revenue of funding sources:", { helper: "Provide a short description of your source of funds, preferably 1 or 2 sentences." }) +
      textField("industry", "Industry") +
      textField("employees", "Number of Employees", { inputmode: "numeric", kind: "int" }) +
      textField("salesVolume", "Business Sales Volume/Turnover", { inputmode: "decimal", kind: "money", placeholder: "0.00", suffix: "USD" }) +
      selectField("operatingStatus", "Operating Status", cfg.operatingStatuses, { placeholder: "Select Status" }) +
      // "Merchant Tax ID #" comes from a Figma comment (wiki); its place in the grid is TODO(confirm).
      textField("taxId", "Merchant Tax ID #") +
      "</section>"
    );
  }

  /* ---------- Financial: processor (D-3) ---------- */

  function processorBoxHtml() {
    return (
      '<div class="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg bg-gray-50 p-4 dark:bg-white/5">' +
      '<span class="inline-flex shrink-0 text-blue-600 dark:text-blue-400">' + ICON.card + "</span>" +
      '<div class="flex min-w-0 flex-1 flex-col">' +
      '<span class="type-description text-tertiary">Current option</span>' +
      '<span class="truncate type-label-large text-default" title="' + esc(processorName()) + '">' + esc(processorName()) + "</span>" +
      "</div>" +
      '<div class="flex items-center gap-4">' +
      (isOwn() ? '<button type="button" data-ms-try-recommended class="' + LINK + ' text-sm">Try ' + esc(recommended().name) + "</button>" : "") +
      '<button type="button" data-ms-change class="' + BTN_GRAY_MD + '">Change</button>' +
      "</div></div>"
    );
  }

  function selectorHtml() {
    var r = recommended();
    return (
      '<section aria-labelledby="ms-select-title" class="flex flex-col gap-6">' +
      '<div class="flex flex-col gap-2">' +
      '<h2 id="ms-select-title" class="flex items-center gap-3 type-title-card text-default"><span class="inline-flex text-blue-600 dark:text-blue-400">' + ICON.card + "</span>Select a payments processor</h2>" +
      '<p class="type-description text-tertiary">In order to use merchant services you need to have a payments processor.</p>' +
      "</div>" +
      '<div class="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-9">' +
      '<div class="flex flex-col gap-4 rounded-lg bg-gray-50 p-5 dark:bg-white/5">' +
      '<span class="' + BADGE_BLUE + '">Recommended</span>' +
      '<div class="flex flex-col gap-1">' +
      '<h3 class="type-title-card text-default">Onboard with our payments processor</h3>' +
      '<p class="type-description text-tertiary">Onboard with our preferred provider, <span class="font-semibold text-default">' + esc(r.name) + "</span>.</p>" +
      '<a href="' + esc(r.learnMoreHref) + '" target="_blank" rel="noopener noreferrer" class="' + LINK + ' w-fit text-sm">Learn more ' + ICON.arrowRight + '<span class="sr-only"> about ' + esc(r.name) + " (opens in a new tab)</span></a>" +
      "</div>" +
      '<ul role="list" class="flex flex-col gap-2">' +
      r.benefits.map(function (b) { return '<li class="flex items-center gap-2 type-description text-secondary">' + ICON.check + esc(b) + "</li>"; }).join("") +
      "</ul>" +
      '<button type="button" data-ms-pick-recommended class="' + BTN_PRIMARY_LG + ' w-full">Get started ' + ICON.chevronRight + "</button>" +
      "</div>" +
      '<div class="flex flex-col gap-4 md:p-5">' +
      '<h3 class="type-title-card text-default">Or use your own payments processor</h3>' +
      '<p class="type-description text-tertiary">Please search for your payments processor to ensure compatibility with our platform. If your payment processor is not in the list have any issues or questions, please contact our support team for assistance.</p>' +
      '<label for="ms-processor-search" class="sr-only">Search payments processor</label>' +
      '<el-autocomplete class="relative block">' +
      '<input id="ms-processor-search" type="text" autocomplete="off" placeholder="Search payments processor..." class="' + F().INPUT + ' pr-10" />' +
      '<span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400 dark:text-gray-500">' + ICON.search + "</span>" +
      '<el-options anchor="bottom start" popover class="max-h-60 w-(--input-width) overflow-auto rounded-md bg-white py-1 text-base shadow-lg outline-1 outline-black/5 [--anchor-gap:--spacing(1)] transition transition-discrete data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-100 data-leave:ease-in motion-reduce:transition-none sm:text-sm dark:bg-gray-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10">' +
      cfg.processors.own.map(function (p) {
        return '<el-option value="' + esc(p) + '" class="block cursor-default truncate px-3 py-2 text-gray-900 select-none aria-selected:bg-blue-600 aria-selected:text-white dark:text-white dark:aria-selected:bg-blue-500">' + esc(p) + "</el-option>";
      }).join("") +
      "</el-options></el-autocomplete>" +
      "</div></div></section>"
    );
  }

  /* ---------- Financial: BlueSnap sections ---------- */

  function cardTile(period, card) {
    var name = "card_" + period.id + "_" + card.id;
    return (
      '<label class="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-4 py-4 shadow-xs hover:border-gray-400 group-data-invalid/cards:border-red-300 group-data-invalid/cards:hover:border-red-400 has-checked:border-blue-300 has-checked:bg-blue-50 has-checked:hover:border-blue-400 has-disabled:cursor-not-allowed has-disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:shadow-none dark:hover:border-white/20 dark:group-data-invalid/cards:border-red-400/50 dark:group-data-invalid/cards:hover:border-red-400/70 dark:has-checked:border-blue-400/40 dark:has-checked:bg-blue-400/10 dark:has-checked:hover:border-blue-400/60">' +
      '<span class="flex min-w-0 items-center gap-2">' +
      '<img src="' + ASSETS + esc(card.logo) + '" alt="" width="35" height="24" class="h-6 w-auto shrink-0" />' +
      '<span class="truncate type-label text-default">' + esc(card.label) + "</span></span>" +
      '<input type="checkbox" name="' + name + '" data-ms-field="' + name + '"' + (S.fin.v[name] === true ? " checked" : "") +
      ' aria-label="' + esc(card.label + ", " + period.label) + '" />' +
      "</label>"
    );
  }

  // SE Card Payments error: red tile borders when "Yes" is answered, the user has touched the tiles and none is selected.
  var cardsTouched = false;
  function anyCard() {
    return cfg.cardPeriods.some(function (p) { return cfg.cards.some(function (c) { return S.fin.v["card_" + p.id + "_" + c.id] === true; }); });
  }
  function cardsInvalid() {
    return cardsTouched && !anyCard();
  }
  function syncCards(root) {
    root.querySelectorAll(".group\\/cards").forEach(function (g) { g.toggleAttribute("data-invalid", cardsInvalid()); });
  }

  function processingHtml() {
    var geo = cfg.regions.map(function (r) {
      return textField("geo_" + r.id, r.label, { inputmode: "decimal", kind: "percent", placeholder: "0", prefix: r.flag, suffix: "percent" });
    }).join("");
    var cards = cfg.cardPeriods.map(function (p) {
      return '<fieldset class="flex flex-col gap-2"><legend class="mb-2 type-description text-tertiary">' + esc(p.label) + "</legend>" +
        '<div class="group/cards grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"' + (cardsInvalid() ? " data-invalid" : "") + ">" + cfg.cards.map(function (c) { return cardTile(p, c); }).join("") + "</div></fieldset>";
    }).join("");
    var cardInfo =
      '<p class="type-description text-tertiary">Select and specify what card payments you’ve accepted for each respective periods:</p>' + cards +
      '<div class="border-t border-gray-200 dark:border-white/10"></div>' +
      '<div class="' + GROUP_INNER + '">' + yesNo("breach", "Have you ever experienced a breach with loss of cardholder data?") +
      when("breach", "yes", textArea("breachDescription", "Provide a short description of the incident:", { rows: 3 })) + "</div>" +
      '<div class="' + GROUP_INNER + '">' + yesNo("violation", "Have you ever received a violation notice from Card Networks?") +
      when("violation", "yes", textArea("violationDescription", "Provide a short description of the incident:", { rows: 3 })) + "</div>" +
      '<div class="' + GROUP_INNER + '">' + yesNo("providers", "Do you have any current payment processing service providers?") +
      when("providers", "yes", textArea("providersList", "Please identify Acquiring Banks, Acquiring Processors and/or others", { rows: 3 })) + "</div>" +
      uploadRow("fin", "transactionalFile", "Transactional data file for last 6 months", "Merchant processing statements") +
      '<div class="' + GROUP_INNER + '">' +
      '<p class="type-label text-default">Transactional data for the past 6 months:</p>' +
      '<div class="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">' +
      textField("chargebackHistory", "Chargeback history", { inputmode: "decimal", kind: "percent", placeholder: "0.00", prefix: "percent" }) +
      textField("refundHistory", "Refund history", { inputmode: "decimal", kind: "percent", placeholder: "0.00", prefix: "percent" }) +
      textField("averageTicket", "Average Ticket/Transaction Value", { inputmode: "decimal", kind: "money", placeholder: "0.00", suffix: "USD" }) +
      textField("highestTicket", "Highest Ticket/Transaction Value", { inputmode: "decimal", kind: "money", placeholder: "0.00", suffix: "USD" }) +
      textField("deliveryPeriod", "Delivery period from purchase point") +
      "</div></div>";
    var pci =
      when("pci", "yes", selectField("pciLevel", "PCI compliance level", cfg.pciLevels, { placeholder: "Select level", srLabel: true })) +
      when("pci", "no",
        '<label class="flex w-fit cursor-pointer items-center gap-3 type-label text-default has-disabled:cursor-not-allowed"><input type="checkbox" name="pciSelfCertify" data-ms-field="pciSelfCertify"' + (S.fin.v.pciSelfCertify === true ? " checked" : "") + " />Self certify for PCI Compliance</label>" +
        when("pciSelfCertify", "true", textField("pciDate", "Expected date for certification:", { type: "date" }), "flex max-w-sm flex-col gap-4"));
    return (
      '<section aria-labelledby="ms-processing-title" class="flex flex-col gap-6">' +
      sectionHeader("ms-processing-title", "Processing Information", "In order to process payments we need to make sure we understand your business activity.") +
      '<div class="' + GROUP + '">' + yesNo("regulated", "Is the service you provide a regulated activity?") +
      when("regulated", "yes", uploadRow("fin", "license", "Business or Service License", "Upload as many documents as you need", { multiple: true })) + "</div>" +
      '<div class="flex flex-col gap-3"><p class="type-label text-secondary">How is your business activity or sales geographically distributed? Please indicate % estimates across these regions.</p>' +
      '<div class="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">' + geo + "</div></div>" +
      '<div class="' + GROUP + '">' + yesNo("cardPayments", "Have you accepted card payments in the last 24 months?") + when("cardPayments", "yes", cardInfo) + "</div>" +
      // Label of the level select is not drawn (Figma shows only the selected value): sr-only TODO(confirm).
      '<div class="' + GROUP + '">' + yesNo("pci", "Are you PCI Compliant?") + pci + "</div>" +
      "</section>"
    );
  }

  function yearHtml(y) {
    // Read-only statuses disable the toggle buttons (fieldset): show every year open there.
    var open = !!openYears[y] || SE.isReadOnly();
    var start = yearStart();
    var head = '<span class="type-title-card text-default">Year ' + y + "</span>";
    var picker = "";
    if (y === 1) {
      var thisYear = new Date().getFullYear();
      picker = '<div role="radiogroup" aria-label="First year" class="relative z-10 flex gap-2">' + [thisYear, thisYear + 1].map(function (yr) {
        var current = start;
        return window.SmartEnroll.ui.choicePill({ name: "ms-yearStart", value: yr, text: yr, checked: current === yr, attrs: ' data-ms-field="yearStart"' });
      }).join("") + "</div>";
    } else {
      head += '<span class="type-caption text-tertiary">' + (start + y - 1) + "</span>";
    }
    function f(key, label, kind) {
      var o = kind === "money" ? { inputmode: "decimal", kind: "money", placeholder: "0.00", suffix: "USD" }
        : kind === "percent" ? { inputmode: "decimal", kind: "percent", placeholder: "0", prefix: "percent" }
        : { inputmode: "numeric", kind: "int", placeholder: "0" };
      return textField("y" + y + key, label, o);
    }
    return (
      '<div class="rounded-lg border border-gray-300 bg-gray-50 max-sm:bg-gray-100 dark:border-white/15 dark:bg-white/5">' +
      '<div class="relative flex items-center gap-4 px-4 py-3">' +
      '<div class="flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-2"><span class="flex items-baseline gap-2">' + head + "</span>" + picker + "</div>" +
      '<button type="button" data-ms-year="' + y + '" aria-expanded="' + open + '" aria-controls="ms-year-' + y + '" class="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-gray-500 hover:text-gray-700 after:absolute after:inset-0 after:rounded-lg ' + FOCUS + ' dark:text-gray-400 dark:hover:text-white">' +
      '<span class="sr-only">' + (open ? "Hide" : "Show") + " Year " + y + "</span>" + (open ? ICON.minus : ICON.plus) + "</button>" +
      "</div>" +
      '<div id="ms-year-' + y + '"' + (open ? "" : " hidden") + ' class="grid grid-cols-1 gap-x-9 gap-y-5 px-4 pb-4 md:grid-cols-2">' +
      f("Volume", "Volume", "money") + f("Count", "Count", "int") + f("Average", "Average transaction", "money") + f("Highest", "Highest transaction", "money") +
      f("Refund", "Refund %", "percent") + f("Chargeback", "Chargeback %", "percent") +
      "</div></div>"
    );
  }

  function transactionalHtml() {
    var delays = cfg.delayPeriods.map(function (d) {
      return textField("delay_" + d.id, d.label, { inputmode: "decimal", kind: "percent", placeholder: "0", prefix: "percent" });
    }).join("");
    return (
      '<section aria-labelledby="ms-transactional-title" class="flex flex-col gap-6">' +
      sectionHeader("ms-transactional-title", "Merchant Transactional Data & Reserve Calculation", "Please provide historic data and forecast estimates for your company.", true) +
      textField("volume12", "What is your 12 month volume request?", { inputmode: "decimal", kind: "money", placeholder: "0.00", suffix: "USD" }) +
      '<div class="' + GROUP + '">' +
      '<p class="type-label text-default">Next 3 years estimated transaction requirements</p>' +
      textField("growth", "Percentage growth year-on-year", { inputmode: "decimal", kind: "percent", placeholder: "0.00", prefix: "percent" }) +
      [1, 2, 3].map(yearHtml).join("") +
      "</div>" +
      '<div class="' + GROUP + '">' + yesNo("advanceOrders", "Do you accept orders in advance?") +
      when("advanceOrders", "yes", '<p class="type-description text-tertiary">Indicate in % how much of your sales are delayed payments by these periods (estimated):</p>' +
        '<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">' + delays + "</div>") +
      "</div>" +
      textArea("purchaseProcess", "Briefly explain the purchase process", { helper: "Provide a short description of the purchase process your customer goes through, preferably 200-300 characters." }) +
      '<div class="' + GROUP + '">' + yesNo("subscription", "Do you accept subscription-based payments?") +
      when("subscription", "yes", selectField("subscriptionPeriod", "How often?", cfg.subscriptionPeriods, { placeholder: "Select period" })) + "</div>" +
      '<div class="' + GROUP + '">' + yesNo("termsPublic", "Are customer Terms & Conditions and any other policies (Shipping, Return, Cancellation policies) publicly available on your website?") +
      when("termsPublic", "yes", uploadRow("fin", "termsFile", "T&Cs and policies", "Regarding Shipping, Returns and Cancellations in a single or separate files.")) + "</div>" +
      '<div class="' + GROUP + '">' + yesNo("fraudProgram", "Has your company been placed in any Fraud/Risk Monitoring Program?") + "</div>" +
      '<div class="' + GROUP + '">' + yesNo("terminated", "Previously terminated by a processor/institution due to fraud, laundering, or high chargebacks?") + "</div>" +
      '<div class="' + GROUP + '">' + yesNo("ftcComplaint", "Subject of an FTC/consumer-protection complaint or Assurance of Voluntary Compliance?") + "</div>" +
      "</section>"
    );
  }

  function proofingHtml() {
    return (
      '<section aria-labelledby="ms-proofing-title" class="flex flex-col gap-6">' +
      sectionHeader("ms-proofing-title", "Proofing Documents", "Upload all mandatory documents to complete this section.", true) +
      '<div class="flex flex-col divide-y divide-gray-200 dark:divide-white/10">' +
      cfg.proofingDocuments.map(function (d) {
        return '<div class="py-4 first:pt-0 last:pb-0">' + uploadRow("fin", "doc-" + d.id, d.name, d.description, { optional: d.optional }) + "</div>";
      }).join("") +
      "</div></section>"
    );
  }

  /* ---------- Financial: Authorized Signatory Attestation (D-4) ---------- */

  function radioCard(value, label, bodyHtml, disabled) {
    var att = S.fin.att || {};
    var checked = att.choice === value;
    return (
      '<div class="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-900">' +
      '<label class="' + RADIO_ROW + '">' +
      '<input type="radio" name="ms-signer" value="' + value + '" data-ms-signer' + (checked ? " checked" : "") + (disabled ? " disabled" : "") + ' class="' + RADIO + '">' +
      '<span class="type-label text-default">' + esc(label) + "</span></label>" +
      (checked && bodyHtml ? '<div class="flex flex-col gap-4 border-t border-gray-200 p-4 dark:border-white/10">' + bodyHtml + "</div>" : "") +
      "</div>"
    );
  }

  function termsBodyHtml() {
    var att = S.fin.att || {};
    var reviewed = att.reviewed || {};
    var agreed = att.agreed || {};
    var accepted = !!att.accepted;
    var terms = recommended().terms;
    var rows = terms.map(function (t) {
      var cid = "ms-agree-" + t.id;
      var link = '<a href="' + esc(t.href) + '" target="_blank" rel="noopener noreferrer" data-ms-review="' + t.id + '" class="rounded-sm font-medium text-blue-600 hover:text-blue-700 ' + FOCUS + ' dark:text-blue-400 dark:hover:text-blue-300">' + esc(t.label) + '<span class="sr-only"> (opens in a new tab)</span></a>';
      var text = "Agree and consent to the " + link + " for " + esc(recommended().name) + ".";
      var right = reviewed[t.id]
        ? '<input type="checkbox" id="' + cid + '" data-ms-agree="' + t.id + '"' + (agreed[t.id] ? " checked" : "") + (accepted ? " disabled" : "") + " />"
        : '<a href="' + esc(t.href) + '" target="_blank" rel="noopener noreferrer" data-ms-review="' + t.id + '" class="' + LINK + ' shrink-0 text-xs">Review<span class="sr-only"> the ' + esc(t.label) + " (opens in a new tab)</span></a>";
      return '<li class="flex items-center justify-between gap-3 px-3 py-2.5">' +
        (reviewed[t.id] ? '<label for="' + cid + '" class="type-description text-secondary">' + text + "</label>" : '<p class="type-description text-secondary">' + text + "</p>") +
        right + "</li>";
    }).join("");
    var allAgreed = terms.every(function (t) { return agreed[t.id]; });
    return (
      '<p class="type-description text-tertiary">Please confirm that you consent to the terms and conditions by checking the boxes and signing below.</p>' +
      '<ul role="list" class="divide-y divide-gray-200 rounded-md border border-gray-200 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-white/5">' + rows + "</ul>" +
      (accepted ? "" :
        '<p class="flex gap-1.5 type-caption text-tertiary">' + ICON.info + "Must review Terms and Conditions and Privacy Policy before proceeding to the next step.</p>" +
        '<div class="flex justify-end border-t border-gray-200 pt-4 dark:border-white/10"><button type="button" data-ms-accept class="' + BTN_PRIMARY_MD + '"' + (allAgreed ? "" : " disabled") + ">Accept Terms</button></div>")
    );
  }

  function attestationHtml() {
    var att = S.fin.att || {};
    var lockedYes = att.choice === "yes" && att.accepted;
    var lockedNo = att.choice === "no" && att.request;
    return (
      '<section aria-labelledby="ms-att-title" data-ms-attestation class="flex flex-col gap-6">' +
      sectionHeader("ms-att-title", "Authorized Signatory Attestation", "By signing and consenting to this application, I authorize Transcard and its agents to investigate and access the business and credit information, as well as records of the company, for purposes related to payment initiation and integrated banking services.", true) +
      '<fieldset class="flex max-w-xl flex-col gap-2"><legend class="mb-2 type-label text-default">Are you authorized to sign?</legend>' +
      radioCard("yes", "Yes, I am authorized to sign", termsBodyHtml(), lockedNo) +
      radioCard("no", "No, send to an authorized signer", "", lockedYes) +
      "</fieldset>" +
      (lockedNo
        ? '<div role="status" class="flex max-w-xl gap-2 rounded-md bg-green-50 p-3 dark:bg-green-400/10">' + ICON.checkCircle +
          '<div class="flex min-w-0 flex-col gap-1 text-green-700 dark:text-green-300"><p class="type-label">Request sent to an authorized signer</p>' +
          "<p class=\"type-body\">We'll let you know when they accept the terms. You can continue with your application in the meantime.</p></div></div>"
        : "") +
      "</section>"
    );
  }

  /* ---------- Financial: own processor (D-3 "use your own") ---------- */

  function ownHtml() {
    var v = S.fin.v;
    var accounts = cfg.bankAccounts || [];
    var bankOptions = accounts.map(function (a) {
      return '<el-option value="' + esc(a.id) + '" class="group/option block cursor-default border-b border-gray-200 px-4 py-3 select-none last:border-b-0 hover:bg-gray-50 focus:bg-gray-50 focus:outline-hidden aria-selected:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5 dark:focus:bg-white/5 dark:aria-selected:bg-white/5">' +
        '<div class="flex items-start gap-3 in-[el-selectedcontent]:hidden">' + ICON.bank +
        '<span class="flex min-w-0 flex-col gap-1"><span class="truncate text-sm/5 font-semibold text-gray-900 dark:text-white">' + esc(a.name) + "</span>" +
        '<span class="text-sm/5 text-gray-500 dark:text-gray-400">' + esc(a.bank) + " ••••" + esc(a.last4) + "</span></span></div>" +
        '<span class="hidden min-w-0 items-center gap-2 in-[el-selectedcontent]:flex">' + ICON.bank + '<span class="truncate">' + esc(a.name) + " ••••" + esc(a.last4) + "</span></span>" +
        "</el-option>";
    }).join("");
    var bank = accounts.length
      ? '<div class="flex flex-col gap-1"><label for="ms-bankAccount" class="' + F().LABEL + '">Bank Account</label>' +
        '<el-select name="bankAccount" data-ms-field="bankAccount"' + (v.bankAccount ? ' value="' + esc(v.bankAccount) + '"' : "") + ' class="block">' +
        '<button type="button" id="ms-bankAccount" class="' + SELECT_TRIGGER + '"><el-selectedcontent class="col-start-1 row-start-1 flex min-w-0 items-center gap-2 pr-6 text-gray-900 dark:text-white">' +
        (v.bankAccount ? "" : '<span class="truncate text-gray-400 dark:text-gray-500">Select bank account</span>') + "</el-selectedcontent>" + ICON.selector + "</button>" +
        '<el-options anchor="bottom start" popover class="' + OPTIONS.replace("py-1 ", "") + '">' + bankOptions + "</el-options></el-select></div>"
      : '<p class="type-description text-tertiary">You don\'t have any bank account connectors set up. Start adding one by clicking <button type="button" data-ms-connect class="' + LINK + ' text-sm">Connect ' + ICON.arrowRight + "</button></p>";
    var settlementEditable = v.settlementEdit === true;
    return (
      '<section aria-labelledby="ms-own-processing-title" class="flex flex-col gap-6">' +
      sectionHeader("ms-own-processing-title", "Processing Information", "In order to process payments we need to make sure we understand your business activity.") +
      // Figma draws an (i) next to most labels; the tooltip copy is lorem ipsum: TODO(confirm), not shipped.
      '<div class="' + GRID2 + '">' +
      textField("ownMcc", "MCC Code", { inputmode: "numeric", kind: "int", placeholder: "4215" }) +
      '<div class="flex min-w-0 flex-col gap-1">' + labelRow("ms-settlementPlatform", "Settlement Platform") +
      '<div class="flex">' +
      '<input id="ms-settlementPlatform" name="settlementPlatform" data-ms-field="settlementPlatform" type="text" autocomplete="off" value="' + esc(has("settlementPlatform") ? val("settlementPlatform") : cfg.processors.settlementPlatform) + '"' +
      (settlementEditable ? "" : " disabled") + ' class="' + F().INPUT + ' rounded-r-none">' +
      '<button type="button" data-ms-settlement-edit' + (settlementEditable ? " hidden" : "") + ' class="-ml-px inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-r-md bg-white px-3 type-button text-gray-900 inset-ring inset-ring-gray-300 hover:bg-gray-50 ' + FOCUS + ' disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10 dark:text-white dark:inset-ring-white/10 dark:hover:bg-white/20">' +
      ICON.pencil + 'Edit<span class="sr-only"> Settlement Platform</span></button>' +
      "</div></div>" +
      textField("ownMaxMonthly", "The Maximum Monthly Amount", { inputmode: "decimal", kind: "money", placeholder: "10500.00" }) +
      textField("ownMerchantNumber", "Merchant Number", { inputmode: "numeric", placeholder: "4215" }) +
      textField("ownAccountNumber", "Account Number", { inputmode: "numeric" }) +
      textField("ownSortCode", "Sort Code") +
      textField("ownDescription", "Processor Description", { placeholder: "Vantiv Processor" }) +
      toggleRow("duplicateChecking", "Duplicate Checking", "Valid values: true or false. Duplicate checking prevents the merchant from running the same transaction twice within a period of time. The amount of time is controlled by the duplicate_checking_seconds field.") +
      textField("duplicateSeconds", "Duplicate Check Time (in seconds)", { inputmode: "numeric", kind: "int", placeholder: "900" }) +
      selectField("ownIndustry", "Default Industry Classification", cfg.industryClassifications, { placeholder: "Select classification" }) +
      toggleRow("duplicateOverride", "Duplicate Checking Override", "Valid values: true or false. If set to true, the merchant can choose to ignore the duplicate check on a per-transaction basis using a checkbox in the Virtual Terminal or an API parameter.") +
      "</div></section>" +
      '<section aria-labelledby="ms-msd-title" class="flex flex-col gap-6">' +
      sectionHeader("ms-msd-title", "Merchant Service Details", "This will be used to contact you and notify of onboarding progress, approval or request for additional requirements, if necessary.", true) +
      '<div class="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-9">' +
      '<div class="flex flex-col gap-1"><h3 class="type-title-card text-default">Contact Information</h3><p class="type-description text-tertiary">Primary contact person for your merchant service account.</p></div>' +
      '<div class="flex flex-col gap-5"><div class="grid grid-cols-1 gap-4 sm:grid-cols-2">' +
      textField("contactFirst", "First name", { autocomplete: "given-name" }) + textField("contactLast", "Last Name", { autocomplete: "family-name" }) + "</div>" +
      textField("contactPhone", "Merchant Services Point of Contact Phone Number", { type: "tel", autocomplete: "tel", placeholder: "000-00-00000", prefix: "phone" }) +
      textField("contactEmail", "Merchant Services Point of Contact Email Address", { type: "email", autocomplete: "email", placeholder: "example@mail.com", prefix: "envelope" }) +
      "</div></div></section>" +
      '<section aria-labelledby="ms-payment-title" class="grid grid-cols-1 gap-6 border-t border-gray-200 pt-6 md:grid-cols-2 md:gap-9 dark:border-white/10">' +
      '<div class="flex flex-col gap-1"><h2 id="ms-payment-title" class="type-title-card text-default">Payment Details</h2><p class="type-description text-tertiary">Payment details related to your account, including fee details and features such as capturing more than was pre-authorized and allowing payment facilitator fields</p></div>' +
      '<div class="flex flex-col gap-4">' +
      '<fieldset class="flex flex-col gap-2"><legend class="mb-2 type-label text-default">Account type</legend>' +
      accountTypeCard("existing", "Use one of existing bank accounts as a settlement account for merchant services.", bank) +
      accountTypeCard("new", "Set up new settlement account for merchant services.", textField("abaNumber", "ABA Number / Routing Number", { inputmode: "numeric", kind: "int", maxlength: 9 })) +
      "</fieldset>" +
      toggleRow("captureMore", "Capture more than was Pre-Authorized", "Allows capturing an amount greater than the initial pre-authorized payment.") +
      "</div></section>" +
      '<div class="border-t border-gray-200 pt-6 dark:border-white/10">' +
      // Figma reuses the T&Cs description here ("Regarding Shipping, Returns…"): kept as drawn, TODO(confirm).
      uploadRow("fin", "varSheet", "VAR Sheet", "Regarding Shipping, Returns and Cancellations in a single or separate files.") +
      "</div>"
    );
  }

  function accountTypeCard(value, label, bodyHtml) {
    var checked = S.fin.v.accountType === value;
    return (
      '<div class="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-900">' +
      '<label class="' + RADIO_ROW + '">' +
      '<input type="radio" name="ms-accountType" value="' + value + '" data-ms-field="accountType"' + (checked ? " checked" : "") + ' class="' + RADIO + '">' +
      '<span class="type-label text-default">' + esc(label) + "</span></label>" +
      '<div data-ms-when="accountType:' + value + '"' + (checked ? "" : " hidden") + ' class="flex flex-col gap-4 border-t border-gray-200 p-4 dark:border-white/10">' + bodyHtml + "</div>" +
      "</div>"
    );
  }

  /* ---------- Financial: render ---------- */

  function finHtml() {
    var parts = [businessInfoHtml(), '<div class="border-t border-gray-200 dark:border-white/10"></div>'];
    if (S.fin.selecting) {
      parts.push(selectorHtml());
    } else {
      parts.push(processorBoxHtml());
      if (isOwn()) parts.push(ownHtml());
      else parts.push(processingHtml(), transactionalHtml(), proofingHtml(), attestationHtml());
    }
    return '<div data-ms-root="fin" class="flex flex-col gap-8">' + parts.join("") + "</div>";
  }

  var rendering = false;
  function renderFin(focusSelector) {
    var root = roots.fin;
    // Replacing the markup blurs a focused field, which can fire `change` and ask for another render.
    if (!root || !root.isConnected || rendering) return;
    rendering = true;
    destroyUploads("fin");
    var active = document.activeElement && root.contains(document.activeElement) ? document.activeElement.id : null;
    root.innerHTML = finHtml();
    mountUploads("fin", root);
    bindSelects(root);
    var target = focusSelector ? root.querySelector(focusSelector) : active ? document.getElementById(active) : null;
    rendering = false;
    if (target) target.focus({ preventScroll: !focusSelector });
  }

  function renderAttestation() {
    var root = roots.fin;
    var section = root && root.querySelector("[data-ms-attestation]");
    if (!section) return;
    var wrap = document.createElement("div");
    wrap.innerHTML = attestationHtml();
    section.replaceWith(wrap.firstElementChild);
  }

  /* ---------- Business Plan ---------- */

  function bpHtml() {
    var bp = cfg.businessPlan;
    var missing = !hasFiles("bp", "businessPlan");
    return (
      '<div data-ms-root="bp" class="flex flex-col gap-6">' +
      '<div data-ms-bp-warning' + (missing ? "" : " hidden") + ' class="flex gap-3 rounded-r-md border-l-4 border-amber-400 bg-amber-50 py-4 pr-4 pl-6 dark:border-amber-500 dark:bg-amber-500/10">' +
      ICON.warningMini + '<p class="type-label text-amber-800 dark:text-amber-300">Business Plan is required.</p></div>' +
      '<div class="rounded-lg bg-gray-50 p-4 sm:p-6 dark:bg-white/5">' + uploadRow("bp", "businessPlan", "Business Plan", bp.hint) + "</div>" +
      '<div class="flex flex-col gap-4 rounded-lg bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-6 dark:bg-white/5">' +
      '<div class="flex min-w-0 flex-col gap-1"><h2 class="type-title-card text-default">Need help with your business plan?</h2>' +
      '<p class="type-description text-tertiary">Answer some simple questions to create a lean business plan</p></div>' +
      // TODO(confirm): what Get Started Now opens is not drawn (wiki); prototype shows a "Coming soon" toast.
      '<button type="button" data-ms-bp-start class="' + BTN_PRIMARY_XL.replace("hover:bg-blue-500", "hover:bg-blue-700") + ' shrink-0 sm:w-78 sm:justify-between">Get Started Now ' + ICON.chevronRight + "</button>" +
      "</div></div>"
    );
  }

  function renderBp() {
    var root = roots.bp;
    if (!root || !root.isConnected) return;
    destroyUploads("bp");
    root.innerHTML = bpHtml();
    mountUploads("bp", root);
  }

  /* ---------- uploads (T1 File Upload) ---------- */

  function destroyUploads(which) {
    Object.keys(uploads[which]).forEach(function (k) { uploads[which][k].destroy(); });
    uploads[which] = {};
  }

  function mountUploads(which, root) {
    if (!window.FileUpload) return;
    var up = cfg.upload;
    root.querySelectorAll("[data-ms-upload]").forEach(function (el) {
      var key = el.getAttribute("data-ms-upload");
      var isBp = which === "bp";
      uploads[which][key] = window.FileUpload.mount(el, {
        id: "ms-up-" + key,
        name: key,
        label: el.getAttribute("data-ms-upload-label"),
        accept: isBp ? cfg.businessPlan.accept : up.accept,
        acceptLabel: isBp ? cfg.businessPlan.acceptLabel : up.acceptLabel,
        maxSizeMb: up.maxSizeMb,
        // Only the Business or Service License takes several files in R1.
        multiple: el.hasAttribute("data-ms-multiple"),
        disabled: SE.isReadOnly(),
        files: (S[which].files || {})[key] || [],
        onChange: function (files) {
          S[which].files[key] = files;
          save(which);
          if (isBp) {
            var warn = root.querySelector("[data-ms-bp-warning]");
            if (warn) warn.hidden = files.length > 0;
          }
          pushProgress();
        },
      });
    });
  }

  /* ---------- events ---------- */

  function applyWhen(root) {
    root.querySelectorAll("[data-ms-when]").forEach(function (el) {
      var parts = el.getAttribute("data-ms-when").split(":");
      var x = S.fin.v[parts[0]];
      el.hidden = !(String(x) === parts[1]);
    });
  }

  function clean(kind, raw) {
    var s = String(raw);
    if (kind === "int") return s.replace(/[^\d]/g, "");
    if (kind === "date") {
      var d = s.replace(/\D/g, "").slice(0, 8);
      return d.length > 4 ? d.slice(0, 2) + "-" + d.slice(2, 4) + "-" + d.slice(4) : d.length > 2 ? d.slice(0, 2) + "-" + d.slice(2) : d;
    }
    if (kind === "money" || kind === "percent") {
      s = s.replace(/[^\d.]/g, "");
      var i = s.indexOf(".");
      if (i !== -1) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, "");
      return s;
    }
    return s;
  }

  function formatOnBlur(input) {
    var kind = input.getAttribute("data-ms-kind");
    var raw = input.value.replace(/,/g, "");
    if (!raw || isNaN(Number(raw))) return;
    var n = Number(raw);
    if (kind === "percent") input.value = String(Math.min(100, n));
    if (kind === "money") input.value = n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function setField(name, value, root) {
    S.fin.v[name] = value;
    save("fin");
    if (root) applyWhen(root);
    pushProgress();
  }

  function bindSelects(root) {
    // el-select fires `change` on the element itself; listen per element (bubbling is not guaranteed).
    root.querySelectorAll("el-select[data-ms-field]").forEach(function (sel) {
      sel.addEventListener("change", function () {
        setField(sel.getAttribute("data-ms-field"), sel.value, root);
      });
    });
    var search = root.querySelector("#ms-processor-search");
    if (search) {
      var pick = function () {
        var name = search.value.trim();
        if (S.fin.selecting && !rendering && cfg.processors.own.indexOf(name) !== -1) chooseProcessor(name);
      };
      search.addEventListener("change", pick);
      search.addEventListener("input", function () { if (cfg.processors.own.indexOf(search.value) !== -1) setTimeout(pick, 0); });
    }
  }

  function bindFin(root) {
    root.addEventListener("input", function (e) {
      var t = e.target;
      var name = t.getAttribute && t.getAttribute("data-ms-field");
      if (!name || t.type === "radio" || t.type === "checkbox") return;
      var kind = t.getAttribute("data-ms-kind");
      if (kind) {
        var cleaned = clean(kind, t.value);
        if (cleaned !== t.value.replace(/,/g, "")) t.value = cleaned;
      }
      if (t.id === "ms-contactEmail" && t.getAttribute("aria-invalid") === "true") checkEmail(t);
      if (kind === "date" && t.getAttribute("aria-invalid") === "true") checkDate(t);
      setField(name, t.value, null);
    });
    root.addEventListener("change", function (e) {
      var t = e.target;
      if (t.matches && t.matches("[data-ms-signer]")) { onSignerChoice(t.value); return; }
      if (t.matches && t.matches("[data-ms-agree]")) {
        var att = S.fin.att;
        att.agreed = att.agreed || {};
        att.agreed[t.getAttribute("data-ms-agree")] = t.checked;
        save("fin");
        var btn = root.querySelector("[data-ms-accept]");
        if (btn) btn.disabled = !recommended().terms.every(function (x) { return att.agreed[x.id]; });
        return;
      }
      var name = t.getAttribute && t.getAttribute("data-ms-field");
      if (!name || t.tagName === "EL-SELECT") return;
      if (t.type === "checkbox") {
        setField(name, t.checked, root);
        if (name.indexOf("card_") === 0) { cardsTouched = true; syncCards(root); }
      }
      else if (t.type === "radio") {
        setField(name, t.value, root);
        if (name === "yearStart") renderFin();
      } else if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") {
        if (t.getAttribute("data-ms-kind")) {
          formatOnBlur(t);
          S.fin.v[name] = t.value;
          save("fin");
        }
      }
    });
    root.addEventListener("focusout", function (e) {
      if (e.target.id === "ms-contactEmail") checkEmail(e.target);
      if (e.target.getAttribute && e.target.getAttribute("data-ms-kind") === "date") checkDate(e.target);
    });
    root.addEventListener("click", function (e) {
      var t = e.target;
      if (!t.closest) return;
      var el;
      if (t.closest("[data-ms-change]")) { confirmSwitch(null, t.closest("[data-ms-change]")); return; }
      if (t.closest("[data-ms-try-recommended]")) { confirmSwitch("bluesnap", t.closest("[data-ms-try-recommended]")); return; }
      if (t.closest("[data-ms-pick-recommended]")) { chooseProcessor("bluesnap"); return; }
      if ((el = t.closest("[data-ms-year]"))) {
        var y = Number(el.getAttribute("data-ms-year"));
        openYears[y] = !openYears[y];
        renderFin('[data-ms-year="' + y + '"]');
        return;
      }
      if ((el = t.closest("[data-ms-review]"))) {
        // The link opens the document in a new tab (default action); mark it reviewed so its checkbox appears.
        var id = el.getAttribute("data-ms-review");
        var att = S.fin.att;
        if (SE.isReadOnly()) return;
        att.reviewed = att.reviewed || {};
        if (!att.reviewed[id]) {
          att.reviewed[id] = true;
          save("fin");
          setTimeout(function () {
            renderAttestation();
            var box = document.getElementById("ms-agree-" + id);
            if (box) box.focus();
          }, 0);
        }
        return;
      }
      if (t.closest("[data-ms-accept]")) { acceptTerms(); return; }
      if (t.closest("[data-ms-settlement-edit]")) {
        S.fin.v.settlementEdit = true;
        save("fin");
        var input = root.querySelector("#ms-settlementPlatform");
        t.closest("[data-ms-settlement-edit]").hidden = true;
        input.disabled = false;
        input.focus();
        return;
      }
      if (t.closest("[data-ms-connect]")) { SE.goToTab("connectors"); return; }
    });
  }

  function checkDate(input) {
    var v = input.value.trim();
    var m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(v);
    var d = m && new Date(+m[3], +m[1] - 1, +m[2]);
    var real = !!m && d.getMonth() === +m[1] - 1 && d.getDate() === +m[2] && +m[3] > 1900;
    var past = input.id !== "ms-incorporationDate" || (real && d < new Date());
    var msg = v && !(real && past) ? "Enter a valid date (mm-dd-yyyy)." : ""; // TODO(confirm): copy
    F().setError(input, !!msg, document.getElementById(input.id + "-error"), msg);
    return !msg;
  }

  function checkEmail(input) {
    var v = input.value.trim();
    var msg = v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "Enter a valid email address" : "";
    F().setError(input, !!msg, document.getElementById(input.id + "-error"), msg);
    return !msg;
  }

  /* ---------- processor switch (D-3) ---------- */

  function confirmSwitch(target, trigger) {
    if (!window.OBModal) { switchProcessor(target); return; }
    if (trigger) trigger.focus();
    window.OBModal.open(
      '<div class="flex flex-col items-center gap-6 px-6 pb-6">' +
      '<span class="inline-flex size-11 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/10">' + ICON.warning + "</span>" +
      '<div class="flex w-full flex-col gap-2 text-center">' +
      '<h2 id="ms-discard-title" class="type-title-modal text-default">Information will be discarded</h2>' +
      '<p class="type-description text-tertiary">Changing payment processor will discard all information from Merchant Service tab! Are you sure you want to do this?</p>' +
      "</div></div>",
      "ms-discard-title",
      {
        footer:
          '<div class="flex flex-col gap-3 px-6 pb-6">' +
          '<button type="button" data-ms-discard-confirm class="' + BTN_PRIMARY_XL + ' w-full">Change</button>' +
          '<button type="button" data-ob-modal-close class="' + BTN_SECONDARY_XL + '">Cancel</button>' +
          "</div>",
      }
    );
    var btn = document.querySelector("[data-ms-discard-confirm]");
    if (btn) {
      btn.addEventListener("click", function () {
        window.OBModal.close();
        switchProcessor(target);
      });
    }
  }

  /** Discards the Financial tab (D-3) and shows the picker, or goes straight to `target`. */
  function switchProcessor(target) {
    S.fin = blankFin();
    openYears = { 1: true, 2: false, 3: false };
    if (target) S.fin.processor = target;
    else S.fin.selecting = true;
    save("fin");
    renderFin(target ? "[data-ms-change]" : "#ms-processor-search");
    pushProgress();
  }

  function chooseProcessor(name) {
    S.fin.selecting = false;
    S.fin.processor = name;
    save("fin");
    renderFin("[data-ms-change]");
    pushProgress();
  }

  /* ---------- attestation (D-4) ---------- */

  function onSignerChoice(value) {
    var att = S.fin.att;
    if (value === "yes") {
      att.choice = "yes";
      save("fin");
      renderAttestation();
      var r = roots.fin.querySelector('[data-ms-signer][value="yes"]');
      if (r) r.focus();
      pushProgress();
      return;
    }
    openSignerModal();
  }

  function acceptTerms() {
    var att = S.fin.att;
    var a = (base && base.applicant) || {};
    // Stored with timestamp and signer name (Figma comment); not shown on screen (not drawn).
    att.accepted = { at: new Date().toISOString(), by: [a.firstName, a.lastName].filter(Boolean).join(" ") };
    save("fin");
    renderAttestation();
    var r = roots.fin.querySelector('[data-ms-signer][value="yes"]');
    if (r) r.focus();
    pushProgress();
  }

  function signerField(id, label, type, autocomplete) {
    return (
      '<div class="flex flex-col gap-1">' +
      '<label for="' + id + '" class="' + F().LABEL + '">' + label + "</label>" +
      '<div class="relative"><input id="' + id + '" type="' + type + '" autocomplete="' + autocomplete + '" aria-invalid="false" aria-describedby="' + id + '-error" class="' + F().INPUT + '">' + F().errorIcon() + "</div>" +
      errorLine(id) + "</div>"
    );
  }

  function openSignerModal() {
    var M = window.OBModal;
    var sent = false;
    var radioNo = roots.fin.querySelector('[data-ms-signer][value="no"]');
    if (radioNo) radioNo.focus();
    var backdrop = M.open(
      '<form id="ms-signer-form" novalidate class="flex flex-col gap-4 px-6 py-5">' +
      signerField("ms-signer-first", "First Name", "text", "off") +
      signerField("ms-signer-last", "Last Name", "text", "off") +
      signerField("ms-signer-email", "Email", "email", "off") +
      '<div class="flex flex-col gap-1"><label for="ms-signer-note" class="' + F().LABEL + '">Note</label>' +
      '<textarea id="ms-signer-note" rows="2" maxlength="100" aria-describedby="ms-signer-note-help" class="' + F().TEXTAREA + ' resize-y"></textarea>' +
      '<p id="ms-signer-note-help" class="' + F().HELPER + '">Maximum 100 characters</p></div>' +
      "</form>",
      "ms-signer-title",
      {
        bare: true,
        panelClass: "relative flex w-full max-w-sm flex-col rounded-lg bg-white shadow-xl dark:bg-gray-900 dark:ring-1 dark:ring-white/10",
        header:
          '<div class="flex items-center justify-between gap-4 border-b border-gray-200 py-3 pr-4 pl-6 dark:border-white/10">' +
          '<h2 id="ms-signer-title" class="type-title-modal text-default">Send to an authorized signatory</h2>' + M.closeButton("data-ob-modal-close") + "</div>",
        footer:
          '<div class="flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-white/10">' +
          '<button type="button" data-ob-modal-close class="' + BTN_SECONDARY_LG + '">Cancel</button>' +
          '<button type="submit" form="ms-signer-form" data-ms-signer-send class="' + BTN_PRIMARY_LG + '">Send</button>' +
          "</div>",
      }
    );
    var form = backdrop.querySelector("#ms-signer-form");
    var first = form.querySelector("#ms-signer-first");
    var last = form.querySelector("#ms-signer-last");
    var email = form.querySelector("#ms-signer-email");
    var note = form.querySelector("#ms-signer-note");
    var send = backdrop.querySelector("[data-ms-signer-send]");
    function err(input, msg) {
      F().setError(input, !!msg, document.getElementById(input.id + "-error"), msg);
      return !msg;
    }
    function required(input, label) {
      return err(input, input.value.trim() ? "" : label + " is required");
    }
    function mail() {
      var v = email.value.trim();
      return err(email, !v ? "Email is required" : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "" : "Enter a valid email address");
    }
    first.addEventListener("blur", function () { required(first, "First Name"); });
    last.addEventListener("blur", function () { required(last, "Last Name"); });
    email.addEventListener("blur", mail);
    [first, last, email].forEach(function (input) {
      input.addEventListener("input", function () {
        if (input.getAttribute("aria-invalid") !== "true") return;
        if (input === email) mail();
        else required(input, input === first ? "First Name" : "Last Name");
      });
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = [required(first, "First Name"), required(last, "Last Name"), mail()];
      if (ok.indexOf(false) !== -1) {
        var bad = [first, last, email].filter(function (i) { return i.getAttribute("aria-invalid") === "true"; })[0];
        if (bad) M.revealField(bad, document.getElementById(bad.id + "-error"));
        return;
      }
      backdrop.setAttribute("data-busy", "");
      send.disabled = true;
      send.innerHTML = ICON.spinner + "Sending…";
      setTimeout(function () {
        sent = true;
        S.fin.att = {
          choice: "no",
          request: { firstName: first.value.trim(), lastName: last.value.trim(), email: email.value.trim(), note: note.value.trim(), sentAt: new Date().toISOString() },
        };
        save("fin");
        backdrop.removeAttribute("data-busy");
        M.close();
      }, 900);
    });
    setTimeout(function () { first.focus(); }, 50);
    // OBModal has no close callback: watch for the dialog leaving the page, then sync the radios with the state
    // (cancel puts the previous choice back; send shows the sent box).
    var observer = new MutationObserver(function () {
      if (backdrop.isConnected && !backdrop.hasAttribute("data-leave") && !backdrop.querySelector("[data-ob-modal-dialog][data-leave]")) return;
      observer.disconnect();
      renderAttestation();
      var r = roots.fin.querySelector('[data-ms-signer][value="' + (sent ? "no" : S.fin.att.choice || "no") + '"]') || roots.fin.querySelector("[data-ms-signer]");
      if (r) r.focus();
      if (sent) pushProgress();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-leave"] });
  }

  /* ---------- tab renderers ---------- */

  function whenReady(fn) {
    return function (el, ctx) {
      if (cfg) { fn(el, ctx); return; }
      el.innerHTML = '<p class="type-description text-tertiary" role="status">Loading…</p>';
      loaded.then(function () { if (el.isConnected) fn(el, ctx); });
    };
  }

  function renderFinTab(el) {
    roots.fin = el;
    if (!el.hasAttribute("data-ms-bound")) {
      el.setAttribute("data-ms-bound", "");
      bindFin(el);
    }
    renderFin();
    pushProgress();
  }

  function renderBpTab(el) {
    roots.bp = el;
    if (!el.hasAttribute("data-ms-bound")) {
      el.setAttribute("data-ms-bound", "");
      el.addEventListener("click", function (e) {
        if (e.target.closest && e.target.closest("[data-ms-bp-start]")) toast("Coming soon.", "info");
      });
    }
    renderBp();
    pushProgress();
  }

  var loaded = Promise.all([SE.ready, window.DataSource.load(DATA_PATH)]).then(function (res) {
    base = res[0];
    cfg = res[1];
    restore();
    seedDemo();
    pushProgress();
  }).catch(function (err) {
    console.error("SMART Enroll Merchant Services: could not load data", err);
  });

  SE.registerTab(FIN, whenReady(renderFinTab));
  SE.registerTab(BP, whenReady(renderBpTab));

  SE.on("addon-change", function (d) {
    if (d.addon !== ADDON) return;
    if (d.added) {
      restore();
      seedDemo();
      pushProgress();
    }
  });

  // Removing the add-on discards both tabs (shell drops the storage + panels); forget the copy here too.
  SE.on("addon-discard", function (d) {
    if (d.addon !== ADDON) return;
    destroyUploads("fin");
    destroyUploads("bp");
    S.fin = blankFin();
    S.bp = blankBp();
    roots = {};
    openYears = { 1: true, 2: false, 3: false };
  });

  SE.on("readonly-change", function (d) {
    ["fin", "bp"].forEach(function (w) {
      Object.keys(uploads[w]).forEach(function (k) { uploads[w][k].setDisabled(d.readOnly); });
    });
    if (cfg && roots.fin && roots.fin.isConnected) renderFin();
  });
})();

/**
 * smart-enroll/connectors.js
 * SMART Enroll — Connectors tab (TCDM-5246, T6). Fills the `connectors` slot of the shell via
 * SmartEnroll.registerTab. Spec: wiki/products/smart-enroll/flows/connectors.md (D-13).
 * Figma [R1] SMART Enroll jLooCmHwqJcYV5p5d8BHnO: initial 28511:32098 · ERP 28513:33218 · Batch 28555:37865 ·
 * API 28555:38922 · Bank Account 28555:40542. Data: src/data/smart-enroll-connectors.json (all values invented).
 *
 * Needs on the page (before this script): shell.js (SmartEnroll), data-source.js, onboarding-modal.js (OBModal:
 * every dialog + copy buttons), onboarding-field.js (OBField inputs), file-upload.js (treasury credentials),
 * shared.js (showGlobalTopToast, data-tooltip), @tailwindplus/elements (el-select, el-dropdown).
 *
 * What it does
 *   Data Source Preferences: ERP/Accounting Software | Batch Data Upload | API Connection, one at a time
 *   ("Current connection"). Switching asks "Information will be lost" and discards the old one.
 *   ERP: explainer → section with Connect → 3-step dialog (provider → sign in → Pending Verification,
 *   Validate Connection) → "Your ERP/Software accounts" table (Refresh connection, View Details).
 *   Batch: explainer only. API: explainer → "API Keys and Credentials" (View Details with copy buttons,
 *   Generate New Client Secret, Disconnect).
 *   Bank Account: Connect → Who do you bank with? → Sign In (2 steps) → Name Your Bank Account (Skip) →
 *   Please wait → "Your Bank Accounts" table. A skipped name = "Action Required" until it is named.
 *   Everything is simulated; state lives in sessionStorage (SmartEnroll.storageKey('connectors')).
 *
 * API (window.SmartEnrollConnectors) — for T9 (FX provider) and T11 (Submit):
 *   ready                 Promise, resolves after the data loaded
 *   isComplete()          true when a data source is selected AND one bank account is Connected (D-13).
 *                         Not required to submit: T11 shows `incompleteMessage()` as a warning only.
 *   incompleteMessage()   warning text for the Submit modal (null when complete)
 *   getState()            copy of { source, erp, api, banks }
 *   fxSlot()              the `<div data-se-fx-slot hidden>` under Bank Account (null before the tab rendered)
 * Events (document CustomEvents, same `smart-enroll:` prefix as the shell):
 *   smart-enroll:connectors-rendered  { slot, root }   after every draw of the tab: T9 fills `slot` (and
 *                                     removes `hidden`); the slot element is re-created on each draw.
 *   smart-enroll:connectors-change    { complete, source, bankConnected }   after every state change.
 * Progress: setProgress('connectors', { required: 2, filled }) — 1 for a data source, 1 for a Connected bank.
 */
window.SmartEnrollConnectors = (function () {
  "use strict";

  var DATA_PATH = "../../data/smart-enroll-connectors.json";
  var TAB = "connectors";
  var SE = window.SmartEnroll;
  var M = function () { return window.OBModal; };
  var F = function () { return window.OBField; };

  var data = null;
  var root = null;
  var state = { source: null, view: "choices", erp: null, api: null, banks: [] };
  var resolveReady;
  var ready = new Promise(function (r) { resolveReady = r; });

  /* ---------- classes (components skill + shell.js; SMART System button sizes) ---------- */

  var FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400";
  var PRIMARY =
    "inline-flex cursor-pointer items-center justify-center gap-1.5 bg-blue-600 font-semibold text-white shadow-xs hover:bg-blue-500 " + FOCUS +
    " disabled:cursor-not-allowed disabled:bg-blue-300 dark:bg-blue-500 dark:shadow-none dark:hover:bg-blue-400 dark:disabled:bg-blue-500/40 dark:disabled:text-white/60";
  var SECONDARY =
    "inline-flex cursor-pointer items-center justify-center gap-1.5 bg-white font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 " + FOCUS +
    " disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/20";
  var DANGER =
    "inline-flex cursor-pointer items-center justify-center gap-1.5 bg-red-600 font-semibold text-white shadow-xs hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 dark:bg-red-500 dark:shadow-none dark:hover:bg-red-400 dark:focus-visible:outline-red-400";
  // Sizes (SMART System): sm 28 · md 32 · lg 40 · xl 44.
  var SM = " rounded px-2 py-1 text-sm";
  var MD = " rounded-md px-2.5 py-1.5 text-sm";
  var LG = " rounded-md px-3 py-2 text-base";
  var XL = " rounded-md px-3.5 py-2.5 text-base";
  var BTN = {
    primaryMd: PRIMARY + MD, primaryLg: PRIMARY + LG, primaryXl: PRIMARY + XL,
    secondarySm: SECONDARY + SM, secondaryMd: SECONDARY + MD, secondaryXl: SECONDARY + XL,
    dangerMd: DANGER + MD, dangerXl: DANGER + XL,
  };
  // Soft (Figma "+ Add" on Your Bank Accounts): blue-50 fill, blue text, md.
  var BTN_SOFT_MD =
    "inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-100 " + FOCUS +
    " dark:bg-blue-400/10 dark:text-blue-400 dark:hover:bg-blue-400/20";
  var LINK = "inline-flex cursor-pointer items-center gap-1.5 rounded-sm type-link text-blue-600 hover:text-blue-700 transition-colors " + FOCUS + " dark:text-blue-400 dark:hover:text-blue-300";
  // Inline text link inside a sentence (no flex, keeps the line).
  var LINK_INLINE = "cursor-pointer rounded-sm font-medium text-blue-600 hover:text-blue-700 hover:underline " + FOCUS + " dark:text-blue-400 dark:hover:text-blue-300";
  // Row options (Card details options button).
  var BTN_ICON =
    "inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden aria-expanded:ring-2 aria-expanded:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-200 dark:focus-visible:ring-blue-400 dark:aria-expanded:ring-blue-400";
  var MENU =
    "w-56 rounded-md bg-white py-1 shadow-lg outline-1 outline-black/5 [--anchor-gap:--spacing(2)] dark:bg-gray-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10 transition transition-discrete data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-100 data-leave:ease-in motion-reduce:transition-none";
  var MENU_ITEM =
    "flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left text-sm/5 font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:outline-hidden data-focus:bg-gray-100 data-focus:text-gray-900 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white dark:data-focus:bg-white/5 dark:data-focus:text-white";
  // Dismiss X (CLAUDE.md rule 8 classes).
  var CLOSE_X =
    "shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-300 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400";
  // Select field trigger, 40px like OBField (card-manager-linked-add.js) + chevron hover tone (lessons 2026-11-23).
  var SELECT_TRIGGER =
    "group/select grid h-10 w-full cursor-default grid-cols-1 items-center rounded-md bg-white py-0 pr-2 pl-3 text-left text-base/6 text-gray-900 shadow-xs " +
    "outline-1 -outline-offset-1 outline-gray-300 hover:outline-gray-400 " +
    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 " +
    "aria-expanded:outline-2 aria-expanded:-outline-offset-2 aria-expanded:outline-blue-600 " +
    "aria-invalid:outline-red-300 aria-invalid:hover:outline-red-400 aria-invalid:focus-visible:outline-red-600 " +
    "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:outline-gray-200 " +
    "dark:bg-white/5 dark:text-white dark:outline-white/10 dark:hover:outline-white/20 " +
    "dark:focus-visible:outline-blue-500 dark:aria-expanded:outline-blue-500 " +
    "dark:aria-invalid:outline-red-400/50 dark:aria-invalid:focus-visible:outline-red-500 " +
    "dark:disabled:bg-white/10 dark:disabled:text-gray-500 dark:disabled:outline-white/5";
  var SELECT_OPTIONS =
    "max-h-60 w-(--button-width) overflow-auto rounded-md bg-white py-1 text-base shadow-lg outline-1 outline-black/5 " +
    "[--anchor-gap:--spacing(1)] transition transition-discrete data-closed:opacity-0 " +
    "data-enter:duration-100 data-enter:ease-out data-leave:duration-100 data-leave:ease-in " +
    "motion-reduce:transition-none dark:bg-gray-800 dark:outline-white/10";
  var SELECT_OPTION =
    "group/option relative block cursor-default py-2 pr-4 pl-3 text-gray-900 select-none " +
    "hover:bg-gray-100 focus:bg-gray-100 focus:outline-hidden aria-selected:bg-gray-100 " +
    "dark:text-white dark:hover:bg-white/10 dark:focus:bg-white/10 dark:aria-selected:bg-white/10";
  // Read-only value field (API details): OBField look, gray fill.
  var READONLY_EXTRA = " read-only:bg-gray-50 read-only:text-gray-700 dark:read-only:bg-white/10 dark:read-only:text-gray-300 truncate";

  // Badges (Tailwind Plus small badge, rounded-md; dark = {c}-400/10 + ring {c}-400/20).
  var BADGE = "inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs/4 font-medium inset-ring ";
  var BADGE_TONE = {
    blue: "bg-blue-50 text-blue-700 inset-ring-blue-700/10 dark:bg-blue-400/10 dark:text-blue-400 dark:inset-ring-blue-400/30",
    green: "bg-green-50 text-green-700 inset-ring-green-600/20 dark:bg-green-400/10 dark:text-green-400 dark:inset-ring-green-500/20",
    red: "bg-red-50 text-red-700 inset-ring-red-600/10 dark:bg-red-400/10 dark:text-red-400 dark:inset-ring-red-400/20",
    amber: "bg-yellow-50 text-yellow-800 inset-ring-yellow-600/20 dark:bg-yellow-400/10 dark:text-yellow-500 dark:inset-ring-yellow-400/20",
  };

  // Section card inside the tab body (Figma: white card, gray-200 border, soft shadow).
  var CARD = "flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-xs sm:p-6 dark:border-white/10 dark:bg-white/5 dark:shadow-none";
  var DIVIDER = "border-t border-gray-200 dark:border-white/10";
  var TH = "px-3 py-3 text-left type-overline text-tertiary whitespace-nowrap";
  var TD = "px-3 py-3 type-body text-secondary whitespace-nowrap";

  /* ---------- icons ---------- */

  var ICON = {
    userPlus: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path d="M10 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM16.25 5.75a.75.75 0 0 0-1.5 0v2h-2a.75.75 0 0 0 0 1.5h2v2a.75.75 0 0 0 1.5 0v-2h2a.75.75 0 0 0 0-1.5h-2v-2Z" /></svg>',
    plus: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>',
    arrowRight: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="size-4"><path fill-rule="evenodd" d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z" clip-rule="evenodd" /></svg>',
    chevronLeft: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd" /></svg>',
    chevronRight: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>',
    selector: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-500 group-hover/select:text-gray-700 dark:text-gray-400 dark:group-hover/select:text-gray-200"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.22 10.22a.75.75 0 0 1 1.06 0L8 11.94l1.72-1.72a.75.75 0 1 1 1.06 1.06l-2.25 2.25a.75.75 0 0 1-1.06 0l-2.25-2.25a.75.75 0 0 1 0-1.06ZM10.78 5.78a.75.75 0 0 1-1.06 0L8 4.06 6.28 5.78a.75.75 0 0 1-1.06-1.06l2.25-2.25a.75.75 0 0 1 1.06 0l2.25 2.25a.75.75 0 0 1 0 1.06Z" /></svg>',
    infoMini: function (cls) { return '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="' + cls + '"><path fill-rule="evenodd" clip-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" /></svg>'; },
    warnMini: function (cls) { return '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="' + cls + '"><path fill-rule="evenodd" clip-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" /></svg>'; },
    checkCircle: function (cls) { return '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="' + cls + '"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" /></svg>'; },
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="size-5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>',
    dots: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path d="M10 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM11.5 15.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0Z" /></svg>',
    refresh: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 text-gray-400 dark:text-gray-500"><path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clip-rule="evenodd" /></svg>',
    sliders: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 text-gray-400 dark:text-gray-500"><path d="M17 2.75a.75.75 0 0 0-1.5 0v5.5a.75.75 0 0 0 1.5 0v-5.5ZM17 15.75a.75.75 0 0 0-1.5 0v1.5a.75.75 0 0 0 1.5 0v-1.5ZM3.75 15a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75ZM4.5 2.75a.75.75 0 0 0-1.5 0v5.5a.75.75 0 0 0 1.5 0v-5.5ZM10 11a.75.75 0 0 1 .75.75v5.5a.75.75 0 0 1-1.5 0v-5.5A.75.75 0 0 1 10 11ZM10.75 2.75a.75.75 0 0 0-1.5 0v1.5a.75.75 0 0 0 1.5 0v-1.5ZM10 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM3.75 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM16.25 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" /></svg>',
    unlink: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 text-gray-400 dark:text-gray-500"><path d="M12.232 4.232a2.5 2.5 0 0 1 3.536 3.536l-1.225 1.224a.75.75 0 0 0 1.061 1.06l1.224-1.224a4 4 0 0 0-5.656-5.656l-3 3a4 4 0 0 0 .225 5.865.75.75 0 0 0 .977-1.138 2.5 2.5 0 0 1-.142-3.667l3-3Z" /><path d="M11.603 7.963a.75.75 0 0 0-.977 1.138 2.5 2.5 0 0 1 .142 3.667l-3 3a2.5 2.5 0 0 1-3.536-3.536l1.225-1.224a.75.75 0 0 0-1.061-1.06l-1.224 1.224a4 4 0 1 0 5.656 5.656l3-3a4 4 0 0 0-.225-5.865Z" /><path d="M2.22 2.22a.75.75 0 0 1 1.06 0l14.5 14.5a.75.75 0 1 1-1.06 1.06L2.22 3.28a.75.75 0 0 1 0-1.06Z" /></svg>',
    pencil: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="size-4"><path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.262a1.75 1.75 0 0 0 0-2.474Z" /><path d="M4.75 3.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25V9A.75.75 0 0 1 14 9v2.25A2.75 2.75 0 0 1 11.25 14h-6.5A2.75 2.75 0 0 1 2 11.25v-6.5A2.75 2.75 0 0 1 4.75 2H7a.75.75 0 0 1 0 1.5H4.75Z" /></svg>',
    search: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="size-4 shrink-0 text-blue-600 dark:text-blue-400"><path fill-rule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clip-rule="evenodd" /></svg>',
    // SMART System eye / eye-slash (payables-pay.html #pp-orig-bank-reveal-btn), gray inside a field.
    eye: '<svg data-icon="reveal" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="size-5"><path d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M0.882274 7.63113C1.87378 4.65047 4.68527 2.5 8.00035 2.5C11.3139 2.5 14.1243 4.64848 15.117 7.62697C15.1973 7.86768 15.1973 8.12812 15.1172 8.36887C14.1257 11.3495 11.3142 13.5 7.99918 13.5C4.68565 13.5 1.87522 11.3515 0.882492 8.37303C0.802265 8.13233 0.802188 7.87188 0.882274 7.63113ZM11.5 8C11.5 9.933 9.933 11.5 8 11.5C6.067 11.5 4.5 9.933 4.5 8C4.5 6.067 6.067 4.5 8 4.5C9.933 4.5 11.5 6.067 11.5 8Z"/></svg>',
    eyeSlash: '<svg data-icon="hide" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="hidden size-5"><path d="M2.35355 1.64645C2.15829 1.45118 1.84171 1.45118 1.64645 1.64645C1.45118 1.84171 1.45118 2.15829 1.64645 2.35355L13.6464 14.3536C13.8417 14.5488 14.1583 14.5488 14.3536 14.3536C14.5488 14.1583 14.5488 13.8417 14.3536 13.6464L2.35355 1.64645Z"/><path d="M15.1172 8.36887C14.7546 9.45913 14.1484 10.4383 13.3631 11.2418L11.2975 9.17615C11.4286 8.80857 11.5 8.41262 11.5 8C11.5 6.067 9.933 4.5 8 4.5C7.58738 4.5 7.19143 4.5714 6.82385 4.70253L5.17265 3.05133C6.04522 2.69587 6.99985 2.5 8.00035 2.5C11.3139 2.5 14.1243 4.64848 15.117 7.62697C15.1973 7.86768 15.1973 8.12812 15.1172 8.36887Z"/><path d="M10.5 8C10.5 8.12011 10.4915 8.23824 10.4752 8.35383L7.64617 5.52485C7.76176 5.50847 7.87989 5.5 8 5.5C9.38071 5.5 10.5 6.61929 10.5 8Z"/><path d="M8.35383 10.4752L5.52485 7.64617C5.50847 7.76176 5.5 7.87989 5.5 8C5.5 9.38071 6.61929 10.5 8 10.5C8.12011 10.5 8.23824 10.4915 8.35383 10.4752Z"/><path d="M4.5 8C4.5 7.58738 4.5714 7.19143 4.70253 6.82385L2.63662 4.75794C1.85124 5.56148 1.24498 6.54076 0.882274 7.63113C0.802188 7.87188 0.802265 8.13233 0.882492 8.37303C1.87522 11.3515 4.68565 13.5 7.99918 13.5C8.9998 13.5 9.95455 13.3041 10.8272 12.9485L9.17615 11.2975C8.80857 11.4286 8.41262 11.5 8 11.5C6.067 11.5 4.5 9.933 4.5 8Z"/></svg>',
    // Source / section glyphs (Heroicons outline 24) on a dark tile, like the Figma source icons.
    erp: '<path stroke-linecap="round" stroke-linejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />',
    batch: '<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />',
    api: '<path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />',
    bank: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />',
    triangle: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />',
  };

  function glyph(name, cls) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="' + cls + '">' + ICON[name] + "</svg>";
  }

  // Dark tile with a white glyph (Figma source icons, 32px).
  function tile(name, size) {
    var box = size === "lg" ? "size-12 rounded-lg" : "size-8 rounded-md";
    var ic = size === "lg" ? "size-7" : "size-5";
    return '<span aria-hidden="true" class="inline-flex ' + box + ' shrink-0 items-center justify-center bg-gray-800 text-white dark:bg-white/10 dark:text-gray-100">' + glyph(name, ic) + "</span>";
  }

  /* ---------- helpers ---------- */

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function $(sel, scope) { return (scope || document).querySelector(sel); }

  function toast(message, tone) {
    if (typeof window.showGlobalTopToast === "function") window.showGlobalTopToast(message, { tone: tone || "success" });
  }

  function readOnly() { return SE && SE.isReadOnly ? SE.isReadOnly() : false; }

  var shellData = null;
  function biz() { return ((shellData && shellData.businesses) || [])[0] || { name: "Your business", legalName: "Your business" }; }
  function applicant() { return (shellData && shellData.applicant) || { email: "" }; }

  function sourceById(id) { return (data.sources || []).filter(function (s) { return s.id === id; })[0]; }
  function providerById(id) { return (data.providers || []).filter(function (p) { return p.id === id; })[0]; }
  function bankById(id) { return (data.banks || []).filter(function (b) { return b.id === id; })[0]; }

  function mask(value) {
    var v = String(value || "");
    return v ? "******" + v.slice(-4) : "";
  }

  function initials(name) {
    return String(name || "").split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join("");
  }

  function badge(tone, label, icon) {
    return '<span class="' + BADGE + BADGE_TONE[tone] + '">' + (icon || "") + esc(label) + "</span>";
  }

  function statusBadge(status) {
    if (status === "connected") return badge("green", "Connected", ICON.checkCircle("size-3"));
    if (status === "action") return badge("amber", "Action Required", ICON.warnMini("size-3"));
    return badge("red", "Pending Verification", ICON.warnMini("size-3"));
  }

  function inviteLink(where, label) {
    return '<button type="button" data-se-invite="' + esc(where) + '" class="' + LINK + '">' + esc(label || "Invite someone to help") + ICON.userPlus + "</button>";
  }

  // Information circle + tooltip (components skill; same markup as shell.js infoTip, end-aligned).
  function infoTip(id, label, text) {
    return (
      '<span class="group/info relative inline-flex size-5 shrink-0 items-center justify-center">' +
      '<span tabindex="0" role="button" aria-describedby="' + esc(id) + '" class="inline-flex cursor-help rounded-full text-gray-400 hover:text-gray-900 focus-visible:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 dark:text-gray-500 dark:hover:text-white dark:focus-visible:text-white dark:focus-visible:outline-blue-400">' +
      '<span class="sr-only">' + esc(label) + "</span>" + ICON.infoMini("size-4.5") + "</span>" +
      '<span id="' + esc(id) + '" role="tooltip" class="pointer-events-none invisible absolute top-full right-0 z-30 -mr-1 mt-3 w-max max-w-64 sm:max-w-[343px] rounded-lg bg-gray-900 p-3 text-left text-sm/5 font-normal text-gray-100 opacity-0 shadow-xs transition-opacity duration-150 group-hover/info:visible group-hover/info:opacity-100 group-has-focus-visible/info:visible group-has-focus-visible/info:opacity-100 before:absolute before:-top-1 before:right-1.5 before:size-3 before:rotate-45 before:rounded-[2px] before:bg-inherit dark:bg-gray-950 dark:ring-1 dark:ring-white/10">' +
      esc(text) + "</span></span>"
    );
  }

  function guideLink(label, href) {
    return '<a href="' + esc(href) + '" target="_blank" rel="noopener noreferrer" class="' + LINK_INLINE + '">' + esc(label) + '<span class="sr-only"> (opens in a new tab)</span></a>';
  }

  /* ---------- state ---------- */

  function storageKey() { return SE.storageKey(TAB); }

  function load() {
    try {
      var saved = JSON.parse(window.sessionStorage.getItem(storageKey()));
      if (saved && typeof saved === "object") {
        state.source = saved.source || null;
        state.view = saved.view || "choices";
        state.erp = saved.erp || null;
        state.api = saved.api || null;
        state.banks = Array.isArray(saved.banks) ? saved.banks : [];
      }
    } catch (e) { /* keep defaults */ }
  }

  function save() {
    try { window.sessionStorage.setItem(storageKey(), JSON.stringify(state)); } catch (e) { /* private mode */ }
  }

  function bankConnected() { return state.banks.some(function (b) { return b.status === "connected"; }); }
  function isComplete() { return !!state.source && bankConnected(); }

  function commit(opts) {
    save();
    SE.setProgress(TAB, { required: 2, filled: (state.source ? 1 : 0) + (bankConnected() ? 1 : 0) });
    document.dispatchEvent(new CustomEvent("smart-enroll:connectors-change", {
      detail: { complete: isComplete(), source: state.source, bankConnected: bankConnected() },
    }));
    if (!opts || opts.draw !== false) draw(opts && opts.focus);
  }

  /* ---------- tab body ---------- */

  function render(el) {
    root = el;
    if (!root.hasAttribute("data-sec-bound")) {
      root.setAttribute("data-sec-bound", "");
      root.addEventListener("click", onClick);
    }
    draw();
  }

  function draw(focusSel) {
    if (!root || !data) return;
    root.innerHTML =
      '<div class="flex flex-col gap-6">' +
      dataSourceHtml() +
      bankHtml() +
      // T9 (Cross-Border FX Provider) fills this slot; see the header comment.
      '<div data-se-fx-slot hidden></div>' +
      "</div>";
    if (focusSel) {
      var target = root.querySelector(focusSel);
      if (target) target.focus();
    }
    document.dispatchEvent(new CustomEvent("smart-enroll:connectors-rendered", { detail: { slot: fxSlot(), root: root } }));
  }

  function fxSlot() { return root ? root.querySelector("[data-se-fx-slot]") : null; }

  function sectionHead(id, title, actions) {
    return (
      '<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">' +
      '<h2 id="' + id + '" tabindex="-1" class="type-title-section text-default focus:outline-none">' + esc(title) + "</h2>" +
      '<div class="flex flex-wrap items-center gap-4">' + actions + "</div>" +
      "</div>"
    );
  }

  function currentStrip() {
    var c = data.copy.dataSource;
    return (
      '<p class="inline-flex flex-wrap items-center gap-x-2 gap-y-1 self-start rounded-md bg-gray-50 px-2 py-1.5 type-caption text-secondary dark:bg-white/5">' +
      esc(c.current) +
      '<button type="button" data-sec="switch" class="' + LINK + ' text-xs/4">' + esc(c.switch) + ICON.arrowRight + "</button></p>"
    );
  }

  function emptyState(iconName, title, connectAction, connectLabel) {
    var text = esc(data.copy.bank.emptyText)
      .replace("{connect}", '<button type="button" data-sec="' + connectAction + '" class="' + LINK_INLINE + '">' + esc(connectLabel) + "</button>")
      .replace("{invite}", '<button type="button" data-se-invite="connectors-empty" class="' + LINK_INLINE + '">invite someone</button>');
    if (iconName === "erp") text = text.replace("your bank account", "your accounting software");
    return (
      '<div class="flex flex-col items-center gap-1 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-center dark:border-white/15 dark:bg-white/5">' +
      glyph(iconName, "mb-2 size-10 text-gray-400 dark:text-gray-500") +
      '<p class="type-label-large text-default">' + esc(title) + "</p>" +
      '<p class="type-body text-tertiary">' + text + "</p>" +
      "</div>"
    );
  }

  function dataSourceHtml() {
    var c = data.copy.dataSource;
    if (state.source === "erp" && state.view === "detail") return erpSectionHtml();
    if (state.source === "api" && state.view === "detail") return apiSectionHtml();
    var cards = data.sources.map(sourceCardHtml).join("");
    return (
      '<section aria-labelledby="sec-ds-title" class="' + CARD + '">' +
      sectionHead("sec-ds-title", c.title, inviteLink("connectors-data-source") + infoTip("sec-ds-tip", "About data source preferences", c.info)) +
      '<p class="type-description text-tertiary">' + esc(c.text) + "</p>" +
      '<ul role="list" class="grid gap-4 md:grid-cols-3">' + cards + "</ul>" +
      "</section>"
    );
  }

  function sourceCardHtml(s) {
    var current = state.source === s.id;
    var text = esc(s.text).replace("{guide}", guideLink("API integration guide", data.guides.api));
    var action;
    if (!current) action = '<button type="button" data-sec="select" data-sec-source="' + s.id + '" class="' + BTN.secondarySm + '">Select<span class="sr-only"> ' + esc(s.name) + "</span></button>";
    else if (s.id === "batch") action = '<button type="button" data-sec="learn" data-sec-source="batch" class="' + LINK + '">Learn More<span class="sr-only"> about Batch Data Upload</span></button>';
    else action = '<button type="button" data-sec="view" class="' + LINK + '">View Accounts' + ICON.arrowRight + "</button>";
    return (
      '<li class="flex flex-col gap-4 rounded-lg border p-4 sm:p-5 ' +
      (current ? "border-blue-600 ring-1 ring-blue-600 dark:border-blue-400 dark:ring-blue-400" : "border-gray-200 dark:border-white/10") + '">' +
      '<div class="flex items-start justify-between gap-2">' + tile(s.id) + (current ? badge("blue", "Current connection") : "") + "</div>" +
      '<div class="flex flex-1 flex-col gap-1"><h3 class="type-label-large text-default">' + esc(s.name) + "</h3>" +
      '<p class="type-description text-tertiary">' + text + "</p></div>" +
      '<div class="flex">' + action + "</div>" +
      "</li>"
    );
  }

  function rowMenu(label, items) {
    return (
      '<el-dropdown class="inline-block">' +
      '<button type="button" class="' + BTN_ICON + '"><span class="sr-only">' + esc(label) + "</span>" + ICON.dots + "</button>" +
      '<el-menu anchor="bottom end" popover class="' + MENU + '">' +
      items.map(function (it) {
        return '<button type="button" data-sec="' + it.action + '"' + (it.id ? ' data-sec-id="' + esc(it.id) + '"' : "") + ' class="' + MENU_ITEM + '">' + it.icon + esc(it.label) + "</button>";
      }).join("") +
      "</el-menu></el-dropdown>"
    );
  }

  function erpSectionHtml() {
    var s = sourceById("erp");
    if (!state.erp) {
      return (
        '<section aria-labelledby="sec-ds-title" class="' + CARD + '">' +
        sectionHead("sec-ds-title", s.name, inviteLink("connectors-erp") +
          '<button type="button" data-sec="erp-connect" class="' + BTN.primaryLg + '">' + ICON.plus + "Connect</button>") +
        '<p class="type-description text-tertiary">' + esc(s.sectionText) + "</p>" +
        currentStrip() +
        '<div class="' + DIVIDER + '"></div>' +
        emptyState("erp", "No accounting software added yet", "erp-connect", "Connect") +
        "</section>"
      );
    }
    var p = providerById(state.erp.provider) || {};
    return (
      '<section aria-labelledby="sec-ds-title" class="' + CARD + '">' +
      sectionHead("sec-ds-title", "Your ERP/Software accounts", inviteLink("connectors-erp")) +
      currentStrip() +
      '<div class="relative -mx-4 overflow-x-auto sm:mx-0"><table class="min-w-full"><thead class="border-b border-dashed border-gray-200 dark:border-white/10"><tr>' +
      '<th scope="col" class="' + TH + '">Account</th><th scope="col" class="' + TH + '">ERP</th><th scope="col" class="' + TH + '">Status</th>' +
      '<th scope="col" class="w-12 px-3 py-3"><span class="sr-only">Actions</span></th></tr></thead><tbody>' +
      "<tr>" +
      '<td class="' + TD + ' max-w-72 truncate font-medium text-default" title="' + esc(state.erp.email) + '">' + esc(state.erp.email) + "</td>" +
      '<td class="' + TD + '">' + esc(p.name) + "</td>" +
      '<td class="' + TD + '">' + statusBadge(state.erp.status) + "</td>" +
      '<td class="px-3 py-2 text-right">' + rowMenu("Open options for " + state.erp.email, [
        { action: "erp-refresh", label: "Refresh connection", icon: ICON.refresh },
        { action: "erp-details", label: "View Details", icon: ICON.sliders },
      ]) + "</td></tr>" +
      "</tbody></table></div>" +
      "</section>"
    );
  }

  function apiSectionHtml() {
    return (
      '<section aria-labelledby="sec-ds-title" class="' + CARD + '">' +
      // Figma reads "Invite someone tohHelp" here (typo) — the copy of the other sections is used.
      sectionHead("sec-ds-title", "API Keys and Credentials", inviteLink("connectors-api")) +
      currentStrip() +
      '<div class="relative -mx-4 overflow-x-auto sm:mx-0"><table class="min-w-full"><thead class="border-b border-dashed border-gray-200 dark:border-white/10"><tr>' +
      '<th scope="col" class="' + TH + '">Client ID</th><th scope="col" class="w-12 px-3 py-3"><span class="sr-only">Actions</span></th></tr></thead><tbody>' +
      '<tr><td class="' + TD + ' font-mono text-default">' + esc(data.api.clientId) + "</td>" +
      '<td class="px-3 py-2 text-right">' + rowMenu("Open options for the API client", [
        { action: "api-details", label: "View Details", icon: ICON.sliders },
        { action: "api-disconnect", label: "Disconnect", icon: ICON.unlink },
      ]) + "</td></tr>" +
      "</tbody></table></div>" +
      "</section>"
    );
  }

  function bankHtml() {
    var c = data.copy.bank;
    if (!state.banks.length) {
      return (
        '<section aria-labelledby="sec-bank-title" class="' + CARD + '">' +
        sectionHead("sec-bank-title", c.title, inviteLink("connectors-bank") +
          '<button type="button" data-sec="bank-connect" class="' + BTN.primaryLg + '">' + ICON.plus + "Connect</button>") +
        '<p class="type-description text-tertiary">' + esc(c.text) + "</p>" +
        '<div class="' + DIVIDER + '"></div>' +
        emptyState("bank", c.emptyTitle, "bank-connect", "Connect") +
        "</section>"
      );
    }
    var missing = state.banks.filter(function (b) { return b.status === "action"; })[0];
    return (
      '<section aria-labelledby="sec-bank-title" class="' + CARD + '">' +
      sectionHead("sec-bank-title", c.tableTitle, inviteLink("connectors-bank") +
        '<button type="button" data-sec="bank-connect" class="' + BTN_SOFT_MD + '">' + ICON.plus + "Add<span class=\"sr-only\"> bank account</span></button>") +
      (missing ? nameMissingAlert(missing.id) : "") +
      '<div class="relative -mx-4 overflow-x-auto border-t border-gray-200 sm:mx-0 dark:border-white/10"><table class="min-w-full"><thead class="border-b border-dashed border-gray-200 dark:border-white/10"><tr>' +
      // Routing number only from 2xl: the main card is ~690px wide at 1280 (details dialog shows it).
      [["Account", ""], ["Bank", ""], ["Routing number", " hidden 2xl:table-cell"], ["Account number", ""], ["Status", ""]].map(function (h) { return '<th scope="col" class="' + TH + h[1] + '">' + h[0] + "</th>"; }).join("") +
      '<th scope="col" class="w-12 px-3 py-3"><span class="sr-only">Actions</span></th></tr></thead>' +
      '<tbody class="divide-y divide-gray-200 dark:divide-white/10">' + state.banks.map(bankRowHtml).join("") + "</tbody></table></div>" +
      "</section>"
    );
  }

  function bankRowHtml(b) {
    var bank = bankById(b.bankId) || {};
    var label = b.name || b.holder;
    return (
      '<tr data-sec-row="' + esc(b.id) + '" class="' + (b.status === "action" ? "bg-yellow-50/60 dark:bg-yellow-400/5" : "") + '">' +
      '<td class="' + TD + ' max-w-40 truncate font-medium text-default" title="' + esc(label) + '">' + esc(label) + "</td>" +
      '<td class="' + TD + '">' + esc(bank.name) + "</td>" +
      '<td class="' + TD + ' hidden tabular-nums 2xl:table-cell"><span class="sr-only">ending in </span>' + esc(mask(b.routing)) + "</td>" +
      '<td class="' + TD + ' tabular-nums"><span class="sr-only">ending in </span>' + esc(mask(b.account)) + "</td>" +
      '<td class="' + TD + '">' + statusBadge(b.status) + "</td>" +
      '<td class="px-3 py-2 text-right">' + rowMenu("Open options for " + label, [
        { action: "bank-refresh", id: b.id, label: "Refresh Connection", icon: ICON.refresh },
        { action: "bank-details", id: b.id, label: "View Details", icon: ICON.sliders },
      ]) + "</td></tr>"
    );
  }

  function nameMissingAlert(id) {
    return (
      '<div role="status" class="flex flex-col gap-3 rounded-md bg-yellow-50 p-4 sm:flex-row sm:items-start dark:bg-yellow-400/10">' +
      ICON.warnMini("size-5 shrink-0 text-yellow-500 dark:text-yellow-400") +
      '<div class="flex min-w-0 flex-1 flex-col gap-1"><p class="type-label text-yellow-800 dark:text-yellow-300">Bank account name missing</p>' +
      '<p class="type-body text-yellow-700 dark:text-yellow-300/80">Your ERP connector is missing the Bank Account Name. SMART Hub is unable to update your information. Please add one.</p></div>' +
      '<button type="button" data-sec="bank-details" data-sec-id="' + esc(id) + '" class="' + BTN.secondarySm + ' self-start whitespace-nowrap">Add bank account name</button>' +
      "</div>"
    );
  }

  /* ---------- clicks in the tab ---------- */

  function closeMenu(el) {
    var menu = el.closest("el-menu");
    if (menu && menu.hidePopover) {
      try { menu.hidePopover(); } catch (e) { /* closed */ }
      var trigger = menu.parentElement && menu.parentElement.querySelector("button");
      if (trigger) trigger.focus();
    }
  }

  function onClick(e) {
    var el = e.target.closest && e.target.closest("[data-sec]");
    if (!el || !root.contains(el)) return;
    if (readOnly()) return;
    var action = el.getAttribute("data-sec");
    var id = el.getAttribute("data-sec-id");
    closeMenu(el);
    switch (action) {
      case "select": chooseSource(el.getAttribute("data-sec-source")); break;
      case "learn": explainer("batch", { info: true }); break;
      case "view": state.view = "detail"; commit({ focus: "#sec-ds-title" }); break;
      case "switch": state.view = "choices"; commit({ focus: "#sec-ds-title" }); break;
      case "erp-connect": erpWizard(1, { provider: null }); break;
      case "erp-refresh": toast("Connection refreshed."); break;
      case "erp-details": erpDetails(); break;
      case "api-details": apiDetails(); break;
      case "api-disconnect": apiDisconnect(); break;
      case "bank-connect": bankWizard({}); break;
      case "bank-refresh": toast("Connection refreshed."); break;
      case "bank-details": bankDetails(id); break;
    }
  }

  /* ---------- dialogs: shared pieces ---------- */

  function panel(width) {
    return "relative flex w-full " + width + " flex-col rounded-lg bg-white shadow-xl dark:bg-gray-900 dark:ring-1 dark:ring-white/10";
  }

  // Centered confirm / result dialog (OBModal default 512, built-in X row).
  function centered(o) {
    var icon =
      o.tone === "success" ? ICON.checkCircle("size-10 text-green-500 dark:text-green-400")
      : o.tone === "danger" ? glyph("triangle", "size-10 text-red-500 dark:text-red-400")
      : glyph("triangle", "size-10 text-amber-500 dark:text-amber-400");
    M().open(
      '<div class="flex flex-col items-center gap-4 px-6 pb-6 text-center">' + icon +
      '<div class="flex flex-col gap-2"><h2 id="' + o.id + '" class="type-title-modal text-default">' + esc(o.title) + "</h2>" +
      (o.text ? '<p class="type-description text-tertiary">' + esc(o.text) + "</p>" : "") + "</div>" +
      (o.extra || "") + "</div>",
      o.id,
      {
        footer:
          '<div class="flex flex-col gap-3 px-6 pb-6">' +
          '<button type="button" data-sec-ok class="' + (o.tone === "danger" ? BTN.dangerXl : BTN.primaryXl) + ' w-full">' + esc(o.ok) + "</button>" +
          (o.cancel === false ? "" : '<button type="button" data-ob-modal-close class="' + BTN.secondaryXl + ' w-full">Cancel</button>') +
          "</div>",
      }
    );
    var ok = $("[data-sec-ok]");
    ok.addEventListener("click", function () {
      M().close();
      if (o.onOk) o.onOk();
    });
  }

  // Header bar for wide dialogs (Figma "SE/Connectors/Modal/*": icon · title · Invite · Step n of N + dots · X).
  function headerBar(o) {
    var steps = "";
    if (o.step) {
      var dots = "";
      for (var i = 1; i <= o.steps; i++) {
        dots += i < o.step
          ? ICON.checkCircle("size-5 text-blue-600 dark:text-blue-400")
          : i === o.step
            ? '<span class="inline-flex size-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-400/20"><span class="size-2 rounded-full bg-blue-600 dark:bg-blue-400"></span></span>'
            : '<span class="inline-flex size-5 items-center justify-center"><span class="size-2 rounded-full bg-gray-300 dark:bg-white/20"></span></span>';
      }
      steps =
        '<span class="whitespace-nowrap type-label text-default">Step ' + o.step + " of " + o.steps + "</span>" +
        '<span aria-hidden="true" class="hidden items-center gap-1 sm:flex">' + dots + "</span>";
    }
    var invite = o.invite === false ? "" :
      '<button type="button" data-se-invite="connectors-dialog" class="' + LINK + ' hidden sm:inline-flex">' + esc(o.invite || "Invite") + ICON.userPlus + "</button>";
    return (
      '<div data-sec-header class="flex items-center gap-3 border-b border-gray-200 px-4 py-4 sm:px-6 dark:border-white/10">' +
      (o.icon ? glyph(o.icon, "hidden size-6 shrink-0 text-gray-400 sm:block dark:text-gray-500") : "") +
      '<h2 id="' + o.id + '" tabindex="-1" class="min-w-0 flex-1 truncate type-title-modal text-default focus:outline-none">' + esc(o.title) + "</h2>" +
      invite +
      (invite && steps ? '<span aria-hidden="true" class="hidden h-6 w-px bg-gray-200 sm:block dark:bg-white/10"></span>' : "") +
      steps +
      '<span aria-hidden="true" class="hidden h-6 w-px bg-gray-200 sm:block dark:bg-white/10"></span>' +
      M().closeButton("data-ob-modal-close", "shrink-0") +
      "</div>"
    );
  }

  function footerBar(left, right) {
    return '<div class="flex items-center justify-between gap-3 border-t border-gray-200 px-4 py-4 sm:px-6 dark:border-white/10"><div>' + (left || "") + '</div><div class="flex gap-3">' + (right || "") + "</div></div>";
  }

  function backBtn() {
    return '<button type="button" data-sec-back class="' + BTN.secondaryXl + ' sm:w-50">' + ICON.chevronLeft + "Back</button>";
  }

  /**
   * Opens a wide dialog or, when one with the same key is open, swaps its header / body / footer in place
   * (no new enter motion between steps). Returns the dialog element.
   */
  var wide = null;
  function wideDialog(key, width, header, body, footer, labelledBy) {
    var current = document.querySelector("[data-ob-modal-dialog]");
    if (wide && wide.key === key && current && current === wide.dialog && current.isConnected) {
      current.querySelector("[data-sec-header]").outerHTML = header;
      current.querySelector("[data-ob-modal-body]").innerHTML = body;
      current.querySelector("[data-ob-modal-footer]").innerHTML = footer;
      var h = current.querySelector("#" + labelledBy);
      if (h) h.focus({ preventScroll: true });
      var scroller = current.closest("[data-ob-modal]");
      if (scroller) scroller.scrollTop = 0;
      return current;
    }
    var backdrop = M().open(body, labelledBy, { bare: true, header: header, footer: footer, panelClass: panel(width) });
    wide = { key: key, dialog: backdrop.querySelector("[data-ob-modal-dialog]") };
    guardSelectEsc(backdrop);
    return wide.dialog;
  }

  // Esc inside an open el-select list closes the list only (OBModal listens for Esc on document; lessons 2026-11-18).
  function guardSelectEsc(backdrop) {
    var listOpen = false;
    backdrop.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      listOpen = Array.prototype.some.call(backdrop.querySelectorAll("el-options"), function (o) {
        try { return o.matches(":popover-open"); } catch (e) { return false; }
      });
    }, true);
    backdrop.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && listOpen) event.stopPropagation();
    });
  }

  function textField(o) {
    var f = F();
    var reveal = o.reveal;
    var input =
      '<input id="' + o.id + '" name="' + esc(o.name || o.id) + '" type="' + (reveal ? "password" : o.type || "text") + '"' +
      (o.value ? ' value="' + esc(o.value) + '"' : "") +
      (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : "") +
      (o.autocomplete ? ' autocomplete="' + o.autocomplete + '"' : ' autocomplete="off"') +
      (o.inputmode ? ' inputmode="' + o.inputmode + '"' : "") +
      (o.maxlength ? ' maxlength="' + o.maxlength + '"' : "") +
      (o.readonly ? " readonly" : "") +
      ' aria-describedby="' + o.id + '-error" class="' + f.INPUT + (reveal ? " pr-11" : "") + (o.readonly ? READONLY_EXTRA : "") + '" />';
    var eye = reveal
      ? '<button type="button" data-sec-reveal="' + o.id + '" aria-pressed="false" class="absolute inset-y-0 right-0 flex cursor-pointer items-center rounded-r-md px-3 text-gray-400 hover:text-gray-600 ' + FOCUS + ' dark:text-gray-500 dark:hover:text-gray-300">' +
        '<span class="sr-only">Show ' + esc(o.label) + "</span>" + ICON.eye + ICON.eyeSlash + "</button>"
      : "";
    return (
      '<div class="flex flex-col gap-1">' +
      '<div class="flex items-center justify-between gap-2"><label for="' + o.id + '" class="' + f.LABEL + '">' + esc(o.label) + "</label>" +
      (o.optional ? '<span class="type-label text-tertiary">Optional</span>' : "") + (o.after || "") + "</div>" +
      '<div class="relative">' + input + eye + "</div>" +
      '<p id="' + o.id + '-error" role="alert" class="hidden ' + f.ERROR_TEXT + '"></p>' +
      "</div>"
    );
  }

  function selectField(o) {
    var f = F();
    var options = o.options.map(function (opt) {
      return '<el-option value="' + esc(opt.value) + '" class="' + SELECT_OPTION + '"' + ">" +
        '<span class="block truncate font-normal group-aria-selected/option:font-semibold">' + esc(opt.label) + "</span></el-option>";
    }).join("");
    var picked = o.options.filter(function (opt) { return opt.value === o.value; })[0];
    return (
      '<div class="flex flex-col gap-1">' +
      '<span id="' + o.id + '-label" class="' + f.LABEL + '">' + esc(o.label) + "</span>" +
      '<el-select id="' + o.id + '" name="' + esc(o.name || o.id) + '"' + (o.value ? ' value="' + esc(o.value) + '"' : "") + ' class="block">' +
      '<button type="button" data-sec-select="' + o.id + '" aria-labelledby="' + o.id + '-label" aria-describedby="' + o.id + '-error" class="' + SELECT_TRIGGER + '">' +
      '<el-selectedcontent class="col-start-1 row-start-1 flex min-w-0 items-center gap-2 pr-6 text-gray-900 dark:text-white">' +
      (picked ? '<span class="truncate">' + esc(picked.label) + "</span>" : '<span class="truncate text-gray-400 dark:text-gray-500">' + esc(o.placeholder || "Select") + "</span>") +
      "</el-selectedcontent>" + ICON.selector + "</button>" +
      '<el-options anchor="bottom start" popover class="' + SELECT_OPTIONS + '">' + options + "</el-options>" +
      "</el-select>" +
      '<p id="' + o.id + '-error" role="alert" class="hidden ' + f.ERROR_TEXT + '"></p>' +
      "</div>"
    );
  }

  function selectValue(dialog, id) {
    var sel = dialog.querySelector("#" + id);
    if (!sel) return "";
    var picked = sel.querySelector('el-option[aria-selected="true"]');
    return picked ? String(picked.getAttribute("value") || "") : String(sel.value || "");
  }

  function setSelectError(dialog, id, message) {
    var btn = dialog.querySelector('[data-sec-select="' + id + '"]');
    var err = dialog.querySelector("#" + id + "-error");
    if (message) btn.setAttribute("aria-invalid", "true");
    else btn.removeAttribute("aria-invalid");
    err.textContent = message || "";
    err.classList.toggle("hidden", !message);
  }

  function setFieldError(dialog, id, message) {
    var input = dialog.querySelector("#" + id);
    F().setError(input, !!message, dialog.querySelector("#" + id + "-error"), message || "");
  }

  // Eye buttons in password-type fields (one listener per dialog).
  function bindReveal(dialog) {
    if (dialog.hasAttribute("data-sec-reveal-bound")) return;
    dialog.setAttribute("data-sec-reveal-bound", "");
    dialog.addEventListener("click", function (e) {
      var btn = e.target.closest && e.target.closest("[data-sec-reveal]");
      if (!btn) return;
      var input = dialog.querySelector("#" + btn.getAttribute("data-sec-reveal"));
      var show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.setAttribute("aria-pressed", String(show));
      btn.querySelector('[data-icon="reveal"]').classList.toggle("hidden", show);
      btn.querySelector('[data-icon="hide"]').classList.toggle("hidden", !show);
      var sr = btn.querySelector(".sr-only");
      sr.textContent = sr.textContent.replace(show ? "Show" : "Hide", show ? "Hide" : "Show");
    });
  }

  function infoBox(content, extraCls) {
    return (
      '<div class="flex gap-3 rounded-md bg-blue-50 p-4 dark:bg-blue-400/10 ' + (extraCls || "") + '">' +
      ICON.infoMini("size-5 shrink-0 text-blue-400 dark:text-blue-400") +
      '<div class="flex min-w-0 flex-1 flex-col gap-2 type-body text-blue-700 dark:text-blue-300">' + content + "</div></div>"
    );
  }

  function busy(btn, label) {
    var html = btn.innerHTML;
    btn.disabled = true;
    btn.setAttribute("aria-busy", "true");
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" class="size-5 animate-spin motion-reduce:animate-none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-opacity=".3" stroke-width="3" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round" /></svg>' + esc(label);
    return function () { btn.disabled = false; btn.removeAttribute("aria-busy"); btn.innerHTML = html; };
  }

  /* ---------- data source: select / switch ---------- */

  function chooseSource(id) {
    if (state.source && state.source !== id) {
      var c = data.copy.lost;
      centered({ id: "sec-lost-title", tone: "warning", title: c.title, text: c.text, ok: "Continue", onOk: function () { explainer(id); } });
      return;
    }
    explainer(id);
  }

  function applySource(id) {
    state.source = id;
    state.erp = null;
    state.api = id === "api" ? { created: true } : null;
    state.view = id === "batch" ? "choices" : "detail";
    commit({ focus: "#sec-ds-title" });
    toast(sourceById(id).name + " is now your current connection.");
  }

  // Explainer modal (Figma "SE/Main menu/Add new feature/Confirmation", 680 wide).
  function explainer(id, opts) {
    var s = sourceById(id);
    var info = opts && opts.info;
    var paras = s.modalText.map(function (t) {
      return '<p class="type-body text-tertiary">' + esc(t).replace("{guide}", guideLink("API integration guide", data.guides.api)) + "</p>";
    }).join("");
    var list = id === "erp"
      ? '<ul role="list" class="flex flex-col gap-2 pl-1">' + data.providers.map(function (p) {
          return '<li class="flex items-center gap-3 type-body text-secondary"><span aria-hidden="true" class="size-1.5 shrink-0 rounded-full bg-blue-600 dark:bg-blue-400"></span>' + esc(p.name) + "</li>";
        }).join("") + "</ul>"
      : "";
    M().open(
      '<div class="flex flex-col gap-3 px-6">' + tile(id) +
      '<h2 id="sec-explainer-title" class="type-title-modal text-default">' + esc(s.modalTitle) + "</h2>" + paras + list + "</div>",
      "sec-explainer-title",
      {
        panelClass: panel("max-w-170"),
        footer: '<div class="flex flex-wrap gap-3 p-6">' +
          (info
            ? '<button type="button" data-ob-modal-close class="' + BTN.primaryMd + '">Got it</button>'
            : '<button type="button" data-sec-ok class="' + BTN.primaryMd + '">Continue</button><button type="button" data-ob-modal-close class="' + BTN.secondaryMd + '">Cancel</button>') +
          "</div>",
      }
    );
    var ok = $("[data-sec-ok]");
    if (ok) ok.addEventListener("click", function () { M().close(); applySource(id); });
  }

  /* ---------- ERP: 3-step connect, details ---------- */

  var erpDraft = null;

  function erpWizard(step, draft) {
    if (draft) erpDraft = draft;
    var d = erpDraft;
    var title = step === 3 ? "Connect Your Accounting Software" : "Connect your Accounting Software";
    var header = headerBar({ id: "sec-erp-title", icon: "erp", title: title, step: step, steps: 3 });
    var body, footer;
    if (step === 1) {
      body =
        '<div class="flex flex-col gap-6 p-4 sm:p-6">' +
        '<div class="flex flex-col items-center gap-3 text-center">' + tile("erp", "lg") +
        '<h3 class="type-title-card text-default">Connect your Accounting Software</h3>' +
        '<p class="rounded-md bg-gray-50 px-4 py-3 type-body text-secondary dark:bg-white/5">We\'ll embed in your accounting software or ERP to initiate payments from your accounts.</p></div>' +
        '<fieldset class="flex flex-col gap-4"><legend class="mb-4 type-overline text-tertiary">Select from one of these providers</legend>' +
        '<div class="grid gap-4 sm:grid-cols-2">' +
        data.providers.map(function (p) {
          return (
            '<label class="group/tile relative flex h-20 cursor-pointer items-center justify-center rounded-md border border-gray-300 bg-white px-4 text-center hover:border-gray-400 has-checked:border-blue-600 has-checked:ring-1 has-checked:ring-blue-600 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-blue-600 dark:border-white/15 dark:bg-white/5 dark:hover:border-white/25 dark:has-checked:border-blue-400 dark:has-checked:ring-blue-400 dark:has-focus-visible:outline-blue-400">' +
            '<input type="radio" name="sec-erp-provider" value="' + esc(p.id) + '"' + (d.provider === p.id ? " checked" : "") + ' class="absolute inset-0 size-full cursor-pointer appearance-none focus:outline-none" />' +
            '<span class="type-title-card text-default">' + esc(p.tile) + "</span>" +
            ICON.checkCircle("absolute top-2 right-2 hidden size-5 text-blue-600 group-has-checked/tile:block dark:text-blue-400") +
            "</label>"
          );
        }).join("") +
        "</div></fieldset>" +
        infoBox('<p>Your ERP is not listed? Let us know your accounting software provider.</p><p><a href="' + esc(data.guides.help) + '" target="_blank" rel="noopener noreferrer" class="' + LINK + '">Help from Transcard' + ICON.arrowRight + '<span class="sr-only"> (opens in a new tab)</span></a></p>', "mx-auto w-full max-w-md") +
        "</div>";
      footer = footerBar("", '<button type="button" data-sec-next class="' + BTN.primaryXl + ' sm:w-50"' + (d.provider ? "" : " disabled") + ">Next</button>");
    } else if (step === 2) {
      var p = providerById(d.provider);
      body =
        '<div class="flex flex-col gap-6 p-4 sm:p-6">' +
        (d.hideTip ? "" :
          '<div data-sec-tip class="flex gap-3 rounded-md bg-blue-50 p-4 dark:bg-blue-400/10">' + ICON.infoMini("size-5 shrink-0 text-blue-400") +
          '<p class="flex-1 type-body text-blue-700 dark:text-blue-300">To connect to your ERP, an ERP web services user from your organization must enter their credentials. If you do not have these credentials, use the ‘Invite someone to help’ button in this application to send a message to someone from within your business to assist.</p>' +
          '<button type="button" data-sec-tip-close class="' + CLOSE_X + ' -m-1 self-start"><span class="sr-only">Dismiss</span>' + ICON.x + "</button></div>") +
        '<div class="mx-auto flex w-full max-w-md flex-col items-center gap-3 text-center">' +
        '<p class="type-title-card text-brand">' + esc(p.name) + "</p>" +
        '<h3 class="type-title-section text-default">Sign in to your account</h3>' +
        '<p class="rounded-md bg-gray-50 px-4 py-2 type-body text-secondary dark:bg-white/5">Need help? ' + guideLink("See the Integration Guide", data.guides.integration) + "</p></div>" +
        '<form data-sec-form novalidate class="mx-auto flex w-full max-w-md flex-col gap-4">' +
        textField({ id: "sec-erp-user", label: "User ID", reveal: true, value: d.user }) +
        textField({ id: "sec-erp-pass", label: "Password", reveal: true, value: d.pass }) +
        textField({ id: "sec-erp-company", label: "Company", reveal: true, value: d.company }) +
        "</form></div>";
      footer = footerBar(backBtn(), '<button type="button" data-sec-next class="' + BTN.primaryXl + ' sm:w-50">Connect</button>');
    } else {
      var prov = providerById(d.provider);
      body = erpAccountHtml(d, prov, "wizard");
      footer = footerBar(backBtn(), '<button type="button" data-sec-next class="' + BTN.primaryXl + ' sm:w-50">Save</button>');
    }
    var dialog = wideDialog("erp", "max-w-200", header, body, footer, "sec-erp-title");
    bindReveal(dialog);
    wireErpStep(dialog, step);
  }

  function erpAccountHtml(d, prov, mode) {
    var b = biz();
    var connected = d.status === "connected";
    var alert;
    if (connected) {
      alert =
        '<div role="status" class="flex gap-3 rounded-md bg-green-50 p-4 dark:bg-green-400/10">' + ICON.checkCircle("size-5 shrink-0 text-green-500 dark:text-green-400") +
        '<div class="flex flex-col gap-1"><p class="type-label text-green-800 dark:text-green-300">Connection validated</p>' +
        '<p class="type-body text-green-700 dark:text-green-300/80">Your ' + esc(prov.name) + " ERP connection is ready to use in the SMART Hub.</p></div></div>";
    } else if (mode === "details") {
      alert =
        '<div class="flex gap-3 rounded-md bg-red-50 p-4 dark:bg-red-400/10">' + ICON.warnMini("size-5 shrink-0 text-red-500 dark:text-red-400") +
        '<div class="flex flex-col items-start gap-2"><p class="type-label text-red-800 dark:text-red-300">Confirmation of connection required</p>' +
        '<p class="type-body text-red-700 dark:text-red-300/80">Your ' + esc(prov.name) + " ERP connection needs a validation to be usable in the SMART Hub.</p>" +
        '<button type="button" data-sec-validate class="' + BTN.dangerMd + ' mt-1">Validate Connection</button></div></div>';
    } else {
      alert =
        infoBox('<p class="type-label">Confirmation of connection required</p><p>Your ' + esc(prov.name) + " ERP connection needs a token confirmation to be usable in the SMART Hub.</p>") +
        '<div class="flex justify-center"><button type="button" data-sec-validate class="' + BTN.primaryLg + '">Validate Connection</button></div>';
    }
    return (
      '<div class="flex flex-col gap-6 p-4 sm:p-6">' +
      '<div class="flex flex-wrap items-center gap-3 rounded-md bg-gray-50 p-4 dark:bg-white/5">' +
      '<span aria-hidden="true" class="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-gray-800 type-label text-white dark:bg-white/10">' + esc(initials(b.name)) + "</span>" +
      '<div class="flex min-w-0 flex-1 flex-col"><p class="flex flex-wrap items-center gap-2 type-label-large text-default">' + esc(b.legalName || b.name) + statusBadge(d.status) + "</p>" +
      '<p class="truncate type-body text-tertiary">' + esc(d.email) + "</p></div>" +
      (mode === "details" ? '<button type="button" data-sec-edit class="' + BTN.secondaryMd + '">' + ICON.pencil + "Edit</button>" : "") +
      "</div>" +
      '<div data-sec-alert class="flex flex-col gap-6">' + alert + "</div>" +
      '<dl class="grid gap-4 border-t border-gray-200 pt-6 sm:grid-cols-2 dark:border-white/10">' +
      '<div class="flex flex-col gap-1"><dt class="type-label text-tertiary">ERP Software</dt><dd class="type-body text-default">' + esc(prov.name) + "</dd></div>" +
      '<div class="flex flex-col gap-1"><dt class="type-label text-tertiary">Connection Validity</dt><dd class="type-body text-default">' +
      (d.validUntil ? esc(d.validUntil) : '<span class="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-gray-500 dark:bg-white/10 dark:text-gray-400"><span class="sr-only">Not validated yet</span><span aria-hidden="true">--/--/----</span></span>') +
      "</dd></div></dl></div>"
    );
  }

  function validUntil() {
    var d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return ("0" + (d.getMonth() + 1)).slice(-2) + "/" + ("0" + d.getDate()).slice(-2) + "/" + d.getFullYear();
  }

  function validate(btn, d, after) {
    var restore = busy(btn, "Validating…");
    setTimeout(function () {
      restore();
      d.status = "connected";
      d.validUntil = validUntil();
      after();
    }, 900);
  }

  function wireErpStep(dialog, step) {
    var next = dialog.querySelector("[data-sec-next]");
    var back = dialog.querySelector("[data-sec-back]");
    if (back) back.addEventListener("click", function () { erpWizard(step - 1); });
    if (step === 1) {
      dialog.querySelectorAll('input[name="sec-erp-provider"]').forEach(function (r) {
        r.addEventListener("change", function () { erpDraft.provider = r.value; next.disabled = false; });
      });
      next.addEventListener("click", function () { if (erpDraft.provider) erpWizard(2); });
      return;
    }
    if (step === 2) {
      var tipClose = dialog.querySelector("[data-sec-tip-close]");
      if (tipClose) tipClose.addEventListener("click", function () {
        erpDraft.hideTip = true;
        dialog.querySelector("[data-sec-tip]").remove();
        dialog.querySelector("#sec-erp-user").focus();
      });
      var fields = [["sec-erp-user", "user", "Enter your User ID."], ["sec-erp-pass", "pass", "Enter your password."], ["sec-erp-company", "company", "Enter your company."]];
      fields.forEach(function (f) {
        dialog.querySelector("#" + f[0]).addEventListener("input", function (e) {
          erpDraft[f[1]] = e.target.value;
          if (e.target.value.trim()) setFieldError(dialog, f[0], null);
        });
      });
      function submit() {
        var first = null;
        fields.forEach(function (f) {
          var v = (erpDraft[f[1]] || "").trim();
          setFieldError(dialog, f[0], v ? null : f[2]);
          if (!v && !first) first = dialog.querySelector("#" + f[0]);
        });
        if (first) { M().revealField(first, dialog.querySelector("#" + first.id + "-error")); return; }
        var restore = busy(next, "Connecting…");
        setTimeout(function () {
          restore();
          erpDraft.status = erpDraft.status === "connected" ? "connected" : "pending";
          erpDraft.email = applicant().email;
          erpWizard(3);
        }, 700);
      }
      next.addEventListener("click", submit);
      dialog.querySelector("[data-sec-form]").addEventListener("submit", function (e) { e.preventDefault(); submit(); });
      return;
    }
    var v = dialog.querySelector("[data-sec-validate]");
    if (v) v.addEventListener("click", function () {
      validate(v, erpDraft, function () {
        erpWizard(3);
        toast("Connection validated.");
      });
    });
    next.addEventListener("click", function () {
      state.erp = { provider: erpDraft.provider, email: erpDraft.email, status: erpDraft.status, validUntil: erpDraft.validUntil || null };
      state.view = "detail";
      M().close();
      wide = null;
      commit({ focus: "#sec-ds-title" });
      toast(providerById(erpDraft.provider).name + " connected" + (erpDraft.status === "connected" ? "." : ". Validate the connection to start using it."));
    });
  }

  function erpDetails() {
    var d = JSON.parse(JSON.stringify(state.erp));
    var prov = providerById(d.provider);
    var header = headerBar({ id: "sec-erp-details-title", icon: "erp", title: biz().legalName || biz().name });
    var dialog = wideDialog("erp-details", "max-w-200", header, erpAccountHtml(d, prov, "details"),
      footerBar("", '<button type="button" data-sec-save class="' + BTN.primaryXl + ' sm:w-50">Save</button>'), "sec-erp-details-title");
    var v = dialog.querySelector("[data-sec-validate]");
    if (v) v.addEventListener("click", function () {
      validate(v, d, function () {
        state.erp = d;
        commit();
        dialog.querySelector("[data-ob-modal-body]").innerHTML = erpAccountHtml(d, prov, "details");
        wireEdit();
        dialog.querySelector("#sec-erp-details-title").focus();
        toast("Connection validated.");
      });
    });
    function wireEdit() {
      var edit = dialog.querySelector("[data-sec-edit]");
      edit.addEventListener("click", function () {
        wide = null;
        erpWizard(2, { provider: d.provider, status: d.status, validUntil: d.validUntil, email: d.email, hideTip: true });
      });
    }
    wireEdit();
    dialog.querySelector("[data-sec-save]").addEventListener("click", function () { M().close(); wide = null; });
  }

  /* ---------- API: details, new secret, disconnect ---------- */

  function apiDetails() {
    var a = data.api;
    var tips = a.fields;
    function row(key, label, value, o) {
      o = o || {};
      var id = "sec-api-" + key;
      return (
        '<div class="flex items-end gap-3"><div class="min-w-0 flex-1">' +
        textField({ id: id, label: label, value: value, readonly: true, reveal: o.reveal, after: "" }).replace(
          '<label for="' + id + '"',
          '<span class="flex items-center gap-1"><label for="' + id + '"'
        ).replace(esc(label) + "</label>", esc(label) + "</label>" + infoTip(id + "-tip", "About " + label, tips[key]) + "</span>") +
        "</div>" +
        '<div class="mb-2.5 flex size-5 shrink-0 items-center justify-center">' + (o.noCopy ? "" : M().copyButton(label, value)) + "</div></div>"
      );
    }
    var body =
      '<div class="flex flex-col gap-4 p-4 sm:p-6">' +
      row("clientId", "Client ID", a.clientId) +
      row("clientSecret", "Client Secret", "****************", { noCopy: true }) +
      row("scope", "Scope", a.scope) +
      row("accessTokenUrl", "Access Token URL", a.accessTokenUrl) +
      row("payableKey", "Payable Key", a.payableKey, { reveal: true }) +
      row("partyKey", "Party Key", a.partyKey, { reveal: true }) +
      "</div>";
    var dialog = wideDialog("api", "max-w-170", headerBar({ id: "sec-api-title", icon: "erp", title: "Your API Keys and Credentials" }), body,
      footerBar("", '<button type="button" data-sec-generate class="' + BTN.primaryMd + '">Generate New Client Secret</button>'), "sec-api-title");
    bindReveal(dialog);
    // The masked secret field can't be revealed: it is shown once, at creation.
    dialog.querySelector("[data-sec-generate]").addEventListener("click", function () {
      wide = null;
      centered({
        id: "sec-api-sure-title", tone: "danger", title: "Are you sure you want to do this?", ok: "Confirm",
        text: "The current client secret stops working once a new one is created.",
        onOk: function () {
          var secret = "sk_live_" + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 8);
          centered({
            id: "sec-api-created-title", tone: "success", title: "Client Secret Created", ok: "Done", cancel: false,
            text: "Please copy the new client secret and save it somewhere safe. For security reasons, we cannot show it to you again.",
            extra: '<p class="flex items-center gap-3 rounded-md bg-gray-50 px-3 py-2 font-mono text-sm text-default dark:bg-white/5"><span>' + esc(secret) + "</span>" + M().copyButton("client secret", secret) + "</p>",
          });
        },
      });
    });
  }

  function apiDisconnect() {
    centered({
      id: "sec-api-disconnect-title", tone: "danger", title: "Disconnect", text: "Are you sure you want to disconnect?", ok: "Disconnect",
      onOk: function () {
        state.source = null;
        state.api = null;
        state.view = "choices";
        commit({ focus: "#sec-ds-title" });
        toast("API Connection disconnected.");
      },
    });
  }

  /* ---------- bank account: connect wizard, details ---------- */

  var bankDraft = null;

  function bankWizard(draft) {
    bankDraft = draft;
    bankSelect();
  }

  // Step A — "Connect Your Bank Account" (Figma 28555:49446, 512 wide): Who do you bank with? select.
  function bankSelect() {
    var d = bankDraft;
    wide = null;
    var backdrop = M().open(
      '<div class="flex flex-col gap-6 px-6 pb-6">' +
      '<div class="flex flex-col items-center gap-2 text-center">' +
      '<span aria-hidden="true" class="mb-2 inline-flex size-10 items-center justify-center rounded-full bg-blue-600 text-white dark:bg-blue-500">' + ICON.plus + "</span>" +
      '<h2 id="sec-bank-select-title" class="type-title-modal text-default">Connect Your Bank Account</h2>' +
      '<p class="type-description text-tertiary">We’ll connect to your bank to initiate payments from your accounts.</p></div>' +
      selectField({ id: "sec-bank-pick", label: "Who do you bank with?", placeholder: "Select a bank", value: d.bankId, options: data.banks.map(function (b) { return { value: b.id, label: b.name }; }) }) +
      '<div class="flex flex-wrap items-center justify-between gap-2 rounded-md bg-gray-50 px-4 py-3 dark:bg-white/5">' +
      '<span class="inline-flex items-center gap-2 type-label text-default">' + ICON.search + "Don’t see your bank listed?</span>" +
      '<button type="button" data-sec-funding class="' + LINK + '">Set up a Funding Account' + ICON.arrowRight + "</button></div>" +
      "</div>",
      "sec-bank-select-title",
      {
        footer:
          '<div class="grid grid-cols-2 gap-3 border-t border-gray-200 px-6 py-4 dark:border-white/10">' +
          '<button type="button" data-ob-modal-close class="' + BTN.secondaryXl + '">Cancel</button>' +
          '<button type="button" data-sec-next class="' + BTN.primaryXl + '"' + (d.bankId ? "" : " disabled") + ">Continue</button></div>",
      }
    );
    guardSelectEsc(backdrop);
    var sel = backdrop.querySelector("#sec-bank-pick");
    var next = backdrop.querySelector("[data-sec-next]");
    function sync() {
      var v = selectValue(backdrop, "sec-bank-pick");
      if (v) { d.bankId = v; next.disabled = false; }
    }
    sel.addEventListener("change", sync);
    sel.addEventListener("input", sync);
    backdrop.querySelector("el-options").addEventListener("click", function () { setTimeout(sync, 0); });
    backdrop.querySelector("[data-sec-funding]").addEventListener("click", fundingTodo);
    next.addEventListener("click", function () { if (d.bankId) bankStep(1); });
  }

  // TODO(confirm): "Set up a Funding Account" (wiki: contact form → "Your request has been received!") has no frame read yet.
  function fundingTodo() {
    toast("Set up a Funding Account opens here in a later release.", "info");
  }

  function chequeHtml() {
    return (
      '<div aria-hidden="true" class="mx-auto flex w-full max-w-sm flex-col gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 pb-10 dark:border-white/10 dark:bg-white/5">' +
      '<div class="flex items-end gap-3"><span class="h-px flex-1 bg-gray-300 dark:bg-white/15"></span><span class="type-caption text-tertiary">$</span><span class="h-6 w-18 rounded-sm border border-gray-300 dark:border-white/15"></span></div>' +
      '<span class="h-px bg-gray-300 dark:bg-white/15"></span>' +
      '<div class="flex gap-6"><span class="h-px flex-1 bg-gray-300 dark:bg-white/15"></span><span class="h-px flex-1 bg-gray-300 dark:bg-white/15"></span></div>' +
      '<div class="relative flex gap-4">' +
      '<span class="relative rounded-sm border border-blue-600 px-1.5 font-mono text-xs/5 text-default dark:border-blue-400">012345678<span class="absolute top-full left-0 mt-1.5 rounded-sm bg-gray-900 px-2 py-1 font-sans text-xs/4 whitespace-nowrap text-white dark:bg-gray-950 dark:ring-1 dark:ring-white/10">Routing#</span></span>' +
      '<span class="relative rounded-sm border border-blue-600 px-1.5 font-mono text-xs/5 text-default dark:border-blue-400">0987654321<span class="absolute top-full left-0 mt-1.5 rounded-sm bg-gray-900 px-2 py-1 font-sans text-xs/4 whitespace-nowrap text-white dark:bg-gray-950 dark:ring-1 dark:ring-white/10">Account#</span></span>' +
      "</div></div>"
    );
  }

  function radio(name, value, label, checked) {
    return (
      '<label class="inline-flex cursor-pointer items-center gap-2 type-label text-default">' +
      '<input type="radio" name="' + name + '" value="' + value + '"' + (checked ? " checked" : "") +
      ' class="relative size-4 cursor-pointer appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white not-checked:before:hidden checked:border-blue-600 checked:bg-blue-600 hover:border-gray-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-100 dark:border-white/20 dark:bg-white/5 dark:checked:border-blue-500 dark:checked:bg-blue-500 dark:hover:border-white/30 dark:focus-visible:outline-blue-500" />' +
      esc(label) + "</label>"
    );
  }

  // Steps 1–2 "Sign In to Your Account" (Figma 28555:51801 / 28555:55555, 1000 wide).
  function bankStep(step) {
    var d = bankDraft;
    var bank = bankById(d.bankId);
    var b = biz();
    var header = headerBar({ id: "sec-bank-signin-title", title: "Sign In to Your Account", invite: "Invite to Help", step: step, steps: 2 });
    var logo = '<p class="type-title-card tracking-wide text-brand uppercase">' + esc(bank.name) + "</p>";
    var body, footer;
    if (step === 1) {
      if (d.holder == null) {
        d.holder = b.legalName || b.name;
        d.address = data.bankDefaults.address;
        d.state = data.bankDefaults.state;
        d.zip = data.bankDefaults.zip;
        d.country = "United States";
      }
      body =
        '<form data-sec-form novalidate class="mx-auto flex w-full max-w-xl flex-col gap-6 p-4 sm:p-6">' +
        '<div class="flex flex-col items-center gap-3 text-center">' + logo + '<h3 class="type-title-section text-default">Sign In to Your Account</h3></div>' +
        textField({ id: "sec-bank-holder", label: "Name as it appears on the bank account", value: d.holder, autocomplete: "organization" }) +
        '<div class="' + DIVIDER + '"></div>' +
        textField({ id: "sec-bank-address", label: "Address", value: d.address, autocomplete: "street-address" }) +
        selectField({ id: "sec-bank-country", label: "Country", value: "United States", options: [{ value: "United States", label: "United States" }] }) +
        '<div class="grid gap-4 sm:grid-cols-2">' +
        selectField({ id: "sec-bank-state", label: "State / Province", placeholder: "Select a state", value: d.state, options: data.states.map(function (s) { return { value: s, label: s }; }) }) +
        textField({ id: "sec-bank-zip", label: "ZIP / Postal Code", value: d.zip, autocomplete: "postal-code", inputmode: "numeric", maxlength: 10 }) +
        "</div>" +
        '<div class="' + DIVIDER + '"></div>' +
        chequeHtml() +
        '<fieldset class="flex flex-col gap-2"><legend class="mb-2 ' + F().LABEL + '">Account type</legend>' +
        '<div class="flex gap-6">' + radio("sec-bank-type", "savings", "Savings", d.type === "savings") + radio("sec-bank-type", "checking", "Checking", d.type === "checking") + "</div>" +
        '<p id="sec-bank-type-error" role="alert" class="hidden ' + F().ERROR_TEXT + '"></p></fieldset>' +
        textField({ id: "sec-bank-routing", label: "ACH Routing Number", reveal: true, value: d.routing, inputmode: "numeric", maxlength: 9 }) +
        textField({ id: "sec-bank-account", label: "Account Number", reveal: true, value: d.account, inputmode: "numeric", maxlength: 17 }) +
        textField({ id: "sec-bank-company", label: "ACH Company ID", reveal: true, optional: true, value: d.companyId }) +
        "</form>";
    } else {
      var portal = bank.portal
        ? "<p>Access to " + esc(bank.portal) + " for ACH and RTP is required to complete this information. You also will need to obtain API credentials directly from your " + esc(bank.name) + " representative or via the link below:</p>" +
          '<p><a href="' + esc(bank.portalHref) + '" target="_blank" rel="noopener noreferrer" class="' + LINK + '">' + esc(bank.portalLink) + ICON.arrowRight + '<span class="sr-only"> (opens in a new tab)</span></a></p>'
        // TODO(confirm): Figma only shows the Bank of America text; the other banks get this generic line.
        : "<p>Access to your " + esc(bank.name) + " treasury services for ACH and RTP is required to complete this information. You also will need to obtain API credentials directly from your " + esc(bank.name) + " representative.</p>";
      body =
        '<form data-sec-form novalidate class="mx-auto flex w-full max-w-xl flex-col gap-6 p-4 sm:p-6">' +
        '<div class="flex flex-col items-center gap-3 text-center">' + logo +
        '<h3 class="max-w-md type-title-section text-default">Sign in with Your Treasury Services Banking Credentials</h3>' +
        '<p class="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 type-body text-tertiary">Don’t have a treasury account for this bank?' +
        '<button type="button" data-sec-funding class="' + LINK + '">Set up a Funding Account' + ICON.arrowRight + "</button></p></div>" +
        infoBox(portal) +
        '<p class="rounded-md bg-gray-50 p-4 type-body text-secondary dark:bg-white/5">Please ensure that you enter your banking credentials exactly as they were provided by your bank. Failure to do so will result in a connection error that can potentially delay the onboarding process.</p>' +
        '<p class="self-center rounded-md bg-gray-50 px-4 py-2 type-body text-secondary dark:bg-white/5">Need help? ' + guideLink("See the Integration Guide", data.guides.integration) + "</p>" +
        data.treasuryFields.map(function (name, i) {
          d.creds = d.creds || {};
          return textField({ id: "sec-bank-cred-" + i, name: name, label: name, value: d.creds[name] });
        }).join("") +
        '<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">' +
        '<div class="flex flex-col gap-1"><span id="sec-bank-upload-label" class="' + F().LABEL + '">Treasury Services Credentials</span><span class="type-description text-tertiary">Upload .PDF or .DOCX file</span></div>' +
        '<div class="flex w-full flex-col items-center gap-2 sm:max-w-xs"><div data-sec-upload class="w-full"></div>' + badge("blue", "Optional attachment") + "</div></div>" +
        "</form>";
    }
    footer = footerBar(backBtn(), '<button type="button" data-sec-next class="' + BTN.primaryXl + ' sm:w-50">Next' + ICON.chevronRight + "</button>");
    var dialog = wideDialog("bank", "max-w-250", header, body, footer, "sec-bank-signin-title");
    bindReveal(dialog);
    wireBankStep(dialog, step);
  }

  function wireBankStep(dialog, step) {
    var d = bankDraft;
    var next = dialog.querySelector("[data-sec-next]");
    dialog.querySelector("[data-sec-back]").addEventListener("click", function () {
      if (step === 1) bankSelect(); else bankStep(1);
    });
    dialog.querySelectorAll("[data-sec-funding]").forEach(function (f) { f.addEventListener("click", fundingTodo); });
    if (step === 2) {
      data.treasuryFields.forEach(function (name, i) {
        dialog.querySelector("#sec-bank-cred-" + i).addEventListener("input", function (e) { d.creds[name] = e.target.value; });
      });
      if (window.FileUpload) {
        window.FileUpload.mount(dialog.querySelector("[data-sec-upload]"), {
          id: "sec-bank-upload", name: "treasury-credentials", label: "Treasury Services Credentials",
          accept: ".pdf,.doc,.docx", acceptLabel: "PDF, DOC, DOCX up to 10MB", maxSizeMb: 10,
          files: d.file ? [d.file] : [],
          onChange: function (files) { d.file = files && files[0] ? { name: files[0].name, size: files[0].size, type: files[0].type } : null; },
        });
      }
      // TODO(confirm): which treasury fields are required — Figma shows them filled, no error state; none are enforced.
      next.addEventListener("click", function () { bankName(); });
      return;
    }
    var map = { "sec-bank-holder": "holder", "sec-bank-address": "address", "sec-bank-zip": "zip", "sec-bank-routing": "routing", "sec-bank-account": "account", "sec-bank-company": "companyId" };
    Object.keys(map).forEach(function (id) {
      dialog.querySelector("#" + id).addEventListener("input", function (e) {
        d[map[id]] = e.target.value;
        setFieldError(dialog, id, null);
      });
    });
    dialog.querySelectorAll('input[name="sec-bank-type"]').forEach(function (r) {
      r.addEventListener("change", function () { d.type = r.value; showTypeError(null); });
    });
    function showTypeError(msg) {
      var err = dialog.querySelector("#sec-bank-type-error");
      err.textContent = msg || "";
      err.classList.toggle("hidden", !msg);
      dialog.querySelectorAll('input[name="sec-bank-type"]').forEach(function (r) {
        if (msg) r.setAttribute("aria-invalid", "true"); else r.removeAttribute("aria-invalid");
        r.setAttribute("aria-describedby", "sec-bank-type-error");
      });
    }
    function submit() {
      d.state = selectValue(dialog, "sec-bank-state") || d.state;
      var checks = [
        ["sec-bank-holder", (d.holder || "").trim() ? null : "Enter the name on the bank account."],
        ["sec-bank-address", (d.address || "").trim() ? null : "Enter the address."],
        ["sec-bank-zip", /^\d{5}(-\d{4})?$/.test((d.zip || "").trim()) ? null : "Enter a 5-digit ZIP code."],
        ["sec-bank-routing", /^\d{9}$/.test(d.routing || "") ? null : "Enter the 9-digit routing number."],
        ["sec-bank-account", /^\d{4,17}$/.test(d.account || "") ? null : "Enter an account number of 4 to 17 digits."],
      ];
      var first = null;
      checks.forEach(function (c) {
        setFieldError(dialog, c[0], c[1]);
        if (c[1] && !first) first = dialog.querySelector("#" + c[0]);
      });
      setSelectError(dialog, "sec-bank-state", d.state ? null : "Select a state.");
      if (!d.state && !first) first = dialog.querySelector('[data-sec-select="sec-bank-state"]');
      showTypeError(d.type ? null : "Choose an account type.");
      if (!d.type && !first) first = dialog.querySelector('input[name="sec-bank-type"]');
      if (first) { M().revealField(first, dialog.querySelector("#" + (first.id || "sec-bank-type") + "-error")); return; }
      bankStep(2);
    }
    next.addEventListener("click", submit);
    dialog.querySelector("[data-sec-form]").addEventListener("submit", function (e) { e.preventDefault(); submit(); });
    dialog.querySelector("#sec-bank-state").addEventListener("change", function () {
      d.state = selectValue(dialog, "sec-bank-state");
      if (d.state) setSelectError(dialog, "sec-bank-state", null);
    });
  }

  // "Name Your Bank Account" (Figma 28555:58781): optional name, Skip / Next.
  function bankName() {
    var d = bankDraft;
    wide = null;
    var backdrop = M().open(
      '<div class="flex flex-col gap-6 px-6 pb-6">' +
      '<div class="flex flex-col items-center gap-2 text-center">' + '<span class="mb-2">' + tile("bank", "lg") + "</span>" +
      '<h2 id="sec-bank-name-title" class="type-title-modal text-default">Name Your Bank Account</h2>' +
      '<p class="type-description text-tertiary">You can name your bank account to be able to easily keep track of all your payment methods.</p></div>' +
      '<form data-sec-form novalidate>' + textField({ id: "sec-bank-nick", label: "Bank Account Name", optional: true, value: d.name, maxlength: 60 }) + "</form>" +
      "</div>",
      "sec-bank-name-title",
      {
        footer:
          '<div class="grid grid-cols-2 gap-3 border-t border-gray-200 px-6 py-4 dark:border-white/10">' +
          '<button type="button" data-sec-skip class="' + BTN.secondaryXl + '">Skip</button>' +
          '<button type="button" data-sec-next class="' + BTN.primaryXl + '">Next' + ICON.chevronRight + "</button></div>",
      }
    );
    var input = backdrop.querySelector("#sec-bank-nick");
    backdrop.querySelector("[data-sec-skip]").addEventListener("click", function () { d.name = ""; bankWait(); });
    function done() { d.name = input.value.trim(); bankWait(); }
    backdrop.querySelector("[data-sec-next]").addEventListener("click", done);
    backdrop.querySelector("[data-sec-form]").addEventListener("submit", function (e) { e.preventDefault(); done(); });
  }

  // "Please wait" (Figma 28555:65404): busy, no X, then the table.
  function bankWait() {
    var d = bankDraft;
    var backdrop = M().open(
      '<div class="flex flex-col items-center gap-2 px-6 py-8 text-center" aria-live="polite">' +
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" class="mb-2 size-10 animate-spin text-blue-600 motion-reduce:animate-none dark:text-blue-400"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-opacity=".15" stroke-width="2.5" /><path d="M22 12A10 10 0 0 0 12 2" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" /></svg>' +
      '<h2 id="sec-bank-wait-title" class="type-title-modal text-default">Please wait</h2>' +
      '<p class="type-description text-tertiary">This may take a few moments.</p></div>',
      "sec-bank-wait-title",
      { bare: true }
    );
    backdrop.setAttribute("data-busy", "");
    setTimeout(function () {
      backdrop.removeAttribute("data-busy");
      M().close();
      var entry = {
        id: d.id || "ba_" + Date.now().toString(36),
        bankId: d.bankId, name: d.name || "", holder: d.holder, address: d.address, country: d.country || "United States",
        state: d.state, zip: d.zip, type: d.type, routing: d.routing, account: d.account, companyId: d.companyId || "",
        status: d.name ? "connected" : "action",
      };
      var i = state.banks.findIndex(function (b) { return b.id === entry.id; });
      if (i > -1) state.banks[i] = entry; else state.banks.push(entry);
      commit({ focus: "#sec-bank-title" });
      toast(entry.status === "connected" ? "Bank account connected." : "Bank account added. Add a name to finish the connection.");
    }, 1500);
  }

  // Bank "View Details" (Figma 28623:40898): name (fixes Action Required), Edit, Disconnect, masked numbers.
  function bankDetails(id) {
    var b = state.banks.filter(function (x) { return x.id === id; })[0];
    if (!b) return;
    var bank = bankById(b.bankId) || {};
    var missing = b.status === "action";
    function masked(key, label, value) {
      return (
        '<div class="flex flex-col gap-1"><dt class="type-label text-tertiary">' + esc(label) + "</dt>" +
        '<dd class="flex items-center gap-2 type-body text-default tabular-nums"><span data-sec-mask="' + key + '">' + "*".repeat(String(value).length) + "</span>" +
        '<button type="button" data-sec-show="' + key + '" aria-pressed="false" class="inline-flex cursor-pointer rounded-sm text-gray-400 hover:text-gray-600 ' + FOCUS + ' dark:text-gray-500 dark:hover:text-gray-300"><span class="sr-only">Show ' + esc(label) + "</span>" + ICON.eye + ICON.eyeSlash + "</button></dd></div>"
      );
    }
    var body =
      '<div class="flex flex-col gap-6 p-4 sm:p-6">' +
      '<div class="flex flex-wrap items-center gap-3 rounded-md bg-gray-50 p-4 dark:bg-white/5">' + tile("bank") +
      '<div class="flex min-w-0 flex-1 flex-col"><p class="flex flex-wrap items-center gap-2 type-label-large text-default">' + esc(b.name || b.holder) + statusBadge(b.status) + "</p>" +
      '<p class="type-body text-tertiary">' + esc(bank.name) + ", ending in " + esc(String(b.account).slice(-4)) + "</p></div>" +
      '<div class="flex items-center gap-4"><button type="button" data-sec-edit class="' + BTN.secondaryMd + '">' + ICON.pencil + "Edit</button>" +
      '<button type="button" data-sec-disconnect class="inline-flex cursor-pointer items-center gap-1.5 rounded-sm type-link text-red-600 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 dark:text-red-400 dark:hover:text-red-300 dark:focus-visible:outline-red-400">' +
      ICON.unlink.replace("text-gray-400 dark:text-gray-500", "text-current") + "Disconnect</button></div></div>" +
      '<form data-sec-form novalidate class="flex max-w-sm flex-col">' + textField({ id: "sec-bank-rename", label: "Bank Account Name", value: b.name, placeholder: "Name this bank account", maxlength: 60 }) + "</form>" +
      (missing
        ? '<div class="flex gap-3 rounded-md bg-yellow-50 p-4 dark:bg-yellow-400/10">' + ICON.warnMini("size-5 shrink-0 text-yellow-500 dark:text-yellow-400") +
          '<div class="flex flex-col gap-1"><p class="type-label text-yellow-800 dark:text-yellow-300">Bank account name missing</p>' +
          '<p class="type-body text-yellow-700 dark:text-yellow-300/80">Your ERP connector is missing the Bank Account Name. SMART Hub is unable to update your information. Please add one above.</p></div></div>'
        : "") +
      '<dl class="grid gap-4 border-t border-gray-200 pt-6 sm:grid-cols-2 dark:border-white/10">' +
      '<div class="flex flex-col gap-1"><dt class="type-label text-tertiary">Name on the account</dt><dd class="type-body text-default">' + esc(b.holder) + "</dd></div>" +
      '<div class="flex flex-col gap-1"><dt class="type-label text-tertiary">Address</dt><dd class="type-body text-default">' + esc(b.address) + (b.zip && b.address.indexOf(b.zip) === -1 ? " " + esc(b.zip) : "") + "</dd></div>" +
      '<div class="flex flex-col gap-1"><dt class="type-label text-tertiary">Country</dt><dd class="type-body text-default">' + esc(b.country) + "</dd></div>" +
      '<div class="flex flex-col gap-1"><dt class="type-label text-tertiary">State</dt><dd class="type-body text-default">' + esc(b.state) + "</dd></div>" +
      '</dl><dl class="grid gap-4 border-t border-gray-200 pt-6 sm:grid-cols-2 dark:border-white/10">' +
      masked("routing", "ACH Routing Number", b.routing) + masked("account", "Account Number", b.account) +
      "</dl></div>";
    var dialog = wideDialog("bank-details", "max-w-200", headerBar({ id: "sec-bank-details-title", title: b.name || b.holder, invite: false }), body,
      footerBar("", '<button type="button" data-sec-save class="' + BTN.primaryXl + ' sm:w-50" disabled>Save</button>'), "sec-bank-details-title");
    var input = dialog.querySelector("#sec-bank-rename");
    var saveBtn = dialog.querySelector("[data-sec-save]");
    input.addEventListener("input", function () { saveBtn.disabled = input.value.trim() === (b.name || ""); });
    function saveName() {
      var name = input.value.trim();
      if (!name) { setFieldError(dialog, "sec-bank-rename", "Enter a name for this bank account."); input.focus(); return; }
      b.name = name;
      b.status = "connected";
      M().close();
      wide = null;
      commit({ focus: "#sec-bank-title" });
      toast("Bank account name saved.");
    }
    saveBtn.addEventListener("click", saveName);
    dialog.querySelector("[data-sec-form]").addEventListener("submit", function (e) { e.preventDefault(); if (!saveBtn.disabled) saveName(); });
    dialog.addEventListener("click", function (e) {
      var btn = e.target.closest && e.target.closest("[data-sec-show]");
      if (!btn) return;
      var key = btn.getAttribute("data-sec-show");
      var span = dialog.querySelector('[data-sec-mask="' + key + '"]');
      var show = btn.getAttribute("aria-pressed") !== "true";
      span.textContent = show ? b[key] : "*".repeat(String(b[key]).length);
      btn.setAttribute("aria-pressed", String(show));
      btn.querySelector('[data-icon="reveal"]').classList.toggle("hidden", show);
      btn.querySelector('[data-icon="hide"]').classList.toggle("hidden", !show);
      var sr = btn.querySelector(".sr-only");
      sr.textContent = sr.textContent.replace(show ? "Show" : "Hide", show ? "Hide" : "Show");
    });
    dialog.querySelector("[data-sec-edit]").addEventListener("click", function () {
      wide = null;
      bankWizard(JSON.parse(JSON.stringify(b)));
    });
    dialog.querySelector("[data-sec-disconnect]").addEventListener("click", function () {
      wide = null;
      centered({
        id: "sec-bank-disconnect-title", tone: "danger", title: "Disconnect", text: "Are you sure you want to disconnect?", ok: "Disconnect",
        onOk: function () {
          state.banks = state.banks.filter(function (x) { return x.id !== id; });
          commit({ focus: "#sec-bank-title" });
          toast("Bank account disconnected.");
        },
      });
    });
  }

  /* ---------- boot ---------- */

  // Demo / QA: ?connectors=demo → ERP pending + one bank Action Required + one Connected; =api → API Connection;
  // =reset → empty. Overwrites the tab's sessionStorage once.
  function seedDemo() {
    var mode = new URLSearchParams(window.location.search).get("connectors");
    if (!mode) return;
    var d = data.bankDefaults;
    var b = biz();
    var bank = function (id, bankId, name, account) {
      return { id: id, bankId: bankId, name: name, holder: b.legalName || b.name, address: d.address, country: "United States", state: d.state, zip: d.zip, type: "checking", routing: d.routing, account: account, companyId: "", status: name ? "connected" : "action" };
    };
    state = { source: null, view: "choices", erp: null, api: null, banks: [] };
    if (mode === "demo") {
      state.source = "erp";
      state.view = "detail";
      state.erp = { provider: "sage-intacct", email: applicant().email, status: "pending", validUntil: null };
      state.banks = [bank("ba_demo1", "bofa", "", d.account), bank("ba_demo2", "wells", "Payroll account", "7700552218")];
    } else if (mode === "api") {
      state.source = "api";
      state.view = "detail";
      state.api = { created: true };
    }
  }

  if (SE) {
    SE.registerTab(TAB, { render: function (el) { if (data) render(el); else ready.then(function () { render(el); }); } });
    SE.on("readonly-change", function () { draw(); });
    Promise.all([SE.ready, window.DataSource.load(DATA_PATH)])
      .then(function (res) {
        shellData = res[0];
        data = res[1];
        load();
        seedDemo();
        commit({ draw: false });
        resolveReady(data);
      })
      .catch(function (err) { console.error("SMART Enroll Connectors: could not load data", err); });
  }

  return {
    ready: ready,
    isComplete: isComplete,
    incompleteMessage: function () { return isComplete() || !data ? null : data.copy.incomplete; },
    getState: function () { return JSON.parse(JSON.stringify({ source: state.source, erp: state.erp, api: state.api, banks: state.banks })); },
    fxSlot: fxSlot,
  };
})();

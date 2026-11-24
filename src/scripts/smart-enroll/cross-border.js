/**
 * smart-enroll/cross-border.js
 * SMART Enroll — Cross-Border Payments add-on (TCDM-5249, T9): the Transactional tab and the FX Provider
 * section of the Connectors tab. Spec: wiki/products/smart-enroll/flows/cross-border.md.
 * Figma [R1] SMART Enroll jLooCmHwqJcYV5p5d8BHnO: Transactional 28603:49485 · errors 28665:83864 ·
 * FX Provider 28603:87018 · Begin Setup menu 28607:78610 · Already have an account 28607:79535 ·
 * Don't have an account 28607:80577 · In Progress menu 28607:81708 · View details 28607:82675.
 * Data: src/data/smart-enroll-cross-border.json.
 *
 * Needs on the page (before this script): shell.js (SmartEnroll), connectors.js (SmartEnrollConnectors, FX slot),
 * data-source.js, onboarding-modal.js (OBModal), onboarding-field.js (OBField), shared.js (showGlobalTopToast),
 * @tailwindplus/elements (el-dropdown).
 *
 * What it does
 *   Transactional tab (SmartEnroll.registerTab): 3 number fields + Purpose (textarea) + one Yes/No question over
 *   five activities, all required (5 counts → setProgress). "<Field> is required." on blur of an empty field.
 *   Values in sessionStorage[SmartEnroll.storageKey('transactional')] (the shell drops it on add-on discard).
 *   FX Provider: rendered into the Connectors `[data-se-fx-slot]` on every `smart-enroll:connectors-rendered`
 *   while the add-on is added. Provider card → Begin Setup ▾ → "Already have an account" (link steps 1–3) or
 *   "Don't have an account" (Set up with Monex) → Confirm → In Progress badge + ⋯ menu (View details / Cancel).
 *   Cancel (menu) or Cancel request (View details) resets the provider. Not required to submit (D-13).
 *   State in sessionStorage[SmartEnroll.storageKey('connectors-fx')]; cleared when the add-on is discarded.
 *   Demo: ?fx=existing|new|reset (needs the add-on).
 *
 * API (window.SmartEnrollCrossBorder)
 *   ready               Promise, resolves after the data loaded
 *   validate()          shows every missing-field error on the tab (if mounted); returns true when complete
 *   getValues()         copy of the Transactional values
 *   getFx()             copy of { monex: { status: 'in-progress', path: 'existing'|'new' } } (empty = not set up)
 */
window.SmartEnrollCrossBorder = (function () {
  "use strict";

  var DATA_PATH = "../../data/smart-enroll-cross-border.json";
  var ADDON = "cross-border";
  var TAB = "transactional";
  var FX_KEY = "connectors-fx";
  var SE = window.SmartEnroll;
  var M = function () { return window.OBModal; };
  var F = function () { return window.OBField; };

  var data = null;
  var tabRoot = null;
  var values = {};
  var touched = {};
  var fx = {};
  var resolveReady;
  var ready = new Promise(function (r) { resolveReady = r; });

  /* ---------- classes (components skill + connectors.js; SMART System button sizes) ---------- */

  var FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400";
  // Primary / secondary md (32px, Figma dialog footer and Begin Setup).
  var BTN_PRIMARY_MD =
    "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 " + FOCUS +
    " disabled:cursor-not-allowed disabled:bg-blue-300 dark:bg-blue-500 dark:shadow-none dark:hover:bg-blue-400 dark:disabled:bg-blue-500/40 dark:disabled:text-white/60";
  var BTN_SECONDARY_MD =
    "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 aria-expanded:bg-gray-50 " + FOCUS +
    " disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/20 dark:aria-expanded:bg-white/20";
  // Secondary md with red label (Figma "Cancel request").
  var BTN_SECONDARY_DANGER_MD =
    "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-red-600 shadow-xs inset-ring inset-ring-gray-300 hover:bg-red-50 " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 dark:bg-white/10 dark:text-red-400 dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-red-400/10 dark:focus-visible:outline-red-400";
  var LINK = "inline-flex cursor-pointer items-center gap-1.5 rounded-sm type-link text-blue-600 hover:text-blue-700 transition-colors " + FOCUS + " dark:text-blue-400 dark:hover:text-blue-300";
  var LINK_INLINE = "cursor-pointer rounded-sm font-medium text-blue-600 hover:text-blue-700 hover:underline " + FOCUS + " dark:text-blue-400 dark:hover:text-blue-300";
  // Row options button (connectors.js BTN_ICON).
  var BTN_ICON =
    "inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden aria-expanded:ring-2 aria-expanded:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-200 dark:focus-visible:ring-blue-400 dark:aria-expanded:ring-blue-400";
  var MENU =
    "w-56 rounded-md bg-white py-1 shadow-lg outline-1 outline-black/5 [--anchor-gap:--spacing(2)] dark:bg-gray-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10 transition transition-discrete data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-100 data-leave:ease-in motion-reduce:transition-none";
  var MENU_ITEM =
    "flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left text-sm/5 font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:outline-hidden data-focus:bg-gray-100 data-focus:text-gray-900 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white dark:data-focus:bg-white/5 dark:data-focus:text-white";
  var MENU_ITEM_DANGER =
    "flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left text-sm/5 font-medium text-red-600 hover:bg-red-50 hover:text-red-700 focus:outline-hidden data-focus:bg-red-50 data-focus:text-red-700 dark:text-red-400 dark:hover:bg-red-400/10 dark:hover:text-red-300 dark:data-focus:bg-red-400/10 dark:data-focus:text-red-300";
  // Gray badge (Tailwind Plus small badge, rounded-md, like connectors.js statusBadge).
  var BADGE_GRAY =
    "inline-flex shrink-0 items-center gap-1 rounded-md bg-gray-50 px-1.5 py-0.5 text-xs/4 font-medium text-gray-600 inset-ring inset-ring-gray-500/10 dark:bg-gray-400/10 dark:text-gray-400 dark:inset-ring-gray-400/20";
  // Yes / No choice: Secondary sm look on a radio label; checked = blue tint; error = red ring (new, components skill).
  var CHOICE =
    "relative inline-flex min-w-12 cursor-pointer items-center justify-center rounded px-2 py-1 type-button uppercase text-gray-900 bg-white shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 " +
    "has-checked:bg-blue-50 has-checked:text-blue-700 has-checked:inset-ring-blue-600 has-checked:hover:bg-blue-100 " +
    "group-data-invalid/yn:inset-ring-red-300 " +
    "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-blue-600 " +
    "has-disabled:cursor-not-allowed has-disabled:opacity-50 has-disabled:hover:bg-white " +
    "dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/20 " +
    "dark:has-checked:bg-blue-400/10 dark:has-checked:text-blue-300 dark:has-checked:inset-ring-blue-400 dark:has-checked:hover:bg-blue-400/20 " +
    "dark:group-data-invalid/yn:inset-ring-red-400/50 dark:has-focus-visible:outline-blue-400 dark:has-disabled:hover:bg-white/10";
  // Section card (connectors.js CARD).
  var CARD = "flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-xs sm:p-6 dark:border-white/10 dark:bg-white/5 dark:shadow-none";

  /* ---------- icons (Heroicons mini 20 unless noted) ---------- */

  function svg(path, cls, evenodd) {
    return '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="' + cls + '"><path' + (evenodd ? ' fill-rule="evenodd" clip-rule="evenodd"' : "") + ' d="' + path + '" /></svg>';
  }
  var P = {
    userPlus: "M10 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM16.25 5.75a.75.75 0 0 0-1.5 0v2h-2a.75.75 0 0 0 0 1.5h2v2a.75.75 0 0 0 1.5 0v-2h2a.75.75 0 0 0 0-1.5h-2v-2Z",
    info: "M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z",
    phone: "M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.716 3.223a1.5 1.5 0 0 1-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 0 0 6.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 0 1 1.767-1.052l3.223.716A1.5 1.5 0 0 1 18 15.352V16.5a1.5 1.5 0 0 1-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 0 1 2.43 8.326 13.019 13.019 0 0 1 2 5V3.5Z",
    envelope: "M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3ZM19 8.839l-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z",
    chevronDown: "M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z",
    dotsH: "M3 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM8.5 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM15.5 8.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z",
    sparkles: "M15.98 1.804a1 1 0 0 0-1.96 0l-.24 1.192a1 1 0 0 1-.784.785l-1.192.238a1 1 0 0 0 0 1.962l1.192.238a1 1 0 0 1 .785.785l.238 1.192a1 1 0 0 0 1.962 0l.238-1.192a1 1 0 0 1 .785-.785l1.192-.238a1 1 0 0 0 0-1.962l-1.192-.238a1 1 0 0 1-.785-.785l-.238-1.192ZM6.949 5.684a1 1 0 0 0-1.898 0l-.683 2.051a1 1 0 0 1-.633.633l-2.051.683a1 1 0 0 0 0 1.898l2.051.684a1 1 0 0 1 .633.632l.683 2.051a1 1 0 0 0 1.898 0l.683-2.051a1 1 0 0 1 .633-.633l2.051-.683a1 1 0 0 0 0-1.898l-2.051-.683a1 1 0 0 1-.633-.633L6.95 5.684ZM13.949 13.684a1 1 0 0 0-1.898 0l-.184.551a1 1 0 0 1-.632.633l-.551.183a1 1 0 0 0 0 1.898l.551.183a1 1 0 0 1 .633.633l.183.551a1 1 0 0 0 1.898 0l.184-.551a1 1 0 0 1 .632-.633l.551-.183a1 1 0 0 0 0-1.898l-.551-.184a1 1 0 0 1-.633-.632l-.183-.551Z",
  };
  var ICON = {
    userPlus: svg(P.userPlus, "size-5"),
    arrowRight: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="size-4"><path fill-rule="evenodd" d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z" clip-rule="evenodd" /></svg>',
    // Amount filter prefix (components skill: Figma Icon20/Solid "$", bills-and-payables.html).
    dollar: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.9999 2C10.9999 1.44772 10.5522 1 9.99988 1C9.44759 1 8.99988 1.44772 8.99988 2V3.07498C6.65825 3.43371 4.99988 5.03858 4.99988 7C4.99988 8.96142 6.65825 10.5663 8.99988 10.925V14.9249C8.28519 14.8122 7.77152 14.5905 7.42483 14.3873C7.17579 14.2413 6.79177 13.8893 6.79177 13.8893C6.45923 13.4578 5.8407 13.3714 5.40227 13.6982C4.95945 14.0283 4.86879 14.6558 5.19884 15.0986C5.19884 15.0986 5.43609 15.3705 5.53528 15.4636C5.73371 15.6498 6.02272 15.8837 6.41344 16.1127C7.02974 16.474 7.88157 16.8126 8.99988 16.9433V18C8.99988 18.5523 9.44759 19 9.99988 19C10.5522 19 10.9999 18.5523 10.9999 18V16.9411C12.1388 16.8009 13.0588 16.4132 13.7409 15.8135C14.6201 15.0405 14.9999 14.0047 14.9999 13C14.9999 12.0588 14.7218 11.007 13.8511 10.2029C13.1686 9.57251 12.2186 9.18454 10.9999 9.05167V5.10673C11.5005 5.22046 11.8712 5.40776 12.1327 5.58205C12.3429 5.72223 12.5402 5.88371 12.6684 6.05562C13 6.5 13.5992 6.63563 14.0546 6.33205C14.5141 6.0257 14.6383 5.40483 14.3319 4.9453C14.2809 4.86873 14.1203 4.67298 14.0316 4.579C13.8543 4.39127 13.5943 4.15277 13.2421 3.91795C12.7031 3.55861 11.9621 3.21778 10.9999 3.07298V2ZM8.99988 5.10182C7.58473 5.41216 6.99988 6.36373 6.99988 7C6.99988 7.63627 7.58473 8.58784 8.99988 8.89818V5.10182ZM10.9999 11.0673V14.9203C11.6836 14.8011 12.1339 14.5634 12.4203 14.3115C12.8207 13.9595 12.9999 13.4953 12.9999 13C12.9999 12.4412 12.8416 11.993 12.4942 11.6721C12.2319 11.4299 11.7783 11.1828 10.9999 11.0673Z" /></svg>',
    // shell.js "in progress" mark (dashed ring).
    dashed: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-dasharray="2.6 2.6" aria-hidden="true" class="size-3"><circle cx="10" cy="10" r="7.25" /></svg>',
  };

  /* ---------- helpers ---------- */

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fill(text, provider) { return String(text || "").replace(/\{provider\}/g, provider.name); }

  function toast(message, tone) {
    if (typeof window.showGlobalTopToast === "function") window.showGlobalTopToast(message, { tone: tone || "success" });
  }

  function readOnly() { return SE && SE.isReadOnly ? SE.isReadOnly() : false; }
  function added() { return !!(SE && SE.hasAddon && SE.hasAddon(ADDON)); }

  function readStore(tabId) {
    try { return JSON.parse(window.sessionStorage.getItem(SE.storageKey(tabId))) || {}; } catch (e) { return {}; }
  }
  function writeStore(tabId, value) {
    try {
      if (value === null) window.sessionStorage.removeItem(SE.storageKey(tabId));
      else window.sessionStorage.setItem(SE.storageKey(tabId), JSON.stringify(value));
    } catch (e) { /* private mode */ }
  }

  function providerById(id) { return (data.fx.providers || []).filter(function (p) { return p.id === id; })[0]; }

  function newTabLink(href, label, cls) {
    return '<a href="' + esc(href) + '" target="_blank" rel="noopener noreferrer" class="' + cls + '">' + label + '<span class="sr-only"> (opens in a new tab)</span></a>';
  }

  /* ================= Transactional tab ================= */

  function fields() { return data.transactional.fields; }

  function isFilled(id) { return String(values[id] || "").trim() !== ""; }

  function counts() {
    var filled = fields().filter(function (f) { return isFilled(f.id); }).length + (values.activities ? 1 : 0);
    return { required: fields().length + 1, filled: filled };
  }

  function commitTab() {
    writeStore(TAB, values);
    SE.setProgress(TAB, counts());
  }

  function inputHtml(f) {
    var id = "sxb-" + f.id;
    var v = values[f.id] || "";
    var described = id + "-error" + (f.help ? " " + id + "-help" : "");
    var control;
    if (f.kind === "text") {
      control = '<textarea id="' + id + '" name="' + f.id + '" rows="3" aria-invalid="false" aria-describedby="' + described + '" class="' + F().TEXTAREA + ' resize-y">' + esc(v) + "</textarea>";
    } else {
      var money = f.kind === "money";
      control =
        '<div class="relative">' +
        (money ? '<span aria-hidden="true" class="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center text-gray-400 dark:text-gray-500">' + ICON.dollar + "</span>" : "") +
        '<input id="' + id + '" name="' + f.id + '" type="text" inputmode="' + (money ? "decimal" : "numeric") + '" autocomplete="off"' +
        ' placeholder="' + esc(f.placeholder) + '" value="' + esc(v) + '" aria-invalid="false" aria-describedby="' + described + '" class="' + F().INPUT + (money ? " pl-10" : "") + '" />' +
        F().errorIcon() + "</div>";
    }
    return (
      // Number fields: a 2-row subgrid from md (label | field + error) so the inputs line up when one label wraps.
      '<div class="flex flex-col gap-1' + (f.kind === "text" ? " md:col-span-2" : " md:row-span-2 md:grid md:grid-rows-subgrid md:gap-y-1") + '">' +
      '<label for="' + id + '" class="' + F().LABEL + (f.kind === "text" ? "" : " md:self-end") + '">' + esc(f.label) + "</label>" +
      '<div class="flex flex-col gap-1">' +
      control +
      (f.help ? '<p id="' + id + '-help" class="' + F().HELPER + '">' + esc(f.help) + "</p>" : "") +
      '<p id="' + id + '-error" role="alert" class="hidden ' + F().ERROR_TEXT + '"></p>' +
      "</div>" +
      "</div>"
    );
  }

  function activitiesHtml() {
    var a = data.transactional.activities;
    var choice = function (value, label) {
      return '<label class="' + CHOICE + '"><input type="radio" name="sxb-activities" value="' + value + '"' + (values.activities === value ? " checked" : "") +
        ' class="sr-only" />' + label + "</label>";
    };
    return (
      '<div class="flex flex-col gap-4 rounded-md bg-gray-50 p-4 sm:flex-row sm:items-start sm:justify-between md:col-span-2 dark:bg-white/5">' +
      '<div class="flex min-w-0 flex-col gap-3">' +
      '<p id="sxb-activities-q" class="type-label text-default">' + esc(a.question) + "</p>" +
      '<ul id="sxb-activities-list" role="list" class="list-disc pl-5 type-body text-secondary">' +
      a.items.map(function (item) { return "<li>" + esc(item) + "</li>"; }).join("") + "</ul>" +
      '<p id="sxb-activities-error" role="alert" class="hidden ' + F().ERROR_TEXT + '"></p>' +
      "</div>" +
      '<div role="radiogroup" data-sxb-yn aria-labelledby="sxb-activities-q" aria-describedby="sxb-activities-list sxb-activities-error" class="group/yn flex shrink-0 gap-3">' +
      choice("yes", "Yes") + choice("no", "No") +
      "</div></div>"
    );
  }

  function renderTab(el) {
    tabRoot = el;
    values = readStore(TAB);
    touched = {};
    el.innerHTML =
      '<div class="grid gap-x-8 gap-y-6 md:grid-cols-2">' +
      fields().map(inputHtml).join("") +
      activitiesHtml() +
      "</div>";
    if (!el.hasAttribute("data-sxb-bound")) {
      el.setAttribute("data-sxb-bound", "");
      el.addEventListener("input", onTabInput);
      el.addEventListener("focusout", onTabBlur);
      el.addEventListener("change", onTabChange);
    }
    commitTab();
  }

  function fieldById(id) { return fields().filter(function (f) { return f.id === id; })[0]; }

  function sanitize(f, raw) {
    if (f.kind === "count") return raw.replace(/[^\d,]/g, "");
    if (f.kind === "money") return raw.replace(/[^\d.,]/g, "");
    return raw;
  }

  function formatNumber(f, raw) {
    var n = parseFloat(String(raw).replace(/,/g, ""));
    if (!isFinite(n)) return "";
    if (f.kind === "count") return Math.round(n).toLocaleString("en-US");
    return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function showFieldError(f, on) {
    if (!tabRoot) return;
    var input = tabRoot.querySelector("#sxb-" + f.id);
    if (!input) return;
    F().setError(input, on, tabRoot.querySelector("#sxb-" + f.id + "-error"), on ? f.label + " is required." : "");
  }

  function showActivitiesError(on) {
    if (!tabRoot) return;
    var group = tabRoot.querySelector("[data-sxb-yn]");
    var err = tabRoot.querySelector("#sxb-activities-error");
    group.toggleAttribute("data-invalid", on);
    err.textContent = on ? data.transactional.activities.error : "";
    err.classList.toggle("hidden", !on);
  }

  function onTabInput(e) {
    var t = e.target;
    var f = t.name && fieldById(t.name);
    if (!f) return;
    var clean = sanitize(f, t.value);
    if (clean !== t.value) t.value = clean;
    values[f.id] = t.value;
    if (isFilled(f.id)) showFieldError(f, false);
    commitTab();
  }

  function onTabBlur(e) {
    var t = e.target;
    var f = t.name && fieldById(t.name);
    if (!f || readOnly()) return;
    touched[f.id] = true;
    if (f.kind !== "text" && isFilled(f.id)) {
      t.value = formatNumber(f, t.value);
      values[f.id] = t.value;
      commitTab();
    }
    showFieldError(f, !isFilled(f.id));
  }

  function onTabChange(e) {
    if (e.target.name !== "sxb-activities") return;
    values.activities = e.target.value;
    showActivitiesError(false);
    commitTab();
  }

  function validate() {
    if (!data) return false;
    var ok = true;
    fields().forEach(function (f) {
      var missing = !isFilled(f.id);
      if (missing) ok = false;
      showFieldError(f, missing);
    });
    if (!values.activities) ok = false;
    showActivitiesError(!values.activities);
    return ok;
  }

  /* ================= FX Provider (Connectors slot) ================= */

  function slot() {
    var C = window.SmartEnrollConnectors;
    return C && C.fxSlot ? C.fxSlot() : null;
  }

  function saveFx() { writeStore(FX_KEY, fx); }

  function renderFx(target, focusSel) {
    var el = target || slot();
    if (!el || !data) return;
    if (!added()) {
      el.innerHTML = "";
      el.hidden = true;
      return;
    }
    var c = data.fx;
    el.hidden = false;
    el.innerHTML =
      '<section aria-labelledby="sxb-fx-title" class="' + CARD + '">' +
      '<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">' +
      '<h2 id="sxb-fx-title" tabindex="-1" class="type-title-section text-default focus:outline-none">' + esc(c.title) + "</h2>" +
      '<button type="button" data-se-invite="connectors-fx" class="' + LINK + '">Invite someone to help' + ICON.userPlus + "</button>" +
      "</div>" +
      '<p class="type-description text-tertiary">' + esc(c.text) + "</p>" +
      '<div class="flex gap-3 rounded-md bg-gray-50 p-4 dark:bg-white/5">' +
      svg(P.info, "size-5 shrink-0 text-gray-400 dark:text-gray-500", true) +
      '<div class="flex min-w-0 flex-col gap-4 type-body text-secondary">' + c.info.map(function (t) { return "<p>" + esc(t) + "</p>"; }).join("") + "</div>" +
      "</div>" +
      '<ul role="list" class="grid gap-4 lg:grid-cols-2">' + c.providers.map(providerCardHtml).join("") + "</ul>" +
      "</section>";
    if (!el.hasAttribute("data-sxb-bound")) {
      el.setAttribute("data-sxb-bound", "");
      el.addEventListener("click", onFxClick);
    }
    if (focusSel) {
      var f = el.querySelector(focusSel);
      if (f) f.focus();
    }
  }

  function logoHtml(p, cls) {
    return '<span class="' + cls + ' font-bold tracking-wide text-brand uppercase">' + esc(p.logo) + "</span>";
  }

  function contactsHtml(p, inline) {
    var row = function (path, text, evenodd) {
      return '<span class="flex min-w-0 items-center gap-2">' + svg(path, "size-5 shrink-0 text-gray-400 dark:text-gray-500", evenodd) +
        '<span class="truncate" title="' + esc(text) + '">' + esc(text) + "</span></span>";
    };
    return inline
      ? '<div class="flex flex-wrap items-center gap-x-6 gap-y-2 type-body text-default">' + row(P.phone, p.phone, true) +
        '<span aria-hidden="true" class="hidden h-5 w-px bg-gray-200 sm:block dark:bg-white/10"></span>' + row(P.envelope, p.email) + "</div>"
      : '<div class="flex flex-col gap-2 type-body text-secondary">' + row(P.phone, p.phone, true) + row(P.envelope, p.email) + "</div>";
  }

  function providerCardHtml(p) {
    var st = fx[p.id];
    var action;
    if (st && st.status === "in-progress") {
      action =
        '<div class="flex items-center gap-2">' +
        '<span class="' + BADGE_GRAY + '">' + ICON.dashed + "In Progress</span>" +
        '<el-dropdown class="inline-block">' +
        '<button type="button" data-sxb-options="' + p.id + '" class="' + BTN_ICON + '"><span class="sr-only">Open options for ' + esc(p.name) + "</span>" + svg(P.dotsH, "size-5") + "</button>" +
        '<el-menu anchor="bottom end" popover class="' + MENU + '">' +
        '<button type="button" data-sxb="details" data-sxb-id="' + p.id + '" class="' + MENU_ITEM + '">View details</button>' +
        '<button type="button" data-sxb="cancel" data-sxb-id="' + p.id + '" class="' + MENU_ITEM_DANGER + '">Cancel<span class="sr-only"> ' + esc(p.name) + " request</span></button>" +
        "</el-menu></el-dropdown></div>";
    } else {
      action =
        '<el-dropdown class="inline-block">' +
        '<button type="button" data-sxb-begin="' + p.id + '" class="' + BTN_SECONDARY_MD + '">Begin Setup<span class="sr-only"> with ' + esc(p.name) + "</span>" +
        svg(P.chevronDown, "-mr-1 size-5 text-gray-400 dark:text-gray-500", true) + "</button>" +
        '<el-menu anchor="bottom end" popover class="' + MENU + '">' +
        '<button type="button" data-sxb="existing" data-sxb-id="' + p.id + '" class="' + MENU_ITEM + '">Already have an account</button>' +
        '<button type="button" data-sxb="new" data-sxb-id="' + p.id + '" class="' + MENU_ITEM + '">Don\'t have an account</button>' +
        "</el-menu></el-dropdown>";
    }
    return (
      '<li class="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 sm:p-5 dark:border-white/10 dark:bg-white/5">' +
      // The action wraps under the name on narrow cards instead of squeezing the name.
      '<div class="flex flex-wrap items-center justify-between gap-3">' +
      '<div class="flex min-w-max flex-1 items-center gap-3">' +
      logoHtml(p, "text-xl/7") +
      '<span aria-hidden="true" class="h-6 w-px bg-gray-200 dark:bg-white/10"></span>' +
      '<h3 class="type-label text-default">' + esc(p.name) + "</h3></div>" +
      action +
      "</div>" +
      contactsHtml(p, false) +
      "</li>"
    );
  }

  function closeMenu(el) {
    var menu = el.closest("el-menu");
    if (menu && menu.hidePopover) {
      try { menu.hidePopover(); } catch (e) { /* closed */ }
      var trigger = menu.parentElement && menu.parentElement.querySelector("button");
      if (trigger) trigger.focus();
    }
  }

  function onFxClick(e) {
    var el = e.target.closest && e.target.closest("[data-sxb]");
    if (!el || readOnly()) return;
    var p = providerById(el.getAttribute("data-sxb-id"));
    if (!p) return;
    closeMenu(el);
    switch (el.getAttribute("data-sxb")) {
      case "existing": setupDialog(p, "existing", false); break;
      case "new": setupDialog(p, "new", false); break;
      case "details": setupDialog(p, (fx[p.id] || {}).path || "existing", true); break;
      case "cancel": cancelRequest(p); break;
    }
  }

  function setInProgress(p, path) {
    fx[p.id] = { status: "in-progress", path: path };
    saveFx();
    renderFx(null, '[data-sxb-options="' + p.id + '"]');
    toast(fill(data.fx.toast.requested, p));
  }

  // Figma has no confirm step for Cancel / Cancel request: it resets at once. TODO(confirm).
  function cancelRequest(p) {
    delete fx[p.id];
    saveFx();
    renderFx(null, '[data-sxb-begin="' + p.id + '"]');
    toast(fill(data.fx.toast.cancelled, p));
  }

  /**
   * Monex dialog (Figma 28607:79535 / 28607:80577; View details 28607:82675). OBModal, bare, own header:
   * logo + standard X. Setup: Cancel / Confirm → In Progress. Details: Cancel request → reset.
   */
  function setupDialog(p, path, details) {
    var c = p[path];
    var body;
    if (path === "existing") {
      var steps = c.steps.map(function (s, i) {
        var text = esc(s).replace("{here}", newTabLink(p.linkUrl, "here", LINK_INLINE));
        return '<li class="flex gap-3"><span aria-hidden="true" class="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-gray-400 text-xs/4 font-medium text-white dark:bg-white/20">' + (i + 1) + "</span>" +
          '<span class="min-w-0">' + text + "</span></li>";
      }).join("");
      body = '<ol role="list" class="flex flex-col gap-3 type-body text-default">' + steps + "</ol>";
    } else {
      body =
        '<div class="flex flex-col gap-4 type-body text-default">' + c.paragraphs.map(function (t) { return "<p>" + esc(t) + "</p>"; }).join("") + "</div>" +
        '<div class="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-linear-to-r from-blue-50 to-blue-50/40 p-4 dark:from-blue-400/10 dark:to-blue-400/5">' +
        '<span class="flex items-center gap-2 type-label text-default">' + svg(P.sparkles, "size-5 shrink-0 text-blue-600 dark:text-blue-400", true) + esc(c.cta) + "</span>" +
        newTabLink(p.website, esc(c.ctaLink) + ICON.arrowRight, LINK) +
        "</div>";
    }
    var footer = details
      ? '<button type="button" data-sxb-cancel-request class="' + BTN_SECONDARY_DANGER_MD + '">Cancel request</button>'
      : '<button type="button" data-ob-modal-close class="' + BTN_SECONDARY_MD + '">Cancel</button>' +
        '<button type="button" data-sxb-confirm class="' + BTN_PRIMARY_MD + '">Confirm</button>';
    var backdrop = M().open(
      '<div class="flex flex-col gap-6 px-4 pb-6 sm:px-6">' +
      '<div class="flex flex-col gap-1 border-b border-gray-200 pb-4 dark:border-white/10">' +
      '<h2 id="sxb-dialog-title" class="type-title-modal text-default">' + esc(c.title) + "</h2>" +
      '<p class="type-description text-tertiary">' + esc(c.text) + "</p></div>" +
      body +
      '<section aria-labelledby="sxb-contact-title" class="flex flex-col gap-4">' +
      '<h3 id="sxb-contact-title" class="border-b border-gray-200 pb-3 type-title-card text-default dark:border-white/10">' + esc(data.fx.contactTitle) + "</h3>" +
      contactsHtml(p, true) +
      '<p class="rounded-md bg-gray-50 p-3 type-caption text-secondary dark:bg-white/5">' + esc(fill(data.fx.disclaimer, p)) + "</p>" +
      "</section></div>",
      "sxb-dialog-title",
      {
        bare: true,
        header:
          '<div class="flex items-start justify-between gap-4 px-4 pt-4 pb-2 sm:pl-6">' +
          '<span class="pt-2">' + logoHtml(p, "text-2xl/8") + "</span>" +
          M().closeButton("data-ob-modal-close", "shrink-0") + "</div>",
        footer: '<div class="flex justify-end gap-3 border-t border-gray-200 px-4 py-4 sm:px-6 dark:border-white/10">' + footer + "</div>",
        panelClass: "relative flex w-full max-w-186 flex-col rounded-lg bg-white shadow-xl dark:bg-gray-900 dark:ring-1 dark:ring-white/10",
      }
    );
    var confirm = backdrop.querySelector("[data-sxb-confirm]");
    if (confirm) confirm.addEventListener("click", function () { M().close(); setInProgress(p, path); });
    var cancel = backdrop.querySelector("[data-sxb-cancel-request]");
    if (cancel) cancel.addEventListener("click", function () { M().close(); cancelRequest(p); });
  }

  /* ---------- add-on lifecycle ---------- */

  function syncProgress() {
    if (!data || !added()) return;
    values = readStore(TAB);
    SE.setProgress(TAB, counts());
  }

  function discard() {
    values = {};
    touched = {};
    tabRoot = null;
    fx = {};
    writeStore(FX_KEY, null);
    renderFx();
  }

  function seedDemo() {
    var mode = new URLSearchParams(window.location.search).get("fx");
    if (!mode || !added()) return;
    if (mode === "reset") fx = {};
    else if (mode === "existing" || mode === "new") fx = { monex: { status: "in-progress", path: mode } };
    saveFx();
  }

  function init() {
    if (!SE) return;
    SE.registerTab(TAB, { render: function (el) { if (data) renderTab(el); else ready.then(function () { renderTab(el); }); } });
    document.addEventListener("smart-enroll:connectors-rendered", function (e) { renderFx(e.detail && e.detail.slot); });
    SE.on("addon-change", function (d) {
      if (d.addon !== ADDON) return;
      if (d.added) syncProgress();
      renderFx();
    });
    SE.on("addon-discard", function (d) { if (d.addon === ADDON) discard(); });
    Promise.all([window.DataSource.load(DATA_PATH), SE.ready])
      .then(function (res) {
        data = res[0];
        if (added()) fx = readStore(FX_KEY);
        else writeStore(FX_KEY, null);
        seedDemo();
        syncProgress();
        renderFx();
        resolveReady();
      })
      .catch(function (err) { console.error("SMART Enroll Cross-Border: could not load data", err); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  return {
    ready: ready,
    validate: validate,
    getValues: function () { return JSON.parse(JSON.stringify(values)); },
    getFx: function () { return JSON.parse(JSON.stringify(fx)); },
  };
})();

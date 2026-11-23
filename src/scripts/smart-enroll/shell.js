/**
 * smart-enroll/shell.js
 * SMART Enroll application shell (TCDM-5241, T1). Own shell, not <app-nav>/<app-topbar>.
 * Spec: wiki/products/smart-enroll/flows/application-shell.md (D-10, D-11, D-12, D-14).
 * Figma [R1] SMART Enroll jLooCmHwqJcYV5p5d8BHnO: 28107:8955 (menu anatomy), 28471:37074 (standard frame),
 * status boxes 28471:32962 / 31765 / 33991 / 35020 / 36047.
 *
 * Page: src/pages/smart-enroll/application.html. Data: src/data/smart-enroll.json.
 * Needs: data-source.js, onboarding-modal.js (OBModal, add-on remove confirm), shared.js (data-tooltip,
 * showGlobalTopToast), @tailwindplus/elements (business switcher, demo status select), file-upload.js.
 *
 * API (window.SmartEnroll) — for the tab tasks (T2+):
 *   ready                      Promise → data (the JSON)
 *   registerTab(id, renderer)  renderer = fn(el, ctx) or { render(el, ctx) }; ctx = { tabId, readOnly, status,
 *                              data, addons }. Called once when the tab is first shown (and again via rerender(id)).
 *                              The body is wrapped in a <fieldset> that is `disabled` while read-only.
 *   rerender(id)
 *   setProgress(id, { required, filled })   per-tab counts → progress % + tab icon (✓ / in progress / empty)
 *   getProgress()              { percent, required, filled, tabs: { id: { required, filled, state } } }
 *   getStatus() / setStatus(id) / isReadOnly()
 *   getAddons() / hasAddon(id) / addAddon(id) / removeAddon(id, { confirm: false })
 *   getTabs() (visible) / getActiveTab() / goToTab(id) / next() / prev()
 *   on(name, fn) → off()       events on document as `smart-enroll:<name>` CustomEvents:
 *     tab-change {tabId, previous} · progress {percent,…} · status-change {status, previous, readOnly} ·
 *     readonly-change {readOnly} · addon-change {addon, added, tabs} · addon-discard {addon, tabs} ·
 *     business-change {business} · invite {source} · submit {} (cancelable: preventDefault = handled)
 *   storageKey(tabId)          sessionStorage key a tab should keep its values in; dropped on add-on discard.
 */
window.SmartEnroll = (function () {
  "use strict";

  var DATA_PATH = "../../data/smart-enroll.json";
  var ROOT = "../../";
  var KEY = { status: "se_status_v1", addons: "se_addons_v1", business: "se_business_v1" };
  var LG = window.matchMedia("(min-width: 1024px)");

  var state = {
    data: null,
    status: "not-submitted",
    addons: {},
    businessId: null,
    activeTab: null,
    progress: {},
  };
  var renderers = {};
  var mounted = {};
  var refs = {};
  var resolveReady;
  var ready = new Promise(function (resolve) { resolveReady = resolve; });

  /* ---------- classes (copied from the components skill; SMART System button sizes) ---------- */

  var FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400";
  // Secondary lg (40px, Figma Button/Secondary Size=lg).
  var BTN_SECONDARY_LG =
    "inline-flex cursor-pointer items-center gap-2 rounded-md bg-white px-3 py-2 text-base font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 aria-expanded:bg-gray-50 " + FOCUS +
    " dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/20 dark:aria-expanded:bg-white/20";
  // Secondary / primary / danger xl (44px) for dialogs.
  var BTN_SECONDARY_XL =
    "inline-flex w-full cursor-pointer items-center justify-center rounded-md bg-white px-3.5 py-2.5 text-base font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 " + FOCUS +
    " dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/20";
  var BTN_DANGER_XL =
    "inline-flex w-full cursor-pointer items-center justify-center rounded-md bg-red-600 px-3.5 py-2.5 text-base font-semibold text-white shadow-xs hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 dark:bg-red-500 dark:shadow-none dark:hover:bg-red-400 dark:focus-visible:outline-red-400";
  // Link primary (Add / Invite actions).
  var LINK = "inline-flex cursor-pointer items-center gap-1.5 rounded-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors " + FOCUS + " dark:text-blue-400 dark:hover:text-blue-300";
  // Previous / next tab in the card footer (text button, no fill at rest).
  var BTN_NAV =
    "-mx-2 inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 type-button text-gray-700 hover:bg-gray-100 hover:text-gray-900 " + FOCUS + " dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white";
  // Underline tabs (Card details page, card-manager-details.js).
  var TAB_BASE =
    "inline-flex h-10.5 shrink-0 cursor-pointer items-center gap-2 border-b-2 py-2.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400";
  var TAB_ON = "border-blue-500 text-blue-600 hover:text-blue-700 dark:border-blue-400 dark:text-blue-300 dark:hover:text-blue-200";
  var TAB_OFF = "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-white/20 dark:hover:text-gray-200";
  // Menu items (el-menu, card-manager-details.js).
  var MENU_ITEM =
    "flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left text-sm/5 font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:outline-hidden data-focus:bg-gray-100 data-focus:text-gray-900 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white dark:data-focus:bg-white/5 dark:data-focus:text-white";
  // Select field trigger (components skill).
  var SELECT_TRIGGER =
    "group/select grid w-full cursor-default grid-cols-1 rounded-md bg-white py-1.5 pr-2 pl-3 text-left text-gray-900 outline-1 -outline-offset-1 outline-gray-300 hover:outline-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:hover:outline-white/20 dark:focus-visible:outline-blue-500";

  var BADGE = "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs/4 font-medium";
  var BADGE_TONE = {
    blue: "border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-400",
    emerald: "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-400",
    gray: "border-gray-200 bg-gray-100 text-gray-800 dark:border-white/15 dark:bg-white/10 dark:text-gray-300",
  };

  // Status box (Figma Main Menu/Application Progress): tinted box, icon + title + text.
  var STATUS_TONE = {
    amber: { box: "bg-amber-50 dark:bg-amber-400/10", text: "text-amber-700 dark:text-amber-300", icon: "text-amber-500 dark:text-amber-400" },
    blue: { box: "bg-blue-50 dark:bg-blue-400/10", text: "text-blue-700 dark:text-blue-300", icon: "text-blue-500 dark:text-blue-400" },
    green: { box: "bg-green-50 dark:bg-green-400/10", text: "text-green-700 dark:text-green-300", icon: "text-green-500 dark:text-green-400" },
    red: { box: "bg-red-50 dark:bg-red-400/10", text: "text-red-700 dark:text-red-300", icon: "text-red-500 dark:text-red-400" },
  };

  /* ---------- icons ---------- */

  var ICON = {
    info: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4.5"><path fill-rule="evenodd" clip-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" /></svg>',
    userPlus: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path d="M10 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM16.25 5.75a.75.75 0 0 0-1.5 0v2h-2a.75.75 0 0 0 0 1.5h2v2a.75.75 0 0 0 1.5 0v-2h2a.75.75 0 0 0 0-1.5h-2v-2Z" /></svg>',
    briefcase: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 shrink-0 text-blue-600 dark:text-blue-400"><path fill-rule="evenodd" d="M6 3.75A2.75 2.75 0 0 1 8.75 1h2.5A2.75 2.75 0 0 1 14 3.75v.443c.572.055 1.14.122 1.706.2C17.053 4.582 18 5.75 18 7.07v3.469c0 1.126-.694 2.191-1.83 2.54-1.952.599-4.024.921-6.17.921s-4.219-.322-6.17-.921C2.694 12.73 2 11.665 2 10.539V7.07c0-1.321.947-2.489 2.294-2.676A41.047 41.047 0 0 1 6 4.193V3.75Zm6.5 0v.325a41.622 41.622 0 0 0-5 0V3.75c0-.69.56-1.25 1.25-1.25h2.5c.69 0 1.25.56 1.25 1.25ZM10 10a1 1 0 0 0-1 1v.01a1 1 0 0 0 1 1h.01a1 1 0 0 0 1-1V11a1 1 0 0 0-1-1H10Z" clip-rule="evenodd" /><path d="M3 15.055v-.684c.126.053.255.1.39.142 2.092.642 4.313.987 6.61.987 2.297 0 4.518-.345 6.61-.987.135-.041.264-.089.39-.142v.684c0 1.347-.985 2.53-2.363 2.686a41.454 41.454 0 0 1-9.274 0C3.985 17.585 3 16.402 3 15.055Z" /></svg>',
    selector: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="size-5 shrink-0 text-gray-400 dark:text-gray-500"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.22 10.22a.75.75 0 0 1 1.06 0L8 11.94l1.72-1.72a.75.75 0 1 1 1.06 1.06l-2.25 2.25a.75.75 0 0 1-1.06 0l-2.25-2.25a.75.75 0 0 1 0-1.06ZM10.78 5.78a.75.75 0 0 1-1.06 0L8 4.06 6.28 5.78a.75.75 0 0 1-1.06-1.06l2.25-2.25a.75.75 0 0 1 1.06 0l2.25 2.25a.75.75 0 0 1 0 1.06Z" /></svg>',
    check: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="ml-auto size-4 shrink-0 text-blue-600 dark:text-blue-400"><path fill-rule="evenodd" clip-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" /></svg>',
    checkCircle: function (cls) { return '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="' + cls + '"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" /></svg>'; },
    exclamationCircle: function (cls) { return '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="' + cls + '"><path fill-rule="evenodd" clip-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" /></svg>'; },
    xCircle: function (cls) { return '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="' + cls + '"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" /></svg>'; },
    // Figma "in progress" mark: a dashed ring (static; motion-safe spin would distract on a tab).
    dashed: function (cls) { return '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-dasharray="2.6 2.6" aria-hidden="true" class="' + cls + '"><circle cx="10" cy="10" r="7.25" /></svg>'; },
    plusDashed: '<span aria-hidden="true" class="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-dashed border-gray-300 text-gray-400 group-hover/add:border-blue-400 group-hover/add:text-blue-600 group-disabled/add:border-gray-200 group-disabled/add:text-gray-300 dark:border-white/20 dark:text-gray-500 dark:group-hover/add:border-blue-400 dark:group-hover/add:text-blue-400 dark:group-disabled/add:border-white/10 dark:group-disabled/add:text-gray-600"><svg viewBox="0 0 20 20" fill="currentColor" class="size-4"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg></span>',
    trash: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd" /></svg>',
    question: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 shrink-0 text-gray-400 dark:text-gray-500"><path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM8.94 6.94a.75.75 0 1 1-1.061-1.061 3 3 0 1 1 2.871 5.026v.345a.75.75 0 0 1-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 1 0 8.94 6.94ZM10 15a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd" /></svg>',
    chevronDown: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 shrink-0 text-gray-400 transition-transform group-aria-expanded/help:rotate-180 motion-reduce:transition-none dark:text-gray-500"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>',
    chevronLeft: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd" /></svg>',
    chevronRight: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>',
    external: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="size-4"><path d="M6.22 8.72a.75.75 0 0 0 1.06 1.06l5.22-5.22v1.69a.75.75 0 0 0 1.5 0v-3.5a.75.75 0 0 0-.75-.75h-3.5a.75.75 0 0 0 0 1.5h1.69L6.22 8.72Z" /><path d="M3.5 6.75c0-.69.56-1.25 1.25-1.25H7A.75.75 0 0 0 7 4H4.75A2.75 2.75 0 0 0 2 6.75v4.5A2.75 2.75 0 0 0 4.75 14h4.5A2.75 2.75 0 0 0 12 11.25V9a.75.75 0 0 0-1.5 0v2.25c0 .69-.56 1.25-1.25 1.25h-4.5c-.69 0-1.25-.56-1.25-1.25v-4.5Z" /></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="size-6 text-red-600 dark:text-red-400"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>',
  };

  /* ---------- helpers ---------- */

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function store(kind, key, value) {
    try {
      if (value === undefined) return JSON.parse(window[kind].getItem(key));
      if (value === null) window[kind].removeItem(key);
      else window[kind].setItem(key, JSON.stringify(value));
    } catch (e) {
      return null;
    }
    return value;
  }

  function emit(name, detail, cancelable) {
    var event = new CustomEvent("smart-enroll:" + name, { detail: detail || {}, cancelable: !!cancelable });
    document.dispatchEvent(event);
    return event;
  }

  function on(name, fn) {
    var handler = function (event) { fn(event.detail, event); };
    document.addEventListener("smart-enroll:" + name, handler);
    return function () { document.removeEventListener("smart-enroll:" + name, handler); };
  }

  function toast(message, tone) {
    if (typeof window.showGlobalTopToast === "function") window.showGlobalTopToast(message, { tone: tone || "success" });
  }

  function statusById(id) {
    return (state.data.statuses || []).filter(function (s) { return s.id === id; })[0];
  }

  function productById(id) {
    return (state.data.products || []).filter(function (p) { return p.id === id; })[0];
  }

  function tabById(id) {
    return (state.data.tabs || []).filter(function (t) { return t.id === id; })[0];
  }

  function phoneText(text) {
    return String(text || "").replace(/\{phone\}/g, (state.data.support || {}).phone || "");
  }

  /**
   * SMART System "Information circle + Tooltip" (components skill). `align: 'end'` anchors the bubble to
   * the icon's right edge so icons at the right of a narrow panel never push it off-screen.
   */
  function infoTip(id, label, text, align) {
    var pos = align === "end"
      ? "right-0 -mr-1 before:right-1.5"
      : "left-1/2 -translate-x-2/5 before:left-2/5 before:-translate-x-1/2";
    return (
      '<span class="group/info relative inline-flex size-5 shrink-0 items-center justify-center">' +
      '<span tabindex="0" role="button" aria-describedby="' + esc(id) + '" class="inline-flex cursor-help rounded-full text-gray-400 hover:text-gray-900 focus-visible:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 dark:text-gray-500 dark:hover:text-white dark:focus-visible:text-white dark:focus-visible:outline-blue-400">' +
      '<span class="sr-only">' + esc(label) + "</span>" + ICON.info + "</span>" +
      '<span id="' + esc(id) + '" role="tooltip" class="pointer-events-none invisible absolute top-full z-30 mt-3 w-max max-w-64 sm:max-w-[343px] rounded-lg bg-gray-900 p-3 text-left text-sm/5 font-normal text-gray-100 opacity-0 shadow-xs transition-opacity duration-150 group-hover/info:visible group-hover/info:opacity-100 group-has-focus-visible/info:visible group-has-focus-visible/info:opacity-100 before:absolute before:-top-1 before:size-3 before:rotate-45 before:rounded-[2px] before:bg-inherit dark:bg-gray-950 dark:ring-1 dark:ring-white/10 ' + pos + '">' +
      esc(text) + "</span></span>"
    );
  }

  /* ---------- state ---------- */

  function visibleTabs() {
    return (state.data.tabs || []).filter(function (t) { return !t.addon || state.addons[t.addon]; });
  }

  function isReadOnly() {
    var s = statusById(state.status);
    return !(s && s.editable);
  }

  function tabState(id) {
    var p = state.progress[id] || { required: 0, filled: 0 };
    if (p.required > 0 && p.filled >= p.required) return "complete";
    if (p.filled > 0) return "progress";
    return "empty";
  }

  function getProgress() {
    var required = 0;
    var filled = 0;
    var tabs = {};
    visibleTabs().forEach(function (t) {
      var p = state.progress[t.id] || { required: 0, filled: 0 };
      required += p.required;
      filled += Math.min(p.filled, p.required);
      tabs[t.id] = { required: p.required, filled: p.filled, state: tabState(t.id) };
    });
    var percent = required ? Math.floor((filled / required) * 100) : 0;
    return { percent: percent, required: required, filled: filled, tabs: tabs };
  }

  function pctClass(pct) {
    return pct <= 0 ? "w-0" : pct >= 100 ? "w-full" : "w-" + pct + "/100";
  }

  function defaultProgress(t) {
    return { required: t.required || 0, filled: t.filled || 0 };
  }

  /* ---------- top bar + card header: Invite people + avatars ---------- */

  function avatarHtml(person) {
    var ring = "ring-2 ring-white dark:ring-gray-900";
    if (person.photo) {
      return '<img src="' + esc(ROOT + person.photo) + '" alt="' + esc(person.name) + '" data-tooltip="' + esc(person.name + " · " + person.role) + '" class="inline-block size-8 rounded-full object-cover ' + ring + '" />';
    }
    return (
      '<span role="img" aria-label="' + esc(person.name) + '" data-tooltip="' + esc(person.name + " · " + person.role) + '" class="inline-flex size-8 items-center justify-center rounded-full ' + esc(person.color || "bg-gray-500") + " type-label-small text-white " + ring + '">' +
      esc(person.initials || "") + "</span>"
    );
  }

  function renderPeople() {
    var people = state.data.people || [];
    document.querySelectorAll("[data-se-people]").forEach(function (mount) {
      var where = mount.getAttribute("data-se-people");
      var size = where === "top" ? "text-base" : "text-sm";
      mount.innerHTML =
        '<span class="flex items-center gap-1">' +
        '<button type="button" data-se-invite="' + where + '" class="' + LINK + " " + size + '">Invite people ' + ICON.userPlus + "</button>" +
        infoTip("se-invite-tip-" + where, "About inviting people", (state.data.invite || {}).info, "end") +
        "</span>" +
        '<span aria-hidden="true" class="h-8 w-px bg-gray-200 dark:bg-white/10"></span>' +
        '<span class="flex -space-x-2">' + people.map(avatarHtml).join("") + "</span>";
    });
  }

  /* ---------- business switcher (Figma Business Change/Action) ---------- */

  function currentBusiness() {
    var list = state.data.businesses || [];
    return list.filter(function (b) { return b.id === state.businessId; })[0] || list[0] || { name: "" };
  }

  function renderBusiness() {
    var list = state.data.businesses || [];
    var current = currentBusiness();
    document.querySelectorAll("[data-se-business]").forEach(function (mount) {
      var where = mount.getAttribute("data-se-business");
      var trigger =
        '<span class="sr-only">Business: </span>' + ICON.briefcase +
        '<span class="truncate" title="' + esc(current.name) + '">' + esc(current.name) + "</span>" + ICON.selector;
      if (list.length < 2) {
        // D-8: Choose a Business only with 2+ businesses — show the name, no menu.
        mount.innerHTML = '<span class="inline-flex max-w-full items-center gap-2 type-label-large text-default">' + ICON.briefcase + '<span class="truncate">' + esc(current.name) + "</span></span>";
        return;
      }
      mount.innerHTML =
        '<el-dropdown class="block min-w-0">' +
        '<button type="button" class="' + BTN_SECONDARY_LG + (where === "drawer" ? " w-full" : " max-w-64 xl:max-w-80") + '">' + trigger + "</button>" +
        '<el-menu anchor="bottom end" popover class="w-72 rounded-md bg-white shadow-lg outline-1 outline-black/5 [--anchor-gap:--spacing(2)] dark:bg-gray-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10 transition transition-discrete data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-100 data-leave:ease-in motion-reduce:transition-none">' +
        '<p class="px-4 pt-3 pb-1 type-caption text-tertiary">Choose a Business</p>' +
        '<div class="py-1">' +
        list.map(function (b) {
          var active = b.id === current.id;
          return '<button type="button" data-se-business-pick="' + esc(b.id) + '"' + (active ? ' aria-current="true"' : "") + ' class="' + MENU_ITEM + '">' +
            '<span class="min-w-0 flex-1 truncate">' + esc(b.name) + "</span>" + (active ? ICON.check : "") + "</button>";
        }).join("") +
        "</div></el-menu></el-dropdown>";
    });
  }

  function pickBusiness(id) {
    if (id === state.businessId) return;
    state.businessId = id;
    store("sessionStorage", KEY.business, id);
    renderBusiness();
    var b = currentBusiness();
    toast("Switched to " + b.name + ".");
    emit("business-change", { business: b });
  }

  /* ---------- left panel ---------- */

  function renderProgress() {
    var p = getProgress();
    var badge = refs.panel.querySelector("[data-se-progress-badge]");
    var bar = refs.panel.querySelector("[data-se-progress-bar]");
    var fill = refs.panel.querySelector("[data-se-progress-fill]");
    badge.textContent = p.percent + "%";
    badge.className = BADGE + " " + (p.percent >= 100 ? BADGE_TONE.emerald : BADGE_TONE.blue);
    bar.setAttribute("aria-valuenow", String(p.percent));
    bar.setAttribute("aria-valuetext", p.percent + "% · " + p.filled + " of " + p.required + " required fields");
    // Tailwind v4 fraction width (w-37/100), so the bar stays class-only (no inline style).
    fill.className = fill.className.replace(/\bw-(0|full|\d+\/100)\b/g, "").trim() + " " + pctClass(p.percent);
    emit("progress", p);
  }

  function renderStatusBox() {
    var box = refs.panel.querySelector("[data-se-status-box]");
    var s = statusById(state.status);
    if (!s || !s.tone) {
      box.className = "hidden";
      box.innerHTML = "";
      return;
    }
    var tone = STATUS_TONE[s.tone] || STATUS_TONE.blue;
    var iconCls = "mt-0.5 size-5 shrink-0 " + tone.icon;
    var icon = s.icon === "check" ? ICON.checkCircle(iconCls)
      : s.icon === "exclamation" ? ICON.exclamationCircle(iconCls)
      : s.icon === "x" ? ICON.xCircle(iconCls)
      : ICON.dashed(iconCls);
    box.className = "flex gap-2 rounded-md p-3 " + tone.box;
    box.innerHTML =
      icon +
      '<div class="flex min-w-0 flex-col gap-1 ' + tone.text + '">' +
      '<p class="type-label">' + esc(s.label) + "</p>" +
      '<p class="type-body">' + esc(phoneText(s.text)) + "</p>" +
      "</div>";
  }

  var ROW = "flex items-center gap-2 rounded-md border border-gray-200 bg-white p-2.5 dark:border-white/10 dark:bg-gray-900";

  function productRow(p) {
    var tip = infoTip("se-product-tip-" + p.id, "About " + p.name, p.info, "end");
    var readOnly = isReadOnly();
    if (p.kind === "base" || (p.kind === "addon" && state.addons[p.id])) {
      var logo = '<img src="' + ROOT + 'assets/illustrations/smart-hub-tile.svg?v=20261111" alt="" width="28" height="28" class="size-7 shrink-0 rounded-full" />';
      var remove = p.kind === "addon"
        ? '<button type="button" data-se-addon-remove="' + esc(p.id) + '" data-tooltip="Remove ' + esc(p.name) + '"' + (readOnly ? " disabled" : "") +
          ' class="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 ' + FOCUS + ' disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400 dark:text-gray-500 dark:hover:bg-red-400/10 dark:hover:text-red-400 dark:disabled:hover:text-gray-500">' +
          '<span class="sr-only">Remove ' + esc(p.name) + "</span>" + ICON.trash + "</button>"
        : "";
      return '<li class="' + ROW + '">' + logo +
        '<span class="min-w-0 flex-1 truncate type-label text-default">' + esc(p.name) + "</span>" +
        (p.kind === "addon" ? '<span class="sr-only">(added)</span>' : "") + remove + tip + "</li>";
    }
    if (p.kind === "soon") {
      // D-10: listed, disabled, "Coming soon".
      return '<li class="' + ROW + '">' +
        '<button type="button" disabled class="group/add flex min-w-0 flex-1 cursor-not-allowed items-center gap-2 text-left text-gray-400 dark:text-gray-500">' + ICON.plusDashed +
        '<span class="min-w-0 type-label text-gray-400 dark:text-gray-500">' + esc(p.name) + "</span></button>" +
        '<span class="' + BADGE + " " + BADGE_TONE.gray + ' shrink-0">Coming soon</span>' + tip + "</li>";
    }
    return '<li class="' + ROW + '">' +
      '<button type="button" data-se-addon-add="' + esc(p.id) + '"' + (readOnly ? " disabled" : "") +
      ' class="group/add flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-sm text-left text-blue-600 hover:text-blue-700 ' + FOCUS + ' disabled:cursor-not-allowed disabled:text-gray-400 dark:text-blue-400 dark:hover:text-blue-300 dark:disabled:text-gray-500">' + ICON.plusDashed +
      '<span class="min-w-0 truncate type-label text-blue-600 group-hover/add:text-blue-700 group-disabled/add:text-gray-400 dark:text-blue-400 dark:group-hover/add:text-blue-300 dark:group-disabled/add:text-gray-500"><span class="sr-only">Add </span>' + esc(p.name) + "</span></button>" +
      tip + "</li>";
  }

  function renderProducts() {
    refs.panel.querySelector("[data-se-products]").innerHTML = (state.data.products || []).map(productRow).join("");
  }

  function renderHelp() {
    var h = state.data.help || {};
    var mount = refs.panel.querySelector("[data-se-help]");
    mount.innerHTML =
      '<button type="button" aria-expanded="false" aria-controls="se-help-body" data-se-help-toggle class="group/help -mx-2 flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left text-secondary hover:bg-gray-50 ' + FOCUS + ' dark:hover:bg-white/5">' +
      ICON.question + '<span class="flex-1 type-label text-secondary">' + esc(h.title) + "</span>" + ICON.chevronDown + "</button>" +
      '<div id="se-help-body" hidden class="flex items-center gap-1 px-1 pb-1">' +
      '<a href="' + esc(h.href) + '" target="_blank" rel="noopener noreferrer" class="' + LINK + ' text-sm">' + esc(h.linkLabel) + '<span class="sr-only"> (opens in a new tab)</span></a>' +
      infoTip("se-help-tip", "About the knowledge base", h.info) +
      "</div>";
  }

  /* ---------- tabs + main card ---------- */

  function tabIcon(id) {
    var s = tabState(id);
    if (s === "complete") return ICON.checkCircle("size-4 shrink-0 text-green-600 dark:text-green-400") + '<span class="sr-only">(complete)</span>';
    if (s === "progress") return ICON.dashed("size-4 shrink-0 text-blue-600 dark:text-blue-400") + '<span class="sr-only">(in progress)</span>';
    return "";
  }

  function renderTabs() {
    var tabs = visibleTabs();
    refs.tabs.innerHTML = tabs.map(function (t) {
      var on = t.id === state.activeTab;
      return '<button type="button" role="tab" id="se-tab-' + esc(t.id) + '" data-se-tab="' + esc(t.id) + '" aria-controls="se-panel-' + esc(t.id) + '" aria-selected="' + on + '" tabindex="' + (on ? 0 : -1) + '" class="' + TAB_BASE + " " + (on ? TAB_ON : TAB_OFF) + '">' +
        esc(t.title) + tabIcon(t.id) + "</button>";
    }).join("");
  }

  function placeholderRenderer(el, ctx) {
    var t = tabById(ctx.tabId) || {};
    el.innerHTML =
      '<div class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-gray-300 px-6 py-12 text-center dark:border-white/15">' +
      '<p class="type-title-small text-default">' + esc(t.title) + "</p>" +
      '<p class="max-w-md type-description text-tertiary">The fields of this tab come in a later task. The shell already counts its required fields toward the progress.</p>' +
      "</div>" +
      (ctx.tabId === "business-information" ? uploadDemoHtml() : "");
    if (ctx.tabId === "business-information") mountUploadDemo(el, ctx);
  }

  // Component demo so QA can reach every File Upload state (multiple = Business or Service License only).
  function uploadDemoHtml() {
    var u = state.data.uploadDemo || {};
    return (
      '<section aria-labelledby="se-upload-demo-title" class="mt-6 flex flex-col gap-6 rounded-lg border border-gray-200 p-4 dark:border-white/10">' +
      '<div class="flex flex-col gap-1"><h2 id="se-upload-demo-title" class="type-title-small text-default">File Upload (component demo)</h2>' +
      '<p class="type-description text-tertiary">Drop or pick a file. A .txt file or a file over the limit shows the error state; read-only statuses show it disabled.</p></div>' +
      '<div class="grid gap-6 md:grid-cols-2">' +
      '<div class="flex flex-col gap-2"><span class="flex items-center justify-between gap-2"><span id="se-upload-license-label" class="type-label text-secondary">' + esc(u.label) + '</span><span class="type-caption text-tertiary">Multiple files</span></span>' +
      '<p class="type-description-small text-tertiary">' + esc(u.description) + "</p>" +
      '<div data-se-upload="license"></div></div>' +
      '<div class="flex flex-col gap-2"><span class="flex items-center justify-between gap-2"><span class="type-label text-secondary">Proof of address</span><span class="type-caption text-tertiary">One file</span></span>' +
      '<p class="type-description-small text-tertiary">A utility bill or bank statement from the last 3 months.</p>' +
      '<div data-se-upload="address"></div></div>' +
      "</div></section>"
    );
  }

  var uploads = [];
  function mountUploadDemo(el, ctx) {
    if (!window.FileUpload) return;
    var u = state.data.uploadDemo || {};
    uploads = [
      window.FileUpload.mount(el.querySelector('[data-se-upload="license"]'), {
        id: "se-upload-license", name: "license", label: u.label, accept: u.accept, acceptLabel: u.acceptLabel, maxSizeMb: u.maxSizeMb,
        multiple: true, disabled: ctx.readOnly,
        files: [{ name: "business-license-2026.pdf", size: 150016, type: "PDF" }],
      }),
      window.FileUpload.mount(el.querySelector('[data-se-upload="address"]'), {
        id: "se-upload-address", name: "proof-of-address", label: "Proof of address", accept: u.accept, acceptLabel: u.acceptLabel, maxSizeMb: u.maxSizeMb,
        disabled: ctx.readOnly,
      }),
    ];
  }

  function ctxFor(id) {
    return { tabId: id, readOnly: isReadOnly(), status: state.status, data: state.data, addons: getAddons() };
  }

  function ensurePanel(id) {
    var panel = document.getElementById("se-panel-" + id);
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "se-panel-" + id;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", "se-tab-" + id);
      panel.setAttribute("tabindex", "0");
      panel.className = "p-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 sm:p-6 dark:focus-visible:outline-blue-400";
      panel.hidden = true;
      panel.innerHTML = '<fieldset data-se-fieldset class="min-w-0"><legend class="sr-only">' + esc((tabById(id) || {}).title) + "</legend><div data-se-body></div></fieldset>";
      refs.panels.appendChild(panel);
    }
    return panel;
  }

  function mountTab(id, force) {
    var panel = ensurePanel(id);
    if (mounted[id] && !force) return;
    var body = panel.querySelector("[data-se-body]");
    var r = renderers[id] || placeholderRenderer;
    var fn = typeof r === "function" ? r : r.render;
    body.innerHTML = "";
    fn(body, ctxFor(id));
    mounted[id] = true;
  }

  function renderActive() {
    var t = tabById(state.activeTab);
    refs.title.textContent = t ? t.title : "";
    refs.description.textContent = t ? t.description : "";
    visibleTabs().forEach(function (v) {
      var panel = document.getElementById("se-panel-" + v.id);
      if (panel) panel.hidden = v.id !== state.activeTab;
    });
    // Panels of removed add-on tabs go away.
    Array.prototype.forEach.call(refs.panels.children, function (panel) {
      var id = panel.id.replace("se-panel-", "");
      if (!visibleTabs().some(function (v) { return v.id === id; })) panel.hidden = true;
    });
    mountTab(state.activeTab);
    document.getElementById("se-panel-" + state.activeTab).hidden = false;
    applyReadOnly();
    renderFooterNav();
  }

  function renderFooterNav() {
    var tabs = visibleTabs();
    var i = tabs.findIndex(function (t) { return t.id === state.activeTab; });
    var prev = tabs[i - 1];
    var next = tabs[i + 1];
    refs.prevSlot.innerHTML = prev
      ? '<button type="button" data-se-go="' + esc(prev.id) + '" class="' + BTN_NAV + '">' + ICON.chevronLeft + '<span class="sr-only">Previous: </span>' + esc(prev.title) + "</button>"
      : "";
    refs.nextSlot.innerHTML = next
      ? '<button type="button" data-se-go="' + esc(next.id) + '" class="' + BTN_NAV + '"><span class="sr-only">Next: </span>' + esc(next.title) + ICON.chevronRight + "</button>"
      : "";
    var last = !next;
    refs.next.disabled = last && isReadOnly();
    refs.next.setAttribute("aria-label", last ? "Next Step: submit the application" : "Next Step: " + next.title);
  }

  function applyReadOnly() {
    var ro = isReadOnly();
    refs.panels.querySelectorAll("[data-se-fieldset]").forEach(function (fs) { fs.disabled = ro; });
    uploads.forEach(function (u) { u.setDisabled(ro); });
  }

  function goToTab(id, opts) {
    if (!visibleTabs().some(function (t) { return t.id === id; })) return false;
    var previous = state.activeTab;
    state.activeTab = id;
    var url = new URL(window.location.href);
    url.searchParams.set("tab", id);
    window.history.replaceState(null, "", url);
    renderTabs();
    renderActive();
    if (opts && opts.focusTab) {
      var btn = document.getElementById("se-tab-" + id);
      if (btn) btn.focus();
    }
    var tabBtn = document.getElementById("se-tab-" + id);
    if (tabBtn && tabBtn.scrollIntoView) tabBtn.scrollIntoView({ block: "nearest", inline: "nearest" });
    if (previous !== id) emit("tab-change", { tabId: id, previous: previous });
    return true;
  }

  function step(dir) {
    var tabs = visibleTabs();
    var i = tabs.findIndex(function (t) { return t.id === state.activeTab; });
    var target = tabs[i + dir];
    if (target) {
      goToTab(target.id);
      if (refs.main.getBoundingClientRect().top < 0) refs.main.scrollIntoView({ block: "start" });
      return true;
    }
    return false;
  }

  function next() {
    if (step(1)) return;
    // Last tab: Submission is T11. Stub event; listeners call preventDefault() when they handle it.
    var event = emit("submit", { status: state.status, progress: getProgress() }, true);
    if (!event.defaultPrevented) toast("Submission opens here in a later release.", "info");
  }

  /* ---------- statuses ---------- */

  function setStatus(id) {
    if (!statusById(id) || id === state.status) return;
    var previous = state.status;
    var wasRO = isReadOnly();
    state.status = id;
    store("sessionStorage", KEY.status, id);
    var url = new URL(window.location.href);
    url.searchParams.set("status", id);
    window.history.replaceState(null, "", url);
    renderStatusBox();
    renderProducts();
    applyReadOnly();
    renderFooterNav();
    syncDemo();
    emit("status-change", { status: id, previous: previous, readOnly: isReadOnly() });
    if (wasRO !== isReadOnly()) emit("readonly-change", { readOnly: isReadOnly() });
  }

  /* ---------- add-ons (D-11) ---------- */

  function getAddons() {
    var out = {};
    (state.data.products || []).forEach(function (p) { if (p.kind === "addon") out[p.id] = !!state.addons[p.id]; });
    return out;
  }

  function storageKey(tabId) {
    return "se_tab_" + tabId;
  }

  function addAddon(id) {
    var p = productById(id);
    if (!p || p.kind !== "addon" || state.addons[id] || isReadOnly()) return;
    state.addons[id] = true;
    store("sessionStorage", KEY.addons, state.addons);
    (p.tabs || []).forEach(function (tid) { if (!state.progress[tid]) state.progress[tid] = defaultProgress(tabById(tid)); });
    renderProducts();
    renderTabs();
    renderFooterNav();
    renderProgress();
    toast(p.name + " added.");
    emit("addon-change", { addon: id, added: true, tabs: p.tabs || [] });
    var btn = refs.panel.querySelector('[data-se-addon-remove="' + id + '"]');
    if (btn) btn.focus();
  }

  function discardAddon(id) {
    var p = productById(id);
    state.addons[id] = false;
    store("sessionStorage", KEY.addons, state.addons);
    (p.tabs || []).forEach(function (tid) {
      state.progress[tid] = defaultProgress(tabById(tid));
      store("sessionStorage", storageKey(tid), null);
      var panel = document.getElementById("se-panel-" + tid);
      if (panel) panel.remove();
      mounted[tid] = false;
    });
    emit("addon-discard", { addon: id, tabs: p.tabs || [] });
    if ((p.tabs || []).indexOf(state.activeTab) !== -1) {
      goToTab(visibleTabs()[0].id);
    } else {
      renderTabs();
      renderFooterNav();
    }
    renderProducts();
    renderProgress();
    toast(p.name + " removed. Its information was discarded.");
    emit("addon-change", { addon: id, added: false, tabs: p.tabs || [] });
    var add = refs.panel.querySelector('[data-se-addon-add="' + id + '"]');
    if (add) add.focus();
  }

  function removeAddon(id, opts) {
    var p = productById(id);
    if (!p || !state.addons[id] || isReadOnly()) return;
    if (opts && opts.confirm === false) { discardAddon(id); return; }
    if (!window.OBModal) { discardAddon(id); return; }
    var tabNames = (p.tabs || []).map(function (t) { return (tabById(t) || {}).title; }).join(" and ");
    var trigger = refs.panel.querySelector('[data-se-addon-remove="' + id + '"]');
    if (trigger) trigger.focus();
    window.OBModal.open(
      '<div class="flex flex-col items-center gap-6 px-6 pb-6">' +
      '<span class="inline-flex size-11 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10">' + ICON.warning + "</span>" +
      '<div class="flex w-full flex-col gap-2 text-center">' +
      '<h2 id="se-discard-title" class="type-title-modal text-default">Information will be discarded</h2>' +
      '<p class="type-description text-tertiary">Removing ' + esc(p.name) + " deletes everything entered for it: the " + esc(tabNames) +
      (p.tabs && p.tabs.length > 1 ? " tabs" : " tab") + " and its Ownership and Connectors extras. This can't be undone.</p>" +
      "</div></div>",
      "se-discard-title",
      {
        footer:
          '<div class="flex flex-col gap-3 px-6 pb-6">' +
          '<button type="button" data-se-discard-confirm class="' + BTN_DANGER_XL + '">Remove and discard</button>' +
          '<button type="button" data-ob-modal-close class="' + BTN_SECONDARY_XL + '">Cancel</button>' +
          "</div>",
      }
    );
    var confirmBtn = document.querySelector("[data-se-discard-confirm]");
    if (confirmBtn) {
      confirmBtn.addEventListener("click", function () {
        window.OBModal.close();
        discardAddon(id);
      });
    }
  }

  /* ---------- drawer (below 1024) ---------- */

  function drawerOpen() {
    return refs.panel.hasAttribute("data-open");
  }

  function focusables() {
    return Array.prototype.filter.call(
      refs.panel.querySelectorAll('a[href], button:not([disabled]), [tabindex="0"], input:not([disabled])'),
      function (el) { return el.offsetParent !== null; }
    );
  }

  function openDrawer() {
    if (LG.matches) return;
    refs.panel.setAttribute("data-open", "");
    refs.backdrop.setAttribute("data-open", "");
    refs.panel.setAttribute("role", "dialog");
    refs.panel.setAttribute("aria-modal", "true");
    refs.drawerBtn.setAttribute("aria-expanded", "true");
    document.documentElement.style.overflow = "hidden";
    var close = refs.panel.querySelector("[data-se-drawer-close]");
    setTimeout(function () { if (close) close.focus(); }, 30);
  }

  function closeDrawer(restore) {
    if (!drawerOpen()) return;
    refs.panel.removeAttribute("data-open");
    refs.backdrop.removeAttribute("data-open");
    refs.panel.removeAttribute("role");
    refs.panel.removeAttribute("aria-modal");
    refs.drawerBtn.setAttribute("aria-expanded", "false");
    document.documentElement.style.overflow = "";
    if (restore !== false) refs.drawerBtn.focus();
  }

  /* ---------- demo status switcher ---------- */

  function renderDemo() {
    var bar = document.createElement("div");
    bar.id = "se-demo-bar";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Demo controls");
    bar.className = "fixed right-4 bottom-4 z-20 flex items-center gap-2 rounded-lg bg-white py-1.5 pr-1.5 pl-3 shadow-lg ring-1 ring-gray-900/10 dark:bg-gray-800 dark:ring-white/10";
    var opts = (state.data.statuses || []).map(function (s) {
      return '<el-option value="' + esc(s.id) + '" class="group/option relative block cursor-default py-2 pr-9 pl-3 text-gray-900 select-none focus:bg-blue-600 focus:text-white focus:outline-hidden dark:text-white dark:focus:bg-blue-500">' +
        '<span class="block truncate font-normal group-aria-selected/option:font-semibold">' + esc(s.label) + "</span>" +
        '<span class="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-600 group-not-aria-selected/option:hidden group-focus/option:text-white in-[el-selectedcontent]:hidden dark:text-blue-400">' +
        '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" /></svg></span>' +
        "</el-option>";
    }).join("");
    bar.innerHTML =
      '<label for="se-demo-status-btn" class="type-label-small text-tertiary"><span class="sr-only sm:not-sr-only">Demo status</span><span aria-hidden="true" class="sm:hidden">Demo</span></label>' +
      '<el-select id="se-demo-status" name="se-demo-status" value="' + esc(state.status) + '" class="block w-60">' +
      '<button type="button" id="se-demo-status-btn" class="' + SELECT_TRIGGER + '">' +
      '<el-selectedcontent class="col-start-1 row-start-1 flex items-center gap-2 pr-6 truncate text-gray-900 dark:text-white"></el-selectedcontent>' +
      '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-500 group-hover/select:text-gray-700 sm:size-4 dark:text-gray-400 dark:group-hover/select:text-gray-200"><path d="M5.22 10.22a.75.75 0 0 1 1.06 0L8 11.94l1.72-1.72a.75.75 0 1 1 1.06 1.06l-2.25 2.25a.75.75 0 0 1-1.06 0l-2.25-2.25a.75.75 0 0 1 0-1.06ZM10.78 5.78a.75.75 0 0 1-1.06 0L8 4.06 6.28 5.78a.75.75 0 0 1-1.06-1.06l2.25-2.25a.75.75 0 0 1 1.06 0l2.25 2.25a.75.75 0 0 1 0 1.06Z" clip-rule="evenodd" fill-rule="evenodd" /></svg>' +
      "</button>" +
      '<el-options anchor="top end" popover class="max-h-72 w-(--button-width) overflow-auto rounded-md bg-white py-1 text-base shadow-lg outline-1 outline-black/5 [--anchor-gap:--spacing(1)] transition transition-discrete data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-100 data-leave:ease-in motion-reduce:transition-none sm:text-sm dark:bg-gray-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10">' +
      opts + "</el-options></el-select>";
    document.body.appendChild(bar);
    // Room under the card so the fixed bar never covers the footer.
    document.body.classList.add("pb-20");
    var select = bar.querySelector("el-select");
    select.addEventListener("change", function () {
      setStatus(select.value);
      var s = statusById(state.status);
      toast("Status: " + s.label + (isReadOnly() ? " (read-only)" : "") + ".", "info");
    });
  }

  function syncDemo() {
    var select = document.getElementById("se-demo-status");
    if (select && select.value !== state.status) select.value = state.status;
  }

  /* ---------- events ---------- */

  function bind() {
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (!t.closest || !t.isConnected) return;
      var el;
      if ((el = t.closest("[data-se-tab]"))) { goToTab(el.getAttribute("data-se-tab")); return; }
      if ((el = t.closest("[data-se-go]"))) {
        goToTab(el.getAttribute("data-se-go"));
        if (refs.main.getBoundingClientRect().top < 0) refs.main.scrollIntoView({ block: "start" });
        return;
      }
      if (t.closest("[data-se-next]")) { next(); return; }
      if ((el = t.closest("[data-se-addon-add]"))) { addAddon(el.getAttribute("data-se-addon-add")); return; }
      if ((el = t.closest("[data-se-addon-remove]"))) { removeAddon(el.getAttribute("data-se-addon-remove")); return; }
      if ((el = t.closest("[data-se-business-pick]"))) {
        var menu = el.closest("el-menu");
        if (menu && menu.hidePopover) { try { menu.hidePopover(); } catch (err) { /* already closed */ } }
        pickBusiness(el.getAttribute("data-se-business-pick"));
        return;
      }
      if ((el = t.closest("[data-se-invite]"))) {
        // D-14: the Invite People modal is T10; until then the event is the hook.
        var ev = emit("invite", { source: el.getAttribute("data-se-invite") }, true);
        if (!ev.defaultPrevented) toast("Invite people opens here in a later release.", "info");
        return;
      }
      if ((el = t.closest("[data-se-help-toggle]"))) {
        var open = el.getAttribute("aria-expanded") === "true";
        el.setAttribute("aria-expanded", String(!open));
        document.getElementById("se-help-body").hidden = open;
        return;
      }
      if (t.closest("[data-se-drawer-open]")) { openDrawer(); return; }
      if (t.closest("[data-se-drawer-close]") || t.closest("[data-se-drawer-backdrop]")) { closeDrawer(); return; }
    });

    // Tabs: arrows / Home / End move and activate (automatic activation).
    refs.tabs.addEventListener("keydown", function (e) {
      var keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
      if (keys.indexOf(e.key) === -1) return;
      e.preventDefault();
      var tabs = visibleTabs();
      var i = tabs.findIndex(function (t) { return t.id === state.activeTab; });
      var j = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      goToTab(tabs[j].id, { focusTab: true });
    });

    document.addEventListener("keydown", function (e) {
      if (!drawerOpen()) return;
      if (e.key === "Escape") { closeDrawer(); return; }
      if (e.key !== "Tab") return;
      var f = focusables();
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });

    LG.addEventListener("change", function () { if (LG.matches) closeDrawer(false); });
  }

  /* ---------- public API ---------- */

  function registerTab(id, renderer) {
    renderers[id] = renderer;
    if (state.data && mounted[id]) mountTab(id, true);
  }

  function setProgress(id, counts) {
    if (!counts) return;
    state.progress[id] = { required: Math.max(0, counts.required | 0), filled: Math.max(0, counts.filled | 0) };
    if (!state.data) return;
    renderTabs();
    renderProgress();
  }

  /* ---------- boot ---------- */

  function init(data) {
    state.data = data;
    var params = new URLSearchParams(window.location.search);
    var fromUrl = params.get("status");
    state.status = statusById(fromUrl) ? fromUrl : statusById(store("sessionStorage", KEY.status)) ? store("sessionStorage", KEY.status) : "not-submitted";
    store("sessionStorage", KEY.status, state.status);
    state.addons = store("sessionStorage", KEY.addons) || {};
    state.businessId = store("sessionStorage", KEY.business) || ((data.businesses || [])[0] || {}).id;
    (data.tabs || []).forEach(function (t) { if (!state.progress[t.id]) state.progress[t.id] = defaultProgress(t); });

    refs.panel = document.getElementById("se-panel");
    refs.backdrop = document.querySelector("[data-se-drawer-backdrop]");
    refs.drawerBtn = document.querySelector("[data-se-drawer-open]");
    refs.tabs = document.querySelector("[data-se-tabs]");
    refs.panels = document.querySelector("[data-se-panels]");
    refs.title = document.querySelector("[data-se-title]");
    refs.description = document.querySelector("[data-se-description]");
    refs.prevSlot = document.querySelector("[data-se-prev-slot]");
    refs.nextSlot = document.querySelector("[data-se-next-slot]");
    refs.next = document.querySelector("[data-se-next]");
    refs.main = document.getElementById("se-main");

    var tabParam = params.get("tab");
    state.activeTab = visibleTabs().some(function (t) { return t.id === tabParam; }) ? tabParam : visibleTabs()[0].id;

    renderPeople();
    renderBusiness();
    renderStatusBox();
    renderProducts();
    renderHelp();
    renderTabs();
    renderActive();
    renderProgress();
    renderDemo();
    bind();
    resolveReady(data);
  }

  function boot() {
    window.DataSource.load(DATA_PATH)
      .then(init)
      .catch(function (err) {
        console.error("SMART Enroll: could not load data", err);
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  return {
    ready: ready,
    registerTab: registerTab,
    rerender: function (id) { mountTab(id, true); applyReadOnly(); },
    setProgress: setProgress,
    getProgress: getProgress,
    getStatus: function () { return state.status; },
    setStatus: setStatus,
    isReadOnly: isReadOnly,
    getAddons: getAddons,
    hasAddon: function (id) { return !!state.addons[id]; },
    addAddon: addAddon,
    removeAddon: removeAddon,
    getTabs: function () { return visibleTabs().map(function (t) { return { id: t.id, title: t.title, state: tabState(t.id) }; }); },
    getActiveTab: function () { return state.activeTab; },
    goToTab: goToTab,
    next: next,
    prev: function () { return step(-1); },
    on: on,
    storageKey: storageKey,
  };
})();

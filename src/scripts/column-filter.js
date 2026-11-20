/**
 * ColumnFilter — the small filter dropdown under a table column header (TCDM-5238).
 *
 * Look and behaviour copied from the Vendor List "Payment network" filter (vendors-page.js):
 * w-60 card under the header icon, checkboxes, icon highlighted while the column is filtered.
 * No title (Andrian, 2026-11-20). Footer = the global filter's Reset + Apply: choices are a draft
 * until Apply; Reset clears the draft (like the global panel, it applies only with Apply);
 * Esc / outside click discard it. On phones (< 640px) a bottom sheet with a backdrop.
 *
 * The column filter does not keep its own state: the table hands it the current values of its
 * global filter and writes the result back, so both filters always show the same selection
 * (wiki/design-system/table-filter.md, "Column filter").
 *
 *   ColumnFilter.button(key, label, active)  → header icon button HTML ([data-column-filter=key])
 *   ColumnFilter.icon()                       → the idle icon (table skeletons)
 *   ColumnFilter.bind(tableEl, {
 *     describe(key) → { title (aria-label), type: "list" | "date" | "amount",
 *                       options: [{ value, label, checked }], search: "Search payee",   // list
 *                       from: "YYYY-MM-DD", to: "YYYY-MM-DD",                           // date
 *                       min: "12.5", max: "" },                                          // amount
 *     apply(key, value)   ← list: [values] · date: { from, to } (ISO) · amount: { min, max }
 *     isActive(key) → bool   (icon highlight)
 *   })
 *   ColumnFilter.optionsFrom(wrapEl)          → options of a global-filter list (TableUi.filterCheckbox)
 *   ColumnFilter.attachAmount(input) / formatAmount(v, pad) / cleanAmount(v)  → US money fields (global panel too)
 *   ColumnFilter.sync(tableEl)   re-highlight the header icons (after the table re-renders)
 *   ColumnFilter.close()
 */
(function () {
  "use strict";

  var FUNNEL =
    '<svg viewBox="0 0 14 14" fill="currentColor" aria-hidden="true" class="size-3.5"><path fill-rule="evenodd" clip-rule="evenodd" d="M1.83962 1.12071C3.51903 0.843917 5.2429 0.7 7 0.7C8.7571 0.7 10.481 0.843917 12.1604 1.12071C12.414 1.1625 12.6 1.38172 12.6 1.63872V3.24008C12.6 3.65779 12.4341 4.0584 12.1387 4.35377L8.86131 7.63116C8.56594 7.92653 8.4 8.32713 8.4 8.74485V10.8703C8.4 11.3488 8.18251 11.8013 7.80889 12.1002L6.45296 13.185C6.29538 13.311 6.07947 13.3356 5.89758 13.2482C5.71568 13.1608 5.6 12.9768 5.6 12.775V8.74485C5.6 8.32713 5.43406 7.92653 5.13869 7.63116L1.86131 4.35377C1.56594 4.0584 1.4 3.65779 1.4 3.24008V1.63872C1.4 1.38172 1.58605 1.1625 1.83962 1.12071Z"/></svg>';
  var DOLLAR =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.9999 2C10.9999 1.44772 10.5522 1 9.99988 1C9.44759 1 8.99988 1.44772 8.99988 2V3.07498C6.65825 3.43371 4.99988 5.03858 4.99988 7C4.99988 8.96142 6.65825 10.5663 8.99988 10.925V14.9249C8.28519 14.8122 7.77152 14.5905 7.42483 14.3873C7.17579 14.2413 6.79177 13.8893 6.79177 13.8893C6.45923 13.4578 5.8407 13.3714 5.40227 13.6982C4.95945 14.0283 4.86879 14.6558 5.19884 15.0986C5.19884 15.0986 5.43609 15.3705 5.53528 15.4636C5.73371 15.6498 6.02272 15.8837 6.41344 16.1127C7.02974 16.474 7.88157 16.8126 8.99988 16.9433V18C8.99988 18.5523 9.44759 19 9.99988 19C10.5522 19 10.9999 18.5523 10.9999 18V16.9411C12.1388 16.8009 13.0588 16.4132 13.7409 15.8135C14.6201 15.0405 14.9999 14.0047 14.9999 13C14.9999 12.0588 14.7218 11.007 13.8511 10.2029C13.1686 9.57251 12.2186 9.18454 10.9999 9.05167V5.10673C11.5005 5.22046 11.8712 5.40776 12.1327 5.58205C12.3429 5.72223 12.5402 5.88371 12.6684 6.05562C13 6.5 13.5992 6.63563 14.0546 6.33205C14.5141 6.0257 14.6383 5.40483 14.3319 4.9453C14.2809 4.86873 14.1203 4.67298 14.0316 4.579C13.8543 4.39127 13.5943 4.15277 13.2421 3.91795C12.7031 3.55861 11.9621 3.21778 10.9999 3.07298V2ZM8.99988 5.10182C7.58473 5.41216 6.99988 6.36373 6.99988 7C6.99988 7.63627 7.58473 8.58784 8.99988 8.89818V5.10182ZM10.9999 11.0673V14.9203C11.6836 14.8011 12.1339 14.5634 12.4203 14.3115C12.8207 13.9595 12.9999 13.4953 12.9999 13C12.9999 12.4412 12.8416 11.993 12.4942 11.6721C12.2319 11.4299 11.7783 11.1828 10.9999 11.0673Z"/></svg>';
  var SEARCH =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="pointer-events-none absolute top-1/2 left-3 shrink-0 -translate-y-1/2 size-5 text-gray-400 dark:text-gray-500"><path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clip-rule="evenodd" /></svg>';

  // Header icon: Vendor List button (rounded-md p-0.5 around a size-5 slot), funnel on currentColor.
  var BTN_BASE =
    "inline-flex shrink-0 cursor-pointer rounded-md p-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-500";
  var BTN_IDLE =
    "text-gray-400 hover:bg-gray-100 hover:text-gray-600 aria-expanded:bg-gray-100 aria-expanded:text-gray-600 dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-300 dark:aria-expanded:bg-white/10 dark:aria-expanded:text-gray-300";
  var BTN_ON =
    "bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:hover:bg-blue-500/30";
  // Fields and footer copied from the global filter panel (bills-and-payables.html) and the toolbar search.
  var DATE_INPUT =
    "relative z-10 block h-10 w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 hover:outline-gray-400 dark:hover:outline-white/20 dark:focus:outline-blue-500 aria-invalid:outline-red-300 aria-invalid:focus:outline-red-600 dark:aria-invalid:outline-red-400/50 dark:aria-invalid:focus:outline-red-500";
  var AMOUNT_INPUT =
    "relative z-10 block h-10 w-full rounded-md bg-white pr-3 pl-10 text-base text-gray-900 shadow-[0px_1px_1px_rgba(0,0,0,0.05)] outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 hover:outline-gray-400 dark:hover:outline-white/20 dark:focus:outline-blue-500 aria-invalid:outline-red-300 aria-invalid:focus:outline-red-600 dark:aria-invalid:outline-red-400/50 dark:aria-invalid:focus:outline-red-500";
  var SEARCH_INPUT =
    "block h-10 w-full rounded-md border border-gray-300 bg-white py-0 pr-3 pl-10 text-base leading-6 font-normal text-gray-900 shadow-[0px_1px_1px_rgba(0,0,0,0.05)] placeholder:font-normal placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder:text-gray-500 dark:focus:outline-blue-500 hover:not-focus:border-gray-400 dark:hover:not-focus:border-white/25";
  var LABEL = "block text-sm/6 font-medium text-gray-700 dark:text-gray-200";
  var RESET_BTN =
    "h-7 cursor-pointer rounded border border-gray-300 bg-white px-2 text-sm leading-5 font-semibold text-gray-500 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10";
  var APPLY_BTN =
    "h-7 cursor-pointer rounded bg-blue-600 px-2 text-sm leading-5 font-semibold text-white hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-blue-600";

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function button(key, label, active) {
    return (
      '<button type="button" data-column-filter="' + esc(key) + '" aria-haspopup="dialog" aria-expanded="false"' +
      ' aria-label="Filter ' + esc(label) + '" class="' + BTN_BASE + " " + (active ? BTN_ON : BTN_IDLE) + '">' +
      '<span class="inline-flex size-5 items-center justify-center">' + FUNNEL + "</span></button>"
    );
  }

  function icon() {
    return '<span class="inline-flex shrink-0 p-0.5 text-gray-400 dark:text-gray-500"><span class="inline-flex size-5 items-center justify-center">' + FUNNEL + "</span></span>";
  }

  function setActive(btn, active) {
    BTN_IDLE.split(" ").forEach(function (c) { btn.classList.toggle(c, !active); });
    BTN_ON.split(" ").forEach(function (c) { btn.classList.toggle(c, !!active); });
  }

  // ── Dates: "MM / DD / YYYY" in the fields, ISO for the table ──
  function maskUs(value) {
    var d = String(value || "").replace(/\D/g, "").slice(0, 8);
    if (d.length <= 2) return d;
    if (d.length <= 4) return d.slice(0, 2) + " / " + d.slice(2);
    return d.slice(0, 2) + " / " + d.slice(2, 4) + " / " + d.slice(4);
  }
  function usToIso(value) {
    var d = String(value || "").replace(/\D/g, "");
    if (d.length !== 8) return null;
    var m = +d.slice(0, 2), day = +d.slice(2, 4), y = +d.slice(4, 8);
    var date = new Date(y, m - 1, day);
    if (date.getMonth() !== m - 1 || date.getDate() !== day) return null;
    return d.slice(4, 8) + "-" + d.slice(0, 2) + "-" + d.slice(2, 4);
  }
  function isoToUs(iso) {
    var s = String(iso || "");
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.slice(5, 7) + " / " + s.slice(8, 10) + " / " + s.slice(0, 4) : "";
  }
  // ── Money fields (column + global filter Amount): "121,321,321", "1,234.50" on blur ──
  /** Numeric string of a typed / pasted amount: digits and one ".", max 2 decimals ("1,234.567" → "1234.56"). */
  function cleanAmount(value) {
    var c = String(value == null ? "" : value).replace(/[^0-9.]/g, "");
    var dot = c.indexOf(".");
    if (dot === -1) return c;
    return c.slice(0, dot + 1) + c.slice(dot + 1).replace(/\./g, "").slice(0, 2);
  }
  /** US display of an amount; `pad` (blur) fixes 2 decimals. */
  function formatAmount(value, pad) {
    var c = cleanAmount(value);
    if (!c) return "";
    var dot = c.indexOf(".");
    var int = (dot === -1 ? c : c.slice(0, dot)).replace(/^0+(?=\d)/, "");
    var dec = dot === -1 ? null : c.slice(dot + 1);
    if (pad) {
      if (!int) int = "0";
      dec = ((dec || "") + "00").slice(0, 2);
    }
    return int.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (dec === null ? "" : "." + dec);
  }
  /**
   * Live formatting on an amount <input>: commas while typing (caret kept on the same digit), paste
   * cleaned, 2 decimals on blur. Read the value with cleanAmount(input.value). Bind before other input handlers.
   */
  function attachAmount(input) {
    if (!input || input._cfMoney) return;
    input._cfMoney = true;
    input.addEventListener("input", function () {
      var v = input.value;
      var caret = input.selectionStart == null ? v.length : input.selectionStart;
      var before = cleanAmount(v.slice(0, caret)).length;
      var next = formatAmount(v, false);
      if (next === v) return;
      input.value = next;
      var pos = 0, seen = 0;
      while (pos < next.length && seen < before) {
        if (/[0-9.]/.test(next[pos])) seen += 1;
        pos += 1;
      }
      try { input.setSelectionRange(pos, pos); } catch (e) {}
    });
    input.addEventListener("blur", function () {
      var padded = formatAmount(input.value, true);
      if (padded === input.value) return;
      input.value = padded;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  // ── One open dropdown at a time ──
  var open = null; // { table, key, binding, el, backdrop, card }
  var bindings = [];
  var dateBlock = null; // From / To fields + calendar, built once (DateRangeCalendar attaches once)

  function isPhone() {
    return window.matchMedia("(max-width: 639px)").matches;
  }

  function anchorOf(state) {
    return state.table.querySelector('[data-column-filter="' + state.key + '"]');
  }

  function getDateBlock() {
    if (dateBlock) return dateBlock;
    var wrap = document.createElement("div");
    wrap.className = "space-y-4 p-4";
    wrap.innerHTML =
      "<div>" +
      '<label for="cf-date-from" class="' + LABEL + '">From</label>' +
      '<div class="relative mt-2"><input id="cf-date-from" data-cf-date="from" type="text" inputmode="numeric" autocomplete="off" placeholder="MM / DD / YYYY" class="' + DATE_INPUT + '" /></div>' +
      "</div><div>" +
      '<label for="cf-date-to" class="' + LABEL + '">To</label>' +
      '<div class="relative mt-2"><input id="cf-date-to" data-cf-date="to" type="text" inputmode="numeric" autocomplete="off" placeholder="MM / DD / YYYY" class="' + DATE_INPUT + '" /></div>' +
      "</div>" +
      '<div data-cf-calendar id="cf-date-calendar"></div>';
    var from = wrap.querySelector('[data-cf-date="from"]');
    var to = wrap.querySelector('[data-cf-date="to"]');
    var mount = wrap.querySelector("[data-cf-calendar]");
    if (window.DateRangeCalendar) window.DateRangeCalendar.attach(from, to, mount);
    dateBlock = { el: wrap, from: from, to: to, mount: mount };
    return dateBlock;
  }

  function closeCalendar() {
    if (!dateBlock) return;
    try {
      if (dateBlock.mount.matches(":popover-open")) dateBlock.mount.hidePopover();
    } catch (e) {}
  }

  function close(returnFocus) {
    if (!open) return;
    var state = open;
    open = null;
    closeCalendar();
    if (dateBlock && dateBlock.el.parentNode) dateBlock.el.parentNode.removeChild(dateBlock.el);
    state.el.remove();
    if (state.backdrop) state.backdrop.remove();
    var anchor = anchorOf(state);
    if (anchor) {
      anchor.setAttribute("aria-expanded", "false");
      if (returnFocus) anchor.focus();
    }
  }

  function place() {
    if (!open) return;
    var el = open.el;
    if (isPhone()) {
      el.style.top = "";
      el.style.left = "";
      return;
    }
    var anchor = anchorOf(open);
    if (!anchor) return close(false);
    var rect = anchor.getBoundingClientRect();
    var w = el.offsetWidth, h = el.offsetHeight;
    // Under the icon, right edges aligned (Vendor List), kept inside an 8px screen gutter.
    var left = Math.min(Math.max(8, rect.right - w), window.innerWidth - w - 8);
    var top = rect.bottom + 4;
    if (top + h > window.innerHeight - 8) top = Math.max(8, rect.top - h - 4);
    el.style.left = Math.round(left) + "px";
    el.style.top = Math.round(top) + "px";
  }

  // ── Draft: what the dropdown shows; the table only changes on Apply ──
  function appliedValue(cfg) {
    if (cfg.type === "date") return { from: cfg.from || "", to: cfg.to || "" };
    if (cfg.type === "amount") return { min: cfg.min, max: cfg.max };
    return cfg.options.filter(function (o) { return o.checked; }).map(function (o) { return String(o.value); });
  }

  /** The draft from the fields; null while a date is half-typed. */
  function readDraft() {
    var cfg = open.cfg;
    if (cfg.type === "date") {
      var block = getDateBlock();
      var from = block.from.value ? usToIso(block.from.value) : "";
      var to = block.to.value ? usToIso(block.to.value) : "";
      if (from === null || to === null) return null;
      if (from && to && from > to) to = from;
      return { from: from, to: to };
    }
    if (cfg.type === "amount")
      return {
        min: cleanAmount(open.card.querySelector('[data-cf-amount="min"]').value),
        max: cleanAmount(open.card.querySelector('[data-cf-amount="max"]').value),
      };
    var values = [];
    Array.prototype.forEach.call(open.card.querySelectorAll("input[type=checkbox][data-cf-value]"), function (cb) {
      if (cb.checked) values.push(cb.getAttribute("data-cf-value"));
    });
    return values;
  }

  function isEmpty(type, v) {
    if (!v) return false;
    if (type === "date") return !v.from && !v.to;
    if (type === "amount") return v.min === "" && v.max === "";
    return !v.length;
  }

  function sameValue(type, a, b) {
    if (!a || !b) return false;
    if (type === "date") return a.from === b.from && a.to === b.to;
    if (type === "amount") {
      var num = function (v) { return v === "" || v == null ? "" : Number(v); };
      return num(a.min) === num(b.min) && num(a.max) === num(b.max);
    }
    return a.length === b.length && a.every(function (v) { return b.indexOf(v) !== -1; });
  }

  /** Same rules as the global panel: Reset needs something to clear, Apply needs a change. */
  function syncFooter() {
    if (!open) return;
    var draft = readDraft();
    var type = open.cfg.type;
    var reset = open.card.querySelector("[data-cf-reset]");
    var apply = open.card.querySelector("[data-cf-apply]");
    var datePartial = type === "date" && draft === null;
    if (reset) reset.disabled = !datePartial && isEmpty(type, draft);
    if (apply) apply.disabled = draft === null || sameValue(type, draft, appliedValue(open.cfg));
  }

  function listHtml(cfg) {
    var search = cfg.search
      ? '<div class="relative mb-2">' + SEARCH +
        '<input type="search" data-cf-search aria-label="' + esc(cfg.search) + '" placeholder="' + esc(cfg.search) +
        '" class="' + SEARCH_INPUT + '" /></div>'
      : "";
    var options = cfg.options
      .map(function (o) {
        return (
          '<app-checkbox class="rounded-md px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-white/5" data-cf-value="' + esc(o.value) +
          '" data-cf-label="' + esc(String(o.label).toLowerCase()) + '"' + (o.checked ? " checked" : "") + ">" + esc(o.label) + "</app-checkbox>"
        );
      })
      .join("");
    return (
      '<div class="p-2">' +
      search +
      '<div data-cf-options class="flex max-h-64 flex-col overflow-y-auto">' +
      (options || '<p class="px-2 py-1.5 type-body text-gray-500 dark:text-gray-400">No values</p>') +
      '<p data-cf-none class="hidden px-2 py-1.5 type-body text-gray-500 dark:text-gray-400">No matches</p>' +
      "</div></div>"
    );
  }

  function amountField(id, edge, label, value) {
    return (
      "<div>" +
      '<label for="' + id + '" class="' + LABEL + '">' + label + "</label>" +
      '<div class="relative mt-2">' +
      '<span aria-hidden="true" class="pointer-events-none absolute inset-y-0 left-3 z-20 flex items-center text-gray-400 dark:text-gray-500">' + DOLLAR + "</span>" +
      '<input id="' + id + '" data-cf-amount="' + edge + '" type="text" inputmode="decimal" autocomplete="off" placeholder="0.00" value="' + esc(formatAmount(value, true)) +
      '" class="' + AMOUNT_INPUT + '" />' +
      "</div></div>"
    );
  }

  function render(state) {
    var cfg = state.binding.describe(state.key) || {};
    cfg.options = cfg.options || [];
    cfg.min = cfg.min == null ? "" : String(cfg.min);
    cfg.max = cfg.max == null ? "" : String(cfg.max);
    state.cfg = cfg;
    state.card.setAttribute("aria-label", "Filter " + (cfg.title || ""));
    var body = "";
    if (cfg.type === "amount")
      body = '<div class="space-y-4 p-4">' + amountField("cf-amount-min", "min", "From", cfg.min) + amountField("cf-amount-max", "max", "To", cfg.max) + "</div>";
    else if (cfg.type !== "date") body = listHtml(cfg);
    state.card.innerHTML =
      '<div data-cf-body>' + body + "</div>" +
      '<div class="flex items-center justify-end gap-4 border-t border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-gray-800">' +
      '<button type="button" data-cf-reset class="' + RESET_BTN + '">Reset</button>' +
      '<button type="button" data-cf-apply class="' + APPLY_BTN + '">Apply</button>' +
      "</div>";
    if (cfg.type === "date") {
      var block = getDateBlock();
      block.from.value = isoToUs(cfg.from);
      block.to.value = isoToUs(cfg.to);
      state.card.querySelector("[data-cf-body]").appendChild(block.el);
      if (window.DateRangeCalendar) window.DateRangeCalendar.refreshAll();
    }
    Array.prototype.forEach.call(state.card.querySelectorAll("[data-cf-amount]"), attachAmount);
    syncFooter();
  }

  function resetDraft() {
    var type = open.cfg.type;
    if (type === "date") {
      var block = getDateBlock();
      block.from.value = "";
      block.to.value = "";
      closeCalendar();
      if (window.DateRangeCalendar) window.DateRangeCalendar.refreshAll();
    } else if (type === "amount") {
      Array.prototype.forEach.call(open.card.querySelectorAll("[data-cf-amount]"), function (input) { input.value = ""; });
    } else {
      Array.prototype.forEach.call(open.card.querySelectorAll("app-checkbox"), function (box) { box.checked = false; });
    }
    syncFooter();
  }

  function applyDraft() {
    var draft = readDraft();
    if (draft === null) return;
    open.binding.apply(open.key, draft);
    syncAll();
    close(true);
  }

  function openFor(table, binding, anchor) {
    var key = anchor.getAttribute("data-column-filter");
    if (open && open.table === table && open.key === key) {
      close(false);
      return;
    }
    close(false);
    var phone = isPhone();
    var el = document.createElement("div");
    el.setAttribute("data-column-filter-panel", "");
    el.className = phone ? "fixed inset-x-4 bottom-4 z-50" : "fixed z-50";
    var card = document.createElement("div");
    card.setAttribute("role", "dialog");
    card.tabIndex = -1;
    card.className =
      (phone ? "max-h-[calc(100dvh-2rem)] w-full overflow-y-auto" : "w-60 overflow-hidden") +
      " rounded-md bg-white text-left shadow-lg ring-1 ring-black/5 focus:outline-none dark:bg-gray-800 dark:ring-white/10";
    el.appendChild(card);
    var backdrop = null;
    if (phone) {
      backdrop = document.createElement("div");
      backdrop.className = "fixed inset-0 z-40 bg-gray-900/50";
      backdrop.setAttribute("data-column-filter-backdrop", "");
      document.body.appendChild(backdrop);
    }
    document.body.appendChild(el);
    open = { table: table, key: key, binding: binding, el: el, card: card, backdrop: backdrop };
    render(open);
    anchor.setAttribute("aria-expanded", "true");
    place();
    card.focus({ preventScroll: true });
  }

  function onClick(event) {
    var target = event.target;
    // A calendar day re-renders the calendar on click: its target is gone by the time we see it.
    if (!target || !target.isConnected) return;
    if (open && open.el.contains(target)) {
      var reset = target.closest("[data-cf-reset]");
      if (reset && !reset.disabled) {
        resetDraft();
        open.card.focus({ preventScroll: true });
      }
      var apply = target.closest("[data-cf-apply]");
      if (apply && !apply.disabled) applyDraft();
      return;
    }
    var hit = target.closest && target.closest("[data-column-filter]");
    if (hit) {
      for (var i = 0; i < bindings.length; i++) {
        if (bindings[i].table.contains(hit)) {
          event.preventDefault();
          openFor(bindings[i].table, bindings[i], hit);
          return;
        }
      }
    }
    // Outside click discards the draft. (The calendar is a DOM child of the dropdown, covered above.)
    if (open) close(false);
  }

  function onChange(event) {
    if (!open || !open.el.contains(event.target)) return;
    if (event.target.matches("input[type=checkbox][data-cf-value]")) syncFooter();
  }

  function onInput(event) {
    if (!open || !open.el.contains(event.target)) return;
    var t = event.target;
    if (t.hasAttribute("data-cf-search")) {
      var q = t.value.trim().toLowerCase();
      var shown = 0;
      Array.prototype.forEach.call(open.card.querySelectorAll("app-checkbox"), function (box) {
        var input = box.querySelector("[data-cf-label]");
        var match = !q || (input && input.getAttribute("data-cf-label").indexOf(q) !== -1);
        box.classList.toggle("hidden", !match);
        if (match) shown += 1;
      });
      var none = open.card.querySelector("[data-cf-none]");
      if (none) none.classList.toggle("hidden", shown > 0 || !q);
      return;
    }
    if (t.hasAttribute("data-cf-amount")) {
      syncFooter();
      return;
    }
    if (t.hasAttribute("data-cf-date")) {
      if (event.isTrusted) {
        var masked = maskUs(t.value);
        if (masked !== t.value) t.value = masked;
      }
      syncFooter();
    }
  }

  function onKeydown(event) {
    if (!open || event.key !== "Escape") return;
    // Esc first closes the calendar card (popover), then the dropdown.
    if (dateBlock && dateBlock.mount.matches(":popover-open")) return;
    event.preventDefault();
    close(true);
  }

  function onFocusIn(event) {
    if (!open) return;
    var t = event.target;
    if (open.el.contains(t)) return;
    var anchor = anchorOf(open);
    if (anchor && anchor === t) return;
    close(false);
  }

  function onScroll(event) {
    if (!open || (event.target && event.target.nodeType === 1 && open.el.contains(event.target))) return;
    place();
  }

  var listening = false;
  function listen() {
    if (listening) return;
    listening = true;
    document.addEventListener("click", onClick);
    document.addEventListener("change", onChange);
    document.addEventListener("input", onInput);
    document.addEventListener("keydown", onKeydown);
    document.addEventListener("focusin", onFocusIn);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", function () {
      if (!open) return;
      // Switching between phone sheet and desktop dropdown: reopen in the other layout.
      var phone = isPhone();
      if (phone !== open.el.classList.contains("inset-x-4")) close(false);
      else place();
    });
  }

  function sync(table) {
    bindings.forEach(function (b) {
      if (table && b.table !== table) return;
      Array.prototype.forEach.call(b.table.querySelectorAll("[data-column-filter]"), function (btn) {
        setActive(btn, b.isActive(btn.getAttribute("data-column-filter")));
        btn.setAttribute(
          "aria-expanded",
          open && open.table === b.table && open.key === btn.getAttribute("data-column-filter") ? "true" : "false",
        );
      });
    });
  }
  function syncAll() {
    sync(null);
  }

  function bind(table, binding) {
    if (!table || !binding) return;
    for (var i = 0; i < bindings.length; i++) {
      if (bindings[i].table === table) {
        bindings[i].describe = binding.describe;
        bindings[i].apply = binding.apply;
        bindings[i].isActive = binding.isActive;
        sync(table);
        return;
      }
    }
    bindings.push({ table: table, describe: binding.describe, apply: binding.apply, isActive: binding.isActive });
    listen();
    sync(table);
  }

  /** The options of a global-filter category, read from its rendered TableUi.filterCheckbox list. */
  function optionsFrom(wrap) {
    if (!wrap) return [];
    return Array.prototype.map.call(wrap.querySelectorAll("app-checkbox"), function (host) {
      var input = host.querySelector("input[type=checkbox]");
      var value = host.getAttribute("data-filter-value");
      if (value == null && input) value = input.getAttribute("data-filter-value");
      var text = host.textContent || "";
      var sr = host.querySelector(".sr-only");
      if (sr) text = text.slice(0, text.length - sr.textContent.length);
      return { value: value || "", label: text.trim(), checked: input ? input.checked : host.hasAttribute("checked") };
    });
  }

  window.ColumnFilter = {
    attachAmount: attachAmount,
    formatAmount: formatAmount,
    cleanAmount: cleanAmount,
    optionsFrom: optionsFrom,
    button: button,
    icon: icon,
    bind: bind,
    sync: sync,
    close: function () { close(false); },
  };
})();

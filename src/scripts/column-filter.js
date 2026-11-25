/**
 * ColumnFilter — the small filter dropdown under a table column header (TCDM-5238).
 *
 * Look and behaviour copied from the Vendor List "Payment network" filter (vendors-page.js):
 * w-60 card under the header icon, checkboxes (list columns only, TCDM-5238), icon highlighted while filtered.
 * No title (Andrian, 2026-11-20). Footer = the global filter's Reset + Apply: ticks are a draft until
 * Apply; Reset clears this column's filter at once and closes; Esc / outside click discard the draft. On phones (< 640px) a bottom sheet with a backdrop.
 *
 * The column filter does not keep its own state: the table hands it the current values of its
 * global filter and writes the result back, so both filters always show the same selection
 * (wiki/design-system/table-filter.md, "Column filter").
 *
 *   ColumnFilter.button(key, label, active, { style })  → header filter button (Figma Icon20/Solid/Filter)
 *   ColumnFilter.icon(active)                  → the icon alone (skeletons)
 *   ColumnFilter.bind(tableEl, {
 *     describe(key) → { title (aria-label), options: [{ value, label, checked }], search: "Search payee" },
 *     apply(key, values)  ← the ticked values
 *     isActive(key) → bool   (icon highlight)
 *   })
 *   ColumnFilter.optionsFrom(wrapEl)          → options of a global-filter list (TableUi.filterCheckbox)
 *   ColumnFilter.attachAmount(input) / formatAmount(v, pad) / cleanAmount(v)  → US money fields (global panel too)
 *   ColumnFilter.pinPanel(menu, button)       → global filter panel fixed under its button on desktop (never clipped)
 *   ColumnFilter.sync(tableEl)   re-highlight the header icons (after the table re-renders)
 *   ColumnFilter.close()
 */
(function () {
  "use strict";

  var SEARCH =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="pointer-events-none absolute top-1/2 left-3 shrink-0 -translate-y-1/2 size-4 text-gray-400 dark:text-gray-500"><path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clip-rule="evenodd" /></svg>';

  // Header icon = the markup each table had on origin/main (Andrian, 2026-11-20): same <img> asset, size and
  // button classes, no background pill; the icon itself is the one Figma icon below.
  var BTN_STYLES = {
    // Bills & Payables header button on main
    bills: "inline-flex size-5 items-center justify-center rounded-sm hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:hover:bg-white/10 dark:focus-visible:outline-blue-500",
    // SMART Exchange header button on main (Consumer Payments uses the same)
    exchange: "inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-500",
  };
  // One header filter icon in every table = Figma SMART System Icon20/Solid/Filter (Table/Header/Cell/Actions/Filter):
  // 14×14 box, funnel 9.8×11.2 (same path as src/assets/table/filter.svg), currentColor.
  var FILTER_PATH =
    "M2.1 2.1C2.1 1.7134 2.4134 1.4 2.8 1.4H11.2C11.5866 1.4 11.9 1.7134 11.9 2.1V4.2C11.9 4.38565 11.8262 4.5637 11.695 4.69497L8.4 7.98995V10.5C8.4 10.6857 8.32625 10.8637 8.19497 10.995L6.79497 12.395C6.59478 12.5952 6.29369 12.6551 6.03212 12.5467C5.77055 12.4384 5.6 12.1831 5.6 11.9V7.98995L2.30503 4.69497C2.17375 4.5637 2.1 4.38565 2.1 4.2V2.1Z";
  var ICON_IDLE = "text-gray-400 dark:text-gray-500"; // Figma State=Default
  var ICON_ON = "text-gray-500 dark:text-gray-300"; // applied filter (Figma darker state)

  // Search field and footer copied from the toolbar search and the global filter panel (bills-and-payables.html) and the toolbar search.
  var SEARCH_INPUT =
    "block h-10 w-full rounded-md border border-gray-300 bg-white py-0 pr-3 pl-9 text-base leading-6 font-normal text-gray-900 shadow-[0px_1px_1px_rgba(0,0,0,0.05)] placeholder:font-normal placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder:text-gray-500 dark:focus:outline-blue-500 hover:not-focus:border-gray-400 dark:hover:not-focus:border-white/25";
  // Reset text = Figma Button/Secondary (gray-700, dark white); disabled keeps the global panel's gray-500 / gray-300.
  var RESET_BTN =
    "h-7 cursor-pointer rounded border border-gray-300 bg-white px-2 text-sm leading-5 font-semibold text-gray-700 disabled:text-gray-500 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-white/5 dark:text-white dark:disabled:text-gray-300 dark:hover:bg-white/10";
  var APPLY_BTN =
    "h-7 cursor-pointer rounded bg-blue-600 px-2 text-sm leading-5 font-semibold text-white hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-blue-600";

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** opts: { style: "bills" | "exchange" } — the button classes that header had on main. */
  function button(key, label, active, opts) {
    opts = opts || {};
    return (
      '<button type="button" data-column-filter="' + esc(key) + '" aria-haspopup="dialog" aria-expanded="false"' +
      ' aria-label="Filter ' + esc(label) + '" class="' + (BTN_STYLES[opts.style] || BTN_STYLES.exchange) + '">' +
      icon(active) + "</button>"
    );
  }

  /** The header filter icon alone (also for table skeletons). */
  function icon(active) {
    return (
      '<svg viewBox="0 0 14 14" width="14" height="14" fill="currentColor" aria-hidden="true" data-cf-icon class="size-3.5 shrink-0 ' +
      (active ? ICON_ON : ICON_IDLE) + '"><path fill-rule="evenodd" clip-rule="evenodd" d="' + FILTER_PATH + '"/></svg>'
    );
  }

  function setActive(btn, active) {
    var svg = btn.querySelector("[data-cf-icon]");
    if (!svg) return;
    ICON_IDLE.split(" ").forEach(function (c) { svg.classList.toggle(c, !active); });
    ICON_ON.split(" ").forEach(function (c) { svg.classList.toggle(c, !!active); });
  }

  // ── Money fields (global filter Amount min / max): "121,321,321", "1,234.50" on blur ──
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

  function isPhone() {
    return window.matchMedia("(max-width: 639px)").matches;
  }

  function anchorOf(state) {
    return state.table.querySelector('[data-column-filter="' + state.key + '"]');
  }

  function close(returnFocus) {
    if (!open) return;
    var state = open;
    open = null;
    if (state.ro) state.ro.disconnect();
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
    return cfg.options.filter(function (o) { return o.checked; }).map(function (o) { return String(o.value); });
  }

  function readDraft() {
    var values = [];
    Array.prototype.forEach.call(open.card.querySelectorAll("input[type=checkbox][data-cf-value]"), function (cb) {
      if (cb.checked) values.push(cb.getAttribute("data-cf-value"));
    });
    return values;
  }

  function sameValue(a, b) {
    return a.length === b.length && a.every(function (v) { return b.indexOf(v) !== -1; });
  }

  /** Reset needs an applied filter or a ticked draft; Apply needs a change. */
  function syncFooter() {
    if (!open) return;
    var draft = readDraft();
    var reset = open.card.querySelector("[data-cf-reset]");
    var apply = open.card.querySelector("[data-cf-apply]");
    if (reset) reset.disabled = !draft.length && !open.binding.isActive(open.key);
    if (apply) apply.disabled = sameValue(draft, appliedValue(open.cfg));
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

  function render(state) {
    var cfg = state.binding.describe(state.key) || {};
    cfg.options = cfg.options || [];
    state.cfg = cfg;
    state.card.setAttribute("aria-label", "Filter " + (cfg.title || ""));
    state.card.innerHTML =
      "<div>" + listHtml(cfg) + "</div>" +
      '<div class="flex items-center justify-end gap-4 border-t border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-gray-800">' +
      '<button type="button" data-cf-reset class="' + RESET_BTN + '">Reset</button>' +
      '<button type="button" data-cf-apply class="' + APPLY_BTN + '">Apply</button>' +
      "</div>";
    syncFooter();
  }

  /** Reset applies at once (Andrian, 2026-11-20): removes this column's filter everywhere and closes. */
  function resetColumn() {
    open.binding.apply(open.key, []);
    syncAll();
    close(true);
  }

  function applyDraft() {
    var draft = readDraft();
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
    // The first measure can be stale (Tailwind's browser build styles new classes a moment later, fonts,
    // header re-render): re-place whenever the panel's size changes and on the next frames.
    var state = open;
    if (window.ResizeObserver) {
      state.ro = new ResizeObserver(function () { if (open === state) place(); });
      state.ro.observe(card);
    }
    requestAnimationFrame(function () {
      if (open === state) place();
      requestAnimationFrame(function () { if (open === state) place(); });
    });
    card.focus({ preventScroll: true });
  }

  function onClick(event) {
    var target = event.target;
    // Ignore clicks whose target was re-rendered away before reaching the document.
    if (!target || !target.isConnected) return;
    if (open && open.el.contains(target)) {
      var reset = target.closest("[data-cf-reset]");
      if (reset && !reset.disabled) {
        resetColumn();
        return;
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
    // Outside click discards the draft.
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
  }

  function onKeydown(event) {
    if (!open || event.key !== "Escape") return;
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

  // ── Global filter panel on desktop: fixed under its Filter button, so a short table card (overflow-hidden)
  // never clips it (TCDM-5238). Follows the button on scroll / resize while it is shown.
  var pinned = [];
  function placePinned(item) {
    var menu = item.menu, anchor = item.anchor;
    if (!anchor.isConnected || menu.style.position !== "fixed" || window.matchMedia("(max-width: 639px)").matches) return;
    var r = anchor.getBoundingClientRect();
    menu.style.left = "auto";
    menu.style.bottom = "auto";
    menu.style.right = Math.max(8, window.innerWidth - r.right) + "px";
    var h = menu.offsetHeight;
    var top = r.bottom + 8;
    if (top + h > window.innerHeight - 8) top = Math.max(8, window.innerHeight - h - 8);
    menu.style.top = Math.round(top) + "px";
  }
  function pinPanel(menu, anchor) {
    if (!menu || !anchor) return;
    menu.style.position = "fixed";
    menu.style.margin = "0";
    var item = null;
    for (var i = 0; i < pinned.length; i++) if (pinned[i].menu === menu) item = pinned[i];
    if (!item) {
      item = { menu: menu, anchor: anchor };
      pinned.push(item);
      if (pinned.length === 1) {
        var follow = function () {
          pinned.forEach(function (it) { if (!it.menu.classList.contains("invisible")) placePinned(it); });
        };
        window.addEventListener("scroll", follow, true);
        window.addEventListener("resize", follow);
      }
    }
    item.anchor = anchor;
    placePinned(item);
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
    pinPanel: pinPanel,
    button: button,
    icon: icon,
    bind: bind,
    sync: sync,
    close: function () { close(false); },
  };
})();

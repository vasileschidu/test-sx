/**
 * card-manager-bills.js
 * Cards Manager S10: Bill History tab of the card details page (TCDM-5229, wiki card-manager.md
 * 4.10, Figma list 8019:120161, empty 8019:119866, export 8019:121111).
 * Content, columns and copy follow Figma; nothing is invented (open points: TODO(confirm) below).
 *
 * Draws into [data-cm-details-panel="bills"] (made by card-manager-details.js) whenever the
 * details page shows ?view=bills. The panel element is re-created every time the details page
 * redraws, so it is looked up again on `details-tab`, `route` and `data-change` and drawn only
 * when empty. Sort, filter, page and expanded rows are kept per card while that card stays open.
 *
 *   - Table = the Bills & Payables look (Amount, Bill Reference, Payee, Payment Type, Source,
 *     Due Date, Status). bills-payables-table.js is a 5k-line page script and cannot be loaded
 *     as a module, so its patterns (sort arrows, badges, expand row, pagination, filter panel)
 *     are rebuilt here from the same classes / TableUi / TableSkeleton.
 *   - Filter funnels on Payee, Payment Type, Source, Status (labelled exactly like the headers).
 *   - Expanded row: Notes, Status, Attachments, Actions (Cancel Payment), Payment Method Details,
 *     Activity Log; each section only when the bill has data for it.
 *   - Header Export (card-manager-details.js, event `export-history` { cardId, view }) opens
 *     the Export confirm and downloads a CSV of every filtered + sorted row.
 *
 * Also exports window.CardManagerHistory (shared with card-manager-transactions.js, load order:
 * this file first): sort / pagination / badge / empty block / Export confirm + CSV helpers.
 *
 * TODO(confirm), not in Figma: "Cancel Payment" flow (emits CardManager `cancel-bill`); the lock
 * icon Figma shows before cross-border amounts (Bills & Payables has none); Payee search in the
 * filter; text for "filters returned nothing"; "(EST)" after activity dates; where the
 * "#2345REQ3" link goes; the 4th tab "Card Reconciliation" (out of R1, not built).
 */
(function () {
  "use strict";

  var cm = window.CardManager;
  if (!cm) return;

  /* =====================================================================
   * Shared helpers: window.CardManagerHistory
   * ===================================================================== */

  var PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
  var SKELETON_MS = 450;

  var BADGE_COLORS = {
    gray: "border-gray-200 bg-gray-100 text-gray-800 dark:border-white/15 dark:bg-white/10 dark:text-gray-300",
    red: "border-red-200 bg-red-100 text-red-800 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-400",
    yellow:
      "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-400",
    green:
      "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-400",
    blue: "border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-400",
  };

  // Two-tone sort arrows, same as the Bills / Cards list tables.
  var SORT_ARROW_UP =
    "M10 3C10.2652 3 10.5196 3.10536 10.7071 3.29289L13.7071 6.29289C14.0976 6.68342 14.0976 7.31658 13.7071 7.70711C13.3166 8.09763 12.6834 8.09763 12.2929 7.70711L10 5.41421L7.70711 7.70711C7.31658 8.09763 6.68342 8.09763 6.29289 7.70711C5.90237 7.31658 5.90237 6.68342 6.29289 6.29289L9.29289 3.29289C9.48043 3.10536 9.73478 3 10 3Z";
  var SORT_ARROW_DOWN =
    "M6.29289 12.2929C6.68342 11.9024 7.31658 11.9024 7.70711 12.2929L10 14.5858L12.2929 12.2929C12.6834 11.9024 13.3166 11.9024 13.7071 12.2929C14.0976 12.6834 14.0976 13.3166 13.7071 13.7071L10.7071 16.7071C10.3166 17.0976 9.68342 17.0976 9.29289 16.7071L6.29289 13.7071C5.90237 13.3166 5.90237 12.6834 6.29289 12.2929Z";
  var SORT_TONE_IDLE = "text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300";
  var SORT_TONE_ON = "text-blue-600 dark:text-blue-400";
  var SORT_TONE_DIM = "text-gray-300 dark:text-gray-600";

  var BTN_SM_SECONDARY =
    "inline-flex cursor-pointer items-center justify-center rounded-md bg-white px-3 py-1.5 text-sm/5 font-semibold text-gray-700 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-white/10 dark:text-gray-300 dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/20 dark:hover:text-white dark:active:bg-white/25 dark:focus-visible:outline-blue-400";
  var BTN_SM_PRIMARY =
    "inline-flex cursor-pointer items-center justify-center rounded-md bg-blue-600 px-3 py-1.5 text-sm/5 font-semibold text-white shadow-xs hover:bg-blue-500 active:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300 dark:disabled:bg-blue-500/40 dark:disabled:text-white/60 dark:focus-visible:outline-blue-400";
  var EXPORT_PANEL =
    "relative flex w-full max-w-125 flex-col overflow-clip rounded-lg bg-white shadow-lg ring-1 ring-black/5 dark:bg-gray-900 dark:ring-white/10";

  var exportSeq = 0;

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function assetUrl(file) {
    var path = window.location.pathname || "";
    var at = path.indexOf("/src/pages/");
    var root = at >= 0 ? path.slice(0, at) : "";
    return root + "/src/assets/cards-manager/" + file;
  }

  function tableIcon(file, w, h, extra) {
    if (window.TableUi) return window.TableUi.icon(file, w, h, extra);
    return '<span class="inline-flex size-5 shrink-0"></span>';
  }

  var SYMBOLS = { USD: "$", GBP: "£", EUR: "€" };
  function money(amount, currency) {
    var n = Number(amount) || 0;
    return (
      (SYMBOLS[currency || "USD"] || "$") +
      n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
  }

  function pad2(n) {
    return (n < 10 ? "0" : "") + n;
  }

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  /** "2023-08-17" -> "Aug 17, 2023" (Bills table) */
  function dateMon(value) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""));
    return m ? MONTHS[Number(m[2]) - 1] + " " + m[3] + ", " + m[1] : "";
  }

  /** "2024-03-02T10:00:00" -> "03/02/2024" (Transaction History) */
  function dateMDY(value) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""));
    return m ? m[2] + "/" + m[3] + "/" + m[1] : "";
  }

  /** "2023-08-29T10:40:00" -> "Aug 29, 2023 10:40 AM" */
  function dateTimeLong(value) {
    var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(value || ""));
    if (!m) return "";
    var h = Number(m[4]);
    return (
      MONTHS[Number(m[2]) - 1] + " " + m[3] + ", " + m[1] + " " + (h % 12 || 12) + ":" + m[5] + " " + (h >= 12 ? "PM" : "AM")
    );
  }

  function findCard(id) {
    var list = (cm.data && cm.data.smartCards) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function panelEl(view) {
    return document.querySelector('[data-cm-details-panel="' + view + '"]');
  }

  function viewFromUrl() {
    var v = new URLSearchParams(window.location.search).get("view");
    return v === "bills" || v === "transactions" ? v : "details";
  }

  function sortBadge(direction) {
    var up = !direction ? SORT_TONE_IDLE : direction === "asc" ? SORT_TONE_ON : SORT_TONE_DIM;
    var down = !direction ? SORT_TONE_IDLE : direction === "desc" ? SORT_TONE_ON : SORT_TONE_DIM;
    return (
      '<svg viewBox="0 0 20 20" aria-hidden="true" data-sort-arrows class="size-5 shrink-0">' +
      '<path fill="currentColor" class="' + up + '" d="' + SORT_ARROW_UP + '"/>' +
      '<path fill="currentColor" class="' + down + '" d="' + SORT_ARROW_DOWN + '"/>' +
      "</svg>"
    );
  }

  /**
   * Header cell. col = { key, label, sortable, align, filter (category key), twoLine }.
   * opts.filterOpen = key of the open filter category ("" none), opts.filterApplied(key) -> bool.
   */
  function headerCell(col, state, opts) {
    opts = opts || {};
    var right = col.align === "right";
    var text = "type-overline text-gray-500 dark:text-gray-400 " + (col.twoLine ? "text-left" : "whitespace-nowrap");
    var current = state.sortKey === col.key ? state.sortDirection : "";
    var labelHtml = col.twoLine ? esc(col.label).replace(" ", "<br>") : esc(col.label);
    var label = col.sortable
      ? '<button type="button" data-sort-key="' + col.key +
        '" class="group inline-flex cursor-pointer items-center gap-1 rounded-sm ' + text +
        ' focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">' +
        "<span>" + labelHtml + "</span>" + sortBadge(current) + "</button>"
      : '<span class="' + text + '">' + labelHtml + "</span>";
    var filter = col.filter
      ? '<button type="button" data-bh-column-filter="' + col.filter + '" aria-label="Filter ' + esc(col.label) +
        '" aria-haspopup="true" aria-expanded="' + (opts.filterOpen === col.filter ? "true" : "false") +
        '" class="inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-sm hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:hover:bg-white/10">' +
        tableIcon("filter-funnel.svg", 14, 14) + "</button>"
      : "";
    return (
      '<th scope="col"' +
      (col.sortable
        ? ' aria-sort="' + (current === "asc" ? "ascending" : current === "desc" ? "descending" : "none") + '"'
        : "") +
      ' class="h-13 border-b border-dashed border-gray-200 px-3 align-middle dark:border-white/10 ' +
      (right ? "text-right" : "text-left") + '">' +
      '<div class="flex items-center gap-1' + (right ? " justify-end" : "") + '">' + label + filter + "</div></th>"
    );
  }

  /** Sort click: arrow halves pick asc / desc with the mouse, keyboard cycles asc, desc, off. */
  function applySort(state, key, event, target) {
    var arrows = target.closest("[data-sort-arrows]");
    if (arrows && event.detail > 0) {
      var box = arrows.getBoundingClientRect();
      var picked = event.clientY < box.top + box.height / 2 ? "asc" : "desc";
      if (state.sortKey === key && state.sortDirection === picked) {
        state.sortKey = "";
        state.sortDirection = "";
      } else {
        state.sortKey = key;
        state.sortDirection = picked;
      }
    } else if (state.sortKey !== key) {
      state.sortKey = key;
      state.sortDirection = "asc";
    } else if (state.sortDirection === "asc") {
      state.sortDirection = "desc";
    } else {
      state.sortKey = "";
      state.sortDirection = "";
    }
    state.page = 1;
  }

  /** rows sorted by value(row, key); numbers numerically, text with localeCompare. */
  function sortRows(rows, state, value) {
    if (!state.sortKey || !state.sortDirection) return rows;
    var dir = state.sortDirection === "asc" ? 1 : -1;
    var key = state.sortKey;
    return rows.slice().sort(function (a, b) {
      var av = value(a, key);
      var bv = value(b, key);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv), "en", { numeric: true, sensitivity: "base" }) * dir;
    });
  }

  function badge(label, color, leftHtml) {
    return (
      '<span class="inline-flex items-center justify-center rounded border text-sm/5 font-medium whitespace-nowrap ' +
      (leftHtml ? "gap-0.5 py-0.5 pr-2 pl-1 " : "px-2 py-0.5 ") +
      (BADGE_COLORS[color] || BADGE_COLORS.gray) + '">' + (leftHtml || "") + esc(label) + "</span>"
    );
  }

  function pageButton(attr, label, file, disabled) {
    return (
      '<button type="button" ' + attr + ' aria-label="' + label +
      '" class="inline-flex size-8 items-center justify-center rounded-md border border-gray-300 bg-white p-1.5 dark:border-white/15 dark:bg-white/5 ' +
      (disabled
        ? "cursor-not-allowed opacity-40"
        : "cursor-pointer shadow-xs hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:hover:bg-white/10") +
      '"' + (disabled ? " disabled" : "") + ">" + tableIcon(file, 20, 20) + "</button>"
    );
  }

  /** Bills footer: Rows per Page, Showing x - y of n results, first / prev / next / last. */
  function paginationHtml(state, total) {
    var size = state.pageSize;
    var totalPages = Math.max(1, Math.ceil(total / size));
    var start = Math.min((state.page - 1) * size + 1, total);
    var end = Math.min(state.page * size, total);
    var first = state.page <= 1;
    var last = state.page >= totalPages;
    var options = PAGE_SIZE_OPTIONS.map(function (opt) {
      return (
        '<a href="#" data-page-size="' + opt + '" class="block px-4 py-3 text-sm ' +
        (opt === size
          ? "bg-gray-50 font-semibold text-gray-900 dark:bg-white/5 dark:text-white"
          : "text-gray-700 dark:text-gray-300") +
        ' hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900 focus:outline-hidden dark:hover:bg-white/5 dark:hover:text-white dark:focus:bg-white/5 dark:focus:text-white">' +
        opt + "</a>"
      );
    }).join("");
    return (
      '<div class="flex w-full flex-wrap items-center justify-end gap-4">' +
      '<div class="flex flex-wrap items-center justify-end gap-x-4 gap-y-3 sm:h-10 sm:flex-nowrap">' +
      '<span class="text-sm font-normal text-gray-700 dark:text-gray-300">Rows per Page:</span>' +
      '<el-dropdown class="inline-block">' +
      '<button type="button" class="inline-flex h-10 w-18.75 cursor-pointer items-center justify-between rounded-md border border-gray-300 bg-white px-3 text-base/6 font-medium text-gray-900 shadow-xs hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-white/15 dark:bg-white/5 dark:text-white dark:shadow-none dark:hover:bg-white/10">' +
      size + tableIcon("select-chevron.svg", 20, 20) + "</button>" +
      '<el-menu anchor="bottom end" popover class="w-18.75 rounded-md bg-white shadow-lg outline-1 outline-black/5 [--anchor-gap:--spacing(1)] dark:bg-gray-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10 transition transition-discrete data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-100 data-leave:ease-in motion-reduce:transition-none">' +
      '<div class="py-1">' + options + "</div></el-menu></el-dropdown>" +
      '<p class="text-sm font-normal whitespace-nowrap text-gray-700 dark:text-gray-300">Showing ' +
      '<span class="font-semibold">' + (total ? start + " - " + end : "0 - 0") + "</span> of " +
      '<span class="font-semibold">' + total + "</span> results</p>" +
      '<div class="flex items-start gap-2" aria-label="Pagination">' +
      pageButton("data-page-first", "First page", "page-first.svg", first) +
      pageButton("data-page-prev", "Previous page", "page-prev.svg", first) +
      pageButton("data-page-next", "Next page", "page-next.svg", last) +
      pageButton("data-page-last", "Last page", "page-last.svg", last) +
      "</div></div></div>"
    );
  }

  function paginationSkeletonHtml() {
    return (
      '<div class="flex w-full animate-pulse items-center justify-end gap-4">' +
      '<span class="inline-flex h-4 w-28 rounded bg-gray-200 dark:bg-white/15"></span>' +
      '<span class="inline-flex h-10 w-18.75 rounded-md bg-gray-200 dark:bg-white/15"></span>' +
      '<span class="inline-flex h-4 w-56 rounded bg-gray-200 dark:bg-white/15"></span>' +
      '<span class="inline-flex h-8 w-34.5 rounded-md bg-gray-200 dark:bg-white/15"></span>' +
      "</div>"
    );
  }

  /** Page-size and pager clicks. Returns true when the click was one of them (state changed). */
  function pagerClick(state, total, event, target) {
    var sizeLink = target.closest("[data-page-size]");
    if (sizeLink) {
      event.preventDefault();
      state.pageSize = Number(sizeLink.getAttribute("data-page-size")) || PAGE_SIZE_OPTIONS[0];
      state.page = 1;
      return true;
    }
    var pager = target.closest("[data-page-first], [data-page-prev], [data-page-next], [data-page-last]");
    if (pager && !pager.disabled) {
      var totalPages = Math.max(1, Math.ceil(total / state.pageSize));
      if (pager.hasAttribute("data-page-first")) state.page = 1;
      else if (pager.hasAttribute("data-page-prev")) state.page = Math.max(1, state.page - 1);
      else if (pager.hasAttribute("data-page-next")) state.page = Math.min(totalPages, state.page + 1);
      else state.page = totalPages;
      return true;
    }
    return false;
  }

  var ICON_CHEVRON =
    '<svg class="size-4 text-gray-600 transition-transform duration-200 motion-reduce:transition-none dark:text-gray-300" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>';

  /** Leading chevron cell: the real control (aria-expanded, Enter / Space natively). */
  function expandCell(rowId, expanded, detailId, label, border) {
    return (
      '<td class="h-13 w-13 min-w-13 p-0 text-center align-middle whitespace-nowrap' + border + '">' +
      '<button type="button" data-cm-expand="' + esc(rowId) + '" aria-expanded="' + (expanded ? "true" : "false") +
      '" aria-controls="' + esc(detailId) + '" aria-label="' + esc(label) +
      '" class="group/expand inline-flex h-13 w-full cursor-pointer items-center justify-center focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400">' +
      ICON_CHEVRON.replace('class="size-4 ', 'class="size-4 ' + (expanded ? "rotate-90 " : "")) +
      "</button></td>"
    );
  }

  /**
   * An expanded row sits inside the scrolling table: size its content (sticky, left-0) to the visible
   * scroll width so a table wider than the card never pushes the details out of sight (like
   * TableUi.fitEmptyStates). Call after every render; runs on resize.
   */
  function fitDetails() {
    var boxes = document.querySelectorAll("[data-bh-detail-fit]");
    Array.prototype.forEach.call(boxes, function (box) {
      var scroller = box.closest("[data-table-scroll]");
      if (scroller) box.style.width = scroller.clientWidth + "px";
    });
  }
  window.addEventListener("resize", fitDetails);

  /** Empty tab (no records at all): Figma icon + title + text, no table. */
  function emptyBlock(iconSvg, title, text) {
    return (
      '<div data-bh-empty class="flex flex-col items-center gap-3 px-6 py-28 text-center">' +
      '<span class="text-gray-400 dark:text-gray-500">' + iconSvg + "</span>" +
      '<div class="flex flex-col gap-1">' +
      '<h3 class="text-lg/6 font-semibold text-gray-900 dark:text-white">' + esc(title) + "</h3>" +
      '<p class="text-sm/5 font-normal text-gray-500 dark:text-gray-400">' + esc(text) + "</p></div></div>"
    );
  }

  /** Header Export button: enabled only when there is something to export. */
  function syncExport(enabled) {
    var mount = cm.mount("details");
    var btn = mount && mount.querySelector('[data-cm-details-action="export-history"]');
    if (btn) btn.disabled = !enabled;
  }

  /* ---------- Export confirm (Figma 8019:121111) + CSV ---------- */

  function slug(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function downloadCsv(filename, columns, rows) {
    var quote = function (v) {
      return '"' + String(v == null ? "" : v).replace(/\s+/g, " ").trim().replace(/"/g, '""') + '"';
    };
    var lines = [columns.map(quote).join(",")].concat(
      rows.map(function (r) {
        return r.map(quote).join(",");
      }),
    );
    // BOM so Excel reads UTF-8 (same as TableExport's CSV).
    var blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  /**
   * Export confirm: title "Export" + X, "You're about to export N row(s) from <label>." and
   * "(in CSV format)", Cancel (Secondary) / Export (Primary). opts = { label, count, onExport }.
   * Esc, X, Cancel and the backdrop close it; Export closes it, then calls onExport().
   */
  function openExport(opts) {
    var ob = window.OBModal;
    if (!ob) return null;
    var titleId = "cm-export-title-" + ++exportSeq;
    var header =
      '<div class="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-gray-200 pr-4 pl-6 dark:border-white/10">' +
      '<h2 id="' + titleId + '" class="text-lg/7 font-medium text-gray-900 dark:text-white">Export</h2>' +
      '<button type="button" data-ob-modal-close class="shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-300 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400">' +
      '<span class="sr-only">Close</span>' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="size-5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button></div>';
    var body =
      '<div class="flex flex-col gap-1 px-6 py-6 text-sm/5 text-gray-700 dark:text-gray-300">' +
      "<p>You're about to export <strong class=\"font-semibold text-gray-900 dark:text-white\">" + esc(opts.count) +
      " row(s)</strong> from <span class=\"font-medium text-blue-600 dark:text-blue-400\">" + esc(opts.label) + "</span>.</p>" +
      '<p class="text-gray-500 dark:text-gray-400">(in CSV format)</p></div>';
    var footer =
      '<div class="flex justify-end gap-3 rounded-b-lg border-t border-gray-200 bg-white px-6 py-4 dark:border-white/10 dark:bg-gray-900">' +
      '<button type="button" data-ob-modal-close class="' + BTN_SM_SECONDARY + '">Cancel</button>' +
      '<button type="button" data-cm-export-confirm class="' + BTN_SM_PRIMARY + '">Export</button></div>';
    var backdrop = ob.open(body, titleId, { bare: true, header: header, footer: footer, panelClass: EXPORT_PANEL });
    var confirmBtn = backdrop.querySelector("[data-cm-export-confirm]");
    confirmBtn.addEventListener("click", function () {
      ob.close();
      if (opts.onExport) opts.onExport();
    });
    return backdrop;
  }

  /** Close the dialog, write the CSV, then the same toast as TableExport. */
  function runExport(filename, columns, rows) {
    downloadCsv(filename, columns, rows);
    var n = rows.length;
    if (typeof window.showGlobalTopToast === "function") {
      window.showGlobalTopToast("Exported " + n + (n === 1 ? " row" : " rows") + " as CSV.");
    }
  }

  window.CardManagerHistory = {
    SKELETON_MS: SKELETON_MS,
    BADGE_COLORS: BADGE_COLORS,
    esc: esc,
    assetUrl: assetUrl,
    tableIcon: tableIcon,
    money: money,
    dateMon: dateMon,
    dateMDY: dateMDY,
    dateTimeLong: dateTimeLong,
    findCard: findCard,
    panelEl: panelEl,
    viewFromUrl: viewFromUrl,
    slug: slug,
    today: today,
    headerCell: headerCell,
    applySort: applySort,
    sortRows: sortRows,
    badge: badge,
    paginationHtml: paginationHtml,
    paginationSkeletonHtml: paginationSkeletonHtml,
    pagerClick: pagerClick,
    expandCell: expandCell,
    emptyBlock: emptyBlock,
    syncExport: syncExport,
    fitDetails: fitDetails,
    openExport: openExport,
    runExport: runExport,
  };

  var H = window.CardManagerHistory;

  /* =====================================================================
   * Bill History
   * ===================================================================== */

  var VIEW = "bills";

  var COLUMNS = [
    { key: "expand", type: "expand" },
    { key: "amount", label: "Amount", sortable: true, align: "right" },
    { key: "billNumber", label: "Bill Reference", sortable: true, twoLine: true },
    { key: "payeeName", label: "Payee", sortable: true, filter: "payeeName" },
    { key: "paymentType", label: "Payment Type", filter: "paymentType" },
    { key: "source", label: "Source", filter: "source" },
    { key: "dueDate", label: "Due Date", sortable: true },
    { key: "status", label: "Status", filter: "status" },
  ];
  // Filter categories = the columns that have a funnel, labelled exactly like the header.
  var CATEGORIES = COLUMNS.filter(function (c) {
    return c.filter;
  }).map(function (c) {
    return { key: c.filter, label: c.label };
  });

  // Same labels / colours as the Bills & Payables badges; the label wins, the status key is the fallback.
  var COLOR_BY_LABEL = {
    processing: "blue",
    initiated: "blue",
    "in progress": "blue",
    "past due": "red",
    exception: "red",
    failed: "red",
    "pending initiation": "gray",
    paid: "green",
    completed: "green",
    scheduled: "yellow",
  };
  var COLOR_BY_STATUS = { paid: "green", in_progress: "blue", exception: "red", scheduled: "yellow", ready_to_pay: "gray" };
  var ICON_SPINNER =
    '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true" class="size-3.5 shrink-0"><circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2.2 2.2" stroke-linecap="round" /></svg>';
  var ICON_DOC =
    '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="size-3.5 shrink-0 text-gray-400 dark:text-gray-500"><path d="M3 2.75A1.75 1.75 0 0 1 4.75 1h3.69c.46 0 .9.18 1.23.51l2.82 2.82c.33.33.51.77.51 1.23v7.69A1.75 1.75 0 0 1 11.25 15h-6.5A1.75 1.75 0 0 1 3 13.25V2.75ZM5.5 8a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5Zm0 2.5a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5Z" /></svg>';
  var ICON_CHEVRON_RIGHT =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 shrink-0 text-gray-400 dark:text-gray-500"><path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>';
  var ICON_ALERT =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd" /></svg>';
  var ICON_EMPTY =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="size-9"><path fill-rule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625ZM7.5 15a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 15Zm.75 2.25a.75.75 0 0 0 0 1.5H12a.75.75 0 0 0 0-1.5H8.25Z" clip-rule="evenodd" /><path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" /></svg>';

  var DETAIL_LABEL = "w-full shrink-0 px-4 pt-4 sm:w-39 sm:py-4 type-overline text-gray-500 dark:text-gray-400";
  var DETAIL_SEPARATOR = '<div class="border-t border-gray-200 dark:border-white/10"></div>';
  var BTN_GRAY =
    "inline-flex cursor-pointer items-center justify-center rounded-md bg-gray-100 px-3.5 py-2 text-sm/5 font-semibold text-gray-700 hover:bg-gray-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/20 dark:focus-visible:outline-white/40";
  var LINK =
    "rounded-sm text-blue-600 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-blue-400 dark:hover:text-blue-300";
  var FOOTER_RESET =
    "h-7 cursor-pointer rounded border border-gray-300 bg-white px-2 text-sm/5 font-semibold text-gray-500 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10";
  var FOOTER_APPLY =
    "h-7 cursor-pointer rounded bg-blue-600 px-2 text-sm/5 font-semibold text-white hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-blue-600";
  var LINK_BTN =
    "cursor-pointer rounded px-1.5 py-0.5 text-xs/4 font-semibold text-blue-600 transition-colors hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-blue-400 dark:hover:bg-white/10";
  var NAV_ITEM =
    "flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm/5 font-medium text-gray-800 transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 dark:text-gray-200 dark:hover:bg-white/10";
  var NAV_ITEM_ON = " bg-gray-100 dark:bg-white/10";
  var NAV_BADGE =
    "-my-0.5 inline-flex items-center rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs/4 font-medium text-blue-800 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-400";

  var state = null; // per open card: see newState()
  var rendering = false;
  var refs = {};

  function newState(cardId) {
    return {
      cardId: cardId,
      sortKey: "",
      sortDirection: "",
      page: 1,
      pageSize: PAGE_SIZE_OPTIONS[0],
      applied: {}, // category -> Set of values
      draft: {},
      category: CATEGORIES[0].key,
      filterOpen: false,
      expanded: new Set(),
      loading: true,
      loaded: false,
    };
  }

  function bills() {
    var card = H.findCard(state && state.cardId);
    return card && Array.isArray(card.bills) ? card.bills : [];
  }

  /* ---------- row values ---------- */

  function statusLabel(bill) {
    return bill.statusLabel || String(bill.status || "").replace(/_/g, " ");
  }

  function statusColor(bill) {
    return COLOR_BY_LABEL[statusLabel(bill).toLowerCase()] || COLOR_BY_STATUS[bill.status] || "gray";
  }

  function statusBadge(bill) {
    var color = statusColor(bill);
    return H.badge(statusLabel(bill), color, color === "blue" ? ICON_SPINNER : "");
  }

  function categoryValue(bill, key) {
    return key === "status" ? statusLabel(bill) : String(bill[key] == null ? "" : bill[key]);
  }

  function sortValue(bill, key) {
    if (key === "amount") return Number(bill.amount) || 0;
    if (key === "status") return statusLabel(bill);
    return bill[key] == null ? "" : String(bill[key]);
  }

  function activeCategories() {
    return CATEGORIES.filter(function (c) {
      return state.applied[c.key] && state.applied[c.key].size;
    });
  }

  function filteredRows() {
    var rows = bills().filter(function (bill) {
      return activeCategories().every(function (c) {
        return state.applied[c.key].has(categoryValue(bill, c.key));
      });
    });
    return H.sortRows(rows, state, sortValue);
  }

  function isOverdue(bill) {
    return String(bill.status || "").toLowerCase() !== "paid" && String(bill.dueDate || "").slice(0, 10) < H.today();
  }

  /* ---------- markup ---------- */

  function columnClass(col) {
    if (col.type === "expand") return " w-13 min-w-13 px-0";
    return " px-3" + (col.align === "right" ? " text-right" : " text-left");
  }

  function headerHtml() {
    var cells = COLUMNS.map(function (col) {
      if (col.type === "expand") {
        return '<th scope="col" class="h-13 w-13 min-w-13 border-b border-dashed border-gray-200 px-0 dark:border-white/10"><span class="sr-only">Expand</span></th>';
      }
      return H.headerCell(col, state, { filterOpen: state.filterOpen ? state.category : "" });
    }).join("");
    return '<thead class="bg-white dark:bg-gray-900"><tr>' + cells + "</tr></thead>";
  }

  function section(label, content) {
    return (
      '<div class="flex flex-col sm:flex-row"><div class="' + DETAIL_LABEL + '">' + label + "</div>" +
      '<div class="min-w-0 flex-1 p-4">' + content + "</div></div>"
    );
  }

  function notesSection(bill) {
    var notes = bill.details && bill.details.notes;
    return notes ? section("Notes", '<p class="text-sm/5 text-gray-900 dark:text-white">' + H.esc(notes) + "</p>") : "";
  }

  function statusSection(bill) {
    return section("Status", statusBadge(bill));
  }

  function attachmentsSection(bill) {
    var list = bill.details && bill.details.attachments;
    if (!list || !list.length) return "";
    return section(
      "Attachments",
      '<div class="flex flex-wrap items-center gap-2">' +
        list.map(function (att) {
          return (
            '<span class="inline-flex items-center gap-1.5 rounded border border-gray-200 bg-gray-100 px-2 py-0.5 text-sm/5 font-medium text-gray-800 dark:border-white/10 dark:bg-white/10 dark:text-gray-200">' +
            ICON_DOC + H.esc(att && att.name) + "</span>"
          );
        }).join("") +
        "</div>",
    );
  }

  function actionsSection(bill) {
    // Figma shows Cancel Payment on a Processing bill: only a payment still in flight can be cancelled.
    if (statusColor(bill) !== "blue") return "";
    return section(
      "Actions",
      '<button type="button" data-cm-cancel-bill="' + H.esc(bill.id) + '" class="' + BTN_GRAY + '">Cancel Payment</button>',
    );
  }

  function methodSection(bill) {
    var pmd = bill.details && bill.details.paymentMethodDetails;
    if (!pmd || !pmd.fields || !pmd.fields.length) return "";
    var rows = pmd.fields.map(function (f) {
      return (
        '<div class="flex flex-col sm:flex-row"><dt class="text-sm/5 font-normal text-gray-500 sm:w-48 sm:shrink-0 dark:text-gray-400">' +
        H.esc(f.label) + '</dt><dd class="min-w-0 text-sm/5 font-normal break-words whitespace-pre-line text-gray-900 dark:text-white">' +
        H.esc(f.value) + "</dd></div>"
      );
    }).join("");
    return (
      '<div class="flex flex-col sm:flex-row"><div class="' + DETAIL_LABEL + '">Payment Method<br>Details</div>' +
      '<div class="flex min-w-0 flex-1 flex-col gap-4 p-4 sm:flex-row sm:gap-0">' +
      '<div class="flex items-start text-sm/5 text-gray-900 sm:w-37 sm:shrink-0 dark:text-white"><span class="sm:w-25">' +
      H.esc(pmd.method) + "</span>" + ICON_CHEVRON_RIGHT.replace("size-5", "size-5 -mt-px max-sm:hidden") + "</div>" +
      '<dl class="flex min-w-0 flex-1 flex-col gap-4">' + rows + "</dl></div></div>"
    );
  }

  var DOT_CLASS = {
    blue: "border-blue-500 text-blue-500 dark:border-blue-400 dark:text-blue-400",
    green: "border-emerald-500 text-emerald-500 dark:border-emerald-400 dark:text-emerald-400",
    red: "border-red-500 text-red-500 dark:border-red-400 dark:text-red-400",
    gray: "border-gray-400 text-gray-400 dark:border-gray-500 dark:text-gray-500",
  };

  /** "Payment for payable id #2345REQ3 is processing" -> the #ref becomes a link (target TODO(confirm)). */
  function linkRefs(text) {
    return H.esc(text).replace(
      /(#[0-9A-Za-z]{4,})/g,
      '<a href="#" data-cm-bill-ref class="font-normal ' + LINK + '">$1</a>',
    );
  }

  function activitySection(bill) {
    var log = bill.details && bill.details.activityLog;
    if (!log || !log.length) return "";
    var items = log.map(function (item, i) {
      var color = COLOR_BY_LABEL[String(item.title || "").toLowerCase()] || "gray";
      var last = i === log.length - 1;
      var date = H.dateTimeLong(item.timestamp);
      return (
        '<li class="flex gap-3"><div class="flex w-6 shrink-0 flex-col items-center">' +
        '<span aria-hidden="true" class="mt-1 inline-flex size-4 shrink-0 rounded-full border-2 ' +
        (color === "blue" ? "border-dashed " : "") + DOT_CLASS[color] + '"></span>' +
        (last ? "" : '<span aria-hidden="true" class="mt-1 w-px flex-1 bg-gray-200 dark:bg-white/10"></span>') +
        "</div>" +
        '<div class="flex min-w-0 flex-col gap-1 ' + (last ? "" : "pb-4") + '">' +
        '<p class="text-base/6 font-medium text-gray-900 dark:text-white">' + H.esc(item.title) + "</p>" +
        '<p class="text-sm/5 text-gray-700 dark:text-gray-300">' + linkRefs(item.description) + "</p>" +
        (date ? '<p class="text-xs/4 text-gray-500 dark:text-gray-400">' + H.esc(date) + " (EST)</p>" : "") +
        "</div></li>"
      );
    }).join("");
    return section("Activity Log", '<ol class="flex flex-col">' + items + "</ol>");
  }

  function detailsHtml(bill) {
    var top = [notesSection(bill), statusSection(bill), attachmentsSection(bill)].filter(Boolean).join("");
    var rest = [actionsSection(bill), methodSection(bill), activitySection(bill)]
      .filter(Boolean)
      .map(function (html) {
        return DETAIL_SEPARATOR + html;
      })
      .join("");
    return top + rest;
  }

  function rowHtml(bill, isLast) {
    var expanded = state.expanded.has(bill.id);
    // No divider under an expanded row (its details follow) or under the last row.
    var border = isLast || expanded ? "" : " border-b border-gray-200 dark:border-white/10";
    var base = "h-13 align-middle whitespace-nowrap px-3" + border;
    var detailId = "cm-bill-detail-" + bill.id;
    var overdue = isOverdue(bill);
    var due =
      '<span class="inline-flex items-center gap-1 ' +
      (overdue ? "text-amber-600 dark:text-amber-400" : "text-gray-500 dark:text-gray-400") + '">' +
      H.esc(H.dateMon(bill.dueDate)) +
      (overdue
        ? '<span role="img" aria-label="Overdue" class="inline-flex text-amber-500 dark:text-amber-400">' + ICON_ALERT + "</span>"
        : "") +
      "</span>";
    var payee = H.esc(bill.payeeName);
    var main =
      '<tr data-cm-bill-row="' + H.esc(bill.id) + '" class="group cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5' +
      (expanded ? " bg-gray-100 dark:bg-white/5" : "") + '">' +
      H.expandCell(bill.id, expanded, detailId, (expanded ? "Collapse " : "Expand ") + "bill " + (bill.billNumber || ""), border) +
      '<td class="' + base + ' text-right"><span class="type-body inline-flex items-center justify-end gap-1 text-gray-900 dark:text-white">' +
      H.esc(H.money(bill.amount, bill.currency)) +
      ' <span class="text-gray-500 dark:text-gray-400">' + H.esc(bill.currency || "USD") + "</span></span></td>" +
      '<td class="' + base + '"><span class="type-body text-gray-500 dark:text-gray-400">' + H.esc(bill.billNumber) + "</span></td>" +
      '<td class="' + base + '"><span title="' + payee + '" class="type-body block max-w-80 truncate text-gray-900 dark:text-white">' + payee + "</span></td>" +
      '<td class="' + base + '"><span class="type-body text-gray-900 dark:text-white">' + H.esc(bill.paymentType) + "</span></td>" +
      '<td class="' + base + '"><span class="type-body text-gray-900 dark:text-white">' + H.esc(bill.source) + "</span></td>" +
      '<td class="' + base + ' type-body">' + due + "</td>" +
      '<td class="' + base + '">' + statusBadge(bill) + "</td></tr>";
    var detail = expanded
      ? '<tr id="' + H.esc(detailId) + '" data-cm-bill-detail="' + H.esc(bill.id) + '"><td colspan="' + COLUMNS.length +
        '" class="bg-white p-0 dark:bg-gray-900' + (isLast ? "" : " border-b border-gray-200 dark:border-white/10") + '">' +
        '<div data-bh-detail-fit class="sticky left-0">' + detailsHtml(bill) + "</div></td></tr>"
      : "";
    return main + detail;
  }

  function emptyRowHtml() {
    var box = window.TableUi
      ? window.TableUi.emptyState({
          title: "No bills found",
          text: "Try adjusting the active filters to find matching bills.",
        })
      : "No bills found";
    return '<tr><td colspan="' + COLUMNS.length + '" class="p-0">' + box + "</td></tr>";
  }

  var FILTER_PANEL =
    '<div data-bh-filter-menu role="dialog" aria-label="Filter Bill History" class="pointer-events-none invisible fixed z-60 w-157 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg bg-white opacity-0 shadow-lg ring-1 ring-black/5 transition-opacity duration-200 ease-out dark:bg-gray-800 dark:shadow-none dark:ring-white/10">' +
    '<div class="flex flex-col sm:flex-row">' +
    '<div data-bh-filter-nav class="shrink-0 border-b border-gray-200 bg-gray-50 p-3 sm:w-56 sm:border-r sm:border-b-0 dark:border-white/10 dark:bg-gray-900/40"></div>' +
    '<div class="min-w-0 flex-1 p-4">' +
    '<div class="flex items-center justify-between">' +
    '<p data-bh-filter-title class="text-sm/5 font-medium text-gray-700 dark:text-gray-200"></p>' +
    '<button type="button" data-bh-select-all class="' + LINK_BTN + '">Select all</button></div>' +
    '<div class="mt-2 mb-3 h-px bg-gray-200 dark:bg-white/10"></div>' +
    '<div data-bh-filter-list class="flex max-h-60 min-h-40 flex-col gap-2 overflow-auto"></div></div></div>' +
    '<div class="flex items-center justify-end gap-4 border-t border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-gray-800">' +
    '<button type="button" data-bh-filter-reset class="' + FOOTER_RESET + '">Reset</button>' +
    '<button type="button" data-bh-filter-apply class="' + FOOTER_APPLY + '">Apply</button></div></div>';

  function shellHtml() {
    return (
      '<div data-bh-root="' + VIEW + '" class="-mt-2">' +
      '<div data-bh-chips class="hidden flex-wrap items-center gap-2 pb-4"></div>' +
      '<div data-table-scroll class="w-full max-w-full overflow-x-auto">' +
      '<table data-bh-table class="w-full min-w-max table-auto border-separate border-spacing-0"></table></div>' +
      '<div data-pagination class="-mx-6 border-t border-gray-200 bg-white px-6 py-4 dark:border-white/10 dark:bg-gray-900"></div>' +
      FILTER_PANEL +
      "</div>"
    );
  }

  function cacheRefs(root) {
    refs.root = root;
    refs.table = root.querySelector("[data-bh-table]");
    refs.pagination = root.querySelector("[data-pagination]");
    refs.chips = root.querySelector("[data-bh-chips]");
    refs.menu = root.querySelector("[data-bh-filter-menu]");
    refs.nav = root.querySelector("[data-bh-filter-nav]");
    refs.title = root.querySelector("[data-bh-filter-title]");
    refs.list = root.querySelector("[data-bh-filter-list]");
    refs.apply = root.querySelector("[data-bh-filter-apply]");
    refs.reset = root.querySelector("[data-bh-filter-reset]");
  }

  /* ---------- render ---------- */

  function renderChips() {
    var active = activeCategories();
    if (!active.length) {
      refs.chips.classList.add("hidden");
      refs.chips.classList.remove("flex");
      refs.chips.innerHTML = "";
      return;
    }
    refs.chips.innerHTML = active.map(function (c) {
      return window.TableUi.filterChip({
        label: c.label,
        value: Array.from(state.applied[c.key]).join(", "),
        type: c.key,
      });
    }).join("");
    refs.chips.classList.remove("hidden");
    refs.chips.classList.add("flex");
  }

  function renderSkeleton(panel) {
    panel.innerHTML = shellHtml();
    cacheRefs(panel.querySelector("[data-bh-root]"));
    if (window.TableSkeleton) {
      window.TableSkeleton.render({
        tableEl: refs.table,
        columns: COLUMNS,
        rowCount: 5,
        columnClass: columnClass,
        headerAddon: function (col) {
          return col.filter ? H.tableIcon("filter-funnel.svg", 14, 14) : "";
        },
      });
    }
    refs.pagination.innerHTML = H.paginationSkeletonHtml();
  }

  function renderTable() {
    var rows = filteredRows();
    var total = rows.length;
    var totalPages = Math.max(1, Math.ceil(total / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    var from = (state.page - 1) * state.pageSize;
    var visible = rows.slice(from, from + state.pageSize);
    var body = visible.map(function (bill, i) {
      return rowHtml(bill, i === visible.length - 1);
    }).join("");
    refs.table.innerHTML = headerHtml() + '<tbody class="bg-white dark:bg-gray-900">' + (body || emptyRowHtml()) + "</tbody>";
    refs.pagination.innerHTML = H.paginationHtml(state, total);
    renderChips();
    H.syncExport(total > 0);
    if (window.TableUi) window.TableUi.fitEmptyStates();
    H.fitDetails();
  }

  function drawEmpty(panel) {
    panel.innerHTML = H.emptyBlock(ICON_EMPTY, "No Bill History", "You don't have any bills");
    refs.root = null;
    H.syncExport(false);
  }

  /** Look the panel up again (the details page re-creates it) and draw it when it is empty. */
  function ensure() {
    if (rendering) return;
    var id = cm.route && cm.route.card;
    if (!id) {
      state = null;
      return;
    }
    if (!state || state.cardId !== id) state = newState(id);
    var panel = H.panelEl(VIEW);
    if (!panel || H.viewFromUrl() !== VIEW) return;
    if (panel.firstElementChild) return; // already drawn
    rendering = true;
    try {
      if (!bills().length) {
        drawEmpty(panel);
        state.loaded = true;
        state.loading = false;
      } else if (state.loading && !state.loaded) {
        renderSkeleton(panel);
        H.syncExport(false);
        var stamp = state;
        setTimeout(function () {
          if (state !== stamp) return;
          state.loading = false;
          state.loaded = true;
          var again = H.panelEl(VIEW);
          if (again && H.viewFromUrl() === VIEW && again.querySelector(".animate-pulse")) {
            again.innerHTML = "";
            ensure();
          }
        }, H.SKELETON_MS);
      } else {
        panel.innerHTML = shellHtml();
        cacheRefs(panel.querySelector("[data-bh-root]"));
        renderTable();
      }
    } finally {
      rendering = false;
    }
  }

  /* ---------- filter panel ---------- */

  function cloneApplied() {
    var out = {};
    CATEGORIES.forEach(function (c) {
      out[c.key] = new Set(Array.from(state.applied[c.key] || []));
    });
    return out;
  }

  function sameDraft() {
    return CATEGORIES.every(function (c) {
      var a = state.draft[c.key];
      var b = state.applied[c.key] || new Set();
      if (a.size !== b.size) return false;
      var same = true;
      a.forEach(function (v) {
        if (!b.has(v)) same = false;
      });
      return same;
    });
  }

  function categoryValues(key) {
    var counts = {};
    var order = [];
    bills().forEach(function (bill) {
      var v = categoryValue(bill, key);
      if (!v) return;
      if (!(v in counts)) {
        counts[v] = 0;
        order.push(v);
      }
      counts[v] += 1;
    });
    return order.sort(function (a, b) {
      return a.localeCompare(b, "en", { sensitivity: "base" });
    }).map(function (v) {
      return { value: v, count: counts[v] };
    });
  }

  function renderNav() {
    refs.nav.innerHTML = '<div class="flex flex-col">' + CATEGORIES.map(function (c) {
      var n = state.draft[c.key].size;
      return (
        '<button type="button" data-bh-filter-cat="' + c.key + '" aria-pressed="' + (c.key === state.category) +
        '" class="' + NAV_ITEM + (c.key === state.category ? NAV_ITEM_ON : "") + '"><span class="min-w-0 flex-1">' + H.esc(c.label) + "</span>" +
        (n ? '<span class="' + NAV_BADGE + '">' + n + "</span>" : "") + "</button>"
      );
    }).join("") + "</div>";
  }

  function renderFilter() {
    var cat = CATEGORIES.filter(function (c) {
      return c.key === state.category;
    })[0];
    renderNav();
    refs.title.textContent = cat.label;
    refs.list.innerHTML = categoryValues(cat.key).map(function (opt, i) {
      return window.TableUi.filterCheckbox({
        id: "cm-bills-filter-" + cat.key + "-" + i,
        label: opt.value,
        countText: String(opt.count),
        value: opt.value,
        checked: state.draft[cat.key].has(opt.value),
      });
    }).join("");
    syncFilterButtons();
  }

  function syncFilterButtons() {
    var any = CATEGORIES.some(function (c) {
      return state.draft[c.key].size;
    });
    refs.reset.disabled = !any;
    refs.apply.disabled = sameDraft();
  }

  function positionMenu(trigger) {
    var rect = trigger.getBoundingClientRect();
    var width = refs.menu.offsetWidth || 628;
    var margin = 16;
    var left = Math.min(Math.max(rect.right - width, margin), window.innerWidth - width - margin);
    refs.menu.style.left = Math.round(left) + "px";
    refs.menu.style.top = Math.round(rect.bottom + 8) + "px";
  }

  function triggerFor(key) {
    return refs.table && refs.table.querySelector('[data-bh-column-filter="' + key + '"]');
  }

  function setFilterOpen(open, key, opts) {
    if (!refs.menu) return;
    var wasOpen = !refs.menu.classList.contains("invisible");
    var prev = triggerFor(state.category);
    if (key) state.category = key;
    state.filterOpen = !!open;
    if (prev) prev.setAttribute("aria-expanded", "false");
    var trigger = triggerFor(state.category);
    if (open) {
      if (!wasOpen) state.draft = cloneApplied();
      renderFilter();
      if (trigger) {
        trigger.setAttribute("aria-expanded", "true");
        positionMenu(trigger);
      }
      refs.menu.classList.remove("invisible", "opacity-0", "pointer-events-none");
      var first = refs.menu.querySelector("input[type='checkbox']");
      if (first && !(opts && opts.keepFocus)) first.focus();
    } else {
      refs.menu.classList.add("invisible", "opacity-0", "pointer-events-none");
      if (opts && opts.restoreFocus && trigger) trigger.focus();
    }
  }

  function applyFilter() {
    state.applied = cloneDraft();
    state.page = 1;
    var key = state.category;
    setFilterOpen(false);
    renderTable();
    var trigger = triggerFor(key);
    if (trigger) trigger.focus();
  }

  function cloneDraft() {
    var out = {};
    CATEGORIES.forEach(function (c) {
      out[c.key] = new Set(Array.from(state.draft[c.key]));
    });
    return out;
  }

  /* ---------- events ---------- */

  function restoreFocus(selector) {
    var el = refs.table && refs.table.querySelector(selector);
    if (el) el.focus();
  }

  function toggleRow(id) {
    if (state.expanded.has(id)) state.expanded.delete(id);
    else state.expanded.add(id);
    renderTable();
    restoreFocus('[data-cm-expand="' + id + '"]');
  }

  function onClick(event) {
    var target = event.target;
    var root = target.closest && target.closest('[data-bh-root="' + VIEW + '"]');
    if (!root || !state) return;
    if (root !== refs.root) cacheRefs(root);

    if (target.closest("[data-cm-bill-ref]")) {
      event.preventDefault(); // TODO(confirm): where the request link goes
      return;
    }
    var cancel = target.closest("[data-cm-cancel-bill]");
    if (cancel) {
      cm.emit("cancel-bill", { cardId: state.cardId, billId: cancel.getAttribute("data-cm-cancel-bill") });
      return;
    }

    var filterBtn = target.closest("[data-bh-column-filter]");
    if (filterBtn) {
      var key = filterBtn.getAttribute("data-bh-column-filter");
      setFilterOpen(!(state.filterOpen && state.category === key), key);
      return;
    }
    var cat = target.closest("[data-bh-filter-cat]");
    if (cat) {
      state.category = cat.getAttribute("data-bh-filter-cat");
      renderFilter();
      var again = refs.nav.querySelector('[data-bh-filter-cat="' + state.category + '"]');
      if (again) again.focus();
      return;
    }
    if (target.closest("[data-bh-select-all]")) {
      Array.prototype.forEach.call(refs.list.querySelectorAll("input[type='checkbox']"), function (input) {
        input.checked = true;
        state.draft[state.category].add(input.getAttribute("data-filter-value"));
      });
      renderFilter();
      return;
    }
    if (target.closest("[data-bh-filter-reset]")) {
      CATEGORIES.forEach(function (c) {
        state.draft[c.key].clear();
      });
      renderFilter();
      return;
    }
    if (target.closest("[data-bh-filter-apply]")) {
      if (!refs.apply.disabled) applyFilter();
      return;
    }
    var remove = target.closest("[data-filter-tag-remove]");
    if (remove) {
      delete state.applied[remove.getAttribute("data-filter-tag-remove")];
      state.page = 1;
      renderTable();
      return;
    }
    var open = target.closest("[data-filter-tag-open]");
    if (open) {
      setFilterOpen(true, open.getAttribute("data-filter-tag-open"));
      return;
    }

    var sortBtn = target.closest("[data-sort-key]");
    if (sortBtn) {
      var sortKey = sortBtn.getAttribute("data-sort-key");
      H.applySort(state, sortKey, event, target);
      renderTable();
      restoreFocus('[data-sort-key="' + sortKey + '"]');
      return;
    }

    if (H.pagerClick(state, filteredRows().length, event, target)) {
      renderTable();
      return;
    }

    var row = target.closest("tr[data-cm-bill-row]");
    if (row) toggleRow(row.getAttribute("data-cm-bill-row"));
  }

  function onKeydown(event) {
    if (!state || !refs.root || !refs.root.contains(event.target)) return;
    if (event.key === "Escape" && state.filterOpen) {
      event.stopPropagation();
      setFilterOpen(false, null, { restoreFocus: true });
    }
  }

  function onChange(event) {
    var input = event.target.closest && event.target.closest("input[type='checkbox'][data-filter-value]");
    if (!input || !state || !refs.menu || !refs.menu.contains(input)) return;
    var value = input.getAttribute("data-filter-value");
    if (input.checked) state.draft[state.category].add(value);
    else state.draft[state.category].delete(value);
    // Only the nav counts and Reset / Apply change: leave the list (and the focus) alone.
    renderNav();
    syncFilterButtons();
  }

  function onDocumentClick(event) {
    if (!state || !state.filterOpen || !refs.menu) return;
    if (refs.menu.contains(event.target) || event.target.closest("[data-bh-column-filter], [data-filter-tag-open]")) return;
    setFilterOpen(false);
  }

  function exportRows() {
    var rows = filteredRows();
    var card = H.findCard(state.cardId);
    var columns = ["Amount", "Bill Reference", "Payee", "Payment Type", "Source", "Due Date", "Status"];
    var data = rows.map(function (bill) {
      return [
        H.money(bill.amount, bill.currency) + " " + (bill.currency || "USD"),
        bill.billNumber,
        bill.payeeName,
        bill.paymentType,
        bill.source,
        H.dateMon(bill.dueDate),
        statusLabel(bill),
      ];
    });
    return { columns: columns, rows: data, name: H.slug(card && card.name) + "-bill-history-" + H.today() + ".csv" };
  }

  function onExport(payload) {
    if (!payload || payload.view !== VIEW || !state || state.cardId !== payload.cardId) return;
    var out = exportRows();
    if (!out.rows.length) return;
    H.openExport({
      label: "Bill History",
      count: out.rows.length,
      onExport: function () {
        H.runExport(out.name, out.columns, out.rows);
      },
    });
  }

  function init() {
    var mount = cm.mount("details");
    if (!mount) return;
    mount.addEventListener("click", onClick);
    mount.addEventListener("keydown", onKeydown);
    mount.addEventListener("change", onChange);
    document.addEventListener("click", onDocumentClick);
    window.addEventListener("resize", function () {
      if (state && state.filterOpen) setFilterOpen(false);
    });
    window.addEventListener(
      "scroll",
      function (event) {
        if (state && state.filterOpen && !(refs.menu && refs.menu.contains(event.target))) setFilterOpen(false);
      },
      true,
    );
    cm.on("details-tab", ensure);
    cm.on("route", ensure);
    cm.on("data-change", ensure);
    cm.on("export-history", onExport);
    cm.ready.then(ensure);
    window.addEventListener("load", ensure);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

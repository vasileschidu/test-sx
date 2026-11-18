/**
 * card-manager-list.js
 * SMART Cards list for Cards Manager (SMART Hub). TCDM-5220, Figma 10001:272320,
 * wiki/products/smart-hub/modules/card-manager.md §4.1.
 *
 * Waits for CardManager.ready, then draws the SMART Cards card (header, Status filter chips,
 * table, pagination) into CardManager.mount('smart'). With no cards (?empty=1 or every card
 * removed) the mount is left empty so card-manager.js shows its empty state. Every render
 * ends with CardManager.emit("data-change") so the tab count and the empty state refresh.
 *
 *   - "+ Create New" emits CardManager "create-card" (opened by card-manager-create.js).
 *   - A row click, or Enter / Space on a focused row, calls
 *     CardManager.navigate({ tab: 'smart', card: id }).
 *   - Any other story that changes CardManager.data and emits "data-change" redraws the list
 *     (sort, filter and page are kept).
 *
 * Reuses TableUi (icons, filter chip, filter checkbox, empty state), TableSkeleton, PPComponents
 * (card brand logos) and the Bills table patterns (sort arrows, pagination, filter panel).
 */
(function () {
  "use strict";

  var cm = window.CardManager;
  if (!cm) return;

  var PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
  var INITIAL_SKELETON_MS = 500;

  // Status -> label, Badge colour (components skill: emerald / amber / red / gray), greyed row.
  var STATUS = {
    active: {
      label: "Active",
      greyed: false,
      badge:
        "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-400",
    },
    blocked: {
      label: "Blocked",
      greyed: false,
      badge:
        "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-400",
    },
    expired: {
      label: "Expired",
      greyed: true,
      badge:
        "border-red-200 bg-red-100 text-red-800 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-400",
    },
    closed: {
      label: "Closed",
      greyed: true,
      badge:
        "border-gray-200 bg-gray-100 text-gray-800 dark:border-white/15 dark:bg-white/10 dark:text-gray-300",
    },
  };
  var STATUS_ORDER = ["active", "blocked", "expired", "closed"];

  var COLUMNS = [
    { key: "last4", label: "Card Number", sortable: true },
    { key: "name", label: "Card Name", sortable: true },
    { key: "availableBalance", label: "Available Balance", sortable: false, align: "right" },
    { key: "expires", label: "Expires", sortable: true },
    { key: "createdAt", label: "Created", sortable: true },
    { key: "status", label: "Status", sortable: true, align: "right", type: "status" },
  ];

  var state = {
    sortKey: "",
    sortDirection: "",
    page: 1,
    pageSize: PAGE_SIZE_OPTIONS[0],
    applied: new Set(), // status keys the table is filtered to
    draft: new Set(), // selection inside the open filter panel
    filterOpen: false,
    loading: true,
  };
  var refs = {};
  var mount = null;
  var rendering = false;

  /* ---------- helpers ---------- */

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

  function money(amount) {
    return (
      "$" +
      (Number(amount) || 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  /** "2028-05" or "2023-04-12T12:28:00" -> "05/2028" / "04/2023" */
  function mmyyyy(value) {
    var m = /^(\d{4})-(\d{2})/.exec(String(value || ""));
    return m ? m[2] + "/" + m[1] : "";
  }

  function allCards() {
    return Array.isArray(cm.data.smartCards) ? cm.data.smartCards : [];
  }

  function statusOf(card) {
    return STATUS[card.status] || STATUS.closed;
  }

  function brandLogo(card) {
    var pp = window.PPComponents;
    var network = String(card.network || "mastercard").toLowerCase();
    if (pp && typeof pp.getCardBrandLogoMarkup === "function") {
      return pp.getCardBrandLogoMarkup(network);
    }
    return (
      '<img src="' + assetUrl("card-mastercard-mark.svg") + '" alt="" width="24" height="16" class="h-4 w-auto" />'
    );
  }

  /* ---------- rows: filter, sort, page ---------- */

  function filteredRows() {
    var rows = allCards();
    if (state.applied.size) {
      rows = rows.filter(function (card) {
        return state.applied.has(card.status);
      });
    }
    if (state.sortKey && state.sortDirection) {
      var dir = state.sortDirection === "asc" ? 1 : -1;
      var key = state.sortKey;
      rows = rows.slice().sort(function (a, b) {
        var av = key === "status" ? statusOf(a).label : String(a[key] == null ? "" : a[key]);
        var bv = key === "status" ? statusOf(b).label : String(b[key] == null ? "" : b[key]);
        return av.localeCompare(bv, "en", { numeric: true, sensitivity: "base" }) * dir;
      });
    }
    return rows;
  }

  /* ---------- markup ---------- */

  // Two-tone sort arrows, same as the Bills / Users tables: the active half blue, the other dimmed.
  var SORT_ARROW_UP =
    "M10 3C10.2652 3 10.5196 3.10536 10.7071 3.29289L13.7071 6.29289C14.0976 6.68342 14.0976 7.31658 13.7071 7.70711C13.3166 8.09763 12.6834 8.09763 12.2929 7.70711L10 5.41421L7.70711 7.70711C7.31658 8.09763 6.68342 8.09763 6.29289 7.70711C5.90237 7.31658 5.90237 6.68342 6.29289 6.29289L9.29289 3.29289C9.48043 3.10536 9.73478 3 10 3Z";
  var SORT_ARROW_DOWN =
    "M6.29289 12.2929C6.68342 11.9024 7.31658 11.9024 7.70711 12.2929L10 14.5858L12.2929 12.2929C12.6834 11.9024 13.3166 11.9024 13.7071 12.2929C14.0976 12.6834 14.0976 13.3166 13.7071 13.7071L10.7071 16.7071C10.3166 17.0976 9.68342 17.0976 9.29289 16.7071L6.29289 13.7071C5.90237 13.3166 5.90237 12.6834 6.29289 12.2929Z";
  var SORT_TONE_IDLE =
    "text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300";
  var SORT_TONE_ON = "text-blue-600 dark:text-blue-400";
  var SORT_TONE_DIM = "text-gray-300 dark:text-gray-600";

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

  // No fixed widths: the table sizes to its content and scrolls inside the card when it is wider.
  function columnClass(col) {
    return " px-3" + (col.align === "right" ? " text-right" : " text-left");
  }

  function filterTrigger() {
    return (
      '<button type="button" data-cm-column-filter aria-label="Filter Status" aria-haspopup="true" aria-expanded="' +
      (state.filterOpen ? "true" : "false") +
      '" class="inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-sm hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:hover:bg-white/10">' +
      tableIcon("filter-funnel.svg", 14, 14) +
      "</button>"
    );
  }

  function headerHtml() {
    var cells = COLUMNS.map(function (col) {
      var right = col.align === "right";
      var text = "type-overline whitespace-nowrap text-gray-500 dark:text-gray-400";
      var current = state.sortKey === col.key ? state.sortDirection : "";
      var label = col.sortable
        ? '<button type="button" data-sort-key="' + col.key +
          '" class="group inline-flex cursor-pointer items-center gap-1 rounded-sm ' + text +
          ' focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">' +
          "<span>" + esc(col.label) + "</span>" + sortBadge(current) + "</button>"
        : '<span class="' + text + '">' + esc(col.label) + "</span>";
      return (
        '<th scope="col"' +
        (col.sortable
          ? ' aria-sort="' + (current === "asc" ? "ascending" : current === "desc" ? "descending" : "none") + '"'
          : "") +
        ' class="h-13 border-b border-dashed border-gray-200 align-middle dark:border-white/10' +
        columnClass(col) + '">' +
        '<div class="flex items-center gap-1' + (right ? " justify-end" : "") + '">' +
        label +
        (col.key === "status" ? filterTrigger() : "") +
        "</div></th>"
      );
    }).join("");
    return '<thead class="bg-white dark:bg-gray-900"><tr>' + cells + "</tr></thead>";
  }

  function badgeHtml(card) {
    var st = statusOf(card);
    return (
      '<span class="inline-flex items-center justify-center rounded border px-2 py-0.5 text-xs/4 font-medium whitespace-nowrap ' +
      st.badge + '">' + esc(st.label) + "</span>"
    );
  }

  function rowHtml(card, isLast) {
    var st = statusOf(card);
    var border = isLast ? "" : " border-b border-gray-200 dark:border-white/10";
    var base = "h-13 align-middle whitespace-nowrap" + border;
    // Expired / Closed rows are greyed: the cell content fades, the divider stays.
    function cell(col, html, extra) {
      var inner = st.greyed ? '<span class="inline-flex items-center opacity-50">' + html + "</span>" : html;
      return '<td class="' + base + columnClass(col) + (extra || "") + '">' + inner + "</td>";
    }
    var last4 = String(card.last4 || "");
    var name = String(card.name || "");
    return (
      '<tr data-cm-card-id="' + esc(card.id) + '" tabindex="0" aria-label="Open card ending ' + esc(last4) +
      ', ' + esc(name) + '" class="group cursor-pointer hover:bg-gray-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 dark:hover:bg-white/5">' +
      cell(
        COLUMNS[0],
        '<span class="inline-flex items-center gap-2">' + brandLogo(card) +
          '<span class="type-body text-gray-900 dark:text-white">••••' + esc(last4) + "</span></span>",
      ) +
      cell(
        COLUMNS[1],
        '<span title="' + esc(name) + '" class="type-body block max-w-80 truncate text-gray-900 dark:text-white">' + esc(name) + "</span>",
      ) +
      cell(
        COLUMNS[2],
        '<span class="type-body text-gray-900 dark:text-white">' + esc(money(card.availableBalance)) +
          ' <span class="text-gray-500 dark:text-gray-400">' + esc(card.currency || "USD") + "</span></span>",
      ) +
      cell(COLUMNS[3], '<span class="type-body text-gray-500 dark:text-gray-400">' + esc(mmyyyy(card.expires)) + "</span>") +
      cell(COLUMNS[4], '<span class="type-body text-gray-500 dark:text-gray-400">' + esc(mmyyyy(card.createdAt)) + "</span>") +
      cell(COLUMNS[5], badgeHtml(card)) +
      "</tr>"
    );
  }

  function emptyRowHtml() {
    var box = window.TableUi
      ? window.TableUi.emptyState({
          title: "No cards found",
          text: "Try adjusting the active filters to find matching cards.",
        })
      : "No cards found";
    return '<tr><td colspan="' + COLUMNS.length + '" class="p-0">' + box + "</td></tr>";
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

  function paginationHtml(total) {
    var size = state.pageSize;
    var totalPages = Math.max(1, Math.ceil(total / size));
    var start = Math.min((state.page - 1) * size + 1, total);
    var end = Math.min(state.page * size, total);
    var first = state.page <= 1;
    var lastPage = state.page >= totalPages;
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
      pageButton("data-page-next", "Next page", "page-next.svg", lastPage) +
      pageButton("data-page-last", "Last page", "page-last.svg", lastPage) +
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

  /* ---------- shell (header, chips, table, pagination, filter panel) ---------- */

  var CREATE_BUTTON =
    '<button type="button" data-cm-create class="inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300 dark:disabled:bg-blue-500/40 dark:disabled:text-white/60">' +
    '<img src="' + assetUrl("icon-plus.svg") + '" alt="" width="18" height="18" class="size-4.5" />Create New</button>';

  var LINK_BTN =
    "cursor-pointer rounded px-1.5 py-0.5 text-xs/4 font-semibold text-blue-600 transition-colors hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-blue-400 dark:hover:bg-white/10";

  var FOOTER_RESET =
    "h-7 cursor-pointer rounded border border-gray-300 bg-white px-2 text-sm/5 font-semibold text-gray-500 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10";
  var FOOTER_APPLY =
    "h-7 cursor-pointer rounded bg-blue-600 px-2 text-sm/5 font-semibold text-white hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-blue-600";

  // Status filter panel: the Bills filter menu (one category, so no category list on the left).
  var FILTER_PANEL =
    '<div data-cm-filter-menu role="dialog" aria-label="Filter by Status" class="pointer-events-none invisible fixed z-60 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg bg-white opacity-0 shadow-lg ring-1 ring-black/5 transition-opacity duration-200 ease-out dark:bg-gray-800 dark:shadow-none dark:ring-white/10">' +
    '<div class="p-4">' +
    '<div class="flex items-center justify-between">' +
    '<p class="text-sm/5 font-medium text-gray-700 dark:text-gray-200">Status</p>' +
    '<button type="button" data-cm-select-all class="' + LINK_BTN + '">Select all</button></div>' +
    '<div class="mt-2 mb-3 h-px bg-gray-200 dark:bg-white/10"></div>' +
    '<div data-cm-filter-list class="flex flex-col gap-2"></div></div>' +
    '<div class="flex items-center justify-end gap-4 border-t border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-gray-800">' +
    '<button type="button" data-cm-filter-reset class="' + FOOTER_RESET + '">Reset</button>' +
    '<button type="button" data-cm-filter-apply class="' + FOOTER_APPLY + '">Apply</button></div></div>';

  function shellHtml() {
    return (
      '<div data-cm-list>' +
      '<div class="flex flex-col gap-4 border-b border-gray-200 px-6 py-5 sm:flex-row sm:items-start sm:justify-between dark:border-white/10">' +
      '<div class="min-w-0"><h2 class="text-2xl/8 font-semibold text-gray-900 dark:text-white">SMART Cards</h2>' +
      '<p class="mt-1 text-sm/5 font-normal text-gray-500 dark:text-gray-400">Instantly generate and fund cards with cashback for customer payments.</p></div>' +
      CREATE_BUTTON + "</div>" +
      '<div data-cm-chips class="hidden flex-wrap items-center gap-2 px-6 pt-4"></div>' +
      '<div data-table-scroll class="w-full max-w-full overflow-x-auto px-3">' +
      '<table data-cm-table class="w-full min-w-max table-auto border-separate border-spacing-0"></table></div>' +
      '<div data-pagination class="border-t border-gray-200 bg-white px-6 py-4 dark:border-white/10 dark:bg-gray-900"></div>' +
      FILTER_PANEL +
      "</div>"
    );
  }

  function cacheRefs() {
    refs.root = mount.querySelector("[data-cm-list]");
    refs.table = mount.querySelector("[data-cm-table]");
    refs.pagination = mount.querySelector("[data-pagination]");
    refs.chips = mount.querySelector("[data-cm-chips]");
    refs.menu = mount.querySelector("[data-cm-filter-menu]");
    refs.list = mount.querySelector("[data-cm-filter-list]");
    refs.apply = mount.querySelector("[data-cm-filter-apply]");
    refs.reset = mount.querySelector("[data-cm-filter-reset]");
  }

  function ensureShell() {
    if (mount.querySelector("[data-cm-list]")) {
      cacheRefs();
      return;
    }
    mount.innerHTML = shellHtml();
    cacheRefs();
  }

  /* ---------- render ---------- */

  function renderChips() {
    if (!refs.chips) return;
    if (!state.applied.size) {
      refs.chips.classList.add("hidden");
      refs.chips.classList.remove("flex");
      refs.chips.innerHTML = "";
      return;
    }
    var labels = STATUS_ORDER.filter(function (k) {
      return state.applied.has(k);
    }).map(function (k) {
      return STATUS[k].label;
    });
    refs.chips.innerHTML = window.TableUi
      ? window.TableUi.filterChip({ label: "Status", value: labels.join(", "), type: "status" })
      : "";
    refs.chips.classList.remove("hidden");
    refs.chips.classList.add("flex");
  }

  function renderSkeleton() {
    ensureShell();
    if (window.TableSkeleton && typeof window.TableSkeleton.render === "function") {
      window.TableSkeleton.render({
        tableEl: refs.table,
        columns: COLUMNS,
        rowCount: 6,
        includeHeader: true,
        columnClass: columnClass,
        headerAddon: function (col) {
          return col.key === "status" ? tableIcon("filter-funnel.svg", 14, 14) : "";
        },
      });
    } else {
      refs.table.innerHTML =
        '<tbody><tr><td class="px-4 py-8 text-sm text-gray-500 dark:text-gray-400">Loading...</td></tr></tbody>';
    }
    refs.pagination.innerHTML = paginationSkeletonHtml();
  }

  function renderTable() {
    var rows = filteredRows();
    var total = rows.length;
    var totalPages = Math.max(1, Math.ceil(total / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    var from = (state.page - 1) * state.pageSize;
    var visible = rows.slice(from, from + state.pageSize);
    var body = visible
      .map(function (card, i) {
        return rowHtml(card, i === visible.length - 1);
      })
      .join("");
    refs.table.innerHTML =
      headerHtml() +
      '<tbody class="bg-white dark:bg-gray-900">' + (body || emptyRowHtml()) + "</tbody>";
    refs.pagination.innerHTML = paginationHtml(total);
    renderChips();
    if (window.TableUi) window.TableUi.fitEmptyStates();
  }

  /** Draw the list (or hand the mount back to the empty state) and tell the page. */
  function render() {
    if (!mount) return;
    if (rendering) return;
    rendering = true;
    try {
      if (!allCards().length) {
        // card-manager.js draws its empty state into an empty mount on "data-change".
        mount.innerHTML = "";
        state.filterOpen = false;
      } else {
        ensureShell();
        renderTable();
      }
    } finally {
      cm.emit("data-change", { reason: "cards-list-render" });
      rendering = false;
    }
  }

  /* ---------- filter panel ---------- */

  function sameSet(a, b) {
    if (a.size !== b.size) return false;
    var same = true;
    a.forEach(function (v) {
      if (!b.has(v)) same = false;
    });
    return same;
  }

  function renderFilterList() {
    var counts = {};
    allCards().forEach(function (card) {
      counts[card.status] = (counts[card.status] || 0) + 1;
    });
    refs.list.innerHTML = STATUS_ORDER.map(function (key) {
      return window.TableUi.filterCheckbox({
        id: "cm-list-filter-status-" + key,
        label: STATUS[key].label,
        countText: String(counts[key] || 0),
        value: key,
        checked: state.draft.has(key),
      });
    }).join("");
    syncFilterButtons();
  }

  function syncFilterButtons() {
    if (refs.reset) refs.reset.disabled = state.draft.size === 0;
    if (refs.apply) refs.apply.disabled = sameSet(state.draft, state.applied);
  }

  function positionMenu(trigger) {
    var rect = trigger.getBoundingClientRect();
    var width = refs.menu.offsetWidth || 288;
    var margin = 16;
    var left = Math.min(Math.max(rect.right - width, margin), window.innerWidth - width - margin);
    refs.menu.style.left = Math.round(left) + "px";
    refs.menu.style.top = Math.round(rect.bottom + 8) + "px";
  }

  function setFilterOpen(open, opts) {
    if (!refs.menu) return;
    var trigger = refs.table && refs.table.querySelector("[data-cm-column-filter]");
    state.filterOpen = !!open;
    if (trigger) trigger.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      state.draft = new Set(Array.from(state.applied));
      renderFilterList();
      if (trigger) positionMenu(trigger);
      refs.menu.classList.remove("invisible", "opacity-0", "pointer-events-none");
      var first = refs.menu.querySelector("input[type='checkbox']");
      if (first) first.focus();
    } else {
      refs.menu.classList.add("invisible", "opacity-0", "pointer-events-none");
      if (opts && opts.restoreFocus && trigger) trigger.focus();
    }
  }

  function applyFilter() {
    state.applied = new Set(Array.from(state.draft));
    state.page = 1;
    setFilterOpen(false);
    renderTable();
    var trigger = refs.table.querySelector("[data-cm-column-filter]");
    if (trigger) trigger.focus();
  }

  /* ---------- events ---------- */

  function openCard(id) {
    cm.navigate({ tab: "smart", card: id });
  }

  function restoreFocus(selector) {
    var el = refs.table && refs.table.querySelector(selector);
    if (el) el.focus();
  }

  function onClick(event) {
    var target = event.target;
    if (!refs.root || !refs.root.contains(target)) return;

    if (target.closest("[data-cm-create]")) {
      cm.emit("create-card", { tab: "smart" });
      return;
    }

    if (target.closest("[data-cm-column-filter]")) {
      setFilterOpen(!state.filterOpen);
      return;
    }
    if (target.closest("[data-cm-select-all]")) {
      Array.prototype.forEach.call(refs.list.querySelectorAll("input[type='checkbox']"), function (input) {
        input.checked = true;
        state.draft.add(input.getAttribute("data-filter-value"));
      });
      syncFilterButtons();
      return;
    }
    if (target.closest("[data-cm-filter-reset]")) {
      state.draft.clear();
      renderFilterList();
      return;
    }
    if (target.closest("[data-cm-filter-apply]")) {
      if (!refs.apply.disabled) applyFilter();
      return;
    }
    if (target.closest("[data-filter-tag-remove]")) {
      state.applied.clear();
      state.page = 1;
      renderTable();
      return;
    }
    if (target.closest("[data-filter-tag-open]")) {
      setFilterOpen(true);
      return;
    }

    var sortBtn = target.closest("[data-sort-key]");
    if (sortBtn) {
      var key = sortBtn.getAttribute("data-sort-key");
      var arrows = target.closest("[data-sort-arrows]");
      if (arrows && event.detail > 0) {
        // Mouse click on the arrows: upper half = asc, lower half = desc; the active one again turns sorting off.
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
      renderTable();
      restoreFocus('[data-sort-key="' + key + '"]');
      return;
    }

    var sizeLink = target.closest("[data-page-size]");
    if (sizeLink) {
      event.preventDefault();
      state.pageSize = Number(sizeLink.getAttribute("data-page-size")) || PAGE_SIZE_OPTIONS[0];
      state.page = 1;
      renderTable();
      return;
    }
    var pager = target.closest("[data-page-first], [data-page-prev], [data-page-next], [data-page-last]");
    if (pager && !pager.disabled) {
      var totalPages = Math.max(1, Math.ceil(filteredRows().length / state.pageSize));
      if (pager.hasAttribute("data-page-first")) state.page = 1;
      else if (pager.hasAttribute("data-page-prev")) state.page = Math.max(1, state.page - 1);
      else if (pager.hasAttribute("data-page-next")) state.page = Math.min(totalPages, state.page + 1);
      else state.page = totalPages;
      renderTable();
      return;
    }

    var row = target.closest("tr[data-cm-card-id]");
    if (row) openCard(row.getAttribute("data-cm-card-id"));
  }

  function onKeydown(event) {
    if (!refs.root || !refs.root.contains(event.target)) return;
    if (event.key === "Escape" && state.filterOpen) {
      event.stopPropagation();
      setFilterOpen(false, { restoreFocus: true });
      return;
    }
    var row = event.target.closest && event.target.closest("tr[data-cm-card-id]");
    if (row && event.target === row && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      openCard(row.getAttribute("data-cm-card-id"));
    }
  }

  function onChange(event) {
    var input = event.target.closest && event.target.closest("input[type='checkbox'][data-filter-value]");
    if (!input || !refs.menu || !refs.menu.contains(input)) return;
    var value = input.getAttribute("data-filter-value");
    if (input.checked) state.draft.add(value);
    else state.draft.delete(value);
    syncFilterButtons();
  }

  function onDocumentClick(event) {
    if (!state.filterOpen || !refs.menu) return;
    if (refs.menu.contains(event.target) || event.target.closest("[data-cm-column-filter], [data-filter-tag-open]")) return;
    setFilterOpen(false);
  }

  function bind() {
    mount.addEventListener("click", onClick);
    mount.addEventListener("keydown", onKeydown);
    mount.addEventListener("change", onChange);
    document.addEventListener("click", onDocumentClick);
    window.addEventListener("resize", function () {
      if (state.filterOpen) setFilterOpen(false);
    });
    window.addEventListener(
      "scroll",
      function (event) {
        if (state.filterOpen && !(refs.menu && refs.menu.contains(event.target))) setFilterOpen(false);
      },
      true,
    );
    cm.on("data-change", function () {
      // Another story changed the data (card created, locked, removed): redraw, keep sort / filter / page.
      if (rendering || state.loading) return;
      render();
    });
  }

  /* ---------- start ---------- */

  function start() {
    mount = cm.mount("smart");
    if (!mount) return;
    if (!window.TableUi) {
      console.error("card-manager-list.js needs table-ui.js on the page (load it before this script).");
    }
    var startedAt = Date.now();
    bind();
    // Loading: the skeleton takes the place of the empty state until the data is in.
    renderSkeleton();
    cm.ready.then(function () {
      var wait = Math.max(0, INITIAL_SKELETON_MS - (Date.now() - startedAt));
      setTimeout(function () {
        state.loading = false;
        render();
      }, wait);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();

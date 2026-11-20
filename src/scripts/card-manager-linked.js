/**
 * card-manager-linked.js
 * Linked Credit Cards list for Cards Manager (SMART Hub). TCDM-5231, Figma 10001:269861
 * (list) / 10001:257248 (empty), wiki/products/smart-hub/modules/card-manager.md §4.12, BR-10.
 *
 * Waits for CardManager.ready, then draws the Linked Credit Cards card (header with Search and
 * + Add New, info banner, filter chips, table, pagination) into CardManager.mount('linked').
 * With no linked cards (?empty=1 or every card removed) the mount is left empty, so
 * card-manager.js shows its empty state (heading, text, Add Card). Every render ends with
 * CardManager.emit("data-change") so the tab count and the empty state refresh.
 *
 *   - "+ Add New" emits CardManager "add-linked-card" (the modal is S13), like Add Card.
 *   - A row click, or Enter / Space on a focused row, calls
 *     CardManager.navigate({ tab: 'linked', card: id }) -> ?tab=linked&card=(id) (details: S14).
 *   - Another story that changes CardManager.data and emits "data-change" redraws the list
 *     (sort, filter and page are kept).
 *
 * Reuses, not rebuilds: the SMART Cards list (card-manager-list.js) table / sort / pagination,
 * the SMART Cards list Status column filter (funnel in the header, single-column panel, Reset /
 * Apply, chip), TableUi, TableSkeleton and PPComponents.getCardBrandLogoMarkup (network logos).
 * card-manager.html loads the helpers with page tags before this script (table-ui.js,
 * payment-preferences-components.js).
 */
(function () {
  "use strict";

  var cm = window.CardManager;
  if (!cm) return;

  var PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
  var INITIAL_SKELETON_MS = 500;

  // Status -> label + Badge colour (components skill: Active emerald, Inactive gray), square small as in S1.
  var STATUS = {
    active: {
      label: "Active",
      badge:
        "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-400",
    },
    inactive: {
      label: "Inactive",
      badge:
        "border-gray-200 bg-gray-100 text-gray-800 dark:border-white/15 dark:bg-white/10 dark:text-gray-300",
    },
  };
  var STATUS_ORDER = ["active", "inactive"];

  var NETWORKS = {
    mastercard: "Mastercard",
    visa: "Visa",
    amex: "American Express",
    discover: "Discover",
  };

  var COLUMNS = [
    { key: "last4", label: "Card Number", sortable: true },
    { key: "name", label: "Card Name", sortable: true },
    { key: "expires", label: "Expires", sortable: true },
    { key: "network", label: "Payment Network", sortable: true },
    { key: "createdAt", label: "Created", sortable: true },
    { key: "status", label: "Status", sortable: true },
  ];

  var state = {
    query: "",
    sortKey: "",
    sortDirection: "",
    page: 1,
    pageSize: PAGE_SIZE_OPTIONS[0],
    applied: new Set(),
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

  /** "2028-05" or "2023-04-12T12:28:00" -> "05/2028" / "04/2023" (same as the SMART Cards list). */
  function mmyyyy(value) {
    var m = /^(\d{4})-(\d{2})/.exec(String(value || ""));
    return m ? m[2] + "/" + m[1] : "";
  }

  function allCards() {
    return Array.isArray(cm.data.linkedCards) ? cm.data.linkedCards : [];
  }

  function statusOf(card) {
    return STATUS[card.status] || STATUS.inactive;
  }

  function networkKey(card) {
    var key = String(card.network || "").toLowerCase();
    if (key === "american express") key = "amex";
    if (key === "master card") key = "mastercard";
    return key;
  }

  function networkName(card) {
    var key = networkKey(card);
    return NETWORKS[key] || (card.network ? String(card.network) : "");
  }

  function networkLogo(card) {
    var pp = window.PPComponents;
    if (pp && typeof pp.getCardBrandLogoMarkup === "function") {
      return pp.getCardBrandLogoMarkup(networkKey(card));
    }
    return "";
  }

  /* ---------- dates (Bills filter format "MM / DD / YYYY") ---------- */

  /* ---------- rows: filter, sort, page ---------- */

  function sortValue(card, key) {
    if (key === "status") return statusOf(card).label;
    if (key === "network") return networkName(card);
    return String(card[key] == null ? "" : card[key]);
  }

  function filteredRows() {
    var q = state.query.trim().toLowerCase();
    var digits = q.replace(/\s+/g, "");
    var rows = allCards().filter(function (card) {
      if (state.applied.size && !state.applied.has(card.status)) return false;
      if (!q) return true;
      var number = String(card.number || "").replace(/\s+/g, "");
      return (
        String(card.last4 || "").indexOf(digits) !== -1 ||
        (digits && number.indexOf(digits) !== -1) ||
        String(card.name || "").toLowerCase().indexOf(q) !== -1 ||
        networkName(card).toLowerCase().indexOf(q) !== -1
      );
    });
    if (state.sortKey && state.sortDirection) {
      var dir = state.sortDirection === "asc" ? 1 : -1;
      var key = state.sortKey;
      rows = rows.slice().sort(function (a, b) {
        return sortValue(a, key).localeCompare(sortValue(b, key), "en", { numeric: true, sensitivity: "base" }) * dir;
      });
    }
    return rows;
  }

  /* ---------- table markup (SMART Cards list) ---------- */

  // Two-tone sort arrows, same as the Bills / Users / SMART Cards tables.
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

  function columnClass(col) {
    return " px-3" + (col.align === "right" ? " text-right" : " text-left");
  }

  function colFilterTrigger() {
    return (
      '<button type="button" data-column-filter="status" aria-label="Filter Status" aria-haspopup="dialog" aria-expanded="false" class="inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-sm hover:bg-gray-100 aria-expanded:bg-gray-100 dark:aria-expanded:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:hover:bg-white/10">' +
      tableIcon("filter-funnel.svg", 14, 14) +
      "</button>"
    );
  }

  function headerHtml() {
    var cells = COLUMNS.map(function (col) {
      var right = col.align === "right";
      var text = "type-overline whitespace-nowrap text-gray-500 dark:text-gray-400";
      var current = state.sortKey === col.key ? state.sortDirection : "";
      return (
        '<th scope="col" aria-sort="' +
        (current === "asc" ? "ascending" : current === "desc" ? "descending" : "none") +
        '" class="h-13 border-b border-dashed border-gray-200 align-middle dark:border-white/10' +
        columnClass(col) + '">' +
        '<div class="flex items-center gap-1' + (right ? " justify-end" : "") + '">' +
        '<button type="button" data-sort-key="' + col.key +
        '" class="group inline-flex cursor-pointer items-center gap-1 rounded-sm ' + text +
        ' focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">' +
        "<span>" + esc(col.label) + "</span>" + sortBadge(current) + "</button>" +
        (col.key === "status" ? colFilterTrigger() : "") +
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
    var border = isLast ? "" : " border-b border-gray-200 dark:border-white/10";
    var base = "h-13 align-middle whitespace-nowrap" + border;
    function cell(col, html) {
      return '<td class="' + base + columnClass(col) + '">' + html + "</td>";
    }
    var last4 = String(card.last4 || "");
    var name = String(card.name || "");
    var network = networkName(card);
    return (
      '<tr data-cm-linked-id="' + esc(card.id) + '" tabindex="0" aria-label="Open linked card ending ' + esc(last4) +
      ", " + esc(name) + '" class="group cursor-pointer hover:bg-gray-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 dark:hover:bg-white/5">' +
      cell(COLUMNS[0], '<span class="type-body font-medium text-gray-900 dark:text-white">•••• ' + esc(last4) + "</span>") +
      cell(
        COLUMNS[1],
        '<span title="' + esc(name) + '" class="type-body block max-w-80 truncate font-medium text-gray-900 dark:text-white">' + esc(name) + "</span>",
      ) +
      cell(COLUMNS[2], '<span class="type-body text-gray-500 dark:text-gray-400">' + esc(mmyyyy(card.expires)) + "</span>") +
      cell(
        COLUMNS[3],
        '<span class="inline-flex items-center gap-2">' + networkLogo(card) +
          '<span class="type-body text-gray-900 dark:text-white">' + esc(network) + "</span></span>",
      ) +
      cell(COLUMNS[4], '<span class="type-body text-gray-500 dark:text-gray-400">' + esc(mmyyyy(card.createdAt)) + "</span>") +
      cell(COLUMNS[5], badgeHtml(card)) +
      "</tr>"
    );
  }

  function emptyRowHtml() {
    var box = window.TableUi
      ? window.TableUi.emptyState({
          title: "No cards found",
          text: "Try adjusting the active filters or search to find matching cards.",
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

  /* ---------- header, banner, filter (Bills toolbar Filter) ---------- */

  var INFO_ICON =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4 shrink-0 text-gray-400 dark:text-gray-500"><path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clip-rule="evenodd" /></svg>';

  // Primary button, size md (components skill), same height as Filter.
  var ADD_BUTTON =
    '<button type="button" data-cm-linked-add class="inline-flex w-full shrink-0 cursor-pointer items-center justify-center gap-1.5 h-10 rounded-md bg-blue-600 px-3.5 text-sm font-semibold whitespace-nowrap text-white shadow-xs hover:bg-blue-500 active:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300 sm:w-auto dark:bg-blue-500 dark:shadow-none dark:hover:bg-blue-400 dark:active:bg-blue-600 dark:disabled:bg-blue-500/40 dark:disabled:text-white/60">' +
    '<img src="' + assetUrl("icon-plus.svg") + '" alt="" width="18" height="18" class="size-4.5" />Add New</button>';

  // Search field: same markup as the SMART Cards list header.
  var SEARCH_FIELD =
    '<div class="relative w-full sm:w-80">' +
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"><path fill-rule="evenodd" clip-rule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" /></svg>' +
    '<input type="search" data-cm-linked-search aria-label="Search Linked Credit Cards" placeholder="Search" autocomplete="off" class="block h-10 w-full rounded-md bg-white pr-9 pl-9 text-base/6 text-gray-900 shadow-xs outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-blue-500 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none" />' +
    '<button type="button" data-cm-linked-search-clear aria-label="Clear search" class="hidden absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer rounded-sm text-gray-400 hover:text-gray-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-gray-500 dark:hover:text-gray-300 dark:focus-visible:outline-blue-400">' +
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg></button>' +
    "</div>";

  function shellHtml() {
    return (
      '<div data-cm-linked-list>' +
      '<div class="border-b border-gray-200 px-6 py-5 dark:border-white/10">' +
      '<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">' +
      '<div class="min-w-0"><h2 class="text-2xl/8 font-semibold text-gray-900 dark:text-white">Linked Credit Cards</h2>' +
      '<p class="mt-1 text-sm/5 font-normal text-gray-500 dark:text-gray-400">Add your external cards for quick access and better financial management.</p></div>' +
      '<div class="flex flex-wrap items-center gap-3 sm:flex-nowrap">' + SEARCH_FIELD +
      ADD_BUTTON + "</div></div>" +
      '<div data-cm-linked-chips class="mt-3 hidden flex-wrap items-center justify-end gap-2"></div>' +
      "</div>" +
      // BR-10 banner: Figma neutral info box (gray-50, like the components skill info box), 16px side inset.
      '<div class="px-4 pt-4">' +
      '<div class="flex items-start gap-2 rounded-md bg-gray-50 p-3 dark:bg-white/5">' + INFO_ICON +
      '<p class="text-xs/4 font-normal text-gray-500 dark:text-gray-400">Linked cards act only as origination accounts and cannot be used as payment methods.</p>' +
      "</div></div>" +
      '<div data-table-scroll class="w-full max-w-full overflow-x-auto px-3 pt-2">' +
      '<table data-cm-linked-table class="w-full min-w-max table-auto border-separate border-spacing-0"></table></div>' +
      '<div data-pagination class="border-t border-gray-200 bg-white px-6 py-4 dark:border-white/10 dark:bg-gray-900"></div>' +
      "</div>"
    );
  }

  function cacheRefs() {
    refs.root = mount.querySelector("[data-cm-linked-list]");
    refs.table = mount.querySelector("[data-cm-linked-table]");
    refs.pagination = mount.querySelector("[data-pagination]");
    refs.chips = mount.querySelector("[data-cm-linked-chips]");
  }

  function ensureShell() {
    if (mount.querySelector("[data-cm-linked-list]")) {
      if (!refs.root || !mount.contains(refs.root)) {
        cacheRefs();
        bindColumnFilter();
      }
      return;
    }
    mount.innerHTML = shellHtml();
    cacheRefs();
    bindColumnFilter();
  }

  /* ---------- filter state ---------- */

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
        rowCount: 4,
        includeHeader: true,
        columnClass: columnClass,
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
      headerHtml() + '<tbody class="bg-white dark:bg-gray-900">' + (body || emptyRowHtml()) + "</tbody>";
    refs.pagination.innerHTML = paginationHtml(total);
    renderChips();
    if (window.ColumnFilter) window.ColumnFilter.sync(refs.table);
    if (window.TableUi) window.TableUi.fitEmptyStates();
  }

  /** Draw the list (or hand the mount back to the empty state) and tell the page. */
  function render() {
    if (!mount || rendering) return;
    rendering = true;
    try {
      if (!allCards().length) {
        // card-manager.js draws its empty state (Add Card) into an empty mount on "data-change".
        if (window.ColumnFilter) window.ColumnFilter.close();
        if (mount.querySelector("[data-cm-linked-list]")) mount.innerHTML = "";
        refs = {};
      } else {
        ensureShell();
        renderTable();
      }
    } finally {
      cm.emit("data-change", { reason: "linked-list-render" });
      rendering = false;
    }
  }

  /* ---------- filter panel ---------- */

  /* ---------- Status column filter (ColumnFilter, as TCDM-5238) ---------- */

  function bindColumnFilter() {
    if (!window.ColumnFilter || !refs.table) return;
    window.ColumnFilter.bind(refs.table, {
      describe: function () {
        return {
          title: "Filter Status",
          options: STATUS_ORDER.map(function (key) {
            return { value: key, label: STATUS[key].label, checked: state.applied.has(key) };
          }),
        };
      },
      apply: function (key, values) {
        state.applied = new Set(values);
        state.page = 1;
        renderTable();
      },
      isActive: function () {
        return state.applied.size > 0;
      },
    });
  }

  /* ---------- events ---------- */

  function openCard(id) {
    cm.navigate({ tab: "linked", card: id });
  }

  function onClick(event) {
    var target = event.target;
    if (!refs.root || !refs.root.contains(target)) return;
    if (target.closest("[data-cm-linked-search-clear]")) {
      clearSearch();
      return;
    }

    if (target.closest("[data-cm-linked-add]")) {
      cm.emit("add-linked-card", { tab: "linked" });
      return;
    }
    if (target.closest("[data-filter-tag-remove]")) {
      state.applied.clear();
      state.page = 1;
      renderTable();
      var t = refs.table.querySelector("[data-column-filter]");
      if (t) t.focus();
      return;
    }

    var sortBtn = target.closest("[data-sort-key]");
    if (sortBtn) {
      var sortKey = sortBtn.getAttribute("data-sort-key");
      var arrows = target.closest("[data-sort-arrows]");
      if (arrows && event.detail > 0) {
        // Mouse click on the arrows: upper half = asc, lower half = desc; the active one again turns sorting off.
        var box = arrows.getBoundingClientRect();
        var picked = event.clientY < box.top + box.height / 2 ? "asc" : "desc";
        if (state.sortKey === sortKey && state.sortDirection === picked) {
          state.sortKey = "";
          state.sortDirection = "";
        } else {
          state.sortKey = sortKey;
          state.sortDirection = picked;
        }
      } else if (state.sortKey !== sortKey) {
        state.sortKey = sortKey;
        state.sortDirection = "asc";
      } else if (state.sortDirection === "asc") {
        state.sortDirection = "desc";
      } else {
        state.sortKey = "";
        state.sortDirection = "";
      }
      state.page = 1;
      renderTable();
      var again = refs.table.querySelector('[data-sort-key="' + sortKey + '"]');
      if (again) again.focus();
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

    var row = target.closest("tr[data-cm-linked-id]");
    if (row) openCard(row.getAttribute("data-cm-linked-id"));
  }

  function onKeydown(event) {
    if (!refs.root || !refs.root.contains(event.target)) return;
    if (event.key === "Escape" && event.target.closest && event.target.closest("[data-cm-linked-search]")) {
      if (event.target.value) {
        event.preventDefault();
        clearSearch();
      }
      return;
    }
    var row = event.target.closest && event.target.closest("tr[data-cm-linked-id]");
    if (row && event.target === row && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      openCard(row.getAttribute("data-cm-linked-id"));
    }
  }

  function setQuery(value) {
    state.query = value;
    state.page = 1;
    var clear = refs.root && refs.root.querySelector("[data-cm-linked-search-clear]");
    if (clear) clear.classList.toggle("hidden", !value);
    renderTable();
  }

  function clearSearch() {
    var input = refs.root && refs.root.querySelector("[data-cm-linked-search]");
    if (!input) return;
    input.value = "";
    setQuery("");
    input.focus();
  }

  function onInput(event) {
    var own = event.target.closest && event.target.closest("[data-cm-linked-search]");
    if (own) {
      setQuery(own.value);
      return;
    }
  }

  function bind() {
    mount.addEventListener("click", onClick);
    mount.addEventListener("keydown", onKeydown);
    mount.addEventListener("input", onInput);
    cm.on("route", function () {
      if (window.ColumnFilter) window.ColumnFilter.close();
    });
    cm.on("data-change", function () {
      // Another story changed the data (card added / removed): redraw, keep sort / filter / page.
      if (rendering || state.loading) return;
      render();
    });
  }

  /* ---------- start ---------- */

  function start() {
    mount = cm.mount("linked");
    if (!mount) return;
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

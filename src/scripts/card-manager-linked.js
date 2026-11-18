/**
 * card-manager-linked.js
 * Linked Credit Cards list for Cards Manager (SMART Hub). TCDM-5231, Figma 10001:269861
 * (list) / 10001:257248 (empty), wiki/products/smart-hub/modules/card-manager.md §4.12, BR-10.
 *
 * Waits for CardManager.ready, then draws the Linked Credit Cards card (header with Filter and
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
 * the Bills & Payables toolbar Filter (two-pane panel, Select all, search, From / To with
 * DateRangeCalendar, Reset / Apply, chips; wiki/design-system/table-filter.md), TableUi,
 * TableSkeleton and PPComponents.getCardBrandLogoMarkup (network logos).
 * card-manager.html loads the helpers with page tags before this script (table-ui.js,
 * date-range-calendar.js, payment-preferences-components.js).
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
    { key: "status", label: "Status", sortable: true, align: "right" },
  ];

  // Filter categories = filterable column headers (table-filter.md rule 2/3). Card Number is a
  // reference: found through Search in the shared spec, so it is not a category.
  var CATEGORIES = [
    { key: "name", label: "Card Name", type: "list", search: true },
    { key: "expires", label: "Expires", type: "date" },
    { key: "network", label: "Payment Network", type: "list" },
    { key: "created", label: "Created", type: "date" },
    { key: "status", label: "Status", type: "list" },
  ];

  function emptyFilters() {
    return {
      name: new Set(),
      network: new Set(),
      status: new Set(),
      expires: { from: "", to: "" },
      created: { from: "", to: "" },
    };
  }

  var state = {
    sortKey: "",
    sortDirection: "",
    page: 1,
    pageSize: PAGE_SIZE_OPTIONS[0],
    applied: emptyFilters(),
    draft: emptyFilters(),
    panel: "name",
    filterOpen: false,
    loading: true,
  };
  var refs = {};
  var mount = null;
  var rendering = false;
  var calendarsAttached = false;

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

  function formatUsInput(value) {
    var digits = String(value || "").replace(/\D/g, "").slice(0, 8);
    if (!digits) return "";
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return digits.slice(0, 2) + " / " + digits.slice(2);
    return digits.slice(0, 2) + " / " + digits.slice(2, 4) + " / " + digits.slice(4);
  }

  function usInputToIso(value) {
    var digits = String(value || "").replace(/\D/g, "").slice(0, 8);
    if (digits.length !== 8) return "";
    var mm = parseInt(digits.slice(0, 2), 10);
    var dd = parseInt(digits.slice(2, 4), 10);
    var yyyy = parseInt(digits.slice(4, 8), 10);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1900 || yyyy > 2099) return "";
    return digits.slice(4, 8) + "-" + digits.slice(0, 2) + "-" + digits.slice(2, 4);
  }

  function isoToUsInput(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
    return m ? m[2] + " / " + m[3] + " / " + m[1] : "";
  }

  function formatDate(iso) {
    var date = new Date(iso + "T00:00:00");
    if (isNaN(date.getTime())) return iso;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function dateRangeText(range) {
    return (range.from ? formatDate(range.from) : "Any") + " - " + (range.to ? formatDate(range.to) : "Any");
  }

  /** Expires is a month ("2028-01"): it matches when any day of that month is inside the range. */
  function expiresInRange(value, range) {
    var m = /^(\d{4})-(\d{2})/.exec(String(value || ""));
    if (!m) return false;
    var first = m[1] + "-" + m[2] + "-01";
    var lastDay = new Date(+m[1], +m[2], 0).getDate();
    var last = m[1] + "-" + m[2] + "-" + (lastDay < 10 ? "0" : "") + lastDay;
    if (range.from && last < range.from) return false;
    if (range.to && first > range.to) return false;
    return true;
  }

  function createdInRange(value, range) {
    var day = String(value || "").slice(0, 10);
    if (!day) return false;
    if (range.from && day < range.from) return false;
    if (range.to && day > range.to) return false;
    return true;
  }

  /* ---------- rows: filter, sort, page ---------- */

  function matches(card, f) {
    if (f.name.size && !f.name.has(String(card.name || ""))) return false;
    if (f.network.size && !f.network.has(networkKey(card))) return false;
    if (f.status.size && !f.status.has(card.status)) return false;
    if ((f.expires.from || f.expires.to) && !expiresInRange(card.expires, f.expires)) return false;
    if ((f.created.from || f.created.to) && !createdInRange(card.createdAt, f.created)) return false;
    return true;
  }

  function sortValue(card, key) {
    if (key === "status") return statusOf(card).label;
    if (key === "network") return networkName(card);
    return String(card[key] == null ? "" : card[key]);
  }

  function filteredRows() {
    var rows = allCards().filter(function (card) {
      return matches(card, state.applied);
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

  /* ---------- header, banner, filter (Bills toolbar Filter) ---------- */

  var CHEVRON_DOWN =
    '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" aria-hidden="true" data-filter-chevron class="shrink-0 text-gray-500 transition-transform duration-200 dark:text-gray-400"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.29288 7.29289C5.68341 6.90237 6.31657 6.90237 6.7071 7.29289L9.99998 10.5858L13.2929 7.29289C13.6834 6.90237 14.3166 6.90237 14.7071 7.29289C15.0976 7.68342 15.0976 8.31658 14.7071 8.70711L10.7071 12.7071C10.3166 13.0976 9.6834 13.0976 9.29288 12.7071L5.29288 8.70711C4.90236 8.31658 4.90236 7.68342 5.29288 7.29289Z" fill="currentColor"/></svg>';
  var CHEVRON_RIGHT =
    '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" aria-hidden="true" data-nav-chevron class="hidden shrink-0 text-gray-500 dark:text-gray-400"><path fill-rule="evenodd" clip-rule="evenodd" d="M7.29289 14.7071C6.90237 14.3166 6.90237 13.6834 7.29289 13.2929L10.5858 10L7.29289 6.70711C6.90237 6.31658 6.90237 5.68342 7.29289 5.29289C7.68342 4.90237 8.31658 4.90237 8.70711 5.29289L12.7071 9.29289C13.0976 9.68342 13.0976 10.3166 12.7071 10.7071L8.70711 14.7071C8.31658 15.0976 7.68342 15.0976 7.29289 14.7071Z" fill="currentColor"/></svg>';
  var SEARCH_ICON =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="pointer-events-none absolute top-1/2 left-2 size-5 -translate-y-1/2 text-gray-400 dark:text-gray-500"><path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clip-rule="evenodd" /></svg>';
  var INFO_ICON =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4 shrink-0 text-gray-400 dark:text-gray-500"><path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clip-rule="evenodd" /></svg>';

  var FUNNEL_ICON =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4 shrink-0 text-gray-400 dark:text-gray-500"><path fill-rule="evenodd" d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 0 1 .628.74v2.288a2.25 2.25 0 0 1-.659 1.59l-4.682 4.683a2.25 2.25 0 0 0-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 0 1 8 18.25v-5.757a2.25 2.25 0 0 0-.659-1.591L2.659 6.22A2.25 2.25 0 0 1 2 4.629V2.34a.75.75 0 0 1 .628-.74Z" clip-rule="evenodd" /></svg>';

  // Secondary button, size sm (components skill) + Heroicons mini funnel; count badge from the Bills Filter.
  var FILTER_BUTTON =
    '<button type="button" data-cm-linked-filter-btn aria-haspopup="dialog" aria-expanded="false" class="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-sm bg-white px-2 py-1 text-sm font-semibold whitespace-nowrap text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:w-auto dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20">' +
    FUNNEL_ICON +
    "Filter" +
    '<span data-filter-count class="-my-0.5 hidden min-w-5 items-center justify-center gap-1 rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs/4 font-medium text-gray-800 tabular-nums dark:border-white/15 dark:bg-white/10 dark:text-gray-300"></span>' +
    "</button>";

  // Primary button, size sm (components skill), same height as Filter.
  var ADD_BUTTON =
    '<button type="button" data-cm-linked-add class="inline-flex w-full shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-sm bg-blue-600 px-2 py-1 text-sm font-semibold whitespace-nowrap text-white shadow-xs hover:bg-blue-500 active:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300 sm:w-auto dark:bg-blue-500 dark:shadow-none dark:hover:bg-blue-400 dark:active:bg-blue-600 dark:disabled:bg-blue-500/40 dark:disabled:text-white/60">' +
    '<img src="' + assetUrl("icon-plus.svg") + '" alt="" width="18" height="18" class="size-4" />Add New</button>';

  var LINK_BTN =
    "cursor-pointer rounded px-1.5 py-0.5 text-xs/4 font-semibold text-blue-600 transition-colors hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-blue-400 dark:hover:bg-white/10";
  var FOOTER_RESET =
    "h-7 cursor-pointer rounded border border-gray-300 bg-white px-2 text-sm/5 font-semibold text-gray-500 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10";
  var FOOTER_APPLY =
    "h-7 cursor-pointer rounded bg-blue-600 px-2 text-sm/5 font-semibold text-white hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-400 dark:disabled:hover:bg-blue-500";
  var NAV_BTN =
    "flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm/5 font-medium text-gray-800 transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 dark:text-gray-200 dark:hover:bg-white/10";
  var NAV_BADGE =
    "-my-0.5 hidden items-center gap-1 rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs/4 font-medium text-blue-800 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-400";
  var DATE_INPUT =
    "relative z-10 block h-10 w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 hover:outline-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:hover:outline-white/20 dark:focus:outline-blue-500";
  var SEARCH_INPUT =
    "h-8 w-full rounded-md border border-gray-300 bg-white pr-2 pl-10 text-sm/5 font-normal text-gray-900 shadow-xs placeholder:font-normal placeholder:text-gray-400 hover:not-focus:border-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder:text-gray-500 dark:hover:not-focus:border-white/25 dark:focus:outline-blue-500";

  function navButtonHtml(cat) {
    return (
      '<button type="button" data-filter-open="' + cat.key + '" data-filter-nav class="' + NAV_BTN + '">' +
      '<span class="min-w-0 flex-1">' + esc(cat.label) + "</span>" +
      '<span data-filter-count-badge="' + cat.key + '" class="' + NAV_BADGE + '">0</span>' +
      CHEVRON_RIGHT +
      "</button>"
    );
  }

  function listPanelHtml(cat) {
    var listId = "cm-linked-filter-list-" + cat.key;
    return (
      '<div id="cm-linked-filter-panel-' + cat.key + '" data-filter-panel="' + cat.key +
      '" class="hidden h-full min-h-0 flex-col p-4 sm:absolute sm:inset-0">' +
      (cat.search
        ? '<div class="relative">' + SEARCH_ICON +
          '<input type="search" data-filter-search="' + listId + '" placeholder="Search card name" aria-label="Search card name" class="' +
          SEARCH_INPUT + '" /></div>'
        : "") +
      '<div class="' + (cat.search ? "mt-6 " : "") + 'flex items-center justify-between">' +
      '<p class="text-sm/5 font-medium text-gray-700 dark:text-gray-200">' + esc(cat.label) + "</p>" +
      '<button type="button" data-filter-select-all="' + cat.key + '" class="' + LINK_BTN + '">Select all</button></div>' +
      '<div class="mt-2 mb-3 h-px bg-gray-200 dark:bg-white/10"></div>' +
      '<div id="' + listId + '" data-filter-list="' + cat.key + '" class="flex min-h-0 flex-1 flex-col gap-2 overflow-auto"></div>' +
      "</div>"
    );
  }

  function datePanelHtml(cat) {
    function field(end, label) {
      var id = "cm-linked-filter-" + cat.key + "-" + end;
      return (
        "<div>" +
        '<label for="' + id + '" class="block text-sm/6 font-medium text-gray-700 dark:text-gray-200">' + label + "</label>" +
        '<div class="relative mt-2">' +
        '<input id="' + id + '" type="text" inputmode="numeric" autocomplete="off" placeholder="MM / DD / YYYY" data-filter-date="' +
        cat.key + '" data-filter-end="' + end + '" class="' + DATE_INPUT + '" />' +
        "</div></div>"
      );
    }
    return (
      '<div id="cm-linked-filter-panel-' + cat.key + '" data-filter-panel="' + cat.key +
      '" class="hidden h-full min-h-0 flex-col sm:absolute sm:inset-0">' +
      '<div data-filter-date-host class="space-y-4 p-4">' + field("from", "From") + field("to", "To") + "</div></div>"
    );
  }

  function filterMenuHtml() {
    return (
      '<div data-cm-linked-filter-menu role="dialog" aria-label="Filter linked cards" class="pointer-events-none invisible fixed z-60 flex w-157 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg bg-white opacity-0 shadow-lg ring-1 ring-black/5 transition-opacity duration-200 ease-out max-sm:inset-x-4 max-sm:bottom-4 max-sm:max-h-[calc(100dvh-2rem)] max-sm:w-auto max-sm:max-w-none dark:bg-gray-800 dark:shadow-none dark:ring-white/10">' +
      '<div class="flex min-h-0 flex-1 flex-col sm:min-h-80 sm:flex-row">' +
      '<div class="shrink-0 border-b border-gray-200 bg-gray-50 p-3 sm:w-64 sm:border-r sm:border-b-0 dark:border-white/10 dark:bg-gray-900/40">' +
      '<div class="flex flex-col">' + CATEGORIES.map(navButtonHtml).join("") + "</div></div>" +
      '<div class="relative min-h-0 min-w-0 flex-1 overflow-auto bg-white sm:overflow-visible dark:bg-gray-800">' +
      CATEGORIES.map(function (cat) {
        return cat.type === "date" ? datePanelHtml(cat) : listPanelHtml(cat);
      }).join("") +
      "</div></div>" +
      '<div class="flex items-center justify-end gap-4 border-t border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-gray-800">' +
      '<button type="button" data-cm-filter-reset disabled class="' + FOOTER_RESET + '">Reset</button>' +
      '<button type="button" data-cm-filter-apply disabled class="' + FOOTER_APPLY + '">Apply</button></div>' +
      "</div>" +
      // Phones: the panel is a bottom sheet over a dimmed page (Bills).
      '<div data-cm-linked-filter-backdrop aria-hidden="true" class="pointer-events-none invisible fixed inset-0 z-40 bg-gray-900/50 opacity-0 transition-opacity duration-200 ease-out sm:hidden dark:bg-black/60"></div>'
    );
  }

  function shellHtml() {
    return (
      '<div data-cm-linked-list>' +
      '<div class="border-b border-gray-200 px-6 py-5 dark:border-white/10">' +
      '<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">' +
      '<div class="min-w-0"><h2 class="text-2xl/8 font-semibold text-gray-900 dark:text-white">Linked Credit Cards</h2>' +
      '<p class="mt-1 text-sm/5 font-normal text-gray-500 dark:text-gray-400">Add your external cards for quick access and better financial management.</p></div>' +
      '<div class="flex w-full shrink-0 items-center gap-4 sm:w-auto">' +
      '<div class="flex-1 sm:flex-none">' + FILTER_BUTTON + "</div>" +
      '<div class="flex-1 sm:flex-none">' + ADD_BUTTON + "</div>" +
      "</div></div>" +
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
      filterMenuHtml() +
      "</div>"
    );
  }

  function cacheRefs() {
    refs.root = mount.querySelector("[data-cm-linked-list]");
    refs.table = mount.querySelector("[data-cm-linked-table]");
    refs.pagination = mount.querySelector("[data-pagination]");
    refs.chips = mount.querySelector("[data-cm-linked-chips]");
    refs.filterBtn = mount.querySelector("[data-cm-linked-filter-btn]");
    refs.menu = mount.querySelector("[data-cm-linked-filter-menu]");
    refs.backdrop = mount.querySelector("[data-cm-linked-filter-backdrop]");
    refs.apply = mount.querySelector("[data-cm-filter-apply]");
    refs.reset = mount.querySelector("[data-cm-filter-reset]");
  }

  function ensureShell() {
    if (mount.querySelector("[data-cm-linked-list]")) {
      if (!refs.root || !mount.contains(refs.root)) cacheRefs();
      return;
    }
    mount.innerHTML = shellHtml();
    calendarsAttached = false;
    cacheRefs();
    bindDateInputs();
    attachCalendars();
  }

  /* ---------- filter state ---------- */

  function cloneFilters(f) {
    return {
      name: new Set(f.name),
      network: new Set(f.network),
      status: new Set(f.status),
      expires: { from: f.expires.from, to: f.expires.to },
      created: { from: f.created.from, to: f.created.to },
    };
  }

  function categoryCount(f, key) {
    if (key === "expires" || key === "created") return f[key].from || f[key].to ? 1 : 0;
    return f[key].size;
  }

  function sameSet(a, b) {
    if (a.size !== b.size) return false;
    var same = true;
    a.forEach(function (v) {
      if (!b.has(v)) same = false;
    });
    return same;
  }

  function sameFilters(a, b) {
    return (
      sameSet(a.name, b.name) &&
      sameSet(a.network, b.network) &&
      sameSet(a.status, b.status) &&
      a.expires.from === b.expires.from &&
      a.expires.to === b.expires.to &&
      a.created.from === b.created.from &&
      a.created.to === b.created.to
    );
  }

  /** Options of a list category: every value present in the data, with its count. */
  function listOptions(key) {
    var counts = {};
    var order = [];
    allCards().forEach(function (card) {
      var value = key === "name" ? String(card.name || "") : key === "network" ? networkKey(card) : card.status;
      if (!value) return;
      if (!counts[value]) order.push(value);
      counts[value] = (counts[value] || 0) + 1;
    });
    if (key === "status") {
      order = STATUS_ORDER.slice();
    } else {
      order.sort(function (a, b) {
        return optionLabel(key, a).localeCompare(optionLabel(key, b));
      });
    }
    return order.map(function (value) {
      return { value: value, label: optionLabel(key, value), count: counts[value] || 0 };
    });
  }

  function optionLabel(key, value) {
    if (key === "status") return STATUS[value] ? STATUS[value].label : value;
    if (key === "network") return NETWORKS[value] || value;
    return value;
  }

  /* ---------- render ---------- */

  function renderChips() {
    var f = state.applied;
    var tags = [];
    CATEGORIES.forEach(function (cat) {
      if (!categoryCount(f, cat.key)) return;
      var value =
        cat.type === "date"
          ? dateRangeText(f[cat.key])
          : listOptions(cat.key)
              .filter(function (o) {
                return f[cat.key].has(o.value);
              })
              .map(function (o) {
                return o.label;
              })
              .join(", ");
      tags.push({ label: cat.label, type: cat.key, value: value });
    });
    var total = CATEGORIES.reduce(function (sum, cat) {
      return sum + categoryCount(f, cat.key);
    }, 0);
    var badge = refs.filterBtn && refs.filterBtn.querySelector("[data-filter-count]");
    if (badge) {
      badge.textContent = total ? String(total) : "";
      badge.classList.toggle("hidden", !total);
      badge.classList.toggle("inline-flex", !!total);
    }
    if (!refs.chips) return;
    if (!tags.length || !window.TableUi) {
      refs.chips.innerHTML = "";
      refs.chips.classList.add("hidden");
      refs.chips.classList.remove("flex");
      return;
    }
    refs.chips.innerHTML = tags.map(function (tag) {
      return window.TableUi.filterChip(tag);
    }).join("");
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
    if (window.TableUi) window.TableUi.fitEmptyStates();
  }

  /** Draw the list (or hand the mount back to the empty state) and tell the page. */
  function render() {
    if (!mount || rendering) return;
    rendering = true;
    try {
      if (!allCards().length) {
        // card-manager.js draws its empty state (Add Card) into an empty mount on "data-change".
        if (state.filterOpen) setFilterOpen(false);
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

  function renderFilterLists() {
    CATEGORIES.forEach(function (cat) {
      if (cat.type !== "list") return;
      var list = refs.menu.querySelector('[data-filter-list="' + cat.key + '"]');
      if (!list || !window.TableUi) return;
      list.innerHTML = listOptions(cat.key)
        .map(function (o) {
          return window.TableUi.filterCheckbox({
            id: "cm-linked-filter-" + cat.key + "-" + o.value.replace(/[^a-z0-9]+/gi, "-").toLowerCase(),
            label: o.label,
            countText: String(o.count),
            value: o.value,
            checked: state.draft[cat.key].has(o.value),
          });
        })
        .join("");
    });
    Array.prototype.forEach.call(refs.menu.querySelectorAll("[data-filter-search]"), function (input) {
      input.value = "";
    });
  }

  function writeDateInputs() {
    Array.prototype.forEach.call(refs.menu.querySelectorAll("[data-filter-date]"), function (input) {
      var range = state.draft[input.getAttribute("data-filter-date")];
      input.value = isoToUsInput(range[input.getAttribute("data-filter-end")]);
    });
    if (window.DateRangeCalendar) window.DateRangeCalendar.refreshAll();
  }

  function syncFilterButtons() {
    if (!refs.menu) return;
    if (refs.reset) refs.reset.disabled = categoryCount(state.draft, state.panel) === 0;
    if (refs.apply) refs.apply.disabled = sameFilters(state.draft, state.applied);
    Array.prototype.forEach.call(refs.menu.querySelectorAll("[data-filter-count-badge]"), function (badge) {
      var count = categoryCount(state.draft, badge.getAttribute("data-filter-count-badge"));
      badge.textContent = String(count);
      badge.classList.toggle("hidden", count <= 0);
      badge.classList.toggle("inline-flex", count > 0);
    });
  }

  function setPanel(key) {
    state.panel = key;
    Array.prototype.forEach.call(refs.menu.querySelectorAll("[data-filter-panel]"), function (panel) {
      var on = panel.getAttribute("data-filter-panel") === key;
      panel.classList.toggle("hidden", !on);
      panel.classList.toggle("flex", on);
    });
    Array.prototype.forEach.call(refs.menu.querySelectorAll("[data-filter-nav]"), function (button) {
      var on = button.getAttribute("data-filter-open") === key;
      button.classList.toggle("bg-gray-100", on);
      button.classList.toggle("dark:bg-white/10", on);
      if (on) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
      var chevron = button.querySelector("[data-nav-chevron]");
      if (chevron) chevron.classList.toggle("hidden", !on);
    });
    syncFilterButtons();
  }

  function isPhone() {
    return window.matchMedia("(max-width: 639px)").matches;
  }

  function positionMenu() {
    if (!refs.menu || !refs.filterBtn) return;
    if (isPhone()) {
      refs.menu.style.left = "";
      refs.menu.style.top = "";
      return;
    }
    var rect = refs.filterBtn.getBoundingClientRect();
    var width = refs.menu.offsetWidth || 628;
    var margin = 16;
    var left = Math.min(Math.max(rect.right - width, margin), window.innerWidth - width - margin);
    refs.menu.style.left = Math.round(left) + "px";
    refs.menu.style.top = Math.round(rect.bottom + 8) + "px";
  }

  function setFilterOpen(open, opts) {
    if (!refs.menu) return;
    state.filterOpen = !!open;
    var hideClasses = ["invisible", "opacity-0", "pointer-events-none"];
    if (refs.filterBtn) {
      refs.filterBtn.setAttribute("aria-expanded", open ? "true" : "false");
      ["outline-2", "outline-offset-2", "outline-blue-600"].forEach(function (c) {
        refs.filterBtn.classList.toggle(c, !!open);
      });
      var chevron = refs.filterBtn.querySelector("[data-filter-chevron]");
      if (chevron) chevron.classList.toggle("rotate-180", !!open);
    }
    if (open) {
      state.draft = cloneFilters(state.applied);
      renderFilterLists();
      writeDateInputs();
      setPanel((opts && opts.panel) || state.panel || "name");
      positionMenu();
      hideClasses.forEach(function (c) {
        refs.menu.classList.remove(c);
        if (refs.backdrop) refs.backdrop.classList.remove(c);
      });
      var nav = refs.menu.querySelector('[data-filter-open="' + state.panel + '"]');
      if (nav) nav.focus();
    } else {
      hideClasses.forEach(function (c) {
        refs.menu.classList.add(c);
        if (refs.backdrop) refs.backdrop.classList.add(c);
      });
      Array.prototype.forEach.call(refs.menu.querySelectorAll("[popover]"), function (pop) {
        if (pop.matches(":popover-open")) pop.hidePopover();
      });
      if (opts && opts.restoreFocus && refs.filterBtn) refs.filterBtn.focus();
    }
  }

  function applyFilter() {
    state.applied = cloneFilters(state.draft);
    state.page = 1;
    setFilterOpen(false, { restoreFocus: true });
    renderTable();
  }

  function clearDraftPanel(key) {
    if (key === "expires" || key === "created") {
      state.draft[key] = { from: "", to: "" };
      writeDateInputs();
    } else {
      state.draft[key].clear();
      renderFilterLists();
    }
    syncFilterButtons();
  }

  function bindDateInputs() {
    if (!refs.menu) return;
    Array.prototype.forEach.call(refs.menu.querySelectorAll("[data-filter-date]"), function (input) {
      input.addEventListener("input", function () {
        var key = input.getAttribute("data-filter-date");
        var end = input.getAttribute("data-filter-end");
        var formatted = formatUsInput(input.value);
        input.value = formatted;
        var range = state.draft[key];
        range[end] = usInputToIso(formatted);
        if (range.from && range.to && range.from > range.to) {
          if (end === "to") range.from = range.to;
          else range.to = range.from;
        }
        syncFilterButtons();
      });
    });
  }

  /** DateRangeCalendar under each From / To pair (needs the helper loaded and the panel in the DOM). */
  function attachCalendars() {
    if (calendarsAttached || !refs.menu || !window.DateRangeCalendar) return;
    calendarsAttached = true;
    Array.prototype.forEach.call(refs.menu.querySelectorAll("[data-filter-date-host]"), function (host) {
      var from = host.querySelector('[data-filter-end="from"]');
      var to = host.querySelector('[data-filter-end="to"]');
      var calendar = document.createElement("div");
      host.appendChild(calendar);
      window.DateRangeCalendar.attach(from, to, calendar);
    });
  }

  /* ---------- events ---------- */

  function openCard(id) {
    cm.navigate({ tab: "linked", card: id });
  }

  function onClick(event) {
    var target = event.target;
    if (!refs.root || !refs.root.contains(target)) return;

    if (target.closest("[data-cm-linked-add]")) {
      cm.emit("add-linked-card", { tab: "linked" });
      return;
    }
    if (target.closest("[data-cm-linked-filter-btn]")) {
      setFilterOpen(!state.filterOpen);
      return;
    }
    if (target.closest("[data-cm-linked-filter-backdrop]")) {
      setFilterOpen(false, { restoreFocus: true });
      return;
    }
    var nav = target.closest("[data-filter-open]");
    if (nav && refs.menu.contains(nav)) {
      setPanel(nav.getAttribute("data-filter-open"));
      return;
    }
    var selectAll = target.closest("[data-filter-select-all]");
    if (selectAll) {
      var key = selectAll.getAttribute("data-filter-select-all");
      Array.prototype.forEach.call(
        refs.menu.querySelectorAll('[data-filter-list="' + key + '"] input[type="checkbox"]'),
        function (input) {
          if (input.closest("app-checkbox.hidden")) return; // hidden by the search
          input.checked = true;
          var host = input.closest("app-checkbox");
          if (host) host.setAttribute("checked", "");
          state.draft[key].add(input.getAttribute("data-filter-value"));
        },
      );
      syncFilterButtons();
      return;
    }
    if (target.closest("[data-cm-filter-reset]")) {
      if (!refs.reset.disabled) clearDraftPanel(state.panel);
      return;
    }
    if (target.closest("[data-cm-filter-apply]")) {
      if (!refs.apply.disabled) applyFilter();
      return;
    }
    var remove = target.closest("[data-filter-tag-remove]");
    if (remove) {
      var type = remove.getAttribute("data-filter-tag-remove");
      if (type === "expires" || type === "created") state.applied[type] = { from: "", to: "" };
      else if (state.applied[type]) state.applied[type].clear();
      state.page = 1;
      renderTable();
      if (refs.filterBtn) refs.filterBtn.focus();
      return;
    }
    var openTag = target.closest("[data-filter-tag-open]");
    if (openTag) {
      setFilterOpen(true, { panel: openTag.getAttribute("data-filter-tag-open") });
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
    if (event.key === "Escape" && state.filterOpen) {
      // A calendar open inside the panel closes first (its own popover handles Escape).
      var openCalendar = refs.menu.querySelector("[popover]:popover-open");
      if (openCalendar) return;
      event.stopPropagation();
      setFilterOpen(false, { restoreFocus: true });
      return;
    }
    var row = event.target.closest && event.target.closest("tr[data-cm-linked-id]");
    if (row && event.target === row && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      openCard(row.getAttribute("data-cm-linked-id"));
    }
  }

  function onChange(event) {
    var input = event.target.closest && event.target.closest("input[type='checkbox'][data-filter-value]");
    if (!input || !refs.menu || !refs.menu.contains(input)) return;
    var list = input.closest("[data-filter-list]");
    if (!list) return;
    var key = list.getAttribute("data-filter-list");
    var value = input.getAttribute("data-filter-value");
    if (input.checked) state.draft[key].add(value);
    else state.draft[key].delete(value);
    syncFilterButtons();
  }

  function onInput(event) {
    var search = event.target.closest && event.target.closest("[data-filter-search]");
    if (!search) return;
    var list = document.getElementById(search.getAttribute("data-filter-search"));
    if (!list) return;
    var query = search.value.trim().toLowerCase();
    Array.prototype.forEach.call(list.querySelectorAll("app-checkbox"), function (box) {
      var text = (box.textContent || "").toLowerCase();
      box.classList.toggle("hidden", !!query && text.indexOf(query) === -1);
    });
  }

  function onDocumentClick(event) {
    if (!state.filterOpen || !refs.menu) return;
    var target = event.target;
    if (refs.menu.contains(target)) return;
    if (target.closest && target.closest("[data-cm-linked-filter-btn], [data-filter-tag-open]")) return;
    setFilterOpen(false);
  }

  function bind() {
    mount.addEventListener("click", onClick);
    mount.addEventListener("keydown", onKeydown);
    mount.addEventListener("change", onChange);
    mount.addEventListener("input", onInput);
    document.addEventListener("click", onDocumentClick);
    window.addEventListener("resize", function () {
      if (state.filterOpen) positionMenu();
    });
    window.addEventListener(
      "scroll",
      function (event) {
        if (state.filterOpen && !(refs.menu && refs.menu.contains(event.target))) positionMenu();
      },
      true,
    );
    cm.on("route", function () {
      if (state.filterOpen) setFilterOpen(false);
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
        attachCalendars();
      }, wait);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();

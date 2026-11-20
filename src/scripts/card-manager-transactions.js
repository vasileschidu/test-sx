/**
 * card-manager-transactions.js
 * Cards Manager S11: Transaction History tab of the card details page (TCDM-5230, wiki
 * card-manager.md 4.11, Figma list 8024:126638, empty 8024:124353).
 * Content, columns and copy follow Figma; nothing is invented (open points: TODO(confirm) below).
 *
 * Draws into [data-cm-details-panel="transactions"] (made by card-manager-details.js) whenever the
 * details page shows ?view=transactions; looked up again on `details-tab`, `route` and
 * `data-change` because the details page re-creates the panel. Sort, page and expanded rows are
 * kept per card while that card stays open.
 *
 *   - Info banner (dispute phone / email), table: Transaction ID, Date/Time (sortable), Merchant
 *     Name, Amount, Status, Description; chevron row opens "Transaction Details".
 *   - Header Export (card-manager-details.js, event `export-history` { cardId, view }) opens the
 *     Export confirm ("Transaction History") and downloads a CSV of every sorted row.
 *   - Needs card-manager-bills.js first: it owns window.CardManagerHistory (sort arrows,
 *     pagination, badge, empty block, Export confirm + CSV).
 *
 * TODO(confirm), not in Figma: the full list of statuses (Settled is green, Declined red,
 * Pending amber, the rest gray); where the "Externally Added" badge sits (here: after the merchant
 * name) and what it means; whether Date/Time shows the time (Figma shows the date only; sorting and
 * the CSV use date and time); the 3-line Merchant Location (the data holds one line); text for
 * "sorted to nothing" (cannot happen: there is no filter); the 4th tab "Card Reconciliation"
 * (out of R1, not built).
 */
(function () {
  "use strict";

  var cm = window.CardManager;
  if (!cm) return;
  var H = window.CardManagerHistory;
  if (!H) {
    console.error("card-manager-transactions.js needs card-manager-bills.js on the page (load it before this script).");
    return;
  }

  var VIEW = "transactions";
  var PAGE_SIZE_DEFAULT = 10;

  var COLUMNS = [
    { key: "expand", type: "expand" },
    { key: "id", label: "Transaction ID" },
    { key: "dateTime", label: "Date/Time", sortable: true },
    { key: "merchant", label: "Merchant Name" },
    { key: "amount", label: "Amount", align: "right" },
    { key: "status", label: "Status" },
    { key: "description", label: "Description" },
  ];

  var COLOR_BY_STATUS = { settled: "green", declined: "red", pending: "yellow" };

  var DETAIL_ROWS = [
    { key: "transactionCode", label: "Transaction Code" },
    { key: "responseCode", label: "Response Code" },
    { key: "responseDescription", label: "Response Description" },
    { key: "merchantCategoryCode", label: "Merchant Category Code" },
    { key: "transactionType", label: "Transaction Type" },
    { key: "merchantLocation", label: "Merchant Location" },
    { key: "fee", label: "Fee", money: true },
  ];

  var ICON_INFO =
    '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="size-4 shrink-0 text-gray-400 dark:text-gray-500"><path fill-rule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 8a.75.75 0 0 0 0 1.5h.75v1.75a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8.25 8h-1.5Z" clip-rule="evenodd" /></svg>';
  var ICON_EMPTY =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="size-9"><path d="M10.464 8.746c.227-.18.497-.311.786-.394v2.795a2.252 2.252 0 0 1-.786-.393c-.394-.313-.546-.681-.546-1.004 0-.323.152-.691.546-1.004ZM12.75 15.662v-2.824c.347.085.664.228.921.421.427.32.579.686.579.991 0 .305-.152.671-.579.991a2.534 2.534 0 0 1-.921.42Z" /><path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v.816a3.836 3.836 0 0 0-1.72.756c-.712.566-1.112 1.35-1.112 2.178 0 .829.4 1.612 1.113 2.178.502.4 1.102.647 1.719.756v2.978a2.536 2.536 0 0 1-.921-.421l-.879-.66a.75.75 0 0 0-.9 1.2l.879.66c.533.4 1.169.645 1.821.75V18a.75.75 0 0 0 1.5 0v-.81a4.124 4.124 0 0 0 1.821-.749c.745-.559 1.179-1.344 1.179-2.191 0-.847-.434-1.632-1.179-2.191a4.122 4.122 0 0 0-1.821-.75V8.354c.29.082.559.213.786.393l.415.33a.75.75 0 0 0 .933-1.175l-.415-.33a3.836 3.836 0 0 0-1.719-.755V6Z" clip-rule="evenodd" /></svg>';

  var BADGE_EXTERNAL = H.badge("Externally Added", "gray");

  var state = null;
  var rendering = false;
  var refs = {};

  function newState(cardId) {
    return {
      cardId: cardId,
      sortKey: "",
      sortDirection: "",
      page: 1,
      pageSize: PAGE_SIZE_DEFAULT,
      expanded: new Set(),
      loading: true,
      loaded: false,
    };
  }

  function transactions() {
    var card = H.findCard(state && state.cardId);
    return card && Array.isArray(card.transactions) ? card.transactions : [];
  }

  function sortedRows() {
    return H.sortRows(transactions(), state, function (tx, key) {
      return tx[key] == null ? "" : String(tx[key]);
    });
  }

  function statusBadge(tx) {
    return H.badge(tx.status, COLOR_BY_STATUS[String(tx.status || "").toLowerCase()] || "gray");
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
      return H.headerCell(col, state);
    }).join("");
    return '<thead class="bg-white dark:bg-gray-900"><tr>' + cells + "</tr></thead>";
  }

  function detailRow(label, value) {
    return (
      '<div class="flex flex-col sm:flex-row"><dt class="text-sm/5 font-normal text-gray-500 sm:w-56 sm:shrink-0 dark:text-gray-400">' +
      H.esc(label) + '</dt><dd class="min-w-0 text-sm/5 font-normal break-words whitespace-pre-line text-gray-900 dark:text-white">' +
      value + "</dd></div>"
    );
  }

  function detailsHtml(tx) {
    var d = tx.details || {};
    var rows = DETAIL_ROWS.filter(function (row) {
      return d[row.key] != null && d[row.key] !== "";
    }).map(function (row) {
      var value = row.money
        ? H.money(d[row.key], tx.currency) + ' <span class="text-gray-500 dark:text-gray-400">' + H.esc(tx.currency || "USD") + "</span>"
        : H.esc(d[row.key]);
      return detailRow(row.label, value);
    }).join("");
    return (
      '<div class="px-4 py-4 sm:pl-13"><h3 class="border-b border-gray-200 pb-3 text-sm/5 font-semibold text-gray-900 dark:border-white/10 dark:text-white">Transaction Details</h3>' +
      '<dl class="mt-3 flex flex-col gap-2">' + rows + "</dl></div>"
    );
  }

  function rowHtml(tx, isLast) {
    var expanded = state.expanded.has(tx.id);
    // No divider under an expanded row (its details follow) or under the last row.
    var border = isLast || expanded ? "" : " border-b border-gray-200 dark:border-white/10";
    var base = "h-13 align-middle whitespace-nowrap px-3" + border;
    var detailId = "cm-tx-detail-" + tx.id;
    var merchant = H.esc(tx.merchant);
    var description = H.esc(tx.description);
    var main =
      '<tr data-cm-tx-row="' + H.esc(tx.id) + '" class="group cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5' +
      (expanded ? " bg-gray-100 dark:bg-white/5" : "") + '">' +
      H.expandCell(tx.id, expanded, detailId, (expanded ? "Collapse " : "Expand ") + "transaction " + tx.id, border) +
      '<td class="' + base + '"><span class="type-body text-gray-500 dark:text-gray-400">' + H.esc(tx.id) + "</span></td>" +
      '<td class="' + base + '"><span class="type-body text-gray-500 dark:text-gray-400">' + H.esc(H.dateMDY(tx.dateTime)) + "</span></td>" +
      '<td class="' + base + '"><span class="inline-flex items-center gap-2"><span title="' + merchant +
      '" class="type-body block max-w-80 truncate font-medium text-gray-900 dark:text-white">' + merchant + "</span>" +
      (tx.externallyAdded ? BADGE_EXTERNAL : "") + "</span></td>" +
      '<td class="' + base + ' text-right"><span class="type-body inline-flex items-center justify-end gap-1 font-medium text-gray-900 dark:text-white">' +
      H.esc(H.money(tx.amount, tx.currency)) + ' <span class="text-gray-500 dark:text-gray-400">' + H.esc(tx.currency || "USD") + "</span></span></td>" +
      '<td class="' + base + '">' + statusBadge(tx) + "</td>" +
      '<td class="' + base + '"><span title="' + description + '" class="type-body block max-w-80 truncate text-gray-500 dark:text-gray-400">' + description + "</span></td></tr>";
    var detail = expanded
      ? '<tr id="' + H.esc(detailId) + '" data-cm-tx-detail="' + H.esc(tx.id) + '"><td colspan="' + COLUMNS.length +
        '" class="bg-white p-0 dark:bg-gray-900' + (isLast ? "" : " border-b border-gray-200 dark:border-white/10") + '">' +
        '<div data-bh-detail-fit class="sticky left-0">' + detailsHtml(tx) + "</div></td></tr>"
      : "";
    return main + detail;
  }

  function shellHtml() {
    return (
      '<div data-bh-root="' + VIEW + '" class="-mt-2">' +
      '<p data-bh-banner class="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-xs/4 font-normal text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">' +
      ICON_INFO +
      '<span>For dispute request you can contact: <strong class="font-semibold text-gray-900 dark:text-white">800-890-3128</strong> or <strong class="font-semibold text-gray-900 dark:text-white">dispute-ticket@transcard.com</strong></span></p>' +
      '<div data-table-scroll class="w-full max-w-full overflow-x-auto">' +
      '<table data-bh-table class="w-full min-w-max table-auto border-separate border-spacing-0"></table></div>' +
      '<div data-pagination class="-mx-6 border-t border-gray-200 bg-white px-6 py-4 dark:border-white/10 dark:bg-gray-900"></div>' +
      "</div>"
    );
  }

  function cacheRefs(root) {
    refs.root = root;
    refs.table = root.querySelector("[data-bh-table]");
    refs.pagination = root.querySelector("[data-pagination]");
  }

  /* ---------- render ---------- */

  function renderSkeleton(panel) {
    panel.innerHTML = shellHtml();
    cacheRefs(panel.querySelector("[data-bh-root]"));
    if (window.TableSkeleton) {
      window.TableSkeleton.render({ tableEl: refs.table, columns: COLUMNS, rowCount: 5, columnClass: columnClass });
    }
    refs.pagination.innerHTML = H.paginationSkeletonHtml();
  }

  function renderTable() {
    var rows = sortedRows();
    var total = rows.length;
    var totalPages = Math.max(1, Math.ceil(total / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    var from = (state.page - 1) * state.pageSize;
    var visible = rows.slice(from, from + state.pageSize);
    var body = visible.map(function (tx, i) {
      return rowHtml(tx, i === visible.length - 1);
    }).join("");
    refs.table.innerHTML = headerHtml() + '<tbody class="bg-white dark:bg-gray-900">' + body + "</tbody>";
    refs.pagination.innerHTML = H.paginationHtml(state, total);
    H.syncExport(total > 0);
    H.fitDetails();
  }

  function drawEmpty(panel) {
    panel.innerHTML = H.emptyBlock(ICON_EMPTY, "No Transaction History", "You don't have any transactions");
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
      if (!transactions().length) {
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

    var sortBtn = target.closest("[data-sort-key]");
    if (sortBtn) {
      var key = sortBtn.getAttribute("data-sort-key");
      H.applySort(state, key, event, target);
      renderTable();
      restoreFocus('[data-sort-key="' + key + '"]');
      return;
    }
    if (H.pagerClick(state, transactions().length, event, target)) {
      renderTable();
      return;
    }
    var row = target.closest("tr[data-cm-tx-row]");
    if (row) toggleRow(row.getAttribute("data-cm-tx-row"));
  }

  function exportData() {
    var card = H.findCard(state.cardId);
    var columns = ["Transaction ID", "Date/Time", "Merchant Name", "Amount", "Status", "Description"];
    var rows = sortedRows().map(function (tx) {
      var time = /T(\d{2}:\d{2})/.exec(String(tx.dateTime || ""));
      return [
        tx.id,
        H.dateMDY(tx.dateTime) + (time ? " " + time[1] : ""),
        tx.merchant,
        H.money(tx.amount, tx.currency) + " " + (tx.currency || "USD"),
        tx.status,
        tx.description,
      ];
    });
    return { columns: columns, rows: rows, name: H.slug(card && card.name) + "-transaction-history-" + H.today() + ".csv" };
  }

  function onExport(payload) {
    if (!payload || payload.view !== VIEW || !state || state.cardId !== payload.cardId) return;
    var out = exportData();
    if (!out.rows.length) return;
    H.openExport({
      label: "Transaction History",
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

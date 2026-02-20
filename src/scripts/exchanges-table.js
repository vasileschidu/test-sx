/**
 * exchanges-table.js
 *
 * Fully config-driven table renderer with working pagination.
 * Reads column definitions from tableConfig in exchanges.json,
 * builds <thead> and <tbody> dynamically — no hardcoded columns in HTML.
 */

(function () {
  'use strict';

  var JSON_PATH_FALLBACKS = [
    '../../../src/data/exchanges.json',
    '/src/data/exchanges.json',
    './src/data/exchanges.json',
  ];
  var TABLE_ID = 'exchanges-table';
  var TABLE_SCROLL_SELECTOR = '[data-table-scroll]';
  var ACTION_COLUMN_SELECTOR = '[data-action-column]';
  var PAGINATION_SELECTOR = '[data-pagination]';

  var DEFAULT_PAGE_SIZE = 16;
  var PAGE_SIZE_OPTIONS = [10, 16, 25, 50];

  // Pagination state
  var paginationState = {
    currentPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    totalItems: 0,
    allEntries: [],
    columns: [],
  };

  var STATUS_STYLES = {
    Pending:
      'bg-yellow-50 text-yellow-800 inset-ring-yellow-600/20 dark:bg-yellow-400/10 dark:text-yellow-500 dark:inset-ring-yellow-400/20',
    Completed:
      'bg-green-50 text-green-700 inset-ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:inset-ring-green-500/20',
    Processing:
      'bg-blue-50 text-blue-700 inset-ring-blue-700/10 dark:bg-blue-400/10 dark:text-blue-400 dark:inset-ring-blue-400/20',
    Failed:
      'bg-red-50 text-red-700 inset-ring-red-600/10 dark:bg-red-400/10 dark:text-red-400 dark:inset-ring-red-400/20',
  };

  var CLASS_NAMES = {
    tbody: 'bg-white dark:bg-gray-900',
    row: 'transition-colors duration-200',
    cellBorder: ' border-b border-gray-200 dark:border-white/10',
    actionCell:
      'bg-white py-2 pr-4 pl-3 whitespace-nowrap w-24 min-w-24 text-right text-sm font-medium dark:bg-gray-900 sm:pr-2',
    detailCell: 'bg-gray-50 dark:bg-gray-800/50 px-4 py-5 sm:px-8',
  };

  // ── SVG Icons ──

  var ICON_ACH = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-5 text-gray-500 dark:text-gray-400 shrink-0"><path fill-rule="evenodd" d="M9.674 2.075a.75.75 0 0 1 .652 0l7.25 3.5A.75.75 0 0 1 17 6.957V16.5h.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H3V6.957a.75.75 0 0 1-.576-1.382l7.25-3.5ZM11 6a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM7.5 9.75a.75.75 0 0 0-1.5 0v5.5a.75.75 0 0 0 1.5 0v-5.5Zm3.25 0a.75.75 0 0 0-1.5 0v5.5a.75.75 0 0 0 1.5 0v-5.5Zm3.25 0a.75.75 0 0 0-1.5 0v5.5a.75.75 0 0 0 1.5 0v-5.5Z" clip-rule="evenodd" /></svg>';

  var ICON_VISA = '<svg class="size-5 shrink-0" height="20" width="20" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><path d="M0 0h32v32H0z" fill="#00579f"></path><g fill="#fff" fill-rule="nonzero"><path d="M13.823 19.876H11.8l1.265-7.736h2.023zm7.334-7.546a5.036 5.036 0 0 0-1.814-.33c-1.998 0-3.405 1.053-3.414 2.56-.016 1.11 1.007 1.728 1.773 2.098.783.379 1.05.626 1.05.963-.009.518-.633.757-1.216.757-.808 0-1.24-.123-1.898-.411l-.267-.124-.283 1.737c.475.213 1.349.403 2.257.411 2.123 0 3.505-1.037 3.521-2.641.008-.881-.532-1.556-1.698-2.107-.708-.354-1.141-.593-1.141-.955.008-.33.366-.667 1.165-.667a3.471 3.471 0 0 1 1.507.297l.183.082zm2.69 4.806.807-2.165c-.008.017.167-.452.266-.74l.142.666s.383 1.852.466 2.239h-1.682zm2.497-4.996h-1.565c-.483 0-.85.14-1.058.642l-3.005 7.094h2.123l.425-1.16h2.597c.059.271.242 1.16.242 1.16h1.873zm-16.234 0-1.982 5.275-.216-1.07c-.366-1.234-1.515-2.575-2.797-3.242l1.815 6.765h2.14l3.18-7.728z"></path><path d="M6.289 12.14H3.033L3 12.297c2.54.641 4.221 2.189 4.912 4.049l-.708-3.556c-.116-.494-.474-.633-.915-.65z"></path></g></g></svg>';

  var ICON_SORT = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4"><path fill-rule="evenodd" d="M10.53 3.47a.75.75 0 0 0-1.06 0L6.22 6.72a.75.75 0 0 0 1.06 1.06L10 5.06l2.72 2.72a.75.75 0 1 0 1.06-1.06l-3.25-3.25Zm-4.31 9.81 3.25 3.25a.75.75 0 0 0 1.06 0l3.25-3.25a.75.75 0 1 0-1.06-1.06L10 14.94l-2.72-2.72a.75.75 0 0 0-1.06 1.06Z" clip-rule="evenodd" /></svg>';

  var ICON_FILTER = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4"><path fill-rule="evenodd" d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 0 1 .628.74v2.288a2.25 2.25 0 0 1-.659 1.59l-4.682 4.683a2.25 2.25 0 0 0-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 0 1 8 18.25v-5.757a2.25 2.25 0 0 0-.659-1.591L2.659 6.22A2.25 2.25 0 0 1 2 4.629V2.34a.75.75 0 0 1 .628-.74Z" clip-rule="evenodd" /></svg>';

  var ICON_THREE_DOTS = '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path d="M10 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM11.5 15.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0Z" /></svg>';

  var ICON_CHEVRON_DOWN = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>';

  // ── Helpers ──

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatCurrency(amount, currency) {
    try {
      return Number(amount).toLocaleString('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
      });
    } catch (err) {
      return '$' + Number(amount || 0).toFixed(2);
    }
  }

  function formatDate(isoDate) {
    var parsed = new Date(String(isoDate) + 'T00:00:00');
    if (Number.isNaN(parsed.getTime())) return escapeHtml(isoDate || '');
    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function normalizeDetails(details) {
    if (!details || typeof details !== 'object') {
      return { payment: '', vendor: '', history: '' };
    }
    return {
      payment: typeof details.payment === 'string' ? details.payment : '',
      vendor: typeof details.vendor === 'string' ? details.vendor : '',
      history: typeof details.history === 'string' ? details.history : '',
    };
  }

  function normalizeEntry(entry, index) {
    if (!entry || typeof entry !== 'object') {
      console.warn('Skipping malformed exchange row at index', index, entry);
      return null;
    }
    return {
      amount: Number(entry.amount) || 0,
      currency: typeof entry.currency === 'string' ? entry.currency : 'USD',
      vendorEntry: typeof entry.vendorEntry === 'string' ? entry.vendorEntry : '',
      invoice: typeof entry.invoice === 'string' ? entry.invoice : '',
      customer: typeof entry.customer === 'string' ? entry.customer : '',
      dateInitiated: typeof entry.dateInitiated === 'string' ? entry.dateInitiated : '',
      paymentMethod: typeof entry.paymentMethod === 'string' ? entry.paymentMethod : '',
      paymentMethodEnding: typeof entry.paymentMethodEnding === 'string' ? entry.paymentMethodEnding : '',
      status: typeof entry.status === 'string' ? entry.status : 'Pending',
      details: normalizeDetails(entry.details),
    };
  }

  // ── Dynamic <thead> builder ──

  function buildTheadHTML(columns) {
    var html = '<thead><tr>';

    columns.forEach(function (col) {
      var base = 'border-b border-gray-200 dark:border-white/10';

      if (col.type === 'expand') {
        html += '<th scope="col" class="' + base + ' py-3.5 pr-3 pl-4 whitespace-nowrap sm:pl-0"><span class="sr-only">Expand</span></th>';
        return;
      }

      if (col.type === 'action') {
        html += '<th data-action-column scope="col" class="' + base + ' bg-white py-3.5 pr-4 pl-3 whitespace-nowrap w-24 min-w-24 dark:bg-gray-900 sm:pr-2"><span class="sr-only">Action</span></th>';
        return;
      }

      var thClass = base + ' px-2 py-3.5 text-left text-sm font-semibold whitespace-nowrap text-gray-900 dark:text-white';
      html += '<th scope="col" class="' + thClass + '">';

      if (col.sortable || col.filterable) {
        html += '<a href="#" class="group flex items-center gap-x-1.5">';
        html += escapeHtml(col.label);

        if (col.filterable) {
          html += '<button type="button" class="inline-flex items-center gap-x-1.5 rounded-md bg-gray-100 px-1 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-white/10 dark:text-gray-400 dark:hover:bg-white/20 dark:hover:text-gray-200 transition-colors">' + ICON_FILTER + '</button>';
        } else {
          html += '<button type="button" class="inline-flex items-center gap-x-1.5 rounded-md bg-gray-100 px-1 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-white/10 dark:text-gray-400 dark:hover:bg-white/20 dark:hover:text-gray-200 transition-colors">' + ICON_SORT + '</button>';
        }

        html += '</a>';
      } else {
        html += escapeHtml(col.label);
      }

      html += '</th>';
    });

    html += '</tr></thead>';
    return html;
  }

  // ── Cell renderers by type ──

  function renderCellValue(col, entry) {
    switch (col.type) {
      case 'paymentMethod':
        return renderPaymentMethod(entry);
      case 'status':
        return renderStatus(entry.status);
      default:
        break;
    }

    switch (col.key) {
      case 'amount':
        return formatCurrency(entry.amount, entry.currency) +
          ' <span class="text-gray-500 dark:text-gray-400">' + escapeHtml(entry.currency) + '</span>';
      case 'dateInitiated':
        return formatDate(entry.dateInitiated);
      default:
        return escapeHtml(entry[col.key] || '');
    }
  }

  function renderPaymentMethod(entry) {
    var method = entry.paymentMethod;
    var ending = entry.paymentMethodEnding;

    if (method === 'ACH') {
      return '<span class="inline-flex items-center gap-x-2">' +
        ICON_ACH +
        '<span class="text-sm font-medium text-gray-900 dark:text-white">' + escapeHtml(ending) + '</span>' +
        '</span>';
    }

    if (method === 'Card') {
      return '<span class="inline-flex items-center gap-x-2">' +
        ICON_VISA +
        '<span class="text-sm font-medium text-gray-900 dark:text-white">' + escapeHtml(ending) + '</span>' +
        '</span>';
    }

    // SMART Exchange or any other — plain text
    return '<span class="text-sm font-medium text-gray-900 dark:text-white">' + escapeHtml(method) + '</span>';
  }

  function renderStatus(status) {
    var badgeClasses = STATUS_STYLES[status] || STATUS_STYLES.Pending;
    return '<span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium inset-ring ' + badgeClasses + '">' +
      escapeHtml(status) +
      '</span>';
  }

  function renderActionCell(entry) {
    if (entry.paymentMethod === 'SMART Exchange') {
      return '<button type="button" class="rounded-md bg-blue-600 px-2 py-1 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-blue-500 dark:shadow-none dark:hover:bg-blue-400 dark:focus-visible:outline-blue-500">Get paid</button>';
    }

    // 3-dot dropdown for ACH / Card
    return '<el-dropdown class="inline-block">' +
      '<button class="flex items-center justify-center rounded-sm bg-white p-1 text-gray-500 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 hover:text-gray-700 dark:bg-white/10 dark:text-gray-400 dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20 dark:hover:text-gray-300">' +
        '<span class="sr-only">Open options</span>' +
        ICON_THREE_DOTS +
      '</button>' +
      '<el-menu anchor="bottom end" popover class=" min-w-32 origin-top-right rounded-md bg-white shadow-lg outline-1 outline-black/5 transition transition-discrete [--anchor-gap:--spacing(2)] data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in dark:bg-gray-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10">' +
        '<div class="py-1">' +
          '<a href="#" class="block px-3 py-1.5 text-sm whitespace-nowrap text-gray-700 focus:bg-gray-100 focus:text-gray-900 focus:outline-hidden dark:text-gray-300 dark:focus:bg-white/5 dark:focus:text-white">View details</a>' +
          '<a href="#" class="block px-3 py-1.5 text-sm whitespace-nowrap text-gray-700 focus:bg-gray-100 focus:text-gray-900 focus:outline-hidden dark:text-gray-300 dark:focus:bg-white/5 dark:focus:text-white">Edit payment</a>' +
          '<a href="#" class="block px-3 py-1.5 text-sm whitespace-nowrap text-gray-700 focus:bg-gray-100 focus:text-gray-900 focus:outline-hidden dark:text-gray-300 dark:focus:bg-white/5 dark:focus:text-white">Cancel</a>' +
        '</div>' +
      '</el-menu>' +
    '</el-dropdown>';
  }

  // ── Row builders ──

  function buildMainRowHTML(entry, columns, isLast) {
    var cb = isLast ? '' : CLASS_NAMES.cellBorder;
    var html = '<tr data-row class="' + CLASS_NAMES.row + '">';

    columns.forEach(function (col) {
      if (col.type === 'expand') {
        html +=
          '<td class="py-2 pr-3 pl-4 whitespace-nowrap sm:pl-0' + cb + '">' +
            '<button data-row-toggle class="rounded-md p-1 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20">' +
              '<svg class="size-4 text-gray-600 dark:text-gray-300 transition-transform duration-200" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">' +
                '<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />' +
              '</svg>' +
            '</button>' +
          '</td>';
        return;
      }

      if (col.type === 'action') {
        html +=
          '<td data-action-column class="' + CLASS_NAMES.actionCell + cb + '">' +
            renderActionCell(entry) +
          '</td>';
        return;
      }

      var cellClass;
      if (col.type === 'status' || col.type === 'paymentMethod') {
        cellClass = 'px-2 py-2 whitespace-nowrap' + cb;
      } else if (col.key === 'invoice' || col.key === 'dateInitiated') {
        cellClass = 'px-2 py-2 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400' + cb;
      } else {
        cellClass = 'px-2 py-2 text-sm font-medium whitespace-nowrap text-gray-900 dark:text-white' + cb;
      }

      html += '<td class="' + cellClass + '">' + renderCellValue(col, entry) + '</td>';
    });

    html += '</tr>';
    return html;
  }

  function buildDetailRowHTML(entry, colCount) {
    return (
      '<tr data-detail class="hidden">' +
        '<td colspan="' + colCount + '" class="' + CLASS_NAMES.detailCell + '">' +
          '<div class="grid grid-cols-1 sm:grid-cols-3 gap-6">' +
            '<div>' +
              '<h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Payment Details</h4>' +
              '<p class="mt-2 text-sm text-gray-600 dark:text-gray-300">' + escapeHtml(entry.details.payment) + '</p>' +
            '</div>' +
            '<div>' +
              '<h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Vendor Information</h4>' +
              '<p class="mt-2 text-sm text-gray-600 dark:text-gray-300">' + escapeHtml(entry.details.vendor) + '</p>' +
            '</div>' +
            '<div>' +
              '<h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Transaction History</h4>' +
              '<p class="mt-2 text-sm text-gray-600 dark:text-gray-300">' + escapeHtml(entry.details.history) + '</p>' +
            '</div>' +
          '</div>' +
        '</td>' +
      '</tr>'
    );
  }

  function buildRowHTML(entry, columns, isLast) {
    return (
      '<tbody class="' + CLASS_NAMES.tbody + '">' +
        buildMainRowHTML(entry, columns, isLast) +
        buildDetailRowHTML(entry, columns.length) +
      '</tbody>'
    );
  }

  function buildEmptyStateHTML(colspan) {
    return (
      '<tbody class="' + CLASS_NAMES.tbody + '">' +
        '<tr>' +
          '<td colspan="' + colspan + '" class="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">' +
            'No exchange records available.' +
          '</td>' +
        '</tr>' +
      '</tbody>'
    );
  }

  // ── Sticky action column ──

  function applyActionDivider(cell, isActive, isDark) {
    if (isActive) {
      cell.style.borderLeftWidth = '1px';
      cell.style.borderLeftStyle = 'solid';
      cell.style.borderLeftColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.15)';
      cell.style.boxShadow = isDark
        ? '-10px 0 15px -3px rgba(0,0,0,0.3), -4px 0 6px -4px rgba(0,0,0,0.3)'
        : '-10px 0 15px -3px rgba(0,0,0,0.1), -4px 0 6px -4px rgba(0,0,0,0.1)';
    } else {
      cell.style.borderLeftWidth = '0px';
      cell.style.borderLeftStyle = 'solid';
      cell.style.borderLeftColor = 'transparent';
      cell.style.boxShadow = 'none';
    }
  }

  function initStickyAction(table) {
    var scroller = table.closest(TABLE_SCROLL_SELECTOR) || table.closest('.overflow-x-auto');
    if (!scroller) return function () {};

    function sync() {
      var maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
      var isOverflowing = maxScrollLeft > 0.5;
      var isDark = document.documentElement.classList.contains('dark');
      var actionColumns = table.querySelectorAll(ACTION_COLUMN_SELECTOR);

      actionColumns.forEach(function (cell) {
        if (isOverflowing) {
          cell.classList.add('sticky', 'right-0', 'z-10');
        } else {
          cell.classList.remove('sticky', 'right-0', 'z-10');
        }
        applyActionDivider(cell, isOverflowing, isDark);
      });
    }

    scroller.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();

    return sync;
  }

  // ── Row expand/collapse toggle ──

  function toggleRow(button) {
    var mainRow = button.closest('tr[data-row]');
    var detailRow = mainRow ? mainRow.nextElementSibling : null;
    if (!mainRow || !detailRow) return;

    var icon = button.querySelector('svg');
    var isOpen = !detailRow.classList.contains('hidden');
    var stickyCell = mainRow.querySelector('td.sticky');

    if (isOpen) {
      detailRow.classList.add('hidden');
      if (icon) icon.style.transform = '';
      mainRow.classList.remove('bg-gray-100', 'dark:bg-white/5');
      if (stickyCell) stickyCell.classList.remove('!bg-gray-100', 'dark:!bg-gray-900');
    } else {
      detailRow.classList.remove('hidden');
      if (icon) icon.style.transform = 'rotate(90deg)';
      mainRow.classList.add('bg-gray-100', 'dark:bg-white/5');
      if (stickyCell) stickyCell.classList.add('!bg-gray-100', 'dark:!bg-gray-900');
    }
  }

  function attachToggleListeners(table) {
    if (table.dataset.toggleBound === '1') return;
    table.dataset.toggleBound = '1';

    table.addEventListener('click', function (event) {
      var button = event.target.closest('[data-row-toggle]');
      if (!button || !table.contains(button)) return;
      toggleRow(button);
    });
  }

  // ── Pagination ──

  function getTotalPages() {
    return Math.max(1, Math.ceil(paginationState.totalItems / paginationState.pageSize));
  }

  function getPageSlice() {
    var start = (paginationState.currentPage - 1) * paginationState.pageSize;
    var end = start + paginationState.pageSize;
    return paginationState.allEntries.slice(start, end);
  }

  // Build the array of page numbers to display (with ellipsis gaps)
  function getPageNumbers(current, total) {
    // Show all pages if 7 or fewer
    if (total <= 7) {
      var all = [];
      for (var i = 1; i <= total; i++) all.push(i);
      return all;
    }

    var pages = [];
    // Always show first page
    pages.push(1);

    if (current > 3) {
      pages.push('...');
    }

    // Pages around current
    var rangeStart = Math.max(2, current - 1);
    var rangeEnd = Math.min(total - 1, current + 1);

    for (var j = rangeStart; j <= rangeEnd; j++) {
      pages.push(j);
    }

    if (current < total - 2) {
      pages.push('...');
    }

    // Always show last page
    pages.push(total);

    return pages;
  }

  function renderPagination() {
    var container = document.querySelector(PAGINATION_SELECTOR);
    if (!container) return;

    var total = paginationState.totalItems;
    var page = paginationState.currentPage;
    var size = paginationState.pageSize;
    var totalPages = getTotalPages();
    var start = Math.min((page - 1) * size + 1, total);
    var end = Math.min(page * size, total);

    var isFirstPage = page <= 1;
    var isLastPage = page >= totalPages;

    // Page number classes — compact size to match 3-dot button
    var activePageClass = 'relative z-10 inline-flex items-center bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-600 inset-ring inset-ring-blue-300 focus:z-20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-blue-500/10 dark:text-blue-400 dark:inset-ring-blue-500/30 dark:focus-visible:outline-blue-400';
    var defaultPageClass = 'relative inline-flex items-center px-2.5 py-1 text-xs font-semibold text-gray-900 inset-ring inset-ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 dark:text-gray-200 dark:inset-ring-gray-700 dark:hover:bg-white/5';
    var ellipsisClass = 'relative inline-flex items-center px-2.5 py-1 text-xs font-semibold text-gray-700 inset-ring inset-ring-gray-300 focus:outline-offset-0 dark:text-gray-400 dark:inset-ring-gray-700';
    var prevClass = 'relative inline-flex items-center rounded-l-sm px-1.5 py-1 text-gray-400 inset-ring inset-ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 dark:inset-ring-gray-700 dark:hover:bg-white/5';
    var nextClass = 'relative inline-flex items-center rounded-r-sm px-1.5 py-1 text-gray-400 inset-ring inset-ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 dark:inset-ring-gray-700 dark:hover:bg-white/5';

    // Build page number buttons
    var pageNumbers = getPageNumbers(page, totalPages);
    var pagesHTML = '';
    pageNumbers.forEach(function (p) {
      if (p === '...') {
        pagesHTML += '<span class="' + ellipsisClass + '">...</span>';
      } else if (p === page) {
        pagesHTML += '<a href="#" data-page-num="' + p + '" aria-current="page" class="' + activePageClass + '">' + p + '</a>';
      } else {
        pagesHTML += '<a href="#" data-page-num="' + p + '" class="' + defaultPageClass + '">' + p + '</a>';
      }
    });

    // Build rows-per-page options
    var optionsHTML = '';
    PAGE_SIZE_OPTIONS.forEach(function (opt) {
      optionsHTML += '<a href="#" data-page-size="' + opt + '" class="block px-4 py-2 text-sm ' +
        (opt === size ? 'font-semibold text-gray-900 bg-gray-50 dark:text-white dark:bg-white/5' : 'text-gray-700 dark:text-gray-300') +
        ' hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900 focus:outline-hidden dark:hover:bg-white/5 dark:hover:text-white dark:focus:bg-white/5 dark:focus:text-white">' +
        opt + '</a>';
    });

    // Mobile: simple prev/next
    var mobileHTML =
      '<div class="flex flex-1 justify-between sm:hidden">' +
        '<a href="#" data-page-prev class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10' +
          (isFirstPage ? ' opacity-50 pointer-events-none' : '') + '">Previous</a>' +
        '<a href="#" data-page-next class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10' +
          (isLastPage ? ' opacity-50 pointer-events-none' : '') + '">Next</a>' +
      '</div>';

    // Desktop: full pagination
    var desktopHTML =
      '<div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">' +
        // Left: showing info + rows per page
        '<div class="flex items-center gap-x-6">' +
          '<p class="text-sm text-gray-700 dark:text-gray-300">' +
            'Showing <span class="font-medium">' + start + '</span> to ' +
            '<span class="font-medium">' + end + '</span> of ' +
            '<span class="font-medium">' + total + '</span> results' +
          '</p>' +
          '<div class="flex items-center gap-x-2 text-sm text-gray-500 dark:text-gray-400">' +
            '<span>Rows per page:</span>' +
            '<el-dropdown class="inline-block">' +
              '<button type="button" class="inline-flex items-center gap-x-1 rounded-sm bg-white px-2 py-1 text-xs font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20">' +
                size +
                ' ' + ICON_CHEVRON_DOWN +
              '</button>' +
              '<el-menu anchor="bottom end" popover class="w-32 origin-top-right rounded-md bg-white shadow-lg outline-1 outline-black/5 transition transition-discrete [--anchor-gap:--spacing(2)] data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in dark:bg-gray-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10">' +
                '<div class="py-1">' + optionsHTML + '</div>' +
              '</el-menu>' +
            '</el-dropdown>' +
          '</div>' +
        '</div>' +
        // Right: page numbers nav
        '<div>' +
          '<nav aria-label="Pagination" class="isolate inline-flex -space-x-px overflow-hidden rounded-sm shadow-xs inset-ring inset-ring-gray-300 dark:shadow-none dark:inset-ring-gray-700">' +
            '<a href="#" data-page-prev class="' + prevClass + (isFirstPage ? ' opacity-50 pointer-events-none' : '') + '">' +
              '<span class="sr-only">Previous</span>' +
              '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd" fill-rule="evenodd" /></svg>' +
            '</a>' +
            pagesHTML +
            '<a href="#" data-page-next class="' + nextClass + (isLastPage ? ' opacity-50 pointer-events-none' : '') + '">' +
              '<span class="sr-only">Next</span>' +
              '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" fill-rule="evenodd" /></svg>' +
            '</a>' +
          '</nav>' +
        '</div>' +
      '</div>';

    container.innerHTML = mobileHTML + desktopHTML;
  }

  function attachPaginationListeners() {
    var container = document.querySelector(PAGINATION_SELECTOR);
    if (!container || container.dataset.paginationBound === '1') return;
    container.dataset.paginationBound = '1';

    container.addEventListener('click', function (event) {
      // Page size selection
      var pageSizeLink = event.target.closest('[data-page-size]');
      if (pageSizeLink) {
        event.preventDefault();
        var newSize = parseInt(pageSizeLink.dataset.pageSize, 10);
        if (newSize && newSize !== paginationState.pageSize) {
          paginationState.pageSize = newSize;
          paginationState.currentPage = 1;
          renderCurrentPage();
        }
        return;
      }

      // Page number click
      var pageNumLink = event.target.closest('[data-page-num]');
      if (pageNumLink) {
        event.preventDefault();
        var targetPage = parseInt(pageNumLink.dataset.pageNum, 10);
        if (targetPage && targetPage !== paginationState.currentPage) {
          paginationState.currentPage = targetPage;
          renderCurrentPage();
        }
        return;
      }

      // Previous page
      var prevBtn = event.target.closest('[data-page-prev]');
      if (prevBtn) {
        event.preventDefault();
        if (paginationState.currentPage > 1) {
          paginationState.currentPage--;
          renderCurrentPage();
        }
        return;
      }

      // Next page
      var nextBtn = event.target.closest('[data-page-next]');
      if (nextBtn) {
        event.preventDefault();
        if (paginationState.currentPage < getTotalPages()) {
          paginationState.currentPage++;
          renderCurrentPage();
        }
        return;
      }
    });
  }

  // ── Render ──

  var refreshStickyAction = function () {};

  function renderTableBody(table, columns, entries) {
    // Remove existing tbodies, keep thead
    table.querySelectorAll('tbody').forEach(function (tbody) {
      tbody.remove();
    });

    var rowsHTML = '';
    if (!entries.length) {
      rowsHTML = buildEmptyStateHTML(columns.length);
    } else {
      entries.forEach(function (entry, index) {
        var isLast = index === entries.length - 1;
        rowsHTML += buildRowHTML(entry, columns, isLast);
      });
    }

    var thead = table.querySelector('thead');
    if (thead) {
      thead.insertAdjacentHTML('afterend', rowsHTML);
    } else {
      table.innerHTML += rowsHTML;
    }
  }

  function renderCurrentPage() {
    var table = document.getElementById(TABLE_ID);
    if (!table) return;

    var pageEntries = getPageSlice();
    renderTableBody(table, paginationState.columns, pageEntries);
    renderPagination();
    refreshStickyAction();
  }

  function renderTable(table, columns, entries) {
    // Store in pagination state
    paginationState.allEntries = entries;
    paginationState.columns = columns;
    paginationState.totalItems = entries.length;
    paginationState.currentPage = 1;

    // Clear everything and build thead
    table.innerHTML = buildTheadHTML(columns);

    // Render first page of rows
    var pageEntries = getPageSlice();
    renderTableBody(table, columns, pageEntries);
    attachToggleListeners(table);

    // Render pagination controls
    renderPagination();
    attachPaginationListeners();
  }

  // ── Data fetching ──

  function getJsonPathCandidates() {
    var candidates = JSON_PATH_FALLBACKS.slice();
    if (document.currentScript && document.currentScript.src) {
      try {
        candidates.unshift(new URL('../data/exchanges.json', document.currentScript.src).toString());
      } catch (err) {
        // Ignore URL parse errors
      }
    }
    return Array.from(new Set(candidates));
  }

  function fetchJsonFromPath(path) {
    return fetch(path).then(function (response) {
      if (!response.ok) {
        throw new Error('HTTP ' + response.status + ' while loading ' + path);
      }
      return response.json();
    });
  }

  function fetchExchangesData() {
    var paths = getJsonPathCandidates();
    var index = 0;

    function tryNextPath() {
      if (index >= paths.length) {
        throw new Error('Failed to load exchanges data from all candidate paths');
      }
      var path = paths[index++];
      return fetchJsonFromPath(path).catch(function () {
        return tryNextPath();
      });
    }

    return tryNextPath().then(function (payload) {
      var columns;
      var rawData;

      if (payload && payload.tableConfig && Array.isArray(payload.data)) {
        columns = payload.tableConfig.columns;
        rawData = payload.data;
      } else if (Array.isArray(payload)) {
        columns = null;
        rawData = payload;
      } else {
        throw new Error('Unexpected JSON format in exchanges data');
      }

      var entries = rawData
        .map(normalizeEntry)
        .filter(function (entry) { return entry !== null; });

      return { columns: columns, entries: entries };
    });
  }

  // ── Init ──

  function init() {
    var table = document.getElementById(TABLE_ID);
    if (!table) return;

    fetchExchangesData()
      .then(function (result) {
        var columns = result.columns;
        var entries = result.entries;

        if (columns) {
          renderTable(table, columns, entries);
        } else {
          attachToggleListeners(table);
        }

        refreshStickyAction = initStickyAction(table);
        refreshStickyAction();
      })
      .catch(function (error) {
        console.error('Failed to load exchanges data:', error);
      });
  }

  init();
})();

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
  var TAB_COUNT_SELECTOR = '[data-tab-count]';
  var TAB_NAV_SELECTOR = 'nav[aria-label="Tabs"]';

  var ACTIVE_TAB_LINK_CLASSES = ['bg-blue-100', 'text-blue-700', 'dark:bg-blue-500/20', 'dark:text-blue-300'];
  var INACTIVE_TAB_LINK_CLASSES = ['text-gray-500', 'dark:text-gray-400'];
  var ACTIVE_BADGE_CLASSES = [
    'bg-blue-50',
    'text-blue-700',
    'inset-ring-blue-700/10',
    'dark:bg-blue-400/10',
    'dark:text-blue-400',
    'dark:inset-ring-blue-400/30',
  ];
  var INACTIVE_BADGE_CLASSES = [
    'bg-gray-50',
    'text-gray-600',
    'inset-ring-gray-500/10',
    'dark:bg-gray-400/10',
    'dark:text-gray-400',
    'dark:inset-ring-gray-400/20',
  ];

  var DEFAULT_PAGE_SIZE = 16;
  var PAGE_SIZE_OPTIONS = [10, 16, 25, 50];

  // Pagination state
  var paginationState = {
    currentPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    totalItems: 0,
    allEntries: [],
    sourceEntries: [],
    columns: [],
  };

  // Maps tab key (from data-tab-count) to the status values shown in that tab.
  // null means no filter — show all entries.
  var TAB_STATUS_FILTER = {
    ready: null,
    pending: ['Pending', 'Processing'],
    paid: ['Completed'],
    exceptions: ['Failed'],
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
    detailCell: 'bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-white/10',
  };

  // ── SVG Icons ──

  var ICON_ACH = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-5 text-gray-500 dark:text-gray-400 shrink-0"><path fill-rule="evenodd" d="M9.674 2.075a.75.75 0 0 1 .652 0l7.25 3.5A.75.75 0 0 1 17 6.957V16.5h.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H3V6.957a.75.75 0 0 1-.576-1.382l7.25-3.5ZM11 6a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM7.5 9.75a.75.75 0 0 0-1.5 0v5.5a.75.75 0 0 0 1.5 0v-5.5Zm3.25 0a.75.75 0 0 0-1.5 0v5.5a.75.75 0 0 0 1.5 0v-5.5Zm3.25 0a.75.75 0 0 0-1.5 0v5.5a.75.75 0 0 0 1.5 0v-5.5Z" clip-rule="evenodd" /></svg>';

  var ICON_VISA = '<svg class="size-5 shrink-0" height="20" width="20" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><path d="M0 0h32v32H0z" fill="#00579f"></path><g fill="#fff" fill-rule="nonzero"><path d="M13.823 19.876H11.8l1.265-7.736h2.023zm7.334-7.546a5.036 5.036 0 0 0-1.814-.33c-1.998 0-3.405 1.053-3.414 2.56-.016 1.11 1.007 1.728 1.773 2.098.783.379 1.05.626 1.05.963-.009.518-.633.757-1.216.757-.808 0-1.24-.123-1.898-.411l-.267-.124-.283 1.737c.475.213 1.349.403 2.257.411 2.123 0 3.505-1.037 3.521-2.641.008-.881-.532-1.556-1.698-2.107-.708-.354-1.141-.593-1.141-.955.008-.33.366-.667 1.165-.667a3.471 3.471 0 0 1 1.507.297l.183.082zm2.69 4.806.807-2.165c-.008.017.167-.452.266-.74l.142.666s.383 1.852.466 2.239h-1.682zm2.497-4.996h-1.565c-.483 0-.85.14-1.058.642l-3.005 7.094h2.123l.425-1.16h2.597c.059.271.242 1.16.242 1.16h1.873zm-16.234 0-1.982 5.275-.216-1.07c-.366-1.234-1.515-2.575-2.797-3.242l1.815 6.765h2.14l3.18-7.728z"></path><path d="M6.289 12.14H3.033L3 12.297c2.54.641 4.221 2.189 4.912 4.049l-.708-3.556c-.116-.494-.474-.633-.915-.65z"></path></g></g></svg>';

  var ICON_SORT = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4"><path fill-rule="evenodd" d="M10.53 3.47a.75.75 0 0 0-1.06 0L6.22 6.72a.75.75 0 0 0 1.06 1.06L10 5.06l2.72 2.72a.75.75 0 1 0 1.06-1.06l-3.25-3.25Zm-4.31 9.81 3.25 3.25a.75.75 0 0 0 1.06 0l3.25-3.25a.75.75 0 1 0-1.06-1.06L10 14.94l-2.72-2.72a.75.75 0 0 0-1.06 1.06Z" clip-rule="evenodd" /></svg>';

  var ICON_FILTER = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4"><path fill-rule="evenodd" d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 0 1 .628.74v2.288a2.25 2.25 0 0 1-.659 1.59l-4.682 4.683a2.25 2.25 0 0 0-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 0 1 8 18.25v-5.757a2.25 2.25 0 0 0-.659-1.591L2.659 6.22A2.25 2.25 0 0 1 2 4.629V2.34a.75.75 0 0 1 .628-.74Z" clip-rule="evenodd" /></svg>';

  var ICON_THREE_DOTS = '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path d="M10 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM11.5 15.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0Z" /></svg>';

  var ICON_CHEVRON_DOWN = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>';

  var ICON_COPY = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4 text-gray-400 dark:text-gray-500"><path d="M15.988 3.012A2.25 2.25 0 0 0 13.75 1h-3.5a2.25 2.25 0 0 0-2.238 2.012c-.875.092-1.6.686-1.884 1.488H11A3.75 3.75 0 0 1 14.75 8.25v4.872c.802-.284 1.396-1.009 1.488-1.884A2.25 2.25 0 0 0 18.25 9V5.25a2.25 2.25 0 0 0-2.262-2.238ZM13.25 9a2.25 2.25 0 0 0-2.25-2.25h-5A2.25 2.25 0 0 0 3.75 9v5A2.25 2.25 0 0 0 6 16.25h5A2.25 2.25 0 0 0 13.25 14V9Z" /></svg>';
  var ICON_CHEVRON_RIGHT = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4 text-gray-400"><path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>';

  var ICON_EYE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4 text-blue-600"><path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /><path fill-rule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clip-rule="evenodd" /></svg>';

  var ICON_DOCUMENT = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-3.5 text-gray-400 dark:text-gray-500 shrink-0"><path fill-rule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm2.25 8.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z" clip-rule="evenodd" /></svg>';

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

  // Formats an ISO datetime string (e.g. "2024-06-30T10:40") as
  // "June 30, 2024 10:40 AM (EST)" for activity log display.
  function formatActivityDate(isoDateTime) {
    if (!isoDateTime) return '';
    var str = String(isoDateTime);
    var tIdx = str.indexOf('T');
    var datePart = tIdx !== -1 ? str.slice(0, tIdx) : str;
    var timePart = tIdx !== -1 ? str.slice(tIdx + 1) : '';
    var date = new Date(datePart + 'T00:00:00');
    if (Number.isNaN(date.getTime())) return escapeHtml(str);
    var dateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    if (timePart) {
      var tp = timePart.split(':');
      var hour = parseInt(tp[0], 10);
      var minute = tp[1] ? tp[1].slice(0, 2) : '00';
      var ampm = hour >= 12 ? 'PM' : 'AM';
      var hour12 = hour % 12 || 12;
      return dateStr + ' ' + hour12 + ':' + minute + ' ' + ampm + ' (EST)';
    }
    return dateStr;
  }

  // Returns entries filtered to the given tab key using TAB_STATUS_FILTER.
  function filterEntriesByTab(tabKey) {
    var filter = TAB_STATUS_FILTER[tabKey];
    if (!filter) return paginationState.sourceEntries.slice();
    return paginationState.sourceEntries.filter(function (entry) {
      return filter.indexOf(entry.status) !== -1;
    });
  }

  function normalizeDetails(details) {
    if (!details || typeof details !== 'object') {
      return { notes: '', paymentInfo: null, attachments: [], activityLog: [] };
    }
    return {
      notes: typeof details.notes === 'string' ? details.notes : '',
      paymentInfo: details.paymentInfo && typeof details.paymentInfo === 'object' ? details.paymentInfo : null,
      attachments: Array.isArray(details.attachments) ? details.attachments : [],
      activityLog: Array.isArray(details.activityLog) ? details.activityLog : [],
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
    if (entry.paymentMethod === 'SMART Exchange' && entry.status === 'Pending') {
      return '<button type="button" data-get-paid-invoice="' + escapeHtml(entry.invoice) + '" class="rounded-md bg-blue-600 px-2 py-1 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-blue-500 dark:shadow-none dark:hover:bg-blue-400 dark:focus-visible:outline-blue-500">Get paid</button>';
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

  // ── Detail Row: Section builders (Figma-matched layout) ──

  var DETAIL_LABEL = 'w-[156px] shrink-0 p-4 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400';
  var DETAIL_SEPARATOR = '<div class="border-t border-gray-200 dark:border-white/10"></div>';

  function buildNotesSection(entry) {
    if (!entry.details.notes) return '';
    return (
      '<div class="flex">' +
        '<div class="' + DETAIL_LABEL + '">Notes</div>' +
        '<div class="flex-1 p-4 text-sm font-medium text-gray-900 dark:text-white">' +
          escapeHtml(entry.details.notes) +
        '</div>' +
      '</div>'
    );
  }

  function buildStatusSection(entry) {
    var statusClass = STATUS_STYLES[entry.status] || STATUS_STYLES.Pending;
    return (
      '<div class="flex">' +
        '<div class="' + DETAIL_LABEL + '">Status</div>' +
        '<div class="flex-1 flex items-center p-4">' +
          '<span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium inset-ring ' + statusClass + '">' +
            escapeHtml(entry.status) +
          '</span>' +
        '</div>' +
      '</div>'
    );
  }

  function buildAttachmentsSection(entry) {
    var attachments = entry.details.attachments;
    if (!attachments || !attachments.length) return '';

    var badges = '';
    attachments.forEach(function (att) {
      badges +=
        '<span class="inline-flex items-center gap-1.5 rounded border border-gray-200 bg-gray-100 px-2 py-0.5 text-sm font-medium text-gray-800 dark:border-white/10 dark:bg-white/5 dark:text-gray-200">' +
          ICON_DOCUMENT +
          escapeHtml(att.name || '') +
        '</span>';
    });

    return (
      '<div class="flex">' +
        '<div class="' + DETAIL_LABEL + '">Attachments</div>' +
        '<div class="flex-1 p-4 flex flex-wrap items-center gap-2">' +
          badges +
        '</div>' +
      '</div>'
    );
  }

  // Payment info: each row is a 2-col layout (both flex-1, gap-6 = 24px)
  function buildPaymentInfoRow(label, value, hasCopy) {
    return (
      '<div class="flex gap-6">' +
        '<dt class="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">' + label + '</dt>' +
        '<dd class="flex-1 flex items-center gap-6 text-sm text-gray-700 dark:text-gray-300">' +
          value +
          (hasCopy ? ('<button class="shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">' + ICON_COPY + '</button>') : '') +
        '</dd>' +
      '</div>'
    );
  }

  function buildPaymentInfoSection(entry) {
    var info = entry.details.paymentInfo;
    if (!info) return '';

    var typeLabel = '';
    var titleLabel = '';
    var rows = '';

    if (info.type === 'card') {
      typeLabel = 'Card';
      titleLabel = 'Card Details';

      rows += buildPaymentInfoRow('Cardholder Name', escapeHtml(info.cardholderName || ''), false);

      if (info.cardholderAddress) {
        var addrHtml = escapeHtml(info.cardholderAddress).replace(/\n/g, '<br>');
        rows += buildPaymentInfoRow('Cardholder Address', addrHtml, false);
      }

      rows +=
        '<div class="flex gap-6">' +
          '<dt class="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">Type</dt>' +
          '<dd class="flex-1">' + ICON_VISA + '</dd>' +
        '</div>';

      rows += buildPaymentInfoRow('Card Number', '&bull;&bull;&bull;&bull; ' + escapeHtml(info.cardNumber || ''), true);
      rows += buildPaymentInfoRow('Expires', escapeHtml(info.expires || ''), true);
      rows += buildPaymentInfoRow('CVC2', '&bull;&bull;&bull;', true);

    } else if (info.type === 'ach') {
      typeLabel = 'ACH';
      titleLabel = 'Bank Account Details';

      rows += buildPaymentInfoRow('Account Holder', escapeHtml(info.accountHolder || ''), false);
      rows += buildPaymentInfoRow('Bank Name', escapeHtml(info.bankName || ''), false);
      rows += buildPaymentInfoRow('Routing Number', escapeHtml(info.routingNumber || ''), true);
      rows += buildPaymentInfoRow('Account Number', escapeHtml(info.accountNumber || ''), true);
      rows += buildPaymentInfoRow('Account Type', escapeHtml(info.accountType || ''), false);

    } else if (info.type === 'smartExchange') {
      typeLabel = 'SMART Exchange';
      titleLabel = 'Exchange Details';

      rows += buildPaymentInfoRow('Exchange ID', escapeHtml(info.exchangeId || ''), false);
      rows += buildPaymentInfoRow('Exchange Rate', escapeHtml(info.exchangeRate || ''), false);
      rows += buildPaymentInfoRow('Source Amount', escapeHtml(info.sourceAmount || ''), false);
      rows += buildPaymentInfoRow('Target Amount', escapeHtml(info.targetAmount || ''), false);
      rows += buildPaymentInfoRow('Settlement Date', escapeHtml(info.settlementDate || ''), false);
    }

    var revealLink = info.type === 'card'
      ? '<a href="#" class="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">' + ICON_EYE + ' Reveal Details</a>'
      : '';

    return (
      '<div class="flex">' +
        '<div class="' + DETAIL_LABEL + '">Payment Method<br>Details</div>' +
        // MoP container: p-4, gap-9 (36px) — matches Figma layout_MTB9A0
        '<div class="flex-1 p-4 flex gap-9">' +
          // Card/ACH/Exchange label: w-14 (56px) — matches Figma layout_LL9L0Z
          '<div class="w-14 shrink-0 flex items-start gap-2">' +
            '<span class="text-sm font-medium text-gray-800 dark:text-gray-200">' + typeLabel + '</span>' +
          '</div>' +
          // Chevron between label and column
          ICON_CHEVRON_RIGHT +
          // Detail column: w-[380px], gap-2 — matches Figma layout_UTWGTK
          '<div class="flex flex-col gap-2 w-[380px]">' +
            // Head: flex gap-6 (24px), both children fill — matches Figma layout_MFYG14
            '<div class="flex gap-6">' +
              '<div class="flex-1 text-sm font-medium text-gray-900 dark:text-white">' + titleLabel + '</div>' +
              '<div class="flex-1 flex items-center">' + revealLink + '</div>' +
            '</div>' +
            // Separator — matches Figma Separator component
            '<div class="border-t border-gray-200 dark:border-white/10"></div>' +
            // Rows — each row is flex gap-6 with both children flex-1
            '<dl class="flex flex-col gap-3">' +
              rows +
            '</dl>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  // Activity log — matches Figma Activity Log component (31822:55675)
  function buildActivityLogItem(dotClasses, title, description, showLine) {
    var lineHtml = showLine
      ? '<div class="absolute top-0 -bottom-6 left-0 flex w-6 justify-center">' +
          '<div class="w-px bg-gray-200 dark:bg-white/10"></div>' +
        '</div>'
      : '';

    return (
      '<div class="relative flex gap-4">' +
        lineHtml +
        '<div class="relative flex size-6 flex-none items-center justify-center bg-white dark:bg-gray-900">' +
          '<div class="size-1.5 rounded-full ' + dotClasses + '"></div>' +
        '</div>' +
        '<div class="flex flex-col gap-1 pb-6">' +
          '<p class="text-base font-medium text-gray-900 dark:text-white">' + title + '</p>' +
          '<p class="text-sm text-gray-700 dark:text-gray-300">' + description + '</p>' +
        '</div>' +
      '</div>'
    );
  }

  function buildActivityLogSection(entry) {
    var invoice = escapeHtml(entry.invoice || '');
    var log = entry.details.activityLog;
    var items = '';

    if (entry.status === 'Completed') {
      // Find most recent complete event for processed timestamp
      var completedEntry = null;
      for (var ci = log.length - 1; ci >= 0; ci--) {
        if (log[ci].type === 'complete') { completedEntry = log[ci]; break; }
      }
      var processedDate = completedEntry ? formatActivityDate(completedEntry.date) : '';
      var initiatedDate = log[0] ? formatActivityDate(log[0].date) : formatDate(entry.dateInitiated);

      items += buildActivityLogItem(
        'bg-green-100 ring-1 ring-green-700/60 dark:bg-green-400/10 dark:ring-green-400/20',
        'Paid',
        'Payment with id <span class="font-medium text-blue-600 dark:text-blue-400">#' + invoice + '</span> has been processed' + (processedDate ? ' on ' + processedDate : ''),
        true
      );
      items += buildActivityLogItem(
        'bg-gray-100 ring-1 ring-gray-300 dark:bg-white/10 dark:ring-white/20',
        'Initiated',
        'Payment with id <span class="font-medium text-blue-600 dark:text-blue-400">#' + invoice + '</span> has been initiated' + (initiatedDate ? ' on ' + initiatedDate : ''),
        false
      );

    } else if (entry.status === 'Failed') {
      var initiatedDateF = log[0] ? formatActivityDate(log[0].date) : formatDate(entry.dateInitiated);

      items += buildActivityLogItem(
        'bg-red-100 ring-1 ring-red-700/60 dark:bg-red-400/10 dark:ring-red-400/20',
        'Payment Failed',
        'Payment for invoice <span class="font-medium text-blue-600 dark:text-blue-400">#' + invoice + '</span> has failed due to an error. Contact your customer to resolve it.',
        true
      );
      items += buildActivityLogItem(
        'bg-gray-100 ring-1 ring-gray-300 dark:bg-white/10 dark:ring-white/20',
        'Initiated',
        'Payment for invoice <span class="font-medium text-blue-600 dark:text-blue-400">#' + invoice + '</span> has been initiated' + (initiatedDateF ? ' on ' + initiatedDateF : ''),
        false
      );

    } else {
      // Pending / Processing / default
      items += buildActivityLogItem(
        'bg-yellow-100 ring-1 ring-yellow-700/60 dark:bg-yellow-400/10 dark:ring-yellow-400/20',
        'Pending Your Action',
        'Please make sure to process your card.',
        true
      );
      items += buildActivityLogItem(
        'bg-gray-100 ring-1 ring-gray-300 dark:bg-white/10 dark:ring-white/20',
        'Initiated',
        'Payment for invoice <span class="font-medium text-blue-600 dark:text-blue-400">#' + invoice + '</span> has been initiated',
        false
      );
    }

    return (
      '<div class="flex">' +
        '<div class="' + DETAIL_LABEL + '">Activity Log</div>' +
        '<div class="flex-1 p-4">' +
          items +
        '</div>' +
      '</div>'
    );
  }

  function buildDetailRowHTML(entry, colCount) {
    return (
      '<tr data-detail class="hidden">' +
        '<td colspan="' + colCount + '" class="' + CLASS_NAMES.detailCell + '">' +
          buildNotesSection(entry) +
          buildStatusSection(entry) +
          buildAttachmentsSection(entry) +
          DETAIL_SEPARATOR +
          buildPaymentInfoSection(entry) +
          DETAIL_SEPARATOR +
          buildActivityLogSection(entry) +
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
    var actionCell = mainRow.querySelector('[data-action-column]');

    if (isOpen) {
      detailRow.classList.add('hidden');
      if (icon) icon.style.transform = '';
      mainRow.classList.remove('bg-gray-100', 'dark:bg-white/5');
      if (stickyCell) stickyCell.classList.remove('!bg-gray-100', 'dark:!bg-gray-900');
      if (actionCell) actionCell.classList.remove('!bg-gray-100', 'dark:!bg-gray-900');
    } else {
      detailRow.classList.remove('hidden');
      if (icon) icon.style.transform = 'rotate(90deg)';
      mainRow.classList.add('bg-gray-100', 'dark:bg-white/5');
      if (stickyCell) stickyCell.classList.add('!bg-gray-100', 'dark:!bg-gray-900');
      if (actionCell) actionCell.classList.add('!bg-gray-100', 'dark:!bg-gray-900');
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

  function calculateTabCounts(entries) {
    var counts = {
      ready: entries.length,
      pending: 0,
      paid: 0,
      exceptions: 0,
    };

    entries.forEach(function (entry) {
      var status = String(entry.status || '');
      if (status === 'Completed') {
        counts.paid += 1;
      } else if (status === 'Failed') {
        counts.exceptions += 1;
      } else if (status === 'Pending' || status === 'Processing') {
        counts.pending += 1;
      }
    });

    return counts;
  }

  function updateTabBadges(entries) {
    var badges = document.querySelectorAll(TAB_COUNT_SELECTOR);
    if (!badges.length) return;

    var counts = calculateTabCounts(entries);
    badges.forEach(function (badge) {
      var key = badge.getAttribute('data-tab-count');
      if (!Object.prototype.hasOwnProperty.call(counts, key)) return;
      badge.textContent = String(counts[key]);
    });
  }

  function setTabVisualState(tab, isActive) {
    var badge = tab.querySelector(TAB_COUNT_SELECTOR);

    if (isActive) {
      tab.classList.add.apply(tab.classList, ACTIVE_TAB_LINK_CLASSES);
      tab.classList.remove.apply(tab.classList, INACTIVE_TAB_LINK_CLASSES);
      if (badge) {
        badge.classList.add.apply(badge.classList, ACTIVE_BADGE_CLASSES);
        badge.classList.remove.apply(badge.classList, INACTIVE_BADGE_CLASSES);
      }
    } else {
      tab.classList.remove.apply(tab.classList, ACTIVE_TAB_LINK_CLASSES);
      tab.classList.add.apply(tab.classList, INACTIVE_TAB_LINK_CLASSES);
      if (badge) {
        badge.classList.remove.apply(badge.classList, ACTIVE_BADGE_CLASSES);
        badge.classList.add.apply(badge.classList, INACTIVE_BADGE_CLASSES);
      }
    }
  }

  function syncTabBadgeStyles(nav) {
    var tabs = nav.querySelectorAll('a');
    if (!tabs.length) return;

    tabs.forEach(function (tab) {
      var isActive = tab.getAttribute('aria-current') === 'page';
      setTabVisualState(tab, isActive);
    });
  }

  function initTabBadges() {
    var nav = document.querySelector(TAB_NAV_SELECTOR);
    if (!nav) return;

    syncTabBadgeStyles(nav);

    if (nav.dataset.tabBound === '1') return;
    nav.dataset.tabBound = '1';

    nav.addEventListener('click', function (event) {
      var clicked = event.target.closest('a');
      if (!clicked || !nav.contains(clicked)) return;

      nav.querySelectorAll('a').forEach(function (tab) {
        if (tab === clicked) {
          tab.setAttribute('aria-current', 'page');
        } else {
          tab.removeAttribute('aria-current');
        }
      });

      syncTabBadgeStyles(nav);

      // Filter table to the selected tab
      var tabCountEl = clicked.querySelector(TAB_COUNT_SELECTOR);
      var tabKey = tabCountEl ? tabCountEl.getAttribute('data-tab-count') : 'ready';
      var filtered = filterEntriesByTab(tabKey);
      paginationState.allEntries = filtered;
      paginationState.totalItems = filtered.length;
      paginationState.currentPage = 1;
      renderCurrentPage();
    });
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

  // ── Get Paid Panel ──

  function buildGetPaidActivityLog(log) {
    if (!log || !log.length) {
      return '<p class="text-sm text-gray-400 dark:text-gray-500">No activity recorded.</p>';
    }
    var html = '<div class="space-y-0">';
    log.forEach(function (item, idx) {
      var isLast = idx === log.length - 1;
      var dotColor = item.type === 'complete'
        ? 'bg-green-500 dark:bg-green-400'
        : item.type === 'failed'
          ? 'bg-red-500 dark:bg-red-400'
          : item.type === 'comment'
            ? 'bg-blue-400 dark:bg-blue-300'
            : 'bg-gray-400 dark:bg-gray-500';
      html += '<div class="relative flex gap-3">';
      if (!isLast) {
        html += '<div class="absolute top-0 bottom-0 left-0 flex w-5 justify-center pt-5">' +
          '<div class="w-px bg-gray-200 dark:bg-white/10"></div>' +
          '</div>';
      }
      html += '<div class="relative flex size-5 shrink-0 items-center justify-center mt-1">' +
        '<div class="size-2 rounded-full ' + dotColor + '"></div>' +
        '</div>';
      html += '<div class="pb-5 min-w-0 flex-1">';
      html += '<p class="text-sm font-medium text-gray-900 dark:text-white">' +
        escapeHtml(item.user || '') +
        ' <span class="font-normal text-gray-600 dark:text-gray-400">' + escapeHtml(item.action || '') + '</span>' +
        '</p>';
      if (item.comment) {
        html += '<p class="mt-0.5 text-sm text-gray-700 dark:text-gray-300">' + escapeHtml(item.comment) + '</p>';
      }
      if (item.date) {
        html += '<p class="mt-0.5 text-xs text-gray-400 dark:text-gray-500">' + escapeHtml(formatActivityDate(item.date)) + '</p>';
      }
      html += '</div>';
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  function buildGetPaidAttachments(attachments) {
    if (!attachments || !attachments.length) {
      return '<p class="text-sm text-gray-400 dark:text-gray-500">No documents attached.</p>';
    }
    var html = '';
    attachments.forEach(function (att) {
      html += '<div class="flex items-center justify-between py-2 border-b border-gray-100 dark:border-white/5 last:border-0">' +
        '<div class="flex items-center gap-2 min-w-0">' +
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4 shrink-0 text-gray-400 dark:text-gray-500">' +
            '<path fill-rule="evenodd" d="M15.621 4.379a3 3 0 0 0-4.242 0l-7 7a3 3 0 0 0 4.243 4.243l6.998-7a1.5 1.5 0 0 0-2.121-2.121l-6.5 6.5a.75.75 0 0 0 1.061 1.06l6.5-6.499a3 3 0 0 1 4.242 4.243l-7 7a4.5 4.5 0 0 1-6.364-6.364l7-7a6 6 0 0 1 8.485 8.485l-5.5 5.5a.75.75 0 0 1-1.06-1.06l5.5-5.5a4.5 4.5 0 0 0-6.364-6.364Z" clip-rule="evenodd" />' +
          '</svg>' +
          '<div class="min-w-0">' +
            '<p class="text-sm font-medium text-gray-900 dark:text-white truncate">' + escapeHtml(att.name || '') + '</p>' +
            '<p class="text-xs text-gray-500 dark:text-gray-400">PDF &bull; ' + escapeHtml(att.size || '') + '</p>' +
          '</div>' +
        '</div>' +
        '<a href="#" class="shrink-0 text-sm font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">Review</a>' +
      '</div>';
    });
    return html;
  }

  function openGetPaidPanel(entry) {
    var amountEl = document.getElementById('gp-amount');
    var currencyEl = document.getElementById('gp-currency');
    var dateEl = document.getElementById('gp-date');
    var customerEl = document.getElementById('gp-customer');
    var invoiceEl = document.getElementById('gp-invoice');
    var copyBtn = document.getElementById('gp-invoice-copy');
    var attachEl = document.getElementById('gp-attachments');
    var activityEl = document.getElementById('gp-activity-content');

    if (amountEl) amountEl.textContent = formatCurrency(entry.amount, entry.currency);
    if (currencyEl) currencyEl.textContent = entry.currency;
    if (dateEl) dateEl.textContent = formatDate(entry.dateInitiated);
    if (customerEl) customerEl.textContent = entry.customer;
    if (invoiceEl) invoiceEl.textContent = '#' + entry.invoice;

    if (copyBtn) {
      copyBtn.onclick = function () {
        navigator.clipboard.writeText(entry.invoice).catch(function () {});
      };
    }

    if (attachEl) attachEl.innerHTML = buildGetPaidAttachments(entry.details.attachments);
    if (activityEl) activityEl.innerHTML = buildGetPaidActivityLog(entry.details.activityLog);

    var panel = document.getElementById('get-paid-panel');
    var tableSection = document.getElementById('table-section');
    if (panel) panel.classList.remove('hidden');
    if (tableSection) tableSection.classList.add('hidden');
    window.scrollTo(0, 0);
  }

  function closeGetPaidPanel() {
    var panel = document.getElementById('get-paid-panel');
    var tableSection = document.getElementById('table-section');
    if (panel) panel.classList.add('hidden');
    if (tableSection) tableSection.classList.remove('hidden');
  }

  function initGetPaidPanel() {
    // Back button
    var backBtn = document.getElementById('get-paid-back');
    if (backBtn) backBtn.addEventListener('click', closeGetPaidPanel);

    // Receivable Summary toggle
    var receivableToggle = document.getElementById('gp-receivable-toggle');
    var receivableContent = document.getElementById('gp-receivable-content');
    if (receivableToggle && receivableContent) {
      receivableToggle.addEventListener('click', function () {
        receivableContent.classList.toggle('hidden');
        var icon = receivableToggle.querySelector('[data-collapse-icon]');
        if (icon) icon.classList.toggle('rotate-180');
      });
    }

    // Activity Log toggle
    var activityToggle = document.getElementById('gp-activity-toggle');
    var activityContent = document.getElementById('gp-activity-content');
    if (activityToggle && activityContent) {
      activityToggle.addEventListener('click', function () {
        activityContent.classList.toggle('hidden');
        var icon = activityToggle.querySelector('[data-collapse-icon]');
        if (icon) icon.classList.toggle('rotate-180');
      });
    }

    // "Get paid" button clicks (delegated — buttons are rendered dynamically)
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-get-paid-invoice]');
      if (!btn) return;
      e.preventDefault();
      var invoice = btn.getAttribute('data-get-paid-invoice');
      var entry = null;
      for (var i = 0; i < paginationState.sourceEntries.length; i++) {
        if (paginationState.sourceEntries[i].invoice === invoice) {
          entry = paginationState.sourceEntries[i];
          break;
        }
      }
      if (entry) openGetPaidPanel(entry);
    });
  }

  // ── Init ──

  function init() {
    var table = document.getElementById(TABLE_ID);
    if (!table) return;
    initTabBadges();
    initGetPaidPanel();

    fetchExchangesData()
      .then(function (result) {
        var columns = result.columns;
        var entries = result.entries;
        paginationState.sourceEntries = entries;
        updateTabBadges(entries);

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
        updateTabBadges([]);
      });
  }

  init();
})();

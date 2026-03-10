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
  var CHECK_ADDRESSES_PATH_FALLBACKS = [
    '../../../src/data/check-addresses.json',
    '/src/data/check-addresses.json',
    './src/data/check-addresses.json',
  ];
  var CUSTOMERS_PATH_FALLBACKS = [
    '../../../src/data/customers.json',
    '/src/data/customers.json',
    './src/data/customers.json',
  ];
  var BANK_ACCOUNTS_PATH_FALLBACKS = [
    '../../../src/data/bank-accounts.json',
    '/src/data/bank-accounts.json',
    './src/data/bank-accounts.json',
  ];
  var PAYMENT_PREFERENCES_DATA_PATH_FALLBACKS = [
    '../../../src/data/payment-preferences-data.json',
    '/src/data/payment-preferences-data.json',
    './src/data/payment-preferences-data.json',
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

  // Suppress history.pushState when responding to a popstate event
  var _suppressUrlUpdate = false;

  // My business info loaded from JSON (for bank account / check details)
  var _myBusiness = null;

  // MutationObserver for payment method select changes
  var _pmcObserver = null;

  // MutationObserver for bank account select changes
  var _bankSelectObserver = null;

  // MutationObserver for check address select changes
  var _checkSelectObserver = null;
  var _activeGetPaidEntry = null;
  var _activeTableTabKey = 'pending';
  var _customers = [];

  // Pagination state
  var paginationState = {
    currentPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    totalItems: 0,
    allEntries: [],
    sourceEntries: [],
    columns: [],
  };
  var sortState = {
    key: '',
    direction: '', // '', 'asc', 'desc'
  };
  var tableFilterState = {
    selectedCustomers: new Set(),
    selectedStatuses: new Set(),
    selectedMethods: new Set(),
    initiatedDateFrom: '',
    initiatedDateTo: '',
    initiatedDateFromDraft: '',
    initiatedDateToDraft: '',
    initiatedDateActiveField: 'from',
    initiatedDateMonth: null,
    menuOpen: false,
    activePanel: 'root',
  };
  var syncTableFilterUi = function () {};

  // Maps tab key (from data-tab-count) to the status values shown in that tab.
  // null means no filter — show all entries.
  var TAB_STATUS_FILTER = {
    pending: ['pending'],
    paid: ['paid'],
    exceptions: ['exception'],
  };

  var STATUS_STYLES = {
    pending:
      'bg-yellow-50 text-yellow-800 inset-ring-yellow-600/20 dark:bg-yellow-400/10 dark:text-yellow-500 dark:inset-ring-yellow-400/20',
    paid:
      'bg-green-50 text-green-700 inset-ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:inset-ring-green-500/20',
    exception:
      'bg-red-50 text-red-700 inset-ring-red-600/10 dark:bg-red-400/10 dark:text-red-400 dark:inset-ring-red-400/20',
  };

  var STATUS_LABELS = {
    pending: 'Pending',
    paid: 'Paid',
    exception: 'Exception',
  };

  var METHOD_TYPE_LABELS = {
    smart_exchange: 'SMART Exchange',
    card: 'Card',
    ach: 'ACH',
  };

  var CLASS_NAMES = {
    tbody: 'bg-white dark:bg-gray-900',
    row: 'transition-colors duration-300 motion-reduce:transition-none',
    cellBorder: ' border-b border-gray-200 dark:border-white/10',
    actionCell:
      'bg-white h-12 align-middle py-2 pr-4 pl-3 whitespace-nowrap w-24 min-w-24 text-right text-sm font-medium dark:bg-gray-900 sm:pr-2',
    detailCell: 'bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-white/10',
  };
  var ACTION_GUIDE_PARAM = 'card-rows';

  var actionGuideState = {
    active: false,
    step: 1,
    highlightFilter: '',
    selectedInvoice: '',
    backdropEl: null,
    closeBtnEl: null,
    spotlightLayerEl: null,
    tooltipEl: null,
    onEsc: null,
    onViewportChange: null,
    onDocumentPointerDown: null,
    openTimer: null,
    stepTransitionTimer: null,
  };

  // ── SVG Icons ──

  var ICON_ACH = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-5 text-gray-500 dark:text-gray-400 shrink-0"><path fill-rule="evenodd" d="M9.674 2.075a.75.75 0 0 1 .652 0l7.25 3.5A.75.75 0 0 1 17 6.957V16.5h.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H3V6.957a.75.75 0 0 1-.576-1.382l7.25-3.5ZM11 6a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM7.5 9.75a.75.75 0 0 0-1.5 0v5.5a.75.75 0 0 0 1.5 0v-5.5Zm3.25 0a.75.75 0 0 0-1.5 0v5.5a.75.75 0 0 0 1.5 0v-5.5Zm3.25 0a.75.75 0 0 0-1.5 0v5.5a.75.75 0 0 0 1.5 0v-5.5Z" clip-rule="evenodd" /></svg>';

  var ICON_VISA = '<svg class="size-5 shrink-0" height="20" width="20" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><path d="M0 0h32v32H0z" fill="#00579f"></path><g fill="#fff" fill-rule="nonzero"><path d="M13.823 19.876H11.8l1.265-7.736h2.023zm7.334-7.546a5.036 5.036 0 0 0-1.814-.33c-1.998 0-3.405 1.053-3.414 2.56-.016 1.11 1.007 1.728 1.773 2.098.783.379 1.05.626 1.05.963-.009.518-.633.757-1.216.757-.808 0-1.24-.123-1.898-.411l-.267-.124-.283 1.737c.475.213 1.349.403 2.257.411 2.123 0 3.505-1.037 3.521-2.641.008-.881-.532-1.556-1.698-2.107-.708-.354-1.141-.593-1.141-.955.008-.33.366-.667 1.165-.667a3.471 3.471 0 0 1 1.507.297l.183.082zm2.69 4.806.807-2.165c-.008.017.167-.452.266-.74l.142.666s.383 1.852.466 2.239h-1.682zm2.497-4.996h-1.565c-.483 0-.85.14-1.058.642l-3.005 7.094h2.123l.425-1.16h2.597c.059.271.242 1.16.242 1.16h1.873zm-16.234 0-1.982 5.275-.216-1.07c-.366-1.234-1.515-2.575-2.797-3.242l1.815 6.765h2.14l3.18-7.728z"></path><path d="M6.289 12.14H3.033L3 12.297c2.54.641 4.221 2.189 4.912 4.049l-.708-3.556c-.116-.494-.474-.633-.915-.65z"></path></g></g></svg>';

  var ICON_SORT = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4"><path class="opacity-70" fill-rule="evenodd" d="M10.53 3.47a.75.75 0 0 0-1.06 0L6.22 6.72a.75.75 0 1 0 1.06 1.06L10 5.06l2.72 2.72a.75.75 0 1 0 1.06-1.06l-3.25-3.25Z" clip-rule="evenodd" /><path class="opacity-70" fill-rule="evenodd" d="M6.22 13.28a.75.75 0 0 1 1.06 0L10 15.94l2.72-2.66a.75.75 0 1 1 1.06 1.06l-3.25 3.19a.75.75 0 0 1-1.06 0l-3.25-3.19a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>';
  var ICON_SORT_ASC = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4"><path transform="translate(10 5.6) scale(1.2) translate(-10 -5.6)" fill-rule="evenodd" d="M10.53 3.47a.75.75 0 0 0-1.06 0L6.22 6.72a.75.75 0 1 0 1.06 1.06L10 5.06l2.72 2.72a.75.75 0 1 0 1.06-1.06l-3.25-3.25Z" clip-rule="evenodd" /><path class="opacity-40" fill-rule="evenodd" d="M6.22 13.28a.75.75 0 0 1 1.06 0L10 15.94l2.72-2.66a.75.75 0 1 1 1.06 1.06l-3.25 3.19a.75.75 0 0 1-1.06 0l-3.25-3.19a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>';
  var ICON_SORT_DESC = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4"><path class="opacity-40" fill-rule="evenodd" d="M10.53 3.47a.75.75 0 0 0-1.06 0L6.22 6.72a.75.75 0 1 0 1.06 1.06L10 5.06l2.72 2.72a.75.75 0 1 0 1.06-1.06l-3.25-3.25Z" clip-rule="evenodd" /><path transform="translate(10 14.4) scale(1.2) translate(-10 -14.4)" fill-rule="evenodd" d="M6.22 13.28a.75.75 0 0 1 1.06 0L10 15.94l2.72-2.66a.75.75 0 1 1 1.06 1.06l-3.25 3.19a.75.75 0 0 1-1.06 0l-3.25-3.19a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>';

  var ICON_FILTER = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4"><path fill-rule="evenodd" d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 0 1 .628.74v2.288a2.25 2.25 0 0 1-.659 1.59l-4.682 4.683a2.25 2.25 0 0 0-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 0 1 8 18.25v-5.757a2.25 2.25 0 0 0-.659-1.591L2.659 6.22A2.25 2.25 0 0 1 2 4.629V2.34a.75.75 0 0 1 .628-.74Z" clip-rule="evenodd" /></svg>';

  var ICON_THREE_DOTS = '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path d="M10 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM11.5 15.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0Z" /></svg>';

  var ICON_CHEVRON_DOWN = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>';

  var ICON_COPY = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4 shrink-0 text-gray-400 dark:text-gray-500"><path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z" /><path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z" /></svg>';
  var ICON_EXPAND_RIGHT = '<svg class="size-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>';

  var ICON_EYE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4 text-blue-600"><path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /><path fill-rule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clip-rule="evenodd" /></svg>';
  var ICON_EYE_SLASH = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-4 text-blue-600"><path fill-rule="evenodd" clip-rule="evenodd" d="M3.28033 2.21967C2.98744 1.92678 2.51256 1.92678 2.21967 2.21967C1.92678 2.51256 1.92678 2.98744 2.21967 3.28033L12.7197 13.7803C13.0126 14.0732 13.4874 14.0732 13.7803 13.7803C14.0732 13.4874 14.0732 13.0126 13.7803 12.7197L12.4577 11.397C13.438 10.5863 14.1937 9.51366 14.6176 8.2863C14.681 8.10274 14.6811 7.90313 14.6179 7.71951C13.672 4.97316 11.0653 3 7.99777 3C6.85414 3 5.77457 3.27425 4.82123 3.76057L3.28033 2.21967Z" /><path d="M6.47602 5.41536L7.61147 6.55081C7.73539 6.51767 7.86563 6.5 8 6.5C8.82843 6.5 9.5 7.17157 9.5 8C9.5 8.13437 9.48233 8.26461 9.44919 8.38853L10.5846 9.52398C10.8486 9.07734 11 8.55636 11 8C11 6.34315 9.65685 5 8 5C7.44364 5 6.92266 5.15145 6.47602 5.41536Z" /><path d="M7.81206 10.9942L9.62754 12.8097C9.10513 12.9341 8.56002 13 7.99952 13C4.93197 13 2.32527 11.0268 1.3794 8.28049C1.31616 8.09687 1.31625 7.89727 1.37965 7.71371C1.63675 6.96935 2.01588 6.28191 2.49314 5.67529L5.00579 8.18794C5.09895 9.69509 6.30491 10.901 7.81206 10.9942Z" /></svg>';

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

  function getDigits(value) {
    return String(value || '').replace(/\D/g, '');
  }

  // Returns entries filtered to the given tab key using TAB_STATUS_FILTER.
  function filterEntriesByTab(tabKey) {
    var filter = TAB_STATUS_FILTER[tabKey];
    if (!filter || !filter.length) return paginationState.sourceEntries.slice();
    return paginationState.sourceEntries.filter(function (entry) {
      return filter.indexOf(entry.status) !== -1;
    });
  }

  function applyTableFilters(entries) {
    var list = Array.isArray(entries) ? entries.slice() : [];
    if (tableFilterState.selectedCustomers.size) {
      list = list.filter(function (entry) {
        return tableFilterState.selectedCustomers.has(String(entry && entry.customer || ''));
      });
    }
    if (tableFilterState.selectedStatuses.size) {
      list = list.filter(function (entry) {
        return tableFilterState.selectedStatuses.has(String(entry && entry.status || ''));
      });
    }
    if (tableFilterState.selectedMethods.size) {
      list = list.filter(function (entry) {
        return tableFilterState.selectedMethods.has(String(entry && entry.methodType || ''));
      });
    }
    if (tableFilterState.initiatedDateFrom || tableFilterState.initiatedDateTo) {
      var from = tableFilterState.initiatedDateFrom || '';
      var to = tableFilterState.initiatedDateTo || '';
      list = list.filter(function (entry) {
        var dateKey = String(entry && entry.dateInitiated || '').slice(0, 10);
        if (!dateKey) return false;
        if (from && dateKey < from) return false;
        if (to && dateKey > to) return false;
        return true;
      });
    }
    return list;
  }

  function getVisibleEntriesForActiveTab() {
    var base = filterEntriesByTab(_activeTableTabKey || 'pending');
    var filtered = applyTableFilters(base);
    return getSortedEntries(filtered);
  }

  function getSortDirectionForKey(key) {
    return sortState.key === key ? sortState.direction : '';
  }

  function cycleSortDirection(key) {
    if (!key) return;
    if (sortState.key !== key) {
      sortState.key = key;
      sortState.direction = 'asc';
      return;
    }
    if (sortState.direction === 'asc') {
      sortState.direction = 'desc';
      return;
    }
    if (sortState.direction === 'desc') {
      sortState.key = '';
      sortState.direction = '';
      return;
    }
    sortState.direction = 'asc';
  }

  function getSortedEntries(entries) {
    var list = Array.isArray(entries) ? entries.slice() : [];
    var key = sortState.key;
    var direction = sortState.direction;
    if (!key || !direction) return list;

    var multiplier = direction === 'desc' ? -1 : 1;
    var statusRank = { pending: 1, paid: 2, exception: 3 };
    list.sort(function (a, b) {
      var av;
      var bv;

      if (key === 'amount') {
        av = Number(a && a.amount) || 0;
        bv = Number(b && b.amount) || 0;
        if (av === bv) return 0;
        return (av > bv ? 1 : -1) * multiplier;
      }

      if (key === 'dateInitiated') {
        av = new Date(String(a && a.dateInitiated || '') + 'T00:00:00').getTime();
        bv = new Date(String(b && b.dateInitiated || '') + 'T00:00:00').getTime();
        av = Number.isFinite(av) ? av : 0;
        bv = Number.isFinite(bv) ? bv : 0;
        if (av === bv) return 0;
        return (av > bv ? 1 : -1) * multiplier;
      }

      if (key === 'status') {
        av = statusRank[String(a && a.status || '').toLowerCase()] || 99;
        bv = statusRank[String(b && b.status || '').toLowerCase()] || 99;
        if (av === bv) return 0;
        return (av > bv ? 1 : -1) * multiplier;
      }

      if (key === 'paymentMethod') {
        av = (String(a && a.paymentMethod || '') + ' ' + String(a && a.paymentMethodEnding || '')).trim().toLowerCase();
        bv = (String(b && b.paymentMethod || '') + ' ' + String(b && b.paymentMethodEnding || '')).trim().toLowerCase();
        var pmCmp = av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' });
        if (pmCmp === 0) return 0;
        return pmCmp * multiplier;
      }

      av = String(a && a[key] || '').toLowerCase();
      bv = String(b && b[key] || '').toLowerCase();
      var cmp = av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' });
      if (cmp === 0) return 0;
      return cmp * multiplier;
    });
    return list;
  }

  function isPendingLikeStatus(status) {
    return status === 'pending';
  }

  function normalizeStatusValue(status) {
    var value = String(status || '').trim().toLowerCase();
    if (value === 'completed') return 'paid';
    if (value === 'failed') return 'exception';
    if (value === 'processing') return 'pending';
    if (value === 'pending' || value === 'paid' || value === 'exception') return value;
    return 'pending';
  }

  function normalizeMethodTypeValue(entry) {
    var methodType = String(entry && entry.methodType || '').trim().toLowerCase();
    if (methodType === 'card' || methodType === 'ach' || methodType === 'smart_exchange') return methodType;

    var infoType = String(entry && entry.details && entry.details.paymentInfo && entry.details.paymentInfo.type || '').trim().toLowerCase();
    if (infoType === 'card' || infoType === 'ach') return infoType;
    if (infoType === 'smartexchange' || infoType === 'smart_exchange') return 'smart_exchange';

    var method = String(entry && entry.paymentMethod || '').trim().toLowerCase();
    if (method === 'card') return 'card';
    if (method === 'ach' || method === 'bank account') return 'ach';
    if (method === 'smart exchange') return 'smart_exchange';
    return 'smart_exchange';
  }

  function getMethodLabelFromType(methodType) {
    return METHOD_TYPE_LABELS[methodType] || 'SMART Exchange';
  }

  function getStatusLabel(status) {
    return STATUS_LABELS[status] || 'Pending';
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
    var methodType = normalizeMethodTypeValue(entry);
    return {
      amount: Number(entry.amount) || 0,
      currency: typeof entry.currency === 'string' ? entry.currency : 'USD',
      vendorEntry: typeof entry.vendorEntry === 'string' ? entry.vendorEntry : '',
      invoice: typeof entry.invoice === 'string' ? entry.invoice : '',
      customer: typeof entry.customer === 'string' ? entry.customer : '',
      dateInitiated: typeof entry.dateInitiated === 'string' ? entry.dateInitiated : '',
      paymentMethod: getMethodLabelFromType(methodType),
      methodType: methodType,
      paymentMethodEnding: typeof entry.paymentMethodEnding === 'string' ? entry.paymentMethodEnding : '',
      status: normalizeStatusValue(entry.status),
      payeeId: typeof entry.payeeId === 'string' ? entry.payeeId : ((_myBusiness && _myBusiness.id) || 'my-business'),
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
        var headerBtnAttrs = '';
        if (col.sortable) {
          headerBtnAttrs += ' data-sort-key="' + escapeHtml(col.key || '') + '"';
        }
        html += '<button type="button"' + headerBtnAttrs + ' class="group flex w-full cursor-pointer items-center gap-x-1.5 rounded-md text-left text-sm font-semibold text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-white">';
        html += '<span>' + escapeHtml(col.label) + '</span>';

        if (col.sortable) {
          var sortDirection = getSortDirectionForKey(col.key || '');
          html += buildSortBadgeHTML(sortDirection);
        }

        html += '</button>';
      } else {
        html += escapeHtml(col.label);
      }

      html += '</th>';
    });

    html += '</tr></thead>';
    return html;
  }

  function buildSortBadgeHTML(sortDirection) {
    var sortBtnClass = sortDirection
      ? 'inline-flex size-6 items-center justify-center rounded-md bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
      : 'inline-flex size-6 items-center justify-center rounded-md bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-400';
    var sortIcon = sortDirection === 'asc'
      ? ICON_SORT_ASC
      : (sortDirection === 'desc' ? ICON_SORT_DESC : ICON_SORT);
    return '<span data-sort-badge="true" class="' + sortBtnClass + '">' + sortIcon + '</span>';
  }

  function syncSortBadges(table) {
    if (!table) return;
    var sortButtons = table.querySelectorAll('[data-sort-key]');
    sortButtons.forEach(function (button) {
      var key = button.getAttribute('data-sort-key') || '';
      if (!key) return;
      var direction = getSortDirectionForKey(key);
      var badge = button.querySelector('[data-sort-badge="true"]');
      var badgeHtml = buildSortBadgeHTML(direction);
      if (!badge) {
        button.insertAdjacentHTML('beforeend', badgeHtml);
        return;
      }
      badge.outerHTML = badgeHtml;
    });
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
    var info = entry && entry.details ? (entry.details.paymentInfo || {}) : {};

    if (entry.methodType === 'ach') {
      var payee = getResolvedPayee(entry);
      var receivingBank = resolveReceivingBankAccount(entry, info) || (payee && payee.bankAccounts && payee.bankAccounts[0]);
      var achLast4 = getDigits(receivingBank && (receivingBank.accountNumber || receivingBank.maskedAccount || receivingBank.last4 || '')).slice(-4) ||
        getDigits(info && info.accountNumber).slice(-4) ||
        getDigits(ending).slice(-4);
      return '<span class="inline-flex items-center gap-x-2">' +
        ICON_ACH +
        '<span class="text-sm font-medium text-gray-900 dark:text-white">' + escapeHtml(achLast4 || '') + '</span>' +
        '</span>';
    }

    if (entry.methodType === 'card') {
      var customer = getCustomerForEntry(entry);
      var cardDetails = getPayerCardDetailsForRender(entry, info, customer);
      var last4 = getDigits(cardDetails && (cardDetails.fullCardNumber || cardDetails.maskedCardNumber || '')).slice(-4) ||
        getDigits(ending).slice(-4);
      return '<span class="inline-flex items-center gap-x-2">' +
        ICON_VISA +
        '<span class="text-sm font-medium text-gray-900 dark:text-white">' + escapeHtml(last4) + '</span>' +
        '</span>';
    }

    // SMART Exchange or any other — normal value
    return '<span class="text-sm font-medium text-gray-900 dark:text-white">' + escapeHtml(method) + '</span>';
  }

  function renderStatus(status) {
    var badgeClasses = STATUS_STYLES[status] || STATUS_STYLES.pending;
    return '<span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium inset-ring ' + badgeClasses + '">' +
      escapeHtml(getStatusLabel(status)) +
      '</span>';
  }

  function renderActionCell(entry) {
    if (entry.status === 'pending' && entry.methodType === 'smart_exchange') {
      return '<button type="button" data-get-paid-invoice="' + escapeHtml(entry.invoice) + '" class="rounded-md bg-blue-600 px-2 py-1 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-blue-500 dark:shadow-none dark:hover:bg-blue-400 dark:focus-visible:outline-blue-500">Get paid</button>';
    }

    if (_activeTableTabKey === 'pending' && isPendingLikeStatus(entry.status) && (entry.methodType === 'card' || entry.methodType === 'ach')) {
      return '<el-dropdown class="inline-block">' +
        '<button data-action-menu-trigger="true" class="flex items-center justify-center rounded-sm bg-white p-1 text-gray-500 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 hover:text-gray-700 dark:bg-white/10 dark:text-gray-400 dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20 dark:hover:text-gray-300">' +
          '<span class="sr-only">Open options</span>' +
          ICON_THREE_DOTS +
        '</button>' +
        '<el-menu anchor="bottom end" popover class=" min-w-32 origin-top-right rounded-md bg-white shadow-lg outline-1 outline-black/5 transition transition-discrete [--anchor-gap:--spacing(2)] data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in dark:bg-gray-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10">' +
          '<div class="py-1">' +
            '<a href="#" data-mark-paid-invoice="' + escapeHtml(entry.invoice) + '" class="block px-3 py-1.5 text-sm whitespace-nowrap text-gray-700 focus:bg-gray-100 focus:text-gray-900 focus:outline-hidden dark:text-gray-300 dark:focus:bg-white/5 dark:focus:text-white">Mark as paid (manual)</a>' +
            '<a href="#" data-view-details-invoice="' + escapeHtml(entry.invoice) + '" class="block px-3 py-1.5 text-sm whitespace-nowrap text-gray-700 focus:bg-gray-100 focus:text-gray-900 focus:outline-hidden dark:text-gray-300 dark:focus:bg-white/5 dark:focus:text-white">View details</a>' +
          '</div>' +
        '</el-menu>' +
      '</el-dropdown>';
    }

    // 3-dot dropdown for ACH / Card
    return '<el-dropdown class="inline-block">' +
      '<button data-action-menu-trigger="true" class="flex items-center justify-center rounded-sm bg-white p-1 text-gray-500 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 hover:text-gray-700 dark:bg-white/10 dark:text-gray-400 dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20 dark:hover:text-gray-300">' +
        '<span class="sr-only">Open options</span>' +
        ICON_THREE_DOTS +
      '</button>' +
      '<el-menu anchor="bottom end" popover class=" min-w-32 origin-top-right rounded-md bg-white shadow-lg outline-1 outline-black/5 transition transition-discrete [--anchor-gap:--spacing(2)] data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in dark:bg-gray-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10">' +
        '<div class="py-1">' +
          '<a href="#" data-view-details-invoice="' + escapeHtml(entry.invoice) + '" class="block px-3 py-1.5 text-sm whitespace-nowrap text-gray-700 focus:bg-gray-100 focus:text-gray-900 focus:outline-hidden dark:text-gray-300 dark:focus:bg-white/5 dark:focus:text-white">View details</a>' +
          '<a href="#" class="block px-3 py-1.5 text-sm whitespace-nowrap text-gray-700 focus:bg-gray-100 focus:text-gray-900 focus:outline-hidden dark:text-gray-300 dark:focus:bg-white/5 dark:focus:text-white">Edit payment</a>' +
          '<a href="#" class="block px-3 py-1.5 text-sm whitespace-nowrap text-gray-700 focus:bg-gray-100 focus:text-gray-900 focus:outline-hidden dark:text-gray-300 dark:focus:bg-white/5 dark:focus:text-white">Cancel</a>' +
        '</div>' +
      '</el-menu>' +
    '</el-dropdown>';
  }

  // ── Row builders ──

  function buildMainRowHTML(entry, columns, isLast) {
    var cb = isLast ? '' : CLASS_NAMES.cellBorder;
    var html = '<tr data-row data-method-type="' + escapeHtml(String(entry.methodType || '')) + '" data-invoice="' + escapeHtml(String(entry.invoice || '')) + '" class="' + CLASS_NAMES.row + '">';

    columns.forEach(function (col) {
      if (col.type === 'expand') {
        html +=
          '<td class="h-12 align-middle py-2 pr-3 pl-4 whitespace-nowrap sm:pl-0' + cb + '">' +
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
        cellClass = 'h-12 align-middle px-2 py-2 whitespace-nowrap' + cb;
      } else if (col.key === 'invoice' || col.key === 'dateInitiated') {
        cellClass = 'h-12 align-middle px-2 py-2 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400' + cb;
      } else {
        cellClass = 'h-12 align-middle px-2 py-2 text-sm font-medium whitespace-nowrap text-gray-900 dark:text-white' + cb;
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
    var statusClass = STATUS_STYLES[entry.status] || STATUS_STYLES.pending;
    return (
      '<div class="flex">' +
        '<div class="' + DETAIL_LABEL + '">Status</div>' +
        '<div class="flex-1 flex items-center p-4">' +
          '<span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium inset-ring ' + statusClass + '">' +
            escapeHtml(getStatusLabel(entry.status)) +
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

  var paymentInfoCopyIdCounter = 0;
  var EMPTY_DETAIL_VALUE = '<span class="text-gray-400 dark:text-gray-500">—</span>';

  // Payment info: each row is a 2-col layout (both flex-1, gap-6 = 24px)
  function buildPaymentInfoRow(label, value, hasCopy) {
    var valueHtml = value;
    if (hasCopy) {
      var copyId = 'sx-payment-copy-' + (++paymentInfoCopyIdCounter);
      var requiresReveal = hasCopy === 'revealed';
      var isMaskedValue = /[•]/.test(String(value || ''));
      var hideByDefault = requiresReveal || isMaskedValue;
      valueHtml =
        '<button type="button" data-copy-id="' + copyId + '"' +
          (requiresReveal ? ' data-copy-requires-reveal="true"' : '') +
          (isMaskedValue ? ' data-copy-masked="true"' : '') +
          ' class="copy-btn inline-flex w-fit items-center gap-1.5 rounded-md px-1.5 py-0.5 text-gray-700 transition-colors hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-white/20 cursor-pointer' +
          (hideByDefault ? ' hidden' : '') + '">' +
          '<span id="' + copyId + '" class="text-sm font-normal">' + value + '</span>' +
          ICON_COPY +
        '</button>';
    }

    return (
      '<div class="flex gap-6">' +
        '<dt class="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">' + label + '</dt>' +
        '<dd class="flex-1 flex items-center gap-6 text-sm text-gray-700 dark:text-gray-300">' +
          (valueHtml || EMPTY_DETAIL_VALUE) +
        '</dd>' +
      '</div>'
    );
  }

  function getSafeTextValue(value) {
    var str = String(value || '').trim();
    return str ? escapeHtml(str) : EMPTY_DETAIL_VALUE;
  }

  function getSafeMultilineValue(value) {
    var str = String(value || '').trim();
    return str ? escapeHtml(str).replace(/\n/g, '<br>') : EMPTY_DETAIL_VALUE;
  }

  function getMaskedLast4(raw, prefix) {
    var digits = getDigits(raw);
    if (!digits) return '';
    return (prefix || '•••• ') + digits.slice(-4);
  }

  function buildMaskedCardField(maskedValue, fieldName, revealedValue) {
    if (!maskedValue) return EMPTY_DETAIL_VALUE;
    var safeMasked = escapeHtml(maskedValue);
    var safeRevealed = escapeHtml(revealedValue || maskedValue);
    return '<span data-mask-field="' + fieldName + '" class="inline-block whitespace-nowrap" data-masked="' + safeMasked + '" data-revealed="' + safeRevealed + '">' + safeMasked + '</span>';
  }

  function buildMaskedAchField(maskedValue, revealedValue) {
    if (!maskedValue) return EMPTY_DETAIL_VALUE;
    var safeMasked = escapeHtml(maskedValue);
    var safeRevealed = escapeHtml(revealedValue || maskedValue);
    return '<span data-ach-mask-field="true" data-masked="' + safeMasked + '" data-revealed="' + safeRevealed + '" class="inline-block whitespace-nowrap">' + safeMasked + '</span>';
  }

  function findMatchingBusinessBankAccount(info) {
    var banks = _myBusiness && Array.isArray(_myBusiness.bankAccounts) ? _myBusiness.bankAccounts : [];
    if (!banks.length) return null;
    var targetLast4 = getDigits(info && info.accountNumber).slice(-4);
    var targetBankName = String(info && info.bankName || '').trim().toLowerCase();
    for (var i = 0; i < banks.length; i++) {
      var bank = banks[i];
      var bankLast4 = getDigits(bank && (bank.accountNumber || bank.maskedAccount || '')).slice(-4);
      var bankName = String(bank && (bank.bankName || bank.displayName || '')).trim().toLowerCase();
      if (targetLast4 && bankLast4 && targetLast4 === bankLast4) return bank;
      if (targetBankName && bankName && targetBankName === bankName) return bank;
    }
    return null;
  }

  function resolveReceivingBankAccount(entry, info) {
    var banks = _myBusiness && Array.isArray(_myBusiness.bankAccounts) ? _myBusiness.bankAccounts : [];
    if (!banks.length) return null;

    var endingLast4 = getDigits(entry && entry.paymentMethodEnding).slice(-4);
    if (endingLast4) {
      for (var i = 0; i < banks.length; i++) {
        var bank = banks[i];
        var bankLast4 = getDigits(bank && (bank.accountNumber || bank.maskedAccount || bank.last4 || '')).slice(-4);
        if (bankLast4 && bankLast4 === endingLast4) return bank;
      }
    }

    var byInfo = findMatchingBusinessBankAccount(info);
    if (byInfo) return byInfo;

    return banks[0];
  }

  function getResolvedPayee(entry) {
    if (!_myBusiness) return null;
    if (entry && entry.payeeId && _myBusiness.id && entry.payeeId !== _myBusiness.id) return null;
    return _myBusiness;
  }

  function getExceptionContextMessage(entry) {
    var log = entry && entry.details && Array.isArray(entry.details.activityLog) ? entry.details.activityLog : [];
    for (var i = log.length - 1; i >= 0; i--) {
      var item = log[i];
      if (item && item.type === 'failed' && item.action) return String(item.action);
    }
    return 'Payment is in exception state and requires review.';
  }

  function getCustomerForEntry(entry) {
    var targetCustomerName = String(entry && entry.vendorEntry || '').trim().toLowerCase();
    var targetVendorEntry = String(entry && entry.customer || '').trim().toLowerCase();
    for (var i = 0; i < _customers.length; i++) {
      var customer = _customers[i];
      var customerName = String(customer && customer.name || '').trim().toLowerCase();
      if (targetCustomerName && customerName === targetCustomerName) return customer;
      var vendorEntries = Array.isArray(customer && customer.vendorEntries) ? customer.vendorEntries : [];
      for (var j = 0; j < vendorEntries.length; j++) {
        if (String(vendorEntries[j] || '').trim().toLowerCase() === targetVendorEntry) return customer;
      }
    }
    return null;
  }

  function getPayerCardDetailsForRender(entry, info, customer) {
    var paymentInfo = info || {};
    var payerCardInfo = paymentInfo.payerCard || paymentInfo;
    var cardHolderName = (customer && customer.name) || payerCardInfo.cardholderName || entry.vendorEntry || '';
    var cardHolderAddress = payerCardInfo.cardholderAddress || paymentInfo.cardholderAddress || '';
    var cardNumberRaw = String(paymentInfo.cardNumber || payerCardInfo.cardNumber || entry.paymentMethodEnding || '');
    var cardDigits = cardNumberRaw.replace(/\D/g, '');
    var cardLast4 = cardDigits.length >= 4 ? cardDigits.slice(-4) : '0000';
    var fullCardNumber = cardDigits.length >= 13
      ? cardDigits.slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
      : ('4000 0000 0000 ' + cardLast4);
    var maskedCardNumber = '•••• ' + cardLast4;
    var expiryFull = String(paymentInfo.expires || payerCardInfo.expires || '12/2026');
    var rawCvc = String(paymentInfo.cvcFull || paymentInfo.cvc || payerCardInfo.cvcFull || payerCardInfo.cvc || '').trim();
    var cvcDigits = rawCvc.replace(/\D/g, '');
    var cvcValue = cvcDigits.length >= 3 ? cvcDigits.slice(0, 3) : '999';
    var maskedCvc = '•••';
    return {
      cardHolderName: cardHolderName,
      cardHolderAddress: cardHolderAddress,
      cardType: paymentInfo.cardType || payerCardInfo.cardType || 'Visa',
      maskedCardNumber: maskedCardNumber,
      fullCardNumber: fullCardNumber,
      expiryFull: expiryFull,
      maskedCvc: maskedCvc,
      cvcValue: cvcValue,
    };
  }

  function getPaymentMethodDetailsVariant(status, methodType, entry, info, payee) {
    if (status === 'pending' && methodType === 'smart_exchange') {
      return {
        key: 'smart_exchange_unselected',
        typeLabel: 'SMART Exchange',
        titleLabel: 'No Payment Method Selected',
        revealKind: '',
        rowsHtml:
          '<div class="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">' +
            'No payment method selected yet. Click \'Get paid\' to choose how you want to be paid.' +
          '</div>',
      };
    }

    if (methodType === 'ach') {
      var receivingBank = resolveReceivingBankAccount(entry, info) || (payee && payee.bankAccounts && payee.bankAccounts[0]);
      var achName = getSafeTextValue(
        (receivingBank && (receivingBank.name || receivingBank.displayName || receivingBank.bankName)) ||
        (info && (info.accountHolder || info.bankName))
      );
      var achAccountLast4 = getDigits(receivingBank && (receivingBank.accountNumber || receivingBank.maskedAccount || receivingBank.last4 || '')).slice(-4) ||
        getDigits(info && info.accountNumber).slice(-4);
      var achRoutingLast4 = getDigits(receivingBank && (receivingBank.routingNumber || receivingBank.maskedRouting || receivingBank.routing || '')).slice(-4) ||
        getDigits(info && info.routingNumber).slice(-4);
      var achAccountMasked = (receivingBank && receivingBank.maskedAccount) || (achAccountLast4 ? ('••••' + achAccountLast4) : '');
      var achRoutingMasked = (receivingBank && receivingBank.maskedRouting) || (achRoutingLast4 ? ('••••' + achRoutingLast4) : '');
      var achAccountRevealed = String(
        (receivingBank && receivingBank.accountNumber) ||
        (info && info.accountNumber) ||
        ''
      ).trim();
      var achRoutingRevealed = String(
        (receivingBank && (receivingBank.routingNumber || receivingBank.routing)) ||
        (info && info.routingNumber) ||
        ''
      ).trim();
      var achAddress = getSafeMultilineValue((receivingBank && receivingBank.address) || (info && info.address));
      var accountCopyId = 'sx-payment-copy-' + (++paymentInfoCopyIdCounter);
      var routingCopyId = 'sx-payment-copy-' + (++paymentInfoCopyIdCounter);
      var achCardHtml =
        '<div data-ach-info-card class="flex flex-col items-start self-stretch">' +
          '<div class="flex items-center justify-between self-stretch px-4 py-2 rounded-t-md border border-gray-200 bg-gray-100 dark:border-white/10 dark:bg-white/10">' +
            '<span class="text-sm font-semibold text-gray-900 dark:text-gray-100">Account Details</span>' +
            '<span></span>' +
          '</div>' +
          '<div class="flex flex-col items-start gap-2 self-stretch p-4 rounded-b-md border-r border-b border-l border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5">' +
            '<div class="grid grid-cols-2 gap-4 self-stretch">' +
              '<span class="text-sm font-medium text-gray-900 dark:text-gray-100">Name</span>' +
              '<span class="text-sm font-normal text-gray-700 dark:text-gray-300">' + achName + '</span>' +
            '</div>' +
            '<div class="grid grid-cols-2 gap-4 self-stretch">' +
              '<span class="text-sm font-medium text-gray-900 dark:text-gray-100">Account Number</span>' +
              '<button type="button" data-copy-id="' + accountCopyId + '" data-copy-enabled="false" data-ach-copy-control="true" class="copy-btn -ml-1 inline-flex w-fit items-center gap-1.5 rounded-md px-1.5 py-0.5 text-gray-700 dark:text-gray-300 pointer-events-none">' +
                '<span id="' + accountCopyId + '" data-ach-mask-field="true" data-masked="' + escapeHtml(achAccountMasked) + '" data-revealed="' + escapeHtml(achAccountRevealed) + '" class="text-sm font-normal">' + escapeHtml(achAccountMasked) + '</span>' +
                '<span data-copy-icon="true" class="hidden">' + ICON_COPY + '</span>' +
              '</button>' +
            '</div>' +
            '<div class="grid grid-cols-2 gap-4 self-stretch">' +
              '<span class="text-sm font-medium text-gray-900 dark:text-gray-100">Routing Number</span>' +
              '<button type="button" data-copy-id="' + routingCopyId + '" data-copy-enabled="false" data-ach-copy-control="true" class="copy-btn -ml-1 inline-flex w-fit items-center gap-1.5 rounded-md px-1.5 py-0.5 text-gray-700 dark:text-gray-300 pointer-events-none">' +
                '<span id="' + routingCopyId + '" data-ach-mask-field="true" data-masked="' + escapeHtml(achRoutingMasked) + '" data-revealed="' + escapeHtml(achRoutingRevealed) + '" class="text-sm font-normal">' + escapeHtml(achRoutingMasked) + '</span>' +
                '<span data-copy-icon="true" class="hidden">' + ICON_COPY + '</span>' +
              '</button>' +
            '</div>' +
            '<div class="grid grid-cols-2 gap-4 self-stretch items-start">' +
              '<span class="text-sm font-medium text-gray-900 dark:text-gray-100">Address</span>' +
              '<div class="flex flex-col items-start gap-1.5">' +
                '<span class="text-sm font-normal text-gray-700 dark:text-gray-300 whitespace-pre-line">' + achAddress + '</span>' +
                '<button type="button" data-ach-reveal-toggle data-revealed="false" class="mr-2.5 inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-600/10 dark:bg-blue-600/10 dark:text-blue-400 dark:hover:bg-blue-600/20 cursor-pointer">' +
                  '<span data-icon="reveal">' + ICON_EYE + '</span>' +
                  '<span data-icon="hide" class="hidden">' + ICON_EYE_SLASH + '</span>' +
                  '<span data-ach-reveal-text>Reveal Details</span>' +
                '</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
      var achRows = achCardHtml;
      if (status === 'exception') {
        achRows +=
          '<div class="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300">' +
            escapeHtml(getExceptionContextMessage(entry)) +
          '</div>';
      }
      return {
        key: status === 'exception' ? 'exception_ach' : 'ach',
        typeLabel: 'ACH',
        titleLabel: '',
        revealKind: '',
        rawCardHtml: achRows,
      };
    }

    if (methodType === 'card') {
      var customer = getCustomerForEntry(entry);
      var cardDetails = getPayerCardDetailsForRender(entry, info, customer);
      var cardNumberCopyId = 'sx-payment-copy-' + (++paymentInfoCopyIdCounter);
      var expiryCopyId = 'sx-payment-copy-' + (++paymentInfoCopyIdCounter);
      var cvcCopyId = 'sx-payment-copy-' + (++paymentInfoCopyIdCounter);
      var cardRows =
        '<div data-payment-info-card class="flex flex-col items-start self-stretch">' +
          '<div class="flex items-center justify-between self-stretch px-4 py-2 rounded-t-md border border-gray-200 bg-gray-100 dark:border-white/10 dark:bg-white/10">' +
            '<span class="text-sm font-semibold text-gray-900 dark:text-gray-100">Card Details</span>' +
            '<span></span>' +
          '</div>' +
          '<div class="flex flex-col items-start gap-2 self-stretch p-4 rounded-b-md border-r border-b border-l border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5">' +
            '<div class="grid grid-cols-2 gap-4 self-stretch">' +
              '<span class="text-sm font-medium text-gray-900 dark:text-gray-100">Cardholder Name</span>' +
              '<span class="text-sm font-normal text-gray-700 dark:text-gray-300">' + getSafeTextValue(cardDetails.cardHolderName) + '</span>' +
            '</div>' +
            '<div class="grid grid-cols-2 gap-4 self-stretch items-start">' +
              '<span class="text-sm font-medium text-gray-900 dark:text-gray-100">Cardholder Address</span>' +
              '<span class="text-sm font-normal text-gray-700 dark:text-gray-300 whitespace-pre-line">' + getSafeMultilineValue(cardDetails.cardHolderAddress) + '</span>' +
            '</div>' +
            '<div class="grid grid-cols-2 gap-4 self-stretch">' +
              '<span class="text-sm font-medium text-gray-900 dark:text-gray-100">Type</span>' +
              '<span class="text-sm font-normal text-gray-700 dark:text-gray-300">' + escapeHtml(cardDetails.cardType) + '</span>' +
            '</div>' +
            '<div class="grid grid-cols-2 gap-4 self-stretch">' +
              '<span class="text-sm font-medium text-gray-900 dark:text-gray-100">Card Number</span>' +
              '<button type="button" data-copy-id="' + cardNumberCopyId + '" data-copy-enabled="false" data-card-copy-control="true" class="copy-btn -ml-1 inline-flex w-fit items-center gap-1.5 rounded-md px-1.5 py-0.5 text-gray-700 dark:text-gray-300 pointer-events-none">' +
                '<span id="' + cardNumberCopyId + '" data-mask-field="card-number" data-masked="' + escapeHtml(cardDetails.maskedCardNumber) + '" data-revealed="' + escapeHtml(cardDetails.fullCardNumber) + '" class="text-sm font-normal">' + escapeHtml(cardDetails.maskedCardNumber) + '</span>' +
                '<span data-copy-icon="true" class="hidden">' + ICON_COPY + '</span>' +
              '</button>' +
            '</div>' +
            '<div class="grid grid-cols-2 gap-4 self-stretch">' +
              '<span class="text-sm font-medium text-gray-900 dark:text-gray-100">Expires</span>' +
              '<button type="button" data-copy-id="' + expiryCopyId + '" data-copy-enabled="false" data-card-copy-control="true" class="copy-btn -ml-1 inline-flex w-fit items-center gap-1.5 rounded-md px-1.5 py-0.5 text-gray-700 dark:text-gray-300 pointer-events-none">' +
                '<span id="' + expiryCopyId + '" data-mask-field="card-expiry" data-masked="' + escapeHtml(cardDetails.expiryFull) + '" data-revealed="' + escapeHtml(cardDetails.expiryFull) + '" class="text-sm font-normal">' + escapeHtml(cardDetails.expiryFull) + '</span>' +
                '<span data-copy-icon="true" class="hidden">' + ICON_COPY + '</span>' +
              '</button>' +
            '</div>' +
            '<div class="grid grid-cols-2 gap-4 self-stretch">' +
              '<span class="text-sm font-medium text-gray-900 dark:text-gray-100">CVC2</span>' +
              '<button type="button" data-copy-id="' + cvcCopyId + '" data-copy-enabled="false" data-card-copy-control="true" class="copy-btn -ml-1 inline-flex w-fit items-center gap-1.5 rounded-md px-1.5 py-0.5 text-gray-700 dark:text-gray-300 pointer-events-none">' +
                '<span id="' + cvcCopyId + '" data-mask-field="card-cvc" data-masked="' + escapeHtml(cardDetails.maskedCvc) + '" data-revealed="' + escapeHtml(cardDetails.cvcValue) + '" class="text-sm font-normal">' + escapeHtml(cardDetails.maskedCvc) + '</span>' +
                '<span data-copy-icon="true" class="hidden">' + ICON_COPY + '</span>' +
              '</button>' +
            '</div>' +
            '<div class="grid grid-cols-2 gap-4 self-stretch items-start">' +
              '<span></span>' +
              '<button type="button" data-card-reveal-toggle data-revealed="false" class="mr-2.5 inline-flex w-fit self-start items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-600/10 dark:bg-blue-600/10 dark:text-blue-400 dark:hover:bg-blue-600/20 cursor-pointer">' +
                '<span data-icon="reveal">' + ICON_EYE + '</span>' +
                '<span data-icon="hide" class="hidden">' + ICON_EYE_SLASH + '</span>' +
                '<span data-card-reveal-text>Reveal Details</span>' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      if (status === 'exception') {
        cardRows +=
          '<div class="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300">' +
            escapeHtml(getExceptionContextMessage(entry)) +
          '</div>';
      }
      return {
        key: status === 'exception' ? 'exception_card' : 'card',
        typeLabel: 'Card',
        titleLabel: '',
        revealKind: '',
        rawCardHtml: cardRows,
      };
    }

    if (status === 'exception') {
      return {
        key: 'exception_smart_exchange_unselected',
        typeLabel: 'SMART Exchange',
        titleLabel: 'No Payment Method Selected',
        revealKind: '',
        rowsHtml:
          '<div class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300">' +
            escapeHtml(getExceptionContextMessage(entry)) +
          '</div>',
      };
    }

    return {
      key: 'smart_exchange',
      typeLabel: 'SMART Exchange',
      titleLabel: 'Exchange Details',
      revealKind: '',
      rowsHtml:
        buildPaymentInfoRow('Exchange ID', getSafeTextValue(info && info.exchangeId), false) +
        buildPaymentInfoRow('Exchange Rate', getSafeTextValue(info && info.exchangeRate), false) +
        buildPaymentInfoRow('Source Amount', getSafeTextValue(info && info.sourceAmount), false) +
        buildPaymentInfoRow('Target Amount', getSafeTextValue(info && info.targetAmount), false) +
        buildPaymentInfoRow('Settlement Date', getSafeTextValue(info && info.settlementDate), false),
    };
  }

  function buildPaymentMethodDetailsSection(variant) {
    var revealKind = variant.revealKind;
    var revealAttr = revealKind === 'card'
      ? ' data-payment-info-card'
      : (revealKind === 'ach' ? ' data-ach-info-card' : '');
    var revealLink = revealKind === 'card'
      ? (
        '<button type="button" data-card-reveal-toggle data-revealed="false" class="mr-2.5 inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-600/10 dark:bg-blue-600/10 dark:text-blue-400 dark:hover:bg-blue-600/20 cursor-pointer">' +
          '<span data-icon="reveal">' + ICON_EYE + '</span>' +
          '<span data-icon="hide" class="hidden">' + ICON_EYE_SLASH + '</span>' +
          '<span data-card-reveal-text>Reveal Details</span>' +
        '</button>'
      )
      : (revealKind === 'ach'
        ? (
          '<button type="button" data-ach-reveal-toggle data-revealed="false" class="mr-2.5 inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-600/10 dark:bg-blue-600/10 dark:text-blue-400 dark:hover:bg-blue-600/20 cursor-pointer">' +
            '<span data-icon="reveal">' + ICON_EYE + '</span>' +
            '<span data-icon="hide" class="hidden">' + ICON_EYE_SLASH + '</span>' +
            '<span data-ach-reveal-text>Reveal Details</span>' +
          '</button>'
        )
        : '');

    if (variant.rawCardHtml) {
      return (
        '<div class="flex">' +
          '<div class="' + DETAIL_LABEL + '">Payment Method<br>Details</div>' +
          '<div class="flex-1 p-4 flex gap-4">' +
            '<div class="w-28 shrink-0 pt-0.5">' +
              '<div class="inline-flex items-center gap-1 text-sm font-semibold text-gray-900 dark:text-gray-100">' +
                '<span>' + variant.typeLabel + '</span>' +
                '<span class="inline-flex items-center justify-center rounded-md p-1 text-gray-500 dark:text-gray-300">' + ICON_EXPAND_RIGHT + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="w-[460px] max-w-full">' +
              variant.rawCardHtml +
            '</div>' +
          '</div>' +
        '</div>'
      );
    }

    return (
      '<div class="flex">' +
        '<div class="' + DETAIL_LABEL + '">Payment Method<br>Details</div>' +
        '<div class="flex-1 p-4 flex gap-4">' +
          '<div class="w-28 shrink-0 pt-0.5">' +
            '<div class="inline-flex items-center gap-1 text-sm font-semibold text-gray-900 dark:text-gray-100">' +
              '<span>' + variant.typeLabel + '</span>' +
              '<span class="inline-flex items-center justify-center rounded-md p-1 text-gray-500 dark:text-gray-300">' + ICON_EXPAND_RIGHT + '</span>' +
            '</div>' +
          '</div>' +
          '<div' + revealAttr + ' class="flex flex-col gap-2 w-[460px] max-w-full">' +
            '<div class="flex gap-6">' +
              '<div class="flex-1 text-sm font-medium text-gray-900 dark:text-white">' + variant.titleLabel + '</div>' +
              '<div class="flex-1 flex items-center">' + revealLink + '</div>' +
            '</div>' +
            '<div>' +
              '<div class="border-t border-gray-200 dark:border-white/10"></div>' +
              '<dl class="mt-2 flex flex-col gap-3">' +
                variant.rowsHtml +
              '</dl>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function PaymentMethodDetails(params) {
    if (!params) return '';
    var status = params.status;
    var methodType = params.methodType;
    var payment = params.payment;
    var payee = params.payee;
    var info = payment && payment.details ? payment.details.paymentInfo : null;
    var variant = getPaymentMethodDetailsVariant(status, methodType, payment, info || {}, payee);
    if (!variant) return '';
    return buildPaymentMethodDetailsSection(variant);
  }

  function buildPaymentInfoSection(entry) {
    var info = entry.details.paymentInfo;
    var payee = getResolvedPayee(entry);
    return PaymentMethodDetails({
      status: entry.status,
      methodType: entry.methodType,
      payment: entry,
      payee: payee,
      paymentInfo: info || {},
    });
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
    var items = buildEntryActivityLogItems(entry);

    return (
      '<div class="flex">' +
        '<div class="' + DETAIL_LABEL + '">Activity Log</div>' +
        '<div class="flex-1 p-4">' +
          items +
        '</div>' +
      '</div>'
    );
  }

  function buildEntryActivityLogItems(entry) {
    var invoice = escapeHtml(entry.invoice || '');
    var log = entry.details.activityLog;
    var items = '';

    if (entry.status === 'paid') {
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

    } else if (entry.status === 'exception') {
      var initiatedDateF = log[0] ? formatActivityDate(log[0].date) : formatDate(entry.dateInitiated);

      items += buildActivityLogItem(
        'bg-red-100 ring-1 ring-red-700/60 dark:bg-red-400/10 dark:ring-red-400/20',
        'Payment Exception',
        'Payment for invoice <span class="font-medium text-blue-600 dark:text-blue-400">#' + invoice + '</span> has an exception and needs review.',
        true
      );
      items += buildActivityLogItem(
        'bg-gray-100 ring-1 ring-gray-300 dark:bg-white/10 dark:ring-white/20',
        'Initiated',
        'Payment for invoice <span class="font-medium text-blue-600 dark:text-blue-400">#' + invoice + '</span> has been initiated' + (initiatedDateF ? ' on ' + initiatedDateF : ''),
        false
      );

    } else {
      // Pending/default
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

    return items;
  }

  function buildDetailRowHTML(entry, colCount) {
    var paymentSection = buildPaymentInfoSection(entry);
    return (
      '<tr data-detail class="hidden">' +
        '<td colspan="' + colCount + '" class="' + CLASS_NAMES.detailCell + '">' +
          buildNotesSection(entry) +
          buildStatusSection(entry) +
          buildAttachmentsSection(entry) +
          (paymentSection ? (DETAIL_SEPARATOR + paymentSection + DETAIL_SEPARATOR) : DETAIL_SEPARATOR) +
          buildActivityLogSection(entry) +
        '</td>' +
      '</tr>'
    );
  }

  function buildRowHTML(entry, columns, isLast) {
    var rowHighlightClass = getRowHighlightClass(entry, actionGuideState.highlightFilter);
    return (
      '<tbody class="' + CLASS_NAMES.tbody + (rowHighlightClass ? (' ' + rowHighlightClass) : '') + '">' +
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
      var sortBtn = event.target.closest('[data-sort-key]');
      if (sortBtn && table.contains(sortBtn)) {
        event.preventDefault();
        event.stopPropagation();
        var sortKey = sortBtn.getAttribute('data-sort-key') || '';
        if (!sortKey) return;
        cycleSortDirection(sortKey);
        refreshTableForActiveTab();
        syncSortBadges(table);
        return;
      }

      var revealBtn = event.target.closest('[data-card-reveal-toggle]');
      if (revealBtn && table.contains(revealBtn)) {
        event.preventDefault();
        var cardSection = revealBtn.closest('[data-payment-info-card]');
        if (!cardSection) return;
        function setCardCopyVisible(copyBtn, visible) {
          if (!copyBtn) return;
          copyBtn.setAttribute('data-copy-enabled', visible ? 'true' : 'false');
          var icon = copyBtn.querySelector('[data-copy-icon="true"]');
          if (visible) {
            copyBtn.classList.remove('pointer-events-none');
            copyBtn.classList.add('cursor-pointer', 'transition-colors', 'hover:bg-gray-200', 'dark:hover:bg-white/20');
            if (icon) icon.classList.remove('hidden');
          } else {
            copyBtn.classList.add('pointer-events-none');
            copyBtn.classList.remove('cursor-pointer', 'transition-colors', 'hover:bg-gray-200', 'dark:hover:bg-white/20');
            if (icon) icon.classList.add('hidden');
          }
        }

        var revealed = revealBtn.getAttribute('data-revealed') === 'true';
        revealed = !revealed;
        revealBtn.setAttribute('data-revealed', String(revealed));

        var maskFields = cardSection.querySelectorAll('[data-mask-field]');
        maskFields.forEach(function (field) {
          var maskedValue = field.getAttribute('data-masked') || '';
          var revealedValue = field.getAttribute('data-revealed') || '';
          field.textContent = revealed ? (revealedValue || maskedValue) : maskedValue;
        });

        var revealIcon = revealBtn.querySelector('[data-icon="reveal"]');
        var hideIcon = revealBtn.querySelector('[data-icon="hide"]');
        var text = revealBtn.querySelector('[data-card-reveal-text]');
        cardSection.querySelectorAll('[data-card-copy-control="true"]').forEach(function (copyAction) {
          setCardCopyVisible(copyAction, revealed);
        });
        if (revealIcon) revealIcon.classList.toggle('hidden', revealed);
        if (hideIcon) hideIcon.classList.toggle('hidden', !revealed);
        if (text) text.textContent = revealed ? 'Hide Details' : 'Reveal Details';
        return;
      }

      var achRevealBtn = event.target.closest('[data-ach-reveal-toggle]');
      if (achRevealBtn && table.contains(achRevealBtn)) {
        event.preventDefault();
        var achSection = achRevealBtn.closest('[data-ach-info-card]');
        if (!achSection) return;
        function setAchCopyVisible(copyBtn, visible) {
          if (!copyBtn) return;
          copyBtn.setAttribute('data-copy-enabled', visible ? 'true' : 'false');
          var icon = copyBtn.querySelector('[data-copy-icon="true"]');
          if (visible) {
            copyBtn.classList.remove('pointer-events-none');
            copyBtn.classList.add('cursor-pointer', 'transition-colors', 'hover:bg-gray-200', 'dark:hover:bg-white/20');
            if (icon) icon.classList.remove('hidden');
          } else {
            copyBtn.classList.add('pointer-events-none');
            copyBtn.classList.remove('cursor-pointer', 'transition-colors', 'hover:bg-gray-200', 'dark:hover:bg-white/20');
            if (icon) icon.classList.add('hidden');
          }
        }

        var achRevealed = achRevealBtn.getAttribute('data-revealed') === 'true';
        achRevealed = !achRevealed;
        achRevealBtn.setAttribute('data-revealed', String(achRevealed));

        var achFields = achSection.querySelectorAll('[data-ach-mask-field="true"]');
        achFields.forEach(function (field) {
          var maskedValue = field.getAttribute('data-masked') || '';
          var revealedValue = field.getAttribute('data-revealed') || '';
          field.textContent = achRevealed ? (revealedValue || maskedValue) : maskedValue;
        });

        var achRevealIcon = achRevealBtn.querySelector('[data-icon="reveal"]');
        var achHideIcon = achRevealBtn.querySelector('[data-icon="hide"]');
        var achText = achRevealBtn.querySelector('[data-ach-reveal-text]');
        achSection.querySelectorAll('[data-ach-copy-control="true"]').forEach(function (copyAction) {
          setAchCopyVisible(copyAction, achRevealed);
        });
        if (achRevealIcon) achRevealIcon.classList.toggle('hidden', achRevealed);
        if (achHideIcon) achHideIcon.classList.toggle('hidden', !achRevealed);
        if (achText) achText.textContent = achRevealed ? 'Hide Details' : 'Reveal Details';
        return;
      }

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
      pending: 0,
      paid: 0,
      exceptions: 0,
    };

    entries.forEach(function (entry) {
      var status = String(entry.status || '');
      if (status === 'paid') {
        counts.paid += 1;
      } else if (status === 'exception') {
        counts.exceptions += 1;
      } else if (status === 'pending') {
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
    var activeBadge = nav.querySelector('a[aria-current="page"] ' + TAB_COUNT_SELECTOR);
    _activeTableTabKey = activeBadge ? (activeBadge.getAttribute('data-tab-count') || 'pending') : 'pending';

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
      var tabKey = tabCountEl ? tabCountEl.getAttribute('data-tab-count') : 'pending';
      _activeTableTabKey = tabKey || 'pending';
      refreshTableForActiveTab();
      syncTableFilterUi();
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

  function initTableFilterDropdown() {
    var filterBtn = document.getElementById('sx-table-filter-btn');
    var filterDropdown = document.getElementById('sx-table-filter-dropdown');
    var filterMenu = document.getElementById('sx-table-filter-menu');
    var filterTrack = document.getElementById('sx-table-filter-track');
    var filterRootPanel = document.getElementById('sx-table-filter-panel-root');
    var filterDetailSlot = document.getElementById('sx-table-filter-detail-slot');
    var filterCustomerPanel = document.getElementById('sx-table-filter-panel-customer');
    var filterStatusPanel = document.getElementById('sx-table-filter-panel-status');
    var filterMethodPanel = document.getElementById('sx-table-filter-panel-method');
    var filterInitiatedDatePanel = document.getElementById('sx-table-filter-panel-initiated-date');
    var filterCustomersWrap = document.getElementById('sx-table-filter-customers');
    var filterStatusesWrap = document.getElementById('sx-table-filter-statuses');
    var filterMethodsWrap = document.getElementById('sx-table-filter-methods');
    var filterDateFromInput = document.getElementById('sx-table-filter-date-from-input');
    var filterDateToInput = document.getElementById('sx-table-filter-date-to-input');
    var filterDateFromMaskFilled = document.getElementById('sx-table-filter-date-from-mask-filled');
    var filterDateFromMaskEmpty = document.getElementById('sx-table-filter-date-from-mask-empty');
    var filterDateToMaskFilled = document.getElementById('sx-table-filter-date-to-mask-filled');
    var filterDateToMaskEmpty = document.getElementById('sx-table-filter-date-to-mask-empty');
    var filterDateMonthLabel = document.getElementById('sx-table-filter-date-month-label');
    var filterDatePrevBtn = document.getElementById('sx-table-filter-date-prev');
    var filterDateNextBtn = document.getElementById('sx-table-filter-date-next');
    var filterDateGrid = document.getElementById('sx-table-filter-date-grid');
    var filterDateCalendarWrap = document.getElementById('sx-table-filter-date-calendar');
    var filterApplyBtn = document.getElementById('sx-table-filter-apply-btn');
    var filterApplyStatusBtn = document.getElementById('sx-table-filter-apply-status-btn');
    var filterApplyMethodBtn = document.getElementById('sx-table-filter-apply-method-btn');
    var filterApplyDateBtn = document.getElementById('sx-table-filter-apply-date-btn');
    var filterBackdrop = document.getElementById('sx-table-filter-backdrop');
    var activeFiltersWrap = document.getElementById('sx-table-active-filters');
    if (!filterBtn || !filterMenu || !filterTrack || !filterRootPanel || !filterDetailSlot || !filterCustomerPanel || !filterStatusPanel || !filterMethodPanel || !filterInitiatedDatePanel || !filterCustomersWrap || !filterStatusesWrap || !filterMethodsWrap || !filterDateFromInput || !filterDateToInput || !filterDateFromMaskFilled || !filterDateFromMaskEmpty || !filterDateToMaskFilled || !filterDateToMaskEmpty || !filterDateMonthLabel || !filterDatePrevBtn || !filterDateNextBtn || !filterDateGrid || !filterDateCalendarWrap) return;

    function buildFilterCheckbox(id, label, countText, value, checked) {
      return '' +
        '<label class="group flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-100 group-has-checked:bg-gray-100 dark:hover:bg-white/5 dark:group-has-checked:bg-white/10">' +
        '  <div class="grid size-4 grid-cols-1">' +
        '    <input type="checkbox" data-filter-value="' + escapeHtml(value) + '" id="' + escapeHtml(id) + '"' + (checked ? ' checked' : '') +
        '      class="col-start-1 row-start-1 appearance-none rounded-sm border border-gray-300 bg-white checked:border-blue-600 checked:bg-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-white/20 dark:bg-white/5 dark:checked:border-blue-500 dark:checked:bg-blue-500" />' +
        '    <svg class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white" viewBox="0 0 14 14" fill="none">' +
        '      <path class="opacity-0 group-has-checked:opacity-100" d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />' +
        '    </svg>' +
        '  </div>' +
        '  <span class="text-sm font-medium text-gray-900 dark:text-gray-100">' + escapeHtml(label) + '</span>' +
        (countText ? ('<span class="text-sm font-normal text-gray-700 dark:text-gray-300">' + escapeHtml(countText) + '</span>') : '') +
        '</label>';
    }

    function getBaseFilterEntries() {
      return filterEntriesByTab(_activeTableTabKey || 'pending');
    }

    function isIsoDateString(value) {
      return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
    }

    function toIsoDate(value) {
      var str = String(value || '').slice(0, 10);
      return isIsoDateString(str) ? str : '';
    }

    function toLocalIsoDate(date) {
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
      var y = date.getFullYear();
      var m = String(date.getMonth() + 1).padStart(2, '0');
      var d = String(date.getDate()).padStart(2, '0');
      return y + '-' + m + '-' + d;
    }

    function isoToDate(iso) {
      if (!isIsoDateString(iso)) return null;
      var date = new Date(iso + 'T00:00:00');
      return Number.isNaN(date.getTime()) ? null : date;
    }

    function partsToIso(mm, dd, yyyy) {
      var mmNum = parseInt(mm, 10);
      var ddNum = parseInt(dd, 10);
      var yyyyNum = parseInt(yyyy, 10);
      if (!mm || !dd || !yyyy || Number.isNaN(mmNum) || Number.isNaN(ddNum) || Number.isNaN(yyyyNum)) return '';
      if (yyyy.length !== 4 || mm.length !== 2 || dd.length !== 2) return '';
      if (mmNum < 1 || mmNum > 12) return '';
      if (ddNum < 1 || ddNum > 31) return '';
      if (yyyyNum < 1900 || yyyyNum > 2099) return '';
      return yyyy + '-' + mm.padStart(2, '0') + '-' + dd.padStart(2, '0');
    }

    function formatIsoAsUsInput(iso) {
      if (!isIsoDateString(iso)) return '';
      return iso.slice(5, 7) + ' / ' + iso.slice(8, 10) + ' / ' + iso.slice(0, 4);
    }

    function sanitizeUsDateDigits(value) {
      var rawDigits = String(value || '').replace(/\D/g, '').slice(0, 8);
      var accepted = '';
      for (var i = 0; i < rawDigits.length; i++) {
        var ch = rawDigits.charAt(i);
        var ok = false;
        if (accepted.length === 0) {
          ok = ch === '0' || ch === '1';
        } else if (accepted.length === 1) {
          var monthTens = accepted.charAt(0);
          if (monthTens === '0') ok = ch >= '1' && ch <= '9';
          else if (monthTens === '1') ok = ch >= '0' && ch <= '2';
        } else if (accepted.length === 2) {
          ok = ch >= '0' && ch <= '3';
        } else if (accepted.length === 3) {
          var dayTens = accepted.charAt(2);
          if (dayTens === '0') ok = ch >= '1' && ch <= '9';
          else if (dayTens === '1' || dayTens === '2') ok = ch >= '0' && ch <= '9';
          else if (dayTens === '3') ok = ch >= '0' && ch <= '1';
        } else if (accepted.length === 4) {
          ok = ch === '1' || ch === '2';
        } else if (accepted.length === 5) {
          var yearThousands = accepted.charAt(4);
          if (yearThousands === '1') ok = ch === '9';
          else if (yearThousands === '2') ok = ch === '0';
        } else if (accepted.length === 6 || accepted.length === 7) {
          ok = ch >= '0' && ch <= '9';
        }
        if (ok) accepted += ch;
      }
      return accepted;
    }

    function formatUsInput(value) {
      var digits = sanitizeUsDateDigits(value);
      if (!digits) return '';
      if (digits.length <= 1) return digits;
      if (digits.length === 2) return digits + ' / ';
      if (digits.length === 3) return digits.slice(0, 2) + ' / ' + digits.slice(2);
      if (digits.length === 4) return digits.slice(0, 2) + ' / ' + digits.slice(2, 4) + ' / ';
      return digits.slice(0, 2) + ' / ' + digits.slice(2, 4) + ' / ' + digits.slice(4);
    }

    function usInputToIso(value) {
      var digits = sanitizeUsDateDigits(value);
      if (digits.length !== 8) return '';
      return partsToIso(digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8));
    }

    function renderInputMaskDisplay(inputValue, filledEl, emptyEl) {
      var template = 'MM / DD / YYYY';
      var filled = String(inputValue || '');
      var clamped = filled.length > template.length ? filled.slice(0, template.length) : filled;
      filledEl.textContent = clamped;
      emptyEl.textContent = template.slice(clamped.length);
    }

    function setInitiatedDateMonthFromIso(iso) {
      var source = isoToDate(iso) || new Date();
      tableFilterState.initiatedDateMonth = new Date(source.getFullYear(), source.getMonth(), 1);
    }

    function shiftInitiatedDateMonth(offset) {
      if (!tableFilterState.initiatedDateMonth) setInitiatedDateMonthFromIso(tableFilterState.initiatedDateFrom || tableFilterState.initiatedDateTo);
      tableFilterState.initiatedDateMonth = new Date(
        tableFilterState.initiatedDateMonth.getFullYear(),
        tableFilterState.initiatedDateMonth.getMonth() + offset,
        1
      );
    }

    function getSelectedDateForActiveField() {
      return tableFilterState.initiatedDateActiveField === 'to'
        ? tableFilterState.initiatedDateTo
        : tableFilterState.initiatedDateFrom;
    }

    function renderInitiatedDateInputs() {
      var fromDisplay = tableFilterState.initiatedDateFromDraft || formatIsoAsUsInput(tableFilterState.initiatedDateFrom);
      var toDisplay = tableFilterState.initiatedDateToDraft || formatIsoAsUsInput(tableFilterState.initiatedDateTo);
      filterDateFromInput.value = fromDisplay;
      filterDateToInput.value = toDisplay;
      renderInputMaskDisplay(fromDisplay, filterDateFromMaskFilled, filterDateFromMaskEmpty);
      renderInputMaskDisplay(toDisplay, filterDateToMaskFilled, filterDateToMaskEmpty);
    }

    function renderInitiatedDateCalendar() {
      if (!tableFilterState.initiatedDateMonth) setInitiatedDateMonthFromIso(getSelectedDateForActiveField());
      var monthStart = tableFilterState.initiatedDateMonth;
      filterDateMonthLabel.textContent = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      var firstOfMonth = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
      var startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday-first
      var gridStart = new Date(firstOfMonth);
      gridStart.setDate(firstOfMonth.getDate() - startOffset);
      var todayIso = toLocalIsoDate(new Date());
      var selectedFrom = tableFilterState.initiatedDateFrom;
      var selectedTo = tableFilterState.initiatedDateTo;
      var activeIso = getSelectedDateForActiveField();
      var cells = '';

      for (var i = 0; i < 42; i++) {
        var current = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
        var iso = toLocalIsoDate(current);
        var isCurrentMonth = current.getMonth() === monthStart.getMonth() && current.getFullYear() === monthStart.getFullYear();
        var isSelected = iso && (iso === selectedFrom || iso === selectedTo);
        var isInRange = selectedFrom && selectedTo && iso >= selectedFrom && iso <= selectedTo;
        var isToday = iso === todayIso;
        var isActive = iso && iso === activeIso;
        var classes = 'mx-auto flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-200';
        if (!isCurrentMonth) classes += ' text-gray-400 dark:text-gray-500';
        else classes += ' text-gray-900 dark:text-gray-100';
        if (isInRange && !isSelected) classes += ' bg-blue-50 dark:bg-blue-500/20';
        if (isSelected) classes += ' bg-blue-600 font-semibold text-white';
        else if (isToday) classes += ' font-semibold text-blue-600 dark:text-blue-400';
        if (isActive && !isSelected) classes += ' ring-2 ring-blue-500';

        cells += '' +
          '<div class="py-1">' +
          '  <button type="button" data-date-cell="' + escapeHtml(iso) + '" class="' + classes + '">' +
          '    <time datetime="' + escapeHtml(iso) + '">' + current.getDate() + '</time>' +
          '  </button>' +
          '</div>';
      }
      filterDateGrid.innerHTML = cells;
    }

    function setDateCalendarVisible(visible) {
      filterDateCalendarWrap.classList.toggle('hidden', !visible);
      if (visible) renderInitiatedDateCalendar();
    }

    function syncSelectedFiltersToAvailable() {
      var baseEntries = getBaseFilterEntries();
      var customerSet = new Set();
      var statusSet = new Set();
      var methodSet = new Set();
      baseEntries.forEach(function (entry) {
        customerSet.add(String(entry && entry.customer || ''));
        statusSet.add(String(entry && entry.status || ''));
        methodSet.add(String(entry && entry.methodType || ''));
      });
      Array.from(tableFilterState.selectedCustomers).forEach(function (customer) {
        if (!customerSet.has(customer)) tableFilterState.selectedCustomers.delete(customer);
      });
      Array.from(tableFilterState.selectedStatuses).forEach(function (status) {
        if (!statusSet.has(status)) tableFilterState.selectedStatuses.delete(status);
      });
      Array.from(tableFilterState.selectedMethods).forEach(function (method) {
        if (!methodSet.has(method)) tableFilterState.selectedMethods.delete(method);
      });
      tableFilterState.initiatedDateFrom = toIsoDate(tableFilterState.initiatedDateFrom);
      tableFilterState.initiatedDateTo = toIsoDate(tableFilterState.initiatedDateTo);
      tableFilterState.initiatedDateFromDraft = formatUsInput(tableFilterState.initiatedDateFromDraft);
      tableFilterState.initiatedDateToDraft = formatUsInput(tableFilterState.initiatedDateToDraft);
      if (tableFilterState.initiatedDateFrom && tableFilterState.initiatedDateTo && tableFilterState.initiatedDateFrom > tableFilterState.initiatedDateTo) {
        tableFilterState.initiatedDateTo = tableFilterState.initiatedDateFrom;
      }
    }

    function renderCustomerFilters() {
      var counts = new Map();
      getBaseFilterEntries().forEach(function (entry) {
        var name = String(entry && entry.customer || '').trim();
        counts.set(name, (counts.get(name) || 0) + 1);
      });
      var rows = Array.from(counts.entries())
        .sort(function (a, b) { return a[0].localeCompare(b[0]); })
        .map(function (entry, idx) {
          return buildFilterCheckbox(
            'sx-table-filter-customer-' + idx,
            entry[0],
            String(entry[1]),
            entry[0],
            tableFilterState.selectedCustomers.has(entry[0])
          );
        });
      filterCustomersWrap.innerHTML = rows.join('');
    }

    function renderStatusFilters() {
      var counts = {};
      getBaseFilterEntries().forEach(function (entry) {
        var key = String(entry && entry.status || '');
        if (!key) return;
        counts[key] = (counts[key] || 0) + 1;
      });
      var statusOrder = ['pending', 'paid', 'exception'];
      var statusLabels = { pending: 'Pending', paid: 'Paid', exception: 'Exception' };
      var rows = statusOrder
        .filter(function (key) { return counts[key] > 0; })
        .map(function (key) {
          return { key: key, label: statusLabels[key] || key, count: counts[key] };
        });
      filterStatusesWrap.innerHTML = rows.map(function (row, idx) {
        return buildFilterCheckbox(
          'sx-table-filter-status-' + idx,
          row.label,
          String(row.count),
          row.key,
          tableFilterState.selectedStatuses.has(row.key)
        );
      }).join('');
    }

    function renderMethodFilters() {
      var counts = {};
      getBaseFilterEntries().forEach(function (entry) {
        var key = String(entry && entry.methodType || '');
        if (!key) return;
        counts[key] = (counts[key] || 0) + 1;
      });
      var methodOrder = ['card', 'ach', 'smart_exchange'];
      var rows = methodOrder
        .filter(function (key) { return counts[key] > 0; })
        .map(function (key) {
          return { key: key, label: getMethodLabelFromType(key), count: counts[key] };
        });
      filterMethodsWrap.innerHTML = rows.map(function (row, idx) {
        return buildFilterCheckbox(
          'sx-table-filter-method-' + idx,
          row.label,
          String(row.count),
          row.key,
          tableFilterState.selectedMethods.has(row.key)
        );
      }).join('');
    }

    function syncApplyButtonState() {
      if (filterApplyBtn) filterApplyBtn.disabled = tableFilterState.selectedCustomers.size === 0;
      if (filterApplyStatusBtn) filterApplyStatusBtn.disabled = tableFilterState.selectedStatuses.size === 0;
      if (filterApplyMethodBtn) filterApplyMethodBtn.disabled = tableFilterState.selectedMethods.size === 0;
      if (filterApplyDateBtn) filterApplyDateBtn.disabled = !tableFilterState.initiatedDateFrom && !tableFilterState.initiatedDateTo;
    }

    function renderActiveFilterTags() {
      if (!activeFiltersWrap) return;
      var tags = [];
      var selectedCustomers = Array.from(tableFilterState.selectedCustomers)
        .filter(function (customer) { return customer && customer.trim(); })
        .sort(function (a, b) { return a.localeCompare(b); });
      var selectedStatuses = Array.from(tableFilterState.selectedStatuses)
        .filter(function (status) { return status && status.trim(); })
        .sort(function (a, b) { return a.localeCompare(b); });

      if (selectedCustomers.length) {
        tags.push({
          type: 'customer',
          label: 'Customer',
          value: selectedCustomers.join(', '),
        });
      }
      if (selectedStatuses.length) {
        var statusText = selectedStatuses
          .map(function (status) { return STATUS_LABELS[status] || status; })
          .join(', ');
        tags.push({
          type: 'status',
          label: 'Status',
          value: statusText,
        });
      }
      var selectedMethods = Array.from(tableFilterState.selectedMethods)
        .filter(function (method) { return method && method.trim(); })
        .sort(function (a, b) { return a.localeCompare(b); });
      if (selectedMethods.length) {
        var methodText = selectedMethods
          .map(function (method) { return getMethodLabelFromType(method); })
          .join(', ');
        tags.push({
          type: 'method',
          label: 'Method of payment',
          value: methodText,
        });
      }
      if (tableFilterState.initiatedDateFrom || tableFilterState.initiatedDateTo) {
        var fromLabel = tableFilterState.initiatedDateFrom ? formatDate(tableFilterState.initiatedDateFrom) : 'Any';
        var toLabel = tableFilterState.initiatedDateTo ? formatDate(tableFilterState.initiatedDateTo) : 'Any';
        tags.push({
          type: 'initiated_date',
          label: 'Initiated date',
          value: fromLabel + ' - ' + toLabel,
        });
      }

      if (!tags.length) {
        activeFiltersWrap.innerHTML = '';
        activeFiltersWrap.classList.add('hidden');
        return;
      }
      activeFiltersWrap.classList.remove('hidden');

      activeFiltersWrap.innerHTML = tags.map(function (tag) {
        var byLabel = 'By ' + String(tag.label || '').toLowerCase();
        return '' +
          '<span class="relative inline-flex max-w-[360px] items-stretch overflow-hidden rounded-md bg-gray-50 text-xs font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300">' +
          '  <span class="inline-flex shrink-0 items-center bg-gray-100 px-2 py-1 font-medium text-gray-900 dark:bg-white/15 dark:text-white">' + escapeHtml(byLabel) + '</span>' +
          '  <button type="button" data-filter-tag-open="' + escapeHtml(tag.type) + '" title="' + escapeHtml(tag.label + ': ' + tag.value) + '"' +
          '    class="inline-flex min-w-0 items-center border-l border-gray-300 bg-white px-2 py-1 text-left hover:bg-gray-100 dark:border-gray-500/40 dark:bg-white/5 dark:hover:bg-white/15 cursor-pointer">' +
          '    <span class="truncate font-medium text-gray-900 dark:text-white">' + escapeHtml(tag.value) + '</span>' +
          '  </button>' +
          '  <button type="button" data-filter-tag-remove="' + escapeHtml(tag.type) + '"' +
          '    class="inline-flex w-6 shrink-0 self-stretch items-center justify-center border-l border-gray-300 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:border-gray-500/40 dark:text-gray-300 dark:hover:bg-white/15 dark:hover:text-white cursor-pointer" aria-label="Remove filter">' +
          '    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-3">' +
          '      <path fill-rule="evenodd" d="M4.22 4.22a.75.75 0 0 1 1.06 0L10 8.94l4.72-4.72a.75.75 0 1 1 1.06 1.06L11.06 10l4.72 4.72a.75.75 0 1 1-1.06 1.06L10 11.06l-4.72 4.72a.75.75 0 1 1-1.06-1.06L8.94 10 4.22 5.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />' +
          '    </svg>' +
          '  </button>' +
          '  <span aria-hidden="true" class="pointer-events-none absolute inset-0 rounded-md inset-ring inset-ring-gray-300 dark:inset-ring-gray-500/40"></span>' +
          '</span>';
      }).join('');
    }

    function setDetailPanelVisibility(panel) {
      filterCustomerPanel.classList.add('hidden');
      filterCustomerPanel.classList.remove('flex');
      filterStatusPanel.classList.add('hidden');
      filterStatusPanel.classList.remove('flex');
      filterMethodPanel.classList.add('hidden');
      filterMethodPanel.classList.remove('flex');
      filterInitiatedDatePanel.classList.add('hidden');
      filterInitiatedDatePanel.classList.remove('flex');
      if (panel === 'customer') {
        filterCustomerPanel.classList.remove('hidden');
        filterCustomerPanel.classList.add('flex');
      } else if (panel === 'status') {
        filterStatusPanel.classList.remove('hidden');
        filterStatusPanel.classList.add('flex');
      } else if (panel === 'method') {
        filterMethodPanel.classList.remove('hidden');
        filterMethodPanel.classList.add('flex');
      } else if (panel === 'initiated_date') {
        filterInitiatedDatePanel.classList.remove('hidden');
        filterInitiatedDatePanel.classList.add('flex');
      }
    }

    function applyFilterMenuLayout() {
      var isMobileView = window.matchMedia('(max-width: 639px)').matches;
      if (isMobileView) {
        filterMenu.style.position = 'fixed';
        filterMenu.style.left = '0';
        filterMenu.style.right = '0';
        filterMenu.style.bottom = '0';
        filterMenu.style.top = 'auto';
        filterMenu.style.marginTop = '0';
        filterMenu.style.margin = '0';
        filterMenu.style.zIndex = '50';
        filterMenu.style.maxWidth = '100dvw';
        filterMenu.style.borderBottomLeftRadius = '0';
        filterMenu.style.borderBottomRightRadius = '0';
        filterMenu.style.borderTopLeftRadius = '0';
        filterMenu.style.borderTopRightRadius = '0';
        filterMenu.style.width = '100dvw';
        filterRootPanel.style.width = '100dvw';
        filterDetailSlot.style.width = '100dvw';
        filterTrack.classList.remove('transition-transform', 'duration-250', 'ease-[cubic-bezier(0.22,1,0.36,1)]');
        filterMenu.classList.remove('origin-top-right');
        filterMenu.classList.add('origin-bottom');
      } else {
        filterMenu.style.position = '';
        filterMenu.style.left = '';
        filterMenu.style.right = '';
        filterMenu.style.bottom = '';
        filterMenu.style.top = '';
        filterMenu.style.marginTop = '';
        filterMenu.style.margin = '';
        filterMenu.style.zIndex = '';
        filterMenu.style.maxWidth = '';
        filterMenu.style.borderBottomLeftRadius = '';
        filterMenu.style.borderBottomRightRadius = '';
        filterMenu.style.borderTopLeftRadius = '';
        filterMenu.style.borderTopRightRadius = '';
        filterMenu.style.width = '';
        filterRootPanel.style.width = '';
        filterDetailSlot.style.width = '';
        filterTrack.classList.add('transition-transform', 'duration-250', 'ease-[cubic-bezier(0.22,1,0.36,1)]');
        filterMenu.classList.remove('origin-bottom');
        filterMenu.classList.add('origin-top-right');
      }
    }

    function setFilterPanel(panel, immediate) {
      tableFilterState.activePanel = panel;
      var targetPanel = filterRootPanel;
      if (panel === 'customer' || panel === 'status' || panel === 'method' || panel === 'initiated_date') {
        setDetailPanelVisibility(panel);
        targetPanel = filterDetailSlot;
        if (panel === 'initiated_date') {
          setInitiatedDateMonthFromIso(getSelectedDateForActiveField() || tableFilterState.initiatedDateFrom || tableFilterState.initiatedDateTo);
          renderInitiatedDateInputs();
          renderInitiatedDateCalendar();
          setDateCalendarVisible(false);
        }
      } else {
        setDetailPanelVisibility('root');
      }
      var offset = targetPanel ? targetPanel.offsetLeft : 0;
      var width = targetPanel ? targetPanel.offsetWidth : 0;
      var height = targetPanel ? targetPanel.offsetHeight : 0;
      var isMobileView = window.matchMedia('(max-width: 639px)').matches;
      if (isMobileView) {
        filterTrack.style.transform = 'translateX(' + (-offset) + 'px)';
        filterMenu.style.width = '100dvw';
        if (height > 0) filterMenu.style.height = height + 'px';
        return;
      }
      if (immediate) {
        filterTrack.style.transform = 'translateX(' + (-offset) + 'px)';
        if (width > 0) filterMenu.style.width = width + 'px';
        if (height > 0) filterMenu.style.height = height + 'px';
        return;
      }
      var currentRect = filterMenu.getBoundingClientRect();
      if (!isMobileView && currentRect.width > 0) filterMenu.style.width = currentRect.width + 'px';
      if (currentRect.height > 0) filterMenu.style.height = currentRect.height + 'px';
      requestAnimationFrame(function () {
        filterTrack.style.transform = 'translateX(' + (-offset) + 'px)';
        if (isMobileView) {
          filterMenu.style.width = '100dvw';
        } else if (width > 0) {
          filterMenu.style.width = width + 'px';
        }
        if (height > 0) filterMenu.style.height = height + 'px';
      });
    }

    function setFilterMenuOpen(nextOpen) {
      tableFilterState.menuOpen = !!nextOpen;
      applyFilterMenuLayout();
      if (tableFilterState.menuOpen) {
        setFilterPanel(tableFilterState.activePanel || 'root', true);
        filterMenu.classList.remove('invisible', 'opacity-0', 'pointer-events-none');
        if (filterBackdrop && window.matchMedia('(max-width: 639px)').matches) {
          filterBackdrop.classList.remove('invisible', 'opacity-0', 'pointer-events-none');
        }
      } else {
        filterMenu.classList.add('invisible', 'opacity-0', 'pointer-events-none');
        filterMenu.style.width = '';
        filterMenu.style.height = '';
        if (filterBackdrop) {
          filterBackdrop.classList.add('invisible', 'opacity-0', 'pointer-events-none');
        }
      }
    }

    filterBtn.addEventListener('click', function (event) {
      event.stopPropagation();
      var nextOpen = !tableFilterState.menuOpen;
      if (nextOpen) tableFilterState.activePanel = 'root';
      setFilterMenuOpen(nextOpen);
      syncApplyButtonState();
    });

    filterTrack.addEventListener('click', function (event) {
      event.stopPropagation();
      var openBtn = event.target.closest('[data-filter-open]');
      if (openBtn) {
        event.preventDefault();
        setFilterPanel(openBtn.getAttribute('data-filter-open'));
        return;
      }
      if (event.target.closest('[data-filter-back]')) {
        event.preventDefault();
        setFilterPanel('root');
      }
    });

    filterTrack.addEventListener('change', function (event) {
      var checkbox = event.target.closest('input[type="checkbox"][data-filter-value]');
      if (!checkbox) return;
      var panelEl = checkbox.closest('#sx-table-filter-customers, #sx-table-filter-statuses');
      if (!panelEl) panelEl = checkbox.closest('#sx-table-filter-methods');
      var value = checkbox.getAttribute('data-filter-value');
      if (!panelEl || !value) return;
      if (panelEl.id === 'sx-table-filter-customers') {
        if (checkbox.checked) tableFilterState.selectedCustomers.add(value);
        else tableFilterState.selectedCustomers.delete(value);
      } else if (panelEl.id === 'sx-table-filter-statuses') {
        if (checkbox.checked) tableFilterState.selectedStatuses.add(value);
        else tableFilterState.selectedStatuses.delete(value);
      } else {
        if (checkbox.checked) tableFilterState.selectedMethods.add(value);
        else tableFilterState.selectedMethods.delete(value);
      }
      syncApplyButtonState();
      refreshTableForActiveTab();
    });

    function setActiveDateField(field) {
      tableFilterState.initiatedDateActiveField = field === 'to' ? 'to' : 'from';
      setInitiatedDateMonthFromIso(getSelectedDateForActiveField() || tableFilterState.initiatedDateFrom || tableFilterState.initiatedDateTo);
      renderInitiatedDateInputs();
      setDateCalendarVisible(false);
    }

    function setDateFieldFromInput(field, rawInput) {
      var formatted = formatUsInput(rawInput);
      var iso = usInputToIso(formatted);
      if (field === 'to') {
        tableFilterState.initiatedDateToDraft = formatted;
        if (!formatted || formatted === 'MM / DD / YYYY') tableFilterState.initiatedDateTo = '';
        else if (iso) tableFilterState.initiatedDateTo = iso;
        if (tableFilterState.initiatedDateFrom && tableFilterState.initiatedDateTo && tableFilterState.initiatedDateFrom > tableFilterState.initiatedDateTo) {
          tableFilterState.initiatedDateFrom = tableFilterState.initiatedDateTo;
          tableFilterState.initiatedDateFromDraft = formatIsoAsUsInput(tableFilterState.initiatedDateFrom);
        }
      } else {
        tableFilterState.initiatedDateFromDraft = formatted;
        if (!formatted || formatted === 'MM / DD / YYYY') tableFilterState.initiatedDateFrom = '';
        else if (iso) tableFilterState.initiatedDateFrom = iso;
        if (tableFilterState.initiatedDateFrom && tableFilterState.initiatedDateTo && tableFilterState.initiatedDateFrom > tableFilterState.initiatedDateTo) {
          tableFilterState.initiatedDateTo = tableFilterState.initiatedDateFrom;
          tableFilterState.initiatedDateToDraft = formatIsoAsUsInput(tableFilterState.initiatedDateTo);
        }
      }
      syncApplyButtonState();
      if (!formatted || iso) refreshTableForActiveTab();
      return formatted;
    }

    function bindDateInput(inputEl, field) {
      function getCaretIndexFromDigitsCount(count, formatted) {
        if (!formatted) return 0;
        var map = [0, 1, 5, 6, 10, 11, 12, 13, 14];
        var safeCount = Math.max(0, Math.min(8, count));
        var idx = map[safeCount];
        return Math.max(0, Math.min(idx, formatted.length));
      }

      inputEl.addEventListener('focus', function () {
        setActiveDateField(field);
      });
      inputEl.addEventListener('click', function (event) {
        event.stopPropagation();
      });
      inputEl.addEventListener('input', function () {
        var selectionStart = typeof inputEl.selectionStart === 'number' ? inputEl.selectionStart : inputEl.value.length;
        var digitsBeforeCaret = String(inputEl.value || '').slice(0, selectionStart).replace(/\D/g, '').length;
        var formatted = setDateFieldFromInput(field, inputEl.value);
        inputEl.value = formatted;
        if (field === 'from') {
          renderInputMaskDisplay(formatted, filterDateFromMaskFilled, filterDateFromMaskEmpty);
        } else {
          renderInputMaskDisplay(formatted, filterDateToMaskFilled, filterDateToMaskEmpty);
        }
        var nextCaret = getCaretIndexFromDigitsCount(digitsBeforeCaret, formatted);
        try {
          inputEl.setSelectionRange(nextCaret, nextCaret);
        } catch (err) {
          // Ignore selection errors on unsupported input states.
        }
      });
    }

    bindDateInput(filterDateFromInput, 'from');
    bindDateInput(filterDateToInput, 'to');

    filterDatePrevBtn.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      shiftInitiatedDateMonth(-1);
      renderInitiatedDateCalendar();
    });

    filterDateNextBtn.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      shiftInitiatedDateMonth(1);
      renderInitiatedDateCalendar();
    });

    filterDateGrid.addEventListener('click', function (event) {
      var dayBtn = event.target.closest('button[data-date-cell]');
      if (!dayBtn) return;
      event.preventDefault();
      event.stopPropagation();
      var iso = toIsoDate(dayBtn.getAttribute('data-date-cell'));
      if (!iso) return;
      if (tableFilterState.initiatedDateActiveField === 'to') {
        tableFilterState.initiatedDateTo = iso;
        tableFilterState.initiatedDateToDraft = formatIsoAsUsInput(iso);
        if (tableFilterState.initiatedDateFrom && tableFilterState.initiatedDateFrom > tableFilterState.initiatedDateTo) {
          tableFilterState.initiatedDateFrom = tableFilterState.initiatedDateTo;
          tableFilterState.initiatedDateFromDraft = formatIsoAsUsInput(tableFilterState.initiatedDateFrom);
        }
      } else {
        tableFilterState.initiatedDateFrom = iso;
        tableFilterState.initiatedDateFromDraft = formatIsoAsUsInput(iso);
        if (tableFilterState.initiatedDateTo && tableFilterState.initiatedDateFrom > tableFilterState.initiatedDateTo) {
          tableFilterState.initiatedDateTo = tableFilterState.initiatedDateFrom;
          tableFilterState.initiatedDateToDraft = formatIsoAsUsInput(tableFilterState.initiatedDateTo);
        }
      }
      syncApplyButtonState();
      renderInitiatedDateInputs();
      renderInitiatedDateCalendar();
      refreshTableForActiveTab();
    });

    if (filterApplyBtn) {
      filterApplyBtn.addEventListener('click', function (event) {
        event.stopPropagation();
        if (filterApplyBtn.disabled) return;
        setFilterMenuOpen(false);
        setFilterPanel('root');
      });
    }

    if (filterApplyStatusBtn) {
      filterApplyStatusBtn.addEventListener('click', function (event) {
        event.stopPropagation();
        if (filterApplyStatusBtn.disabled) return;
        setFilterMenuOpen(false);
        setFilterPanel('root');
      });
    }

    if (filterApplyMethodBtn) {
      filterApplyMethodBtn.addEventListener('click', function (event) {
        event.stopPropagation();
        if (filterApplyMethodBtn.disabled) return;
        setFilterMenuOpen(false);
        setFilterPanel('root');
      });
    }

    if (filterApplyDateBtn) {
      filterApplyDateBtn.addEventListener('click', function (event) {
        event.stopPropagation();
        if (filterApplyDateBtn.disabled) return;
        setFilterMenuOpen(false);
        setFilterPanel('root');
      });
    }

    document.addEventListener('click', function (event) {
      if (!filterDropdown || !tableFilterState.menuOpen) return;
      if (filterDropdown.contains(event.target)) return;
      setFilterMenuOpen(false);
      setFilterPanel('root');
    });

    if (filterBackdrop) {
      filterBackdrop.addEventListener('click', function () {
        if (!tableFilterState.menuOpen) return;
        setFilterMenuOpen(false);
        setFilterPanel('root');
      });
    }

    if (activeFiltersWrap) {
      activeFiltersWrap.addEventListener('click', function (event) {
        var openBtn = event.target.closest('button[data-filter-tag-open]');
        if (openBtn) {
          event.preventDefault();
          event.stopPropagation();
          var panelType = openBtn.getAttribute('data-filter-tag-open');
          if (panelType === 'customer' || panelType === 'status' || panelType === 'method' || panelType === 'initiated_date') {
            tableFilterState.activePanel = panelType;
            syncTableFilterUi();
            setFilterMenuOpen(true);
            setFilterPanel(panelType, true);
            syncApplyButtonState();
          }
          return;
        }
        var removeBtn = event.target.closest('button[data-filter-tag-remove]');
        if (!removeBtn) return;
        event.preventDefault();
        event.stopPropagation();
        var type = removeBtn.getAttribute('data-filter-tag-remove');
        if (!type) return;
        if (type === 'customer') tableFilterState.selectedCustomers.clear();
        if (type === 'status') tableFilterState.selectedStatuses.clear();
        if (type === 'method') tableFilterState.selectedMethods.clear();
        if (type === 'initiated_date') {
          tableFilterState.initiatedDateFrom = '';
          tableFilterState.initiatedDateTo = '';
          tableFilterState.initiatedDateFromDraft = '';
          tableFilterState.initiatedDateToDraft = '';
          tableFilterState.initiatedDateActiveField = 'from';
        }
        refreshTableForActiveTab();
      });
    }

    window.addEventListener('resize', function () {
      if (!tableFilterState.menuOpen) return;
      applyFilterMenuLayout();
      setFilterPanel(tableFilterState.activePanel || 'root');
    });

    syncTableFilterUi = function () {
      syncSelectedFiltersToAvailable();
      renderCustomerFilters();
      renderStatusFilters();
      renderMethodFilters();
      renderInitiatedDateInputs();
      renderInitiatedDateCalendar();
      renderActiveFilterTags();
      syncApplyButtonState();
      if (tableFilterState.menuOpen) {
        applyFilterMenuLayout();
        setFilterPanel(tableFilterState.activePanel || 'root', true);
      }
    };

    syncTableFilterUi();
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
    syncActionColumnGuide();
  }

  function refreshTableForActiveTab() {
    var filtered = getVisibleEntriesForActiveTab();
    paginationState.allEntries = filtered;
    paginationState.totalItems = filtered.length;
    paginationState.currentPage = 1;
    updateTabBadges(paginationState.sourceEntries);
    renderCurrentPage();
    syncTableFilterUi();
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
    syncActionColumnGuide();
  }

  function shouldShowActionColumnGuide() {
    try {
      var params = new URLSearchParams(window.location.search);
      return params.get('guide') === ACTION_GUIDE_PARAM;
    } catch (err) {
      return false;
    }
  }

  function removeGuideUrlParam() {
    try {
      var url = new URL(window.location.href);
      if (!url.searchParams.has('guide')) return;
      url.searchParams.delete('guide');
      var query = url.searchParams.toString();
      var next = url.pathname + (query ? ('?' + query) : '') + url.hash;
      window.history.replaceState({}, '', next);
    } catch (err) {
      // Ignore URL parsing errors
    }
  }

  function getRowHighlightClass(payment, highlightFilter) {
    if (highlightFilter !== 'card') return '';
    if (String(payment && payment.methodType || '') !== 'card') return '';
    return 'relative z-[210]';
  }

  function getGuideCardRows() {
    var table = document.getElementById(TABLE_ID);
    if (!table) return [];
    return Array.prototype.slice.call(table.querySelectorAll('tr[data-row][data-method-type="card"]'));
  }

  function getFirstVisibleGuideCardRow() {
    var rows = getGuideCardRows();
    for (var i = 0; i < rows.length; i += 1) {
      var row = rows[i];
      if (!row || row.offsetParent === null) continue;
      var rect = row.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      if (rect.bottom <= 0 || rect.top >= window.innerHeight) continue;
      return row;
    }
    return null;
  }

  function isVisibleGuideTarget(el) {
    if (!el) return false;
    var row = el.closest('tr[data-row]');
    var target = row || el;
    if (!target || target.offsetParent === null) return false;
    var rect = target.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    // Must be in current viewport; otherwise positioning clamps to bottom.
    if (rect.bottom <= 0 || rect.top >= window.innerHeight) return false;
    return true;
  }

  function pickFirstVisibleTarget(nodeList) {
    var items = Array.prototype.slice.call(nodeList || []);
    for (var i = 0; i < items.length; i += 1) {
      if (isVisibleGuideTarget(items[i])) return items[i];
    }
    return null;
  }

  function getFirstGuideTargetButton() {
    var table = document.getElementById(TABLE_ID);
    if (!table) return null;
    var firstRow = getFirstVisibleGuideCardRow();
    var firstTarget = firstRow
      ? pickFirstVisibleTarget(firstRow.querySelectorAll('[data-action-menu-trigger="true"]'))
      : null;
    if (!firstTarget) {
      firstTarget = pickFirstVisibleTarget(
        table.querySelectorAll('tr[data-row] [data-action-menu-trigger="true"]')
      );
    }
    return firstTarget || null;
  }

  function getGuideTargetButton() {
    var selectedInvoice = String(actionGuideState.selectedInvoice || '');
    if (selectedInvoice) {
      var table = document.getElementById(TABLE_ID);
      if (table) {
        var selectedTargets = Array.prototype.slice.call(
          table.querySelectorAll('tr[data-row] [data-action-menu-trigger="true"]')
        );
        for (var i = 0; i < selectedTargets.length; i += 1) {
          var target = selectedTargets[i];
          var row = target && target.closest('tr[data-row]');
          if (!row) continue;
          if (String(row.getAttribute('data-invoice') || '') !== selectedInvoice) continue;
          if (isVisibleGuideTarget(target)) return target;
        }
      }
    }
    return getFirstGuideTargetButton();
  }

  function getFirstGuideTargetButtonRect() {
    var guideTarget = getGuideTargetButton();
    if (guideTarget) {
      var rect = guideTarget.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) return rect;
    }
    return null;
  }

  function getGuideViewDetailsRect() {
    var selectedInvoice = String(actionGuideState.selectedInvoice || '');
    var links = Array.prototype.slice.call(document.querySelectorAll('el-menu a, [popover] a'));
    for (var i = 0; i < links.length; i += 1) {
      var link = links[i];
      if (!link || String(link.textContent || '').trim().toLowerCase() !== 'view details') continue;
      var invoice = String(link.getAttribute('data-view-details-invoice') || '');
      var rect = link.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      if (rect.bottom <= 0 || rect.top >= window.innerHeight) continue;
      if (selectedInvoice && invoice && invoice !== selectedInvoice) continue;
      return rect;
    }
    return null;
  }

  function openGuideMenuForTargetButton(button) {
    if (!button) return;
    var dropdown = button.closest('el-dropdown');
    var menu = dropdown ? dropdown.querySelector('el-menu[popover], [popover]') : null;
    if (menu && typeof menu.matches === 'function' && menu.matches(':popover-open')) return;
    if (menu && typeof menu.showPopover === 'function') {
      try {
        menu.showPopover();
        return;
      } catch (err) {
        // Fall through to click toggle if popover API call fails.
      }
    }
    button.click();
  }

  function setGuideSelectedInvoice(invoice) {
    actionGuideState.selectedInvoice = String(invoice || '');
  }

  function getEntryFromActionTrigger(button) {
    if (!button) return null;
    var row = button.closest('tr[data-row]');
    if (!row) return null;
    var invoice = row.getAttribute('data-invoice') || '';
    return invoice ? findEntryByInvoice(invoice) : null;
  }

  function getGuideSelectedEntry() {
    var selected = findEntryByInvoice(actionGuideState.selectedInvoice);
    if (selected) return selected;
    var firstGuideRow = getFirstVisibleGuideCardRow();
    if (!firstGuideRow) return null;
    return findEntryByInvoice(firstGuideRow.getAttribute('data-invoice') || '');
  }

  function openCardDetailsModalForEntry(entry) {
    if (!entry) return;
    _activeGetPaidEntry = entry;
    populateGetPaidCardModal(entry);
    var dialog = document.getElementById('gp-card-details-dialog');
    if (dialog && typeof dialog.showModal === 'function') {
      if (dialog.open) dialog.close();
      dialog.showModal();
    }
  }

  function openGuideSelectedEntryCardDetailsModal() {
    var entry = getGuideSelectedEntry();
    if (!entry) return;
    closeActionColumnGuide();
    openCardDetailsModalForEntry(entry);
  }

  function setGuideTooltipContent(step) {
    if (!actionGuideState.tooltipEl) return;
    actionGuideState.step = step;
    if (step === 2) {
      actionGuideState.tooltipEl.innerHTML =
        '<div class="relative rounded-lg border border-gray-300 bg-gray-50 p-4 shadow-sm dark:border-white/10 dark:bg-gray-800">' +
          '<span class="pointer-events-none absolute top-1/2 -right-1 h-2.5 w-2.5 -translate-y-1/2 rotate-45 border-t border-r border-gray-300 bg-gray-50 dark:border-white/10 dark:bg-gray-800"></span>' +
          '<div class="flex items-start justify-between gap-4">' +
            '<div class="min-w-0">' +
              '<p class="text-sm font-semibold leading-5 text-gray-900 dark:text-gray-100">Reveal Card Details</p>' +
              '<p class="mt-1 text-sm font-normal leading-5 text-gray-600 dark:text-gray-300">Open <span class="font-medium text-gray-900 dark:text-gray-100">View details</span> to verify this payment card information and continue setup.</p>' +
            '</div>' +
          '</div>' +
          '<div class="mt-4 flex items-center justify-end gap-2">' +
            '<button type="button" data-guide-tooltip-skip class="inline-flex items-center rounded-md px-2 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-900/10 dark:text-gray-300 dark:hover:bg-gray-900/10">Skip for now</button>' +
            '<button type="button" data-guide-tooltip-next class="rounded bg-blue-600 px-2 py-1 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Next</button>' +
          '</div>' +
        '</div>';
      var skipBtnStep2 = actionGuideState.tooltipEl.querySelector('[data-guide-tooltip-skip]');
      var nextBtnStep2 = actionGuideState.tooltipEl.querySelector('[data-guide-tooltip-next]');
      if (skipBtnStep2) skipBtnStep2.addEventListener('click', closeActionColumnGuide);
      if (nextBtnStep2) nextBtnStep2.addEventListener('click', function () {
        openGuideSelectedEntryCardDetailsModal();
      });
      return;
    }

    actionGuideState.tooltipEl.innerHTML =
      '<div class="relative rounded-lg border border-gray-300 bg-gray-50 p-4 shadow-sm dark:border-white/10 dark:bg-gray-800">' +
        '<span class="pointer-events-none absolute top-1/2 -right-1 h-2.5 w-2.5 -translate-y-1/2 rotate-45 border-t border-r border-gray-300 bg-gray-50 dark:border-white/10 dark:bg-gray-800"></span>' +
        '<div class="flex items-start justify-between gap-4">' +
          '<div class="min-w-0">' +
            '<p class="text-sm font-semibold leading-5 text-gray-900 dark:text-gray-100">Choose Any of These Payments</p>' +
            '<p class="mt-1 text-sm font-normal leading-5 text-gray-600 dark:text-gray-300">Start with any highlighted card payment to connect your terminal and begin the setup flow.</p>' +
          '</div>' +
        '</div>' +
        '<div class="mt-4 flex items-center justify-end gap-2">' +
          '<button type="button" data-guide-tooltip-skip class="inline-flex items-center rounded-md px-2 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-900/10 dark:text-gray-300 dark:hover:bg-gray-900/10">Skip for now</button>' +
          '<button type="button" data-guide-tooltip-next class="rounded bg-blue-600 px-2 py-1 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Next</button>' +
        '</div>' +
      '</div>';

    var skipBtn = actionGuideState.tooltipEl.querySelector('[data-guide-tooltip-skip]');
    var nextBtn = actionGuideState.tooltipEl.querySelector('[data-guide-tooltip-next]');
    if (skipBtn) skipBtn.addEventListener('click', closeActionColumnGuide);
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        goToGuideStep2(true);
      });
    }
  }

  function goToGuideStep2(forceOpenMenu) {
    if (!actionGuideState.active) return;
    if (actionGuideState.step === 2 && getGuideViewDetailsRect()) {
      syncActionColumnGuide();
      return;
    }
    if (forceOpenMenu) {
      var guideTarget = getGuideTargetButton();
      var guideTargetEntry = getEntryFromActionTrigger(guideTarget);
      if (guideTargetEntry) setGuideSelectedInvoice(guideTargetEntry.invoice);
      if (!guideTargetEntry) {
        var fallbackRow = getFirstVisibleGuideCardRow();
        if (fallbackRow) setGuideSelectedInvoice(fallbackRow.getAttribute('data-invoice') || '');
      }
      if (guideTarget && !getGuideViewDetailsRect()) openGuideMenuForTargetButton(guideTarget);
    }
    var attempts = 0;
    function tryAdvance() {
      if (!actionGuideState.active) return;
      var rect = getGuideViewDetailsRect();
      if (rect) {
        var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reducedMotion || !actionGuideState.tooltipEl) {
          setGuideTooltipContent(2);
          syncActionColumnGuide();
          if (actionGuideState.tooltipEl) {
            actionGuideState.tooltipEl.style.opacity = '1';
            actionGuideState.tooltipEl.style.transform = 'translateX(0)';
          }
          return;
        }
        actionGuideState.tooltipEl.style.opacity = '0';
        actionGuideState.tooltipEl.style.transform = 'translateX(-10px)';
        if (actionGuideState.stepTransitionTimer) clearTimeout(actionGuideState.stepTransitionTimer);
        actionGuideState.stepTransitionTimer = window.setTimeout(function () {
          setGuideTooltipContent(2);
          syncActionColumnGuide();
          if (actionGuideState.tooltipEl && actionGuideState.active) {
            actionGuideState.tooltipEl.style.opacity = '1';
            actionGuideState.tooltipEl.style.transform = 'translateX(0)';
          }
        }, 160);
        return;
      }
      attempts += 1;
      if (attempts <= 30) {
        if (attempts === 10 && forceOpenMenu) {
          var retryTarget = getGuideTargetButton();
          if (retryTarget && !getGuideViewDetailsRect()) openGuideMenuForTargetButton(retryTarget);
        }
        window.requestAnimationFrame(tryAdvance);
        return;
      }
      syncActionColumnGuide();
    }
    tryAdvance();
  }

  function positionGuideTooltip() {
    if (!actionGuideState.tooltipEl) return;
    var rect = actionGuideState.step === 2 ? getGuideViewDetailsRect() : getFirstGuideTargetButtonRect();
    if (!rect) {
      actionGuideState.tooltipEl.style.display = 'none';
      return;
    }

    actionGuideState.tooltipEl.style.display = 'inline-flex';
    var gap = 16;
    var tooltipRect = actionGuideState.tooltipEl.getBoundingClientRect();
    var left = rect.left - tooltipRect.width - gap;
    var top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
    var maxLeft = window.innerWidth - tooltipRect.width - 16;
    var maxTop = window.innerHeight - tooltipRect.height - 16;
    if (left < 16 || left > maxLeft || top < 16 || top > maxTop) {
      actionGuideState.tooltipEl.style.display = 'none';
      return;
    }
    actionGuideState.tooltipEl.style.left = left + 'px';
    actionGuideState.tooltipEl.style.top = top + 'px';
  }

  function getGuideTransitionDuration() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;
    return 300;
  }

  function buildGuideSpotlightBoxes() {
    if (!actionGuideState.spotlightLayerEl) return;
    var rows = getGuideCardRows();
    actionGuideState.spotlightLayerEl.innerHTML = '';
    rows.forEach(function (row) {
      var rect = row.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      var box = document.createElement('div');
      box.className = 'pointer-events-none fixed rounded-xl';
      box.style.left = Math.max(8, rect.left - 2) + 'px';
      box.style.top = Math.max(8, rect.top - 2) + 'px';
      box.style.width = Math.max(0, rect.width + 4) + 'px';
      box.style.height = Math.max(0, rect.height + 4) + 'px';
      actionGuideState.spotlightLayerEl.appendChild(box);
    });
  }

  function syncActionColumnGuide() {
    if (!actionGuideState.active) return;
    buildGuideSpotlightBoxes();
    positionGuideTooltip();
  }

  function closeActionColumnGuide() {
    if (actionGuideState.openTimer) {
      clearTimeout(actionGuideState.openTimer);
      actionGuideState.openTimer = null;
    }
    if (!actionGuideState.active && !actionGuideState.highlightFilter) return;
    actionGuideState.active = false;

    if (actionGuideState.onEsc) {
      window.removeEventListener('keydown', actionGuideState.onEsc);
      actionGuideState.onEsc = null;
    }
    if (actionGuideState.onViewportChange) {
      window.removeEventListener('resize', actionGuideState.onViewportChange);
      window.removeEventListener('scroll', actionGuideState.onViewportChange, true);
      actionGuideState.onViewportChange = null;
    }
    if (actionGuideState.onDocumentPointerDown) {
      document.removeEventListener('pointerdown', actionGuideState.onDocumentPointerDown, true);
      actionGuideState.onDocumentPointerDown = null;
    }
    if (actionGuideState.stepTransitionTimer) {
      clearTimeout(actionGuideState.stepTransitionTimer);
      actionGuideState.stepTransitionTimer = null;
    }

    var backdropToRemove = actionGuideState.backdropEl;
    var closeBtnToRemove = actionGuideState.closeBtnEl;
    var spotlightToRemove = actionGuideState.spotlightLayerEl;
    var tooltipToRemove = actionGuideState.tooltipEl;

    if (backdropToRemove) {
      backdropToRemove.style.pointerEvents = 'none';
      backdropToRemove.style.opacity = '0';
    }
    if (closeBtnToRemove) {
      closeBtnToRemove.style.pointerEvents = 'none';
      closeBtnToRemove.style.opacity = '0';
    }
    if (spotlightToRemove) {
      spotlightToRemove.style.pointerEvents = 'none';
      spotlightToRemove.style.opacity = '0';
    }
    if (tooltipToRemove) {
      tooltipToRemove.style.pointerEvents = 'none';
      tooltipToRemove.style.opacity = '0';
    }

    actionGuideState.backdropEl = null;
    actionGuideState.closeBtnEl = null;
    actionGuideState.spotlightLayerEl = null;
    actionGuideState.tooltipEl = null;

    var cleanup = function () {
      if (backdropToRemove && backdropToRemove.parentNode) backdropToRemove.parentNode.removeChild(backdropToRemove);
      if (closeBtnToRemove && closeBtnToRemove.parentNode) closeBtnToRemove.parentNode.removeChild(closeBtnToRemove);
      if (spotlightToRemove && spotlightToRemove.parentNode) spotlightToRemove.parentNode.removeChild(spotlightToRemove);
      if (tooltipToRemove && tooltipToRemove.parentNode) tooltipToRemove.parentNode.removeChild(tooltipToRemove);
      actionGuideState.highlightFilter = '';
      actionGuideState.selectedInvoice = '';
      renderCurrentPage();
    };

    var duration = getGuideTransitionDuration();
    if (duration <= 0) {
      cleanup();
      return;
    }
    window.setTimeout(cleanup, duration);
  }

  function openActionColumnGuide() {
    if (actionGuideState.active) return;
    actionGuideState.active = true;
    actionGuideState.highlightFilter = 'card';
    renderCurrentPage();

    actionGuideState.onEsc = function (event) {
      if (event.key === 'Escape') closeActionColumnGuide();
    };
    window.addEventListener('keydown', actionGuideState.onEsc);

    var backdrop = document.createElement('button');
    backdrop.type = 'button';
    backdrop.setAttribute('aria-label', 'Close payments guide');
    backdrop.setAttribute('data-guide-overlay', 'true');
    backdrop.className = 'fixed inset-0 z-[200] bg-gray-900/75 transition-opacity duration-300 ease-out motion-reduce:transition-none';
    backdrop.style.opacity = '0';
    backdrop.addEventListener('click', closeActionColumnGuide);
    document.body.appendChild(backdrop);
    actionGuideState.backdropEl = backdrop;

    actionGuideState.closeBtnEl = null;

    var spotlightLayer = document.createElement('div');
    spotlightLayer.className = 'fixed inset-0 z-[215] pointer-events-none transition-opacity duration-300 ease-out motion-reduce:transition-none';
    spotlightLayer.style.opacity = '0';
    document.body.appendChild(spotlightLayer);
    actionGuideState.spotlightLayerEl = spotlightLayer;

    var tooltip = document.createElement('div');
    tooltip.className = 'fixed z-[230] w-[413px] max-w-[calc(100vw-32px)] transition-[opacity,transform] duration-400 ease-out motion-reduce:transition-none';
    tooltip.style.opacity = '0';
    tooltip.style.transform = 'translateX(-10px)';
    document.body.appendChild(tooltip);
    actionGuideState.tooltipEl = tooltip;
    setGuideTooltipContent(1);

    actionGuideState.onDocumentPointerDown = function (event) {
      if (!actionGuideState.active) return;
      var tooltipEl = actionGuideState.tooltipEl;
      if (tooltipEl && tooltipEl.contains(event.target)) return;
      var actionTrigger = event.target.closest('[data-action-menu-trigger="true"]');
      if (actionTrigger && actionGuideState.step === 1) {
        var actionEntry = getEntryFromActionTrigger(actionTrigger);
        if (actionEntry) setGuideSelectedInvoice(actionEntry.invoice);
        window.setTimeout(function () { goToGuideStep2(false); }, 0);
        return;
      }
      var viewDetailsLink = event.target.closest('[data-view-details-invoice]');
      if (viewDetailsLink && actionGuideState.step === 2) return;
      closeActionColumnGuide();
    };
    document.addEventListener('pointerdown', actionGuideState.onDocumentPointerDown, true);

    actionGuideState.onViewportChange = function () {
      syncActionColumnGuide();
    };
    window.addEventListener('resize', actionGuideState.onViewportChange);
    window.addEventListener('scroll', actionGuideState.onViewportChange, true);
    syncActionColumnGuide();

    window.requestAnimationFrame(function () {
      if (actionGuideState.backdropEl) actionGuideState.backdropEl.style.opacity = '1';
      if (actionGuideState.spotlightLayerEl) actionGuideState.spotlightLayerEl.style.opacity = '1';
      var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (actionGuideState.tooltipEl) {
        if (reducedMotion) {
          actionGuideState.tooltipEl.style.opacity = '1';
          actionGuideState.tooltipEl.style.transform = 'translateX(0)';
        } else {
          actionGuideState.tooltipEl.style.transitionDuration = '400ms';
          actionGuideState.tooltipEl.style.transitionTimingFunction = 'ease-out';
          window.setTimeout(function () {
            if (!actionGuideState.tooltipEl || !actionGuideState.active) return;
            actionGuideState.tooltipEl.style.opacity = '1';
            actionGuideState.tooltipEl.style.transform = 'translateX(0)';
          }, 500);
        }
      }
      window.setTimeout(function () {
        syncActionColumnGuide();
      }, 50);
      window.setTimeout(function () {
        syncActionColumnGuide();
      }, 280);
    });
  }

  function startActionColumnGuide() {
    var firstTarget = getFirstGuideTargetButton();
    var firstRow = getFirstVisibleGuideCardRow();
    var table = document.getElementById(TABLE_ID);
    var scrollTarget = firstTarget || firstRow || table;
    if (scrollTarget && typeof scrollTarget.scrollIntoView === 'function') {
      // Use instant scroll to avoid race where tooltip computes before smooth scroll finishes.
      scrollTarget.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
    }
    actionGuideState.openTimer = window.setTimeout(function () {
      actionGuideState.openTimer = null;
      openActionColumnGuide();
      window.setTimeout(syncActionColumnGuide, 120);
    }, 50);
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

  function getCheckAddressPathCandidates() {
    var candidates = CHECK_ADDRESSES_PATH_FALLBACKS.slice();
    if (document.currentScript && document.currentScript.src) {
      try {
        candidates.unshift(new URL('../data/check-addresses.json', document.currentScript.src).toString());
      } catch (err) {
        // Ignore URL parse errors
      }
    }
    return Array.from(new Set(candidates));
  }

  function getBankAccountPathCandidates() {
    var candidates = BANK_ACCOUNTS_PATH_FALLBACKS.slice();
    if (document.currentScript && document.currentScript.src) {
      try {
        candidates.unshift(new URL('../data/bank-accounts.json', document.currentScript.src).toString());
      } catch (err) {
        // Ignore URL parse errors
      }
    }
    return Array.from(new Set(candidates));
  }

  function getPaymentPreferencesDataPathCandidates() {
    var candidates = PAYMENT_PREFERENCES_DATA_PATH_FALLBACKS.slice();
    if (document.currentScript && document.currentScript.src) {
      try {
        candidates.unshift(new URL('../data/payment-preferences-data.json', document.currentScript.src).toString());
      } catch (err) {
        // Ignore URL parse errors
      }
    }
    return Array.from(new Set(candidates));
  }

  function getCustomerPathCandidates() {
    var candidates = CUSTOMERS_PATH_FALLBACKS.slice();
    if (document.currentScript && document.currentScript.src) {
      try {
        candidates.unshift(new URL('../data/customers.json', document.currentScript.src).toString());
      } catch (err) {
        // Ignore URL parse errors
      }
    }
    return Array.from(new Set(candidates));
  }

  function normalizeCustomer(customer) {
    if (!customer || typeof customer !== 'object') return null;
    var id = typeof customer.id === 'string' ? customer.id.trim() : '';
    var name = typeof customer.name === 'string' ? customer.name.trim() : '';
    var vendorEntries = Array.isArray(customer.vendorEntries)
      ? customer.vendorEntries.map(function (v) { return String(v || '').trim(); }).filter(Boolean)
      : [];
    if (!id || !name) return null;
    return { id: id, name: name, vendorEntries: vendorEntries };
  }

  function fetchCustomersData() {
    var paths = getCustomerPathCandidates();
    var index = 0;

    function tryNextPath() {
      if (index >= paths.length) {
        throw new Error('Failed to load customers from all candidate paths');
      }
      var path = paths[index++];
      return fetchJsonFromPath(path).catch(function () {
        return tryNextPath();
      });
    }

    return tryNextPath().then(function (payload) {
      if (!Array.isArray(payload)) return [];
      return payload
        .map(normalizeCustomer)
        .filter(function (customer) { return customer !== null; });
    });
  }

  function normalizeCheckAddress(address) {
    if (!address || typeof address !== 'object') return null;
    var id = typeof address.id === 'string' ? address.id.trim() : '';
    var displayName = typeof address.displayName === 'string' ? address.displayName.trim() : '';
    var name = typeof address.name === 'string' ? address.name.trim() : '';
    var fullAddress = typeof address.address === 'string' ? address.address.trim() : '';
    var cityState = typeof address.cityState === 'string' ? address.cityState.trim() : '';
    var summary = typeof address.summary === 'string' ? address.summary.trim() : '';
    if (!id || !displayName || !name || !fullAddress) return null;
    if (!cityState) {
      var lines = fullAddress
        .split('\n')
        .map(function (line) { return line.trim(); })
        .filter(Boolean);
      cityState = lines.length > 1 ? lines[lines.length - 2] : (lines[0] || '');
    }
    if (!summary) {
      var summaryLines = fullAddress
        .split('\n')
        .map(function (line) { return line.trim(); })
        .filter(Boolean);
      summary = summaryLines.slice(0, 3).join(', ');
    }
    if (!cityState) return null;
    return {
      id: id,
      displayName: displayName,
      name: name,
      address: fullAddress,
      cityState: cityState,
      summary: summary,
    };
  }

  function fetchCheckAddressesData() {
    var paths = getCheckAddressPathCandidates();
    var index = 0;

    function tryNextPath() {
      if (index >= paths.length) {
        throw new Error('Failed to load check addresses from all candidate paths');
      }
      var path = paths[index++];
      return fetchJsonFromPath(path).catch(function () {
        return tryNextPath();
      });
    }

    return tryNextPath().then(function (payload) {
      if (!Array.isArray(payload)) return [];
      return payload
        .map(normalizeCheckAddress)
        .filter(function (address) { return address !== null; });
    });
  }

  function normalizeBankAccount(account) {
    if (!account || typeof account !== 'object') return null;
    var id = typeof account.id === 'string' ? account.id.trim() : '';
    if (!id) return null;
    var displayName = typeof account.displayName === 'string' ? account.displayName.trim() : '';
    var bankName = typeof account.bankName === 'string' ? account.bankName.trim() : '';
    var name = typeof account.name === 'string' ? account.name.trim() : '';
    var accountNumber = typeof account.accountNumber === 'string' ? account.accountNumber.trim() : '';
    var maskedAccount = typeof account.maskedAccount === 'string' ? account.maskedAccount.trim() : '';
    var routingNumber = typeof account.routingNumber === 'string' ? account.routingNumber.trim() : '';
    var maskedRouting = typeof account.maskedRouting === 'string' ? account.maskedRouting.trim() : '';
    var address = typeof account.address === 'string' ? account.address.trim() : '';
    var last4 = typeof account.last4 === 'string' ? account.last4.trim() : '';
    if (!last4) {
      var digits = accountNumber.replace(/\D/g, '');
      if (digits.length >= 4) last4 = digits.slice(-4);
    }
    if (!displayName) {
      if (bankName) displayName = bankName + ' Account';
      else if (name) displayName = name;
      else displayName = 'Bank Account';
    }
    return {
      id: id,
      displayName: displayName,
      name: name || displayName,
      bankName: bankName || displayName.replace(/\s+Account$/i, ''),
      accountNumber: accountNumber,
      maskedAccount: maskedAccount || (last4 ? ('••••' + last4) : ''),
      routingNumber: routingNumber,
      maskedRouting: maskedRouting,
      address: address,
      last4: last4,
    };
  }

  function fetchBankAccountsData() {
    var paths = getBankAccountPathCandidates();
    var index = 0;

    function tryNextPath() {
      if (index >= paths.length) {
        throw new Error('Failed to load bank accounts from all candidate paths');
      }
      var path = paths[index++];
      return fetchJsonFromPath(path).catch(function () {
        return tryNextPath();
      });
    }

    return tryNextPath().then(function (payload) {
      if (!Array.isArray(payload)) return [];
      return payload
        .map(normalizeBankAccount)
        .filter(function (account) { return account !== null; });
    });
  }

  function fetchPaymentPreferencesData() {
    var paths = getPaymentPreferencesDataPathCandidates();
    var index = 0;

    function tryNextPath() {
      if (index >= paths.length) {
        throw new Error('Failed to load payment-preferences data from all candidate paths');
      }
      var path = paths[index++];
      return fetchJsonFromPath(path).catch(function () {
        return tryNextPath();
      });
    }

    return tryNextPath().then(function (payload) {
      var banks = Array.isArray(payload && payload.bankAccounts) ? payload.bankAccounts : [];
      return {
        bankAccounts: banks.map(normalizeBankAccount).filter(function (item) { return item !== null; }),
      };
    });
  }

  function mergeBankAccounts(primary, secondary) {
    var byId = {};
    var orderedIds = [];

    (primary || []).forEach(function (account) {
      var normalized = normalizeBankAccount(account);
      if (!normalized) return;
      byId[normalized.id] = normalized;
      orderedIds.push(normalized.id);
    });

    (secondary || []).forEach(function (account) {
      var normalized = normalizeBankAccount(account);
      if (!normalized) return;
      var current = byId[normalized.id] || {};
      byId[normalized.id] = Object.assign({}, current, normalized, {
        accountNumber: normalized.accountNumber || current.accountNumber || '',
        maskedAccount: normalized.maskedAccount || current.maskedAccount || '',
        routingNumber: normalized.routingNumber || current.routingNumber || '',
        maskedRouting: normalized.maskedRouting || current.maskedRouting || '',
        address: normalized.address || current.address || '',
      });
      if (orderedIds.indexOf(normalized.id) === -1) orderedIds.push(normalized.id);
    });

    return orderedIds.map(function (id) { return byId[id]; });
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

      return { columns: columns, entries: entries, myBusiness: payload.myBusiness || null };
    });
  }

  // ── Get Paid Panel ──

  function buildGetPaidActivityLog(entry) {
    return buildEntryActivityLogItems(entry);
  }

  var SAMPLE_ATTACHMENTS = [
    { name: 'Adjuster Report1', size: 'PDF · 1.3 MB' },
    { name: 'Adjuster Report2', size: 'PDF · 980.5 KB' },
  ];

  var ATTACHMENT_ICON =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 shrink-0 text-gray-400 dark:text-gray-500">' +
      '<path fill-rule="evenodd" clip-rule="evenodd" d="M15.621 4.379a3 3 0 0 0-4.242 0l-7 7a3 3 0 0 0 4.241 4.243h.001l.497-.5a.75.75 0 0 1 1.064 1.057l-.498.501-.002.002a4.5 4.5 0 0 1-6.364-6.364l7-7a4.5 4.5 0 0 1 6.368 6.36l-3.455 3.553A2.625 2.625 0 1 1 9.52 9.52l3.45-3.451a.75.75 0 1 1 1.061 1.06l-3.45 3.451a1.125 1.125 0 0 0 1.587 1.595l3.454-3.553a3 3 0 0 0 0-4.242Z" />' +
    '</svg>';

  var CHECKBOX_STATUS_HTML =
    '<div class="flex h-6 shrink-0 items-center">' +
      '<div class="group grid size-4 grid-cols-1">' +
        '<input type="checkbox" class="col-start-1 row-start-1 appearance-none rounded-sm border border-gray-300 bg-white checked:border-blue-600 checked:bg-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-gray-600 dark:bg-white/5 dark:checked:border-blue-500 dark:checked:bg-blue-500" />' +
        '<svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white">' +
          '<path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-checked:opacity-100" />' +
        '</svg>' +
      '</div>' +
    '</div>';

  var STEP_BADGE_NUMBER_CLASS =
    'inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-xs font-medium text-gray-800 dark:border-white/10 dark:bg-white/10 dark:text-gray-300';
  var STEP_BADGE_COMPLETE_CLASS =
    'inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-green-200 bg-green-50 text-green-600 dark:border-green-500/30 dark:bg-green-400/10 dark:text-green-400';
  var STEP_BADGE_CHECK_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-3.5" aria-hidden="true">' +
      '<path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" />' +
    '</svg>';

  function setGetPaidStepBadge(stepNum, isComplete) {
    var badge = document.getElementById('gp-step-' + stepNum + '-badge');
    if (!badge) return;
    if (isComplete) {
      badge.className = STEP_BADGE_COMPLETE_CLASS;
      badge.innerHTML = STEP_BADGE_CHECK_ICON;
      badge.setAttribute('aria-label', 'Step ' + stepNum + ' complete');
    } else {
      badge.className = STEP_BADGE_NUMBER_CLASS;
      badge.textContent = String(stepNum);
      badge.setAttribute('aria-label', 'Step ' + stepNum);
    }
  }

  function getSelectedOptionValue(sel) {
    if (!sel) return '';
    var selected = sel.querySelector('el-option[aria-selected="true"]');
    return selected ? String(selected.getAttribute('value') || '') : '';
  }

  function findEntryByInvoice(invoice) {
    var inv = String(invoice || '');
    for (var i = 0; i < paginationState.sourceEntries.length; i++) {
      if (paginationState.sourceEntries[i].invoice === inv) return paginationState.sourceEntries[i];
    }
    return null;
  }

  function populateGetPaidCardModal(entry) {
    if (!entry) return;
    var formattedAmount = formatCurrency(entry.amount, entry.currency);
    var paymentInfo = entry.details && entry.details.paymentInfo ? entry.details.paymentInfo : {};
    var customer = getCustomerForEntry(entry);
    var cardDetails = getPayerCardDetailsForRender(entry, paymentInfo, customer);
    var cardHolderName = cardDetails.cardHolderName || entry.vendorEntry || '';
    var cardHolderAddress = cardDetails.cardHolderAddress || '';
    var displayCardNumber = cardDetails.fullCardNumber || cardDetails.maskedCardNumber || '';
    var expiryFull = String(cardDetails.expiryFull || '12/2026');
    var expiryShort = /^\d{2}\/\d{4}$/.test(expiryFull) ? (expiryFull.slice(0, 3) + expiryFull.slice(-2)) : expiryFull;
    var cvcValue = String(cardDetails.cvcValue || '999');

    var vcAmountEl = document.getElementById('gp-vc-amount');
    var vcPendingEl = document.getElementById('gp-vc-pending-amount');
    var vcNameOnCardEl = document.getElementById('gp-vc-name');
    var vcHolderNameEl = document.getElementById('gp-vc-holder-name');
    var vcHolderAddressEl = document.getElementById('gp-vc-card-address');
    var vcCardNumberEl = document.getElementById('gp-vc-card-number');
    var vcExpiryEl = document.getElementById('gp-vc-expiry');
    var vcFullNumberEl = document.getElementById('gp-vc-full-number');
    var vcFullExpiryEl = document.getElementById('gp-vc-full-expiry');
    var vcCvcEl = document.getElementById('gp-vc-cvc2');
    var vcCvvPillEl = document.getElementById('gp-vc-cvv-pill');

    if (vcAmountEl) vcAmountEl.textContent = formattedAmount;
    if (vcPendingEl) vcPendingEl.textContent = formattedAmount;
    if (vcNameOnCardEl) vcNameOnCardEl.textContent = cardHolderName;
    if (vcHolderNameEl) vcHolderNameEl.textContent = cardHolderName;
    if (vcHolderAddressEl) vcHolderAddressEl.textContent = cardHolderAddress;
    if (vcCardNumberEl) vcCardNumberEl.textContent = displayCardNumber;
    if (vcExpiryEl) vcExpiryEl.textContent = expiryShort;
    if (vcFullNumberEl) vcFullNumberEl.textContent = displayCardNumber;
    if (vcFullExpiryEl) vcFullExpiryEl.textContent = expiryFull;
    if (vcCvcEl) vcCvcEl.textContent = cvcValue;
    if (vcCvvPillEl) vcCvvPillEl.textContent = 'CVV : ' + cvcValue;
  }

  function initGetPaidCardDetailsTrigger() {
    document.addEventListener('click', function (e) {
      var trigger = e.target.closest('[commandfor="gp-card-details-dialog"]');
      if (!trigger) return;
      if (_activeGetPaidEntry) populateGetPaidCardModal(_activeGetPaidEntry);
    });
  }

  function updateGetPaidStepStates() {
    // Step 1: all document review actions are complete
    var openReviewBtns = document.querySelectorAll('#gp-attachments .gp-review-trigger:not(.hidden)');
    var statusChecks = document.querySelectorAll('#gp-attachments [id^="gp-attach-"][id$="-status"] input[type="checkbox"]');
    var step1Done = statusChecks.length > 0 && openReviewBtns.length === 0;

    // Step 2: signature has been completed
    var signedBadge = document.getElementById('gp-signed-badge');
    var step2Done = !!(signedBadge && !signedBadge.classList.contains('hidden'));

    // Step 3: payment method selected; bank account method also requires bank selection
    var paymentSel = document.querySelector('el-select[name="paymentMethod"]');
    var paymentValue = getSelectedOptionValue(paymentSel);
    var step3Done = false;
    if (paymentValue) {
      if (paymentValue === 'bank-account') {
        var bankSel = document.getElementById('gp-bank-account-select');
        step3Done = !!getSelectedOptionValue(bankSel);
      } else {
        step3Done = true;
      }
    }

    setGetPaidStepBadge(1, step1Done);
    setGetPaidStepBadge(2, step2Done);
    setGetPaidStepBadge(3, step3Done);

    var submitBtn = document.getElementById('gp-submit-btn');
    if (submitBtn) {
      var canSubmit = step1Done && step2Done && step3Done;
      submitBtn.disabled = !canSubmit;
      submitBtn.setAttribute('aria-disabled', canSubmit ? 'false' : 'true');
    }
  }

  function buildAttachmentItem(att, idx) {
    return (
      '<li class="flex items-center justify-between py-4 pr-5 pl-4 text-sm/6">' +
        '<div class="flex w-0 flex-1 items-center">' +
          ATTACHMENT_ICON +
          '<div class="ml-4 flex min-w-0 flex-1 gap-2">' +
            '<span class="truncate font-medium text-gray-900 dark:text-white">' + escapeHtml(att.name || '') + '</span>' +
            '<span class="shrink-0 text-gray-400 dark:text-gray-500">' + escapeHtml(att.size || '') + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="ml-4 shrink-0 flex items-center">' +
          '<button type="button" command="show-modal" commandfor="gp-review-dialog"' +
            ' class="gp-review-trigger inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-600/10 dark:bg-blue-600/10 dark:text-blue-400 dark:hover:bg-blue-600/20 cursor-pointer"' +
            ' data-attach-idx="' + idx + '">Review</button>' +
          '<div id="gp-attach-' + idx + '-status" class="hidden">' +
            CHECKBOX_STATUS_HTML +
          '</div>' +
        '</div>' +
      '</li>'
    );
  }

  function buildGetPaidAttachments(attachments) {
    var list = (attachments && attachments.length) ? attachments : SAMPLE_ATTACHMENTS;
    var items = '';
    list.forEach(function (att, idx) { items += buildAttachmentItem(att, idx); });
    return '<ul role="list" class="divide-y divide-gray-100 rounded-md border border-gray-200 dark:divide-white/5 dark:border-white/10">' + items + '</ul>';
  }

  function openGetPaidPanel(entry) {
    _activeGetPaidEntry = entry;
    var amountEl = document.getElementById('gp-amount');
    var currencyEl = document.getElementById('gp-currency');
    var dateEl = document.getElementById('gp-date');
    var customerEl = document.getElementById('gp-customer');
    var invoiceEl = document.getElementById('gp-invoice');
    var attachEl = document.getElementById('gp-attachments');
    var activityEl = document.getElementById('gp-activity-content');

    if (amountEl) amountEl.textContent = formatCurrency(entry.amount, entry.currency);
    if (currencyEl) currencyEl.textContent = entry.currency;
    if (dateEl) dateEl.textContent = formatDate(entry.dateInitiated);
    if (customerEl) customerEl.textContent = entry.vendorEntry;
    if (invoiceEl) invoiceEl.textContent = '#' + entry.invoice;

    if (attachEl) attachEl.innerHTML = buildGetPaidAttachments(entry.details.attachments);
    if (activityEl) activityEl.innerHTML = buildGetPaidActivityLog(entry);
    var activityToggle = document.getElementById('gp-activity-toggle');
    if (activityEl) activityEl.classList.add('hidden');
    if (activityToggle) {
      var activityIcon = activityToggle.querySelector('[data-collapse-icon]');
      if (activityIcon) activityIcon.classList.remove('rotate-180');
    }

    // Reset signature state
    var sigTrigger = document.getElementById('gp-signature-trigger');
    var sigBadge = document.getElementById('gp-signed-badge');
    if (sigTrigger) sigTrigger.classList.remove('hidden');
    if (sigBadge) sigBadge.classList.add('hidden');

    if (!_suppressUrlUpdate) {
      history.pushState(
        { view: 'get-paid', invoice: entry.invoice },
        '',
        location.pathname + '?view=get-paid&id=' + encodeURIComponent(entry.invoice)
      );
    }

    var panel = document.getElementById('get-paid-panel');
    var tableSection = document.getElementById('table-section');
    if (panel) panel.classList.remove('hidden');
    if (tableSection) tableSection.classList.add('hidden');
    window.scrollTo(0, 0);

    initPaymentMethodDetails(entry);
    updateGetPaidStepStates();
  }

  function pmcSetText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value || '';
  }

  function updatePaymentMethodDetails(value, entry) {
    var wrapper = document.getElementById('gp-payment-method-details');
    var cardPanel = document.getElementById('gp-pmc-payers-card');
    var bankPanel = document.getElementById('gp-pmc-bank-account');
    var checkPanel = document.getElementById('gp-pmc-paper-check');

    if (cardPanel) cardPanel.classList.add('hidden');
    if (bankPanel) bankPanel.classList.add('hidden');
    if (checkPanel) checkPanel.classList.add('hidden');

    if (value === 'payers-card') {
      var payerCard = entry.details.paymentInfo && entry.details.paymentInfo.payerCard;
      if (payerCard) {
        pmcSetText('gp-pmc-card-name', payerCard.cardholderName);
        pmcSetText('gp-pmc-card-address', payerCard.cardholderAddress);
      }
      if (cardPanel) cardPanel.classList.remove('hidden');
    } else if (value === 'bank-account') {
      if (bankPanel) bankPanel.classList.remove('hidden');
      initBankAccountSelector();
    } else if (value === 'paper-check') {
      if (checkPanel) checkPanel.classList.remove('hidden');
      initCheckAddressSelector();
    }

    if (wrapper) wrapper.classList.remove('hidden');
  }

  function updateBankDetails(bankId) {
    var details = document.getElementById('gp-pmc-bank-details');
    if (!details) return;

    var accounts = _myBusiness && _myBusiness.bankAccounts;
    if (!accounts) return;

    var account = null;
    for (var i = 0; i < accounts.length; i++) {
      if (accounts[i].id === bankId) { account = accounts[i]; break; }
    }
    if (!account) return;

    pmcSetText('gp-pmc-bank-name-val', account.name);
    pmcSetText('gp-pmc-bank-acct', account.maskedAccount);
    pmcSetText('gp-pmc-bank-routing', account.maskedRouting);
    pmcSetText('gp-pmc-bank-address', account.address);

    // Reset reveal button to hidden state
    var btn = document.getElementById('gp-pmc-reveal-btn');
    var acctCopyBtn = document.getElementById('gp-pmc-bank-acct-copy-btn');
    var routingCopyBtn = document.getElementById('gp-pmc-bank-routing-copy-btn');
    if (btn) {
      btn.setAttribute('data-revealed', 'false');
      var revealIcon = btn.querySelector('[data-icon="reveal"]');
      var hideIcon = btn.querySelector('[data-icon="hide"]');
      var revealText = document.getElementById('gp-pmc-reveal-text');
      if (revealIcon) revealIcon.classList.remove('hidden');
      if (hideIcon) hideIcon.classList.add('hidden');
      if (revealText) revealText.textContent = 'Reveal Details';
    }
    if (acctCopyBtn) {
      acctCopyBtn.setAttribute('data-copy-enabled', 'false');
      acctCopyBtn.classList.add('pointer-events-none');
      acctCopyBtn.classList.remove('cursor-pointer', 'transition-colors', 'hover:bg-gray-200', 'dark:hover:bg-white/20');
      var acctIcon = acctCopyBtn.querySelector('[data-copy-icon="true"]');
      if (acctIcon) acctIcon.classList.add('hidden');
    }
    if (routingCopyBtn) {
      routingCopyBtn.setAttribute('data-copy-enabled', 'false');
      routingCopyBtn.classList.add('pointer-events-none');
      routingCopyBtn.classList.remove('cursor-pointer', 'transition-colors', 'hover:bg-gray-200', 'dark:hover:bg-white/20');
      var routingIcon = routingCopyBtn.querySelector('[data-copy-icon="true"]');
      if (routingIcon) routingIcon.classList.add('hidden');
    }

    details.classList.remove('hidden');
    initRevealToggle(account);
    updateGetPaidStepStates();
  }

  function initRevealToggle(account) {
    var btn = document.getElementById('gp-pmc-reveal-btn');
    if (!btn) return;
    var acctCopyBtn = document.getElementById('gp-pmc-bank-acct-copy-btn');
    var routingCopyBtn = document.getElementById('gp-pmc-bank-routing-copy-btn');
    function setCopyBtnVisible(copyBtn, visible) {
      if (!copyBtn) return;
      copyBtn.setAttribute('data-copy-enabled', visible ? 'true' : 'false');
      var icon = copyBtn.querySelector('[data-copy-icon="true"]');
      if (visible) {
        copyBtn.classList.remove('pointer-events-none');
        copyBtn.classList.add('cursor-pointer', 'transition-colors', 'hover:bg-gray-200', 'dark:hover:bg-white/20');
        if (icon) icon.classList.remove('hidden');
      } else {
        copyBtn.classList.add('pointer-events-none');
        copyBtn.classList.remove('cursor-pointer', 'transition-colors', 'hover:bg-gray-200', 'dark:hover:bg-white/20');
        if (icon) icon.classList.add('hidden');
      }
    }

    if (acctCopyBtn) {
      acctCopyBtn.onclick = function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (acctCopyBtn.getAttribute('data-copy-enabled') !== 'true') return;
        var target = document.getElementById('gp-pmc-bank-acct');
        var text = target ? String(target.textContent || '').trim() : '';
        if (!text || /[•]/.test(text)) return;
        if (window.copyTextWithFeedback) {
          window.copyTextWithFeedback(text, acctCopyBtn);
        }
      };
    }

    if (routingCopyBtn) {
      routingCopyBtn.onclick = function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (routingCopyBtn.getAttribute('data-copy-enabled') !== 'true') return;
        var target = document.getElementById('gp-pmc-bank-routing');
        var text = target ? String(target.textContent || '').trim() : '';
        if (!text || /[•]/.test(text)) return;
        if (window.copyTextWithFeedback) {
          window.copyTextWithFeedback(text, routingCopyBtn);
        }
      };
    }

    btn.onclick = function () {
      var revealed = btn.getAttribute('data-revealed') === 'true';
      revealed = !revealed;
      btn.setAttribute('data-revealed', String(revealed));

      var revealIcon = btn.querySelector('[data-icon="reveal"]');
      var hideIcon = btn.querySelector('[data-icon="hide"]');
      var revealText = document.getElementById('gp-pmc-reveal-text');

      if (revealed) {
        pmcSetText('gp-pmc-bank-acct', account.accountNumber);
        pmcSetText('gp-pmc-bank-routing', account.routingNumber);
        if (revealIcon) revealIcon.classList.add('hidden');
        if (hideIcon) hideIcon.classList.remove('hidden');
        if (revealText) revealText.textContent = 'Hide Details';
        setCopyBtnVisible(acctCopyBtn, true);
        setCopyBtnVisible(routingCopyBtn, true);
      } else {
        pmcSetText('gp-pmc-bank-acct', account.maskedAccount);
        pmcSetText('gp-pmc-bank-routing', account.maskedRouting);
        if (revealIcon) revealIcon.classList.remove('hidden');
        if (hideIcon) hideIcon.classList.add('hidden');
        if (revealText) revealText.textContent = 'Reveal Details';
        setCopyBtnVisible(acctCopyBtn, false);
        setCopyBtnVisible(routingCopyBtn, false);
      }
    };
  }

  function buildCheckAddressOptionHtml(address) {
    return (
      '<el-option value="' + escapeHtml(address.id) + '" class="group/option relative block cursor-default select-none border-b border-gray-200 py-3 pr-4 pl-3 text-gray-900 aria-selected:bg-gray-100 focus:bg-gray-100 focus:outline-hidden dark:border-white/10 dark:text-white dark:aria-selected:bg-white/10 dark:focus:bg-white/10">' +
        '<div class="flex items-center gap-3">' +
          '<div class="shrink-0 text-gray-500 in-[el-selectedcontent]:text-gray-600 dark:text-gray-400 dark:in-[el-selectedcontent]:text-gray-400">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">' +
              '<path d="M16.25 2C16.6642 2 17 2.33579 17 2.75C17 3.16421 16.6642 3.5 16.25 3.5H16V16.5H16.25C16.6642 16.5 17 16.8358 17 17.25C17 17.6642 16.6642 18 16.25 18H12.75C12.3358 18 12 17.6642 12 17.25V14.75C12 14.3358 11.6642 14 11.25 14H8.75C8.33579 14 8 14.3358 8 14.75V17.25C8 17.6642 7.66421 18 7.25 18H3.75C3.33579 18 3 17.6642 3 17.25C3 16.8358 3.33579 16.5 3.75 16.5H4V3.5H3.75C3.33579 3.5 3 3.16421 3 2.75C3 2.33579 3.33579 2 3.75 2H16.25ZM7.5 9C7.22386 9 7 9.22386 7 9.5V10.5C7 10.7761 7.22386 11 7.5 11H8.5C8.77614 11 9 10.7761 9 10.5V9.5C9 9.22386 8.77614 9 8.5 9H7.5ZM11.5 9C11.2239 9 11 9.22386 11 9.5V10.5C11 10.7761 11.2239 11 11.5 11H12.5C12.7761 11 13 10.7761 13 10.5V9.5C13 9.22386 12.7761 9 12.5 9H11.5ZM7.5 5C7.22386 5 7 5.22386 7 5.5V6.5C7 6.77614 7.22386 7 7.5 7H8.5C8.77614 7 9 6.77614 9 6.5V5.5C9 5.22386 8.77614 5 8.5 5H7.5ZM11.5 5C11.2239 5 11 5.22386 11 5.5V6.5C11 6.77614 11.2239 7 11.5 7H12.5C12.7761 7 13 6.77614 13 6.5V5.5C13 5.22386 12.7761 5 12.5 5H11.5Z" fill="#6B7280" />' +
            '</svg>' +
          '</div>' +
          '<div class="in-[el-selectedcontent]:hidden">' +
            '<span class="block truncate font-medium group-aria-selected/option:font-semibold">' + escapeHtml(address.displayName) + '</span>' +
            '<span class="block text-sm text-gray-500 dark:text-gray-400">' + escapeHtml(address.summary || address.cityState || '') + '</span>' +
          '</div>' +
          '<span class="hidden in-[el-selectedcontent]:block truncate font-medium">' + escapeHtml(address.displayName) + '</span>' +
        '</div>' +
        '<span class="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-600 group-not-aria-selected/option:hidden in-[el-selectedcontent]:hidden">' +
          '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5">' +
            '<path d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" fill-rule="evenodd" />' +
          '</svg>' +
        '</span>' +
      '</el-option>'
    );
  }

  function getBankAccountDisplayName(account) {
    if (!account || typeof account !== 'object') return 'Bank Account';
    var displayName = typeof account.displayName === 'string' ? account.displayName.trim() : '';
    if (displayName) return displayName;
    var bankName = typeof account.bankName === 'string' ? account.bankName.trim() : '';
    if (bankName) return bankName + ' Account';
    return 'Bank Account';
  }

  function getBankAccountLast4(account) {
    if (!account || typeof account !== 'object') return '';
    if (typeof account.last4 === 'string' && account.last4.trim()) {
      return account.last4.trim().slice(-4);
    }
    var accountNumber = typeof account.accountNumber === 'string' ? account.accountNumber : '';
    var accountDigits = accountNumber.replace(/\D/g, '');
    if (accountDigits.length >= 4) return accountDigits.slice(-4);
    var masked = typeof account.maskedAccount === 'string' ? account.maskedAccount : '';
    var maskedDigits = masked.replace(/\D/g, '');
    if (maskedDigits.length >= 4) return maskedDigits.slice(-4);
    return '';
  }

  function buildBankAccountOptionHtml(account) {
    var label = getBankAccountDisplayName(account);
    var last4 = getBankAccountLast4(account);
    var summary = last4 ? ('••••' + last4) : label;
    return (
      '<el-option value="' + escapeHtml(account.id) + '" class="group/option relative block cursor-default select-none border-b border-gray-200 py-3 pr-4 pl-3 text-gray-900 aria-selected:bg-gray-100 focus:bg-gray-100 focus:outline-hidden dark:border-white/10 dark:text-white dark:aria-selected:bg-white/10 dark:focus:bg-white/10">' +
        '<div class="flex items-center gap-3">' +
          '<div class="shrink-0 text-gray-500 in-[el-selectedcontent]:text-gray-600 dark:text-gray-400 dark:in-[el-selectedcontent]:text-gray-400">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 18 18" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M8.7075 1.86718C8.8929 1.77767 9.10901 1.77767 9.29441 1.86718L15.8194 5.01718C16.1552 5.17925 16.2959 5.58279 16.1339 5.9185C15.9827 6.23168 15.6213 6.37521 15.301 6.26151V14.85H15.526C15.8988 14.85 16.201 15.1523 16.201 15.525C16.201 15.8978 15.8988 16.2 15.526 16.2H2.47594C2.10314 16.2 1.80094 15.8978 1.80094 15.525C1.80094 15.1523 2.10314 14.85 2.47594 14.85H2.70094V6.26151C2.38057 6.37521 2.01925 6.23168 1.86806 5.9185C1.70599 5.58279 1.84676 5.17925 2.18248 5.01718L8.7075 1.86718ZM9.90081 5.40005C9.90081 5.89711 9.49786 6.30005 9.0008 6.30005C8.50375 6.30005 8.1008 5.89711 8.1008 5.40005C8.1008 4.90299 8.50375 4.50005 9.0008 4.50005C9.49786 4.50005 9.90081 4.90299 9.90081 5.40005ZM6.7508 8.77505C6.7508 8.40226 6.44859 8.10005 6.07579 8.10005C5.703 8.10005 5.40079 8.40226 5.40079 8.77505V13.725C5.40079 14.0978 5.703 14.4 6.07579 14.4C6.44859 14.4 6.7508 14.0978 6.7508 13.725V8.77505ZM9.6758 8.77505C9.6758 8.40226 9.3736 8.10005 9.0008 8.10005C8.62801 8.10005 8.3258 8.40226 8.3258 8.77505V13.725C8.3258 14.0978 8.62801 14.4 9.0008 14.4C9.3736 14.4 9.6758 14.0978 9.6758 13.725V8.77505ZM12.6008 8.77505C12.6008 8.40226 12.2986 8.10005 11.9258 8.10005C11.553 8.10005 11.2508 8.40226 11.2508 8.77505V13.725C11.2508 14.0978 11.553 14.4 11.9258 14.4C12.2986 14.4 12.6008 14.0978 12.6008 13.725V8.77505Z" fill="#6B7280"/></svg>' +
          '</div>' +
          '<div class="in-[el-selectedcontent]:hidden">' +
            '<span class="block truncate font-medium group-aria-selected/option:font-semibold">' + escapeHtml(label) + '</span>' +
            '<span class="block text-sm text-gray-500 dark:text-gray-400">' + escapeHtml(summary) + '</span>' +
          '</div>' +
          '<span class="hidden in-[el-selectedcontent]:block truncate font-medium">' + escapeHtml(label + (last4 ? (' ••••' + last4) : '')) + '</span>' +
        '</div>' +
        '<span class="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-600 group-not-aria-selected/option:hidden in-[el-selectedcontent]:hidden">' +
          '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5">' +
            '<path d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" fill-rule="evenodd" />' +
          '</svg>' +
        '</span>' +
      '</el-option>'
    );
  }

  function renderBankAccountOptions(accounts) {
    var sel = document.getElementById('gp-bank-account-select');
    if (!sel) return;
    var optionsEl = sel.querySelector('el-options');
    if (!optionsEl) return;
    var addButton = optionsEl.querySelector('[data-gp-add-bank-account]');
    var addFooter = addButton ? addButton.parentElement : null;

    optionsEl.querySelectorAll('el-option').forEach(function (opt) {
      opt.remove();
    });

    (accounts || []).forEach(function (account) {
      if (!account || !account.id) return;
      if (addFooter) {
        addFooter.insertAdjacentHTML('beforebegin', buildBankAccountOptionHtml(account));
      } else {
        optionsEl.insertAdjacentHTML('beforeend', buildBankAccountOptionHtml(account));
      }
    });

    var bankOptions = optionsEl.querySelectorAll('el-option');
    if (bankOptions.length) {
      bankOptions[bankOptions.length - 1].classList.remove('border-b', 'border-gray-200', 'dark:border-white/10');
    }
  }

  function renderCheckAddressOptions(addresses) {
    var sel = document.getElementById('gp-check-address-select');
    if (!sel) return;
    var optionsEl = sel.querySelector('el-options');
    if (!optionsEl) return;
    var addButton = optionsEl.querySelector('[data-gp-add-check-address]');
    var addFooter = addButton ? addButton.parentElement : null;

    optionsEl.querySelectorAll('el-option').forEach(function (opt) {
      opt.remove();
    });

    (addresses || []).forEach(function (address) {
      if (addFooter) {
        addFooter.insertAdjacentHTML('beforebegin', buildCheckAddressOptionHtml(address));
      } else {
        optionsEl.insertAdjacentHTML('beforeend', buildCheckAddressOptionHtml(address));
      }
    });

    var checkOptions = optionsEl.querySelectorAll('el-option');
    if (checkOptions.length) {
      checkOptions[checkOptions.length - 1].classList.remove('border-b', 'border-gray-200', 'dark:border-white/10');
    }
  }

  function updateCheckDetails(addressId) {
    var details = document.getElementById('gp-pmc-check-details');
    if (!details) return;

    var addresses = _myBusiness && _myBusiness.checkAddresses;
    if (!addresses) return;

    var addr = null;
    for (var i = 0; i < addresses.length; i++) {
      if (addresses[i].id === addressId) { addr = addresses[i]; break; }
    }
    if (!addr) return;

    pmcSetText('gp-pmc-check-name', addr.name);
    pmcSetText('gp-pmc-check-address', addr.address);

    details.classList.remove('hidden');
    updateGetPaidStepStates();
  }

  function initCheckAddressSelector() {
    if (_checkSelectObserver) {
      _checkSelectObserver.disconnect();
      _checkSelectObserver = null;
    }

    var details = document.getElementById('gp-pmc-check-details');
    if (details) details.classList.add('hidden');

    renderCheckAddressOptions(_myBusiness && _myBusiness.checkAddresses);

    var sel = document.getElementById('gp-check-address-select');
    if (!sel) return;

    // Reset to placeholder
    sel.querySelectorAll('el-option').forEach(function (opt) {
      opt.removeAttribute('aria-selected');
    });
    var selContent = sel.querySelector('el-selectedcontent');
    if (selContent) {
      selContent.innerHTML = '<span class="truncate text-gray-400 dark:text-gray-500">Select mailing address</span>';
    }

    var observer = new MutationObserver(function () {
      var selected = sel.querySelector('el-option[aria-selected="true"]');
      if (selected) updateCheckDetails(selected.getAttribute('value'));
      updateGetPaidStepStates();
    });
    sel.querySelectorAll('el-option').forEach(function (opt) {
      observer.observe(opt, { attributes: true, attributeFilter: ['aria-selected'] });
    });
    _checkSelectObserver = observer;
    updateGetPaidStepStates();
  }

  function initBankAccountSelector() {
    if (_bankSelectObserver) {
      _bankSelectObserver.disconnect();
      _bankSelectObserver = null;
    }

    var details = document.getElementById('gp-pmc-bank-details');
    if (details) details.classList.add('hidden');

    renderBankAccountOptions(_myBusiness && _myBusiness.bankAccounts);

    var sel = document.getElementById('gp-bank-account-select');
    if (!sel) return;

    // Reset to placeholder
    sel.querySelectorAll('el-option').forEach(function (opt) {
      opt.removeAttribute('aria-selected');
    });
    var selContent = sel.querySelector('el-selectedcontent');
    if (selContent) {
      selContent.innerHTML = '<span class="truncate text-gray-400 dark:text-gray-500">Select bank account</span>';
    }

    var observer = new MutationObserver(function () {
      var selected = sel.querySelector('el-option[aria-selected="true"]');
      if (selected) updateBankDetails(selected.getAttribute('value'));
      updateGetPaidStepStates();
    });
    sel.querySelectorAll('el-option').forEach(function (opt) {
      observer.observe(opt, { attributes: true, attributeFilter: ['aria-selected'] });
    });
    _bankSelectObserver = observer;
    updateGetPaidStepStates();
  }

  function initEditBankModal() {
    var btn = document.getElementById('gp-edit-bank-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var sel = document.getElementById('gp-bank-account-select');
      var selectedOpt = sel && sel.querySelector('el-option[aria-selected="true"]');
      var bankId = selectedOpt && selectedOpt.getAttribute('value');
      var accounts = _myBusiness && _myBusiness.bankAccounts;
      var account = null;
      if (accounts && bankId) {
        for (var i = 0; i < accounts.length; i++) {
          if (accounts[i].id === bankId) { account = accounts[i]; break; }
        }
      }
      if (!account) return;

      var setVal = function (id, val) {
        var el = document.getElementById(id);
        if (el) el.value = val || '';
      };
      setVal('gp-edit-bank-name', account.name);
      setVal('gp-edit-bank-routing', account.routingNumber);
      setVal('gp-edit-bank-account', account.accountNumber);
      setVal('gp-edit-bank-confirm', account.accountNumber);
      setVal('gp-edit-bank-nickname', account.displayName);

      var dialog = document.getElementById('gp-edit-bank-dialog');
      if (dialog && typeof dialog.showModal === 'function') dialog.showModal();
    });
  }

  function initEditCheckModal() {
    var btn = document.getElementById('gp-edit-check-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var sel = document.getElementById('gp-check-address-select');
      var selectedOpt = sel && sel.querySelector('el-option[aria-selected="true"]');
      var addrId = selectedOpt && selectedOpt.getAttribute('value');
      var addresses = _myBusiness && _myBusiness.checkAddresses;
      var addr = null;
      if (addresses && addrId) {
        for (var i = 0; i < addresses.length; i++) {
          if (addresses[i].id === addrId) { addr = addresses[i]; break; }
        }
      }
      if (!addr) return;

      // Parse multi-line address string
      var lines = (addr.address || '').split('\n');
      var line1 = lines[0] || '';
      var line2 = lines.length > 3 ? lines[1] : '';
      var cityStateLine = lines.length > 3 ? lines[2] : (lines[1] || '');
      var cityStateMatch = cityStateLine.match(/^(.+),\s*([A-Z]{2})\s+(\S+)$/);
      var city = cityStateMatch ? cityStateMatch[1] : cityStateLine;
      var state = cityStateMatch ? cityStateMatch[2] : '';
      var zip = cityStateMatch ? cityStateMatch[3] : '';

      var setVal = function (id, val) {
        var el = document.getElementById(id);
        if (el) el.value = val || '';
      };
      setVal('gp-edit-check-nickname', addr.displayName);
      setVal('gp-edit-check-line1', line1);
      setVal('gp-edit-check-line2', line2);
      setVal('gp-edit-check-city', city);
      setVal('gp-edit-check-state', state);
      setVal('gp-edit-check-zip', zip);

      var dialog = document.getElementById('gp-edit-check-dialog');
      if (dialog && typeof dialog.showModal === 'function') dialog.showModal();
    });
  }

  function initPaymentMethodDetails(entry) {
    if (_pmcObserver) {
      _pmcObserver.disconnect();
      _pmcObserver = null;
    }
    if (_bankSelectObserver) {
      _bankSelectObserver.disconnect();
      _bankSelectObserver = null;
    }
    if (_checkSelectObserver) {
      _checkSelectObserver.disconnect();
      _checkSelectObserver = null;
    }

    var wrapper = document.getElementById('gp-payment-method-details');
    if (wrapper) wrapper.classList.add('hidden');

    var sel = document.querySelector('el-select[name="paymentMethod"]');
    if (!sel) return;

    // Reset select to placeholder state
    sel.querySelectorAll('el-option').forEach(function (opt) {
      opt.removeAttribute('aria-selected');
    });
    var selContent = sel.querySelector('el-selectedcontent');
    if (selContent) {
      selContent.innerHTML = '<span class="truncate text-gray-400 dark:text-gray-500">Select payment method</span>';
    }

    // Watch for aria-selected changes on options
    var observer = new MutationObserver(function () {
      var selected = sel.querySelector('el-option[aria-selected="true"]');
      if (selected) updatePaymentMethodDetails(selected.getAttribute('value'), entry);
      updateGetPaidStepStates();
    });
    sel.querySelectorAll('el-option').forEach(function (opt) {
      observer.observe(opt, { attributes: true, attributeFilter: ['aria-selected'] });
    });
    _pmcObserver = observer;
    updateGetPaidStepStates();
  }

  function closeGetPaidPanel() {
    _activeGetPaidEntry = null;
    if (!_suppressUrlUpdate) {
      history.pushState({}, '', location.pathname);
    }
    var panel = document.getElementById('get-paid-panel');
    var tableSection = document.getElementById('table-section');
    if (panel) panel.classList.add('hidden');
    if (tableSection) tableSection.classList.remove('hidden');
  }

  function initGetPaidPanel() {
    // Edit modals
    initEditBankModal();
    initEditCheckModal();

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

    var submitBtn = document.getElementById('gp-submit-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', function () {
        if (submitBtn.disabled || !_activeGetPaidEntry) return;
        var paymentSel = document.querySelector('el-select[name="paymentMethod"]');
        var paymentValue = getSelectedOptionValue(paymentSel);
        var validMethods = ['payers-card', 'bank-account', 'paper-check'];
        if (validMethods.indexOf(paymentValue) === -1) return;

        var methodLabels = { 'payers-card': "Payer's Card", 'bank-account': 'Bank Transfer', 'paper-check': 'Check' };

        var txIdEl = document.getElementById('gp-submit-txid');
        var amountEl = document.getElementById('gp-submit-amount');
        var dateEl = document.getElementById('gp-submit-date');
        var methodEl = document.getElementById('gp-submit-method');
        var cardLast4El = document.getElementById('gp-submit-card-last4');
        var cardSectionEl = document.getElementById('gp-submit-card-section');
        var bankRowEl = document.getElementById('gp-submit-bank-row');
        var bankNameEl = document.getElementById('gp-submit-bank-name');
        var checkRowEl = document.getElementById('gp-submit-check-row');
        var checkAddressEl = document.getElementById('gp-submit-check-address');

        var txId = 'TXN-' + String(_activeGetPaidEntry.invoice || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase() + '-' + Date.now().toString().slice(-6);
        var payerCard = _activeGetPaidEntry.details &&
          _activeGetPaidEntry.details.paymentInfo &&
          _activeGetPaidEntry.details.paymentInfo.payerCard;
        var cardLast4 = _activeGetPaidEntry.paymentMethodEnding || '';
        if (!cardLast4 && payerCard && payerCard.cardNumber) cardLast4 = String(payerCard.cardNumber).slice(-4);

        if (txIdEl) txIdEl.textContent = txId;
        if (amountEl) amountEl.textContent = formatCurrency(_activeGetPaidEntry.amount, _activeGetPaidEntry.currency);
        if (dateEl) dateEl.textContent = formatDate(_activeGetPaidEntry.dateInitiated);
        if (methodEl) methodEl.textContent = methodLabels[paymentValue] || paymentValue;
        if (cardLast4El) cardLast4El.textContent = cardLast4 || '0000';

        // Show card section only for payer's card
        if (cardSectionEl) {
          var showCard = paymentValue === 'payers-card';
          cardSectionEl.classList.toggle('hidden', !showCard);
          cardSectionEl.classList.toggle('inline-flex', showCard);
        }

        // Bank account row
        if (bankRowEl && bankNameEl) {
          if (paymentValue === 'bank-account') {
            var bankSel = document.getElementById('gp-bank-account-select');
            var selectedBank = bankSel && bankSel.querySelector('el-option[aria-selected="true"]');
            var bankId = selectedBank && selectedBank.getAttribute('value');
            var bankAccounts = _myBusiness && _myBusiness.bankAccounts;
            var bankAccount = null;
            if (bankAccounts && bankId) {
              for (var bi = 0; bi < bankAccounts.length; bi++) {
                if (bankAccounts[bi].id === bankId) { bankAccount = bankAccounts[bi]; break; }
              }
            }
            bankNameEl.textContent = bankAccount ? bankAccount.displayName : '';
            bankRowEl.classList.remove('hidden');
            bankRowEl.classList.add('grid');
          } else {
            bankRowEl.classList.add('hidden');
            bankRowEl.classList.remove('grid');
          }
        }

        // Check address row
        if (checkRowEl && checkAddressEl) {
          if (paymentValue === 'paper-check') {
            var checkSel = document.getElementById('gp-check-address-select');
            var selectedCheck = checkSel && checkSel.querySelector('el-option[aria-selected="true"]');
            var checkId = selectedCheck && selectedCheck.getAttribute('value');
            var checkAddresses = _myBusiness && _myBusiness.checkAddresses;
            var checkAddr = null;
            if (checkAddresses && checkId) {
              for (var ci = 0; ci < checkAddresses.length; ci++) {
                if (checkAddresses[ci].id === checkId) { checkAddr = checkAddresses[ci]; break; }
              }
            }
            checkAddressEl.textContent = checkAddr ? checkAddr.displayName : '';
            checkRowEl.classList.remove('hidden');
            checkRowEl.classList.add('grid');
          } else {
            checkRowEl.classList.add('hidden');
            checkRowEl.classList.remove('grid');
          }
        }

        var selectedMethodType = paymentValue === 'payers-card' ? 'card' : 'ach';
        _activeGetPaidEntry.methodType = selectedMethodType;
        _activeGetPaidEntry.paymentMethod = getMethodLabelFromType(selectedMethodType);
        _activeGetPaidEntry.status = 'paid';
        if (selectedMethodType === 'card') {
          var selectedCardLast4 = String(_activeGetPaidEntry.paymentMethodEnding || '').replace(/\D/g, '').slice(-4);
          if (selectedCardLast4) _activeGetPaidEntry.paymentMethodEnding = selectedCardLast4;
        } else {
          var selectedBank = document.getElementById('gp-bank-account-select');
          var selectedBankOption = selectedBank && selectedBank.querySelector('el-option[aria-selected="true"]');
          var selectedBankId = selectedBankOption && selectedBankOption.getAttribute('value');
          var selectedBankAccount = null;
          var allBanks = _myBusiness && _myBusiness.bankAccounts;
          if (allBanks && selectedBankId) {
            for (var sb = 0; sb < allBanks.length; sb++) {
              if (allBanks[sb].id === selectedBankId) { selectedBankAccount = allBanks[sb]; break; }
            }
          }
          var bankLast4 = getDigits(selectedBankAccount && (selectedBankAccount.last4 || selectedBankAccount.accountNumber || selectedBankAccount.maskedAccount || '')).slice(-4);
          if (bankLast4) _activeGetPaidEntry.paymentMethodEnding = bankLast4;
        }

        refreshTableForActiveTab();
        populateGetPaidCardModal(_activeGetPaidEntry);

        var dialog = document.getElementById('gp-submit-success-dialog');
        if (dialog && typeof dialog.showModal === 'function') dialog.showModal();
      });
    }

    // "Get paid" button clicks (delegated — buttons are rendered dynamically)
    document.addEventListener('click', function (e) {
      var viewDetailsLink = e.target.closest('[data-view-details-invoice]');
      if (viewDetailsLink) {
        e.preventDefault();
        var invoiceForDetails = viewDetailsLink.getAttribute('data-view-details-invoice');
        if (invoiceForDetails) setGuideSelectedInvoice(invoiceForDetails);
        var detailsEntry = findEntryByInvoice(invoiceForDetails);
        if (actionGuideState.active) closeActionColumnGuide();
        if (detailsEntry) openCardDetailsModalForEntry(detailsEntry);
        return;
      }

      var markPaidLink = e.target.closest('[data-mark-paid-invoice]');
      if (markPaidLink) {
        e.preventDefault();
        var invoiceToMark = markPaidLink.getAttribute('data-mark-paid-invoice');
        var targetEntry = findEntryByInvoice(invoiceToMark);
        if (targetEntry) {
          targetEntry.status = 'paid';
          refreshTableForActiveTab();
        }
        return;
      }

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

    // Browser back/forward — reopen or close panel based on URL
    window.addEventListener('popstate', function () {
      _suppressUrlUpdate = true;
      var params = new URLSearchParams(location.search);
      if (params.get('view') === 'get-paid') {
        var invoiceId = params.get('id');
        for (var i = 0; i < paginationState.sourceEntries.length; i++) {
          if (paginationState.sourceEntries[i].invoice === invoiceId) {
            openGetPaidPanel(paginationState.sourceEntries[i]);
            break;
          }
        }
      } else {
        closeGetPaidPanel();
      }
      _suppressUrlUpdate = false;
    });
  }

  // ── Review Modal ──

  function initReviewModal() {
    var markReadBtn = document.getElementById('gp-mark-read-btn');
    if (!markReadBtn) return;

    var activeAttachIdx = null;

    document.addEventListener('click', function (e) {
      var trigger = e.target.closest('.gp-review-trigger');
      if (trigger) activeAttachIdx = trigger.getAttribute('data-attach-idx');
    });

    markReadBtn.addEventListener('click', function () {
      if (activeAttachIdx === null) return;
      var btn = document.querySelector('.gp-review-trigger[data-attach-idx="' + activeAttachIdx + '"]');
      var status = document.getElementById('gp-attach-' + activeAttachIdx + '-status');
      if (btn) {
        btn.classList.add('hidden');
        btn.classList.remove('inline-flex');
        btn.style.display = 'none';
      }
      if (status) {
        status.classList.remove('hidden');
        var checkbox = status.querySelector('input[type="checkbox"]');
        if (checkbox) checkbox.checked = true;
      }
      activeAttachIdx = null;
      updateGetPaidStepStates();
    });
  }

  // ── Signature Modal ──

  function initSignatureModal() {
    var canvas = document.getElementById('gp-signature-canvas');
    if (!canvas) return;

    var ctx = canvas.getContext('2d');
    var clearBtn = document.getElementById('gp-clear-signature');
    var signBtn = document.getElementById('gp-sign-btn');
    var tabDraw = document.getElementById('gp-tab-draw');
    var tabType = document.getElementById('gp-tab-type');
    var typeWrap = document.getElementById('gp-type-input-wrap');
    var fullNameInput = document.getElementById('gp-fullName');
    var sigDialog = document.getElementById('gp-signature-dialog');

    var isDrawing = false;
    var hasSignature = false;
    var sigMode = 'draw';

    function getInkColor() {
      return getComputedStyle(canvas).getPropertyValue('--gp-ink-color').trim() || '#111827';
    }

    function setCanvasSize() {
      var ratio = window.devicePixelRatio || 1;
      var bounds = canvas.getBoundingClientRect();
      canvas.width = Math.floor(bounds.width * ratio);
      canvas.height = Math.floor(bounds.height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = getInkColor();
      if (sigMode === 'type' && fullNameInput) drawTypedSig(fullNameInput.value || '');
    }

    function updateSignBtn() {
      if (signBtn) signBtn.disabled = !hasSignature;
    }

    function clearCanvas() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function getPoint(e) {
      var rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function drawTypedSig(text) {
      clearCanvas();
      var safe = (text || '').trim();
      if (!safe) { hasSignature = false; updateSignBtn(); return; }
      ctx.save();
      ctx.fillStyle = getInkColor();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var maxWidth = canvas.getBoundingClientRect().width - 48;
      var fontSize = 72;
      while (fontSize > 24) {
        ctx.font = fontSize + "px 'Meow Script', cursive";
        if (ctx.measureText(safe).width <= maxWidth) break;
        fontSize -= 2;
      }
      ctx.fillText(safe, canvas.getBoundingClientRect().width / 2, canvas.getBoundingClientRect().height / 2);
      ctx.restore();
      hasSignature = true;
      updateSignBtn();
    }

    function setMode(nextMode) {
      sigMode = nextMode;
      if (sigMode === 'draw') {
        if (tabDraw) { tabDraw.className = 'rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-900 dark:bg-white/10 dark:text-white'; tabDraw.setAttribute('aria-current', 'page'); }
        if (tabType) { tabType.className = 'rounded-md px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'; tabType.removeAttribute('aria-current'); }
        if (typeWrap) typeWrap.classList.add('hidden');
        canvas.style.pointerEvents = 'auto';
      } else {
        if (tabType) { tabType.className = 'rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-900 dark:bg-white/10 dark:text-white'; tabType.setAttribute('aria-current', 'page'); }
        if (tabDraw) { tabDraw.className = 'rounded-md px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'; tabDraw.removeAttribute('aria-current'); }
        if (typeWrap) typeWrap.classList.remove('hidden');
        canvas.style.pointerEvents = 'none';
        drawTypedSig(fullNameInput ? fullNameInput.value || '' : '');
      }
    }

    if (tabDraw) tabDraw.addEventListener('click', function () { setMode('draw'); });
    if (tabType) tabType.addEventListener('click', function () { setMode('type'); });

    if (fullNameInput) {
      fullNameInput.addEventListener('input', function (e) {
        if (sigMode !== 'type') return;
        drawTypedSig(e.target.value);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        clearCanvas();
        hasSignature = false;
        updateSignBtn();
        if (sigMode === 'type' && fullNameInput) fullNameInput.value = '';
      });
    }

    canvas.addEventListener('pointerdown', function (e) {
      if (sigMode !== 'draw') return;
      e.preventDefault(); isDrawing = true;
      ctx.strokeStyle = getInkColor();
      var p = getPoint(e); ctx.beginPath(); ctx.moveTo(p.x, p.y);
    });
    canvas.addEventListener('pointermove', function (e) {
      if (sigMode !== 'draw' || !isDrawing) return;
      e.preventDefault();
      var p = getPoint(e); ctx.lineTo(p.x, p.y); ctx.stroke();
      if (!hasSignature) { hasSignature = true; updateSignBtn(); }
    });
    canvas.addEventListener('pointerup', function () { if (sigMode === 'draw') { isDrawing = false; ctx.closePath(); } });
    canvas.addEventListener('pointerleave', function () { if (sigMode === 'draw') { isDrawing = false; ctx.closePath(); } });
    canvas.addEventListener('pointercancel', function () { if (sigMode === 'draw') { isDrawing = false; ctx.closePath(); } });

    // Reset + resize canvas on open; reset only on close
    function resetSigState() {
      clearCanvas();
      hasSignature = false;
      if (fullNameInput) fullNameInput.value = '';
      updateSignBtn();
      setMode('draw');
    }

    if (sigDialog) {
      new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          if (m.attributeName !== 'open') return;
          if (sigDialog.hasAttribute('open')) {
            resetSigState();
            setTimeout(setCanvasSize, 30);
          } else {
            resetSigState();
          }
        });
      }).observe(sigDialog, { attributes: true });
    }

    if (signBtn) {
      signBtn.addEventListener('click', function () {
        if (signBtn.disabled) return;
        if (sigDialog) sigDialog.close();
        var trigger = document.getElementById('gp-signature-trigger');
        var badge = document.getElementById('gp-signed-badge');
        if (trigger) trigger.classList.add('hidden');
        if (badge) badge.classList.remove('hidden');
        clearCanvas(); hasSignature = false;
        updateGetPaidStepStates();
      });
    }

    setCanvasSize();
    updateSignBtn();
    setMode('draw');
  }

  function copyTextFallback(text, triggerEl) {
    if (!text) return;
    if (window.copyTextWithFeedback) {
      window.copyTextWithFeedback(text, triggerEl);
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        if (window.showCopiedTooltip) window.showCopiedTooltip(triggerEl);
      }).catch(function () {});
      return;
    }
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'readonly');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    var copied = false;
    try { copied = document.execCommand('copy'); } catch (err) {}
    document.body.removeChild(textarea);
    if (copied && window.showCopiedTooltip) window.showCopiedTooltip(triggerEl);
  }

  function initSubmitSuccessModalCopy() {
    var cardDialog = document.getElementById('gp-card-details-dialog');
    if (!cardDialog) return;
    var pairs = [
      { valueId: 'gp-vc-full-number', selector: '[data-copy-id="gp-vc-full-number"]' },
      { valueId: 'gp-vc-full-expiry', selector: '[data-copy-id="gp-vc-full-expiry"]' },
      { valueId: 'gp-vc-cvc2', selector: '[data-copy-id="gp-vc-cvc2"]' },
    ];
    pairs.forEach(function (item) {
      var valueEl = document.getElementById(item.valueId);
      var btn = cardDialog.querySelector(item.selector);
      if (!valueEl || !btn) return;
      btn.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        var text = String(valueEl.textContent || '').trim();
        if (!text) return;
        copyTextFallback(text, btn);
      });
    });
  }

  // ── Init ──

  function init() {
    var table = document.getElementById(TABLE_ID);
    if (!table) return;
    initTabBadges();
    initTableFilterDropdown();
    initGetPaidPanel();
    initGetPaidCardDetailsTrigger();
    initReviewModal();
    initSignatureModal();
    initSubmitSuccessModalCopy();
    var shouldOpenActionGuide = shouldShowActionColumnGuide();
    if (shouldOpenActionGuide) removeGuideUrlParam();

    if (window.STPState && typeof window.STPState.subscribe === 'function') {
      window.STPState.subscribe(function () {
        if (!paginationState.sourceEntries || !paginationState.sourceEntries.length) return;
        refreshTableForActiveTab();
      });
    }

    Promise.all([
      fetchExchangesData(),
      fetchPaymentPreferencesData().catch(function () { return { bankAccounts: [] }; }),
      fetchCheckAddressesData().catch(function () { return []; }),
      fetchBankAccountsData().catch(function () { return []; }),
      fetchCustomersData().catch(function () { return []; }),
    ])
      .then(function (results) {
        var result = results[0];
        var paymentPreferencesData = results[1];
        var sharedCheckAddresses = results[2];
        var sharedBankAccounts = results[3];
        var customers = results[4];
        var columns = result.columns;
        var entries = result.entries;
        _myBusiness = result.myBusiness || {};
        if (sharedCheckAddresses && sharedCheckAddresses.length) {
          _myBusiness.checkAddresses = sharedCheckAddresses;
        }
        var preferredBankAccounts = paymentPreferencesData && paymentPreferencesData.bankAccounts
          ? paymentPreferencesData.bankAccounts
          : [];
        if (sharedBankAccounts && sharedBankAccounts.length) {
          _myBusiness.bankAccounts = mergeBankAccounts(_myBusiness.bankAccounts, sharedBankAccounts);
        } else if (preferredBankAccounts.length) {
          _myBusiness.bankAccounts = mergeBankAccounts(_myBusiness.bankAccounts, preferredBankAccounts);
        } else {
          _myBusiness.bankAccounts = mergeBankAccounts(_myBusiness.bankAccounts, []);
        }
        if (!_myBusiness.id) _myBusiness.id = 'my-business';
        _customers = Array.isArray(customers) ? customers : [];
        paginationState.sourceEntries = entries;
        updateTabBadges(entries);
        var initialFilteredEntries = getVisibleEntriesForActiveTab();

        if (columns) {
          renderTable(table, columns, initialFilteredEntries);
        } else {
          attachToggleListeners(table);
        }
        syncTableFilterUi();

        refreshStickyAction = initStickyAction(table);
        refreshStickyAction();

        // Auto-open Get Paid panel if URL contains ?view=get-paid&id=...
        var params = new URLSearchParams(location.search);
        if (shouldOpenActionGuide) {
          startActionColumnGuide();
        }
        if (params.get('view') === 'get-paid') {
          var invoiceId = params.get('id');
          for (var j = 0; j < paginationState.sourceEntries.length; j++) {
            if (paginationState.sourceEntries[j].invoice === invoiceId) {
              _suppressUrlUpdate = true;
              openGetPaidPanel(paginationState.sourceEntries[j]);
              _suppressUrlUpdate = false;
              break;
            }
          }
        }
      })
      .catch(function (error) {
        console.error('Failed to load exchanges data:', error);
        updateTabBadges([]);
      });
  }

  init();
})();

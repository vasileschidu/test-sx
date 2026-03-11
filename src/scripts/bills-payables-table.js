/**
 * bills-payables-table.js
 * Data-driven table renderer for Bills and Payables page.
 */

(function () {
  'use strict';

  var JSON_PATH_FALLBACKS = [
    '../../../src/data/bills-payables.json',
    '/src/data/bills-payables.json',
    './src/data/bills-payables.json',
  ];
  var PAYEES_PATH_FALLBACKS = [
    '../../../src/data/payees.json',
    '/src/data/payees.json',
    './src/data/payees.json',
  ];

  var DEFAULT_PAGE_SIZE = 16;
  var PAGE_SIZE_OPTIONS = [10, 16, 25, 50];
  var TAB_SWITCH_SKELETON_MS = 500;
  var INITIAL_TABLE_SKELETON_MS = 500;
  var MANUAL_REFRESH_SKELETON_MS = 1000;

  var TAB_LABELS = {
    ready_to_pay: 'Ready to Pay',
    in_progress: 'In Progress',
    paid: 'Paid',
    exception: 'Exceptions',
  };

  var STATUS_LABELS = {
    ready_to_pay: 'Unprocessed',
    in_progress: 'In Progress',
    paid: 'Paid',
    exception: 'Exception',
  };

  var STATUS_STYLES = {
    ready_to_pay:
      'bg-gray-50 text-gray-600 inset-ring-gray-500/10',
    in_progress:
      'bg-blue-50 text-blue-700 inset-ring-blue-700/10 dark:bg-blue-400/10 dark:text-blue-400 dark:inset-ring-blue-400/30',
    paid:
      'bg-green-50 text-green-700 inset-ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:inset-ring-green-500/20',
    exception:
      'bg-red-50 text-red-700 inset-ring-red-600/10 dark:bg-red-400/10 dark:text-red-400 dark:inset-ring-red-400/20',
  };

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

  var state = {
    allRows: [],
    columns: [],
    activeTab: 'ready_to_pay',
    search: '',
    selectedSources: new Set(),
    selectedStatuses: new Set(),
    selectedMethods: new Set(),
    initiatedDateFrom: '',
    initiatedDateTo: '',
    initiatedDateFromDraft: '',
    initiatedDateToDraft: '',
    initiatedDateActiveField: 'from',
    filterMenuOpen: false,
    activeFilterPanel: 'root',
    selectedRowIds: new Set(),
    expandedRows: new Set(),
    sortKey: '',
    sortDirection: '',
    currentPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    isTabLoading: false,
    isInitialLoading: false,
    payeesById: {},
    payeesByName: {},
  };

  var refs = {};
  var refreshStickyAction = function () {};
  var syncFilterUi = function () {};
  var tabLoadingTimer = null;
  var initialLoadingTimer = null;
  var refreshHalfTurns = 0;
  var ICON_SORT = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4"><path class="opacity-70" fill-rule="evenodd" d="M10.53 3.47a.75.75 0 0 0-1.06 0L6.22 6.72a.75.75 0 1 0 1.06 1.06L10 5.06l2.72 2.72a.75.75 0 1 0 1.06-1.06l-3.25-3.25Z" clip-rule="evenodd" /><path class="opacity-70" fill-rule="evenodd" d="M6.22 13.28a.75.75 0 0 1 1.06 0L10 15.94l2.72-2.66a.75.75 0 1 1 1.06 1.06l-3.25 3.19a.75.75 0 0 1-1.06 0l-3.25-3.19a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>';
  var ICON_SORT_ASC = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4"><path transform="translate(10 5.6) scale(1.2) translate(-10 -5.6)" fill-rule="evenodd" d="M10.53 3.47a.75.75 0 0 0-1.06 0L6.22 6.72a.75.75 0 1 0 1.06 1.06L10 5.06l2.72 2.72a.75.75 0 1 0 1.06-1.06l-3.25-3.25Z" clip-rule="evenodd" /><path class="opacity-40" fill-rule="evenodd" d="M6.22 13.28a.75.75 0 0 1 1.06 0L10 15.94l2.72-2.66a.75.75 0 1 1 1.06 1.06l-3.25 3.19a.75.75 0 0 1-1.06 0l-3.25-3.19a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>';
  var ICON_SORT_DESC = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4"><path class="opacity-40" fill-rule="evenodd" d="M10.53 3.47a.75.75 0 0 0-1.06 0L6.22 6.72a.75.75 0 1 0 1.06 1.06L10 5.06l2.72 2.72a.75.75 0 1 0 1.06-1.06l-3.25-3.25Z" clip-rule="evenodd" /><path transform="translate(10 14.4) scale(1.2) translate(-10 -14.4)" fill-rule="evenodd" d="M6.22 13.28a.75.75 0 0 1 1.06 0L10 15.94l2.72-2.66a.75.75 0 1 1 1.06 1.06l-3.25 3.19a.75.75 0 0 1-1.06 0l-3.25-3.19a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>';
  var ICON_CHEVRON_DOWN = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>';
  var ICON_SCHEDULED = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none" class="shrink-0"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.17505 1.80005C5.54784 1.80005 5.85005 2.10226 5.85005 2.47505V3.60005H12.1501V2.47505C12.1501 2.10226 12.4523 1.80005 12.8251 1.80005C13.1978 1.80005 13.5001 2.10226 13.5001 2.47505V3.60005H13.7251C15.092 3.60005 16.2001 4.70814 16.2001 6.07505V13.725C16.2001 15.092 15.092 16.2 13.7251 16.2H4.27505C2.90815 16.2 1.80005 15.092 1.80005 13.725V6.07505C1.80005 4.70814 2.90814 3.60005 4.27505 3.60005H4.50005V2.47505C4.50005 2.10226 4.80226 1.80005 5.17505 1.80005ZM4.27505 6.75005C3.65373 6.75005 3.15005 7.25373 3.15005 7.87505V13.725C3.15005 14.3464 3.65373 14.85 4.27505 14.85H13.7251C14.3464 14.85 14.8501 14.3464 14.8501 13.725V7.87505C14.8501 7.25373 14.3464 6.75005 13.7251 6.75005H4.27505Z" fill="#9CA3AF"/></svg>';
  var ICON_ACH = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-5 text-gray-500 dark:text-gray-400 shrink-0"><path fill-rule="evenodd" d="M9.674 2.075a.75.75 0 0 1 .652 0l7.25 3.5A.75.75 0 0 1 17 6.957V16.5h.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H3V6.957a.75.75 0 0 1-.576-1.382l7.25-3.5ZM11 6a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM7.5 9.75a.75.75 0 0 0-1.5 0v5.5a.75.75 0 0 0 1.5 0v-5.5Zm3.25 0a.75.75 0 0 0-1.5 0v5.5a.75.75 0 0 0 1.5 0v-5.5Zm3.25 0a.75.75 0 0 0-1.5 0v5.5a.75.75 0 0 0 1.5 0v-5.5Z" clip-rule="evenodd" /></svg>';
  var ICON_SMART_DISBURSE = '<svg width="20" height="20" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg" class="size-5 shrink-0"><path d="M0 15C0 8.42504 0 5.13755 1.81592 2.92485C2.14835 2.51978 2.51978 2.14835 2.92485 1.81592C5.13755 0 8.42504 0 15 0C21.575 0 24.8624 0 27.0751 1.81592C27.4802 2.14835 27.8516 2.51978 28.1841 2.92485C30 5.13755 30 8.42504 30 15C30 21.575 30 24.8624 28.1841 27.0751C27.8516 27.4802 27.4802 27.8516 27.0751 28.1841C24.8624 30 21.575 30 15 30C8.42504 30 5.13755 30 2.92485 28.1841C2.51978 27.8516 2.14835 27.4802 1.81592 27.0751C0 24.8624 0 21.575 0 15Z" fill="#406AFF"/><g clip-path="url(#clip0_1_52615)"><path fill-rule="evenodd" clip-rule="evenodd" d="M17.1957 12.1938C17.3572 11.7655 17.7672 11.4819 18.225 11.4819L25.0389 11.4819L25.0389 14.0119L19.2141 14.0119L15.3171 24.3468L8.87305 24.3468V21.8168L13.5672 21.8168L17.1957 12.1938Z" fill="white"/><path d="M24.7528 10.5068L30.6071 10.5068L27.4891 18.7759H21.6348L24.7528 10.5068Z" fill="#406AFF"/><path d="M11.2713 18.3096L14.9017 18.3096L11.8374 26.4361H8.20703L8.58516 21.7889L10.0421 21.7445L11.2713 18.3096Z" fill="#406AFF"/><path fill-rule="evenodd" clip-rule="evenodd" d="M12.7711 17.8057C12.6096 18.234 12.1996 18.5176 11.7418 18.5176L4.92787 18.5176L4.92787 15.9876L10.7527 15.9876L14.6497 5.65271L21.0938 5.65271L21.0938 8.18271L16.3996 8.18271L12.7711 17.8057Z" fill="white"/><path d="M5.21403 19.4927L-0.640302 19.4927L2.47769 11.2236L8.33203 11.2236L5.21403 19.4927Z" fill="#406AFF"/><path d="M18.7942 10.832L15.0651 11.6899L18.1293 3.5634L21.7598 3.5634L21.4343 8.25497L19.9247 8.25497L18.7942 10.832Z" fill="#406AFF"/></g><defs><clipPath id="clip0_1_52615"><rect width="22" height="22" fill="white" transform="translate(4 4)"/></clipPath></defs></svg>';
  var ICON_SMART_EXCHANGE = '<svg width="20" height="20" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg" class="size-5 shrink-0"><path d="M0 15C0 8.42504 0 5.13755 1.81592 2.92485C2.14835 2.51978 2.51978 2.14835 2.92485 1.81592C5.13755 0 8.42504 0 15 0C21.575 0 24.8624 0 27.0751 1.81592C27.4802 2.14835 27.8516 2.51978 28.1841 2.92485C30 5.13755 30 8.42504 30 15C30 21.575 30 24.8624 28.1841 27.0751C27.8516 27.4802 27.4802 27.8516 27.0751 28.1841C24.8624 30 21.575 30 15 30C8.42504 30 5.13755 30 2.92485 28.1841C2.51978 27.8516 2.14835 27.4802 1.81592 27.0751C0 24.8624 0 21.575 0 15Z" fill="#F5B842"/><g clip-path="url(#clip0_1_52857)"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.9763 14.5594L4.7793 14.5594L4.7793 17.0894L13.839 17.0894C14.2234 17.0894 14.4893 16.705 14.3536 16.3453L9.71431 4.04161L7.34701 4.93424L10.9763 14.5594Z" fill="white"/><rect width="10.7121" height="4.21913" transform="matrix(-1 0 0 1 17.5586 1.46387)" fill="#F5B842"/><path d="M4.67241 12.4575H2.14395L4.8856 19.7285H7.41406L4.67241 12.4575Z" fill="#F5B842"/><path fill-rule="evenodd" clip-rule="evenodd" d="M19.0237 15.4387L25.2207 15.4387L25.2207 12.9087L16.161 12.9087C15.7766 12.9087 15.5107 13.293 15.6464 13.6527L20.2857 25.9564L22.653 25.0638L19.0237 15.4387Z" fill="white"/><rect width="10.7121" height="4.21913" transform="matrix(1 1.74846e-07 1.74846e-07 -1 12.4414 28.5342)" fill="#F5B842"/><path d="M25.3276 17.5405L27.8561 17.5405L25.1144 10.2695L22.5859 10.2695L25.3276 17.5405Z" fill="#F5B842"/></g><defs><clipPath id="clip0_1_52857"><rect width="22" height="22" fill="white" transform="translate(4 3.99902)"/></clipPath></defs></svg>';
  var ICON_VISA = '<svg class="size-5 shrink-0" height="20" width="20" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><path d="M0 0h32v32H0z" fill="#00579f"></path><g fill="#fff" fill-rule="nonzero"><path d="M13.823 19.876H11.8l1.265-7.736h2.023zm7.334-7.546a5.036 5.036 0 0 0-1.814-.33c-1.998 0-3.405 1.053-3.414 2.56-.016 1.11 1.007 1.728 1.773 2.098.783.379 1.05.626 1.05.963-.009.518-.633.757-1.216.757-.808 0-1.24-.123-1.898-.411l-.267-.124-.283 1.737c.475.213 1.349.403 2.257.411 2.123 0 3.505-1.037 3.521-2.641.008-.881-.532-1.556-1.698-2.107-.708-.354-1.141-.593-1.141-.955.008-.33.366-.667 1.165-.667a3.471 3.471 0 0 1 1.507.297l.183.082zm2.69 4.806.807-2.165c-.008.017.167-.452.266-.74l.142.666s.383 1.852.466 2.239h-1.682zm2.497-4.996h-1.565c-.483 0-.85.14-1.058.642l-3.005 7.094h2.123l.425-1.16h2.597c.059.271.242 1.16.242 1.16h1.873zm-16.234 0-1.982 5.275-.216-1.07c-.366-1.234-1.515-2.575-2.797-3.242l1.815 6.765h2.14l3.18-7.728z"></path><path d="M6.289 12.14H3.033L3 12.297c2.54.641 4.221 2.189 4.912 4.049l-.708-3.556c-.116-.494-.474-.633-.915-.65z"></path></g></g></svg>';
  var ICON_MASTERCARD = '<svg class="size-5 shrink-0" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="32" height="32" rx="4" fill="#111827"/><circle cx="14" cy="16" r="7" fill="#EB001B"/><circle cx="18" cy="16" r="7" fill="#F79E1B" fill-opacity="0.95"/></svg>';
  var ICON_COPY = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4 shrink-0 text-gray-400 dark:text-gray-500"><path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z" /><path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z" /></svg>';
  var ICON_EYE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4 text-blue-600"><path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /><path fill-rule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clip-rule="evenodd" /></svg>';
  var ICON_EYE_SLASH = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-4 text-blue-600"><path fill-rule="evenodd" clip-rule="evenodd" d="M3.28033 2.21967C2.98744 1.92678 2.51256 1.92678 2.21967 2.21967C1.92678 2.51256 1.92678 2.98744 2.21967 3.28033L12.7197 13.7803C13.0126 14.0732 13.4874 14.0732 13.7803 13.7803C14.0732 13.4874 14.0732 13.0126 13.7803 12.7197L12.4577 11.397C13.438 10.5863 14.1937 9.51366 14.6176 8.2863C14.681 8.10274 14.6811 7.90313 14.6179 7.71951C13.672 4.97316 11.0653 3 7.99777 3C6.85414 3 5.77457 3.27425 4.82123 3.76057L3.28033 2.21967Z" /><path d="M6.47602 5.41536L7.61147 6.55081C7.73539 6.51767 7.86563 6.5 8 6.5C8.82843 6.5 9.5 7.17157 9.5 8C9.5 8.13437 9.48233 8.26461 9.44919 8.38853L10.5846 9.52398C10.8486 9.07734 11 8.55636 11 8C11 6.34315 9.65685 5 8 5C7.44364 5 6.92266 5.15145 6.47602 5.41536Z" /><path d="M7.81206 10.9942L9.62754 12.8097C9.10513 12.9341 8.56002 13 7.99952 13C4.93197 13 2.32527 11.0268 1.3794 8.28049C1.31616 8.09687 1.31625 7.89727 1.37965 7.71371C1.63675 6.96935 2.01588 6.28191 2.49314 5.67529L5.00579 8.18794C5.09895 9.69509 6.30491 10.901 7.81206 10.9942Z" /></svg>';
  var ICON_EXPAND_RIGHT = '<svg class="size-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>';
  var paymentInfoCopyIdCounter = 0;

  function initRefs() {
    refs.table = document.getElementById('bills-payables-table');
    refs.pagination = document.querySelector('[data-pagination]');
    refs.searchInput = document.getElementById('bp-search-input');
    refs.refreshBtn = document.getElementById('bp-refresh-btn');
    refs.exportBtn = document.getElementById('bp-export-btn');
    refs.tabNav = document.getElementById('bp-tab-nav');
    refs.tabSelect = document.getElementById('bp-tab-select');

    refs.filterDropdown = document.getElementById('bp-table-filter-dropdown');
    refs.filterBtn = document.getElementById('bp-table-filter-btn');
    refs.filterMenu = document.getElementById('bp-table-filter-menu');
    refs.filterTrack = document.getElementById('bp-table-filter-track');
    refs.filterRootPanel = document.getElementById('bp-table-filter-panel-root');
    refs.filterDetailSlot = document.getElementById('bp-table-filter-detail-slot');
    refs.filterSourcePanel = document.getElementById('bp-table-filter-panel-source');
    refs.filterStatusPanel = document.getElementById('bp-table-filter-panel-status');
    refs.filterMethodPanel = document.getElementById('bp-table-filter-panel-method');
    refs.filterInitiatedDatePanel = document.getElementById('bp-table-filter-panel-initiated-date');
    refs.filterSourcesWrap = document.getElementById('bp-table-filter-sources');
    refs.filterStatusesWrap = document.getElementById('bp-table-filter-statuses');
    refs.filterMethodsWrap = document.getElementById('bp-table-filter-methods');
    refs.filterDateFromInput = document.getElementById('bp-table-filter-date-from-input');
    refs.filterDateToInput = document.getElementById('bp-table-filter-date-to-input');
    refs.filterApplySourceBtn = document.getElementById('bp-table-filter-apply-source-btn');
    refs.filterApplyStatusBtn = document.getElementById('bp-table-filter-apply-status-btn');
    refs.filterApplyMethodBtn = document.getElementById('bp-table-filter-apply-method-btn');
    refs.filterApplyDateBtn = document.getElementById('bp-table-filter-apply-date-btn');
    refs.filterBackdrop = document.getElementById('bp-table-filter-backdrop');
    refs.activeFilters = document.getElementById('bp-table-active-filters');
  }

  function formatMoney(amount, currency) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
  }

  function formatDate(value) {
    if (!value) return '--';
    var date = new Date(value + 'T00:00:00');
    if (isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function getDigits(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function formatScheduledDateTime(value) {
    if (!value) return '';
    var parsed = new Date(value);
    if (isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  var DETAIL_LABEL = 'w-[156px] shrink-0 p-4 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400';
  var DETAIL_SEPARATOR = '<div class="border-t border-gray-200 dark:border-white/10"></div>';
  var ATTACHMENT_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-3.5 text-gray-400 dark:text-gray-500 shrink-0"><path fill-rule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm2.25 8.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z" clip-rule="evenodd" /></svg>';

  function getStatusDotClass(type) {
    if (type === 'scheduled' || type === 'processing' || type === 'in_progress') {
      return 'bg-blue-100 ring-1 ring-blue-700/60 dark:bg-blue-400/10 dark:ring-blue-400/20';
    }
    if (type === 'paid' || type === 'complete' || type === 'completed') {
      return 'bg-green-100 ring-1 ring-green-700/60 dark:bg-green-400/10 dark:ring-green-400/20';
    }
    if (type === 'exception' || type === 'failed') {
      return 'bg-red-100 ring-1 ring-red-700/60 dark:bg-red-400/10 dark:ring-red-400/20';
    }
    return 'bg-gray-100 ring-1 ring-gray-300 dark:bg-white/10 dark:ring-white/20';
  }

  function buildNotesSection(row) {
    var notes = row && row.details && row.details.notes;
    if (!notes) return '';
    return (
      '<div class="flex">' +
        '<div class="' + DETAIL_LABEL + '">Notes</div>' +
        '<div class="flex-1 p-4 text-sm font-medium text-gray-900 dark:text-white">' + escapeHtml(notes) + '</div>' +
      '</div>'
    );
  }

  function buildStatusSection(row) {
    var status = row && row.status;
    return (
      '<div class="flex">' +
        '<div class="' + DETAIL_LABEL + '">Status</div>' +
        '<div class="flex-1 flex items-center p-4">' +
          '<span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium inset-ring ' + (STATUS_STYLES[status] || STATUS_STYLES.ready_to_pay) + '">' +
            escapeHtml((row && row.statusLabel) || STATUS_LABELS[status] || status || '') +
          '</span>' +
        '</div>' +
      '</div>'
    );
  }

  function buildAttachmentsSection(row) {
    var attachments = row && row.details && row.details.attachments;
    if (!attachments || !attachments.length) return '';
    var badges = '';
    attachments.forEach(function (att) {
      badges +=
        '<span class="inline-flex items-center gap-1.5 rounded border border-gray-200 bg-gray-100 px-2 py-0.5 text-sm font-medium text-gray-800 dark:border-white/10 dark:bg-white/5 dark:text-gray-200">' +
          ATTACHMENT_ICON +
          escapeHtml((att && att.name) || '') +
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

  function buildPaymentMethodDetailsSection(row) {
    if (!row || (row.status !== 'in_progress' && row.status !== 'paid' && row.status !== 'exception')) return '';
    var type = String(row.paymentMethodType || '').toLowerCase();
    if (type !== 'card' && type !== 'ach') return '';

    if (type === 'card') {
      var cardLast4 = getDigits(row.cardLast4 || row.paymentMethodEnding || '').slice(-4) || '0000';
      var cardFull = '4000 0000 0000 ' + cardLast4;
      var expiry = row.cardExpiry || '12/2028';
      var cvcValue = row.cardCvc || '123';
      var holder = row.payeeName || 'Cardholder';
      var address = (row.cardholderAddress || '892 Innovation Blvd\nAustin, TX 78701\nUnited States');
      var cardNetworkValue = String(row.cardNetwork || 'Visa');
      var typeIcon = cardNetworkValue.toLowerCase().indexOf('master') !== -1 ? ICON_MASTERCARD : ICON_VISA;
      var numberId = 'bp-payment-copy-' + (++paymentInfoCopyIdCounter);
      var expId = 'bp-payment-copy-' + (++paymentInfoCopyIdCounter);
      var cvcId = 'bp-payment-copy-' + (++paymentInfoCopyIdCounter);
      return (
        '<div class="flex">' +
          '<div class="' + DETAIL_LABEL + '">Payment Method<br>Details</div>' +
          '<div class="flex-1 p-4 grid grid-cols-[max-content_32px_minmax(0,460px)] items-start gap-4">' +
            '<div class="pt-0.5 text-sm font-semibold text-gray-900 dark:text-gray-100"><span class="inline-flex max-w-full truncate">Card</span></div>' +
            '<div class="flex items-center justify-center pt-0.5 text-gray-500 dark:text-gray-300"><span class="inline-flex size-5 items-center justify-center">' + ICON_EXPAND_RIGHT + '</span></div>' +
            '<div class="w-[460px] max-w-full">' +
              '<div data-payment-info-card class="flex flex-col items-start self-stretch">' +
                '<div class="flex items-center justify-between self-stretch px-4 py-2 rounded-t-md border border-gray-200 bg-gray-100 dark:border-white/10 dark:bg-white/10">' +
                  '<span class="text-sm font-semibold text-gray-900 dark:text-gray-100">Card Details</span><span></span>' +
                '</div>' +
                '<div class="flex flex-col items-start gap-2 self-stretch p-4 rounded-b-md border-r border-b border-l border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5">' +
                  '<div class="grid grid-cols-2 gap-4 self-stretch"><span class="text-sm font-medium text-gray-900 dark:text-gray-100">Cardholder Name</span><span class="text-sm font-normal text-gray-700 dark:text-gray-300">' + escapeHtml(holder) + '</span></div>' +
                  '<div class="grid grid-cols-2 gap-4 self-stretch items-start"><span class="text-sm font-medium text-gray-900 dark:text-gray-100">Cardholder Address</span><span class="text-sm font-normal text-gray-700 dark:text-gray-300 whitespace-pre-line">' + escapeHtml(address).replace(/\n/g, '<br>') + '</span></div>' +
                  '<div class="grid grid-cols-2 gap-4 self-stretch"><span class="text-sm font-medium text-gray-900 dark:text-gray-100">Type</span><span class="text-sm font-normal text-gray-700 dark:text-gray-300">' + typeIcon + '</span></div>' +
                  '<div class="grid grid-cols-2 gap-4 self-stretch"><span class="text-sm font-medium text-gray-900 dark:text-gray-100">Card Number</span><button type="button" data-copy-id="' + numberId + '" data-copy-enabled="false" data-card-copy-control="true" class="copy-btn -ml-1 inline-flex w-fit items-center gap-1.5 rounded-md px-1.5 py-0.5 text-gray-700 dark:text-gray-300 pointer-events-none"><span id="' + numberId + '" data-mask-field="card-number" data-masked="•••• ' + escapeHtml(cardLast4) + '" data-revealed="' + escapeHtml(cardFull) + '" class="text-sm font-normal">•••• ' + escapeHtml(cardLast4) + '</span><span data-copy-icon="true" class="hidden">' + ICON_COPY + '</span></button></div>' +
                  '<div class="grid grid-cols-2 gap-4 self-stretch"><span class="text-sm font-medium text-gray-900 dark:text-gray-100">Expires</span><button type="button" data-copy-id="' + expId + '" data-copy-enabled="false" data-card-copy-control="true" class="copy-btn -ml-1 inline-flex w-fit items-center gap-1.5 rounded-md px-1.5 py-0.5 text-gray-700 dark:text-gray-300 pointer-events-none"><span id="' + expId + '" data-mask-field="card-expiry" data-masked="' + escapeHtml(expiry) + '" data-revealed="' + escapeHtml(expiry) + '" class="text-sm font-normal">' + escapeHtml(expiry) + '</span><span data-copy-icon="true" class="hidden">' + ICON_COPY + '</span></button></div>' +
                  '<div class="grid grid-cols-2 gap-4 self-stretch"><span class="text-sm font-medium text-gray-900 dark:text-gray-100">CVC2</span><button type="button" data-copy-id="' + cvcId + '" data-copy-enabled="false" data-card-copy-control="true" class="copy-btn -ml-1 inline-flex w-fit items-center gap-1.5 rounded-md px-1.5 py-0.5 text-gray-700 dark:text-gray-300 pointer-events-none"><span id="' + cvcId + '" data-mask-field="card-cvc" data-masked="•••" data-revealed="' + escapeHtml(cvcValue) + '" class="text-sm font-normal">•••</span><span data-copy-icon="true" class="hidden">' + ICON_COPY + '</span></button></div>' +
                  '<div class="grid grid-cols-2 gap-4 self-stretch items-start"><span></span><button type="button" data-card-reveal-toggle data-revealed="false" class="inline-flex w-fit shrink-0 self-start items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-600/10 dark:bg-blue-600/10 dark:text-blue-400 dark:hover:bg-blue-600/20 cursor-pointer"><span data-icon="reveal">' + ICON_EYE + '</span><span data-icon="hide" class="hidden">' + ICON_EYE_SLASH + '</span><span data-card-reveal-text>Reveal Details</span></button></div>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
    }

    var bankLast4 = getDigits(row.bankLast4 || row.paymentMethodEnding || '').slice(-4) || '0000';
    var acctId = 'bp-payment-copy-' + (++paymentInfoCopyIdCounter);
    var routingId = 'bp-payment-copy-' + (++paymentInfoCopyIdCounter);
    return (
      '<div class="flex">' +
        '<div class="' + DETAIL_LABEL + '">Payment Method<br>Details</div>' +
        '<div class="flex-1 p-4 grid grid-cols-[max-content_32px_minmax(0,460px)] items-start gap-4">' +
          '<div class="pt-0.5 text-sm font-semibold text-gray-900 dark:text-gray-100"><span class="inline-flex max-w-full truncate">ACH</span></div>' +
          '<div class="flex items-center justify-center pt-0.5 text-gray-500 dark:text-gray-300"><span class="inline-flex size-5 items-center justify-center">' + ICON_EXPAND_RIGHT + '</span></div>' +
          '<div class="w-[460px] max-w-full">' +
            '<div data-ach-info-card class="flex flex-col items-start self-stretch">' +
              '<div class="flex items-center justify-between self-stretch px-4 py-2 rounded-t-md border border-gray-200 bg-gray-100 dark:border-white/10 dark:bg-white/10"><span class="text-sm font-semibold text-gray-900 dark:text-gray-100">Account Details</span><span></span></div>' +
              '<div class="flex flex-col items-start gap-2 self-stretch p-4 rounded-b-md border-r border-b border-l border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5">' +
                '<div class="grid grid-cols-2 gap-4 self-stretch"><span class="text-sm font-medium text-gray-900 dark:text-gray-100">Name</span><span class="text-sm font-normal text-gray-700 dark:text-gray-300">' + escapeHtml(row.payeeName || 'Account Holder') + '</span></div>' +
                '<div class="grid grid-cols-2 gap-4 self-stretch"><span class="text-sm font-medium text-gray-900 dark:text-gray-100">Account Number</span><button type="button" data-copy-id="' + acctId + '" data-copy-enabled="false" data-ach-copy-control="true" class="copy-btn -ml-1 inline-flex w-fit items-center gap-1.5 rounded-md px-1.5 py-0.5 text-gray-700 dark:text-gray-300 pointer-events-none"><span id="' + acctId + '" data-ach-mask-field="true" data-masked="••••' + escapeHtml(bankLast4) + '" data-revealed="' + escapeHtml(row.bankAccountNumber || ('00000000' + bankLast4)) + '" class="text-sm font-normal">••••' + escapeHtml(bankLast4) + '</span><span data-copy-icon="true" class="hidden">' + ICON_COPY + '</span></button></div>' +
                '<div class="grid grid-cols-2 gap-4 self-stretch"><span class="text-sm font-medium text-gray-900 dark:text-gray-100">Routing Number</span><button type="button" data-copy-id="' + routingId + '" data-copy-enabled="false" data-ach-copy-control="true" class="copy-btn -ml-1 inline-flex w-fit items-center gap-1.5 rounded-md px-1.5 py-0.5 text-gray-700 dark:text-gray-300 pointer-events-none"><span id="' + routingId + '" data-ach-mask-field="true" data-masked="••••1100" data-revealed="' + escapeHtml(row.bankRoutingNumber || '021000021') + '" class="text-sm font-normal">••••1100</span><span data-copy-icon="true" class="hidden">' + ICON_COPY + '</span></button></div>' +
                '<div class="grid grid-cols-2 gap-4 self-stretch items-start"><span></span><button type="button" data-ach-reveal-toggle data-revealed="false" class="inline-flex w-fit shrink-0 self-start items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-600/10 dark:bg-blue-600/10 dark:text-blue-400 dark:hover:bg-blue-600/20 cursor-pointer"><span data-icon="reveal">' + ICON_EYE + '</span><span data-icon="hide" class="hidden">' + ICON_EYE_SLASH + '</span><span data-ach-reveal-text>Reveal Details</span></button></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function buildActivityLogItem(dotClasses, title, description, showLine) {
    var lineHtml = showLine
      ? '<div class="absolute top-0 -bottom-6 left-0 flex w-6 justify-center"><div class="w-px bg-gray-200 dark:bg-white/10"></div></div>'
      : '';
    return (
      '<div class="relative flex gap-4">' +
        lineHtml +
        '<div class="relative flex size-6 flex-none items-center justify-center bg-white dark:bg-gray-900">' +
          '<div class="size-1.5 rounded-full ' + dotClasses + '"></div>' +
        '</div>' +
        '<div class="flex flex-col gap-1 pb-6">' +
          '<p class="text-base font-medium text-gray-900 dark:text-white">' + escapeHtml(title || '') + '</p>' +
          '<p class="text-sm text-gray-700 dark:text-gray-300">' + escapeHtml(description || '') + '</p>' +
        '</div>' +
      '</div>'
    );
  }

  function buildActivityLogSection(row) {
    if (!row || row.status === 'ready_to_pay') return '';
    var log = (row.details && row.details.activityLog) || [];
    if (!log.length) return '';
    var items = log.map(function (item, idx) {
      var dotType = item && item.type;
      if (row.status === 'in_progress' && (dotType === 'pending' || !dotType)) {
        dotType = 'processing';
      }
      return buildActivityLogItem(
        getStatusDotClass(dotType),
        item && item.title,
        item && item.description,
        idx < log.length - 1
      );
    }).join('');
    return (
      '<div class="flex">' +
        '<div class="' + DETAIL_LABEL + '">Activity Log</div>' +
        '<div class="flex-1 p-4">' + items + '</div>' +
      '</div>'
    );
  }

  function buildExpandedDetails(row) {
    var notes = buildNotesSection(row);
    var status = buildStatusSection(row);
    var attachments = buildAttachmentsSection(row);
    var paymentMethodDetails = buildPaymentMethodDetailsSection(row);
    var activity = buildActivityLogSection(row);
    var sections = [notes, status, attachments].filter(Boolean);
    if (paymentMethodDetails) sections.push(DETAIL_SEPARATOR + paymentMethodDetails);
    if (activity) sections.push(DETAIL_SEPARATOR + activity);
    if (!sections.length) return '';
    return sections.join('');
  }

  function loadJsonWithFallbacks(paths) {
    var i = 0;
    function tryNext() {
      if (i >= paths.length) {
        return Promise.reject(new Error('Failed to load bills-payables JSON from all known paths.'));
      }
      var path = paths[i++];
      return fetch(path, { cache: 'no-store' }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + path);
        return res.json();
      }).catch(function () {
        return tryNext();
      });
    }
    return tryNext();
  }

  function matchesSearch(row, query) {
    if (!query) return true;
    var q = query.toLowerCase();
    var haystack = [
      row.billNumber,
      row.payeeName,
      row.source,
      row.statusLabel || STATUS_LABELS[row.status] || row.status,
      String(row.amount),
      row.id,
    ].join(' ').toLowerCase();
    return haystack.indexOf(q) !== -1;
  }

  function matchesFilters(row) {
    if (state.selectedSources.size && !state.selectedSources.has(row.source)) return false;
    if (state.selectedStatuses.size && !state.selectedStatuses.has(row.status)) return false;
    if (state.selectedMethods.size && !state.selectedMethods.has(row.paymentMethodType)) return false;
    if (state.initiatedDateFrom || state.initiatedDateTo) {
      var rowDate = toIsoDate(row.adDate);
      if (!rowDate) return false;
      if (state.initiatedDateFrom && rowDate < state.initiatedDateFrom) return false;
      if (state.initiatedDateTo && rowDate > state.initiatedDateTo) return false;
    }
    return true;
  }

  function compareValues(a, b) {
    if (a == null && b == null) return 0;
    if (a == null) return -1;
    if (b == null) return 1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    var aDate = Date.parse(a);
    var bDate = Date.parse(b);
    if (!isNaN(aDate) && !isNaN(bDate)) return aDate - bDate;
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
  }

  function sortRows(rows) {
    if (!state.sortKey || !state.sortDirection) return rows.slice();
    var dir = state.sortDirection === 'asc' ? 1 : -1;
    return rows.slice().sort(function (a, b) {
      return compareValues(a[state.sortKey], b[state.sortKey]) * dir;
    });
  }

  function getTabRows() {
    return state.allRows.filter(function (row) {
      return row.status === state.activeTab;
    });
  }

  function getFilteredRows() {
    return sortRows(getTabRows().filter(function (row) {
      return matchesSearch(row, state.search) && matchesFilters(row);
    }));
  }

  function getRenderableColumns() {
    var cols = state.columns.slice();
    if (state.activeTab === 'ready_to_pay') {
      cols = cols.filter(function (col) {
        return col && col.key !== 'paymentMethod' && col.key !== 'adDate';
      });
    }
    if (state.activeTab === 'in_progress') {
      cols = cols.filter(function (col) {
        return col && col.key !== 'dueDate' && col.type !== 'select';
      });
    }
    if (state.activeTab === 'paid') {
      cols = cols.filter(function (col) {
        return col && col.key !== 'dueDate' && col.type !== 'action' && col.type !== 'select';
      }).map(function (col) {
        if (col && col.key === 'adDate') {
          return Object.assign({}, col, { label: 'Payment Date' });
        }
        return col;
      });
    }
    if (state.activeTab === 'exception') {
      cols = cols.filter(function (col) {
        return col && col.type !== 'select';
      });
    }
    return cols;
  }

  function normalizeRows(rows) {
    var payeesById = state.payeesById || {};
    var payeesByName = state.payeesByName || {};
    var methods = ['card', 'ach', 'wire', 'smart_disburse', 'smart_exchange'];
    return rows.map(function (row, idx) {
      var next = Object.assign({}, row);
      var payee = (next.payeeId && payeesById[next.payeeId]) || (next.payeeName && payeesByName[next.payeeName]) || null;
      if (payee) {
        next.payeeId = next.payeeId || payee.id;
        next.payeeName = payee.name || next.payeeName;
      }
      var methodType = String(next.paymentMethodType || '').trim().toLowerCase();
      if (!methodType) methodType = methods[idx % methods.length];
      next.paymentMethodType = methodType;

      if (methodType === 'card') {
        var network = String(next.cardNetwork || (idx % 2 === 0 ? 'Visa' : 'Mastercard'));
        var cardLast4 = getDigits(next.cardLast4 || next.paymentMethodEnding || String(4100 + (idx % 9000))).slice(-4);
        next.cardNetwork = network;
        next.cardLast4 = cardLast4;
        next.paymentMethod = network + ' •••• ' + cardLast4;
      } else if (methodType === 'ach' || methodType === 'wire') {
        var bankLast4 = getDigits(next.bankLast4 || next.paymentMethodEnding || String(1200 + (idx % 8000))).slice(-4);
        next.bankLast4 = bankLast4;
        next.paymentMethod = (methodType === 'wire' ? 'Wire' : 'Bank') + ' •••• ' + bankLast4;
      } else if (methodType === 'smart_exchange') {
        next.paymentMethod = 'SMART Exchange';
      } else if (methodType === 'smart_disburse') {
        next.paymentMethod = 'SMART Disburse';
      } else {
        next.paymentMethodType = 'smart_disburse';
        next.paymentMethod = 'SMART Disburse';
      }
      if (next.status === 'in_progress') {
        var statusType = next.statusType;
        if (!statusType) {
          statusType = (idx % 3 === 0) ? 'scheduled' : 'processing';
        }
        next.statusType = statusType;
        if (statusType === 'scheduled') {
          if (!next.scheduledFor) {
            var day = 14 + (idx % 10);
            var minute = idx % 2 === 0 ? '45' : '15';
            next.scheduledFor = '2026-07-' + String(day).padStart(2, '0') + 'T00:' + minute + ':00';
          }
          next.statusLabel = 'Scheduled';
          next.details = next.details || {};
          next.details.activityLog = [
            {
              type: 'scheduled',
              title: 'Scheduled',
              description: 'Payment is scheduled for ' + formatScheduledDateTime(next.scheduledFor) + '.',
            },
            {
              type: 'event',
              title: 'Queued',
              description: 'Payment request was queued and is waiting for the scheduled run.',
            },
          ];
        } else {
          next.statusLabel = 'Processing';
          next.details = next.details || {};
          if (!Array.isArray(next.details.activityLog) || !next.details.activityLog.length) {
            next.details.activityLog = [
              {
                type: 'processing',
                title: 'Processing',
                description: 'Payment is currently being processed.',
              },
              {
                type: 'event',
                title: 'Initiated',
                description: 'Payment entered processing pipeline.',
              },
            ];
          }
        }
      }
      if (next.status === 'exception') {
        next.statusLabel = 'Failed';
      }
      return next;
    });
  }

  function indexPayees(payload) {
    var list = [];
    if (Array.isArray(payload)) list = payload;
    else if (payload && Array.isArray(payload.data)) list = payload.data;
    var byId = {};
    var byName = {};
    list.forEach(function (p) {
      if (!p) return;
      var id = String(p.id || '').trim();
      var name = String(p.name || '').trim();
      if (id) byId[id] = p;
      if (name) byName[name] = p;
    });
    state.payeesById = byId;
    state.payeesByName = byName;
  }

  function getTodayIsoDate() {
    var now = new Date();
    var y = now.getFullYear();
    var m = String(now.getMonth() + 1).padStart(2, '0');
    var d = String(now.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  function moveRowToInProgress(rowId) {
    var today = getTodayIsoDate();
    state.allRows = state.allRows.map(function (row) {
      if (row.id !== rowId) return row;
      var updated = Object.assign({}, row);
      updated.status = 'in_progress';
      updated.statusType = 'processing';
      updated.statusLabel = 'Processing';
      updated.adDate = today;
      updated.details = Object.assign({}, updated.details || {});
      updated.details.activityLog = [
        {
          type: 'processing',
          title: 'Processing',
          description: 'Payment was initiated on ' + formatDate(today) + ' and is currently processing.',
        },
        {
          type: 'event',
          title: 'Initiated',
          description: 'Payment was initiated on ' + formatDate(today) + '.',
        },
      ];
      return updated;
    });
  }

  function openPayPage(rowId) {
    var selected = null;
    for (var i = 0; i < state.allRows.length; i++) {
      if (state.allRows[i] && state.allRows[i].id === rowId) {
        selected = state.allRows[i];
        break;
      }
    }
    var params = new URLSearchParams();
    params.set('view', 'pay');
    if (selected && selected.id) params.set('id', String(selected.id));
    if (selected && selected.billNumber) params.set('bill', String(selected.billNumber));
    window.location.href = './payables-pay.html?' + params.toString();
  }

  function moveRowBackToReady(rowId) {
    state.allRows = state.allRows.map(function (row) {
      if (row.id !== rowId) return row;
      var updated = Object.assign({}, row);
      updated.status = 'ready_to_pay';
      updated.statusType = '';
      updated.statusLabel = 'Unprocessed';
      updated.adDate = '';
      updated.details = Object.assign({}, updated.details || {});
      updated.details.activityLog = [
        {
          type: 'pending',
          title: 'Ready to Pay',
          description: 'Payment was returned to Ready to Pay.',
        },
      ];
      return updated;
    });
  }

  function renderPaymentMethodCell(row, cb) {
    var type = String(row && row.paymentMethodType || '').toLowerCase();
    if (type === 'ach' || type === 'wire') {
      var achLast4 = getDigits(row && (row.bankLast4 || row.paymentMethodEnding || '')).slice(-4);
      return '<td class="h-12 align-middle py-2 px-2 text-sm font-medium whitespace-nowrap text-gray-900 dark:text-white' + cb + '">' +
        '<span class="inline-flex items-center gap-x-2">' +
          ICON_ACH +
          '<span class="text-sm font-medium text-gray-900 dark:text-white">' + escapeHtml(achLast4 || '') + '</span>' +
        '</span>' +
      '</td>';
    }
    if (type === 'card') {
      var cardLast4 = getDigits(row && (row.cardLast4 || row.paymentMethodEnding || '')).slice(-4);
      var network = String(row && row.cardNetwork || '').toLowerCase();
      var cardIcon = network.indexOf('master') !== -1 ? ICON_MASTERCARD : ICON_VISA;
      return '<td class="h-12 align-middle py-2 px-2 text-sm font-medium whitespace-nowrap text-gray-900 dark:text-white' + cb + '">' +
        '<span class="inline-flex items-center gap-x-2">' +
          cardIcon +
          '<span class="text-sm font-medium text-gray-900 dark:text-white">' + escapeHtml(cardLast4 || '') + '</span>' +
        '</span>' +
      '</td>';
    }
    if (type === 'smart_disburse') {
      return '<td class="h-12 align-middle py-2 px-2 text-sm font-medium whitespace-nowrap text-gray-900 dark:text-white' + cb + '">' +
        '<span class="inline-flex items-center gap-x-2">' + ICON_SMART_DISBURSE + '<span class="text-sm font-medium text-gray-900 dark:text-white">SMART Disburse</span></span>' +
      '</td>';
    }
    if (type === 'smart_exchange') {
      return '<td class="h-12 align-middle py-2 px-2 text-sm font-medium whitespace-nowrap text-gray-900 dark:text-white' + cb + '">' +
        '<span class="inline-flex items-center gap-x-2">' + ICON_SMART_EXCHANGE + '<span class="text-sm font-medium text-gray-900 dark:text-white">SMART Exchange</span></span>' +
      '</td>';
    }
    return '<td class="h-12 align-middle py-2 px-2 text-sm font-medium whitespace-nowrap text-gray-900 dark:text-white' + cb + '">' +
      escapeHtml(row && row.paymentMethod ? row.paymentMethod : 'SMART Disburse') +
    '</td>';
  }

  function ensurePaymentMethodColumn(columns) {
    var list = Array.isArray(columns) ? columns.slice() : [];
    var hasColumn = list.some(function (col) { return col && col.key === 'paymentMethod'; });
    if (!hasColumn) {
      var payeeIndex = list.findIndex(function (col) { return col && col.key === 'payeeName'; });
      var paymentMethodColumn = { key: 'paymentMethod', label: 'Payment Method', sortable: true };
      if (payeeIndex >= 0) {
        list.splice(payeeIndex + 1, 0, paymentMethodColumn);
      } else {
        list.push(paymentMethodColumn);
      }
    }
    list = list.map(function (col) {
      if (col && col.key === 'paymentMethod') {
        return { key: 'paymentMethod', label: 'Payment Method', sortable: true };
      }
      return col;
    });
    return list;
  }

  function getVisibleRows(filteredRows) {
    var start = (state.currentPage - 1) * state.pageSize;
    return filteredRows.slice(start, start + state.pageSize);
  }

  function updateTabUi() {
    if (refs.tabNav) {
      refs.tabNav.querySelectorAll('[data-tab]').forEach(function (tabEl) {
        var key = tabEl.getAttribute('data-tab');
        var isActive = key === state.activeTab;
        ACTIVE_TAB_LINK_CLASSES.forEach(function (c) { tabEl.classList.toggle(c, isActive); });
        INACTIVE_TAB_LINK_CLASSES.forEach(function (c) { tabEl.classList.toggle(c, !isActive); });
        tabEl.setAttribute('aria-current', isActive ? 'page' : 'false');

        var badge = tabEl.querySelector('[data-tab-count]');
        if (badge) {
          ACTIVE_BADGE_CLASSES.forEach(function (c) { badge.classList.toggle(c, isActive); });
          INACTIVE_BADGE_CLASSES.forEach(function (c) { badge.classList.toggle(c, !isActive); });
        }
      });
    }
    if (refs.tabSelect) refs.tabSelect.value = state.activeTab;
  }

  function renderTabCounts() {
    var counts = { ready_to_pay: 0, in_progress: 0, paid: 0, exception: 0 };
    state.allRows.forEach(function (row) {
      if (counts[row.status] != null) counts[row.status] += 1;
    });
    document.querySelectorAll('[data-tab-count]').forEach(function (el) {
      var key = el.getAttribute('data-tab-count');
      if (counts[key] != null) el.textContent = String(counts[key]);
    });
  }

  function getBaseFilterRows() {
    return getTabRows();
  }

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

  function toIsoDate(value) {
    var str = String(value || '').slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(str) ? str : '';
  }

  function formatUsInput(value) {
    var digits = String(value || '').replace(/\D/g, '').slice(0, 8);
    if (!digits) return '';
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return digits.slice(0, 2) + ' / ' + digits.slice(2);
    return digits.slice(0, 2) + ' / ' + digits.slice(2, 4) + ' / ' + digits.slice(4);
  }

  function usInputToIso(value) {
    var digits = String(value || '').replace(/\D/g, '').slice(0, 8);
    if (digits.length !== 8) return '';
    var mm = parseInt(digits.slice(0, 2), 10);
    var dd = parseInt(digits.slice(2, 4), 10);
    var yyyy = parseInt(digits.slice(4, 8), 10);
    if (Number.isNaN(mm) || Number.isNaN(dd) || Number.isNaN(yyyy)) return '';
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1900 || yyyy > 2099) return '';
    return digits.slice(4, 8) + '-' + digits.slice(0, 2) + '-' + digits.slice(2, 4);
  }

  function formatIsoAsUsInput(iso) {
    if (!toIsoDate(iso)) return '';
    return iso.slice(5, 7) + ' / ' + iso.slice(8, 10) + ' / ' + iso.slice(0, 4);
  }

  function syncSelectedFiltersToAvailable() {
    var baseRows = getBaseFilterRows();
    var sourceSet = new Set();
    var statusSet = new Set();
    var methodSet = new Set();
    baseRows.forEach(function (row) {
      sourceSet.add(String(row && row.source || ''));
      statusSet.add(String(row && row.status || ''));
      methodSet.add(String(row && row.paymentMethodType || ''));
    });

    Array.from(state.selectedSources).forEach(function (source) {
      if (!sourceSet.has(source)) state.selectedSources.delete(source);
    });
    Array.from(state.selectedStatuses).forEach(function (status) {
      if (!statusSet.has(status)) state.selectedStatuses.delete(status);
    });
    Array.from(state.selectedMethods).forEach(function (method) {
      if (!methodSet.has(method)) state.selectedMethods.delete(method);
    });
    state.initiatedDateFrom = toIsoDate(state.initiatedDateFrom);
    state.initiatedDateTo = toIsoDate(state.initiatedDateTo);
    state.initiatedDateFromDraft = formatUsInput(state.initiatedDateFromDraft);
    state.initiatedDateToDraft = formatUsInput(state.initiatedDateToDraft);
    if (state.initiatedDateFrom && state.initiatedDateTo && state.initiatedDateFrom > state.initiatedDateTo) {
      state.initiatedDateTo = state.initiatedDateFrom;
    }
  }

  function renderSourceFilters() {
    if (!refs.filterSourcesWrap) return;
    var counts = new Map();
    getBaseFilterRows().forEach(function (row) {
      var key = String(row && row.source || '');
      if (!key) return;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    var rows = Array.from(counts.entries())
      .sort(function (a, b) { return a[0].localeCompare(b[0]); })
      .map(function (entry, idx) {
        return buildFilterCheckbox(
          'bp-table-filter-source-' + idx,
          entry[0],
          String(entry[1]),
          entry[0],
          state.selectedSources.has(entry[0])
        );
      });
    refs.filterSourcesWrap.innerHTML = rows.join('');
  }

  function renderStatusFilters() {
    if (!refs.filterStatusesWrap) return;
    var counts = {};
    getBaseFilterRows().forEach(function (row) {
      var key = String(row && row.status || '');
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    var statusOrder = ['ready_to_pay', 'in_progress', 'paid', 'exception'];
    var rows = statusOrder
      .filter(function (key) { return counts[key] > 0; })
      .map(function (key) {
        return buildFilterCheckbox(
          'bp-table-filter-status-' + key,
          TAB_LABELS[key] || key,
          String(counts[key]),
          key,
          state.selectedStatuses.has(key)
        );
      });
    refs.filterStatusesWrap.innerHTML = rows.join('');
  }

  function renderMethodFilters() {
    if (!refs.filterMethodsWrap) return;
    var counts = {};
    getBaseFilterRows().forEach(function (row) {
      var key = String(row && row.paymentMethodType || '');
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    var labels = {
      card: 'Card',
      ach: 'ACH',
      wire: 'Wire',
      smart_disburse: 'SMART Disburse',
      smart_exchange: 'SMART Exchange',
    };
    var order = ['card', 'ach', 'wire', 'smart_disburse', 'smart_exchange'];
    var rows = order
      .filter(function (key) { return counts[key] > 0; })
      .map(function (key, idx) {
        return buildFilterCheckbox(
          'bp-table-filter-method-' + idx,
          labels[key] || key,
          String(counts[key]),
          key,
          state.selectedMethods.has(key)
        );
      });
    refs.filterMethodsWrap.innerHTML = rows.join('');
  }

  function renderActiveFilters() {
    if (!refs.activeFilters) return;
    var tags = [];
    if (state.selectedSources.size) {
      var sourceText = Array.from(state.selectedSources).sort(function (a, b) { return a.localeCompare(b); }).join(', ');
      tags.push({ type: 'source', label: 'Source', value: sourceText });
    }
    if (state.selectedStatuses.size) {
      var statusText = Array.from(state.selectedStatuses)
        .sort(function (a, b) { return a.localeCompare(b); })
        .map(function (status) { return TAB_LABELS[status] || status; })
        .join(', ');
      tags.push({ type: 'status', label: 'Status', value: statusText });
    }
    if (state.selectedMethods.size) {
      var methodLabels = {
        card: 'Card',
        ach: 'ACH',
        wire: 'Wire',
        smart_disburse: 'SMART Disburse',
        smart_exchange: 'SMART Exchange',
      };
      var methodText = Array.from(state.selectedMethods)
        .sort(function (a, b) { return a.localeCompare(b); })
        .map(function (method) { return methodLabels[method] || method; })
        .join(', ');
      tags.push({ type: 'method', label: 'Method of payment', value: methodText });
    }
    if (state.initiatedDateFrom || state.initiatedDateTo) {
      var fromLabel = state.initiatedDateFrom ? formatDate(state.initiatedDateFrom) : 'Any';
      var toLabel = state.initiatedDateTo ? formatDate(state.initiatedDateTo) : 'Any';
      tags.push({ type: 'initiated_date', label: 'Initiated date', value: fromLabel + ' - ' + toLabel });
    }

    if (!tags.length) {
      refs.activeFilters.innerHTML = '';
      refs.activeFilters.classList.add('hidden');
      return;
    }
    refs.activeFilters.classList.remove('hidden');
    refs.activeFilters.innerHTML = tags.map(function (tag) {
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

  function renderPaginationSkeleton() {
    if (!refs.pagination) return;
    refs.pagination.innerHTML = '' +
      '<div class="flex flex-1 justify-between sm:hidden animate-pulse">' +
        '<span class="inline-flex h-9 w-24 rounded-md bg-gray-200 dark:bg-white/15"></span>' +
        '<span class="inline-flex h-9 w-20 rounded-md bg-gray-200 dark:bg-white/15"></span>' +
      '</div>' +
      '<div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between animate-pulse">' +
        '<div class="flex items-center gap-x-6">' +
          '<span class="inline-flex h-4 w-56 rounded bg-gray-200 dark:bg-white/15"></span>' +
          '<span class="inline-flex h-8 w-28 rounded-md bg-gray-200 dark:bg-white/15"></span>' +
        '</div>' +
        '<span class="inline-flex h-8 w-56 rounded-md bg-gray-200 dark:bg-white/15"></span>' +
      '</div>';
  }

  function renderTableSkeleton(renderColumns) {
    if (!refs.table) return;
    if (window.TableSkeleton && typeof window.TableSkeleton.render === 'function') {
      window.TableSkeleton.render({
        tableEl: refs.table,
        columns: renderColumns,
        rowCount: Math.min(10, state.pageSize),
        includeHeader: true,
      });
    } else {
      refs.table.innerHTML = '<tbody><tr><td class="px-4 py-8 text-sm text-gray-500 dark:text-gray-400">Loading...</td></tr></tbody>';
    }
    renderPaginationSkeleton();
    refreshStickyAction();
  }

  function startTabSwitchLoading(nextTab) {
    if (!TAB_LABELS[nextTab] || nextTab === state.activeTab) return;
    if (tabLoadingTimer) {
      clearTimeout(tabLoadingTimer);
      tabLoadingTimer = null;
    }
    state.activeTab = nextTab;
    state.currentPage = 1;
    state.isTabLoading = true;
    if (state.filterMenuOpen) {
      setFilterMenuOpen(false);
      setFilterPanel('root', true);
    }
    renderAll();
    tabLoadingTimer = setTimeout(function () {
      state.isTabLoading = false;
      tabLoadingTimer = null;
      renderAll();
    }, TAB_SWITCH_SKELETON_MS);
  }

  function syncFilterApplyButtonState() {
    if (refs.filterApplySourceBtn) refs.filterApplySourceBtn.disabled = state.selectedSources.size === 0;
    if (refs.filterApplyStatusBtn) refs.filterApplyStatusBtn.disabled = state.selectedStatuses.size === 0;
    if (refs.filterApplyMethodBtn) refs.filterApplyMethodBtn.disabled = state.selectedMethods.size === 0;
    if (refs.filterApplyDateBtn) refs.filterApplyDateBtn.disabled = !state.initiatedDateFrom && !state.initiatedDateTo;
  }

  function setFilterDetailPanelVisibility(panel) {
    if (refs.filterSourcePanel) refs.filterSourcePanel.classList.add('hidden');
    if (refs.filterStatusPanel) refs.filterStatusPanel.classList.add('hidden');
    if (refs.filterMethodPanel) refs.filterMethodPanel.classList.add('hidden');
    if (refs.filterInitiatedDatePanel) refs.filterInitiatedDatePanel.classList.add('hidden');
    if (refs.filterSourcePanel) refs.filterSourcePanel.classList.remove('flex');
    if (refs.filterStatusPanel) refs.filterStatusPanel.classList.remove('flex');
    if (refs.filterMethodPanel) refs.filterMethodPanel.classList.remove('flex');
    if (refs.filterInitiatedDatePanel) refs.filterInitiatedDatePanel.classList.remove('flex');
    if (panel === 'source' && refs.filterSourcePanel) {
      refs.filterSourcePanel.classList.remove('hidden');
      refs.filterSourcePanel.classList.add('flex');
    } else if (panel === 'status' && refs.filterStatusPanel) {
      refs.filterStatusPanel.classList.remove('hidden');
      refs.filterStatusPanel.classList.add('flex');
    } else if (panel === 'method' && refs.filterMethodPanel) {
      refs.filterMethodPanel.classList.remove('hidden');
      refs.filterMethodPanel.classList.add('flex');
    } else if (panel === 'initiated_date' && refs.filterInitiatedDatePanel) {
      refs.filterInitiatedDatePanel.classList.remove('hidden');
      refs.filterInitiatedDatePanel.classList.add('flex');
    }
  }

  function applyFilterMenuLayout() {
    if (!refs.filterMenu || !refs.filterRootPanel || !refs.filterDetailSlot || !refs.filterTrack) return;
    var isMobileView = window.matchMedia('(max-width: 639px)').matches;
    if (isMobileView) {
      refs.filterMenu.style.position = 'fixed';
      refs.filterMenu.style.left = '0';
      refs.filterMenu.style.right = '0';
      refs.filterMenu.style.bottom = '0';
      refs.filterMenu.style.top = 'auto';
      refs.filterMenu.style.marginTop = '0';
      refs.filterMenu.style.margin = '0';
      refs.filterMenu.style.zIndex = '50';
      refs.filterMenu.style.maxWidth = '100dvw';
      refs.filterMenu.style.borderBottomLeftRadius = '0';
      refs.filterMenu.style.borderBottomRightRadius = '0';
      refs.filterMenu.style.borderTopLeftRadius = '0';
      refs.filterMenu.style.borderTopRightRadius = '0';
      refs.filterMenu.style.width = '100dvw';
      refs.filterRootPanel.style.width = '100dvw';
      refs.filterDetailSlot.style.width = '100dvw';
      refs.filterTrack.classList.remove('transition-transform', 'duration-250', 'ease-[cubic-bezier(0.22,1,0.36,1)]');
      refs.filterMenu.classList.remove('origin-top-right');
      refs.filterMenu.classList.add('origin-bottom');
    } else {
      refs.filterMenu.style.position = '';
      refs.filterMenu.style.left = '';
      refs.filterMenu.style.right = '';
      refs.filterMenu.style.bottom = '';
      refs.filterMenu.style.top = '';
      refs.filterMenu.style.marginTop = '';
      refs.filterMenu.style.margin = '';
      refs.filterMenu.style.zIndex = '';
      refs.filterMenu.style.maxWidth = '';
      refs.filterMenu.style.borderBottomLeftRadius = '';
      refs.filterMenu.style.borderBottomRightRadius = '';
      refs.filterMenu.style.borderTopLeftRadius = '';
      refs.filterMenu.style.borderTopRightRadius = '';
      refs.filterMenu.style.width = '';
      refs.filterRootPanel.style.width = '';
      refs.filterDetailSlot.style.width = '';
      refs.filterTrack.classList.add('transition-transform', 'duration-250', 'ease-[cubic-bezier(0.22,1,0.36,1)]');
      refs.filterMenu.classList.remove('origin-bottom');
      refs.filterMenu.classList.add('origin-top-right');
    }
  }

  function setFilterPanel(panel, immediate) {
    if (!refs.filterMenu || !refs.filterTrack || !refs.filterRootPanel || !refs.filterDetailSlot) return;
    state.activeFilterPanel = panel;
    var targetPanel = refs.filterRootPanel;
    if (panel === 'source' || panel === 'status' || panel === 'method' || panel === 'initiated_date') {
      setFilterDetailPanelVisibility(panel);
      targetPanel = refs.filterDetailSlot;
    } else {
      setFilterDetailPanelVisibility('root');
    }
    var offset = targetPanel ? targetPanel.offsetLeft : 0;
    var width = targetPanel ? targetPanel.offsetWidth : 0;
    var height = targetPanel ? targetPanel.offsetHeight : 0;
    var isMobileView = window.matchMedia('(max-width: 639px)').matches;
    if (isMobileView) {
      refs.filterTrack.style.transform = 'translateX(' + (-offset) + 'px)';
      refs.filterMenu.style.width = '100dvw';
      if (height > 0) refs.filterMenu.style.height = height + 'px';
      return;
    }
    if (immediate) {
      refs.filterTrack.style.transform = 'translateX(' + (-offset) + 'px)';
      if (width > 0) refs.filterMenu.style.width = width + 'px';
      if (height > 0) refs.filterMenu.style.height = height + 'px';
      return;
    }
    var currentRect = refs.filterMenu.getBoundingClientRect();
    if (currentRect.width > 0) refs.filterMenu.style.width = currentRect.width + 'px';
    if (currentRect.height > 0) refs.filterMenu.style.height = currentRect.height + 'px';
    requestAnimationFrame(function () {
      refs.filterTrack.style.transform = 'translateX(' + (-offset) + 'px)';
      if (width > 0) refs.filterMenu.style.width = width + 'px';
      if (height > 0) refs.filterMenu.style.height = height + 'px';
    });
  }

  function setFilterMenuOpen(nextOpen) {
    if (!refs.filterMenu) return;
    state.filterMenuOpen = !!nextOpen;
    applyFilterMenuLayout();
    if (state.filterMenuOpen) {
      setFilterPanel(state.activeFilterPanel || 'root', true);
      refs.filterMenu.classList.remove('invisible', 'opacity-0', 'pointer-events-none');
      if (refs.filterBackdrop && window.matchMedia('(max-width: 639px)').matches) {
        refs.filterBackdrop.classList.remove('invisible', 'opacity-0', 'pointer-events-none');
      }
    } else {
      refs.filterMenu.classList.add('invisible', 'opacity-0', 'pointer-events-none');
      refs.filterMenu.style.width = '';
      refs.filterMenu.style.height = '';
      if (refs.filterBackdrop) refs.filterBackdrop.classList.add('invisible', 'opacity-0', 'pointer-events-none');
    }
  }

  function initTableFilterDropdown() {
    if (!refs.filterBtn || !refs.filterMenu || !refs.filterTrack || !refs.filterRootPanel || !refs.filterDetailSlot) return;

    syncFilterUi = function () {
      syncSelectedFiltersToAvailable();
      renderSourceFilters();
      renderStatusFilters();
      renderMethodFilters();
      renderActiveFilters();
      if (refs.filterDateFromInput) refs.filterDateFromInput.value = state.initiatedDateFromDraft || formatIsoAsUsInput(state.initiatedDateFrom);
      if (refs.filterDateToInput) refs.filterDateToInput.value = state.initiatedDateToDraft || formatIsoAsUsInput(state.initiatedDateTo);
      syncFilterApplyButtonState();
      if (state.filterMenuOpen) {
        applyFilterMenuLayout();
        setFilterPanel(state.activeFilterPanel || 'root', true);
      }
    };

    refs.filterBtn.addEventListener('click', function (event) {
      event.stopPropagation();
      var nextOpen = !state.filterMenuOpen;
      if (nextOpen) state.activeFilterPanel = 'root';
      setFilterMenuOpen(nextOpen);
      syncFilterApplyButtonState();
    });

    refs.filterTrack.addEventListener('click', function (event) {
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

    refs.filterTrack.addEventListener('change', function (event) {
      var checkbox = event.target.closest('input[type="checkbox"][data-filter-value]');
      if (!checkbox) return;
      var panelEl = checkbox.closest('#bp-table-filter-sources, #bp-table-filter-statuses, #bp-table-filter-methods');
      var value = checkbox.getAttribute('data-filter-value');
      if (!panelEl || !value) return;
      if (panelEl.id === 'bp-table-filter-sources') {
        if (checkbox.checked) state.selectedSources.add(value);
        else state.selectedSources.delete(value);
      } else if (panelEl.id === 'bp-table-filter-statuses') {
        if (checkbox.checked) state.selectedStatuses.add(value);
        else state.selectedStatuses.delete(value);
      } else {
        if (checkbox.checked) state.selectedMethods.add(value);
        else state.selectedMethods.delete(value);
      }
      syncFilterApplyButtonState();
      state.currentPage = 1;
      renderTable();
      renderActiveFilters();
    });

    function bindDateInput(inputEl, field) {
      if (!inputEl) return;
      inputEl.addEventListener('focus', function () {
        state.initiatedDateActiveField = field === 'to' ? 'to' : 'from';
      });
      inputEl.addEventListener('input', function () {
        var formatted = formatUsInput(inputEl.value);
        var iso = usInputToIso(formatted);
        inputEl.value = formatted;
        if (field === 'to') {
          state.initiatedDateToDraft = formatted;
          state.initiatedDateTo = iso || '';
        } else {
          state.initiatedDateFromDraft = formatted;
          state.initiatedDateFrom = iso || '';
        }
        if (state.initiatedDateFrom && state.initiatedDateTo && state.initiatedDateFrom > state.initiatedDateTo) {
          if (field === 'to') state.initiatedDateFrom = state.initiatedDateTo;
          else state.initiatedDateTo = state.initiatedDateFrom;
        }
        syncFilterApplyButtonState();
        state.currentPage = 1;
        renderTable();
        renderActiveFilters();
      });
    }

    bindDateInput(refs.filterDateFromInput, 'from');
    bindDateInput(refs.filterDateToInput, 'to');

    [refs.filterApplySourceBtn, refs.filterApplyStatusBtn, refs.filterApplyMethodBtn, refs.filterApplyDateBtn].forEach(function (btn) {
      if (!btn) return;
      btn.addEventListener('click', function (event) {
        event.stopPropagation();
        if (btn.disabled) return;
        setFilterMenuOpen(false);
        setFilterPanel('root');
      });
    });

    if (refs.filterBackdrop) {
      refs.filterBackdrop.addEventListener('click', function () {
        if (!state.filterMenuOpen) return;
        setFilterMenuOpen(false);
        setFilterPanel('root');
      });
    }

    if (refs.activeFilters) {
      refs.activeFilters.addEventListener('click', function (event) {
        var openBtn = event.target.closest('button[data-filter-tag-open]');
        if (openBtn) {
          event.preventDefault();
          var panelType = openBtn.getAttribute('data-filter-tag-open');
          state.activeFilterPanel = panelType || 'root';
          setFilterMenuOpen(true);
          setFilterPanel(state.activeFilterPanel, true);
          syncFilterApplyButtonState();
          return;
        }
        var removeBtn = event.target.closest('button[data-filter-tag-remove]');
        if (!removeBtn) return;
        event.preventDefault();
        var type = removeBtn.getAttribute('data-filter-tag-remove');
        if (type === 'source') state.selectedSources.clear();
        if (type === 'status') state.selectedStatuses.clear();
        if (type === 'method') state.selectedMethods.clear();
        if (type === 'initiated_date') {
          state.initiatedDateFrom = '';
          state.initiatedDateTo = '';
          state.initiatedDateFromDraft = '';
          state.initiatedDateToDraft = '';
          if (refs.filterDateFromInput) refs.filterDateFromInput.value = '';
          if (refs.filterDateToInput) refs.filterDateToInput.value = '';
        }
        state.currentPage = 1;
        syncFilterUi();
        renderTable();
      });
    }

    document.addEventListener('click', function (event) {
      if (!refs.filterDropdown || !state.filterMenuOpen) return;
      if (refs.filterDropdown.contains(event.target)) return;
      setFilterMenuOpen(false);
      setFilterPanel('root');
    });

    window.addEventListener('resize', function () {
      if (!state.filterMenuOpen) return;
      applyFilterMenuLayout();
      setFilterPanel(state.activeFilterPanel || 'root', true);
    });
  }

  function renderTable() {
    if (!refs.table) return;
    var renderColumns = getRenderableColumns();
    if (state.isTabLoading || state.isInitialLoading) {
      renderTableSkeleton(renderColumns);
      return;
    }

    var filteredRows = getFilteredRows();
    var totalPages = Math.max(1, Math.ceil(filteredRows.length / state.pageSize));
    if (state.currentPage > totalPages) state.currentPage = totalPages;

    var visibleRows = getVisibleRows(filteredRows);
    var visibleIds = visibleRows.map(function (r) { return r.id; });
    var selectedVisibleCount = visibleIds.filter(function (id) { return state.selectedRowIds.has(id); }).length;
    var allVisibleSelected = visibleRows.length > 0 && selectedVisibleCount === visibleRows.length;
    var hasSomeVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;

    function buildSortBadgeHTML(sortDirection) {
      var sortBtnClass = sortDirection
        ? 'inline-flex size-6 items-center justify-center rounded-md bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
        : 'inline-flex size-6 items-center justify-center rounded-md bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-400';
      var sortIcon = sortDirection === 'asc'
        ? ICON_SORT_ASC
        : (sortDirection === 'desc' ? ICON_SORT_DESC : ICON_SORT);
      return '<span data-sort-badge="true" class="' + sortBtnClass + '">' + sortIcon + '</span>';
    }

    var headerHtml = '<thead><tr>' + renderColumns.map(function (col) {
      var base = 'border-b border-gray-200 dark:border-white/10';
      if (col.type === 'expand') {
        return '<th class="' + base + ' w-10 min-w-10 py-3.5 px-0 text-center whitespace-nowrap"><span class="sr-only">Expand</span></th>';
      }
      if (col.type === 'select') {
        return '' +
          '<th class="' + base + ' w-10 min-w-10 px-0 py-3.5 text-center text-sm font-semibold whitespace-nowrap text-gray-900 dark:text-white">' +
          '<div class="flex h-6 items-center justify-center">' +
          '<label class="inline-flex items-center justify-center cursor-pointer select-none">' +
          '<span class="group grid size-4 grid-cols-1">' +
          '<input id="bp-select-all" type="checkbox" class="col-start-1 row-start-1 appearance-none rounded-sm border border-gray-300 bg-white checked:border-blue-600 checked:bg-blue-600 indeterminate:border-blue-600 indeterminate:bg-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-white/20 dark:bg-white/5 dark:checked:border-blue-500 dark:checked:bg-blue-500" ' + (allVisibleSelected ? 'checked' : '') + ' />' +
          '<svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white">' +
          '<path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-checked:opacity-100" />' +
          '<path d="M3 7H11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-indeterminate:opacity-100" />' +
          '</svg>' +
          '</span>' +
          '</label>' +
          '</div>' +
          '</th>';
      }
      if (col.type === 'action') {
        return '<th data-action-column scope="col" class="' + base + ' bg-white py-3.5 pr-3 pl-3 whitespace-nowrap w-px dark:bg-gray-900 sm:pr-2"><span class="sr-only">Action</span></th>';
      }

      var thClass = base + ' px-2 py-3.5 text-left text-sm font-semibold whitespace-nowrap text-gray-900 dark:text-white';
      var direction = state.sortKey === col.key ? state.sortDirection : '';
      var content = col.sortable
        ? '<button type="button" data-sort-key="' + col.key + '" class="group flex w-full cursor-pointer items-center gap-x-1.5 rounded-md text-left text-sm font-semibold text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-white"><span>' + escapeHtml(col.label) + '</span>' + buildSortBadgeHTML(direction) + '</button>'
        : escapeHtml(col.label);
      return '<th class="' + thClass + '">' + content + '</th>';
    }).join('') + '</tr></thead>';

    var bodyRows = visibleRows.map(function (row, rowIndex) {
      var isLastRow = rowIndex === visibleRows.length - 1;
      var cb = isLastRow ? '' : ' border-b border-gray-200 dark:border-white/10';
      var expanded = state.expandedRows.has(row.id);
      var actionBgClass = expanded ? ' bg-gray-100 dark:bg-white/5' : ' bg-white dark:bg-gray-900';
      var rowCells = renderColumns.map(function (col) {
        if (col.type === 'expand') {
          return '' +
            '<td class="h-12 align-middle py-2 px-0 text-center whitespace-nowrap' + cb + '">' +
            '<button type="button" data-expand-id="' + row.id + '" class="inline-flex items-center justify-center rounded-md p-1 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 cursor-pointer">' +
            '<svg class="size-4 text-gray-600 dark:text-gray-300 transition-transform duration-200 ' + (expanded ? 'rotate-90' : '') + '" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>' +
            '</button>' +
            '</td>';
        }
        if (col.type === 'select') {
          return '' +
            '<td class="h-12 align-middle py-2 px-0 text-center whitespace-nowrap' + cb + '">' +
            '<div class="flex h-6 items-center justify-center">' +
            '<span class="group inline-grid size-4 grid-cols-1">' +
            '<input type="checkbox" data-row-select-id="' + row.id + '" class="col-start-1 row-start-1 appearance-none rounded-sm border border-gray-300 bg-white checked:border-blue-600 checked:bg-blue-600 indeterminate:border-blue-600 indeterminate:bg-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-white/20 dark:bg-white/5 dark:checked:border-blue-500 dark:checked:bg-blue-500" ' +
            (state.selectedRowIds.has(row.id) ? 'checked' : '') + ' />' +
            '<svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white">' +
            '<path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-checked:opacity-100" />' +
            '<path d="M3 7H11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-indeterminate:opacity-100" />' +
            '</svg>' +
            '</span>' +
            '</div>' +
            '</td>';
        }
        if (col.type === 'action') {
          var actionButton = row.status === 'in_progress'
            ? '<button type="button" data-cancel-id="' + row.id + '" class="rounded-md bg-gray-100 px-2 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/20 dark:focus-visible:outline-white/40">Cancel</button>'
            : (row.status === 'exception'
              ? '<button type="button" data-rerun-id="' + row.id + '" class="rounded-md bg-gray-100 px-2 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/20 dark:focus-visible:outline-white/40">Re-run</button>'
              : '<button type="button" data-pay-id="' + row.id + '" class="rounded-md bg-blue-600 px-2 py-1 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-blue-500 dark:shadow-none dark:hover:bg-blue-400 dark:focus-visible:outline-blue-500">Pay</button>');
          return '<td data-action-column class="h-12 align-middle py-2 pr-3 pl-3 whitespace-nowrap w-px text-right text-sm font-medium' + cb + actionBgClass + ' group-hover:bg-gray-50 dark:group-hover:bg-white/5 sm:pr-2">' +
            actionButton +
            '</td>';
        }
        if (col.key === 'amount') {
          return '<td class="h-12 align-middle py-2 px-2 text-sm font-medium whitespace-nowrap text-gray-900 dark:text-white' + cb + '">' +
            escapeHtml(formatMoney(row.amount, row.currency)) +
            ' <span class="text-gray-500 dark:text-gray-400">' + escapeHtml(row.currency || 'USD') + '</span></td>';
        }
        if (col.key === 'dueDate' || col.key === 'adDate') {
          return '<td class="h-12 align-middle px-2 py-2 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400' + cb + '">' + escapeHtml(formatDate(row[col.key])) + '</td>';
        }
        if (col.type === 'status' || col.key === 'status') {
          var status = row.status;
          if (status === 'in_progress' && row.statusType === 'scheduled') {
            var scheduledText = formatScheduledDateTime(row.scheduledFor);
            return '<td class="h-12 align-middle px-2 py-2 whitespace-nowrap' + cb + '">' +
              '<span class="group/scheduled relative inline-flex cursor-default select-none items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 inset-ring inset-ring-blue-700/10 hover:bg-blue-100 dark:bg-blue-400/10 dark:text-blue-300 dark:inset-ring-blue-400/30 dark:hover:bg-blue-400/20">' +
                '<span>Scheduled</span>' +
                '<span class="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg group-hover/scheduled:inline-flex items-center gap-2">' +
                  ICON_SCHEDULED +
                  '<span>Scheduled for: ' + escapeHtml(scheduledText) + '</span>' +
                '</span>' +
              '</span>' +
            '</td>';
          }
          return '<td class="h-12 align-middle px-2 py-2 whitespace-nowrap' + cb + '">' +
            '<span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium inset-ring ' + (STATUS_STYLES[status] || STATUS_STYLES.ready_to_pay) + '">' +
            escapeHtml(row.statusLabel || STATUS_LABELS[status] || status) +
            '</span></td>';
        }
        if (col.key === 'billNumber') {
          return '<td class="h-12 align-middle px-2 py-2 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400' + cb + '">' + escapeHtml(row[col.key] == null ? '--' : row[col.key]) + '</td>';
        }
        if (col.key === 'paymentMethod') {
          return renderPaymentMethodCell(row, cb);
        }
        if (col.key === 'payeeName' || col.key === 'source') {
          return '<td class="h-12 align-middle py-2 px-2 text-sm font-medium whitespace-nowrap text-gray-900 dark:text-white' + cb + '">' + escapeHtml(row[col.key] == null ? '--' : row[col.key]) + '</td>';
        }
        return '<td class="h-12 align-middle px-2 py-2 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400' + cb + '">' + escapeHtml(row[col.key] == null ? '--' : row[col.key]) + '</td>';
      }).join('');

      var expandedHtml = '';
      if (expanded) {
        expandedHtml = '' +
          '<tr>' +
            '<td colspan="' + renderColumns.length + '" class="bg-white dark:bg-gray-900 ' + (isLastRow ? '' : 'border-b border-gray-200 dark:border-white/10') + '">' +
              buildExpandedDetails(row) +
            '</td>' +
          '</tr>';
      }

      return '<tr class="group ' + (expanded ? 'bg-gray-100 dark:bg-white/5 ' : '') + 'hover:bg-gray-50 dark:hover:bg-white/5">' + rowCells + '</tr>' + expandedHtml;
    }).join('');

    if (!bodyRows) {
      bodyRows = '<tr><td colspan="' + renderColumns.length + '" class="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">No payables found for the current filters.</td></tr>';
    }

    refs.table.innerHTML = headerHtml + '<tbody class="bg-white dark:bg-gray-900">' + bodyRows + '</tbody>';

    var selectAll = document.getElementById('bp-select-all');
    if (selectAll) {
      selectAll.indeterminate = hasSomeVisibleSelected;
    }

    renderPagination(filteredRows.length, visibleRows.length);
    refreshStickyAction();
  }

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
    var scroller = table.closest('[data-table-scroll]') || table.closest('.overflow-x-auto');
    if (!scroller) return function () {};

    function sync() {
      var maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
      var isOverflowing = maxScrollLeft > 0.5;
      var isDark = document.documentElement.classList.contains('dark');
      var actionColumns = table.querySelectorAll('[data-action-column]');
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

  function getPageNumbers(current, total) {
    if (total <= 7) {
      var all = [];
      for (var i = 1; i <= total; i++) all.push(i);
      return all;
    }
    var pages = [];
    pages.push(1);
    if (current > 3) pages.push('...');
    var rangeStart = Math.max(2, current - 1);
    var rangeEnd = Math.min(total - 1, current + 1);
    for (var j = rangeStart; j <= rangeEnd; j++) pages.push(j);
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  }

  function renderPagination(totalItems, visibleCount) {
    if (!refs.pagination) return;

    var total = totalItems;
    var page = state.currentPage;
    var size = state.pageSize;
    var totalPages = Math.max(1, Math.ceil(total / size));
    var start = Math.min((page - 1) * size + 1, total);
    var end = Math.min(page * size, total);
    var isFirstPage = page <= 1;
    var isLastPage = page >= totalPages;

    var activePageClass = 'relative z-10 inline-flex items-center bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-600 inset-ring inset-ring-blue-300 focus:z-20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-blue-500/10 dark:text-blue-400 dark:inset-ring-blue-500/30 dark:focus-visible:outline-blue-400';
    var defaultPageClass = 'relative inline-flex items-center px-2.5 py-1 text-xs font-semibold text-gray-900 inset-ring inset-ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 dark:text-gray-200 dark:inset-ring-gray-700 dark:hover:bg-white/5';
    var ellipsisClass = 'relative inline-flex items-center px-2.5 py-1 text-xs font-semibold text-gray-700 inset-ring inset-ring-gray-300 focus:outline-offset-0 dark:text-gray-400 dark:inset-ring-gray-700';
    var prevClass = 'relative inline-flex items-center rounded-l-sm px-1.5 py-1 text-gray-400 inset-ring inset-ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 dark:inset-ring-gray-700 dark:hover:bg-white/5';
    var nextClass = 'relative inline-flex items-center rounded-r-sm px-1.5 py-1 text-gray-400 inset-ring inset-ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 dark:inset-ring-gray-700 dark:hover:bg-white/5';

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

    var optionsHTML = '';
    PAGE_SIZE_OPTIONS.forEach(function (opt) {
      optionsHTML += '<a href="#" data-page-size="' + opt + '" class="block px-4 py-2 text-sm ' +
        (opt === size ? 'font-semibold text-gray-900 bg-gray-50 dark:text-white dark:bg-white/5' : 'text-gray-700 dark:text-gray-300') +
        ' hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900 focus:outline-hidden dark:hover:bg-white/5 dark:hover:text-white dark:focus:bg-white/5 dark:focus:text-white">' +
        opt + '</a>';
    });

    var mobileHTML =
      '<div class="flex flex-1 justify-between sm:hidden">' +
        '<a href="#" data-page-prev class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10' +
          (isFirstPage ? ' opacity-50 pointer-events-none' : '') + '">Previous</a>' +
        '<a href="#" data-page-next class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10' +
          (isLastPage ? ' opacity-50 pointer-events-none' : '') + '">Next</a>' +
      '</div>';

    var desktopHTML =
      '<div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">' +
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

    refs.pagination.innerHTML = mobileHTML + desktopHTML;
  }

  function exportCurrentRows() {
    var rows = getFilteredRows();
    var columns = ['amount', 'billNumber', 'payeeName', 'paymentMethod', 'source', 'dueDate', 'adDate', 'statusLabel'];
    var headers = ['Amount', 'Bill #', 'Payee', 'Payment Method', 'Source', 'Due Date', 'Date Initiated', 'Status'];
    var csv = [headers.join(',')];

    rows.forEach(function (row) {
      var values = columns.map(function (key) {
        var value = key === 'amount'
          ? formatMoney(row.amount, row.currency)
          : key === 'dueDate' || key === 'adDate'
            ? formatDate(row[key])
            : key === 'statusLabel'
              ? (row.statusLabel || STATUS_LABELS[row.status] || row.status)
              : row[key];
        var safe = String(value == null ? '' : value).replace(/"/g, '""');
        return '"' + safe + '"';
      });
      csv.push(values.join(','));
    });

    var blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'bills-payables-export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function bindEvents() {
    if (refs.searchInput) {
      refs.searchInput.addEventListener('input', function (e) {
        state.search = String(e.target.value || '').trim();
        state.currentPage = 1;
        renderTable();
      });
    }

    if (refs.refreshBtn) {
      refs.refreshBtn.addEventListener('click', function () {
        if (state.isTabLoading || state.isInitialLoading) return;
        state.isTabLoading = true;
        renderAll();
        refreshHalfTurns += 1;
        var icon = refs.refreshBtn.querySelector('svg');
        if (icon) {
          icon.style.transition = 'transform 800ms ease-out';
          icon.style.transform = 'rotate(' + (refreshHalfTurns * 180) + 'deg)';
        }
        setTimeout(function () {
          state.isTabLoading = false;
          renderAll();
          if (icon) icon.style.transition = '';
          if (typeof window.showGlobalTopToast === 'function') {
            window.showGlobalTopToast("Data synced. You're up to date.");
          }
        }, MANUAL_REFRESH_SKELETON_MS);
      });
    }

    if (refs.exportBtn) {
      refs.exportBtn.addEventListener('click', function () {
        exportCurrentRows();
      });
    }

    if (refs.tabNav) {
      refs.tabNav.addEventListener('click', function (e) {
        var tab = e.target.closest('[data-tab]');
        if (!tab) return;
        e.preventDefault();
        var key = tab.getAttribute('data-tab');
        startTabSwitchLoading(key);
      });
    }

    if (refs.tabSelect) {
      refs.tabSelect.addEventListener('change', function (e) {
        var key = e.target.value;
        startTabSwitchLoading(key);
      });
    }

    if (refs.table) {
      refs.table.addEventListener('click', function (e) {
        var cardRevealBtn = e.target.closest('[data-card-reveal-toggle]');
        if (cardRevealBtn) {
          e.preventDefault();
          var cardSection = cardRevealBtn.closest('[data-payment-info-card]');
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

          var revealed = cardRevealBtn.getAttribute('data-revealed') === 'true';
          revealed = !revealed;
          cardRevealBtn.setAttribute('data-revealed', String(revealed));
          cardSection.querySelectorAll('[data-mask-field]').forEach(function (field) {
            var maskedValue = field.getAttribute('data-masked') || '';
            var revealedValue = field.getAttribute('data-revealed') || '';
            field.textContent = revealed ? (revealedValue || maskedValue) : maskedValue;
          });
          cardSection.querySelectorAll('[data-card-copy-control="true"]').forEach(function (copyAction) {
            setCardCopyVisible(copyAction, revealed);
          });
          var revealIcon = cardRevealBtn.querySelector('[data-icon="reveal"]');
          var hideIcon = cardRevealBtn.querySelector('[data-icon="hide"]');
          var text = cardRevealBtn.querySelector('[data-card-reveal-text]');
          if (revealIcon) revealIcon.classList.toggle('hidden', revealed);
          if (hideIcon) hideIcon.classList.toggle('hidden', !revealed);
          if (text) text.textContent = revealed ? 'Hide Details' : 'Reveal Details';
          return;
        }

        var achRevealBtn = e.target.closest('[data-ach-reveal-toggle]');
        if (achRevealBtn) {
          e.preventDefault();
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
          achSection.querySelectorAll('[data-ach-mask-field="true"]').forEach(function (field) {
            var maskedValue = field.getAttribute('data-masked') || '';
            var revealedValue = field.getAttribute('data-revealed') || '';
            field.textContent = achRevealed ? (revealedValue || maskedValue) : maskedValue;
          });
          achSection.querySelectorAll('[data-ach-copy-control="true"]').forEach(function (copyAction) {
            setAchCopyVisible(copyAction, achRevealed);
          });
          var achRevealIcon = achRevealBtn.querySelector('[data-icon="reveal"]');
          var achHideIcon = achRevealBtn.querySelector('[data-icon="hide"]');
          var achText = achRevealBtn.querySelector('[data-ach-reveal-text]');
          if (achRevealIcon) achRevealIcon.classList.toggle('hidden', achRevealed);
          if (achHideIcon) achHideIcon.classList.toggle('hidden', !achRevealed);
          if (achText) achText.textContent = achRevealed ? 'Hide Details' : 'Reveal Details';
          return;
        }

        var payBtn = e.target.closest('[data-pay-id]');
        if (payBtn) {
          openPayPage(payBtn.getAttribute('data-pay-id'));
          return;
        }

        var cancelBtn = e.target.closest('[data-cancel-id]');
        if (cancelBtn) {
          moveRowBackToReady(cancelBtn.getAttribute('data-cancel-id'));
          state.currentPage = 1;
          renderAll();
          return;
        }

        var rerunBtn = e.target.closest('[data-rerun-id]');
        if (rerunBtn) {
          moveRowToInProgress(rerunBtn.getAttribute('data-rerun-id'));
          state.currentPage = 1;
          renderAll();
          return;
        }

        var sortBtn = e.target.closest('[data-sort-key]');
        if (sortBtn) {
          var sortKey = sortBtn.getAttribute('data-sort-key');
          if (state.sortKey !== sortKey) {
            state.sortKey = sortKey;
            state.sortDirection = 'asc';
          } else if (state.sortDirection === 'asc') {
            state.sortDirection = 'desc';
          } else if (state.sortDirection === 'desc') {
            state.sortDirection = '';
            state.sortKey = '';
          } else {
            state.sortDirection = 'asc';
          }
          state.currentPage = 1;
          renderTable();
          return;
        }

        var expandBtn = e.target.closest('[data-expand-id]');
        if (expandBtn) {
          var rowId = expandBtn.getAttribute('data-expand-id');
          if (state.expandedRows.has(rowId)) state.expandedRows.delete(rowId);
          else state.expandedRows.add(rowId);
          renderTable();
        }
      });

      refs.table.addEventListener('change', function (e) {
        var rowCheckbox = e.target.closest('[data-row-select-id]');
        if (rowCheckbox) {
          var rowId = rowCheckbox.getAttribute('data-row-select-id');
          if (rowCheckbox.checked) state.selectedRowIds.add(rowId);
          else state.selectedRowIds.delete(rowId);
          renderTable();
          return;
        }

        var selectAll = e.target.closest('#bp-select-all');
        if (selectAll) {
          var visibleRows = getVisibleRows(getFilteredRows());
          visibleRows.forEach(function (row) {
            if (selectAll.checked) state.selectedRowIds.add(row.id);
            else state.selectedRowIds.delete(row.id);
          });
          renderTable();
        }
      });
    }

    if (refs.pagination) {
      refs.pagination.addEventListener('click', function (e) {
        var pageSizeLink = e.target.closest('[data-page-size]');
        if (pageSizeLink) {
          e.preventDefault();
          var newSize = parseInt(pageSizeLink.getAttribute('data-page-size'), 10);
          if (newSize && newSize !== state.pageSize) {
            state.pageSize = newSize;
            state.currentPage = 1;
            renderTable();
          }
          return;
        }

        var pageNumLink = e.target.closest('[data-page-num]');
        if (pageNumLink) {
          e.preventDefault();
          var targetPage = parseInt(pageNumLink.getAttribute('data-page-num'), 10);
          if (targetPage && targetPage !== state.currentPage) {
            state.currentPage = targetPage;
            renderTable();
          }
          return;
        }

        var prev = e.target.closest('#bp-page-prev');
        var next = e.target.closest('#bp-page-next');
        if (!prev) prev = e.target.closest('[data-page-prev]');
        if (!next) next = e.target.closest('[data-page-next]');
        if (prev) {
          e.preventDefault();
          state.currentPage = Math.max(1, state.currentPage - 1);
          renderTable();
        }
        if (next) {
          e.preventDefault();
          var totalPages = Math.max(1, Math.ceil(getFilteredRows().length / state.pageSize));
          state.currentPage = Math.min(totalPages, state.currentPage + 1);
          renderTable();
        }
      });
    }
  }

  function renderAll() {
    renderTabCounts();
    updateTabUi();
    syncFilterUi();
    renderTable();
  }

  function init() {
    initRefs();
    if (!refs.table || !refs.pagination) return;
    var initialLoadStartedAt = Date.now();
    state.isInitialLoading = true;
    renderTableSkeleton([]);

    Promise.all([
      loadJsonWithFallbacks(JSON_PATH_FALLBACKS),
      loadJsonWithFallbacks(PAYEES_PATH_FALLBACKS).catch(function () { return { data: [] }; }),
    ]).then(function (results) {
      var payload = results[0];
      var payeesPayload = results[1];
      indexPayees(payeesPayload);
      state.columns = ensurePaymentMethodColumn((payload && payload.tableConfig && payload.tableConfig.columns) || []);
      state.allRows = normalizeRows((payload && payload.data) || []);
      if (!state.columns.length || !state.allRows.length) {
        refs.table.innerHTML = '<tbody><tr><td class="px-4 py-12 text-sm text-gray-500">No data available.</td></tr></tbody>';
        return;
      }
      bindEvents();
      initTableFilterDropdown();
      refreshStickyAction = initStickyAction(refs.table);
      if (initialLoadingTimer) {
        clearTimeout(initialLoadingTimer);
        initialLoadingTimer = null;
      }
      var elapsed = Date.now() - initialLoadStartedAt;
      var remaining = Math.max(0, INITIAL_TABLE_SKELETON_MS - elapsed);
      state.isInitialLoading = remaining > 0;
      renderAll();
      if (remaining > 0) {
        initialLoadingTimer = setTimeout(function () {
          state.isInitialLoading = false;
          initialLoadingTimer = null;
          renderAll();
        }, remaining);
      }
    }).catch(function (err) {
      refs.table.innerHTML = '<tbody><tr><td class="px-4 py-12 text-sm text-red-600">Failed to load data.</td></tr></tbody>';
      console.error(err);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

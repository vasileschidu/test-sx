(function () {
  'use strict';

  var DEFAULT_PAGE_SIZE = 10;
  var PAGE_SIZE_OPTIONS = [10, 25, 50];
  var ICON_SORT = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4"><path class="opacity-40" fill-rule="evenodd" d="M10.53 3.47a.75.75 0 0 0-1.06 0L6.22 6.72a.75.75 0 1 0 1.06 1.06L10 5.06l2.72 2.72a.75.75 0 1 0 1.06-1.06l-3.25-3.25Z" clip-rule="evenodd" /><path class="opacity-40" fill-rule="evenodd" d="M6.22 13.28a.75.75 0 0 1 1.06 0L10 15.94l2.72-2.66a.75.75 0 1 1 1.06 1.06l-3.25 3.19a.75.75 0 0 1-1.06 0l-3.25-3.19a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>';
  var ICON_SORT_ASC = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4"><path transform="translate(10 5.6) scale(1.2) translate(-10 -5.6)" fill-rule="evenodd" d="M10.53 3.47a.75.75 0 0 0-1.06 0L6.22 6.72a.75.75 0 1 0 1.06 1.06L10 5.06l2.72 2.72a.75.75 0 1 0 1.06-1.06l-3.25-3.25Z" clip-rule="evenodd" /><path class="opacity-40" fill-rule="evenodd" d="M6.22 13.28a.75.75 0 0 1 1.06 0L10 15.94l2.72-2.66a.75.75 0 1 1 1.06 1.06l-3.25 3.19a.75.75 0 0 1-1.06 0l-3.25-3.19a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>';
  var ICON_SORT_DESC = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4"><path class="opacity-40" fill-rule="evenodd" d="M10.53 3.47a.75.75 0 0 0-1.06 0L6.22 6.72a.75.75 0 1 0 1.06 1.06L10 5.06l2.72 2.72a.75.75 0 1 0 1.06-1.06l-3.25-3.25Z" clip-rule="evenodd" /><path transform="translate(10 14.4) scale(1.2) translate(-10 -14.4)" fill-rule="evenodd" d="M6.22 13.28a.75.75 0 0 1 1.06 0L10 15.94l2.72-2.66a.75.75 0 1 1 1.06 1.06l-3.25 3.19a.75.75 0 0 1-1.06 0l-3.25-3.19a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>';

  var STATUS_STYLES = {
    active: 'bg-green-50 text-green-700 inset-ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:inset-ring-green-500/20',
    needs_verification: 'bg-amber-50 text-amber-700 inset-ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:inset-ring-amber-400/20',
    exception: 'bg-red-50 text-red-700 inset-ring-red-600/10 dark:bg-red-400/10 dark:text-red-400 dark:inset-ring-red-400/20',
    inactive: 'bg-gray-50 text-gray-600 inset-ring-gray-500/10 dark:bg-white/10 dark:text-gray-300 dark:inset-ring-white/15',
    blocked: 'bg-red-50 text-red-700 inset-ring-red-600/10 dark:bg-red-400/10 dark:text-red-400 dark:inset-ring-red-400/20'
  };

  var state = {
    vendors: [],
    search: '',
    selectedSources: new Set(),
    selectedStatuses: new Set(),
    selectedVerifications: new Set(),
    selectedMethods: new Set(),
    lastPaymentDateFrom: '',
    lastPaymentDateTo: '',
    lastPaymentDateFromDraft: '',
    lastPaymentDateToDraft: '',
    lastPaymentDateActiveField: 'from',
    filterMenuOpen: false,
    activeFilterPanel: 'root',
    sortKey: 'displayName',
    sortDirection: 'asc',
    pageSize: DEFAULT_PAGE_SIZE,
    currentPage: 1,
    loading: true
  };

  var refs = {};
  var syncFilterUi = function () {};
  var globalHandlersBound = false;
  var filterDismissHandler = null;
  var filterResizeHandler = null;
  var sortAndPageClickHandler = null;
  var pageSizeChangeHandler = null;

  function initRefs() {
    refs.table = document.getElementById('vendors-table');
    refs.pagination = document.querySelector('[data-vendors-pagination]');
    refs.search = document.getElementById('vendors-search-input');
    refs.summary = document.getElementById('vendors-summary');
    refs.filterDropdown = document.getElementById('vendors-table-filter-dropdown');
    refs.filterBtn = document.getElementById('vendors-table-filter-btn');
    refs.filterMenu = document.getElementById('vendors-table-filter-menu');
    refs.filterTrack = document.getElementById('vendors-table-filter-track');
    refs.filterRootPanel = document.getElementById('vendors-table-filter-panel-root');
    refs.filterDetailSlot = document.getElementById('vendors-table-filter-detail-slot');
    refs.filterSourcePanel = document.getElementById('vendors-table-filter-panel-source');
    refs.filterStatusPanel = document.getElementById('vendors-table-filter-panel-status');
    refs.filterVerificationPanel = document.getElementById('vendors-table-filter-panel-verification');
    refs.filterMethodPanel = document.getElementById('vendors-table-filter-panel-method');
    refs.filterLastPaymentDatePanel = document.getElementById('vendors-table-filter-panel-last-payment-date');
    refs.filterSourcesWrap = document.getElementById('vendors-table-filter-sources');
    refs.filterStatusesWrap = document.getElementById('vendors-table-filter-statuses');
    refs.filterVerificationsWrap = document.getElementById('vendors-table-filter-verifications');
    refs.filterMethodsWrap = document.getElementById('vendors-table-filter-methods');
    refs.filterDateFromInput = document.getElementById('vendors-table-filter-date-from-input');
    refs.filterDateToInput = document.getElementById('vendors-table-filter-date-to-input');
    refs.filterApplySourceBtn = document.getElementById('vendors-table-filter-apply-source-btn');
    refs.filterApplyStatusBtn = document.getElementById('vendors-table-filter-apply-status-btn');
    refs.filterApplyVerificationBtn = document.getElementById('vendors-table-filter-apply-verification-btn');
    refs.filterApplyMethodBtn = document.getElementById('vendors-table-filter-apply-method-btn');
    refs.filterApplyDateBtn = document.getElementById('vendors-table-filter-apply-date-btn');
    refs.filterBackdrop = document.getElementById('vendors-table-filter-backdrop');
    refs.activeFilters = document.getElementById('vendors-table-active-filters');
  }

  function escapeHtml(value) {
    return window.VendorsData.escapeHtml(value);
  }

  function getStatusBadge(status, label) {
    return '<span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium inset-ring ' + (STATUS_STYLES[status] || STATUS_STYLES.active) + '">' + escapeHtml(label) + '</span>';
  }

  function compareValues(a, b) {
    if (a == null && b == null) return 0;
    if (a == null) return -1;
    if (b == null) return 1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
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

  function formatMoney(value) {
    return window.VendorsData.formatMoney(value, 'USD');
  }

  function formatDate(value) {
    return window.VendorsData.formatDate(value);
  }

  function normalizeMethodKey(label) {
    return String(label || '').toLowerCase().replace(/\s+/g, '_');
  }

  function syncSelectedFiltersToAvailable() {
    var sourceSet = new Set();
    var statusSet = new Set();
    var verificationSet = new Set();
    var methodSet = new Set();

    state.vendors.forEach(function (vendor) {
      sourceSet.add(String(vendor.sourceSystem || ''));
      statusSet.add(String(vendor.status || ''));
      verificationSet.add(String(vendor.verificationStatus || ''));
      (vendor.supportedPaymentMethods || []).forEach(function (method) {
        methodSet.add(normalizeMethodKey(method));
      });
    });

    Array.from(state.selectedSources).forEach(function (value) {
      if (!sourceSet.has(value)) state.selectedSources.delete(value);
    });
    Array.from(state.selectedStatuses).forEach(function (value) {
      if (!statusSet.has(value)) state.selectedStatuses.delete(value);
    });
    Array.from(state.selectedVerifications).forEach(function (value) {
      if (!verificationSet.has(value)) state.selectedVerifications.delete(value);
    });
    Array.from(state.selectedMethods).forEach(function (value) {
      if (!methodSet.has(value)) state.selectedMethods.delete(value);
    });

    state.lastPaymentDateFrom = toIsoDate(state.lastPaymentDateFrom);
    state.lastPaymentDateTo = toIsoDate(state.lastPaymentDateTo);
    state.lastPaymentDateFromDraft = formatUsInput(state.lastPaymentDateFromDraft);
    state.lastPaymentDateToDraft = formatUsInput(state.lastPaymentDateToDraft);
    if (state.lastPaymentDateFrom && state.lastPaymentDateTo && state.lastPaymentDateFrom > state.lastPaymentDateTo) {
      state.lastPaymentDateTo = state.lastPaymentDateFrom;
    }
  }

  function renderSourceFilters() {
    if (!refs.filterSourcesWrap) return;
    var counts = new Map();
    state.vendors.forEach(function (vendor) {
      var key = String(vendor.sourceSystem || '');
      if (!key) return;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    refs.filterSourcesWrap.innerHTML = Array.from(counts.entries())
      .sort(function (a, b) { return a[0].localeCompare(b[0]); })
      .map(function (entry, idx) {
        return buildFilterCheckbox('vendors-table-filter-source-' + idx, entry[0], String(entry[1]), entry[0], state.selectedSources.has(entry[0]));
      }).join('');
  }

  function renderStatusFilters() {
    if (!refs.filterStatusesWrap) return;
    var counts = {};
    var order = ['active', 'needs_verification', 'exception', 'inactive', 'blocked'];
    var labels = {
      active: 'Active',
      needs_verification: 'Needs Verification',
      exception: 'Exception',
      inactive: 'Inactive',
      blocked: 'Blocked'
    };
    state.vendors.forEach(function (vendor) {
      var key = String(vendor.status || '');
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    refs.filterStatusesWrap.innerHTML = order.filter(function (key) {
      return counts[key] > 0;
    }).map(function (key) {
      return buildFilterCheckbox('vendors-table-filter-status-' + key, labels[key] || key, String(counts[key]), key, state.selectedStatuses.has(key));
    }).join('');
  }

  function renderVerificationFilters() {
    if (!refs.filterVerificationsWrap) return;
    var counts = {};
    var order = ['verified', 'pending', 'action_required'];
    var labels = { verified: 'Verified', pending: 'Pending', action_required: 'Action Required' };
    state.vendors.forEach(function (vendor) {
      var key = String(vendor.verificationStatus || '');
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    refs.filterVerificationsWrap.innerHTML = order.filter(function (key) {
      return counts[key] > 0;
    }).map(function (key) {
      return buildFilterCheckbox('vendors-table-filter-verification-' + key, labels[key] || key, String(counts[key]), key, state.selectedVerifications.has(key));
    }).join('');
  }

  function renderMethodFilters() {
    if (!refs.filterMethodsWrap) return;
    var counts = {};
    var order = ['ach', 'card', 'check', 'smart_disburse', 'smart_exchange', 'wire'];
    var labels = {
      ach: 'ACH',
      card: 'Card',
      check: 'Check',
      smart_disburse: 'SMART Disburse',
      smart_exchange: 'SMART Exchange',
      wire: 'Wire'
    };
    state.vendors.forEach(function (vendor) {
      (vendor.supportedPaymentMethods || []).forEach(function (method) {
        var key = normalizeMethodKey(method);
        if (!key) return;
        counts[key] = (counts[key] || 0) + 1;
      });
    });
    refs.filterMethodsWrap.innerHTML = order.filter(function (key) {
      return counts[key] > 0;
    }).map(function (key, idx) {
      return buildFilterCheckbox('vendors-table-filter-method-' + idx, labels[key] || key, String(counts[key]), key, state.selectedMethods.has(key));
    }).join('');
  }

  function renderActiveFilters() {
    if (!refs.activeFilters) return;
    var tags = [];
    if (state.selectedSources.size) {
      tags.push({ type: 'source', label: 'Source', value: Array.from(state.selectedSources).sort().join(', ') });
    }
    if (state.selectedStatuses.size) {
      var statusLabels = {
        active: 'Active',
        needs_verification: 'Needs Verification',
        exception: 'Exception',
        inactive: 'Inactive',
        blocked: 'Blocked'
      };
      tags.push({ type: 'status', label: 'Status', value: Array.from(state.selectedStatuses).sort().map(function (value) { return statusLabels[value] || value; }).join(', ') });
    }
    if (state.selectedVerifications.size) {
      var verificationLabels = { verified: 'Verified', pending: 'Pending', action_required: 'Action Required' };
      tags.push({ type: 'verification', label: 'Verification', value: Array.from(state.selectedVerifications).sort().map(function (value) { return verificationLabels[value] || value; }).join(', ') });
    }
    if (state.selectedMethods.size) {
      var methodLabels = {
        ach: 'ACH',
        card: 'Card',
        check: 'Check',
        smart_disburse: 'SMART Disburse',
        smart_exchange: 'SMART Exchange',
        wire: 'Wire'
      };
      tags.push({ type: 'method', label: 'Payment method', value: Array.from(state.selectedMethods).sort().map(function (value) { return methodLabels[value] || value; }).join(', ') });
    }
    if (state.lastPaymentDateFrom || state.lastPaymentDateTo) {
      tags.push({
        type: 'last_payment_date',
        label: 'Last payment date',
        value: (state.lastPaymentDateFrom ? formatDate(state.lastPaymentDateFrom) : 'Any') + ' - ' + (state.lastPaymentDateTo ? formatDate(state.lastPaymentDateTo) : 'Any')
      });
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

  function syncFilterApplyButtonState() {
    if (refs.filterApplySourceBtn) refs.filterApplySourceBtn.disabled = state.selectedSources.size === 0;
    if (refs.filterApplyStatusBtn) refs.filterApplyStatusBtn.disabled = state.selectedStatuses.size === 0;
    if (refs.filterApplyVerificationBtn) refs.filterApplyVerificationBtn.disabled = state.selectedVerifications.size === 0;
    if (refs.filterApplyMethodBtn) refs.filterApplyMethodBtn.disabled = state.selectedMethods.size === 0;
    if (refs.filterApplyDateBtn) refs.filterApplyDateBtn.disabled = !state.lastPaymentDateFrom && !state.lastPaymentDateTo;
  }

  function setFilterDetailPanelVisibility(panel) {
    if (refs.filterSourcePanel) refs.filterSourcePanel.classList.add('hidden');
    if (refs.filterStatusPanel) refs.filterStatusPanel.classList.add('hidden');
    if (refs.filterVerificationPanel) refs.filterVerificationPanel.classList.add('hidden');
    if (refs.filterMethodPanel) refs.filterMethodPanel.classList.add('hidden');
    if (refs.filterLastPaymentDatePanel) refs.filterLastPaymentDatePanel.classList.add('hidden');
    if (refs.filterSourcePanel) refs.filterSourcePanel.classList.remove('flex');
    if (refs.filterStatusPanel) refs.filterStatusPanel.classList.remove('flex');
    if (refs.filterVerificationPanel) refs.filterVerificationPanel.classList.remove('flex');
    if (refs.filterMethodPanel) refs.filterMethodPanel.classList.remove('flex');
    if (refs.filterLastPaymentDatePanel) refs.filterLastPaymentDatePanel.classList.remove('flex');
    if (panel === 'source' && refs.filterSourcePanel) {
      refs.filterSourcePanel.classList.remove('hidden');
      refs.filterSourcePanel.classList.add('flex');
    } else if (panel === 'status' && refs.filterStatusPanel) {
      refs.filterStatusPanel.classList.remove('hidden');
      refs.filterStatusPanel.classList.add('flex');
    } else if (panel === 'verification' && refs.filterVerificationPanel) {
      refs.filterVerificationPanel.classList.remove('hidden');
      refs.filterVerificationPanel.classList.add('flex');
    } else if (panel === 'method' && refs.filterMethodPanel) {
      refs.filterMethodPanel.classList.remove('hidden');
      refs.filterMethodPanel.classList.add('flex');
    } else if (panel === 'last_payment_date' && refs.filterLastPaymentDatePanel) {
      refs.filterLastPaymentDatePanel.classList.remove('hidden');
      refs.filterLastPaymentDatePanel.classList.add('flex');
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
    if (panel === 'source' || panel === 'status' || panel === 'verification' || panel === 'method' || panel === 'last_payment_date') {
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

  function getFilteredVendors() {
    return state.vendors.filter(function (vendor) {
      var matchesSearch = !state.search || [
        vendor.displayName,
        vendor.vendorId,
        vendor.primaryContact.name,
        vendor.primaryContact.email,
        vendor.sourceSystem,
        vendor.defaultPaymentMethod
      ].join(' ').toLowerCase().indexOf(state.search.toLowerCase()) !== -1;
      if (!matchesSearch) return false;
      if (state.selectedSources.size && !state.selectedSources.has(vendor.sourceSystem)) return false;
      if (state.selectedStatuses.size && !state.selectedStatuses.has(vendor.status)) return false;
      if (state.selectedVerifications.size && !state.selectedVerifications.has(vendor.verificationStatus)) return false;
      if (state.selectedMethods.size && !vendor.supportedPaymentMethods.some(function (method) {
        return state.selectedMethods.has(normalizeMethodKey(method));
      })) return false;
      if (state.lastPaymentDateFrom || state.lastPaymentDateTo) {
        var lastDate = toIsoDate(vendor.lastPaymentDate);
        if (!lastDate) return false;
        if (state.lastPaymentDateFrom && lastDate < state.lastPaymentDateFrom) return false;
        if (state.lastPaymentDateTo && lastDate > state.lastPaymentDateTo) return false;
      }
      return true;
    }).sort(function (a, b) {
      var left = a[state.sortKey];
      var right = b[state.sortKey];
      var dir = state.sortDirection === 'asc' ? 1 : -1;
      return compareValues(left, right) * dir;
    });
  }

  function getPagedVendors() {
    var vendors = getFilteredVendors();
    var start = (state.currentPage - 1) * state.pageSize;
    return vendors.slice(start, start + state.pageSize);
  }

  function renderSummary() {
    if (!refs.summary) return;
    var vendors = getFilteredVendors();
    var activeCount = vendors.filter(function (vendor) { return vendor.status === 'active'; }).length;
    var issuesCount = vendors.filter(function (vendor) { return vendor.status !== 'active'; }).length;
    var totalOutstanding = vendors.reduce(function (sum, vendor) { return sum + Number(vendor.outstandingAmount || 0); }, 0);
    refs.summary.innerHTML =
      '<div class="inline-flex items-center rounded-md bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 dark:bg-white/5 dark:text-gray-300">' + vendors.length + ' vendors</div>' +
      '<div class="inline-flex items-center rounded-md bg-green-50 px-3 py-2 text-sm font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">' + activeCount + ' active</div>' +
      '<div class="inline-flex items-center rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">' + issuesCount + ' need attention</div>' +
      '<div class="inline-flex items-center rounded-md bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">' + escapeHtml(formatMoney(totalOutstanding)) + ' outstanding</div>';
  }

  function buildTable() {
    if (!refs.table) return;
    var vendors = getPagedVendors();
    var filtered = getFilteredVendors();
    var columns = [
      { key: 'displayName', label: 'Vendor Name', sortable: true },
      { key: 'vendorId', label: 'Vendor ID', sortable: true },
      { key: 'status', label: 'Status', sortable: true },
      { key: 'outstandingAmount', label: 'Outstanding Amount', sortable: true },
      { key: 'totalPaid', label: 'Total Paid', sortable: true },
      { key: '_action', label: '', type: 'action' }
    ];

    if (!filtered.length) {
      refs.table.innerHTML = '<thead><tr>' + columns.map(function (col) {
        if (col.type === 'action') return '<th class="w-px px-4 py-3"></th>';
        return '<th class="border-b border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:border-white/10 dark:text-white">' + escapeHtml(col.label) + '</th>';
      }).join('') + '</tr></thead><tbody>' +
        '<tr><td colspan="6" class="px-0 py-6"><div class="mx-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50/80 px-6 py-10 text-center dark:border-white/10 dark:bg-white/5"><h3 class="text-sm font-semibold text-gray-900 dark:text-white">No vendors found</h3><p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Adjust the search or filters to find a vendor.</p></div></td></tr>' +
        '</tbody>';
      return;
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

    var headerHtml = '<thead><tr>' + columns.map(function (col) {
      if (col.type === 'action') return '<th class="w-px border-b border-gray-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-gray-900"></th>';
      var direction = state.sortKey === col.key ? state.sortDirection : '';
      var content = col.sortable
        ? '<button type="button" data-sort-key="' + escapeHtml(col.key) + '" class="group flex w-full cursor-pointer items-center gap-x-1.5 rounded-md text-left text-sm font-semibold text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-white"><span>' + escapeHtml(col.label) + '</span>' + buildSortBadgeHTML(direction) + '</button>'
        : escapeHtml(col.label);
      return '<th class="border-b border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:border-white/10 dark:text-white">' + content + '</th>';
    }).join('') + '</tr></thead>';

    var bodyHtml = vendors.map(function (vendor) {
      return '' +
        '<tr class="group hover:bg-gray-50 dark:hover:bg-white/5">' +
          '<td class="border-b border-gray-200 px-4 py-3 align-top dark:border-white/10"><a href="vendor-profile.html?id=' + encodeURIComponent(vendor.id) + '" class="text-sm font-semibold text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400">' + escapeHtml(vendor.displayName) + '</a><p class="mt-1 text-sm text-gray-500 dark:text-gray-400">' + escapeHtml(vendor.legalName) + '</p></td>' +
          '<td class="border-b border-gray-200 px-4 py-3 align-top text-sm text-gray-700 dark:border-white/10 dark:text-gray-300">' + escapeHtml(vendor.vendorId) + '</td>' +
          '<td class="border-b border-gray-200 px-4 py-3 align-top dark:border-white/10">' + getStatusBadge(vendor.status, vendor.statusLabel) + '</td>' +
          '<td class="border-b border-gray-200 px-4 py-3 align-top text-sm font-medium text-gray-900 dark:border-white/10 dark:text-white">' + escapeHtml(formatMoney(vendor.outstandingAmount)) + '</td>' +
          '<td class="border-b border-gray-200 px-4 py-3 align-top text-sm font-medium text-gray-900 dark:border-white/10 dark:text-white">' + escapeHtml(formatMoney(vendor.totalPaid)) + '</td>' +
          '<td class="border-b border-gray-200 bg-white px-4 py-3 align-top text-right dark:border-white/10 dark:bg-gray-900"><a href="vendor-profile.html?id=' + encodeURIComponent(vendor.id) + '" class="inline-flex items-center rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/5 dark:text-white dark:inset-ring-white/10 dark:hover:bg-white/10">View</a></td>' +
        '</tr>';
    }).join('');

    refs.table.innerHTML = headerHtml + '<tbody class="bg-white dark:bg-gray-900">' + bodyHtml + '</tbody>';
  }

  function renderPagination() {
    if (!refs.pagination) return;
    var filtered = getFilteredVendors();
    var totalPages = Math.max(1, Math.ceil(filtered.length / state.pageSize));
    if (state.currentPage > totalPages) state.currentPage = totalPages;
    var start = filtered.length ? ((state.currentPage - 1) * state.pageSize) + 1 : 0;
    var end = Math.min(filtered.length, state.currentPage * state.pageSize);
    refs.pagination.innerHTML =
      '<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">' +
        '<div class="flex items-center gap-3"><p class="text-sm text-gray-500 dark:text-gray-400">Showing <span class="font-medium text-gray-900 dark:text-white">' + start + '</span> to <span class="font-medium text-gray-900 dark:text-white">' + end + '</span> of <span class="font-medium text-gray-900 dark:text-white">' + filtered.length + '</span> vendors</p></div>' +
        '<div class="flex flex-col gap-3 sm:flex-row sm:items-center">' +
          '<label class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">Rows <select id="vendors-page-size-inline" class="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-white">' +
            PAGE_SIZE_OPTIONS.map(function (size) {
              return '<option value="' + size + '"' + (size === state.pageSize ? ' selected' : '') + '>' + size + '</option>';
            }).join('') +
          '</select></label>' +
          '<div class="flex items-center gap-2">' +
            '<button type="button" data-page-nav="prev" class="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/5 dark:text-white dark:inset-ring-white/10 dark:hover:bg-white/10"' + (state.currentPage === 1 ? ' disabled' : '') + '>Previous</button>' +
            '<span class="text-sm text-gray-500 dark:text-gray-400">Page ' + state.currentPage + ' of ' + totalPages + '</span>' +
            '<button type="button" data-page-nav="next" class="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/5 dark:text-white dark:inset-ring-white/10 dark:hover:bg-white/10"' + (state.currentPage === totalPages ? ' disabled' : '') + '>Next</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function render() {
    syncFilterUi();
    renderSummary();
    buildTable();
    renderPagination();
  }

  function bindEvents() {
    if (refs.search) {
      refs.search.addEventListener('input', function () {
        state.search = refs.search.value || '';
        state.currentPage = 1;
        render();
      });
    }

    if (refs.filterBtn && refs.filterMenu && refs.filterTrack && refs.filterRootPanel && refs.filterDetailSlot) {
      syncFilterUi = function () {
        syncSelectedFiltersToAvailable();
        renderSourceFilters();
        renderStatusFilters();
        renderVerificationFilters();
        renderMethodFilters();
        renderActiveFilters();
        if (refs.filterDateFromInput) refs.filterDateFromInput.value = state.lastPaymentDateFromDraft || formatIsoAsUsInput(state.lastPaymentDateFrom);
        if (refs.filterDateToInput) refs.filterDateToInput.value = state.lastPaymentDateToDraft || formatIsoAsUsInput(state.lastPaymentDateTo);
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
        var panelEl = checkbox.closest('#vendors-table-filter-sources, #vendors-table-filter-statuses, #vendors-table-filter-verifications, #vendors-table-filter-methods');
        var value = checkbox.getAttribute('data-filter-value');
        if (!panelEl || !value) return;
        if (panelEl.id === 'vendors-table-filter-sources') {
          if (checkbox.checked) state.selectedSources.add(value);
          else state.selectedSources.delete(value);
        } else if (panelEl.id === 'vendors-table-filter-statuses') {
          if (checkbox.checked) state.selectedStatuses.add(value);
          else state.selectedStatuses.delete(value);
        } else if (panelEl.id === 'vendors-table-filter-verifications') {
          if (checkbox.checked) state.selectedVerifications.add(value);
          else state.selectedVerifications.delete(value);
        } else {
          if (checkbox.checked) state.selectedMethods.add(value);
          else state.selectedMethods.delete(value);
        }
        syncFilterApplyButtonState();
        state.currentPage = 1;
        buildTable();
        renderActiveFilters();
        renderPagination();
        renderSummary();
      });

      function bindDateInput(inputEl, field) {
        if (!inputEl) return;
        inputEl.addEventListener('focus', function () {
          state.lastPaymentDateActiveField = field === 'to' ? 'to' : 'from';
        });
        inputEl.addEventListener('input', function () {
          var formatted = formatUsInput(inputEl.value);
          var iso = usInputToIso(formatted);
          inputEl.value = formatted;
          if (field === 'to') {
            state.lastPaymentDateToDraft = formatted;
            state.lastPaymentDateTo = iso || '';
          } else {
            state.lastPaymentDateFromDraft = formatted;
            state.lastPaymentDateFrom = iso || '';
          }
          if (state.lastPaymentDateFrom && state.lastPaymentDateTo && state.lastPaymentDateFrom > state.lastPaymentDateTo) {
            if (field === 'to') state.lastPaymentDateFrom = state.lastPaymentDateTo;
            else state.lastPaymentDateTo = state.lastPaymentDateFrom;
          }
          syncFilterApplyButtonState();
          state.currentPage = 1;
          buildTable();
          renderActiveFilters();
          renderPagination();
          renderSummary();
        });
      }

      bindDateInput(refs.filterDateFromInput, 'from');
      bindDateInput(refs.filterDateToInput, 'to');

      [refs.filterApplySourceBtn, refs.filterApplyStatusBtn, refs.filterApplyVerificationBtn, refs.filterApplyMethodBtn, refs.filterApplyDateBtn].forEach(function (btn) {
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
          if (type === 'verification') state.selectedVerifications.clear();
          if (type === 'method') state.selectedMethods.clear();
          if (type === 'last_payment_date') {
            state.lastPaymentDateFrom = '';
            state.lastPaymentDateTo = '';
            state.lastPaymentDateFromDraft = '';
            state.lastPaymentDateToDraft = '';
            if (refs.filterDateFromInput) refs.filterDateFromInput.value = '';
            if (refs.filterDateToInput) refs.filterDateToInput.value = '';
          }
          state.currentPage = 1;
          syncFilterUi();
          buildTable();
          renderPagination();
          renderSummary();
        });
      }

      if (!filterDismissHandler) {
        filterDismissHandler = function (event) {
          if (!refs.filterDropdown || !state.filterMenuOpen) return;
          if (refs.filterDropdown.contains(event.target)) return;
          setFilterMenuOpen(false);
          setFilterPanel('root');
        };
        document.addEventListener('click', filterDismissHandler);
      }

      if (!filterResizeHandler) {
        filterResizeHandler = function () {
          if (!state.filterMenuOpen) return;
          applyFilterMenuLayout();
          setFilterPanel(state.activeFilterPanel || 'root', true);
        };
        window.addEventListener('resize', filterResizeHandler);
      }
    }

    if (!globalHandlersBound) {
      sortAndPageClickHandler = function (event) {
        var sortTrigger = event.target.closest('[data-sort-key]');
        if (sortTrigger) {
          var key = sortTrigger.getAttribute('data-sort-key');
          if (state.sortKey === key) {
            state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
          } else {
            state.sortKey = key;
            state.sortDirection = 'asc';
          }
          render();
          return;
        }
        var pageTrigger = event.target.closest('[data-page-nav]');
        if (pageTrigger) {
          var direction = pageTrigger.getAttribute('data-page-nav');
          var totalPages = Math.max(1, Math.ceil(getFilteredVendors().length / state.pageSize));
          if (direction === 'prev' && state.currentPage > 1) state.currentPage -= 1;
          if (direction === 'next' && state.currentPage < totalPages) state.currentPage += 1;
          render();
        }
      };
      pageSizeChangeHandler = function (event) {
        if (event.target && event.target.id === 'vendors-page-size-inline') {
          state.pageSize = Number(event.target.value || DEFAULT_PAGE_SIZE);
          state.currentPage = 1;
          render();
        }
      };
      document.addEventListener('click', sortAndPageClickHandler);
      document.addEventListener('change', pageSizeChangeHandler);
      globalHandlersBound = true;
    }
  }

  function renderLoadingState() {
    if (!refs.table || !window.TableSkeleton) return;
    window.TableSkeleton.render({
      tableEl: refs.table,
      rowCount: 8,
      columns: [
        { key: 'vendorName', label: 'Vendor Name', sortable: true },
        { key: 'vendorId', label: 'Vendor ID', sortable: true },
        { key: 'status', label: 'Status', type: 'status', sortable: true },
        { key: 'outstandingAmount', label: 'Outstanding Amount', sortable: true },
        { key: 'totalPaid', label: 'Total Paid', sortable: true },
        { type: 'action' }
      ]
    });
  }

  function init() {
    initRefs();
    bindEvents();
    renderLoadingState();
    window.VendorsData.loadVendors()
      .then(function (vendors) {
        state.vendors = vendors;
        state.loading = false;
        render();
      })
      .catch(function () {
        state.vendors = [];
        state.loading = false;
        render();
      });
  }

  window.initVendorsPage = init;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

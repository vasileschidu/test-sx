/**
 * exchanges-table.js
 *
 * Loads exchange data from /src/data/exchanges.json and renders table rows.
 * Data remains in JSON so table content can be updated without editing HTML.
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
  var ACTION_SHADOW_SELECTOR = '[data-action-column-shadow]';
  var PAGINATION_SELECTOR = '[data-pagination-info]';

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

  var REQUIRED_KEYS = [
    'amount',
    'currency',
    'vendorEntry',
    'invoice',
    'customer',
    'dateInitiated',
    'paymentMethod',
    'status',
    'details',
  ];

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

  function hasRequiredKeys(entry) {
    return REQUIRED_KEYS.every(function (key) {
      return Object.prototype.hasOwnProperty.call(entry, key);
    });
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
    if (!entry || typeof entry !== 'object' || !hasRequiredKeys(entry)) {
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
      status: typeof entry.status === 'string' ? entry.status : 'Pending',
      details: normalizeDetails(entry.details),
    };
  }

  function getStatusClasses(status) {
    return STATUS_STYLES[status] || STATUS_STYLES.Pending;
  }

  function getColumnCount(table) {
    var headRow = table.querySelector('thead tr');
    if (!headRow) return 9;
    return headRow.querySelectorAll('th').length || 9;
  }

  function buildMainRowHTML(entry) {
    var badgeClasses = getStatusClasses(entry.status);
    var cb = CLASS_NAMES.cellBorder;

    return (
      '<tr data-row class="' + CLASS_NAMES.row + '">' +
        '<td class="py-2 pr-3 pl-4 whitespace-nowrap sm:pl-0' + cb + '">' +
          '<button data-row-toggle class="rounded-md p-1 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20">' +
            '<svg class="size-4 text-gray-600 dark:text-gray-300 transition-transform duration-200" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">' +
              '<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />' +
            '</svg>' +
          '</button>' +
        '</td>' +
        '<td class="px-2 py-2 text-sm font-medium whitespace-nowrap text-gray-900 dark:text-white' + cb + '">' +
          formatCurrency(entry.amount, entry.currency) +
          ' <span class="text-gray-500 dark:text-gray-400">' + escapeHtml(entry.currency) + '</span>' +
        '</td>' +
        '<td class="px-2 py-2 text-sm font-medium whitespace-nowrap text-gray-900 dark:text-white' + cb + '">' +
          escapeHtml(entry.vendorEntry) +
        '</td>' +
        '<td class="px-2 py-2 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400' + cb + '">' +
          escapeHtml(entry.invoice) +
        '</td>' +
        '<td class="px-2 py-2 text-sm font-medium whitespace-nowrap text-gray-900 dark:text-white' + cb + '">' +
          escapeHtml(entry.customer) +
        '</td>' +
        '<td class="px-2 py-2 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400' + cb + '">' +
          formatDate(entry.dateInitiated) +
        '</td>' +
        '<td class="px-2 py-2 text-sm font-medium whitespace-nowrap text-gray-900 dark:text-gray-400' + cb + '">' +
          escapeHtml(entry.paymentMethod) +
        '</td>' +
        '<td class="px-2 py-2 whitespace-nowrap' + cb + '">' +
          '<span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium inset-ring ' + badgeClasses + '">' +
            escapeHtml(entry.status) +
          '</span>' +
        '</td>' +
        '<td data-action-column class="' + CLASS_NAMES.actionCell + cb + '">' +
          '<button type="button" class="rounded-md bg-blue-600 px-2 py-1 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-blue-500 dark:shadow-none dark:hover:bg-blue-400 dark:focus-visible:outline-blue-500">Get paid</button>' +
        '</td>' +
      '</tr>'
    );
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

  function buildRowHTML(entry, colCount) {
    return (
      '<tbody class="' + CLASS_NAMES.tbody + '">' +
        buildMainRowHTML(entry) +
        buildDetailRowHTML(entry, colCount) +
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

  function initStickyActionShadow(table) {
    var scroller = table.closest(TABLE_SCROLL_SELECTOR) || table.closest('.overflow-x-auto');
    var shadow = document.querySelector(ACTION_SHADOW_SELECTOR);
    if (!scroller || !shadow) return function () {};

    function syncShadowVisibility() {
      var maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
      var isOverflowing = maxScrollLeft > 0.5;
      var isDark = document.documentElement.classList.contains('dark');
      var actionColumns = table.querySelectorAll(ACTION_COLUMN_SELECTOR);

      // Toggle sticky positioning based on whether the table overflows
      actionColumns.forEach(function (cell) {
        if (isOverflowing) {
          cell.classList.add('sticky', 'right-0', 'z-10');
        } else {
          cell.classList.remove('sticky', 'right-0', 'z-10');
        }
        applyActionDivider(cell, isOverflowing, isDark);
      });

      // Hide the legacy gradient shadow div — box-shadow on cells handles it
      shadow.style.display = 'none';
    }

    scroller.addEventListener('scroll', syncShadowVisibility, { passive: true });
    window.addEventListener('resize', syncShadowVisibility);
    syncShadowVisibility();

    return syncShadowVisibility;
  }

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

  function updatePagination(total) {
    var pagination = document.querySelector(PAGINATION_SELECTOR);
    if (!pagination) return;

    pagination.innerHTML =
      'Showing <span class="font-medium text-gray-900 dark:text-white">1</span> - ' +
      '<span class="font-medium text-gray-900 dark:text-white">' + total + '</span> of ' +
      '<span class="font-medium text-gray-900 dark:text-white">' + total + '</span> results';
  }

  function renderRows(table, entries) {
    var thead = table.querySelector('thead');
    if (!thead) return;

    table.querySelectorAll('tbody').forEach(function (tbody) {
      tbody.remove();
    });

    var html = '';
    var colCount = getColumnCount(table);
    if (!entries.length) {
      html = buildEmptyStateHTML(colCount);
    } else {
      entries.forEach(function (entry) {
        html += buildRowHTML(entry, colCount);
      });
    }

    thead.insertAdjacentHTML('afterend', html);
    attachToggleListeners(table);
  }

  function getJsonPathCandidates() {
    var candidates = JSON_PATH_FALLBACKS.slice();
    if (document.currentScript && document.currentScript.src) {
      try {
        candidates.unshift(new URL('../data/exchanges.json', document.currentScript.src).toString());
      } catch (err) {
        // Ignore URL parse errors and continue with fallback paths.
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
      if (!Array.isArray(payload)) {
        throw new Error('Expected JSON array in exchanges data');
      }

      return payload
        .map(normalizeEntry)
        .filter(function (entry) { return entry !== null; });
    });
  }

  function init() {
    var table = document.getElementById(TABLE_ID);
    if (!table) return;

    attachToggleListeners(table);
    var refreshStickyActionShadow = initStickyActionShadow(table);

    fetchExchangesData()
      .then(function (entries) {
        renderRows(table, entries);
        updatePagination(entries.length);
        refreshStickyActionShadow();
      })
      .catch(function (error) {
        console.error('Failed to load exchanges data:', error);
        renderRows(table, []);
        updatePagination(0);
        refreshStickyActionShadow();
      });
  }

  init();
})();

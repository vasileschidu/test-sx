(function () {
  'use strict';

  var STATUS_STYLES = {
    active: 'bg-green-50 text-green-700 inset-ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:inset-ring-green-500/20',
    needs_verification: 'bg-amber-50 text-amber-700 inset-ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:inset-ring-amber-400/20',
    exception: 'bg-red-50 text-red-700 inset-ring-red-600/10 dark:bg-red-400/10 dark:text-red-400 dark:inset-ring-red-400/20',
    inactive: 'bg-gray-50 text-gray-600 inset-ring-gray-500/10 dark:bg-white/10 dark:text-gray-300 dark:inset-ring-white/15',
    blocked: 'bg-red-50 text-red-700 inset-ring-red-600/10 dark:bg-red-400/10 dark:text-red-400 dark:inset-ring-red-400/20'
  };

  var VERIFICATION_STYLES = {
    verified: 'bg-green-50 text-green-700 inset-ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:inset-ring-green-500/20',
    pending: 'bg-amber-50 text-amber-700 inset-ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:inset-ring-amber-400/20',
    action_required: 'bg-red-50 text-red-700 inset-ring-red-600/10 dark:bg-red-400/10 dark:text-red-400 dark:inset-ring-red-400/20'
  };

  var READY_PAYABLE_STATUS_STYLE = 'bg-gray-50 text-gray-600 inset-ring-gray-500/10 dark:bg-white/10 dark:text-gray-300 dark:inset-ring-white/15';
  var PAY_PAGE_VIEW_CONTEXT_STORAGE_KEY = 'bp-pay-page-view-context-v1';
  var vendorPayablesSelectedIds = new Set();
  var currentVendorProfile = null;

  function qs(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return window.VendorsData.escapeHtml(value);
  }

  function formatMoney(value) {
    return window.VendorsData.formatMoney(value, 'USD');
  }

  function formatDate(value) {
    return window.VendorsData.formatDate(value);
  }

  function formatLongDate(value) {
    if (!value) return '--';
    var normalized = String(value).slice(0, 10);
    var date = new Date(normalized + 'T00:00:00');
    if (isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  function formatDateTime(value) {
    return window.VendorsData.formatDateTime(value);
  }

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getStatusBadge(status, label) {
    return '<span class="inline-flex h-[28px] items-center rounded-md px-2 text-xs font-medium leading-5 inset-ring ' + (STATUS_STYLES[status] || STATUS_STYLES.active) + '">' + escapeHtml(label) + '</span>';
  }

  function getVerificationBadge(status, label) {
    return '<span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium inset-ring ' + (VERIFICATION_STYLES[status] || VERIFICATION_STYLES.verified) + '">' + escapeHtml(label) + '</span>';
  }

  function getHeroMetaIcon(type) {
    if (type === 'payment') {
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-5 text-gray-400 dark:text-gray-500"><path d="M11.584 2.376a.75.75 0 0 1 .832 0l9 6a.75.75 0 1 1-.832 1.248L12 3.901 3.416 9.624a.75.75 0 0 1-.832-1.248l9-6Z" /><path fill-rule="evenodd" d="M20.25 10.332v9.918H21a.75.75 0 0 1 0 1.5H3a.75.75 0 0 1 0-1.5h.75v-9.918a.75.75 0 0 1 .634-.74A49.109 49.109 0 0 1 12 9c2.59 0 5.134.202 7.616.592a.75.75 0 0 1 .634.74Zm-7.5 2.418a.75.75 0 0 0-1.5 0v6.75a.75.75 0 0 0 1.5 0v-6.75Zm3-.75a.75.75 0 0 1 .75.75v6.75a.75.75 0 0 1-1.5 0v-6.75a.75.75 0 0 1 .75-.75ZM9 12.75a.75.75 0 0 0-1.5 0v6.75a.75.75 0 0 0 1.5 0v-6.75Z" clip-rule="evenodd" /><path d="M12 7.875a1.125 1.125 0 1 0 0-2.25 1.125 1.125 0 0 0 0 2.25Z" /></svg>';
    }
    if (type === 'email') {
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-5 text-gray-400 dark:text-gray-500"><path d="M1.5 8.67v8.58a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V8.67l-8.928 5.493a3 3 0 0 1-3.144 0L1.5 8.67Z" /><path d="M22.5 6.908V6.75a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3v.158l9.714 5.978a1.5 1.5 0 0 0 1.572 0L22.5 6.908Z" /></svg>';
    }
    if (type === 'verification') {
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="size-5 text-gray-400 dark:text-gray-500"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m6 2.25c0 5.186-3.954 9.45-9 9.95-5.046-.5-9-4.764-9-9.95V6.844c0-.59.325-1.13.844-1.404l7.5-3.75a1.875 1.875 0 0 1 1.312 0l7.5 3.75c.52.274.844.814.844 1.404V12Z" /></svg>';
    }
    if (type === 'date') {
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="size-5 text-gray-400 dark:text-gray-500"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3.75 8.25h16.5M4.5 5.25h15A1.5 1.5 0 0 1 21 6.75v12A1.5 1.5 0 0 1 19.5 20.25h-15A1.5 1.5 0 0 1 3 18.75v-12a1.5 1.5 0 0 1 1.5-1.5Z" /></svg>';
    }
    if (type === 'id') {
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="size-5 text-gray-400 dark:text-gray-500"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25H18A2.25 2.25 0 0 1 20.25 7.5v10.125A2.625 2.625 0 0 1 17.625 20.25H8.25A2.25 2.25 0 0 1 6 18V15.75m9.75-10.5H9A2.25 2.25 0 0 0 6.75 7.5v9A2.25 2.25 0 0 0 9 18.75h6.75A2.25 2.25 0 0 0 18 16.5v-9a2.25 2.25 0 0 0-2.25-2.25Z" /></svg>';
    }
    return '';
  }

  function buildHeroMetaItem(iconType, content) {
    return '<div class="inline-flex min-w-0 items-center gap-2 text-sm text-gray-600 dark:text-gray-300">' + getHeroMetaIcon(iconType) + '<span class="min-w-0">' + content + '</span></div>';
  }

  function buildDefinitionRow(label, value, isMultiline) {
    return '<div class="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0"><dt class="text-sm/6 font-medium text-gray-900 dark:text-white">' + escapeHtml(label) + '</dt><dd class="mt-1 text-sm/6 text-gray-700 dark:text-gray-300 sm:col-span-2 sm:mt-0' + (isMultiline ? ' whitespace-pre-line' : '') + '">' + value + '</dd></div>';
  }

  function buildSummaryRow(label, value, isMultiline) {
    return (
      '<div class="px-0 py-4 sm:grid sm:grid-cols-3 sm:gap-6">' +
        '<dt class="text-sm/6 text-gray-500 dark:text-gray-400">' + escapeHtml(label) + '</dt>' +
        '<dd class="mt-1 text-sm/6 text-gray-900 dark:text-white sm:col-span-2 sm:mt-0' + (isMultiline ? ' whitespace-pre-line' : '') + '">' + value + '</dd>' +
      '</div>'
    );
  }

  function buildSharedDescriptionItem(label, value, isMultiline) {
    if (window.PPComponents && typeof window.PPComponents.buildDescriptionListItem === 'function') {
      return window.PPComponents.buildDescriptionListItem(label, value, { multiline: !!isMultiline });
    }
    return (
      '<div class="flex flex-col gap-1 self-stretch py-4">' +
        '<dt class="text-sm/6 font-medium text-gray-900 dark:text-gray-100">' + escapeHtml(label) + '</dt>' +
        '<dd class="text-sm/6 font-normal text-gray-700 dark:text-gray-300' + (isMultiline ? ' whitespace-pre-line' : '') + '">' + value + '</dd>' +
      '</div>'
    );
  }

  function buildHorizontalDescriptionItem(label, value, isMultiline) {
    return '<div class="grid grid-cols-2 gap-4 self-stretch py-4' + (isMultiline ? ' items-start' : '') + '">' +
      '<dt class="text-sm font-medium text-gray-900 dark:text-gray-100">' + escapeHtml(label) + '</dt>' +
      '<dd class="text-sm font-normal text-gray-700 dark:text-gray-300' + (isMultiline ? ' whitespace-pre-line' : '') + '">' + value + '</dd>' +
    '</div>';
  }

  function buildMethodDetailRow(label, value, isMultiline) {
    return '<div class="grid grid-cols-2 gap-4 self-stretch' + (isMultiline ? ' items-start' : '') + '">' +
      '<span class="text-sm font-medium text-gray-900 dark:text-gray-100">' + escapeHtml(label) + '</span>' +
      '<span class="text-sm font-normal text-gray-700 dark:text-gray-300' + (isMultiline ? ' whitespace-pre-line' : '') + '">' + value + '</span>' +
    '</div>';
  }

  function isPastDue(dateValue) {
    if (!dateValue) return false;
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var date = new Date(String(dateValue).slice(0, 10) + 'T00:00:00');
    if (isNaN(date.getTime())) return false;
    return date < today;
  }

  function getReadyPayablesForVendor(vendor) {
    return (vendor && Array.isArray(vendor.linkedPayables) ? vendor.linkedPayables : [])
      .filter(function (row) {
        return row && row.status === 'ready_to_pay';
      })
      .sort(function (a, b) {
        return String(a && a.dueDate || '').localeCompare(String(b && b.dueDate || ''));
      });
  }

  function syncVendorPayablesState(rows) {
    var validIds = new Set((rows || []).map(function (row) {
      return String(row.id);
    }));
    Array.from(vendorPayablesSelectedIds).forEach(function (id) {
      if (!validIds.has(String(id))) vendorPayablesSelectedIds.delete(id);
    });
  }

  function buildVendorPayablesStatusBadge(row) {
    return '<span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium inset-ring ' + READY_PAYABLE_STATUS_STYLE + '">' +
      escapeHtml((row && row.statusLabel) || 'Ready to Pay') +
    '</span>';
  }

  function buildVendorPayablesEmptyState() {
    return '<tbody class="bg-white dark:bg-gray-900"><tr><td colspan="7" class="px-0 py-4">' +
      '<div class="flex w-full flex-col items-center rounded-2xl border border-dashed border-gray-300 bg-gray-50/80 px-6 py-8 text-center dark:border-white/10 dark:bg-white/5">' +
        '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6 text-gray-400 dark:text-gray-500"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>' +
        '<h3 class="mt-3 text-sm font-semibold text-gray-900 dark:text-white">No ready payables</h3>' +
        '<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">This vendor does not have any payables currently ready for payment.</p>' +
      '</div>' +
    '</td></tr></tbody>';
  }

  function buildVendorPayablesTable(rows) {
    if (!rows.length) return buildVendorPayablesEmptyState();

    var allSelected = rows.length > 0 && rows.every(function (row) {
      return vendorPayablesSelectedIds.has(String(row.id));
    });

    var headerHtml =
      '<thead class="bg-white dark:bg-gray-900">' +
        '<tr class="h-14">' +
          '<th class="h-14 w-10 min-w-10 border-b border-gray-200 px-0 py-4 align-middle text-center text-sm font-semibold whitespace-nowrap text-gray-900 dark:border-white/10 dark:text-white">' +
            '<div class="flex h-6 items-center justify-center">' +
              '<label class="inline-flex items-center justify-center cursor-pointer select-none">' +
                '<span class="group grid size-4 grid-cols-1">' +
                  '<input id="vendor-payables-select-all" type="checkbox" class="col-start-1 row-start-1 appearance-none rounded-sm border border-gray-300 bg-white checked:border-blue-600 checked:bg-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-white/20 dark:bg-white/5 dark:checked:border-blue-500 dark:checked:bg-blue-500" ' + (allSelected ? 'checked' : '') + ' />' +
                  '<svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white"><path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-checked:opacity-100" /></svg>' +
                '</span>' +
              '</label>' +
            '</div>' +
          '</th>' +
          '<th class="h-14 border-b border-gray-200 px-2 py-4 align-middle text-left text-sm font-semibold whitespace-nowrap text-gray-900 dark:border-white/10 dark:text-white">Amount</th>' +
          '<th class="h-14 border-b border-gray-200 px-2 py-4 align-middle text-left text-sm font-semibold whitespace-nowrap text-gray-900 dark:border-white/10 dark:text-white">Bill #</th>' +
          '<th class="h-14 border-b border-gray-200 px-2 py-4 align-middle text-left text-sm font-semibold whitespace-nowrap text-gray-900 dark:border-white/10 dark:text-white">Source</th>' +
          '<th class="h-14 border-b border-gray-200 px-2 py-4 align-middle text-left text-sm font-semibold whitespace-nowrap text-gray-900 dark:border-white/10 dark:text-white">Due Date</th>' +
          '<th class="h-14 border-b border-gray-200 px-2 py-4 align-middle text-left text-sm font-semibold whitespace-nowrap text-gray-900 dark:border-white/10 dark:text-white">Status</th>' +
          '<th class="h-14 w-px border-b border-gray-200 bg-white px-3 py-4 align-middle whitespace-nowrap dark:border-white/10 dark:bg-gray-900 sm:pr-2"><span class="sr-only">Action</span></th>' +
        '</tr>' +
      '</thead>';

    var bodyRows = rows.map(function (row, rowIndex) {
      var isLastRow = rowIndex === rows.length - 1;
      var borderClass = isLastRow ? '' : ' border-b border-gray-200 dark:border-white/10';
      var payHref = './payables-pay.html?view=pay&tab=ready_to_pay&id=' + encodeURIComponent(String(row.id || '')) + '&bill=' + encodeURIComponent(String(row.billNumber || ''));
      var rowHtml =
        '<tr class="group hover:bg-gray-50 dark:hover:bg-white/5">' +
          '<td class="h-12 align-middle py-2 px-0 text-center whitespace-nowrap' + borderClass + '">' +
            '<div class="flex h-6 items-center justify-center">' +
              '<span class="group inline-grid size-4 grid-cols-1">' +
                '<input type="checkbox" data-vendor-payable-select-id="' + escapeHtml(String(row.id)) + '" class="col-start-1 row-start-1 appearance-none rounded-sm border border-gray-300 bg-white checked:border-blue-600 checked:bg-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-white/20 dark:bg-white/5 dark:checked:border-blue-500 dark:checked:bg-blue-500" ' + (vendorPayablesSelectedIds.has(String(row.id)) ? 'checked' : '') + ' />' +
                '<svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white"><path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-checked:opacity-100" /></svg>' +
              '</span>' +
            '</div>' +
          '</td>' +
          '<td class="h-12 align-middle py-2 px-2 text-sm font-medium whitespace-nowrap text-gray-900 dark:text-white' + borderClass + '">' + escapeHtml(window.VendorsData.formatMoney(row.amount, row.currency)) + ' <span class="text-gray-500 dark:text-gray-400">' + escapeHtml(row.currency || 'USD') + '</span></td>' +
          '<td class="h-12 align-middle px-2 py-2 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400' + borderClass + '">' + escapeHtml(row.billNumber || '--') + '</td>' +
          '<td class="h-12 align-middle py-2 px-2 text-sm font-medium whitespace-nowrap text-gray-900 dark:text-white' + borderClass + '">' + escapeHtml(row.source || '--') + '</td>' +
          '<td class="h-12 align-middle px-2 py-2 text-sm whitespace-nowrap' + borderClass + '">' +
            '<span class="inline-flex items-center ' + (isPastDue(row.dueDate) ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400') + '">' + escapeHtml(formatDate(row.dueDate)) + '</span>' +
          '</td>' +
          '<td class="h-12 align-middle px-2 py-2 whitespace-nowrap' + borderClass + '">' + buildVendorPayablesStatusBadge(row) + '</td>' +
          '<td class="h-12 align-middle py-2 pr-3 pl-3 whitespace-nowrap w-px text-right text-sm font-medium' + borderClass + ' bg-white dark:bg-gray-900 sm:pr-2">' +
            '<a href="' + payHref + '" data-vendor-pay-link="' + escapeHtml(String(row.id || '')) + '" class="inline-flex cursor-pointer rounded-md bg-blue-600 px-2 py-1 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus-visible:outline-blue-500">Pay</a>' +
          '</td>' +
        '</tr>';
      return rowHtml;
    }).join('');

    return headerHtml + '<tbody class="bg-white dark:bg-gray-900">' + bodyRows + '</tbody>';
  }

  function ensureVendorPayablesInteractions(wrap) {
    if (!wrap || wrap.__vendorPayablesBound) return;
    wrap.addEventListener('click', function (event) {
      var payLink = event.target.closest('[data-vendor-pay-link]');
      if (!payLink || !currentVendorProfile) return;
      var rowId = String(payLink.getAttribute('data-vendor-pay-link') || '').trim();
      if (!rowId) return;
      var rows = getReadyPayablesForVendor(currentVendorProfile);
      var row = rows.find(function (item) { return String(item.id) === rowId; }) || null;
      if (!row) return;
      try {
        window.sessionStorage.setItem(PAY_PAGE_VIEW_CONTEXT_STORAGE_KEY, JSON.stringify(cloneJson(row)));
      } catch (err) {
        // Ignore storage failures and still allow navigation.
      }
    });

    wrap.addEventListener('change', function (event) {
      if (!currentVendorProfile) return;
      var selectAll = event.target.closest('#vendor-payables-select-all');
      if (selectAll) {
        var rows = getReadyPayablesForVendor(currentVendorProfile);
        if (selectAll.checked) {
          rows.forEach(function (row) { vendorPayablesSelectedIds.add(String(row.id)); });
        } else {
          rows.forEach(function (row) { vendorPayablesSelectedIds.delete(String(row.id)); });
        }
        renderLinkedPayables(currentVendorProfile);
        return;
      }

      var rowSelect = event.target.closest('[data-vendor-payable-select-id]');
      if (!rowSelect) return;
      var rowId = String(rowSelect.getAttribute('data-vendor-payable-select-id') || '');
      if (!rowId) return;
      if (rowSelect.checked) {
        vendorPayablesSelectedIds.add(rowId);
      } else {
        vendorPayablesSelectedIds.delete(rowId);
      }
      renderLinkedPayables(currentVendorProfile);
    });

    wrap.__vendorPayablesBound = true;
  }

  function buildBankMethodIcon() {
    return '<div class="shrink-0 text-gray-500 dark:text-gray-400">' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 18 18" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M8.7075 1.86718C8.8929 1.77767 9.10901 1.77767 9.29441 1.86718L15.8194 5.01718C16.1552 5.17925 16.2959 5.58279 16.1339 5.9185C15.9827 6.23168 15.6213 6.37521 15.301 6.26151V14.85H15.526C15.8988 14.85 16.201 15.1523 16.201 15.525C16.201 15.8978 15.8988 16.2 15.526 16.2H2.47594C2.10314 16.2 1.80094 15.8978 1.80094 15.525C1.80094 15.1523 2.10314 14.85 2.47594 14.85H2.70094V6.26151C2.38057 6.37521 2.01925 6.23168 1.86806 5.9185C1.70599 5.58279 1.84676 5.17925 2.18248 5.01718L8.7075 1.86718ZM9.90081 5.40005C9.90081 5.89711 9.49786 6.30005 9.0008 6.30005C8.50375 6.30005 8.1008 5.89711 8.1008 5.40005C8.1008 4.90299 8.50375 4.50005 9.0008 4.50005C9.49786 4.50005 9.90081 4.90299 9.90081 5.40005ZM6.7508 8.77505C6.7508 8.40226 6.44859 8.10005 6.07579 8.10005C5.703 8.10005 5.40079 8.40226 5.40079 8.77505V13.725C5.40079 14.0978 5.703 14.4 6.07579 14.4C6.44859 14.4 6.7508 14.0978 6.7508 13.725V8.77505ZM9.6758 8.77505C9.6758 8.40226 9.3736 8.10005 9.0008 8.10005C8.62801 8.10005 8.3258 8.40226 8.3258 8.77505V13.725C8.3258 14.0978 8.62801 14.4 9.0008 14.4C9.3736 14.4 9.6758 14.0978 9.6758 13.725V8.77505ZM12.6008 8.77505C12.6008 8.40226 12.2986 8.10005 11.9258 8.10005C11.553 8.10005 11.2508 8.40226 11.2508 8.77505V13.725C11.2508 14.0978 11.553 14.4 11.9258 14.4C12.2986 14.4 12.6008 14.0978 12.6008 13.725V8.77505Z" fill="#6B7280"/></svg>' +
    '</div>';
  }

  function getCardBrandLogoMarkup(brand, size) {
    if (window.PPComponents && typeof window.PPComponents.getCardBrandLogoMarkup === 'function') {
      return window.PPComponents.getCardBrandLogoMarkup(brand, size);
    }
    var normalized = String(brand || '').toLowerCase();
    if (normalized === 'american express') normalized = 'amex';
    if (normalized === 'master card') normalized = 'mastercard';

    if (normalized === 'mastercard') {
      var mcSizeClass = size === 'medium' ? 'h-4 w-6' : 'h-4 w-8';
      return '<img src="../../../src/assets/illustrations/ma_symbol.svg" alt="Mastercard" class="' + mcSizeClass + '" />';
    }

    if (normalized === 'visa') {
      return '<svg width="24" height="16" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Visa" role="img"><rect width="24" height="16" rx="1.2" fill="url(#visa-grad-vendor-profile)" /><path d="M12.309 7.05313C12.2987 7.85651 13.0305 8.30487 13.5818 8.57141C14.1483 8.84493 14.3385 9.0203 14.3364 9.26485C14.3321 9.6392 13.8845 9.80438 13.4656 9.81081C12.7349 9.82208 12.3101 9.61506 11.9722 9.45846L11.709 10.6807C12.0479 10.8357 12.6754 10.9708 13.3262 10.9767C14.8536 10.9767 15.853 10.2286 15.8584 9.06857C15.8644 7.5964 13.8061 7.51489 13.8202 6.85684C13.8251 6.65733 14.0169 6.44442 14.4374 6.39025C14.6455 6.3629 15.2201 6.34198 15.8714 6.63963L16.127 5.45708C15.7768 5.33051 15.3266 5.2093 14.7661 5.2093C13.3283 5.2093 12.3171 5.96764 12.309 7.05313ZM18.5836 5.3112C18.3047 5.3112 18.0696 5.47263 17.9647 5.7204L15.7827 10.8899H17.3091L17.6129 10.057H19.4781L19.6543 10.8899H20.9996L19.8257 5.3112H18.5836ZM18.7971 6.81822L19.2376 8.91304H18.0312L18.7971 6.81822ZM10.4583 5.3112L9.25517 10.8899H10.7096L11.9122 5.3112H10.4583ZM8.3066 5.3112L6.79266 9.10825L6.18028 5.87969C6.1084 5.51929 5.82464 5.3112 5.50953 5.3112H3.03459L3 5.47317C3.50807 5.58257 4.08532 5.75902 4.43502 5.9478C4.64906 6.0631 4.71013 6.16393 4.7804 6.43798L5.9403 10.8899H7.47747L9.83404 5.3112H8.3066Z" fill="white" /><defs><linearGradient id="visa-grad-vendor-profile" x1="10.7812" y1="16" x2="15.6708" y2="0.32624" gradientUnits="userSpaceOnUse"><stop stop-color="#222357" /><stop offset="1" stop-color="#254AA5" /></linearGradient></defs></svg>';
    }

    return '<span class="inline-flex w-fit items-center rounded-[4px] bg-gray-800 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">' + escapeHtml(brand || 'Card') + '</span>';
  }

  function buildMiniCard(brand, last4) {
    if (window.PPComponents && typeof window.PPComponents.createMiniCardComponent === 'function') {
      return '<div class="shrink-0">' + window.PPComponents.createMiniCardComponent({
        brand: brand,
        last4: last4
      }) + '</div>';
    }
    return '<div class="shrink-0">' + getCardBrandLogoMarkup(brand, 'medium') + '</div>';
  }

  function buildVendorCardDetailBody(card, vendor) {
    var idSuffix = String(card.id || 'card').replace(/[^a-zA-Z0-9_-]/g, '-');
    var copyIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4 shrink-0 text-gray-400 dark:text-gray-500"><path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z" /><path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z" /></svg>';
    var fullNumber = String(card.fullNumber || card.cardNumber || '').replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').trim();
    var expiry = card.expiry || card.expDate || '--';
    var cvc2 = card.cvc2 || card.cvv || '--';
    return '<div class="flex flex-col items-start gap-2 self-stretch rounded-md bg-gray-50 px-4 py-3 dark:bg-white/5">' +
      buildMethodDetailRow('Cardholder Name', escapeHtml(card.cardholderName || vendor.displayName || '--')) +
      buildMethodDetailRow('Cardholder Address', escapeHtml(card.cardholderAddress || '--'), true) +
      buildMethodDetailRow('Type', getCardBrandLogoMarkup(card.brand, 'medium')) +
      '<div class="grid grid-cols-2 gap-4 self-stretch"><span class="text-sm font-medium text-gray-900 dark:text-gray-100">Card Number</span><button type="button" data-copy-id="vendor-card-number-' + idSuffix + '" class="copy-btn -ml-1 inline-flex w-fit items-center gap-1.5 rounded-md px-1.5 py-0.5 text-gray-700 transition-colors hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-white/20 cursor-pointer"><span id="vendor-card-number-' + idSuffix + '" class="text-sm font-normal text-gray-700 dark:text-gray-300">' + escapeHtml(fullNumber || '--') + '</span>' + copyIcon + '</button></div>' +
      '<div class="grid grid-cols-2 gap-4 self-stretch"><span class="text-sm font-medium text-gray-900 dark:text-gray-100">Expires</span><button type="button" data-copy-id="vendor-card-expiry-' + idSuffix + '" class="copy-btn -ml-1 inline-flex w-fit items-center gap-1.5 rounded-md px-1.5 py-0.5 text-gray-700 transition-colors hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-white/20 cursor-pointer"><span id="vendor-card-expiry-' + idSuffix + '" class="text-sm font-normal text-gray-700 dark:text-gray-300">' + escapeHtml(expiry) + '</span>' + copyIcon + '</button></div>' +
      '<div class="grid grid-cols-2 gap-4 self-stretch"><span class="text-sm font-medium text-gray-900 dark:text-gray-100">CVC2</span><button type="button" data-copy-id="vendor-card-cvc-' + idSuffix + '" class="copy-btn -ml-1 inline-flex w-fit items-center gap-1.5 rounded-md px-1.5 py-0.5 text-gray-700 transition-colors hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-white/20 cursor-pointer"><span id="vendor-card-cvc-' + idSuffix + '" class="text-sm font-normal text-gray-700 dark:text-gray-300">' + escapeHtml(cvc2) + '</span>' + copyIcon + '</button></div>' +
    '</div>';
  }

  function buildMethodAccordionRow(iconHtml, title, subtitle, bodyHtml, open) {
    return '<details class="group rounded-md"' + (open ? ' open' : '') + '>' +
      '<summary class="flex list-none items-center gap-4 rounded-2xl bg-gray-50 px-4 py-6 cursor-pointer dark:bg-white/5">' +
        '<span class="shrink-0 text-gray-400 transition-transform group-open:rotate-90 dark:text-gray-500">' +
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-5"><path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>' +
        '</span>' +
        '<div class="flex min-w-0 flex-1 items-center gap-4">' +
          iconHtml +
          '<div class="min-w-0">' +
            '<p class="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">' + title + '</p>' +
            '<p class="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">' + subtitle + '</p>' +
          '</div>' +
        '</div>' +
        '<span class="shrink-0 text-gray-400 dark:text-gray-500">' +
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-5"><path d="M10 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM11.5 15.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0Z" /></svg>' +
        '</span>' +
      '</summary>' +
      '<div class="mt-3 flex flex-col items-start self-stretch">' +
        bodyHtml +
      '</div>' +
    '</details>';
  }

  function createSharedAccountDetailsComponent(config) {
    if (!window.PPComponents || typeof window.PPComponents.createAccountDetailsComponent !== 'function') {
      return null;
    }
    return window.PPComponents.createAccountDetailsComponent(config);
  }

  function renderAlert(vendor) {
    return;
  }

  function renderHero(vendor) {
    qs('vendor-profile-name').textContent = vendor.displayName;
    var vendorIdLabel = qs('vendor-profile-vendor-id');
    if (vendorIdLabel) vendorIdLabel.textContent = vendor.vendorId || '--';
    var vendorIdCopySource = qs('vendor-profile-vendor-id-copy-source');
    if (vendorIdCopySource) vendorIdCopySource.textContent = vendor.vendorId;
    var statusBadge = qs('vendor-profile-status-badge');
    if (statusBadge) statusBadge.innerHTML = getStatusBadge(vendor.status, vendor.statusLabel);
    var meta = qs('vendor-profile-meta');
    if (meta) {
      var defaultBankAccount = Array.isArray(vendor.bankAccounts) && vendor.bankAccounts.length
        ? vendor.bankAccounts[0]
        : null;
      var methodLabel = defaultBankAccount
        ? escapeHtml((defaultBankAccount.bankName || 'Bank account') + ' ' + (defaultBankAccount.maskedAccount || '--'))
        : '';
      var emailLabel = String((vendor.primaryContact && vendor.primaryContact.email) || '').trim();
      var showLastPayment = !!vendor.lastPaymentDate;
      var items = [];
      if (methodLabel) items.push(buildHeroMetaItem('payment', methodLabel));
      if (emailLabel) items.push(buildHeroMetaItem('email', escapeHtml(emailLabel)));
      if (showLastPayment) items.push(buildHeroMetaItem('date', escapeHtml(formatDate(vendor.lastPaymentDate))));
      meta.innerHTML = items.join('');
    }
    renderAlert(vendor);
  }

  function renderOverview(vendor) {
    var overview = qs('vendor-profile-overview');
    if (!overview) return;
    var onboardedSince = (vendor.auditLog || [])
      .map(function (entry) { return entry && entry.timestamp ? String(entry.timestamp) : ''; })
      .filter(Boolean)
      .sort()[0] || '';
    var primaryAddress = vendor.addresses && vendor.addresses.length ? vendor.addresses[0] : null;
    var addressValue = primaryAddress && primaryAddress.formatted
      ? escapeHtml(primaryAddress.formatted).replace(/\n/g, '<br>')
      : '--';
    var entityType = vendor.taxInfo && String(vendor.taxInfo.classification || '').toLowerCase() === 'individual'
      ? 'Individual'
      : 'Business';
    var tinValue = vendor.taxInfo && vendor.taxInfo.einMasked
      ? '<span class="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 inset-ring inset-ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:inset-ring-emerald-400/20">Present</span>'
      : '--';
    overview.innerHTML =
      '<div>' +
        '<div class="px-0 py-2">' +
          '<h3 class="text-base/7 font-semibold text-gray-900 dark:text-white">Details</h3>' +
        '</div>' +
        '<div class="mt-3 h-px bg-gray-200 dark:bg-white/10"></div>' +
        '<dl class="divide-y divide-gray-100 dark:divide-white/10">' +
          buildHorizontalDescriptionItem('Entity Type', escapeHtml(entityType)) +
          buildHorizontalDescriptionItem('Business Name', escapeHtml(vendor.displayName || vendor.legalName || '--')) +
          buildHorizontalDescriptionItem('Onboarded Since', escapeHtml(formatLongDate(onboardedSince))) +
          buildHorizontalDescriptionItem('Billing Address', addressValue, true) +
          buildHorizontalDescriptionItem('Payment Terms', escapeHtml(vendor.paymentTerms || '--')) +
          buildHorizontalDescriptionItem('TIN', tinValue) +
        '</dl>' +
      '</div>';
  }

  function renderContactInformation(vendor) {
    var contact = qs('vendor-profile-contact');
    if (!contact) return;
    contact.innerHTML =
      '<div class="rounded-2xl bg-gray-50 p-5 dark:bg-white/5">' +
        '<div class="px-0 py-0">' +
          '<h3 class="text-base/7 font-semibold text-gray-900 dark:text-white">Contact Information</h3>' +
        '</div>' +
        '<div class="mt-4 h-px bg-gray-200 dark:bg-white/10"></div>' +
        '<dl class="divide-y divide-gray-100 dark:divide-white/10">' +
          buildSharedDescriptionItem('Primary Contact', escapeHtml((vendor.primaryContact && vendor.primaryContact.name) || '--')) +
          buildSharedDescriptionItem('Email Address', escapeHtml((vendor.primaryContact && vendor.primaryContact.email) || '--')) +
          buildSharedDescriptionItem('Phone Number', escapeHtml((vendor.primaryContact && vendor.primaryContact.phone) || '--')) +
          buildSharedDescriptionItem('Remittance Emails', escapeHtml((vendor.remittanceEmails || []).join(', ') || '--'), true) +
          buildSharedDescriptionItem('Remittance Phones', escapeHtml((vendor.remittancePhones || []).join(', ') || '--'), true) +
        '</dl>' +
      '</div>';
  }

  function renderPaymentMethods(vendor) {
    var wrap = qs('vendor-profile-methods');
    if (!wrap) return;
    var fallbackCards = [];

    wrap.innerHTML =
      '<div>' +
        '<div class="px-0 py-2">' +
          '<h3 class="text-base/7 font-semibold text-gray-900 dark:text-white">Payment Methods</h3>' +
        '</div>' +
        '<div class="mt-3 h-px bg-gray-200 dark:bg-white/10"></div>' +
        '<div data-vendor-profile-method-list class="pt-6 flex flex-col gap-4"></div>' +
      '</div>';

    var methodList = wrap.querySelector('[data-vendor-profile-method-list]');
    if (!methodList) return;

    (vendor.cards || []).forEach(function (card) {
      var cardRow = createSharedAccountDetailsComponent({
          id: card.id || ('card-' + (card.last4 || '0000')),
          mediaHtml: buildMiniCard(card.brand, card.last4),
          mediaClass: 'shrink-0',
          title: card.cardholderName || vendor.displayName || 'Card',
          subtitle: '••••' + escapeHtml(card.last4 || '0000'),
          bodyHtml: buildVendorCardDetailBody(card, vendor)
        });
      if (cardRow) {
        methodList.appendChild(cardRow);
        return;
      }
      fallbackCards.push(
        buildMethodAccordionRow(
          buildMiniCard(card.brand, card.last4),
          escapeHtml(card.cardholderName || vendor.displayName || 'Card'),
          escapeHtml('••••' + (card.last4 || '0000')),
          '<div class="flex items-center justify-between self-stretch rounded-t-md border border-gray-200 bg-gray-100 px-4 py-2 dark:border-white/10 dark:bg-white/10"><span class="text-sm font-semibold text-gray-900 dark:text-gray-100">Card Details</span></div>' +
          buildVendorCardDetailBody(card, vendor),
          false
        )
      );
    });

    (vendor.bankAccounts || []).forEach(function (bank) {
      if (window.PPComponents && typeof window.PPComponents.createBankAccountRow === 'function') {
        methodList.appendChild(window.PPComponents.createBankAccountRow({
          id: bank.id || ('bank-' + (bank.last4 || '0000')),
          displayName: bank.bankName || 'Bank Account',
          name: bank.bankName || 'Bank Account',
          bankName: bank.bankName || '--',
          last4: String(bank.maskedAccount || '').replace(/\D/g, '').slice(-4) || '0000',
          accountHolderName: bank.bankName || '--',
          routingNumber: bank.maskedRouting || '',
          address: (vendor.addresses && vendor.addresses[0] && vendor.addresses[0].formatted) || '--'
        }));
        return;
      }
      fallbackCards.push(
        buildMethodAccordionRow(
          buildBankMethodIcon(),
          escapeHtml(bank.bankName || 'Bank Account'),
          escapeHtml(bank.maskedAccount || '--'),
          '<div class="flex items-center justify-between self-stretch rounded-t-md border border-gray-200 bg-gray-100 px-4 py-2 dark:border-white/10 dark:bg-white/10"><span class="text-sm font-semibold text-gray-900 dark:text-gray-100">Bank Details</span></div>' +
          '<div class="flex flex-col items-start gap-2 self-stretch rounded-b-md border-r border-b border-l border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">' +
            buildMethodDetailRow('Name', escapeHtml(bank.bankName || '--')) +
            buildMethodDetailRow('Account Number', escapeHtml(bank.maskedAccount || '--')) +
            buildMethodDetailRow('Routing Number', escapeHtml(bank.maskedRouting || '--')) +
            buildMethodDetailRow('Address', escapeHtml((vendor.addresses && vendor.addresses[0] && vendor.addresses[0].formatted) || '--'), true) +
          '</div>',
          true
        )
      );
    });

    (vendor.checks || []).forEach(function (check) {
      if (window.PPComponents && typeof window.PPComponents.createCheckAddressRow === 'function') {
        methodList.appendChild(window.PPComponents.createCheckAddressRow({
          id: check.id || ('check-' + escapeHtml(check.label || 'address')),
          displayName: check.name || check.label || 'Check Address',
          summary: check.label || 'Mailing address',
          name: check.name || '--',
          address: check.address || '--'
        }));
        return;
      }
      fallbackCards.push(
        buildMethodAccordionRow(
          buildBankMethodIcon(),
          escapeHtml(check.name || check.label || 'Check Address'),
          escapeHtml(check.label || 'Mailing address'),
          '<div class="flex items-center justify-between self-stretch rounded-t-md border border-gray-200 bg-gray-100 px-4 py-2 dark:border-white/10 dark:bg-white/10"><span class="text-sm font-semibold text-gray-900 dark:text-gray-100">Check Details</span></div>' +
          '<div class="flex flex-col items-start gap-2 self-stretch rounded-b-md border-r border-b border-l border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">' +
            buildMethodDetailRow('Name', escapeHtml(check.name || '--')) +
            buildMethodDetailRow('Address', escapeHtml(check.address || '--'), true) +
          '</div>',
          false
        )
      );
    });

    if (!methodList.children.length) {
      if (fallbackCards.length) {
        methodList.innerHTML = fallbackCards.join('');
      } else {
        methodList.innerHTML = '<div class="rounded-md border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 dark:border-white/10 dark:text-gray-400">No payment methods on file.</div>';
      }
    } else if (fallbackCards.length) {
      var fallbackWrap = document.createElement('div');
      fallbackWrap.innerHTML = fallbackCards.join('');
      Array.from(fallbackWrap.children).forEach(function (child) {
        methodList.appendChild(child);
      });
    }
  }

  function renderTaxAndCompliance(vendor) {
    var wrap = qs('vendor-profile-tax');
    if (!wrap) return;
    wrap.innerHTML =
      '<div class="border-t border-gray-200 pt-8 dark:border-white/10">' +
        '<div class="px-4 sm:px-0"><h3 class="text-base/7 font-semibold text-gray-900 dark:text-white">Tax & Compliance</h3><p class="mt-1 max-w-2xl text-sm/6 text-gray-500 dark:text-gray-400">Core tax identity and compliance posture.</p></div>' +
        '<div class="mt-6 border-t border-gray-100 dark:border-white/10"><dl class="divide-y divide-gray-100 dark:divide-white/10">' +
          buildDefinitionRow('EIN', escapeHtml(vendor.taxInfo.einMasked || '--')) +
          buildDefinitionRow('Classification', escapeHtml(vendor.taxInfo.classification || '--')) +
          buildDefinitionRow('W-9 status', escapeHtml(vendor.taxInfo.w9Status || '--')) +
          buildDefinitionRow('TIN match', escapeHtml(vendor.taxInfo.tinMatchStatus || '--')) +
          buildDefinitionRow('Risk status', escapeHtml(vendor.riskStatusLabel || '--')) +
        '</dl></div>' +
      '</div>';
  }

  function renderRemittance(vendor) {
    var wrap = qs('vendor-profile-remittance');
    if (!wrap) return;
    var emailList = vendor.remittanceEmails.length
      ? vendor.remittanceEmails.map(function (value) {
          return '<li class="flex items-center justify-between gap-4 py-3 pr-4 pl-4 text-sm"><span class="truncate font-medium text-gray-900 dark:text-white">' + escapeHtml(value) + '</span><span class="text-gray-500 dark:text-gray-400">Email</span></li>';
        }).join('')
      : '<li class="py-3 pr-4 pl-4 text-sm text-gray-500 dark:text-gray-400">No remittance emails configured.</li>';
    var phoneList = vendor.remittancePhones.length
      ? vendor.remittancePhones.map(function (value) {
          return '<li class="flex items-center justify-between gap-4 py-3 pr-4 pl-4 text-sm"><span class="truncate font-medium text-gray-900 dark:text-white">' + escapeHtml(value) + '</span><span class="text-gray-500 dark:text-gray-400">Phone</span></li>';
        }).join('')
      : '<li class="py-3 pr-4 pl-4 text-sm text-gray-500 dark:text-gray-400">No remittance phones configured.</li>';
    wrap.innerHTML =
      '<div class="border-t border-gray-200 pt-8 dark:border-white/10">' +
        '<div class="flex items-start justify-between gap-4"><div><h3 class="text-base/7 font-semibold text-gray-900 dark:text-white">Remittance Settings</h3><p class="mt-1 text-sm/6 text-gray-500 dark:text-gray-400">Destinations currently used for payment notifications and token delivery.</p></div><button type="button" class="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/5 dark:text-white dark:inset-ring-white/10 dark:hover:bg-white/10">Add remittance contact</button></div>' +
        '<div class="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">' +
          '<div><p class="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Email destinations</p><ul class="divide-y divide-gray-100 rounded-md border border-gray-200 dark:divide-white/10 dark:border-white/10">' + emailList + '</ul></div>' +
          '<div><p class="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Phone destinations</p><ul class="divide-y divide-gray-100 rounded-md border border-gray-200 dark:divide-white/10 dark:border-white/10">' + phoneList + '</ul></div>' +
        '</div>' +
      '</div>';
  }

  function renderLinkedPayables(vendor) {
    var wrap = qs('vendor-profile-payables');
    if (!wrap) return;
    var rows = getReadyPayablesForVendor(vendor);
    syncVendorPayablesState(rows);
    wrap.innerHTML =
      '<div class="border-t border-gray-200 pt-8 dark:border-white/10">' +
        '<div class="flex items-start justify-between gap-4"><div><h3 class="text-base/7 font-semibold text-gray-900 dark:text-white">Ready to Pay Payables</h3><p class="mt-1 text-sm/6 text-gray-500 dark:text-gray-400">Vendor-specific payables currently ready for payment.</p></div><a href="bills-and-payables.html" class="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/5 dark:text-white dark:inset-ring-white/10 dark:hover:bg-white/10">View payables</a></div>' +
        '<div class="mt-6 px-0 sm:px-4"><div data-vendor-payables-scroll class="overflow-x-auto"><div class="inline-block min-w-full align-middle"><table class="min-w-full table-fixed border-separate border-spacing-0 divide-y divide-gray-200 dark:divide-white/10">' + buildVendorPayablesTable(rows) + '</table></div></div></div>' +
      '</div>';
    ensureVendorPayablesInteractions(wrap);
  }

  function renderDocuments(vendor) {
    var wrap = qs('vendor-profile-documents');
    if (!wrap) return;
    var items = vendor.documents.map(function (doc) {
      return '<li class="flex items-center justify-between gap-4 py-4 pr-5 pl-4 text-sm"><div class="min-w-0"><button type="button" class="truncate font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer">' + escapeHtml(doc.name) + '</button><p class="mt-1 text-xs text-gray-500 dark:text-gray-400">' + escapeHtml(doc.type) + ' · ' + escapeHtml(doc.size) + '</p></div><button type="button" class="shrink-0 font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer">Download</button></li>';
    }).join('');
    wrap.innerHTML =
      '<div class="border-t border-gray-200 pt-8 dark:border-white/10">' +
        '<div class="px-4 sm:px-0"><h3 class="text-base/7 font-semibold text-gray-900 dark:text-white">Documents</h3><p class="mt-1 max-w-2xl text-sm/6 text-gray-500 dark:text-gray-400">Vendor files used for onboarding, tax, and banking review.</p></div>' +
        '<div class="mt-6"><ul role="list" class="divide-y divide-gray-100 rounded-md border border-gray-200 dark:divide-white/10 dark:border-white/10">' + items + '</ul></div>' +
      '</div>';
  }

  function renderAuditLog(vendor) {
    var wrap = qs('vendor-profile-audit-log');
    if (!wrap) return;
    var items = vendor.auditLog.length
      ? vendor.auditLog.map(function (item, index) {
          var line = index < vendor.auditLog.length - 1 ? '<div class="mt-[6px] flex-1 w-px bg-gray-200 dark:bg-white/10"></div>' : '';
          return '<div class="flex gap-3"><div class="flex w-6 flex-none self-stretch flex-col items-center pt-[6px]"><div class="size-1.5 rounded-full bg-gray-300 dark:bg-gray-500"></div>' + line + '</div><div class="min-w-0 pb-4"><p class="text-sm font-medium text-gray-900 dark:text-white">' + escapeHtml(item.title) + '</p><p class="mt-2 text-sm text-gray-700 dark:text-gray-300">' + escapeHtml(item.description) + '<span class="mx-1.5">&middot;</span>' + escapeHtml(formatDateTime(item.timestamp)) + '</p></div></div>';
        }).join('')
      : '<p class="text-sm text-gray-500 dark:text-gray-400">No audit events available.</p>';
    wrap.innerHTML =
      '<div class="border-t border-gray-200 pt-8 dark:border-white/10">' +
        '<div class="px-4 sm:px-0"><h3 class="text-base/7 font-semibold text-gray-900 dark:text-white">Audit Log</h3><p class="mt-1 max-w-2xl text-sm/6 text-gray-500 dark:text-gray-400">Administrative updates to the vendor record.</p></div>' +
        '<div class="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">' + items + '</div>' +
      '</div>';
  }

  function renderNotes(vendor) {
    var wrap = qs('vendor-profile-notes');
    if (!wrap) return;
    wrap.innerHTML =
      '<div class="border-t border-gray-200 pt-8 dark:border-white/10">' +
        '<div class="px-4 sm:px-0"><h3 class="text-base/7 font-semibold text-gray-900 dark:text-white">Internal Notes</h3><p class="mt-1 max-w-2xl text-sm/6 text-gray-500 dark:text-gray-400">Operational guidance for teams managing this vendor.</p></div>' +
        '<div class="mt-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">' + escapeHtml(vendor.notes || 'No internal notes available.') + '</div>' +
      '</div>';
  }

  function renderRightRail(vendor) {
    var health = qs('vendor-profile-health');
    var activity = qs('vendor-profile-recent-activity');
    if (health) {
      health.innerHTML =
        '<div class="pb-8">' +
          '<h3 class="text-base/7 font-semibold text-gray-900 dark:text-white">Vendor Health</h3>' +
          '<div class="mt-4 space-y-3">' +
            '<div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5"><p class="text-sm text-gray-500 dark:text-gray-400">Status</p><div class="mt-2">' + getStatusBadge(vendor.status, vendor.statusLabel) + '</div></div>' +
            '<div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5"><p class="text-sm text-gray-500 dark:text-gray-400">Default payment</p><p class="mt-2 text-sm font-semibold text-gray-900 dark:text-white">' + escapeHtml(vendor.defaultPaymentMethod || '--') + '</p></div>' +
          '</div>' +
        '</div>';
    }
    if (activity) {
      var items = vendor.recentPaymentActivity.length
        ? vendor.recentPaymentActivity.map(function (item) {
            return '<div class="flex gap-3"><div class="pt-1"><div class="size-1.5 rounded-full bg-blue-300 dark:bg-blue-400"></div></div><div class="min-w-0 pb-4"><p class="text-sm font-medium text-gray-900 dark:text-white">' + escapeHtml(item.title) + '</p><p class="mt-1 text-sm text-gray-600 dark:text-gray-300">' + escapeHtml(item.description) + '<span class="mx-1.5">&middot;</span>' + escapeHtml(formatDateTime(item.timestamp)) + '</p></div></div>';
          }).join('')
        : '<p class="text-sm text-gray-500 dark:text-gray-400">No recent payment activity.</p>';
      activity.innerHTML =
        '<div class="border-t border-gray-200 pt-8 dark:border-white/10">' +
          '<h3 class="text-base/7 font-semibold text-gray-900 dark:text-white">Recent Payment Activity</h3>' +
          '<div class="mt-4">' + items + '</div>' +
        '</div>';
    }
  }

  function renderVendor(vendor) {
    currentVendorProfile = vendor;
    renderHero(vendor);
    renderOverview(vendor);
    renderContactInformation(vendor);
    renderPaymentMethods(vendor);
    renderRemittance(vendor);
    renderTaxAndCompliance(vendor);
    renderLinkedPayables(vendor);
    renderDocuments(vendor);
    renderNotes(vendor);
    renderAuditLog(vendor);
    renderRightRail(vendor);
  }

  function renderNotFound() {
    var main = qs('vendor-profile-main');
    if (!main) return;
    main.innerHTML = '<div class="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center dark:border-white/10 dark:bg-gray-900"><h2 class="text-lg font-semibold text-gray-900 dark:text-white">Vendor not found</h2><p class="mt-2 text-sm text-gray-500 dark:text-gray-400">The requested vendor record is unavailable.</p><div class="mt-6"><a href="vendors.html" class="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500">Back to Vendors</a></div></div>';
  }

  function init() {
    var params = new URLSearchParams(window.location.search);
    var vendorId = params.get('id');
    if (!vendorId) {
      renderNotFound();
      return;
    }
    window.VendorsData.getVendorById(vendorId)
      .then(function (vendor) {
        if (!vendor) {
          renderNotFound();
          return;
        }
        renderVendor(vendor);
      })
      .catch(function () {
        renderNotFound();
      });
  }

  window.initVendorProfilePage = init;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

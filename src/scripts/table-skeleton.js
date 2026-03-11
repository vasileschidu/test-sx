/**
 * table-skeleton.js
 * Reusable table skeleton renderer.
 */
(function () {
  'use strict';

  function buildCellSkeleton(col, isLast, rowIndex) {
    var cb = isLast ? '' : ' border-b border-gray-200 dark:border-white/10';
    if (col.type === 'expand') {
      return '<td class="h-12 align-middle py-2 px-0 text-center whitespace-nowrap' + cb + '">' +
        '<span class="mx-auto inline-flex size-4 rounded bg-gray-200 dark:bg-white/15"></span>' +
      '</td>';
    }
    if (col.type === 'select') {
      return '<td class="h-12 align-middle py-2 px-0 text-center whitespace-nowrap' + cb + '">' +
        '<span class="mx-auto inline-flex size-4 rounded-sm bg-gray-200 dark:bg-white/15"></span>' +
      '</td>';
    }
    if (col.type === 'action') {
      return '<td data-action-column class="h-12 align-middle py-2 pr-3 pl-3 whitespace-nowrap w-px text-right text-sm font-medium bg-white dark:bg-gray-900' + cb + '">' +
        '<span class="ml-auto inline-flex h-7 w-16 rounded-md bg-gray-200 dark:bg-white/15"></span>' +
      '</td>';
    }
    if (col.type === 'status' || col.key === 'status') {
      return '<td class="h-12 align-middle px-2 py-2 whitespace-nowrap' + cb + '">' +
        '<span class="inline-flex h-6 w-20 rounded-md bg-gray-200 dark:bg-white/15"></span>' +
      '</td>';
    }
    if (col.key === 'amount') {
      return '<td class="h-12 align-middle px-2 py-2 whitespace-nowrap' + cb + '">' +
        '<span class="inline-flex h-4 w-24 rounded bg-gray-200 dark:bg-white/15"></span>' +
      '</td>';
    }
    var widths = ['w-16', 'w-20', 'w-24', 'w-28', 'w-32'];
    var widthClass = widths[(rowIndex + (col.key ? col.key.length : 0)) % widths.length];
    return '<td class="h-12 align-middle px-2 py-2 whitespace-nowrap' + cb + '">' +
      '<span class="inline-flex h-4 ' + widthClass + ' rounded bg-gray-200 dark:bg-white/15"></span>' +
    '</td>';
  }

  function render(opts) {
    if (!opts || !opts.tableEl) return;
    var tableEl = opts.tableEl;
    var columns = Array.isArray(opts.columns) ? opts.columns.slice() : [];
    if (!columns.length) {
      columns = [
        { type: 'expand' },
        { key: 'colA', label: 'Loading', sortable: true },
        { key: 'colB', label: 'Loading', sortable: true },
        { key: 'colC', label: 'Loading' },
        { key: 'status', label: 'Loading', type: 'status' },
        { type: 'action' },
      ];
    }
    var rowCount = Math.max(1, Number(opts.rowCount || 8));
    var includeHeader = opts.includeHeader !== false;
    var headerHtml = '';

    if (includeHeader) {
      headerHtml = '<thead><tr>' + columns.map(function (col) {
        var base = 'border-b border-gray-200 dark:border-white/10';
        if (col.type === 'expand' || col.type === 'select') {
          return '<th class="' + base + ' w-10 min-w-10 py-3.5 px-0 text-center whitespace-nowrap"><span class="sr-only">Loading</span></th>';
        }
        if (col.type === 'action') {
          return '<th data-action-column scope="col" class="' + base + ' bg-white py-3.5 pr-3 pl-3 whitespace-nowrap w-px dark:bg-gray-900 sm:pr-2"><span class="sr-only">Loading</span></th>';
        }
        if (col.sortable) {
          return '<th class="' + base + ' px-2 py-3.5 text-left text-sm font-semibold whitespace-nowrap text-gray-900 dark:text-white">' +
            '<span class="group flex w-full items-center gap-x-1.5 rounded-md text-left text-sm font-semibold text-gray-900 dark:text-white">' +
              '<span>' + (col.label || '') + '</span>' +
              '<span class="inline-flex size-6 items-center justify-center rounded-md bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-400">' +
                '<span class="inline-flex size-3.5 rounded bg-gray-300 dark:bg-white/25"></span>' +
              '</span>' +
            '</span>' +
          '</th>';
        }
        return '<th class="' + base + ' px-2 py-3.5 text-left text-sm font-semibold whitespace-nowrap text-gray-900 dark:text-white">' + (col.label || '') + '</th>';
      }).join('') + '</tr></thead>';
    }

    var bodyRows = '';
    for (var i = 0; i < rowCount; i++) {
      var isLast = i === rowCount - 1;
      bodyRows += '<tr class="animate-pulse">' + columns.map(function (col) {
        return buildCellSkeleton(col, isLast, i);
      }).join('') + '</tr>';
    }

    tableEl.innerHTML = headerHtml + '<tbody class="bg-white dark:bg-gray-900">' + bodyRows + '</tbody>';
  }

  window.TableSkeleton = {
    render: render,
  };
})();

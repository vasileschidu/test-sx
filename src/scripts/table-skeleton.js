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

  // Consumer Portal table: 52px rows, 12px-padded cells, no per-cell borders (rows are split by separator rows).
  function buildConsumerCellSkeleton(col, rowIndex) {
    var pill = 'bg-gray-200 dark:bg-white/15';
    if (col.type === 'expand') {
      return '<td class="h-[52px] w-10 min-w-10 align-middle py-2 px-0 text-center whitespace-nowrap">' +
        '<span class="mx-auto inline-flex size-4 rounded ' + pill + '"></span></td>';
    }
    if (col.type === 'action') {
      return '<td data-action-column class="h-[52px] align-middle py-2 pr-4 pl-3 whitespace-nowrap w-32 min-w-32 text-right bg-white dark:bg-gray-900">' +
        '<span class="ml-auto inline-flex h-7 w-16 rounded-md ' + pill + '"></span></td>';
    }
    var inner;
    if (col.type === 'status' || col.key === 'status') {
      inner = '<span class="inline-flex h-6 w-20 rounded-[4px] ' + pill + '"></span>';
    } else if (col.type === 'paymentReference') {
      inner = '<span class="inline-flex items-center gap-1"><span class="inline-flex h-4 w-6 rounded ' + pill + '"></span><span class="inline-flex h-4 w-10 rounded ' + pill + '"></span></span>';
    } else if (col.key === 'amount') {
      inner = '<span class="inline-flex h-4 w-24 rounded ' + pill + '"></span>';
    } else {
      var widths = ['w-16', 'w-20', 'w-24', 'w-28', 'w-32'];
      inner = '<span class="inline-flex h-4 ' + widths[(rowIndex + (col.key ? col.key.length : 0)) % widths.length] + ' rounded ' + pill + '"></span>';
    }
    return '<td class="h-[52px] align-middle px-3 py-2 whitespace-nowrap' + (col.key === 'amount' ? ' text-right' : '') + '">' + inner + '</td>';
  }

  function buildConsumerSeparator(colCount) {
    return '<tr aria-hidden="true" data-row-separator><td colspan="' + colCount + '" class="bg-gray-200 p-0 dark:bg-white/10" style="height:1px;line-height:0;font-size:0"></td></tr>';
  }

  function renderConsumer(tableEl, columns, rowCount, includeHeader) {
    var head = '';
    if (includeHeader) {
      head = '<thead><tr>' + columns.map(function (col) {
        if (col.type === 'expand' || col.type === 'select') {
          return '<th class="w-10 min-w-10 h-[52px] py-2 px-0 text-center whitespace-nowrap"><span class="sr-only">Loading</span></th>';
        }
        if (col.type === 'action') {
          return '<th data-action-column scope="col" class="bg-white h-[52px] py-2 pr-4 pl-3 whitespace-nowrap w-32 min-w-32 dark:bg-gray-900 sm:pr-2"><span class="sr-only">Loading</span></th>';
        }
        return '<th class="h-[52px] px-3 py-2 ' + (col.key === 'amount' ? 'text-right' : 'text-left') +
          ' text-xs font-medium uppercase tracking-[0.6px] whitespace-nowrap text-gray-500 dark:text-gray-400">' + (col.label || '') + '</th>';
      }).join('') + '</tr>' + buildConsumerSeparator(columns.length) + '</thead>';
    }
    var body = '';
    for (var i = 0; i < rowCount; i++) {
      body += '<tr class="animate-pulse">' + columns.map(function (col) {
        return buildConsumerCellSkeleton(col, i);
      }).join('') + '</tr>';
      if (i < rowCount - 1) body += buildConsumerSeparator(columns.length);
    }
    tableEl.innerHTML = head + '<tbody class="bg-white dark:bg-gray-900">' + body + '</tbody>';
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

    if (opts.variant === 'consumer' && opts.columns && opts.columns.length) {
      renderConsumer(tableEl, columns, rowCount, includeHeader);
      return;
    }

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

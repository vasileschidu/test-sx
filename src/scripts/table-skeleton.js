/**
 * table-skeleton.js
 * Reusable table skeleton renderer, styled like the live tables
 * (52px rows, uppercase gray header labels, sort icons, dashed header border).
 *
 * Options:
 *   tableEl        <table> to render into (required)
 *   columns        column defs ({ key, label, type, sortable, align })
 *   rowCount       number of placeholder rows (default 8)
 *   includeHeader  render a <thead> (default true)
 *   headerHtml     the table's real <thead> markup; used instead of the generic header
 *   columnClass    fn(col) -> width/padding classes shared by header and body cells
 *   headerAddon    fn(col) -> extra header markup after the label (e.g. filter icons)
 */
(function () {
  "use strict";

  var BAR = "bg-gray-200 dark:bg-white/15";
  var HEADER_TEXT =
    "text-xs font-medium uppercase tracking-[0.6px] whitespace-nowrap text-gray-500 dark:text-gray-400";

  function defaultColumnClass(col) {
    if (col.type === "expand") return " w-[52px] min-w-[52px] px-0";
    if (col.type === "select") return " w-8 min-w-8 px-2";
    if (col.type === "action") return " w-[100px] min-w-[100px] px-4";
    return " px-4";
  }

  function isRightAligned(col) {
    return col.align === "right" || col.key === "amount";
  }

  function sortIcon() {
    if (window.TableUi && typeof window.TableUi.icon === "function") {
      return window.TableUi.icon("sort.svg", 20, 20);
    }
    return '<span class="inline-flex size-5 shrink-0"></span>';
  }

  function buildHeaderCell(col, columnClass, headerAddon) {
    var base =
      "h-[52px] border-b border-dashed border-gray-200 align-middle dark:border-white/10" +
      columnClass(col);
    if (col.type === "expand" || col.type === "select") {
      return (
        '<th class="' +
        base +
        ' text-center"><span class="sr-only">Loading</span></th>'
      );
    }
    if (col.type === "action") {
      return (
        '<th data-action-column scope="col" class="' +
        base +
        ' bg-white dark:bg-gray-900"><span class="sr-only">Loading</span></th>'
      );
    }
    var right = isRightAligned(col);
    return (
      '<th scope="col" class="' +
      base +
      (right ? " text-right" : " text-left") +
      '">' +
      '<div class="flex items-center gap-1' +
      (right ? " justify-end" : "") +
      '">' +
      '<span class="inline-flex items-center gap-1 ' +
      HEADER_TEXT +
      '">' +
      "<span>" +
      (col.label || "") +
      "</span>" +
      (col.sortable ? sortIcon() : "") +
      "</span>" +
      (headerAddon ? headerAddon(col) || "" : "") +
      "</div>" +
      "</th>"
    );
  }

  function buildCellSkeleton(col, isLast, rowIndex, columnClass) {
    var td =
      '<td class="h-[52px] align-middle whitespace-nowrap' +
      columnClass(col) +
      (isLast ? "" : " border-b border-gray-200 dark:border-white/10");
    if (col.type === "expand") {
      return (
        td +
        ' text-center"><span class="mx-auto inline-flex size-4 rounded ' +
        BAR +
        '"></span></td>'
      );
    }
    if (col.type === "select") {
      return (
        td +
        ' text-center"><span class="mx-auto inline-flex size-4 rounded ' +
        BAR +
        '"></span></td>'
      );
    }
    if (col.type === "action") {
      return (
        td.replace("<td ", "<td data-action-column ") +
        ' bg-white text-right dark:bg-gray-900"><span class="ml-auto inline-flex h-8 w-14 rounded-md ' +
        BAR +
        '"></span></td>'
      );
    }
    if (col.type === "status" || col.key === "status") {
      return (
        td +
        '"><span class="inline-flex h-6 w-24 rounded ' +
        BAR +
        '"></span></td>'
      );
    }
    if (isRightAligned(col)) {
      return (
        td +
        ' text-right"><span class="ml-auto inline-flex h-4 w-24 rounded ' +
        BAR +
        '"></span></td>'
      );
    }
    var widths = ["w-16", "w-20", "w-24", "w-28", "w-32"];
    var widthClass =
      widths[(rowIndex + (col.key ? col.key.length : 0)) % widths.length];
    return (
      td +
      '"><span class="inline-flex h-4 ' +
      widthClass +
      " rounded " +
      BAR +
      '"></span></td>'
    );
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
        { type: "expand" },
        { key: "colA", label: "Loading", sortable: true },
        { key: "colB", label: "Loading", sortable: true },
        { key: "colC", label: "Loading" },
        { key: "status", label: "Loading", type: "status" },
        { type: "action" },
      ];
    }
    var columnClass =
      typeof opts.columnClass === "function"
        ? opts.columnClass
        : defaultColumnClass;
    var headerAddon =
      typeof opts.headerAddon === "function" ? opts.headerAddon : null;
    var rowCount = Math.max(1, Number(opts.rowCount || 8));
    var includeHeader = opts.includeHeader !== false;
    var headerHtml = "";

    if (opts.variant === 'consumer' && opts.columns && opts.columns.length) {
      renderConsumer(tableEl, columns, rowCount, includeHeader);
      return;
    }

    if (includeHeader) {
      headerHtml =
        opts.headerHtml ||
        '<thead class="bg-white dark:bg-gray-900"><tr>' +
          columns
            .map(function (col) {
              return buildHeaderCell(col, columnClass, headerAddon);
            })
            .join("") +
          "</tr></thead>";
    }

    var bodyRows = "";
    for (var i = 0; i < rowCount; i++) {
      var isLast = i === rowCount - 1;
      bodyRows +=
        '<tr class="animate-pulse">' +
        columns
          .map(function (col) {
            return buildCellSkeleton(col, isLast, i, columnClass);
          })
          .join("") +
        "</tr>";
    }

    tableEl.innerHTML =
      headerHtml +
      '<tbody class="bg-white dark:bg-gray-900">' +
      bodyRows +
      "</tbody>";
  }

  window.TableSkeleton = {
    render: render,
  };
})();

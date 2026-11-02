(function (global) {
  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function asset(file) {
    var path = global.location.pathname || "";
    var marker = "/src/pages/";
    var index = path.indexOf(marker);
    var root = index >= 0 ? path.slice(0, index) : "";
    return root + "/src/assets/table/" + encodeURIComponent(file);
  }

  function icon(file, width, height, extraClass) {
    return (
      '<img src="' +
      asset(file) +
      '" width="' +
      width +
      '" height="' +
      height +
      '" alt="" class="shrink-0' +
      (extraClass ? " " + extraClass : "") +
      '">'
    );
  }

  function filterChip(opts) {
    opts = opts || {};
    var title = opts.title || (opts.label || "") + ": " + (opts.value || "");
    var openTip = opts.openTooltip
      ? ' data-tooltip="' + escapeHtml(opts.openTooltip) + '"'
      : "";
    var removeTip = opts.removeTooltip
      ? ' data-tooltip="' + escapeHtml(opts.removeTooltip) + '"'
      : "";
    return (
      '<span class="inline-flex max-w-[360px] items-stretch overflow-hidden rounded-md border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-800">' +
      '<span class="inline-flex shrink-0 items-center bg-gray-100 px-2 py-1 text-xs leading-4 font-semibold whitespace-nowrap text-gray-600 dark:bg-white/10 dark:text-gray-300">' +
      escapeHtml(opts.label) +
      "</span>" +
      '<span aria-hidden="true" class="w-px self-stretch bg-gray-200 dark:bg-white/10"></span>' +
      '<button type="button" data-filter-tag-open="' +
      escapeHtml(opts.type) +
      '" title="' +
      escapeHtml(title) +
      '"' +
      openTip +
      ' class="inline-flex min-w-0 cursor-pointer items-center px-2 py-1 text-left text-xs leading-4 font-semibold text-gray-700 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-gray-200 dark:hover:bg-white/10">' +
      '<span class="truncate">' +
      escapeHtml(opts.value) +
      "</span></button>" +
      '<span aria-hidden="true" class="w-px self-stretch bg-gray-200 dark:bg-white/10"></span>' +
      '<button type="button" data-filter-tag-remove="' +
      escapeHtml(opts.type) +
      '"' +
      removeTip +
      ' class="inline-flex shrink-0 cursor-pointer items-center justify-center p-[5px] hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:hover:bg-white/10" aria-label="Remove filter">' +
      icon("x-mark-18.svg", 18, 18) +
      "</button></span>"
    );
  }

  function filterCheckbox(opts) {
    opts = opts || {};
    var idAttr = opts.id ? ' input-id="' + escapeHtml(opts.id) + '"' : "";
    var panelAttr = opts.panelKey
      ? ' data-filter-panel-key="' + escapeHtml(opts.panelKey) + '"'
      : "";
    return (
      '<app-checkbox class="w-full" data-filter-value="' +
      escapeHtml(opts.value) +
      '"' +
      idAttr +
      panelAttr +
      (opts.checked ? " checked" : "") +
      ">" +
      escapeHtml(opts.label) +
      (opts.countText
        ? '<span class="sr-only">' + escapeHtml(opts.countText) + "</span>"
        : "") +
      "</app-checkbox>"
    );
  }

  global.TableUi = {
    icon: icon,
    filterChip: filterChip,
    filterCheckbox: filterCheckbox,
  };
})(window);

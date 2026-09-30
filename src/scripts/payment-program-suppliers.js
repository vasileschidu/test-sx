/**
 * payment-program-suppliers.js
 * Suppliers tab of Payment Program Configuration: every supplier enrolled in
 * a published program, where they sit in its waterfall, what happens next and
 * how they get paid.
 *
 * Rows come from the supplier roster that payment-program-config.js owns —
 * the same records "Add suppliers" and cohort migrations move — so this tab,
 * the cohort counts and the program page always agree. Only what a row shows
 * (next move, status) is worked out here, from where each supplier sits.
 */
(function () {
  'use strict';

  var PAGE_SIZES = [10, 16, 25, 50];
  // Badge colours are the Payments table's: exception / pending / paid.
  var STATUS = {
    attention: { label: 'Needs attention', cls: 'bg-red-50 text-red-700 inset-ring-red-600/10 dark:bg-red-400/10 dark:text-red-400 dark:inset-ring-red-400/20' },
    awaiting: { label: 'Awaiting choice', cls: 'bg-yellow-50 text-yellow-800 inset-ring-yellow-600/20 dark:bg-yellow-400/10 dark:text-yellow-500 dark:inset-ring-yellow-400/20' },
    digital: { label: 'Paying digitally', cls: 'bg-green-50 text-green-700 inset-ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:inset-ring-green-500/20' }
  };
  var STATUS_ORDER = ['attention', 'awaiting', 'digital'];

  // Filter categories, in the order the menu lists them.
  var PANELS = [
    { key: 'program', label: 'By payment program' },
    { key: 'cohort', label: 'By cohort' },
    { key: 'status', label: 'By status' },
    { key: 'method', label: 'By payment method' }
  ];
  var PANEL_KEYS = PANELS.map(function (p) { return p.key; });

  var state = {
    rows: [],
    search: '',
    applied: { program: new Set(), cohort: new Set(), status: new Set(), method: new Set() },
    draft: { program: new Set(), cohort: new Set(), status: new Set(), method: new Set() },  // what the open menu shows until Apply
    activePanel: 'program',
    menuOpen: false,
    sort: null,          // null | { key, dir: 'asc' | 'desc' }
    page: 1,
    pageSize: 10,
    selected: new Set(),
    loadTimer: null,
    loading: false
  };

  function $(id) { return document.getElementById(id); }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }

  function daysBetween(fromIso, toDate) {
    var from = new Date(String(fromIso) + 'T00:00:00');
    if (isNaN(from.getTime())) return 0;
    return Math.floor((toDate.getTime() - from.getTime()) / 86400000);
  }

  // ── Rows from the roster ──

  function buildRows() {
    var api = window.PaymentPrograms;
    var catalog = api.getCatalog();
    var programsById = {};
    api.getPrograms().forEach(function (p) { if (p.published) programsById[p.id] = p; });
    var now = new Date();
    var rows = [];

    api.getRoster().forEach(function (s) {
      var program = s.programId && programsById[s.programId];
      if (!program) return;                      // this tab is enrolled suppliers only
      var enabled = program.published.cohorts.filter(function (c) { return c.enabled; });
      var stageIdx = -1;
      enabled.forEach(function (c, i) { if (c.id === s.cohortId) stageIdx = i; });
      if (stageIdx === -1) return;
      var cohort = enabled[stageIdx];
      var isFinal = stageIdx === enabled.length - 1;
      var next = isFinal ? null : enabled[stageIdx + 1];

      var method = s.method && s.method !== 'paper' ? catalog.methodById[s.method] : null;
      var onPaper = s.method === 'paper';
      var unchosen = !method && !onPaper;
      var pending = onPaper || unchosen;
      var daysLeft = Math.max(1, cohort.durationDays - daysBetween(s.enteredAt, now));
      var status = pending ? (daysLeft <= 3 || unchosen ? 'attention' : 'awaiting') : (s.attention ? 'attention' : 'digital');

      var nextTitle, nextSub, nextUrgent = false;
      if (isFinal) { nextTitle = 'No further stage'; nextSub = 'Final stage of program'; }
      else if (!pending) { nextTitle = 'Stays here'; nextSub = 'Chose a payment method'; }
      else {
        nextTitle = '→ ' + next.name; nextSub = 'in ' + daysLeft + (daysLeft === 1 ? ' day' : ' days');
        nextUrgent = daysLeft <= 7;
      }

      rows.push({
        id: s.id,
        name: s.name,
        code: s.code,
        programId: program.id,
        programName: program.published.name,
        cohortId: cohort.id,
        stage: stageIdx + 1,
        stages: enabled.length,
        cohortName: cohort.name,
        nextTitle: nextTitle,
        nextSub: nextSub,
        nextMoves: !isFinal && pending,
        nextUrgent: nextUrgent,
        payLabel: onPaper ? 'Paper Check' : method ? method.label : 'No method yet',
        paySub: onPaper ? 'Not converted yet' : method ? method.feeLong : 'Needs to choose one',
        payIcon: onPaper ? 'check' : method ? method.icon : 'card',
        payPending: pending,
        ytd: s.ytd,
        status: status
      });
    });
    state.rows = rows;
  }

  // ── Filter / sort / page ──

  function emptyFilters() { return { program: new Set(), cohort: new Set(), status: new Set(), method: new Set() }; }

  function cloneFilters(f) {
    var out = emptyFilters();
    PANEL_KEYS.forEach(function (k) { f[k].forEach(function (v) { out[k].add(v); }); });
    return out;
  }

  function filterTotal(f) { return PANEL_KEYS.reduce(function (n, k) { return n + f[k].size; }, 0); }

  function sameSet(a, b) {
    if (a.size !== b.size) return false;
    var same = true;
    a.forEach(function (v) { if (!b.has(v)) same = false; });
    return same;
  }

  var ROW_FIELD = { program: 'programId', cohort: 'cohortId', status: 'status', method: 'payLabel' };
  var SORT_VALUE = {
    name: function (r) { return r.name.toLowerCase(); },
    program: function (r) { return r.programName.toLowerCase() + ' ' + r.stage; },
    ytd: function (r) { return r.ytd; },
    status: function (r) { return STATUS_ORDER.indexOf(r.status); }
  };

  function visibleRows() {
    var q = state.search.trim().toLowerCase();
    var f = state.applied;
    var list = state.rows.filter(function (r) {
      for (var i = 0; i < PANEL_KEYS.length; i += 1) {
        var k = PANEL_KEYS[i];
        if (f[k].size && !f[k].has(r[ROW_FIELD[k]])) return false;
      }
      if (!q) return true;
      return (r.name + ' ' + r.code + ' ' + r.programName + ' ' + r.cohortName + ' ' + r.payLabel).toLowerCase().indexOf(q) !== -1;
    });
    if (state.sort) {
      var value = SORT_VALUE[state.sort.key];
      var dir = state.sort.dir === 'asc' ? 1 : -1;
      list = list.slice().sort(function (a, b) {
        var x = value(a), y = value(b);
        return (x < y ? -1 : x > y ? 1 : 0) * dir;
      });
    }
    return list;
  }

  function pageCount(total) { return Math.max(1, Math.ceil(total / state.pageSize)); }

  // ── Icons ──

  var ICON = {
    card: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z',
    'card-plus': 'M2.25 8.25H21.75M2.25 9H21.75M5.25 14.25H11.25M5.25 16.5H8.25M21.75 11V6.75C21.75 5.50736 20.7426 4.5 19.5 4.5H4.5C3.25736 4.5 2.25 5.50736 2.25 6.75V17.25C2.25 18.4926 3.25736 19.5 4.5 19.5H14M19.5 19.75L19.8942 18.5673C20.1182 17.8954 20.6454 17.3682 21.3173 17.1442L22.5 16.75L21.3173 16.3558C20.6454 16.1318 20.1182 15.6046 19.8942 14.9327L19.5 13.75L19.1058 14.9327C18.8818 15.6046 18.3546 16.1318 17.6827 16.3558L16.5 16.75L17.6827 17.1442C18.3546 17.3682 18.8818 17.8954 19.1058 18.5673L19.5 19.75Z',
    bank: 'M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z',
    check: 'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z'
  };

  function icon(name, cls) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="' + cls + '"><path stroke-linecap="round" stroke-linejoin="round" d="' + (ICON[name] || ICON.card) + '" /></svg>';
  }

  // Sort badges, chevrons and the filter arrow are the payments table's own.
  var ICON_SORT = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4"><path class="opacity-70" fill-rule="evenodd" d="M10.53 3.47a.75.75 0 0 0-1.06 0L6.22 6.72a.75.75 0 1 0 1.06 1.06L10 5.06l2.72 2.72a.75.75 0 1 0 1.06-1.06l-3.25-3.25Z" clip-rule="evenodd" /><path class="opacity-70" fill-rule="evenodd" d="M6.22 13.28a.75.75 0 0 1 1.06 0L10 15.94l2.72-2.66a.75.75 0 1 1 1.06 1.06l-3.25 3.19a.75.75 0 0 1-1.06 0l-3.25-3.19a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>';
  var ICON_SORT_ASC = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4"><path transform="translate(10 5.6) scale(1.2) translate(-10 -5.6)" fill-rule="evenodd" d="M10.53 3.47a.75.75 0 0 0-1.06 0L6.22 6.72a.75.75 0 1 0 1.06 1.06L10 5.06l2.72 2.72a.75.75 0 1 0 1.06-1.06l-3.25-3.25Z" clip-rule="evenodd" /><path class="opacity-40" fill-rule="evenodd" d="M6.22 13.28a.75.75 0 0 1 1.06 0L10 15.94l2.72-2.66a.75.75 0 1 1 1.06 1.06l-3.25 3.19a.75.75 0 0 1-1.06 0l-3.25-3.19a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>';
  var ICON_SORT_DESC = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4"><path class="opacity-40" fill-rule="evenodd" d="M10.53 3.47a.75.75 0 0 0-1.06 0L6.22 6.72a.75.75 0 1 0 1.06 1.06L10 5.06l2.72 2.72a.75.75 0 1 0 1.06-1.06l-3.25-3.25Z" clip-rule="evenodd" /><path transform="translate(10 14.4) scale(1.2) translate(-10 -14.4)" fill-rule="evenodd" d="M6.22 13.28a.75.75 0 0 1 1.06 0L10 15.94l2.72-2.66a.75.75 0 1 1 1.06 1.06l-3.25 3.19a.75.75 0 0 1-1.06 0l-3.25-3.19a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>';
  var ICON_CHEVRON_DOWN = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>';
  var ICON_CHEVRON_RIGHT = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4 text-gray-500 dark:text-gray-400"><path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>';

  var CHECKBOX = 'col-start-1 row-start-1 appearance-none rounded-sm border border-gray-300 bg-white checked:border-blue-600 checked:bg-blue-600 indeterminate:border-blue-600 indeterminate:bg-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-white/20 dark:bg-white/5 dark:checked:border-blue-500 dark:checked:bg-blue-500';

  function checkbox(attrs, checked, label) {
    return '<span class="group inline-grid size-4 grid-cols-1 align-middle">' +
      '<input type="checkbox" ' + attrs + (checked ? ' checked' : '') + ' aria-label="' + escapeHtml(label) + '" class="' + CHECKBOX + '" />' +
      '<svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white">' +
        '<path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-checked:opacity-100" />' +
        '<path d="M3 7H11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-indeterminate:opacity-100" />' +
      '</svg></span>';
  }

  // ── Card header: same toolbar as the Payments table ──

  function navButton(panel) {
    return '<button type="button" data-filter-open="' + panel.key + '" data-filter-nav class="flex w-full cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/5">' +
      '<span class="min-w-0 flex-1">' + panel.label + '</span>' +
      '<span data-filter-count-badge="' + panel.key + '" class="hidden items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 inset-ring inset-ring-blue-700/10 dark:bg-blue-400/10 dark:text-blue-300 dark:inset-ring-blue-400/30">0</span>' +
      ICON_CHEVRON_RIGHT + '</button>';
  }

  function detailPanel(panel) {
    return '<div data-filter-panel="' + panel.key + '" class="hidden h-full min-h-0 flex-col">' +
      '<div class="border-b border-gray-200 px-3 py-3 dark:border-white/10"><p class="text-sm font-semibold text-gray-900 dark:text-gray-100">' + panel.label + '</p></div>' +
      '<div data-filter-options="' + panel.key + '" class="min-h-0 flex-1 overflow-auto px-3 py-3"></div></div>';
  }

  function toolbarHtml() {
    return '<div class="px-4 pb-3 sm:px-6">' +
      '<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">' +
        '<div class="flex items-center gap-4">' +
          '<h2 class="text-xl font-semibold whitespace-nowrap text-gray-900 dark:text-white">Suppliers</h2>' +
          '<button type="button" data-sup-refresh class="inline-flex cursor-pointer items-center gap-x-1.5 rounded-md bg-gray-100 px-2.5 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20">' +
            '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clip-rule="evenodd" /></svg>' +
            'Refresh</button>' +
        '</div>' +
        '<div class="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">' +
          '<div class="w-full sm:w-auto"><div class="grid grid-cols-1">' +
            '<input id="pp-sup-search" type="text" autocomplete="off" placeholder="Search suppliers..." aria-label="Search suppliers"' +
              ' class="col-start-1 row-start-1 block w-full rounded-md bg-white py-1.5 pr-3 pl-10 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 sm:pl-9 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-blue-500" />' +
            '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="pointer-events-none col-start-1 row-start-1 ml-3 size-5 self-center text-gray-400 sm:size-4 dark:text-gray-500"><path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clip-rule="evenodd" /></svg>' +
          '</div></div>' +
          '<div class="flex w-full gap-3 sm:w-auto">' +
            '<div id="pp-sup-filter-dropdown" class="relative inline-block w-full sm:w-auto">' +
              '<button id="pp-sup-filter-btn" type="button" aria-haspopup="true" aria-expanded="false" class="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold whitespace-nowrap text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 sm:w-auto dark:bg-white/5 dark:text-white dark:inset-ring-white/10 dark:hover:bg-white/10">Filter' +
                '<span data-filter-count class="hidden items-center rounded-full bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-600 tabular-nums inset-ring inset-ring-gray-500/10 dark:bg-white/10 dark:text-gray-400 dark:inset-ring-white/10"></span>' +
                '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" data-filter-chevron class="-mr-0.5 size-5 transition-transform"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>' +
              '</button>' +
              '<div id="pp-sup-filter-menu" class="pointer-events-none invisible absolute right-0 z-[60] mt-2 w-[628px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-md bg-white opacity-0 shadow-lg outline-1 outline-black/5 transition-opacity duration-200 ease-out dark:bg-gray-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10">' +
                '<div class="flex max-h-[470px] min-h-0 flex-col">' +
                  '<div class="flex min-h-0 flex-1 flex-col sm:flex-row">' +
                    '<div class="shrink-0 border-b border-gray-200 bg-gray-50 p-3 sm:w-72 sm:border-r sm:border-b-0 dark:border-white/10 dark:bg-gray-900/40">' +
                      '<div class="grid gap-1">' + PANELS.map(navButton).join('') + '</div></div>' +
                    '<div class="min-h-[208px] min-w-0 flex-1 bg-white dark:bg-gray-800">' + PANELS.map(detailPanel).join('') + '</div>' +
                  '</div>' +
                  '<div class="flex items-center justify-end gap-3 border-t border-gray-200 bg-white px-3 py-3 dark:border-white/10 dark:bg-gray-800">' +
                    '<button id="pp-sup-filter-clear" type="button" disabled class="cursor-pointer rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-700 shadow-xs hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10">Clear</button>' +
                    '<button id="pp-sup-filter-apply" type="button" disabled class="cursor-pointer rounded-md bg-blue-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300">Apply</button>' +
                  '</div>' +
                '</div>' +
              '</div>' +
              '<div id="pp-sup-filter-backdrop" class="pointer-events-none invisible fixed inset-0 z-40 bg-gray-900/50 opacity-0 transition-opacity duration-200 ease-out"></div>' +
            '</div>' +
            '<button type="button" data-sup-export class="inline-flex w-full cursor-pointer items-center justify-center gap-x-1.5 self-start rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 shadow-xs inset-ring-1 inset-ring-gray-300 hover:bg-gray-50 sm:w-auto dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20">Export' +
              '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="-mr-0.5 size-[18px]"><path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" /><path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" /></svg>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div id="pp-sup-tags" class="mt-3 hidden flex-wrap items-center justify-end gap-2"></div>' +
    '</div>';
  }

  // ── Filter menu: categories on the left, their options on the right ──

  function programsInRows() {
    var seen = {};
    var list = [];
    state.rows.forEach(function (r) {
      if (!seen[r.programId]) { seen[r.programId] = { id: r.programId, name: r.programName, count: 0, cohorts: {}, order: [] }; list.push(seen[r.programId]); }
      var p = seen[r.programId];
      p.count += 1;
      if (!p.cohorts[r.cohortId]) { p.cohorts[r.cohortId] = { id: r.cohortId, name: r.cohortName, stage: r.stage, count: 0 }; p.order.push(p.cohorts[r.cohortId]); }
      p.cohorts[r.cohortId].count += 1;
    });
    list.forEach(function (p) { p.order.sort(function (a, b) { return a.stage - b.stage; }); });
    return list;
  }

  /** Cohorts cascade from the programs picked: none picked means every program's cohorts. */
  function cohortScope(filters) {
    return programsInRows().filter(function (p) { return !filters.program.size || filters.program.has(p.id); });
  }

  /** A cohort outside the picked programs could only ever match nothing; drop it. */
  function pruneCohorts(filters) {
    if (!filters.program.size) return;
    var allowed = {};
    cohortScope(filters).forEach(function (p) { p.order.forEach(function (c) { allowed[c.id] = true; }); });
    Array.from(filters.cohort).forEach(function (id) { if (!allowed[id]) filters.cohort.delete(id); });
  }

  function optionRow(panel, value, label, count, checked) {
    return '<label class="group flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-white/5">' +
      '<div class="grid size-4 grid-cols-1">' +
        '<input type="checkbox" data-filter-panel-key="' + panel + '" data-filter-value="' + escapeHtml(value) + '"' + (checked ? ' checked' : '') +
          ' class="col-start-1 row-start-1 appearance-none rounded-sm border border-gray-300 bg-white checked:border-blue-600 checked:bg-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-white/20 dark:bg-white/5 dark:checked:border-blue-500 dark:checked:bg-blue-500" />' +
        '<svg class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white" viewBox="0 0 14 14" fill="none"><path class="opacity-0 group-has-checked:opacity-100" d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>' +
      '</div>' +
      '<span class="min-w-0 flex-1 truncate text-sm font-medium text-gray-700 dark:text-gray-200">' + escapeHtml(label) + '</span>' +
      '<span class="shrink-0 text-sm font-normal text-gray-500 dark:text-gray-400">' + Number(count).toLocaleString('en-US') + '</span></label>';
  }

  function optionsHtml(key) {
    var draft = state.draft;
    if (key === 'program') {
      return programsInRows().map(function (p) { return optionRow('program', p.id, p.name, p.count, draft.program.has(p.id)); }).join('');
    }
    if (key === 'cohort') {
      var scope = cohortScope(draft);
      return scope.map(function (p) {
        var heading = scope.length > 1
          ? '<p class="px-2 pt-2 pb-1 text-xs font-medium text-gray-500 first:pt-0 dark:text-gray-400">' + escapeHtml(p.name) + '</p>' : '';
        return heading + p.order.map(function (c) {
          return optionRow('cohort', c.id, 'Cohort ' + c.stage + ' · ' + c.name, c.count, draft.cohort.has(c.id));
        }).join('');
      }).join('');
    }
    var counts = {};
    var field = ROW_FIELD[key];
    state.rows.forEach(function (r) { counts[r[field]] = (counts[r[field]] || 0) + 1; });
    if (key === 'status') {
      return STATUS_ORDER.filter(function (k) { return counts[k]; }).map(function (k) {
        return optionRow('status', k, STATUS[k].label, counts[k], draft.status.has(k));
      }).join('');
    }
    return Object.keys(counts).sort().map(function (label) {
      return optionRow('method', label, label, counts[label], draft.method.has(label));
    }).join('');
  }

  /** keepOptions: a tick only moves badges and buttons, so the list (and focus) stays put. */
  function syncFilterMenu(keepOptions) {
    var menu = $('pp-sup-filter-menu');
    if (!menu) return;
    PANELS.forEach(function (panel) {
      var on = panel.key === state.activePanel;
      var el = menu.querySelector('[data-filter-panel="' + panel.key + '"]');
      el.classList.toggle('hidden', !on);
      el.classList.toggle('flex', on);
      if (on && !keepOptions) menu.querySelector('[data-filter-options="' + panel.key + '"]').innerHTML = optionsHtml(panel.key);
      var nav = menu.querySelector('[data-filter-open="' + panel.key + '"]');
      ['bg-gray-100', 'text-gray-900', 'dark:bg-white/10', 'dark:text-white'].forEach(function (c) { nav.classList.toggle(c, on); });
      var badge = menu.querySelector('[data-filter-count-badge="' + panel.key + '"]');
      var n = state.draft[panel.key].size;
      badge.textContent = String(n);
      badge.classList.toggle('hidden', !n);
      badge.classList.toggle('inline-flex', !!n);
    });
    $('pp-sup-filter-clear').disabled = !state.draft[state.activePanel].size;
    $('pp-sup-filter-apply').disabled = PANEL_KEYS.every(function (k) { return sameSet(state.draft[k], state.applied[k]); });
  }

  function layoutFilterMenu() {
    var menu = $('pp-sup-filter-menu');
    var mobile = window.matchMedia('(max-width: 639px)').matches;
    menu.style.cssText = mobile
      ? 'position:fixed;left:1rem;right:1rem;bottom:1rem;top:auto;margin:0;z-index:50;max-width:none;width:auto;max-height:calc(100dvh - 2rem)'
      : '';
  }

  function setFilterOpen(open) {
    state.menuOpen = !!open;
    var menu = $('pp-sup-filter-menu');
    var backdrop = $('pp-sup-filter-backdrop');
    var btn = $('pp-sup-filter-btn');
    if (!menu || !btn) return;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.querySelector('[data-filter-chevron]').classList.toggle('rotate-180', !!open);
    layoutFilterMenu();
    var hidden = ['invisible', 'opacity-0', 'pointer-events-none'];
    if (open) {
      state.draft = cloneFilters(state.applied);
      syncFilterMenu();
      hidden.forEach(function (c) { menu.classList.remove(c); });
      if (window.matchMedia('(max-width: 639px)').matches) hidden.forEach(function (c) { backdrop.classList.remove(c); });
    } else {
      hidden.forEach(function (c) { menu.classList.add(c); backdrop.classList.add(c); });
    }
  }

  // ── Applied filters, as the same tags the Payments table shows ──

  function tagsHtml() {
    var programs = programsInRows();
    var programName = {};
    var cohortName = {};
    programs.forEach(function (p) {
      programName[p.id] = p.name;
      p.order.forEach(function (c) { cohortName[c.id] = 'Cohort ' + c.stage + ' · ' + c.name; });
    });
    var label = {
      program: function (v) { return programName[v] || v; },
      cohort: function (v) { return cohortName[v] || v; },
      status: function (v) { return STATUS[v] ? STATUS[v].label : v; },
      method: function (v) { return v; }
    };
    return PANELS.filter(function (panel) { return state.applied[panel.key].size; }).map(function (panel) {
      var value = Array.from(state.applied[panel.key]).map(label[panel.key]).sort().join(', ');
      return '<span class="relative inline-flex max-w-[360px] items-stretch overflow-hidden rounded-md bg-gray-50 text-xs font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300">' +
        '<span class="inline-flex shrink-0 items-center bg-gray-100 px-2 py-1 font-medium text-gray-900 dark:bg-white/15 dark:text-white">' + escapeHtml(panel.label) + '</span>' +
        '<button type="button" data-filter-tag-open="' + panel.key + '" title="' + escapeHtml(panel.label + ': ' + value) + '" class="inline-flex min-w-0 cursor-pointer items-center border-l border-gray-300 bg-white px-2 py-1 text-left hover:bg-gray-100 dark:border-gray-500/40 dark:bg-white/5 dark:hover:bg-white/15">' +
          '<span class="truncate font-medium text-gray-900 dark:text-white">' + escapeHtml(value) + '</span></button>' +
        '<button type="button" data-filter-tag-remove="' + panel.key + '" aria-label="Remove filter" class="inline-flex w-6 shrink-0 cursor-pointer items-center justify-center self-stretch border-l border-gray-300 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:border-gray-500/40 dark:text-gray-300 dark:hover:bg-white/15 dark:hover:text-white">' +
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-3"><path fill-rule="evenodd" d="M4.22 4.22a.75.75 0 0 1 1.06 0L10 8.94l4.72-4.72a.75.75 0 1 1 1.06 1.06L11.06 10l4.72 4.72a.75.75 0 1 1-1.06 1.06L10 11.06l-4.72 4.72a.75.75 0 1 1-1.06-1.06L8.94 10 4.22 5.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg></button>' +
        '<span aria-hidden="true" class="pointer-events-none absolute inset-0 rounded-md inset-ring inset-ring-gray-300 dark:inset-ring-gray-500/40"></span></span>';
    }).join('');
  }

  function renderTags() {
    var wrap = $('pp-sup-tags');
    var html = tagsHtml();
    wrap.innerHTML = html;
    wrap.classList.toggle('hidden', !html);
    wrap.classList.toggle('flex', !!html);
    var total = filterTotal(state.applied);
    var badge = document.querySelector('#pp-sup-filter-btn [data-filter-count]');
    badge.textContent = total ? String(total) : '';
    badge.classList.toggle('hidden', !total);
    badge.classList.toggle('inline-flex', !!total);
  }

  /** Filters from a supplier-count link: ?filterProgram=…&filterCohort=… */
  function applyUrlFilters() {
    var params;
    try { params = new URLSearchParams(window.location.search); } catch (error) { return; }
    var program = params.get('filterProgram');
    if (!program) return;
    var cohort = params.get('filterCohort');
    state.applied = emptyFilters();
    state.applied.program.add(program);
    if (cohort) state.applied.cohort.add(cohort);
    state.search = '';
    var search = $('pp-sup-search');
    if (search) search.value = '';
    state.selected.clear();
    state.page = 1;
  }

  /** Once filters are changed by hand, the link's filter no longer describes the table. */
  function dropUrlFilters() {
    try {
      if (!/[?&]filter(Program|Cohort)=/.test(window.location.search)) return;
      window.history.replaceState({}, '', window.location.pathname + '?tab=suppliers');
    } catch (error) {}
  }

  // ── Table ──

  var TH = 'border-b border-gray-200 px-2 py-3.5 text-left text-sm font-semibold whitespace-nowrap text-gray-900 dark:border-white/10 dark:text-white';
  var TD = 'border-b border-gray-200 px-2 py-2 align-middle dark:border-white/10';

  function sortHeader(key, label) {
    var dir = state.sort && state.sort.key === key ? state.sort.dir : '';
    var badge = dir
      ? 'inline-flex size-6 items-center justify-center rounded-md bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
      : 'inline-flex size-6 items-center justify-center rounded-md bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-400';
    return '<th scope="col" class="' + TH + '" aria-sort="' + (dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none') + '">' +
      '<button type="button" data-sort-key="' + key + '" class="group flex w-full cursor-pointer items-center gap-x-1.5 rounded-md text-left text-sm font-semibold text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-white">' +
        '<span>' + label + '</span><span data-sort-badge="true" class="' + badge + '">' + (dir === 'asc' ? ICON_SORT_ASC : dir === 'desc' ? ICON_SORT_DESC : ICON_SORT) + '</span></button></th>';
  }

  function headHtml(pageRows) {
    var ids = pageRows.map(function (r) { return r.id; });
    var picked = ids.filter(function (id) { return state.selected.has(id); }).length;
    return '<tr>' +
      '<th scope="col" class="w-10 min-w-10 border-b border-gray-200 px-0 py-3.5 text-center dark:border-white/10">' + checkbox('data-sup-select-page' + (picked && picked < ids.length ? ' data-indeterminate' : ''), ids.length > 0 && picked === ids.length, 'Select all on this page') + '</th>' +
      sortHeader('name', 'Supplier') +
      sortHeader('program', 'Payment Program') +
      '<th scope="col" class="' + TH + '">Next Move</th>' +
      '<th scope="col" class="' + TH + '">Gets Paid By</th>' +
      sortHeader('ytd', 'YTD Spend') +
      sortHeader('status', 'Status') +
    '</tr>';
  }

  function stageBar(stage, stages) {
    var segs = '';
    for (var i = 1; i <= stages; i += 1) {
      segs += '<span class="h-1 w-9 rounded-full ' + (i === stage ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-200 dark:bg-white/15') + '"></span>';
    }
    return '<span class="flex gap-1" aria-hidden="true">' + segs + '</span>';
  }

  /** One line of text that truncates, with the full value on hover. */
  function line(text, cls) {
    return '<p class="truncate ' + cls + '" title="' + escapeHtml(text) + '">' + escapeHtml(text) + '</p>';
  }

  function rowHtml(r) {
    var st = STATUS[r.status];
    var nextTitleCls = r.nextMoves ? 'text-sm font-medium text-gray-900 dark:text-white' : 'text-sm text-gray-500 dark:text-gray-400';
    var nextSubCls = r.nextMoves
      ? 'mt-0.5 text-sm ' + (r.nextUrgent ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400')
      : 'mt-0.5 text-xs text-gray-500 dark:text-gray-400';
    return '<tr data-sup-row="' + escapeHtml(r.id) + '" class="transition-colors duration-300 motion-reduce:transition-none' + (state.selected.has(r.id) ? ' bg-blue-50/40 dark:bg-blue-500/5' : '') + '">' +
      '<td class="w-10 min-w-10 border-b border-gray-200 px-0 py-2 text-center align-middle dark:border-white/10">' + checkbox('data-sup-select="' + escapeHtml(r.id) + '"', state.selected.has(r.id), 'Select ' + r.name) + '</td>' +
      '<td class="' + TD + '">' + line(r.name, 'text-sm font-medium text-gray-900 dark:text-white') + line(r.code, 'mt-0.5 text-xs text-gray-500 dark:text-gray-400') + '</td>' +
      '<td class="' + TD + '">' + line(r.programName, 'text-[11px] leading-4 text-gray-500 dark:text-gray-400') +
        '<div class="my-1">' + stageBar(r.stage, r.stages) + '</div>' +
        '<p class="truncate text-xs" title="Cohort ' + r.stage + ' of ' + r.stages + ' · ' + escapeHtml(r.cohortName) + '">' +
          '<span class="font-medium text-gray-900 dark:text-white">Cohort ' + r.stage + ' of ' + r.stages + '</span>' +
          '<span class="text-gray-500 dark:text-gray-400"> · ' + escapeHtml(r.cohortName) + '</span></p></td>' +
      '<td class="' + TD + '">' + line(r.nextTitle, nextTitleCls) + line(r.nextSub, nextSubCls) + '</td>' +
      '<td class="' + TD + '"><div class="flex min-w-0 items-start gap-3">' + icon(r.payIcon, 'mt-px size-[18px] shrink-0 text-gray-500 dark:text-gray-400') +
        '<div class="min-w-0">' + line(r.payLabel, 'text-sm font-medium text-gray-900 dark:text-white') +
        line(r.paySub, 'mt-0.5 text-sm ' + (r.payPending ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400')) + '</div></div></td>' +
      '<td class="' + TD + ' text-sm font-medium whitespace-nowrap text-gray-900 tabular-nums dark:text-white">' + money(r.ytd) + ' <span class="font-normal text-gray-500 dark:text-gray-400">USD</span></td>' +
      '<td class="' + TD + '"><span class="inline-flex max-w-full items-center truncate rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap inset-ring ' + st.cls + '">' + st.label + '</span></td>' +
    '</tr>';
  }

  function emptyRowHtml() {
    return '<tr><td colspan="7" class="px-4 py-10"><div class="flex flex-col items-center text-center">' +
      '<p class="text-sm font-semibold text-gray-900 dark:text-white">No suppliers match</p>' +
      '<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Try a different search or clear the filters.</p></div></td></tr>';
  }

  // ── Pagination: the Payments table's bar ──

  function pageNumbers(current, total) {
    if (total <= 7) { var all = []; for (var i = 1; i <= total; i += 1) all.push(i); return all; }
    var pages = [1];
    if (current > 3) pages.push('...');
    for (var j = Math.max(2, current - 1); j <= Math.min(total - 1, current + 1); j += 1) pages.push(j);
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  }

  function footerHtml(total) {
    var pages = pageCount(total);
    var page = state.page;
    var start = total ? (page - 1) * state.pageSize + 1 : 0;
    var end = Math.min(page * state.pageSize, total);
    var first = page <= 1;
    var last = page >= pages;
    var off = ' pointer-events-none opacity-50';
    var numbers = pageNumbers(page, pages).map(function (p) {
      if (p === '...') return '<span class="relative inline-flex items-center px-2.5 py-1 text-xs font-semibold text-gray-700 inset-ring inset-ring-gray-300 dark:text-gray-400 dark:inset-ring-gray-700">...</span>';
      return p === page
        ? '<a href="#" data-page-num="' + p + '" aria-current="page" class="relative z-10 inline-flex items-center bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-600 inset-ring inset-ring-blue-300 focus:z-20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-blue-500/10 dark:text-blue-400 dark:inset-ring-blue-500/30">' + p + '</a>'
        : '<a href="#" data-page-num="' + p + '" class="relative inline-flex items-center px-2.5 py-1 text-xs font-semibold text-gray-900 inset-ring inset-ring-gray-300 hover:bg-gray-50 focus:z-20 dark:text-gray-200 dark:inset-ring-gray-700 dark:hover:bg-white/5">' + p + '</a>';
    }).join('');
    var sizes = PAGE_SIZES.map(function (n) {
      return '<a href="#" data-page-size="' + n + '" class="block px-4 py-2 text-sm ' +
        (n === state.pageSize ? 'bg-gray-50 font-semibold text-gray-900 dark:bg-white/5 dark:text-white' : 'text-gray-700 dark:text-gray-300') +
        ' hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900 focus:outline-hidden dark:hover:bg-white/5 dark:hover:text-white dark:focus:bg-white/5 dark:focus:text-white">' + n + '</a>';
    }).join('');
    var mobileBtn = 'relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10';
    var arrow = 'relative inline-flex items-center px-1.5 py-1 text-gray-400 inset-ring inset-ring-gray-300 hover:bg-gray-50 focus:z-20 dark:inset-ring-gray-700 dark:hover:bg-white/5';
    return '<div class="flex flex-1 justify-between sm:hidden">' +
        '<a href="#" data-page-prev class="' + mobileBtn + (first ? off : '') + '">Previous</a>' +
        '<a href="#" data-page-next class="ml-3 ' + mobileBtn + (last ? off : '') + '">Next</a></div>' +
      '<div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">' +
        '<div class="flex items-center gap-x-6">' +
          '<p class="text-sm text-gray-700 dark:text-gray-300">Showing <span class="font-medium">' + start.toLocaleString('en-US') + '</span> to <span class="font-medium">' + end.toLocaleString('en-US') + '</span> of <span class="font-medium">' + total.toLocaleString('en-US') + '</span> results</p>' +
          '<div class="flex items-center gap-x-2 text-sm text-gray-500 dark:text-gray-400"><span>Rows per page:</span>' +
            '<el-dropdown class="inline-block">' +
              '<button type="button" class="inline-flex cursor-pointer items-center gap-x-1 rounded-sm bg-white px-2 py-1 text-xs font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20">' + state.pageSize + ' ' + ICON_CHEVRON_DOWN + '</button>' +
              '<el-menu anchor="top end" popover class="w-32 origin-bottom-right rounded-md bg-white shadow-lg outline-1 outline-black/5 transition transition-discrete [--anchor-gap:--spacing(2)] data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in dark:bg-gray-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10"><div class="py-1">' + sizes + '</div></el-menu>' +
            '</el-dropdown></div>' +
        '</div>' +
        '<nav aria-label="Pagination" class="isolate inline-flex -space-x-px overflow-hidden rounded-sm shadow-xs inset-ring inset-ring-gray-300 dark:shadow-none dark:inset-ring-gray-700">' +
          '<a href="#" data-page-prev class="rounded-l-sm ' + arrow + (first ? off : '') + '"><span class="sr-only">Previous</span><svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd" fill-rule="evenodd" /></svg></a>' +
          numbers +
          '<a href="#" data-page-next class="rounded-r-sm ' + arrow + (last ? off : '') + '"><span class="sr-only">Next</span><svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" fill-rule="evenodd" /></svg></a>' +
        '</nav>' +
      '</div>';
  }

  // ── Skeleton (dynamic values only; headers and toolbar stay) ──

  function bar(w, h) { return '<span class="pp-skel max-w-full" style="width:' + w + ';height:' + h + '"></span>'; }

  function skeletonRows(n) {
    var html = '';
    for (var i = 0; i < n; i += 1) {
      html += '<tr aria-hidden="true">' +
        '<td class="w-10 min-w-10 border-b border-gray-200 px-0 py-2 text-center dark:border-white/10">' + bar('1rem', '1rem') + '</td>' +
        '<td class="' + TD + '"><div class="flex flex-col gap-1.5">' + bar('8.5rem', '0.9rem') + bar('3.5rem', '0.7rem') + '</div></td>' +
        '<td class="' + TD + '"><div class="flex flex-col gap-1.5">' + bar('9rem', '0.7rem') + bar('7.5rem', '0.3rem') + bar('10rem', '0.7rem') + '</div></td>' +
        '<td class="' + TD + '"><div class="flex flex-col gap-1.5">' + bar('7.5rem', '0.9rem') + bar('4rem', '0.8rem') + '</div></td>' +
        '<td class="' + TD + '"><div class="flex gap-3">' + bar('1.1rem', '1.1rem') + '<div class="flex flex-col gap-1.5">' + bar('8rem', '0.9rem') + bar('6rem', '0.8rem') + '</div></div></td>' +
        '<td class="' + TD + '">' + bar('5rem', '0.9rem') + '</td>' +
        '<td class="' + TD + '">' + bar('6rem', '1.5rem') + '</td>' +
      '</tr>';
    }
    return html;
  }

  function footerSkeleton() {
    return '<div class="flex flex-1 items-center justify-between" aria-hidden="true">' +
      '<div class="flex items-center gap-x-6">' + bar('14rem', '1rem') + bar('7rem', '1.5rem') + '</div>' + bar('12rem', '1.5rem') + '</div>';
  }

  // ── Render ──

  function ensureShell() {
    var host = $('pp-suppliers-body');
    if (host.getAttribute('data-ready')) return host;
    host.setAttribute('data-ready', '1');
    host.innerHTML = '<div class="pt-3">' + toolbarHtml() +
        '<div class="border-t border-gray-200 dark:border-white/10"></div>' +
        '<div class="px-0 sm:px-4"><div class="w-full max-w-full overflow-x-auto">' +
          '<table class="w-full min-w-[960px] table-fixed border-separate border-spacing-0">' +
            '<colgroup><col class="w-10" /><col class="w-[21%]" /><col class="w-[19%]" /><col class="w-[15%]" /><col class="w-[19%]" /><col class="w-[13%]" /><col class="w-[13%]" /></colgroup>' +
            '<thead id="pp-sup-head"></thead><tbody id="pp-sup-body" class="bg-white dark:bg-gray-900"></tbody></table>' +
        '</div></div>' +
      '</div>' +
      '<div id="pp-sup-footer" class="sticky bottom-0 z-20 flex border-t border-gray-200 bg-white px-4 py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] sm:rounded-b-lg sm:px-6 dark:border-white/10 dark:bg-gray-900 dark:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)]"></div>';
    bindShell(host);
    return host;
  }

  function render() {
    var rows = visibleRows();
    var pages = pageCount(rows.length);
    if (state.page > pages) state.page = pages;
    var pageRows = rows.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);

    $('pp-sup-head').innerHTML = headHtml(pageRows);
    var pageBox = document.querySelector('[data-sup-select-page]');
    if (pageBox) pageBox.indeterminate = pageBox.hasAttribute('data-indeterminate');

    $('pp-sup-body').innerHTML = pageRows.length ? pageRows.map(rowHtml).join('') : emptyRowHtml();
    $('pp-sup-footer').innerHTML = footerHtml(rows.length);
    renderTags();
    $('pp-suppliers-body').setAttribute('aria-busy', 'false');
  }

  function showSkeleton() {
    renderTags();
    $('pp-sup-head').innerHTML = headHtml([]);
    $('pp-sup-body').innerHTML = skeletonRows(Math.min(state.pageSize, 10));
    $('pp-sup-footer').innerHTML = footerSkeleton();
    $('pp-suppliers-body').setAttribute('aria-busy', 'true');
  }

  /** Deliberate load time, same as every other screen on this page. */
  function load(instant, after) {
    clearTimeout(state.loadTimer);
    if (instant) { buildRows(); render(); return; }
    state.loading = true;
    showSkeleton();
    state.loadTimer = setTimeout(function () {
      state.loading = false;
      buildRows();
      render();
      if (after) after();
    }, window.PaymentPrograms.loadDelay());
  }

  // ── Export ──

  function exportCsv() {
    var rows = visibleRows();
    if (state.selected.size) rows = rows.filter(function (r) { return state.selected.has(r.id); });
    var cols = [
      ['Supplier', 'name'], ['Supplier ID', 'code'], ['Payment program', 'programName'],
      ['Cohort', function (r) { return 'Cohort ' + r.stage + ' of ' + r.stages + ' · ' + r.cohortName; }],
      ['Next move', function (r) { return r.nextTitle.replace('→ ', '') + ' — ' + r.nextSub; }],
      ['Gets paid by', 'payLabel'], ['Payment detail', 'paySub'], ['YTD spend', 'ytd'],
      ['Status', function (r) { return STATUS[r.status].label; }]
    ];
    var cell = function (v) { var t = String(v == null ? '' : v); return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
    var lines = [cols.map(function (c) { return cell(c[0]); }).join(',')].concat(rows.map(function (r) {
      return cols.map(function (c) { return cell(typeof c[1] === 'function' ? c[1](r) : r[c[1]]); }).join(',');
    }));
    var blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'payment-program-suppliers.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  // ── Events ──

  var searchTimer = null;
  var refreshTurns = 0;

  function bindShell(host) {
    host.addEventListener('input', function (event) {
      if (event.target.id !== 'pp-sup-search') return;
      var value = event.target.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () { state.search = value; state.page = 1; if (!state.loading) render(); }, 150);
    });

    host.addEventListener('change', function (event) {
      var t = event.target;
      if (t.hasAttribute('data-filter-value')) {
        var key = t.getAttribute('data-filter-panel-key');
        var value = t.getAttribute('data-filter-value');
        if (t.checked) state.draft[key].add(value); else state.draft[key].delete(value);
        if (key === 'program') pruneCohorts(state.draft);
        syncFilterMenu(true);
        return;
      }
      if (t.hasAttribute('data-sup-select-page')) {
        var ids = Array.prototype.map.call(document.querySelectorAll('[data-sup-select]'), function (el) { return el.getAttribute('data-sup-select'); });
        ids.forEach(function (id) { if (t.checked) state.selected.add(id); else state.selected.delete(id); });
        render();
        return;
      }
      if (t.hasAttribute('data-sup-select')) {
        var id = t.getAttribute('data-sup-select');
        if (t.checked) state.selected.add(id); else state.selected.delete(id);
        render();
      }
    });

    host.addEventListener('click', function (event) {
      var t = event.target;

      if (t.closest('#pp-sup-filter-btn')) { setFilterOpen(!state.menuOpen); return; }
      var nav = t.closest('[data-filter-open]');
      if (nav) { state.activePanel = nav.getAttribute('data-filter-open'); syncFilterMenu(); return; }
      if (t.closest('#pp-sup-filter-clear')) { state.draft[state.activePanel].clear(); syncFilterMenu(); return; }
      if (t.closest('#pp-sup-filter-apply')) {
        var next = cloneFilters(state.draft);
        setFilterOpen(false);
        dropUrlFilters();
        state.applied = next;
        state.page = 1;
        load(false);
        return;
      }
      if (t.closest('#pp-sup-filter-backdrop')) { setFilterOpen(false); return; }

      var tagOpen = t.closest('[data-filter-tag-open]');
      if (tagOpen) { state.activePanel = tagOpen.getAttribute('data-filter-tag-open'); setFilterOpen(true); return; }
      var tagRemove = t.closest('[data-filter-tag-remove]');
      if (tagRemove) {
        state.applied[tagRemove.getAttribute('data-filter-tag-remove')].clear();
        dropUrlFilters();
        state.page = 1;
        render();
        return;
      }

      var refresh = t.closest('[data-sup-refresh]');
      if (refresh) {
        if (state.loading) return;
        state.selected.clear();
        refreshTurns += 1;
        var spin = refresh.querySelector('svg');
        spin.style.transition = 'transform 800ms ease-out';
        spin.style.transform = 'rotate(' + (refreshTurns * 180) + 'deg)';
        load(false, function () {
          if (typeof window.showGlobalTopToast === 'function') window.showGlobalTopToast("Data synced. You're up to date.");
        });
        return;
      }
      if (t.closest('[data-sup-export]')) { exportCsv(); return; }

      var sortBtn = t.closest('[data-sort-key]');
      if (sortBtn) {
        var key = sortBtn.getAttribute('data-sort-key');
        var dir = state.sort && state.sort.key === key ? state.sort.dir : '';
        state.sort = dir === '' ? { key: key, dir: 'asc' } : dir === 'asc' ? { key: key, dir: 'desc' } : null;
        state.page = 1; render(); return;
      }

      var size = t.closest('[data-page-size]');
      if (size) { event.preventDefault(); state.pageSize = Number(size.getAttribute('data-page-size')) || 10; state.page = 1; render(); return; }
      var num = t.closest('[data-page-num]');
      var prev = t.closest('[data-page-prev]');
      var nextBtn = t.closest('[data-page-next]');
      if (num || prev || nextBtn) {
        event.preventDefault();
        var pages = pageCount(visibleRows().length);
        var target = num ? Number(num.getAttribute('data-page-num')) : state.page + (prev ? -1 : 1);
        state.page = Math.max(1, Math.min(pages, target));
        render();
      }
    });

    document.addEventListener('click', function (event) {
      if (!state.menuOpen) return;
      if (event.target.closest('#pp-sup-filter-dropdown') || event.target.closest('[data-filter-tag-open]')) return;
      setFilterOpen(false);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && state.menuOpen) setFilterOpen(false);
    });
    window.addEventListener('resize', function () { if (state.menuOpen) layoutFilterMenu(); });
  }

  // ── Public ──

  window.PaymentProgramSuppliers = {
    show: function (options) {
      var opts = options || {};
      window.PaymentPrograms.ready.then(function () {
        ensureShell();
        if (state.menuOpen) setFilterOpen(false);
        applyUrlFilters();
        load(!!opts.instant);
      });
    }
  };

  // Cohort changes (disable + migrate) move people; keep this tab truthful.
  if (window.PaymentPrograms) {
    window.PaymentPrograms.onChange(function () {
      var host = $('pp-suppliers-body');
      if (host && host.getAttribute('data-ready') && !state.loading) { buildRows(); if (!host.classList.contains('hidden')) render(); }
    });
  }
})();

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

  var PAGE_SIZES = [10, 25, 50];
  var STATUS = {
    attention: { label: 'Needs attention', cls: 'border-red-200 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300' },
    awaiting: { label: 'Awaiting choice', cls: 'border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-400/20 dark:bg-yellow-400/10 dark:text-yellow-300' },
    digital: { label: 'Paying digitally', cls: 'border-green-200 bg-green-50 text-green-700 dark:border-green-400/20 dark:bg-green-500/10 dark:text-green-300' }
  };
  var STATUS_ORDER = ['attention', 'awaiting', 'digital'];

  var state = {
    rows: [],
    search: '',
    statuses: new Set(),
    programs: new Set(),
    sort: null,          // null | 'desc' | 'asc'  (YTD spend)
    page: 1,
    pageSize: 10,
    selected: new Set(),
    loadTimer: null,
    loading: false,
    filterOpen: false
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

  function visibleRows() {
    var q = state.search.trim().toLowerCase();
    var list = state.rows.filter(function (r) {
      if (state.statuses.size && !state.statuses.has(r.status)) return false;
      if (state.programs.size && !state.programs.has(r.programId)) return false;
      if (!q) return true;
      return (r.name + ' ' + r.code + ' ' + r.programName + ' ' + r.cohortName + ' ' + r.payLabel).toLowerCase().indexOf(q) !== -1;
    });
    if (state.sort) {
      var dir = state.sort === 'asc' ? 1 : -1;
      list = list.slice().sort(function (a, b) { return (a.ytd - b.ytd) * dir; });
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

  var CHECKBOX = 'col-start-1 row-start-1 appearance-none rounded-sm border border-gray-300 bg-white checked:border-blue-600 checked:bg-blue-600 indeterminate:border-blue-600 indeterminate:bg-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-gray-600 dark:bg-white/5 dark:checked:border-blue-500 dark:checked:bg-blue-500';

  function checkbox(attrs, checked, label) {
    return '<span class="group grid size-4 grid-cols-1">' +
      '<input type="checkbox" ' + attrs + (checked ? ' checked' : '') + ' aria-label="' + escapeHtml(label) + '" class="' + CHECKBOX + '" />' +
      '<svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white">' +
        '<path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-checked:opacity-100" />' +
        '<path d="M3 7H11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-indeterminate:opacity-100" />' +
      '</svg></span>';
  }

  // ── Toolbar (static between renders so search keeps focus) ──

  var BTN_SECONDARY = 'inline-flex h-10 cursor-pointer items-center justify-center gap-x-1.5 rounded-md bg-white px-3 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/20';

  function toolbarHtml() {
    return '<div class="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">' +
      '<div class="flex items-center gap-6">' +
        '<h2 class="text-lg font-semibold text-gray-900 dark:text-white">Suppliers</h2>' +
        '<button type="button" data-sup-refresh class="inline-flex cursor-pointer items-center gap-x-1.5 rounded-md bg-gray-100 px-2.5 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20">' +
          '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clip-rule="evenodd" /></svg>' +
          'Refresh</button>' +
      '</div>' +
      '<div class="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">' +
        '<div class="grid grid-cols-1 sm:w-64">' +
          '<input id="pp-sup-search" type="search" autocomplete="off" placeholder="Search" aria-label="Search suppliers"' +
            ' class="col-start-1 row-start-1 block h-10 w-full rounded-md bg-white pr-3 pl-10 text-base text-gray-900 shadow-xs outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500" />' +
          '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="pointer-events-none col-start-1 row-start-1 ml-3 size-5 self-center text-gray-400"><path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clip-rule="evenodd" /></svg>' +
        '</div>' +
        '<div class="flex gap-3 sm:gap-4">' +
          '<div class="relative">' +
            '<button type="button" data-sup-filter-toggle aria-haspopup="true" aria-expanded="false" class="' + BTN_SECONDARY + '">Filter' +
              '<span data-sup-filter-count class="hidden items-center rounded-full bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-600 tabular-nums inset-ring inset-ring-gray-500/10 dark:bg-white/10 dark:text-gray-400"></span>' +
              '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" data-sup-filter-chevron class="-mr-0.5 size-5 text-gray-500 transition-transform"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>' +
            '</button>' +
            '<div id="pp-sup-filter-panel" class="absolute right-0 z-30 mt-2 hidden w-72 overflow-hidden rounded-md bg-white shadow-lg outline-1 outline-black/5 dark:bg-gray-800 dark:outline-white/10"></div>' +
          '</div>' +
          '<button type="button" data-sup-export class="' + BTN_SECONDARY + '">Export' +
            '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="-mr-0.5 size-5 text-gray-500"><path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0l-4.25 4.5a.75.75 0 1 0 1.09 1.03L9.25 4.636v8.614Z" /><path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" /></svg>' +
          '</button>' +
          '<button type="button" disabled title="Manage columns — coming soon" aria-label="Manage columns" class="' + BTN_SECONDARY + ' w-10 px-0 disabled:cursor-not-allowed disabled:opacity-50">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="size-5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" /></svg>' +
          '</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function filterPanelHtml() {
    var programs = window.PaymentPrograms.getPrograms().filter(function (p) { return p.published; });
    var group = function (title, items) {
      return '<div class="border-b border-gray-200 p-3 last:border-b-0 dark:border-white/10">' +
        '<p class="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">' + title + '</p>' +
        '<div class="flex flex-col gap-2">' + items + '</div></div>';
    };
    var statusItems = STATUS_ORDER.map(function (k) {
      return '<label class="flex cursor-pointer items-center gap-3 text-sm text-gray-900 dark:text-gray-100">' +
        checkbox('data-sup-filter-status="' + k + '"', state.statuses.has(k), STATUS[k].label) + STATUS[k].label + '</label>';
    }).join('');
    var programItems = programs.map(function (p) {
      return '<label class="flex cursor-pointer items-center gap-3 text-sm text-gray-900 dark:text-gray-100">' +
        checkbox('data-sup-filter-program="' + escapeHtml(p.id) + '"', state.programs.has(p.id), p.published.name) +
        '<span class="truncate">' + escapeHtml(p.published.name) + '</span></label>';
    }).join('');
    var clear = (state.statuses.size || state.programs.size)
      ? '<div class="flex justify-end p-2"><button type="button" data-sup-filter-clear class="cursor-pointer rounded-md px-2 py-1 text-sm font-semibold text-blue-600 hover:bg-blue-600/10 dark:text-blue-400">Clear all</button></div>'
      : '';
    return group('Status', statusItems) + group('Payment program', programItems) + clear;
  }

  // ── Table ──

  var TH = 'h-10 px-3 text-left text-xs font-medium tracking-wide whitespace-nowrap text-gray-500 uppercase dark:text-gray-400';
  var TD = 'px-3 py-2 align-middle';

  function sortIcon() {
    var up = state.sort === 'asc' ? 'text-gray-900 dark:text-white' : 'text-gray-400';
    var down = state.sort === 'desc' ? 'text-gray-900 dark:text-white' : 'text-gray-400';
    return '<span class="flex flex-col">' +
      '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="-mb-1.5 size-4 ' + up + '"><path fill-rule="evenodd" d="M9.47 6.47a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 1 1-1.06 1.06L10 8.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06l4.25-4.25Z" clip-rule="evenodd" /></svg>' +
      '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4 ' + down + '"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>' +
    '</span>';
  }

  function headHtml(pageRows) {
    var ids = pageRows.map(function (r) { return r.id; });
    var picked = ids.filter(function (id) { return state.selected.has(id); }).length;
    return '<tr class="border-b border-gray-200 dark:border-white/10">' +
      '<th scope="col" class="h-10 pr-0 pl-3">' + checkbox('data-sup-select-page' + (picked && picked < ids.length ? ' data-indeterminate' : ''), ids.length > 0 && picked === ids.length, 'Select all on this page') + '</th>' +
      '<th scope="col" class="' + TH + '">Supplier</th>' +
      '<th scope="col" class="' + TH + '">Payment program</th>' +
      '<th scope="col" class="' + TH + '">Next move</th>' +
      '<th scope="col" class="' + TH + '">Gets paid by</th>' +
      '<th scope="col" class="' + TH + '" aria-sort="' + (state.sort === 'asc' ? 'ascending' : state.sort === 'desc' ? 'descending' : 'none') + '">' +
        '<button type="button" data-sup-sort class="inline-flex cursor-pointer items-center gap-1 uppercase hover:text-gray-700 dark:hover:text-gray-200">YTD spend' + sortIcon() + '</button></th>' +
      '<th scope="col" class="' + TH + '">Status</th>' +
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
    return '<tr data-sup-row="' + escapeHtml(r.id) + '" class="border-b border-gray-200 last:border-b-0 hover:bg-gray-50/60 dark:border-white/10 dark:hover:bg-white/5' + (state.selected.has(r.id) ? ' bg-blue-50/40 dark:bg-blue-500/5' : '') + '">' +
      '<td class="h-14 pr-0 pl-3 align-middle">' + checkbox('data-sup-select="' + escapeHtml(r.id) + '"', state.selected.has(r.id), 'Select ' + r.name) + '</td>' +
      '<td class="' + TD + '">' + line(r.name, 'text-sm font-medium text-gray-900 dark:text-white') + line(r.code, 'mt-0.5 text-xs text-gray-500 dark:text-gray-400') + '</td>' +
      '<td class="' + TD + '">' + line(r.programName, 'text-[11px] leading-4 text-gray-500 dark:text-gray-400') +
        '<div class="my-1">' + stageBar(r.stage, r.stages) + '</div>' +
        '<p class="truncate text-xs" title="Cohort ' + r.stage + ' of ' + r.stages + ' · ' + escapeHtml(r.cohortName) + '">' +
          '<span class="font-medium text-gray-900 dark:text-white">Cohort ' + r.stage + ' of ' + r.stages + '</span>' +
          '<span class="text-gray-500 dark:text-gray-400"> · ' + escapeHtml(r.cohortName) + '</span></p></td>' +
      '<td class="' + TD + '">' + line(r.nextTitle, nextTitleCls) + line(r.nextSub, nextSubCls) + '</td>' +
      '<td class="' + TD + '"><div class="flex min-w-0 items-start gap-3">' + icon(r.payIcon, 'mt-px size-[18px] shrink-0 text-gray-500 dark:text-gray-400') +
        '<div class="min-w-0">' + line(r.payLabel, 'text-sm text-gray-900 dark:text-white') +
        line(r.paySub, 'mt-0.5 text-sm ' + (r.payPending ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400')) + '</div></div></td>' +
      '<td class="' + TD + ' text-sm whitespace-nowrap text-gray-500 tabular-nums dark:text-gray-400">' + money(r.ytd) + '</td>' +
      '<td class="' + TD + '"><span class="inline-flex max-w-full items-center truncate rounded-sm border px-2 py-0.5 text-xs font-medium whitespace-nowrap ' + st.cls + '">' + st.label + '</span></td>' +
    '</tr>';
  }

  function emptyRowHtml() {
    return '<tr><td colspan="7" class="px-4 py-10"><div class="flex flex-col items-center text-center">' +
      '<p class="text-sm font-semibold text-gray-900 dark:text-white">No suppliers match</p>' +
      '<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Try a different search or clear the filters.</p></div></td></tr>';
  }

  var PAGE_BTN = 'flex size-8 cursor-pointer items-center justify-center rounded-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-gray-400';

  function pageBtn(attr, label, path, disabled) {
    return '<button type="button" ' + attr + ' aria-label="' + label + '"' + (disabled ? ' disabled' : '') + ' class="' + PAGE_BTN + '">' +
      '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path fill-rule="evenodd" clip-rule="evenodd" d="' + path + '" /></svg></button>';
  }

  var P_PREV = 'M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z';
  var P_NEXT = 'M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z';
  var P_FIRST = 'M15.79 14.77a.75.75 0 0 1-1.06.02l-4.5-4.25a.75.75 0 0 1 0-1.08l4.5-4.25a.75.75 0 1 1 1.04 1.08L11.832 10l3.938 3.71a.75.75 0 0 1 .02 1.06Zm-6 0a.75.75 0 0 1-1.06.02l-4.5-4.25a.75.75 0 0 1 0-1.08l4.5-4.25a.75.75 0 1 1 1.04 1.08L5.832 10l3.938 3.71a.75.75 0 0 1 .02 1.06Z';
  var P_LAST = 'M10.21 14.77a.75.75 0 0 1 .02-1.06L14.168 10 10.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Zm-6 0a.75.75 0 0 1 .02-1.06L8.168 10 4.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z';

  function footerHtml(total) {
    var pages = pageCount(total);
    var start = total ? (state.page - 1) * state.pageSize + 1 : 0;
    var end = Math.min(state.page * state.pageSize, total);
    var sizes = PAGE_SIZES.map(function (n) { return '<option value="' + n + '"' + (n === state.pageSize ? ' selected' : '') + '>' + n + '</option>'; }).join('');
    return '<div class="flex flex-col items-end gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:gap-6 sm:px-6">' +
      '<div class="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300"><label for="pp-sup-page-size">Rows per Page:</label>' +
        '<div class="grid grid-cols-1">' +
          '<select id="pp-sup-page-size" class="col-start-1 row-start-1 h-10 w-20 appearance-none rounded-md bg-white pr-8 pl-3 text-base text-gray-900 shadow-xs outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:*:bg-gray-800">' + sizes + '</select>' +
          '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>' +
        '</div></div>' +
      '<p class="text-sm text-gray-700 dark:text-gray-300">Showing <span class="font-semibold">' + start.toLocaleString('en-US') + ' - ' + end.toLocaleString('en-US') + '</span> of <span class="font-semibold">' + total.toLocaleString('en-US') + '</span> results</p>' +
      '<div class="flex items-center gap-2">' +
        pageBtn('data-sup-page="first"', 'First page', P_FIRST, state.page <= 1) +
        pageBtn('data-sup-page="prev"', 'Previous page', P_PREV, state.page <= 1) +
        pageBtn('data-sup-page="next"', 'Next page', P_NEXT, state.page >= pages) +
        pageBtn('data-sup-page="last"', 'Last page', P_LAST, state.page >= pages) +
      '</div>' +
    '</div>';
  }

  // ── Skeleton (dynamic values only; headers and toolbar stay) ──

  function bar(w, h) { return '<span class="pp-skel max-w-full" style="width:' + w + ';height:' + h + '"></span>'; }

  function skeletonRows(n) {
    var html = '';
    for (var i = 0; i < n; i += 1) {
      html += '<tr class="border-b border-gray-200 last:border-b-0 dark:border-white/10" aria-hidden="true">' +
        '<td class="h-14 pr-0 pl-3">' + bar('1rem', '1rem') + '</td>' +
        '<td class="' + TD + '"><div class="flex flex-col gap-1.5">' + bar('8.5rem', '0.9rem') + bar('3.5rem', '0.7rem') + '</div></td>' +
        '<td class="' + TD + '"><div class="flex flex-col gap-1.5">' + bar('9rem', '0.7rem') + bar('7.5rem', '0.3rem') + bar('10rem', '0.7rem') + '</div></td>' +
        '<td class="' + TD + '"><div class="flex flex-col gap-1.5">' + bar('7.5rem', '0.9rem') + bar('4rem', '0.8rem') + '</div></td>' +
        '<td class="' + TD + '"><div class="flex gap-3">' + bar('1.1rem', '1.1rem') + '<div class="flex flex-col gap-1.5">' + bar('8rem', '0.9rem') + bar('6rem', '0.8rem') + '</div></div></td>' +
        '<td class="' + TD + '">' + bar('4rem', '0.9rem') + '</td>' +
        '<td class="' + TD + '">' + bar('6rem', '1.25rem') + '</td>' +
      '</tr>';
    }
    return html;
  }

  // ── Render ──

  function ensureShell() {
    var host = $('pp-suppliers-body');
    if (host.getAttribute('data-ready')) return host;
    host.setAttribute('data-ready', '1');
    host.innerHTML = toolbarHtml() +
      '<div class="px-2 sm:px-4"><div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-white/10">' +
        '<table class="w-full min-w-[960px] table-fixed">' +
          '<colgroup><col class="w-10" /><col class="w-[21%]" /><col class="w-[19%]" /><col class="w-[15%]" /><col class="w-[20%]" /><col class="w-[12%]" /><col class="w-[13%]" /></colgroup>' +
          '<thead id="pp-sup-head" class="bg-gray-50 dark:bg-white/5"></thead><tbody id="pp-sup-body" class="bg-white dark:bg-transparent"></tbody></table>' +
      '</div></div>' +
      '<div id="pp-sup-footer"></div>';
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

    var count = state.statuses.size + state.programs.size;
    var badge = document.querySelector('[data-sup-filter-count]');
    if (badge) {
      badge.textContent = count ? String(count) : '';
      badge.classList.toggle('hidden', !count);
      badge.classList.toggle('inline-flex', !!count);
    }
    $('pp-suppliers-body').setAttribute('aria-busy', 'false');
  }

  function showSkeleton() {
    $('pp-sup-head').innerHTML = headHtml([]);
    $('pp-sup-body').innerHTML = skeletonRows(Math.min(state.pageSize, 8));
    $('pp-sup-footer').innerHTML = footerHtml(0).replace('Showing', 'Loading').replace(/<span class="font-semibold">0 - 0<\/span> of <span class="font-semibold">0<\/span> results/, 'suppliers…');
    $('pp-suppliers-body').setAttribute('aria-busy', 'true');
  }

  /** Deliberate load time, same as every other screen on this page. */
  function load(instant) {
    clearTimeout(state.loadTimer);
    if (instant) { buildRows(); render(); return; }
    state.loading = true;
    showSkeleton();
    state.loadTimer = setTimeout(function () {
      state.loading = false;
      buildRows();
      render();
    }, window.PaymentPrograms.loadDelay());
  }

  // ── Filter popover ──

  function setFilterOpen(open) {
    state.filterOpen = open;
    var panel = $('pp-sup-filter-panel');
    var toggle = document.querySelector('[data-sup-filter-toggle]');
    if (!panel || !toggle) return;
    if (open) panel.innerHTML = filterPanelHtml();
    panel.classList.toggle('hidden', !open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    var chevron = toggle.querySelector('[data-sup-filter-chevron]');
    if (chevron) chevron.classList.toggle('rotate-180', open);
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

  function bindShell(host) {
    host.addEventListener('input', function (event) {
      if (event.target.id !== 'pp-sup-search') return;
      clearTimeout(searchTimer);
      var value = event.target.value;
      searchTimer = setTimeout(function () { state.search = value; state.page = 1; if (!state.loading) render(); }, 150);
    });

    host.addEventListener('change', function (event) {
      var t = event.target;
      if (t.id === 'pp-sup-page-size') { state.pageSize = Number(t.value) || 10; state.page = 1; render(); return; }
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
        return;
      }
      if (t.hasAttribute('data-sup-filter-status')) {
        var s = t.getAttribute('data-sup-filter-status');
        if (t.checked) state.statuses.add(s); else state.statuses.delete(s);
        state.page = 1; render(); setFilterOpen(true);
        return;
      }
      if (t.hasAttribute('data-sup-filter-program')) {
        var p = t.getAttribute('data-sup-filter-program');
        if (t.checked) state.programs.add(p); else state.programs.delete(p);
        state.page = 1; render(); setFilterOpen(true);
      }
    });

    host.addEventListener('click', function (event) {
      var t = event.target;
      if (t.closest('[data-sup-filter-toggle]')) { setFilterOpen(!state.filterOpen); return; }
      if (t.closest('[data-sup-filter-clear]')) { state.statuses.clear(); state.programs.clear(); state.page = 1; render(); setFilterOpen(true); return; }
      if (t.closest('[data-sup-refresh]')) { state.selected.clear(); load(false); return; }
      if (t.closest('[data-sup-export]')) { exportCsv(); return; }
      if (t.closest('[data-sup-sort]')) {
        state.sort = state.sort === null ? 'desc' : state.sort === 'desc' ? 'asc' : null;
        state.page = 1; render(); return;
      }
      var nav = t.closest('[data-sup-page]');
      if (nav && !nav.disabled) {
        var pages = pageCount(visibleRows().length);
        var dir = nav.getAttribute('data-sup-page');
        state.page = dir === 'first' ? 1 : dir === 'last' ? pages : dir === 'prev' ? state.page - 1 : state.page + 1;
        state.page = Math.max(1, Math.min(pages, state.page));
        render();
      }
    });

    document.addEventListener('click', function (event) {
      if (!state.filterOpen) return;
      if (event.target.closest('#pp-sup-filter-panel') || event.target.closest('[data-sup-filter-toggle]')) return;
      setFilterOpen(false);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && state.filterOpen) setFilterOpen(false);
    });
  }

  // ── Public ──

  window.PaymentProgramSuppliers = {
    show: function (options) {
      var opts = options || {};
      window.PaymentPrograms.ready.then(function () {
        ensureShell();
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

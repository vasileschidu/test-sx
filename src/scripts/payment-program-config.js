/**
 * payment-program-config.js
 * Transcard-only Payment Program Configuration.
 *
 * Flow: list (or empty state) -> "Create Payment Program" drawer -> program
 * detail -> edit cohorts in a drawer -> publish. Programs live in
 * localStorage, seeded from src/data/payment-programs.json; the prototype has
 * no backend to write to.
 *
 * Draft model: a program keeps the version clients use in `published` and
 * the working copy in `name`/`cohorts`. Whether there is a draft is never
 * stored — it is the difference between the two, so reverting an edit by
 * hand clears the draft on its own, and every changed cohort can be pointed at.
 *
 * Every screen that would wait on a server behind a real product shows a
 * deliberate skeleton first (LOAD_MIN_MS..LOAD_MAX_MS). Only dynamic values
 * are skeletoned; static labels stay.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'sx_payment_programs_v4';
  var ROSTER_KEY = 'sx_pp_suppliers_v1';
  var LOAD_MIN_MS = 1000;
  var LOAD_MAX_MS = 1500;

  var catalog = {
    methods: [], methodById: {}, paperCheck: { label: 'Check', fee: 'No fee' },
    conditions: [], defaultWaterfall: [], defaultDurationDays: 45, durationRange: { min: 1, max: 90 }
  };
  var programs = [];
  var roster = [];          // every supplier; programId/cohortId null when unassigned
  var unassignedSeed = 0;
  var loadTimer = null;
  var cohortEdit = null;   // { programId, index|null, original: snapshot }
  var pendingDisable = null; // { programId, index }
  var toastTimer = null;
  var changeListeners = [];

  function $(id) { return document.getElementById(id); }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function today() { return new Date().toISOString().slice(0, 10); }

  function formatDate(value) {
    var date = new Date(String(value).indexOf('T') === -1 ? value + 'T00:00:00' : value);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatNumber(value) { return Number(value || 0).toLocaleString('en-US'); }

  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  function uid(prefix) { return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function plural(n, word) { return n + ' ' + word + (Number(n) === 1 ? '' : 's'); }

  // ── Cohort model ──

  function allConditions() {
    var out = {};
    catalog.conditions.forEach(function (c) { out[c.id] = true; });
    return out;
  }

  function normalizeCohort(raw) {
    var c = clone(raw || {});
    c.id = c.id || uid('co');
    c.name = String(c.name || '').trim();
    c.durationDays = Number(c.durationDays) || catalog.defaultDurationDays;
    c.methods = Array.isArray(c.methods) ? c.methods.filter(function (id) { return catalog.methodById[id]; }) : [];
    c.paperCheck = c.paperCheck === true;
    c.conditions = Object.assign(allConditions(), c.conditions || {});
    c.enabled = c.enabled !== false;
    c.activeSuppliers = Number(c.activeSuppliers) || 0;
    c.fallback = c.fallback || null;
    return c;
  }

  /** The parts of a cohort an edit can change — what "changed" is measured on. */
  function cohortShape(c) {
    return JSON.stringify({
      name: c.name,
      durationDays: c.durationDays,
      methods: c.methods.slice().sort(),
      paperCheck: c.paperCheck,
      conditions: catalog.conditions.map(function (k) { return !!c.conditions[k.id]; }),
      enabled: c.enabled
    });
  }

  function methodCount(c) { return c.methods.length + (c.paperCheck ? 1 : 0); }

  function enabledCount(cohorts) { return cohorts.filter(function (c) { return c.enabled; }).length; }

  /** 1-based position among enabled cohorts; disabled ones are skipped and get none. */
  function displayNumber(cohorts, index) {
    if (!cohorts[index].enabled) return null;
    var n = 0;
    for (var i = 0; i <= index; i += 1) if (cohorts[i].enabled) n += 1;
    return n;
  }

  function feeValue(fee) {
    var n = parseFloat(String(fee || '').replace('%', ''));
    return isNaN(n) ? 0 : n;
  }

  /** What the stage costs a supplier: its fallback method's fee, else its dearest method. */
  function cohortRate(c) {
    var fallback = c.fallback && catalog.methodById[c.fallback];
    var rate = fallback ? feeValue(fallback.fee) : c.methods.reduce(function (max, id) {
      var m = catalog.methodById[id];
      return Math.max(max, m ? feeValue(m.fee) : 0);
    }, 0);
    return rate.toFixed(2) + '%';
  }

  function cohortLabel(cohorts, index) {
    var n = displayNumber(cohorts, index);
    return (n ? 'Cohort ' + n + ' · ' : '') + cohorts[index].name;
  }

  // ── Program model ──

  function normalizeProgram(raw) {
    var p = clone(raw);
    p.cohorts = (Array.isArray(p.cohorts) ? p.cohorts : []).map(normalizeCohort);
    if (p.status === 'active' && !p.published) p.published = { name: p.name, cohorts: clone(p.cohorts) };
    if (p.published) p.published.cohorts = p.published.cohorts.map(normalizeCohort);
    p.status = p.published ? 'active' : 'draft';
    return p;
  }

  function isNeverPublished(p) { return !p.published; }

  function contentShape(name, cohorts) {
    return JSON.stringify({ name: name, cohorts: cohorts.map(function (c) { return c.id + ':' + cohortShape(c); }) });
  }

  /** True when the working copy differs from what clients are using. */
  function hasDraftChanges(p) {
    if (isNeverPublished(p)) return false;
    return contentShape(p.name, p.cohorts) !== contentShape(p.published.name, p.published.cohorts);
  }

  function inDraft(p) { return isNeverPublished(p) || hasDraftChanges(p); }

  /** 'edited' | 'added' | null — how a working-copy cohort differs from published. */
  function cohortChange(p, cohort) {
    if (isNeverPublished(p)) return null;
    for (var i = 0; i < p.published.cohorts.length; i += 1) {
      var pub = p.published.cohorts[i];
      if (pub.id === cohort.id) return cohortShape(pub) === cohortShape(cohort) ? null : 'edited';
    }
    return 'added';
  }

  // ── Storage ──

  function persistQuiet() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(programs)); } catch (error) {}
    persistRoster();
  }

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(programs)); } catch (error) {}
    changeListeners.forEach(function (fn) { try { fn(); } catch (error) {} });
  }

  function readStored() {
    try {
      var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return Array.isArray(parsed) ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function loadData() {
    return Promise.resolve(window.DataSource ? window.DataSource.load('payment-programs') : null)
      .catch(function () { return null; })
      .then(function (data) {
        var seed = [];
        if (data) {
          catalog.methods = data.methods || [];
          catalog.paperCheck = data.paperCheck || catalog.paperCheck;
          catalog.conditions = data.progressionConditions || [];
          catalog.defaultWaterfall = data.defaultWaterfall || [];
          catalog.defaultDurationDays = data.defaultDurationDays || 45;
          catalog.durationRange = data.durationRange || catalog.durationRange;
          seed = Array.isArray(data.programs) ? data.programs : [];
          unassignedSeed = Number(data.unassignedSuppliers) || 0;
        }
        catalog.methodById = {};
        catalog.methods.forEach(function (m) { catalog.methodById[m.id] = m; });
        var stored = readStored();
        programs = (stored || seed).map(normalizeProgram);
        loadRoster();
        recount();
        persistQuiet();
      });
  }

  // ── Supplier roster ──
  //
  // Who is in which program and cohort. It is the source of truth: cohort
  // "active suppliers" and program "suppliers" are counted from it, never
  // edited directly, so the numbers and the Suppliers tab can't disagree.

  var FEATURED = [
    ['Redline Freight', 'RF-2093'], ['Redline Freight', 'RF-2094'], ['Blue Wave Logistics', 'BW-3021'],
    ['Green Leaf Transport', 'GL-1427'], ['Yellow Star Shipping', 'YS-5874'], ['Black Hawk Couriers', 'BH-9185'],
    ['Orange Sky Freight', 'OS-2046'], ['Purple Mountain Movers', 'PM-6742']
  ];
  var NAME_A = ['Redline', 'Blue Wave', 'Green Leaf', 'Yellow Star', 'Black Hawk', 'Orange Sky', 'Purple Mountain', 'Silver Pine', 'Harbor Point', 'Summit Ridge', 'Northgate', 'Iron Bridge', 'Cedar Lane', 'Pacific Crest', 'Granite Peak', 'Maple Grove', 'Red Rock', 'Clearwater', 'Lakeshore', 'Stonebrook', 'Eastwind', 'Blue Ridge', 'Golden Gate', 'Riverbend'];
  var NAME_B = ['Freight', 'Logistics', 'Transport', 'Shipping', 'Couriers', 'Movers', 'Supply Co.', 'Distribution', 'Haulers', 'Carriers', 'Cargo', 'Express', 'Fleet Services', 'Trucking', 'Delivery'];

  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i += 1) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function rng(seed) {
    var a = seed || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(rand, list) { return list[Math.floor(rand() * list.length)]; }

  function initialsOf(name) {
    return name.split(/\s+/).filter(function (w) { return /^[A-Za-z]/.test(w); }).slice(0, 2)
      .map(function (w) { return w.charAt(0).toUpperCase(); }).join('');
  }

  function daysAgo(n) {
    var d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  }

  function newSupplier(key, rand) {
    var name = pick(rand, NAME_A) + ' ' + pick(rand, NAME_B);
    return {
      id: 'sup-' + hash(key).toString(36),
      name: name,
      code: initialsOf(name) + '-' + (1000 + Math.floor(rand() * 9000)),
      ytd: 20000 + Math.floor(rand() * 750) * 100,
      attention: rand() < 0.07,
      programId: null,
      cohortId: null,
      method: null,       // method id, 'paper', or null when they haven't chosen
      enteredAt: null
    };
  }

  /** First load: turn the seeded counts into people, plus a pool with no program. */
  function seedRoster() {
    var list = [];
    programs.forEach(function (p) {
      if (!p.published) return;
      var pool = 0;
      p.published.cohorts.forEach(function (c) {
        if (!c.enabled) return;
        for (var k = 0; k < c.activeSuppliers; k += 1, pool += 1) {
          var rand = rng(hash(p.id + ':' + pool));
          var s = newSupplier(p.id + ':' + pool, rand);
          var onPaper = c.paperCheck && (!c.methods.length || rand() < 0.38);
          s.programId = p.id;
          s.cohortId = c.id;
          s.method = onPaper ? 'paper' : (c.methods.length ? pick(rand, c.methods) : null);
          s.enteredAt = daysAgo(Math.floor(rand() * Math.max(1, c.durationDays - 1)));
          list.push(s);
        }
      });
    });
    // A real list mixes programs and stages; key the order to ids so it's stable.
    list.sort(function (a, b) { return hash('order:' + a.id) - hash('order:' + b.id); });
    FEATURED.forEach(function (f, i) { if (list[i]) { list[i].name = f[0]; list[i].code = f[1]; } });
    for (var u = 0; u < unassignedSeed; u += 1) list.push(newSupplier('pool:' + u, rng(hash('pool:' + u))));
    return list;
  }

  function loadRoster() {
    try {
      var parsed = JSON.parse(localStorage.getItem(ROSTER_KEY) || 'null');
      roster = Array.isArray(parsed) ? parsed : seedRoster();
    } catch (error) {
      roster = seedRoster();
    }
  }

  function persistRoster() {
    try { localStorage.setItem(ROSTER_KEY, JSON.stringify(roster)); } catch (error) {}
  }

  /** Recompute every cohort and program count from the roster. */
  function recount() {
    var byCohort = {};
    var byProgram = {};
    roster.forEach(function (s) {
      if (!s.programId) return;
      byProgram[s.programId] = (byProgram[s.programId] || 0) + 1;
      byCohort[s.cohortId] = (byCohort[s.cohortId] || 0) + 1;
    });
    programs.forEach(function (p) {
      p.suppliers = byProgram[p.id] || 0;
      var apply = function (c) { c.activeSuppliers = byCohort[c.id] || 0; };
      p.cohorts.forEach(apply);
      if (p.published) p.published.cohorts.forEach(apply);
    });
  }

  function offers(cohort, method) {
    if (!method) return false;
    return method === 'paper' ? cohort.paperCheck : cohort.methods.indexOf(method) !== -1;
  }

  /** Move suppliers into a cohort. Progress restarts; a method the cohort doesn't offer is dropped. */
  function placeSuppliers(ids, programId, cohort) {
    var wanted = {};
    ids.forEach(function (id) { wanted[id] = true; });
    roster.forEach(function (s) {
      if (!wanted[s.id]) return;
      s.programId = programId;
      s.cohortId = cohort.id;
      s.enteredAt = today();
      if (!offers(cohort, s.method)) s.method = cohort.paperCheck ? 'paper' : null;
    });
    persistRoster();
    recount();
  }


  function findProgram(id) {
    for (var i = 0; i < programs.length; i += 1) if (programs[i].id === id) return programs[i];
    return null;
  }

  // ── Icons ──

  var ICONS = {
    card: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z',
    // Credit card with a sparkle — Figma's "Managed Card Acceptance Icon", used for MCA and Qualified Settlement.
    'card-plus': 'M2.25 8.25H21.75M2.25 9H21.75M5.25 14.25H11.25M5.25 16.5H8.25M21.75 11V6.75C21.75 5.50736 20.7426 4.5 19.5 4.5H4.5C3.25736 4.5 2.25 5.50736 2.25 6.75V17.25C2.25 18.4926 3.25736 19.5 4.5 19.5H14M19.5 19.75L19.8942 18.5673C20.1182 17.8954 20.6454 17.3682 21.3173 17.1442L22.5 16.75L21.3173 16.3558C20.6454 16.1318 20.1182 15.6046 19.8942 14.9327L19.5 13.75L19.1058 14.9327C18.8818 15.6046 18.3546 16.1318 17.6827 16.3558L16.5 16.75L17.6827 17.1442C18.3546 17.3682 18.8818 17.8954 19.1058 18.5673L19.5 19.75Z',
    bank: 'M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z',
    check: 'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z'
  };

  function icon(name, cls) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="' + cls + '"><path stroke-linecap="round" stroke-linejoin="round" d="' + (ICONS[name] || ICONS.card) + '" /></svg>';
  }

  var DOT = '<span class="size-1 shrink-0 rounded-full bg-gray-400" aria-hidden="true"></span>';
  var ARROW_RIGHT = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" class="size-4 shrink-0 text-gray-500 dark:text-gray-400" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8h10m0 0-4-4m4 4-4 4" /></svg>';
  var ARROW_DOWN = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" class="size-3.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M8 3v10m0 0 4-4m-4 4-4-4" /></svg>';
  var PLUS = '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-[18px]"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>';

  // ── Shared class strings ──

  var BTN_PRIMARY = 'inline-flex shrink-0 cursor-pointer items-center justify-center gap-1 rounded-md bg-blue-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-400';
  var BTN_SECONDARY_SM = 'shrink-0 cursor-pointer rounded-sm border border-gray-300 bg-white px-2 py-1 text-sm font-semibold text-gray-700 shadow-xs hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10';
  var BTN_LINK = 'inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300';
  var CHECKBOX = 'col-start-1 row-start-1 appearance-none rounded-sm border border-gray-300 bg-white checked:border-blue-600 checked:bg-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-gray-600 dark:bg-white/5 dark:checked:border-blue-500 dark:checked:bg-blue-500';

  var BADGE = {
    active: 'border-green-200 bg-green-100 text-green-800 dark:border-green-400/20 dark:bg-green-500/10 dark:text-green-300',
    draft: 'border-yellow-300 bg-yellow-100 text-yellow-800 dark:border-yellow-400/20 dark:bg-yellow-400/10 dark:text-yellow-300',
    neutral: 'border-gray-200 bg-gray-50 text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-300'
  };

  function badge(kind, label) {
    return '<span class="inline-flex shrink-0 items-center rounded-sm border px-2 py-0.5 text-xs font-medium ' + BADGE[kind] + '">' + escapeHtml(label) + '</span>';
  }

  /** Never-published programs are Drafts; published ones stay Active while a draft is pending. */
  function statusBadge(p) { return isNeverPublished(p) ? badge('draft', 'Draft') : badge('active', 'Active'); }

  function toggle(attrs, on, label) {
    return '<div class="group relative inline-flex w-11 shrink-0 cursor-pointer rounded-full bg-gray-200 p-0.5 inset-ring inset-ring-gray-900/5 outline-offset-2 outline-blue-600 transition-colors duration-200 ease-in-out has-checked:bg-blue-600 has-focus-visible:outline-2 dark:bg-white/10">' +
      '<span class="size-5 rounded-full bg-white shadow-xs ring-1 ring-gray-900/5 transition-transform duration-200 ease-in-out group-has-checked:translate-x-5"></span>' +
      '<input type="checkbox" ' + (on ? 'checked ' : '') + attrs + ' aria-label="' + escapeHtml(label) + '" class="absolute inset-0 size-full appearance-none cursor-pointer focus:outline-hidden" /></div>';
  }

  // ── Skeletons (dynamic values only) ──

  function bar(w, h, strong) {
    return '<span class="pp-skel' + (strong ? ' pp-skel-strong' : '') + '" style="width:' + w + ';height:' + h + '"></span>';
  }

  function skeletonEmpty() {
    return '<div class="flex flex-col items-center gap-6 py-8" aria-hidden="true">' +
      '<div class="flex w-full max-w-[480px] flex-col items-center gap-2">' + bar('16rem', '1.25rem') + bar('100%', '2.5rem') + '</div>' +
      bar('11rem', '2rem') + '</div>';
  }

  function skeletonListCard() {
    return '<div class="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/5" aria-hidden="true">' +
      '<div class="flex items-start gap-4"><div class="flex flex-1 flex-col gap-2">' + bar('18rem', '1.25rem', true) + bar('22rem', '1rem', true) + '</div>' + bar('6rem', '1.75rem', true) + '</div>' +
      '<div class="flex gap-2">' + bar('13rem', '1.5rem', true) + bar('12rem', '1.5rem', true) + bar('13rem', '1.5rem', true) + '</div></div>';
  }

  function skeletonList(count) {
    if (!count) return skeletonEmpty();
    var cards = '';
    for (var i = 0; i < Math.min(count, 3); i += 1) cards += skeletonListCard();
    return '<div class="flex flex-col gap-6">' + listHeader() + '<div class="flex flex-col gap-4">' + cards + '</div></div>';
  }

  function skeletonCohortCard() {
    return '<div class="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/5" aria-hidden="true">' +
      '<div class="flex items-center gap-3">' + bar('1.75rem', '1.75rem', true) + bar('14rem', '1.25rem', true) + '</div>' +
      '<div class="flex gap-4">' + bar('4.6rem', '3.75rem', true) + bar('4.7rem', '3.75rem', true) + bar('7.2rem', '3.75rem', true) + '</div>' +
      '<div class="flex gap-2">' + bar('9rem', '1.5rem', true) + bar('14rem', '1.5rem', true) + bar('7rem', '1.5rem', true) + '</div></div>';
  }

  function skeletonDetail(p) {
    var banner = inDraft(p)
      ? '<div class="border-b border-yellow-300 bg-yellow-50/60 p-4 dark:border-yellow-400/20 dark:bg-yellow-400/5" aria-hidden="true">' + bar('100%', '3rem') + '</div>'
      : '';
    var tiles = ['Cohorts', 'Clients using', 'Suppliers', 'Check policy'].map(function (label) {
      return '<div class="flex flex-col gap-1 rounded-lg border border-gray-200 p-3.5 dark:border-white/10">' +
        '<span class="text-sm font-medium text-gray-900 dark:text-white">' + label + '</span>' +
        bar('4rem', '2rem') + bar('9rem', '1rem') + '</div>';
    }).join('');
    return banner +
      '<div class="flex items-start gap-3 px-6 pt-6 pb-5">' + backArrow(true) +
        '<div class="flex flex-col gap-2">' + bar('22rem', '2rem', true) + bar('9rem', '1.25rem', true) + '</div></div>' +
      '<div class="h-px w-full bg-gray-200 dark:bg-white/10"></div>' +
      '<div class="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">' + tiles + '</div>' +
      '<div class="h-px w-full bg-gray-200 dark:bg-white/10"></div>' +
      '<div class="flex flex-col gap-6 p-6">' + cohortHeading() + skeletonCohortCard() + '</div>';
  }

  // ── List view ──

  function listHeader() {
    return '<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">' +
      '<div class="flex min-w-0 flex-1 flex-col gap-1">' +
        '<h2 class="text-lg font-semibold text-gray-900 dark:text-white">Payment Program Workflows</h2>' +
        '<p class="text-sm text-gray-500 dark:text-gray-400">Manage Transcard waterfall configurations used to power supplier payment programs across buyer accounts.</p>' +
      '</div>' +
      '<button type="button" data-open-create class="' + BTN_PRIMARY + '">' + PLUS + 'Create Program</button>' +
    '</div>';
  }

  function cohortChips(cohorts) {
    var parts = [];
    cohorts.forEach(function (cohort, index) {
      if (index > 0) parts.push(ARROW_RIGHT);
      parts.push(
        '<div class="flex items-center gap-1 rounded-md border border-gray-200 px-1.5 py-1 text-xs dark:border-white/10">' +
          '<span class="font-medium text-gray-950 dark:text-white">Cohort ' + (index + 1) + '</span>' + DOT +
          '<span class="font-normal text-gray-700 dark:text-gray-300">' + escapeHtml(cohort.name) + '</span></div>');
    });
    return parts.length ? '<div class="flex flex-wrap items-center gap-2">' + parts.join('') + '</div>' : '';
  }

  function programCard(p) {
    // The list shows what clients see: the published waterfall when there is one.
    var shown = (p.published ? p.published.cohorts : p.cohorts).filter(function (c) { return c.enabled; });
    return '<div class="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">' +
      '<div class="flex items-start gap-4">' +
        '<div class="flex min-w-0 flex-1 flex-col gap-1">' +
          '<div class="flex flex-wrap items-center gap-2.5">' +
            '<p class="text-base font-semibold text-gray-950 dark:text-white">' + escapeHtml(p.published ? p.published.name : p.name) + '</p>' +
            statusBadge(p) + (hasDraftChanges(p) ? badge('draft', 'Draft changes') : '') +
          '</div>' +
          '<div class="flex flex-wrap items-center gap-1 text-sm text-gray-700 dark:text-gray-300">' +
            '<span>Updated ' + escapeHtml(formatDate(p.updatedAt)) + '</span>' + DOT +
            '<span><span class="font-medium">' + formatNumber(p.suppliers) + '</span> suppliers</span>' + DOT +
            '<span><span class="font-medium">' + formatNumber(p.clients) + '</span> clients</span>' +
          '</div>' +
        '</div>' +
        '<button type="button" data-open-program="' + escapeHtml(p.id) + '" class="' + BTN_SECONDARY_SM + '">View Program</button>' +
      '</div>' +
      cohortChips(shown) +
    '</div>';
  }

  function emptyState() {
    return '<div class="flex flex-col items-center py-8">' +
      '<div class="flex w-full max-w-[480px] flex-col items-center gap-6 text-center">' +
        '<div class="flex flex-col gap-2">' +
          '<p class="text-base font-semibold text-gray-900 dark:text-white">No Payment Program yet</p>' +
          '<p class="text-sm text-gray-500 dark:text-gray-400">Create your first payment program to define payment terms and manage supplier enrollment.</p>' +
        '</div>' +
        '<button type="button" data-open-create class="' + BTN_PRIMARY + '">' + PLUS + 'Create Payment Program</button>' +
      '</div></div>';
  }

  function renderListBody() {
    var body = $('pp-list-body');
    if (!body) return;
    body.setAttribute('aria-busy', 'false');
    body.innerHTML = programs.length
      ? '<div class="flex flex-col gap-6">' + listHeader() + '<div class="flex flex-col gap-4">' + programs.map(programCard).join('') + '</div></div>'
      : emptyState();
  }

  // ── Detail view ──

  function backArrow(inert) {
    return '<button type="button" ' + (inert ? 'disabled' : 'data-back-to-list') + ' aria-label="Back to programs" class="mt-1 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 disabled:cursor-default disabled:hover:bg-transparent dark:text-gray-400 dark:hover:bg-white/10">' +
      '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" class="size-5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M16 10H4m0 0 5-5m-5 5 5 5" /></svg></button>';
  }

  function cohortHeading() {
    return '<div><h3 class="text-lg font-semibold text-gray-900 dark:text-white">Cohort Configuration</h3>' +
      '<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">The sequence clients\' suppliers move through. Edits create a draft.</p></div>';
  }

  var WARNING_ICON = '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="mt-0.5 size-5 shrink-0 text-yellow-500"><path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd" /></svg>';

  /** One alert only: the yellow draft notice, for new programs and for edits alike. */
  function draftBanner(p) {
    if (!inDraft(p)) return '';
    var fresh = isNeverPublished(p);
    return '<div data-pp-draft-banner class="flex flex-col gap-3 border-b border-yellow-300 bg-yellow-50 p-4 sm:flex-row sm:items-center dark:border-yellow-400/20 dark:bg-yellow-400/10">' +
      '<div class="flex flex-1 gap-3">' + WARNING_ICON +
        '<div class="flex flex-col gap-2 text-sm text-yellow-800 dark:text-yellow-300"><p class="font-medium">Draft in progress - changes aren\'t live for any client yet.</p>' +
        '<p>' + (fresh ? 'This program isn\'t available to clients until you publish it.' : 'Clients keep using the published version until you publish.') + '</p></div></div>' +
      '<div class="flex shrink-0 items-center gap-4">' +
        '<button type="button" data-discard class="cursor-pointer text-sm font-semibold text-yellow-800 hover:text-yellow-900 dark:text-yellow-300">Discard draft</button>' +
        '<button type="button" data-publish ' + (p.cohorts.length ? '' : 'disabled ') + 'class="' + BTN_PRIMARY + '">' + (fresh ? 'Publish Program' : 'Publish Changes') + '</button></div></div>';
  }

  function statTile(label, value, caption) {
    return '<div class="flex flex-col gap-1 rounded-lg border border-gray-200 p-3.5 dark:border-white/10">' +
      '<span class="text-sm font-medium text-gray-900 dark:text-white">' + label + '</span>' +
      '<span class="text-2xl font-semibold text-gray-950 dark:text-white">' + escapeHtml(value) + '</span>' +
      '<span class="text-xs text-gray-500 dark:text-gray-400">' + caption + '</span></div>';
  }

  function allowsChecks(p) {
    return p.cohorts.some(function (c) { return c.enabled && c.paperCheck; });
  }

  function methodChip(label, fee, iconName, extra) {
    return '<span class="inline-flex items-center gap-1.5 rounded-md bg-gray-50 px-1.5 py-1 text-xs dark:bg-white/5">' +
      icon(iconName, 'size-4 shrink-0 text-gray-600 dark:text-gray-400') +
      '<span class="font-medium text-gray-950 dark:text-white">' + escapeHtml(label) + '</span>' +
      '<span class="text-gray-500 dark:text-gray-400">' + escapeHtml(fee) + '</span>' + (extra || '') +
    '</span>';
  }

  function cohortMethodChips(c) {
    var chips = catalog.methods.filter(function (m) { return c.methods.indexOf(m.id) !== -1; }).map(function (m) {
      return methodChip(m.label, m.fee, m.icon, c.fallback === m.id ? badge('draft', 'Fallback') : '');
    });
    if (c.paperCheck) chips.push(methodChip(catalog.paperCheck.label, catalog.paperCheck.fee, 'check'));
    return chips.join('');
  }

  function miniStat(label, value, unit) {
    return '<div class="flex flex-col gap-1 rounded-md bg-gray-50 px-3 py-2.5 dark:bg-white/5">' +
      '<span class="text-xs text-gray-500 dark:text-gray-400">' + label + '</span>' +
      '<span class="flex items-baseline gap-1 text-sm font-semibold text-gray-950 dark:text-white">' + escapeHtml(value) +
      (unit ? '<span class="text-xs font-normal text-gray-500 dark:text-gray-400">' + unit + '</span>' : '') + '</span></div>';
  }

  function cohortCard(p, cohort, index, displayNum, isFinal) {
    var off = !cohort.enabled;
    var change = off ? null : cohortChange(p, cohort);
    // A changed cohort is outlined in amber: border and ring together read as
    // 2px without shifting the layout by a pixel. A disabled one goes dashed.
    var frame = off
      ? 'border-dashed border-gray-300 dark:border-white/15'
      : change
        ? 'border-amber-400 ring-1 ring-amber-400 dark:border-amber-400/70 dark:ring-amber-400/70'
        : 'border-gray-200 dark:border-white/10';
    var dim = off ? ' opacity-50' : '';
    var lockAttrs = off ? ' disabled aria-disabled="true"' : '';
    var lockCls = off ? ' pointer-events-none opacity-50' : '';
    return '<div data-cohort-card="' + index + '"' + (change ? ' data-cohort-change="' + change + '"' : '') + (off ? ' data-cohort-disabled' : '') +
      ' class="flex flex-col gap-4 rounded-2xl border bg-white p-4 transition-[border-color,box-shadow] duration-300 dark:bg-white/5 ' + frame + '">' +
      '<div class="flex items-center gap-2.5">' +
        '<span class="flex size-7 shrink-0 items-center justify-center rounded-md bg-gray-100 text-sm font-medium text-gray-900 dark:bg-white/10 dark:text-white' + dim + '">' + (off ? '-' : displayNum) + '</span>' +
        '<div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">' +
          '<p class="text-base font-semibold text-gray-950 dark:text-white' + dim + '">' + escapeHtml(cohort.name) + '</p>' +
          (off ? badge('draft', 'Disabled - suppliers skip this stage') : '') +
          (change === 'edited' ? badge('draft', 'Edited in draft') : '') +
          (change === 'added' ? badge('draft', 'Added in draft') : '') +
          (isFinal ? badge('neutral', 'Final Stage') : '') +
        '</div>' +
        '<div class="flex shrink-0 items-center gap-3">' +
          '<button type="button" data-edit-cohort="' + index + '"' + lockAttrs + ' class="' + BTN_SECONDARY_SM + lockCls + '">Edit</button>' +
          '<button type="button" data-remove-cohort="' + index + '"' + lockAttrs + ' aria-label="Remove cohort" class="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-gray-300 bg-white text-gray-500 shadow-xs hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10' + lockCls + '">' +
            '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg></button>' +
          toggle('data-toggle-cohort="' + index + '"', cohort.enabled, (off ? 'Enable ' : 'Disable ') + cohort.name) +
        '</div>' +
      '</div>' +
      '<div class="flex flex-wrap gap-4' + dim + '">' +
        miniStat('Duration', cohort.durationDays, 'days') +
        miniStat('Methods', methodCount(cohort)) +
        miniStat('Active suppliers', formatNumber(cohort.activeSuppliers)) +
      '</div>' +
      '<div class="flex flex-wrap items-center gap-2' + dim + '">' + cohortMethodChips(cohort) + '</div>' +
    '</div>';
  }

  /**
   * Skipped stages sit off to the side of the waterfall's rail. A run of them
   * shares one wrapper so the padding above and below doesn't double up.
   */
  function disabledWrap(cardsHtml, isFirst, isLast) {
    // 24px on every side — the list's own rhythm. At the very top the heading
    // already supplies it, and at the very bottom the Add cohort row does, so
    // those edges get none of their own; otherwise the gap would double.
    var pad = (isFirst ? 'pt-0' : 'pt-6') + ' ' + (isLast ? 'pb-0' : 'pb-6');
    return '<div class="relative flex flex-col gap-6 pl-16 ' + pad + '">' +
      '<span class="absolute top-0 bottom-0 left-[27px] w-px bg-gray-200 dark:bg-white/10" aria-hidden="true"></span>' +
      cardsHtml + '</div>';
  }

  function moveOn(days, afterSkipped) {
    // After a skipped stage the rail is already running down beside it, so the
    // connector drops its own top stub and the arrow sits 24px below the card.
    return '<div class="flex flex-col">' +
      (afterSkipped ? '' : '<div class="ml-[27px] h-4 w-px bg-gray-200 dark:bg-white/10"></div>') +
      '<div class="flex items-center gap-2 px-4"><span class="flex size-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-500 dark:bg-white/10 dark:text-gray-400">' + ARROW_DOWN + '</span>' +
      '<span class="text-xs text-gray-600 dark:text-gray-400">moves automatically after ' + days + ' days (or sooner if declined)</span></div>' +
      '<div class="ml-[27px] h-4 w-px bg-gray-200 dark:bg-white/10"></div></div>';
  }

  function cohortList(p) {
    if (!p.cohorts.length) {
      return '<div class="flex flex-col items-center rounded-2xl border border-dashed border-gray-300 bg-gray-50/80 px-6 py-8 text-center dark:border-white/10 dark:bg-white/5">' +
        '<h4 class="text-sm font-semibold text-gray-900 dark:text-white">No cohorts yet</h4>' +
        '<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Add a cohort to define the first stage suppliers move through.</p></div>';
    }
    var lastEnabled = -1;
    p.cohorts.forEach(function (c, i) { if (c.enabled) lastEnabled = i; });
    var html = '';
    var prevEnabled = null;
    var skipped = '';
    var skippedAtStart = false;
    p.cohorts.forEach(function (cohort, index) {
      if (!cohort.enabled) {
        if (!skipped) skippedAtStart = html === '';
        skipped += cohortCard(p, cohort, index, null, false);
        return;
      }
      var afterSkipped = !!skipped;
      if (skipped) { html += disabledWrap(skipped, skippedAtStart, false); skipped = ''; }
      // The hand-off line only runs between stages suppliers actually pass through.
      if (prevEnabled) html += moveOn(prevEnabled.durationDays, afterSkipped);
      html += cohortCard(p, cohort, index, displayNumber(p.cohorts, index), index === lastEnabled);
      prevEnabled = cohort;
    });
    if (skipped) html += disabledWrap(skipped, skippedAtStart, true);
    return html;
  }

  var USER_PLUS = '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-[18px]"><path d="M10 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM16.25 5.75a.75.75 0 0 0-1.5 0v2h-2a.75.75 0 0 0 0 1.5h2v2a.75.75 0 0 0 1.5 0v-2h2a.75.75 0 0 0 0-1.5h-2v-2Z" /></svg>';

  /** Suppliers join what clients use, so a never-published program can't take any yet. */
  function addSuppliersButton(p) {
    var ready = !!p.published && enabledCount(p.published.cohorts) > 0;
    return '<button type="button" data-add-suppliers' + (ready ? '' : ' disabled title="Publish this program before adding suppliers"') +
      ' class="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/20">' +
      USER_PLUS + 'Add suppliers</button>';
  }

  function detailHtml(p) {
    return draftBanner(p) +
      '<div class="flex items-start gap-3 px-6 pt-6 pb-5">' + backArrow(false) +
        '<div class="flex min-w-0 flex-1 flex-col gap-1"><div class="flex flex-wrap items-center gap-3">' +
          '<h1 class="text-2xl font-semibold text-gray-950 dark:text-white">' + escapeHtml(p.name) + '</h1>' + statusBadge(p) + '</div>' +
          '<p class="text-sm text-gray-700 dark:text-gray-300">Updated ' + escapeHtml(formatDate(p.updatedAt)) + '</p></div>' +
        addSuppliersButton(p) + '</div>' +
      '<div class="h-px w-full bg-gray-200 dark:bg-white/10"></div>' +
      '<div class="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">' +
        statTile('Cohorts', String(enabledCount(p.cohorts)), 'Stages in this waterfall') +
        statTile('Clients using', formatNumber(p.clients), 'Buyer programs assigned') +
        statTile('Suppliers', formatNumber(p.suppliers), 'Across all clients') +
        statTile('Check policy', allowsChecks(p) ? 'Allowed' : 'Not allowed', 'Paper check availability') +
      '</div>' +
      '<div class="h-px w-full bg-gray-200 dark:bg-white/10"></div>' +
      '<div class="flex flex-col gap-6 p-6">' + cohortHeading() +
        '<div class="flex flex-col">' + cohortList(p) + '</div>' +
        '<div><button type="button" data-add-cohort class="' + BTN_LINK + '">' + PLUS + 'Add cohort</button></div>' +
      '</div>';
  }

  // ── Views + deliberate load time ──

  function loadDelay() { return LOAD_MIN_MS + Math.random() * (LOAD_MAX_MS - LOAD_MIN_MS); }

  function later(fn) {
    clearTimeout(loadTimer);
    loadTimer = setTimeout(fn, loadDelay());
  }

  function currentProgramId() {
    try { return new URLSearchParams(window.location.search).get('program'); } catch (error) { return null; }
  }

  function setBreadcrumb(programName) {
    var nav = $('dynamic-breadcrumbs');
    var list = nav && nav.querySelector('ol');
    if (!list) return;
    var extra = list.querySelector('[data-pp-crumb]');
    if (extra) extra.remove();
    var items = list.querySelectorAll(':scope > li');
    var link = items.length ? items[items.length - 1].querySelector('a') : null;
    if (!link) return;
    if (programName) {
      link.setAttribute('href', window.location.pathname);
      link.setAttribute('data-pp-list-crumb', '');
      link.removeAttribute('aria-current');
      // Reuse the shell's own separator so the extra step matches it exactly.
      var li = items[items.length - 1].cloneNode(true);
      li.setAttribute('data-pp-crumb', '');
      var clonedLink = li.querySelector('a');
      var label = document.createElement('span');
      label.setAttribute('aria-current', 'page');
      label.className = clonedLink ? clonedLink.className : 'ml-4 text-sm font-medium text-gray-500';
      label.textContent = programName;
      if (clonedLink) clonedLink.replaceWith(label);
      list.appendChild(li);
    } else {
      link.removeAttribute('data-pp-list-crumb');
      link.setAttribute('aria-current', 'page');
    }
  }

  function currentTab() {
    try { return new URLSearchParams(window.location.search).get('tab') === 'suppliers' ? 'suppliers' : 'configuration'; }
    catch (error) { return 'configuration'; }
  }

  function syncTabs(tab) {
    document.querySelectorAll('[data-pp-tab]').forEach(function (btn) {
      var on = btn.getAttribute('data-pp-tab') === tab;
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
      if (on) btn.setAttribute('aria-current', 'page'); else btn.removeAttribute('aria-current');
    });
  }

  function showList(options) {
    var opts = options || {};
    $('pp-detail-view').classList.add('hidden');
    $('pp-list-view').classList.remove('hidden');
    setBreadcrumb(null);
    var tab = currentTab();
    syncTabs(tab);
    var suppliersOn = tab === 'suppliers' && !!window.PaymentProgramSuppliers;
    $('pp-list-body').classList.toggle('hidden', suppliersOn);
    $('pp-suppliers-body').classList.toggle('hidden', !suppliersOn);
    if (suppliersOn) { clearTimeout(loadTimer); window.PaymentProgramSuppliers.show(opts); return; }
    var body = $('pp-list-body');
    if (opts.instant) { renderListBody(); return; }
    body.setAttribute('aria-busy', 'true');
    body.innerHTML = skeletonList(programs.length);
    later(renderListBody);
  }

  function showDetail(id, options) {
    var opts = options || {};
    var p = findProgram(id);
    if (!p) { showList({ instant: true }); return; }
    $('pp-list-view').classList.add('hidden');
    $('pp-detail-view').classList.remove('hidden');
    setBreadcrumb(p.name);
    window.scrollTo(0, 0);
    var body = $('pp-detail-body');
    if (opts.instant) { body.innerHTML = detailHtml(p); return; }
    body.setAttribute('aria-busy', 'true');
    body.innerHTML = skeletonDetail(p);
    later(function () {
      var fresh = findProgram(id);
      if (!fresh || currentProgramId() !== id) return;
      body.setAttribute('aria-busy', 'false');
      body.innerHTML = detailHtml(fresh);
    });
  }

  function navigate(id, options) {
    var url = window.location.pathname + (id ? '?program=' + encodeURIComponent(id) : '');
    try { window.history.pushState({}, '', url); } catch (error) {}
    if (id) showDetail(id, options); else showList(options);
  }

  function redrawDetail(p) {
    $('pp-detail-body').innerHTML = detailHtml(p);
    setBreadcrumb(p.name);
  }

  // ── Draft / publish ──

  function saveWorkingCopy(p) {
    // Only the working copy changes; `published` is what clients keep using.
    persist();
    redrawDetail(p);
  }

  function publish(p) {
    p.published = { name: p.name, cohorts: clone(p.cohorts) };
    p.status = 'active';
    p.updatedAt = today();
    persist();
    redrawDetail(p);
  }

  function discard(p) {
    if (isNeverPublished(p)) {
      programs = programs.filter(function (x) { return x.id !== p.id; });
      persist();
      navigate(null, { instant: true });
      return;
    }
    p.name = p.published.name;
    p.cohorts = clone(p.published.cohorts);
    persist();
    redrawDetail(p);
  }

  // ── Create drawer ──

  function renderDefaultChips() {
    var host = $('pp-default-chips');
    if (!host) return;
    host.innerHTML = catalog.defaultWaterfall.map(function (t, i) {
      return '<span class="flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-1.5 py-1 text-xs dark:border-white/10 dark:bg-white/5">' +
        '<span class="font-medium text-gray-950 dark:text-white">Cohort ' + (i + 1) + '</span>' + DOT +
        '<span class="text-gray-700 dark:text-gray-300">' + escapeHtml(t.name) + ' (' + escapeHtml(t.rate || '') + ')</span></span>';
    }).join('');
  }

  function openCreate() {
    var dialog = $('pp-create-dialog');
    if (!dialog) return;
    $('pp-name').value = '';
    var first = document.querySelector('input[name="pp-template"][value="default"]');
    if (first) first.checked = true;
    renderDefaultChips();
    syncCreateState();
    if (typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal();
  }

  function syncCreateState() {
    $('pp-create-submit').disabled = !String($('pp-name').value || '').trim();
  }

  function createProgram() {
    var name = String($('pp-name').value || '').trim();
    if (!name) return;
    var template = document.querySelector('input[name="pp-template"]:checked');
    var useDefault = !template || template.value === 'default';
    var p = normalizeProgram({
      id: uid('prog'),
      name: name,
      updatedAt: today(),
      suppliers: 0,
      clients: 0,
      cohorts: useDefault ? catalog.defaultWaterfall.map(function (t) {
        return { name: t.name, methods: t.methods, paperCheck: t.paperCheck, fallback: t.fallback || null };
      }) : []
    });
    programs = [p].concat(programs);
    persist();
    var dialog = $('pp-create-dialog');
    if (dialog && dialog.open) dialog.close();
    navigate(p.id);
  }

  // ── Cohort drawer ──

  function methodRow(m, on) {
    return '<div class="flex items-center gap-3 p-4">' +
      icon(m.icon, 'size-6 shrink-0 text-blue-600 dark:text-blue-400') +
      '<div class="flex min-w-0 flex-1 flex-col text-sm">' +
        '<span class="font-semibold text-gray-950 dark:text-white">' + escapeHtml(m.label) + '</span>' +
        '<span class="text-gray-700 dark:text-gray-300">' + escapeHtml(m.feeLong) + '</span></div>' +
      toggle('data-cohort-method="' + escapeHtml(m.id) + '"', on, m.label) +
    '</div>';
  }

  function conditionRow(c, on) {
    return '<label class="flex cursor-pointer items-center gap-3">' +
      '<span class="group grid size-4 shrink-0 grid-cols-1">' +
        '<input type="checkbox" data-cohort-condition="' + escapeHtml(c.id) + '"' + (on ? ' checked' : '') + ' class="' + CHECKBOX + '" />' +
        '<svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white"><path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-checked:opacity-100" /></svg>' +
      '</span>' +
      '<span class="text-sm text-gray-900 dark:text-gray-100">' + escapeHtml(c.label) + '</span></label>';
  }

  function readCohortForm(base) {
    var c = clone(base);
    c.name = String($('pp-cohort-name').value || '').trim();
    c.durationDays = Number($('pp-cohort-days').value) || catalog.defaultDurationDays;
    c.methods = Array.prototype.map.call(document.querySelectorAll('[data-cohort-method]:checked'), function (el) {
      return el.getAttribute('data-cohort-method');
    });
    c.paperCheck = !!($('pp-cohort-check').querySelector('input:checked'));
    c.conditions = {};
    document.querySelectorAll('[data-cohort-condition]').forEach(function (el) {
      c.conditions[el.getAttribute('data-cohort-condition')] = el.checked;
    });
    return c;
  }

  function syncCohortForm() {
    if (!cohortEdit) return;
    var draft = readCohortForm(cohortEdit.original);
    $('pp-cohort-days-label').textContent = plural(draft.durationDays, 'day');
    var valid = !!draft.name && methodCount(draft) > 0;
    // Apply stays off until something actually differs from what was opened.
    var changed = cohortEdit.index == null || cohortShape(draft) !== cohortShape(cohortEdit.original);
    $('pp-cohort-save').disabled = !(valid && changed);
  }

  function openCohortDrawer(programId, index) {
    var dialog = $('pp-cohort-dialog');
    var p = findProgram(programId);
    if (!dialog || !p) return;
    var cohort = index == null
      ? normalizeCohort({ name: '', methods: [], paperCheck: false })
      : p.cohorts[index];
    cohortEdit = { programId: programId, index: index, original: clone(cohort) };

    $('pp-cohort-title').textContent = index == null ? 'Add Cohort' : 'Edit Cohort ' + (displayNumber(p.cohorts, index) || '');
    $('pp-cohort-save').textContent = index == null ? 'Add to Draft' : 'Apply to Draft';
    $('pp-cohort-name').value = cohort.name;
    var days = $('pp-cohort-days');
    days.min = catalog.durationRange.min;
    days.max = catalog.durationRange.max;
    days.value = cohort.durationDays;
    $('pp-cohort-methods').innerHTML = catalog.methods.map(function (m) {
      return methodRow(m, cohort.methods.indexOf(m.id) !== -1);
    }).join('');
    $('pp-cohort-check').innerHTML =
      '<div class="flex items-center gap-3 p-4">' + icon('check', 'size-6 shrink-0 text-blue-600 dark:text-blue-400') +
        '<div class="flex min-w-0 flex-1 flex-col text-sm">' +
          '<span class="font-semibold text-gray-950 dark:text-white">Offer Paper Check in this cohort</span>' +
          '<span class="text-gray-700 dark:text-gray-300">Last Resort Option - Not a stage suppliers progress into</span></div>' +
        toggle('data-cohort-paper-check', cohort.paperCheck, 'Offer Paper Check in this cohort') +
      '</div>';
    $('pp-cohort-conditions').innerHTML = catalog.conditions.map(function (c) {
      return conditionRow(c, cohort.conditions[c.id] !== false);
    }).join('');
    syncCohortForm();
    if (typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal();
  }

  function applyCohort() {
    if (!cohortEdit) return;
    var p = findProgram(cohortEdit.programId);
    if (!p) return;
    var next = readCohortForm(cohortEdit.original);
    if (!next.name || !methodCount(next)) return;
    if (cohortEdit.index == null) p.cohorts.push(next);
    else p.cohorts[cohortEdit.index] = next;
    var dialog = $('pp-cohort-dialog');
    if (dialog && dialog.open) dialog.close();
    saveWorkingCopy(p);
  }

  // ── Enable / disable (live) ──
  //
  // Unlike other edits, switching a stage off acts on live suppliers — they
  // have to be moved somewhere — so it applies straight away rather than
  // going through the draft, and gets a speedbump first.

  function forBothCopies(p, fn) {
    fn(p.cohorts);
    if (p.published) fn(p.published.cohorts);
  }

  function indexById(cohorts, id) {
    for (var i = 0; i < cohorts.length; i += 1) if (cohorts[i].id === id) return i;
    return -1;
  }

  function setCohortEnabled(p, index, enabled, targetId) {
    var id = p.cohorts[index].id;
    forBothCopies(p, function (cohorts) {
      var i = indexById(cohorts, id);
      if (i !== -1) cohorts[i].enabled = enabled;
    });
    if (!enabled && targetId) {
      var target = null;
      (p.published ? p.published.cohorts : p.cohorts).forEach(function (c) { if (c.id === targetId) target = c; });
      var moving = roster.filter(function (s) { return s.cohortId === id; }).map(function (s) { return s.id; });
      if (target && moving.length) placeSuppliers(moving, p.id, target);
    }
    recount();
    persist();
    redrawDetail(p);
  }

  /** Where affected suppliers go by default: the next enabled stage, else the one before. */
  function defaultTarget(cohorts, index) {
    for (var i = index + 1; i < cohorts.length; i += 1) if (cohorts[i].enabled) return i;
    for (var j = index - 1; j >= 0; j -= 1) if (cohorts[j].enabled) return j;
    return -1;
  }

  var OPTION_CHECK = '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" clip-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" /></svg>';

  /** Two lines in the list, one line once chosen — the project's el-option pattern. */
  function targetOption(cohorts, i, selected) {
    var c = cohorts[i];
    var n = displayNumber(cohorts, i);
    return '<el-option value="' + escapeHtml(c.id) + '"' + (selected ? ' aria-selected="true"' : '') +
      ' class="group/option relative block cursor-default select-none border-b border-gray-200 px-4 py-3 text-gray-900 last:border-b-0 aria-selected:bg-gray-100 focus:bg-gray-50 focus:outline-hidden dark:border-white/10 dark:text-white dark:aria-selected:bg-white/10 dark:focus:bg-white/5">' +
        '<div class="flex flex-col gap-1 pr-8 in-[el-selectedcontent]:hidden">' +
          '<span class="text-sm font-semibold text-gray-900 dark:text-white">Cohort ' + n + '</span>' +
          '<span class="text-sm text-gray-500 dark:text-gray-400">' + escapeHtml(c.name) + ' · ' + cohortRate(c) + '</span>' +
        '</div>' +
        '<span class="hidden truncate in-[el-selectedcontent]:block">Cohort ' + n + ' · ' + escapeHtml(c.name) + '</span>' +
        '<span class="absolute inset-y-0 right-0 flex items-center pr-4 text-green-600 group-not-aria-selected/option:hidden in-[el-selectedcontent]:hidden dark:text-green-400">' + OPTION_CHECK + '</span>' +
      '</el-option>';
  }

  function selectedTargetId() {
    var sel = $('pp-disable-target');
    if (!sel) return '';
    var chosen = sel.querySelector('el-option[aria-selected="true"]');
    return chosen ? chosen.getAttribute('value') : (sel.value || '');
  }

  function openDisableDialog(programId, index) {
    var dialog = $('pp-disable-dialog');
    var p = findProgram(programId);
    if (!dialog || !p) return;
    var cohort = p.cohorts[index];
    pendingDisable = { programId: programId, index: index };

    $('pp-disable-title').textContent = 'Disable ' + cohortLabel(p.cohorts, index) + '?';
    var affected = cohort.activeSuppliers > 0;
    $('pp-disable-migration').classList.toggle('hidden', !affected);
    $('pp-disable-skip').classList.toggle('hidden', affected);

    var targets = [];
    p.cohorts.forEach(function (c, i) { if (i !== index && c.enabled) targets.push(i); });
    var preferred = defaultTarget(p.cohorts, index);
    var select = $('pp-disable-target');
    select.querySelector('el-options').innerHTML = targets.map(function (i) {
      return targetOption(p.cohorts, i, i === preferred);
    }).join('');
    // Mirror the preselected option into the trigger; el-select owns it from here.
    var chosen = select.querySelector('el-option[aria-selected="true"]');
    select.querySelector('el-selectedcontent').innerHTML = chosen ? chosen.innerHTML : '';
    if (chosen) select.setAttribute('value', chosen.getAttribute('value'));
    $('pp-disable-warning').textContent = 'This cohort has ' + formatNumber(cohort.activeSuppliers) + ' active ' +
      (cohort.activeSuppliers === 1 ? 'supplier' : 'suppliers') + '. Disabling requires a migration plan for where they move next.';

    var stranded = affected && !targets.length;
    $('pp-disable-target').classList.toggle('hidden', stranded);
    $('pp-disable-no-target').classList.toggle('hidden', !stranded);
    $('pp-disable-confirm').disabled = stranded;

    if (typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal();
  }

  function confirmDisable() {
    if (!pendingDisable) return;
    var p = findProgram(pendingDisable.programId);
    if (!p) return;
    var index = pendingDisable.index;
    var cohort = p.cohorts[index];
    var targetId = cohort.activeSuppliers > 0 ? selectedTargetId() : null;
    if (cohort.activeSuppliers > 0 && !targetId) return;
    var label = cohortLabel(p.cohorts, index);   // before numbering shifts
    pendingDisable = null;
    var dialog = $('pp-disable-dialog');
    if (dialog && dialog.open) dialog.close();
    setCohortEnabled(p, index, false, targetId);
    showToast(label + ' was disabled');
  }

  // ── Add suppliers to a program ──
  //
  // Every supplier can be picked, not only unassigned ones: moving someone
  // between programs is a normal admin job. A supplier is in one program at a
  // time, so picking one who's elsewhere means moving them — which gets a
  // speedbump spelling out what they lose.

  var ASSIGN_RENDER_LIMIT = 150;
  var assign = null;   // { programId, cohortId, selected: Set, onlyUnassigned, search }

  function programName(id) {
    var p = findProgram(id);
    return p ? (p.published ? p.published.name : p.name) : 'another program';
  }

  function assignCohorts(p) { return p.published ? p.published.cohorts : []; }

  function assignTargetCohort() {
    var p = assign && findProgram(assign.programId);
    if (!p) return null;
    var list = assignCohorts(p);
    for (var i = 0; i < list.length; i += 1) if (list[i].id === assign.cohortId) return list[i];
    return null;
  }

  function assignMatches() {
    var q = assign.search.trim().toLowerCase();
    var list = roster.filter(function (s) {
      if (assign.onlyUnassigned && s.programId) return false;
      if (!q) return true;
      return (s.name + ' ' + s.code + ' ' + (s.programId ? programName(s.programId) : 'unassigned')).toLowerCase().indexOf(q) !== -1;
    });
    // Unassigned first, then people in other programs, then those already here.
    var rank = function (s) { return !s.programId ? 0 : s.programId === assign.programId ? 2 : 1; };
    return list.slice().sort(function (a, b) { return rank(a) - rank(b); });
  }

  function assignRowHtml(s) {
    var here = s.programId === assign.programId;
    var on = assign.selected.has(s.id);
    var where;
    if (!s.programId) {
      where = '<span class="inline-flex shrink-0 items-center rounded-sm border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">Unassigned</span>';
    } else {
      var owner = findProgram(s.programId);
      var cohorts = owner && owner.published ? owner.published.cohorts : [];
      var idx = indexById(cohorts, s.cohortId);
      var n = idx === -1 ? null : displayNumber(cohorts, idx);
      var label = here ? 'Already in this program' : 'In ' + programName(s.programId) + (n ? ' · Cohort ' + n : '');
      where = '<span class="inline-flex max-w-[14rem] shrink-0 items-center truncate rounded-sm border px-2 py-0.5 text-xs font-medium ' +
        (here ? 'border-gray-200 bg-gray-50 text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-400' : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-300') +
        '" title="' + escapeHtml(label) + '">' + escapeHtml(label) + '</span>';
    }
    return '<label class="flex items-center gap-3 px-4 py-3 ' + (here ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5') + (on ? ' bg-blue-50/50 dark:bg-blue-500/5' : '') + '">' +
      '<span class="group grid size-4 shrink-0 grid-cols-1">' +
        '<input type="checkbox" data-assign-pick="' + escapeHtml(s.id) + '"' + (on ? ' checked' : '') + (here ? ' disabled' : '') + ' class="' + CHECKBOX + ' disabled:border-gray-200 disabled:bg-gray-100" />' +
        '<svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white"><path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-checked:opacity-100" /></svg>' +
      '</span>' +
      '<span class="min-w-0 flex-1"><span class="block truncate text-sm font-medium text-gray-900 dark:text-white">' + escapeHtml(s.name) + '</span>' +
        '<span class="block text-xs text-gray-500 dark:text-gray-400">' + escapeHtml(s.code) + '</span></span>' +
      where + '</label>';
  }

  function renderAssignList() {
    var matches = assignMatches();
    var list = $('pp-assign-list');
    if (!matches.length) {
      list.innerHTML = '<div class="flex flex-col items-center px-6 py-10 text-center">' +
        '<p class="text-sm font-semibold text-gray-900 dark:text-white">' + (assign.onlyUnassigned && !assign.search ? 'Every supplier is in a program' : 'No suppliers match') + '</p>' +
        '<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">' + (assign.onlyUnassigned ? 'Untick “Show only unassigned” to move suppliers from other programs.' : 'Try a different search.') + '</p></div>';
    } else {
      var keep = list.scrollTop;   // ticking a box re-renders; don't jump the list
      list.innerHTML = matches.slice(0, ASSIGN_RENDER_LIMIT).map(assignRowHtml).join('');
      list.scrollTop = keep;
    }
    var more = $('pp-assign-more');
    var hidden = Math.max(0, matches.length - ASSIGN_RENDER_LIMIT);
    more.textContent = hidden ? 'Showing ' + ASSIGN_RENDER_LIMIT + ' of ' + matches.length.toLocaleString('en-US') + ' — search to narrow the list.' : '';
    more.classList.toggle('hidden', !hidden);

    var pickable = matches.filter(function (s) { return s.programId !== assign.programId; });
    var allOn = pickable.length > 0 && pickable.every(function (s) { return assign.selected.has(s.id); });
    var btn = $('pp-assign-select-all');
    btn.disabled = !pickable.length;
    btn.textContent = allOn ? 'Clear selection' : 'Select all ' + pickable.length.toLocaleString('en-US');
    btn.setAttribute('data-mode', allOn ? 'clear' : 'all');
    syncAssignFooter();
  }

  /** What picking these suppliers would do — feeds the footer and the speedbump. */
  function assignImpact() {
    var target = assignTargetCohort();
    var impact = { total: 0, moving: 0, fromPrograms: {}, loseMethod: 0, feeUp: 0 };
    if (!target) return impact;
    var targetMin = target.methods.reduce(function (min, id) {
      var m = catalog.methodById[id];
      return Math.min(min, m ? feeValue(m.fee) : 0);
    }, target.methods.length ? Infinity : 0);
    roster.forEach(function (s) {
      if (!assign.selected.has(s.id)) return;
      impact.total += 1;
      if (!s.programId) return;
      impact.moving += 1;
      impact.fromPrograms[s.programId] = (impact.fromPrograms[s.programId] || 0) + 1;
      if (s.method && !offers(target, s.method)) {
        impact.loseMethod += 1;
        var had = s.method === 'paper' ? 0 : feeValue((catalog.methodById[s.method] || {}).fee);
        if (targetMin !== Infinity && targetMin > had) impact.feeUp += 1;
      }
    });
    return impact;
  }

  function plural2(n, one, many) { return n.toLocaleString('en-US') + ' ' + (n === 1 ? one : many); }

  function syncAssignFooter() {
    var impact = assignImpact();
    var submit = $('pp-assign-submit');
    submit.disabled = !impact.total || !assignTargetCohort();
    submit.textContent = impact.total ? 'Add ' + plural2(impact.total, 'supplier', 'suppliers') : 'Add suppliers';
    $('pp-assign-summary').textContent = !impact.total
      ? 'No suppliers selected'
      : plural2(impact.total, 'supplier', 'suppliers') + ' selected' + (impact.moving ? ' · ' + impact.moving.toLocaleString('en-US') + ' from other programs' : '');
  }

  function renderAssignCohorts(p) {
    var cohorts = assignCohorts(p);
    var select = $('pp-assign-cohort');
    var options = [];
    cohorts.forEach(function (c, i) { if (c.enabled) options.push(targetOption(cohorts, i, c.id === assign.cohortId)); });
    select.querySelector('el-options').innerHTML = options.join('');
    var chosen = select.querySelector('el-option[aria-selected="true"]');
    select.querySelector('el-selectedcontent').innerHTML = chosen ? chosen.innerHTML : '';
    if (chosen) select.setAttribute('value', chosen.getAttribute('value'));
  }

  function openAssignDrawer(programId) {
    var p = findProgram(programId);
    var dialog = $('pp-assign-dialog');
    if (!p || !dialog || !p.published) return;
    var first = null;
    assignCohorts(p).forEach(function (c) { if (!first && c.enabled) first = c; });
    if (!first) return;
    assign = { programId: p.id, cohortId: first.id, selected: new Set(), onlyUnassigned: true, search: '' };
    $('pp-assign-title').textContent = 'Add suppliers';
    $('pp-assign-subtitle').textContent = p.published.name;
    $('pp-assign-search').value = '';
    $('pp-assign-only-unassigned').checked = true;
    renderAssignCohorts(p);
    renderAssignList();
    if (typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal();
  }

  function readAssignCohort() {
    var chosen = $('pp-assign-cohort').querySelector('el-option[aria-selected="true"]');
    if (chosen) assign.cohortId = chosen.getAttribute('value');
  }

  function openMoveDialog(impact) {
    var p = findProgram(assign.programId);
    var target = assignTargetCohort();
    var cohorts = assignCohorts(p);
    var stage = displayNumber(cohorts, indexById(cohorts, target.id));
    var from = Object.keys(impact.fromPrograms).map(function (id) {
      return escapeHtml(programName(id)) + ' (' + impact.fromPrograms[id].toLocaleString('en-US') + ')';
    }).join(', ');
    $('pp-move-title').textContent = 'Move ' + plural2(impact.moving, 'supplier', 'suppliers') + ' into ' + p.published.name + '?';
    $('pp-move-lede').textContent = 'A supplier can only be in one program. ' +
      (impact.total > impact.moving ? plural2(impact.total - impact.moving, 'unassigned supplier', 'unassigned suppliers') + ' will be added as well.' : '');
    var dot = '<span class="mt-2 size-1.5 shrink-0 rounded-full bg-amber-500"></span>';
    var items = [
      'They leave ' + from + '. Their progress there ends and they start Cohort ' + stage + ' · ' + escapeHtml(target.name) + ' today.'
    ];
    if (impact.loseMethod) items.push(plural2(impact.loseMethod, 'supplier loses', 'suppliers lose') + ' their current payment method — it isn\'t offered in this cohort — and will be asked to choose again.');
    if (impact.feeUp) items.push(plural2(impact.feeUp, 'supplier', 'suppliers') + ' will pay a higher fee here than they do today.');
    items.push('Payments already on their way finish under the old program\'s terms.');
    $('pp-move-impacts').innerHTML = items.map(function (t) { return '<li class="flex gap-2.5">' + dot + '<span>' + t + '</span></li>'; }).join('');
    var dialog = $('pp-move-dialog');
    if (typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal();
  }

  function applyAssignment() {
    var p = findProgram(assign.programId);
    var target = assignTargetCohort();
    if (!p || !target) return;
    var ids = Array.from(assign.selected);
    var moved = assignImpact().moving;
    placeSuppliers(ids, p.id, target);
    persist();
    ['pp-move-dialog', 'pp-assign-dialog'].forEach(function (id) {
      var d = $(id);
      if (d && d.open) d.close();
    });
    redrawDetail(p);
    var cohorts = assignCohorts(p);
    var stage = displayNumber(cohorts, indexById(cohorts, target.id));
    showToast(plural2(ids.length, 'supplier', 'suppliers') + ' added to Cohort ' + stage + ' · ' + target.name + (moved ? ' (' + moved.toLocaleString('en-US') + ' moved)' : ''));
    assign = null;
  }

  function submitAssignment() {
    if (!assign) return;
    readAssignCohort();
    var impact = assignImpact();
    if (!impact.total) return;
    if (impact.moving) openMoveDialog(impact);
    else applyAssignment();
  }

  function bindAssign() {
    var list = $('pp-assign-list');
    list.addEventListener('change', function (event) {
      var box = event.target.closest('[data-assign-pick]');
      if (!box || !assign) return;
      var id = box.getAttribute('data-assign-pick');
      if (box.checked) assign.selected.add(id); else assign.selected.delete(id);
      box.closest('label').classList.toggle('bg-blue-50/50', box.checked);
      renderAssignList();
    });
    $('pp-assign-search').addEventListener('input', function (event) {
      if (!assign) return;
      assign.search = event.target.value;
      renderAssignList();
    });
    $('pp-assign-only-unassigned').addEventListener('change', function (event) {
      if (!assign) return;
      assign.onlyUnassigned = event.target.checked;
      renderAssignList();
    });
    $('pp-assign-select-all').addEventListener('click', function () {
      if (!assign) return;
      var clear = this.getAttribute('data-mode') === 'clear';
      assignMatches().forEach(function (s) {
        if (s.programId === assign.programId) return;
        if (clear) assign.selected.delete(s.id); else assign.selected.add(s.id);
      });
      renderAssignList();
    });
    // The entry cohort changes what a move costs, so re-read it on every pick.
    $('pp-assign-cohort').addEventListener('change', function () { if (assign) { readAssignCohort(); syncAssignFooter(); } });
    $('pp-assign-cohort').addEventListener('click', function () { setTimeout(function () { if (assign) { readAssignCohort(); syncAssignFooter(); } }, 0); });
    $('pp-assign-form').addEventListener('submit', function (event) { event.preventDefault(); submitAssignment(); });
    $('pp-move-confirm').addEventListener('click', applyAssignment);
  }

  // ── Toast ──

  function hideToast() {
    var toast = $('pp-toast');
    if (!toast) return;
    toast.classList.add('opacity-0', 'translate-y-2');
    toast.classList.remove('opacity-100', 'translate-y-0');
  }

  function showToast(message) {
    var toast = $('pp-toast');
    if (!toast) return;
    $('pp-toast-text').textContent = message;
    toast.classList.remove('opacity-0', 'translate-y-2');
    toast.classList.add('opacity-100', 'translate-y-0');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 4000);
  }

  // ── Wiring ──

  function bind() {
    document.addEventListener('click', function (event) {
      var target = event.target;
      var tabBtn = target.closest('[data-pp-tab]');
      if (tabBtn) {
        var tab = tabBtn.getAttribute('data-pp-tab');
        if (tab === currentTab() && !currentProgramId()) return;
        try { window.history.pushState({}, '', window.location.pathname + (tab === 'suppliers' ? '?tab=suppliers' : '')); } catch (error) {}
        showList();
        return;
      }
      if (target.closest('[data-open-create]')) { openCreate(); return; }

      var open = target.closest('[data-open-program]');
      if (open) { navigate(open.getAttribute('data-open-program')); return; }

      if (target.closest('[data-back-to-list]') || target.closest('[data-pp-list-crumb]')) {
        event.preventDefault();
        navigate(null);
        return;
      }

      var p = findProgram(currentProgramId());
      if (!p) return;

      if (target.closest('[data-publish]')) { if (p.cohorts.length) publish(p); return; }
      if (target.closest('[data-discard]')) { discard(p); return; }
      if (target.closest('[data-add-cohort]')) { openCohortDrawer(p.id, null); return; }
      var addSup = target.closest('[data-add-suppliers]');
      if (addSup && !addSup.disabled) { openAssignDrawer(p.id); return; }

      var edit = target.closest('[data-edit-cohort]');
      if (edit) { openCohortDrawer(p.id, Number(edit.getAttribute('data-edit-cohort'))); return; }

      var remove = target.closest('[data-remove-cohort]');
      if (remove) {
        p.cohorts.splice(Number(remove.getAttribute('data-remove-cohort')), 1);
        saveWorkingCopy(p);
      }
    });

    document.addEventListener('change', function (event) {
      var box = event.target.closest && event.target.closest('[data-toggle-cohort]');
      if (!box) return;
      var p = findProgram(currentProgramId());
      if (!p) return;
      var index = Number(box.getAttribute('data-toggle-cohort'));
      if (box.checked) {
        setCohortEnabled(p, index, true, null);
        showToast(cohortLabel(p.cohorts, index) + ' was enabled');
      } else {
        // Hold the switch where it was until the speedbump is confirmed.
        box.checked = true;
        openDisableDialog(p.id, index);
      }
    });

    var cohortForm = $('pp-cohort-form');
    cohortForm.addEventListener('input', syncCohortForm);
    cohortForm.addEventListener('change', syncCohortForm);
    cohortForm.addEventListener('submit', function (event) { event.preventDefault(); applyCohort(); });

    bindAssign();
    $('pp-disable-form').addEventListener('submit', function (event) { event.preventDefault(); confirmDisable(); });
    $('pp-toast-close').addEventListener('click', hideToast);
    $('pp-disable-dialog').addEventListener('close', function () { pendingDisable = null; });

    $('pp-name').addEventListener('input', syncCreateState);
    $('pp-create-form').addEventListener('submit', function (event) { event.preventDefault(); createProgram(); });

    window.addEventListener('popstate', function () {
      var id = currentProgramId();
      if (id) showDetail(id, { instant: true }); else showList({ instant: true });
    });
  }

  var readyResolve;
  var ready = new Promise(function (resolve) { readyResolve = resolve; });

  /**
   * Read-only view for the Suppliers tab. It never writes programs — it only
   * renders who is where, and re-renders when a cohort change moves people.
   */
  window.PaymentPrograms = {
    ready: ready,
    getPrograms: function () { return programs; },
    getCatalog: function () { return catalog; },
    getRoster: function () { return roster; },
    displayNumber: displayNumber,
    enabledCount: enabledCount,
    loadDelay: loadDelay,
    onChange: function (fn) { if (typeof fn === 'function') changeListeners.push(fn); }
  };

  document.addEventListener('DOMContentLoaded', function () {
    bind();
    loadData().then(function () {
      readyResolve();
      var id = currentProgramId();
      if (id && findProgram(id)) showDetail(id); else showList();
    });
  });
})();

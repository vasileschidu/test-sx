/**
 * onboarding-flow.js
 * Which SMART Disburse flow the onboarding pages are running: the US Default
 * Flow or US Multi-Party (Figma "⌛️ SD (Versioning)", page "Multi-Party 1.07").
 *
 * Multi-Party is the US flow plus a "Current Allocation" step between the
 * documents and the payment method: the payment is split between several
 * parties, each accepts (or changes) the split, then picks how to receive their
 * own share. Every other screen is the US one, so this file only:
 *
 *   - remembers the flow (?flow=multi-party / ?flow=us). Default and Multi-Party
 *     are separate flows: each tab keeps its own (sessionStorage), so both can run
 *     side by side; a new tab without ?flow= starts in the last one chosen,
 *   - adds the Current Allocation step to the stepper (OBFlow.steps),
 *   - reroutes a few hops (OBFlow.route, called by onboarding-transitions.js):
 *       documents / signature → allocation.html instead of paywall.html
 *       payment summary → payment-status.html while other parties are waiting
 *   - keeps the parties and the allocation log (OBFlow.allocation…),
 *   - renders a "Scenario" switcher on the Current Allocation screen so every
 *     state can be shown.
 *
 * Load before onboarding-stepper.js. In the US flow everything here is a no-op.
 */
window.OBFlow = (function () {
  'use strict';

  var FLOW_KEY = 'sd-flow';
  var MP_KEY = 'sd-mp-state';
  var CONTEXT_KEY = 'sd-onboarding-state';
  var MULTI = 'multi-party';

  var FINAL_PAGES = ['card-created', 'bank-submitted', 'check-submitted', 'debit-submitted'];
  var METHOD_LABELS = {
    'instant-virtual-card': 'Instant Virtual Card',
    'debit-card': 'Debit Card',
    'bank-account': 'Bank Transfer - ACH',
    check: 'Check'
  };

  function read(key) {
    try { return JSON.parse(sessionStorage.getItem(key) || 'null'); } catch (e) { return null; }
  }
  function write(key, value) {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode */ }
  }

  // ---- Flow -------------------------------------------------------------------

  // Per tab first, so a Default tab and a Multi-Party tab never switch each
  // other; the last choice (localStorage) only seeds a tab that has none yet.
  function getFlow() {
    try {
      var flow = sessionStorage.getItem(FLOW_KEY) || localStorage.getItem(FLOW_KEY) || 'us';
      sessionStorage.setItem(FLOW_KEY, flow);
      return flow;
    } catch (e) { return 'us'; }
  }
  function setFlow(value) {
    try {
      sessionStorage.setItem(FLOW_KEY, value);
      localStorage.setItem(FLOW_KEY, value);
    } catch (e) { /* storage blocked */ }
  }

  (function fromUrl() {
    var flow = new URLSearchParams(window.location.search).get('flow');
    if (flow === MULTI) {
      setFlow(MULTI);
      // A fresh multi-party link starts a fresh demo.
      sessionStorage.removeItem(MP_KEY);
    } else if (flow === 'us') {
      setFlow('us');
      sessionStorage.removeItem(MP_KEY);
    }
    // Applied once: drop ?flow= so a reload (the Scenario switcher reloads)
    // doesn't restart the demo.
    if (flow && window.history && window.history.replaceState) {
      var url = new URL(window.location.href);
      url.searchParams.delete('flow');
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    }
  })();

  function isMultiParty() { return getFlow() === MULTI; }

  function page() {
    return (window.location.pathname.split('/').pop() || '').replace('.html', '');
  }

  // ---- Parties and allocations -------------------------------------------------

  // Everyone who can share the payment; the demo uses the first 1, 2 or 4.
  var ALL_OTHERS = [
    { id: 'johnny', name: 'Johnny Anderson' },
    { id: 'leslie', name: 'Leslie James' },
    { id: 'maria', name: 'Maria Lopez' },
    { id: 'david', name: 'David Chen' }
  ];
  var TOTAL = 15000;

  /** The other parties for the demo's party count (2, 3 or 5 including the user). */
  function others(mp) {
    return ALL_OTHERS.slice(0, Math.max(1, Number((mp && mp.parties) || 3) - 1));
  }

  function myName() {
    var ctx = (read(CONTEXT_KEY) || {}).payableContext || {};
    return (ctx.contact && ctx.contact.name) || 'Leonard Krasner';
  }

  function hoursAgo(h) { return new Date(Date.now() - h * 3600000).toISOString(); }

  /** Splits `total` evenly over `ids`, cents left over going to the first. */
  function split(ids, total) {
    var cents = Math.round(total * 100);
    var each = Math.floor(cents / ids.length);
    var out = {};
    ids.forEach(function (id, i) { out[id] = (each + (i === 0 ? cents - each * ids.length : 0)) / 100; });
    return out;
  }

  function allAccepted(list) {
    var out = {};
    list.forEach(function (p) { out[p.id] = true; });
    return out;
  }

  /** The allocation history each demo scenario starts from (oldest first). */
  function scenarioLog(scenario, count) {
    var list = others({ parties: count });
    var ids = ['me'].concat(list.map(function (p) { return p.id; }));
    var initial = { by: 'initial', at: hoursAgo(72), amounts: split(ids, TOTAL), accepted: {} };
    var first = list[0];
    if (scenario === 'some') {
      // The user paid more of the deposit, so their share goes up by $1,000.
      var some = Object.assign({}, initial.amounts);
      some.me += 1000;
      some[first.id] -= 1000;
      var author = list[1] || first;
      return [initial, {
        by: author.id, at: hoursAgo(20),
        comment: list[1]
          ? 'Guys, I remembered that you deposited $1,000 more than ' + first.name.split(' ')[0] + ', so I corrected the return of the deposit.'
          : 'I corrected the split: you paid $1,000 more of the deposit than I did.',
        amounts: some, accepted: allAccepted(list)
      }];
    }
    if (scenario === 'zero') {
      // The user was paid directly, so their share moves to the others.
      var zero = Object.assign({ me: 0 }, split(ids.slice(1), TOTAL));
      return [initial, {
        by: first.id, at: hoursAgo(20),
        comment: 'You were already paid directly by the insurer, so your share moves to the rest of us.',
        amounts: zero, accepted: allAccepted(list)
      }];
    }
    return [initial];
  }

  function defaults() {
    return {
      role: 'primary',          // primary | party
      scenario: 'first',        // first | some | zero
      parties: 3,               // 2 | 3 | 5, the user included
      expiry: 'days',           // days | hours | minutes
      payment: 'active',        // active | expired | revoked | disputed
      fallback: true,           // expired / revoked: a check goes to the primary party
      log: scenarioLog('first', 3)
    };
  }

  function getMp() {
    var mp = read(MP_KEY);
    if (!mp || !mp.log) { mp = defaults(); write(MP_KEY, mp); }
    return mp;
  }
  function saveMp(mp) { write(MP_KEY, mp); return mp; }
  function resetMp() { sessionStorage.removeItem(MP_KEY); return getMp(); }

  function expiresAt(mp) {
    var ms = { days: (3 * 24 + 4) * 3600000, hours: 17 * 3600000 + 20 * 60000, minutes: 57 * 60000 + 17000 }[mp.expiry] || 0;
    // Anchored to the session so the countdown runs instead of resetting on every page.
    if (!mp.expiresAt || mp.expiryFor !== mp.expiry) {
      mp.expiresAt = new Date(Date.now() + ms).toISOString();
      mp.expiryFor = mp.expiry;
      saveMp(mp);
    }
    return new Date(mp.expiresAt);
  }

  function parties(mp) {
    var primaryId = mp.role === 'primary' ? 'me' : others(mp)[0].id;
    return [{ id: 'me', name: myName(), you: true }].concat(others(mp)).map(function (p) {
      return Object.assign({}, p, { primary: p.id === primaryId });
    });
  }

  function current(mp) { return mp.log[mp.log.length - 1]; }

  /**
   * Have all the other parties accepted the current allocation? Then, once the
   * user submits too, the payment goes ahead with no waiting screen.
   */
  function othersDone() {
    var mp = getMp();
    var entry = current(mp);
    return others(mp).every(function (p) { return !!entry.accepted[p.id]; });
  }

  function myShare() {
    var mp = getMp();
    return Number(current(mp).amounts.me || 0);
  }

  /** Name shown for whoever created an allocation. */
  function authorName(mp, by) {
    if (by === 'initial') return 'Initial Allocation';
    if (by === 'me') return 'You';
    var p = ALL_OTHERS.filter(function (o) { return o.id === by; })[0];
    return p ? p.name : by;
  }

  function accept() {
    var mp = getMp();
    current(mp).accepted.me = true;
    saveMp(mp);
  }

  /** A new allocation by the user. Everyone has to accept the new split again. */
  function change(amounts, comment) {
    var mp = getMp();
    mp.log.push({ by: 'me', at: new Date().toISOString(), comment: comment, amounts: amounts, accepted: {} });
    mp.justChanged = true;
    delete mp.othersProgress;   // a new split: everyone submits again
    saveMp(mp);
  }

  /** The primary party disputed the total: the payment request is cancelled. */
  function dispute(message) {
    var mp = getMp();
    mp.payment = 'disputed';
    if (message) mp.disputeMessage = message;
    saveMp(mp);
  }

  /** Another party changes the split: the first moves $500 of their share on. */
  function someoneChanges() {
    var mp = getMp();
    var list = others(mp);
    var from = list[0];
    var to = list[1];
    var amounts = Object.assign({}, current(mp).amounts);
    var moved = Math.min(500, amounts[from.id]);
    amounts[from.id] -= moved;
    if (to) amounts[to.id] += moved; else amounts.me += moved;
    var accepted = {};
    accepted[from.id] = true;
    mp.log.push({
      by: from.id, at: new Date().toISOString(),
      comment: to
        ? 'I moved $500 from my share to ' + to.name.split(' ')[0] + ' to cover the extra repair invoice.'
        : 'I moved $500 from my share to you to cover the extra repair invoice.',
      amounts: amounts, accepted: accepted
    });
    mp.changedBy = from.id;
    delete mp.othersProgress;   // a new split: everyone submits again
    saveMp(mp);
  }

  function setDemo(patch) {
    var mp = getMp();
    var scenario = patch.scenario || mp.scenario;
    var count = Number(patch.parties || mp.parties);
    if (scenario !== mp.scenario || count !== Number(mp.parties)) mp.log = scenarioLog(scenario, count);
    Object.assign(mp, patch);
    mp.parties = count;
    saveMp(mp);
  }

  // ---- Stepper ----------------------------------------------------------------

  /** US steps with Current Allocation after the documents. */
  function steps(usSteps) {
    if (!isMultiParty()) return usSteps;
    var out = [];
    usSteps.forEach(function (step) {
      var copy = Object.assign({}, step);
      if (copy.id === 'payment') copy.alsoMatches = (copy.alsoMatches || []).concat(['payment-status']);
      out.push(copy);
      if (step.id === 'documents') {
        out.push({ id: 'allocation', label: 'Current Allocation', href: 'allocation.html',
          alsoMatches: ['allocation', 'change-allocation', 'allocation-log', 'dispute'] });
      }
    });
    return out;
  }

  // ---- Routing ----------------------------------------------------------------

  function route(href) {
    if (!href || !isMultiParty()) return href;
    var url;
    try { url = new URL(href, window.location.href); } catch (e) { return href; }
    var target = (url.pathname.split('/').pop() || '').replace('.html', '');
    var from = page();

    if (target === 'paywall' && (from === 'review-documents' || from === 'signature')) {
      return 'allocation.html';
    }
    // Submitting a method: wait for the other parties unless the demo says they're done.
    if (FINAL_PAGES.indexOf(target) !== -1 && from !== 'payment-status' && !othersDone()) {
      return 'payment-status.html?final=' + encodeURIComponent(target + '.html');
    }
    return href;
  }

  function methodLabel() {
    var state = read(CONTEXT_KEY) || {};
    return METHOD_LABELS[state.paymentMethod] || '';
  }

  // ---- Demo switcher -------------------------------------------------------------

  function demoPanel() {
    // Only where the scenario plays out: Current Allocation, and the screen that
    // replaces it when the payment is expired, revoked or disputed.
    var here = page();
    var onStatus = here === 'payment-status';
    if (!isMultiParty() || (here !== 'allocation' && here !== 'payment-closed' && !onStatus) || document.querySelector('[data-mp-demo]')) return;
    var mp = getMp();
    function option(name, value, label) {
      return '<label class="flex cursor-pointer items-center gap-2 py-1 text-sm text-[#374151]">' +
        '<input type="radio" name="' + name + '" value="' + value + '"' + (String(mp[name]) === value ? ' checked' : '') +
        ' class="size-4 cursor-pointer accent-[#2563eb]">' + label + '</label>';
    }
    function group(title, body) {
      return '<fieldset class="flex flex-col gap-0.5"><legend class="mb-1 text-xs font-semibold tracking-wide text-[#6b7280] uppercase">' + title + '</legend>' + body + '</fieldset>';
    }
    var button = 'cursor-pointer rounded-md border border-[#d1d5db] px-3 py-2 text-sm font-medium text-[#374151] hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';
    var wrap = document.createElement('div');
    wrap.setAttribute('data-mp-demo', '');
    wrap.setAttribute('data-ob-no-skeleton', '');
    wrap.className = 'fixed right-4 bottom-4 z-40 flex flex-col items-end gap-2 font-[\'Inter\']';
    wrap.innerHTML =
      '<div data-mp-demo-panel hidden class="flex max-h-[calc(100vh-5rem)] w-64 flex-col gap-4 overflow-y-auto rounded-lg border border-[#e5e7eb] bg-white p-4 shadow-xl">' +
        // Payment Status: what can still happen after the user has submitted.
        (onStatus
          ? group('Other parties', option('othersProgress', 'none', 'Still choosing') + option('othersProgress', 'some', 'Some submitted') + option('othersProgress', 'all', 'All submitted'))
          : '') +
        group('Payment', option('payment', 'active', 'Active') + option('payment', 'expired', 'Expired') + option('payment', 'revoked', 'Revoked') + option('payment', 'disputed', 'Disputed by primary party')) +
        group('Fallback check to primary party', option('fallback', 'true', 'Yes') + option('fallback', 'false', 'No')) +
        (onStatus ? '' :
          group('You are', option('role', 'primary', 'Primary party') + option('role', 'party', 'Other party')) +
          group('Parties', option('parties', '2', '2 parties') + option('parties', '3', '3 parties') + option('parties', '5', '5 parties')) +
          group('Allocation', option('scenario', 'first', 'Nobody accepted yet') + option('scenario', 'some', 'Others accepted') + option('scenario', 'zero', 'Your share is $0'))) +
        group('Expires in', option('expiry', 'days', 'Days') + option('expiry', 'hours', 'Hours') + option('expiry', 'minutes', 'Minutes')) +
        '<button type="button" data-mp-demo-changed class="' + button + '">Someone changes the allocation</button>' +
        '<button type="button" data-mp-demo-reset class="' + button + '">Reset scenario</button>' +
      '</div>' +
      '<button type="button" data-mp-demo-toggle aria-expanded="false" class="cursor-pointer rounded-full bg-[#111827] px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-[#1f2937] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Scenario</button>';
    document.body.appendChild(wrap);

    var panel = wrap.querySelector('[data-mp-demo-panel]');
    var toggle = wrap.querySelector('[data-mp-demo-toggle]');
    // Fallback only applies to an expired or revoked payment.
    if (mp.payment !== 'expired' && mp.payment !== 'revoked') {
      panel.querySelectorAll('input[name=fallback]').forEach(function (input) { input.disabled = true; });
      panel.querySelector('input[name=fallback]').closest('fieldset').classList.add('opacity-50');
    }
    toggle.addEventListener('click', function () {
      panel.hidden = !panel.hidden;
      toggle.setAttribute('aria-expanded', String(!panel.hidden));
    });
    // The pages pick the right screen for the new state on load. Payment
    // Status stays put (keeping its ?final= link) unless the payment ended.
    function reopen() { window.location.href = 'allocation.html'; }
    panel.addEventListener('change', function (event) {
      var input = event.target;
      var patch = {};
      patch[input.name] = input.value === 'true' ? true : input.value === 'false' ? false : input.value;
      setDemo(patch);
      if (onStatus && getMp().payment === 'active') window.location.reload();
      else if (onStatus) window.location.href = 'payment-closed.html';
      else reopen();
    });
    wrap.querySelector('[data-mp-demo-changed]').addEventListener('click', function () {
      var mp = getMp();
      mp.payment = 'active';
      saveMp(mp);
      someoneChanges();
      reopen();
    });
    wrap.querySelector('[data-mp-demo-reset]').addEventListener('click', function () {
      resetMp();
      reopen();
    });
  }

  if (isMultiParty()) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demoPanel);
    else demoPanel();
  }

  return {
    isMultiParty: isMultiParty,
    steps: steps,
    route: route,
    getMp: getMp,
    saveMp: saveMp,
    parties: parties,
    current: current,
    others: others,
    othersDone: othersDone,
    dispute: dispute,
    myShare: myShare,
    authorName: authorName,
    expiresAt: expiresAt,
    accept: accept,
    change: change,
    methodLabel: methodLabel,
    TOTAL: TOTAL
  };
})();

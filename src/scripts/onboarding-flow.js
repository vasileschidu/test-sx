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
      payment: 'active',        // active | expired | revoked | declined | disputed (no UI leads to disputed)
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

  /** The user declined the payment (Decline Payment dialog, or the demo): the "revoked" screen, declined.html. */
  function decline() {
    var mp = getMp();
    mp.payment = 'declined';
    saveMp(mp);
  }

  /** The screen that replaces Current Allocation / Payment Status once the payment ended. */
  function closedUrl(mp) {
    return (mp || getMp()).payment === 'declined' ? 'declined.html' : 'payment-closed.html';
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

  // Example decline for the demo (the dialog's reasons live in src/data/sd-decline.json).
  var DEMO_DECLINE = { reason: 'Unable to post', note: 'The amount does not match our records for this claim.' };

  function demoPanel() {
    // Only where the scenario plays out: Current Allocation, Payment Status, and the
    // screens that replace them when the payment ended (closed, declined).
    var here = page();
    var onStatus = here === 'payment-status';
    var pages = ['allocation', 'payment-closed', 'payment-status', 'declined'];
    if (!isMultiParty() || pages.indexOf(here) === -1 || document.querySelector('[data-mp-demo]')) return;
    var mp = getMp();
    // A closed / declined screen reached from Payment Status keeps the Payment Status options.
    var statusSet = onStatus || (here !== 'allocation' && /^payment-status/.test(mp.returnTo || ''));
    // Unset "Other parties": Payment Status counts whoever accepted the allocation as
    // submitted, so show that as the picked option.
    function derivedProgress() {
      var accepted = current(mp).accepted || {};
      var list = others(mp);
      var done = list.filter(function (p) { return accepted[p.id]; }).length;
      return done === 0 ? 'none' : done === list.length ? 'all' : 'some';
    }
    function value(name) {
      if (name === 'othersProgress' && mp.othersProgress === undefined) return derivedProgress();
      return mp[name];
    }

    // Segmented control: one row of options, the picked one raised (components skill).
    function segmented(name, title, options) {
      var cols = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' }[options.length];
      return '<fieldset data-mp-demo-group="' + name + '" class="flex flex-col gap-1.5">' +
        '<legend class="mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">' + title + '</legend>' +
        '<div class="grid ' + cols + ' gap-1 rounded-lg bg-gray-100 p-1 dark:bg-white/5">' +
          options.map(function (o) {
            return '<label class="relative flex min-h-8 cursor-pointer items-center justify-center rounded-md px-1.5 py-1 text-center text-xs leading-4 font-medium text-gray-600 hover:bg-white/60 hover:text-gray-900 has-checked:bg-white has-checked:text-gray-900 has-checked:shadow-xs has-checked:ring-1 has-checked:ring-gray-900/5 has-focus-visible:outline-2 has-focus-visible:outline-offset-1 has-focus-visible:outline-blue-600 has-disabled:cursor-not-allowed has-disabled:opacity-50 has-disabled:hover:bg-transparent dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white dark:has-checked:bg-white/15 dark:has-checked:text-white dark:has-checked:ring-white/10 dark:has-focus-visible:outline-blue-400">' +
              '<input type="radio" name="' + name + '" value="' + o[0] + '"' + (String(value(name)) === o[0] ? ' checked' : '') + ' class="sr-only">' + o[1] +
            '</label>';
          }).join('') +
        '</div>' +
      '</fieldset>';
    }
    var secondary = 'inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20 dark:active:bg-white/25 dark:focus-visible:outline-blue-400';
    var ICON_SLIDERS = '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path d="M17 2.75a.75.75 0 0 0-1.5 0v5.5a.75.75 0 0 0 1.5 0v-5.5ZM17 15.75a.75.75 0 0 0-1.5 0v1.5a.75.75 0 0 0 1.5 0v-1.5ZM3.75 15a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75ZM4.5 2.75a.75.75 0 0 0-1.5 0v5.5a.75.75 0 0 0 1.5 0v-5.5ZM10 11a.75.75 0 0 1 .75.75v5.5a.75.75 0 0 1-1.5 0v-5.5A.75.75 0 0 1 10 11ZM10.75 2.75a.75.75 0 0 0-1.5 0v1.5a.75.75 0 0 0 1.5 0v-1.5ZM10 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM3.75 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM16.25 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" /></svg>';
    var ICON_X = '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>';
    var ICON_RESET = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="size-3.5"><path fill-rule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.932.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-1.242l.842.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.241l-.84-.84v1.371a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 0 1 0 1.5H3.98l.841.841a4.5 4.5 0 0 0 7.08-.932.75.75 0 0 1 1.025-.273Z" clip-rule="evenodd" /></svg>';

    var wrap = document.createElement('div');
    wrap.setAttribute('data-mp-demo', '');
    wrap.setAttribute('data-ob-no-skeleton', '');
    wrap.className = 'fixed right-4 bottom-4 z-40 flex flex-col items-end gap-2 font-[\'Inter\']';
    wrap.innerHTML =
      '<div data-mp-demo-panel role="dialog" aria-labelledby="mp-demo-title" hidden class="flex max-h-[calc(100dvh-5rem)] w-80 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-gray-900/10 dark:bg-gray-800 dark:ring-white/10">' +
        '<div class="flex shrink-0 items-start gap-3 border-b border-gray-200 px-4 py-3 dark:border-white/10">' +
          '<div class="min-w-0 flex-1">' +
            '<h2 id="mp-demo-title" class="text-sm font-semibold text-gray-900 dark:text-white">Demo scenario</h2>' +
            '<p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Prototype only. Changes reload the page.</p>' +
          '</div>' +
          '<button type="button" data-mp-demo-reset class="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white dark:active:bg-white/15 dark:focus-visible:outline-blue-400">' + ICON_RESET + 'Reset</button>' +
          '<button type="button" data-mp-demo-close aria-label="Close" class="-mr-1 inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 active:bg-gray-200 focus-visible:outline-2 focus-visible:outline-blue-600 dark:hover:bg-white/10 dark:hover:text-gray-200 dark:active:bg-white/15 dark:focus-visible:outline-blue-400">' + ICON_X + '</button>' +
        '</div>' +
        '<div class="flex min-h-0 flex-col gap-4 overflow-y-auto px-4 py-4">' +
          // Payment Status: what can still happen after the user has submitted.
          (statusSet ? segmented('othersProgress', 'Other parties', [['none', 'Still choosing'], ['some', 'Some submitted'], ['all', 'All submitted']]) : '') +
          segmented('payment', 'Payment', [['active', 'Active'], ['expired', 'Expired'], ['revoked', 'Revoked'], ['declined', 'Declined']]) +
          segmented('fallback', 'Fallback check to primary party', [['true', 'Yes'], ['false', 'No']]) +
          (statusSet ? '' :
            segmented('role', 'You are', [['primary', 'Primary party'], ['party', 'Other party']]) +
            segmented('parties', 'Parties', [['2', '2'], ['3', '3'], ['5', '5']]) +
            segmented('scenario', 'Allocation', [['first', 'Nobody accepted'], ['some', 'Others accepted'], ['zero', 'Your share is $0']])) +
          segmented('expiry', 'Expires in', [['days', 'Days'], ['hours', 'Hours'], ['minutes', 'Minutes']]) +
        '</div>' +
        '<div class="shrink-0 border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">' +
          '<button type="button" data-mp-demo-changed class="' + secondary + '">Someone changes the allocation</button>' +
        '</div>' +
      '</div>' +
      '<button type="button" data-mp-demo-toggle aria-expanded="false" class="inline-flex cursor-pointer items-center gap-2 rounded-full bg-gray-900 py-2 pr-4 pl-3 text-sm font-medium text-white shadow-lg ring-1 ring-white/10 hover:bg-gray-800 active:bg-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 aria-expanded:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:active:bg-gray-500 dark:aria-expanded:bg-gray-600 dark:focus-visible:outline-blue-400">' + ICON_SLIDERS + 'Scenario</button>';
    document.body.appendChild(wrap);

    var panel = wrap.querySelector('[data-mp-demo-panel]');
    var toggle = wrap.querySelector('[data-mp-demo-toggle]');
    // Fallback only applies to an expired or revoked payment.
    if (mp.payment !== 'expired' && mp.payment !== 'revoked') {
      panel.querySelectorAll('input[name=fallback]').forEach(function (input) { input.disabled = true; });
    }
    function setOpen(open) {
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      if (!open) toggle.focus();
    }
    toggle.addEventListener('click', function () { setOpen(panel.hidden); });
    wrap.querySelector('[data-mp-demo-close]').addEventListener('click', function () { setOpen(false); });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !panel.hidden) setOpen(false);
    });
    // Where Reset / "Active" bring the user back: the scenario page they came from.
    // Payment Status keeps its ?final= link, also after a detour to a closed screen.
    var returnTo = onStatus ? here + '.html' + window.location.search
      : here === 'allocation' ? 'allocation.html'
      : (mp.returnTo || 'allocation.html');
    if (here === 'allocation' && mp.returnTo) { delete mp.returnTo; saveMp(mp); }
    function reopen() { window.location.href = returnTo; }
    function clearDecline() {
      if (window.SDOnboardingContext) window.SDOnboardingContext.saveState({ declined: null });
    }
    panel.addEventListener('change', function (event) {
      var input = event.target;
      var patch = {};
      patch[input.name] = input.value === 'true' ? true : input.value === 'false' ? false : input.value;
      setDemo(patch);
      var payment = getMp().payment;
      if (payment !== 'active' && returnTo !== 'allocation.html') {
        var keep = getMp(); keep.returnTo = returnTo; saveMp(keep);
      }
      if (input.name === 'payment') {
        if (payment === 'declined') {
          // Same as confirming the Decline Payment dialog.
          if (window.SDOnboardingContext) window.SDOnboardingContext.saveState({ declined: Object.assign({ declinedAt: new Date().toISOString() }, DEMO_DECLINE) });
          window.location.href = 'declined.html';
          return;
        }
        clearDecline();
      }
      if (onStatus && payment === 'active') window.location.reload();
      else if (onStatus) window.location.href = closedUrl();
      else reopen();
    });
    wrap.querySelector('[data-mp-demo-changed]').addEventListener('click', function () {
      var mp = getMp();
      mp.payment = 'active';
      saveMp(mp);
      clearDecline();
      someoneChanges();
      // A new split has to be accepted again: always Current Allocation.
      window.location.href = 'allocation.html';
    });
    wrap.querySelector('[data-mp-demo-reset]').addEventListener('click', function () {
      resetMp();
      clearDecline();
      reopen();   // back to the page the scenario started from (Payment Status stays Payment Status)
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
    decline: decline,
    closedUrl: closedUrl,
    myShare: myShare,
    authorName: authorName,
    expiresAt: expiresAt,
    accept: accept,
    change: change,
    methodLabel: methodLabel,
    TOTAL: TOTAL
  };
})();

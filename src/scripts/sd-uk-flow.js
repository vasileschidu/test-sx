/**
 * sd-uk-flow.js
 * Shared shell for the UK SMART Disburse demo (src/pages/sd-uk/).
 *
 * Pages use the existing onboarding shell — the sidebar stepper and mobile
 * header come from onboarding-stepper.js / onboarding-mobile-header.js, driven
 * by window.OB_FLOW_STEPS in the profile. This script adds what the UK steps share:
 *   - the onboarding footer into [data-uk-footer]
 *   - data binding: [data-uk-text="path.to.value"] is filled from
 *     window.SD_UK_CLAIM merged with what the user entered this session
 *   - session state, money formatting, a small modal, and primary-button helpers
 */
window.SDUK = (function () {
  'use strict';

  var STATE_KEY = 'sd-uk-state';
  var ASSETS = '../../assets/sd-uk/';

  var data = window.SD_UK_CLAIM || {};

  // ── State ──

  function getState() {
    try { return JSON.parse(sessionStorage.getItem(STATE_KEY) || '{}'); } catch (e) { return {}; }
  }

  function saveState(patch) {
    var next = Object.assign({}, getState(), patch || {});
    try { sessionStorage.setItem(STATE_KEY, JSON.stringify(next)); } catch (e) {}
    return next;
  }

  function resetState() {
    try { sessionStorage.removeItem(STATE_KEY); } catch (e) {}
  }

  /** Sample data with anything the user typed laid over it. */
  function model() {
    var s = getState();
    var claimant = JSON.parse(JSON.stringify(data.claimant || {}));
    if (s.details) {
      ['firstName', 'lastName', 'phone', 'email'].forEach(function (k) { if (s.details[k]) claimant[k] = s.details[k]; });
      ['line1', 'line2', 'city', 'region', 'postcode'].forEach(function (k) { if (s.details[k] !== undefined) claimant.address[k] = s.details[k]; });
    }
    var bank = Object.assign({}, data.bank || {}, s.bank || {});
    return {
      payer: data.payer,
      claimant: claimant,
      claim: data.claim,
      card: data.card,
      bank: bank,
      receipt: data.receipt,
      fullName: (claimant.firstName + ' ' + claimant.lastName).trim(),
      amount: money(data.claim && data.claim.amount),
      amountWhole: money(data.claim && data.claim.amount).replace(/\.\d+$/, ''),
      amountPence: '.' + (money(data.claim && data.claim.amount).split('.')[1] || '00'),
      addressLines: addressLines(claimant.address),
      sortEnding: 'ending in ' + String(bank.sortCode || '').slice(-4),
      accountEnding: 'ending in ' + String(bank.accountNumber || '').slice(-4)
    };
  }

  function money(amount) {
    var n = Number(amount || 0);
    try {
      return new Intl.NumberFormat(data.locale || 'en-GB', { style: 'currency', currency: data.currency || 'GBP' }).format(n);
    } catch (e) { return '£' + n.toFixed(2); }
  }

  function addressLines(a) {
    if (!a) return '';
    return [a.line1, a.line2, [a.city, a.region].filter(Boolean).join(', '), a.postcode, a.countryShort || 'United Kingdom']
      .filter(Boolean).join('\n');
  }

  function pick(obj, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
  }

  function bind(root) {
    var m = model();
    // Values that come from the claim load behind the flow's skeleton, like the
    // other onboarding steps (onboarding-transitions.js picks these up).
    (root || document).querySelectorAll('[data-ob-content] [data-uk-text]').forEach(function (el) {
      if (!el.closest('button, a, [data-ob-no-skeleton]')) el.setAttribute('data-ob-skeleton', '');
    });
    (root || document).querySelectorAll('[data-uk-text]').forEach(function (el) {
      var v = pick(m, el.getAttribute('data-uk-text'));
      if (v !== undefined && v !== null) el.textContent = v;
    });
    (root || document).querySelectorAll('select[data-uk-select]').forEach(function (sel) {
      if (sel.options.length > 1) return;
      var list = data[sel.getAttribute('data-uk-select')] || [];
      var current = pick(m, sel.getAttribute('data-uk-select-value') || '') || '';
      list.forEach(function (name) {
        var o = document.createElement('option');
        o.value = name; o.textContent = name;
        if (name === current) o.selected = true;
        sel.appendChild(o);
      });
    });
    (root || document).querySelectorAll('[data-uk-value]').forEach(function (el) {
      if (el.value) return;
      var v = pick(m, el.getAttribute('data-uk-value'));
      if (v !== undefined && v !== null) el.value = v;
    });
  }

  // ── Shell ──

  function img(name, cls) {
    return '<img alt="" src="' + ASSETS + name + '" class="' + (cls || '') + '" />';
  }

  /** Same footer as the rest of the onboarding flow. */
  function renderFooter() {
    document.querySelectorAll('[data-uk-footer]').forEach(function (host) {
      host.className = 'flex items-center justify-center gap-1.5 px-6 py-5';
      host.innerHTML = img('shield-check.svg', 'size-[18px]') +
        '<span class="text-xs text-gray-700">Powered by <span class="font-bold">Transcard</span>' +
          '<span class="mx-1">|</span><a href="#" class="text-gray-700 hover:underline">Terms of Use</a>' +
          '<span class="mx-0.5">&bull;</span><a href="#" class="text-gray-700 hover:underline">Privacy Policy</a>' +
          '<span class="mx-0.5">&bull;</span><a href="#" class="text-gray-700 hover:underline">E-Sign Consent</a></span>';
    });
  }

  // ── Behaviour helpers ──

  /** Same exit fade as every other onboarding step. */
  function go(href) {
    if (window.OnboardingTransitions) window.OnboardingTransitions.navigate(href);
    else window.location.href = href;
  }

  /** Buttons carry their own disabled: styles, as elsewhere in the flow. */
  function setEnabled(btn, on) {
    if (btn) btn.disabled = !on;
  }

  /** Re-checks a form on every input: `ready()` decides whether `btn` is on. */
  function watch(form, btn, ready) {
    var check = function () { setEnabled(btn, !!ready()); };
    form.addEventListener('input', check);
    form.addEventListener('change', check);
    check();
    return check;
  }

  // ── Modal ──
  //
  // Same dialog as the Supplier Portal (Get Paid confirmations): dimmed
  // backdrop, a rounded-xl panel that slides up on phones and scales in on
  // larger screens, a close button in its own row, centred icon + title + copy,
  // and a bordered footer with full-width buttons.

  var openModalEl = null;

  function closeModal() {
    if (!openModalEl) return;
    var el = openModalEl;
    openModalEl = null;
    var panel = el.querySelector('[data-uk-panel]');
    el.querySelector('[data-uk-backdrop]').classList.add('opacity-0');
    panel.classList.add('opacity-0', 'translate-y-4', 'sm:translate-y-0', 'sm:scale-95');
    panel.classList.remove('duration-300', 'ease-out');
    panel.classList.add('duration-200', 'ease-in');
    setTimeout(function () { el.remove(); }, 200);
    document.documentElement.style.overflow = '';
  }

  /** modal({ html, size, bare }) — anything inside with [data-uk-close] closes it; `bare` drops the close row. */
  function modal(opts) {
    closeModal();
    var wrap = document.createElement('div');
    wrap.className = 'fixed inset-0 z-50 overflow-y-auto';
    wrap.innerHTML =
      '<div data-uk-backdrop class="fixed inset-0 bg-gray-900/75 opacity-0 transition-opacity duration-300 ease-out"></div>' +
      '<div data-uk-close-area class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-6">' +
        '<div role="dialog" aria-modal="true" data-uk-panel class="relative w-full translate-y-4 transform overflow-hidden rounded-xl bg-white text-left opacity-0 shadow-xl transition-all duration-300 ease-out sm:translate-y-0 sm:scale-95 ' + (opts.size || 'sm:max-w-lg') + '">' +
          (opts.bare ? '' : '<div class="flex flex-col items-end px-4 pt-4">' +
            '<button type="button" data-uk-close data-uk-dismiss class="cursor-pointer rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500"><span class="sr-only">Close</span>' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="size-5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>' +
          '</div>') + opts.html +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap);
    document.documentElement.style.overflow = 'hidden';
    openModalEl = wrap;
    var panel = wrap.querySelector('[data-uk-panel]');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        wrap.querySelector('[data-uk-backdrop]').classList.remove('opacity-0');
        panel.classList.remove('opacity-0', 'translate-y-4', 'sm:scale-95');
      });
    });
    wrap.addEventListener('click', function (e) {
      if (e.target.closest('[data-uk-close]') || e.target === wrap.querySelector('[data-uk-close-area]')) closeModal();
    });
    return panel;
  }

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

  var ICONS = {
    info: '<svg viewBox="0 0 24 24" fill="#2563EB" class="size-11" aria-hidden="true"><path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 0 1 .67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 1 1-.671-1.34l.041-.022ZM12 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clip-rule="evenodd"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="#2563EB" class="size-11" aria-hidden="true"><path fill-rule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625ZM7.5 15a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 15Zm.75 2.25a.75.75 0 0 0 0 1.5H12a.75.75 0 0 0 0-1.5H8.25Z" clip-rule="evenodd"/><path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="#DC2626" class="size-11" aria-hidden="true"><path fill-rule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clip-rule="evenodd"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="currentColor" class="size-11 text-green-500" aria-hidden="true"><path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clip-rule="evenodd"/></svg>'
  };

  var BTN_SECONDARY = 'w-full cursor-pointer rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-700 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50';
  var BTN_PRIMARY = 'w-full cursor-pointer rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';
  var BTN_DANGER = 'w-full cursor-pointer rounded-md bg-red-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600';

  /**
   * confirmModal({ icon, title, body, cancel, confirm, tone, onConfirm }) — the
   * Supplier Portal confirmation layout. Leave `cancel` out for a single button.
   */
  function confirmModal(o) {
    var confirmCls = o.tone === 'danger' ? BTN_DANGER : (o.tone === 'secondary' ? BTN_SECONDARY : BTN_PRIMARY);
    var panel = modal({ size: o.size, html:
      '<div class="flex flex-col gap-6 px-6 pt-0 pb-6 sm:px-8">' +
        '<div class="flex flex-col items-center text-center">' + (ICONS[o.icon] || o.icon || '') +
          '<div class="' + (o.icon ? 'mt-6 ' : '') + 'flex flex-col items-center gap-2">' +
            '<h2 class="text-center text-lg/6 font-semibold text-gray-900">' + o.title + '</h2>' +
            (o.body ? '<div class="text-center text-sm/5 font-normal text-gray-500">' + o.body + '</div>' : '') +
          '</div>' +
        '</div>' + (o.extra || '') +
      '</div>' +
      '<div class="flex w-full gap-3 border-t border-gray-200 px-6 py-5">' +
        (o.cancel ? '<button type="button" data-uk-close class="' + BTN_SECONDARY + '">' + o.cancel + '</button>' : '') +
        '<button type="button" data-uk-confirm class="' + confirmCls + '">' + (o.confirm || 'Close') + '</button>' +
      '</div>' });
    panel.querySelector('[data-uk-confirm]').addEventListener('click', function () {
      if (o.onConfirm) o.onConfirm(); else closeModal();
    });
    return panel;
  }

  function infoModal(title, body, icon) {
    return confirmModal({ icon: icon || 'info', title: title, body: body, confirm: 'Got it', tone: 'secondary' });
  }

  /** The project's checkbox component, as used across the onboarding flow. */
  function checkboxHtml(attrs, checked) {
    return '<div class="group grid size-4 shrink-0 grid-cols-1">' +
      '<input type="checkbox" ' + attrs + (checked ? ' checked' : '') + ' class="col-start-1 row-start-1 cursor-pointer appearance-none rounded-sm border border-gray-300 bg-white checked:border-blue-600 checked:bg-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 forced-colors:appearance-auto" />' +
      '<svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white">' +
      '<path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-checked:opacity-100" /></svg></div>';
  }

  /**
   * Shared "One Final Step" consent rows. "Review" opens the document; closing
   * it swaps the link for a ticked checkbox, so every row ends up a checkbox.
   */
  function initConsents(root, onChange) {
    var done = getState().reviewed || {};
    function toCheckbox(btn, key) {
      var wrap = document.createElement('div');
      wrap.innerHTML = checkboxHtml('data-uk-consent data-uk-reviewed="' + key + '" aria-label="' + (btn.getAttribute('data-uk-review-title') || 'Reviewed') + '"', true);
      var box = wrap.firstElementChild;
      btn.replaceWith(box);
      box.querySelector('input').addEventListener('change', function (e) {
        done[key] = e.target.checked;
        saveState({ reviewed: done });
      });
    }
    root.querySelectorAll('[data-uk-review]').forEach(function (btn) {
      var key = btn.getAttribute('data-uk-review');
      if (done[key]) { toCheckbox(btn, key); return; }
      btn.addEventListener('click', function () {
        var title = btn.getAttribute('data-uk-review-title') || 'Terms';
        confirmModal({
          icon: 'doc', title: title,
          body: '<p>This is a demo version of the ' + title + '. In the live flow the full document opens here.</p><p class="mt-3">Select <span class="font-semibold text-gray-900">I’ve read it</span> to confirm.</p>',
          cancel: 'Cancel', confirm: 'I’ve read it',
          onConfirm: function () {
            done[key] = true;
            saveState({ reviewed: done });
            if (btn.isConnected) toCheckbox(btn, key);
            closeModal();
            onChange();
          }
        });
      });
    });
    root.addEventListener('change', onChange);
    return function allDone() {
      var boxes = Array.prototype.every.call(root.querySelectorAll('[data-uk-consent]'), function (b) { return b.checked; });
      return boxes && !root.querySelector('[data-uk-review]');
    };
  }

  // ── Mobile menu ──
  //
  // On phones the hamburger opens these actions in a dropdown instead of the
  // stepper sheet (read by onboarding-mobile-header.js, which loads after this).

  var MENU_ICONS = {
    mail: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z"/><path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z"/></svg>',
    decline: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clip-rule="evenodd"/></svg>'
  };

  window.OB_MOBILE_MENU = [
    { label: 'Contact Us', icon: MENU_ICONS.mail, onSelect: function () { go('contact.html'); } },
    { label: 'Decline Payment', icon: MENU_ICONS.decline, onSelect: function () {
      confirmModal({
        icon: 'warn',
        title: 'Decline Payment',
        body: '<p>Are you sure you want to decline this payment?</p><p class="mt-3">The payment request will be cancelled and you’ll need to contact <span class="font-semibold text-gray-900">' + ((data.payer && data.payer.name) || 'the payer') + '</span> to receive it.</p>',
        cancel: 'Cancel', confirm: 'Decline', tone: 'danger',
        onConfirm: function () { closeModal(); go('contact.html'); }
      });
    } }
  ];

  // ── Boot ──

  // Page scripts run through ready() so they see the bound values and the shell.
  var booted = false;
  var queue = [];

  function ready(fn) {
    if (booted) fn(); else queue.push(fn);
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderFooter();
    bind();
    document.body.classList.add('transition-opacity', 'duration-150');
    booted = true;
    queue.splice(0).forEach(function (fn) { fn(); });
  });

  return {
    data: data,
    assets: ASSETS,
    ready: ready,
    getState: getState,
    saveState: saveState,
    resetState: resetState,
    model: model,
    money: money,
    bind: bind,
    go: go,
    setEnabled: setEnabled,
    watch: watch,
    modal: modal,
    infoModal: infoModal,
    closeModal: closeModal,
    confirmModal: confirmModal,
    initConsents: initConsents
  };
})();

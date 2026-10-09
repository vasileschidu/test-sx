/**
 * virtual-card-summary.js
 * Instant Virtual Card · Summary, "One Final Step" (Figma node 19484:101062).
 *
 *   - Shows the details saved by virtual-card.js in three groups, each with
 *     an Edit link back to that group of the form.
 *   - Consents (Terms of Use, Privacy Policy, E-Sign Consent) with their
 *     "Review and agree" dialog: onboarding-consents.js.
 *   - "Get Card Now" unlocks when all consents are accepted and opens the
 *     "Sign to authorize payment" dialog (onboarding-sign.js).
 * Agreement text: src/data/sd-virtual-card.json.
 *
 * "Request a Check" · Summary (Figma node 20322:74705, check-summary.html,
 * data-vcs-variant="check") is the same page for the details saved by the
 * check form: "Deposit $…" signs and goes to check-submitted.html, and
 * "I want my money faster!" opens onboarding-faster.js. The debit card flow's
 * summary (debit-summary.html, data-vcs-variant="debit") starts with the card
 * (brand chip, Trademark Disclaimer, "Mastercard ending in …") and the address
 * group, and goes to debit-submitted.html.
 */
(function () {
  'use strict';

  var DATA_PATH = '../../data/sd-virtual-card.json';

  var VARIANTS = {
    card: { stateKey: 'virtualCard', form: 'instant-virtual-card.html', consents: 'virtualCardConsents', signature: 'virtualCardSignature', method: 'instant-virtual-card', next: 'card-created.html' },
    check: { stateKey: 'checkRequest', form: 'check-request.html', consents: 'checkConsents', signature: 'checkSignature', method: 'check', next: 'check-submitted.html' },
    debit: { stateKey: 'debitAccountInfo', form: 'debit-account-info.html', card: 'debit-card-details.html', consents: 'debitConsents', signature: 'debitSignature', method: 'debit-card', next: 'debit-submitted.html' }
  };
  var variant = VARIANTS.card;  // set from the page in init()

  function getState() {
    return window.SDOnboardingContext ? window.SDOnboardingContext.getState() : {};
  }
  function saveState(patch) {
    if (window.SDOnboardingContext) window.SDOnboardingContext.saveState(patch);
  }
  function esc(v) { return window.OBModal.escapeHtml(v); }

  function amountParts(value, currency) {
    var amount = Number(value || 0);
    try {
      var text = new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount);
      var m = text.match(/^(.*?)(\.\d{2})$/);
      if (m) return { integer: m[1], decimal: m[2] };
    } catch (error) { /* fall through */ }
    var fixed = amount.toFixed(2).split('.');
    return { integer: '$' + fixed[0], decimal: '.' + fixed[1] };
  }

  // ---- Details -------------------------------------------------------------

  function item(label, lines) {
    return '<div class="flex flex-col">' +
      '<p class="text-xs leading-4 font-medium text-[#6b7280]">' + esc(label) + '</p>' +
      lines.filter(Boolean).map(function (l) { return '<p class="text-base leading-6 break-words text-[#111827]"><span data-ob-skeleton>' + esc(l) + '</span></p>'; }).join('') +
    '</div>';
  }

  function group(section, items, href) {
    return '<div class="flex items-center gap-4 rounded-md bg-[#f9fafb] p-6">' +
      '<div class="flex min-w-0 flex-1 flex-col gap-4">' + items + '</div>' +
      '<a href="' + (href || variant.form + '#' + section) + '" class="shrink-0 rounded text-sm leading-5 font-medium text-[#2b61df] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Edit</a>' +
    '</div>';
  }

  /** Debit card: brand chip + Trademark Disclaimer, then the card lines. */
  function cardItem(card, trademark) {
    var D = window.OBDebit;
    var lines = D.cardLines(card);
    return '<div class="flex flex-col gap-3">' +
      '<div class="relative flex items-center gap-3">' + D.badge(card.brand, true) +
        '<button type="button" data-vcs-trademark aria-expanded="false" aria-controls="vcs-trademark-text" class="flex cursor-pointer items-center gap-1.5 rounded text-xs leading-[18px] text-[#4d4e50] hover:text-[#111827] focus-visible:outline-2 focus-visible:outline-blue-600">' +
          '<img src="../../assets/onboarding/cc-info.svg" alt="" width="12.8" height="12.8" class="block size-[12.8px]">Trademark Disclaimer</button>' +
        '<div id="vcs-trademark-text" data-vcs-trademark-text role="tooltip" hidden class="absolute top-full left-0 z-10 mt-2 w-[312px] max-w-[calc(100vw-4rem)] space-y-[18px] rounded-md bg-[#262626] p-4 text-xs leading-[18px] text-white shadow-lg">' +
          trademark.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') +
        '</div>' +
      '</div>' +
      '<div class="flex flex-col gap-0.5">' +
        '<p class="text-base leading-6 text-[#111827]"><span data-ob-skeleton>' + esc(lines[0]) + '</span></p>' +
        '<p class="text-xs leading-4 font-medium text-[#6b7280]">' + esc(lines[1]) + '</p>' +
        '<p class="text-xs leading-4 font-medium text-[#6b7280]">' + esc(lines[2]) + '</p>' +
      '</div>' +
    '</div>';
  }

  function stateCode(name, codes) {
    for (var code in codes) if (codes[code] === name) return code;
    return name;
  }

  function init(data) {
    var variantEl = document.querySelector('[data-vcs-variant]');
    variant = VARIANTS[variantEl && variantEl.getAttribute('data-vcs-variant')] || VARIANTS.card;
    var state = getState();
    var vc = state[variant.stateKey];
    if (!vc) {
      window.location.replace(variant.form);
      return;
    }
    var agreements = data.agreements;
    var submitBtn = document.querySelector('[data-vcs-submit]');
    var consentsEl = document.querySelector('[data-vcs-consents]');

    // Details
    var ssnDigits = String(vc.ssn || '').replace(/\D/g, '');
    var address = [
      vc.address1 + (vc.address2 ? ' ' + vc.address2 : ''),
      vc.city + ' ' + stateCode(vc.state, data.stateCodes) + ' ' + vc.zip
    ];
    var signName;
    if (variant === VARIANTS.debit) {
      var card = state.debitCard;
      if (!card) { window.location.replace(variant.card); return; }
      signName = card.name;
      document.querySelector('[data-vcs-groups]').innerHTML =
        group('card', cardItem(card, data.debit.trademark), variant.card) +
        group('address',
          item('Billing Address', address) +
          item('Date of Birth', [vc.dob]) +
          item('SSN (Social Security Number)', ['ending in ' + ssnDigits.slice(-4)])) +
        group('contact', item('Contact Info', [vc.phone, vc.email]));
      var tmBtn = document.querySelector('[data-vcs-trademark]');
      var tmText = document.querySelector('[data-vcs-trademark-text]');
      tmBtn.addEventListener('click', function () {
        var open = tmBtn.getAttribute('aria-expanded') !== 'true';
        tmBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        tmText.hidden = !open;
      });
      document.addEventListener('click', function (event) {
        if (!tmText.hidden && !event.target.closest('[data-vcs-trademark]')) {
          tmText.hidden = true;
          tmBtn.setAttribute('aria-expanded', 'false');
        }
      });
    } else document.querySelector('[data-vcs-groups]').innerHTML =
      group('personal',
        item('Full Name', [vc.firstName + ' ' + vc.lastName]) +
        item('Date of Birth', [vc.dob]) +
        item('SSN (Social Security Number)', ['ending in ' + ssnDigits.slice(-4)])) +
      group('address', item('Billing Address', address)) +
      group('contact', item('Contact Info', [vc.phone, vc.email]));

    // Amount
    var ctx = window.SDOnboardingContext;
    Promise.resolve(ctx && ctx.bootstrap ? ctx.bootstrap() : null).then(function (s) {
      var payable = (s && s.payableContext) || {};
      var parts = amountParts(payable.amount || (s && s.amount), payable.currency);
      document.querySelector('[data-vcs-integer]').textContent = parts.integer;
      document.querySelector('[data-vcs-decimal]').textContent = parts.decimal;
      var deposit = document.querySelector('[data-vcs-deposit-amount]');
      if (deposit) deposit.textContent = parts.integer + parts.decimal;
    });

    var faster = document.querySelector('[data-vcs-faster]');
    if (faster) faster.addEventListener('click', function () { window.OBFaster.open(); });

    window.OBConsents.mount(consentsEl, agreements, {
      stateKey: variant.consents,
      onChange: function (all) { submitBtn.disabled = !all; }
    });

    // Get Card Now → sign to authorize → processing → next step.
    submitBtn.addEventListener('click', function () {
      if (submitBtn.disabled) return;
      window.OBSign.open({
        name: signName || (vc.firstName + ' ' + vc.lastName).trim(),
        allowedPattern: data.allowedPattern,
        allowedMessage: data.allowedMessage,
        onSigned: function (signature) {
          var patch = { paymentMethod: variant.method };
          patch[variant.signature] = { method: signature.method, name: signature.name || '', signedAt: new Date().toISOString() };
          saveState(patch);
          window.OBGo(variant.next);
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    // Details and consents are built from data: the page skeleton waits for them.
    var debitPage = document.querySelector('[data-vcs-variant="debit"]');
    var ready = Promise.all([
      window.OBModal.loadJson(DATA_PATH, ['agreements', 'stateCodes', 'allowedPattern', 'allowedMessage']),
      debitPage ? window.OBDebit.load() : null
    ]).then(function (all) {
      if (all[0]) init(Object.assign({ debit: all[1] }, all[0]));
    });
    if (window.OnboardingTransitions && window.OnboardingTransitions.waitFor) window.OnboardingTransitions.waitFor(ready);
  });
})();

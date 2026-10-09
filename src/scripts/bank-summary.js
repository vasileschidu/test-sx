/**
 * bank-summary.js
 * Send to my Bank Account · Summary, "One Final Step" (Figma node 19555:80882).
 *
 *   - Bank details (holder, routing, account) with the verify reminder — or,
 *     after a failed attempt, "Final attempt, review your details carefully"
 *     (node 21226:91915) — then address and contact, each with an Edit link.
 *   - "I want my money faster!" offers the Virtual Card or a debit card
 *     (onboarding-faster.js).
 *   - Consents: onboarding-consents.js. "Deposit $…" unlocks once all are
 *     accepted, opens "Sign to authorize payment" (onboarding-sign.js) and
 *     then runs the prototype verification (onboarding-bank.js):
 *       ok        → bank-submitted.html
 *       failed    → back to bank-details.html with the result, until the
 *                   attempts run out → revoked.html
 */
(function () {
  'use strict';

  var DETAILS_URL = 'bank-details.html';
  var INFO_URL = 'bank-account-info.html';
  var DONE_URL = 'bank-submitted.html';
  var REVOKED_URL = 'revoked.html';

  function getState() {
    return window.SDOnboardingContext ? window.SDOnboardingContext.getState() : {};
  }
  function saveState(patch) {
    if (window.SDOnboardingContext) window.SDOnboardingContext.saveState(patch);
  }
  function esc(v) { return window.OBModal.escapeHtml(v); }

  function stateCode(name, codes) {
    for (var code in codes) if (codes[code] === name) return code;
    return name;
  }

  // ---- Details ---------------------------------------------------------------

  function item(label, lines) {
    return '<div class="flex flex-col">' +
      '<p class="text-xs leading-4 font-medium text-[#6b7280]">' + esc(label) + '</p>' +
      lines.filter(Boolean).map(function (l) { return '<p class="text-base leading-6 break-words text-[#111827]"><span data-ob-skeleton>' + esc(l) + '</span></p>'; }).join('') +
    '</div>';
  }

  function edit(href, what) {
    return '<a href="' + href + '" class="shrink-0 rounded-md px-2.5 py-1.5 text-sm leading-5 font-semibold text-[#2563eb] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Edit<span class="sr-only"> ' + what + '</span></a>';
  }

  function group(items, href, what, extra) {
    return '<div class="flex flex-col gap-4 rounded-lg bg-[#f9fafb] py-6 pr-2 pl-6">' +
      '<div class="flex items-center gap-4">' +
        '<div class="flex min-w-0 flex-1 flex-col gap-4">' + items + '</div>' +
        edit(href, what) +
      '</div>' +
      (extra ? '<div class="pr-4">' + extra + '</div>' : '') +
    '</div>';
  }

  // ---- Page ------------------------------------------------------------------

  function init(data) {
    var B = window.OBBank;
    var state = getState();
    var bank = state.bankAccount;
    var info = state.bankAccountInfo;
    if (!bank) { window.location.replace(DETAILS_URL); return; }
    if (!info) { window.location.replace(INFO_URL); return; }
    var verification = state.bankVerification || {};
    var finalAttempt = (verification.attempts || 0) >= data.maxAttempts - 1;
    var submitBtn = document.querySelector('[data-bks-submit]');

    // Details
    var ssnDigits = String(info.ssn || '').replace(/\D/g, '');
    document.querySelector('[data-bks-groups]').innerHTML =
      group(
        item('Full Name', [bank.holder]) + item('Routing Number', [bank.routing]) + item('Account Number', [bank.account]),
        DETAILS_URL, 'bank details',
        finalAttempt ? B.notice('final', data.finalAttempt, data.info) : B.notice('info', '', data.info)
      ) +
      group(
        item('Billing Address', [
          info.address1 + (info.address2 ? ' ' + info.address2 : ''),
          info.city + ' ' + stateCode(info.state, data.stateCodes) + ' ' + info.zip
        ]) +
        item('Date of Birth', [info.dob]) +
        item('SSN (Social Security Number)', ['ending in ' + ssnDigits.slice(-4)]),
        INFO_URL + '#address', 'address'
      ) +
      group(item('Contact Info', [info.phone, info.email]), INFO_URL + '#contact', 'contact info');

    // Amount
    var ctx = window.SDOnboardingContext;
    var ready = Promise.resolve(ctx && ctx.bootstrap ? ctx.bootstrap() : state).then(function (s) {
      s = s || state;
      var payable = s.payableContext || {};
      var amount = B.money(payable.amount || s.amount, payable.currency);
      var m = amount.match(/^(.*?)(\.\d{2})$/) || [amount, amount, ''];
      document.querySelector('[data-bks-integer]').textContent = m[1];
      document.querySelector('[data-bks-decimal]').textContent = m[2];
      document.querySelector('[data-bks-deposit-amount]').textContent = amount;
    });

    window.OBConsents.mount(document.querySelector('[data-bks-consents]'), data.agreements, {
      stateKey: 'bankConsents',
      onChange: function (all) { submitBtn.disabled = !all; }
    });

    document.querySelector('[data-bks-faster]').addEventListener('click', function () { window.OBFaster.open(); });

    // Deposit → sign to authorize → verify the account (prototype rules in
    // onboarding-bank.js) → next step.
    function deposit(signature) {
      saveState({ bankSignature: { method: signature.method, name: signature.name || '', signedAt: new Date().toISOString() } });
      var current = getState();
      var result = B.verify(data, current);
      if (result === 'ok') {
        saveState({ paymentMethod: 'bank-account', bankVerification: { attempts: verification.attempts || 0, status: 'ok' } });
        window.OBGo(DONE_URL);
        return;
      }
      var attempts = (verification.attempts || 0) + 1;
      if (attempts >= data.maxAttempts) {
        saveState({ bankVerification: { attempts: attempts, status: result }, revokedReason: 'Exhausted attempts to verify your bank account' });
        window.OBGo(REVOKED_URL);
        return;
      }
      saveState({ bankVerification: { attempts: attempts, status: result } });
      window.OBGo(DETAILS_URL);
    }

    submitBtn.addEventListener('click', function () {
      if (submitBtn.disabled) return;
      window.OBSign.open({
        name: bank.holder,
        allowedPattern: data.allowedPattern,
        allowedMessage: data.allowedMessage,
        onSigned: deposit
      });
    });

    return ready;
  }

  document.addEventListener('DOMContentLoaded', function () {
    // Details and consents are built from data: the page skeleton waits for them.
    var ready = window.OBBank.load().then(function (data) {
      if (data) return init(data);
    });
    if (window.OnboardingTransitions && window.OnboardingTransitions.waitFor) window.OnboardingTransitions.waitFor(ready);
  });
})();

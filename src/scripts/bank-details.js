/**
 * bank-details.js
 * Send to my Bank Account · Bank Details (Figma node 19555:31325).
 *
 *   - Account Type (Checking / Savings), Account Holder Name, Routing Number,
 *     Account Number and Verify Account Number, prefilled from the session
 *     (holder name from the payee).
 *   - While a number field is focused it shows its hint and a "Can't find …?"
 *     link that opens the sample-check help (onboarding-bank.js).
 *   - A valid routing number shows the bank it belongs to.
 *   - Next validates everything (messages from sd-bank.json); after that,
 *     fields re-check as they change. Valid → bank-account-info.html.
 *   - After a failed deposit (bank-summary.js) the page opens with the result:
 *     "no-match" marks the holder name, "unable" shows the red alert and marks
 *     every field.
 */
(function () {
  'use strict';

  var NEXT_URL = 'bank-account-info.html';
  var ASSETS = '../../assets/onboarding/';

  function getState() {
    return window.SDOnboardingContext ? window.SDOnboardingContext.getState() : {};
  }
  function saveState(patch) {
    if (window.SDOnboardingContext) window.SDOnboardingContext.saveState(patch);
  }
  function esc(v) { return window.OBModal.escapeHtml(v); }
  function digits(v) { return String(v || '').replace(/\D/g, ''); }

  // ---- Markup --------------------------------------------------------------

  var RADIO = 'peer size-4 cursor-pointer appearance-none rounded-full border border-[#d1d5db] bg-white not-checked:hover:border-[#9ca3af] checked:border-transparent ' +
    'aria-invalid:border-[#ef4444] aria-invalid:not-checked:hover:border-[#f87171] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb]';

  function radio(value, label) {
    return '<label class="flex cursor-pointer items-center gap-2">' +
      '<span class="relative flex size-4 shrink-0">' +
        '<input type="radio" name="accountType" value="' + value + '" data-bank-type aria-invalid="false" aria-describedby="bank-type-error" class="' + RADIO + '">' +
        '<img src="' + ASSETS + 'radio-checked.svg" alt="" width="16" height="16" class="pointer-events-none absolute inset-0 hidden size-4 peer-checked:block">' +
      '</span>' +
      '<span class="text-sm leading-5 font-medium text-[#374151]">' + label + '</span>' +
    '</label>';
  }

  /** A design-system text field; `help` adds the corner link and the focus hint. */
  function field(id, label, opts) {
    var F = window.OBField;
    opts = opts || {};
    return '<div data-bank-wrap="' + id + '" class="flex w-full flex-col">' +
      '<div class="relative z-[1] flex w-full flex-col gap-1">' +
        '<div class="flex items-start gap-1">' +
          '<label for="bank-' + id + '" class="' + F.LABEL + '">' + label + '</label>' +
          (opts.help ? '<button type="button" data-bank-help hidden class="ml-auto cursor-pointer rounded text-sm leading-5 font-medium text-[#2563eb] hover:underline focus-visible:outline-2 focus-visible:outline-blue-600">' + opts.help + '</button>' : '') +
        '</div>' +
        '<div class="relative">' +
          '<input id="bank-' + id + '" data-bank-field="' + id + '" data-ob-skeleton type="text"' +
            (opts.numeric ? ' inputmode="numeric"' : '') +
            ' autocomplete="' + (opts.autocomplete || 'off') + '" aria-invalid="false" aria-describedby="bank-' + id + '-hint bank-' + id + '-error" class="' + F.INPUT + '">' +
          F.errorIcon() +
        '</div>' +
        (opts.hint ? '<p id="bank-' + id + '-hint" data-bank-hint hidden class="' + F.HELPER + '">' + esc(opts.hint) + '</p>' : '') +
        '<p id="bank-' + id + '-error" data-bank-error class="hidden ' + F.ERROR_TEXT + '"></p>' +
      '</div>' +
      (opts.linked ? '<p data-bank-linked hidden class="-mt-2 rounded-md bg-[#f9fafb] px-3 pt-5 pb-3 text-sm leading-5 text-[#374151]"></p>' : '') +
    '</div>';
  }

  // ---- Page ----------------------------------------------------------------

  function init(data) {
    var F = window.OBField;
    var B = window.OBBank;
    var msg = data.messages;
    var state = getState();
    var saved = state.bankAccount || {};
    var verification = state.bankVerification || {};

    document.querySelector('[data-bank-check]').innerHTML = B.check();
    document.querySelector('[data-bank-notice]').innerHTML = verification.status === 'unable'
      ? B.notice('alert', data.unable.title, data.unable.text)
      : B.notice('info', '', data.info);

    var fieldsEl = document.querySelector('[data-bank-fields]');
    fieldsEl.innerHTML =
      '<fieldset class="flex w-full flex-col gap-3">' +
        '<legend class="mb-3 ' + F.LABEL + '">Account Type</legend>' +
        '<div class="flex gap-6">' + radio('checking', 'Checking') + radio('savings', 'Savings') + '</div>' +
        '<p id="bank-type-error" data-bank-type-error class="hidden ' + F.ERROR_TEXT + '"></p>' +
      '</fieldset>' +
      field('holder', 'Account Holder Name', { autocomplete: 'name' }) +
      field('routing', 'Routing Number', { numeric: true, help: 'Can’t find routing number?', hint: data.hints.routing, linked: true }) +
      field('account', 'Account Number', { numeric: true, help: 'Can’t find account number?', hint: data.hints.account }) +
      field('verify', 'Verify Account Number', { numeric: true });

    var types = Array.prototype.slice.call(fieldsEl.querySelectorAll('[data-bank-type]'));
    var typeError = fieldsEl.querySelector('[data-bank-type-error]');
    var el = {};
    ['holder', 'routing', 'account', 'verify'].forEach(function (id) {
      el[id] = fieldsEl.querySelector('[data-bank-field="' + id + '"]');
    });
    function wrap(id) { return fieldsEl.querySelector('[data-bank-wrap="' + id + '"]'); }
    var submitted = false;

    // ---- Rules
    function bankFor(routing) { return data.routingBanks[routing] || data.defaultBank; }
    function routingValid(v) { return /^\d{9}$/.test(v) && !/^0+$/.test(v); }
    function accountValid(v) { return /^\d{1,17}$/.test(v) && !/^0+$/.test(v); }

    var rules = {
      holder: function (v) {
        if (!v) return msg.holderRequired;
        if (!new RegExp(data.allowedPattern).test(v)) return data.allowedMessage;
        return '';
      },
      routing: function (v) { return !v ? msg.routingRequired : (routingValid(v) ? '' : msg.routingInvalid); },
      account: function (v) { return !v ? msg.accountRequired : (accountValid(v) ? '' : msg.accountInvalid); },
      verify: function (v) {
        if (!v) return msg.accountRequired;
        if (!accountValid(v)) return msg.accountInvalid;
        return v === el.account.value.trim() ? '' : msg.accountMismatch;
      }
    };

    function setFieldError(id, on, message) {
      F.setError(el[id], on, wrap(id).querySelector('[data-bank-error]'), message);
      syncHelp(id);
    }
    function checkField(id) {
      var message = rules[id](el[id].value.trim());
      setFieldError(id, !!message, message);
      return !message;
    }
    function setTypeError(on, message) {
      types.forEach(function (t) { t.setAttribute('aria-invalid', on ? 'true' : 'false'); });
      typeError.textContent = message || '';
      typeError.classList.toggle('hidden', !message);
    }
    function checkType() {
      var ok = types.some(function (t) { return t.checked; });
      setTypeError(!ok, ok ? '' : msg.accountTypeRequired);
      return ok;
    }

    // ---- Hint, help link and linked bank
    function syncHelp(id) {
      var w = wrap(id);
      var focused = document.activeElement === el[id];
      var hasError = el[id].getAttribute('aria-invalid') === 'true';
      var link = w.querySelector('[data-bank-help]');
      var hint = w.querySelector('[data-bank-hint]');
      var linked = w.querySelector('[data-bank-linked]');
      var v = el[id].value.trim();
      if (link) link.hidden = !focused;
      if (linked) {
        var show = routingValid(v) && !hasError;
        linked.hidden = !show;
        if (show) linked.innerHTML = 'This routing number is linked to <span class="font-semibold">' + esc(bankFor(v)) + '</span>.';
      }
      if (hint) hint.hidden = !focused || hasError || (linked && !linked.hidden);
    }

    ['routing', 'account'].forEach(function (id) {
      var link = wrap(id).querySelector('[data-bank-help]');
      // Keep focus in the field so the link doesn't vanish before the click.
      link.addEventListener('mousedown', function (event) { event.preventDefault(); });
      link.addEventListener('click', function () { B.openHelp(data); });
    });

    // ---- Typing
    var MAX = { routing: 9, account: 17, verify: 17 };
    Object.keys(el).forEach(function (id) {
      var input = el[id];
      input.addEventListener('input', function () {
        if (MAX[id]) input.value = digits(input.value).slice(0, MAX[id]);
        // A server-side result no longer applies once the field changes.
        if (submitted || input.getAttribute('aria-invalid') === 'true') {
          if (submitted) checkField(id);
          else setFieldError(id, false, '');
        }
        if (id === 'account' && submitted && el.verify.value) checkField('verify');
        syncHelp(id);
      });
      input.addEventListener('focus', function () { syncHelp(id); });
      input.addEventListener('blur', function () { syncHelp(id); });
    });
    types.forEach(function (t) {
      t.addEventListener('change', function () { setTypeError(false, ''); });
    });

    // ---- Prefill
    function prefill(s) {
      var ctx = s.payableContext || {};
      types.forEach(function (t) { t.checked = t.value === saved.accountType; });
      el.holder.value = saved.holder || B.payeeName(s);
      el.routing.value = saved.routing || '';
      el.account.value = saved.account || '';
      el.verify.value = saved.account || '';
      Object.keys(el).forEach(syncHelp);
      var amountEl = document.querySelector('[data-bank-amount]');
      if (amountEl) amountEl.textContent = B.money(ctx.amount || s.amount, ctx.currency);

      // Result of the last deposit attempt.
      if (verification.status === 'no-match') setFieldError('holder', true, msg.noMatch);
      if (verification.status === 'unable') {
        setTypeError(true, '');
        Object.keys(el).forEach(function (id) { setFieldError(id, true, ''); });
      }
    }
    var ctx = window.SDOnboardingContext;
    var ready = Promise.resolve(ctx && ctx.bootstrap ? ctx.bootstrap() : state).then(function (s) { prefill(s || getState()); });

    // ---- Next
    document.getElementById('bank-form').addEventListener('submit', function (event) {
      event.preventDefault();
      submitted = true;
      var firstBad = null;
      if (!checkType()) firstBad = types[0];
      Object.keys(el).forEach(function (id) { if (!checkField(id) && !firstBad) firstBad = el[id]; });
      if (firstBad) {
        firstBad.focus();
        return;
      }
      var routing = el.routing.value.trim();
      var holder = el.holder.value.trim();
      var account = el.account.value.trim();
      saveState({
        paymentMethod: 'bank-account',
        bankAccount: {
          accountType: types.filter(function (t) { return t.checked; })[0].value,
          holder: holder,
          routing: routing,
          account: account,
          bankName: bankFor(routing),
          // Names complete.html reads.
          accountHolderName: holder,
          accountNumber: account
        },
        // The details changed: the last result no longer applies (attempts stay).
        bankVerification: { attempts: verification.attempts || 0 }
      });
      window.OBGo(NEXT_URL);
    });

    return ready;
  }

  document.addEventListener('DOMContentLoaded', function () {
    // The form is built from data: the page skeleton waits for it.
    var ready = window.OBBank.load().then(function (data) {
      if (data) return init(data);
      document.querySelector('[data-bank-fields]').textContent = 'The form is unavailable right now. Please try again later.';
    });
    if (window.OnboardingTransitions && window.OnboardingTransitions.waitFor) window.OnboardingTransitions.waitFor(ready);
  });
})();

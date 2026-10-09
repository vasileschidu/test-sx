/**
 * debit-card.js
 * Send to my Debit Card · Card Details (Figma node 21923:104799, "9. MC Send -
 * Card Details", content only; fields and states as in the other flows).
 *
 *   - Name on Debit Card (prefilled from the payee), Debit Card Number
 *     (grouped in fours, card-brand chip once recognised), MM / YY.
 *   - Next validates (messages from sd-debit.json): required, allowed
 *     characters, Luhn checksum, month 01-12, year not in the past. A bad
 *     card number or expiry also shows the red "card details are invalid"
 *     alert; so does the declined demo number (`declinedDemoNumber`).
 *   - Valid → debit-account-info.html. "I'd rather use my routing and account
 *     number" switches to the bank flow.
 */
(function () {
  'use strict';

  var NEXT_URL = 'debit-account-info.html';
  var VC_DATA_PATH = '../../data/sd-virtual-card.json';

  function getState() {
    return window.SDOnboardingContext ? window.SDOnboardingContext.getState() : {};
  }
  function saveState(patch) {
    if (window.SDOnboardingContext) window.SDOnboardingContext.saveState(patch);
  }
  function esc(v) { return window.OBModal.escapeHtml(v); }
  function $(sel) { return document.querySelector(sel); }

  function field(id, label, opts) {
    var F = window.OBField;
    opts = opts || {};
    return '<div class="flex min-w-0 flex-1 flex-col gap-1">' +
      '<label for="debit-' + id + '" class="' + F.LABEL + '">' + label + '</label>' +
      '<div class="relative">' +
        '<input id="debit-' + id + '" data-debit-field="' + id + '" data-ob-skeleton type="text"' +
          (opts.numeric ? ' inputmode="numeric"' : '') +
          (opts.placeholder ? ' placeholder="' + esc(opts.placeholder) + '"' : '') +
          ' autocomplete="' + (opts.autocomplete || 'off') + '" aria-invalid="false" aria-describedby="debit-' + id + '-error" class="' + F.INPUT + (opts.badge ? ' pr-16' : '') + '">' +
        (opts.badge ? '<span data-debit-brand class="pointer-events-none absolute top-1/2 right-3 flex -translate-y-1/2"></span>' : '') +
        F.errorIcon() +
      '</div>' +
      '<p id="debit-' + id + '-error" data-debit-error="' + id + '" class="hidden ' + F.ERROR_TEXT + '"></p>' +
    '</div>';
  }

  function init(data, vcData) {
    var F = window.OBField;
    var D = window.OBDebit;
    var msg = data.messages;
    var state = getState();
    var saved = state.debitCard || {};

    $('[data-debit-fields]').innerHTML =
      field('name', 'Name on Debit Card', { autocomplete: 'cc-name' }) +
      field('number', 'Debit Card Number', { numeric: true, autocomplete: 'cc-number', placeholder: '0000 0000 0000 0000', badge: true }) +
      '<div class="flex items-start gap-4">' +
        field('month', 'MM', { numeric: true, autocomplete: 'cc-exp-month', placeholder: 'MM' }) +
        '<span aria-hidden="true" class="flex h-10 w-1.5 shrink-0 items-center self-start mt-6 text-sm leading-5 text-[#9ca3af]">/</span>' +
        field('year', 'YY', { numeric: true, autocomplete: 'cc-exp-year', placeholder: 'YY' }) +
      '</div>';

    var el = {};
    ['name', 'number', 'month', 'year'].forEach(function (id) { el[id] = $('[data-debit-field="' + id + '"]'); });
    var brandEl = $('[data-debit-brand]');
    var alertEl = $('[data-debit-alert]');
    var submitted = false;

    function syncBrand() {
      var invalid = el.number.getAttribute('aria-invalid') === 'true';
      brandEl.innerHTML = invalid ? '' : D.badge(D.brand(el.number.value), false);
    }

    // ---- Rules
    var now = new Date();
    var thisYear = now.getFullYear() % 100;
    var thisMonth = now.getMonth() + 1;
    var rules = {
      name: function (v) {
        if (!v) return msg.nameRequired;
        return new RegExp(vcData.allowedPattern).test(v) && /[A-Za-z]{2,}\s+[A-Za-z]/.test(v) ? '' : msg.nameInvalid;
      },
      number: function (v) {
        var d = D.digits(v);
        if (!d) return msg.numberRequired;
        return d.length === 16 && D.luhn(d) && D.brand(d) ? '' : msg.numberInvalid;
      },
      month: function (v) {
        if (!v) return msg.monthRequired;
        var m = Number(v);
        return v.length === 2 && m >= 1 && m <= 12 ? '' : msg.monthInvalid;
      },
      year: function (v) {
        if (!v) return msg.yearRequired;
        var y = Number(v);
        if (v.length !== 2 || y < thisYear || y > thisYear + 20) return msg.yearInvalid;
        var m = Number(el.month.value);
        if (y === thisYear && m >= 1 && m < thisMonth) return msg.expired;
        return '';
      }
    };

    function check(id) {
      var message = rules[id](el[id].value.trim());
      F.setError(el[id], !!message, $('[data-debit-error="' + id + '"]'), message);
      if (id === 'number') syncBrand();
      return !message;
    }
    function showAlert(on) {
      alertEl.hidden = !on;
      alertEl.innerHTML = on
        ? '<div role="alert" class="flex w-full items-start gap-3 rounded-md bg-[#fef2f2] p-4">' +
            '<img src="../../assets/onboarding/icon-x-circle-red.svg" alt="" width="20" height="20" class="size-5 shrink-0">' +
            '<p class="text-sm leading-5 text-[#991b1b]">' + esc(data.declined) + '</p>' +
          '</div>'
        : '';
    }

    // ---- Typing: masks
    var MASK = {
      number: function (v) { return D.digits(v).slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 '); },
      month: function (v) { return D.digits(v).slice(0, 2); },
      year: function (v) { return D.digits(v).slice(0, 2); }
    };
    Object.keys(el).forEach(function (id) {
      el[id].addEventListener('input', function () {
        if (MASK[id]) el[id].value = MASK[id](el[id].value);
        if (submitted) {
          check(id);
          if (id === 'month' && el.year.value) check('year');
        }
        if (id === 'number') syncBrand();
      });
    });

    // ---- Prefill
    var ctx = window.SDOnboardingContext;
    var ready = Promise.resolve(ctx && ctx.bootstrap ? ctx.bootstrap() : state).then(function (s) {
      s = s || getState();
      var payable = s.payableContext || {};
      el.name.value = saved.name || payeeName(s);
      el.number.value = saved.number ? MASK.number(saved.number) : '';
      el.month.value = saved.month || '';
      el.year.value = saved.year || '';
      syncBrand();
      var money = function (n) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: payable.currency || 'USD' }).format(Number(n || 0)); };
      $('[data-debit-amount]').textContent = money(payable.amount || s.amount);
      if (data.fee) {
        $('[data-debit-fee-amount]').textContent = money(data.fee);
        $('[data-debit-fee]').hidden = false;
      }
    });

    function payeeName(s) {
      var ctx = (s && s.payableContext) || {};
      var info = ctx.accountInformation || {};
      return [info.firstName, info.lastName].filter(Boolean).join(' ');
    }

    // ---- Next
    document.getElementById('debit-form').addEventListener('submit', function (event) {
      event.preventDefault();
      submitted = true;
      var firstBad = null;
      Object.keys(el).forEach(function (id) { if (!check(id) && !firstBad) firstBad = el[id]; });
      var cardBad = ['number', 'month', 'year'].some(function (id) { return el[id].getAttribute('aria-invalid') === 'true'; });
      var declined = !cardBad && D.digits(el.number.value) === data.declinedDemoNumber;
      if (declined) {
        F.setError(el.number, true, null, '');
        syncBrand();
        firstBad = firstBad || el.number;
      }
      showAlert(cardBad || declined);
      if (firstBad) {
        firstBad.focus();
        return;
      }
      var number = D.digits(el.number.value);
      saveState({
        paymentMethod: 'debit-card',
        debitCard: {
          name: el.name.value.trim(),
          number: number,
          month: el.month.value,
          year: el.year.value,
          brand: D.brand(number)
        }
      });
      window.OBGo(NEXT_URL);
    });

    return ready;
  }

  document.addEventListener('DOMContentLoaded', function () {
    // The form is built from data: the page skeleton waits for it.
    var ready = Promise.all([
      window.OBDebit.load(),
      window.OBModal.loadJson(VC_DATA_PATH, ['allowedPattern'])
    ]).then(function (all) {
      if (all[0] && all[1]) return init(all[0], all[1]);
      $('[data-debit-fields]').textContent = 'The form is unavailable right now. Please try again later.';
    });
    if (window.OnboardingTransitions && window.OnboardingTransitions.waitFor) window.OnboardingTransitions.waitFor(ready);
  });
})();

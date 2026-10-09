/**
 * paywall.js
 * Step 4 "Receive Payment" (Figma "4. Receive Payment", node 19484:89366).
 *
 *   - Fills the payment card (amount split into dollars / cents, sender).
 *   - Message and Expiration chips open their dialogs (shared OBModal shell);
 *     the Contact Us / Full details chip opens OBContact via [data-ob-contact].
 *   - Renders the payment methods from src/data/sd-payment.json; choosing one
 *     records it in the onboarding session and moves to its screen.
 */
(function () {
  'use strict';

  var DATA_PATH = '../../data/sd-payment.json';
  var ASSETS = '../../assets/onboarding/';

  function validateData(data, requiredFields) {
    if (!data) return false;
    return requiredFields.every(function (field) { return data[field] != null; });
  }

  function saveState(patch) {
    if (window.SDOnboardingContext) window.SDOnboardingContext.saveState(patch);
  }

  /** 487 → { integer: "$487", decimal: ".00" } */
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

  /** "2026-11-09" → "November 9, 2026" */
  function longDate(iso) {
    var d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  /** Message / Expiration dialogs: icon, heading, text and an OK button. */
  function infoDialog(icon, title, bodyHtml) {
    var M = window.OBModal;
    M.open(
      '<div class="flex flex-col items-center gap-6 px-6 pb-6">' +
        '<div class="flex w-full flex-col items-center gap-4">' +
          M.illustration(icon, 'bg-[#eff6ff]') +
          '<div class="flex w-full flex-col items-center gap-2 text-center">' +
            '<h2 id="pay-dialog-title" class="text-lg leading-6 font-medium text-[#111827]">' + M.escapeHtml(title) + '</h2>' +
            bodyHtml +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="flex flex-col px-6 pb-6">' +
        '<button type="button" data-ob-modal-close class="' + M.BUTTON + ' bg-[#2563eb] text-white hover:bg-[#3b82f6] focus-visible:outline-[#2563eb]">OK</button>' +
      '</div>',
      'pay-dialog-title'
    );
  }

  function methodMarkup(method, i) {
    var esc = window.OBModal.escapeHtml;
    // On hover/focus the arrow nudges right (as in the previous version) and
    // darkens slightly: #9ca3af → about #7d828c.
    var chevron = '<img src="' + ASSETS + 'icon-chevron-right-gray.svg" alt="" width="20" height="20" ' +
      'class="size-5 shrink-0 transition duration-200 ease-out group-hover:translate-x-1 group-hover:brightness-[0.8] ' +
      'group-focus-visible:translate-x-1 group-focus-visible:brightness-[0.8] motion-reduce:transition-none">';
    var cls = 'group flex w-full cursor-pointer items-center gap-4 rounded-lg border border-[#e5e7eb] bg-white p-3 text-left hover:bg-gray-50 ' +
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';
    if (method.compact) {
      return '<li><button type="button" data-pay-method="' + i + '" class="' + cls + '">' +
        '<span class="flex min-w-0 flex-1 flex-wrap gap-x-1.5 text-xs leading-4">' +
          '<span class="font-semibold text-[#111827]">' + esc(method.label) + '</span>' +
          '<span class="text-[#6b7280]">' + esc(method.detail) + '</span>' +
        '</span>' + chevron + '</button></li>';
    }
    return '<li><button type="button" data-pay-method="' + i + '" class="' + cls + '">' +
      '<span class="flex min-w-0 flex-1 items-center gap-3">' +
        '<span class="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#f9fafb]">' +
          '<img src="' + ASSETS + method.icon + '" alt="" width="24" height="24" class="size-6">' +
        '</span>' +
        '<span class="flex min-w-0 flex-col">' +
          '<span class="text-sm leading-5 font-semibold text-[#111827]">' + esc(method.label) + '</span>' +
          '<span class="text-xs leading-4 text-[#6b7280]">' + esc(method.detail) + '</span>' +
        '</span>' +
      '</span>' + chevron + '</button></li>';
  }

  function init(data) {
    var M = window.OBModal;
    var list = document.querySelector('[data-pay-methods]');
    list.innerHTML = data.methods.map(methodMarkup).join('');

    list.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-pay-method]');
      if (!btn) return;
      var method = data.methods[Number(btn.getAttribute('data-pay-method'))];
      saveState(Object.assign({ paymentMethod: method.id }, method.state || {}));
      if (method.href) {
        window.location.href = method.href;
      } else {
        // No screen for paper checks in the prototype yet.
        infoDialog('icon-calendar-lined.svg', 'Paper check',
          '<p class="text-sm leading-5 text-[#6b7280]">A paper check isn’t available in this prototype yet. Please choose another payment method.</p>');
      }
    });

    document.querySelector('[data-pay-chip="message"]').addEventListener('click', function () {
      infoDialog('icon-chat-alt-lined.svg', data.message.title,
        '<p class="text-sm leading-5 text-[#6b7280]">' + M.escapeHtml(data.message.body) + '</p>');
    });

    document.querySelector('[data-pay-chip="expiration"]').addEventListener('click', function () {
      infoDialog('icon-calendar-lined.svg', 'Expiration',
        '<p class="text-sm leading-5 text-[#6b7280]">This payment will be available for disbursement to your desired payment method until the date listed below. Funds will not be available after this day.</p>' +
        '<p class="text-sm leading-5 font-medium text-[#111827]">Expiration Date: ' + M.escapeHtml(longDate(data.expirationDate)) + '</p>');
    });

    // Amount and sender from the payment context.
    var ctx = window.SDOnboardingContext;
    Promise.resolve(ctx && ctx.bootstrap ? ctx.bootstrap() : null).then(function (state) {
      var payable = (state && state.payableContext) || {};
      var parts = amountParts(payable.amount || (state && state.amount), payable.currency);
      document.querySelector('[data-pay-integer]').textContent = parts.integer;
      document.querySelector('[data-pay-decimal]').textContent = parts.decimal;
      document.querySelector('[data-pay-sender]').textContent = payable.senderName || M.clientName();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    fetch(DATA_PATH, { cache: 'no-cache' })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!validateData(data, ['message', 'expirationDate', 'methods'])) throw new Error('sd-payment.json is missing fields');
        init(data);
      })
      .catch(function (error) {
        console.error('[payment]', error);
        var list = document.querySelector('[data-pay-methods]');
        if (list) list.innerHTML = '<li class="text-sm text-[#6b7280]">Payment methods are unavailable right now. Please try again later.</li>';
      });
  });
})();

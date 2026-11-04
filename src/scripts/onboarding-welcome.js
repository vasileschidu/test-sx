/**
 * onboarding-welcome.js
 * Fills the welcome screen (onboarding/index.html) from the payment context, so
 * it greets the same payee and shows the same amount and sender as the steps
 * that follow. The Learn more dialog gets the sender and the client contact.
 */
(function () {
  'use strict';

  function text(selector, value) {
    var el = document.querySelector(selector);
    if (el && value) el.textContent = value;
  }

  function all(selector, value) {
    if (!value) return;
    document.querySelectorAll(selector).forEach(function (el) { el.textContent = value; });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var ctx = window.SDOnboardingContext;
    if (!ctx || !ctx.bootstrap) return;
    Promise.resolve(ctx.bootstrap()).then(function (state) {
      var payable = (state && state.payableContext) || {};
      var info = payable.accountInformation || {};
      // Greet the person at the payee, falling back to the company name.
      var person = (payable.contact && payable.contact.name) ||
        [info.firstName, info.lastName].filter(Boolean).join(' ');
      text('[data-welcome-name]', person || payable.payeeName);
      text('[data-welcome-amount]', payable.amountFormatted);
      var sender = payable.senderName || (state && state.senderName);
      text('[data-welcome-sender]', sender);
      // Close the sentence unless the name already ends in a full stop ("Inc.").
      var stop = document.querySelector('[data-welcome-stop]');
      if (stop) stop.hidden = /\.$/.test(sender || 'Horizon Inc.');
      // Learn more: the sender and the client's contact details (sd-client-contact.json).
      all('[data-learn-buyer]', sender);
      if (window.OBModal && window.OBModal.loadContact) {
        window.OBModal.loadContact().then(function (contact) {
          all('[data-learn-email]', contact && contact.email);
          all('[data-learn-phone]', contact && contact.phone);
        });
      }
    });
  });
})();

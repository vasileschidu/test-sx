/**
 * onboarding-revoked.js
 * Fills revoked.html: who failed verification, which client to contact (with
 * phone / email from src/data/sd-client-contact.json via OBModal) and the
 * payment reference.
 */
(function () {
  'use strict';

  function text(selector, value) {
    var el = document.querySelector(selector);
    if (el && value) el.textContent = value;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var M = window.OBModal;
    var state = window.SDOnboardingContext ? window.SDOnboardingContext.getState() : {};
    var ctx = state.payableContext || {};
    var info = ctx.accountInformation || {};
    var recipient = (ctx.contact && ctx.contact.name) ||
      [info.firstName, info.lastName].filter(Boolean).join(' ') || ctx.payeeName;

    text('[data-revoked-reason]', state.revokedReason);
    text('[data-revoked-recipient]', recipient);
    text('[data-revoked-company]', M.clientName());
    text('[data-revoked-reference]', ctx.billNumber || state.billNumber);

    M.loadContact().then(function (contact) {
      if (!contact) return;
      text('[data-revoked-phone-text]', contact.phone);
      text('[data-revoked-email-text]', contact.email);
      document.querySelector('[data-revoked-phone]').href = 'tel:' + contact.phone.replace(/[^\d+]/g, '');
      document.querySelector('[data-revoked-email]').href = 'mailto:' + contact.email;
    });
  });
})();

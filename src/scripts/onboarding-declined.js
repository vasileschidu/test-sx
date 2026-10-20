/**
 * onboarding-declined.js
 * Fills declined.html from the onboarding session (what the payee chose in the
 * decline dialog) and renders the client's contact card via OBModal
 * (onboarding-modal.js, which must load first).
 */
(function () {
  'use strict';

  function text(selector, value) {
    var el = document.querySelector(selector);
    if (el) el.textContent = value;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var state = window.SDOnboardingContext ? window.SDOnboardingContext.getState() : {};
    var ctx = state.payableContext || {};
    var declined = state.declined || {};
    var info = ctx.accountInformation || {};
    var name = (ctx.contact && ctx.contact.name) ||
      [info.firstName, info.lastName].filter(Boolean).join(' ') || 'you';

    text('[data-declined-by]', name);
    text('[data-declined-reason]', declined.reason || '—');
    text('[data-declined-note]', declined.note || '');

    window.OBModal.loadContact().then(function (contact) {
      var slot = document.querySelector('[data-client-contact]');
      if (slot) slot.innerHTML = window.OBModal.contactCard(contact);
    });
  });
})();

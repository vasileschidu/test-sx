/**
 * paywall.js
 * SMART Exchange "Receive Payment" step.
 *
 * Wires the payment-method options to their next screen. The SMART Exchange
 * flow has no method-specific screens of its own, so the options fall through
 * to the equivalent SMART Disburse ones.
 */
(function () {
  'use strict';

  var DESTINATIONS = {
    'btn-accept-card': '../onboarding-sd/instant-virtual-card.html',
    'btn-bank-account': '../onboarding-sd/debit-account-info.html'
    // "Request a Paper Check" has no follow-up screen in either flow yet.
  };

  function go(href) {
    if (window.OnboardingTransitions && window.OnboardingTransitions.navigate) {
      window.OnboardingTransitions.navigate(href);
    } else {
      window.location.href = href;
    }
  }

  Object.keys(DESTINATIONS).forEach(function (id) {
    var button = document.getElementById(id);
    if (!button) return;
    button.classList.add('cursor-pointer');
    button.addEventListener('click', function () {
      go(DESTINATIONS[id]);
    });
  });
})();

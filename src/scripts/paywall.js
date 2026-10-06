/**
 * paywall.js
 * SMART Exchange "Receive Payment" step.
 *
 * Wires the payment-method options to their next screen. The SMART Exchange
 * flow has no method-specific screens of its own, so the options fall through
 * to the equivalent SMART Disburse ones — which read the chosen method back out
 * of shared state to decide what to render. Recording the choice is therefore
 * not optional: without it the bank option lands on the account-information
 * form instead of the bank-details form.
 */
(function () {
  'use strict';

  var STATE_KEY = 'sd-onboarding-state';

  var OPTIONS = {
    'btn-accept-card': {
      href: 'instant-virtual-card.html',
      state: { paymentMethod: 'instant-virtual-card' }
    },
    'btn-bank-account': {
      href: 'debit-account-info.html',
      state: { paymentMethod: 'bank-account', bankFlowStep: 'bank-details' }
    }
    // "Request a Paper Check" has no follow-up screen in either flow yet.
  };

  function saveState(patch) {
    var current = {};
    try {
      current = JSON.parse(sessionStorage.getItem(STATE_KEY) || '{}');
    } catch (error) {
      current = {};
    }
    try {
      sessionStorage.setItem(STATE_KEY, JSON.stringify(Object.assign(current, patch)));
    } catch (error) {
      /* storage is best-effort in the prototype */
    }
  }

  function go(href) {
    if (window.OnboardingTransitions && window.OnboardingTransitions.navigate) {
      window.OnboardingTransitions.navigate(href);
    } else {
      window.location.href = href;
    }
  }

  Object.keys(OPTIONS).forEach(function (id) {
    var button = document.getElementById(id);
    if (!button) return;
    button.classList.add('cursor-pointer');
    button.addEventListener('click', function () {
      saveState(OPTIONS[id].state);
      go(OPTIONS[id].href);
    });
  });
})();

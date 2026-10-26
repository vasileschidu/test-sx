/**
 * onboarding-revoked.js
 * revoked.html is retired: the verification-failure revoke is shown by the
 * Tokens screen payment-closed.html. Old links land here and are sent on,
 * keeping a reason so that screen shows the revoked variant.
 */
(function () {
  'use strict';

  var C = window.SDOnboardingContext;
  if (C && !(C.getState() || {}).revokedReason) {
    C.saveState({ revokedReason: 'Exhausted attempts to provide Verification Code' });
  }
  window.location.replace('payment-closed.html' + window.location.search + window.location.hash);
})();

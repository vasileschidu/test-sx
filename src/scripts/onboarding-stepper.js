/**
 * onboarding-stepper.js
 * Renders the onboarding progress nav from one shared step model.
 *
 * Steps used to be hand-written into every page, which drifted: welcome screens
 * marked step 1 complete, one page said "Create SMART Hub" while the rest said
 * "Create an Account", and the same screen showed a different list depending on
 * where you came from. The list now lives in src/data/onboarding-steps.json;
 * this file carries an inline copy because the project has no build step —
 * keep the two in sync, the same arrangement nav.json uses for the dashboard.
 *
 * Markup: <nav aria-label="Progress" data-ob-stepper data-ob-step="signature">
 * The step id is normally inferred from the filename, so the attribute is only
 * needed when a page wants to claim a different step. data-ob-step="none"
 * shows every step as upcoming (the welcome screen, before the flow starts);
 * data-ob-step="all" shows every step done, without links (the flow is over).
 */
(function () {
  'use strict';

  /**
   * Inline copy of src/data/onboarding-steps.json — keep in sync.
   * Another flow (e.g. the UK claim demo) can set window.OB_FLOW_STEPS first to
   * reuse this stepper and the mobile header with its own steps.
   */
  var STEPS = window.OB_FLOW_STEPS || [
    { id: 'verification', label: 'Verification Step', href: 'confirm-identity.html',
      alsoMatches: ['confirm-identity'] },
    { id: 'identity', label: 'Confirm Identity', href: 'confirm-business-details.html',
      alsoMatches: ['confirm-business-details'] },
    { id: 'documents', label: 'Review Documents', href: 'review-documents.html',
      alsoMatches: ['review-documents', 'signature'] },
    { id: 'payment', label: 'Receive Payment', href: 'paywall.html',
      alsoMatches: ['paywall', 'instant-virtual-card', 'virtual-card-summary', 'bank-details', 'bank-account-info', 'bank-summary', 'check-request', 'check-summary', 'debit-summary', 'debit-card-details', 'debit-account-info', 'summary'] },
    { id: 'complete', label: 'Complete Payment', href: 'create-account.html',
      alsoMatches: ['create-account', 'complete', 'card-created', 'bank-submitted', 'check-submitted', 'debit-submitted'] }
  ];

  var CHECK = 'M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z';

  function currentId(nav) {
    var declared = nav.getAttribute('data-ob-step');
    if (declared) return declared;
    var file = (window.location.pathname.split('/').pop() || '').replace('.html', '');
    for (var i = 0; i < STEPS.length; i += 1) {
      if (STEPS[i].id === file) return STEPS[i].id;
      if ((STEPS[i].alsoMatches || []).indexOf(file) !== -1) return STEPS[i].id;
    }
    return null;
  }

  function done(step, finished) {
    // Completed steps keep their look on hover: no colour change on the check.
    // Once the whole flow is finished there is nothing to go back to.
    var open = finished ? '<li><div>' : '<li><a href="' + step.href + '" class="rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">';
    var shut = finished ? '</div></li>' : '</a></li>';
    return open +
      '<span class="flex items-start">' +
        '<span class="relative flex size-5 shrink-0 items-center justify-center">' +
          '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-full text-white">' +
            '<path d="' + CHECK + '" clip-rule="evenodd" fill-rule="evenodd" /></svg>' +
        '</span>' +
        '<span class="ml-3 text-sm font-medium text-white">' + step.label + '</span>' +
      '</span>' + shut;
  }

  function current(step) {
    return '<li><a href="' + step.href + '" aria-current="step" class="flex items-start">' +
      '<span aria-hidden="true" class="relative flex size-5 shrink-0 items-center justify-center">' +
        '<span class="absolute size-4 rounded-full bg-white/20"></span>' +
        '<span class="relative block size-2 rounded-full bg-white"></span>' +
      '</span>' +
      '<span class="ml-3 text-sm font-medium text-white">' + step.label + '</span></a></li>';
  }

  /**
   * Steps ahead of the current one are plain text, not links: the user has to
   * finish the current step before moving on, so they get no hover state.
   */
  function upcoming(step) {
    return '<li aria-disabled="true"><div class="flex cursor-default items-start">' +
      '<div aria-hidden="true" class="relative flex size-5 shrink-0 items-center justify-center">' +
        '<div class="size-2 rounded-full bg-white/15"></div>' +
      '</div>' +
      '<p class="ml-3 text-sm font-medium text-white/30">' + step.label + '</p>' +
      '</div></li>';
  }

  function render(nav) {
    var id = currentId(nav);
    if (!id) return;
    var at = -1;
    for (var i = 0; i < STEPS.length; i += 1) if (STEPS[i].id === id) at = i;
    var finished = id === 'all';
    if (finished) at = STEPS.length;
    if (at === -1 && id !== 'none') return;
    nav.innerHTML = '<ol role="list" class="space-y-6">' + STEPS.map(function (step, index) {
      if (index < at) return done(step, finished);
      if (index === at) return current(step);
      return upcoming(step);
    }).join('') + '</ol>';
  }

  function init() {
    var navs = document.querySelectorAll('nav[data-ob-stepper]');
    for (var i = 0; i < navs.length; i += 1) render(navs[i]);
  }

  // Render before DOMContentLoaded listeners run, so anything reading the
  // stepper — the mobile header especially — sees the finished markup.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.OnboardingSteps = { steps: STEPS, render: render };
})();

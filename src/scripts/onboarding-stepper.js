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
 * needed when a page wants to claim a different step.
 */
(function () {
  'use strict';

  /** Inline copy of src/data/onboarding-steps.json — keep in sync. */
  var STEPS = [
    { id: 'confirm-identity', label: 'Confirm Identity', href: 'confirm-identity.html' },
    { id: 'confirm-business-details', label: 'Confirm Business Details', href: 'confirm-business-details.html' },
    { id: 'review-documents', label: 'Review Documents', href: 'review-documents.html' },
    { id: 'signature', label: 'Provide Signature', href: 'signature.html' },
    { id: 'paywall', label: 'Confirm Payment', href: 'paywall.html',
      alsoMatches: ['instant-virtual-card', 'debit-card-details', 'debit-account-info'] },
    { id: 'summary', label: 'Summary', href: 'summary.html' },
    { id: 'create-account', label: 'Create an Account', href: 'create-account.html' },
    { id: 'complete', label: 'Complete', href: 'complete.html' }
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

  function done(step) {
    return '<li><a href="' + step.href + '" class="group">' +
      '<span class="flex items-start">' +
        '<span class="relative flex size-5 shrink-0 items-center justify-center">' +
          '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-full text-white group-hover:text-blue-300">' +
            '<path d="' + CHECK + '" clip-rule="evenodd" fill-rule="evenodd" /></svg>' +
        '</span>' +
        '<span class="ml-3 text-sm font-medium text-white group-hover:text-white">' + step.label + '</span>' +
      '</span></a></li>';
  }

  function current(step) {
    return '<li><a href="' + step.href + '" aria-current="step" class="flex items-start">' +
      '<span aria-hidden="true" class="relative flex size-5 shrink-0 items-center justify-center">' +
        '<span class="absolute size-4 rounded-full bg-white/20"></span>' +
        '<span class="relative block size-2 rounded-full bg-white"></span>' +
      '</span>' +
      '<span class="ml-3 text-sm font-medium text-white">' + step.label + '</span></a></li>';
  }

  function upcoming(step) {
    return '<li><a href="' + step.href + '" class="group"><div class="flex items-start">' +
      '<div aria-hidden="true" class="relative flex size-5 shrink-0 items-center justify-center">' +
        '<div class="size-2 rounded-full bg-white/15 group-hover:bg-white/25"></div>' +
      '</div>' +
      '<p class="ml-3 text-sm font-medium text-white/30 group-hover:text-white">' + step.label + '</p>' +
      '</div></a></li>';
  }

  function render(nav) {
    var id = currentId(nav);
    if (!id) return;
    var at = -1;
    for (var i = 0; i < STEPS.length; i += 1) if (STEPS[i].id === id) at = i;
    if (at === -1) return;
    nav.innerHTML = '<ol role="list" class="space-y-6">' + STEPS.map(function (step, index) {
      if (index < at) return done(step);
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

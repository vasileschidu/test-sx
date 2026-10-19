/**
 * onboarding-substeps.js
 * The "General/Substeps" header used inside a payment method (e.g. Account
 * Information → Summary in the Virtual Card flow, Figma node 19484:94823).
 *
 * Markup: <div data-ob-substeps="Account Information|Summary" data-ob-substep="0"></div>
 * Each step gets a 2px top line (blue once reached) and a bullet: a check for
 * completed steps, the ringed blue dot for the current one, a gray dot ahead.
 * Desktop only: on mobile the top bar already shows progress.
 */
(function () {
  'use strict';

  var ASSETS = '../../assets/onboarding/';

  function bullet(state) {
    if (state === 'done') {
      return '<img src="' + ASSETS + 'substep-complete.svg" alt="" width="20" height="20" class="size-5 shrink-0">';
    }
    if (state === 'current') {
      return '<img src="' + ASSETS + 'substep-current.svg" alt="" width="20" height="20" class="size-5 shrink-0">';
    }
    return '<span class="flex size-5 shrink-0 items-center justify-center"><span class="block size-2.5 rounded-full bg-[#e5e7eb]"></span></span>';
  }

  function render(el) {
    var labels = el.getAttribute('data-ob-substeps').split('|');
    var current = Number(el.getAttribute('data-ob-substep') || 0);
    el.className = 'hidden w-full items-start lg:flex';
    el.setAttribute('role', 'list');
    el.setAttribute('aria-label', 'Progress');
    el.innerHTML = labels.map(function (label, i) {
      var state = i < current ? 'done' : (i === current ? 'current' : 'next');
      return '<div role="listitem" class="flex min-w-0 flex-1 flex-col gap-4"' + (state === 'current' ? ' aria-current="step"' : '') + '>' +
        '<span class="block h-0.5 w-full ' + (state === 'next' ? 'bg-[#e5e7eb]' : 'bg-[#2563eb]') + '"></span>' +
        '<span class="flex items-center gap-3">' + bullet(state) +
          '<span class="truncate text-sm leading-5 font-medium text-[#1f2937]">' + label + '</span>' +
        '</span>' +
      '</div>';
    }).join('');
  }

  function init() {
    var els = document.querySelectorAll('[data-ob-substeps]');
    for (var i = 0; i < els.length; i += 1) render(els[i]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

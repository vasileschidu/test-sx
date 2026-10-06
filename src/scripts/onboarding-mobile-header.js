/**
 * onboarding-mobile-header.js
 * Mobile top bar for the onboarding steps.
 *
 * Below `lg` the stepper sidebar is hidden and replaced by a sticky bar showing
 * the current step, its position in the flow and a progress rail. The bar reads
 * all of that from the page's own stepper markup, so a step never has to
 * declare its number twice — rename or reorder the stepper and the bar follows.
 *
 * The hamburger opens a sheet holding the full stepper plus the Contact /
 * Decline actions, i.e. everything the sidebar carries on desktop.
 */
(function () {
  'use strict';

  var NAV_SELECTOR = 'nav[aria-label="Progress"]';
  var GRADIENT = 'bg-gradient-to-b from-[#1E326F] to-[#090C38]';

  var ICON_MENU = '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5">' +
    '<path fill-rule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 5A.75.75 0 0 1 2.75 9h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 9.75ZM2 14.75a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clip-rule="evenodd" /></svg>';

  var ICON_CLOSE = '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5">' +
    '<path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>';

  /** Top-level steps only — sub-steps are indented and belong to their parent. */
  function topLevelSteps(nav) {
    return Array.prototype.filter.call(nav.querySelectorAll('ol > li'), function (li) {
      return !li.classList.contains('pl-6');
    });
  }

  function readProgress(nav) {
    var steps = topLevelSteps(nav);
    if (!steps.length) return null;

    var current = -1;
    for (var i = 0; i < steps.length; i += 1) {
      if (steps[i].querySelector('[aria-current="step"]')) { current = i; break; }
    }
    // No current marker (a sub-step owns it): fall back to the last completed.
    if (current === -1) {
      for (var j = steps.length - 1; j >= 0; j -= 1) {
        if (steps[j].querySelector('svg')) { current = j; break; }
      }
    }
    if (current === -1) current = 0;

    var labelNode = steps[current].querySelector('span.ml-3, p.ml-3');
    var subStep = nav.querySelector('li.pl-6 [aria-current="step"]');
    var subLabel = subStep ? subStep.querySelector('span.ml-3, p.ml-3') : null;

    return {
      label: (subLabel || labelNode) ? (subLabel || labelNode).textContent.trim() : 'Step',
      index: current,
      total: steps.length
    };
  }

  function buildBar(progress) {
    var segments = '';
    for (var i = 0; i < progress.total; i += 1) {
      var filled = i <= progress.index;
      segments += '<span class="h-1 min-w-px flex-1 ' + (filled ? 'bg-blue-600' : 'bg-white/10') + '"></span>';
    }
    var bar = document.createElement('div');
    bar.setAttribute('data-ob-mobile-header', '');
    bar.className = 'sticky top-0 z-30 flex w-full shrink-0 flex-col gap-4 px-4 py-4 lg:hidden ' + GRADIENT;
    bar.innerHTML =
      '<div class="flex w-full items-center gap-4">' +
        '<div class="h-6 min-w-0 flex-1"></div>' +
        '<button type="button" data-ob-menu-open aria-expanded="false" ' +
          'class="inline-flex cursor-pointer items-center justify-center rounded-md bg-white/10 p-1.5 text-white transition-colors hover:bg-white/20">' +
          '<span class="sr-only">Open menu</span>' + ICON_MENU +
        '</button>' +
      '</div>' +
      '<div class="flex w-full flex-col gap-1">' +
        '<div class="flex w-full items-center gap-2 text-xs text-white">' +
          '<p class="min-w-0 flex-1 truncate font-semibold">' + progress.label + '</p>' +
          '<p class="shrink-0 font-normal">' + (progress.index + 1) + ' of ' + progress.total + '</p>' +
        '</div>' +
        '<div class="flex w-full items-start gap-px overflow-hidden rounded-full">' + segments + '</div>' +
      '</div>';
    return bar;
  }

  function buildSheet(nav, actions) {
    var sheet = document.createElement('div');
    sheet.setAttribute('data-ob-menu', '');
    sheet.className = 'fixed inset-0 z-40 hidden lg:hidden';
    sheet.innerHTML =
      '<div data-ob-menu-close class="absolute inset-0 bg-gray-900/60"></div>' +
      '<div class="absolute inset-y-0 left-0 flex w-[300px] max-w-[85%] flex-col gap-8 overflow-y-auto p-6 ' + GRADIENT + '">' +
        '<div class="flex justify-end">' +
          '<button type="button" data-ob-menu-close ' +
            'class="inline-flex cursor-pointer items-center justify-center rounded-md bg-white/10 p-1.5 text-white transition-colors hover:bg-white/20">' +
            '<span class="sr-only">Close menu</span>' + ICON_CLOSE +
          '</button>' +
        '</div>' +
      '</div>';

    var panel = sheet.lastElementChild;
    panel.appendChild(nav.cloneNode(true));
    if (actions) {
      var copy = actions.cloneNode(true);
      copy.classList.remove('mt-auto');
      panel.appendChild(copy);
    }
    return sheet;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var nav = document.querySelector(NAV_SELECTOR);
    if (!nav) return;
    var container = nav.closest('div.flex-row') || (document.body.firstElementChild);
    if (!container) return;

    var progress = readProgress(nav);
    if (!progress) return;

    var sidebar = nav.closest('div');
    var actions = sidebar ? sidebar.querySelector('.mt-auto') : null;

    var bar = buildBar(progress);
    container.insertBefore(bar, container.firstChild);

    var sheet = buildSheet(nav, actions);
    document.body.appendChild(sheet);

    var openBtn = bar.querySelector('[data-ob-menu-open]');
    function setOpen(open) {
      sheet.classList.toggle('hidden', !open);
      openBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.documentElement.style.overflow = open ? 'hidden' : '';
    }
    openBtn.addEventListener('click', function () { setOpen(true); });
    sheet.addEventListener('click', function (event) {
      if (event.target.closest('[data-ob-menu-close]')) setOpen(false);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') setOpen(false);
    });
  });
})();

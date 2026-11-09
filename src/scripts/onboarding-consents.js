/**
 * onboarding-consents.js
 * The consent list on the payment-method summaries ("I've read and consent to
 * the Terms of Use / Privacy Policy / E-Sign Consent") and its "Review and
 * agree" dialog: Review opens the text, Accept unlocks once it has been
 * scrolled to the end, ticks that consent and moves on to the next one.
 * Unticking a consent withdraws it.
 *
 *   OBConsents.mount(listEl, agreements, { stateKey, onChange(allAccepted), documentScroll })
 *
 * documentScroll (SMART Exchange): the grey box hugs the whole text and the
 * dialog body scrolls it like a page, with a white fade and a centred round
 * "scroll down" button until the end is reached. Off by default (SMART Disburse keeps the inner scroller).
 *
 * Acceptance is kept in the onboarding session under `stateKey`.
 */
window.OBConsents = (function () {
  'use strict';

  var ASSETS = '../../assets/onboarding/';
  function esc(v) { return window.OBModal.escapeHtml(v); }


  function mount(consentsEl, agreements, opts) {
    opts = opts || {};
    var state = window.SDOnboardingContext ? window.SDOnboardingContext.getState() : {};
    var accepted = Object.assign({}, state[opts.stateKey] || {});

  function renderConsents() {
    consentsEl.innerHTML = agreements.map(function (a, i) {
      var done = !!accepted[a.id];
      return '<li class="flex items-center gap-6 p-3.5">' +
        '<p class="min-w-0 flex-1 text-xs leading-4 font-medium text-gray-700 dark:text-gray-300">I’ve read and consent to the ' +
          '<button type="button" data-vcs-review="' + i + '" class="cursor-pointer rounded text-blue-600 dark:text-blue-400 hover:underline focus-visible:outline-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400">' + esc(a.name) + '</button>.</p>' +
        (done
          ? '<app-checkbox bare checked data-vcs-check="' + i + '" aria-label="Consent to the ' + esc(a.name) + '"></app-checkbox>'
          : '<button type="button" data-vcs-review="' + i + '" class="shrink-0 cursor-pointer rounded text-xs leading-4 font-semibold text-blue-600 dark:text-blue-400 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400">Review</button>') +
      '</li>';
    }).join('');
    if (opts.onChange) opts.onChange(agreements.every(function (a) { return accepted[a.id]; }));
  }

  function setAccepted(id, value) {
    accepted[id] = value;
    var patch = {};
    patch[opts.stateKey] = Object.assign({}, accepted);
    if (window.SDOnboardingContext) window.SDOnboardingContext.saveState(patch);
    renderConsents();
  }

  // ---- "Review and agree" dialog -------------------------------------

  function dots(index) {
    return agreements.map(function (a, i) {
      if (i === index) return '<span class="relative block size-2.5 shrink-0"><img src="' + ASSETS + 'step-current.svg" alt="" class="absolute -inset-[40%] block size-[180%] max-w-none"></span>';
      return '<img src="' + ASSETS + (accepted[a.id] ? 'step-complete.svg" alt="" width="10" height="10" class="block size-2.5 shrink-0">' : 'step-incomplete.svg" alt="" width="10" height="10" class="block size-2.5 shrink-0 dark:opacity-30">');
    }).join('');
  }

  function openReview(index) {
    var a = agreements[index];
    // Title bar and button bar stay put; the text box between them scrolls.
    var text =
      '<div class="flex flex-col gap-4 text-sm leading-5 text-gray-700 dark:text-gray-300">' +
        '<p class="text-base leading-6 font-semibold text-gray-900 dark:text-white">' + esc(a.title) + '</p>' +
        window.OBModal.agreementHtml(a.body) +
      '</div>';
    var SCROLL_ATTRS = 'data-vcs-scroll tabindex="0" aria-label="' + esc(a.title) + '"';
    var body = opts.documentScroll
      // The body scrolls; the grey box is the document, so its end shows up as you scroll.
      ? '<div class="relative flex min-h-0 flex-1 flex-col">' +
          '<div ' + SCROLL_ATTRS + ' class="min-h-0 flex-1 overflow-y-auto p-6 [scrollbar-color:rgba(17,24,39,0.5)_#f3f4f6] [scrollbar-width:thin] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400">' +
            '<div class="rounded border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4">' + text + '</div>' +
          '</div>' +
          // White fade over the last lines: there is more below. Goes with the button at the end.
          '<div data-vcs-fade aria-hidden="true" class="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-linear-to-b from-white/0 to-white dark:from-gray-900/0 dark:to-gray-900"></div>' +
          '<button type="button" data-vcs-more aria-label="Scroll down" class="absolute bottom-6 left-1/2 flex size-12 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 shadow-md dark:shadow-black/50 inset-ring-2 inset-ring-white dark:inset-ring-1 dark:inset-ring-white/15 transition hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white active:bg-gray-300 dark:active:bg-gray-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400">' +
            '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-6"><path fill-rule="evenodd" d="M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 1 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3Z" clip-rule="evenodd" /></svg>' +
          '</button>' +
        '</div>'
      : '<div class="flex min-h-0 flex-1 flex-col p-6">' +
          '<div ' + SCROLL_ATTRS + ' class="min-h-0 flex-1 overflow-y-auto rounded border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4 [scrollbar-color:rgba(17,24,39,0.5)_#f3f4f6] [scrollbar-width:thin] focus-visible:outline-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400">' +
            text +
          '</div>' +
        '</div>';
    var backdrop = window.OBModal.open(
      body,
      'vcs-review-title',
      {
        bare: true,
        header: '<div class="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 dark:border-white/10 px-6 py-4">' +
          '<h2 id="vcs-review-title" class="text-base leading-6 text-gray-900 dark:text-white">Review and agree</h2>' +
          '<button type="button" data-ob-modal-close class="inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400">' +
            '<span class="sr-only">Close</span><img src="' + ASSETS + 'icon-x-mark-mini.svg" alt="" width="20" height="20" class="size-5"></button>' +
        '</div>',
        footer: '<div class="flex items-center gap-2.5 border-t border-gray-200 dark:border-white/10 px-6 py-5">' +
          '<div class="flex flex-1 items-center gap-2.5" aria-label="' + (index + 1) + ' of ' + agreements.length + '">' + dots(index) + '</div>' +
          '<button type="button" data-ob-modal-close class="' + window.OBModal.SECONDARY_BUTTON_MD + '">Cancel</button>' +
          '<button type="button" data-vcs-accept disabled class="' + window.OBModal.PRIMARY_BUTTON_MD + '">Accept</button>' +
        '</div>',
        // Full height with a 16px gap on every side (same as the document viewer).
        panelClass: 'relative flex h-[calc(100dvh-2rem)] w-full max-w-[1048px] flex-col overflow-hidden rounded-lg bg-white dark:bg-gray-900 shadow-lg ring-1 ring-black/5 dark:ring-white/10'
      }
    );
    var frame = backdrop.querySelector('[data-ob-modal-frame]');
    frame.classList.remove('px-4', 'py-6');
    frame.classList.add('p-4');

    var scroller = backdrop.querySelector('[data-vcs-scroll]');
    var accept = backdrop.querySelector('[data-vcs-accept]');
    var more = backdrop.querySelector('[data-vcs-more]');
    var fade = backdrop.querySelector('[data-vcs-fade]');
    function checkEnd() {
      // Accept unlocks once the reader reaches the end (or nothing to scroll).
      if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 8) {
        accept.disabled = false;
        if (more) more.hidden = true;
        if (fade) fade.hidden = true;
      }
    }
    if (more) more.addEventListener('click', function () {
      // A page at a time, like the scroll cue on Google's terms.
      scroller.scrollBy({ top: scroller.clientHeight * 0.8, behavior: 'smooth' });
    });
    scroller.addEventListener('scroll', checkEnd);
    // The dialog shrinks to a short text (it has a max height, not a fixed one).
    requestAnimationFrame(checkEnd);

    accept.addEventListener('click', function () {
      setAccepted(a.id, true);
      // Continue with the next agreement still to accept, if any.
      for (var step = 1; step < agreements.length; step += 1) {
        var next = (index + step) % agreements.length;
        if (!accepted[agreements[next].id]) { openReview(next); return; }
      }
      window.OBModal.close();
    });
  }

  consentsEl.addEventListener('click', function (event) {
    var review = event.target.closest('[data-vcs-review]');
    if (review) openReview(Number(review.getAttribute('data-vcs-review')));
  });
  consentsEl.addEventListener('change', function (event) {
    var box = event.target.closest('[data-vcs-check]');
    // Unticking withdraws consent; it has to be reviewed again.
    if (box && !box.checked) setAccepted(agreements[Number(box.getAttribute('data-vcs-check'))].id, false);
  });

    renderConsents();
  }

  return { mount: mount };
})();

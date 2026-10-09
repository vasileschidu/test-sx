/**
 * onboarding-consents.js
 * The consent list on the payment-method summaries ("I've read and consent to
 * the Terms of Use / Privacy Policy / E-Sign Consent") and its "Review and
 * agree" dialog: Review opens the text, Accept unlocks once it has been
 * scrolled to the end, ticks that consent and moves on to the next one.
 * Unticking a consent withdraws it.
 *
 *   OBConsents.mount(listEl, agreements, { stateKey, onChange(allAccepted) })
 *
 * Acceptance is kept in the onboarding session under `stateKey`.
 */
window.OBConsents = (function () {
  'use strict';

  var ASSETS = '../../assets/onboarding/';
  function esc(v) { return window.OBModal.escapeHtml(v); }

  var CHECKBOX = '<span class="relative flex size-4 shrink-0">' +
      '<input type="checkbox" data-vcs-check class="peer size-4 cursor-pointer appearance-none rounded border border-gray-300 bg-white not-checked:hover:border-gray-400 checked:border-[#2563eb] checked:bg-[#2563eb] checked:hover:border-[#1d4ed8] checked:hover:bg-[#1d4ed8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb]" checked>' +
      '<img src="' + ASSETS + 'icon-checkbox-check.svg" alt="" width="12" height="12" class="pointer-events-none absolute top-1/2 left-1/2 hidden size-3 -translate-x-1/2 -translate-y-1/2 peer-checked:block">' +
    '</span>';

  function mount(consentsEl, agreements, opts) {
    opts = opts || {};
    var state = window.SDOnboardingContext ? window.SDOnboardingContext.getState() : {};
    var accepted = Object.assign({}, state[opts.stateKey] || {});

  function renderConsents() {
    consentsEl.innerHTML = agreements.map(function (a, i) {
      var done = !!accepted[a.id];
      return '<li class="flex items-center gap-6 p-3.5">' +
        '<p class="min-w-0 flex-1 text-xs leading-4 font-medium text-[#374151]">I’ve read and consent to the ' +
          '<button type="button" data-vcs-review="' + i + '" class="cursor-pointer rounded text-[#2563eb] hover:underline focus-visible:outline-2 focus-visible:outline-blue-600">' + esc(a.name) + '</button>.</p>' +
        (done
          ? CHECKBOX.replace('data-vcs-check', 'data-vcs-check="' + i + '" aria-label="Consent to the ' + esc(a.name) + '"')
          : '<button type="button" data-vcs-review="' + i + '" class="shrink-0 cursor-pointer rounded text-xs leading-4 font-semibold text-[#2563eb] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Review</button>') +
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

  var SMALL = 'inline-flex cursor-pointer items-center justify-center rounded-md px-2.5 py-1.5 text-sm leading-5 font-semibold shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';

  function dots(index) {
    return agreements.map(function (a, i) {
      if (i === index) return '<span class="relative block size-2.5 shrink-0"><img src="' + ASSETS + 'step-current.svg" alt="" class="absolute -inset-[40%] block size-[180%] max-w-none"></span>';
      return '<img src="' + ASSETS + (accepted[a.id] ? 'step-complete.svg' : 'step-incomplete.svg') + '" alt="" width="10" height="10" class="block size-2.5 shrink-0">';
    }).join('');
  }

  function openReview(index) {
    var a = agreements[index];
    var backdrop = window.OBModal.open(
      '<div class="flex shrink-0 items-center justify-between gap-2 border-b border-[#e5e7eb] px-6 py-4">' +
        '<h2 id="vcs-review-title" class="text-base leading-6 text-[#111827]">Review and agree</h2>' +
        '<button type="button" data-ob-modal-close class="inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-blue-600">' +
          '<span class="sr-only">Close</span><img src="' + ASSETS + 'icon-x-mark-mini.svg" alt="" width="20" height="20" class="size-5"></button>' +
      '</div>' +
      '<div class="flex min-h-0 flex-1 flex-col p-6">' +
        '<div data-vcs-scroll tabindex="0" aria-label="' + esc(a.title) + '" class="min-h-0 flex-1 overflow-y-auto rounded border border-[#e5e7eb] bg-[#f9fafb] p-4 [scrollbar-color:rgba(17,24,39,0.5)_#f3f4f6] [scrollbar-width:thin] focus-visible:outline-2 focus-visible:outline-blue-600">' +
          '<div class="flex flex-col gap-4 text-sm leading-5 text-[#374151]">' +
            '<p class="text-base leading-6 font-semibold text-[#111827]">' + esc(a.title) + '</p>' +
            window.OBModal.agreementHtml(a.body) +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="flex shrink-0 items-center gap-2.5 border-t border-[#e5e7eb] px-6 py-5">' +
        '<div class="flex flex-1 items-center gap-2.5" aria-label="' + (index + 1) + ' of ' + agreements.length + '">' + dots(index) + '</div>' +
        '<button type="button" data-ob-modal-close class="' + SMALL + ' border border-[#d1d5db] bg-white text-[#374151] hover:bg-gray-50">Cancel</button>' +
        '<button type="button" data-vcs-accept disabled class="' + SMALL + ' bg-[#2563eb] text-white hover:bg-[#3b82f6] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#2563eb]">Accept</button>' +
      '</div>',
      'vcs-review-title',
      { bare: true, panelClass: 'relative flex max-h-[min(752px,calc(100dvh-2rem))] w-full max-w-[1048px] flex-col overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black/5' }
    );

    var scroller = backdrop.querySelector('[data-vcs-scroll]');
    var accept = backdrop.querySelector('[data-vcs-accept]');
    function checkEnd() {
      // Accept unlocks once the reader reaches the end (or nothing to scroll).
      if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 8) {
        accept.disabled = false;
      }
    }
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

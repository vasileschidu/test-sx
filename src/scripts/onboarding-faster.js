/**
 * onboarding-faster.js
 * "Get your money faster" dialog (Figma node 20370:56952), opened from
 * "I want my money faster!" on the bank and check summaries: pick the
 * Virtual Card or a debit card, then Confirm switches to that flow.
 *
 *   OBFaster.open()      options: src/data/sd-faster.json
 */
window.OBFaster = (function () {
  'use strict';

  var DATA_PATH = '../../data/sd-faster.json';
  var ASSETS = '../../assets/onboarding/';
  function esc(v) { return window.OBModal.escapeHtml(v); }
  function saveState(patch) {
    if (window.SDOnboardingContext) window.SDOnboardingContext.saveState(patch);
  }

  function show(faster) {
    var M = window.OBModal;
    var options = faster.options;
    var OPTION = 'flex cursor-pointer items-center gap-2.5 rounded-lg border-2 border-transparent bg-gray-50 dark:bg-white/5 px-4 py-5 text-sm leading-5 font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 ' +
      'has-checked:border-blue-600 dark:has-checked:border-blue-400 has-checked:bg-blue-50 dark:has-checked:bg-blue-500/10 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-blue-600 dark:has-focus-visible:outline-blue-400';
    var backdrop = M.open(
      '<div class="flex flex-col px-4 pb-9 sm:px-14">' +
          '<fieldset class="flex flex-col">' +
            '<legend id="ob-faster-title" class="mb-6 w-full pt-6 text-center text-lg leading-6 font-medium text-gray-900 dark:text-white">' + esc(faster.title) + '</legend>' +
            '<div class="flex flex-col gap-3">' +
              options.map(function (o, i) {
                return '<label class="' + OPTION + '">' +
                  '<span class="relative flex size-4 shrink-0">' +
                    '<input type="radio" name="ob-faster" value="' + i + '" class="peer size-4 cursor-pointer appearance-none rounded-full border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-900 checked:border-transparent focus-visible:outline-none">' +
                    '<img src="' + ASSETS + 'radio-checked-lg.svg" alt="" width="16" height="16" class="pointer-events-none absolute inset-0 hidden size-4 peer-checked:block">' +
                  '</span>' + esc(o.label) +
                '</label>';
              }).join('') +
            '</div>' +
          '</fieldset>' +
      '</div>',
      'ob-faster-title',
      {
        bare: true,
        // The X row and the buttons stay put; the options scroll on a short screen.
        header: '<div class="flex shrink-0 px-4 pt-4 sm:px-14">' +
          '<button type="button" data-ob-modal-close class="flex size-12 cursor-pointer items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400">' +
            '<span class="sr-only">Close</span><img src="' + ASSETS + 'icon-x-dark.svg" alt="" width="24" height="24" class="size-6"></button>' +
        '</div>',
        footer: '<div class="flex flex-col gap-4 px-4 pb-9 sm:px-14">' +
          '<button type="button" data-ob-faster-confirm disabled class="' + M.PRIMARY_BUTTON + '">Confirm</button>' +
          '<button type="button" data-ob-modal-close class="flex h-14 w-full cursor-pointer items-center justify-center rounded-md border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-900 text-base leading-6 font-medium text-gray-700 dark:text-gray-300 shadow-xs hover:bg-gray-50 dark:hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400">Cancel</button>' +
        '</div>',
        panelClass: 'relative flex w-full max-w-[500px] flex-col rounded-lg bg-white dark:bg-gray-900 shadow-xl'
      }
    );
    var confirm = backdrop.querySelector('[data-ob-faster-confirm]');
    var radios = backdrop.querySelectorAll('input[name="ob-faster"]');
    Array.prototype.forEach.call(radios, function (r) {
      r.addEventListener('change', function () { confirm.disabled = false; });
    });
    confirm.addEventListener('click', function () {
      var picked = backdrop.querySelector('input[name="ob-faster"]:checked');
      if (!picked) return;
      var option = options[Number(picked.value)];
      M.close();
      saveState({ paymentMethod: option.id });
      window.OBGo(option.href);
    });
  }

  function open() {
    window.OBModal.loadJson(DATA_PATH, ['title', 'options']).then(function (faster) {
      if (faster) show(faster);
    });
  }

  return { open: open };
})();

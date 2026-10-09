/**
 * onboarding-sidebar.js
 * Renders the desktop left menu of the SMART Disburse onboarding flow
 * (Figma "SD Menu", node 19427:30373) into <div data-ob-sidebar></div>.
 *
 * The sidebar used to be hand-written into every onboarding page; it now lives
 * here once. The step list itself is filled in by onboarding-stepper.js, so
 * load this script BEFORE onboarding-stepper.js and onboarding-mobile-header.js:
 * both read the markup this file writes.
 *
 * The mobile header clones the progress nav and the first `.mt-auto` element
 * (the Contact / Decline card) into its sheet, so keep the nav a direct child
 * of the sidebar and keep `mt-auto` on that card.
 *
 * It also renders the light page footer (Figma "SD Footer/Mobile(2.1)", node
 * 19447:65057) into every <div data-ob-footer></div>. The slot keeps its own
 * classes, e.g. `lg:hidden` on pages whose sidebar already carries the footer.
 */
(function () {
  'use strict';

  var ASSETS = '../../assets/onboarding/';

  var TERMS = ['Terms of Use', 'Privacy Policy', 'E-Sign Consent'];

  var LINK = 'rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

  // Mobile hamburger (Figma node 19652:43095): Contact / Decline in a dropdown
  // card over the blurred page. Read by onboarding-mobile-header.js on
  // DOMContentLoaded, so it has to be set while this script loads.
  if (!window.OB_MOBILE_MENU) {
    window.OB_MOBILE_MENU = [
      { label: 'Contact Us', icon: '<img src="' + ASSETS + 'icon-envelope-mini.svg" alt="" width="20" height="20" class="block size-5">',
        onSelect: openContact },
      { label: 'Decline Payment', icon: '<img src="' + ASSETS + 'icon-x-circle-mini.svg" alt="" width="20" height="20" class="block size-5">',
        onSelect: openDecline }
    ];
  }

  /**
   * Dialogs live in onboarding-modal.js (Contact Us) and onboarding-decline.js;
   * any [data-ob-contact] / [data-ob-decline] element opens them.
   */
  function openContact() {
    if (window.OBContact) window.OBContact.open();
  }

  function openDecline() {
    if (window.OBDecline) window.OBDecline.open();
  }

  document.addEventListener('click', function (event) {
    if (event.target.closest('[data-ob-contact]')) openContact();
    else if (event.target.closest('[data-ob-decline]')) openDecline();
  });

  function icon(file, extra) {
    return '<img src="' + ASSETS + file + '" alt="" width="16" height="16" class="size-4 shrink-0' + (extra || '') + '">';
  }

  /** Figma "Flags" component: 4:3 flag with gloss overlay and shadow (no border). */
  function flag(file, size) {
    return '<span class="relative block ' + (size || 'size-4') + ' shrink-0" aria-hidden="true">' +
      '<span class="absolute inset-x-0 inset-y-[12.5%] overflow-clip rounded-[1.5px] ' +
        'drop-shadow-[0px_1px_1.5px_rgba(0,0,0,0.1)]">' +
        '<img src="' + ASSETS + file + '" alt="" width="16" height="12" class="absolute inset-0 block size-full">' +
        '<span class="absolute inset-0 bg-gradient-to-b from-white/70 to-black/30 mix-blend-overlay"></span>' +
      '</span>' +
    '</span>';
  }

  function action(file, label, hook) {
    return '<button type="button" ' + (hook || '') + ' class="flex w-full cursor-pointer items-center gap-3 text-left text-white transition-colors hover:text-white/70 ' + LINK + '">' +
      icon(file) +
      '<span class="flex-1 text-xs font-medium">' + label + '</span>' +
    '</button>';
  }

  function terms() {
    return TERMS.map(function (label) {
      return '<a href="#" class="text-[11px] leading-4 font-medium text-white hover:underline ' + LINK + '">' + label + '</a>';
    }).join('<span aria-hidden="true" class="text-xs leading-4 font-medium text-white">&bull;</span>');
  }

  /** Language button looks: on the dark sidebar, and on the light page footer. */
  var LANG_TOGGLE = {
    dark: {
      button: 'bg-white/10 font-medium text-white hover:bg-white/15 ' + LINK,
      chevron: 'icon-chevron-down.svg'
    },
    light: {
      button: 'bg-gray-100 font-semibold text-gray-600 hover:bg-gray-200 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600',
      chevron: 'icon-chevron-down-gray.svg'
    }
  };

  var langCount = 0;

  /**
   * Language button + dropdown (Figma node 21874:66338), trimmed to the one
   * locale this flow supports: United States / English, shown as selected.
   * The menu opens upwards because the button sits at the foot of the page.
   */
  function language(tone) {
    var look = LANG_TOGGLE[tone];
    var id = 'ob-lang-menu-' + (langCount += 1);
    return '<div data-ob-lang class="relative">' +
      '<button type="button" data-ob-lang-toggle aria-haspopup="true" aria-expanded="false" aria-controls="' + id + '" ' +
        'class="flex cursor-pointer items-center justify-center gap-1 rounded px-1.5 py-0.5 text-xs leading-4 ' + look.button + '">' +
        flag('flag-us.svg') + 'English' +
        '<img src="' + ASSETS + look.chevron + '" alt="" width="16" height="16" data-ob-lang-chevron class="size-4 shrink-0 transition-transform duration-150">' +
      '</button>' +
      '<div id="' + id + '" data-ob-lang-menu class="absolute bottom-full left-1/2 z-10 mb-2 hidden w-max -translate-x-1/2 flex-col gap-1 rounded-md bg-white p-[5px] shadow-lg ring-1 ring-black/5">' +
        '<div class="flex items-start gap-3 rounded-md bg-gray-100 px-4 py-3">' +
          flag('flag-us.svg', 'size-5') +
          '<div class="flex flex-col items-start gap-1">' +
            '<p class="text-sm leading-5 font-medium text-gray-900">United States</p>' +
            '<button type="button" data-ob-lang-option aria-pressed="true" ' +
              'class="flex cursor-pointer items-center gap-1 rounded-md bg-gray-200 px-2.5 py-1.5 text-sm leading-5 font-semibold text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">' +
              'English<img src="' + ASSETS + 'icon-check.svg" alt="" width="18" height="18" class="size-[18px] shrink-0">' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function bindLanguage(root) {
    var wrap = root.querySelector('[data-ob-lang]');
    if (!wrap) return;
    var toggle = wrap.querySelector('[data-ob-lang-toggle]');
    var menu = wrap.querySelector('[data-ob-lang-menu]');
    var chevron = wrap.querySelector('[data-ob-lang-chevron]');

    function setOpen(open) {
      menu.classList.toggle('hidden', !open);
      menu.classList.toggle('flex', open);
      chevron.classList.toggle('rotate-180', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    toggle.addEventListener('click', function () {
      setOpen(menu.classList.contains('hidden'));
    });
    wrap.querySelector('[data-ob-lang-option]').addEventListener('click', function () {
      setOpen(false);
      toggle.focus();
    });
    document.addEventListener('click', function (event) {
      if (!wrap.contains(event.target)) setOpen(false);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !menu.classList.contains('hidden')) {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  function markup() {
    return (
      // Top icon: shown as in the design, no behaviour yet.
      '<div class="flex shrink-0 items-center rounded-lg bg-gray-900/25 p-2.5">' +
        '<span class="relative block size-[26px] rotate-180" aria-hidden="true">' +
          '<img src="' + ASSETS + 'menu-logo.svg" alt="" width="12.2504" height="22.0001" class="absolute inset-[7.69%_25.96%_7.69%_26.92%] block">' +
        '</span>' +
      '</div>' +

      '<nav aria-label="Progress" data-ob-stepper class="w-full flex-1"></nav>' +

      '<div class="flex w-[212px] shrink-0 flex-col gap-6">' +
        '<div class="mt-auto flex flex-col items-start justify-center gap-3 self-stretch rounded-lg border border-white/10 p-3">' +
          action('icon-envelope.svg', 'Contact Us', 'data-ob-contact') +
          '<div class="h-px w-full self-stretch bg-white/10"></div>' +
          action('icon-x-circle.svg', 'Decline Payment', 'data-ob-decline') +
        '</div>' +

        '<div class="flex flex-col items-center gap-4">' +
          language('dark') +
          '<div class="flex w-full flex-wrap items-center justify-center gap-2 opacity-80">' + terms() + '</div>' +
        '</div>' +

        '<div class="flex h-5 items-center justify-center">' +
          '<span class="relative block h-[18px] w-[154.123px]" role="img" aria-label="Powered by Transcard">' +
            '<img src="' + ASSETS + 'powered-by.svg" alt="" width="86.2589" height="18" class="absolute left-0 top-0 block">' +
            '<img src="' + ASSETS + 'transcard-wordmark.svg" alt="" width="63.1235" height="11.8737" class="absolute inset-[11.46%_0_22.58%_59.04%] block">' +
          '</span>' +
        '</div>' +
      '</div>'
    );
  }

  function footerMarkup() {
    var links = TERMS.map(function (label) {
      return '<a href="#" class="rounded px-1.5 py-0.5 text-xs leading-4 font-semibold text-gray-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">' + label + '</a>';
    }).join('<span aria-hidden="true" class="text-xs leading-4 font-medium text-gray-500">&bull;</span>');

    return '<div class="flex flex-col items-center justify-end gap-6 px-4 py-6">' +
      '<div class="flex w-full flex-col items-center gap-4">' +
        language('light') +
        '<div class="flex flex-wrap items-center justify-center gap-2">' + links + '</div>' +
      '</div>' +
      '<div class="flex h-5 items-center justify-center">' +
        '<span class="relative block h-[18px] w-[154.123px]" role="img" aria-label="Powered by Transcard">' +
          '<img src="' + ASSETS + 'powered-by-dark.svg" alt="" width="86.2589" height="18" class="absolute left-0 top-0 block">' +
          '<img src="' + ASSETS + 'transcard-wordmark-dark.svg" alt="" width="63.1235" height="11.8737" class="absolute inset-[11.46%_0_22.58%_59.04%] block">' +
        '</span>' +
      '</div>' +
    '</div>';
  }

  function init() {
    var slots = document.querySelectorAll('[data-ob-sidebar]');
    for (var i = 0; i < slots.length; i += 1) {
      slots[i].className = 'hidden lg:flex w-[325px] shrink-0 self-stretch flex-col items-end gap-8 ' +
        'bg-gradient-to-b from-[#1E326F] to-[#090C38] px-14 pt-14 pb-8';
      slots[i].innerHTML = markup();
      // A page can pick the stepper state on the slot, e.g. data-ob-step="none".
      var step = slots[i].getAttribute('data-ob-step');
      if (step) slots[i].querySelector('[data-ob-stepper]').setAttribute('data-ob-step', step);
      bindLanguage(slots[i]);
    }

    // Standalone language button, e.g. on the declined page's card.
    var langs = document.querySelectorAll('[data-ob-language]');
    for (var k = 0; k < langs.length; k += 1) {
      langs[k].innerHTML = language('light');
      bindLanguage(langs[k]);
    }

    var footers = document.querySelectorAll('[data-ob-footer]');
    for (var j = 0; j < footers.length; j += 1) {
      footers[j].innerHTML = footerMarkup();
      bindLanguage(footers[j]);
    }
  }

  // Registered before the stepper's and mobile header's DOMContentLoaded
  // listeners, so both find the nav already in place.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

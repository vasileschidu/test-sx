/**
 * onboarding-vc-how.js
 * "How this works" sample Virtual Card dialog, shared by the account form
 * ("How this works") and the Card Created receipt ("How to use this card").
 *
 *   OBVirtualCardHow.open(data)   // data = src/data/sd-virtual-card.json
 *
 * Terms & Conditions in the footer opens data.agreements[0].
 */
window.OBVirtualCardHow = (function () {
  'use strict';

  var ASSETS = '../../assets/onboarding/';
  function esc(v) { return window.OBModal.escapeHtml(v); }

  function sampleCard() {
    var pill = '<span class="block h-full min-w-0 flex-1 rounded-full bg-white/20"></span>';
    var dash = '<span class="block h-0.5 w-[7px] shrink-0 bg-white"></span>';
    return '<div aria-label="Sample Virtual Card" role="img" class="flex h-[178px] w-[280px] items-center justify-center rounded-lg bg-gradient-to-b from-[#1e326f] to-[#090c38] drop-shadow-[-3px_20px_12.5px_rgba(0,0,0,0.1)]">' +
      '<div class="relative h-[145.7px] w-[248.26px]">' +
        '<img src="' + ASSETS + 'vc-cvc.svg" alt="" width="53.4753" height="13.0233" class="absolute top-0 left-[194.78px]">' +
        '<div class="absolute top-[24.72px] left-[-0.28px] flex items-center gap-[5px]"><span class="text-xl leading-8 font-semibold text-white">$</span><span class="block h-[18px] w-[101px] rounded-full bg-white/20"></span></div>' +
        '<span class="absolute inset-[31.57%_0.42%_62.17%_85.66%]"><img src="' + ASSETS + 'vc-debit.svg" alt="" class="block size-full max-w-none"></span>' +
        '<div class="absolute top-[63.98px] left-0 flex h-[17.09px] w-[205.93px] items-center gap-1">' + pill + dash + pill + dash + pill + dash + pill + '</div>' +
        '<img src="' + ASSETS + 'vc-valid-thru.svg" alt="" width="64.6315" height="14.7791" class="absolute top-[93.98px] left-[75.72px]">' +
        '<img src="' + ASSETS + 'vc-card-holder.svg" alt="" width="74.5705" height="8.33507" class="absolute top-[132.13px] left-[0.47px]">' +
        '<img src="' + ASSETS + 'vc-mastercard.svg" alt="" width="42.0662" height="26" class="absolute top-[119.85px] left-[206.13px]">' +
      '</div>' +
    '</div>';
  }

  function bullet(strong, rest) {
    return '<li><span class="font-semibold text-[#111827]">' + strong + '</span> ' + rest + '</li>';
  }

  function open(data) {
    var M = window.OBModal;
    var backdrop = M.open(
      '<div class="flex shrink-0 items-center border-b border-[#d1d5db] px-3 py-1.5">' +
        '<button type="button" data-ob-modal-close class="flex size-10 cursor-pointer items-center justify-center rounded-full hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-blue-600">' +
          '<span class="sr-only">Close</span><img src="' + ASSETS + 'icon-x-lined-gray.svg" alt="" width="24" height="24" class="size-6">' +
        '</button>' +
      '</div>' +
      '<div class="flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto px-6 pt-6 pb-4">' +
        '<div class="flex flex-col items-center gap-2 text-center">' +
          '<p class="text-sm leading-5 text-[#6b7280]">Here’s a Sample</p>' +
          '<h2 id="vc-how-title" class="text-3xl leading-9 text-[#111827]">Virtual Card</h2>' +
        '</div>' +
        sampleCard() +
        '<button type="button" data-vc-trademark aria-expanded="false" class="flex cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-xs leading-4 font-medium text-[#6b7280] hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-blue-600">' +
          '<img src="' + ASSETS + 'icon-info-mini.svg" alt="" width="14" height="14" class="size-3.5">Trademark Disclaimer' +
        '</button>' +
        '<p data-vc-trademark-text class="hidden text-center text-xs leading-4 text-[#6b7280]">Mastercard and the circles design are registered trademarks of Mastercard International Incorporated. The card shown is a sample; your card details will differ.</p>' +
        '<div class="flex w-full flex-col gap-2 text-left">' +
          '<div class="flex flex-col items-center gap-2 pb-3">' +
            '<p class="text-base leading-6 text-[#111827]">Digital Wallet:</p>' +
            '<p class="flex items-center gap-1.5 rounded-md border border-[#e5e7eb] bg-[#f9fafb] px-3 py-1.5 text-sm leading-5 font-medium text-[#6b7280]">' +
              '<img src="' + ASSETS + 'icon-face-frown.svg" alt="" width="24" height="24" class="size-6">Currently not supported</p>' +
          '</div>' +
          '<p class="text-base leading-6 font-semibold text-[#111827]">How you can use your Virtual Card?</p>' +
          '<p class="text-xs leading-4 text-[#6b7280]">You may use your Virtual Card for payments where card number, expiry and CVC is required, such as:</p>' +
          '<ul class="list-disc space-y-2 pl-5 text-xs leading-[18px] text-[#6b7280]">' +
            bullet('online shopping', 'to make online purchases on various retail and non-retail platforms as many e-commerce websites and online service providers accept them;') +
            bullet('food ordering and delivery platforms', 'to make online purchase from well-known food and grocery ordering and delivery platforms;') +
            bullet('app store purchases', 'to make purchases on app stores for mobile applications, digital content and various services;') +
            bullet('travel booking', 'to book transfers, flights, hotels, and other travel-related services online.') +
          '</ul>' +
          '<p class="text-xs leading-[18px] text-[#6b7280]">Your funds are immediately available for your online money management and can be used in mediums where non-tangible payments are accepted.</p>' +
          '<p class="text-xs leading-[18px] text-[#6b7280]"><span class="font-semibold text-[#111827]">Please note:</span> you will not be able to withdraw cash from your Virtual Card or transfer money to bank accounts.</p>' +
        '</div>' +
      '</div>' +
      '<div class="flex shrink-0 justify-center border-t border-[#d1d5db] p-4">' +
        '<button type="button" data-vc-terms class="cursor-pointer rounded px-1.5 py-0.5 text-xs leading-4 font-semibold text-[#2563eb] hover:underline focus-visible:outline-2 focus-visible:outline-blue-600">Terms &amp; Conditions</button>' +
      '</div>',
      'vc-how-title',
      { bare: true, panelClass: 'relative flex max-h-[calc(100dvh-2rem)] w-full max-w-[512px] flex-col overflow-hidden rounded-lg bg-white shadow-xl' }
    );

    var tmBtn = backdrop.querySelector('[data-vc-trademark]');
    tmBtn.addEventListener('click', function () {
      var open = tmBtn.getAttribute('aria-expanded') !== 'true';
      tmBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      backdrop.querySelector('[data-vc-trademark-text]').classList.toggle('hidden', !open);
    });
    backdrop.querySelector('[data-vc-terms]').addEventListener('click', function () {
      var terms = data.agreements[0];
      M.open(
        '<div class="flex flex-col gap-4 px-6 pb-6">' +
          '<h2 id="vc-terms-title" class="text-lg leading-6 font-medium text-[#111827]">' + esc(terms.title) + '</h2>' +
          '<div class="max-h-[50vh] space-y-3 overflow-y-auto text-sm leading-5 text-[#374151]">' +
            terms.body.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +
          '</div>' +
          '<button type="button" data-ob-modal-close class="' + M.BUTTON + ' bg-[#2563eb] text-white hover:bg-[#3b82f6] focus-visible:outline-[#2563eb]">OK</button>' +
        '</div>',
        'vc-terms-title'
      );
    });
  }

  return { open: open };
})();

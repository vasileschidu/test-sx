/**
 * onboarding-debit.js
 * Shared pieces of the "Send to my Debit Card" flow (Figma "Debit Card",
 * node 21923:104799), used by debit-card.js, virtual-card-summary.js and
 * card-created.js:
 *
 *   OBDebit.load()            src/data/sd-debit.json
 *   OBDebit.brand(number)     "Mastercard" | "Visa" | ""
 *   OBDebit.badge(brand, lg)  the dark card-brand chip (small in the field,
 *                             large on the summary and receipt)
 *   OBDebit.cardLines(card)   ["Mastercard ending in 4242", "Expires 12/24", name]
 *   OBDebit.luhn(number)      checksum used to validate card numbers
 */
window.OBDebit = (function () {
  'use strict';

  var ASSETS = '../../assets/onboarding/';
  var DATA_PATH = '../../data/sd-debit.json';

  function load() {
    return window.OBModal.loadJson(DATA_PATH, ['fee', 'messages', 'declined', 'trademark']);
  }

  function digits(v) { return String(v || '').replace(/\D/g, ''); }

  function brand(number) {
    var d = digits(number);
    if (/^4/.test(d)) return 'Visa';
    if (/^(5[1-5]|2[2-7])/.test(d)) return 'Mastercard';
    return '';
  }

  function luhn(number) {
    var d = digits(number);
    var sum = 0;
    for (var i = 0; i < d.length; i += 1) {
      var n = Number(d.charAt(d.length - 1 - i));
      if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; }
      sum += n;
    }
    return d.length > 0 && sum % 10 === 0;
  }

  function badge(name, large) {
    if (!name) return '';
    var box = large ? 'rounded-md px-2 py-1.5' : 'rounded-[3.5px] px-[4.7px] py-[3.5px]';
    var inner = name === 'Mastercard'
      ? '<img src="' + ASSETS + 'cc-mastercard.svg" alt="" width="52.0005" height="31.7201" class="block ' + (large ? 'h-5 w-[33px]' : 'h-[11.8px] w-[19.5px]') + '">'
      : '<span class="block ' + (large ? 'h-5 px-0.5 text-sm leading-5' : 'h-[11.8px] text-[10px] leading-[11.8px]') + ' font-extrabold tracking-wide text-white italic">VISA</span>';
    return '<span role="img" aria-label="' + name + '" class="inline-flex shrink-0 items-center bg-[#111827] ' + box + '">' + inner + '</span>';
  }

  function cardLines(card) {
    var label = (card.brand || 'Card') + ' ending in ' + digits(card.number).slice(-4);
    return [label, 'Expires ' + card.month + '/' + card.year, card.name];
  }

  return { load: load, brand: brand, luhn: luhn, badge: badge, cardLines: cardLines, digits: digits };
})();

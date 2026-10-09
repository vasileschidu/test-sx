/**
 * onboarding-bank.js
 * Shared pieces of the "Send to my Bank Account" flow (Figma "4.2. ACH (RTP
 * and Direct Deposit)", node 19555:31324), used by bank-details.js and
 * bank-summary.js:
 *
 *   OBBank.load()              src/data/sd-bank.json + sd-virtual-card.json
 *                              (allowed characters, state codes, agreements)
 *   OBBank.check()             the "Illustration/Check" sample check
 *   OBBank.openHelp(data)      "You will find routing and account number:"
 *   OBBank.notice(kind, …)     blue info / red alert / final-attempt boxes
 *   OBBank.payeeName(state)    the name the bank account must match
 *   OBBank.verify(data, state) prototype check run when depositing
 *
 * Prototype verification rules: the account holder name must match the payee
 * (else "Doesn't match your bank's records"); the account number in
 * `unableDemoAccountNumber` can't be verified ("Unable to verify bank
 * account"). After `maxAttempts` failures the payment is revoked.
 */
window.OBBank = (function () {
  'use strict';

  var ASSETS = '../../assets/onboarding/';
  var DATA_PATH = '../../data/sd-bank.json';
  var VC_DATA_PATH = '../../data/sd-virtual-card.json';

  function esc(v) { return window.OBModal.escapeHtml(v); }

  function load() {
    var M = window.OBModal;
    return Promise.all([
      M.loadJson(DATA_PATH, ['routingBanks', 'defaultBank', 'hints', 'messages', 'info', 'unable', 'finalAttempt', 'help', 'maxAttempts']),
      M.loadJson(VC_DATA_PATH, ['allowedPattern', 'allowedMessage', 'stateCodes', 'agreements'])
    ]).then(function (all) {
      if (!all[0] || !all[1]) return null;
      return Object.assign({}, all[1], all[0]);
    });
  }

  // ---- Sample check ----------------------------------------------------------

  var LINE = '<span class="block h-px bg-[#d1d5db]"></span>';
  var DIGITS = 'text-xs leading-4 font-medium tracking-[0.6px] text-[#374151]';

  /** MICR symbols: bar + two dots (or mirrored). */
  function symbol(mirrored) {
    var bar = '<span class="block h-1.5 w-[3px] rounded-[1px] bg-[#d1d5db]"></span>';
    var dots = '<span class="flex flex-col gap-0.5"><span class="block size-1 rounded-[1px] bg-[#d1d5db]"></span><span class="block size-1 rounded-[1px] bg-[#d1d5db]"></span></span>';
    return '<span aria-hidden="true" class="flex h-4 items-center gap-0.5">' + (mirrored ? dots + bar : bar + dots) + '</span>';
  }

  function bracket(file, width, place, label) {
    return '<span aria-hidden="true" class="absolute top-[132px] flex flex-col items-center ' + place + '">' +
      '<span class="relative block h-5 ' + (width === 72 ? 'w-[72px]' : 'w-[109px]') + '"><img src="' + ASSETS + file + '" alt="" width="' + (width + 2) + '" height="22" class="absolute -top-px -left-px block max-w-none"></span>' +
      '<span class="flex h-1.5 w-0 items-center justify-center"><img src="' + ASSETS + 'check-bracket-stem.svg" alt="" width="6" height="2" class="block max-w-none rotate-90"></span>' +
      '<span class="rounded bg-[#2563eb] px-2 py-1 text-xs leading-4 font-medium whitespace-nowrap text-white">' + label + '</span>' +
    '</span>';
  }

  function check() {
    return '<div role="img" aria-label="Sample check: the 9-digit routing number is at the bottom left, the 3-17 digit account number just to its right" class="relative h-[182px] w-[343px] max-w-full shrink-0">' +
      '<div class="flex w-full flex-col gap-9 rounded-lg border border-[#d1d5db] bg-[#f9fafb] p-4 shadow-xs">' +
        '<div class="flex w-full flex-col gap-6">' +
          '<div class="flex w-full items-end gap-4"><span class="block h-px flex-1 bg-[#d1d5db]"></span>' +
            '<span class="flex items-start gap-[7px]"><span class="text-xs leading-4 font-medium tracking-[0.6px] text-[#d1d5db]">$</span><span class="block h-6 w-[73px] rounded-[3px] border border-[#d1d5db]"></span></span></div>' +
          LINE +
        '</div>' +
        '<div class="flex w-full flex-col gap-3.5">' +
          '<div class="flex w-full gap-6"><span class="block h-px flex-1 bg-[#d1d5db]"></span><span class="block h-px flex-1 bg-[#d1d5db]"></span></div>' +
          '<div class="flex items-start gap-4">' +
            '<span class="flex items-start gap-1">' + symbol(false) + '<span class="' + DIGITS + '">000000000</span></span>' +
            symbol(false) +
            '<span class="flex items-start gap-1"><span class="' + DIGITS + '">0000000000000</span>' + symbol(true) + '</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      bracket('check-bracket-routing.svg', 72, 'left-[9px]', '9-Digit Routing #') +
      bracket('check-bracket-account.svg', 109, 'left-[132.5px]', '3-17 Digit Account #') +
    '</div>';
  }

  // ---- Help dialog -------------------------------------------------------------

  /** Help text allows <b>…</b> only. */
  function richText(text) {
    return esc(text).replace(/&lt;b&gt;/g, '<span class="font-semibold">').replace(/&lt;\/b&gt;/g, '</span>');
  }

  function openHelp(data) {
    window.OBModal.open(
      '<div class="flex flex-col gap-6 px-4 pt-4 pb-6 sm:px-6">' +
        check() +
        '<div class="flex w-full flex-col gap-2 rounded-md bg-[#f9fafb] p-4 text-sm leading-5 text-[#374151]">' +
          '<h2 id="bank-help-title" class="font-semibold">' + esc(data.help.title) + '</h2>' +
          '<ul class="list-disc pl-5">' + data.help.items.map(function (item) { return '<li>' + richText(item) + '</li>'; }).join('') + '</ul>' +
        '</div>' +
      '</div>',
      'bank-help-title'
    );
  }

  // ---- Notices -----------------------------------------------------------------

  /** kind: "info" (blue), "alert" (red, circle) or "final" (red, triangle). */
  function notice(kind, title, text) {
    var red = kind !== 'info';
    var icon = kind === 'info' ? 'icon-info-circle-blue.svg' : (kind === 'final' ? 'icon-exclamation-triangle-red.svg' : 'icon-exclamation-circle-red.svg');
    return '<div role="' + (red ? 'alert' : 'note') + '" class="flex w-full items-start gap-3 rounded-md p-4 ' + (red ? 'bg-[#fef2f2]' : 'bg-[#eff6ff]') + '">' +
      '<img src="' + ASSETS + icon + '" alt="" width="20" height="20" class="size-5 shrink-0">' +
      '<div class="flex min-w-0 flex-1 flex-col gap-2 text-sm leading-5">' +
        (title ? '<p class="font-medium text-[#991b1b]">' + esc(title) + '</p>' : '') +
        '<p class="' + (red ? 'text-[#b91c1c]' : 'text-[#1e40af]') + '">' + esc(text) + '</p>' +
      '</div>' +
    '</div>';
  }

  // ---- Verification --------------------------------------------------------------

  function payeeName(state) {
    var ctx = (state && state.payableContext) || {};
    var info = ctx.accountInformation || {};
    return [info.firstName, info.lastName].filter(Boolean).join(' ') ||
      (ctx.contact && ctx.contact.name) || ctx.payeeName || '';
  }

  function normal(name) { return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase(); }

  /** → "ok" | "no-match" | "unable" */
  function verify(data, state) {
    var bank = state.bankAccount || {};
    if (bank.account === data.unableDemoAccountNumber) return 'unable';
    var payee = payeeName(state);
    if (payee && normal(bank.holder) !== normal(payee)) return 'no-match';
    return 'ok';
  }

  function money(value, currency) {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(Number(value || 0));
    } catch (error) {
      return '$' + Number(value || 0).toFixed(2);
    }
  }

  return { load: load, check: check, openHelp: openHelp, notice: notice, payeeName: payeeName, verify: verify, money: money };
})();

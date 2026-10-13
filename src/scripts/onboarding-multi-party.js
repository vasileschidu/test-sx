/**
 * onboarding-multi-party.js
 * The screens only US Multi-Party has (Figma "⌛️ SD (Versioning)", page
 * "Multi-Party 1.07"). State and routing live in onboarding-flow.js (OBFlow);
 * dialogs use the shared OBModal shell.
 *
 *   allocation.html         "MPP - 5. Current Payment Allocation" (14220:115456)
 *                           + Dispute (primary party only, 6.8) + How it works (6.7)
 *                           + "New Allocation" when another party changes it (6.6.2)
 *   change-allocation.html  "MPP - 6. Change allocation" (14220:119547), with the
 *                           unallocated / over-allocated / required states (6.2–6.5)
 *   allocation-log.html     "MPP - 6.6. Allocations log" (14220:119806)
 *   payment-status.html     "Status Screen - Some Waiting Parties" (14220:120599)
 *                           and "$0 - Status Screen" (14220:118853)
 *   dispute.html            "MPP - 6.9. Dispute Form" / "6.10. After Disputing"
 *   payment-closed.html     expired / revoked (with and without a fallback
 *                           check) and disputed, in the Tokens style (20024:45679)
 *
 * The page is picked by data-mp-page on <body>.
 */
(function () {
  'use strict';

  var ASSETS = '../../assets/onboarding/mp/';
  var F = window.OBFlow;

  function esc(value) {
    return window.OBModal ? window.OBModal.escapeHtml(value) : String(value == null ? '' : value);
  }

  function money(value) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
  }

  /** "Mon, Oct 12 2026 04:48 PM (ET)" */
  function stamp(iso) {
    var d = new Date(iso);
    var parts = {};
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', weekday: 'short', month: 'short', day: '2-digit',
      year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
    }).formatToParts(d).forEach(function (p) { parts[p.type] = p.value; });
    return parts.weekday + ', ' + parts.month + ' ' + parts.day + ' ' + parts.year + ' ' +
      parts.hour + ':' + parts.minute + ' ' + parts.dayPeriod + ' (ET)';
  }

  /** "Expires in 3 day(s) and 4 h" — the days countdown on Payment Status. */
  function countdown(date) {
    var mins = Math.max(0, Math.floor((date - Date.now()) / 60000));
    var days = Math.floor(mins / 1440);
    var hours = Math.floor((mins % 1440) / 60);
    return 'Expires in ' + days + ' day(s) and ' + hours + ' h';
  }

  // ---- Pieces -------------------------------------------------------------------

  function statusPill(amount, accepted) {
    return accepted
      ? '<span class="flex shrink-0 items-center gap-1 rounded-[19px] bg-[#ecfdf5] py-1.5 pr-[11px] pl-[9px]">' +
          '<img src="' + ASSETS + 'icon-check-circle-green.svg" alt="" width="20" height="20" class="size-5">' +
          '<span class="text-sm leading-5 font-medium whitespace-nowrap text-[#047857]">' + money(amount) + '</span>' +
          '<span class="sr-only">accepted</span></span>'
      : '<span class="flex shrink-0 items-center gap-1 rounded-[19px] bg-[#f9fafb] py-1.5 pr-[11px] pl-[9px]">' +
          '<img src="' + ASSETS + 'icon-clock.svg" alt="" width="20" height="20" class="size-5">' +
          '<span class="text-sm leading-5 font-medium whitespace-nowrap text-[#374151]">' + money(amount) + '</span>' +
          '<span class="sr-only">waiting</span></span>';
  }

  function subline(p) {
    if (p.you) return p.primary ? 'You (Primary Party)' : 'You';
    return p.primary ? 'Primary Party' : '';
  }

  function personRow(p, amount, accepted, comment) {
    var sub = subline(p);
    return '<li class="flex flex-col">' +
      '<div class="flex items-center justify-between gap-3">' +
        '<div class="flex min-w-0 items-center gap-2.5">' +
          '<img src="' + ASSETS + 'avatar.svg" alt="" width="32" height="32" class="size-8 shrink-0">' +
          '<div class="flex min-w-0 flex-col text-sm leading-5 font-medium">' +
            '<span class="truncate text-[#111827]">' + esc(p.name) + '</span>' +
            (sub ? '<span class="text-[#6b7280]">' + sub + '</span>' : '') +
          '</div>' +
        '</div>' +
        statusPill(amount, accepted) +
      '</div>' +
      (comment
        ? '<div aria-hidden="true" class="flex h-5 w-8 items-center justify-center py-1"><span class="h-full w-px bg-[#d1d5db]"></span></div>' +
          '<div class="flex items-start gap-2 pl-0.5">' +
            '<span class="flex shrink-0 items-center justify-center rounded-2xl bg-[#f3f4f6] p-[5px]"><img src="' + ASSETS + 'icon-chat-alt.svg" alt="" width="18" height="18" class="size-[18px]"></span>' +
            '<p class="min-w-0 flex-1 pt-1 text-sm leading-5 text-[#374151]"><span class="sr-only">Comment: </span>' + esc(comment) + '</p>' +
          '</div>'
        : '') +
    '</li>';
  }

  /** The parties of one allocation, the author's comment under the author. */
  function partyList(mp, entry) {
    return F.parties(mp).map(function (p) {
      var comment = entry.comment && entry.by === p.id ? entry.comment : '';
      return personRow(p, entry.amounts[p.id], !!entry.accepted[p.id], comment);
    }).join('<li aria-hidden="true" class="h-px bg-[#e5e7eb]"></li>');
  }

  function createdFooter(mp, entry, extra) {
    var author = F.authorName(mp, entry.by);
    var isPerson = entry.by !== 'initial' && entry.by !== 'me';
    return '<div class="flex min-h-[68px] items-center gap-3 bg-[#f9fafb] px-4 py-3">' +
      '<div class="flex min-w-0 flex-1 flex-col gap-1">' +
        '<p class="text-sm leading-5"><span class="font-medium ' + (isPerson ? 'text-[#2563eb]' : 'text-[#111827]') + '">' + esc(author) + '</span> <span class="text-[#6b7280]">created on</span></p>' +
        '<div class="flex items-center justify-between gap-2">' +
          '<p class="flex items-center gap-1.5 text-sm leading-5 text-[#6b7280]"><img src="' + ASSETS + 'icon-calendar.svg" alt="" width="20" height="20" class="size-5 shrink-0">' + stamp(entry.at) + '</p>' +
          (extra && extra.badge ? extra.badge : '') +
        '</div>' +
      '</div>' +
      (extra && extra.action ? extra.action : '') +
    '</div>';
  }

  var HOUR = 3600000;
  var DAY = 24 * HOUR;

  /**
   * The expiry badge, by time left (Figma "MPP/Current Allocation/Expiration
   * Cell", 5.3–5.5):
   *   days    gray, blue border — the date (Current Allocation) or a day countdown
   *   < 24 h  amber — "Expires in 17 hours"
   *   < 1 h   red — "Expires in 57 min and 17 sec", ticking every second
   */
  function expiryBadge(expires, opts) {
    var left = Math.max(0, expires - Date.now());
    var tone, icon, text;
    if (left < HOUR) {
      var secs = Math.floor(left / 1000);
      tone = 'border border-[#fca5a5] bg-[#fef2f2] font-medium text-[#b91c1c] hover:bg-[#fee2e2]';
      icon = 'icon-calendar-red.svg';
      text = 'Expires in ' + Math.floor(secs / 60) + ' min and ' + (secs % 60) + ' sec';
    } else if (left < DAY) {
      var hours = Math.floor(left / HOUR);
      tone = 'border border-[#fcd34d] bg-[#fffbeb] font-medium text-[#b45309] hover:bg-[#fef3c7]';
      icon = 'icon-calendar-amber.svg';
      text = 'Expires in ' + hours + (hours === 1 ? ' hour' : ' hours');
    } else if (opts.showDate) {
      tone = 'border border-[#93c5fd] bg-[#f9fafb] font-medium text-[#374151] hover:bg-gray-100';
      icon = 'icon-calendar-exclamation.svg';
      // Phones get the short date: the full one doesn't fit half the row.
      text = '<span class="sm:hidden">' + expires.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' }) + '</span>' +
        '<span class="hidden sm:inline">' + stamp(expires.toISOString()).replace(' (ET)', '') + '</span>';
    } else {
      tone = 'bg-[#f9fafb] font-semibold text-[#111827] hover:bg-gray-100';
      icon = 'icon-calendar-exclamation-dark.svg';
      text = countdown(expires);
    }
    return '<button type="button" data-mp-expiration class="flex w-full min-w-0 cursor-pointer items-center justify-center gap-1 rounded-full px-2.5 py-[9px] text-sm leading-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ' + tone + '">' +
      '<img src="' + ASSETS + icon + '" alt="" width="18" height="18" class="size-[18px] shrink-0">' +
      '<span class="truncate">' + text + '</span>' +
    '</button>';
  }

  function chips(mp, opts) {
    var expires = F.expiresAt(mp);
    return '<div class="flex w-full gap-2.5">' +
      '<div data-mp-expiry data-show-date="' + (opts.showDate ? '1' : '') + '" class="flex min-w-0 flex-1">' + expiryBadge(expires, opts) + '</div>' +
      '<button type="button" data-mp-how class="flex min-w-0 flex-1 cursor-pointer items-center justify-center rounded-full bg-[#f9fafb] px-2.5 py-[9px] text-sm leading-5 font-medium text-[#3671fb] hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">How it works</button>' +
    '</div>';
  }

  /** Keeps the badge live: the seconds tick and it turns amber, then red. */
  function tickExpiry(mp) {
    var slot = document.querySelector('[data-mp-expiry]');
    if (!slot) return;
    var expires = F.expiresAt(mp);
    var opts = { showDate: !!slot.getAttribute('data-show-date') };
    var last = slot.innerHTML;
    setInterval(function () {
      var next = expiryBadge(expires, opts);
      if (next === last) return;
      // Replacing the button would drop keyboard focus from it.
      var focused = document.activeElement && slot.contains(document.activeElement);
      slot.innerHTML = last = next;
      if (focused) slot.firstElementChild.focus();
    }, 1000);
  }

  function logLink() {
    return '<a href="allocation-log.html" class="group flex items-center justify-center gap-2 rounded py-2.5 text-sm leading-5 font-semibold text-[#4b5563] hover:text-[#111827] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">See allocations log' +
      '<img src="' + ASSETS + 'icon-chevron-right.svg" alt="" width="16" height="16" class="size-4 transition duration-200 ease-out group-hover:translate-x-1 motion-reduce:transition-none"></a>';
  }

  function infoBox(html) {
    return '<div class="flex w-full items-start gap-3 rounded-[10px] bg-[#eff6ff] p-4">' +
      '<img src="' + ASSETS + 'icon-information-circle.svg" alt="" width="20" height="20" class="size-5 shrink-0">' +
      '<div class="flex min-w-0 flex-1 flex-col gap-5 text-sm leading-5 text-[#1e40af]">' + html + '</div>' +
    '</div>';
  }

  // ---- Dialogs -------------------------------------------------------------------

  /** opts.bare: no close (X) — the dialog only closes through its own button. */
  function messageDialog(icon, tint, title, bodyHtml, actionsHtml, opts) {
    var M = window.OBModal;
    var bare = !!(opts && opts.bare);
    return M.open(
      '<div class="flex flex-col items-center gap-6 px-9 pb-9' + (bare ? ' pt-12' : '') + '">' +
        '<div class="flex w-full flex-col items-center gap-3">' +
          M.illustration('mp/' + icon, tint) +
          '<div class="flex w-full flex-col items-center gap-2 text-center">' +
            '<h2 id="mp-dialog-title" class="text-lg leading-6 font-medium text-[#111827]">' + title + '</h2>' +
            bodyHtml +
          '</div>' +
        '</div>' +
        '<div class="flex w-full flex-col gap-4">' + actionsHtml + '</div>' +
      '</div>',
      'mp-dialog-title',
      bare ? { bare: true } : undefined
    );
  }

  var PRIMARY_BTN = 'flex h-14 w-full cursor-pointer items-center justify-center rounded-[10px] bg-[linear-gradient(156deg,#3773ff_3.3%,#2254ca_99.2%)] px-[25px] text-base leading-6 font-medium text-white shadow-[0_16px_24px_0_rgba(55,115,255,0.16)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';
  var SECONDARY_BTN = 'flex h-14 w-full cursor-pointer items-center justify-center rounded-[10px] border border-[#d1d5db] bg-white px-[17px] text-base leading-6 font-medium text-[#374151] shadow-xs hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';

  function howItWorks() {
    messageDialog('icon-chart-pie.svg', 'bg-[#2b61df]/10', 'How does allocating the amount work?',
      '<div class="flex flex-col gap-3 text-sm leading-5 text-[#6b7280]">' +
        '<p>The payment is split between every party listed. Each party reviews the allocation and accepts it, or changes it and gives a reason.</p>' +
        '<p>When the allocation changes, every party is notified and has to accept the new one.</p>' +
        '<p>Once all parties have accepted and chosen how to receive their share, the payment is processed.</p>' +
      '</div>' +
      '<a href="#" class="mt-2 inline-flex items-center gap-3 self-center rounded-md px-6 py-3 text-base leading-6 font-medium text-[#2563eb] underline focus-visible:outline-2 focus-visible:outline-blue-600">' +
        '<img src="' + ASSETS + 'icon-question-circle.svg" alt="" width="20" height="20" class="size-5">Learn more</a>',
      '<button type="button" data-ob-modal-close class="' + PRIMARY_BTN + '">Close</button>');
  }

  function expirationDialog(mp) {
    var expires = F.expiresAt(mp);
    messageDialog('icon-calendar-exclamation.svg', 'bg-[#eff6ff]', 'Expiration',
      '<p class="text-sm leading-5 text-[#6b7280]">All parties have to accept the allocation and choose how to receive their share before this date. After it, the payment request expires.</p>' +
      '<p class="text-sm leading-5 font-medium text-[#111827]">' + stamp(expires.toISOString()) + '</p>',
      '<button type="button" data-ob-modal-close class="' + PRIMARY_BTN + '">OK</button>');
  }

  function wireChips(mp) {
    var slot = document.querySelector('[data-mp-expiry]');
    var how = document.querySelector('[data-mp-how]');
    // On the slot: the badge inside is re-rendered while it counts down.
    if (slot) slot.addEventListener('click', function (event) {
      if (event.target.closest('[data-mp-expiration]')) expirationDialog(mp);
    });
    if (how) how.addEventListener('click', howItWorks);
    tickExpiry(mp);
  }

  // ---- allocation.html -------------------------------------------------------------

  function allocationPage(root) {
    var mp = F.getMp();
    // An expired, revoked or disputed payment has nothing left to allocate.
    if (mp.payment && mp.payment !== 'active') { window.location.replace('payment-closed.html'); return; }
    var entry = F.current(mp);
    var me = F.parties(mp)[0];
    var total = Object.keys(entry.amounts).reduce(function (s, k) { return s + Number(entry.amounts[k] || 0); }, 0);

    var banner = mp.justChanged
      ? '<div role="status" class="flex w-full items-start gap-3 rounded-[10px] bg-[#ecfdf5] p-4">' +
          '<img src="' + ASSETS + 'icon-check-circle-solid-green.svg" alt="" width="20" height="20" class="size-5 shrink-0">' +
          '<p class="text-sm leading-5 font-medium text-[#065f46]">Allocation changed. The other parties have been notified to review and accept it.</p></div>'
      : '';

    root.innerHTML =
      '<div class="flex flex-col gap-1">' +
        '<h1 class="text-3xl leading-9 text-[#1f2937]">Current <span class="font-semibold">Payment Allocation</span></h1>' +
        '<p class="text-sm leading-5 text-[#6b7280]">Below is the payment allocation to each party for this insurance claim. Accept it if no changes are necessary.</p>' +
      '</div>' +
      banner +
      chips(mp, { showDate: true }) +
      '<section aria-label="Allocation" class="w-full overflow-hidden rounded-lg border border-[#d1d5db] bg-white shadow-xs">' +
        '<div class="flex flex-col gap-4 p-4">' +
          '<div class="flex items-center justify-between gap-3">' +
            '<p class="text-sm leading-5 font-medium text-[#6b7280]">Amount to be allocated</p>' +
            '<p class="rounded-[19px] bg-[#f9fafb] px-[11px] py-1.5 text-sm leading-5 font-medium text-[#111827]">' + money(total) + '</p>' +
          '</div>' +
          '<ul role="list" class="flex flex-col gap-2"><li aria-hidden="true" class="h-px bg-[#e5e7eb]"></li>' + partyList(mp, entry) + '</ul>' +
        '</div>' +
        createdFooter(mp, entry, {
          action: '<a href="change-allocation.html" class="flex shrink-0 items-center gap-[3px] rounded-[32px] bg-[#2563eb] px-[11px] py-[9px] text-base leading-6 font-medium text-white shadow-xs hover:bg-[#1d4ed8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">' +
            '<img src="' + ASSETS + 'icon-pencil-alt.svg" alt="" width="20" height="20" class="size-5">Change</a>'
        }) +
      '</section>' +
      (mp.log.length > 1 ? logLink() : '') +
      infoBox('<p>You can <span class="font-semibold">Change</span> current allocation and allocate amount(s) in a different way. Select <span class="font-semibold">Change</span> to proceed.</p>') +
      '<div class="mt-auto flex w-full flex-col gap-4 pt-4">' +
        '<button type="button" data-mp-accept class="' + PRIMARY_BTN + '">Accept and Continue</button>' +
        (me.primary ? '<button type="button" data-mp-dispute class="' + SECONDARY_BTN + '">Dispute Total Amount</button>' : '') +
      '</div>';

    if (mp.justChanged) { delete mp.justChanged; F.saveMp(mp); }
    wireChips(mp);

    root.querySelector('[data-mp-accept]').addEventListener('click', function () {
      F.accept();
      window.OBGo(F.myShare() > 0 ? 'paywall.html' : 'payment-status.html');
    });

    var dispute = root.querySelector('[data-mp-dispute]');
    if (dispute) dispute.addEventListener('click', function () {
      var client = esc(window.OBModal.clientName());
      messageDialog('icon-exclamation-red.svg', 'bg-[#fee2e2]', 'Dispute Total Allocation Amount',
        '<p class="text-sm leading-5 text-[#6b7280]">Are you sure you want to dispute the total allocation amount?</p>' +
        '<p class="text-sm leading-5 text-[#6b7280]">The payment request will be cancelled and you\'ll need to contact ' + client + ' to receive the payment.</p>',
        '<button type="button" data-mp-dispute-confirm class="flex h-14 w-full cursor-pointer items-center justify-center rounded-[10px] bg-[#dc2626] px-[17px] text-base leading-6 font-medium text-white shadow-xs hover:bg-[#b91c1c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dc2626]">Dispute</button>' +
        '<button type="button" data-ob-modal-close class="' + SECONDARY_BTN + '">Cancel</button>');
      document.querySelector('[data-mp-dispute-confirm]').addEventListener('click', function () {
        window.OBModal.close();
        window.OBGo('dispute.html');
      });
    });

    // Someone else changed the split since the user last looked
    // (Figma "MPP - 6.6.2. Allocation has been changed Modal").
    if (mp.changedBy) {
      delete mp.changedBy;
      F.saveMp(mp);
      // After the page has faded in: during the transition the sidebar is
      // drawn above everything, dialog included.
      var T = window.OnboardingTransitions;
      var show = function () {
        messageDialog('icon-chart-pie.svg', 'bg-[#2b61df]/10', 'New Allocation',
          '<p class="text-sm leading-5 text-[#6b7280]">The latest allocation has been changed by another party. You need to review it to continue.</p>',
          '<button type="button" data-ob-modal-close class="' + PRIMARY_BTN + '">View Current Allocation</button>',
          { bare: true });
      };
      if (T && T.afterReveal) T.afterReveal(show);
      else show();
    }
  }

  // ---- change-allocation.html ------------------------------------------------------

  function changePage(root) {
    var mp = F.getMp();
    var entry = F.current(mp);
    var people = F.parties(mp);
    var total = Object.keys(entry.amounts).reduce(function (s, k) { return s + Number(entry.amounts[k] || 0); }, 0);
    var INPUT = window.OBField.INPUT;

    function amountField(id, value, opts) {
      return '<div class="relative w-40 shrink-0">' +
        '<span aria-hidden="true" class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-base leading-6 text-[#6b7280]">$</span>' +
        '<input ' + (opts.disabled ? 'disabled ' : 'data-mp-amount="' + id + '" ') + 'id="mp-amount-' + id + '" type="text" inputmode="decimal" autocomplete="off" ' +
          'aria-label="' + esc(opts.label) + '" value="' + Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '" ' +
          'class="' + INPUT + ' pl-7 ' + (opts.disabled ? 'disabled:bg-[#f3f4f6] disabled:text-[#4b5563]' : '') + '">' +
      '</div>';
    }

    // The user first, then the other parties (Figma order).
    var rows = people.map(function (p) {
      var title = p.you ? 'Your amount' : p.name;
      var sub = p.primary ? 'Primary Party' : '';
      return '<div class="flex items-center gap-4">' +
        '<label for="mp-amount-' + p.id + '" class="flex min-w-0 flex-1 flex-col text-sm leading-5 font-medium">' +
          '<span class="truncate text-[#111827]">' + esc(title) + '</span>' +
          (sub ? '<span class="text-[#6b7280]">' + sub + '</span>' : '') +
        '</label>' +
        amountField(p.id, entry.amounts[p.id], { label: title }) +
      '</div>';
    }).join('');

    root.innerHTML =
      '<div class="flex flex-col gap-6">' +
        '<a href="allocation.html" class="flex size-6 items-center justify-center rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><span class="sr-only">Back to Current Allocation</span>' +
          '<img src="' + ASSETS + 'icon-arrow-right.svg" alt="" width="24" height="24" class="size-6 rotate-180"></a>' +
        '<h1 class="text-3xl leading-9 text-[#1f2937]">Change <span class="font-semibold">Allocation</span></h1>' +
      '</div>' +
      chips(mp, { showDate: true }) +
      '<div class="flex flex-col gap-3">' +
        '<div aria-hidden="true" class="h-px bg-[#d1d5db]"></div>' +
        '<div class="flex items-center gap-4">' +
          '<label for="mp-amount-total" class="flex-1 text-sm leading-5 font-medium text-[#111827]">Amount to be allocated</label>' +
          amountField('total', total, { disabled: true, label: 'Amount to be allocated' }) +
        '</div>' +
        '<div aria-hidden="true" class="h-px border-t border-dashed border-[#d1d5db]"></div>' +
        rows +
      '</div>' +
      '<div data-mp-total-state role="status" class="flex justify-center"></div>' +
      '<div class="flex flex-col gap-1">' +
        '<label for="mp-reason" class="text-sm leading-5 font-medium text-[#374151]">Reason for change <span class="text-[#9ca3af]">(minimum of 10 and maximum of 1000 characters)</span></label>' +
        '<textarea id="mp-reason" data-mp-reason rows="4" maxlength="1000" placeholder="Write reason here." aria-describedby="mp-reason-error" class="' + window.OBField.TEXTAREA + ' h-[114px] resize-y"></textarea>' +
        '<p id="mp-reason-error" data-mp-reason-error class="hidden text-sm leading-5 text-[#dc2626]"></p>' +
      '</div>' +
      (mp.log.length > 1 ? logLink() : '') +
      '<div class="mt-auto flex w-full flex-col gap-4 pt-4">' +
        '<button type="button" data-mp-save class="flex h-14 w-full cursor-pointer items-center justify-center rounded-[10px] bg-[#2f68ed] px-[17px] text-base leading-6 font-medium text-white shadow-xs hover:bg-[#2563eb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Change Allocation</button>' +
        '<a href="allocation.html" class="' + SECONDARY_BTN + '">Cancel</a>' +
      '</div>';

    wireChips(mp);

    var inputs = root.querySelectorAll('[data-mp-amount]');
    var stateEl = root.querySelector('[data-mp-total-state]');
    var reason = root.querySelector('[data-mp-reason]');
    var reasonError = root.querySelector('[data-mp-reason-error]');

    function parse(input) {
      var n = parseFloat(String(input.value).replace(/[^\d.]/g, ''));
      return isNaN(n) ? 0 : Math.round(n * 100) / 100;
    }

    function amounts() {
      var out = {};
      Array.prototype.forEach.call(inputs, function (input) { out[input.getAttribute('data-mp-amount')] = parse(input); });
      return out;
    }

    function pill(tone, icon, text) {
      var tones = {
        ok: 'bg-[#ecfdf5] text-[#065f46]',
        warn: 'bg-[#fffbeb] font-normal text-[#92400e]',
        error: 'bg-[#fef2f2] text-[#991b1b]'
      };
      return '<p class="flex items-center gap-2 rounded-md p-2 text-sm leading-5 font-medium ' + tones[tone] + '">' +
        '<img src="' + icon + '" alt="" width="20" height="20" class="size-5">' + text + '</p>';
    }

    /** Green when the parties add up to the total, amber when short, red when over. */
    function renderTotal() {
      var a = amounts();
      var sum = Object.keys(a).reduce(function (s, k) { return s + a[k]; }, 0);
      var diff = Math.round((total - sum) * 100) / 100;
      if (diff === 0) stateEl.innerHTML = pill('ok', ASSETS + 'icon-check-circle-solid-green.svg', 'Total amount allocated');
      else if (diff > 0) stateEl.innerHTML = pill('warn', ASSETS + 'icon-exclamation-amber.svg', money(diff) + ' left to allocate');
      else stateEl.innerHTML = pill('error', '../../assets/onboarding/icon-exclamation-circle-error.svg', 'Over-allocated by ' + money(-diff));
      return diff === 0;
    }

    function checkReason(show) {
      var len = reason.value.trim().length;
      var msg = len === 0 ? 'Please enter a reason for the change.' : len < 10 ? 'The reason must be at least 10 characters.' : '';
      if (show) {
        window.OBField.setError(reason, !!msg, reasonError, msg);
      }
      return !msg;
    }

    Array.prototype.forEach.call(inputs, function (input) {
      input.addEventListener('input', renderTotal);
      input.addEventListener('blur', function () {
        input.value = parse(input).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      });
    });
    reason.addEventListener('input', function () { if (reason.getAttribute('aria-invalid') === 'true') checkReason(true); });
    renderTotal();

    /** Figma 6.4: saving the split that's already current changes nothing. */
    function sameAsPrevious() {
      var a = amounts();
      return Object.keys(a).every(function (id) { return a[id] === Number(entry.amounts[id] || 0); });
    }

    function markSame(on) {
      Array.prototype.forEach.call(inputs, function (input) {
        input.classList.toggle('outline-[#fbbf24]!', on);
      });
    }

    Array.prototype.forEach.call(inputs, function (input) {
      input.addEventListener('input', function () { markSame(false); });
    });

    root.querySelector('[data-mp-save]').addEventListener('click', function () {
      var balanced = renderTotal();
      if (!balanced) { stateEl.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
      if (sameAsPrevious()) {
        markSame(true);
        stateEl.innerHTML = pill('warn', ASSETS + 'icon-exclamation-amber.svg', 'Allocation amount is the same as previous');
        return;
      }
      var reasonOk = checkReason(true);
      if (!reasonOk) { reason.focus(); return; }
      F.change(amounts(), reason.value.trim());
      window.OBGo('allocation.html');
    });
  }

  // ---- allocation-log.html -----------------------------------------------------------

  function logPage(root) {
    var mp = F.getMp();
    var cards = mp.log.slice().reverse().map(function (entry, i) {
      var latest = i === 0;
      return '<section aria-label="' + (latest ? 'Current allocation' : 'Earlier allocation') + '" class="w-full overflow-hidden rounded-lg bg-white shadow-xs ' +
          (latest ? 'border-2 border-[#2563eb]' : 'border border-[#d1d5db]') + '">' +
        '<ul role="list" class="flex flex-col gap-2 p-4">' + partyList(mp, entry) + '</ul>' +
        createdFooter(mp, entry, latest ? {
          badge: '<span class="shrink-0 rounded-[10px] bg-[#dbeafe] px-2.5 py-0.5 text-xs leading-4 font-medium text-[#1e40af]">Current</span>'
        } : null) +
      '</section>';
    }).join('');

    root.innerHTML =
      '<div class="flex flex-col gap-6">' +
        '<a href="javascript:history.back()" class="flex size-6 items-center justify-center rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><span class="sr-only">Back</span>' +
          '<img src="' + ASSETS + 'icon-arrow-right.svg" alt="" width="24" height="24" class="size-6 rotate-180"></a>' +
        '<h1 class="text-3xl leading-9 text-[#1f2937]"><span class="font-semibold">Allocation</span> Log</h1>' +
      '</div>' +
      '<div class="flex flex-col gap-4 pb-4">' + cards + '</div>';
  }

  // ---- payment-status.html -------------------------------------------------------------

  function statusPage(root) {
    var mp = F.getMp();
    var entry = F.current(mp);
    var share = F.myShare();
    var method = F.methodLabel();
    var parts = money(share).match(/^(.*?)(\.\d{2})$/) || [money(share), money(share), ''];
    var processing = { 'Bank Transfer - ACH': 'Up to 3 Days', Check: '7–10 Days' }[method] || 'Instant';
    var finalPage = new URLSearchParams(window.location.search).get('final');

    var amountCard = share > 0
      ? '<section aria-label="Payment amount" data-ob-tone="dark" class="relative h-[173px] w-full overflow-hidden rounded-2xl bg-[linear-gradient(141deg,#3773ff_3.3%,#2254ca_99.2%)] shadow-[0px_20px_50px_-12px_rgba(0,0,0,0.25)]">' +
          '<div aria-hidden="true" class="pointer-events-none absolute inset-0">' +
            '<span class="absolute top-[-85.37px] left-[-41.37px] flex size-[198.7px] items-center justify-center"><img src="../../assets/onboarding/bubble-1.svg" alt="" width="162.266" height="162.266" class="block max-w-none -rotate-[105deg]"></span>' +
            '<span class="absolute top-[110.25px] left-[-9.61px] flex size-[143.1px] items-center justify-center"><img src="../../assets/onboarding/bubble-2.svg" alt="" width="116.858" height="116.858" class="block max-w-none -rotate-[105deg]"></span>' +
            '<span class="absolute top-[23.12px] left-[242.54px] flex size-[180.2px] items-center justify-center"><img src="../../assets/onboarding/bubble-3.svg" alt="" width="147.167" height="147.167" class="block max-w-none -rotate-[105deg]"></span>' +
          '</div>' +
          '<div class="relative flex h-full flex-col items-center gap-3 pt-6 pb-[25px]">' +
            '<p class="text-xs leading-5 font-medium tracking-[0.3px] text-[#bfdbfe] uppercase">Payment Amount</p>' +
            '<p class="text-5xl leading-[48px] whitespace-nowrap text-white">' + parts[1] + parts[2] + '</p>' +
            '<p class="flex items-center gap-1 rounded-[14px] bg-[#1e40af] py-1 pr-4 pl-4">' +
              '<span class="text-[10px] leading-5 font-medium tracking-[1px] whitespace-nowrap text-[#60a5fa] uppercase">Estimated Processing Time:</span>' +
              '<span class="px-1.5 py-0.5 text-xs leading-3 whitespace-nowrap text-white">' + processing + '</span>' +
            '</p>' +
          '</div>' +
        '</section>'
      : '';

    var allSubmitted = F.othersDone();
    root.innerHTML =
      '<div class="flex flex-col gap-2.5">' +
        '<h1 class="text-3xl leading-9 text-[#1f2937]"><span class="font-semibold">Payment</span> Status</h1>' +
        (share > 0 && method ? '<p class="text-sm leading-5 text-[#6b7280]">Selected payment method: ' + esc(method) + '</p>' : '') +
      '</div>' +
      amountCard +
      chips(mp, { showDate: false }) +
      '<section aria-label="Parties" class="w-full rounded-lg border border-[#d1d5db] bg-white p-4 shadow-xs">' +
        '<ul role="list" class="flex flex-col gap-4">' + F.parties(mp).map(function (p) {
          var done = p.you || allSubmitted || !!entry.accepted[p.id];
          return personRow(p, entry.amounts[p.id], done, '');
        }).join('<li aria-hidden="true" class="h-px bg-[#e5e7eb]"></li>') + '</ul>' +
      '</section>' +
      logLink() +
      infoBox(
        '<p>When all parties submit their payment method preference, the payment will be processed, and a notification will be sent to your email address and / or phone number.</p>' +
        '<p>By selecting the same link from your existing notification, you will be able to re-enter this site and track the progress of your multi-party payment.</p>' +
        '<p>You may close your browser now.</p>') +
      (allSubmitted && finalPage
        ? '<div class="mt-auto flex w-full pt-4"><a href="' + esc(finalPage) + '" class="' + PRIMARY_BTN + '">Continue</a></div>'
        : '');

    wireChips(mp);
  }

  // ---- dispute.html ----------------------------------------------------------------------

  function disputePage(root) {
    var M = window.OBModal;
    var INPUT = window.OBField.INPUT;
    var state = (window.SDOnboardingContext && window.SDOnboardingContext.getState()) || {};
    var info = (state.payableContext && state.payableContext.accountInformation) || {};

    function field(id, label, opts) {
      opts = opts || {};
      return '<div class="flex flex-col gap-1">' +
        '<label for="mp-d-' + id + '" class="text-sm leading-5 font-medium text-[#374151]">' + label +
          (opts.optional ? ' <span class="font-normal text-[#9ca3af]">(optional)</span>' : '') + '</label>' +
        (opts.textarea
          ? '<textarea id="mp-d-' + id + '" data-mp-d="' + id + '" rows="4" maxlength="255" class="' + window.OBField.TEXTAREA + ' h-[98px] resize-y"></textarea>'
          : '<input id="mp-d-' + id + '" data-mp-d="' + id + '" type="' + (opts.type || 'text') + '" autocomplete="' + (opts.autocomplete || 'off') + '" value="' + esc(opts.value || '') + '" class="' + INPUT + '">') +
        '<p data-mp-d-error="' + id + '" class="hidden text-sm leading-5 text-[#dc2626]"></p>' +
      '</div>';
    }

    root.innerHTML =
      '<div class="flex flex-col gap-2">' +
        '<h1 class="text-3xl leading-9 text-[#1f2937]">Contact <span class="font-semibold">' + esc(M.clientName()) + '</span></h1>' +
        '<p class="text-sm leading-5 text-[#6b7280]">Please enter your information and tell us why you dispute the total amount.</p>' +
      '</div>' +
      '<form data-mp-dispute-form novalidate class="flex flex-1 flex-col gap-4">' +
        field('first', 'First Name', { autocomplete: 'given-name', value: info.firstName }) +
        field('last', 'Last Name', { autocomplete: 'family-name', value: info.lastName }) +
        field('company', 'Company', { optional: true, autocomplete: 'organization' }) +
        field('email', 'Email', { type: 'email', autocomplete: 'email', value: info.email }) +
        field('phone', 'Phone Number', { type: 'tel', autocomplete: 'tel', value: info.phoneNumber }) +
        field('message', 'Message <span class="font-normal text-[#9ca3af]">(maximum of 255 characters)</span>', { textarea: true }) +
        '<div class="mt-auto flex flex-col gap-4 pt-6">' +
          '<button type="submit" class="' + PRIMARY_BTN + '">Let\'s talk</button>' +
          '<a href="allocation.html" class="' + SECONDARY_BTN + '">Cancel</a>' +
        '</div>' +
      '</form>';

    var form = root.querySelector('[data-mp-dispute-form]');
    var rules = {
      first: function (v) { return v ? '' : 'Please enter your first name.'; },
      last: function (v) { return v ? '' : 'Please enter your last name.'; },
      email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Please enter a valid email address.'; },
      phone: function (v) { return v.replace(/\D/g, '').length >= 10 ? '' : 'Please enter a valid phone number.'; },
      message: function (v) { return v.length >= 10 ? '' : 'Please write at least 10 characters.'; }
    };

    function validate(id) {
      var input = form.querySelector('[data-mp-d="' + id + '"]');
      var helper = form.querySelector('[data-mp-d-error="' + id + '"]');
      var msg = rules[id](input.value.trim());
      window.OBField.setError(input, !!msg, helper, msg);
      return !msg;
    }

    Object.keys(rules).forEach(function (id) {
      var input = form.querySelector('[data-mp-d="' + id + '"]');
      input.addEventListener('input', function () { if (input.getAttribute('aria-invalid') === 'true') validate(id); });
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var bad = Object.keys(rules).filter(function (id) { return !validate(id); });
      if (bad.length) { form.querySelector('[data-mp-d="' + bad[0] + '"]').focus(); return; }
      F.dispute(form.querySelector('[data-mp-d="message"]').value.trim());
      root.innerHTML =
        '<div role="status" class="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">' +
          '<img src="../../assets/onboarding/icon-mail-notification.svg" alt="" width="64" height="64" class="mb-2 size-16">' +
          '<h1 class="text-xl leading-7 font-semibold text-[#1e40af]">Thank you for your inquiry!</h1>' +
          '<p class="max-w-[260px] text-sm leading-5 text-[#374151]">We have forwarded your request to the relevant team who will respond as soon as possible.</p>' +
        '</div>';
    });
  }

  // ---- payment-closed.html -------------------------------------------------------------

  /** "Mon, Oct 12, 2026 at 7:15 am (EDT)" — the Tokens screens' date format. */
  function tokenDate(date) {
    var parts = {};
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short'
    }).formatToParts(date).forEach(function (p) { parts[p.type] = p.value; });
    return parts.weekday + ', ' + parts.month + ' ' + parts.day + ', ' + parts.year + ' at ' +
      parts.hour + ':' + parts.minute + ' ' + parts.dayPeriod.toLowerCase() + ' (' + parts.timeZoneName + ')';
  }

  /**
   * Expired / revoked / disputed, in the Tokens style (Figma section
   * 20024:45679): icon, title, a gray box with Reason and Details, then the
   * client's contact card. With a fallback, the whole claim goes to the
   * primary party.
   */
  function closedPage() {
    var mp = F.getMp();
    if (!mp.payment || mp.payment === 'active') { window.location.replace('allocation.html'); return; }
    var M = window.OBModal;
    var people = F.parties(mp);
    var primary = people.filter(function (p) { return p.primary; })[0];
    var client = M.clientName();
    var fallback = mp.fallback !== false && mp.payment !== 'disputed';
    var revokedBy = people[people.length - 1];

    var expired = mp.payment === 'expired';
    var icon = document.querySelector('[data-mp-closed-icon]');
    icon.classList.add(expired ? 'bg-[#f9fafb]' : 'bg-[#fef2f2]');
    icon.innerHTML = expired
      ? '<img src="' + ASSETS + 'icon-calendar-gray.svg" alt="" width="24" height="24" class="size-6">'
      : '<img src="../../assets/onboarding/icon-x-circle-red.svg" alt="" width="24" height="24" class="size-6">';
    document.querySelector('[data-mp-closed-title]').textContent = expired
      ? 'Your SMART Disburse request has expired'
      : 'Your SMART Disburse request is no longer available';

    function block(label, html) {
      return '<div class="flex flex-col gap-0.5"><dt class="text-sm leading-5 text-gray-600">' + label + '</dt>' + html + '</div>';
    }
    function row(key, valueHtml) {
      return '<div class="flex flex-wrap gap-y-1"><dt class="min-w-[180px] text-sm leading-5 font-medium text-gray-900">' + key + '</dt>' +
        '<dd class="flex min-w-[180px] flex-1 flex-col items-start gap-0.5 text-sm leading-5 text-gray-700">' + valueHtml + '</dd></div>';
    }

    var reason = {
      revoked: 'Too many failed attempts to provide answer to security question(s) by ' + esc(revokedBy.name),
      disputed: 'Total amount disputed by ' + esc(primary.name)
    }[mp.payment];

    var details = [];
    if (expired) details.push(row('Expired On', tokenDate(new Date(Date.now() - 24 * 3600000))));
    // Fallback: the whole payment goes to the primary party (Figma 6.6: "[MOP]
    // will be issued to [Primary Party]"). Which method isn't settled, so none
    // is named here.
    if (fallback) {
      details.push(row('Issued To', primary.you ? 'You (Primary Party)' : esc(primary.name) + ' (Primary Party)'));
    }
    var html = '';
    if (reason) html += '<dl>' + block('Reason', '<dd class="text-sm leading-5 font-medium text-gray-900">' + reason + '</dd>') + '</dl>';
    if (mp.payment === 'disputed') {
      html += '<dl>' + block('Details', '<dd class="text-sm leading-5 font-medium text-gray-900">Incorrect total amount' +
        '<span class="block font-normal text-gray-500">' + esc(mp.disputeMessage || 'The total is $3,000 short of the repair invoice, so the claim needs to be reassessed.') + '</span></dd>') + '</dl>';
    } else {
      details.push(row('Issued By', esc(client)));
      details.push(row('Payment Amount', money(F.TOTAL)));
      html += '<dl class="flex flex-col gap-2"><dt class="text-sm leading-5 text-gray-600">Details</dt>' + details.join('') + '</dl>';
      // Someone else received the money: say where the user's share went.
      if (fallback && !primary.you) {
        html += '<p class="text-sm leading-5 text-gray-500">The full payment was issued to the primary party. Please contact ' + esc(client) + ' about your share.</p>';
      }
    }
    document.querySelector('[data-mp-closed-info]').innerHTML = html;

    // The same contact card as the Declined page, with copy buttons.
    M.loadContact().then(function (contact) {
      var slot = document.querySelector('[data-client-contact]');
      if (slot) slot.innerHTML = M.contactCard(contact);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!F) return;
    if (document.body.getAttribute('data-mp-page') === 'closed') { closedPage(); return; }
    var root = document.querySelector('[data-mp-root]');
    if (!root) return;
    var pages = {
      allocation: allocationPage,
      change: changePage,
      log: logPage,
      status: statusPage,
      dispute: disputePage
    };
    var init = pages[document.body.getAttribute('data-mp-page')];
    if (init) init(root);
  });
})();

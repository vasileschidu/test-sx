/**
 * card-manager-funds.js
 * S4 - Add Funds (TCDM-5223) and S5 - Transfer Funds (TCDM-5224), SMART Hub Cards Manager.
 * Wiki card-manager.md §4.4 / §4.5, BR-3, BR-4, BR-5.
 * Figma: Add Funds 8014:104750 (select open 8014:104799, errors 8014:105054 / 8014:105102,
 * tick-the-box tooltip 8014:104915, success 8014:105018); Transfer Funds 8014:126496
 * (send to 8014:126571, success 8014:127009).
 *
 * One generic modal, `mode`:
 *   "add"      event `add-funds` { cardId }: money comes ONTO this card. "Transfer from" (C1 picker, this
 *              card excluded), helper = the source's balance, "Max amount" = the source's balance,
 *              checkbox "Transfer $X from <source> to <card>", Cancel / "Add to balance",
 *              success "Funding Transaction Submitted".
 *   "transfer" event `transfer` { cardId }: money leaves THIS card. "From" (C1 picker, this card
 *              excluded), helper = this card's balance, "Max amount" = this card's balance,
 *              checkbox "Send $X from <card> to <destination>", Cancel / "Transfer",
 *              success "Transfer Transaction Submitted".
 *
 * Rules: amount > 0 ("Amount must be greater than 0."); amount <= the balance of the account the money
 * leaves ("Available balance: $X USD (Insufficient Funds)", red); the primary button stays disabled until
 * the box is ticked, and its tooltip says "First, confirm this transfer by ticking the box".
 * On success the balances move in CardManager.data (this card: availableBalance + currentBalance; bank:
 * balance; other card: both) and `data-change` { reason: "funds" } redraws the details page.
 *
 * Needs: onboarding-modal.js, onboarding-field.js, card-manager-account-picker.js, checkbox-component.js,
 * card-manager.js, payment-preferences-components.js.
 * TODO(confirm): no source is preselected (Figma shows the bank account already chosen); the "Select an
 * account." text (not in Figma); balance = availableBalance.
 */
(function () {
  "use strict";

  var cm = window.CardManager;
  if (!cm) return;

  var seq = 0;

  var COPY = {
    add: {
      title: "Add Funds",
      pickLabel: "Transfer from",
      maxLabel: "Max amount",
      submit: "Add to balance",
      doneTitle: "Funding Transaction Submitted",
      verb: "Transfer",
      focus: '[data-cm-details-action="add-funds"]',
    },
    transfer: {
      title: "Transfer Funds",
      pickLabel: "From",
      maxLabel: "Max amount",
      submit: "Transfer",
      doneTitle: "Transfer Transaction Submitted",
      verb: "Send",
      focus: "[data-cm-details-menu]",
    },
  };

  var TIP_TICK = "First, confirm this transfer by ticking the box";
  var ERR_AMOUNT = "Amount must be greater than 0."; // BR-3
  var ERR_ACCOUNT = "Select an account."; // TODO(confirm): not in Figma

  var PANEL_FORM =
    "relative flex w-full max-w-125 flex-col rounded-lg bg-white shadow-xl dark:bg-gray-900 dark:ring-1 dark:ring-white/10";
  var PANEL_DONE =
    "relative flex w-full max-w-lg flex-col overflow-clip rounded-lg bg-white shadow-lg ring-1 ring-black/5 dark:bg-gray-900 dark:ring-white/10";
  var BTN_SECONDARY =
    "inline-flex cursor-pointer items-center justify-center rounded-md bg-white px-3 py-1.5 text-sm/5 font-semibold text-gray-900 " +
    "shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 " +
    "dark:bg-white/10 dark:text-white dark:inset-ring-white/10 dark:hover:bg-white/20";
  var BTN_PRIMARY =
    "inline-flex cursor-pointer items-center justify-center rounded-md bg-blue-600 px-3 py-1.5 text-sm/5 font-semibold text-white " +
    "shadow-xs hover:bg-blue-500 active:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 " +
    "disabled:cursor-not-allowed disabled:bg-blue-300 disabled:hover:bg-blue-300 dark:focus-visible:outline-blue-400 " +
    "dark:disabled:bg-blue-500/40 dark:disabled:text-white/60 dark:disabled:hover:bg-blue-500/40";
  var BTN_PRIMARY_FULL =
    "inline-flex w-full cursor-pointer items-center justify-center rounded-md bg-blue-600 px-3.5 py-2.5 text-base/6 font-semibold text-white shadow-xs hover:bg-blue-500 active:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400";
  var CLOSE_BTN =
    '<button type="button" data-ob-modal-close class="shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-300 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400">' +
    '<span class="sr-only">Close</span>' +
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="size-5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>';
  var LINK_SM =
    "shrink-0 cursor-pointer rounded-md text-sm/5 font-medium text-blue-600 hover:text-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-blue-400 dark:hover:text-blue-300 dark:focus-visible:outline-blue-400";
  var MUTED = "text-gray-500 dark:text-gray-400";
  var STRONG = "font-medium text-gray-900 dark:text-gray-100";

  /* ---------- helpers ---------- */

  function assetUrl(file) {
    var path = window.location.pathname || "";
    var at = path.indexOf("/src/pages/");
    var root = at >= 0 ? path.slice(0, at) : "";
    return root + "/src/assets/cards-manager/" + file;
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function money(amount) {
    return (
      "$" +
      (Number(amount) || 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function round2(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  function findCard(id) {
    var list = cm.data.smartCards || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function findBank(id) {
    var list = cm.data.fundingSources || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /** "Name •••• 3204" for cards, "Name ••••1010" for banks (the picker's one-line value). */
  function labelOf(source) {
    if (!source.last4) return source.name;
    return source.name + (source.type === "bank" ? " ••••" : " •••• ") + source.last4;
  }

  function cardLabel(card) {
    return card.name + " •••• " + card.last4;
  }

  function parseAmount(text) {
    return round2(parseFloat(String(text).replace(/,/g, "")));
  }

  function focusAfterRedraw(selector) {
    var el = document.querySelector(selector);
    if (el) el.focus();
  }

  /** Add `delta` (negative to take out) to a bank source or to a card, keeping both balances in step. */
  function move(source, delta) {
    if (source.type === "bank") {
      var bank = findBank(source.id);
      if (bank) bank.balance = round2((Number(bank.balance) || 0) + delta);
      return;
    }
    var card = findCard(source.id);
    if (card) shift(card, delta);
  }

  function shift(card, delta) {
    card.availableBalance = round2((Number(card.availableBalance) || 0) + delta);
    card.currentBalance = round2((Number(card.currentBalance) || 0) + delta);
  }

  /* ---------- success ---------- */

  function openDone(copy, amount, fromLabel, toLabel) {
    var ob = window.OBModal;
    var titleId = "cm-funds-done-title-" + ++seq;
    var b = "font-semibold";
    var text =
      "You’ve successfully sent <span class=\"" + b + '">' + esc(money(amount)) + "</span> from <span class=\"" + b + '">' +
      esc(fromLabel) + "</span> to <span class=\"" + b + '">' + esc(toLabel) + "</span>";
    var body =
      '<div class="flex flex-col items-center gap-6 p-6 text-center">' +
      '<img src="' + assetUrl("icon-check-circle-green.svg") + '" alt="" width="44" height="44" class="size-11" />' +
      '<div class="flex flex-col gap-2">' +
      '<h2 id="' + titleId + '" class="text-lg/6 font-semibold text-gray-900 dark:text-white">' + esc(copy.doneTitle) + "</h2>" +
      '<p class="text-sm/5 font-normal ' + MUTED + '">' + text + "</p></div></div>";
    var footer =
      '<div class="rounded-b-lg bg-white px-6 pb-6 dark:bg-gray-900"><button type="button" data-ob-modal-close class="' +
      BTN_PRIMARY_FULL + '">Done</button></div>';
    var backdrop = ob.open(body, titleId, { bare: true, footer: footer, panelClass: PANEL_DONE });
    backdrop.querySelector("[data-ob-modal-close]").focus();
  }

  /* ---------- the modal ---------- */

  function checkHtml(copy, amount, fromLabel, toLabel, checked, id) {
    return (
      '<app-checkbox class="w-full" input-id="' + id + '" data-cm-funds-agree' + (checked ? " checked" : "") + ">" +
      '<span class="' + MUTED + '">' + esc(copy.verb) + ' <span class="' + STRONG + '">' + esc(money(amount)) + "</span> from " +
      '<span class="' + STRONG + '">' + esc(fromLabel) + "</span> to " +
      '<span class="' + STRONG + '">' + esc(toLabel) + "</span></span></app-checkbox>"
    );
  }

  function helperHtml(balance, insufficient) {
    var cls = insufficient ? "text-red-600 dark:text-red-400" : MUTED;
    return (
      '<p data-cm-funds-helper class="text-sm/5 ' + cls + '">Available balance: <span class="font-semibold ' +
      (insufficient ? "" : "text-gray-700 dark:text-gray-300") + '">' + esc(money(balance)) + " USD</span>" +
      (insufficient ? " (Insufficient Funds)" : "") + "</p>"
    );
  }

  function open(mode, cardId) {
    var copy = COPY[mode];
    var card = findCard(cardId);
    var ob = window.OBModal;
    var F = window.OBField;
    var picker = window.CardManagerAccountPicker;
    if (!copy || !card) return;
    if (!ob || !F || !picker) {
      console.error("Add / Transfer Funds needs onboarding-modal.js, onboarding-field.js and card-manager-account-picker.js on the page.");
      return;
    }
    var uid = ++seq;
    var ids = {
      title: "cm-funds-title-" + uid,
      form: "cm-funds-form-" + uid,
      pick: "cm-funds-pick-" + uid,
      amount: "cm-funds-amount-" + uid,
      agree: "cm-funds-agree-" + uid,
      tip: "cm-funds-tip-" + uid,
    };
    var isAdd = mode === "add";
    var source = null;

    var maxLink =
      '<button type="button" data-cm-funds-max class="' + LINK_SM + '">' + esc(copy.maxLabel) + "</button>";
    var amountField =
      '<div class="flex w-full flex-col gap-1">' +
      '<div class="flex items-start justify-between gap-4">' +
      '<label for="' + ids.amount + '" class="' + F.LABEL + '">Enter Amount</label>' + maxLink + "</div>" +
      '<div class="relative">' +
      '<img src="' + assetUrl("icon-currency-dollar.svg") + '" alt="" width="20" height="20" class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2" />' +
      '<input id="' + ids.amount + '" name="amount" type="text" inputmode="decimal" autocomplete="off" placeholder="0.00" aria-invalid="false" aria-describedby="' +
      ids.amount + '-error" class="' + F.INPUT + ' pl-10" />' + F.errorIcon() + "</div>" +
      '<p id="' + ids.amount + '-error" role="alert" class="hidden ' + F.ERROR_TEXT + '"></p>' +
      (isAdd
        ? ""
        : '<div data-cm-funds-own>' + helperHtml(card.availableBalance, false) + "</div>") +
      "</div>";

    var body =
      '<form id="' + ids.form + '" novalidate class="flex flex-col gap-6 p-6">' +
      '<div class="flex flex-col gap-4">' +
      '<div class="flex w-full flex-col gap-1">' +
      '<span id="' + ids.pick + '-label" class="' + F.LABEL + '">' + esc(copy.pickLabel) + "</span>" +
      '<div id="' + ids.pick + '"></div>' +
      (isAdd ? '<div data-cm-funds-source-helper class="hidden"></div>' : "") + "</div>" +
      amountField + "</div>" +
      '<div class="h-px bg-gray-200 dark:bg-white/10"></div>' +
      '<div data-cm-funds-check></div></form>';

    var header =
      '<div class="flex items-center gap-6 border-b border-gray-200 py-3 pr-4 pl-6 dark:border-white/10">' +
      '<h2 id="' + ids.title + '" class="min-w-0 flex-1 text-lg/6 font-medium text-gray-900 dark:text-white">' + esc(copy.title) + "</h2>" +
      CLOSE_BTN + "</div>";
    var footer =
      '<div class="flex items-start justify-end gap-4 rounded-b-lg border-t border-gray-200 px-6 py-5 dark:border-white/10">' +
      '<button type="button" data-ob-modal-close class="' + BTN_SECONDARY + '">Cancel</button>' +
      '<span class="group/tip relative flex">' +
      '<button type="submit" form="' + ids.form + '" data-cm-funds-submit disabled aria-describedby="' + ids.tip + '" class="' + BTN_PRIMARY + '">' +
      esc(copy.submit) + "</button>" +
      '<span id="' + ids.tip + '" data-cm-funds-tip role="tooltip" class="pointer-events-none invisible absolute right-0 bottom-full z-30 mb-3 w-max max-w-79 rounded-lg bg-gray-900 p-3 text-left text-sm/5 font-normal text-gray-100 opacity-0 shadow-xs transition-opacity duration-150 group-hover/tip:visible group-hover/tip:opacity-100 after:absolute after:-bottom-1 after:right-6 after:size-3 after:rotate-45 after:rounded-[2px] after:bg-inherit dark:bg-gray-950 dark:ring-1 dark:ring-white/10">' +
      esc(TIP_TICK) + "</span></span></div>";

    var backdrop = ob.open(body, ids.title, { bare: true, header: header, footer: footer, panelClass: PANEL_FORM });
    var form = backdrop.querySelector("#" + ids.form);
    var amountInput = backdrop.querySelector("#" + ids.amount);
    var amountErr = backdrop.querySelector("#" + ids.amount + "-error");
    var checkHost = backdrop.querySelector("[data-cm-funds-check]");
    var submit = backdrop.querySelector("[data-cm-funds-submit]");
    var tip = backdrop.querySelector("[data-cm-funds-tip]");
    var srcHelper = backdrop.querySelector("[data-cm-funds-source-helper]");
    var ownHelper = backdrop.querySelector("[data-cm-funds-own]");

    // The account the money leaves: Add Funds = the picked source, Transfer Funds = this card.
    function leavingBalance() {
      return isAdd ? (source ? Number(source.balance) || 0 : null) : Number(card.availableBalance) || 0;
    }

    function box() {
      return checkHost.querySelector("input[type=checkbox]");
    }

    function currentAmount() {
      var n = parseAmount(amountInput.value);
      return n > 0 ? n : 0;
    }

    function labels() {
      var other = source ? labelOf(source) : "selected account";
      return isAdd ? { from: other, to: cardLabel(card) } : { from: cardLabel(card), to: other };
    }

    function redrawCheck() {
      var l = labels();
      var input = box();
      checkHost.innerHTML = checkHtml(copy, currentAmount(), l.from, l.to, !!(input && input.checked), ids.agree);
      syncSubmit();
    }

    function syncSubmit() {
      var ticked = !!(box() && box().checked);
      submit.disabled = !ticked;
      tip.hidden = ticked;
    }

    function paintHelper(insufficient) {
      var balance = leavingBalance();
      if (isAdd) {
        if (!srcHelper) return;
        srcHelper.classList.toggle("hidden", balance == null);
        srcHelper.innerHTML = balance == null ? "" : helperHtml(balance, insufficient);
      } else if (ownHelper) {
        var old = ownHelper.querySelector("[data-cm-funds-helper]");
        if (old) old.outerHTML = helperHtml(balance, insufficient);
      }
    }

    var pk = picker.mount(backdrop.querySelector("#" + ids.pick), {
      sources: picker.fromData(cm.data),
      exclude: [card.id],
      placeholder: "Select account",
      label: copy.pickLabel,
      onChange: function (src) {
        source = src;
        paintHelper(false);
        redrawCheck();
      },
    });

    if (window.ColumnFilter) window.ColumnFilter.attachAmount(amountInput); // US money input (TCDM-5238), bound first
    amountInput.addEventListener("input", function () {
      amountInput.value = amountInput.value.replace(/[^\d.,]/g, "");
      F.setError(amountInput, false, amountErr, "");
      paintHelper(false);
      redrawCheck();
    });
    backdrop.querySelectorAll("[data-cm-funds-max]").forEach(function (link) {
      link.addEventListener("click", function () {
        var balance = leavingBalance();
        if (balance == null) {
          pk.setError(ERR_ACCOUNT);
          backdrop.querySelector("#" + ids.pick + " button").focus();
          return;
        }
        amountInput.value = balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        F.setError(amountInput, false, amountErr, "");
        paintHelper(false);
        redrawCheck();
        amountInput.focus();
      });
    });
    checkHost.addEventListener("change", syncSubmit);

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!(box() && box().checked)) return; // BR-5: the button is disabled until ticked
      var bad = null;
      var amount = parseAmount(amountInput.value);

      if (!source) {
        pk.setError(ERR_ACCOUNT);
        bad = backdrop.querySelector("#" + ids.pick + " button");
      }
      if (!(amount > 0)) {
        F.setError(amountInput, true, amountErr, ERR_AMOUNT); // BR-3
        if (!bad) bad = amountInput;
      } else if (leavingBalance() != null && amount > leavingBalance()) {
        paintHelper(true); // BR-4: Figma marks only the helper line, in red
        if (!bad) bad = amountInput;
      }
      if (bad) {
        bad.focus();
        return;
      }

      var l = labels();
      if (isAdd) {
        move(source, -amount);
        shift(card, amount);
      } else {
        shift(card, -amount);
        move(source, amount);
      }
      ob.close();
      cm.emit("data-change", { reason: "funds", cardId: card.id });
      focusAfterRedraw(copy.focus);
      openDone(copy, amount, l.from, l.to);
    });

    redrawCheck();
  }

  function start(mode, payload) {
    if (!payload || !payload.cardId) return;
    // OBModal gives focus back to whatever had it at open: make that the button that opened the modal.
    focusAfterRedraw(COPY[mode].focus);
    open(mode, payload.cardId);
  }

  cm.on("add-funds", function (payload) {
    start("add", payload);
  });
  cm.on("transfer", function (payload) {
    start("transfer", payload);
  });
})();

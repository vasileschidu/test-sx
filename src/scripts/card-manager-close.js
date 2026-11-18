/**
 * card-manager-close.js
 * S8 - Close a card (SMART Hub, Cards Manager). TCDM-5227, wiki card-manager.md BR-6 / BR-7.
 * Figma: confirm 8016:156565, "can't close" 8016:154339 (picker open 154501, selected 154663),
 * Card Closed 8016:156588 (zero balance) and 8016:154730 (transferred).
 *
 * CardManager `close` { cardId }:
 *   balance 0  -> confirm dialog ("Close your card?") -> status "closed" -> "Card Closed"
 *   balance >0 -> "You can't close this card right now": pick a destination (C1 picker, the card
 *                 itself excluded), tick the box, "Transfer and Close Card" -> the balance moves to
 *                 the destination in CardManager.data, the card gets status "closed" and balances 0.
 * Then `data-change` is emitted (details header, list row) and the success dialog shows.
 *
 * S9 - Remove (TCDM-5228, Figma remove-* frames): same four dialogs with the "remove" copy; on success the
 * card is deleted from CardManager.data (balance moved like Close), the page goes back to the list
 * (history replace) and the list / empty state and tab counts refresh.
 * Generic: `mode` ("close" | "remove") picks the copy from COPY.
 * Needs: onboarding-modal.js, card-manager-account-picker.js, checkbox-component.js,
 * card-manager-status.js (confirm dialog), card-manager.js, payment-preferences-components.js.
 * TODO(confirm): balance = availableBalance (not currentBalance); the error texts (not in Figma);
 * Figma shows "$1734.58" and "***1010" in the success text (typos): app formats are used.
 */
(function () {
  "use strict";

  var cm = window.CardManager;
  if (!cm) return;

  var seq = 0;

  var COPY = {
    close: {
      confirm: {
        title: "Close your card?",
        text: "You are about to close this card. You'll be able to access past transaction history, but you can't undo this action.",
        confirmLabel: "Yes, close the card",
        icon: "icon-warning-red.svg",
      },
      blocked: {
        title: "You can’t close this card right now",
        text: "You have some funds on this card. If you want to close this card you have to transfer all amount to another account",
        label: "Choose destination account to unload funds:",
        placeholder: "Select account",
        agree: "agree to close this card",
        back: "Back",
        submit: "Transfer and Close Card",
        // TODO(confirm): error texts are not in Figma.
        errorAccount: "Select an account.",
        errorAgree: "Confirm to continue.",
      },
      done: { title: "Card Closed", past: "closed", button: "Done" },
    },
    // Figma straight apostrophes in the confirm text.
    remove: {
      confirm: {
        title: "Remove this card?",
        text: "You're about to remove this card. All sensitive information will be removed, you won't be able to use this card and you can't undo this action.",
        confirmLabel: "Yes, remove the card",
        icon: "icon-warning-red.svg",
      },
      blocked: {
        title: "You can\u2019t remove this card right now",
        text: "You have some funds on this card. If you want to remove this card you have to transfer all amount to another account",
        label: "Choose destination account to unload funds:",
        placeholder: "Select account",
        agree: "agree to remove this card",
        back: "Back",
        submit: "Transfer and Remove Card",
        // TODO(confirm): error texts are not in Figma.
        errorAccount: "Select an account.",
        errorAgree: "Confirm to continue.",
      },
      done: { title: "Card Removed", past: "removed", button: "Done" },
    },
  };

  var PANEL_CONFIRM_B =
    "relative flex w-full max-w-125 flex-col overflow-clip rounded-lg bg-white shadow-lg ring-1 ring-black/5 dark:bg-gray-900 dark:ring-white/10";
  var PANEL_DONE =
    "relative flex w-full max-w-lg flex-col overflow-clip rounded-lg bg-white shadow-lg ring-1 ring-black/5 dark:bg-gray-900 dark:ring-white/10";
  var BTN_BACK =
    "inline-flex cursor-pointer items-center justify-center rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-700 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-white/10 dark:text-gray-300 dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/20 dark:hover:text-white dark:active:bg-white/25 dark:focus-visible:outline-blue-400";
  var BTN_DANGER_SM =
    "inline-flex cursor-pointer items-center justify-center rounded-md bg-red-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-red-500 active:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 dark:bg-red-500 dark:hover:bg-red-400 dark:active:bg-red-600 dark:focus-visible:outline-red-400";
  var BTN_PRIMARY_FULL =
    "inline-flex w-full cursor-pointer items-center justify-center rounded-md bg-blue-600 px-3.5 py-2.5 text-base/6 font-semibold text-white shadow-xs hover:bg-blue-500 active:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400";
  var X_BTN =
    "flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-blue-600 dark:hover:bg-white/10 dark:focus-visible:outline-blue-400";
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

  function findCard(id) {
    var list = cm.data.smartCards || [];
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

  function balanceOf(card) {
    return Math.round((Number(card.availableBalance) || 0) * 100) / 100;
  }

  function focusAfterRedraw(selector) {
    var el = document.querySelector(selector);
    if (el) el.focus();
  }

  /** Move `amount` into the destination (bank source or another card) and keep the data consistent. */
  function credit(source, amount) {
    var target = null;
    if (source.type === "bank") {
      (cm.data.fundingSources || []).forEach(function (f) {
        if (f.id === source.id) target = f;
      });
      if (target) target.balance = Math.round(((Number(target.balance) || 0) + amount) * 100) / 100;
    } else {
      target = findCard(source.id);
      if (target) {
        target.availableBalance = Math.round(((Number(target.availableBalance) || 0) + amount) * 100) / 100;
        target.currentBalance = Math.round(((Number(target.currentBalance) || 0) + amount) * 100) / 100;
      }
    }
  }

  function finish(card, copy, amount, source, mode) {
    if (amount > 0 && source) credit(source, amount);
    if (mode === "remove") {
      // Leave the removed card's page (replace: Back must not land on a dead id), then drop it.
      cm.navigate({ tab: "smart" }, { replace: true });
      var at = cm.data.smartCards.indexOf(card);
      if (at >= 0) cm.data.smartCards.splice(at, 1);
      cm.emit("data-change", { reason: "card-removed", cardId: card.id });
      var row = document.querySelector('[data-cm-mount="smart"] [tabindex="0"]');
      if (row) row.focus();
      openDone(card, copy, amount, source);
      return;
    }
    card.status = "closed";
    card.availableBalance = 0;
    card.currentBalance = 0;
    cm.emit("data-change", { reason: "status", cardId: card.id, status: "closed" });
    // The closed card has no ⋯ button: OBModal gives focus back to the Back arrow.
    focusAfterRedraw("[data-cm-details-back]");
    openDone(card, copy, amount, source);
  }

  /* ---------- dialog C / D: Card Closed ---------- */

  function openDone(card, copy, amount, source) {
    var ob = window.OBModal;
    var titleId = "cm-closed-title-" + ++seq;
    var b = "font-semibold";
    var text =
      amount > 0 && source
        ? "The card balance of <span class=\"" + b + '">' + esc(money(amount)) + "</span> was transferred to <span class=\"" + b + '">' +
          esc(labelOf(source)) + "</span> and your <span class=\"" + b + '">' + esc(card.name) + " was " + copy.done.past + ".</span>"
        : "Your card <span class=\"" + b + '">' + esc(card.name) + "</span> was " + copy.done.past + ".";
    var body =
      '<div class="flex flex-col items-center gap-6 p-6 text-center">' +
      '<img src="' + assetUrl("icon-check-circle-green.svg") + '" alt="" width="44" height="44" class="size-11" />' +
      '<div class="flex flex-col gap-2">' +
      '<h2 id="' + titleId + '" class="text-lg/6 font-semibold text-gray-900 dark:text-white">' + esc(copy.done.title) + "</h2>" +
      '<p class="text-sm/5 font-normal ' + MUTED + '">' + text + "</p></div></div>";
    var footer =
      '<div class="rounded-b-lg bg-white px-6 pb-6 dark:bg-gray-900"><button type="button" data-ob-modal-close class="' + BTN_PRIMARY_FULL + '">' +
      esc(copy.done.button) + "</button></div>";
    var backdrop = ob.open(body, titleId, { bare: true, footer: footer, panelClass: PANEL_DONE });
    // The only action: Enter / Space confirms straight away.
    backdrop.querySelector("[data-ob-modal-close]").focus();
  }

  /* ---------- dialog B: can't close, pick a destination ---------- */

  function checkHtml(card, amount, source, checked, agree) {
    var dest = source
      ? '<span class="' + STRONG + '">' + esc(labelOf(source)) + "</span>"
      : "selected account";
    return (
      '<app-checkbox class="w-full" input-id="cm-close-agree" data-cm-close-agree' + (checked ? " checked" : "") + ">" +
      '<span class="' + MUTED + '">Transfer <span class="' + STRONG + '">' + esc(money(amount)) + "</span> from " +
      '<span class="' + STRONG + '">' + esc(cardLabel(card)) + "</span> to " + dest + ", and " +
      '<span class="' + STRONG + '">' + esc(agree) + "</span></span></app-checkbox>"
    );
  }

  function openTransfer(card, copy, mode) {
    var ob = window.OBModal;
    var picker = window.CardManagerAccountPicker;
    if (!ob || !picker) {
      console.error("Close card needs onboarding-modal.js and card-manager-account-picker.js on the page.");
      return;
    }
    var uid = ++seq;
    var ids = { title: "cm-close-title-" + uid, pick: "cm-close-pick-" + uid, label: "cm-close-label-" + uid };
    var amount = balanceOf(card);
    var c = copy.blocked;
    var source = null;

    var body =
      '<div class="flex flex-col gap-6 p-6">' +
      '<div class="flex items-start justify-between gap-4">' +
      '<div class="flex min-w-0 flex-col gap-3">' +
      '<h2 id="' + ids.title + '" class="text-lg/6 font-semibold text-gray-900 dark:text-white">' + esc(c.title) + "</h2>" +
      '<p class="text-sm/5 font-normal ' + MUTED + '">' + esc(c.text) + "</p></div>" +
      '<button type="button" data-ob-modal-close class="' + X_BTN + '"><span class="sr-only">Close</span>' +
      '<img src="' + assetUrl("icon-x.svg") + '" alt="" width="24" height="24" class="size-6" /></button></div>' +
      '<div class="flex flex-col gap-2">' +
      '<span id="' + ids.label + '" class="text-sm/5 font-medium text-gray-700 dark:text-gray-300">' + esc(c.label) + "</span>" +
      '<div id="' + ids.pick + '"></div></div>' +
      '<div class="h-px bg-gray-200 dark:bg-white/10"></div>' +
      '<div class="flex flex-col gap-2"><div data-cm-close-check>' + checkHtml(card, amount, null, false, c.agree) + "</div>" +
      '<p data-cm-close-agree-error role="alert" class="hidden text-sm/5 text-red-600 dark:text-red-400"></p></div></div>';
    var footer =
      '<div class="flex justify-end gap-4 rounded-b-lg border-t border-gray-200 bg-white px-6 py-5 dark:border-white/10 dark:bg-gray-900">' +
      '<button type="button" data-ob-modal-close class="' + BTN_BACK + '">' + esc(c.back) + "</button>" +
      '<button type="button" data-cm-close-submit class="' + BTN_DANGER_SM + '">' + esc(c.submit) + "</button></div>";

    var backdrop = ob.open(body, ids.title, { bare: true, footer: footer, panelClass: PANEL_CONFIRM_B });
    var checkHost = backdrop.querySelector("[data-cm-close-check]");
    var agreeErr = backdrop.querySelector("[data-cm-close-agree-error]");

    function box() {
      return checkHost.querySelector("input[type=checkbox]");
    }
    function setAgreeError(message) {
      var input = box();
      if (input) input.setAttribute("aria-invalid", message ? "true" : "false");
      var host = checkHost.querySelector("app-checkbox");
      if (host) {
        if (message) host.setAttribute("error", "");
        else host.removeAttribute("error");
      }
      agreeErr.textContent = message || "";
      agreeErr.classList.toggle("hidden", !message);
    }
    function redrawCheck() {
      var input = box();
      checkHost.innerHTML = checkHtml(card, amount, source, !!(input && input.checked), c.agree);
    }

    var pk = picker.mount(backdrop.querySelector("#" + ids.pick), {
      sources: picker.fromData(cm.data),
      exclude: [card.id],
      placeholder: c.placeholder,
      label: c.label,
      onChange: function (src) {
        source = src;
        redrawCheck();
      },
    });

    checkHost.addEventListener("change", function () {
      if (box() && box().checked) setAgreeError(null);
    });

    backdrop.querySelector("[data-cm-close-submit]").addEventListener("click", function () {
      var bad = false;
      if (!source) {
        pk.setError(c.errorAccount);
        bad = true;
      }
      if (!(box() && box().checked)) {
        setAgreeError(c.errorAgree);
        bad = true;
      }
      if (bad) {
        (source ? box() : backdrop.querySelector("#" + ids.pick + " button")).focus();
        return;
      }
      ob.close();
      finish(card, copy, amount, source, mode);
    });
  }

  /* ---------- entry ---------- */

  function start(mode, cardId) {
    var copy = COPY[mode];
    var card = findCard(cardId);
    // Closed cards offer neither action (BR-8); Remove also never applies to them. TODO(confirm).
    if (!copy || !card || card.status === "closed") return;
    var ob = window.OBModal;
    var status = window.CardManagerStatus;
    if (!ob) return;
    // OBModal returns focus to whatever had it at open: make that the ⋯ button.
    focusAfterRedraw("[data-cm-details-menu]");
    if (balanceOf(card) > 0) return openTransfer(card, copy, mode);
    if (!status) return;
    status.confirm({
      title: copy.confirm.title,
      text: copy.confirm.text,
      confirmLabel: copy.confirm.confirmLabel,
      icon: copy.confirm.icon,
      danger: true,
      onConfirm: function () {
        finish(card, copy, 0, null, mode);
      },
    });
  }

  cm.on("close", function (payload) {
    if (payload && payload.cardId) start("close", payload.cardId);
  });
  cm.on("remove", function (payload) {
    if (payload && payload.cardId) start("remove", payload.cardId);
  });
})();

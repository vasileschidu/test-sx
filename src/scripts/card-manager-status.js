/**
 * card-manager-status.js
 * S7 - Lock / Unlock a card (SMART Hub, Cards Manager). TCDM-5226, wiki card-manager.md 4.7.
 * Figma: dialog frame 8015:143240 (modal 8016:145570).
 *
 * CardManager `lock` { cardId }   -> confirm dialog; "Yes, lock the card" sets status "blocked".
 * CardManager `unlock` { cardId } -> status "active" at once, toast "Card unlocked."
 * Both then emit `data-change` so the details header and the list row redraw.
 *
 *   CardManagerStatus.confirm(opts)  the reusable confirm dialog (Close S8 / Remove S9):
 *     { title, text, confirmLabel, cancelLabel, icon, danger, onConfirm() }
 *     icon = file in assets/cards-manager (default icon-warning-amber.svg);
 *     danger = red Primary instead of blue-700 (Close / Remove).
 *     Icon, header with only the X, text centred, footer with two equal buttons
 *     (Cancel = Secondary, confirm = Primary 700). Cancel / X / Esc / backdrop just close it.
 *
 * Needs: onboarding-modal.js (OBModal), card-manager.js, shared.js (toast).
 * TODO(confirm): unlock needs no confirmation and no toast on lock (not in Figma / ticket default).
 */
(function () {
  "use strict";

  var cm = window.CardManager;
  if (!cm) return;

  var seq = 0;

  var PANEL =
    "relative flex w-full max-w-lg flex-col overflow-clip rounded-lg bg-white shadow-lg ring-1 ring-black/5 dark:bg-gray-900 dark:ring-white/10";
  var BTN_SECONDARY =
    "inline-flex flex-1 cursor-pointer items-center justify-center rounded-md bg-white px-3.5 py-2.5 text-base/6 font-semibold text-gray-700 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-white/10 dark:text-gray-300 dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/20 dark:hover:text-white dark:active:bg-white/25 dark:focus-visible:outline-blue-400";
  // Primary at the 700 shade (Figma): hover one step lighter, as the skill's Primary does.
  var BTN_PRIMARY =
    "inline-flex flex-1 cursor-pointer items-center justify-center rounded-md bg-blue-700 px-3.5 py-2.5 text-base/6 font-semibold text-white shadow-xs hover:bg-blue-600 active:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300 dark:disabled:bg-blue-500/40 dark:disabled:text-white/60 dark:focus-visible:outline-blue-400";

  var BTN_DANGER =
    "inline-flex flex-1 cursor-pointer items-center justify-center rounded-md bg-red-600 px-3.5 py-2.5 text-base/6 font-semibold text-white shadow-xs hover:bg-red-500 active:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 dark:bg-red-500 dark:hover:bg-red-400 dark:active:bg-red-600 dark:focus-visible:outline-red-400";

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

  function findCard(id) {
    var list = cm.data.smartCards || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /** Focus the card's ⋯ button after the details page redrew (the old one is gone). */
  function focusMenu() {
    var btn = document.querySelector("[data-cm-details-menu]");
    if (btn) btn.focus();
  }

  /** Reusable confirm dialog (Figma 8016:145570). Returns the OBModal backdrop. */
  function confirm(opts) {
    var ob = window.OBModal;
    if (!ob) return null;
    var titleId = "cm-confirm-title-" + ++seq;
    var header =
      '<div class="flex h-14 shrink-0 items-end justify-end px-4 pt-4">' +
      '<button type="button" data-ob-modal-close class="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-blue-600 dark:hover:bg-white/10 dark:focus-visible:outline-blue-400">' +
      '<span class="sr-only">Close</span>' +
      '<img src="' + assetUrl("icon-x.svg") + '" alt="" width="24" height="24" class="size-6" /></button></div>';
    var body =
      '<div class="flex flex-col items-center gap-6 px-6 pb-6 text-center">' +
      '<img src="' + assetUrl(opts.icon || "icon-warning-amber.svg") + '" alt="" width="44" height="44" class="size-11" />' +
      '<div class="flex flex-col gap-2">' +
      '<h2 id="' + titleId + '" class="text-lg/6 font-semibold text-gray-900 dark:text-white">' + esc(opts.title) + "</h2>" +
      '<p class="text-sm/5 font-normal text-gray-500 dark:text-gray-400">' + esc(opts.text) + "</p></div></div>";
    var footer =
      '<div class="flex gap-6 rounded-b-lg border-t border-gray-200 bg-white px-6 py-5 dark:border-white/10 dark:bg-gray-900">' +
      '<button type="button" data-ob-modal-close class="' + BTN_SECONDARY + '">' + esc(opts.cancelLabel || "Cancel") + "</button>" +
      '<button type="button" data-cm-confirm class="' + (opts.danger ? BTN_DANGER : BTN_PRIMARY) + '">' + esc(opts.confirmLabel) + "</button></div>";
    var backdrop = ob.open(body, titleId, { bare: true, header: header, footer: footer, panelClass: PANEL });
    backdrop.querySelector("[data-cm-confirm]").addEventListener("click", function () {
      ob.close();
      if (opts.onConfirm) opts.onConfirm();
    });
    return backdrop;
  }

  function setStatus(cardId, status) {
    var card = findCard(cardId);
    if (!card) return false;
    card.status = status;
    cm.emit("data-change", { reason: "status", cardId: cardId, status: status });
    return true;
  }

  cm.on("lock", function (payload) {
    var card = payload && findCard(payload.cardId);
    if (!card || card.status !== "active") return;
    // OBModal returns focus to whatever had it when it opened: make that the ⋯ button.
    focusMenu();
    confirm({
      title: "Lock your card temporarily?",
      text: "You can temporarily lock your card to restrict its usage without permanently closing it.",
      confirmLabel: "Yes, lock the card",
      onConfirm: function () {
        if (setStatus(card.id, "blocked")) focusMenu();
      },
    });
  });

  cm.on("unlock", function (payload) {
    var card = payload && findCard(payload.cardId);
    if (!card || card.status !== "blocked") return;
    setStatus(card.id, "active");
    focusMenu();
    if (typeof window.showGlobalTopToast === "function") window.showGlobalTopToast("Card unlocked.");
  });

  window.CardManagerStatus = { confirm: confirm };
})();

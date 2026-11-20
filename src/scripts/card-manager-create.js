/**
 * card-manager-create.js
 * S2 - Create a Card (SMART Hub, Cards Manager). TCDM-5221.
 *
 * Opens the "Create a Card" modal when CardManager emits `create-card` (the Create
 * button of the empty state, and **+ Create New** of the list), validates it, adds the
 * card to CardManager.data.smartCards and shows the "Card created!" state.
 *
 * Figma (source of truth): balance section expanded 8007:156738, collapsed 8007:160992,
 * success 8007:156840 (modal 8007:156941).
 *
 *   CardManagerCreate.open()                 open the modal (same as the event)
 *   CardManagerCreate.cardVisualHtml(card)   the 320x200 card (Figma Card_VC), for the
 *                                            details page too: { last4, name, holder,
 *                                            expires, balance (or availableBalance), network,
 *                                            number, revealed }
 *
 * Reuses: OBModal (dialog shell), OBField (the SMART System "Text Field [New]": inputs,
 * labels, error text and icon), CardManagerAccountPicker (Origination Account), the
 * info tooltip, the details card and the skill's Buttons / Link button classes.
 * Needs on the page: onboarding-modal.js, onboarding-field.js, card-manager.js,
 * card-manager-account-picker.js, Tailwind Plus Elements, payment-preferences-components.js
 * (card logos).
 *
 * Rules (wiki card-manager.md §4.2): holder details come from the business profile and
 * are read-only (BR-1); no vendor and no manual / auto choice (BR-2); with the balance
 * section open the amount must be > 0 (BR-3).
 * TODO(confirm): the Card Name error text and max length; the Card Name tooltip text
 * (Figma shows lorem ipsum); whether a Closed card's origination list should differ.
 */
(function () {
  "use strict";

  var DEFAULT_HOLDER = {
    name: "ABC Corporation",
    address: "1 Chapel Hill Rd\nHeswall, Short Hills\nNJ 07078, US",
  };

  // TODO(confirm): Figma has lorem ipsum here.
  var TIP_NAME = "A name to recognise this card in your list.";
  // Same wording as the Origination Account tooltip on the Pay page.
  var TIP_ORIGIN =
    "Please note that the balance shown is as provided by your bank. On occasion, it might not always account for pending transactions.";

  var seq = 0;

  /* ---------- helpers ---------- */

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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

  /** "2028-05" -> "05/2028" */
  function mmyyyy(value) {
    var m = /^(\d{4})-(\d{2})/.exec(String(value || ""));
    return m ? m[2] + "/" + m[1] : "";
  }

  function assetUrl(file) {
    var path = window.location.pathname || "";
    var at = path.indexOf("/src/pages/");
    var root = at >= 0 ? path.slice(0, at) : "";
    return root + "/src/assets/cards-manager/" + file;
  }

  function randomDigits(count) {
    var out = "";
    for (var i = 0; i < count; i++) out += Math.floor(Math.random() * 10);
    return out;
  }

  /* ---------- markup ---------- */

  var ICON_INFO =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4.5"><path fill-rule="evenodd" clip-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" /></svg>';

  var ICON_CHEVRON_DOWN =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 shrink-0 transition-transform duration-200 motion-reduce:transition-none group-aria-expanded/toggle:rotate-180"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" /></svg>';

  var ICON_EYE =
    '<svg data-icon="reveal" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="size-4 text-blue-500 dark:text-blue-400"><path d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M0.882274 7.63113C1.87378 4.65047 4.68527 2.5 8.00035 2.5C11.3139 2.5 14.1243 4.64848 15.117 7.62697C15.1973 7.86768 15.1973 8.12812 15.1172 8.36887C14.1257 11.3495 11.3142 13.5 7.99918 13.5C4.68565 13.5 1.87522 11.3515 0.882492 8.37303C0.802265 8.13233 0.802188 7.87188 0.882274 7.63113ZM11.5 8C11.5 9.933 9.933 11.5 8 11.5C6.067 11.5 4.5 9.933 4.5 8C4.5 6.067 6.067 4.5 8 4.5C9.933 4.5 11.5 6.067 11.5 8Z"/></svg>';

  var ICON_EYE_SLASH =
    '<svg data-icon="hide" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="size-4 hidden text-blue-500 dark:text-blue-400"><path d="M2.35355 1.64645C2.15829 1.45118 1.84171 1.45118 1.64645 1.64645C1.45118 1.84171 1.45118 2.15829 1.64645 2.35355L13.6464 14.3536C13.8417 14.5488 14.1583 14.5488 14.3536 14.3536C14.5488 14.1583 14.5488 13.8417 14.3536 13.6464L2.35355 1.64645Z"/><path d="M15.1172 8.36887C14.7546 9.45913 14.1484 10.4383 13.3631 11.2418L11.2975 9.17615C11.4286 8.80857 11.5 8.41262 11.5 8C11.5 6.067 9.933 4.5 8 4.5C7.58738 4.5 7.19143 4.5714 6.82385 4.70253L5.17265 3.05133C6.04522 2.69587 6.99985 2.5 8.00035 2.5C11.3139 2.5 14.1243 4.64848 15.117 7.62697C15.1973 7.86768 15.1973 8.12812 15.1172 8.36887Z"/><path d="M10.5 8C10.5 8.12011 10.4915 8.23824 10.4752 8.35383L7.64617 5.52485C7.76176 5.50847 7.87989 5.5 8 5.5C9.38071 5.5 10.5 6.61929 10.5 8Z"/><path d="M8.35383 10.4752L5.52485 7.64617C5.50847 7.76176 5.5 7.87989 5.5 8C5.5 9.38071 6.61929 10.5 8 10.5C8.12011 10.5 8.23824 10.4915 8.35383 10.4752Z"/><path d="M4.5 8C4.5 7.58738 4.5714 7.19143 4.70253 6.82385L2.63662 4.75794C1.85124 5.56148 1.24498 6.54076 0.882274 7.63113C0.802188 7.87188 0.802265 8.13233 0.882492 8.37303C1.87522 11.3515 4.68565 13.5 7.99918 13.5C8.9998 13.5 9.95455 13.3041 10.8272 12.9485L9.17615 11.2975C8.80857 11.4286 8.41262 11.5 8 11.5C6.067 11.5 4.5 9.933 4.5 8Z"/></svg>';

  var PANEL_CREATE =
    "relative flex w-full max-w-150 flex-col rounded-lg bg-white shadow-xl dark:bg-gray-900 dark:ring-1 dark:ring-white/10";
  // Modal rule: every dialog is rounded-lg (8px), even where Figma draws the success modal at 10px.
  var PANEL_SUCCESS =
    "relative flex w-full max-w-130.5 flex-col rounded-lg bg-white shadow-xl dark:bg-gray-900 dark:ring-1 dark:ring-white/10";

  // Buttons from the components skill (Secondary / Primary, size xl `px-3.5 py-2.5`);
  // the modal footer runs them at text-base as in Figma (variant noted in the skill).
  var BTN_SECONDARY =
    "inline-flex flex-1 cursor-pointer items-center justify-center rounded-md bg-white px-3.5 py-2.5 text-base font-semibold text-gray-900 " +
    "shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 " +
    "dark:bg-white/10 dark:text-white dark:inset-ring-white/10 dark:hover:bg-white/20";

  var BTN_PRIMARY =
    "inline-flex flex-1 cursor-pointer items-center justify-center rounded-md bg-blue-600 px-3.5 py-2.5 text-base font-semibold text-white " +
    "shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 " +
    "disabled:cursor-not-allowed disabled:bg-blue-300 dark:disabled:bg-blue-500/40 dark:disabled:text-white/60";

  // Link button from the skill (Add card / Filter / Download style).
  var LINK_BTN =
    "inline-flex cursor-pointer items-center gap-1.5 rounded-md font-semibold text-blue-600 hover:text-blue-700 " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-blue-400 dark:hover:text-blue-300";

  var CLOSE_BTN =
    '<button type="button" data-ob-modal-close class="shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-300 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400">' +
    '<span class="sr-only">Close</span>' +
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="size-5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>';

  /** Information circle + Tooltip (components skill). */
  function tip(id, text, label) {
    return (
      '<span class="group/info relative inline-flex size-5 items-center justify-center">' +
      '<span tabindex="0" role="button" aria-describedby="' + id + '" class="inline-flex cursor-help rounded-full text-gray-400 hover:text-gray-900 focus-visible:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 dark:text-gray-500 dark:hover:text-white dark:focus-visible:text-white dark:focus-visible:outline-blue-400">' +
      '<span class="sr-only">' + esc(label) + "</span>" + ICON_INFO + "</span>" +
      '<span id="' + id + '" role="tooltip" class="pointer-events-none invisible absolute top-full left-1/2 z-30 mt-3 w-max max-w-64 -translate-x-2/5 sm:max-w-[343px] rounded-lg bg-gray-900 p-3 text-left text-sm/5 font-normal text-gray-100 opacity-0 shadow-xs transition-opacity duration-150 group-hover/info:visible group-hover/info:opacity-100 group-has-focus-visible/info:visible group-has-focus-visible/info:opacity-100 before:absolute before:-top-1 before:left-2/5 before:size-3 before:-translate-x-1/2 before:rotate-45 before:rounded-[2px] before:bg-inherit dark:bg-gray-950 dark:ring-1 dark:ring-white/10">' +
      esc(text) + "</span></span>"
    );
  }

  function row(label, valueHtml, dataAttr) {
    return (
      '<div class="grid grid-cols-2 gap-6 self-stretch">' +
      '<span class="text-sm/5 font-medium text-gray-900 dark:text-gray-100">' + esc(label) + "</span>" +
      '<span class="text-sm/5 font-normal whitespace-pre-line text-gray-700 dark:text-gray-300"' +
      (dataAttr ? " " + dataAttr : "") + ">" + valueHtml + "</span></div>"
    );
  }

  /** A text field: OBField label + input + error line (same structure as sx-enroll textField). */
  function textField(id, label, tipHtml, inputExtra, leadingIcon) {
    var F = window.OBField;
    return (
      '<div class="flex w-full flex-col gap-1">' +
      '<div class="flex items-start gap-1">' +
      '<label for="' + id + '" class="' + F.LABEL + '">' + esc(label) + "</label>" + (tipHtml || "") + "</div>" +
      '<div class="relative">' +
      (leadingIcon || "") +
      '<input id="' + id + '" aria-invalid="false" aria-describedby="' + id + '-error" class="' + F.INPUT + (leadingIcon ? " pl-10" : "") + '" ' + inputExtra + " />" +
      F.errorIcon() +
      "</div>" +
      '<p id="' + id + '-error" role="alert" class="hidden ' + F.ERROR_TEXT + '"></p></div>'
    );
  }

  /** The 320x200 card (Figma Card_VC 8007:156947). */
  function cardVisualHtml(card) {
    card = card || {};
    var balance = card.balance != null ? card.balance : card.availableBalance;
    var number = card.revealed && card.number
      ? card.number
      : "•••• •••• •••• " + esc(card.last4 || "0000");
    var exp = mmyyyy(card.expires);
    var short = exp ? exp.slice(0, 3) + exp.slice(5) : "";
    var mark = "";
    var pp = window.PPComponents;
    if (String(card.network || "").toLowerCase() === "visa" && pp && pp.getCardBrandLogoMarkup) {
      mark = pp.getCardBrandLogoMarkup("visa", "small");
    } else {
      mark = '<img src="' + assetUrl("card-mastercard-mark.svg") + '" alt="" width="35" height="22" class="h-5.5 w-auto" />';
    }
    return (
      '<div data-cm-card-visual class="relative flex h-50 w-80 shrink-0 flex-col overflow-hidden rounded-xl border border-white/30 bg-[#142435] p-5 text-white shadow-lg">' +
      '<div class="mt-auto flex flex-col">' +
      '<p class="text-[28px]/8 font-bold">' + esc(money(balance)) + "</p>" +
      '<div class="mt-2 flex flex-col gap-2">' +
      '<p data-cm-card-number class="font-mono text-lg/6">' + number + "</p>" +
      '<div class="flex items-center gap-1 pl-14">' +
      '<span class="font-mono text-[8px]/[1] font-bold">VALID<br />THRU</span>' +
      '<span class="font-mono text-sm/6">' + esc(short) + "</span>" +
      "</div></div>" +
      '<div class="mt-4 flex h-9 items-end gap-4">' +
      '<p class="min-w-0 flex-1 truncate font-mono text-sm/5 font-medium uppercase">' + esc(card.holder && card.holder.name) + "</p>" +
      '<span class="flex shrink-0 items-end">' + mark + "</span>" +
      "</div></div></div>"
    );
  }

  function holderOf(data) {
    var first = data && data.smartCards && data.smartCards[0];
    return (first && first.holder) || DEFAULT_HOLDER;
  }

  /* ---------- create modal ---------- */

  function createBody(ids, holder) {
    var F = window.OBField;
    return (
      '<form id="' + ids.form + '" novalidate class="flex flex-col gap-6 p-6">' +
      // Card Holder Details: read-only (BR-1), details card from the components skill.
      '<div class="flex flex-col items-start self-stretch">' +
      '<div class="flex items-center justify-between self-stretch rounded-t-md border border-gray-200 bg-gray-100 px-4 py-2 dark:border-white/10 dark:bg-white/10">' +
      '<span class="text-sm/5 font-semibold text-gray-900 dark:text-gray-100">Card Holder Details</span></div>' +
      '<div class="flex flex-col items-start gap-2 self-stretch rounded-b-md border-r border-b border-l border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">' +
      row("Name on Card", esc(holder.name)) + row("Address", esc(holder.address)) + "</div></div>" +
      // Card Name
      textField(ids.name, "Card Name", tip(ids.nameTip, TIP_NAME, "About Card Name"), 'name="cardName" type="text" autocomplete="off"') +
      // Optional balance, collapsed by default. No info icon: Figma hides it.
      '<div class="flex flex-col rounded-md bg-gray-50 p-4 dark:bg-white/5">' +
      '<div class="flex items-center justify-between gap-4">' +
      '<button type="button" id="' + ids.toggle + '" aria-expanded="false" aria-controls="' + ids.panel + '" class="group/toggle ' + LINK_BTN + ' text-left text-base/6">' +
      ICON_CHEVRON_DOWN + "<span>Would you like to assign a balance to the card?</span></button>" +
      '<span class="shrink-0 text-sm/5 font-medium text-gray-400 dark:text-gray-500">Optional</span></div>' +
      '<div id="' + ids.panel + '" class="grid grid-rows-[0fr] transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none">' +
      '<div inert class="min-h-0 overflow-hidden opacity-0 transition-opacity duration-200 ease-out motion-reduce:transition-none">' +
      '<div class="flex flex-col gap-4 pt-6">' +
      // Origination account: the C1 account picker (Card / Bank Account groups, balances)
      '<div class="flex w-full flex-col gap-1">' +
      '<div class="flex items-start gap-1"><span class="' + F.LABEL + '">Origination Account</span>' +
      tip(ids.originTip, TIP_ORIGIN, "About Origination Account") + "</div>" +
      '<div id="' + ids.originHost + '"></div></div>' +
      // Amount (half width, as in Figma)
      '<div class="grid grid-cols-2 gap-6">' +
      textField(ids.amount, "Amount", "", 'name="amount" type="text" inputmode="decimal" autocomplete="off" placeholder="0.00"',
        '<img src="' + assetUrl("icon-currency-dollar.svg") + '" alt="" width="20" height="20" class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2" />') +
      "</div></div></div></div></div>" +
      "</form>"
    );
  }

  function createHeader(titleId) {
    return (
      '<div class="flex items-center gap-6 border-b border-gray-200 py-3 pr-4 pl-6 dark:border-white/10">' +
      '<h2 id="' + titleId + '" class="min-w-0 flex-1 text-lg/6 font-medium text-gray-900 dark:text-white">Create a Card</h2>' +
      CLOSE_BTN + "</div>"
    );
  }

  function createFooter(formId) {
    return (
      '<div class="flex items-start gap-6 rounded-b-lg border-t border-gray-200 px-6 py-5 dark:border-white/10">' +
      '<button type="button" data-ob-modal-close class="' + BTN_SECONDARY + '">Cancel</button>' +
      '<button type="submit" form="' + formId + '" class="' + BTN_PRIMARY + '">Create</button></div>'
    );
  }

  /** Builds the new card object and adds it to CardManager.data (the prototype has no backend). */
  function makeCard(data, name, holder, balance) {
    var taken = (data.smartCards || []).map(function (c) { return c.last4; });
    var last4;
    do { last4 = randomDigits(4); } while (taken.indexOf(last4) !== -1);
    var now = new Date();
    var expires = new Date(now.getFullYear() + 3, now.getMonth(), 1);
    var iso = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" +
      String(now.getDate()).padStart(2, "0") + "T" + String(now.getHours()).padStart(2, "0") + ":" +
      String(now.getMinutes()).padStart(2, "0") + ":00";
    return {
      id: "sc_" + last4,
      last4: last4,
      network: "mastercard",
      name: name,
      holder: holder,
      status: "active",
      availableBalance: balance,
      currentBalance: balance,
      currency: "USD",
      expires: expires.getFullYear() + "-" + String(expires.getMonth() + 1).padStart(2, "0"),
      createdAt: iso,
      adminNumber: randomDigits(14),
      number: "5555 5555 5555 " + last4,
      cvc: randomDigits(3),
      bills: [],
      transactions: [],
    };
  }

  function openCreate() {
    var cm = window.CardManager;
    var ob = window.OBModal;
    var F = window.OBField;
    var picker = window.CardManagerAccountPicker;
    if (!cm || !ob || !F || !picker) {
      console.error("Create a Card needs card-manager.js, onboarding-modal.js, onboarding-field.js and card-manager-account-picker.js on the page.");
      return;
    }
    var uid = ++seq;
    var ids = {
      form: "cm-create-form-" + uid, title: "cm-create-title-" + uid, name: "cm-create-name-" + uid,
      nameTip: "cm-create-name-tip-" + uid, toggle: "cm-create-toggle-" + uid, panel: "cm-create-balance-" + uid,
      originHost: "cm-create-origin-" + uid, originTip: "cm-create-origin-tip-" + uid, amount: "cm-create-amount-" + uid,
    };
    var holder = holderOf(cm.data);
    var backdrop = ob.open(createBody(ids, holder), ids.title, {
      bare: true,
      header: createHeader(ids.title),
      footer: createFooter(ids.form),
      panelClass: PANEL_CREATE,
    });

    var form = backdrop.querySelector("#" + ids.form);
    var nameInput = backdrop.querySelector("#" + ids.name);
    var nameErr = backdrop.querySelector("#" + ids.name + "-error");
    var toggle = backdrop.querySelector("#" + ids.toggle);
    var panel = backdrop.querySelector("#" + ids.panel);
    var amountInput = backdrop.querySelector("#" + ids.amount);
    var amountErr = backdrop.querySelector("#" + ids.amount + "-error");
    // Origination Account = the C1 account picker: active SMART cards (Card group) and bank accounts.
    var origin = picker.mount(backdrop.querySelector("#" + ids.originHost), {
      sources: picker.fromData(cm.data),
      placeholder: "Select account",
      label: "Origination Account",
      name: "origination",
    });

    function balanceOpen() {
      return toggle.getAttribute("aria-expanded") === "true";
    }

    toggle.addEventListener("click", function () {
      var open = !balanceOpen();
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      panel.classList.toggle("grid-rows-[0fr]", !open);
      panel.classList.toggle("grid-rows-[1fr]", open);
      panel.firstElementChild.inert = !open;
      panel.firstElementChild.classList.toggle("opacity-0", !open);
      if (!open) {
        // Closing the section drops its errors; the values stay if it is opened again.
        origin.setError(null);
        F.setError(amountInput, false, amountErr, "");
      }
    });

    nameInput.addEventListener("input", function () { F.setError(nameInput, false, nameErr, ""); });
    if (window.ColumnFilter) window.ColumnFilter.attachAmount(amountInput); // US money input (TCDM-5238), bound first
    amountInput.addEventListener("input", function () {
      amountInput.value = amountInput.value.replace(/[^\d.,]/g, "");
      F.setError(amountInput, false, amountErr, "");
    });
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var name = nameInput.value.trim();
      var firstBad = null;
      var firstBadErr = null;

      // TODO(confirm): message text and max length.
      if (!name) {
        F.setError(nameInput, true, nameErr, "Enter a card name.");
        firstBad = nameInput; firstBadErr = nameErr;
      } else {
        F.setError(nameInput, false, nameErr, "");
      }

      var amount = 0;
      if (balanceOpen()) {
        if (!origin.getValue()) {
          origin.setError("Select an origination account.");
          if (!firstBad) { firstBad = origin.el.querySelector("button"); firstBadErr = origin.el.querySelector("[data-picker-error]"); }
        }
        amount = parseFloat(String(amountInput.value).replace(/,/g, ""));
        if (!(amount > 0)) {
          F.setError(amountInput, true, amountErr, "Amount must be greater than 0."); // BR-3
          if (!firstBad) { firstBad = amountInput; firstBadErr = amountErr; }
        }
      }

      if (firstBad) {
        ob.revealField(firstBad, firstBadErr);
        return;
      }

      var card = makeCard(cm.data, name, holder, balanceOpen() ? Math.round(amount * 100) / 100 : 0);
      cm.data.smartCards.unshift(card);
      cm.emit("data-change", { reason: "card-created", cardId: card.id });
      cm.emit("card-created", { cardId: card.id });
      openSuccess(card);
    });

    nameInput.focus();
  }

  /* ---------- success: "Card created!" ---------- */

  function openSuccess(card) {
    var ob = window.OBModal;
    var uid = ++seq;
    var titleId = "cm-created-title-" + uid;
    var revealed = false;

    var header =
      '<div class="flex h-14 shrink-0 items-start justify-end px-4 pt-4">' + CLOSE_BTN + "</div>";
    var body =
      '<div class="flex flex-col items-center gap-4 p-4">' +
      '<img src="' + assetUrl("icon-check-circle-green.svg") + '" alt="" width="44" height="44" class="size-11" />' +
      '<h2 id="' + titleId + '" class="text-lg/6 font-semibold text-gray-900 dark:text-white">Card created!</h2>' +
      '<div data-cm-created-visual>' + cardVisualHtml(card) + "</div>" +
      '<div class="flex w-full flex-col items-start gap-2 rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">' +
      row("Name on Card", esc(card.holder.name)) +
      row("Card Name", esc(card.name)) +
      row("Number", "•••• " + esc(card.last4), "data-cm-number") +
      row("CVC2", "•••", "data-cm-cvc") +
      row("Expires", esc(mmyyyy(card.expires))) +
      row("Address", esc(card.holder.address)) +
      '<div class="grid grid-cols-2 gap-6 self-stretch pt-2"><span></span>' +
      '<button type="button" data-cm-reveal aria-pressed="false" class="w-fit text-sm/5 ' + LINK_BTN + '">' +
      ICON_EYE + ICON_EYE_SLASH + '<span data-cm-reveal-label>Reveal Details</span></button></div>' +
      "</div></div>";
    var footer =
      '<div class="flex rounded-b-lg border-t border-gray-200 bg-white px-6 py-5 dark:border-white/10 dark:bg-gray-900">' +
      '<button type="button" data-ob-modal-close class="' + BTN_PRIMARY + '">Done</button></div>';

    var backdrop = ob.open(body, titleId, { bare: true, header: header, footer: footer, panelClass: PANEL_SUCCESS });

    backdrop.querySelector("[data-cm-reveal]").addEventListener("click", function (event) {
      revealed = !revealed;
      var btn = event.currentTarget;
      btn.setAttribute("aria-pressed", revealed ? "true" : "false");
      btn.querySelector('[data-icon="reveal"]').classList.toggle("hidden", revealed);
      btn.querySelector('[data-icon="hide"]').classList.toggle("hidden", !revealed);
      btn.querySelector("[data-cm-reveal-label]").textContent = revealed ? "Hide Details" : "Reveal Details";
      backdrop.querySelector("[data-cm-number]").textContent = revealed ? card.number : "•••• " + card.last4;
      backdrop.querySelector("[data-cm-cvc]").textContent = revealed ? card.cvc : "•••";
      backdrop.querySelector("[data-cm-created-visual]").innerHTML = cardVisualHtml(
        Object.assign({}, card, { revealed: revealed })
      );
    });
  }

  window.CardManagerCreate = { open: openCreate, cardVisualHtml: cardVisualHtml };

  function bind() {
    if (window.CardManager) window.CardManager.on("create-card", openCreate);
  }
  if (window.CardManager) bind();
  else document.addEventListener("DOMContentLoaded", bind);
})();

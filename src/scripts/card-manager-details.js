/**
 * card-manager-details.js
 * Cards Manager S3: Card details page (TCDM-5222, wiki card-manager.md 4.3, BR-8, BR-11,
 * Figma 8014:104715, menu 8014:127731, locked 8016:145592, expired 8018:168968).
 * Content, structure and copy follow Figma exactly; nothing is invented.
 *
 * Draws into CardManager.mount('details') whenever CardManager.route.card is set and clears
 * it otherwise. Needs card-manager.js, payment-preferences-components.js (brand flag) and
 * Tailwind Plus Elements (menu).
 *
 * Header by status (Figma): Active = Add Funds + menu (Transfer Funds, Export Monthly
 * Statements, Lock, Close | Remove); Blocked = Unlock Card (Secondary) + menu (Close | Remove);
 * Expired = red Remove text button only; the badge shows for non-Active cards only.
 *
 * Sub-tab = `?view=` (absent = Card Details, `bills`, `transactions`). card-manager.js only knows
 * tab / card, so this script reads and writes `view` itself (pushState on a tab click; the
 * shell's popstate emits `route`, which re-reads it). CardManager.navigate() rebuilds the URL
 * without `view`, so Back to the list is clean.
 *
 * Events (CardManager.emit, payload { cardId }): add-funds, transfer, statements, lock, unlock,
 * close, remove, and `export-history` { cardId, view } (the Export button, shown on the Bill History
 * and Transaction History sub-tabs only, left of the primary button; disabled while the tab has no rows). Modals belong to other stories. Also `details-tab` { cardId, view } on open and
 * on every sub-tab change: Bill History (5229) and Transaction History (5230) draw into the empty
 * [data-cm-details-panel="bills"] / [data-cm-details-panel="transactions"].
 *
 * TODO(confirm), not in Figma: Closed card (badge only, no buttons); the revealed state
 * (label "Hide Details", real number and CVC); "Card not found". Copy Admin Number is the Consumer My Cards button (gray icon, shared copyTextWithFeedback "Copied" tooltip).
 */
(function () {
  "use strict";

  var cm = window.CardManager;
  if (!cm) return;

  var VIEWS = [
    { key: "details", label: "Card Details" },
    { key: "bills", label: "Bill History" },
    { key: "transactions", label: "Transaction History" },
  ];

  // Same Badge colours as the list. Active shows no badge on the details page (Figma).
  var STATUS = {
    blocked: {
      label: "Blocked",
      badge:
        "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-400",
    },
    expired: {
      label: "Expired",
      badge:
        "border-red-200 bg-red-100 text-red-800 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-400",
    },
    closed: {
      label: "Closed",
      badge:
        "border-gray-200 bg-gray-100 text-gray-800 dark:border-white/15 dark:bg-white/10 dark:text-gray-300",
    },
  };

  var ITEM = {
    transfer: { event: "transfer", label: "Transfer Funds" },
    statements: { event: "statements", label: "Export Monthly Statements" },
    lock: { event: "lock", label: "Lock" },
    close: { event: "close", label: "Close" },
    remove: { event: "remove", label: "Remove", danger: true },
  };
  // BR-8 as drawn in Figma: primary = header button, items = the menu (null = no menu).
  var ACTIONS = {
    active: { primary: "add-funds", items: ["transfer", "statements", "lock", "close", "remove"] },
    blocked: { primary: "unlock", items: ["close", "remove"] },
    expired: { primary: "remove", items: [] },
    // TODO(confirm): Closed is not in Figma; no buttons.
    closed: { primary: null, items: [] },
  };

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  var BTN_PRIMARY =
    "inline-flex cursor-pointer items-center justify-center rounded-md bg-blue-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300 dark:disabled:bg-blue-500/40 dark:disabled:text-white/60";
  var BTN_SECONDARY =
    "inline-flex cursor-pointer items-center justify-center rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-700 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10 dark:text-gray-300 dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/20 dark:hover:text-white dark:focus-visible:outline-blue-400";
  var BTN_REMOVE =
    "inline-flex cursor-pointer items-center justify-center rounded-md px-2.5 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300 dark:focus-visible:outline-red-400";
  var BTN_ICON =
    "inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden aria-expanded:ring-2 aria-expanded:ring-blue-600 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-200 dark:focus-visible:ring-blue-400 dark:aria-expanded:ring-blue-400";
  var TAB_BASE =
    "inline-flex h-10.5 shrink-0 cursor-pointer items-center border-b-2 py-2.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400";
  var TAB_ON = "border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-300";
  var TAB_OFF =
    "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200";
  var LINK_BTN =
    "inline-flex cursor-pointer items-center gap-1.5 rounded-sm text-xs font-semibold text-blue-600 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-blue-400 dark:hover:text-blue-300 dark:focus-visible:outline-blue-400";
  var BAR =
    '<span class="h-3.25 w-8 rounded-full bg-gray-200 dark:bg-white/15"></span>';

  var ICON_BACK =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" clip-rule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" /></svg>';
  var ICON_DOTS =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path d="M3 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM8.5 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM15.5 8.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" /></svg>';
  var ICON_EYE =
    '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="size-4 text-blue-500 dark:text-blue-400"><path d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /><path fill-rule="evenodd" clip-rule="evenodd" d="M.882 7.631A7.5 7.5 0 0 1 8 2.5c3.314 0 6.124 2.148 7.117 5.127.08.241.08.501 0 .742A7.5 7.5 0 0 1 8 13.5c-3.314 0-6.125-2.148-7.118-5.127a1.19 1.19 0 0 1 0-.742ZM11.5 8a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" /></svg>';
  var ICON_EYE_SLASH =
    '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="size-4 text-blue-500 dark:text-blue-400"><path d="M2.354 1.646a.5.5 0 1 0-.708.708l12 12a.5.5 0 0 0 .708-.708l-12-12Z" /><path d="M15.117 8.369a7.46 7.46 0 0 1-1.754 2.873L11.298 9.176A3.5 3.5 0 0 0 8 4.5c-.413 0-.809.071-1.176.203L5.173 3.051A7.4 7.4 0 0 1 8 2.5c3.314 0 6.124 2.148 7.117 5.127.08.241.08.501 0 .742Z" /><path d="M4.5 8c0-.413.071-.809.203-1.176L2.637 4.758a7.46 7.46 0 0 0-1.755 2.873 1.19 1.19 0 0 0 0 .742C1.875 11.352 4.686 13.5 8 13.5c1 0 1.955-.196 2.827-.551L9.176 11.298A3.5 3.5 0 0 1 4.5 8Z" /></svg>';
  var ICON_COPY =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z" /><path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z" /></svg>';
  var mount = null;
  var current = null; // { id, view, revealed }
  var lastSignature = "";

  /* ---------- helpers ---------- */

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function amount(value) {
    return (
      "$" +
      (Number(value) || 0).toLocaleString("en-US", {
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

  /** "2023-04-12T12:28:00" -> "12 Apr 2023, 12:28" */
  function created(value) {
    var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(value || ""));
    if (!m) return "";
    return Number(m[3]) + " " + MONTHS[Number(m[2]) - 1] + " " + m[1] + ", " + m[4] + ":" + m[5];
  }

  function iconUrl(file) {
    var path = window.location.pathname || "";
    var at = path.indexOf("/src/pages/");
    return (at >= 0 ? path.slice(0, at) : "") + "/assets/icons/" + file;
  }

  function assetUrl(file) {
    var path = window.location.pathname || "";
    var at = path.indexOf("/src/pages/");
    var root = at >= 0 ? path.slice(0, at) : "";
    return root + "/src/assets/cards-manager/" + file;
  }

  function findCard(id) {
    var list = cm.data.smartCards || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function viewFromUrl() {
    var v = new URLSearchParams(window.location.search).get("view");
    return v === "bills" || v === "transactions" ? v : "details";
  }

  function writeView(view, replace) {
    var params = new URLSearchParams(window.location.search);
    if (view === "details") params.delete("view");
    else params.set("view", view);
    var query = params.toString();
    var url = window.location.pathname.split("/").pop() + (query ? "?" + query : "");
    window.history[replace ? "replaceState" : "pushState"](null, "", url);
  }

  function signature(card) {
    return [card.id, card.status, card.name, card.availableBalance, card.currentBalance].join("|");
  }

  /* ---------- markup ---------- */

  function menuHtml(items) {
    if (!items.length) return "";
    function item(key) {
      var it = ITEM[key];
      var cls = it.danger
        ? "text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10 dark:focus:bg-red-500/10 dark:focus:text-red-300"
        : "text-gray-900 hover:bg-gray-100 focus:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/5 dark:hover:text-white dark:focus:bg-white/5 dark:focus:text-white";
      return (
        '<button type="button" data-cm-details-action="' + it.event + '" class="block w-full cursor-pointer px-3.5 py-2 text-left text-sm/5 whitespace-nowrap focus:outline-hidden ' +
        cls + '">' + esc(it.label) + "</button>"
      );
    }
    // The destructive item sits below a divider (Figma).
    var normal = items.filter(function (k) { return !ITEM[k].danger; }).map(item).join("");
    var danger = items.filter(function (k) { return ITEM[k].danger; }).map(item).join("");
    return (
      '<el-dropdown class="inline-block">' +
      '<button type="button" data-cm-details-menu class="' + BTN_ICON + '">' +
      '<span class="sr-only">Open options</span>' + ICON_DOTS + "</button>" +
      '<el-menu anchor="bottom end" popover class="w-50 rounded-md bg-white shadow-lg outline-1 outline-black/5 [--anchor-gap:--spacing(2)] dark:bg-gray-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10 transition transition-discrete data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-100 data-leave:ease-in motion-reduce:transition-none">' +
      '<div class="py-1">' + normal + "</div>" +
      (danger ? '<div class="border-t border-gray-100 py-1 dark:border-white/10">' + danger + "</div>" : "") +
      "</el-menu></el-dropdown>"
    );
  }

  function primaryHtml(key) {
    if (key === "add-funds") return '<button type="button" data-cm-details-action="add-funds" class="' + BTN_PRIMARY + '">Add Funds</button>';
    if (key === "unlock") return '<button type="button" data-cm-details-action="unlock" class="' + BTN_SECONDARY + '">Unlock Card</button>';
    if (key === "remove") return '<button type="button" data-cm-details-action="remove" class="' + BTN_REMOVE + '">Remove</button>';
    return "";
  }

  /**
   * Export (Figma 8019:120161 / 8024:126638): Secondary, left of the primary button, only on the
   * Bill History and Transaction History sub-tabs; hidden / disabled by paintExport().
   */
  function exportHtml() {
    return '<button type="button" hidden data-cm-details-action="export-history" class="' + BTN_SECONDARY + ' disabled:hover:bg-white disabled:hover:text-gray-700 dark:disabled:hover:bg-white/10 dark:disabled:hover:text-gray-300">Export</button>';
  }

  function headerHtml(card) {
    var st = STATUS[card.status];
    var acts = ACTIONS[card.status] || ACTIONS.closed;
    var right = exportHtml() + primaryHtml(acts.primary) + menuHtml(acts.items);
    return (
      '<div class="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 px-6 py-5 dark:border-white/10">' +
      '<div class="flex min-w-60 flex-1 items-center gap-4">' +
      '<button type="button" data-cm-details-back aria-label="Back to SMART Cards" class="' + BTN_ICON.replace("text-gray-500", "text-gray-400") + '">' + ICON_BACK + "</button>" +
      '<h2 data-cm-details-title class="min-w-0 truncate text-2xl/8 font-semibold text-gray-900 dark:text-white" title="' + esc(card.name) + '">' + esc(card.name) + "</h2>" +
      (st
        ? '<span data-cm-details-status class="inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-xs/4 font-medium ' + st.badge + '">' + esc(st.label) + "</span>"
        : "") +
      "</div>" +
      '<div class="flex shrink-0 items-center gap-2">' + right + "</div>" +
      "</div>"
    );
  }

  function tabsHtml() {
    return (
      '<div class="px-6 pt-2">' +
      '<div role="tablist" aria-label="Card sections" class="flex items-center gap-6 overflow-x-auto border-b border-gray-200 dark:border-white/10">' +
      VIEWS.map(function (v) {
        return (
          '<button type="button" role="tab" id="cm-details-tab-' + v.key + '" data-cm-details-tab="' + v.key + '" aria-controls="cm-details-panel" class="' + TAB_BASE + '">' +
          esc(v.label) + "</button>"
        );
      }).join("") +
      "</div></div>"
    );
  }

  /** The 320x200 card (Figma): navy, square bottom corners, the info panel tucks under it. */
  function cardVisual(card, revealed) {
    // Same "Card_VC" as the Consumer Portal My Cards page: flat #142435, 20px padding,
    // Roboto Mono details, square bottom so the details panel tucks under it.
    var exp = mmyyyy(card.expires);
    var short = exp ? exp.slice(0, 3) + exp.slice(5) : "";
    var number = revealed && card.number ? esc(card.number) : "•••• •••• •••• " + esc(card.last4);
    var network = String(card.network || "").toLowerCase();
    var mark;
    if (network === "visa" && window.PPComponents && window.PPComponents.getCardBrandLogoMarkup) {
      mark = '<span class="[&>img]:h-[22px] [&>img]:w-auto">' + window.PPComponents.getCardBrandLogoMarkup("visa", "large") + "</span>";
    } else {
      mark = '<img src="' + iconUrl("mastercard-card-logo.svg") + '" alt="Mastercard" class="h-[22px] w-auto shrink-0" />';
    }
    return (
      '<div data-cm-card-visual class="relative z-10 flex h-[200px] w-full max-w-80 flex-col justify-end overflow-hidden rounded-t-xl border-[0.94px] border-white/30 bg-[#142435] p-5 text-white shadow-lg font-[\'Roboto_Mono\',ui-monospace,monospace]">' +
      '<div class="flex h-[108px] flex-col justify-end">' +
      '<p class="font-[Inter] text-[28px] leading-8 font-bold tabular-nums">' + esc(amount(card.availableBalance)) + "</p>" +
      '<div class="flex flex-col gap-2">' +
      '<p data-cm-card-number class="text-lg/6 whitespace-nowrap">' + number + "</p>" +
      '<div class="flex items-center gap-1 pl-14">' +
      '<span class="text-[8px] leading-[normal] font-bold uppercase">Valid<br />Thru</span>' +
      '<span class="text-sm/6">' + esc(short) + "</span></div></div></div>" +
      '<div class="flex h-9 items-end gap-4">' +
      '<span class="min-w-0 flex-1 truncate text-sm/5 font-medium uppercase">' + esc(card.holder && card.holder.name) + "</span>" +
      mark + "</div></div>"
    );
  }

  function infoRow(label, valueHtml, attr, revealed) {
    return (
      '<div class="flex items-center gap-4"><dt class="' + (revealed ? "" : "w-[120px] ") + 'shrink-0 text-sm/5 font-medium whitespace-nowrap text-gray-500 dark:text-gray-400">' + esc(label) + "</dt>" +
      '<dd class="flex min-w-0 flex-1 items-center justify-end gap-1 text-sm/5 whitespace-nowrap text-gray-900 tabular-nums dark:text-white"' + (attr ? " " + attr : "") + ">" + valueHtml + "</dd></div>"
    );
  }

  function infoPanel(card, revealed) {
    var pill = '<span class="inline-block h-[13px] w-8 rounded-full bg-gray-200 dark:bg-white/15"></span>';
    var number = revealed && card.number
      ? esc(card.number)
      : pill + pill + pill + '<span class="ml-1">' + esc(card.last4) + "</span>";
    var cvc = revealed && card.cvc ? esc(card.cvc) : pill;
    return (
      '<div class="-mt-4 flex w-full max-w-80 flex-col gap-3 rounded-lg border border-gray-200 px-3 pt-7 pb-3 dark:border-white/10">' +
      '<dl class="flex flex-col gap-2">' +
      infoRow("Card Number", number, "data-cm-details-number", revealed) +
      infoRow("Expires", esc(mmyyyy(card.expires)), "", revealed) +
      infoRow("CVC", cvc, "data-cm-details-cvc", revealed) +
      "</dl>" +
      '<div class="flex flex-col gap-3"><div class="h-px w-full bg-gray-200 dark:bg-white/10"></div>' +
      '<button type="button" data-cm-details-reveal aria-pressed="' + revealed + '" class="' + LINK_BTN + '">' +
      (revealed ? ICON_EYE_SLASH : ICON_EYE) + (revealed ? "Hide Details" : "Reveal Details") + "</button></div>" +
      "</div>"
    );
  }

  function balanceCell(label, value, currency, first, muted) {
    return (
      '<div class="flex flex-1 flex-col gap-1 p-6' +
      (first ? "" : " border-t border-gray-200 sm:border-t-0 sm:border-l dark:border-white/10") + '">' +
      '<span class="text-sm/5 font-medium text-gray-500 dark:text-gray-400">' + esc(label) + "</span>" +
      '<span class="flex items-baseline gap-1"><span class="text-2xl/8 font-semibold tabular-nums ' + (muted ? "text-gray-500 dark:text-gray-400" : "text-gray-950 dark:text-white") + '">' + esc(amount(value)) + "</span>" +
      '<span class="text-base/6 font-normal text-gray-500 dark:text-gray-400">' + esc(currency || "USD") + "</span></span></div>"
    );
  }

  function row(label, valueHtml) {
    return (
      '<div class="flex flex-col gap-1 sm:flex-row sm:gap-0">' +
      '<span class="text-sm/5 font-medium text-gray-900 sm:w-70 sm:shrink-0 dark:text-gray-100">' + esc(label) + "</span>" +
      '<span class="min-w-0 text-sm/5 font-normal break-words whitespace-pre-line text-gray-700 dark:text-gray-300">' + valueHtml + "</span></div>"
    );
  }

  // "Logo/Brand Flag" from the Consumer Portal My Cards page (navy 30x20, rounded 4px).
  var MASTERCARD_FLAG = '<span role="img" aria-label="Mastercard" class="inline-flex h-5 w-[30px] items-center justify-center rounded bg-[#01326F]">' +
    '<svg viewBox="0 0 20.3165 12.5581" fill="none" aria-hidden="true" class="h-[12.5px] w-[20.3px]">' +
      '<path d="M12.9046 1.34278H7.41101V11.2155H12.9046V1.34278Z" fill="#FF5F00"/>' +
      '<path d="M7.75981 6.28018C7.75879 5.32924 7.97417 4.39053 8.38963 3.53513C8.80509 2.67974 9.40973 1.9301 10.1578 1.34297C9.23157 0.615066 8.11926 0.162427 6.94797 0.0367839C5.77669 -0.0888595 4.59368 0.117561 3.53416 0.632454C2.47463 1.14735 1.58134 1.94994 0.956382 2.9485C0.33142 3.94706 0 5.1013 0 6.27931C0 7.45732 0.33142 8.61156 0.956382 9.61012C1.58134 10.6087 2.47463 11.4113 3.53416 11.9262C4.59368 12.4411 5.77669 12.6475 6.94797 12.5218C8.11926 12.3962 9.23157 11.9436 10.1578 11.2157C9.40997 10.6287 8.80546 9.87934 8.39001 9.02427C7.97456 8.16921 7.75906 7.23084 7.75981 6.28018Z" fill="#EB001B"/>' +
      '<path d="M20.3165 6.27994C20.3165 7.45804 19.985 8.61235 19.3599 9.61095C18.7348 10.6095 17.8414 11.4121 16.7817 11.9269C15.7221 12.4418 14.539 12.648 13.3676 12.5222C12.1962 12.3964 11.0839 11.9435 10.1578 11.2154C10.9053 10.6279 11.5096 9.87837 11.9252 9.02326C12.3408 8.16814 12.5567 7.22981 12.5567 6.27907C12.5567 5.32833 12.3408 4.39 11.9252 3.53488C11.5096 2.67977 10.9053 1.9302 10.1578 1.34272C11.0839 0.614596 12.1962 0.161738 13.3676 0.0359141C14.539 -0.0899097 15.7221 0.116378 16.7817 0.631197C17.8414 1.14602 18.7348 1.94859 19.3599 2.94719C19.985 3.94578 20.3165 5.1001 20.3165 6.2782V6.27994Z" fill="#F79E1B"/>' +
    '</svg></span>';

  function networkHtml(card) {
    if (String(card.network || "").toLowerCase() === "mastercard") return MASTERCARD_FLAG;
    var pp = window.PPComponents;
    if (pp && pp.getCardBrandLogoMarkup) {
      // Figma flag is 29.8x20; the shared flag is 24x16 (1.25x).
      return '<span class="inline-flex h-5 w-7.5 items-center overflow-hidden rounded"><span class="origin-left scale-125">' + pp.getCardBrandLogoMarkup(String(card.network || "mastercard").toLowerCase()) + "</span></span>";
    }
    return esc(card.network);
  }

  function detailsPanelHtml(card) {
    var revealed = !!(current && current.revealed);
    var holder = card.holder || {};
    return (
      '<div data-cm-details-panel="details" class="flex flex-col gap-6 lg:flex-row lg:items-start">' +
      '<div class="flex w-full flex-col lg:w-80 lg:shrink-0">' + cardVisual(card, revealed) + infoPanel(card, revealed) + "</div>" +
      '<div class="hidden w-px self-stretch bg-gray-200 lg:block dark:bg-white/10"></div>' +
      '<div class="flex min-w-0 flex-1 flex-col gap-6 pb-6">' +
      '<div class="flex flex-col rounded-xl border border-gray-200 sm:flex-row dark:border-white/10">' +
      balanceCell("Available Balance", card.availableBalance, card.currency, true) +
      balanceCell("Current Balance", card.currentBalance, card.currency, false, true) + "</div>" +
      '<div class="flex flex-col gap-4">' +
      '<h3 class="border-b border-gray-200 pb-4 text-base/6 font-semibold text-gray-900 dark:border-white/10 dark:text-white">Card Details</h3>' +
      '<div class="flex flex-col gap-2">' +
      row("Admin Number",
        '<span class="inline-flex items-center gap-2 tabular-nums">' + esc(card.adminNumber) +
        '<button type="button" data-cm-details-copy="' + esc(card.adminNumber) + '" aria-label="Copy admin number" class="cursor-pointer rounded-md p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:hover:bg-white/10 dark:hover:text-gray-300">' + ICON_COPY + "</button>" +
        "</span>") +
      row("Name on Card", esc(holder.name)) +
      row("Card Name", esc(card.name)) +
      row("Created", esc(created(card.createdAt))) +
      row("Payment Network", networkHtml(card)) +
      row("Address", esc(holder.address)) +
      "</div></div></div></div>"
    );
  }

  /** Bill History / Transaction History belong to 5229 / 5230: just the empty mount. */
  function emptyPanelHtml(view) {
    return '<div data-cm-details-panel="' + view + '"></div>';
  }

  function notFoundHtml() {
    // TODO(confirm): not in Figma.
    return (
      '<div data-cm-details-notfound class="flex flex-col items-center gap-4 px-6 py-20 text-center">' +
      '<h2 class="text-lg/6 font-semibold text-gray-900 dark:text-white">Card not found</h2>' +
      '<button type="button" data-cm-details-back class="' + BTN_SECONDARY + '">Back to SMART Cards</button></div>'
    );
  }

  /* ---------- render ---------- */

  function paintTabs() {
    mount.querySelectorAll("[data-cm-details-tab]").forEach(function (tab) {
      var on = tab.getAttribute("data-cm-details-tab") === current.view;
      TAB_ON.split(" ").forEach(function (c) { tab.classList.toggle(c, on); });
      TAB_OFF.split(" ").forEach(function (c) { tab.classList.toggle(c, !on); });
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.setAttribute("tabindex", on ? "0" : "-1");
    });
    var panel = mount.querySelector("#cm-details-panel");
    if (panel) panel.setAttribute("aria-labelledby", "cm-details-tab-" + current.view);
  }

  /** Export shows on the two history tabs; disabled while the tab has no rows (Figma tx-empty). */
  function paintExport() {
    var btn = mount && mount.querySelector('[data-cm-details-action="export-history"]');
    var card = current && findCard(current.id);
    if (!btn || !card) return;
    var history = current.view === "bills" || current.view === "transactions";
    btn.hidden = !history; // the attribute (preflight `[hidden]` is !important), not a `hidden` class: it would lose to `inline-flex`
    btn.disabled = !history || !(card[current.view] || []).length;
  }

  function drawPanel() {
    var panel = mount.querySelector("#cm-details-panel");
    var card = findCard(current.id);
    if (!panel || !card) return;
    panel.innerHTML = current.view === "details" ? detailsPanelHtml(card) : emptyPanelHtml(current.view);
    paintExport();
  }

  function clear() {
    current = null;
    lastSignature = "";
    if (mount) mount.innerHTML = "";
  }

  function render(options) {
    if (!mount) return;
    var id = cm.route.card;
    if (!id) return clear();
    var card = findCard(id);
    if (!card) {
      current = null;
      lastSignature = "";
      mount.innerHTML = notFoundHtml();
      return;
    }
    var opened = !current || current.id !== id;
    var view = viewFromUrl();
    if (opened) current = { id: id, view: view, revealed: false };
    else current.view = view;
    lastSignature = signature(card);
    mount.innerHTML =
      headerHtml(card) + tabsHtml() +
      '<div id="cm-details-panel" role="tabpanel" class="px-6 pt-6 pb-0 outline-none"></div>';
    paintTabs();
    drawPanel();
    if (opened || (options && options.emitTab)) {
      cm.emit("details-tab", { cardId: id, view: current.view });
    }
  }

  function setView(view, focusTab) {
    if (!current || current.view === view) return;
    current.view = view;
    writeView(view, false);
    paintTabs();
    drawPanel();
    if (focusTab) {
      var tab = mount.querySelector('[data-cm-details-tab="' + view + '"]');
      if (tab) tab.focus();
    }
    cm.emit("details-tab", { cardId: current.id, view: view });
  }

  /* ---------- wiring ---------- */

  function onClick(event) {
    if (event.target.closest("[data-cm-details-back]")) {
      cm.navigate({ tab: "smart" });
      return;
    }
    var tab = event.target.closest("[data-cm-details-tab]");
    if (tab) {
      setView(tab.getAttribute("data-cm-details-tab"), false);
      return;
    }
    if (event.target.closest("[data-cm-details-reveal]") && current) {
      current.revealed = !current.revealed;
      drawPanel();
      var again = mount.querySelector("[data-cm-details-reveal]");
      if (again) again.focus();
      return;
    }
    var copyBtn = event.target.closest("[data-cm-details-copy]");
    if (copyBtn) {
      var text = copyBtn.getAttribute("data-cm-details-copy");
      if (window.copyTextWithFeedback) window.copyTextWithFeedback(text, copyBtn);
      else if (navigator.clipboard) navigator.clipboard.writeText(text);
      return;
    }
    var action = event.target.closest("[data-cm-details-action]");
    if (action && current) {
      var name = action.getAttribute("data-cm-details-action");
      var payload = { cardId: current.id };
      if (name === "export-history") payload.view = current.view;
      cm.emit(name, payload);
    }
  }

  function onKeydown(event) {
    var tab = event.target.closest && event.target.closest("[data-cm-details-tab]");
    if (!tab) return;
    var keys = VIEWS.map(function (v) { return v.key; });
    var at = keys.indexOf(tab.getAttribute("data-cm-details-tab"));
    var next = -1;
    if (event.key === "ArrowRight") next = (at + 1) % keys.length;
    else if (event.key === "ArrowLeft") next = (at - 1 + keys.length) % keys.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = keys.length - 1;
    if (next < 0) return;
    event.preventDefault();
    setView(keys[next], true);
  }

  function init() {
    mount = cm.mount("details");
    if (!mount) return;
    mount.addEventListener("click", onClick);
    mount.addEventListener("keydown", onKeydown);
    cm.on("route", function () {
      // The URL may carry a different `view` (browser back / forward): always draw again.
      render({ emitTab: true });
    });
    cm.on("data-change", function () {
      // The list redraws all the time: only touch the page when this card changed.
      var card = current && findCard(current.id);
      if (!current && cm.route.card && findCard(cm.route.card)) return render();
      if (!card || signature(card) !== lastSignature) render();
    });
    cm.ready.then(function () {
      render();
    });
    // The brand flags come from a script that may finish after the data: draw once more.
    window.addEventListener("load", function () {
      if (cm.route.card) render();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

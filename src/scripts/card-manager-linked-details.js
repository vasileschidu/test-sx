/**
 * card-manager-linked-details.js
 * Cards Manager S14: Linked card details + Remove from view (TCDM-5233, wiki card-manager.md
 * §4.12, BR-7, BR-11; Figma details 10001:268754, remove 10001:269476).
 *
 * Draws into CardManager.mount('details') while route.tab === 'linked' && route.card, read-only:
 *   - Header: back arrow (-> the Linked Credit Cards list), card name, status Badge (list colours,
 *     shown for Active too, as in Figma), red text button **Remove from view**.
 *   - Underline sub-tabs Card Details · Bills History (Figma 10001:268787).
 *     State in `?view=bills` (pushState; absent = Card Details), as on the SMART card page.
 *   - Card Details: card visual (no balance) + info panel (Card Number / Expires / CVC masked,
 *     Reveal Details), divider, "Card Details" rows: Card Name, Created, Payment Network, Address.
 *   - Bill History: the S10 tab (card-manager-bills.js) drawn read-only into
 *     [data-cm-details-panel="bills"]; this script emits `details-tab` and lets
 *     CardManagerHistory.findCard also find linked cards.
 *   - Remove from view: CardManagerStatus.confirm (S7 / S8 red variant) -> the card leaves
 *     CardManager.data.linkedCards, back to the list (replace), `data-change` refreshes list + count.
 *
 * Layout and classes are copied from card-manager-details.js (S3). That script draws "Card not
 * found" into the same mount for ids it does not know; it registers its listeners first, so this
 * one draws after it on every `route` / `data-change` / `ready` / `load`. Hooks are prefixed
 * `data-cm-ld-*` so S3's click / key handlers ignore them.
 *
 * TODO(confirm), not in Figma: "Created" without a time (seed data has dates only); no toast after
 * Remove; the revealed state ("Hide Details"); "Card not found".
 */
(function () {
  "use strict";

  var cm = window.CardManager;
  if (!cm) return;

  var VIEWS = [
    { key: "details", label: "Card Details" },
    { key: "bills", label: "Bills History" },
  ];

  // Same Badge colours as the Linked Credit Cards list.
  var STATUS = {
    active: {
      label: "Active",
      badge:
        "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-400",
    },
    inactive: {
      label: "Inactive",
      badge:
        "border-gray-200 bg-gray-100 text-gray-800 dark:border-white/15 dark:bg-white/10 dark:text-gray-300",
    },
  };

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  var REMOVE_TEXT =
    "By removing this card, it will be removed from the list, though your card data will remain intact. However, sensitive information will be deleted, and consequently, you won’t have access to bills or transaction history associated with the card.";

  // Classes copied from card-manager-details.js (S3).
  var BTN_SECONDARY =
    "inline-flex cursor-pointer items-center justify-center rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-700 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10 dark:text-gray-300 dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/20 dark:hover:text-white dark:focus-visible:outline-blue-400";
  var BTN_REMOVE =
    "inline-flex cursor-pointer items-center justify-center rounded-md px-2.5 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300 dark:focus-visible:outline-red-400";
  var BTN_BACK =
    "inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-200 dark:focus-visible:ring-blue-400";
  var TAB_BASE =
    "inline-flex h-10.5 shrink-0 cursor-pointer items-center border-b-2 py-2.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400";
  var TAB_ON = "border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-300";
  var TAB_OFF =
    "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200";
  var LINK_BTN =
    "inline-flex cursor-pointer items-center gap-1.5 rounded-sm text-xs font-semibold text-blue-600 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-blue-400 dark:hover:text-blue-300 dark:focus-visible:outline-blue-400";

  var ICON_BACK =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" clip-rule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" /></svg>';
  var ICON_EYE =
    '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="size-4"><path d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /><path fill-rule="evenodd" clip-rule="evenodd" d="M.882 7.631A7.5 7.5 0 0 1 8 2.5c3.314 0 6.124 2.148 7.117 5.127.08.241.08.501 0 .742A7.5 7.5 0 0 1 8 13.5c-3.314 0-6.125-2.148-7.118-5.127a1.19 1.19 0 0 1 0-.742ZM11.5 8a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" /></svg>';
  var ICON_EYE_SLASH =
    '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="size-4"><path d="M2.354 1.646a.5.5 0 1 0-.708.708l12 12a.5.5 0 0 0 .708-.708l-12-12Z" /><path d="M15.117 8.369a7.46 7.46 0 0 1-1.754 2.873L11.298 9.176A3.5 3.5 0 0 0 8 4.5c-.413 0-.809.071-1.176.203L5.173 3.051A7.4 7.4 0 0 1 8 2.5c3.314 0 6.124 2.148 7.117 5.127.08.241.08.501 0 .742Z" /><path d="M4.5 8c0-.413.071-.809.203-1.176L2.637 4.758a7.46 7.46 0 0 0-1.755 2.873 1.19 1.19 0 0 0 0 .742C1.875 11.352 4.686 13.5 8 13.5c1 0 1.955-.196 2.827-.551L9.176 11.298A3.5 3.5 0 0 1 4.5 8Z" /></svg>';

  var mount = null;
  var current = null; // { id, view, revealed }

  /* ---------- helpers ---------- */

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** "2028-05" -> "05/2028" */
  function mmyyyy(value) {
    var m = /^(\d{4})-(\d{2})/.exec(String(value || ""));
    return m ? m[2] + "/" + m[1] : "";
  }

  /** "2023-04-12T12:28:00" -> "12 Apr 2023, 12:28"; "2023-12-01" -> "1 Dec 2023". */
  function created(value) {
    var m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(String(value || ""));
    if (!m) return "";
    var day = Number(m[3]) + " " + MONTHS[Number(m[2]) - 1] + " " + m[1];
    return m[4] ? day + ", " + m[4] + ":" + m[5] : day;
  }

  function iconUrl(file) {
    var path = window.location.pathname || "";
    var at = path.indexOf("/src/pages/");
    return (at >= 0 ? path.slice(0, at) : "") + "/assets/icons/" + file;
  }

  function findCard(id) {
    var list = cm.data.linkedCards || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function isOpen() {
    return cm.route.tab === "linked" && !!cm.route.card;
  }

  function viewFromUrl() {
    return new URLSearchParams(window.location.search).get("view") === "bills" ? "bills" : "details";
  }

  function writeView(view) {
    var params = new URLSearchParams(window.location.search);
    if (view === "details") params.delete("view");
    else params.set("view", view);
    var query = params.toString();
    window.history.pushState(null, "", window.location.pathname.split("/").pop() + (query ? "?" + query : ""));
  }

  /** Bill History (S10) looks cards up through CardManagerHistory.findCard: add the linked ones. */
  function shareCardsWithHistory() {
    var h = window.CardManagerHistory;
    if (!h || typeof h.findCard !== "function" || h.findCard.linked) return;
    var own = h.findCard;
    h.findCard = function (id) {
      return own(id) || findCard(id);
    };
    h.findCard.linked = true;
  }

  /* ---------- markup ---------- */

  function headerHtml(card) {
    var st = STATUS[card.status] || STATUS.inactive;
    return (
      '<div class="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 px-6 py-5 dark:border-white/10">' +
      '<div class="flex min-w-60 flex-1 items-center gap-4">' +
      '<button type="button" data-cm-ld-back aria-label="Back to Linked Credit Cards" class="' + BTN_BACK + '">' + ICON_BACK + "</button>" +
      '<h2 class="min-w-0 truncate text-2xl/8 font-semibold text-gray-900 dark:text-white" title="' + esc(card.name) + '">' + esc(card.name) + "</h2>" +
      '<span data-cm-ld-status class="inline-flex shrink-0 items-center rounded border px-2 py-0.5 text-xs/4 font-medium ' + st.badge + '">' + esc(st.label) + "</span>" +
      "</div>" +
      '<div class="flex shrink-0 items-center gap-2">' +
      '<button type="button" data-cm-ld-remove class="' + BTN_REMOVE + '">Remove from view</button>' +
      "</div></div>"
    );
  }

  function tabsHtml() {
    return (
      '<div class="px-6 pt-2">' +
      '<div role="tablist" aria-label="Card sections" class="flex items-center gap-6 overflow-x-auto border-b border-gray-200 dark:border-white/10">' +
      VIEWS.map(function (v) {
        return (
          '<button type="button" role="tab" id="cm-ld-tab-' + v.key + '" data-cm-ld-tab="' + v.key + '" aria-controls="cm-ld-panel" class="' + TAB_BASE + '">' +
          esc(v.label) + "</button>"
        );
      }).join("") +
      "</div></div>"
    );
  }

  /** Same card visual as SMART card details, without the balance line (Figma 10001:268754). */
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
      '<div class="flex flex-col gap-2">' +
      '<p data-cm-ld-visual-number class="text-lg/6 whitespace-nowrap">' + number + "</p>" +
      '<div class="flex items-center gap-1 pl-14">' +
      '<span class="text-[8px] leading-[normal] font-bold uppercase">Valid<br />Thru</span>' +
      '<span class="text-sm/6">' + esc(short) + "</span></div></div></div>" +
      '<div class="flex h-9 items-end gap-4">' +
      '<span class="min-w-0 flex-1 truncate text-sm/5 font-medium uppercase">' + esc(card.name || (card.holder && card.holder.name)) + "</span>" +
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
      infoRow("Card Number", number, "data-cm-ld-number", revealed) +
      infoRow("Expires", esc(mmyyyy(card.expires)), "", revealed) +
      infoRow("CVC", cvc, "data-cm-ld-cvc", revealed) +
      "</dl>" +
      '<div class="flex flex-col gap-3"><div class="h-px w-full bg-gray-200 dark:bg-white/10"></div>' +
      '<button type="button" data-cm-ld-reveal aria-pressed="' + revealed + '" class="' + LINK_BTN + '">' +
      (revealed ? ICON_EYE_SLASH : ICON_EYE) + (revealed ? "Hide Details" : "Reveal Details") + "</button></div>" +
      "</div>"
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
    var revealed = !!current.revealed;
    var holder = card.holder || {};
    return (
      '<div class="flex flex-col gap-6 pb-6 lg:flex-row lg:items-start">' +
      '<div class="flex w-full flex-col lg:w-80 lg:shrink-0">' + cardVisual(card, revealed) + infoPanel(card, revealed) + "</div>" +
      '<div class="hidden w-px self-stretch bg-gray-200 lg:block dark:bg-white/10"></div>' +
      '<div class="flex min-w-0 flex-1 flex-col gap-4">' +
      '<h3 class="border-b border-gray-200 pb-4 text-base/6 font-semibold text-gray-900 dark:border-white/10 dark:text-white">Card Details</h3>' +
      '<div class="flex flex-col gap-2">' +
      row("Card Name", esc(card.name)) +
      row("Created", esc(created(card.createdAt))) +
      row("Payment Network", networkHtml(card)) +
      row("Address", esc(holder.address)) +
      "</div></div></div>"
    );
  }

  function notFoundHtml() {
    return (
      '<div data-cm-ld-notfound class="flex flex-col items-center gap-4 px-6 py-20 text-center">' +
      '<h2 class="text-lg/6 font-semibold text-gray-900 dark:text-white">Card not found</h2>' +
      '<button type="button" data-cm-ld-back class="' + BTN_SECONDARY + '">Back to Linked Credit Cards</button></div>'
    );
  }

  /* ---------- render ---------- */

  function paintTabs() {
    mount.querySelectorAll("[data-cm-ld-tab]").forEach(function (tab) {
      var on = tab.getAttribute("data-cm-ld-tab") === current.view;
      TAB_ON.split(" ").forEach(function (c) { tab.classList.toggle(c, on); });
      TAB_OFF.split(" ").forEach(function (c) { tab.classList.toggle(c, !on); });
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.setAttribute("tabindex", on ? "0" : "-1");
    });
    var panel = mount.querySelector("#cm-ld-panel");
    if (panel) panel.setAttribute("aria-labelledby", "cm-ld-tab-" + current.view);
  }

  function drawPanel() {
    var panel = mount.querySelector("#cm-ld-panel");
    var card = findCard(current.id);
    if (!panel || !card) return;
    // Bill History: an empty S10 mount, filled by card-manager-bills.js on `details-tab`.
    panel.innerHTML = current.view === "details" ? detailsPanelHtml(card) : '<div data-cm-details-panel="bills"></div>';
  }

  function render() {
    if (!mount) return;
    if (!isOpen()) {
      current = null;
      if (mount.querySelector("[data-cm-ld]")) mount.innerHTML = "";
      return;
    }
    var id = cm.route.card;
    var card = findCard(id);
    if (!card) {
      current = null;
      mount.innerHTML = '<div data-cm-ld>' + notFoundHtml() + "</div>";
      return;
    }
    if (!current || current.id !== id) current = { id: id, view: "details", revealed: false };
    current.view = viewFromUrl();
    var focused = document.activeElement;
    var refocus = focused && mount.contains(focused) && focused.getAttribute("data-cm-ld-tab");
    mount.innerHTML =
      '<div data-cm-ld>' + headerHtml(card) + tabsHtml() +
      '<div id="cm-ld-panel" role="tabpanel" class="px-6 pt-6 pb-0 outline-none"></div></div>';
    paintTabs();
    drawPanel();
    if (refocus) focusTab(refocus);
    cm.emit("details-tab", { cardId: id, view: current.view });
  }

  function focusTab(view) {
    var tab = mount.querySelector('[data-cm-ld-tab="' + view + '"]');
    if (tab) tab.focus();
  }

  function setView(view, focus) {
    if (!current || current.view === view) return;
    current.view = view;
    writeView(view);
    paintTabs();
    drawPanel();
    if (focus) focusTab(view);
    cm.emit("details-tab", { cardId: current.id, view: view });
  }

  function back() {
    cm.navigate({ tab: "linked" });
  }

  /** The list's tab link survives the redraw: focus it after Remove (OBModal's target is gone). */
  function focusListTab() {
    var link = document.querySelector('#cm-tab-nav [data-tab="linked"]');
    if (link && link.offsetParent) link.focus();
  }

  function openRemove() {
    var card = current && findCard(current.id);
    var status = window.CardManagerStatus;
    if (!card || !status) return;
    status.confirm({
      title: "Are you sure you want to remove this card?",
      text: REMOVE_TEXT,
      confirmLabel: "Yes, remove the card",
      icon: "icon-warning-red.svg",
      danger: true,
      onConfirm: function () {
        var list = cm.data.linkedCards || [];
        var at = list.indexOf(card);
        if (at !== -1) list.splice(at, 1);
        cm.navigate({ tab: "linked" }, { replace: true });
        cm.emit("data-change", { reason: "linked-remove", cardId: card.id });
        focusListTab();
      },
    });
  }

  /* ---------- wiring ---------- */

  function onClick(event) {
    if (!isOpen()) return;
    if (event.target.closest("[data-cm-ld-back]")) return back();
    if (event.target.closest("[data-cm-ld-remove]")) return openRemove();
    var tab = event.target.closest("[data-cm-ld-tab]");
    if (tab) return setView(tab.getAttribute("data-cm-ld-tab"), false);
    if (event.target.closest("[data-cm-ld-reveal]") && current) {
      current.revealed = !current.revealed;
      drawPanel();
      var again = mount.querySelector("[data-cm-ld-reveal]");
      if (again) again.focus();
    }
  }

  function onKeydown(event) {
    var tab = event.target.closest && event.target.closest("[data-cm-ld-tab]");
    if (!tab) return;
    var keys = VIEWS.map(function (v) { return v.key; });
    var at = keys.indexOf(tab.getAttribute("data-cm-ld-tab"));
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
    shareCardsWithHistory();
    mount.addEventListener("click", onClick);
    mount.addEventListener("keydown", onKeydown);
    cm.on("route", render);
    cm.on("data-change", function () {
      // S3 has just drawn "Card not found" over this page: draw again.
      if (isOpen() && !mount.querySelector("[data-cm-ld]")) render();
    });
    cm.ready.then(render);
    // The brand flags come from a script that may finish after the data (and S3 redraws on load).
    window.addEventListener("load", function () {
      if (isOpen()) render();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

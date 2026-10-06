/**
 * consumer-my-cards.js
 * Consumer Portal — My Cards: the virtual cards issued when a person claimed a
 * Smart Disburse payment to a card.
 *
 * Two views on one page, the same way Payment Program Configuration does it:
 *   list  — stacked rows (the Payment Preferences card pattern), search,
 *           Active only, filter by sender/status, Show all
 *   card  — balances, card details, reveal, and transaction history
 * The open card lives in the URL (?card=<id>), so browser back/forward,
 * reload and shared links all land on the right view, and the breadcrumb
 * gains a "My Cards › <card>" step. Each view shows a deliberate skeleton first.
 */
(function () {
  "use strict";

  var LOAD_MIN_MS = 1000;
  var LOAD_MAX_MS = 1500;
  var INITIAL_VISIBLE = 6;
  var PAGE_SIZES = [10, 25, 50];

  var cards = [];
  var loadTimer = null;
  var toastTimer = null;

  var list = {
    search: "",
    activeOnly: false,
    senders: new Set(),
    statuses: new Set(),
    expanded: false,
    filterOpen: false,
  };
  var detail = {
    cardId: null,
    revealed: false,
    search: "",
    statuses: new Set(),
    sort: "desc",
    page: 1,
    pageSize: 10,
    open: new Set(),
    filterOpen: false,
  };

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function money(n) {
    return (
      "$" +
      Number(n || 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function amountHtml(n, big) {
    return (
      '<span class="' +
      (big ? "text-2xl font-semibold" : "text-sm font-medium") +
      ' text-gray-950 tabular-nums dark:text-white">' +
      money(n) +
      "</span>" +
      '<span class="' +
      (big ? "ml-1 text-base" : "ml-1 text-sm") +
      ' font-normal text-gray-500 dark:text-gray-400">USD</span>'
    );
  }

  function pad(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function formatDate(iso) {
    var d = new Date(iso);
    return isNaN(d.getTime())
      ? ""
      : pad(d.getMonth() + 1) + "/" + pad(d.getDate()) + "/" + d.getFullYear();
  }

  function formatCreated(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return (
      d.getDate() +
      " " +
      d.toLocaleDateString("en-US", { month: "short" }) +
      " " +
      d.getFullYear() +
      ", " +
      pad(d.getHours()) +
      ":" +
      pad(d.getMinutes())
    );
  }

  function shortExpiry(exp) {
    var m = String(exp || "").match(/^(\d{2})\/(\d{2,4})$/);
    return m ? m[1] + "/" + m[2].slice(-2) : exp;
  }

  function findCard(id) {
    for (var i = 0; i < cards.length; i += 1)
      if (cards[i].id === id) return cards[i];
    return null;
  }

  function loadDelay() {
    return LOAD_MIN_MS + Math.random() * (LOAD_MAX_MS - LOAD_MIN_MS);
  }

  function later(fn) {
    clearTimeout(loadTimer);
    loadTimer = setTimeout(fn, loadDelay());
  }

  function bar(w, h, strong) {
    return (
      '<span class="pp-skel max-w-full' +
      (strong ? " pp-skel-strong" : "") +
      '" style="width:' +
      w +
      ";height:" +
      h +
      '"></span>'
    );
  }

  // ── Shared bits ──

  var CHEVRON_RIGHT =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 shrink-0 text-gray-400 transition-colors group-hover:text-gray-600 dark:group-hover:text-gray-300"><path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>';
  var CHEVRON_DOWN =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4 transition-transform"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>';
  var CHECKBOX =
    "col-start-1 row-start-1 appearance-none rounded-sm border border-gray-300 bg-white checked:border-blue-600 checked:bg-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-white/20 dark:bg-white/5 dark:checked:border-blue-500 dark:checked:bg-blue-500";

  function checkbox(attrs, checked, label) {
    return (
      '<label class="flex cursor-pointer items-center gap-3 text-sm text-gray-900 dark:text-gray-100"><span class="group grid size-4 grid-cols-1">' +
      '<input type="checkbox" ' +
      attrs +
      (checked ? " checked" : "") +
      ' class="' +
      CHECKBOX +
      '" />' +
      '<svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white"><path class="opacity-0 group-has-checked:opacity-100" d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>' +
      "</span>" +
      escapeHtml(label) +
      "</label>"
    );
  }

  function miniCard(card) {
    // The thumbnail used by Payment Preferences' card list, so both read the same.
    if (window.PPComponents && window.PPComponents.createMiniCardComponent) {
      return window.PPComponents.createMiniCardComponent({
        brand: card.network,
        last4: card.last4,
      });
    }
    return '<span class="block h-8 w-10 rounded-md bg-gray-900"></span>';
  }

  function brandLogo(brand, size) {
    return window.PPComponents && window.PPComponents.getCardBrandLogoMarkup
      ? window.PPComponents.getCardBrandLogoMarkup(brand, size)
      : "";
  }

  function showToast(message) {
    var toast = $("mc-toast");
    $("mc-toast-text").textContent = message;
    toast.classList.remove("opacity-0", "translate-y-2");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.add("opacity-0", "translate-y-2");
    }, 3500);
  }

  function copyText(text, btn) {
    if (window.copyTextWithFeedback) {
      window.copyTextWithFeedback(text, btn);
      return;
    }
    try {
      navigator.clipboard.writeText(text);
    } catch (error) {}
    showToast("Copied to clipboard");
  }

  // ── Breadcrumb: My Cards › <card> ──

  function setBreadcrumb(cardName) {
    var nav = $("dynamic-breadcrumbs");
    var ol = nav && nav.querySelector("ol");
    if (!ol) return;
    var extra = ol.querySelector("[data-mc-crumb]");
    if (extra) extra.remove();
    var items = ol.querySelectorAll(":scope > li");
    var last = items.length ? items[items.length - 1] : null;
    var link = last ? last.querySelector("a") : null;
    if (!link) return;
    if (cardName) {
      link.setAttribute("href", window.location.pathname);
      link.setAttribute("data-mc-list-crumb", "");
      link.removeAttribute("aria-current");
      var li = last.cloneNode(true);
      li.setAttribute("data-mc-crumb", "");
      var cloned = li.querySelector("a");
      var label = document.createElement("span");
      label.setAttribute("aria-current", "page");
      label.className = cloned
        ? cloned.className
        : "ml-4 text-sm font-medium text-gray-500";
      label.textContent = cardName;
      if (cloned) cloned.replaceWith(label);
      ol.appendChild(li);
    } else {
      link.removeAttribute("data-mc-list-crumb");
      link.setAttribute("aria-current", "page");
    }
  }

  // ════════════════════════════ LIST ════════════════════════════

  function listMatches() {
    var q = list.search.trim().toLowerCase();
    return cards.filter(function (c) {
      if (list.activeOnly && c.status !== "active") return false;
      if (list.senders.size && !list.senders.has(c.sentBy)) return false;
      if (list.statuses.size && !list.statuses.has(c.status)) return false;
      if (!q) return true;
      return (
        (c.name + " " + c.holderName + " " + c.last4 + " " + c.sentBy)
          .toLowerCase()
          .indexOf(q) !== -1
      );
    });
  }

  function listRow(c) {
    var dim = c.status === "inactive" ? " opacity-40" : "";
    return (
      '<a href="?card=' +
      encodeURIComponent(c.id) +
      '" data-open-card="' +
      escapeHtml(c.id) +
      '"' +
      ' class="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:grid-cols-[auto_minmax(0,1.2fr)_minmax(0,1fr)_9rem_auto] dark:bg-white/5 dark:hover:bg-white/10">' +
      '<span class="flex h-8 w-10 shrink-0 items-center justify-center' +
      dim +
      '">' +
      miniCard(c) +
      "</span>" +
      '<span class="flex min-w-0 flex-col gap-1' +
      dim +
      '">' +
      '<span class="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">' +
      escapeHtml(c.holderName) +
      ' <span class="tabular-nums">•••• ' +
      escapeHtml(c.last4) +
      "</span></span>" +
      '<span class="text-sm text-gray-500 dark:text-gray-400">Expiration ' +
      escapeHtml(c.expiration) +
      "</span>" +
      "</span>" +
      '<span class="col-start-2 flex min-w-0 flex-col gap-1 sm:col-start-auto">' +
      '<span class="text-sm text-gray-500 dark:text-gray-400">Sent by</span>' +
      '<span data-sent-by="' +
      escapeHtml(c.sentBy) +
      '" class="w-fit truncate text-sm font-medium text-gray-900 underline decoration-gray-400 underline-offset-4 hover:decoration-gray-900 dark:text-white dark:decoration-white/30">' +
      escapeHtml(c.sentBy) +
      "</span>" +
      "</span>" +
      '<span class="col-start-2 whitespace-nowrap sm:col-start-auto sm:text-right">' +
      amountHtml(c.availableBalance) +
      "</span>" +
      '<span class="col-start-3 row-start-1 sm:col-start-auto sm:row-start-auto">' +
      CHEVRON_RIGHT +
      "</span>" +
      "</a>"
    );
  }

  function listSkeleton() {
    var rows = "";
    for (var i = 0; i < INITIAL_VISIBLE; i += 1) {
      rows +=
        '<div class="grid grid-cols-[auto_minmax(0,1.2fr)_minmax(0,1fr)_9rem_auto] items-center gap-4 rounded-lg bg-gray-50 p-3 dark:bg-white/5" aria-hidden="true">' +
        bar("2.5rem", "2rem", true) +
        '<span class="flex flex-col gap-1.5">' +
        bar("13rem", "0.9rem", true) +
        bar("8rem", "0.8rem", true) +
        "</span>" +
        '<span class="flex flex-col gap-1.5">' +
        bar("3.5rem", "0.8rem", true) +
        bar("7rem", "0.9rem", true) +
        "</span>" +
        bar("7rem", "0.9rem", true) +
        bar("1.25rem", "1.25rem", true) +
        "</div>";
    }
    return rows;
  }

  function renderList() {
    var body = $("mc-list-body");
    var matches = listMatches();
    if (!matches.length) {
      body.innerHTML =
        '<div class="flex flex-col items-center rounded-2xl border border-dashed border-gray-300 bg-gray-50/80 px-6 py-10 text-center dark:border-white/10 dark:bg-white/5">' +
        '<p class="text-sm font-semibold text-gray-900 dark:text-white">' +
        (cards.length ? "No cards match" : "No cards yet") +
        "</p>" +
        '<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">' +
        (cards.length
          ? "Try a different search or clear the filters."
          : "Cards appear here when you claim a payment to a virtual card.") +
        "</p></div>";
    } else {
      var shown = list.expanded ? matches : matches.slice(0, INITIAL_VISIBLE);
      var html = shown.map(listRow).join("");
      if (matches.length > INITIAL_VISIBLE) {
        html +=
          '<button type="button" data-mc-toggle class="mt-2 inline-flex cursor-pointer items-center gap-2 self-start rounded-md px-2.5 py-1.5 text-sm font-semibold whitespace-nowrap text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-gray-100" aria-expanded="' +
          list.expanded +
          '">' +
          "<span>" +
          (list.expanded ? "Show less" : "Show all (" + matches.length + ")") +
          "</span>" +
          CHEVRON_DOWN.replace(
            "transition-transform",
            "transition-transform" + (list.expanded ? " rotate-180" : ""),
          ) +
          "</button>";
      }
      body.innerHTML = html;
    }
    body.setAttribute("aria-busy", "false");
    var count = list.senders.size + list.statuses.size;
    var badge = $("mc-filter-count");
    badge.textContent = count ? String(count) : "";
    badge.classList.toggle("hidden", !count);
    badge.classList.toggle("inline-flex", !!count);
  }

  function listFilterPanel() {
    var senders = Array.from(
      new Set(
        cards.map(function (c) {
          return c.sentBy;
        }),
      ),
    ).sort();
    var group = function (title, items) {
      return (
        '<div class="border-b border-gray-200 p-3 last:border-b-0 dark:border-white/10"><p class="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">' +
        title +
        '</p><div class="flex max-h-48 flex-col gap-2 overflow-y-auto">' +
        items +
        "</div></div>"
      );
    };
    var clear =
      list.senders.size || list.statuses.size
        ? '<div class="flex justify-end p-2"><button type="button" data-mc-filter-clear class="cursor-pointer rounded-md px-2 py-1 text-sm font-semibold text-blue-600 hover:bg-blue-600/10 dark:text-blue-400">Clear all</button></div>'
        : "";
    return (
      group(
        "Sent by",
        senders
          .map(function (s) {
            return checkbox(
              'data-mc-sender="' + escapeHtml(s) + '"',
              list.senders.has(s),
              s,
            );
          })
          .join(""),
      ) +
      group(
        "Status",
        [
          ["active", "Active"],
          ["inactive", "Inactive"],
        ]
          .map(function (s) {
            return checkbox(
              'data-mc-status="' + s[0] + '"',
              list.statuses.has(s[0]),
              s[1],
            );
          })
          .join(""),
      ) +
      clear
    );
  }

  function setListFilterOpen(open) {
    list.filterOpen = open;
    var panel = $("mc-filter-panel");
    if (open) panel.innerHTML = listFilterPanel();
    panel.classList.toggle("hidden", !open);
    $("mc-filter-btn").setAttribute("aria-expanded", open ? "true" : "false");
  }

  // ════════════════════════════ CARD PAGE ════════════════════════════

  var TX_STATUS = {
    Settled:
      "bg-green-50 text-green-700 inset-ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:inset-ring-green-500/20",
    Pending:
      "bg-yellow-50 text-yellow-800 inset-ring-yellow-600/20 dark:bg-yellow-400/10 dark:text-yellow-500 dark:inset-ring-yellow-400/20",
    Declined:
      "bg-red-50 text-red-700 inset-ring-red-600/10 dark:bg-red-400/10 dark:text-red-400 dark:inset-ring-red-400/20",
    Refunded:
      "bg-gray-50 text-gray-600 inset-ring-gray-500/10 dark:bg-gray-400/10 dark:text-gray-400 dark:inset-ring-gray-400/20",
  };

  function dots(n) {
    var out = "";
    for (var i = 0; i < n; i += 1)
      out += '<span class="size-1 rounded-full bg-current"></span>';
    return '<span class="flex gap-1">' + out + "</span>";
  }

  function cardVisual(c) {
    var groups = String(c.fullNumber).split(" ");
    var number = detail.revealed
      ? '<span class="font-mono text-lg tracking-widest">' +
        escapeHtml(c.fullNumber) +
        "</span>"
      : '<span class="flex items-center gap-4">' +
        dots(4) +
        dots(4) +
        dots(4) +
        '<span class="font-mono text-lg tracking-wider">' +
        escapeHtml(groups[groups.length - 1]) +
        "</span></span>";
    return (
      '<div class="relative flex aspect-[1.6/1] w-full flex-col justify-between overflow-hidden rounded-xl bg-[linear-gradient(160deg,#0B1220_0%,#111933_58%,#18224A_100%)] p-5 text-white shadow-lg">' +
      '<div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(96,165,250,0.18),_transparent_45%)]"></div>' +
      '<div class="relative"><p class="text-3xl font-semibold tabular-nums">' +
      money(c.availableBalance) +
      "</p></div>" +
      '<div class="relative flex flex-col gap-3">' +
      number +
      '<div class="flex items-center gap-2"><span class="text-[7px] leading-[8px] font-semibold uppercase">Valid<br>Thru</span><span class="font-mono text-sm">' +
      escapeHtml(shortExpiry(c.expiration)) +
      "</span></div>" +
      '<div class="flex items-end justify-between"><span class="font-mono text-sm tracking-wider uppercase">' +
      escapeHtml(c.holderName) +
      "</span>" +
      '<span class="[&>img]:h-8 [&>img]:w-auto">' +
      brandLogo(c.network, "large") +
      "</span></div>" +
      "</div>" +
      "</div>"
    );
  }

  function maskedPill(w) {
    return (
      '<span class="inline-block h-3 rounded-full bg-gray-200 dark:bg-white/15" style="width:' +
      w +
      '"></span>'
    );
  }

  function cardSecrets(c) {
    var row = function (label, value) {
      return (
        '<div class="flex items-center justify-between gap-4 py-1.5"><dt class="text-sm text-gray-500 dark:text-gray-400">' +
        label +
        '</dt><dd class="flex items-center gap-1.5 text-sm text-gray-900 tabular-nums dark:text-white">' +
        value +
        "</dd></div>"
      );
    };
    var number = detail.revealed
      ? escapeHtml(c.fullNumber)
      : maskedPill("2rem") +
        maskedPill("2rem") +
        maskedPill("2rem") +
        "<span>" +
        escapeHtml(c.last4) +
        "</span>";
    return (
      '<div class="rounded-b-xl border border-t-0 border-gray-200 px-3 pt-2 pb-3 dark:border-white/10">' +
      '<dl class="divide-y divide-transparent">' +
      row("Card Number", number) +
      row("Expires", escapeHtml(c.expiration)) +
      row("CVC", detail.revealed ? escapeHtml(c.cvc) : maskedPill("2rem")) +
      "</dl>" +
      '<div class="mt-2 border-t border-gray-200 pt-3 dark:border-white/10">' +
      '<button type="button" data-mc-reveal class="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-600/10 dark:text-blue-400" aria-pressed="' +
      detail.revealed +
      '">' +
      (detail.revealed
        ? '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path fill-rule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z" clip-rule="evenodd" /><path d="m10.748 13.93 2.523 2.523a9.987 9.987 0 0 1-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 0 1 0-1.186A10.007 10.007 0 0 1 2.839 6.02L6.07 9.252a4 4 0 0 0 4.678 4.678Z" /></svg>Hide Details'
        : '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /><path fill-rule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clip-rule="evenodd" /></svg>Reveal Details') +
      "</button>" +
      "</div>" +
      "</div>"
    );
  }

  function statTile(label, value, muted) {
    return (
      '<div class="flex flex-col gap-1 p-5"><span class="text-sm text-gray-500 dark:text-gray-400">' +
      label +
      "</span>" +
      '<span class="' +
      (muted ? "opacity-70" : "") +
      '">' +
      amountHtml(value, true) +
      "</span></div>"
    );
  }

  function dlRow(label, valueHtml) {
    return (
      '<div class="grid grid-cols-1 gap-1 py-1.5 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:gap-4">' +
      '<dt class="text-sm font-medium text-gray-900 dark:text-gray-100">' +
      label +
      "</dt>" +
      '<dd class="text-sm text-gray-700 dark:text-gray-300">' +
      valueHtml +
      "</dd></div>"
    );
  }

  var COPY_ICON =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z" /><path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z" /></svg>';

  // "Logo/Brand Flag" from the Consumer Portal Figma: the network mark on a
  // navy 30×20 badge, as the Payment Network row shows it.
  var MASTERCARD_FLAG =
    '<span role="img" aria-label="Mastercard" class="inline-flex h-5 w-[30px] items-center justify-center rounded bg-[#01326F]">' +
    '<svg viewBox="0 0 20.3165 12.5581" fill="none" aria-hidden="true" class="h-[12.5px] w-[20.3px]">' +
    '<path d="M12.9046 1.34278H7.41101V11.2155H12.9046V1.34278Z" fill="#FF5F00"/>' +
    '<path d="M7.75981 6.28018C7.75879 5.32924 7.97417 4.39053 8.38963 3.53513C8.80509 2.67974 9.40973 1.9301 10.1578 1.34297C9.23157 0.615066 8.11926 0.162427 6.94797 0.0367839C5.77669 -0.0888595 4.59368 0.117561 3.53416 0.632454C2.47463 1.14735 1.58134 1.94994 0.956382 2.9485C0.33142 3.94706 0 5.1013 0 6.27931C0 7.45732 0.33142 8.61156 0.956382 9.61012C1.58134 10.6087 2.47463 11.4113 3.53416 11.9262C4.59368 12.4411 5.77669 12.6475 6.94797 12.5218C8.11926 12.3962 9.23157 11.9436 10.1578 11.2157C9.40997 10.6287 8.80546 9.87934 8.39001 9.02427C7.97456 8.16921 7.75906 7.23084 7.75981 6.28018Z" fill="#EB001B"/>' +
    '<path d="M20.3165 6.27994C20.3165 7.45804 19.985 8.61235 19.3599 9.61095C18.7348 10.6095 17.8414 11.4121 16.7817 11.9269C15.7221 12.4418 14.539 12.648 13.3676 12.5222C12.1962 12.3964 11.0839 11.9435 10.1578 11.2154C10.9053 10.6279 11.5096 9.87837 11.9252 9.02326C12.3408 8.16814 12.5567 7.22981 12.5567 6.27907C12.5567 5.32833 12.3408 4.39 11.9252 3.53488C11.5096 2.67977 10.9053 1.9302 10.1578 1.34272C11.0839 0.614596 12.1962 0.161738 13.3676 0.0359141C14.539 -0.0899097 15.7221 0.116378 16.7817 0.631197C17.8414 1.14602 18.7348 1.94859 19.3599 2.94719C19.985 3.94578 20.3165 5.1001 20.3165 6.2782V6.27994Z" fill="#F79E1B"/>' +
    "</svg></span>";

  function networkFlag(network) {
    if (String(network || "").toLowerCase() === "mastercard")
      return MASTERCARD_FLAG;
    return (
      '<span class="inline-flex h-5 items-center rounded bg-gray-100 px-1.5 text-xs font-semibold text-gray-700 uppercase dark:bg-white/10 dark:text-gray-300">' +
      escapeHtml(network || "Card") +
      "</span>"
    );
  }

  function cardDetails(c) {
    return (
      '<div class="flex flex-col gap-4">' +
      '<h2 class="border-b border-gray-200 pb-4 text-base font-semibold text-gray-900 dark:border-white/10 dark:text-white">Card Details</h2>' +
      "<dl>" +
      dlRow(
        "Admin Number",
        '<span class="inline-flex items-center gap-2 tabular-nums">' +
          escapeHtml(c.adminNumber) +
          '<button type="button" data-mc-copy="' +
          escapeHtml(c.adminNumber) +
          '" aria-label="Copy admin number" class="cursor-pointer rounded-md p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10">' +
          COPY_ICON +
          "</button></span>",
      ) +
      dlRow("Name on Card", escapeHtml(c.holderName)) +
      dlRow("Card Name", escapeHtml(c.name)) +
      dlRow("Created", escapeHtml(formatCreated(c.created))) +
      dlRow("Sent by", escapeHtml(c.sentBy)) +
      dlRow("Payment Network", networkFlag(c.network)) +
      dlRow(
        "Address",
        '<span class="whitespace-pre-line">' +
          escapeHtml(c.address) +
          "</span>",
      ) +
      dlRow(
        "Status",
        c.status === "active"
          ? '<span class="inline-flex items-center rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 inset-ring inset-ring-green-600/20 dark:bg-green-500/10 dark:text-green-400">Active</span>'
          : '<span class="inline-flex items-center rounded-md bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600 inset-ring inset-ring-gray-500/10 dark:bg-white/5 dark:text-gray-400">Inactive</span>',
      ) +
      "</dl></div>"
    );
  }

  function gearMenu() {
    var item = function (attr, icon, label) {
      return (
        '<button type="button" ' +
        attr +
        ' class="flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-hidden dark:text-gray-300 dark:hover:bg-white/5 dark:focus:bg-white/5">' +
        icon +
        label +
        "</button>"
      );
    };
    return (
      '<el-dropdown class="inline-block">' +
      '<button type="button" aria-label="Card actions" class="flex size-9 cursor-pointer items-center justify-center rounded-md bg-white text-gray-600 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 aria-expanded:inset-ring-2 aria-expanded:inset-ring-blue-600 dark:bg-white/10 dark:text-gray-300 dark:inset-ring-white/10 dark:hover:bg-white/20">' +
      '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clip-rule="evenodd" /></svg>' +
      "</button>" +
      '<el-menu anchor="bottom end" popover class="min-w-52 origin-top-right rounded-md bg-white py-1 shadow-lg outline-1 outline-black/5 transition transition-discrete [--anchor-gap:--spacing(2)] data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in dark:bg-gray-800 dark:outline-white/10">' +
      item(
        "data-mc-statement",
        '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 text-gray-500"><path fill-rule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm2.25 8.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z" clip-rule="evenodd" /></svg>',
        "Card statement",
      ) +
      item(
        "data-mc-request",
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="size-5 text-gray-500"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3M18 13.5v4.5m2.25-2.25h-4.5M4.5 19.5h9m6-9V6.75A2.25 2.25 0 0 0 17.25 4.5h-12A2.25 2.25 0 0 0 3 6.75v10.5A2.25 2.25 0 0 0 5.25 19.5" /></svg>',
        "Request new card",
      ) +
      "</el-menu></el-dropdown>"
    );
  }

  // ── Transactions ──

  function txMatches(c) {
    var q = detail.search.trim().toLowerCase();
    var rows = c.transactions.filter(function (t) {
      if (detail.statuses.size && !detail.statuses.has(t.status)) return false;
      if (!q) return true;
      return (
        (t.id + " " + t.merchant + " " + t.status).toLowerCase().indexOf(q) !==
        -1
      );
    });
    var dir = detail.sort === "asc" ? 1 : -1;
    return rows.slice().sort(function (a, b) {
      return (new Date(a.dateTime) - new Date(b.dateTime)) * dir;
    });
  }

  var TH =
    "h-[52px] px-4 text-left align-middle text-xs font-medium tracking-[0.6px] whitespace-nowrap text-gray-500 uppercase dark:text-gray-400";

  function txRow(t) {
    var open = detail.open.has(t.id);
    var main =
      '<tr data-mc-tx="' +
      escapeHtml(t.id) +
      '" class="cursor-pointer border-b border-gray-200 hover:bg-gray-50/60 dark:border-white/10 dark:hover:bg-white/5' +
      (open ? " bg-gray-50 dark:bg-white/5" : "") +
      '">' +
      '<td class="h-13 w-10 pl-3"><button type="button" aria-expanded="' +
      open +
      '" aria-label="Transaction details" class="rounded-md p-1 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10">' +
      '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4 transition-transform' +
      (open ? " rotate-90" : "") +
      '"><path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg></button></td>' +
      '<td class="px-3 py-3 text-sm text-gray-500 tabular-nums dark:text-gray-400">' +
      escapeHtml(t.id) +
      "</td>" +
      '<td class="px-3 py-3 text-sm text-gray-500 tabular-nums dark:text-gray-400">' +
      escapeHtml(formatDate(t.dateTime)) +
      "</td>" +
      '<td class="px-3 py-3 text-sm font-medium text-gray-900 dark:text-white">' +
      escapeHtml(t.merchant) +
      "</td>" +
      '<td class="px-3 py-3 text-right whitespace-nowrap">' +
      amountHtml(t.status === "Refunded" ? -t.amount : t.amount).replace(
        "$-",
        "−$",
      ) +
      "</td>" +
      '<td class="px-3 py-3"><span class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium inset-ring ' +
      (TX_STATUS[t.status] || TX_STATUS.Refunded) +
      '">' +
      escapeHtml(t.status) +
      "</span></td>" +
      "</tr>";
    if (!open) return main;
    var d = function (label, value) {
      return (
        '<div class="grid grid-cols-1 gap-1 py-1.5 sm:grid-cols-[14rem_minmax(0,1fr)] sm:gap-4"><dt class="text-sm text-gray-500 dark:text-gray-400">' +
        label +
        '</dt><dd class="text-sm text-gray-900 dark:text-white">' +
        value +
        "</dd></div>"
      );
    };
    return (
      main +
      '<tr class="border-b border-gray-200 dark:border-white/10"><td colspan="6" class="px-4 pt-4 pb-5 sm:pl-14">' +
      '<h3 class="border-b border-gray-200 pb-3 text-sm font-semibold text-gray-900 dark:border-white/10 dark:text-white">Transaction Details</h3>' +
      '<dl class="pt-2">' +
      d("Transaction Code", escapeHtml(t.transactionCode)) +
      d("Response Code", escapeHtml(t.responseCode)) +
      d("Response Description", escapeHtml(t.responseDescription)) +
      d(
        "Merchant Category Code",
        escapeHtml(t.mcc) +
          ' <span class="text-gray-500 dark:text-gray-400">· ' +
          escapeHtml(t.mccDescription) +
          "</span>",
      ) +
      d("Transaction Type", escapeHtml(t.type)) +
      d(
        "Merchant Location",
        '<span class="whitespace-pre-line">' +
          escapeHtml(t.merchantLocation) +
          "</span>",
      ) +
      d("Fee", amountHtml(t.fee)) +
      "</dl></td></tr>"
    );
  }

  var PAGE_BTN =
    "flex size-8 cursor-pointer items-center justify-center rounded-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-gray-400";
  function pageBtn(dir, label, path, disabled) {
    return (
      '<button type="button" data-mc-page="' +
      dir +
      '" aria-label="' +
      label +
      '"' +
      (disabled ? " disabled" : "") +
      ' class="' +
      PAGE_BTN +
      '"><svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path fill-rule="evenodd" clip-rule="evenodd" d="' +
      path +
      '" /></svg></button>'
    );
  }

  function txSection(c) {
    var rows = txMatches(c);
    var pages = Math.max(1, Math.ceil(rows.length / detail.pageSize));
    if (detail.page > pages) detail.page = pages;
    var slice = rows.slice(
      (detail.page - 1) * detail.pageSize,
      detail.page * detail.pageSize,
    );
    var start = rows.length ? (detail.page - 1) * detail.pageSize + 1 : 0;
    var end = Math.min(detail.page * detail.pageSize, rows.length);
    var sizes = PAGE_SIZES.map(function (n) {
      return (
        '<option value="' +
        n +
        '"' +
        (n === detail.pageSize ? " selected" : "") +
        ">" +
        n +
        "</option>"
      );
    }).join("");
    var sortIcon =
      '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4 ' +
      (detail.sort === "asc" ? "rotate-180" : "") +
      '"><path fill-rule="evenodd" d="M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 1 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3Z" clip-rule="evenodd" /></svg>';
    var body = slice.length
      ? slice.map(txRow).join("")
      : '<tr><td colspan="6" class="px-4 py-10 text-center"><p class="text-sm font-semibold text-gray-900 dark:text-white">No transactions match</p><p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Try a different search or clear the filter.</p></td></tr>';
    return (
      '<div class="overflow-x-auto"><table class="w-full min-w-[720px]">' +
      '<thead><tr class="border-b border-gray-200 dark:border-white/10"><th class="w-10"></th>' +
      '<th class="' +
      TH +
      '">Transaction ID</th>' +
      '<th class="' +
      TH +
      '" aria-sort="' +
      (detail.sort === "asc" ? "ascending" : "descending") +
      '"><button type="button" data-mc-sort class="inline-flex cursor-pointer items-center gap-1 uppercase hover:text-gray-700 dark:hover:text-gray-200">Date/Time' +
      sortIcon +
      "</button></th>" +
      '<th class="' +
      TH +
      '">Merchant Name</th><th class="' +
      TH +
      ' text-right">Amount</th><th class="' +
      TH +
      '">Status</th></tr></thead>' +
      "<tbody>" +
      body +
      "</tbody></table></div>" +
      '<div class="flex flex-col items-end gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-end sm:gap-6 dark:border-white/10">' +
      '<div class="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300"><label for="mc-page-size">Rows per Page:</label><div class="grid grid-cols-1">' +
      '<select id="mc-page-size" class="col-start-1 row-start-1 h-10 w-20 appearance-none rounded-md bg-white pr-8 pl-3 text-base text-gray-900 shadow-xs outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:*:bg-gray-800">' +
      sizes +
      "</select>" +
      '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg></div></div>' +
      '<p class="text-sm text-gray-700 dark:text-gray-300">Showing <span class="font-semibold">' +
      start +
      " - " +
      end +
      '</span> of <span class="font-semibold">' +
      rows.length +
      "</span> results</p>" +
      '<div class="flex items-center gap-2">' +
      pageBtn(
        "first",
        "First page",
        "M15.79 14.77a.75.75 0 0 1-1.06.02l-4.5-4.25a.75.75 0 0 1 0-1.08l4.5-4.25a.75.75 0 1 1 1.04 1.08L11.832 10l3.938 3.71a.75.75 0 0 1 .02 1.06Zm-6 0a.75.75 0 0 1-1.06.02l-4.5-4.25a.75.75 0 0 1 0-1.08l4.5-4.25a.75.75 0 1 1 1.04 1.08L5.832 10l3.938 3.71a.75.75 0 0 1 .02 1.06Z",
        detail.page <= 1,
      ) +
      pageBtn(
        "prev",
        "Previous page",
        "M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z",
        detail.page <= 1,
      ) +
      pageBtn(
        "next",
        "Next page",
        "M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z",
        detail.page >= pages,
      ) +
      pageBtn(
        "last",
        "Last page",
        "M10.21 14.77a.75.75 0 0 1 .02-1.06L14.168 10 10.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Zm-6 0a.75.75 0 0 1 .02-1.06L8.168 10 4.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z",
        detail.page >= pages,
      ) +
      "</div></div>"
    );
  }

  function txFilterPanel() {
    var items = ["Settled", "Pending", "Declined", "Refunded"]
      .map(function (s) {
        return checkbox(
          'data-mc-tx-status="' + s + '"',
          detail.statuses.has(s),
          s,
        );
      })
      .join("");
    return (
      '<div class="p-3"><p class="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">Status</p><div class="flex flex-col gap-2">' +
      items +
      "</div></div>" +
      (detail.statuses.size
        ? '<div class="flex justify-end border-t border-gray-200 p-2 dark:border-white/10"><button type="button" data-mc-tx-filter-clear class="cursor-pointer rounded-md px-2 py-1 text-sm font-semibold text-blue-600 hover:bg-blue-600/10 dark:text-blue-400">Clear</button></div>'
        : "")
    );
  }

  function detailHtml(c) {
    return (
      '<div class="flex items-center gap-3 border-b border-gray-200 px-4 py-4 sm:px-6 dark:border-white/10">' +
      '<button type="button" data-mc-back aria-label="Back to My Cards" class="flex size-8 cursor-pointer items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10">' +
      '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="size-5"><path stroke-linecap="round" stroke-linejoin="round" d="M16 10H4m0 0 5-5m-5 5 5 5" /></svg></button>' +
      '<h1 class="min-w-0 flex-1 truncate text-lg font-semibold text-gray-950 dark:text-white">' +
      escapeHtml(c.name) +
      "</h1>" +
      gearMenu() +
      "</div>" +
      '<div class="grid grid-cols-1 gap-8 p-4 sm:p-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-0">' +
      '<div class="lg:border-r lg:border-gray-200 lg:pr-6 dark:lg:border-white/10">' +
      cardVisual(c) +
      cardSecrets(c) +
      "</div>" +
      '<div class="flex flex-col gap-8 lg:pl-6">' +
      '<div class="grid grid-cols-1 divide-y divide-gray-200 rounded-xl border border-gray-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0 dark:divide-white/10 dark:border-white/10">' +
      statTile("Available Balance", c.availableBalance) +
      statTile("Current Balance", c.fundedAmount, true) +
      "</div>" +
      cardDetails(c) +
      "</div>" +
      "</div>" +
      '<div class="mx-4 h-px bg-gray-200 sm:mx-6 dark:bg-white/10"></div>' +
      '<div class="flex flex-col gap-4 p-4 sm:p-6">' +
      '<div class="flex flex-col gap-3 sm:flex-row sm:items-center">' +
      '<h2 class="text-lg font-semibold text-gray-900 dark:text-white">Card Transaction History</h2>' +
      '<div class="flex gap-3 sm:ml-auto">' +
      '<div class="relative w-full sm:w-80"><div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4 text-gray-400"><path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clip-rule="evenodd" /></svg></div>' +
      '<input id="mc-tx-search" type="search" autocomplete="off" placeholder="Search Transaction" aria-label="Search transactions" value="' +
      escapeHtml(detail.search) +
      '" class="block w-full rounded-md border-0 bg-white py-1.5 pr-3 pl-9 text-sm font-medium text-gray-900 shadow-xs ring-1 ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-600 focus:outline-none dark:bg-white/5 dark:text-white dark:ring-white/10" /></div>' +
      '<div class="relative"><button type="button" data-mc-tx-filter aria-expanded="' +
      detail.filterOpen +
      '" class="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold whitespace-nowrap text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/5 dark:text-white dark:inset-ring-white/10">' +
      '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path d="M10 4.75a.75.75 0 0 1 .75.75v3.75h3.75a.75.75 0 0 1 0 1.5h-3.75v3.75a.75.75 0 0 1-1.5 0v-3.75H5.5a.75.75 0 0 1 0-1.5h3.75V5.5a.75.75 0 0 1 .75-.75Z" /></svg>Filter' +
      (detail.statuses.size
        ? '<span class="inline-flex items-center rounded-full bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-600 inset-ring inset-ring-gray-500/10 dark:bg-white/10 dark:text-gray-400">' +
          detail.statuses.size +
          "</span>"
        : "") +
      '</button><div id="mc-tx-filter-panel" class="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-md bg-white shadow-lg outline-1 outline-black/5 dark:bg-gray-800 dark:outline-white/10' +
      (detail.filterOpen ? "" : " hidden") +
      '">' +
      (detail.filterOpen ? txFilterPanel() : "") +
      "</div></div>" +
      "</div>" +
      "</div>" +
      '<div class="flex items-start gap-3 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:bg-white/5 dark:text-gray-300">' +
      '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-gray-400"><path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clip-rule="evenodd" /></svg>' +
      '<p>For dispute request you can contact: <a href="tel:8008903128" class="font-medium text-gray-900 hover:underline dark:text-white">800-890-3128</a> or <a href="mailto:dispute-ticket@transcard.com" class="font-medium text-gray-900 hover:underline dark:text-white">dispute-ticket@transcard.com</a></p>' +
      "</div>" +
      '<div id="mc-tx">' +
      txSection(c) +
      "</div>" +
      "</div>"
    );
  }

  function detailSkeleton() {
    var dl = "";
    for (var i = 0; i < 7; i += 1)
      dl +=
        '<div class="grid grid-cols-[14rem_1fr] gap-4 py-1.5"><span class="text-sm font-medium text-gray-900 dark:text-gray-100">' +
        [
          "Admin Number",
          "Name on Card",
          "Card Name",
          "Created",
          "Sent by",
          "Payment Network",
          "Address",
        ][i] +
        "</span>" +
        bar(i === 6 ? "10rem" : "8rem", "1rem") +
        "</div>";
    var rows = "";
    for (var r = 0; r < 6; r += 1)
      rows +=
        '<div class="grid grid-cols-[2rem_8rem_7rem_minmax(0,1fr)_8rem_5rem] items-center gap-3 border-b border-gray-200 py-4 dark:border-white/10">' +
        bar("1rem", "1rem") +
        bar("6rem", "0.9rem") +
        bar("5rem", "0.9rem") +
        bar("7rem", "0.9rem") +
        bar("6rem", "0.9rem") +
        bar("4rem", "1.2rem") +
        "</div>";
    return (
      '<div class="flex items-center gap-3 border-b border-gray-200 px-4 py-4 sm:px-6 dark:border-white/10" aria-hidden="true">' +
      bar("2rem", "2rem") +
      bar("14rem", "1.4rem", true) +
      '<span class="ml-auto">' +
      bar("2.25rem", "2.25rem") +
      "</span></div>" +
      '<div class="grid grid-cols-1 gap-8 p-4 sm:p-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-0" aria-hidden="true">' +
      '<div class="lg:border-r lg:border-gray-200 lg:pr-6 dark:lg:border-white/10"><span class="pp-skel pp-skel-strong block aspect-[1.6/1] w-full rounded-xl"></span><div class="mt-3 flex flex-col gap-2">' +
      bar("100%", "1rem") +
      bar("100%", "1rem") +
      bar("100%", "1rem") +
      "</div></div>" +
      '<div class="flex flex-col gap-8 lg:pl-6"><div class="grid grid-cols-2 rounded-xl border border-gray-200 dark:border-white/10">' +
      '<div class="flex flex-col gap-2 p-5"><span class="text-sm text-gray-500">Available Balance</span>' +
      bar("9rem", "1.75rem") +
      "</div>" +
      '<div class="flex flex-col gap-2 p-5"><span class="text-sm text-gray-500">Current Balance</span>' +
      bar("9rem", "1.75rem") +
      "</div></div>" +
      '<div><h2 class="border-b border-gray-200 pb-4 text-base font-semibold text-gray-900 dark:border-white/10 dark:text-white">Card Details</h2><div class="pt-4">' +
      dl +
      "</div></div></div>" +
      "</div>" +
      '<div class="flex flex-col gap-4 p-4 sm:p-6" aria-hidden="true"><h2 class="text-lg font-semibold text-gray-900 dark:text-white">Card Transaction History</h2>' +
      bar("100%", "2.75rem") +
      rows +
      "</div>"
    );
  }

  function renderTx() {
    var c = findCard(detail.cardId);
    if (!c) return;
    $("mc-tx").innerHTML = txSection(c);
  }

  // ════════════════════════════ ROUTING ════════════════════════════

  function currentCardId() {
    try {
      return new URLSearchParams(window.location.search).get("card");
    } catch (error) {
      return null;
    }
  }

  function showList(opts) {
    opts = opts || {};
    detail.cardId = null;
    $("mc-detail-view").classList.add("hidden");
    $("mc-list-view").classList.remove("hidden");
    setBreadcrumb(null);
    document.title = "My Cards - Consumer Portal";
    if (opts.instant) {
      renderList();
      return;
    }
    $("mc-list-body").setAttribute("aria-busy", "true");
    $("mc-list-body").innerHTML = listSkeleton();
    later(renderList);
  }

  function showCard(id, opts) {
    opts = opts || {};
    var c = findCard(id);
    if (!c) {
      showList({ instant: true });
      return;
    }
    if (detail.cardId !== id) {
      // A different card starts clean: details hidden, first page, no filters.
      detail = {
        cardId: id,
        revealed: false,
        search: "",
        statuses: new Set(),
        sort: "desc",
        page: 1,
        pageSize: detail.pageSize,
        open: new Set(),
        filterOpen: false,
      };
    }
    $("mc-list-view").classList.add("hidden");
    var view = $("mc-detail-view");
    view.classList.remove("hidden");
    setBreadcrumb(c.name);
    document.title = c.name + " - My Cards";
    window.scrollTo(0, 0);
    if (opts.instant) {
      view.innerHTML = detailHtml(c);
      return;
    }
    view.setAttribute("aria-busy", "true");
    view.innerHTML = detailSkeleton();
    later(function () {
      if (currentCardId() !== id) return;
      view.setAttribute("aria-busy", "false");
      view.innerHTML = detailHtml(c);
    });
  }

  function navigate(id) {
    var url =
      window.location.pathname + (id ? "?card=" + encodeURIComponent(id) : "");
    try {
      window.history.pushState({}, "", url);
    } catch (error) {}
    if (id) showCard(id);
    else showList();
  }

  // ── Actions ──

  function downloadStatement(c) {
    var cell = function (v) {
      var t = String(v == null ? "" : v);
      return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
    };
    var lines = [
      [
        "Transaction ID",
        "Date",
        "Merchant",
        "Amount (USD)",
        "Status",
        "Type",
        "Fee (USD)",
      ].join(","),
    ].concat(
      txMatches(c).map(function (t) {
        return [
          t.id,
          formatDate(t.dateTime),
          t.merchant,
          t.amount.toFixed(2),
          t.status,
          t.type,
          t.fee.toFixed(2),
        ]
          .map(cell)
          .join(",");
      }),
    );
    var blob = new Blob(["﻿" + lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download =
      c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") +
      "-" +
      c.last4 +
      "-statement.csv";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
    showToast("Statement downloaded");
  }

  // ── Events ──

  function bind() {
    document.addEventListener("click", function (event) {
      var t = event.target;

      // "Sent by" inside a row goes to that payer's payments, not the card.
      var sender = t.closest("[data-sent-by]");
      if (sender) {
        event.preventDefault();
        window.location.href = "consumer-payments-received.html";
        return;
      }
      var open = t.closest("[data-open-card]");
      if (open) {
        if (
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.button === 1
        )
          return; // new tab keeps working
        event.preventDefault();
        navigate(open.getAttribute("data-open-card"));
        return;
      }
      if (t.closest("[data-mc-toggle]")) {
        list.expanded = !list.expanded;
        renderList();
        return;
      }
      if (t.closest("#mc-filter-btn")) {
        setListFilterOpen(!list.filterOpen);
        return;
      }
      if (t.closest("[data-mc-filter-clear]")) {
        list.senders.clear();
        list.statuses.clear();
        renderList();
        setListFilterOpen(true);
        return;
      }
      if (list.filterOpen && !t.closest("#mc-filter-panel"))
        setListFilterOpen(false);

      if (t.closest("[data-mc-back]") || t.closest("[data-mc-list-crumb]")) {
        event.preventDefault();
        navigate(null);
        return;
      }

      var c = findCard(detail.cardId);
      if (!c) return;
      if (t.closest("[data-mc-reveal]")) {
        detail.revealed = !detail.revealed;
        $("mc-detail-view").innerHTML = detailHtml(c);
        return;
      }
      var copy = t.closest("[data-mc-copy]");
      if (copy) {
        copyText(copy.getAttribute("data-mc-copy"), copy);
        return;
      }
      if (t.closest("[data-mc-statement]")) {
        downloadStatement(c);
        return;
      }
      if (t.closest("[data-mc-request]")) {
        showToast("New card requested — we'll email you when it's ready");
        return;
      }
      if (t.closest("[data-mc-tx-filter]")) {
        detail.filterOpen = !detail.filterOpen;
        $("mc-detail-view").innerHTML = detailHtml(c);
        return;
      }
      if (t.closest("[data-mc-tx-filter-clear]")) {
        detail.statuses.clear();
        detail.page = 1;
        $("mc-detail-view").innerHTML = detailHtml(c);
        return;
      }
      if (detail.filterOpen && !t.closest("#mc-tx-filter-panel")) {
        detail.filterOpen = false;
        $("mc-detail-view").innerHTML = detailHtml(c);
        return;
      }
      if (t.closest("[data-mc-sort]")) {
        detail.sort = detail.sort === "desc" ? "asc" : "desc";
        detail.page = 1;
        renderTx();
        return;
      }
      var nav = t.closest("[data-mc-page]");
      if (nav && !nav.disabled) {
        var pages = Math.max(
          1,
          Math.ceil(txMatches(c).length / detail.pageSize),
        );
        var dir = nav.getAttribute("data-mc-page");
        detail.page =
          dir === "first"
            ? 1
            : dir === "last"
              ? pages
              : dir === "prev"
                ? detail.page - 1
                : detail.page + 1;
        detail.page = Math.max(1, Math.min(pages, detail.page));
        renderTx();
        return;
      }
      var tx = t.closest("[data-mc-tx]");
      if (tx) {
        var id = tx.getAttribute("data-mc-tx");
        if (detail.open.has(id)) detail.open.delete(id);
        else detail.open.add(id);
        renderTx();
      }
    });

    document.addEventListener("input", function (event) {
      if (event.target.id === "mc-search") {
        list.search = event.target.value;
        renderList();
      }
      if (event.target.id === "mc-tx-search") {
        detail.search = event.target.value;
        detail.page = 1;
        renderTx();
      }
    });

    document.addEventListener("change", function (event) {
      var t = event.target;
      if (t.id === "mc-active-only") {
        list.activeOnly = t.checked;
        renderList();
        return;
      }
      if (t.hasAttribute("data-mc-sender")) {
        var s = t.getAttribute("data-mc-sender");
        if (t.checked) list.senders.add(s);
        else list.senders.delete(s);
        renderList();
        setListFilterOpen(true);
        return;
      }
      if (t.hasAttribute("data-mc-status")) {
        var st = t.getAttribute("data-mc-status");
        if (t.checked) list.statuses.add(st);
        else list.statuses.delete(st);
        renderList();
        setListFilterOpen(true);
        return;
      }
      if (t.hasAttribute("data-mc-tx-status")) {
        var ts = t.getAttribute("data-mc-tx-status");
        if (t.checked) detail.statuses.add(ts);
        else detail.statuses.delete(ts);
        detail.page = 1;
        var c = findCard(detail.cardId);
        if (c) $("mc-detail-view").innerHTML = detailHtml(c);
        return;
      }
      if (t.id === "mc-page-size") {
        detail.pageSize = Number(t.value) || 10;
        detail.page = 1;
        renderTx();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      if (list.filterOpen) setListFilterOpen(false);
      if (detail.filterOpen) {
        detail.filterOpen = false;
        var c = findCard(detail.cardId);
        if (c) $("mc-detail-view").innerHTML = detailHtml(c);
      }
    });

    window.addEventListener("popstate", function () {
      var id = currentCardId();
      if (id) showCard(id, { instant: true });
      else showList({ instant: true });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    bind();
    var id = currentCardId();
    // First paint is a skeleton for whichever view the URL asks for.
    if (id) {
      $("mc-list-view").classList.add("hidden");
      $("mc-detail-view").classList.remove("hidden");
      $("mc-detail-view").innerHTML = detailSkeleton();
    } else {
      $("mc-list-body").innerHTML = listSkeleton();
    }
    Promise.resolve(
      window.DataSource ? window.DataSource.load("consumer-cards") : null,
    )
      .catch(function () {
        return null;
      })
      .then(function (data) {
        cards = data && Array.isArray(data.cards) ? data.cards : [];
        if (id && findCard(id)) showCard(id);
        else showList();
      });
  });
})();

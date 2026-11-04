(function () {
  "use strict";

  // Figma "[REVIEW] Vendor Profile" › Vendor Profile - II › Business (8678:7011).
  // Renders the profile of a vendor from the Vendors table
  // (src/data/vendors-network.json); the rows share profileDefaults.

  var ASSETS = "../../../src/assets/vendor-profile/";
  var DATA_PATHS = [
    "../../../src/data/vendors-network.json",
    "/src/data/vendors-network.json",
    "./src/data/vendors-network.json",
  ];
  var STATUS_KEY = "sx_vendor_network_overrides_v1";
  var PREFS_KEY = "sx_vendor_profile_prefs_v1";
  var DEFAULT_VENDOR = "likangs-bakery";

  // Same network statuses as the Vendors table, as the soft badge in the
  // Activity & History header.
  var NETWORK_BADGES = {
    not_in_network: { label: "Not in Network", tone: "gray" },
    invitation_sent: { label: "Invitation sent", tone: "gray" },
    link_request_pending: { label: "Link Request Pending", tone: "blue" },
    in_network: { label: "In Network", tone: "green" },
    request_received: { label: "Request Received", tone: "amber" },
    rejected: { label: "Rejected", tone: "red" },
    linked: { label: "Linked", tone: "green" },
  };
  var TONES = {
    gray: "border-gray-200 bg-gray-100 text-gray-800 dark:border-white/10 dark:bg-white/10 dark:text-gray-200",
    blue: "border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-400/20 dark:bg-blue-500/15 dark:text-blue-300",
    green: "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-500/15 dark:text-emerald-300",
    amber: "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-300",
    red: "border-red-200 bg-red-100 text-red-800 dark:border-red-400/20 dark:bg-red-500/15 dark:text-red-300",
  };

  var TABS = [
    { id: "overview", label: "Overview" },
    { id: "activity", label: "Activity & Invoice History" },
    { id: "buyer", label: "Buyer Preferences" },
  ];

  var state = {
    vendor: null,
    profile: null,
    tab: "overview",
    expanded: {},
    revealed: {},
    editingEmail: false,
  };
  var root = null;
  var bound = false;

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function icon(name, size, extra) {
    return (
      '<img src="' +
      ASSETS +
      name +
      '" alt="" width="' +
      size +
      '" height="' +
      size +
      '" class="shrink-0' +
      (extra ? " " + extra : "") +
      '" />'
    );
  }

  function readJson(key) {
    try {
      return JSON.parse(window.localStorage.getItem(key) || "{}") || {};
    } catch (e) {
      return {};
    }
  }

  function writeJson(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // Kept for this visit only.
    }
  }

  function toast(message) {
    if (typeof window.showGlobalTopToast === "function")
      window.showGlobalTopToast(message);
  }

  function maskTail(value, visible, total) {
    var digits = String(value || "");
    if (!digits) return "---";
    var tail = digits.slice(-visible);
    return new Array(Math.max(0, total - visible) + 1).join("•") + tail;
  }

  // ── Building blocks ──

  function cardHeader(title, subtitle) {
    return (
      '<div class="flex flex-col gap-1 p-6"><h2 class="text-lg/6 font-semibold text-gray-900 dark:text-white">' +
      escapeHtml(title) +
      '</h2><p class="text-sm/5 text-gray-500 dark:text-gray-400">' +
      escapeHtml(subtitle) +
      '</p></div><div class="h-px bg-gray-200 dark:bg-white/10"></div>'
    );
  }

  function card(inner) {
    return (
      '<section class="overflow-hidden rounded-lg border border-gray-200 dark:border-white/10">' +
      inner +
      "</section>"
    );
  }

  function row(label, valueHtml, labelClass) {
    return (
      '<div class="flex flex-wrap gap-x-6 gap-y-1">' +
      '<div class="min-w-[180px] flex-1 text-sm/5 font-medium ' +
      (labelClass || "text-gray-900 dark:text-white") +
      '">' +
      escapeHtml(label) +
      "</div>" +
      '<div class="flex min-w-[180px] flex-1 items-center gap-2.5 text-sm/5 text-gray-700 dark:text-gray-300">' +
      valueHtml +
      "</div></div>"
    );
  }

  function presentBadge() {
    return (
      '<span class="inline-flex items-center gap-0.5 rounded border py-0.5 pr-1 pl-2 text-xs/4 font-medium ' +
      TONES.green +
      '">Present' +
      icon("badge-info-green.svg", 14) +
      "</span>"
    );
  }

  // ── Header: breadcrumbs, name, ID, tabs ──

  function renderHeader() {
    var v = state.vendor;
    var tabs = TABS.map(function (tab) {
      var active = tab.id === state.tab;
      return (
        '<button type="button" role="tab" data-vp-tab="' +
        tab.id +
        '" aria-selected="' +
        active +
        '" class="h-[42px] cursor-pointer border-b-2 py-2.5 text-sm/5 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ' +
        (active
          ? "border-blue-500 font-semibold text-blue-600 dark:text-blue-400"
          : "border-transparent font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200") +
        '">' +
        escapeHtml(tab.label) +
        "</button>"
      );
    }).join("");
    return (
      '<div class="flex flex-col gap-4 px-6 pt-6">' +
      '<div class="flex flex-col gap-2">' +
      '<nav aria-label="Breadcrumb"><ol class="flex items-center gap-4 text-sm/5 font-medium text-gray-500 dark:text-gray-400">' +
      '<li><a href="vendors.html" class="hover:text-gray-700 dark:hover:text-gray-200">Vendors</a></li>' +
      '<li aria-hidden="true">' +
      icon("breadcrumb-chevron.svg", 20) +
      "</li>" +
      '<li><span aria-current="page">' +
      escapeHtml(v.name) +
      "</span></li></ol></nav>" +
      '<div class="flex flex-wrap items-center gap-4">' +
      '<h1 class="text-3xl/9 font-bold text-gray-900 dark:text-white">' +
      escapeHtml(v.name) +
      "</h1>" +
      '<button type="button" data-vp-copy="' +
      escapeHtml(v.companyId) +
      '" title="Copy ID" class="cursor-pointer rounded-md bg-gray-100 px-2.5 py-1.5 text-sm/5 font-semibold text-gray-600 hover:bg-gray-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/15">' +
      escapeHtml(v.companyId) +
      "</button>" +
      "</div></div>" +
      '<div role="tablist" aria-label="Vendor profile" class="relative -mb-px flex gap-6 overflow-x-auto overflow-y-hidden">' +
      tabs +
      "</div></div>" +
      '<div class="h-px bg-gray-200 dark:bg-white/10"></div>'
    );
  }

  // ── Overview ──

  function renderVendorDetails() {
    var v = state.vendor;
    var p = state.profile;
    var body =
      row("Entity Type", escapeHtml(p.entityType)) +
      row("Business Name", escapeHtml(v.name)) +
      row(
        "ID",
        '<span class="flex-1">' +
          escapeHtml(v.companyId) +
          '</span><button type="button" data-vp-copy="' +
          escapeHtml(v.companyId) +
          '" class="cursor-pointer rounded p-0.5 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-blue-600 dark:hover:bg-white/10"><span class="sr-only">Copy ID</span>' +
          icon("copy.svg", 18) +
          "</button>",
      ) +
      row("Onboarded Since", escapeHtml(p.onboardedSince)) +
      row("Billing Address", p.billingAddress.map(escapeHtml).join("<br />")) +
      row("Payment Terms", escapeHtml(p.paymentTerms)) +
      row("TIN", p.tin === "present" ? presentBadge() : "---") +
      row("W9", p.w9 === "present" ? presentBadge() : "---");
    return card(
      cardHeader("Vendor Details", "Business details and application.") +
        '<div class="flex flex-col gap-4 p-6">' +
        body +
        "</div>",
    );
  }

  var STATUS_ICONS = {
    verified: "pm-verified.svg",
    warning: "pm-warning.svg",
    unverified: "pm-unverified.svg",
  };
  var STATUS_LABELS = {
    verified: "Validated",
    warning: "Needs attention",
    unverified: "Not validated",
  };

  function methodHeader(m, open) {
    var logo =
      m.type === "card"
        ? '<span class="flex w-[34px] items-center justify-center rounded-full p-2"><span class="flex h-4 w-6 items-center justify-center rounded bg-[#01326f]">' +
          '<img src="' +
          ASSETS +
          'pm-card-logo.svg" alt="" width="16" height="10" /></span></span>'
        : '<span class="flex rounded-full p-2">' + icon("pm-bank.svg", 18) + "</span>";
    return (
      '<button type="button" data-vp-method="' +
      escapeHtml(m.id) +
      '" aria-expanded="' +
      open +
      '" class="flex w-full cursor-pointer items-center gap-3 rounded-lg p-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 ' +
      (open ? "bg-gray-100 dark:bg-white/10" : "bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10") +
      '">' +
      '<span class="flex size-5 items-center justify-center rounded p-0.5">' +
      icon(open ? "pm-chevron-down.svg" : "pm-chevron-right.svg", 16) +
      "</span>" +
      logo +
      '<span class="flex flex-col gap-1">' +
      '<span class="flex items-center gap-2.5 text-sm/5 font-semibold text-gray-900 dark:text-white">' +
      escapeHtml(m.title) +
      '<img src="' +
      ASSETS +
      STATUS_ICONS[m.status] +
      '" alt="' +
      STATUS_LABELS[m.status] +
      '" title="' +
      STATUS_LABELS[m.status] +
      '" width="16" height="16" class="shrink-0" /></span>' +
      '<span class="text-sm/5 text-gray-500 dark:text-gray-400">••••' +
      escapeHtml(m.last4) +
      "</span></span></button>"
    );
  }

  function checkedValue(text, ok) {
    return (
      "<span>" +
      escapeHtml(text) +
      "</span>" +
      (ok ? icon("pm-check.svg", 20) : icon("pm-field-warning.svg", 20))
    );
  }

  function fraudBadge(score) {
    var good = score >= 7;
    return (
      '<span class="inline-flex items-center gap-0.5 rounded border py-0.5 pr-1 pl-2 text-xs/4 font-medium ' +
      (good ? TONES.green : TONES.red) +
      '">' +
      escapeHtml(score) +
      "/10" +
      icon(good ? "pm-shield-ok.svg" : "pm-shield-bad.svg", 14) +
      "</span>"
    );
  }

  function revealLink(m) {
    var shown = !!state.revealed[m.id];
    return (
      '<button type="button" data-vp-reveal="' +
      escapeHtml(m.id) +
      '" aria-pressed="' +
      shown +
      '" class="inline-flex cursor-pointer items-center gap-1 rounded py-0.5 text-xs/4 font-semibold text-blue-600 hover:text-blue-500 focus-visible:outline-2 focus-visible:outline-blue-600 dark:text-blue-400">' +
      icon("pm-eye.svg", 16) +
      (shown ? "Hide Details" : "Reveal Details") +
      "</button>"
    );
  }

  function methodBody(m) {
    var shown = !!state.revealed[m.id];
    var sep = '<div class="h-px bg-gray-200 dark:bg-white/10"></div>';
    var warn = "text-amber-600 dark:text-amber-400";
    var rows;
    if (m.type === "card") {
      rows =
        row("Name on Card", escapeHtml(m.title)) +
        row("Card Number", escapeHtml(shown ? m.cardNumber.replace(/(\d{4})(?=\d)/g, "$1 ") : maskTail(m.cardNumber, 4, 16))) +
        row("Expiration", escapeHtml(m.expiry));
    } else {
      var v = m.validated || {};
      rows =
        row("Name on Account", checkedValue(m.accountName, v.accountName)) +
        row(
          "Account Number",
          v.accountNumber
            ? checkedValue(shown ? m.accountNumber : maskTail(m.accountNumber, 4, 17), true)
            : '<span class="' + warn + '">---</span>' + icon("pm-field-warning.svg", 20),
          v.accountNumber ? "" : warn,
        ) +
        row(
          "Routing Number",
          v.routingNumber
            ? checkedValue(shown ? m.routingNumber : maskTail(m.routingNumber, 4, 9), true)
            : '<span class="' + warn + '">---</span>' + icon("pm-field-warning.svg", 20),
          v.routingNumber ? "" : warn,
        );
    }
    var account =
      '<div class="flex flex-col gap-2">' +
      rows +
      sep +
      '<div class="flex flex-wrap items-center gap-x-6 gap-y-1">' +
      '<p class="min-w-[180px] flex-1 text-xs/4 text-gray-500 dark:text-gray-400">' +
      (m.type === "card"
        ? ""
        : '<span class="font-medium">Last account validation: </span>' + escapeHtml(m.lastValidation)) +
      "</p>" +
      '<div class="min-w-[180px] flex-1">' +
      revealLink(m) +
      "</div></div></div>";
    var fraud =
      m.type === "card"
        ? ""
        : '<div class="flex flex-col gap-2">' +
          row("Fraud Score", fraudBadge(m.fraudScore)) +
          sep +
          '<p class="text-xs/4 font-medium text-gray-500 dark:text-gray-400">Last fraud score: <span class="font-semibold">' +
          escapeHtml(m.lastFraudScore) +
          "</span></p></div>";
    return (
      '<div id="vp-method-' +
      escapeHtml(m.id) +
      '" class="flex flex-col gap-9 p-4">' +
      account +
      fraud +
      "</div>"
    );
  }

  function renderPaymentMethods() {
    var items = state.profile.paymentMethods
      .map(function (m) {
        var open = !!state.expanded[m.id];
        return (
          '<div class="rounded-lg' +
          (open ? " bg-gray-50 dark:bg-white/5" : "") +
          '">' +
          methodHeader(m, open) +
          (open ? methodBody(m) : "") +
          "</div>"
        );
      })
      .join("");
    return card(
      cardHeader("Payment Methods", "Vendors account details for payment.") +
        '<div class="flex flex-col gap-4 p-6">' +
        items +
        "</div>",
    );
  }

  function renderContact() {
    var v = state.vendor;
    var line = function (name, html) {
      return '<div class="flex items-start gap-2.5">' + icon(name, 20) + html + "</div>";
    };
    return card(
      cardHeader("Contact Information", "Personal details and application.") +
        '<div class="flex flex-col gap-5 p-6 text-sm/5">' +
        line("contact-user.svg", '<span class="font-semibold text-gray-900 dark:text-white">' + escapeHtml(v.contactName || v.name) + "</span>") +
        line(
          "contact-mail.svg",
          '<a href="mailto:' +
            escapeHtml(v.email) +
            '" class="break-all text-gray-700 hover:text-blue-600 dark:text-gray-300">' +
            escapeHtml(v.email) +
            "</a>",
        ) +
        line(
          "contact-phone.svg",
          '<a href="tel:' +
            escapeHtml(String(v.phone || "").replace(/[^\d+]/g, "")) +
            '" class="text-gray-700 hover:text-blue-600 dark:text-gray-300">' +
            escapeHtml(v.phone || "---") +
            "</a>",
        ) +
        "</div>",
    );
  }

  function renderActivity() {
    var badge = NETWORK_BADGES[state.vendor.networkStatus] || NETWORK_BADGES.not_in_network;
    var events = state.profile.activity;
    var items = events
      .map(function (e, i) {
        var last = i === events.length - 1;
        return (
          '<li class="flex gap-2 pt-0.5">' +
          '<div class="flex flex-col items-center gap-0.5 self-stretch pt-0.5">' +
          icon(e.current ? "activity-dot-current.svg" : "activity-dot.svg", 16) +
          (last ? "" : '<div class="w-px flex-1 bg-gray-200 dark:bg-white/10"></div>') +
          "</div>" +
          '<div class="flex min-w-0 flex-1 flex-col gap-2 ' +
          (last ? "pb-3" : "pb-6") +
          '">' +
          '<div class="flex items-center gap-2.5 font-medium">' +
          '<p class="min-w-0 flex-1 text-sm/5 text-gray-950 dark:text-white">' +
          escapeHtml(e.title) +
          "</p>" +
          (e.date
            ? '<p class="shrink-0 text-xs/4 text-gray-500 dark:text-gray-400">' + escapeHtml(e.date) + "</p>"
            : "") +
          "</div>" +
          '<p class="text-xs/4 text-gray-500 dark:text-gray-400">' +
          escapeHtml(e.text) +
          "</p></div></li>"
        );
      })
      .join("");
    return card(
      '<div class="flex items-start gap-3 p-6">' +
        '<div class="flex min-w-0 flex-1 flex-wrap items-center gap-[11px]">' +
        '<h2 class="text-lg/6 font-semibold text-gray-900 dark:text-white">Activity &amp; History</h2>' +
        '<span class="rounded border px-1 py-0.5 text-xs/4 font-medium ' +
        TONES[badge.tone] +
        '">' +
        escapeHtml(badge.label) +
        "</span></div>" +
        '<button type="button" data-vp-tab="activity" title="Open Activity & Invoice History" class="cursor-pointer rounded border border-gray-300 bg-white p-1 shadow-xs hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-white/10 dark:bg-white/5"><span class="sr-only">More</span>' +
        icon("activity-menu.svg", 18) +
        "</button></div>" +
        '<div class="h-px bg-gray-200 dark:bg-white/10"></div>' +
        '<ol class="flex flex-col p-6">' +
        items +
        "</ol>",
    );
  }

  function toggleSwitch(on) {
    return (
      '<button type="button" role="switch" aria-checked="' +
      on +
      '" aria-label="Bulk Payments" data-vp-bulk class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-xl p-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ' +
      (on ? "bg-blue-600" : "bg-gray-200 dark:bg-white/15") +
      '"><span class="size-5 rounded-full bg-white shadow-sm transition-transform ' +
      (on ? "translate-x-5" : "translate-x-0") +
      '"></span></button>'
    );
  }

  function renderPreferences() {
    var prefs = getPrefs();
    var editing = state.editingEmail;
    return (
      '<div class="flex flex-col gap-6 p-6 lg:flex-row">' +
      '<div class="flex max-w-[500px] min-w-0 flex-1 flex-col gap-1 lg:min-w-[320px]">' +
      '<h2 class="text-sm/5 font-semibold text-gray-900 dark:text-white">Preferences</h2>' +
      '<p class="text-sm/5 text-gray-500 dark:text-gray-400">Vendors preference</p></div>' +
      '<div class="flex min-w-0 flex-1 flex-col gap-2">' +
      '<div class="flex items-center gap-4 rounded-lg bg-gray-50 p-4 sm:gap-14 dark:bg-white/5">' +
      '<div class="flex min-w-0 flex-1 flex-col gap-1 pt-0.5 text-sm/5">' +
      '<p class="font-semibold text-gray-900 dark:text-white">Bulk Payments</p>' +
      '<p class="text-gray-500 dark:text-gray-400">This option helps consolidate and streamline multiple payables into a single transaction, saving time, effort, and money.</p></div>' +
      toggleSwitch(prefs.bulkPayments) +
      "</div>" +
      '<div class="flex items-center gap-4 rounded-lg bg-gray-50 p-4 sm:gap-14 dark:bg-white/5">' +
      '<div class="flex min-w-0 flex-1 flex-col gap-2 pt-0.5">' +
      '<div class="flex flex-col gap-1 text-sm/5">' +
      '<p class="font-semibold text-gray-900 dark:text-white">SMART Presentment</p>' +
      '<p class="text-gray-500 dark:text-gray-400">This email will be used to send you important updates and alerts regarding your payments.</p></div>' +
      '<div class="grid w-full max-w-[460px] grid-cols-1">' +
      '<input id="vp-presentment-email" type="email" aria-label="SMART Presentment email" value="' +
      escapeHtml(prefs.presentmentEmail) +
      '"' +
      (editing ? "" : " readonly") +
      ' class="col-start-1 row-start-1 block h-10 w-full rounded-md py-2 pr-3 pl-10 text-base/6 font-medium text-gray-700 shadow-xs outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 dark:text-gray-200 dark:outline-white/10 ' +
      (editing ? "bg-white dark:bg-white/5" : "bg-gray-100 dark:bg-white/10") +
      '" />' +
      icon("presentment-mail.svg", 20, "pointer-events-none col-start-1 row-start-1 ml-3 self-center") +
      "</div>" +
      '<p id="vp-presentment-error" class="hidden text-sm/5 text-red-600 dark:text-red-400">Enter a valid email address.</p>' +
      "</div>" +
      '<button type="button" data-vp-presentment class="shrink-0 cursor-pointer rounded-md px-2.5 py-1.5 text-sm/5 font-semibold text-blue-600 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600 dark:text-blue-400 dark:hover:bg-blue-500/10">' +
      (editing ? "Save" : "Update") +
      "</button></div>" +
      "</div></div>"
    );
  }

  function renderOverview() {
    return (
      '<div class="flex flex-col gap-6 p-6 lg:flex-row lg:items-start">' +
      '<div class="flex min-w-0 flex-col gap-6 lg:flex-[760_1_0%]">' +
      renderVendorDetails() +
      renderPaymentMethods() +
      "</div>" +
      '<div class="flex min-w-0 flex-col gap-6 lg:flex-[448_1_0%]">' +
      renderContact() +
      renderActivity() +
      "</div></div>" +
      '<div class="h-px bg-gray-200 dark:bg-white/10"></div>' +
      renderPreferences()
    );
  }

  // The other two tabs have no design yet.
  function renderEmptyTab(label) {
    return (
      '<div class="px-6 py-16 text-center"><h2 class="text-sm font-semibold text-gray-900 dark:text-white">' +
      escapeHtml(label) +
      '</h2><p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Nothing to show here yet.</p></div>'
    );
  }

  function render() {
    if (!root) return;
    if (!state.vendor) {
      root.innerHTML =
        '<div class="px-6 py-16 text-center"><h1 class="text-lg font-semibold text-gray-900 dark:text-white">Vendor not found</h1><p class="mt-1 text-sm text-gray-500 dark:text-gray-400">This vendor is not in your list.</p><a href="vendors.html" class="mt-4 inline-block text-sm font-semibold text-blue-600 hover:text-blue-500">Back to Vendors</a></div>';
      return;
    }
    document.title = state.vendor.name + " - Vendor Profile";
    var tab = TABS.find(function (t) {
      return t.id === state.tab;
    });
    root.innerHTML =
      renderHeader() +
      '<div role="tabpanel" aria-label="' +
      escapeHtml(tab.label) +
      '">' +
      (state.tab === "overview" ? renderOverview() : renderEmptyTab(tab.label)) +
      "</div>";
  }

  // ── State ──

  function getPrefs() {
    var saved = readJson(PREFS_KEY)[state.vendor.id] || {};
    var defaults = state.profile.preferences || {};
    return {
      bulkPayments: saved.bulkPayments != null ? saved.bulkPayments : defaults.bulkPayments !== false,
      presentmentEmail: saved.presentmentEmail || state.vendor.email || "",
    };
  }

  function savePrefs(patch) {
    var all = readJson(PREFS_KEY);
    var current = getPrefs();
    Object.keys(patch).forEach(function (key) {
      current[key] = patch[key];
    });
    all[state.vendor.id] = current;
    writeJson(PREFS_KEY, all);
  }

  function rerenderKeepFocus(selector) {
    render();
    var el = selector && root.querySelector(selector);
    if (el) el.focus();
  }

  function copyText(text) {
    var done = function () {
      toast("ID copied.");
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, done);
    } else {
      done();
    }
  }

  function bindEvents() {
    if (bound) return;
    bound = true;
    document.addEventListener("click", function (event) {
      if (!root || !document.body.contains(root) || !state.vendor) return;
      var t = event.target;
      var tab = t.closest("[data-vp-tab]");
      if (tab) {
        state.tab = tab.getAttribute("data-vp-tab");
        rerenderKeepFocus('[data-vp-tab="' + state.tab + '"][role="tab"]');
        return;
      }
      var copy = t.closest("[data-vp-copy]");
      if (copy) return copyText(copy.getAttribute("data-vp-copy"));
      var method = t.closest("[data-vp-method]");
      if (method) {
        var id = method.getAttribute("data-vp-method");
        state.expanded[id] = !state.expanded[id];
        rerenderKeepFocus('[data-vp-method="' + CSS.escape(id) + '"]');
        return;
      }
      var reveal = t.closest("[data-vp-reveal]");
      if (reveal) {
        var rid = reveal.getAttribute("data-vp-reveal");
        state.revealed[rid] = !state.revealed[rid];
        rerenderKeepFocus('[data-vp-reveal="' + CSS.escape(rid) + '"]');
        return;
      }
      if (t.closest("[data-vp-bulk]")) {
        var next = !getPrefs().bulkPayments;
        savePrefs({ bulkPayments: next });
        rerenderKeepFocus("[data-vp-bulk]");
        toast(next ? "Bulk Payments turned on." : "Bulk Payments turned off.");
        return;
      }
      if (t.closest("[data-vp-presentment]")) {
        if (!state.editingEmail) {
          state.editingEmail = true;
          render();
          root.querySelector("#vp-presentment-email").focus();
          return;
        }
        var field = root.querySelector("#vp-presentment-email");
        var value = field.value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          root.querySelector("#vp-presentment-error").classList.remove("hidden");
          field.setAttribute("aria-invalid", "true");
          field.focus();
          return;
        }
        savePrefs({ presentmentEmail: value });
        state.editingEmail = false;
        rerenderKeepFocus("[data-vp-presentment]");
        toast("SMART Presentment email updated.");
      }
    });
    document.addEventListener("keydown", function (event) {
      if (!root || !document.body.contains(root)) return;
      if (event.target && event.target.id === "vp-presentment-email" && state.editingEmail) {
        if (event.key === "Enter") {
          event.preventDefault();
          root.querySelector("[data-vp-presentment]").click();
        } else if (event.key === "Escape") {
          state.editingEmail = false;
          rerenderKeepFocus("[data-vp-presentment]");
        }
      }
      // Arrow keys move between tabs.
      var tab = event.target && event.target.closest && event.target.closest('[role="tab"]');
      if (tab && (event.key === "ArrowRight" || event.key === "ArrowLeft")) {
        var index = TABS.findIndex(function (t) {
          return t.id === tab.getAttribute("data-vp-tab");
        });
        var nextTab = TABS[(index + (event.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
        state.tab = nextTab.id;
        rerenderKeepFocus('[data-vp-tab="' + nextTab.id + '"][role="tab"]');
      }
    });
  }

  // Servers with clean URLs redirect vendor-profile.html?id=… to
  // /vendor-profile and drop the query, so a reload would lose the vendor.
  // The last opened vendor is kept for the tab as a fallback.
  var LAST_VENDOR_KEY = "sx_vendor_profile_last_id";

  function resolveVendorId() {
    var id = new URLSearchParams(window.location.search).get("id");
    try {
      if (id) window.sessionStorage.setItem(LAST_VENDOR_KEY, id);
      else id = window.sessionStorage.getItem(LAST_VENDOR_KEY);
    } catch (e) {
      // No storage: fall back to the default vendor.
    }
    return id || DEFAULT_VENDOR;
  }

  function init() {
    root = document.getElementById("vp-root");
    if (!root) return;
    var id = resolveVendorId();
    state.tab = "overview";
    state.expanded = {};
    state.revealed = {};
    state.editingEmail = false;
    bindEvents();
    window.DataSource.load(DATA_PATHS)
      .then(function (payload) {
        var rows = (payload && payload.data) || [];
        var vendor = rows.find(function (r) {
          return r.id === id;
        });
        if (vendor) {
          var status = readJson(STATUS_KEY)[vendor.id];
          if (status && NETWORK_BADGES[status]) vendor.networkStatus = status;
        }
        state.vendor = vendor || null;
        state.profile = (payload && payload.profileDefaults) || null;
        render();
      })
      .catch(function () {
        state.vendor = null;
        render();
      });
  }

  window.initVendorProfilePage = init;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

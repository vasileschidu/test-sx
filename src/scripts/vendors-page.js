(function () {
  "use strict";

  var DEFAULT_PAGE_SIZE = 10;
  var PAGE_SIZE_OPTIONS = [10, 25, 50];
  var REFRESH_SKELETON_MS = 600;
  var OVERRIDES_KEY = "sx_vendor_network_overrides_v1";
  var INVITES_KEY = "sx_vendor_network_invites_v1";
  var ASSETS = "../../../src/assets/vendors/";
  var DATA_PATHS = [
    "../../../src/data/vendors-network.json",
    "/src/data/vendors-network.json",
    "./src/data/vendors-network.json",
  ];

  // Figma "[WIP] SH Sandbox" › Vendors (Default / Hover / Payment Network Types).
  // Each network status has its own badge look and its own row menu.
  var NETWORK_STATUSES = {
    not_in_network: {
      label: "Not in Network",
      icon: "status-not-in-network.svg",
      text: "text-gray-800 dark:text-gray-200",
      actions: ["invite"],
    },
    invitation_sent: {
      label: "Invitation sent",
      icon: "status-invitation-sent.svg",
      text: "text-gray-800 dark:text-gray-200",
      actions: ["resend_invitation"],
    },
    link_request_pending: {
      label: "Link Request Pending",
      icon: "status-link-pending.svg",
      text: "text-blue-800 dark:text-blue-300",
      actions: ["resend_link"],
    },
    in_network: {
      label: "In Network",
      icon: "status-in-network.svg",
      text: "text-blue-800 dark:text-blue-300",
      actions: ["send_link"],
    },
    request_received: {
      label: "Request Received",
      icon: "status-request-received.svg",
      text: "text-amber-800 dark:text-amber-300",
      attention: true,
      actions: ["accept", "reject"],
    },
    rejected: {
      label: "Rejected",
      icon: "status-rejected.svg",
      text: "text-red-800 dark:text-red-300",
      actions: ["send_link"],
    },
    linked: {
      label: "Track",
      logo: "status-track.svg",
      text: "text-gray-800 dark:text-gray-200",
      actions: ["view_preferences", "delete_link"],
    },
  };

  // `flow` opens the Figma modal for the action; the status changes only
  // when that modal is confirmed.
  var ACTIONS = {
    invite: {
      label: "Invite to network",
      icon: "menu-invite.svg",
      flow: "invite",
    },
    resend_invitation: {
      label: "Re-send Invitation",
      icon: "menu-resend.svg",
      flow: "invite_email",
    },
    resend_link: {
      label: "Re-send Link Request",
      icon: "menu-resend.svg",
      flow: "confirm",
      confirm: "send_link",
      next: "link_request_pending",
      toast: "Link request re-sent.",
    },
    send_link: {
      label: "Send Link Request",
      icon: "menu-link.svg",
      flow: "confirm",
      confirm: "send_link",
      next: "link_request_pending",
      toast: "Link request sent.",
    },
    accept: {
      label: "Send Link Request",
      icon: "menu-accept.svg",
      text: "text-emerald-600 dark:text-emerald-400",
      flow: "confirm",
      confirm: "send_link",
      next: "linked",
      toast: "Link request accepted.",
    },
    reject: {
      label: "Reject",
      icon: "menu-reject.svg",
      text: "text-red-600 dark:text-red-400",
      flow: "confirm",
      confirm: "reject",
      next: "rejected",
      toast: "Link request rejected.",
    },
    // No destination is designed yet, so it only closes the menu.
    view_preferences: {
      label: "View Payment Preferences",
      icon: "menu-preferences.svg",
    },
    delete_link: {
      label: "Delete Link",
      icon: "menu-delete-link.svg",
      text: "text-red-600 dark:text-red-400",
      flow: "confirm",
      confirm: "unlink",
      next: "in_network",
      toast: "Vendor unlinked.",
    },
  };

  // Figma "Re-send/Send link request" and "Delete link".
  var CONFIRM_DIALOGS = {
    send_link: {
      icon: "confirm-check.svg",
      title: "Send Link Request",
      text: "By accepting this request, you and your vendor will be linked enabling faster transactions and supply chain financing (if available).",
      ok: "Send",
      cancel: "Go back",
      danger: false,
    },
    reject: {
      icon: "confirm-reject.svg",
      title: "Reject Link Request?",
      text: "By rejecting this request, the link will be unsuccessful. For re-initiation, you will need to send a link request.",
      ok: "Reject",
      cancel: "Go back",
      danger: true,
    },
    unlink: {
      icon: "confirm-unlink.svg",
      title: "Unlink Vendor",
      text: "Disconnect from your vendor’s network on Mastercard Track BPS.",
      ok: "Unlink",
      cancel: "Cancel",
      danger: true,
    },
  };

  // Figma "Invitation sent" (both rows).
  var RESULT_DIALOGS = {
    invitation_sent: {
      icon: "confirm-sending-mail.svg",
      title: "Invitation Email Sent",
      text: "Your invitation to join your company on the network was successfully sent. The invitation includes a link and instructions on how to join your network.",
    },
    profile_confirmed: {
      icon: "confirm-check.svg",
      title: "Profile Confirmed",
      text: "The profile of your vendor has been confirmed. Now you can nudge them to initiate a link request.",
    },
  };

  var METHOD_ICONS = [
    { label: "SMART Disburse", icon: "method-smart-disburse.svg", w: 15, h: 17 },
    { label: "ACH", icon: "method-ach.svg", w: 18, h: 18 },
    { label: "SMART Exchange", icon: "method-smart-exchange.svg", w: 18, h: 18 },
  ];

  var EARLY_AVAILABLE_TIP =
    "You can offer this vendor an early payment option, which means you can pay their invoice(s) before the due date and receive a discount or other incentive.";
  var EARLY_UNAVAILABLE_TIP =
    "The early payment option is not available. However, you can activate this feature by contacting the vendor directly and requesting it.";

  var INVITE_DESCRIPTION =
    "Please join our electronic payments network on Mastercard BPS. Once we are connected, our electronic payments to you can flow faster and easier.";
  var COUNTRIES = ["United States", "Canada", "Mexico", "United Kingdom"];
  var ADVANCED_FIELDS = [
    { key: "name", label: "Business Name", placeholder: "Business Name", info: true },
    { key: "email", label: "Email", placeholder: "example@gmail.com", icon: "field-mail.svg", info: true, type: "email" },
    // Figma sets these two placeholders in text-sm/font-medium.
    { key: "phone", label: "Phone Number", placeholder: "000-00-00000", icon: "field-phone.svg", info: true, type: "tel", smallPlaceholder: true },
    { key: "taxId", label: "Tax ID", placeholder: "000-00-00000", smallPlaceholder: true },
  ];

  var state = {
    vendors: [],
    directory: [],
    search: "",
    networkFilter: new Set(),
    sortDirection: "", // "" keeps the data order, as in Figma

    pageSize: DEFAULT_PAGE_SIZE,
    currentPage: 1,
  };

  var refs = {};
  var floating = null; // { el, anchor, kind }
  var globalHandlersBound = false;

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function asset(name) {
    return ASSETS + name;
  }

  function readOverrides() {
    try {
      return JSON.parse(window.localStorage.getItem(OVERRIDES_KEY) || "{}") || {};
    } catch (e) {
      return {};
    }
  }

  function saveOverride(vendorId, status) {
    var overrides = readOverrides();
    overrides[vendorId] = status;
    try {
      window.localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
    } catch (e) {
      // The change still shows until the page reloads.
    }
  }

  // Email and phone the last invitation went to, so "Re-send Invitation"
  // opens the form already filled in (Figma second "Invite to network" row).
  function readInvites() {
    try {
      return JSON.parse(window.localStorage.getItem(INVITES_KEY) || "{}") || {};
    } catch (e) {
      return {};
    }
  }

  function saveInvite(vendorId, contact) {
    var invites = readInvites();
    invites[vendorId] = contact;
    try {
      window.localStorage.setItem(INVITES_KEY, JSON.stringify(invites));
    } catch (e) {
      // The form falls back to the vendor's own contact details.
    }
  }

  function getNetworkStatus(vendor) {
    return NETWORK_STATUSES[vendor.networkStatus]
      ? vendor.networkStatus
      : "not_in_network";
  }

  function getFilteredVendors() {
    var query = state.search.trim().toLowerCase();
    return state.vendors
      .filter(function (vendor) {
        if (
          query &&
          [vendor.name, vendor.companyId].join(" ").toLowerCase().indexOf(query) ===
            -1
        )
          return false;
        if (
          state.networkFilter.size &&
          !state.networkFilter.has(getNetworkStatus(vendor))
        )
          return false;
        return true;
      })
      .sort(function (a, b) {
        if (!state.sortDirection) return 0;
        var dir = state.sortDirection === "asc" ? 1 : -1;
        return a.name.localeCompare(b.name) * dir;
      });
  }

  function getTotalPages(count) {
    return Math.max(1, Math.ceil(count / state.pageSize));
  }

  var HEADER_CELL =
    "h-14 border-b border-dashed border-gray-200 px-4 py-3 align-middle text-xs/4 font-medium tracking-[0.6px] text-gray-500 uppercase dark:border-white/10 dark:text-gray-400";

  function infoIcon(tip) {
    return (
      '<span class="inline-flex shrink-0 rounded p-0.5"' +
      (tip ? ' tabindex="0" data-tooltip="' + escapeHtml(tip) + '"' : "") +
      '><img src="' +
      asset("header-info.svg") +
      '" alt="" width="16" height="16" /></span>'
    );
  }

  function buildHeader() {
    var filterActive = state.networkFilter.size > 0;
    return (
      "<colgroup>" +
      "<col />" +
      '<col class="w-[156px]" />' +
      '<col class="w-[156px]" />' +
      "<col />" +
      '<col class="w-[206px]" />' +
      '<col class="w-[220px]" />' +
      '<col class="w-[160px]" />' +
      "</colgroup>" +
      "<thead><tr>" +
      '<th scope="col" class="' +
      HEADER_CELL +
      ' text-left"><button type="button" data-sort-name aria-label="Sort by company name" class="inline-flex cursor-pointer items-center gap-1 rounded-md text-xs/4 font-medium tracking-[0.6px] whitespace-nowrap uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><span>Company name</span><span class="rounded-md p-0.5"><img src="' +
      asset("header-sort.svg") +
      '" alt="" width="20" height="20" class="' +
      (state.sortDirection === "desc" ? "rotate-180" : "") +
      '" /></span></button></th>' +
      '<th scope="col" class="' +
      HEADER_CELL +
      ' text-left whitespace-nowrap">Company ID</th>' +
      '<th scope="col" class="' +
      HEADER_CELL +
      ' text-left">#&nbsp;of Open Payables</th>' +
      '<th scope="col" class="' +
      HEADER_CELL +
      ' text-left whitespace-nowrap">Payment terms</th>' +
      '<th scope="col" class="' +
      HEADER_CELL +
      ' text-left">Method of Payment</th>' +
      '<th scope="col" class="' +
      HEADER_CELL +
      ' text-right"><div class="flex items-center justify-end gap-1"><span class="whitespace-nowrap">Payment network</span>' +
      infoIcon("") +
      '<button type="button" data-network-filter aria-label="Filter by payment network" aria-haspopup="true" class="inline-flex cursor-pointer rounded-md p-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600' +
      (filterActive ? " bg-blue-100 dark:bg-blue-500/20" : "") +
      '"><span class="inline-flex size-5 items-center justify-center"><img src="' +
      asset("header-filter.svg") +
      '" alt="" width="14" height="14" /></span></button></div></th>' +
      '<th scope="col" class="' +
      HEADER_CELL +
      ' pl-0 text-right"><div class="flex items-center justify-end gap-1"><span>Early Payment Option</span>' +
      infoIcon(EARLY_AVAILABLE_TIP) +
      "</div></th>" +
      "</tr></thead>"
    );
  }

  function buildMethods(vendor) {
    var supported = vendor.methods || [];
    return METHOD_ICONS.filter(function (method) {
      return supported.indexOf(method.label) !== -1;
    })
      .map(function (method) {
        return (
          '<span tabindex="0" data-method-tip="' +
          escapeHtml(method.label) +
          '" class="inline-flex size-[18px] shrink-0 items-center justify-center rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-blue-600"><img src="' +
          asset(method.icon) +
          '" alt="' +
          escapeHtml(method.label) +
          '" width="' +
          method.w +
          '" height="' +
          method.h +
          '" /></span>'
        );
      })
      .join("");
  }

  function buildNetworkControl(vendor) {
    var status = NETWORK_STATUSES[getNetworkStatus(vendor)];
    var border = status.attention ? "border-amber-300" : "border-gray-300";
    var badgeIcon = status.logo
      ? '<img src="' +
        asset(status.logo) +
        '" alt="" width="16" height="10" class="shrink-0" />'
      : '<img src="' +
        asset(status.icon) +
        '" alt="" width="14" height="14" class="shrink-0" />';
    return (
      '<div class="inline-flex' +
      (status.attention ? " rounded border-4 border-[rgba(250,209,77,0.2)]" : "") +
      '"><button type="button" data-network-menu="' +
      escapeHtml(vendor.id) +
      '" aria-haspopup="true" aria-label="' +
      escapeHtml(status.label + ": actions for " + vendor.name) +
      '" class="group/net inline-flex cursor-pointer items-stretch rounded focus-visible:outline-none">' +
      // Figma strokes sit inside the 30px box; CSS borders add to it, so the
      // padding is 1px smaller than the design's 7px to keep both halves 30px.
      '<span class="inline-flex h-[30px] items-center justify-center rounded-l border bg-white py-[6px] pr-[11px] pl-[9px] shadow-xs dark:bg-white/5 ' +
      border +
      '"><span class="inline-flex items-center ' +
      (status.logo ? "gap-1" : "gap-0.5") +
      '">' +
      badgeIcon +
      '<span class="text-xs/4 font-medium whitespace-nowrap ' +
      status.text +
      '">' +
      escapeHtml(status.label) +
      "</span></span></span>" +
      '<span class="inline-flex size-[30px] items-center justify-center rounded-r border border-l-0 bg-white p-1.5 shadow-xs group-focus-visible/net:ring-2 group-focus-visible/net:ring-blue-600 group-focus-visible/net:ring-offset-2 dark:bg-white/5 ' +
      border +
      '"><img src="' +
      asset(status.attention ? "chevron-down-amber.svg" : "chevron-down.svg") +
      '" alt="" width="16" height="16" /></span>' +
      "</button></div>"
    );
  }

  function buildEarlyPayment(vendor) {
    if (vendor.earlyPaymentAvailable) {
      return '<span tabindex="0" data-early-tip="available" class="inline-flex cursor-default items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs/4 font-medium whitespace-nowrap text-emerald-800 outline-none focus-visible:outline-2 focus-visible:outline-blue-600 dark:bg-emerald-500/15 dark:text-emerald-300">Available</span>';
    }
    return (
      '<span tabindex="0" data-early-tip="unavailable" data-vendor-id="' +
      escapeHtml(vendor.id) +
      '" class="inline-flex cursor-default items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs/4 font-medium whitespace-nowrap text-gray-800 outline-none focus-visible:outline-2 focus-visible:outline-blue-600 dark:bg-white/10 dark:text-gray-300">Not available</span>'
    );
  }

  function buildRows(vendors) {
    var cell =
      "h-[52px] border-b border-gray-200 px-4 py-0 align-middle text-sm/5 text-gray-500 dark:border-white/10 dark:text-gray-400";
    return vendors
      .map(function (vendor) {
        return (
          '<tr data-vendor-row class="cursor-pointer bg-white dark:bg-gray-900">' +
          '<td class="' +
          cell +
          '"><a href="vendor-profile.html?id=' +
          encodeURIComponent(vendor.id) +
          '" class="block truncate rounded-sm font-medium text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-white" title="' +
          escapeHtml(vendor.name) +
          '">' +
          escapeHtml(vendor.name) +
          "</a></td>" +
          '<td class="' +
          cell +
          ' whitespace-nowrap">' +
          escapeHtml(vendor.companyId) +
          "</td>" +
          '<td class="' +
          cell +
          '">' +
          escapeHtml(vendor.openPayables) +
          "</td>" +
          '<td class="' +
          cell +
          ' whitespace-nowrap">' +
          escapeHtml(vendor.paymentTerms) +
          "</td>" +
          '<td class="' +
          cell +
          '"><div class="flex items-center gap-2">' +
          buildMethods(vendor) +
          "</div></td>" +
          '<td class="' +
          cell +
          '"><div class="flex justify-end">' +
          // flex-end lets a wide status (Link Request Pending) grow to the
          // left, so every chevron stays on the column's right edge.
          buildNetworkControl(vendor) +
          "</div></td>" +
          '<td class="' +
          cell +
          ' pl-0 text-right">' +
          buildEarlyPayment(vendor) +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  function buildTable() {
    if (!refs.table) return;
    var filtered = getFilteredVendors();
    var start = (state.currentPage - 1) * state.pageSize;
    var page = filtered.slice(start, start + state.pageSize);
    var body = page.length
      ? buildRows(page)
      : '<tr><td colspan="7" class="px-0 py-6"><div class="rounded-2xl border border-dashed border-gray-300 bg-gray-50/80 px-6 py-10 text-center dark:border-white/10 dark:bg-white/5"><h3 class="text-sm font-semibold text-gray-900 dark:text-white">No vendors found</h3><p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Adjust the search or filters to find a vendor.</p></div></td></tr>';
    refs.table.innerHTML = buildHeader() + "<tbody>" + body + "</tbody>";
  }

  function pageButton(nav, icon, label, disabled) {
    return (
      '<button type="button" data-page-nav="' +
      nav +
      '" aria-label="' +
      label +
      '" class="inline-flex size-[30px] cursor-pointer items-center justify-center rounded-md border border-gray-300 bg-white p-2 shadow-xs hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:bg-white dark:border-white/10 dark:bg-white/5"' +
      (disabled ? " disabled" : "") +
      '><img src="' +
      asset(icon) +
      '" alt="" width="20" height="20" class="max-w-none" /></button>'
    );
  }

  function renderPagination() {
    if (!refs.pagination) return;
    var total = getFilteredVendors().length;
    var totalPages = getTotalPages(total);
    if (state.currentPage > totalPages) state.currentPage = totalPages;
    var start = total ? (state.currentPage - 1) * state.pageSize + 1 : 0;
    var end = Math.min(total, state.currentPage * state.pageSize);
    var isFirst = state.currentPage === 1;
    var isLast = state.currentPage === totalPages;
    refs.pagination.innerHTML =
      '<div class="flex flex-wrap items-center justify-end gap-4 text-sm/5 text-gray-700 dark:text-gray-300">' +
      '<label class="flex items-center gap-4"><span>Rows per page:</span>' +
      '<span class="grid grid-cols-1"><select id="vendors-page-size" class="col-start-1 row-start-1 h-10 w-[75px] cursor-pointer appearance-none rounded-md bg-white py-2 pr-8 pl-3 text-base text-gray-900 shadow-xs outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 dark:bg-white/5 dark:text-white dark:outline-white/10">' +
      PAGE_SIZE_OPTIONS.map(function (size) {
        return (
          '<option value="' +
          size +
          '"' +
          (size === state.pageSize ? " selected" : "") +
          ">" +
          size +
          "</option>"
        );
      }).join("") +
      '</select><img src="' +
      asset("select-chevron.svg") +
      '" alt="" width="20" height="20" class="pointer-events-none col-start-1 row-start-1 mr-3 self-center justify-self-end" /></span></label>' +
      '<p>Showing <span class="font-semibold">' +
      start +
      " - " +
      end +
      '</span> of <span class="font-semibold">' +
      total +
      "</span> results</p>" +
      '<div class="flex gap-2">' +
      pageButton("first", "page-first.svg", "First page", isFirst) +
      pageButton("prev", "page-prev.svg", "Previous page", isFirst) +
      pageButton("next", "page-next.svg", "Next page", isLast) +
      pageButton("last", "page-last.svg", "Last page", isLast) +
      "</div></div>";
  }

  function renderCount() {
    if (!refs.count) return;
    var count = state.vendors.length;
    refs.count.textContent = count + (count === 1 ? " company" : " companies");
  }

  function render() {
    closeFloating();
    renderCount();
    buildTable();
    renderPagination();
  }

  // ── Floating layers (row menus, filter, early payment tooltips) ──
  // They sit on <body> with fixed positioning so the table's scroll
  // container never clips them.

  function closeFloating() {
    if (!floating) return;
    floating.el.remove();
    if (floating.kind === "menu" && floating.anchor)
      floating.anchor.setAttribute("aria-expanded", "false");
    floating = null;
  }

  function placeBelowRight(el, anchor) {
    var rect = anchor.getBoundingClientRect();
    el.style.top = rect.bottom + 4 + "px";
    el.style.right = Math.max(8, window.innerWidth - rect.right) + "px";
    var menuRect = el.getBoundingClientRect();
    if (menuRect.bottom > window.innerHeight - 8) {
      el.style.top = Math.max(8, rect.top - menuRect.height - 4) + "px";
    }
  }

  function openFloating(kind, anchor, html) {
    closeFloating();
    var el = document.createElement("div");
    el.className = "fixed z-50";
    el.innerHTML = html;
    document.body.appendChild(el);
    floating = { el: el, anchor: anchor, kind: kind };
    return el;
  }

  function findVendor(id) {
    return (
      state.vendors.find(function (vendor) {
        return vendor.id === id;
      }) || null
    );
  }

  function openNetworkMenu(button) {
    var vendor = findVendor(button.getAttribute("data-network-menu"));
    if (!vendor) return;
    if (floating && floating.anchor === button) {
      closeFloating();
      return;
    }
    var status = NETWORK_STATUSES[getNetworkStatus(vendor)];
    var items = status.actions
      .map(function (key) {
        var action = ACTIONS[key];
        return (
          '<button type="button" role="menuitem" data-network-action="' +
          key +
          '" data-vendor-id="' +
          escapeHtml(vendor.id) +
          '" class="flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left text-sm/5 whitespace-nowrap hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none dark:hover:bg-white/5 dark:focus-visible:bg-white/5 ' +
          (action.text || "text-gray-900 dark:text-white") +
          '"><img src="' +
          asset(action.icon) +
          '" alt="" width="20" height="20" class="shrink-0" />' +
          escapeHtml(action.label) +
          "</button>"
        );
      })
      .join("");
    var el = openFloating(
      "menu",
      button,
      '<div role="menu" class="flex min-w-[242px] flex-col overflow-hidden rounded-md bg-white shadow-lg ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10">' +
        items +
        "</div>",
    );
    button.setAttribute("aria-expanded", "true");
    placeBelowRight(el, button);
    var first = el.querySelector("[data-network-action]");
    if (first) first.focus();
  }

  function openNetworkFilter(button) {
    if (floating && floating.anchor === button) {
      closeFloating();
      return;
    }
    var options = Object.keys(NETWORK_STATUSES)
      .map(function (key) {
        var status = NETWORK_STATUSES[key];
        return (
          '<app-checkbox class="rounded-md px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-white/5" data-network-filter-value="' +
          key +
          '"' +
          (state.networkFilter.has(key) ? " checked" : "") +
          ">" +
          escapeHtml(status.label === "Track" ? "Track (linked)" : status.label) +
          "</app-checkbox>"
        );
      })
      .join("");
    var el = openFloating(
      "filter",
      button,
      '<div class="w-60 rounded-md bg-white p-2 text-left shadow-lg ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10">' +
        '<p class="px-2 pt-1 pb-2 text-xs/4 font-medium tracking-[0.6px] text-gray-500 uppercase dark:text-gray-400">Payment network</p>' +
        options +
        '<div class="mt-1 border-t border-gray-200 px-2 pt-2 dark:border-white/10"><button type="button" data-network-filter-clear class="cursor-pointer text-sm/5 font-semibold text-blue-600 hover:text-blue-500 disabled:cursor-not-allowed disabled:text-gray-400 dark:text-blue-400"' +
        (state.networkFilter.size ? "" : " disabled") +
        ">Clear</button></div>" +
        "</div>",
    );
    placeBelowRight(el, button);
  }

  // Figma "Hover": a dark chip centred 5px above the payment method icon.
  function showMethodTip(icon) {
    if (floating && (floating.anchor === icon || floating.kind !== "tip"))
      return;
    var el = openFloating(
      "tip",
      icon,
      '<div role="tooltip" class="rounded-lg bg-gray-900 px-2.5 py-2 text-sm/5 whitespace-nowrap text-gray-50 shadow-lg dark:bg-gray-950 dark:ring-1 dark:ring-white/10">' +
        escapeHtml(icon.getAttribute("data-method-tip")) +
        "</div>",
    );
    el.classList.add("pointer-events-none");
    var rect = icon.getBoundingClientRect();
    var tipRect = el.getBoundingClientRect();
    var left = rect.left + rect.width / 2 - tipRect.width / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tipRect.width - 8));
    var top = rect.top - tipRect.height - 5;
    el.style.left = left + "px";
    el.style.top = (top < 8 ? rect.bottom + 5 : top) + "px";
  }

  function showEarlyTip(badge) {
    if (floating && (floating.anchor === badge || floating.kind !== "tip"))
      return;
    var available = badge.getAttribute("data-early-tip") === "available";
    var vendor = findVendor(badge.getAttribute("data-vendor-id"));
    var html =
      '<div role="tooltip" class="w-[360px] max-w-[calc(100vw-1rem)] rounded-lg bg-gray-900 p-3 text-left text-sm/5 text-white shadow-lg">' +
      escapeHtml(available ? EARLY_AVAILABLE_TIP : EARLY_UNAVAILABLE_TIP) +
      (!available && vendor && vendor.email
        ? ' <a href="mailto:' +
          escapeHtml(vendor.email) +
          '" class="font-medium text-blue-400 hover:text-blue-300">Contact vendor &rarr;</a>'
        : "") +
      "</div>";
    var el = openFloating("tip", badge, html);
    var rect = badge.getBoundingClientRect();
    var tipRect = el.getBoundingClientRect();
    el.style.right = Math.max(8, window.innerWidth - rect.right) + "px";
    var top = rect.top - tipRect.height - 8;
    el.style.top = (top < 8 ? rect.bottom + 8 : top) + "px";
    el.addEventListener("mouseleave", function () {
      if (floating && floating.el === el) closeFloating();
    });
  }

  function setVendorStatus(vendor, status) {
    vendor.networkStatus = status;
    saveOverride(vendor.id, status);
    render();
  }

  function focusVendorMenu(vendor) {
    var button =
      refs.table &&
      refs.table.querySelector('[data-network-menu="' + CSS.escape(vendor.id) + '"]');
    if (button) button.focus();
  }

  function runNetworkAction(key, vendorId) {
    var vendor = findVendor(vendorId);
    var action = ACTIONS[key];
    closeFloating();
    if (!vendor || !action) return;
    if (action.flow === "invite") return openInvite(vendor, "search");
    if (action.flow === "invite_email") return openInvite(vendor, "email");
    if (action.flow === "confirm") return openConfirm(vendor, action);
    focusVendorMenu(vendor);
  }

  // ── Confirmation and result modals ──

  function openConfirm(vendor, action) {
    var dialog = document.getElementById("vn-confirm-dialog");
    var config = CONFIRM_DIALOGS[action.confirm];
    if (!dialog || !config) return;
    document.getElementById("vn-confirm-icon").src = asset(config.icon);
    document.getElementById("vn-confirm-title").textContent = config.title;
    document.getElementById("vn-confirm-text").textContent = config.text;
    document.getElementById("vn-confirm-cancel").textContent = config.cancel;
    var ok = document.getElementById("vn-confirm-ok");
    ok.textContent = config.ok;
    ok.className =
      "w-full cursor-pointer rounded-md px-6 py-3 text-base/6 font-medium text-white shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 " +
      (config.danger
        ? "bg-red-600 hover:bg-red-500 focus-visible:outline-red-600"
        : "bg-blue-600 hover:bg-blue-500 focus-visible:outline-blue-600");
    ok.onclick = function () {
      dialog.close();
      setVendorStatus(vendor, action.next);
      if (action.toast && typeof window.showGlobalTopToast === "function")
        window.showGlobalTopToast(action.toast);
      focusVendorMenu(vendor);
    };
    dialog.showModal();
  }

  function openResult(key, vendor) {
    var dialog = document.getElementById("vn-result-dialog");
    var config = RESULT_DIALOGS[key];
    if (!dialog || !config) return;
    document.getElementById("vn-result-icon").src = asset(config.icon);
    document.getElementById("vn-result-title").textContent = config.title;
    document.getElementById("vn-result-text").textContent = config.text;
    dialog.addEventListener(
      "close",
      function () {
        if (vendor) focusVendorMenu(vendor);
      },
      { once: true },
    );
    dialog.showModal();
  }

  // ── Network Search and Invite (Figma "Invite to network" … "Invite via Email") ──
  // invite.mode: "search" | "email"; search.view: "simple" | "advanced" |
  // "results" (advanced search submitted) | "empty" (no matches).

  var invite = null;

  function emptyAdvanced() {
    return { name: "", email: "", phone: "", taxId: "", address: "", city: "", country: "", zip: "", state: "" };
  }

  function openInvite(vendor, mode) {
    var dialog = document.getElementById("vn-invite-dialog");
    if (!dialog) return;
    var resend = mode === "email";
    var sent = resend ? readInvites()[vendor.id] || {} : {};
    invite = {
      vendor: vendor,
      mode: mode,
      view: "simple",
      query: "",
      advanced: emptyAdvanced(),
      selectedId: "",
      email: resend ? sent.email || vendor.email || "" : "",
      phone: resend ? sent.phone || vendor.phone || "" : "",
      description: resend && sent.description ? sent.description : INVITE_DESCRIPTION,
    };
    renderInvite();
    dialog.addEventListener(
      "close",
      function () {
        invite = null;
      },
      { once: true },
    );
    dialog.showModal();
    focusInviteField();
  }

  function focusInviteField() {
    var body = document.getElementById("vn-invite-body");
    var field = body && body.querySelector("[data-invite-autofocus]");
    if (field) field.focus();
  }

  function normalize(value) {
    return String(value || "").toLowerCase().replace(/[\s\-().+]/g, "");
  }

  function tokens(value) {
    return String(value || "")
      .toLowerCase()
      .split(/[^a-z0-9@]+/)
      .filter(function (word) {
        return word.length > 1;
      });
  }

  // Figma "Results shown": "Big Kahuna Burger Ltd." also lists "Great Kahuna
  // Burger Ltd.", so a name matches when most of the typed words appear in it;
  // tax ID, email and phone still need an exact fragment.
  function searchDirectory(query) {
    var q = normalize(query);
    if (q.length < 2) return [];
    var words = tokens(query);
    return state.directory.filter(function (entry) {
      var exact = [entry.name, entry.taxId, entry.email, entry.phone].some(
        function (value) {
          return normalize(value).indexOf(q) !== -1;
        },
      );
      if (exact || words.length < 2) return exact;
      var nameWords = tokens(entry.name);
      var hits = words.filter(function (word) {
        return nameWords.indexOf(word) !== -1;
      }).length;
      return hits / words.length > 0.5;
    });
  }

  function searchAdvanced(fields) {
    var keys = Object.keys(fields).filter(function (key) {
      return String(fields[key] || "").trim();
    });
    if (!keys.length) return [];
    return state.directory.filter(function (entry) {
      return keys.every(function (key) {
        return normalize(entry[key]).indexOf(normalize(fields[key])) !== -1;
      });
    });
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  }

  var INPUT_CLASS =
    "block h-10 w-full rounded-md bg-white px-3 text-base text-gray-900 shadow-xs outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500";
  var LABEL_CLASS = "text-sm/5 font-medium text-gray-700 dark:text-gray-300";

  function linkButton(attr, icon, label) {
    return (
      '<button type="button" ' +
      attr +
      ' class="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-3 py-2 text-base/6 font-semibold whitespace-nowrap text-blue-600 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600 dark:text-blue-400 dark:hover:bg-blue-500/10"><img src="' +
      asset(icon) +
      '" alt="" width="20" height="20" />' +
      label +
      "</button>"
    );
  }

  function iconInput(field, value, attrs) {
    var hasIcon = !!field.icon;
    return (
      '<div class="grid grid-cols-1">' +
      '<input id="vn-adv-' +
      field.key +
      '" type="' +
      (field.type || "text") +
      '" data-adv-field="' +
      field.key +
      '" value="' +
      escapeHtml(value) +
      '" placeholder="' +
      escapeHtml(field.placeholder || "") +
      '" class="col-start-1 row-start-1 ' +
      INPUT_CLASS +
      (hasIcon ? " pl-10" : "") +
      (field.smallPlaceholder ? " placeholder:text-sm placeholder:font-medium" : "") +
      '"' +
      (attrs || "") +
      " />" +
      (hasIcon
        ? '<img src="' +
          asset(field.icon) +
          '" alt="" width="20" height="20" class="pointer-events-none col-start-1 row-start-1 ml-3 self-center" />'
        : "") +
      "</div>"
    );
  }

  function fieldBlock(field, value, attrs) {
    return (
      '<div class="flex flex-col gap-1"><div class="flex items-center gap-1"><label for="vn-adv-' +
      field.key +
      '" class="' +
      LABEL_CLASS +
      '">' +
      escapeHtml(field.label) +
      "</label>" +
      (field.info
        ? '<img src="' + asset("field-info.svg") + '" alt="" width="18" height="18" />'
        : "") +
      "</div>" +
      iconInput(field, value, attrs) +
      "</div>"
    );
  }

  function searchHeader(advancedOn) {
    return (
      '<div class="flex flex-wrap items-center justify-between gap-3">' +
      '<div class="flex flex-wrap items-center gap-2.5">' +
      '<h3 class="text-lg/6 font-medium whitespace-nowrap text-gray-900 dark:text-white">Search in Network</h3>' +
      '<span class="group/sin relative inline-flex">' +
      '<button type="button" aria-describedby="vn-search-tip" class="inline-flex cursor-pointer rounded-md p-0.5 focus-visible:outline-2 focus-visible:outline-blue-600"><span class="sr-only">About Search in Network</span><img src="' +
      asset("invite-info.svg") +
      '" alt="" width="18" height="18" /></button>' +
      '<span id="vn-search-tip" role="tooltip" class="pointer-events-none invisible absolute top-full left-0 z-30 mt-2 flex w-[336px] gap-3 rounded-lg bg-white p-4 opacity-0 shadow-lg ring-1 ring-black/5 transition-opacity group-focus-within/sin:visible group-focus-within/sin:opacity-100 group-hover/sin:visible group-hover/sin:opacity-100 dark:bg-gray-800 dark:ring-white/10">' +
      '<img src="' +
      asset("tooltip-info.svg") +
      '" alt="" width="20" height="20" class="shrink-0 self-start" />' +
      '<span class="flex flex-col gap-1 pt-0.5 text-sm/5"><span class="font-medium text-gray-900 dark:text-white">Search in Network</span><span class="text-gray-500 dark:text-gray-400">Quickly determine whether a customer is part of the Mastercard Track BPS network.</span></span>' +
      "</span></span>" +
      '<label class="flex cursor-pointer items-center gap-4 rounded-md bg-gray-50 p-2 dark:bg-white/5">' +
      '<input type="checkbox" role="switch" data-invite-advanced class="peer sr-only"' +
      (advancedOn ? " checked" : "") +
      " />" +
      '<img src="' +
      asset(advancedOn ? "toggle-on.svg" : "toggle-off.svg") +
      '" alt="" width="44" height="24" class="rounded-full peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-600" />' +
      '<span class="text-sm/5 font-medium whitespace-nowrap text-gray-700 dark:text-gray-300">Advanced search</span>' +
      "</label>" +
      "</div>" +
      linkButton('data-invite-mode="email"', "invite-mail-link.svg", "Invite via Email") +
      "</div>"
    );
  }

  function resultCard(entry) {
    var selected = invite.selectedId === entry.id;
    var address = [entry.address, entry.city + ",", entry.state, entry.zip].join(" ");
    return (
      '<button type="button" role="radio" aria-checked="' +
      selected +
      '" data-invite-result="' +
      escapeHtml(entry.id) +
      '" class="flex w-full cursor-pointer flex-col gap-1 rounded-lg bg-white px-6 py-4 text-left shadow-xs outline-1 -outline-offset-1 hover:bg-gray-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 dark:bg-white/5 dark:hover:bg-white/10 ' +
      (selected ? "outline-2 -outline-offset-2 outline-blue-600" : "outline-gray-300 dark:outline-white/10") +
      '">' +
      '<span class="flex flex-wrap items-baseline gap-x-2"><span class="text-base/6 font-medium text-gray-900 dark:text-white">' +
      escapeHtml(entry.name) +
      '</span><span class="text-sm/5 text-gray-500 dark:text-gray-400">' +
      escapeHtml(entry.taxId) +
      "</span></span>" +
      '<span class="flex w-full min-w-0 flex-col gap-1 text-sm/5 text-gray-500 sm:flex-row sm:gap-6 dark:text-gray-400">' +
      '<span class="flex shrink-0 gap-1"><img src="' +
      asset("result-mail.svg") +
      '" alt="" width="20" height="20" />' +
      escapeHtml(entry.email) +
      "</span>" +
      '<span class="flex shrink-0 gap-1"><img src="' +
      asset("result-phone.svg") +
      '" alt="" width="20" height="20" />' +
      escapeHtml(entry.phone) +
      "</span>" +
      '<span class="flex min-w-0 flex-1 gap-1"><img src="' +
      asset("result-building.svg") +
      '" alt="" width="20" height="20" class="shrink-0" /><span class="truncate">' +
      escapeHtml(address) +
      "</span></span></span></button>"
    );
  }

  function noMatchButton(extraClass) {
    return (
      '<button type="button" data-invite-mode="email" class="cursor-pointer items-center justify-center gap-[5px] rounded-[10px] border-2 border-dashed border-gray-300 px-6 py-4 text-sm/5 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-blue-600 dark:border-white/15 dark:hover:bg-white/5 ' +
      extraClass +
      '">'
    );
  }

  function renderResultsList(results) {
    return (
      '<div role="radiogroup" aria-label="Network search results" class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 pt-4 pb-6">' +
      results.map(resultCard).join("") +
      noMatchButton("flex w-full") +
      '<span class="text-gray-500 dark:text-gray-400">No match?</span><span class="font-medium text-blue-600 dark:text-blue-400">Invite via Email</span></button>' +
      "</div>"
    );
  }

  function renderEmptyState() {
    return (
      '<div class="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-6 pt-4 pb-6"><div class="flex flex-col items-center gap-2 py-6 text-center">' +
      '<img src="' +
      asset("no-results.svg") +
      '" alt="" width="85" height="80" class="ml-[13px]" />' +
      '<p class="text-2xl/8 font-semibold text-gray-900 dark:text-white">No matches found</p>' +
      '<p class="text-sm/5 text-gray-500 dark:text-gray-400">Looks like there were no matches for your search.<br />Please modify your search</p>' +
      '<p class="text-sm/5 text-gray-500 dark:text-gray-400">or</p>' +
      noMatchButton("inline-flex") +
      '<span class="font-medium text-blue-600 dark:text-blue-400">Invite via Email</span></button>' +
      "</div></div>"
    );
  }

  function searchSummary() {
    var a = invite.advanced;
    var parts = [a.name, a.email, a.phone, a.taxId, a.address, a.city, a.state, a.zip, a.country].filter(
      function (value) {
        return String(value || "").trim();
      },
    );
    return (
      '<div class="flex flex-col gap-1"><span class="' +
      LABEL_CLASS +
      '">Search Details</span>' +
      '<div class="flex h-10 items-center rounded-md bg-white shadow-xs outline-1 -outline-offset-1 outline-gray-300 dark:bg-white/5 dark:outline-white/10">' +
      '<span class="min-w-0 flex-1 truncate px-3 text-base/6 font-medium text-gray-900 dark:text-white">' +
      escapeHtml(parts.join(", ")) +
      "</span>" +
      '<button type="button" data-invite-modify class="h-full shrink-0 cursor-pointer rounded-md px-3 text-base/6 font-medium text-blue-600 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600 dark:text-blue-400 dark:hover:bg-blue-500/10">Modify Search</button>' +
      "</div></div>"
    );
  }

  function renderAdvancedForm() {
    var a = invite.advanced;
    var right = function (key, label, extra) {
      return (
        '<div class="flex flex-col gap-1 ' +
        (extra || "") +
        '"><label for="vn-adv-' +
        key +
        '" class="' +
        LABEL_CLASS +
        '">' +
        label +
        '</label><input id="vn-adv-' +
        key +
        '" type="text" data-adv-field="' +
        key +
        '" value="' +
        escapeHtml(a[key]) +
        '" class="' +
        INPUT_CLASS +
        '" /></div>'
      );
    };
    return (
      '<div class="flex flex-col gap-6 sm:flex-row">' +
      '<div class="flex min-w-0 flex-1 flex-col gap-4">' +
      ADVANCED_FIELDS.map(function (field, index) {
        return fieldBlock(field, a[field.key], index === 0 ? " data-invite-autofocus" : "");
      }).join("") +
      "</div>" +
      '<div class="flex w-full flex-col gap-6 sm:w-[364px]">' +
      '<div class="flex flex-col gap-4">' +
      right("address", "Address Line") +
      right("city", "City") +
      '<div class="flex flex-col gap-1"><label for="vn-adv-country" class="' +
      LABEL_CLASS +
      '">Country</label><div class="grid grid-cols-1"><select id="vn-adv-country" data-adv-field="country" class="col-start-1 row-start-1 appearance-none pr-10 ' +
      // Placeholder grey until a country is picked (Figma "Select country").
      INPUT_CLASS.replace("text-gray-900", a.country ? "text-gray-900" : "text-gray-400") +
      '"><option value=""' +
      (a.country ? "" : " selected") +
      ">Select country</option>" +
      COUNTRIES.map(function (country) {
        return (
          '<option value="' +
          escapeHtml(country) +
          '" class="text-gray-900"' +
          (a.country === country ? " selected" : "") +
          ">" +
          escapeHtml(country) +
          "</option>"
        );
      }).join("") +
      '</select><img src="' +
      asset("field-chevron.svg") +
      '" alt="" width="20" height="20" class="pointer-events-none col-start-1 row-start-1 mr-3 self-center justify-self-end" /></div></div>' +
      '<div class="flex gap-4">' +
      right("zip", "ZIP Code", "flex-1") +
      right("state", "State", "flex-1") +
      "</div>" +
      "</div>" +
      '<button type="button" data-invite-advanced-search class="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md bg-blue-50 px-4 py-2 text-base/6 font-medium text-blue-600 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-blue-600 dark:bg-blue-500/10 dark:text-blue-400"><img src="' +
      asset("invite-search-blue.svg") +
      '" alt="" width="20" height="20" />Search</button>' +
      "</div></div>"
    );
  }

  function renderSearchMode() {
    var view = invite.view;
    if (view === "advanced") {
      return (
        '<div class="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-5">' +
        searchHeader(true) +
        renderAdvancedForm() +
        "</div>"
      );
    }
    if (view === "results" || view === "empty") {
      var advResults = searchAdvanced(invite.advanced);
      return (
        '<div class="flex shrink-0 flex-col gap-6 border-b border-gray-300 px-6 py-5 dark:border-white/10">' +
        searchHeader(true) +
        searchSummary() +
        "</div>" +
        (advResults.length ? renderResultsList(advResults) : renderEmptyState())
      );
    }
    var results = searchDirectory(invite.query);
    var hasQuery = normalize(invite.query).length >= 2;
    return (
      '<div class="flex shrink-0 flex-col gap-6 px-6 py-5' +
      (hasQuery ? " border-b border-gray-200 dark:border-white/10" : "") +
      '">' +
      searchHeader(false) +
      '<div class="grid grid-cols-1"><input id="vn-invite-query" type="text" role="searchbox" autocomplete="off" data-invite-query data-invite-autofocus aria-label="Search in network" value="' +
      escapeHtml(invite.query) +
      '" placeholder="Search by business name, tax ID, email or phone number" class="col-start-1 row-start-1 pr-10 ' +
      INPUT_CLASS +
      '" /><img src="' +
      asset("invite-search-input.svg") +
      '" alt="" width="20" height="20" class="pointer-events-none col-start-1 row-start-1 mr-3 self-center justify-self-end" /></div>' +
      "</div>" +
      (!hasQuery ? '<div class="flex-1"></div>' : results.length ? renderResultsList(results) : renderEmptyState())
    );
  }

  function renderEmailMode() {
    return (
      '<div class="flex shrink-0 items-center justify-between gap-3 border-b border-gray-300 px-6 py-5 dark:border-white/10">' +
      '<h3 class="text-lg/6 font-medium text-gray-900 dark:text-white">Invite to network</h3>' +
      linkButton('data-invite-mode="search"', "invite-search-link.svg", "Search in Network") +
      "</div>" +
      '<div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 pt-4 pb-6">' +
      '<p class="rounded-md bg-gray-50 p-4 text-center text-sm/5 text-gray-600 dark:bg-white/5 dark:text-gray-300">We will send an invitation to join your network on Mastercard Track BPS. The email invitation will provide your customer with the instructions they need to join network.</p>' +
      '<div class="flex flex-col gap-4 sm:flex-row sm:gap-9">' +
      '<div class="flex flex-1 flex-col gap-1"><label for="vn-invite-email" class="' +
      LABEL_CLASS +
      '">Email</label><div class="grid grid-cols-1"><input id="vn-invite-email" type="email" data-invite-email data-invite-autofocus autocomplete="email" value="' +
      escapeHtml(invite.email) +
      '" placeholder="example@mail.you" class="col-start-1 row-start-1 pl-10 ' +
      INPUT_CLASS +
      '" /><img src="' +
      asset("field-mail.svg") +
      '" alt="" width="20" height="20" class="pointer-events-none col-start-1 row-start-1 ml-3 self-center" /></div></div>' +
      '<div class="flex flex-1 flex-col gap-1"><label for="vn-invite-phone" class="' +
      LABEL_CLASS +
      '">Phone Number</label><div class="grid grid-cols-1"><input id="vn-invite-phone" type="tel" data-invite-phone autocomplete="tel" value="' +
      escapeHtml(invite.phone) +
      '" placeholder="000-00-000-00000" class="col-start-1 row-start-1 pl-10 ' +
      INPUT_CLASS +
      '" /><img src="' +
      asset("field-phone.svg") +
      '" alt="" width="20" height="20" class="pointer-events-none col-start-1 row-start-1 ml-3 self-center" /></div></div>' +
      "</div>" +
      '<div class="flex flex-col gap-1"><div class="flex justify-between gap-1 text-sm/5 font-medium"><label for="vn-invite-description" class="text-gray-700 dark:text-gray-300">Description</label><span class="text-gray-500 dark:text-gray-400">Optional</span></div>' +
      '<textarea id="vn-invite-description" data-invite-description rows="4" class="block h-[126px] w-full resize-y rounded-md bg-white px-3 py-2 text-base/6 text-gray-900 shadow-xs outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 dark:bg-white/5 dark:text-white dark:outline-white/10">' +
      escapeHtml(invite.description) +
      "</textarea></div>" +
      "</div>"
    );
  }

  function syncInviteConfirm() {
    var confirm = document.getElementById("vn-invite-confirm");
    if (!confirm || !invite) return;
    confirm.disabled =
      invite.mode === "email" ? !isValidEmail(invite.email) : !invite.selectedId;
  }

  function renderInvite() {
    var body = document.getElementById("vn-invite-body");
    if (!body || !invite) return;
    body.innerHTML = invite.mode === "email" ? renderEmailMode() : renderSearchMode();
    syncInviteConfirm();
  }

  // Re-render the search results without rebuilding the input being typed in.
  function rerenderKeepingFocus(selector) {
    var active = document.activeElement;
    var caret = active && typeof active.selectionStart === "number" ? active.selectionStart : null;
    renderInvite();
    var field = document.querySelector(selector);
    if (field) {
      field.focus();
      if (caret !== null && field.setSelectionRange) field.setSelectionRange(caret, caret);
    }
  }

  function confirmInvite() {
    if (!invite) return;
    var vendor = invite.vendor;
    var mode = invite.mode;
    var dialog = document.getElementById("vn-invite-dialog");
    if (mode === "email" && !isValidEmail(invite.email)) return;
    if (mode === "search" && !invite.selectedId) return;
    dialog.close();
    if (mode === "email") {
      saveInvite(vendor.id, {
        email: invite.email.trim(),
        phone: invite.phone.trim(),
        description: invite.description,
      });
      setVendorStatus(vendor, "invitation_sent");
      openResult("invitation_sent", vendor);
    } else {
      setVendorStatus(vendor, "in_network");
      openResult("profile_confirmed", vendor);
    }
  }

  function bindInviteEvents() {
    var dialog = document.getElementById("vn-invite-dialog");
    if (!dialog || dialog.dataset.bound) return;
    dialog.dataset.bound = "true";

    dialog.addEventListener("click", function (event) {
      if (!invite) return;
      var target = event.target;
      var modeBtn = target.closest("[data-invite-mode]");
      if (modeBtn) {
        invite.mode = modeBtn.getAttribute("data-invite-mode");
        invite.selectedId = "";
        renderInvite();
        focusInviteField();
        return;
      }
      var result = target.closest("[data-invite-result]");
      if (result) {
        invite.selectedId = result.getAttribute("data-invite-result");
        renderInvite();
        var again = dialog.querySelector(
          '[data-invite-result="' + CSS.escape(invite.selectedId) + '"]',
        );
        if (again) again.focus();
        return;
      }
      if (target.closest("[data-invite-advanced-search]")) {
        invite.selectedId = "";
        invite.view = searchAdvanced(invite.advanced).length ? "results" : "empty";
        renderInvite();
        return;
      }
      if (target.closest("[data-invite-modify]")) {
        invite.view = "advanced";
        invite.selectedId = "";
        renderInvite();
        focusInviteField();
        return;
      }
      if (target.closest("#vn-invite-confirm")) confirmInvite();
    });

    dialog.addEventListener("change", function (event) {
      if (!invite) return;
      var target = event.target;
      if (target.matches("[data-invite-advanced]")) {
        invite.view = target.checked ? "advanced" : "simple";
        invite.selectedId = "";
        renderInvite();
        var toggle = dialog.querySelector("[data-invite-advanced]");
        if (toggle) toggle.focus();
        return;
      }
      if (target.matches("select[data-adv-field]")) {
        invite.advanced[target.getAttribute("data-adv-field")] = target.value;
        target.classList.toggle("text-gray-400", !target.value);
        target.classList.toggle("text-gray-900", !!target.value);
      }
    });

    dialog.addEventListener("input", function (event) {
      if (!invite) return;
      var target = event.target;
      if (target.matches("[data-invite-query]")) {
        invite.query = target.value;
        invite.selectedId = "";
        rerenderKeepingFocus("[data-invite-query]");
        return;
      }
      if (target.matches("input[data-adv-field]")) {
        invite.advanced[target.getAttribute("data-adv-field")] = target.value;
        return;
      }
      if (target.matches("[data-invite-email]")) invite.email = target.value;
      if (target.matches("[data-invite-phone]")) invite.phone = target.value;
      if (target.matches("[data-invite-description]")) invite.description = target.value;
      syncInviteConfirm();
    });

    dialog.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" || !invite) return;
      if (event.target.matches("input[data-adv-field]")) {
        event.preventDefault();
        var search = dialog.querySelector("[data-invite-advanced-search]");
        if (search) search.click();
      }
    });
  }

  function renderLoadingState() {
    if (!refs.table || !window.TableSkeleton) return;
    window.TableSkeleton.render({
      tableEl: refs.table,
      rowCount: 10,
      columns: [
        { key: "name", label: "Company name", sortable: true },
        { key: "id", label: "Company ID" },
        { key: "open", label: "# of Open Payables" },
        { key: "terms", label: "Payment terms" },
        { key: "methods", label: "Method of Payment" },
        { key: "network", label: "Payment network", type: "status" },
        { key: "early", label: "Early Payment Option", type: "status" },
      ],
    });
  }

  function loadVendors() {
    return window.DataSource.load(DATA_PATHS)
      .then(function (payload) {
        var overrides = readOverrides();
        var rows = payload && Array.isArray(payload.data) ? payload.data : [];
        state.directory =
          payload && Array.isArray(payload.directory) ? payload.directory : [];
        state.vendors = rows.map(function (vendor) {
          if (overrides[vendor.id] && NETWORK_STATUSES[overrides[vendor.id]])
            vendor.networkStatus = overrides[vendor.id];
          return vendor;
        });
      })
      .catch(function () {
        state.vendors = [];
      })
      .then(render);
  }

  function bindPageEvents() {
    if (refs.search) {
      refs.search.addEventListener("input", function () {
        state.search = refs.search.value || "";
        state.currentPage = 1;
        render();
      });
    }
    if (refs.refreshBtn) {
      refs.refreshBtn.addEventListener("click", function () {
        renderLoadingState();
        setTimeout(function () {
          render();
          if (typeof window.showGlobalTopToast === "function")
            window.showGlobalTopToast("Data synced. You're up to date.");
        }, REFRESH_SKELETON_MS);
      });
    }
  }

  // Document-level handlers survive shell navigation, so bind them once and
  // look the page up through refs each time.
  function bindGlobalEvents() {
    if (globalHandlersBound) return;
    globalHandlersBound = true;

    document.addEventListener("click", function (event) {
      if (!refs.table || !document.body.contains(refs.table)) return;
      var target = event.target;

      var actionBtn = target.closest("[data-network-action]");
      if (actionBtn) {
        runNetworkAction(
          actionBtn.getAttribute("data-network-action"),
          actionBtn.getAttribute("data-vendor-id"),
        );
        return;
      }
      if (target.closest("[data-network-filter-clear]")) {
        state.networkFilter.clear();
        state.currentPage = 1;
        render();
        return;
      }
      if (floating && floating.el.contains(target)) return;

      var menuBtn = target.closest("[data-network-menu]");
      if (menuBtn) {
        openNetworkMenu(menuBtn);
        return;
      }
      var filterBtn = target.closest("[data-network-filter]");
      if (filterBtn) {
        openNetworkFilter(filterBtn);
        return;
      }
      if (target.closest("[data-sort-name]")) {
        state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
        state.currentPage = 1;
        render();
        return;
      }
      // A click anywhere else on a row opens the vendor profile through the
      // row's name link, so shell navigation handles it like any link.
      var vendorRow = target.closest("[data-vendor-row]");
      if (
        vendorRow &&
        !target.closest("a, button, [data-method-tip], [data-early-tip]") &&
        !(window.getSelection && String(window.getSelection()).trim())
      ) {
        var link = vendorRow.querySelector('a[href*="vendor-profile.html"]');
        if (link) link.click();
        return;
      }
      var pageBtn = target.closest("[data-page-nav]");
      if (pageBtn && !pageBtn.disabled) {
        var totalPages = getTotalPages(getFilteredVendors().length);
        var nav = pageBtn.getAttribute("data-page-nav");
        if (nav === "first") state.currentPage = 1;
        if (nav === "prev") state.currentPage = Math.max(1, state.currentPage - 1);
        if (nav === "next")
          state.currentPage = Math.min(totalPages, state.currentPage + 1);
        if (nav === "last") state.currentPage = totalPages;
        render();
        return;
      }
      closeFloating();
    });

    document.addEventListener("change", function (event) {
      if (!refs.table || !document.body.contains(refs.table)) return;
      var checkbox = event.target.closest("[data-network-filter-value]");
      if (checkbox) {
        var key = checkbox.getAttribute("data-network-filter-value");
        if (checkbox.checked) state.networkFilter.add(key);
        else state.networkFilter.delete(key);
        state.currentPage = 1;
        render();
        var filterBtn = refs.table.querySelector("[data-network-filter]");
        if (filterBtn) openNetworkFilter(filterBtn);
        return;
      }
      if (event.target.id === "vendors-page-size") {
        state.pageSize = Number(event.target.value) || DEFAULT_PAGE_SIZE;
        state.currentPage = 1;
        render();
      }
    });

    function earlyTipFrom(event) {
      return (
        event.target.closest &&
        event.target.closest("[data-early-tip], [data-method-tip]")
      );
    }
    function showTipFor(el) {
      if (el.hasAttribute("data-method-tip")) showMethodTip(el);
      else showEarlyTip(el);
    }
    document.addEventListener("mouseover", function (event) {
      var badge = earlyTipFrom(event);
      if (badge) showTipFor(badge);
    });
    document.addEventListener("mouseout", function (event) {
      var badge = earlyTipFrom(event);
      if (!badge || !floating || floating.anchor !== badge) return;
      if (event.relatedTarget && floating.el.contains(event.relatedTarget))
        return;
      closeFloating();
    });
    document.addEventListener("focusin", function (event) {
      var badge = earlyTipFrom(event);
      if (badge) showTipFor(badge);
      else if (
        floating &&
        floating.kind === "tip" &&
        !floating.el.contains(event.target)
      )
        closeFloating();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape" || !floating) return;
      var anchor = floating.anchor;
      closeFloating();
      if (anchor && document.body.contains(anchor)) anchor.focus();
    });
    window.addEventListener("resize", closeFloating);
    window.addEventListener("scroll", closeFloating, true);
  }

  function init() {
    refs.table = document.getElementById("vendors-table");
    refs.pagination = document.querySelector("[data-vendors-pagination]");
    refs.search = document.getElementById("vendors-search-input");
    refs.count = document.getElementById("vendors-count");
    refs.refreshBtn = document.getElementById("vendors-refresh-btn");
    if (!refs.table) return;
    state.search = "";
    state.currentPage = 1;
    bindPageEvents();
    bindGlobalEvents();
    bindInviteEvents();
    renderLoadingState();
    loadVendors();
  }

  window.initVendorsPage = init;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

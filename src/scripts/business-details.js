/**
 * business-details.js
 * Business Details page (Figma [REVIEW] User Management, 6.3), opened from the
 * business switcher's "Business Details" button and Settings › Business Details.
 * Name follows the active business in the switcher (AppPlans); status, created
 * on, business ID, associated applications and ACH Debit come from UMStore.
 * The ID copy button is the shared OBModal.copyButton.
 */
(function () {
  "use strict";

  var ICON_CLOCK =
    '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="size-3.5 shrink-0"><path fill-rule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5v-3.5Z" clip-rule="evenodd" /></svg>';
  var ICON_PROGRESS =
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 2" aria-hidden="true" class="size-3.5 shrink-0"><circle cx="8" cy="8" r="6" /></svg>';
  var ICON_ARROW =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 shrink-0"><path fill-rule="evenodd" d="M5.22 14.78a.75.75 0 0 0 1.06 0l7.22-7.22v5.69a.75.75 0 0 0 1.5 0v-7.5a.75.75 0 0 0-.75-.75h-7.5a.75.75 0 0 0 0 1.5h5.69l-7.22 7.22a.75.75 0 0 0 0 1.06Z" clip-rule="evenodd" /></svg>';

  var APP_STATUS = {
    "under-review": {
      label: "Under Review",
      icon: ICON_CLOCK,
      cls: "bg-blue-100 text-blue-800 dark:bg-blue-400/10 dark:text-blue-400",
      iconCls: "text-blue-500 dark:text-blue-400",
    },
    "in-progress": {
      label: "In Progress",
      icon: ICON_PROGRESS,
      cls: "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300",
      iconCls: "text-gray-500 dark:text-gray-400",
    },
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(iso) {
    var date = new Date(iso + "T00:00:00");
    if (isNaN(date.getTime())) return iso || "—";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  }

  function statusBadge(status) {
    var active = status === "Active";
    return (
      '<span class="inline-flex items-center rounded-full px-2.5 py-0.5 type-label ' +
      (active
        ? "bg-green-100 text-green-800 dark:bg-green-400/10 dark:text-green-400"
        : "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300") +
      '">' +
      escapeHtml(status) +
      "</span>"
    );
  }

  function appBadge(key) {
    var status = APP_STATUS[key] || APP_STATUS["in-progress"];
    return (
      '<span class="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 type-label-small whitespace-nowrap ' +
      status.cls +
      '"><span class="inline-flex ' +
      status.iconCls +
      '">' +
      status.icon +
      "</span>" +
      status.label +
      "</span>"
    );
  }

  function appCard(app) {
    return (
      '<li class="flex flex-col gap-3 rounded-md border border-gray-300 p-4 dark:border-white/15">' +
      '<div class="flex items-center justify-between gap-2"><span class="truncate type-body-large font-medium text-default">' +
      escapeHtml(app.name) +
      "</span>" +
      appBadge(app.status) +
      "</div>" +
      '<p class="type-caption text-tertiary">' +
      escapeHtml(app.note) +
      "</p>" +
      '<a href="' +
      escapeHtml(app.portalHref || "#") +
      '" class="-mx-1 flex items-center justify-between rounded-sm px-1 type-caption font-medium text-blue-600 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-blue-400 dark:hover:text-blue-300">Go to Portal<span class="sr-only"> (' +
      escapeHtml(app.name) +
      ")</span>" +
      ICON_ARROW +
      "</a></li>"
    );
  }

  function render() {
    var business = window.UMStore.getBusiness();
    if (!business) return;
    var active = window.AppPlans && window.AppPlans.getActiveBusiness();
    var name = (active && active.name) || business.name;
    var id = business.businessId;
    var nameEl = document.getElementById("bd-name");
    nameEl.textContent = name;
    nameEl.title = name;
    document.getElementById("bd-settings-name").textContent = name;
    document.getElementById("bd-status").innerHTML = statusBadge(business.status);
    document.getElementById("bd-created").textContent = formatDate(business.createdOn);
    document.getElementById("bd-id").textContent = id;
    if (window.OBModal && window.OBModal.copyButton)
      document.getElementById("bd-id-copy").innerHTML = window.OBModal.copyButton("Business ID", id);
    document.getElementById("bd-apps").innerHTML = (business.applications || [])
      .map(appCard)
      .join("");
    var ach = document.getElementById("bd-ach");
    ach.checked = !!business.settings.achDebit;
    ach.disabled = false;
    syncAchLabel();
    document.getElementById("bd-body").removeAttribute("aria-busy");
  }

  function syncAchLabel() {
    document.getElementById("bd-ach-state").textContent = document.getElementById("bd-ach").checked
      ? "On"
      : "Off";
  }

  function init() {
    if (!window.UMStore || !document.getElementById("bd-body")) return;
    document.getElementById("bd-ach").addEventListener("change", function (event) {
      var on = event.target.checked;
      syncAchLabel();
      window.UMStore.setBusinessSetting("achDebit", on);
      if (typeof window.showGlobalTopToast === "function")
        window.showGlobalTopToast(on ? "ACH Debit turned on" : "ACH Debit turned off");
    });
    if (window.AppPlans) window.AppPlans.onChange(render);
    window.UMStore.load().then(render);
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();

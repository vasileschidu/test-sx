/**
 * @file sidebar.js
 * @description Handles the Supplier Portal dashboard sidebar behavior including:
 *   - Desktop sidebar collapse/expand with smooth transitions
 *   - Submenu expand/collapse animations
 *   - Nav tooltip display on collapsed sidebar hover
 *   - Active nav item highlighting
 *   - Table row expand/collapse for the payments table
 *
 * Functions exposed globally (called from HTML onclick attributes):
 *   - toggleExpandableItem(trigger)
 *   - toggleSmartExchangeSubmenu(chevronBtn)
 *   - toggleRow(rowId)
 */

/* ===== Table Row Expand/Collapse ===== */

/**
 * Toggles visibility of an expandable detail row in the payments table.
 * @param {string} rowId - The identifier matching data-detail and data-chevron attributes.
 */
function toggleRow(rowId) {
  const detailRow = document.querySelector('[data-detail="' + rowId + '"]');
  const chevron = document.querySelector('[data-chevron="' + rowId + '"]');
  if (!detailRow) return;
  detailRow.classList.toggle("hidden");
  if (chevron) {
    chevron.classList.toggle("rotate-180");
  }
}

/* ===== Desktop Sidebar State ===== */

const DESKTOP_SIDEBAR_COLLAPSED_STORAGE_KEY = "dashboard-sidebar-collapsed-v1";

function clearSidebarBootState() {
  var root = document.documentElement;
  root.classList.remove("sidebar-booting");
  var style = document.getElementById("dashboard-sidebar-boot-style");
  if (style) style.remove();
}

function getSidebarRefs() {
  return {
    appShell: document.getElementById("app-shell"),
    desktopSidebarShell: document.getElementById("desktop-sidebar-shell"),
    desktopSidebarPanel: document.getElementById("desktop-sidebar-panel"),
    desktopSidebarCollapseBtn: document.getElementById(
      "desktop-sidebar-collapse-btn",
    ),
    desktopLogoRow: document.getElementById("desktop-logo-row"),
    desktopLogoFull: document.getElementById("desktop-logo-full"),
    desktopLogoMark: document.getElementById("desktop-logo-mark"),
    desktopSidebarHelp: document.getElementById("desktop-sidebar-help"),
    desktopSidebarFooter: document.getElementById("desktop-sidebar-footer"),
    mainContentWrapper: document.getElementById("main-content-wrapper"),
    desktopNav: document.querySelector('[data-nav="desktop"]'),
  };
}

function normalizeMainContentWrapperLayout(collapsed) {
  var refs = getSidebarRefs();
  var appShell = refs.appShell;
  var mainContentWrapper = refs.mainContentWrapper;
  if (appShell) {
    appShell.style.minHeight = "";
  }
  if (!mainContentWrapper) return;
  var isCollapsed =
    typeof collapsed === "boolean"
      ? collapsed
      : document.documentElement.getAttribute("data-sidebar-collapsed") ===
        "true";
  mainContentWrapper.classList.remove(
    "lg:pl-[304px]",
    "lg:pl-[288px]",
    "lg:pl-[68px]",
    "lg:pl-[80px]",
    "lg:pl-[81px]",
  );
  mainContentWrapper.classList.add(
    "min-w-0",
    "min-h-screen",
    "flex",
    "flex-col",
  );
  mainContentWrapper.classList.add(
    isCollapsed ? "lg:pl-[80px]" : "lg:pl-[304px]",
  );
}

function ensureNavTooltip() {
  var existing = document.getElementById("dashboard-nav-tooltip");
  if (existing) return existing;

  var tooltip = document.createElement("div");
  tooltip.id = "dashboard-nav-tooltip";
  tooltip.className =
    "pointer-events-none fixed z-[80] rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg";
  tooltip.style.opacity = "0";
  tooltip.style.transform = "translateX(-4px)";
  tooltip.style.transition = "opacity 150ms ease-out, transform 150ms ease-out";
  document.body.appendChild(tooltip);
  return tooltip;
}

function ensureDesktopNavCurrentIndicator() {
  var desktopNav = getSidebarRefs().desktopNav;
  if (!desktopNav) return null;
  var existing = desktopNav.querySelector("#desktop-nav-current-indicator");
  if (existing) existing.remove();
  return null;
}

function syncDesktopNavCurrentIndicator(immediate) {
  var refs = getSidebarRefs();
  var desktopNav = refs.desktopNav;
  if (!desktopNav) return;

  var indicator = ensureDesktopNavCurrentIndicator();
  if (!indicator) return;

  var activeItem = desktopNav.querySelector(".nav-item.is-active");
  if (!activeItem) {
    indicator.style.opacity = "0";
    return;
  }

  var navRect = desktopNav.getBoundingClientRect();
  var itemRect = activeItem.getBoundingClientRect();
  var left = -16;
  var top = itemRect.top - navRect.top + 8;
  var height = Math.max(itemRect.height - 16, 8);

  if (immediate) {
    indicator.style.transition = "none";
  }

  indicator.style.left = left + "px";
  indicator.style.height = height + "px";
  indicator.style.transform = "translateY(" + top + "px)";
  indicator.style.opacity = "1";

  if (immediate) {
    requestAnimationFrame(function () {
      indicator.style.transition = "";
    });
  }
}

/* ===== Nav Label Preparation ===== */

/**
 * Wraps loose text nodes inside nav items with a span.nav-label element
 * so they can be individually hidden/shown during sidebar collapse.
 */
function prepareDesktopNavLabels() {
  var desktopNav = getSidebarRefs().desktopNav;
  if (!desktopNav) return;
  desktopNav
    .querySelectorAll(
      ".nav-item > span, .nav-item > a, [data-smart-exchange-trigger] > a",
    )
    .forEach(function (group) {
      if (group.querySelector(".nav-label")) return;

      const textNodes = Array.from(group.childNodes).filter(function (node) {
        return (
          node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0
        );
      });
      if (!textNodes.length) return;

      const label = document.createElement("span");
      label.className = "nav-label";
      label.textContent = textNodes
        .map(function (node) {
          return node.textContent.trim();
        })
        .join(" ");

      textNodes.forEach(function (node) {
        node.remove();
      });
      group.appendChild(label);
    });
}

/* ===== Sidebar Collapse Helpers ===== */

/**
 * Checks whether the desktop sidebar is currently in collapsed state.
 * @returns {boolean} True if the sidebar has the 'is-collapsed' class.
 */
function isDesktopSidebarCollapsed() {
  var desktopSidebarShell = getSidebarRefs().desktopSidebarShell;
  return Boolean(
    desktopSidebarShell &&
    desktopSidebarShell.classList.contains("is-collapsed"),
  );
}

function loadDesktopSidebarCollapsedPreference() {
  try {
    return (
      localStorage.getItem(DESKTOP_SIDEBAR_COLLAPSED_STORAGE_KEY) === "true"
    );
  } catch (error) {
    return false;
  }
}

function saveDesktopSidebarCollapsedPreference(collapsed) {
  try {
    localStorage.setItem(
      DESKTOP_SIDEBAR_COLLAPSED_STORAGE_KEY,
      collapsed ? "true" : "false",
    );
  } catch (error) {}
}

var navTooltipToken = 0;
var navTooltipCleanup = null;

/**
 * Hides the floating nav tooltip with a fade-out transition.
 */
function hideNavTooltip() {
  navTooltipToken += 1;
  if (navTooltipCleanup) {
    navTooltipCleanup();
    navTooltipCleanup = null;
  }
  var navTooltip = document.getElementById("dashboard-nav-tooltip");
  if (!navTooltip) return;
  navTooltip.style.opacity = "0";
  navTooltip.style.transform = "translateX(-4px)";
}

function revealNavTooltip(token) {
  if (token !== navTooltipToken) return;
  var navTooltip = ensureNavTooltip();
  requestAnimationFrame(function () {
    if (token !== navTooltipToken) return;
    navTooltip.style.opacity = "1";
    navTooltip.style.transform = "translateX(0)";
  });
}

function positionHoverTooltip(reference) {
  var tooltip = ensureNavTooltip();
  var token = navTooltipToken;
  loadFloatingUi()
    .then(function (floating) {
      if (token !== navTooltipToken) return;
      if (navTooltipCleanup) navTooltipCleanup();
      navTooltipCleanup = floating.autoUpdate(reference, tooltip, function () {
        if (token !== navTooltipToken) return;
        floating
          .computePosition(reference, tooltip, {
            placement: "right",
            strategy: "fixed",
            middleware: [
              floating.offset(8),
              floating.flip({
                fallbackPlacements: ["right-start", "right-end"],
              }),
              floating.shift({ mainAxis: false, crossAxis: true, padding: 8 }),
            ],
          })
          .then(function (position) {
            if (token !== navTooltipToken) return;
            tooltip.style.left = position.x + "px";
            tooltip.style.top = position.y + "px";
          });
      });
      revealNavTooltip(token);
    })
    .catch(function () {
      if (token !== navTooltipToken) return;
      var rect = reference.getBoundingClientRect();
      tooltip.style.left = rect.right + 8 + "px";
      tooltip.style.top =
        rect.top + (rect.height - tooltip.offsetHeight) / 2 + "px";
      revealNavTooltip(token);
    });
}

function showHoverTooltip(reference, label) {
  if (!reference || !label) return;
  ensureNavTooltip().textContent = label;
  navTooltipToken += 1;
  positionHoverTooltip(reference);
}

function bindDashboardSidebarRuntime() {
  var refs = getSidebarRefs();
  var desktopNav = refs.desktopNav;
  var desktopSidebarPanel = refs.desktopSidebarPanel;

  ensureNavTooltip();
  bindSettingsFlyoutDismiss();

  if (desktopSidebarPanel && !desktopSidebarPanel.dataset.btnTooltipBound) {
    desktopSidebarPanel.addEventListener("mouseover", function (e) {
      var btn = e.target.closest("[data-sidebar-btn-tooltip]");
      if (!btn) return;
      var label = btn.getAttribute("data-sidebar-btn-tooltip");
      if (!label) return;
      if (
        (accountInfoFlyoutOpen &&
          accountInfoFlyoutReference &&
          (accountInfoFlyoutReference === btn ||
            accountInfoFlyoutReference.contains(btn))) ||
        (supportFlyoutOpen &&
          supportFlyoutReference &&
          (supportFlyoutReference === btn ||
            supportFlyoutReference.contains(btn)))
      ) {
        return;
      }
      showHoverTooltip(btn, label);
    });
    desktopSidebarPanel.addEventListener("mouseout", function (e) {
      var btn = e.target.closest("[data-sidebar-btn-tooltip]");
      if (!btn) return;
      if (e.relatedTarget && btn.contains(e.relatedTarget)) return;
      hideNavTooltip();
    });
    desktopSidebarPanel.dataset.btnTooltipBound = "true";
  }

  if (desktopNav && !desktopNav.dataset.sidebarBound) {
    desktopNav.addEventListener("click", function (e) {
      const smartExchangeLink = e.target.closest(
        "[data-smart-exchange-trigger] > a",
      );
      if (!smartExchangeLink) return;
      if (expandSmartExchangeFromCollapsedLink(smartExchangeLink)) {
        e.preventDefault();
      }
    });

    desktopNav.addEventListener("mouseover", function (e) {
      const navItem = e.target.closest(".nav-item");
      if (!navItem) return;
      showNavTooltip(navItem);
    });

    desktopNav.addEventListener("mouseout", function (e) {
      const navItem = e.target.closest(".nav-item");
      if (!navItem) return;
      if (e.relatedTarget && navItem.contains(e.relatedTarget)) return;
      hideNavTooltip();
    });

    desktopNav.dataset.sidebarBound = "true";
  }

  if (!document.body.dataset.sidebarToggleBound) {
    document.addEventListener("click", function (e) {
      if (e.target.closest("[data-sidebar-toggle]")) {
        setDesktopSidebarCollapsed(!isDesktopSidebarCollapsed());
      }
    });
    document.body.dataset.sidebarToggleBound = "true";
  }

  if (!document.body.dataset.sidebarClickBound) {
    document.addEventListener("click", function (e) {
      if (e.target.closest("[data-chevron-toggle]")) return;

      const navItem = e.target.closest(".nav-item");
      if (!navItem) return;

      if (navItem.matches('a[href="#"]')) {
        e.preventDefault();
      }

      document.querySelectorAll(".nav-item.is-active").forEach(function (item) {
        clearNavActiveSurface(item);
        item.querySelectorAll("svg.nav-icon").forEach(function (icon) {
          icon.classList.remove(
            "text-gray-900",
            "text-blue-600",
            "dark:text-white",
            "dark:text-blue-400",
            "!text-blue-600",
            "dark:!text-blue-400",
          );
          icon.classList.add("text-gray-500", "dark:text-gray-400");
        });
      });

      markNavActiveSurface(navItem);
      navItem.querySelectorAll("svg.nav-icon").forEach(function (icon) {
        icon.classList.remove("text-gray-500", "dark:text-gray-400");
        icon.classList.add("text-gray-900", "dark:text-white");
      });
      var href = navItem.getAttribute("href");
      var isNavigationLink = navItem.tagName === "A" && href && href !== "#";
      if (!isNavigationLink) {
        syncDesktopNavCurrentIndicator();
      }
    });
    document.body.dataset.sidebarClickBound = "true";
  }
}

/**
 * Closes all open submenus in the desktop navigation and resets chevron rotations.
 */
function closeAllDesktopSubmenus() {
  var desktopNav = getSidebarRefs().desktopNav;
  if (!desktopNav) return;
  desktopNav.querySelectorAll(".nav-submenu").forEach(function (submenu) {
    submenu.classList.remove("max-h-96", "opacity-100", "pointer-events-auto");
    submenu.classList.add("max-h-0", "opacity-0", "pointer-events-none");
  });
  desktopNav
    .querySelectorAll(".chevron-icon.rotate-180")
    .forEach(function (chevron) {
      chevron.classList.remove("rotate-180");
    });
}

/**
 * Sets the desktop sidebar to collapsed or expanded state.
 * Toggles widths, padding, logo visibility, nav labels, and tooltips.
 * @param {boolean} collapsed - Whether the sidebar should be collapsed.
 */
function setDesktopSidebarCollapsed(collapsed) {
  var refs = getSidebarRefs();
  var desktopSidebarShell = refs.desktopSidebarShell;
  var desktopSidebarPanel = refs.desktopSidebarPanel;
  var desktopSidebarCollapseBtn = refs.desktopSidebarCollapseBtn;
  var desktopLogoFull = refs.desktopLogoFull;
  var desktopLogoMark = refs.desktopLogoMark;
  var desktopSidebarHelp = refs.desktopSidebarHelp;
  var desktopSidebarFooter = refs.desktopSidebarFooter;
  var mainContentWrapper = refs.mainContentWrapper;

  if (!desktopSidebarShell || !desktopSidebarPanel || !mainContentWrapper)
    return;

  var wasCollapsed = desktopSidebarShell.classList.contains("is-collapsed");

  document.documentElement.setAttribute(
    "data-sidebar-collapsed",
    collapsed ? "true" : "false",
  );

  desktopSidebarShell.classList.toggle("is-collapsed", collapsed);
  desktopSidebarShell.classList.remove(
    "lg:w-[288px]",
    "lg:w-[68px]",
    "lg:w-[81px]",
  );
  desktopSidebarShell.classList.toggle("lg:w-[304px]", !collapsed);
  desktopSidebarShell.classList.toggle("lg:w-[80px]", collapsed);

  if (collapsed) {
    desktopSidebarPanel.classList.remove(
      "p-5",
      "px-5",
      "px-4",
      "px-3.5",
      "px-3",
      "py-2",
      "pt-2",
    );
    desktopSidebarPanel.classList.add("pt-5", "pb-[60px]", "pl-5", "pr-[19px]");
  } else {
    desktopSidebarPanel.classList.remove(
      "px-5",
      "pl-5",
      "pr-[19px]",
      "px-4",
      "px-3.5",
      "px-3",
      "py-2",
      "pt-2",
      "pt-5",
      "pb-4",
      "pb-[60px]",
    );
    desktopSidebarPanel.classList.add("p-5");
  }

  normalizeMainContentWrapperLayout(collapsed);

  if (desktopLogoFull) desktopLogoFull.classList.toggle("hidden", collapsed);
  if (desktopLogoMark) {
    if (collapsed) {
      desktopLogoMark.classList.remove("hidden");
      desktopLogoMark.classList.add("flex");
    } else {
      desktopLogoMark.classList.add("hidden");
      desktopLogoMark.classList.remove("flex");
    }
  }

  if (desktopSidebarCollapseBtn) {
    desktopSidebarCollapseBtn.classList.toggle("hidden", collapsed);
    desktopSidebarCollapseBtn.classList.toggle("flex", !collapsed);
  }

  document
    .querySelectorAll("#desktop-sidebar-help [data-help-variant]")
    .forEach(function (el) {
      var show =
        el.getAttribute("data-help-variant") ===
        (collapsed ? "collapsed" : "expanded");
      el.classList.toggle("!hidden", !show);
    });
  document
    .querySelectorAll("#desktop-sidebar-panel [data-account-variant]")
    .forEach(function (el) {
      var show =
        el.getAttribute("data-account-variant") ===
        (collapsed ? "collapsed" : "expanded");
      el.classList.toggle("!hidden", !show);
    });
  document
    .querySelectorAll("#desktop-sidebar-footer [data-footer-variant]")
    .forEach(function (el) {
      var show =
        el.getAttribute("data-footer-variant") ===
        (collapsed ? "collapsed" : "expanded");
      el.classList.toggle("!hidden", !show);
    });

  var appNav = document.querySelector("app-nav");
  if (
    wasCollapsed !== collapsed &&
    appNav &&
    typeof appNav.refreshNav === "function"
  ) {
    var currentPage =
      (document.body && document.body.getAttribute("data-page")) ||
      window.location.pathname.split("/").pop() ||
      "";
    appNav.refreshNav(currentPage);
    bindDashboardSidebarRuntime();
    syncActiveNavItemStyles();
  }

  if (collapsed && wasCollapsed !== collapsed) closeAllDesktopSubmenus();
  hideNavTooltip();
  closeSettingsFlyout();
  closeAccountInfoFlyout();
  closeSupportFlyout();
  saveDesktopSidebarCollapsedPreference(collapsed);
  requestAnimationFrame(function () {
    syncDesktopNavCurrentIndicator();
  });
}

/* ===== Submenu Toggle ===== */

/**
 * Animates a submenu panel open or closed using max-height and opacity transitions.
 * @param {HTMLElement} submenu - The .nav-submenu element to toggle.
 * @param {HTMLElement|null} chevron - The .chevron-icon SVG to rotate, if present.
 */
function toggleSubmenuAnimation(submenu, chevron) {
  const isCollapsed = submenu.classList.contains("max-h-0");
  if (isCollapsed) {
    submenu.classList.remove("max-h-0", "opacity-0", "pointer-events-none");
    submenu.classList.add("max-h-96", "opacity-100", "pointer-events-auto");
    if (chevron) chevron.classList.add("rotate-180");
  } else {
    submenu.classList.remove("max-h-96", "opacity-100", "pointer-events-auto");
    submenu.classList.add("max-h-0", "opacity-0", "pointer-events-none");
    if (chevron) chevron.classList.remove("rotate-180");
  }
  requestAnimationFrame(function () {
    syncDesktopNavCurrentIndicator();
  });
}

/**
 * If the desktop sidebar is collapsed and the trigger is inside the desktop nav,
 * expands the sidebar first, then runs the callback.
 * @param {HTMLElement} trigger - The element that initiated the action.
 * @param {Function} callback - The function to execute after potential expansion.
 */
function runWithExpandedSidebarIfNeeded(trigger, callback) {
  const inDesktopNav = Boolean(
    trigger && trigger.closest('[data-nav="desktop"]'),
  );
  if (inDesktopNav && isDesktopSidebarCollapsed()) {
    setDesktopSidebarCollapsed(false);
  }
  callback();
}

/**
 * Finds the sibling submenu of a button and toggles it open/closed.
 * @param {HTMLElement} btn - The button element whose next sibling is the submenu.
 */
function toggleSubmenu(btn) {
  const submenu = btn.nextElementSibling;
  if (!submenu) return;
  const chevron = btn.querySelector(".chevron-icon");
  toggleSubmenuAnimation(submenu, chevron);
}

/**
 * Toggles a nav item's submenu, expanding the sidebar first if collapsed.
 * Settings in the collapsed sidebar opens a floating menu instead.
 * @param {HTMLElement} trigger - The nav item element that was clicked.
 */
function toggleExpandableItem(trigger) {
  if (
    trigger &&
    trigger.getAttribute("data-item-id") === "settings" &&
    trigger.closest('[data-nav="desktop"]') &&
    isDesktopSidebarCollapsed()
  ) {
    toggleCollapsedSettingsFlyout(trigger);
    return;
  }
  runWithExpandedSidebarIfNeeded(trigger, function () {
    toggleSubmenu(trigger);
  });
}

/**
 * Toggles the Supplier Portal submenu via the dedicated chevron button.
 * Called from HTML onclick attributes on the chevron toggle button.
 * @param {HTMLElement} chevronBtn - The chevron button element that was clicked.
 */
function toggleSmartExchangeSubmenu(chevronBtn) {
  const trigger = chevronBtn.closest("[data-smart-exchange-trigger]");
  const submenu = trigger ? trigger.nextElementSibling : null;
  runWithExpandedSidebarIfNeeded(trigger, function () {
    if (!submenu) return;
    const chevron = chevronBtn.querySelector(".chevron-icon");
    toggleSubmenuAnimation(submenu, chevron);
  });
}

function expandSmartExchangeFromCollapsedLink(link) {
  var desktopNav = getSidebarRefs().desktopNav;
  const trigger = link ? link.closest("[data-smart-exchange-trigger]") : null;
  const submenu = trigger ? trigger.nextElementSibling : null;
  if (!trigger || !submenu) return false;
  if (
    !desktopNav ||
    !trigger.closest('[data-nav="desktop"]') ||
    !isDesktopSidebarCollapsed()
  )
    return false;

  var entries = submenuFlyoutEntries(trigger);
  if (!entries.length) return false;
  toggleCollapsedFlyout(trigger, supplierPortalFlyoutTitle(trigger), entries);
  return true;
}

/* ===== Collapsed Settings flyout ===== */

var settingsFlyoutOpen = false;
var settingsFlyoutCleanup = null;
var settingsFlyoutReference = null;
var accountInfoFlyoutOpen = false;
var accountInfoFlyoutCleanup = null;
var accountInfoFlyoutReference = null;
var supportFlyoutOpen = false;
var supportFlyoutCleanup = null;
var supportFlyoutReference = null;
var floatingUiPromise = null;

function loadFloatingUi() {
  if (window.FloatingUIDOM && window.FloatingUIDOM.computePosition) {
    return Promise.resolve(window.FloatingUIDOM);
  }
  if (!floatingUiPromise) {
    floatingUiPromise =
      import("https://cdn.jsdelivr.net/npm/@floating-ui/dom@1.7.6/+esm").then(
        function (mod) {
          window.FloatingUIDOM = mod;
          return mod;
        },
      );
  }
  return floatingUiPromise;
}

function settingsFlyoutEntries() {
  var links =
    window.AppPlans && typeof window.AppPlans.accountLinks === "function"
      ? window.AppPlans.accountLinks()
      : null;
  var profile =
    links && links.profile
      ? links.profile
      : { href: "my-company-profile.html", label: "My Company Profile" };
  var preferences =
    links && links.preferences
      ? links.preferences
      : { href: "payment-preferences.html", label: "Payment Preferences" };
  var items = [
    { label: profile.label, href: profile.href || "#" },
    { label: preferences.label, href: preferences.href || "#" },
  ];
  var trigger = document.querySelector(
    '[data-nav="desktop"] [data-expandable-trigger][data-item-id="settings"]',
  );
  var submenu = trigger && trigger.nextElementSibling;
  if (submenu && submenu.classList.contains("nav-submenu")) {
    submenu.querySelectorAll("a").forEach(function (anchor) {
      items.push({
        label: (anchor.textContent || "").replace(/\s+/g, " ").trim(),
        href: anchor.getAttribute("href") || "#",
      });
    });
  } else {
    items.push({ label: "User Management", href: "#" });
  }
  return items;
}

function ensureSettingsFlyout() {
  var existing = document.getElementById("dashboard-settings-flyout");
  if (existing) return existing;

  var flyout = document.createElement("div");
  flyout.id = "dashboard-settings-flyout";
  flyout.setAttribute("role", "menu");
  flyout.setAttribute("aria-label", "Settings");
  flyout.className =
    "fixed z-[80] hidden w-max flex-col gap-2 rounded-lg bg-white px-4 py-3 font-['Inter'] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.10),0px_4px_6px_-2px_rgba(0,0,0,0.05),0px_0px_0px_1px_rgba(0,0,0,0.05)] dark:bg-gray-800 dark:shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.40),0px_4px_6px_-2px_rgba(0,0,0,0.30),0px_0px_0px_1px_rgba(255,255,255,0.10)]";
  document.body.appendChild(flyout);
  return flyout;
}

function renderSettingsFlyout(title, entries) {
  var flyout = ensureSettingsFlyout();
  flyout.setAttribute("aria-label", title);
  var heading = document.createElement("p");
  heading.className =
    "text-xs font-normal leading-4 text-gray-500 dark:text-gray-400";
  heading.textContent = title;
  flyout.replaceChildren(heading);

  entries.forEach(function (entry) {
    var link = document.createElement("a");
    link.href = entry.href || "#";
    link.setAttribute("role", "menuitem");
    link.className =
      "flex h-6 w-full items-center rounded-md text-sm font-medium leading-5 text-gray-700 transition-colors hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-gray-200 dark:hover:text-white";
    link.textContent = entry.label;
    if (!entry.href || entry.href === "#") {
      link.addEventListener("click", function (event) {
        event.preventDefault();
      });
    }
    link.addEventListener("click", function () {
      closeSettingsFlyout();
    });
    flyout.appendChild(link);
  });
  return flyout;
}

function positionSettingsFlyout(reference) {
  var flyout = document.getElementById("dashboard-settings-flyout");
  if (!flyout || !reference) return;
  loadFloatingUi()
    .then(function (floating) {
      if (!settingsFlyoutOpen || settingsFlyoutReference !== reference) return;
      if (settingsFlyoutCleanup) settingsFlyoutCleanup();
      settingsFlyoutCleanup = floating.autoUpdate(
        reference,
        flyout,
        function () {
          floating
            .computePosition(reference, flyout, {
              placement: "right-start",
              strategy: "fixed",
              middleware: [
                floating.offset(12),
                floating.flip({ fallbackPlacements: ["right-end"] }),
                floating.shift({
                  mainAxis: false,
                  crossAxis: true,
                  padding: 8,
                }),
              ],
            })
            .then(function (position) {
              flyout.style.left = position.x + "px";
              flyout.style.top = position.y + "px";
            });
        },
      );
    })
    .catch(function () {
      var rect = reference.getBoundingClientRect();
      flyout.style.left = rect.right + 12 + "px";
      flyout.style.top = rect.top + "px";
    });
}

function openCollapsedFlyout(trigger, title, entries) {
  closeAccountInfoFlyout();
  closeSupportFlyout();
  var flyout = renderSettingsFlyout(title, entries);
  settingsFlyoutOpen = true;
  settingsFlyoutReference = trigger;
  hideNavTooltip();
  trigger.setAttribute("aria-expanded", "true");
  flyout.classList.remove("hidden");
  flyout.classList.add("flex");
  positionSettingsFlyout(trigger);
}

function closeSettingsFlyout() {
  if (
    !settingsFlyoutOpen &&
    !document.getElementById("dashboard-settings-flyout")
  ) {
    return;
  }
  settingsFlyoutOpen = false;
  if (settingsFlyoutReference) {
    settingsFlyoutReference.setAttribute("aria-expanded", "false");
  }
  settingsFlyoutReference = null;
  if (settingsFlyoutCleanup) {
    settingsFlyoutCleanup();
    settingsFlyoutCleanup = null;
  }
  var flyout = document.getElementById("dashboard-settings-flyout");
  if (flyout) {
    flyout.classList.add("hidden");
    flyout.classList.remove("flex");
  }
  document
    .querySelectorAll(
      '[data-expandable-trigger][data-item-id="settings"][aria-expanded="true"]',
    )
    .forEach(function (trigger) {
      trigger.setAttribute("aria-expanded", "false");
    });
}

function toggleCollapsedFlyout(trigger, title, entries) {
  if (settingsFlyoutOpen && settingsFlyoutReference === trigger) {
    closeSettingsFlyout();
    return;
  }
  openCollapsedFlyout(trigger, title, entries);
}

function toggleCollapsedSettingsFlyout(trigger) {
  toggleCollapsedFlyout(trigger, "Settings", settingsFlyoutEntries());
}

function submenuFlyoutEntries(trigger) {
  var items = [];
  var submenu = trigger && trigger.nextElementSibling;
  if (!submenu || !submenu.classList.contains("nav-submenu")) return items;
  submenu.querySelectorAll("a").forEach(function (anchor) {
    var label = (anchor.textContent || "").replace(/\s+/g, " ").trim();
    if (!label) return;
    items.push({
      label: label,
      href: anchor.getAttribute("href") || "#",
    });
  });
  return items;
}

function supplierPortalFlyoutTitle(trigger) {
  var label = trigger && trigger.querySelector(".nav-label");
  var text = label ? label.textContent : "";
  return (text || "Supplier Portal").replace(/\s+/g, " ").trim();
}

function accountInfoAsset(file) {
  var path = window.location.pathname || "";
  var marker = "/src/pages/";
  var index = path.indexOf(marker);
  var root = index >= 0 ? path.slice(0, index) : "";
  return root + "/src/assets/account-info/" + file;
}

function accountInfoIcon(file, className) {
  return (
    '<img src="' +
    accountInfoAsset(file) +
    '" alt="" class="' +
    className +
    '" />'
  );
}

function accountInfoRow(name, iconHtml, linked) {
  var labelClass = linked
    ? "text-sm font-medium leading-5 text-blue-600 dark:text-blue-400"
    : "text-sm font-medium leading-5 text-gray-800 dark:text-gray-100";
  var status = linked
    ? ""
    : '<img src="' +
      accountInfoAsset("feature-status.svg") +
      '" alt="Pending" class="size-[18px]" />';
  return (
    '<div class="flex w-full items-center justify-between gap-4">' +
    '<div class="flex min-w-0 items-center gap-2">' +
    iconHtml +
    '<span class="' +
    labelClass +
    '">' +
    name +
    "</span>" +
    status +
    "</div>" +
    '<button type="button" class="inline-flex shrink-0 items-center justify-center rounded-md p-0.5 text-gray-400 transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:hover:bg-white/10 cursor-pointer" aria-label="About ' +
    name +
    '">' +
    accountInfoIcon("info-circle.svg", "size-[18px]") +
    "</button></div>"
  );
}

function renderAccountInfoFlyout() {
  var flyout = document.getElementById("dashboard-account-info-flyout");
  if (!flyout) {
    flyout = document.createElement("div");
    flyout.id = "dashboard-account-info-flyout";
    flyout.setAttribute("role", "dialog");
    flyout.setAttribute("aria-labelledby", "account-info-flyout-title");
    flyout.className =
      "fixed z-[80] hidden w-[296px] flex-col rounded-lg bg-white px-4 py-3 font-['Inter'] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.10),0px_4px_6px_-2px_rgba(0,0,0,0.05),0px_0px_0px_1px_rgba(0,0,0,0.05)] dark:bg-gray-800 dark:shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.40),0px_4px_6px_-2px_rgba(0,0,0,0.30),0px_0px_0px_1px_rgba(255,255,255,0.10)]";
    document.body.appendChild(flyout);
  }
  var currentIcon =
    '<span class="inline-flex shrink-0 rounded-full bg-gradient-to-b from-[#27C9E3] to-[#026EBC] p-1 shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">' +
    accountInfoIcon("payment-logomark.svg", "size-5") +
    "</span>";
  var moreIcon =
    '<span class="inline-flex size-7 shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 p-1 dark:border-white/20">' +
    accountInfoIcon("plus.svg", "size-5") +
    "</span>";
  flyout.innerHTML =
    '<div class="flex w-full flex-col gap-3">' +
    '<div class="flex flex-col gap-0.5 py-0.5">' +
    '<h2 id="account-info-flyout-title" class="text-base font-medium leading-6 text-gray-700 dark:text-gray-100">Your Account Information</h2>' +
    '<p class="text-xs font-normal leading-4 text-gray-500 dark:text-gray-400">You can go to your account enrollment portal to update your business information or upgrade your product with additional features.</p>' +
    "</div>" +
    '<div class="h-px w-full bg-gray-200 dark:bg-white/10"></div>' +
    '<div class="flex flex-col gap-3">' +
    '<h3 class="text-sm font-medium leading-5 text-gray-700 dark:text-gray-100">Current Features</h3>' +
    accountInfoRow("AP/AR Payments", currentIcon, false) +
    "</div>" +
    '<div class="h-px w-full bg-gray-200 dark:bg-white/10"></div>' +
    '<div class="flex flex-col gap-3">' +
    '<h3 class="text-sm font-medium leading-5 text-gray-700 dark:text-gray-100">Enable More Features</h3>' +
    '<div class="flex flex-col gap-3">' +
    accountInfoRow("Supply Chain Financing", moreIcon, true) +
    accountInfoRow("Merchant Services", moreIcon, true) +
    "</div></div>" +
    '<div class="h-px w-full bg-gray-200 dark:bg-white/10"></div>' +
    '<a href="#" class="flex w-full items-center justify-between rounded-md py-2 pl-2 pr-3 text-base font-medium leading-6 text-blue-600 transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-blue-400 dark:hover:bg-white/10">' +
    "<span>Go to enrollment portal</span>" +
    accountInfoIcon("arrow-up-right.svg", "size-5") +
    "</a></div>";
  var portal = flyout.querySelector("a");
  if (portal) {
    portal.addEventListener("click", function (event) {
      event.preventDefault();
    });
  }
  return flyout;
}

function positionAccountInfoFlyout(reference) {
  var flyout = document.getElementById("dashboard-account-info-flyout");
  if (!flyout || !reference) return;
  loadFloatingUi()
    .then(function (floating) {
      if (!accountInfoFlyoutOpen || accountInfoFlyoutReference !== reference)
        return;
      if (accountInfoFlyoutCleanup) accountInfoFlyoutCleanup();
      accountInfoFlyoutCleanup = floating.autoUpdate(
        reference,
        flyout,
        function () {
          floating
            .computePosition(reference, flyout, {
              placement: "right-start",
              strategy: "fixed",
              middleware: [
                floating.offset(12),
                floating.flip({ fallbackPlacements: ["right-end"] }),
                floating.shift({
                  mainAxis: false,
                  crossAxis: true,
                  padding: 8,
                }),
              ],
            })
            .then(function (position) {
              flyout.style.left = position.x + "px";
              flyout.style.top = position.y + "px";
            });
        },
      );
    })
    .catch(function () {
      var rect = reference.getBoundingClientRect();
      flyout.style.left = rect.right + 12 + "px";
      flyout.style.top = rect.top + "px";
    });
}

function openAccountInfoFlyout(trigger) {
  closeSettingsFlyout();
  closeSupportFlyout();
  var flyout = renderAccountInfoFlyout();
  accountInfoFlyoutOpen = true;
  accountInfoFlyoutReference = trigger;
  hideNavTooltip();
  trigger.setAttribute("aria-expanded", "true");
  flyout.classList.remove("hidden");
  flyout.classList.add("flex");
  positionAccountInfoFlyout(trigger);
}

function setAccountInfoPanelOpen(trigger, open) {
  var widget = trigger && trigger.closest("[data-account-info-widget]");
  if (!widget) return;
  var panel = widget.querySelector("[data-account-info-panel]");
  var chevron = trigger.querySelector(".chevron-icon");
  trigger.setAttribute("aria-expanded", open ? "true" : "false");
  trigger.classList.toggle("rounded-md", !open);
  trigger.classList.toggle("rounded-t-md", open);
  trigger.classList.toggle("rounded-b-none", open);
  trigger.classList.toggle("hover:bg-gray-100", !open);
  trigger.classList.toggle("dark:hover:bg-white/10", !open);
  if (chevron) chevron.classList.toggle("rotate-180", open);
  if (panel) {
    panel.classList.toggle("hidden", !open);
    panel.classList.toggle("flex", open);
  }
  if (open && panel) panel.scrollIntoView({ block: "nearest" });
}

function closeAccountInfoPanels() {
  document
    .querySelectorAll(
      "[data-account-info-widget] [data-account-info-trigger][aria-expanded='true']",
    )
    .forEach(function (trigger) {
      setAccountInfoPanelOpen(trigger, false);
    });
}

function toggleAccountInfo(trigger) {
  if (trigger.getAttribute("data-account-variant") === "collapsed") {
    toggleAccountInfoFlyout(trigger);
    return;
  }
  var open = trigger.getAttribute("aria-expanded") === "true";
  closeSettingsFlyout();
  closeSupportFlyout();
  closeAccountInfoFlyout();
  if (!open) setAccountInfoPanelOpen(trigger, true);
}

function closeAccountInfoFlyout() {
  closeAccountInfoPanels();
  if (
    !accountInfoFlyoutOpen &&
    !document.getElementById("dashboard-account-info-flyout")
  ) {
    return;
  }
  accountInfoFlyoutOpen = false;
  if (accountInfoFlyoutReference) {
    accountInfoFlyoutReference.setAttribute("aria-expanded", "false");
  }
  accountInfoFlyoutReference = null;
  if (accountInfoFlyoutCleanup) {
    accountInfoFlyoutCleanup();
    accountInfoFlyoutCleanup = null;
  }
  var flyout = document.getElementById("dashboard-account-info-flyout");
  if (flyout) {
    flyout.classList.add("hidden");
    flyout.classList.remove("flex");
  }
}

function toggleAccountInfoFlyout(trigger) {
  if (accountInfoFlyoutOpen && accountInfoFlyoutReference === trigger) {
    closeAccountInfoFlyout();
    return;
  }
  openAccountInfoFlyout(trigger);
}

function renderSupportFlyout() {
  var flyout = document.getElementById("dashboard-support-flyout");
  if (flyout) return flyout;
  flyout = document.createElement("div");
  flyout.id = "dashboard-support-flyout";
  flyout.setAttribute("role", "dialog");
  flyout.setAttribute("aria-labelledby", "support-flyout-title");
  flyout.className =
    "fixed z-[80] hidden w-[257px] flex-col rounded-lg bg-white font-['Inter'] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.10),0px_4px_6px_-2px_rgba(0,0,0,0.05),0px_0px_0px_1px_rgba(0,0,0,0.05)] dark:bg-gray-800 dark:shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.40),0px_4px_6px_-2px_rgba(0,0,0,0.30),0px_0px_0px_1px_rgba(255,255,255,0.10)]";
  flyout.innerHTML =
    '<div class="flex flex-col gap-2 px-4 py-[18px]">' +
    '<h2 id="support-flyout-title" class="text-sm font-semibold leading-5 text-gray-900 dark:text-white">Contact Support</h2>' +
    '<div class="flex flex-col gap-1.5">' +
    '<a href="mailto:support@transcard.com" class="text-sm font-normal leading-5 text-gray-500 transition-colors hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-gray-400 dark:hover:text-gray-200">support@transcard.com</a>' +
    '<a href="tel:8008903128" class="text-sm font-normal leading-5 text-gray-500 transition-colors hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-gray-400 dark:hover:text-gray-200">800-890-3128</a>' +
    "</div></div>" +
    '<div class="h-px w-full bg-gray-200 dark:bg-white/10"></div>' +
    '<div class="px-4 py-1.5">' +
    '<a href="#" data-support-faq class="inline-flex items-center rounded-md px-2.5 py-1.5 text-sm font-semibold leading-5 text-blue-600 transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-blue-400 dark:hover:bg-white/10">FAQ &amp; User Guides →</a>' +
    "</div>";
  var faq = flyout.querySelector("[data-support-faq]");
  if (faq) {
    faq.addEventListener("click", function (event) {
      event.preventDefault();
    });
  }
  document.body.appendChild(flyout);
  return flyout;
}

var SUPPORT_TRIGGER_OPEN_CLASSES = [
  "bg-white",
  "text-gray-700",
  "hover:bg-white",
  "hover:text-gray-700",
  "outline-none",
  "dark:bg-gray-800",
  "dark:text-gray-200",
  "dark:hover:bg-gray-800",
  "dark:hover:text-gray-200",
];

function ensureSupportTriggerRing() {
  var ring = document.getElementById("dashboard-support-trigger-ring");
  if (ring) return ring;
  ring = document.createElement("div");
  ring.id = "dashboard-support-trigger-ring";
  ring.setAttribute("aria-hidden", "true");
  ring.className =
    "pointer-events-none fixed z-[90] hidden rounded-md shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05),0px_0px_0px_2px_#fff,0px_0px_0px_4px_#2563eb] dark:shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05),0px_0px_0px_2px_#111827,0px_0px_0px_4px_#2563eb]";
  document.body.appendChild(ring);
  return ring;
}

function placeSupportTriggerRing(reference) {
  if (!reference) return;
  var ring = ensureSupportTriggerRing();
  var rect = reference.getBoundingClientRect();
  ring.style.left = rect.left + "px";
  ring.style.top = rect.top + "px";
  ring.style.width = rect.width + "px";
  ring.style.height = rect.height + "px";
  ring.classList.remove("hidden");
}

function hideSupportTriggerRing() {
  var ring = document.getElementById("dashboard-support-trigger-ring");
  if (ring) ring.classList.add("hidden");
}

function setSupportTriggerOpen(trigger, open) {
  if (!trigger) return;
  SUPPORT_TRIGGER_OPEN_CLASSES.forEach(function (className) {
    trigger.classList.toggle(className, open);
  });
}

function supportFlyoutBelowTrigger(reference) {
  return reference.getAttribute("data-help-variant") !== "collapsed";
}

function positionSupportFlyout(reference) {
  var flyout = document.getElementById("dashboard-support-flyout");
  if (!flyout || !reference) return;
  var below = supportFlyoutBelowTrigger(reference);
  loadFloatingUi()
    .then(function (floating) {
      if (!supportFlyoutOpen || supportFlyoutReference !== reference) return;
      if (supportFlyoutCleanup) supportFlyoutCleanup();
      supportFlyoutCleanup = floating.autoUpdate(
        reference,
        flyout,
        function () {
          floating
            .computePosition(reference, flyout, {
              placement: below ? "bottom-start" : "right-start",
              strategy: "fixed",
              middleware: below
                ? [floating.offset(4)]
                : [
                    floating.offset(12),
                    floating.flip({ fallbackPlacements: ["right-end"] }),
                    floating.shift({
                      mainAxis: false,
                      crossAxis: true,
                      padding: 8,
                    }),
                  ],
            })
            .then(function (position) {
              flyout.style.left = position.x + "px";
              flyout.style.top = position.y + "px";
              placeSupportTriggerRing(reference);
            });
        },
      );
    })
    .catch(function () {
      var rect = reference.getBoundingClientRect();
      flyout.style.left = (below ? rect.left : rect.right + 12) + "px";
      flyout.style.top = (below ? rect.bottom + 4 : rect.top) + "px";
      placeSupportTriggerRing(reference);
    });
}

function openSupportFlyout(trigger) {
  closeSettingsFlyout();
  closeAccountInfoFlyout();
  var flyout = renderSupportFlyout();
  supportFlyoutOpen = true;
  supportFlyoutReference = trigger;
  hideNavTooltip();
  trigger.setAttribute("aria-expanded", "true");
  setSupportTriggerOpen(trigger, true);
  placeSupportTriggerRing(trigger);
  flyout.classList.remove("hidden");
  flyout.classList.add("flex");
  positionSupportFlyout(trigger);
}

function closeSupportFlyout() {
  if (
    !supportFlyoutOpen &&
    !document.getElementById("dashboard-support-flyout")
  ) {
    return;
  }
  supportFlyoutOpen = false;
  if (supportFlyoutReference) {
    supportFlyoutReference.setAttribute("aria-expanded", "false");
    setSupportTriggerOpen(supportFlyoutReference, false);
  }
  hideSupportTriggerRing();
  supportFlyoutReference = null;
  if (supportFlyoutCleanup) {
    supportFlyoutCleanup();
    supportFlyoutCleanup = null;
  }
  var flyout = document.getElementById("dashboard-support-flyout");
  if (flyout) {
    flyout.classList.add("hidden");
    flyout.classList.remove("flex");
  }
}

function toggleSupportFlyout(trigger) {
  if (supportFlyoutOpen && supportFlyoutReference === trigger) {
    closeSupportFlyout();
    return;
  }
  openSupportFlyout(trigger);
}

function bindSettingsFlyoutDismiss() {
  if (document.body.dataset.settingsFlyoutBound) return;
  document.addEventListener("click", function (event) {
    var supportTrigger = event.target.closest("[data-support-trigger]");
    if (supportTrigger && supportTrigger.closest("#desktop-sidebar-panel")) {
      event.preventDefault();
      toggleSupportFlyout(supportTrigger);
    }
    if (event.target.closest("[data-account-portal]")) event.preventDefault();
    var accountTrigger = event.target.closest("[data-account-info-trigger]");
    if (
      accountTrigger &&
      (accountTrigger.closest("#desktop-sidebar-panel") ||
        accountTrigger.closest("#sidebar"))
    ) {
      event.preventDefault();
      toggleAccountInfo(accountTrigger);
    }
    if (settingsFlyoutOpen) {
      var insideSettings = event.target.closest("#dashboard-settings-flyout");
      var onSettingsTrigger =
        settingsFlyoutReference &&
        (settingsFlyoutReference === event.target ||
          settingsFlyoutReference.contains(event.target));
      if (!insideSettings && !onSettingsTrigger) closeSettingsFlyout();
    }
    if (accountInfoFlyoutOpen) {
      var insideAccount = event.target.closest(
        "#dashboard-account-info-flyout",
      );
      var onAccountTrigger =
        accountInfoFlyoutReference &&
        (accountInfoFlyoutReference === event.target ||
          accountInfoFlyoutReference.contains(event.target));
      if (!insideAccount && !onAccountTrigger) closeAccountInfoFlyout();
    }
    if (supportFlyoutOpen) {
      var insideSupport = event.target.closest("#dashboard-support-flyout");
      var onSupportTrigger =
        supportFlyoutReference &&
        (supportFlyoutReference === event.target ||
          supportFlyoutReference.contains(event.target));
      if (!insideSupport && !onSupportTrigger) closeSupportFlyout();
    }
  });
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    closeSettingsFlyout();
    closeAccountInfoFlyout();
    closeSupportFlyout();
  });
  document.body.dataset.settingsFlyoutBound = "true";
}

/* ===== Nav Tooltip ===== */

/**
 * Extracts the display label from a nav item element.
 * @param {HTMLElement} navItem - The nav item element.
 * @returns {string} The cleaned text content of the nav item.
 */
function getTooltipLabel(navItem) {
  return navItem.textContent.replace(/\s+/g, " ").trim();
}

/**
 * Shows a floating tooltip next to a nav item when the sidebar is collapsed.
 * @param {HTMLElement} navItem - The nav item to show the tooltip for.
 */
function showNavTooltip(navItem) {
  var desktopNav = getSidebarRefs().desktopNav;
  if (!isDesktopSidebarCollapsed()) return;
  if (!desktopNav || navItem.closest(".nav-submenu")) return;
  if (
    settingsFlyoutOpen &&
    settingsFlyoutReference &&
    (settingsFlyoutReference === navItem ||
      settingsFlyoutReference.contains(navItem))
  ) {
    return;
  }

  const label = getTooltipLabel(navItem);
  if (!label) return;
  showHoverTooltip(navItem, label);
}

/* ===== Event Listeners ===== */

var NAV_ACTIVE_SURFACE_CLASSES = [
  "is-active",
  "bg-gray-100",
  "text-gray-900",
  "bg-zinc-950/5",
  "text-zinc-950",
  "dark:bg-white/10",
  "dark:bg-white/5",
  "dark:text-white",
];

function navActiveSurface(item) {
  return (item && item.closest("[data-smart-exchange-trigger]")) || item;
}

function markNavActiveSurface(item) {
  if (!item) return;
  item.classList.add("is-active");
  navActiveSurface(item).classList.add.apply(
    navActiveSurface(item).classList,
    NAV_ACTIVE_SURFACE_CLASSES,
  );
}

function clearNavActiveSurface(item) {
  item.classList.remove.apply(item.classList, NAV_ACTIVE_SURFACE_CLASSES);
  var surface = item.closest("[data-smart-exchange-trigger]");
  if (surface && surface !== item) {
    surface.classList.remove.apply(
      surface.classList,
      NAV_ACTIVE_SURFACE_CLASSES,
    );
  }
}

/**
 * Normalizes active nav item styles on initial page load.
 */
function syncActiveNavItemStyles() {
  document.querySelectorAll(".nav-item.is-active").forEach(function (item) {
    markNavActiveSurface(item);
    item.querySelectorAll("svg.nav-icon").forEach(function (icon) {
      icon.classList.remove(
        "text-gray-500",
        "dark:text-gray-400",
        "text-blue-600",
        "dark:text-blue-400",
        "!text-blue-600",
        "dark:!text-blue-400",
      );
      icon.classList.add("text-gray-900", "dark:text-white");
    });
  });
  syncDesktopNavCurrentIndicator(
    document.documentElement.classList.contains("sidebar-booting"),
  );
}

syncActiveNavItemStyles();

/* ===== Active Nav Item Management ===== */

/**
 * Handles click events on nav items to highlight the active item.
 * Only one nav item can be active at a time. Prevents default on # links.
 */
function initDashboardSidebar() {
  bindDashboardSidebarRuntime();
  normalizeMainContentWrapperLayout();
  prepareDesktopNavLabels();
  setDesktopSidebarCollapsed(loadDesktopSidebarCollapsedPreference());
  syncActiveNavItemStyles();
  requestAnimationFrame(function () {
    clearSidebarBootState();
  });
}

window.bindDashboardSidebarRuntime = bindDashboardSidebarRuntime;
window.initDashboardSidebar = initDashboardSidebar;
initDashboardSidebar();

window.addEventListener("load", function () {
  syncDesktopNavCurrentIndicator(true);
});
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(function () {
    syncDesktopNavCurrentIndicator(true);
  });
}

/**
 * @file sidebar.js
 * @description Handles the SMART Exchange dashboard sidebar behavior including:
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
    detailRow.classList.toggle('hidden');
    if (chevron) {
        chevron.classList.toggle('rotate-180');
    }
}

/* ===== Desktop Sidebar State ===== */

const DESKTOP_SIDEBAR_COLLAPSED_STORAGE_KEY = 'dashboard-sidebar-collapsed-v1';

function clearSidebarBootState() {
    var root = document.documentElement;
    root.classList.remove('sidebar-booting');
    var style = document.getElementById('dashboard-sidebar-boot-style');
    if (style) style.remove();
}

function getSidebarRefs() {
    return {
        appShell: document.getElementById('app-shell'),
        desktopSidebarShell: document.getElementById('desktop-sidebar-shell'),
        desktopSidebarPanel: document.getElementById('desktop-sidebar-panel'),
        desktopSidebarCollapseBtn: document.getElementById('desktop-sidebar-collapse-btn'),
        desktopLogoRow: document.getElementById('desktop-logo-row'),
        desktopLogoFull: document.getElementById('desktop-logo-full'),
        desktopLogoMark: document.getElementById('desktop-logo-mark'),
        desktopSidebarHelp: document.getElementById('desktop-sidebar-help'),
        desktopSidebarFooter: document.getElementById('desktop-sidebar-footer'),
        mainContentWrapper: document.getElementById('main-content-wrapper'),
        desktopNav: document.querySelector('[data-nav="desktop"]')
    };
}

function normalizeMainContentWrapperLayout(collapsed) {
    var refs = getSidebarRefs();
    var appShell = refs.appShell;
    var mainContentWrapper = refs.mainContentWrapper;
    if (appShell) {
        appShell.style.minHeight = '';
    }
    if (!mainContentWrapper) return;
    var isCollapsed = typeof collapsed === 'boolean'
        ? collapsed
        : document.documentElement.getAttribute('data-sidebar-collapsed') === 'true';
    mainContentWrapper.classList.remove('lg:pl-[288px]', 'lg:pl-[68px]');
    mainContentWrapper.classList.add('min-w-0', 'min-h-screen', 'flex', 'flex-col');
    mainContentWrapper.classList.add(isCollapsed ? 'lg:pl-[68px]' : 'lg:pl-[288px]');
}

function ensureNavTooltip() {
    var existing = document.getElementById('dashboard-nav-tooltip');
    if (existing) return existing;

    var tooltip = document.createElement('div');
    tooltip.id = 'dashboard-nav-tooltip';
    tooltip.className = 'pointer-events-none fixed z-[80] rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg';
    tooltip.style.opacity = '0';
    tooltip.style.transform = 'translateY(-50%) translateX(-4px)';
    tooltip.style.transition = 'opacity 150ms ease-out, transform 150ms ease-out';
    document.body.appendChild(tooltip);
    return tooltip;
}

function ensureDesktopNavCurrentIndicator() {
    var desktopNav = getSidebarRefs().desktopNav;
    if (!desktopNav) return null;

    var existing = desktopNav.querySelector('#desktop-nav-current-indicator');
    if (existing) return existing;

    var indicator = document.createElement('span');
    indicator.id = 'desktop-nav-current-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    indicator.className = 'pointer-events-none absolute top-0 left-0 z-10 w-0.5 rounded-full bg-blue-600 opacity-0 transition-[transform,height,left,opacity] duration-200 ease-out dark:bg-blue-400';
    desktopNav.appendChild(indicator);
    return indicator;
}

function syncDesktopNavCurrentIndicator(immediate) {
    var refs = getSidebarRefs();
    var desktopNav = refs.desktopNav;
    if (!desktopNav) return;

    var indicator = ensureDesktopNavCurrentIndicator();
    if (!indicator) return;

    var activeItem = desktopNav.querySelector('.nav-item.is-active');
    if (!activeItem) {
        indicator.style.opacity = '0';
        return;
    }

    var navRect = desktopNav.getBoundingClientRect();
    var itemRect = activeItem.getBoundingClientRect();
    var left = -16;
    var top = itemRect.top - navRect.top + 8;
    var height = Math.max(itemRect.height - 16, 8);

    if (immediate) {
        indicator.style.transition = 'none';
    }

    indicator.style.left = left + 'px';
    indicator.style.height = height + 'px';
    indicator.style.transform = 'translateY(' + top + 'px)';
    indicator.style.opacity = '1';

    if (immediate) {
        requestAnimationFrame(function () {
            indicator.style.transition = '';
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
    desktopNav.querySelectorAll(':scope > .nav-item > span, :scope > .nav-item > a, :scope > [data-smart-exchange-trigger] > a').forEach(function (group) {
        if (group.querySelector('.nav-label')) return;

        const textNodes = Array.from(group.childNodes).filter(function (node) {
            return node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0;
        });
        if (!textNodes.length) return;

        const label = document.createElement('span');
        label.className = 'nav-label';
        label.textContent = textNodes.map(function (node) {
            return node.textContent.trim();
        }).join(' ');

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
    return Boolean(desktopSidebarShell && desktopSidebarShell.classList.contains('is-collapsed'));
}

function loadDesktopSidebarCollapsedPreference() {
    try {
        return localStorage.getItem(DESKTOP_SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true';
    } catch (error) {
        return false;
    }
}

function saveDesktopSidebarCollapsedPreference(collapsed) {
    try {
        localStorage.setItem(DESKTOP_SIDEBAR_COLLAPSED_STORAGE_KEY, collapsed ? 'true' : 'false');
    } catch (error) {}
}

/**
 * Hides the floating nav tooltip with a fade-out transition.
 */
function hideNavTooltip() {
    var navTooltip = ensureNavTooltip();
    navTooltip.style.opacity = '0';
    navTooltip.style.transform = 'translateY(-50%) translateX(-4px)';
}

function bindDashboardSidebarRuntime() {
    var refs = getSidebarRefs();
    var desktopNav = refs.desktopNav;
    var desktopSidebarPanel = refs.desktopSidebarPanel;

    ensureNavTooltip();

    if (desktopSidebarPanel && !desktopSidebarPanel.dataset.btnTooltipBound) {
        desktopSidebarPanel.addEventListener('mouseover', function (e) {
            var btn = e.target.closest('[data-sidebar-btn-tooltip]');
            if (!btn) return;
            var navTooltip = ensureNavTooltip();
            var label = btn.getAttribute('data-sidebar-btn-tooltip');
            if (!label) return;
            navTooltip.textContent = label;
            var rect = btn.getBoundingClientRect();
            navTooltip.style.left = rect.right + 12 + 'px';
            navTooltip.style.top = rect.top + rect.height / 2 + 'px';
            requestAnimationFrame(function () {
                navTooltip.style.opacity = '1';
                navTooltip.style.transform = 'translateY(-50%) translateX(0)';
            });
        });
        desktopSidebarPanel.addEventListener('mouseout', function (e) {
            var btn = e.target.closest('[data-sidebar-btn-tooltip]');
            if (!btn) return;
            if (e.relatedTarget && btn.contains(e.relatedTarget)) return;
            hideNavTooltip();
        });
        desktopSidebarPanel.dataset.btnTooltipBound = 'true';
    }

    if (desktopNav && !desktopNav.dataset.sidebarBound) {
        desktopNav.addEventListener('click', function (e) {
            const smartExchangeLink = e.target.closest('[data-smart-exchange-trigger] > a');
            if (!smartExchangeLink) return;
            if (expandSmartExchangeFromCollapsedLink(smartExchangeLink)) {
                e.preventDefault();
            }
        });

        desktopNav.addEventListener('mouseover', function (e) {
            const navItem = e.target.closest('.nav-item');
            if (!navItem) return;
            showNavTooltip(navItem);
        });

        desktopNav.addEventListener('mouseout', function (e) {
            const navItem = e.target.closest('.nav-item');
            if (!navItem) return;
            if (e.relatedTarget && navItem.contains(e.relatedTarget)) return;
            hideNavTooltip();
        });

        desktopNav.dataset.sidebarBound = 'true';
    }

    if (!document.body.dataset.sidebarToggleBound) {
        document.addEventListener('click', function (e) {
            if (e.target.closest('[data-sidebar-toggle]')) {
                setDesktopSidebarCollapsed(!isDesktopSidebarCollapsed());
            }
        });
        document.body.dataset.sidebarToggleBound = 'true';
    }

    if (!document.body.dataset.sidebarClickBound) {
        document.addEventListener('click', function (e) {
            if (e.target.closest('[data-chevron-toggle]')) return;

            const navItem = e.target.closest('.nav-item');
            if (!navItem) return;

            if (navItem.matches('a[href="#"]')) {
                e.preventDefault();
            }

            document.querySelectorAll('.nav-item.is-active').forEach(function (item) {
                item.classList.remove('is-active', 'bg-zinc-950/5', 'text-zinc-950', 'dark:bg-white/5', 'dark:text-white');
                item.querySelectorAll('svg.nav-icon').forEach(function (icon) {
                    icon.classList.remove('text-blue-600', 'dark:text-blue-400', '!text-blue-600', 'dark:!text-blue-400');
                    icon.classList.add('text-gray-500', 'dark:text-gray-400');
                });
            });

            navItem.classList.add('is-active', 'bg-zinc-950/5', 'text-zinc-950', 'dark:bg-white/5', 'dark:text-white');
            navItem.querySelectorAll('svg.nav-icon').forEach(function (icon) {
                icon.classList.remove('text-gray-500', 'dark:text-gray-400');
                icon.classList.add('text-blue-600', 'dark:text-blue-400', '!text-blue-600', 'dark:!text-blue-400');
            });
            var href = navItem.getAttribute('href');
            var isNavigationLink = navItem.tagName === 'A' && href && href !== '#';
            if (!isNavigationLink) {
                syncDesktopNavCurrentIndicator();
            }
        });
        document.body.dataset.sidebarClickBound = 'true';
    }
}

/**
 * Closes all open submenus in the desktop navigation and resets chevron rotations.
 */
function closeAllDesktopSubmenus() {
    var desktopNav = getSidebarRefs().desktopNav;
    if (!desktopNav) return;
    desktopNav.querySelectorAll('.nav-submenu').forEach(function (submenu) {
        submenu.classList.remove('max-h-96', 'opacity-100', 'pointer-events-auto');
        submenu.classList.add('max-h-0', 'opacity-0', 'pointer-events-none');
    });
    desktopNav.querySelectorAll('.chevron-icon.rotate-180').forEach(function (chevron) {
        chevron.classList.remove('rotate-180');
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

    if (!desktopSidebarShell || !desktopSidebarPanel || !mainContentWrapper) return;

    var wasCollapsed = desktopSidebarShell.classList.contains('is-collapsed');

    document.documentElement.setAttribute('data-sidebar-collapsed', collapsed ? 'true' : 'false');

    desktopSidebarShell.classList.toggle('is-collapsed', collapsed);
    desktopSidebarShell.classList.toggle('lg:w-[288px]', !collapsed);
    desktopSidebarShell.classList.toggle('lg:w-[68px]', collapsed);

    normalizeMainContentWrapperLayout(collapsed);

    if (desktopLogoFull) desktopLogoFull.classList.toggle('hidden', collapsed);
    if (desktopLogoMark) {
        if (collapsed) {
            desktopLogoMark.classList.remove('hidden');
            desktopLogoMark.classList.add('flex');
        } else {
            desktopLogoMark.classList.add('hidden');
            desktopLogoMark.classList.remove('flex');
        }
    }

    if (desktopSidebarCollapseBtn) {
        desktopSidebarCollapseBtn.classList.toggle('hidden', collapsed);
        desktopSidebarCollapseBtn.classList.toggle('flex', !collapsed);
    }

    if (desktopSidebarHelp) desktopSidebarHelp.classList.toggle('hidden', collapsed);
    if (desktopSidebarFooter) desktopSidebarFooter.classList.toggle('hidden', collapsed);

    var appNav = document.querySelector('app-nav');
    if (wasCollapsed !== collapsed && appNav && typeof appNav.refreshNav === 'function') {
        var currentPage = (document.body && document.body.getAttribute('data-page'))
            || (window.location.pathname.split('/').pop() || '');
        appNav.refreshNav(currentPage);
        bindDashboardSidebarRuntime();
        syncActiveNavItemStyles();
    }

    if (collapsed && wasCollapsed !== collapsed) closeAllDesktopSubmenus();
    hideNavTooltip();
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
    const isCollapsed = submenu.classList.contains('max-h-0');
    if (isCollapsed) {
        submenu.classList.remove('max-h-0', 'opacity-0', 'pointer-events-none');
        submenu.classList.add('max-h-96', 'opacity-100', 'pointer-events-auto');
        if (chevron) chevron.classList.add('rotate-180');
    } else {
        submenu.classList.remove('max-h-96', 'opacity-100', 'pointer-events-auto');
        submenu.classList.add('max-h-0', 'opacity-0', 'pointer-events-none');
        if (chevron) chevron.classList.remove('rotate-180');
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
    const inDesktopNav = Boolean(trigger && trigger.closest('[data-nav="desktop"]'));
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
    const chevron = btn.querySelector('.chevron-icon');
    toggleSubmenuAnimation(submenu, chevron);
}

/**
 * Toggles a nav item's submenu, expanding the sidebar first if collapsed.
 * Called from HTML onclick attributes on expandable nav items.
 * @param {HTMLElement} trigger - The nav item element that was clicked.
 */
function toggleExpandableItem(trigger) {
    runWithExpandedSidebarIfNeeded(trigger, function () {
        toggleSubmenu(trigger);
    });
}

/**
 * Toggles the SMART Exchange submenu via the dedicated chevron button.
 * Called from HTML onclick attributes on the chevron toggle button.
 * @param {HTMLElement} chevronBtn - The chevron button element that was clicked.
 */
function toggleSmartExchangeSubmenu(chevronBtn) {
    const trigger = chevronBtn.closest('[data-smart-exchange-trigger]');
    const submenu = trigger ? trigger.nextElementSibling : null;
    runWithExpandedSidebarIfNeeded(trigger, function () {
        if (!submenu) return;
        const chevron = chevronBtn.querySelector('.chevron-icon');
        toggleSubmenuAnimation(submenu, chevron);
    });
}

function expandSmartExchangeFromCollapsedLink(link) {
    var desktopNav = getSidebarRefs().desktopNav;
    const trigger = link ? link.closest('[data-smart-exchange-trigger]') : null;
    const submenu = trigger ? trigger.nextElementSibling : null;
    if (!trigger || !submenu) return false;
    if (!desktopNav || !trigger.closest('[data-nav="desktop"]') || !isDesktopSidebarCollapsed()) return false;

    setDesktopSidebarCollapsed(false);
    if (submenu.classList.contains('max-h-0')) {
        const chevron = trigger.querySelector('[data-chevron-toggle] .chevron-icon');
        toggleSubmenuAnimation(submenu, chevron);
    }
    return true;
}

/* ===== Nav Tooltip ===== */

/**
 * Extracts the display label from a nav item element.
 * @param {HTMLElement} navItem - The nav item element.
 * @returns {string} The cleaned text content of the nav item.
 */
function getTooltipLabel(navItem) {
    return navItem.textContent.replace(/\s+/g, ' ').trim();
}

/**
 * Shows a floating tooltip next to a nav item when the sidebar is collapsed.
 * @param {HTMLElement} navItem - The nav item to show the tooltip for.
 */
function showNavTooltip(navItem) {
    var desktopNav = getSidebarRefs().desktopNav;
    var navTooltip = ensureNavTooltip();
    if (!isDesktopSidebarCollapsed()) return;
    if (!desktopNav || navItem.closest('.nav-submenu')) return;

    const label = getTooltipLabel(navItem);
    if (!label) return;

    navTooltip.textContent = label;
    const rect = navItem.getBoundingClientRect();
    navTooltip.style.left = rect.right + 12 + 'px';
    navTooltip.style.top = rect.top + rect.height / 2 + 'px';

    requestAnimationFrame(function () {
        navTooltip.style.opacity = '1';
        navTooltip.style.transform = 'translateY(-50%) translateX(0)';
    });
}

/* ===== Event Listeners ===== */

/**
 * Normalizes active nav item styles on initial page load.
 * Ensures active item icons are blue even if HTML classes drift.
 */
function syncActiveNavItemStyles() {
    document.querySelectorAll('.nav-item.is-active').forEach(function (item) {
        item.classList.add('bg-zinc-950/5', 'text-zinc-950', 'dark:bg-white/5', 'dark:text-white');
        item.querySelectorAll('svg.nav-icon').forEach(function (icon) {
            icon.classList.remove('text-gray-500', 'dark:text-gray-400', 'group-hover:text-zinc-950', 'group-focus-visible:text-zinc-950', 'dark:group-hover:text-white', 'dark:group-focus-visible:text-white');
            icon.classList.add('text-blue-600', 'dark:text-blue-400', '!text-blue-600', 'dark:!text-blue-400');
        });
    });
    syncDesktopNavCurrentIndicator(document.documentElement.classList.contains('sidebar-booting'));
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

window.addEventListener('load', function () { syncDesktopNavCurrentIndicator(true); });
if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { syncDesktopNavCurrentIndicator(true); });
}

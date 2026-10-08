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
    detailRow.classList.toggle('hidden');
    if (chevron) {
        chevron.classList.toggle('rotate-180');
    }
}

/* ===== Desktop Sidebar State ===== */

const DESKTOP_SIDEBAR_COLLAPSED_STORAGE_KEY = 'dashboard-sidebar-collapsed-v1';

function isConsumerPortalSidebar() {
    try { return Boolean(window.AppPlans && window.AppPlans.getPlan().brand === 'consumer-portal'); }
    catch (error) { return false; }
}

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
    mainContentWrapper.classList.remove('lg:pl-[288px]', 'lg:pl-[312px]', 'lg:pl-[68px]', 'lg:pl-[88px]');
    mainContentWrapper.classList.add('min-w-0', 'min-h-screen', 'flex', 'flex-col');
    mainContentWrapper.classList.add(isCollapsed
        ? (isConsumerPortalSidebar() ? 'lg:pl-[88px]' : 'lg:pl-[68px]')
        : (isConsumerPortalSidebar() ? 'lg:pl-[312px]' : 'lg:pl-[288px]'));
}

function ensureNavTooltip() {
    var existing = document.getElementById('dashboard-nav-tooltip');
    if (existing) return existing;

    var tooltip = document.createElement('div');
    tooltip.id = 'dashboard-nav-tooltip';
    tooltip.className = isConsumerPortalSidebar()
        ? 'pointer-events-none fixed z-[80] rounded-lg bg-gray-900 px-2.5 py-1 text-sm font-normal leading-5 text-gray-100 shadow-[0_10px_7.5px_rgba(0,0,0,0.1),0_4px_3px_rgba(0,0,0,0.05)]'
        : 'pointer-events-none fixed z-[80] rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg';
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

    if (isConsumerPortalSidebar()) {
        var consumerIndicator = desktopNav.querySelector('#desktop-nav-current-indicator');
        if (consumerIndicator) consumerIndicator.remove();
        return;
    }

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
            const consumerPortal = isConsumerPortalSidebar();

            if (navItem.matches('a[href="#"]')) {
                e.preventDefault();
            }

            document.querySelectorAll('.nav-item.is-active').forEach(function (item) {
                item.classList.remove('is-active', 'bg-zinc-950/5', 'text-zinc-950', 'dark:bg-white/5', 'dark:text-white', 'bg-gray-100', 'text-gray-900');
                item.querySelectorAll('[data-consumer-nav-icon]').forEach(function (icon) {
                    icon.src = icon.getAttribute('data-inactive-src');
                });
                item.querySelectorAll('svg.nav-icon').forEach(function (icon) {
                    icon.classList.remove('text-blue-600', 'dark:text-blue-400', '!text-blue-600', 'dark:!text-blue-400');
                    icon.classList.add('text-gray-500', 'dark:text-gray-400');
                });
            });

            navItem.classList.add('is-active');
            if (consumerPortal) navItem.classList.add('bg-gray-100', 'text-gray-900');
            else navItem.classList.add('bg-zinc-950/5', 'text-zinc-950', 'dark:bg-white/5', 'dark:text-white');
            if (consumerPortal) navItem.querySelectorAll('[data-consumer-nav-icon]').forEach(function (icon) {
                icon.src = icon.getAttribute('data-active-src');
            });
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
    var desktopLogoRow = refs.desktopLogoRow;
    var desktopLogoMark = refs.desktopLogoMark;
    var desktopSidebarHelp = refs.desktopSidebarHelp;
    var desktopSidebarFooter = refs.desktopSidebarFooter;
    var mainContentWrapper = refs.mainContentWrapper;

    if (!desktopSidebarShell || !desktopSidebarPanel || !mainContentWrapper) return;

    var wasCollapsed = desktopSidebarShell.classList.contains('is-collapsed');

    document.documentElement.setAttribute('data-sidebar-collapsed', collapsed ? 'true' : 'false');

    desktopSidebarShell.classList.toggle('is-collapsed', collapsed);
    desktopSidebarShell.classList.toggle('lg:w-[288px]', !collapsed && !isConsumerPortalSidebar());
    desktopSidebarShell.classList.toggle('lg:w-[312px]', !collapsed && isConsumerPortalSidebar());
    desktopSidebarShell.classList.toggle('lg:w-[68px]', collapsed && !isConsumerPortalSidebar());
    desktopSidebarShell.classList.toggle('lg:w-[88px]', collapsed && isConsumerPortalSidebar());
    if (isConsumerPortalSidebar()) {
        desktopSidebarPanel.classList.toggle('px-6', true);
        desktopSidebarPanel.classList.toggle('px-4', false);
        if (desktopLogoRow) {
            desktopLogoRow.classList.toggle('w-10', collapsed);
            desktopLogoRow.classList.toggle('w-full', !collapsed);
            desktopLogoRow.classList.toggle('h-8', true);
            desktopLogoRow.classList.toggle('px-1', !collapsed);
            desktopLogoRow.classList.toggle('justify-center', collapsed);
            desktopLogoRow.classList.toggle('justify-start', !collapsed);
        }
        var expandedHelp = desktopSidebarHelp && desktopSidebarHelp.querySelector('[data-sidebar-expanded-help]');
        var collapsedHelp = desktopSidebarHelp && desktopSidebarHelp.querySelector('[data-sidebar-collapsed-help]');
        var expandedFooter = desktopSidebarFooter && desktopSidebarFooter.querySelector('[data-sidebar-expanded-footer]');
        var collapsedFooter = desktopSidebarFooter && desktopSidebarFooter.querySelector('[data-sidebar-collapsed-footer]');
        if (expandedHelp) expandedHelp.classList.toggle('hidden', collapsed);
        if (collapsedHelp) collapsedHelp.classList.toggle('hidden', !collapsed);
        if (expandedFooter) expandedFooter.classList.toggle('hidden', collapsed);
        if (collapsedFooter) collapsedFooter.classList.toggle('hidden', !collapsed);
    }

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

    if (desktopSidebarHelp && !isConsumerPortalSidebar()) desktopSidebarHelp.classList.toggle('hidden', collapsed);
    if (desktopSidebarFooter && !isConsumerPortalSidebar()) desktopSidebarFooter.classList.toggle('hidden', collapsed);

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
 * Toggles the Supplier Portal submenu via the dedicated chevron button.
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
    if (isConsumerPortalSidebar()) {
        syncDesktopNavCurrentIndicator(document.documentElement.classList.contains('sidebar-booting'));
        return;
    }
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

/* Consumer portal icons are images: show the blue (active) artwork on hover/focus of inactive items. */
(function () {
    function swapConsumerIcons(e, toActive) {
        var item = e.target.closest && e.target.closest('.nav-item');
        if (!item || item.classList.contains('is-active')) return;
        item.querySelectorAll('[data-consumer-nav-icon]').forEach(function (icon) {
            icon.src = icon.getAttribute(toActive ? 'data-active-src' : 'data-inactive-src');
        });
    }
    function preload() {
        document.querySelectorAll('[data-consumer-nav-icon]').forEach(function (icon) {
            new Image().src = icon.getAttribute('data-active-src');
        });
    }
    window.addEventListener('load', preload);
    document.addEventListener('mouseover', function (e) { swapConsumerIcons(e, true); });
    document.addEventListener('mouseout', function (e) {
        var item = e.target.closest && e.target.closest('.nav-item');
        if (item && e.relatedTarget && item.contains(e.relatedTarget)) return;
        swapConsumerIcons(e, false);
    });
    document.addEventListener('focusin', function (e) { swapConsumerIcons(e, true); });
    document.addEventListener('focusout', function (e) { swapConsumerIcons(e, false); });
})();

/* Consumer portal "Help from Transcard": support popover (Figma "Transcard Support Team/Dropdown"). */
(function () {
    var popover = null;
    var activeTrigger = null;

    function build() {
        var el = document.createElement('div');
        el.id = 'help-support-popover';
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-label', 'Support Team');
        el.className = 'fixed z-[85] hidden w-[388px] max-w-[calc(100vw-16px)] overflow-hidden rounded-lg bg-white shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-2px_rgba(0,0,0,0.05),0px_0px_0px_1px_rgba(0,0,0,0.05)] dark:bg-gray-800';
        el.innerHTML = '' +
            '<div class="flex items-center gap-4 p-6">' +
            '  <div class="flex min-w-0 flex-1 flex-col gap-1.5">' +
            '    <p class="text-sm leading-5 font-medium text-gray-900 dark:text-white">Support Team</p>' +
            '    <div class="flex flex-wrap items-center gap-x-2 text-sm leading-5 text-gray-500 dark:text-gray-400">' +
            '      <span>support@transcard.com</span><span aria-hidden="true" class="h-[13px] w-px bg-gray-300 dark:bg-white/20"></span><span>800-890-3128</span>' +
            '    </div>' +
            '  </div>' +
            '</div>' +
            '<div class="flex h-[53px] border-t border-gray-200 dark:border-white/10">' +
            '  <a href="mailto:support@transcard.com" class="flex flex-1 items-center justify-center gap-2 text-base leading-6 font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-hidden focus-visible:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/5">' +
            '    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 text-gray-500"><path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z"/><path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z"/></svg>Email</a>' +
            '  <span aria-hidden="true" class="w-px bg-gray-200 dark:bg-white/10"></span>' +
            '  <a href="tel:8008903128" class="flex flex-1 items-center justify-center gap-2 text-base leading-6 font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-hidden focus-visible:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/5">' +
            '    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 text-gray-500"><path fill-rule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.716 3.223a1.5 1.5 0 0 1-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 0 0 6.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 0 1 1.767-1.052l3.223.716A1.5 1.5 0 0 1 18 15.352V16.5a1.5 1.5 0 0 1-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 0 1 2.43 8.326 13.019 13.019 0 0 1 2 5V3.5Z" clip-rule="evenodd"/></svg>Call</a>' +
            '</div>';
        document.body.appendChild(el);
        return el;
    }

    function position(trigger) {
        var r = trigger.getBoundingClientRect();
        var collapsed = !!trigger.closest('[data-sidebar-collapsed-help]');
        var w = popover.offsetWidth, h = popover.offsetHeight;
        var left = collapsed ? r.right + 8 : r.left;
        var top = collapsed ? r.top : r.bottom + 6;
        left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
        if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);
        popover.style.left = left + 'px';
        popover.style.top = top + 'px';
    }

    function setOpen(open, trigger) {
        if (open) {
            popover = popover || build();
            popover.classList.remove('hidden');
            activeTrigger = trigger;
            trigger.setAttribute('aria-expanded', 'true');
            position(trigger);
        } else if (popover && activeTrigger) {
            popover.classList.add('hidden');
            activeTrigger.setAttribute('aria-expanded', 'false');
            activeTrigger = null;
        }
    }

    document.addEventListener('click', function (e) {
        var trigger = e.target.closest && e.target.closest('[data-help-trigger]');
        if (trigger) {
            var wasOpen = activeTrigger === trigger;
            setOpen(false);
            if (!wasOpen) setOpen(true, trigger);
            return;
        }
        if (activeTrigger && !(popover && popover.contains(e.target))) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && activeTrigger) { var t = activeTrigger; setOpen(false); t.focus(); }
    });
    window.addEventListener('resize', function () { if (activeTrigger) position(activeTrigger); });
})();

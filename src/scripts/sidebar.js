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

const desktopSidebarShell = document.getElementById('desktop-sidebar-shell');
const desktopSidebarPanel = document.getElementById('desktop-sidebar-panel');
const desktopSidebarToggle = document.getElementById('desktop-sidebar-toggle');
const desktopSidebarToggleIcon = document.getElementById('desktop-sidebar-toggle-icon');
const desktopLogoRow = document.getElementById('desktop-logo-row');
const desktopLogoFull = document.getElementById('desktop-logo-full');
const desktopLogoMark = document.getElementById('desktop-logo-mark');
const desktopSidebarHelp = document.getElementById('desktop-sidebar-help');
const desktopSidebarFooter = document.getElementById('desktop-sidebar-footer');
const mainContentWrapper = document.getElementById('main-content-wrapper');
const desktopNav = document.querySelector('[data-nav="desktop"]');

const navTooltip = document.createElement('div');
navTooltip.className = 'pointer-events-none fixed z-[80] -translate-y-1/2 rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg opacity-0 -translate-x-1 transition-all duration-200 ease-out';
document.body.appendChild(navTooltip);

/* ===== Nav Label Preparation ===== */

/**
 * Wraps loose text nodes inside nav items with a span.nav-label element
 * so they can be individually hidden/shown during sidebar collapse.
 */
function prepareDesktopNavLabels() {
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
    return Boolean(desktopSidebarShell && desktopSidebarShell.classList.contains('is-collapsed'));
}

/**
 * Hides the floating nav tooltip with a fade-out transition.
 */
function hideNavTooltip() {
    navTooltip.classList.add('opacity-0', '-translate-x-1');
    navTooltip.classList.remove('opacity-100', 'translate-x-0');
}

/**
 * Closes all open submenus in the desktop navigation and resets chevron rotations.
 */
function closeAllDesktopSubmenus() {
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
    if (!desktopSidebarShell || !desktopSidebarPanel || !mainContentWrapper) return;

    desktopSidebarShell.classList.toggle('is-collapsed', collapsed);
    desktopSidebarShell.classList.toggle('lg:w-[360px]', !collapsed);
    desktopSidebarShell.classList.toggle('lg:w-[88px]', collapsed);

    desktopSidebarPanel.classList.toggle('px-6', !collapsed);
    desktopSidebarPanel.classList.toggle('px-3', collapsed);

    mainContentWrapper.classList.toggle('lg:pl-[360px]', !collapsed);
    mainContentWrapper.classList.toggle('lg:pl-[88px]', collapsed);

    if (desktopLogoFull) desktopLogoFull.classList.toggle('hidden', collapsed);
    if (desktopLogoMark) desktopLogoMark.classList.toggle('hidden', !collapsed);

    if (desktopLogoRow) desktopLogoRow.classList.toggle('justify-center', collapsed);
    if (desktopSidebarToggleIcon) desktopSidebarToggleIcon.classList.toggle('rotate-180', collapsed);
    if (desktopSidebarToggle) {
        desktopSidebarToggle.classList.toggle('left-[344px]', !collapsed);
        desktopSidebarToggle.classList.toggle('left-[72px]', collapsed);
    }

    if (desktopSidebarHelp) desktopSidebarHelp.classList.toggle('hidden', collapsed);
    if (desktopSidebarFooter) desktopSidebarFooter.classList.toggle('hidden', collapsed);

    if (desktopNav) {
        desktopNav.querySelectorAll(':scope > .nav-item, :scope > [data-smart-exchange-trigger]').forEach(function (item) {
            item.classList.toggle('overflow-hidden', collapsed);
            item.classList.toggle('!justify-center', collapsed);
            item.classList.toggle('!px-0', collapsed);

            const iconLabelGroup = item.querySelector(':scope > span, :scope > a');
            if (iconLabelGroup) {
                iconLabelGroup.classList.toggle('w-6', collapsed);
                iconLabelGroup.classList.toggle('!flex-none', collapsed);
                iconLabelGroup.classList.toggle('overflow-hidden', collapsed);
                iconLabelGroup.classList.toggle('gap-0', collapsed);
                iconLabelGroup.classList.toggle('justify-center', collapsed);
                const label = iconLabelGroup.querySelector('.nav-label');
                if (label) label.classList.toggle('hidden', collapsed);
            }

            const chevronButton = item.querySelector(':scope > [data-chevron-toggle]');
            if (chevronButton) chevronButton.classList.toggle('hidden', collapsed);

            const trailingChevron = item.querySelector(':scope > svg.chevron-icon');
            if (trailingChevron) trailingChevron.classList.toggle('hidden', collapsed);
        });
    }

    if (collapsed) closeAllDesktopSubmenus();
    hideNavTooltip();
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
    if (!isDesktopSidebarCollapsed()) return;
    if (!desktopNav || navItem.closest('.nav-submenu')) return;

    const label = getTooltipLabel(navItem);
    if (!label) return;

    navTooltip.textContent = label;
    const rect = navItem.getBoundingClientRect();
    navTooltip.style.left = rect.right + 12 + 'px';
    navTooltip.style.top = rect.top + rect.height / 2 + 'px';

    requestAnimationFrame(function () {
        navTooltip.classList.remove('opacity-0', '-translate-x-1');
        navTooltip.classList.add('opacity-100', 'translate-x-0');
    });
}

/* ===== Event Listeners ===== */

if (desktopNav) {
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
}

if (desktopSidebarToggle) {
    desktopSidebarToggle.addEventListener('click', function () {
        setDesktopSidebarCollapsed(!isDesktopSidebarCollapsed());
    });
}

prepareDesktopNavLabels();

/* ===== Active Nav Item Management ===== */

/**
 * Handles click events on nav items to highlight the active item.
 * Only one nav item can be active at a time. Prevents default on # links.
 */
document.addEventListener('click', function (e) {
    if (e.target.closest('[data-chevron-toggle]')) return;

    const navItem = e.target.closest('.nav-item');
    if (!navItem) return;

    if (navItem.matches('a[href="#"]')) {
        e.preventDefault();
    }

    document.querySelectorAll('.nav-item.is-active').forEach(function (item) {
        item.classList.remove('is-active', 'bg-gray-100', 'text-gray-900', 'dark:bg-white/10', 'dark:text-white');
        item.querySelectorAll('svg.nav-icon').forEach(function (icon) {
            icon.classList.remove('text-blue-600', 'dark:text-blue-400');
            icon.classList.add('text-gray-500', 'dark:text-gray-400');
        });
    });

    navItem.classList.add('is-active', 'bg-gray-100', 'text-gray-900', 'dark:bg-white/10', 'dark:text-white');
    navItem.querySelectorAll('svg.nav-icon').forEach(function (icon) {
        icon.classList.remove('text-gray-500', 'dark:text-gray-400');
        icon.classList.add('text-blue-600', 'dark:text-blue-400');
    });
});

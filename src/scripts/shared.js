/**
 * @file shared.js
 * @description Shared dashboard utilities — runs on every dashboard page (defer).
 *
 * Exports (globals):
 *   initThemeToggle()       – Sync #theme-toggle checkbox with localStorage / .dark class
 *   initBreadcrumbs()       – Render #dynamic-breadcrumbs from page-filename lookup table
 *   isMaskedText(value)     – Returns true if value consists only of bullet/asterisk chars
 *   initCopyToClipboard()   – Delegated click handler for [data-copy-id] with tooltip
 *   initCountryFlag()       – Sync flag icon when #gp-edit-check-country changes (SE only)
 *
 * Script loading order (all defer):
 *   nav-component.js → sidebar.js → shared.js → [page-specific scripts]
 */

/* ===== Theme Toggle ===== */

function initThemeToggle() {
    var root = document.documentElement;
    var toggle = document.getElementById('theme-toggle');
    if (!toggle) return;

    function setTheme(isDark) {
        root.classList.toggle('dark', isDark);
        try { localStorage.setItem('theme', isDark ? 'dark' : 'light'); } catch (e) {}
        toggle.checked = isDark;
    }

    var savedTheme = null;
    try { savedTheme = localStorage.getItem('theme'); } catch (e) {}
    if (savedTheme === 'dark' || savedTheme === 'light') {
        setTheme(savedTheme === 'dark');
    } else {
        toggle.checked = root.classList.contains('dark');
    }

    toggle.addEventListener('change', function () {
        setTheme(toggle.checked);
    });
}

/* ===== Breadcrumbs ===== */

var BREADCRUMB_CONFIGS = {
    'smart-exchange.html': [
        { label: 'SMART Exchange', href: null }
    ],
    'payment-preferences.html': [
        { label: 'SMART Exchange', href: 'smart-exchange.html' },
        { label: 'Payment Preferences', href: null }
    ],
    'my-company-profile.html': [
        { label: 'My Company Profile', href: null }
    ]
};

function initBreadcrumbs() {
    var nav = document.getElementById('dynamic-breadcrumbs');
    if (!nav) return;

    var path = (window.location.pathname || '').split('/').pop() || '';
    var items = BREADCRUMB_CONFIGS[path] || [];
    if (!items.length) return;

    var html = '' +
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-5 text-gray-400 dark:text-gray-500">' +
        '  <path fill-rule="evenodd" d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z" clip-rule="evenodd" />' +
        '</svg>';

    items.forEach(function (item, index) {
        html += '' +
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-5 text-gray-300 dark:text-gray-600">' +
            '  <path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />' +
            '</svg>';
        if (item.href && index !== items.length - 1) {
            html += '<a href="' + item.href + '" class="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors dark:text-gray-400 dark:hover:text-gray-200">' + item.label + '</a>';
        } else {
            html += '<span class="text-sm font-medium text-gray-900 dark:text-white">' + item.label + '</span>';
        }
    });

    nav.innerHTML = html;
}

/* ===== Masked Text Detection ===== */

function isMaskedText(value) {
    return /[•]/.test(String(value || ''));
}

/* ===== Copy to Clipboard with Animated Tooltip ===== */

function showCopiedTooltip(anchorEl) {
    if (!anchorEl) return;
    var rect = anchorEl.getBoundingClientRect();
    var dialogHost = anchorEl.closest('dialog[open]');
    var insideModal = !!dialogHost;
    var topOffset = insideModal ? 8 : 4;
    var tipHost = dialogHost || document.body;

    var existing = anchorEl._copyTip;
    if (existing) {
        clearTimeout(anchorEl._copyTipTimer);
        existing.remove();
    }

    var tip = document.createElement('div');
    tip.textContent = 'Copied';
    tip.style.cssText = [
        'position:fixed',
        'left:' + (rect.left + rect.width / 2) + 'px',
        'top:' + (rect.top - topOffset) + 'px',
        'transform:translate(-50%, calc(-100% + 6px))',
        'background:#111827',
        'color:#fff',
        'font-size:12px',
        'font-family:Inter,sans-serif',
        'line-height:1.5',
        'padding:3px 8px',
        'border-radius:6px',
        'pointer-events:none',
        'z-index:9999',
        'opacity:0',
        'transition:opacity 220ms ease-out,transform 220ms ease-out',
        'white-space:nowrap'
    ].join(';');
    tipHost.appendChild(tip);
    anchorEl._copyTip = tip;

    tip.getBoundingClientRect();
    tip.style.transform = 'translate(-50%,-100%)';
    tip.style.opacity = '1';

    anchorEl._copyTipTimer = setTimeout(function () {
        tip.style.transform = 'translate(-50%, calc(-100% - 6px))';
        tip.style.opacity = '0';
        setTimeout(function () { tip.remove(); anchorEl._copyTip = null; }, 240);
    }, 700);
}

function copyTextWithFeedback(text, anchorEl) {
    var value = String(text || '').trim();
    if (!value) return Promise.resolve(false);

    function fallbackCopy() {
        try {
            var ta = document.createElement('textarea');
            ta.value = value;
            ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
            document.body.appendChild(ta);
            ta.select();
            var ok = document.execCommand('copy');
            document.body.removeChild(ta);
            return Promise.resolve(Boolean(ok));
        } catch (e) {
            return Promise.resolve(false);
        }
    }

    var writePromise = navigator.clipboard && navigator.clipboard.writeText
        ? navigator.clipboard.writeText(value).then(function () { return true; }).catch(function () { return fallbackCopy(); })
        : fallbackCopy();

    return writePromise.then(function (copied) {
        if (copied) showCopiedTooltip(anchorEl);
        return copied;
    });
}

window.showCopiedTooltip = showCopiedTooltip;
window.copyTextWithFeedback = copyTextWithFeedback;

function initCopyToClipboard() {
    document.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-copy-id]');
        if (!btn) return;

        if (btn.getAttribute('data-copy-requires-reveal') === 'true') {
            var cardPanel = btn.closest('[data-payment-info-card]');
            var revealToggle = cardPanel ? cardPanel.querySelector('[data-card-reveal-toggle]') : null;
            var isRevealed = revealToggle && revealToggle.getAttribute('data-revealed') === 'true';
            if (!isRevealed) return;
        }

        var targetEl = document.getElementById(btn.getAttribute('data-copy-id'));
        if (!targetEl) return;

        var text = targetEl.textContent.trim();
        if (isMaskedText(text)) return;
        if (!text) return;

        e.preventDefault();
        e.stopPropagation();

        copyTextWithFeedback(text, btn);
    });
}

function syncMaskedCopyButtons() {
    document.querySelectorAll('[data-copy-id]').forEach(function (btn) {
        // Some views (e.g. Get Paid bank details) manage masked/revealed copy state manually.
        if (btn.hasAttribute('data-copy-enabled')) return;

        var targetId = btn.getAttribute('data-copy-id');
        if (!targetId) return;
        var targetEl = document.getElementById(targetId);
        if (!targetEl) return;

        var masked = isMaskedText(String(targetEl.textContent || '').trim());
        var requiresReveal = btn.getAttribute('data-copy-requires-reveal') === 'true';
        var revealHidden = false;
        if (requiresReveal) {
            var cardPanel = btn.closest('[data-payment-info-card]');
            var revealToggle = cardPanel ? cardPanel.querySelector('[data-card-reveal-toggle]') : null;
            revealHidden = !(revealToggle && revealToggle.getAttribute('data-revealed') === 'true');
        }

        var shouldHide = masked || revealHidden;
        btn.classList.toggle('hidden', shouldHide);
        btn.classList.toggle('pointer-events-none', shouldHide);
        btn.setAttribute('aria-hidden', shouldHide ? 'true' : 'false');
        if (shouldHide) btn.setAttribute('tabindex', '-1');
        else btn.removeAttribute('tabindex');

        if (shouldHide && btn._copyTip) {
            clearTimeout(btn._copyTipTimer);
            btn._copyTip.remove();
            btn._copyTip = null;
        }
    });
}

function initMaskedCopySync() {
    syncMaskedCopyButtons();
    if (!document.body) return;
    var observer = new MutationObserver(syncMaskedCopyButtons);
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['data-revealed'] });

    document.addEventListener('click', function (e) {
        if (
            e.target.closest('[data-card-reveal-toggle]') ||
            e.target.closest('#gp-pmc-reveal-btn') ||
            e.target.closest('[id^="gp-bank-reveal-btn-"]')
        ) {
            requestAnimationFrame(syncMaskedCopyButtons);
        }
    });
}

/* ===== Country Flag (SMART Exchange — guard prevents activation on other pages) ===== */

function initCountryFlag() {
    var sel = document.getElementById('gp-edit-check-country');
    var flag = document.getElementById('gp-edit-check-country-flag');
    if (!sel || !flag) return;
    sel.addEventListener('change', function () {
        flag.className = 'fi fi-' + sel.value + ' col-start-1 row-start-1 pointer-events-none z-10 self-center justify-self-start ml-3 rounded-sm';
    });
}

/* ===== Global Top Snackbar ===== */

var _globalTopToast = {
    el: null,
    removeTimer: null,
    autoHideTimer: null
};

function _escapeToastHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function ensureGlobalTopToastStyles() {
    if (document.getElementById('sx-global-top-toast-style')) return;
    var style = document.createElement('style');
    style.id = 'sx-global-top-toast-style';
    style.textContent =
        '.sx-global-top-toast{' +
        'position:fixed;left:50%;top:36px;z-index:500;display:flex;align-items:center;gap:12px;' +
        'max-width:min(680px,calc(100vw - 24px));padding:10px 12px;border-radius:10px;' +
        'background:#111827;color:#fff;box-shadow:0 10px 25px rgba(0,0,0,.2);' +
        'transform:translate(-50%,-8px);opacity:0;pointer-events:auto;' +
        'transition:transform 220ms ease,opacity 220ms ease;}' +
        '.sx-global-top-toast[data-state="visible"]{transform:translate(-50%,0);opacity:1;}' +
        '.sx-global-top-toast[data-state="leaving"]{transform:translate(-50%,8px);opacity:0;}' +
        '.sx-global-top-toast__msg{font-size:14px;line-height:20px;font-weight:500;}' +
        '.sx-global-top-toast__close{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border:0;border-radius:6px;background:transparent;color:#D1D5DB;cursor:pointer;}' +
        '.sx-global-top-toast__close:hover{background:rgba(255,255,255,.12);color:#fff;}';
    document.head.appendChild(style);
}

function hideGlobalTopToast() {
    if (!_globalTopToast.el) return;
    if (_globalTopToast.autoHideTimer) {
        clearTimeout(_globalTopToast.autoHideTimer);
        _globalTopToast.autoHideTimer = null;
    }
    _globalTopToast.el.setAttribute('data-state', 'leaving');
    if (_globalTopToast.removeTimer) clearTimeout(_globalTopToast.removeTimer);
    _globalTopToast.removeTimer = window.setTimeout(function () {
        if (!_globalTopToast.el) return;
        _globalTopToast.el.remove();
        _globalTopToast.el = null;
        _globalTopToast.removeTimer = null;
    }, 240);
}

function showGlobalTopToast(message) {
    var text = String(message || '').trim();
    if (!text) return;
    ensureGlobalTopToastStyles();
    if (_globalTopToast.removeTimer) {
        clearTimeout(_globalTopToast.removeTimer);
        _globalTopToast.removeTimer = null;
    }
    if (_globalTopToast.autoHideTimer) {
        clearTimeout(_globalTopToast.autoHideTimer);
        _globalTopToast.autoHideTimer = null;
    }
    if (_globalTopToast.el) {
        _globalTopToast.el.remove();
        _globalTopToast.el = null;
    }

    var toast = document.createElement('div');
    toast.className = 'sx-global-top-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML =
        '<span aria-hidden="true" class="inline-flex shrink-0 text-emerald-500">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">' +
              '<path fill-rule="evenodd" clip-rule="evenodd" d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18ZM13.8566 8.19113C14.1002 7.85614 14.0261 7.38708 13.6911 7.14345C13.3561 6.89982 12.8871 6.97388 12.6434 7.30887L9.15969 12.099L7.28033 10.2197C6.98744 9.92678 6.51256 9.92678 6.21967 10.2197C5.92678 10.5126 5.92678 10.9874 6.21967 11.2803L8.71967 13.7803C8.87477 13.9354 9.08999 14.0149 9.30867 13.9977C9.52734 13.9805 9.72754 13.8685 9.85655 13.6911L13.8566 8.19113Z" fill="#10B981"/>' +
            '</svg>' +
        '</span>' +
        '<span class="sx-global-top-toast__msg">' + _escapeToastHtml(text) + '</span>' +
        '<button type="button" aria-label="Dismiss notification" class="sx-global-top-toast__close">' +
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4">' +
                '<path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"/>' +
            '</svg>' +
        '</button>';
    document.body.appendChild(toast);
    _globalTopToast.el = toast;

    var closeBtn = toast.querySelector('.sx-global-top-toast__close');
    if (closeBtn) closeBtn.addEventListener('click', hideGlobalTopToast);

    window.requestAnimationFrame(function () {
        if (!_globalTopToast.el) return;
        _globalTopToast.el.setAttribute('data-state', 'visible');
    });
    _globalTopToast.autoHideTimer = window.setTimeout(hideGlobalTopToast, 3000);
}

window.showGlobalTopToast = showGlobalTopToast;

/* ===== Dialog Dismiss Guard ===== */

function initDialogDismissGuard() {
    // Disable light-dismiss/escape-dismiss globally for native dialogs.
    document.addEventListener('cancel', function (e) {
        var dialog = e.target;
        if (!dialog || dialog.tagName !== 'DIALOG') return;
        e.preventDefault();
    }, true);

    // Ignore backdrop clicks for both native <dialog> backdrops and custom el-dialog wrappers.
    function isDialogBackdropInteraction(e) {
        var target = e.target;
        if (!target || typeof target.closest !== 'function') return false;
        if (target.closest('[data-guide-tooltip-host]')) return false;
        var dialog = target.closest('dialog[open]');
        if (!dialog) {
            var backdrop = target.closest('el-dialog-backdrop');
            if (backdrop) {
                var backdropHost = backdrop.closest('el-dialog');
                if (backdropHost && backdropHost.querySelector('dialog[open]')) return true;
            }
            var host = target.closest('el-dialog');
            if (
                host &&
                host.querySelector('dialog[open]') &&
                host.querySelector('el-dialog-panel') &&
                !target.closest('el-dialog-panel')
            ) return true;
            return false;
        }
        if (target === dialog) return true;
        if (target.closest('el-dialog-panel')) return false;
        if (!dialog.querySelector('el-dialog-panel')) return false;
        if (target.closest('el-dialog-backdrop')) return true;
        // For Tailwind-plus el-dialog structure, wrapper clicks outside panel are light-dismiss attempts.
        return dialog.contains(target);
    }

    function blockBackdropPointer(e) {
        if (!isDialogBackdropInteraction(e)) return;
        e.preventDefault();
        e.stopPropagation();
    }
    document.addEventListener('pointerdown', blockBackdropPointer, true);
    document.addEventListener('click', blockBackdropPointer, true);
}

/* ===== Mobile Overlay Scroll Lock ===== */

var _mobileOverlayScrollLock = {
    locked: false,
    scrollY: 0
};

function shouldLockMobileOverlayScroll() {
    if (!window.matchMedia('(max-width: 639px)').matches) return false;

    if (document.querySelector('dialog[open]')) return true;

    var filterMenu = document.getElementById('sx-table-filter-menu');
    if (filterMenu && !filterMenu.classList.contains('invisible') && !filterMenu.classList.contains('pointer-events-none')) {
        return true;
    }

    var filterBackdrop = document.getElementById('sx-table-filter-backdrop');
    if (filterBackdrop && !filterBackdrop.classList.contains('invisible') && !filterBackdrop.classList.contains('pointer-events-none')) {
        return true;
    }

    var ppCardsFilterMenu = document.getElementById('pp-cards-filter-menu');
    if (ppCardsFilterMenu && !ppCardsFilterMenu.classList.contains('invisible') && !ppCardsFilterMenu.classList.contains('pointer-events-none')) {
        return true;
    }

    var ppCardsFilterBackdrop = document.getElementById('pp-cards-filter-backdrop');
    if (ppCardsFilterBackdrop && !ppCardsFilterBackdrop.classList.contains('invisible') && !ppCardsFilterBackdrop.classList.contains('pointer-events-none')) {
        return true;
    }

    return false;
}

function setMobileOverlayScrollLocked(locked) {
    var body = document.body;
    if (!body) return;

    if (locked && !_mobileOverlayScrollLock.locked) {
        _mobileOverlayScrollLock.scrollY = window.scrollY || window.pageYOffset || 0;
        body.style.position = 'fixed';
        body.style.top = '-' + _mobileOverlayScrollLock.scrollY + 'px';
        body.style.left = '0';
        body.style.right = '0';
        body.style.width = '100%';
        body.style.overflowY = 'scroll';
        _mobileOverlayScrollLock.locked = true;
        return;
    }

    if (!locked && _mobileOverlayScrollLock.locked) {
        var restoreY = _mobileOverlayScrollLock.scrollY || 0;
        body.style.position = '';
        body.style.top = '';
        body.style.left = '';
        body.style.right = '';
        body.style.width = '';
        body.style.overflowY = '';
        _mobileOverlayScrollLock.locked = false;
        window.scrollTo(0, restoreY);
    }
}

function initMobileOverlayScrollLock() {
    function syncLockState() {
        setMobileOverlayScrollLocked(shouldLockMobileOverlayScroll());
    }

    syncLockState();

    window.addEventListener('resize', syncLockState);
    window.addEventListener('orientationchange', syncLockState);
    document.addEventListener('click', function () {
        requestAnimationFrame(syncLockState);
    }, true);

    if (document.body) {
        var observer = new MutationObserver(function () {
            syncLockState();
        });
        observer.observe(document.body, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ['class', 'open']
        });
    }
}

/* ===== Init ===== */

initThemeToggle();
initBreadcrumbs();
initCopyToClipboard();
initMaskedCopySync();
initCountryFlag();
initDialogDismissGuard();
initMobileOverlayScrollLock();

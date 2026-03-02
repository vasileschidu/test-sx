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
    var insideModal = !!anchorEl.closest('dialog[open]');
    var topOffset = insideModal ? 8 : 4;

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
    document.body.appendChild(tip);
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
initMobileOverlayScrollLock();

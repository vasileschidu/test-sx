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
    var toggleButton = document.querySelector('[data-theme-toggle-button]');
    if (!toggle && !toggleButton) return;

    function syncThemeControls(isDark) {
        if (toggle) toggle.checked = isDark;
        if (toggleButton) {
            toggleButton.setAttribute('aria-pressed', isDark ? 'true' : 'false');
            toggleButton.querySelectorAll('[data-theme-icon="light"]').forEach(function (icon) {
                icon.classList.toggle('hidden', isDark);
            });
            toggleButton.querySelectorAll('[data-theme-icon="dark"]').forEach(function (icon) {
                icon.classList.toggle('hidden', !isDark);
            });
        }
    }

    function setTheme(isDark) {
        root.classList.toggle('dark', isDark);
        try { localStorage.setItem('theme', isDark ? 'dark' : 'light'); } catch (e) {}
        syncThemeControls(isDark);
        window.dispatchEvent(new CustomEvent('app-theme-change', { detail: { isDark: isDark } }));
    }

    var savedTheme = null;
    try { savedTheme = localStorage.getItem('theme'); } catch (e) {}
    if (savedTheme === 'dark' || savedTheme === 'light') {
        setTheme(savedTheme === 'dark');
    } else {
        syncThemeControls(root.classList.contains('dark'));
    }

    if (toggle) {
        toggle.addEventListener('change', function () {
            setTheme(toggle.checked);
        });
    }

    if (toggleButton) {
        toggleButton.addEventListener('click', function () {
            setTheme(!root.classList.contains('dark'));
        });
    }
}

/* ===== Breadcrumbs ===== */

var BREADCRUMB_CONFIGS = {
    'smart-exchange.html': [
        { label: 'SMART Exchange', href: null }
    ],
    'bills-and-payables.html': [
        { label: 'Bills and Payables', href: null }
    ],
    'vendors.html': [
        { label: 'Vendors', href: null }
    ],
    'vendor-profile.html': [
        { label: 'Vendors', href: 'vendors.html' },
        { label: 'Vendor Profile', href: null }
    ],
    'payables-pay.html': [
        { label: 'Bills and Payables', href: 'bills-and-payables.html' },
        { label: 'Pay Page', href: null }
    ],
    'payment-preferences.html': [
        { label: 'SMART Exchange', href: 'smart-exchange.html' },
        { label: 'Payment Preferences', href: null }
    ],
    'my-company-profile.html': [
        { label: 'My Company Profile', href: null }
    ]
};

var BREADCRUMB_REACT_ROUTE_MAP = {
    'smart-exchange.html': '#/smart-exchange',
    'bills-and-payables.html': '#/payables',
    'payables-pay.html': '#/payables',
    'vendors.html': '#/vendors',
    'vendor-profile.html': '#/vendors',
    'payment-preferences.html': '#/payment-preferences',
    'my-company-profile.html': '#/smart-exchange'
};

function resolveBreadcrumbHref(href) {
    if (!href) return href;
    var routerMode = document.body && document.body.getAttribute('data-router');
    if (routerMode === 'hash' && BREADCRUMB_REACT_ROUTE_MAP[href]) {
        return BREADCRUMB_REACT_ROUTE_MAP[href];
    }
    return href;
}

function initBreadcrumbs() {
    var nav = document.getElementById('dynamic-breadcrumbs');
    if (!nav) return;

    var path = nav.getAttribute('data-page')
        ? nav.getAttribute('data-page')
        : (document.body && document.body.getAttribute('data-page')
            ? document.body.getAttribute('data-page')
            : ((window.location.pathname || '').split('/').pop() || ''));
    var items = BREADCRUMB_CONFIGS[path] || [];
    if (!items.length) return;

    var html = '' +
        '<ol role="list" class="flex items-center space-x-4">' +
        '  <li>' +
        '    <div>' +
        '      <a href="' + resolveBreadcrumbHref('smart-exchange.html') + '" class="text-gray-400 transition-colors hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-300">' +
        '        <svg viewBox="0 0 20 20" fill="currentColor" data-slot="icon" aria-hidden="true" class="size-5 shrink-0">' +
        '          <path fill-rule="evenodd" d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z" clip-rule="evenodd" />' +
        '        </svg>' +
        '        <span class="sr-only">Home</span>' +
        '      </a>' +
        '    </div>' +
        '  </li>';

    items.forEach(function (item, index) {
        var isLast = index === items.length - 1;
        html += '' +
            '<li>' +
            '  <div class="flex items-center">' +
            '    <svg viewBox="0 0 20 20" fill="currentColor" data-slot="icon" aria-hidden="true" class="size-5 shrink-0 text-gray-400 dark:text-gray-500">' +
            '      <path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />' +
            '    </svg>';
        if (item.href && !isLast) {
            html += '<a href="' + resolveBreadcrumbHref(item.href) + '" class="ml-4 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">' + item.label + '</a>';
        } else {
            html += '<a href="#" aria-current="page" class="ml-4 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100">' + item.label + '</a>';
        }
        html += '' +
            '  </div>' +
            '</li>';
    });

    html += '</ol>';

    nav.innerHTML = html;
}

/* ===== Masked Text Detection ===== */

function isMaskedText(value) {
    return /[•]/.test(String(value || ''));
}

/* ===== Shared My Company Profile ===== */

var MY_COMPANY_PROFILE_PATHS = [
    '../../data/my-company-profile.json',
    '../../../src/data/my-company-profile.json',
    '/src/data/my-company-profile.json',
    './src/data/my-company-profile.json'
];
var _myCompanyProfilePromise = null;

function loadSharedJsonWithFallbacks(paths) {
    var index = 0;
    function tryNext() {
        if (index >= paths.length) return Promise.reject(new Error('Failed to load JSON.'));
        var path = paths[index++];
        return fetch(path, { cache: 'no-store' })
            .then(function (response) {
                if (!response.ok) throw new Error('HTTP ' + response.status + ' for ' + path);
                return response.json();
            })
            .catch(function () {
                return tryNext();
            });
    }
    return tryNext();
}

function buildMyCompanyAddressText(legalAddress, fallbackAddress) {
    var address = legalAddress && typeof legalAddress === 'object' ? legalAddress : {};
    var line1 = String(address.line1 || '').trim();
    var line2 = String(address.line2 || '').trim();
    var city = String(address.city || '').trim();
    var state = String(address.state || '').trim();
    var postalCode = String(address.postalCode || address.zip || '').trim();
    var country = String(address.country || address.countryName || '').trim();
    var cityState = [city, state].filter(Boolean).join(', ');
    if (postalCode) cityState = cityState ? (cityState + ' ' + postalCode) : postalCode;
    var lines = [line1, line2, cityState, country].filter(Boolean);
    if (lines.length) return lines.join('\n');
    return String(fallbackAddress || '').trim();
}

function normalizeMyCompanyProfile(profile) {
    var raw = profile && typeof profile === 'object' ? profile : {};
    var legalAddress = raw.legalAddress && typeof raw.legalAddress === 'object' ? raw.legalAddress : {};
    var contact = raw.contact && typeof raw.contact === 'object' ? raw.contact : {};
    var legalName = String(raw.legalName || raw.name || '').trim();
    var legalAddressText = buildMyCompanyAddressText(
        legalAddress,
        raw.mailingAddress && raw.mailingAddress.address
    );
    return {
        id: String(raw.id || 'my-business'),
        legalName: legalName,
        businessPhone: String(raw.businessPhone || raw.phone || '').trim(),
        businessEmail: String(raw.businessEmail || raw.email || '').trim(),
        businessStructure: String(raw.businessStructure || '').trim(),
        organizationIdType: String(raw.organizationIdType || '').trim(),
        organizationIdLabel: String(raw.organizationIdLabel || raw.organizationIdType || '').trim(),
        organizationIdValue: String(raw.organizationIdValue || '').trim(),
        website: String(raw.website || '').trim(),
        stockSymbol: String(raw.stockSymbol || raw.stock || '').trim(),
        dbaEnabled: raw.dbaEnabled !== false,
        dbaName: String(raw.dbaName || '').trim(),
        contact: {
            name: String(contact.name || '').trim(),
            email: String(contact.email || '').trim(),
            phone: String(contact.phone || '').trim()
        },
        legalAddress: {
            nickname: String(legalAddress.nickname || '').trim(),
            line1: String(legalAddress.line1 || '').trim(),
            line2: String(legalAddress.line2 || '').trim(),
            city: String(legalAddress.city || '').trim(),
            state: String(legalAddress.state || '').trim(),
            postalCode: String(legalAddress.postalCode || legalAddress.zip || '').trim(),
            countryCode: String(legalAddress.countryCode || '').trim().toLowerCase(),
            country: String(legalAddress.country || legalAddress.countryName || '').trim(),
            displayText: legalAddressText
        },
        mailingAddress: {
            name: legalName,
            address: legalAddressText
        }
    };
}

function getMyCompanyDisplayName(profile) {
    var normalized = normalizeMyCompanyProfile(profile);
    return normalized.legalName || '';
}

function getMyCompanyAddressText(profile) {
    var normalized = normalizeMyCompanyProfile(profile);
    return normalized.legalAddress.displayText || normalized.mailingAddress.address || '';
}

function getMyCompanyProfile() {
    if (!_myCompanyProfilePromise) {
        _myCompanyProfilePromise = loadSharedJsonWithFallbacks(MY_COMPANY_PROFILE_PATHS)
            .then(function (profile) {
                var normalized = normalizeMyCompanyProfile(profile);
                window.__myCompanyProfileCache = normalized;
                return normalized;
            })
            .catch(function () {
                var normalized = normalizeMyCompanyProfile({});
                window.__myCompanyProfileCache = normalized;
                return normalized;
            });
    }
    return _myCompanyProfilePromise;
}

window.normalizeMyCompanyProfile = normalizeMyCompanyProfile;
window.getMyCompanyDisplayName = getMyCompanyDisplayName;
window.getMyCompanyAddressText = getMyCompanyAddressText;
window.getMyCompanyProfile = getMyCompanyProfile;
window.initThemeToggle = initThemeToggle;
window.initBreadcrumbs = initBreadcrumbs;

/* ===== Shared Payment Activity Inference ===== */

function firstNonEmptyValue() {
    for (var i = 0; i < arguments.length; i += 1) {
        var value = arguments[i];
        if (value == null) continue;
        if (typeof value === 'string' && !value.trim()) continue;
        return value;
    }
    return '';
}

function normalizeActivityTimestamp(value) {
    if (!value) return '';
    var str = String(value).trim();
    if (!str) return '';
    var normalized = /^\d{4}-\d{2}-\d{2}$/.test(str) ? (str + 'T00:00:00') : str;
    var date = new Date(normalized);
    if (isNaN(date.getTime())) return '';
    return normalized;
}

function formatActivityLogDate(value) {
    var normalized = normalizeActivityTimestamp(value);
    if (!normalized) return '';
    var date = new Date(normalized);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function inferActivityKind(item) {
    if (!item || typeof item !== 'object') return '';
    var content = [
        item.kind,
        item.type,
        item.label,
        item.title,
        item.action,
        item.description,
        item.comment
    ].join(' ').toLowerCase();

    if (!content) return '';
    if (/fail|failed|exception|declin|reject|error|returned/.test(content)) return 'failed';
    if (/complet|paid|delivered|settled|success/.test(content)) return 'completed';
    if (/processing|processor|verification|approval|sync|pending payee action|in progress/.test(content)) return 'processing';
    if (/initiated|confirmed|submitted|started/.test(content)) return 'initiated';
    if (/ready to pay|created|imported|available|open/.test(content)) return 'created';
    return '';
}

function getExistingActivityItems(payment) {
    var details = payment && payment.details;
    var raw = details && Array.isArray(details.activityLog) ? details.activityLog : [];
    return raw
        .map(function (item) {
            var normalized = Object.assign({}, item || {});
            normalized.kind = inferActivityKind(normalized);
            normalized.timestamp = normalizeActivityTimestamp(firstNonEmptyValue(
                normalized.date,
                normalized.timestamp,
                normalized.at,
                normalized.createdAt
            ));
            return normalized;
        })
        .filter(function (item) { return !!item.kind; });
}

function findActivityItemByKind(items, kind) {
    for (var i = 0; i < items.length; i += 1) {
        if (items[i] && items[i].kind === kind) return items[i];
    }
    return null;
}

function buildDerivedActivityItem(kind, timestamp, payment, existingItem) {
    var details = payment && payment.details ? payment.details : {};
    var failureReason = firstNonEmptyValue(
        payment && payment.exceptionReason,
        details && details.exceptionReason,
        details && details.error,
        details && details.errorMessage,
        details && details.failureReason
    );

    var titles = {
        created: 'Payment created',
        initiated: 'Payment initiated',
        processing: 'Processing payment',
        completed: 'Payment completed',
        failed: 'Payment failed'
    };

    var descriptions = {
        created: 'Payment was created and is awaiting processing.',
        initiated: 'Payment has been initiated.',
        processing: 'Payment is currently in progress.',
        completed: 'Payment completed successfully.',
        failed: failureReason ? ('Payment failed: ' + failureReason + '.') : 'Payment failed before completion.'
    };

    var typeMap = {
        created: 'event',
        initiated: 'event',
        processing: 'processing',
        completed: 'completed',
        failed: 'failed'
    };

    return {
        kind: kind,
        type: typeMap[kind] || 'event',
        label: titles[kind],
        title: titles[kind],
        description: descriptions[kind],
        date: timestamp || '',
        timestamp: timestamp || '',
        dateLabel: formatActivityLogDate(timestamp || '')
    };
}

function getActivityLog(payment) {
    var details = payment && payment.details ? payment.details : {};
    var payPageState = details && details.payPageState ? details.payPageState : {};
    var existingItems = getExistingActivityItems(payment);
    var status = String(payment && payment.status || '').trim().toLowerCase();
    var statusType = String(payment && payment.statusType || '').trim().toLowerCase();
    var existingInitiatedItem = findActivityItemByKind(existingItems, 'initiated');
    var existingProcessingItem = findActivityItemByKind(existingItems, 'processing');
    var existingCompletedItem = findActivityItemByKind(existingItems, 'completed');
    var existingFailedItem = findActivityItemByKind(existingItems, 'failed');
    var existingCreatedItem = findActivityItemByKind(existingItems, 'created');
    var rawCompletedAt = normalizeActivityTimestamp(firstNonEmptyValue(
        payment && payment.completedAt,
        details && details.completedAt,
        payment && payment.paidAt,
        payment && payment.settledAt
    ));
    var rawFailedAt = normalizeActivityTimestamp(firstNonEmptyValue(
        payment && payment.failedAt,
        details && details.failedAt,
        payment && payment.errorAt,
        details && details.errorAt
    ));
    var isPaidState = status === 'paid';
    var isFailedState = status === 'exception';
    var isActiveState = status === 'in_progress' || status === 'scheduled' || (status === 'in_progress' && statusType === 'scheduled');
    var isOpenState = status === 'ready_to_pay' || status === 'pending';

    var hasCompletion = !!firstNonEmptyValue(
        isPaidState ? 'paid' : '',
        !isActiveState && !isOpenState && !isFailedState ? rawCompletedAt : '',
        !isActiveState && !isOpenState && !isFailedState ? existingCompletedItem : null
    );
    var hasFailure = !!firstNonEmptyValue(
        isFailedState ? 'failed' : '',
        !isActiveState && !isOpenState && !isPaidState ? rawFailedAt : '',
        payment && payment.exceptionReason,
        details && details.exceptionReason,
        details && details.error,
        details && details.errorMessage,
        details && details.failureReason,
        !isActiveState && !isOpenState && !isPaidState ? existingFailedItem : null
    );
    var hasExplicitProcessing = !!firstNonEmptyValue(
        payment && payment.processingStep,
        details && details.processingStep,
        existingProcessingItem
    );
    var hasMethodSelectionEvidence = !!firstNonEmptyValue(
        payPageState && payPageState.methodId,
        details && details.paymentMethodId,
        details && details.cardId,
        details && details.accountId,
        details && details.bankAccountId
    );
    var hasLifecycleAfterInitiation = hasExplicitProcessing || hasCompletion || hasFailure;

    var createdAt = normalizeActivityTimestamp(firstNonEmptyValue(
        payment && payment.createdAt,
        details && details.createdAt,
        payment && payment.importedAt,
        details && details.importedAt,
        payment && payment.adDate,
        payment && payment.createdDate,
        payment && payment.invoiceDate,
        existingCreatedItem && existingCreatedItem.timestamp
    ));
    var initiatedAt = normalizeActivityTimestamp(firstNonEmptyValue(
        payment && payment.initiatedAt,
        details && details.initiatedAt,
        payPageState && payPageState.confirmedAt,
        payment && payment.dateInitiated,
        (hasLifecycleAfterInitiation || hasMethodSelectionEvidence) ? (payment && payment.adDate) : '',
        existingInitiatedItem && existingInitiatedItem.timestamp
    ));
    var hasInitiation = !!(initiatedAt || hasMethodSelectionEvidence || hasLifecycleAfterInitiation);
    var hasProcessing = !!(hasExplicitProcessing || ((hasCompletion || hasFailure) && hasInitiation));
    var processingAt = normalizeActivityTimestamp(firstNonEmptyValue(
        details && details.processingAt,
        existingProcessingItem && existingProcessingItem.timestamp,
        hasProcessing ? initiatedAt : ''
    ));
    var completedAt = normalizeActivityTimestamp(firstNonEmptyValue(
        rawCompletedAt,
        existingCompletedItem && existingCompletedItem.timestamp,
        processingAt,
        initiatedAt
    ));
    var failedAt = normalizeActivityTimestamp(firstNonEmptyValue(
        rawFailedAt,
        existingFailedItem && existingFailedItem.timestamp,
        processingAt,
        initiatedAt,
        hasFailure ? initiatedAt : ''
    ));
    if (!createdAt) {
        createdAt = normalizeActivityTimestamp(firstNonEmptyValue(initiatedAt, processingAt, completedAt, failedAt));
    }

    var candidates = [];
    candidates.push(buildDerivedActivityItem('created', createdAt, payment, existingCreatedItem));
    if (hasInitiation) {
        candidates.push(buildDerivedActivityItem('initiated', initiatedAt, payment, existingInitiatedItem));
    }
    if (hasProcessing) {
        candidates.push(buildDerivedActivityItem('processing', processingAt, payment, existingProcessingItem));
    }
    if (hasCompletion) {
        candidates.push(buildDerivedActivityItem('completed', completedAt, payment, existingCompletedItem));
    } else if (hasFailure) {
        candidates.push(buildDerivedActivityItem('failed', failedAt, payment, existingFailedItem));
    }

    var order = {
        created: 0,
        initiated: 1,
        processing: 2,
        completed: 3,
        failed: 4
    };

    return candidates
        .filter(function (item) { return !!item; })
        .sort(function (a, b) {
            if (a.timestamp && b.timestamp && a.timestamp !== b.timestamp) {
                return a.timestamp > b.timestamp ? -1 : 1;
            }
            var aOrder = Object.prototype.hasOwnProperty.call(order, a.kind) ? order[a.kind] : 99;
            var bOrder = Object.prototype.hasOwnProperty.call(order, b.kind) ? order[b.kind] : 99;
            return bOrder - aOrder;
        });
}

window.getActivityLog = getActivityLog;

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

/* ===== Filled Field Typography ===== */

function ensureFilledFieldTypographyStyles() {
    if (document.getElementById('sx-filled-field-style')) return;
    var style = document.createElement('style');
    style.id = 'sx-filled-field-style';
    style.textContent =
        ':is(input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="reset"]),textarea,select).sx-field-filled{font-weight:500;}' +
        ':is(input,textarea)::placeholder{font-weight:400;}' +
        'el-select.sx-field-filled el-selectedcontent,el-select.sx-field-filled el-selectedcontent *{font-weight:500;}' +
        'el-select:not(.sx-field-filled) el-selectedcontent{font-weight:400;}';
    document.head.appendChild(style);
}

function isFieldElement(node) {
    if (!node || !node.tagName) return false;
    var tag = node.tagName.toUpperCase();
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

function shouldTrackInputField(el) {
    if (!el || !el.tagName) return false;
    if (el.tagName.toUpperCase() !== 'INPUT') return true;
    var type = String(el.type || '').toLowerCase();
    return !/^(checkbox|radio|button|submit|reset|file|range|color|image|hidden)$/.test(type);
}

function updateNativeFieldFilledState(el) {
    if (!isFieldElement(el) || !shouldTrackInputField(el)) return;
    var filled = false;
    var tag = el.tagName.toUpperCase();
    if (tag === 'SELECT') {
        if (el.multiple) {
            filled = Array.prototype.some.call(el.options || [], function (opt) { return opt.selected; });
        } else {
            filled = String(el.value || '').trim() !== '';
        }
    } else {
        filled = String(el.value || '').trim() !== '';
    }
    el.classList.toggle('sx-field-filled', filled);
}

function updateElSelectFilledState(selectEl) {
    if (!selectEl || !selectEl.tagName || selectEl.tagName.toUpperCase() !== 'EL-SELECT') return;
    var selectedOption = selectEl.querySelector('el-option[aria-selected="true"]');
    var selectedContent = selectEl.querySelector('el-selectedcontent');
    var hasPlaceholder = !!(selectedContent && selectedContent.querySelector('.text-gray-400, .dark\\:text-gray-500'));
    var hasText = !!(selectedContent && String(selectedContent.textContent || '').trim());
    var filled = !!selectedOption || (!hasPlaceholder && hasText);
    selectEl.classList.toggle('sx-field-filled', filled);
}

function initFilledFieldTypography() {
    ensureFilledFieldTypographyStyles();

    function syncAll() {
        document.querySelectorAll('input,textarea,select').forEach(updateNativeFieldFilledState);
        document.querySelectorAll('el-select').forEach(updateElSelectFilledState);
    }

    syncAll();

    document.addEventListener('input', function (e) {
        var target = e.target;
        if (isFieldElement(target)) updateNativeFieldFilledState(target);
    }, true);

    document.addEventListener('change', function (e) {
        var target = e.target;
        if (isFieldElement(target)) updateNativeFieldFilledState(target);
        var host = target && target.closest ? target.closest('el-select') : null;
        if (host) {
            requestAnimationFrame(function () { updateElSelectFilledState(host); });
        }
    }, true);

    document.addEventListener('click', function (e) {
        var host = e.target && e.target.closest ? e.target.closest('el-select') : null;
        if (host) {
            requestAnimationFrame(function () { updateElSelectFilledState(host); });
        }
    }, true);

    if (document.body) {
        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.type === 'attributes') {
                    if (isFieldElement(mutation.target)) updateNativeFieldFilledState(mutation.target);
                    var attrHost = mutation.target.closest ? mutation.target.closest('el-select') : null;
                    if (attrHost) updateElSelectFilledState(attrHost);
                    return;
                }

                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function (node) {
                        if (!node || node.nodeType !== 1) return;
                        if (isFieldElement(node)) updateNativeFieldFilledState(node);
                        if (node.querySelectorAll) {
                            node.querySelectorAll('input,textarea,select').forEach(updateNativeFieldFilledState);
                        }
                        if (node.tagName && node.tagName.toUpperCase() === 'EL-SELECT') updateElSelectFilledState(node);
                        if (node.querySelectorAll) {
                            node.querySelectorAll('el-select').forEach(updateElSelectFilledState);
                        }
                    });
                    var targetHost = mutation.target && mutation.target.closest ? mutation.target.closest('el-select') : null;
                    if (targetHost) updateElSelectFilledState(targetHost);
                }
            });
        });
        observer.observe(document.body, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ['value', 'aria-selected']
        });
    }
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

/* ===== Dev Auto Reload ===== */

function initDevAutoReload() {
    var hostname = window.location.hostname || '';
    var isLocalhost = hostname === '127.0.0.1' || hostname === 'localhost';
    if (!isLocalhost) return;
    if (window.__STATIC_DEV_AUTO_RELOAD_INITIALIZED__) return;
    window.__STATIC_DEV_AUTO_RELOAD_INITIALIZED__ = true;

    var assetUrls = [];
    var seen = Object.create(null);

    function pushUrl(rawUrl) {
        if (!rawUrl) return;
        try {
            var parsed = new URL(rawUrl, window.location.href);
            if (parsed.origin !== window.location.origin) return;
            if (seen[parsed.href]) return;
            seen[parsed.href] = true;
            assetUrls.push(parsed.href);
        } catch (error) {}
    }

    pushUrl(window.location.href);
    document.querySelectorAll('script[src], link[rel="stylesheet"][href]').forEach(function (node) {
        pushUrl(node.src || node.href);
    });

    var signatures = new Map();
    var isReloading = false;

    function buildSignature(response) {
        return [
            response.headers.get('etag') || '',
            response.headers.get('last-modified') || '',
            response.headers.get('content-length') || ''
        ].join('|');
    }

    function reloadPage() {
        if (isReloading) return;
        isReloading = true;
        window.location.reload();
    }

    function checkAsset(url) {
        return fetch(url, {
            method: 'HEAD',
            cache: 'no-store'
        }).then(function (response) {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            var nextSignature = buildSignature(response);
            if (!nextSignature || nextSignature === '||') return;

            if (!signatures.has(url)) {
                signatures.set(url, nextSignature);
                return;
            }

            if (signatures.get(url) !== nextSignature) {
                reloadPage();
            }
        }).catch(function () {});
    }

    assetUrls.forEach(function (url) {
        checkAsset(url);
    });

    window.setInterval(function () {
        if (document.visibilityState === 'hidden' || isReloading) return;
        assetUrls.forEach(function (url) {
            checkAsset(url);
        });
    }, 1200);
}

/* ===== Init ===== */

initThemeToggle();
initBreadcrumbs();
initCopyToClipboard();
initMaskedCopySync();
initCountryFlag();
initFilledFieldTypography();
initDialogDismissGuard();
initMobileOverlayScrollLock();
initDevAutoReload();

/**
 * @file topbar-component.js
 * @description <app-topbar> web component for dashboard top header bar.
 * Uses a Catalyst-style action header adapted for the static dashboard shell.
 */

(function () {
    var TOPBAR_BREADCRUMB_CONFIGS = {
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

    function pageTitleFromPath(overridePath) {
        var file = overridePath || (window.location.pathname || '').split('/').pop() || '';
        var map = {
            'smart-exchange.html': 'SMART Exchange',
            'bills-and-payables.html': 'Bills and Payables',
            'payables-pay.html': 'Pay Page',
            'vendors.html': 'Vendors',
            'vendor-profile.html': 'Vendor Profile',
            'payment-preferences.html': 'Payment Preferences',
            'my-company-profile.html': 'My Company Profile'
        };
        return map[file] || 'Dashboard';
    }

    function pagePathFromContext() {
        return this && this.getAttribute
            ? (this.getAttribute('data-page') || (document.body && document.body.getAttribute('data-page')) || ((window.location.pathname || '').split('/').pop() || ''))
            : ((document.body && document.body.getAttribute('data-page')) || ((window.location.pathname || '').split('/').pop() || ''));
    }

    function buildInitials(name) {
        var tokens = String(name || '')
            .trim()
            .split(/\s+/)
            .filter(Boolean);
        if (!tokens.length) return 'JA';
        return tokens.slice(0, 2).map(function (part) { return part.charAt(0).toUpperCase(); }).join('');
    }

    function resolveBreadcrumbHref(href) {
        if (!href) return href;
        var routerMode = document.body && document.body.getAttribute('data-router');
        var routeMap = {
            'smart-exchange.html': '#/smart-exchange',
            'bills-and-payables.html': '#/payables',
            'payables-pay.html': '#/payables',
            'vendors.html': '#/vendors',
            'vendor-profile.html': '#/vendors',
            'payment-preferences.html': '#/payment-preferences',
            'my-company-profile.html': '#/smart-exchange'
        };
        if (routerMode === 'hash' && routeMap[href]) return routeMap[href];
        return href;
    }

    function buildBreadcrumbHtml(pagePath) {
        var items = TOPBAR_BREADCRUMB_CONFIGS[pagePath] || [];
        if (!items.length) {
            return '<span class="text-sm font-medium text-gray-500 dark:text-gray-400">Dashboard</span>';
        }

        var html = '' +
            '<ol role="list" class="flex items-center space-x-4">' +
            '<li>' +
            '<div>' +
            '<a href="' + resolveBreadcrumbHref('smart-exchange.html') + '" class="text-gray-400 transition-colors hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-300">' +
            '<svg viewBox="0 0 20 20" fill="currentColor" data-slot="icon" aria-hidden="true" class="size-5 shrink-0">' +
            '<path fill-rule="evenodd" d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z" clip-rule="evenodd" />' +
            '</svg>' +
            '<span class="sr-only">Home</span>' +
            '</a>' +
            '</div>' +
            '</li>';

        items.forEach(function (item, index) {
            var isLast = index === items.length - 1;
            html += '' +
                '<li>' +
                '<div class="flex items-center">' +
                '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 shrink-0 text-gray-300 dark:text-gray-600">' +
                '<path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />' +
                '</svg>';
            if (item.href && !isLast) {
                html += '<a href="' + resolveBreadcrumbHref(item.href) + '" class="ml-4 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">' + item.label + '</a>';
            } else {
                html += '<a href="#" aria-current="page" class="ml-4 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100">' + item.label + '</a>';
            }
            html += '</div></li>';
        });

        html += '</ol>';
        return html;
    }

    function iconSearch(cls) {
        return '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="' + cls + '">' +
            '<path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clip-rule="evenodd" />' +
            '</svg>';
    }

    function iconBell(cls) {
        return '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="' + cls + '">' +
            '<path fill-rule="evenodd" d="M10 2a6 6 0 0 0-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 0 0 .515 1.076 32.91 32.91 0 0 0 3.256.508 3.5 3.5 0 0 0 6.972 0 32.903 32.903 0 0 0 3.256-.508.75.75 0 0 0 .515-1.076A11.448 11.448 0 0 1 16 8a6 6 0 0 0-6-6ZM8.05 14.943a33.54 33.54 0 0 0 3.9 0 2 2 0 0 1-3.9 0Z" clip-rule="evenodd" />' +
            '</svg>';
    }

    function iconSun(cls) {
        return '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="' + cls + '">' +
            '<path d="M10 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 2ZM10 15a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 15ZM10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM15.657 5.404a.75.75 0 1 0-1.06-1.06l-1.061 1.06a.75.75 0 0 0 1.06 1.06l1.06-1.06ZM6.464 14.596a.75.75 0 1 0-1.06-1.06l-1.06 1.06a.75.75 0 0 0 1.06 1.06l1.06-1.06ZM18 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 18 10ZM5 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 5 10ZM14.596 15.657a.75.75 0 0 0 1.06-1.06l-1.06-1.061a.75.75 0 1 0-1.06 1.06l1.06 1.06ZM5.404 6.464a.75.75 0 0 0 1.06-1.06l-1.06-1.06a.75.75 0 1 0-1.061 1.06l1.06 1.06Z" />' +
            '</svg>';
    }

    function iconMoon(cls) {
        return '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="' + cls + '">' +
            '<path fill-rule="evenodd" d="M7.455 2.004a.75.75 0 0 1 .26.77 7 7 0 0 0 9.958 7.967.75.75 0 0 1 1.067.853A8.5 8.5 0 1 1 6.647 1.921a.75.75 0 0 1 .808.083Z" clip-rule="evenodd" />' +
            '</svg>';
    }

    function iconBuilding(cls) {
        return '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="' + cls + '">' +
            '<path fill-rule="evenodd" d="M1 2.75A.75.75 0 0 1 1.75 2h10.5a.75.75 0 0 1 0 1.5H12v13.75a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1-.75-.75v-2.5a.75.75 0 0 0-.75-.75h-2.5a.75.75 0 0 0-.75.75v2.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5H2v-13h-.25A.75.75 0 0 1 1 2.75ZM4 5.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1ZM4.5 9a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1ZM8 5.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1ZM8.5 9a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1ZM14.25 6a.75.75 0 0 0-.75.75V17a1 1 0 0 0 1 1h3.75a.75.75 0 0 0 0-1.5H18v-9h.25a.75.75 0 0 0 0-1.5h-4Zm.5 3.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1Zm.5 3.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1Z" clip-rule="evenodd" />' +
            '</svg>';
    }

    function iconChevronDown(cls) {
        return '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="' + cls + '">' +
            '<path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />' +
            '</svg>';
    }

    function iconUser(cls) {
        return '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="' + cls + '">' +
            '<path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />' +
            '</svg>';
    }

    function iconCog(cls) {
        return '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="' + cls + '">' +
            '<path fill-rule="evenodd" d="M8.34 1.804A1 1 0 0 1 9.32 1h1.36a1 1 0 0 1 .98.804l.295 1.473c.497.144.971.342 1.416.587l1.25-.834a1 1 0 0 1 1.262.125l.962.962a1 1 0 0 1 .125 1.262l-.834 1.25c.245.445.443.919.587 1.416l1.473.294a1 1 0 0 1 .804.98v1.361a1 1 0 0 1-.804.98l-1.473.295a6.95 6.95 0 0 1-.587 1.416l.834 1.25a1 1 0 0 1-.125 1.262l-.962.962a1 1 0 0 1-1.262.125l-1.25-.834a6.953 6.953 0 0 1-1.416.587l-.294 1.473a1 1 0 0 1-.98.804H9.32a1 1 0 0 1-.98-.804l-.295-1.473a6.957 6.957 0 0 1-1.416-.587l-1.25.834a1 1 0 0 1-1.262-.125l-.962-.962a1 1 0 0 1-.125-1.262l.834-1.25a6.957 6.957 0 0 1-.587-1.416l-1.473-.294A1 1 0 0 1 1 10.68V9.32a1 1 0 0 1 .804-.98l1.473-.295c.144-.497.342-.971.587-1.416l-.834-1.25a1 1 0 0 1 .125-1.262l.962-.962A1 1 0 0 1 5.38 3.03l1.25.834a6.957 6.957 0 0 1 1.416-.587l.294-1.473ZM13 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" clip-rule="evenodd" />' +
            '</svg>';
    }

    function iconShield(cls) {
        return '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="' + cls + '">' +
            '<path fill-rule="evenodd" d="M9.661 2.237a.531.531 0 0 1 .678 0 11.947 11.947 0 0 0 7.078 2.749.5.5 0 0 1 .479.425c.069.52.104 1.05.104 1.59 0 5.162-3.26 9.563-7.834 11.256a.48.48 0 0 1-.332 0C5.26 16.564 2 12.163 2 7c0-.538.035-1.069.104-1.589a.5.5 0 0 1 .48-.425 11.947 11.947 0 0 0 7.077-2.75Zm4.196 5.954a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" />' +
            '</svg>';
    }

    function iconLightBulb(cls) {
        return '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="' + cls + '">' +
            '<path d="M10 1a6 6 0 0 0-3.815 10.631C7.237 12.5 8 13.443 8 14.456v.644a.75.75 0 0 0 .572.729 6.016 6.016 0 0 0 2.856 0A.75.75 0 0 0 12 15.1v-.644c0-1.013.762-1.957 1.815-2.825A6 6 0 0 0 10 1ZM8.863 17.414a.75.75 0 0 0-.226 1.483 9.066 9.066 0 0 0 2.726 0 .75.75 0 0 0-.226-1.483 7.553 7.553 0 0 1-2.274 0Z" />' +
            '</svg>';
    }

    function iconArrowRightOnRectangle(cls) {
        return '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="' + cls + '">' +
            '<path fill-rule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clip-rule="evenodd" />' +
            '<path fill-rule="evenodd" d="M6 10a.75.75 0 0 1 .75-.75h9.546l-1.048-.943a.75.75 0 1 1 1.004-1.114l2.5 2.25a.75.75 0 0 1 0 1.114l-2.5 2.25a.75.75 0 1 1-1.004-1.114l1.048-.943H6.75A.75.75 0 0 1 6 10Z" clip-rule="evenodd" />' +
            '</svg>';
    }

    function catalystMenuLink(href, iconHtml, label) {
        return '' +
            '<a href="' + href + '" class="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-950/5 focus:bg-blue-500 focus:text-white focus:outline-hidden dark:text-white dark:hover:bg-white/5 dark:focus:bg-blue-500">' +
            iconHtml +
            '<span>' + label + '</span>' +
            '</a>';
    }

    function catalystDivider() {
        return '<div class="mx-3 my-1 h-px bg-zinc-950/5 dark:bg-white/10"></div>';
    }

    function accountMenuHtml() {
        return '' +
            '<div class="px-3 py-2">' +
            '  <p data-topbar-profile-name class="text-sm/5 font-medium text-zinc-950 dark:text-white">Johnny Anderson</p>' +
            '  <p data-topbar-profile-email class="mt-0.5 text-xs/5 text-zinc-500 dark:text-zinc-400">j.anderson@mail.com</p>' +
            '</div>' +
            catalystDivider() +
            catalystMenuLink('my-company-profile.html', iconUser('size-4 shrink-0 text-zinc-500 group-focus:text-white dark:text-zinc-400'), 'My Company Profile') +
            catalystMenuLink('payment-preferences.html', iconCog('size-4 shrink-0 text-zinc-500 group-focus:text-white dark:text-zinc-400'), 'Payment Preferences') +
            catalystDivider() +
            catalystMenuLink('#', iconShield('size-4 shrink-0 text-zinc-500 group-focus:text-white dark:text-zinc-400'), 'Privacy Policy') +
            catalystMenuLink('#', iconLightBulb('size-4 shrink-0 text-zinc-500 group-focus:text-white dark:text-zinc-400'), 'Share Feedback') +
            catalystDivider() +
            catalystMenuLink('#', iconArrowRightOnRectangle('size-4 shrink-0 text-zinc-500 group-focus:text-white dark:text-zinc-400'), 'Sign out');
    }

    function organizationMenuHtml() {
        return '' +
            catalystMenuLink('my-company-profile.html', iconBuilding('size-4 shrink-0 text-zinc-500 group-focus:text-white dark:text-zinc-400'), 'My Company Profile') +
            catalystMenuLink('payment-preferences.html', iconCog('size-4 shrink-0 text-zinc-500 group-focus:text-white dark:text-zinc-400'), 'Payment Preferences') +
            catalystDivider() +
            '<div class="px-3 py-2 text-xs/5 font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Organizations</div>' +
            catalystMenuLink('#', iconBuilding('size-4 shrink-0 text-zinc-500 group-focus:text-white dark:text-zinc-400'), '<span data-topbar-org-primary>ABC Corporation Ltd.</span>') +
            '<div data-topbar-org-secondary-wrap>' +
            catalystMenuLink('#', iconBuilding('size-4 shrink-0 text-zinc-500 group-focus:text-white dark:text-zinc-400'), '<span data-topbar-org-secondary>Lorem Business</span>') +
            '</div>';
    }

    function actionsButton(label, iconHtml, extraAttrs) {
        return '' +
            '<button type="button" ' + (extraAttrs || '') + ' class="inline-flex items-center justify-center rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-950/5 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white cursor-pointer">' +
            '<span class="sr-only">' + label + '</span>' +
            iconHtml +
            '</button>';
    }

    function headerMenuClass(widthClass) {
        return (widthClass || 'w-64') +
            ' origin-top-right rounded-xl bg-white/85 p-1 shadow-lg ring-1 ring-zinc-950/10 outline outline-transparent backdrop-blur-xl transition transition-discrete [--anchor-gap:--spacing(2)] data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-200 data-enter:ease-out data-leave:duration-150 data-leave:ease-in dark:bg-gray-800/85 dark:ring-white/10';
    }

    class AppTopbar extends HTMLElement {
        connectedCallback() {
            this.style.display = 'block';
            this.style.width = '100%';
            this.style.position = 'sticky';
            this.style.top = 'var(--stp-alert-height,0px)';
            this.style.zIndex = '40';
            var pagePath = pagePathFromContext.call(this);
            var title = this.getAttribute('data-title') || pageTitleFromPath(pagePath);
            this.innerHTML = this.render(title, pagePath);
            this._renderAlerts();
            this.bindStp();
            this.bindProfileData();
        }

        _ensureAlertHost() {
            var existing = document.getElementById('stp-alert-host');
            if (existing) return existing;
            var host = document.createElement('div');
            host.id = 'stp-alert-host';
            host.className = 'fixed inset-x-0 top-0 z-[60]';
            document.body.insertBefore(host, document.body.firstChild);
            return host;
        }

        _renderAlerts() {
            var host = this._ensureAlertHost();
            if (host.dataset.rendered) return;
            host.dataset.rendered = 'true';
            var cardIcon = '' +
                '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">' +
                '<path d="M1.875 6.875H18.125M1.875 7.5H18.125M4.375 11.875H9.375M4.375 13.75H6.875M18.125 9.16667V5.625C18.125 4.58947 17.2855 3.75 16.25 3.75H3.75C2.71447 3.75 1.875 4.58947 1.875 5.625V14.375C1.875 15.4105 2.71447 16.25 3.75 16.25H11.6667M16.25 16.4583L16.5785 15.4727C16.7652 14.9128 17.2045 14.4735 17.7644 14.2869L18.75 13.9583L17.7644 13.6298C17.2045 13.4432 16.7652 13.0038 16.5785 12.4439L16.25 11.4583L15.9215 12.4439C15.7348 13.0038 15.2955 13.4432 14.7356 13.6298L13.75 13.9583L14.7356 14.2869C15.2955 14.4735 15.7348 14.9128 15.9215 15.4727L16.25 16.4583Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
                '</svg>';
            host.innerHTML = '' +
                '<div data-global-stp-alert-blue class="hidden border-b border-gray-200 bg-blue-100 px-6 py-2 dark:border-white/10 dark:bg-blue-500/15">' +
                '  <div class="flex items-center justify-between gap-4">' +
                '    <div class="flex min-w-0 items-center gap-3">' +
                '      <div class="shrink-0 text-blue-600 dark:text-blue-400">' + cardIcon + '</div>' +
                '      <p class="min-w-0 truncate text-sm leading-5">' +
                '        <span class="font-semibold text-gray-900 dark:text-gray-100">Automatic Card Processing (STP) is not enabled</span>' +
                '        <span class="mx-1.5 text-gray-400">·</span>' +
                '        <span class="font-normal text-gray-600 dark:text-gray-300">Enable STP to process eligible virtual card payments automatically.</span>' +
                '      </p>' +
                '    </div>' +
                '    <div class="shrink-0">' +
                '      <button type="button" data-stp-opt-in-trigger="topbar" class="inline-flex items-center justify-center rounded-md bg-white px-2 py-1 text-sm font-semibold text-gray-700 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-white/10 dark:text-gray-200 dark:ring-white/10 dark:hover:bg-white/20 cursor-pointer">Opt in</button>' +
                '    </div>' +
                '  </div>' +
                '</div>' +
                '<div data-global-stp-alert-yellow class="hidden border-b border-gray-200 bg-amber-50 px-6 py-2 dark:border-white/10 dark:bg-amber-500/10">' +
                '  <div class="flex items-center justify-between gap-4">' +
                '    <div class="flex min-w-0 items-center gap-3">' +
                '      <div class="shrink-0 text-yellow-500">' + cardIcon + '</div>' +
                '      <p class="min-w-0 truncate text-sm leading-5">' +
                '        <span class="font-semibold text-gray-900 dark:text-gray-100">One more step till final setup</span>' +
                '        <span class="mx-1.5 text-gray-400">·</span>' +
                '        <span class="font-normal text-gray-600 dark:text-gray-300">To complete Automatic Card Processing set-up, please confirm the small deposit amount.</span>' +
                '      </p>' +
                '    </div>' +
                '    <div class="shrink-0 flex items-center gap-2">' +
                '      <button type="button" data-stp-verify-trigger="topbar" class="inline-flex items-center justify-center rounded-md bg-white px-2 py-1 text-sm font-semibold text-gray-700 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-white/10 dark:text-gray-200 dark:ring-white/10 dark:hover:bg-white/20 cursor-pointer">Verify now</button>' +
                '      <button type="button" data-stp-learn-more-trigger="topbar-yellow" class="inline-flex items-center justify-center rounded-md px-2 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-900/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-gray-200 dark:hover:bg-white/10 cursor-pointer">Learn more</button>' +
                '    </div>' +
                '  </div>' +
                '</div>';
        }

        _updateAlertSpacing() {
            var host = document.getElementById('stp-alert-host');
            if (!host) {
                document.documentElement.style.setProperty('--stp-alert-height', '0px');
                document.body.style.paddingTop = '0px';
                return;
            }
            var visible = host.querySelector('[data-global-stp-alert-blue]:not(.hidden), [data-global-stp-alert-yellow]:not(.hidden)');
            var height = visible ? host.offsetHeight : 0;
            document.documentElement.style.setProperty('--stp-alert-height', height + 'px');
            document.body.style.paddingTop = height + 'px';
        }

        disconnectedCallback() {
            if (this._stpUnsubscribe) this._stpUnsubscribe();
            if (this._profileReadyHandler) {
                document.removeEventListener('DOMContentLoaded', this._profileReadyHandler);
                this._profileReadyHandler = null;
            }
        }

        bindProfileData() {
            var self = this;
            function hydrate() {
                if (typeof window.getMyCompanyProfile !== 'function') return;
                window.getMyCompanyProfile()
                    .then(function (profile) {
                        self.applyProfileData(profile);
                    })
                    .catch(function () {});
            }

            if (typeof window.getMyCompanyProfile !== 'function' && document.readyState === 'loading') {
                this._profileReadyHandler = function () {
                    hydrate();
                    document.removeEventListener('DOMContentLoaded', self._profileReadyHandler);
                    self._profileReadyHandler = null;
                };
                document.addEventListener('DOMContentLoaded', this._profileReadyHandler);
            } else {
                hydrate();
            }
        }

        applyProfileData(profile) {
            if (!profile || typeof profile !== 'object') return;

            var organizationName = String(profile.legalName || '').trim() || 'ABC Corporation Ltd.';
            var secondaryName = profile.dbaEnabled && String(profile.dbaName || '').trim()
                ? String(profile.dbaName || '').trim()
                : '';
            var personName = profile.contact && profile.contact.name
                ? String(profile.contact.name || '').trim()
                : 'Johnny Anderson';
            var personEmail = profile.contact && profile.contact.email
                ? String(profile.contact.email || '').trim()
                : (String(profile.businessEmail || '').trim() || 'j.anderson@mail.com');
            var initials = buildInitials(personName);

            this.querySelectorAll('[data-topbar-org-name], [data-topbar-org-primary]').forEach(function (node) {
                node.textContent = organizationName;
            });
            this.querySelectorAll('[data-topbar-profile-name], [data-topbar-greeting-name]').forEach(function (node) {
                node.textContent = personName;
            });
            this.querySelectorAll('[data-topbar-profile-email]').forEach(function (node) {
                node.textContent = personEmail;
            });
            this.querySelectorAll('[data-topbar-avatar-initials]').forEach(function (node) {
                node.textContent = initials;
            });

            var secondaryWrap = this.querySelector('[data-topbar-org-secondary-wrap]');
            var secondaryText = this.querySelector('[data-topbar-org-secondary]');
            if (secondaryWrap && secondaryText) {
                if (secondaryName && secondaryName !== organizationName) {
                    secondaryText.textContent = secondaryName;
                    secondaryWrap.classList.remove('hidden');
                } else {
                    secondaryWrap.classList.add('hidden');
                }
            }
        }

        bindStp() {
            var host = document.getElementById('stp-alert-host');
            var blueAlertEl = host && host.querySelector('[data-global-stp-alert-blue]');
            var yellowAlertEl = host && host.querySelector('[data-global-stp-alert-yellow]');
            var optInButtons = host ? host.querySelectorAll('[data-stp-opt-in-trigger="topbar"]') : [];
            var verifyButtons = host ? host.querySelectorAll('[data-stp-verify-trigger="topbar"]') : [];
            var yellowLearnMoreButtons = host ? host.querySelectorAll('[data-stp-learn-more-trigger="topbar-yellow"]') : [];
            if (!blueAlertEl && !yellowAlertEl) return;

            optInButtons.forEach(function (button) {
                button.addEventListener('click', function (event) {
                    event.preventDefault();
                    if (window.STPState && typeof window.STPState.openOptInModal === 'function') {
                        window.STPState.openOptInModal();
                    }
                });
            });

            verifyButtons.forEach(function (button) {
                button.addEventListener('click', function (event) {
                    event.preventDefault();
                    if (window.STPState && typeof window.STPState.openVerifyModal === 'function') {
                        window.STPState.openVerifyModal();
                    }
                });
            });

            yellowLearnMoreButtons.forEach(function (button) {
                button.addEventListener('click', function (event) {
                    event.preventDefault();
                    if (window.STPState && typeof window.STPState.openSetupStepsModal === 'function') {
                        window.STPState.openSetupStepsModal();
                    }
                });
            });

            var self = this;
            var sync = function (status, state) {
                var stpStep = state && state.stpStep ? state.stpStep : '';
                var showYellow = status === 'in_progress' && stpStep === 'bank_verification_required';
                var showBlue = status !== 'enabled' && !showYellow;
                if (blueAlertEl) blueAlertEl.classList.toggle('hidden', !showBlue);
                if (yellowAlertEl) yellowAlertEl.classList.toggle('hidden', !showYellow);
                self._updateAlertSpacing();
            };

            if (window.STPState && typeof window.STPState.subscribe === 'function') {
                this._stpUnsubscribe = window.STPState.subscribe(sync);
            } else {
                sync('disabled', null);
            }
        }

        refresh(pagePath) {
            var nextPagePath = pagePath || pagePathFromContext.call(this);
            var nextTitle = this.getAttribute('data-title') || pageTitleFromPath(nextPagePath);
            this.setAttribute('data-page', nextPagePath);

            var breadcrumb = this.querySelector('#dynamic-breadcrumbs');
            if (breadcrumb) {
                breadcrumb.setAttribute('data-page', nextPagePath);
                breadcrumb.innerHTML = buildBreadcrumbHtml(nextPagePath);
            }

            this.querySelectorAll('[data-topbar-mobile-title]').forEach(function (node) {
                node.textContent = nextTitle;
            });
        }

        render(title, pagePath) {
            var cardIcon = '' +
                '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">' +
                '<path d="M1.875 6.875H18.125M1.875 7.5H18.125M4.375 11.875H9.375M4.375 13.75H6.875M18.125 9.16667V5.625C18.125 4.58947 17.2855 3.75 16.25 3.75H3.75C2.71447 3.75 1.875 4.58947 1.875 5.625V14.375C1.875 15.4105 2.71447 16.25 3.75 16.25H11.6667M16.25 16.4583L16.5785 15.4727C16.7652 14.9128 17.2045 14.4735 17.7644 14.2869L18.75 13.9583L17.7644 13.6298C17.2045 13.4432 16.7652 13.0038 16.5785 12.4439L16.25 11.4583L15.9215 12.4439C15.7348 13.0038 15.2955 13.4432 14.7356 13.6298L13.75 13.9583L14.7356 14.2869C15.2955 14.4735 15.7348 14.9128 15.9215 15.4727L16.25 16.4583Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
                '</svg>';

            return '' +
                '<div class="border-b border-gray-200 bg-white/95 shadow-xs backdrop-blur dark:border-white/10 dark:bg-gray-900/95 dark:shadow-none">' +

                // ── Top action row ────────────────────────────────────────────
                '  <div class="flex items-center justify-between gap-4 py-2 pl-6 pr-4">' +
                '    <div class="flex min-w-0 items-center gap-3">' +
                '      <button type="button" command="show-modal" commandfor="sidebar" class="-m-2.5 rounded-lg p-2.5 text-zinc-500 transition-colors hover:bg-zinc-950/5 hover:text-zinc-950 lg:hidden dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white cursor-pointer">' +
                '        <span class="sr-only">Open sidebar</span>' +
                '        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path d="M2 5.75A.75.75 0 0 1 2.75 5h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 5.75Zm0 4.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 4.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 14.25Z" /></svg>' +
                '      </button>' +
                '      <span data-topbar-mobile-title class="sm:hidden text-base font-semibold text-zinc-950 dark:text-white">' + title + '</span>' +
                '      <div class="relative hidden sm:flex min-w-[480px]">' +
                '        <div class="flex w-full rounded-md bg-white outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-blue-600 dark:bg-white/5 dark:outline-white/10">' +
                '          <input type="text" name="search" placeholder="Search…" data-topbar-search-trigger class="block min-w-0 grow px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:bg-transparent dark:text-white dark:placeholder:text-gray-500" />' +
                '          <div class="flex py-1.5 pr-1.5">' +
                '            <kbd class="inline-flex items-center rounded-sm border border-gray-200 px-1 font-sans text-xs text-gray-400 dark:border-white/20 dark:text-gray-500">⌘K</kbd>' +
                '          </div>' +
                '        </div>' +
                '      </div>' +
                '    </div>' +
                '    <div class="flex shrink-0 items-center gap-1 sm:gap-2">' +
                actionsButton('Notifications', iconBell('size-5'), 'data-topbar-notification-trigger') +
                actionsButton('Toggle dark mode', '' +
                    '<span data-theme-icon="light">' + iconSun('size-5') + '</span>' +
                    '<span data-theme-icon="dark" class="hidden">' + iconMoon('size-5') + '</span>', 'data-theme-toggle-button aria-pressed="false"') +
                '      <div aria-hidden="true" class="mx-1 h-6 w-px bg-gray-200 dark:bg-white/10"></div>' +
                '      <el-dropdown class="relative hidden sm:block">' +
                '        <button type="button" class="flex min-w-0 items-center gap-3 rounded-lg bg-white p-2 text-left text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-950/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 cursor-pointer">' +
                '          ' + iconBuilding('size-5 shrink-0 text-zinc-500 dark:text-zinc-400') +
                '          <span data-topbar-org-name class="max-w-56 truncate">ABC Corporation Ltd.</span>' +
                '          ' + iconChevronDown('size-4 shrink-0 text-zinc-400 dark:text-zinc-500') +
                '        </button>' +
                '        <el-menu anchor="bottom end" popover class="' + headerMenuClass('min-w-72') + '">' +
                organizationMenuHtml() +
                '        </el-menu>' +
                '      </el-dropdown>' +
                '      <el-dropdown class="relative">' +
                '        <button type="button" class="relative flex items-center rounded-lg p-1.5 transition-colors hover:bg-zinc-950/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:hover:bg-white/5 cursor-pointer">' +
                '          <span class="sr-only">Open user menu</span>' +
                '          <span class="inline-flex size-7 items-center justify-center rounded-[20%] bg-zinc-950 text-[11px] font-semibold text-white outline -outline-offset-1 outline-black/5 dark:bg-white dark:text-zinc-950 dark:outline-white/10">' +
                '            <span data-topbar-avatar-initials>JA</span>' +
                '          </span>' +
                '        </button>' +
                '        <el-menu anchor="bottom end" popover class="' + headerMenuClass('min-w-64') + '">' +
                accountMenuHtml() +
                '        </el-menu>' +
                '      </el-dropdown>' +
                '    </div>' +
                '  </div>' +

                // ── Separator + breadcrumb row ────────────────────────────────
                '  <div class="h-px bg-gray-200 dark:bg-white/10"></div>' +
                '  <div class="hidden sm:flex items-center px-6 py-2.5">' +
                '    <nav id="dynamic-breadcrumbs" aria-label="Breadcrumb" data-page="' + pagePath + '">' + buildBreadcrumbHtml(pagePath) + '</nav>' +
                '  </div>' +

                '</div>';
        }
    }

    if (!customElements.get('app-topbar')) {
        customElements.define('app-topbar', AppTopbar);
    }
})();

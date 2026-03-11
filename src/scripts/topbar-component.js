/**
 * @file topbar-component.js
 * @description <app-topbar> web component for dashboard top header bar.
 * Keeps greeting, dark mode toggle, account switcher, profile controls,
 * and dynamic breadcrumb container consistent across dashboard pages.
 */

(function () {
    function pageTitleFromPath() {
        var file = (window.location.pathname || '').split('/').pop() || '';
        var map = {
            'smart-exchange.html': 'SMART Exchange',
            'bills-and-payables.html': 'Bills and Payables',
            'payment-preferences.html': 'Payment Preferences',
            'my-company-profile.html': 'My Company Profile'
        };
        return map[file] || 'Dashboard';
    }

    class AppTopbar extends HTMLElement {
        connectedCallback() {
            var title = this.getAttribute('data-title') || pageTitleFromPath();
            this.innerHTML = this.render(title);
            this.bindStp();
        }

        disconnectedCallback() {
            if (this._stpUnsubscribe) this._stpUnsubscribe();
        }

        bindStp() {
            var blueAlertEl = this.querySelector('[data-global-stp-alert-blue]');
            var yellowAlertEl = this.querySelector('[data-global-stp-alert-yellow]');
            var optInButtons = this.querySelectorAll('[data-stp-opt-in-trigger="topbar"]');
            var verifyButtons = this.querySelectorAll('[data-stp-verify-trigger="topbar"]');
            var yellowLearnMoreButtons = this.querySelectorAll('[data-stp-learn-more-trigger="topbar-yellow"]');
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

            var sync = function (status, state) {
                var stpStep = state && state.stpStep ? state.stpStep : '';
                var showYellow = status === 'in_progress' && stpStep === 'bank_verification_required';
                var showBlue = status !== 'enabled' && !showYellow;
                if (blueAlertEl) blueAlertEl.classList.toggle('hidden', !showBlue);
                if (yellowAlertEl) yellowAlertEl.classList.toggle('hidden', !showYellow);
            };

            if (window.STPState && typeof window.STPState.subscribe === 'function') {
                this._stpUnsubscribe = window.STPState.subscribe(sync);
            } else {
                sync('disabled', null);
            }
        }

        render(title) {
            return '' +
                '<div class="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-xs dark:border-white/10 dark:bg-gray-900 dark:shadow-none">' +
                '  <div class="flex flex-col gap-4 px-4 pt-4 pb-4 sm:px-6 lg:px-6 lg:pt-6">' +
                '    <div class="flex items-center justify-between gap-x-4">' +
                '      <button type="button" command="show-modal" commandfor="sidebar" class="-m-2.5 p-2.5 text-gray-700 hover:text-gray-900 lg:hidden dark:text-gray-300 dark:hover:text-white cursor-pointer">' +
                '        <span class="sr-only">Open sidebar</span>' +
                '        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="size-6">' +
                '          <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" stroke-linecap="round" stroke-linejoin="round" />' +
                '        </svg>' +
                '      </button>' +
                '      <h1 class="flex-1 truncate text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Hello, Johnny Anderson</h1>' +
                '      <div class="flex items-center gap-3 sm:gap-4">' +
                '        <div class="hidden sm:flex items-center gap-2">' +
                '          <div class="group relative inline-flex w-11 shrink-0 rounded-full bg-gray-200 p-0.5 inset-ring inset-ring-gray-900/5 outline-offset-2 outline-blue-600 transition-colors duration-200 ease-in-out has-checked:bg-blue-600 has-focus-visible:outline-2 dark:bg-white/20">' +
                '            <span class="size-5 rounded-full bg-white shadow-xs ring-1 ring-gray-900/5 transition-transform duration-200 ease-in-out group-has-checked:translate-x-5"></span>' +
                '            <input id="theme-toggle" type="checkbox" name="theme-toggle" aria-labelledby="theme-toggle-label" class="absolute inset-0 size-full appearance-none focus:outline-hidden cursor-pointer" />' +
                '          </div>' +
                '          <label id="theme-toggle-label" for="theme-toggle" class="text-sm font-medium text-gray-700 dark:text-gray-300">Dark mode</label>' +
                '        </div>' +
                '        <button class="hidden sm:flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm sm:text-base font-semibold text-gray-800 hover:bg-gray-50 transition-colors dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/10 cursor-pointer">' +
                '          Big Kahuna Burger Ltd' +
                '          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-5 text-gray-400 dark:text-gray-500">' +
                '            <path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />' +
                '          </svg>' +
                '        </button>' +
                '        <div class="hidden sm:ml-6 sm:flex sm:items-center">' +
                '          <button type="button" class="relative rounded-full p-1 text-gray-400 hover:text-gray-500 focus:outline-2 focus:outline-offset-2 focus:outline-blue-600 dark:text-gray-400 dark:hover:text-white cursor-pointer">' +
                '            <span class="sr-only">View notifications</span>' +
                '            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="size-6">' +
                '              <path d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" stroke-linecap="round" stroke-linejoin="round" />' +
                '            </svg>' +
                '          </button>' +
                '          <el-dropdown class="relative ml-3">' +
                '            <button class="relative flex rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">' +
                '              <span class="sr-only">Open user menu</span>' +
                '              <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" class="size-8 rounded-full outline -outline-offset-1 outline-black/5 dark:outline-white/10" />' +
                '            </button>' +
                '            <el-menu anchor="bottom end" popover class="w-48 origin-top-right rounded-md bg-white py-1 shadow-lg outline outline-black/5 transition transition-discrete [--anchor-gap:--spacing(2)] data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-200 data-enter:ease-out data-leave:duration-75 data-leave:ease-in dark:bg-gray-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10">' +
                '              <a href="#" class="block px-4 py-2 text-sm text-gray-700 focus:bg-gray-100 focus:outline-hidden dark:text-gray-300 dark:focus:bg-gray-700">Your profile</a>' +
                '              <a href="#" class="block px-4 py-2 text-sm text-gray-700 focus:bg-gray-100 focus:outline-hidden dark:text-gray-300 dark:focus:bg-gray-700">Settings</a>' +
                '              <a href="#" class="block px-4 py-2 text-sm text-gray-700 focus:bg-gray-100 focus:outline-hidden dark:text-gray-300 dark:focus:bg-gray-700">Sign out</a>' +
                '            </el-menu>' +
                '          </el-dropdown>' +
                '        </div>' +
                '      </div>' +
                '    </div>' +
                '    <div data-global-stp-alert-blue class="hidden rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-500/30 dark:bg-blue-500/10">' +
                '      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">' +
                '        <div class="flex min-w-0 items-start gap-3">' +
                '          <div class="shrink-0 pt-0.5 text-blue-600 dark:text-blue-400">' +
                '            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">' +
                '              <path d="M1.875 6.875H18.125M1.875 7.5H18.125M4.375 11.875H9.375M4.375 13.75H6.875M18.125 9.16667V5.625C18.125 4.58947 17.2855 3.75 16.25 3.75H3.75C2.71447 3.75 1.875 4.58947 1.875 5.625V14.375C1.875 15.4105 2.71447 16.25 3.75 16.25H11.6667M16.25 16.4583L16.5785 15.4727C16.7652 14.9128 17.2045 14.4735 17.7644 14.2869L18.75 13.9583L17.7644 13.6298C17.2045 13.4432 16.7652 13.0038 16.5785 12.4439L16.25 11.4583L15.9215 12.4439C15.7348 13.0038 15.2955 13.4432 14.7356 13.6298L13.75 13.9583L14.7356 14.2869C15.2955 14.4735 15.7348 14.9128 15.9215 15.4727L16.25 16.4583Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
                '            </svg>' +
                '          </div>' +
                '          <div class="min-w-0">' +
                '            <p class="text-sm font-semibold leading-5 text-gray-900 dark:text-gray-100">Automatic Card Processing (STP) is not enabled</p>' +
                '            <p class="mt-1 text-sm font-normal leading-5 text-gray-600 dark:text-gray-300">Enable STP to process eligible virtual card payments automatically.</p>' +
                '          </div>' +
                '        </div>' +
                '        <div class="flex w-full items-center gap-3 sm:w-auto">' +
                '          <button type="button" data-stp-opt-in-trigger="topbar" class="inline-flex w-full items-center justify-center rounded-md bg-white px-2 py-1 text-sm font-semibold text-gray-700 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-white/10 dark:text-gray-200 dark:ring-white/10 dark:hover:bg-white/20 cursor-pointer sm:w-auto">Opt in</button>' +
                '        </div>' +
                '      </div>' +
                '    </div>' +
                '    <div data-global-stp-alert-yellow class="hidden rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-400/30 dark:bg-amber-500/10">' +
                '      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">' +
                '        <div class="flex min-w-0 items-start gap-3">' +
                '          <div class="shrink-0 pt-0.5 text-yellow-500 dark:text-yellow-500">' +
                '            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">' +
                '              <path d="M1.875 6.875H18.125M1.875 7.5H18.125M4.375 11.875H9.375M4.375 13.75H6.875M18.125 9.16667V5.625C18.125 4.58947 17.2855 3.75 16.25 3.75H3.75C2.71447 3.75 1.875 4.58947 1.875 5.625V14.375C1.875 15.4105 2.71447 16.25 3.75 16.25H11.6667M16.25 16.4583L16.5785 15.4727C16.7652 14.9128 17.2045 14.4735 17.7644 14.2869L18.75 13.9583L17.7644 13.6298C17.2045 13.4432 16.7652 13.0038 16.5785 12.4439L16.25 11.4583L15.9215 12.4439C15.7348 13.0038 15.2955 13.4432 14.7356 13.6298L13.75 13.9583L14.7356 14.2869C15.2955 14.4735 15.7348 14.9128 15.9215 15.4727L16.25 16.4583Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
                '            </svg>' +
                '          </div>' +
                '          <div class="min-w-0">' +
                '            <p class="text-sm font-semibold leading-5 text-gray-900 dark:text-gray-100">One more step till final setup</p>' +
                '            <p class="mt-1 text-sm font-normal leading-5 text-gray-600 dark:text-gray-300">To complete Automatic Card Processing set-up, please confirm the small deposit amount.</p>' +
                '          </div>' +
                '        </div>' +
                '        <div class="flex w-full items-center gap-3 sm:w-auto">' +
                '          <button type="button" data-stp-verify-trigger="topbar" class="inline-flex w-full items-center justify-center rounded-md bg-white px-2 py-1 text-sm font-semibold text-gray-700 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-white/10 dark:text-gray-200 dark:ring-white/10 dark:hover:bg-white/20 cursor-pointer sm:w-auto">Verify now</button>' +
                '          <button type="button" data-stp-learn-more-trigger="topbar-yellow" class="inline-flex w-full items-center justify-center rounded-md px-2 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-900/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-gray-200 dark:hover:bg-white/10 cursor-pointer sm:w-auto">Learn more</button>' +
                '        </div>' +
                '      </div>' +
                '    </div>' +
                '    <div class="h-px self-stretch bg-gray-200 dark:bg-white/10"></div>' +
                '    <div class="flex flex-wrap items-center">' +
                '      <nav id="dynamic-breadcrumbs" class="hidden sm:flex items-center gap-2" aria-label="Breadcrumb"></nav>' +
                '      <span class="sm:hidden text-sm font-medium text-gray-600 dark:text-gray-300">' + title + '</span>' +
                '    </div>' +
                '  </div>' +
                '</div>';
        }
    }

    if (!customElements.get('app-topbar')) {
        customElements.define('app-topbar', AppTopbar);
    }
})();

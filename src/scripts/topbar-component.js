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
            'payment-preferences.html': 'Payment Preferences',
            'my-company-profile.html': 'My Company Profile'
        };
        return map[file] || 'Dashboard';
    }

    class AppTopbar extends HTMLElement {
        connectedCallback() {
            var title = this.getAttribute('data-title') || pageTitleFromPath();
            this.innerHTML = this.render(title);
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

import { useEffect } from 'react';

export function StaticDashboardShell({ children, page, title }) {
  useEffect(() => {
    document.documentElement.classList.add('h-full', 'bg-gray-100', 'dark:bg-gray-950');
    document.body.setAttribute('data-page', page);
    document.body.setAttribute('data-router', 'hash');
    document.body.classList.add('h-full', "font-['Inter']", 'antialiased', 'dark:text-gray-100');

    async function loadShellScripts() {
      await import('../../../src/scripts/sidebar.js');
      await import('../../../src/scripts/shared.js');
      if (typeof window.initDashboardSidebar === 'function') window.initDashboardSidebar();
      if (typeof window.initThemeToggle === 'function') window.initThemeToggle();
      if (typeof window.initBreadcrumbs === 'function') window.initBreadcrumbs();
    }

    loadShellScripts();

    return () => {
      document.documentElement.classList.remove('h-full', 'bg-gray-100', 'dark:bg-gray-950');
      document.body.removeAttribute('data-page');
      document.body.removeAttribute('data-router');
      document.body.classList.remove('h-full', "font-['Inter']", 'antialiased', 'dark:text-gray-100');
    };
  }, [page]);

  return (
    <>
      <app-nav key={page} data-page={page} data-router="hash" data-expand-smart-exchange="true" />

      <div id="main-content-wrapper" className="lg:pl-[360px]">
        <app-topbar key={page} data-title={title} />
        {children}
      </div>
    </>
  );
}

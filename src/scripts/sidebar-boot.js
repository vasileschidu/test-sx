(function () {
    var root = document.documentElement;
    var collapsed = false;

    try {
        collapsed = localStorage.getItem('dashboard-sidebar-collapsed-v1') === 'true';
    } catch (error) {
        collapsed = false;
    }

    root.setAttribute('data-sidebar-collapsed', collapsed ? 'true' : 'false');
    root.classList.add('sidebar-booting');

    if (document.getElementById('dashboard-sidebar-boot-style')) return;

    var style = document.createElement('style');
    style.id = 'dashboard-sidebar-boot-style';
    style.textContent = [
        '@media (min-width: 1024px) {',
        '  html[data-sidebar-collapsed="true"] #main-content-wrapper { padding-left: 68px !important; }',
        '  html[data-sidebar-collapsed="false"] #main-content-wrapper { padding-left: 288px !important; }',
        '  html.sidebar-booting #desktop-sidebar-shell,',
        '  html.sidebar-booting #desktop-sidebar-panel,',
        '  html.sidebar-booting [data-nav="desktop"] .nav-item,',
        '  html.sidebar-booting [data-nav="desktop"] .nav-submenu,',
        '  html.sidebar-booting [data-nav="desktop"] .chevron-icon,',
        '  html.sidebar-booting #desktop-nav-current-indicator {',
        '    transition: none !important;',
        '    animation: none !important;',
        '  }',
        '  html.sidebar-booting app-nav { visibility: hidden; }',
        '}'
    ].join('\n');
    document.head.appendChild(style);
})();

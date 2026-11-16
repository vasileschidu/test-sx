(function () {
  // Theme: "system" | "light" | "dark" in localStorage.theme (avatar menu → Theme).
  // Runs in <head> so the right class is on <html> before first paint.
  // ?theme=dark|light|system (testers on pages without a menu) is applied and remembered.
  var root = document.documentElement;
  var media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function read() {
    try {
      var saved = localStorage.getItem("theme");
      if (saved === "system" || saved === "light" || saved === "dark") return saved;
    } catch (e) {}
    return null;
  }

  function apply(mode) {
    var isDark =
      mode === "dark" || (mode === "system" && !!media && media.matches);
    if (mode) root.classList.toggle("dark", isDark);
    return root.classList.contains("dark");
  }

  function set(mode) {
    try {
      localStorage.setItem("theme", mode);
    } catch (e) {}
    var isDark = apply(mode);
    window.dispatchEvent(
      new CustomEvent("app-theme-change", { detail: { isDark: isDark, mode: mode } }),
    );
  }

  try {
    var q = new URLSearchParams(location.search).get("theme");
    if (q === "dark" || q === "light" || q === "system") localStorage.setItem("theme", q);
  } catch (e) {}
  apply(read());

  // System mode follows the OS live.
  if (media) {
    var onChange = function () {
      if (read() !== "system") return;
      var isDark = apply("system");
      window.dispatchEvent(
        new CustomEvent("app-theme-change", { detail: { isDark: isDark, mode: "system" } }),
      );
    };
    if (media.addEventListener) media.addEventListener("change", onChange);
    else if (media.addListener) media.addListener(onChange);
  }

  // Dark mode for fixed-colour gray icons (icon audit, 2026-11-12). Many icons are
  // <img src="….svg"> with gray-500 baked in (or gray-600), built from ~15
  // scripts; in dark they stayed gray-500 (≈3.7:1, dim) or gray-600 (2.35:1).
  // One place for all pages: a filter that maps gray-500 → gray-400 and
  // gray-600 → ≈gray-400, and inline SVGs with those hex fills → gray-400 —
  // the Tailwind dark icon colour. Light mode is untouched.
  var GRAY500_ICONS = [
    "icons/box-package.svg",
    "icons/building-office-user.svg",
    "icons/consumer-portal/help.svg",
    "icons/consumer-portal/insights.svg",
    "icons/consumer-portal/my-cards.svg",
    "icons/consumer-portal/my-profile.svg",
    "icons/consumer-portal/payment-preferences.svg",
    "icons/consumer-portal/payments-received-inactive.svg",
    "icons/credit-card-sparkle.svg",
    "icons/dispute-x-circle.svg",
    "icons/payables.svg",
    "icons/receivables.svg",
    "figma/top-nav/selector.svg",
    "get-paid/building-library-20.svg",
    "get-paid/credit-card-sparkle-20.svg",
    "get-paid/dot-2.svg",
    "get-paid/paper-clip.svg",
    "get-paid/refresh-18.svg",
    "get-paid/signature-18.svg",
    "onboarding/dot-gray.svg",
    "onboarding/icon-arrow-right.svg",
    "onboarding/icon-chevron-down-gray.svg",
    "onboarding/icon-chevron-right-mini.svg",
    "onboarding/icon-download-gray.svg",
    "onboarding/icon-download.svg",
    "onboarding/icon-duplicate-dark.svg",
    "onboarding/icon-envelope-mini.svg",
    "onboarding/icon-info-mini.svg",
    "onboarding/icon-share.svg",
    "onboarding/icon-x-circle-mini.svg",
    "onboarding/icon-x-mark-mini.svg",
    "onboarding/mp/icon-arrow-right.svg",
    "onboarding/mp/icon-calendar-gray.svg",
    "onboarding/mp/icon-chat-alt.svg",
    "sd-uk/icon-chevron-down.svg",
    "sd-uk/logo-placeholder.svg",
    "stp-agreement/icon-agreement-20.svg",
    "table/chevron-down-20.svg",
    "table/chevron-down.svg",
    "table/chevron-right.svg",
    "table/clipboard-copy.svg",
    "table/columns.svg",
    "table/dots-vertical-18.svg",
    "table/export.svg",
    "table/page-first.svg",
    "table/page-last.svg",
    "table/page-next.svg",
    "table/page-prev.svg",
    "table/refresh.svg",
    "table/x-mark-18.svg",
    "table/x-mark-20.svg",
    "topbar/selector.svg",
    "vendor-profile/activity-menu.svg",
    "vendor-profile/contact-mail.svg",
    "vendor-profile/contact-phone.svg",
    "vendor-profile/contact-user.svg",
    "vendor-profile/pm-bank.svg",
    "vendor-profile/pm-chevron-down.svg",
    "vendor-profile/pm-chevron-right.svg",
    "vendor-profile/presentment-mail.svg",
    "vendors/chevron-down.svg",
    "vendors/menu-invite.svg",
    "vendors/menu-link.svg",
    "vendors/menu-preferences.svg",
    "vendors/menu-resend.svg",
    "vendors/page-first.svg",
    "vendors/page-last.svg",
    "vendors/page-next.svg",
    "vendors/page-prev.svg",
    "vendors/refresh.svg",
  ];
  var GRAY600_ICONS = [
    "onboarding/mp/icon-chevron-right.svg",
  ];
  function injectDarkIconStyles() {
    if (document.getElementById("dark-gray-icons")) return;
    var sel = function (list) {
      return list.map(function (k) { return '.dark img[src*="assets/' + k + '"]'; }).join(",");
    };
    var st = document.createElement("style");
    st.id = "dark-gray-icons";
    st.textContent =
      sel(GRAY500_ICONS) + "{filter:brightness(1.42) saturate(.6)}" +
      sel(GRAY600_ICONS) + "{filter:brightness(1.95) saturate(.5)}" +
      '.dark svg [fill="#6B7280" i],.dark svg[fill="#6B7280" i],.dark svg [fill="#4B5563" i]{fill:var(--color-gray-400)}' +
      '.dark svg [stroke="#6B7280" i],.dark svg[stroke="#6B7280" i],.dark svg [stroke="#4B5563" i]{stroke:var(--color-gray-400)}';
    (document.head || document.documentElement).appendChild(st);
  }
  injectDarkIconStyles();

  window.SXTheme = {
    // No saved choice yet: show the current look (light unless the page is dark).
    get: function () {
      return read() || (root.classList.contains("dark") ? "dark" : "light");
    },
    set: set,
  };
})();

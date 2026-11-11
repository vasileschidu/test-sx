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

  window.SXTheme = {
    // No saved choice yet: show the current look (light unless the page is dark).
    get: function () {
      return read() || (root.classList.contains("dark") ? "dark" : "light");
    },
    set: set,
  };
})();

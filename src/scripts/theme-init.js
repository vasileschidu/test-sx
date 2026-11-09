(function () {
  try {
    // ?theme=dark|light (testers on pages without a menu) is applied and remembered.
    var q = new URLSearchParams(location.search).get("theme");
    if (q === "dark" || q === "light") localStorage.setItem("theme", q);
    var savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") document.documentElement.classList.add("dark");
    if (savedTheme === "light")
      document.documentElement.classList.remove("dark");
  } catch (e) {}
})();

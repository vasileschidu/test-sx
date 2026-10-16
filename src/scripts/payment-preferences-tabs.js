(function () {
  var TAB_IDS = ["payment-methods", "global-preferences", "advanced-settings"];
  var DEFAULT_TAB = "payment-methods";

  function normalizeTab(value) {
    var tab = String(value || "").trim();
    return TAB_IDS.indexOf(tab) !== -1 ? tab : DEFAULT_TAB;
  }

  function getUrlTab() {
    var params = new URLSearchParams(window.location.search || "");
    return normalizeTab(params.get("tab"));
  }

  function setUrlTab(tab, replace) {
    var safeTab = normalizeTab(tab);
    var url = new URL(window.location.href);
    url.searchParams.set("tab", safeTab);
    var method = replace ? "replaceState" : "pushState";
    window.history[method]({ tab: safeTab }, "", url.toString());
  }

  function setDesktopTabState(activeTab) {
    var tabs = document.querySelectorAll(".tab-btn");
    tabs.forEach(function (tabEl) {
      var isActive = tabEl.getAttribute("data-tab") === activeTab;
      tabEl.classList.toggle("border-blue-500", isActive);
      tabEl.classList.toggle("text-blue-600", isActive);
      tabEl.classList.toggle("dark:text-blue-400", isActive);
      tabEl.classList.toggle("dark:border-blue-400", isActive);
      tabEl.classList.toggle("border-transparent", !isActive);
      tabEl.classList.toggle("text-gray-500", !isActive);
      tabEl.classList.toggle("dark:text-gray-400", !isActive);
      // Hover styles only apply to inactive tabs; every tab keeps the pointer.
      [
        "hover:border-blue-300",
        "hover:text-blue-500",
        "dark:hover:text-blue-400",
        "dark:hover:border-blue-500",
      ].forEach(function (cls) {
        tabEl.classList.toggle(cls, !isActive);
      });
      tabEl.classList.add("cursor-pointer");
      if (isActive) {
        tabEl.setAttribute("aria-current", "page");
      } else {
        tabEl.removeAttribute("aria-current");
      }
    });
  }

  function setPanelState(activeTab) {
    document.querySelectorAll(".tab-panel").forEach(function (panelEl) {
      panelEl.classList.toggle("hidden", panelEl.id !== "tab-" + activeTab);
    });
  }

  function setMobileTabState(activeTab) {
    var mobileSelect = document.getElementById("pp-tab-select");
    if (!mobileSelect) return;
    mobileSelect.value = activeTab;
  }

  function applyTab(activeTab) {
    var safeTab = normalizeTab(activeTab);
    setDesktopTabState(safeTab);
    setPanelState(safeTab);
    setMobileTabState(safeTab);
    document.dispatchEvent(
      new CustomEvent("pp:tabchange", { detail: { tab: safeTab } }),
    );
  }

  function init() {
    var tabs = document.querySelectorAll(".tab-btn");
    if (!tabs.length) return;

    tabs.forEach(function (tabEl) {
      tabEl.addEventListener("click", function () {
        var nextTab = normalizeTab(tabEl.getAttribute("data-tab"));
        applyTab(nextTab);
        setUrlTab(nextTab, false);
      });
    });

    document.addEventListener("click", function (event) {
      var link = event.target.closest("[data-tab-link]");
      if (!link) return;
      event.preventDefault();
      var nextTab = normalizeTab(link.getAttribute("data-tab-link"));
      applyTab(nextTab);
      setUrlTab(nextTab, false);
      window.scrollTo(0, 0);
    });

    var mobileSelect = document.getElementById("pp-tab-select");
    if (mobileSelect) {
      mobileSelect.addEventListener("change", function () {
        var nextTab = normalizeTab(mobileSelect.value);
        applyTab(nextTab);
        setUrlTab(nextTab, false);
      });
    }

    window.addEventListener("popstate", function () {
      applyTab(getUrlTab());
    });

    var initialTab = getUrlTab();
    applyTab(initialTab);
    setUrlTab(initialTab, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

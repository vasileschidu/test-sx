/**
 * app-switch.js
 * The loading state for changing business/view.
 *
 * Switching view is a profile-and-instance change, not a filter — it should
 * feel like the shell reloading, not items popping around. So the sidebar is
 * replaced by a fixed skeleton and the content area is veiled for 2-3s, then
 * the new navigation renders in one go.
 *
 * The skeleton deliberately shows a FIXED number of rows: the new view may have
 * six items or twelve, and the placeholder should not pretend to know which.
 */
window.AppSwitch = (function () {
  "use strict";

  var MIN_MS = 2000;
  var MAX_MS = 3000;
  var SKELETON_ROWS = 7;
  var STYLE_ID = "app-switch-styles";

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      ":root{--app-skel-bg:#e8eaed;--app-skel-strong:#d6dae1;}",
      ".dark{--app-skel-bg:rgba(255,255,255,.10);--app-skel-strong:rgba(255,255,255,.18);}",
      ".app-skel-nav{display:flex;flex-direction:column;gap:.75rem;padding:.25rem 0;}",
      ".app-skel-row{display:flex;align-items:center;gap:.75rem;padding:.375rem .5rem;}",
      ".app-skel-row>i{display:block;width:1.25rem;height:1.25rem;flex:none;border-radius:.375rem;background:var(--app-skel-strong);}",
      ".app-skel-row>span{display:block;height:.75rem;border-radius:.375rem;background:var(--app-skel-bg);}",
      // Pulse the placeholder bars, never the veil itself — animating the
      // veil's opacity lets the old content show through at the dim phase.
      ".app-skel-nav,.app-switch-veil>span{animation:appSkelPulse 1.6s ease-in-out infinite;}",
      "@keyframes appSkelPulse{0%,100%{opacity:1}50%{opacity:.55}}",
      // The content area is veiled rather than emptied, so nothing reflows.
      ".app-switch-veil{position:absolute;inset:0;z-index:40;display:flex;flex-direction:column;gap:1rem;",
      "padding:1.5rem;background:var(--app-switch-veil-bg,#fff);}",
      ".dark .app-switch-veil{--app-switch-veil-bg:#111827;}",
      ".app-switch-veil>span{display:block;height:2.25rem;border-radius:.375rem;background:var(--app-skel-bg);}",
      "@media (prefers-reduced-motion: reduce){.app-skel-nav,.app-switch-veil>span{animation:none;}}",
    ].join("");
    document.head.appendChild(style);
  }

  function navSkeletonHtml() {
    var widths = ["62%", "78%", "54%", "70%", "46%", "66%", "58%"];
    var rows = "";
    for (var i = 0; i < SKELETON_ROWS; i += 1) {
      rows +=
        '<div class="app-skel-row"><i></i><span style="width:' +
        widths[i % widths.length] +
        '"></span></div>';
    }
    return '<div class="app-skel-nav" aria-hidden="true">' + rows + "</div>";
  }

  function veilMain() {
    var main =
      document.querySelector("#main-content-wrapper main") ||
      document.querySelector("main");
    if (!main) return null;
    if (window.getComputedStyle(main).position === "static") {
      main.style.position = "relative";
      main.setAttribute("data-app-switch-pos", "true");
    }
    var veil = document.createElement("div");
    veil.className = "app-switch-veil";
    veil.setAttribute("aria-hidden", "true");
    veil.innerHTML =
      '<span style="width:38%"></span><span style="width:100%"></span><span style="width:72%"></span>';
    main.appendChild(veil);
    return veil;
  }

  function clearVeil() {
    document.querySelectorAll(".app-switch-veil").forEach(function (v) {
      v.remove();
    });
    document.querySelectorAll("[data-app-switch-pos]").forEach(function (m) {
      m.style.removeProperty("position");
      m.removeAttribute("data-app-switch-pos");
    });
  }

  function paintNavSkeletons() {
    var html = navSkeletonHtml();
    document
      .querySelectorAll(
        'app-nav [data-nav="desktop"], app-nav [data-nav="mobile"]',
      )
      .forEach(function (list) {
        list.innerHTML = html;
      });
  }

  function rerenderNav() {
    document.querySelectorAll("app-nav").forEach(function (nav) {
      if (typeof nav.connectedCallback === "function") nav.connectedCallback();
    });
  }

  var busy = false;

  /**
   * @param {function} apply changes the active business; runs while hidden
   * @param {function} [after] runs once the new shell is on screen
   */
  function run(apply, after) {
    if (busy) return;
    busy = true;
    ensureStyles();
    document.documentElement.setAttribute("data-app-switching", "true");
    paintNavSkeletons();
    veilMain();

    if (typeof apply === "function") apply();

    var wait = MIN_MS + Math.random() * (MAX_MS - MIN_MS);
    window.setTimeout(function () {
      // Switching product (e.g. into the Consumer Portal) can leave the page on
      // screen outside the new view. Go to that view's home under the veil
      // instead of drawing its sidebar around another product's page.
      var redirect =
        window.AppPlans &&
        window.AppPlans.redirectForCurrentPage &&
        window.AppPlans.redirectForCurrentPage();
      if (redirect) {
        window.location.href = redirect;
        return;
      }
      rerenderNav();
      clearVeil();
      document.documentElement.removeAttribute("data-app-switching");
      busy = false;
      if (typeof after === "function") after();
    }, wait);
  }

  return {
    run: run,
    isBusy: function () {
      return busy;
    },
  };
})();

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
      ".app-skel-nav,.app-switch-veil>span,.app-skel-pulse{animation:appSkelPulse 1.6s ease-in-out infinite;}",
      "@keyframes appSkelPulse{0%,100%{opacity:1}50%{opacity:.55}}",
      // The content area is veiled rather than emptied, so nothing reflows.
      ".app-switch-veil{position:absolute;inset:0;z-index:40;display:flex;flex-direction:column;gap:1rem;",
      "padding:1.5rem;background:var(--app-switch-veil-bg,#fff);}",
      ".dark .app-switch-veil{--app-switch-veil-bg:#111827;}",
      ".app-switch-veil>span{display:block;height:2.25rem;border-radius:.375rem;background:var(--app-skel-bg);}",
      // "Switching to" modal: three dots rising in turn.
      ".app-switch-dot{animation:appSwitchDot 1s ease-in-out infinite;}",
      ".app-switch-dot:nth-child(2){animation-delay:.16s}.app-switch-dot:nth-child(3){animation-delay:.32s}",
      "@keyframes appSwitchDot{0%,80%,100%{transform:translateY(0);opacity:.35}40%{transform:translateY(-.375rem);opacity:1}}",
      "@media (prefers-reduced-motion: reduce){.app-skel-nav,.app-switch-veil>span,.app-skel-pulse,.app-switch-dot{animation:none;}}",
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

  /**
   * Whole-screen skeleton behind the "Switching to" modal (Andrian, 2026-11-11):
   * one fixed layer over the sidebar and one over the page (top bar, banner,
   * title, content), so nothing of the old business shows through.
   */
  function bar(cls, style) {
    return '<span class="block rounded-md ' + cls + '" style="background:var(--app-skel-bg);' + (style || "") + '"></span>';
  }
  function block(cls) {
    return '<span class="block shrink-0 ' + cls + '" style="background:var(--app-skel-strong)"></span>';
  }

  function sidebarSkeletonHtml(collapsed) {
    var rows = "";
    var widths = ["62%", "78%", "54%", "70%", "46%", "66%", "58%"];
    for (var i = 0; i < SKELETON_ROWS; i += 1) {
      rows +=
        '<div class="flex h-10 items-center gap-3 ' + (collapsed ? "justify-center" : "px-2") + '">' +
        block("size-6 rounded-md") +
        (collapsed ? "" : bar("h-3", "width:" + widths[i])) +
        "</div>";
    }
    return (
      '<div class="flex h-full flex-col justify-between">' +
      '<div class="flex flex-col gap-9">' +
      '<div class="flex h-8 items-center gap-2 ' + (collapsed ? "justify-center" : "px-1") + '">' +
      block("size-8 rounded-lg") + (collapsed ? "" : bar("h-4 w-24")) +
      "</div>" +
      '<div class="flex flex-col gap-1.5">' + rows + "</div>" +
      '<div class="flex flex-col gap-4 border-t pt-4" style="border-color:var(--app-skel-bg)">' +
      (collapsed ? '<div class="flex justify-center">' + block("size-6 rounded-full") + "</div>" : bar("h-3 w-36")) +
      (collapsed ? '<div class="flex justify-center">' + block("size-6 rounded-md") + "</div>" : bar("h-10 w-full rounded-lg")) +
      "</div></div>" +
      '<div class="flex flex-col items-center gap-2">' +
      (collapsed ? block("size-5 rounded-md") : bar("h-3 w-40") + bar("h-3 w-32")) +
      "</div></div>"
    );
  }

  function pageSkeletonHtml(headerBg) {
    return (
      '<div class="flex flex-col" style="background:' + headerBg + '">' +
      '<div class="flex items-center justify-between gap-4 px-4 pt-6 pb-4 lg:px-6">' +
      bar("h-8 w-72 max-w-[50%]") +
      '<div class="flex items-center gap-4">' + block("size-8 rounded-full") + bar("hidden h-10 w-56 sm:block") + block("size-10 rounded-full") + "</div>" +
      "</div>" +
      '<div class="px-4 lg:px-6">' + bar("h-16 w-full rounded-lg") + "</div>" +
      '<div class="flex items-center gap-6 px-4 py-6 lg:px-6">' + bar("h-7 w-48") + bar("h-4 w-40") + "</div>" +
      "</div>" +
      '<div class="flex flex-col gap-4 p-2 lg:p-6">' +
      '<div class="flex flex-col gap-4 rounded-lg p-4 lg:p-6" style="background:' + headerBg + '">' +
      '<div class="flex items-center justify-between gap-4">' + bar("h-6 w-48") + bar("h-10 w-64 max-w-[40%]") + "</div>" +
      bar("h-9 w-96 max-w-full") +
      bar("h-9 w-full") + bar("h-9 w-full") + bar("h-9 w-full") + bar("h-9 w-full") + bar("h-9 w-2/3") +
      "</div></div>"
    );
  }

  function veilShell() {
    var layers = [];
    var shell = document.getElementById("desktop-sidebar-shell");
    var wrapper = document.getElementById("main-content-wrapper");
    var panel = document.getElementById("desktop-sidebar-panel");
    var sideBg = panel ? getComputedStyle(panel).backgroundColor : "";
    var pageBg = getComputedStyle(document.body).backgroundColor;
    if (!pageBg || pageBg === "rgba(0, 0, 0, 0)") pageBg = getComputedStyle(document.documentElement).backgroundColor;
    var headerBg = sideBg || "#fff";

    function layer(rect, html, bg, extra) {
      var el = document.createElement("div");
      el.setAttribute("data-app-switch-skeleton", "");
      el.setAttribute("aria-hidden", "true");
      // The layer stays opaque; only its inner content pulses (see ensureStyles).
      el.className = "fixed overflow-hidden " + (extra || "");
      el.style.cssText =
        "left:" + rect.left + "px;top:" + Math.max(0, rect.top) + "px;width:" + rect.width +
        "px;bottom:0;z-index:95;background:" + bg + ";";
      el.innerHTML = '<div class="app-skel-pulse h-full">' + html + "</div>";
      document.body.appendChild(el);
      layers.push(el);
    }

    // offsetParent is always null for the fixed sidebar: check its box instead.
    var shellRect = shell && getComputedStyle(shell).display !== "none" ? shell.getBoundingClientRect() : null;
    if (shellRect && shellRect.width > 0) {
      var collapsed = shell.classList.contains("is-collapsed");
      layer(
        shellRect,
        '<div class="h-full border-r px-6 pt-6 pb-6" style="border-color:var(--app-skel-bg)">' + sidebarSkeletonHtml(collapsed) + "</div>",
        sideBg,
      );
    }
    var left = shellRect && shellRect.width > 0 ? shellRect.right : 0;
    var top = wrapper ? Math.max(0, wrapper.getBoundingClientRect().top) : 0;
    layer({ left: left, top: top, width: window.innerWidth - left }, pageSkeletonHtml(headerBg), pageBg);
    return layers;
  }

  function clearShellVeil() {
    document.querySelectorAll("[data-app-switch-skeleton]").forEach(function (el) {
      el.remove();
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

  function escapeHtml(text) {
    return String(text == null ? "" : text).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /**
   * "Switching to <business>" modal (Andrian, 2026-11-11), modal backdrop + bouncing dots:
   * the instance change reads as one deliberate step, not the shell flickering.
   */
  function showSwitchModal(opts) {
    if (!opts || !opts.name) return null;
    var overlay = document.createElement("div");
    overlay.setAttribute("data-app-switch-modal", "");
    overlay.setAttribute("role", "status");
    overlay.setAttribute("aria-live", "polite");
    // Backdrop = the modals' (bg-gray-900/75).
    overlay.className =
      "fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/75 p-4 opacity-0 transition-opacity duration-200 ease-out motion-reduce:transition-none";
    overlay.innerHTML =
      '<div class="flex w-full max-w-md flex-col items-center gap-6 rounded-2xl bg-white px-8 py-14 text-center shadow-xl dark:bg-gray-800 dark:ring-1 dark:ring-white/10">' +
      '<span aria-hidden="true" class="flex size-14 items-center justify-center rounded-full bg-blue-600 text-xl font-medium text-white">' +
      escapeHtml(opts.initials || opts.name.charAt(0)) +
      "</span>" +
      '<div class="flex flex-col gap-1">' +
      '<p class="text-sm leading-5 text-gray-500 dark:text-gray-400">Switching to</p>' +
      '<p class="text-lg leading-7 font-medium text-gray-900 dark:text-white">' +
      escapeHtml(opts.name) +
      "</p></div>" +
      // Loading: three dots bouncing in turn (Andrian, 2026-11-11).
      '<span aria-hidden="true" class="flex h-5 items-end gap-1.5">' +
      '<span class="app-switch-dot size-2 rounded-full bg-blue-600 dark:bg-blue-400"></span>' +
      '<span class="app-switch-dot size-2 rounded-full bg-blue-600 dark:bg-blue-400"></span>' +
      '<span class="app-switch-dot size-2 rounded-full bg-blue-600 dark:bg-blue-400"></span>' +
      "</span></div>";
    document.body.appendChild(overlay);
    requestAnimationFrame(function () {
      overlay.classList.remove("opacity-0");
    });
    return overlay;
  }

  function hideSwitchModal(overlay) {
    if (!overlay) return;
    overlay.classList.add("opacity-0");
    window.setTimeout(function () {
      overlay.remove();
    }, 200);
  }

  /**
   * @param {function} apply changes the active business; runs while hidden
   * @param {function} [after] runs once the new shell is on screen
   * @param {{name: string, initials?: string}} [opts] shows the "Switching to" modal
   */
  function run(apply, after, opts) {
    if (busy) return;
    busy = true;
    ensureStyles();
    var modal = showSwitchModal(opts);
    document.documentElement.setAttribute("data-app-switching", "true");
    paintNavSkeletons();
    veilMain();
    veilShell();

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
      clearShellVeil();
      hideSwitchModal(modal);
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

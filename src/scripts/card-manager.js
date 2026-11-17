/**
 * card-manager.js
 * Module scaffold for Cards Manager (SMART Hub). TCDM-5218.
 *
 * Owns the page shell only: loads the data, keeps the route (`?tab=` / `?card=`)
 * in the URL, draws the two tab counts and shows the matching mount point.
 * The content of the tabs and the details view is drawn by later stories
 * (list, details, modals, linked cards) through `window.CardManager`:
 *
 *   CardManager.data               the loaded card-manager.json (same object for ever)
 *   CardManager.route              { tab: 'smart' | 'linked', card: string | null }
 *   CardManager.on(event, fn)      returns an unsubscribe function
 *   CardManager.emit(event, data)  how a story tells the others something happened
 *   CardManager.navigate(route)    change tab / open a card, keeps history
 *   CardManager.ready              Promise, resolved once data is loaded
 *   CardManager.mount(name)        the mount element: 'smart' | 'linked' | 'details'
 *
 * Events: `ready`, `route` ({ route, previous }), `data-change` (call it after
 * mutating CardManager.data so the tab counts refresh). Stories add their own,
 * e.g. `add-funds`, `lock`, `remove` (payload { cardId }).
 */
(function () {
  "use strict";

  var TABS = ["smart", "linked"];
  var DEFAULT_TAB = "smart";

  var ACTIVE_TAB_LINK_CLASSES = [
    "bg-blue-50",
    "text-blue-600",
    "dark:bg-blue-500/15",
    "dark:text-blue-300",
  ];
  var INACTIVE_TAB_LINK_CLASSES = [
    "text-gray-500",
    "hover:bg-gray-50",
    "hover:text-gray-700",
    "dark:text-gray-400",
    "dark:hover:bg-white/5",
    "dark:hover:text-gray-200",
  ];
  var ACTIVE_BADGE_CLASSES = [
    "border-blue-200",
    "bg-blue-100",
    "text-blue-800",
    "dark:border-blue-400/20",
    "dark:bg-blue-400/10",
    "dark:text-blue-400",
  ];
  var INACTIVE_BADGE_CLASSES = [
    "border-gray-200",
    "bg-gray-100",
    "text-gray-800",
    "dark:border-white/15",
    "dark:bg-white/10",
    "dark:text-gray-300",
  ];

  var data = { smartCards: [], linkedCards: [], fundingSources: [], statementMonths: [] };
  var route = { tab: DEFAULT_TAB, card: null };
  var listeners = {};
  var refs = {};
  var readyResolve;
  var ready = new Promise(function (resolve) {
    readyResolve = resolve;
  });

  /* ---------- events ---------- */

  function on(event, fn) {
    if (typeof fn !== "function") return function () {};
    (listeners[event] = listeners[event] || []).push(fn);
    return function off() {
      listeners[event] = (listeners[event] || []).filter(function (f) {
        return f !== fn;
      });
    };
  }

  function emit(event, payload) {
    (listeners[event] || []).slice().forEach(function (fn) {
      try {
        fn(payload);
      } catch (error) {
        console.error("CardManager listener for '" + event + "' failed", error);
      }
    });
  }

  /* ---------- route <-> URL ---------- */

  function parseRoute(search) {
    var params = new URLSearchParams(search || "");
    var tab = params.get("tab");
    var card = params.get("card");
    return {
      tab: TABS.indexOf(tab) === -1 ? DEFAULT_TAB : tab,
      card: card || null,
    };
  }

  function routeToSearch(next) {
    var params = new URLSearchParams();
    // The default tab stays out of the URL, so `?card=(id)` is the SMART card link.
    if (next.tab !== DEFAULT_TAB) params.set("tab", next.tab);
    if (next.card) params.set("card", next.card);
    var query = params.toString();
    return query ? "?" + query : window.location.pathname.split("/").pop();
  }

  function setRoute(next, options) {
    var previous = { tab: route.tab, card: route.card };
    route.tab = TABS.indexOf(next.tab) === -1 ? DEFAULT_TAB : next.tab;
    route.card = next.card || null;
    if (options && options.fromUrl) {
      /* URL already right */
    } else {
      var url = routeToSearch(route);
      var method = options && options.replace ? "replaceState" : "pushState";
      window.history[method](null, "", url);
    }
    render();
    emit("route", { route: route, previous: previous });
  }

  /** navigate({ tab }) switches tab, navigate({ tab, card }) opens a card, navigate({ tab }) closes it. */
  function navigate(next, options) {
    var merged = {
      tab: next && next.tab ? next.tab : route.tab,
      card: next && "card" in next ? next.card : null,
    };
    if (merged.tab === route.tab && merged.card === route.card) return;
    setRoute(merged, options);
  }

  /* ---------- render ---------- */

  function cacheRefs() {
    refs.nav = document.getElementById("cm-tab-nav");
    refs.select = document.getElementById("cm-tab-select");
    refs.chrome = document.querySelector("[data-cm-chrome]");
    refs.mounts = {};
    document.querySelectorAll("[data-cm-mount]").forEach(function (el) {
      refs.mounts[el.getAttribute("data-cm-mount")] = el;
    });
  }

  function counts() {
    return {
      smart: data.smartCards.length,
      linked: data.linkedCards.length,
    };
  }

  function renderTabs() {
    var total = counts();
    if (refs.nav) {
      refs.nav.querySelectorAll("[data-tab]").forEach(function (link) {
        var key = link.getAttribute("data-tab");
        var active = key === route.tab;
        ACTIVE_TAB_LINK_CLASSES.forEach(function (c) {
          link.classList.toggle(c, active);
        });
        INACTIVE_TAB_LINK_CLASSES.forEach(function (c) {
          link.classList.toggle(c, !active);
        });
        if (active) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");

        var badge = link.querySelector("[data-tab-count]");
        if (badge) {
          badge.textContent = String(total[key]);
          ACTIVE_BADGE_CLASSES.forEach(function (c) {
            badge.classList.toggle(c, active);
          });
          INACTIVE_BADGE_CLASSES.forEach(function (c) {
            badge.classList.toggle(c, !active);
          });
        }
      });
    }
    if (refs.select) {
      refs.select.value = route.tab;
      Array.prototype.forEach.call(refs.select.options, function (option) {
        var base = option.getAttribute("data-label");
        if (!base) {
          base = option.textContent;
          option.setAttribute("data-label", base);
        }
        option.textContent = base + " (" + total[option.value] + ")";
      });
    }
  }

  function renderMounts() {
    var detailsOpen = !!route.card;
    if (refs.chrome) refs.chrome.hidden = detailsOpen;
    Object.keys(refs.mounts).forEach(function (name) {
      var show = detailsOpen ? name === "details" : name === route.tab;
      refs.mounts[name].hidden = !show;
    });
  }

  /** Third breadcrumb crumb = the active tab (Home > Manage Cards > SMART Cards). */
  function renderCrumb() {
    var topbar = document.querySelector("app-topbar");
    if (!topbar) return;
    topbar.setAttribute(
      "data-crumb-tail",
      route.tab === "linked" ? "Linked Credit Cards" : "SMART Cards",
    );
    if (typeof topbar.refresh === "function") topbar.refresh();
  }

  function render() {
    renderTabs();
    renderMounts();
    renderCrumb();
    document.title =
      "Manage Cards - " + (route.tab === "linked" ? "Linked Credit Cards" : "SMART Cards");
  }

  /* ---------- wiring ---------- */

  function bindTabs() {
    if (refs.nav) {
      refs.nav.addEventListener("click", function (event) {
        var link = event.target.closest("[data-tab]");
        if (!link) return;
        // Let the browser handle new-tab / modified clicks.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button) return;
        event.preventDefault();
        navigate({ tab: link.getAttribute("data-tab") });
      });
    }
    if (refs.select) {
      refs.select.addEventListener("change", function () {
        navigate({ tab: refs.select.value });
      });
    }
    window.addEventListener("popstate", function () {
      setRoute(parseRoute(window.location.search), { fromUrl: true });
    });
    on("data-change", renderTabs);
  }

  function loadData() {
    if (!window.DataSource) {
      return Promise.reject(new Error("DataSource is not loaded."));
    }
    return window.DataSource.load("card-manager").then(function (json) {
      // Keep the same `data` object so stories can hold on to it.
      Object.keys(data).forEach(function (key) {
        data[key] = Array.isArray(json[key]) ? json[key] : [];
      });
    });
  }

  function init() {
    cacheRefs();
    route.tab = parseRoute(window.location.search).tab;
    route.card = parseRoute(window.location.search).card;
    bindTabs();
    render();
    loadData()
      .catch(function (error) {
        console.error("Cards Manager: could not load card-manager.json", error);
      })
      .then(function () {
        render();
        readyResolve(api);
        emit("ready", api);
      });
  }

  var api = {
    data: data,
    route: route,
    on: on,
    emit: emit,
    navigate: navigate,
    ready: ready,
    mount: function (name) {
      return refs.mounts ? refs.mounts[name] || null : null;
    },
  };
  window.CardManager = api;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

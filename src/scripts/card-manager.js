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
 * mutating CardManager.data so the tab counts and empty states refresh). Stories
 * add their own, e.g. `add-funds`, `lock`, `remove` (payload { cardId }).
 *
 * Empty state (Figma 8007:126803 SMART Cards, 10001:257248 Linked Credit Cards):
 * a tab with no cards shows the Figma card: section title, icon, heading, text and a
 * primary button. The button emits `create-card` (SMART Cards) or `add-linked-card`
 * (Linked Credit Cards); the Create / Add modals come from their own stories.
 * `?empty=1` in the URL shows both tabs with no cards, to look at it.
 */
(function () {
  "use strict";

  var TABS = ["smart", "linked"];
  var DEFAULT_TAB = "smart";

  // Figma "SE/Main Tab": equal-width tabs, the active one has a 2px blue underline.
  var ACTIVE_TAB_LINK_CLASSES = [
    "border-blue-500",
    "text-blue-600",
    "dark:border-blue-400",
    "dark:text-blue-300",
  ];
  var INACTIVE_TAB_LINK_CLASSES = [
    "border-transparent",
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

  /* ---------- empty state ---------- */

  var EMPTY = {
    smart: {
      key: "smartCards",
      title: "SMART Cards",
      heading: "Create your First SMART Card",
      text: "Instantly generate and fund cards with cashback for customer payments.",
      button: "Create",
      event: "create-card",
      icon: "icon-credit-card-duotone.svg",
    },
    linked: {
      key: "linkedCards",
      title: "Linked Credit Cards",
      heading: "Linked Credit Cards",
      text: "Add your external cards for quick access and better financial management.",
      button: "Add Card",
      event: "add-linked-card",
      icon: "icon-wallet-duotone.svg",
    },
  };

  function assetUrl(file) {
    var path = window.location.pathname || "";
    var at = path.indexOf("/src/pages/");
    var root = at >= 0 ? path.slice(0, at) : "";
    return root + "/src/assets/cards-manager/" + file;
  }

  /** The Figma empty state as a card body: header (title) + centred icon, heading, text, button. */
  function emptyStateHtml(tab) {
    var cfg = EMPTY[tab];
    return (
      '<div data-cm-empty="' + tab + '">' +
      '<div class="border-b border-gray-200 px-6 py-5 dark:border-white/10">' +
      '<h2 class="text-2xl/8 font-semibold text-gray-900 dark:text-white">' + cfg.title + "</h2>" +
      "</div>" +
      '<div class="flex flex-col items-center justify-center px-6 py-30">' +
      '<div class="flex w-full max-w-120 flex-col items-center gap-6">' +
      '<img src="' + assetUrl(cfg.icon) + '" alt="" width="36" height="36" class="size-9" />' +
      '<div class="flex w-full flex-col items-center gap-1 text-center">' +
      '<h3 class="text-lg/6 font-semibold text-gray-900 dark:text-white">' + cfg.heading + "</h3>" +
      '<p class="text-sm/5 font-normal text-gray-500 dark:text-gray-400">' + cfg.text + "</p>" +
      "</div>" +
      '<button type="button" data-cm-empty-action="' + cfg.event + '" class="inline-flex cursor-pointer items-center justify-center gap-1 rounded-md bg-blue-600 px-2.5 py-1.5 text-sm/5 font-semibold text-white shadow-xs hover:bg-blue-500 active:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">' +
      '<img src="' + assetUrl("icon-plus.svg") + '" alt="" width="18" height="18" class="size-4.5" />' +
      cfg.button +
      "</button>" +
      "</div>" +
      "</div>" +
      "</div>"
    );
  }

  /** Show the empty state in a tab with no cards; take it away once there are cards. */
  function renderEmptyStates() {
    Object.keys(EMPTY).forEach(function (tab) {
      var mount = refs.mounts && refs.mounts[tab];
      if (!mount) return;
      var shown = !!mount.querySelector("[data-cm-empty]");
      var none = data[EMPTY[tab].key].length === 0;
      if (none && !mount.firstElementChild) {
        mount.innerHTML = emptyStateHtml(tab);
      } else if (!none && shown) {
        mount.innerHTML = "";
      }
    });
  }

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
    renderEmptyStates();
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
    Object.keys(refs.mounts).forEach(function (name) {
      refs.mounts[name].addEventListener("click", function (event) {
        var action = event.target.closest("[data-cm-empty-action]");
        if (action) emit(action.getAttribute("data-cm-empty-action"), { tab: name });
      });
    });
    on("data-change", function () {
      renderTabs();
      renderEmptyStates();
    });
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
      // ?empty=1: no cards at all, to look at the empty states.
      if (new URLSearchParams(window.location.search).get("empty") === "1") {
        data.smartCards.length = 0;
        data.linkedCards.length = 0;
      }
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

/**
 * um-store.js
 * State of the User Management module (SMART Hub settings). No backend: the
 * seed `src/data/user-management.json` is copied into localStorage on first
 * load and every change is written back there, so it survives reloads.
 *
 *   UMStore.load()                 → Promise<state>   (seed on first run)
 *   UMStore.getUsers() / getRoles() / getRole(id) / getUser(id)
 *   UMStore.getCurrentUser()       → the signed-in user ("Me")
 *   UMStore.getViewer()            → { mode: "admin"|"member", isAdmin, user } — demo: ?as=member
 *   UMStore.updateUser(id, patch)  → firstName / lastName / phone / photo (data URL or null)
 *   UMStore.getBusiness()          → business details (Business Details page)
 *   UMStore.removeUser(id)         → removes the user from the business
 *   UMStore.setBusinessSetting(key, value)
 *   UMStore.onChange(fn)           → called after every write
 *   UMStore.reset()                → drops the saved copy, reloads the seed
 *
 * The same store will back the invite flow (phase 3) and the SX Invite People
 * modal (phase 5); `invitations` is kept in the state for them.
 */
window.UMStore = (function () {
  "use strict";

  var STORAGE_KEY = "sx_um_v1";
  var SEED = "user-management";
  // Bump with the seed's "version": an older saved copy is replaced by the new seed.
  var SEED_VERSION = 4;

  // Demo viewer (Figma 6.5): ?as=member shows the list as a View Only member;
  // ?as=admin (or nothing) is the admin/owner. Kept for the tab's session.
  var VIEWER_KEY = "sx_um_viewer";
  var viewerMode = (function () {
    var asParam = new URLSearchParams(window.location.search).get("as");
    try {
      if (asParam === "member" || asParam === "admin")
        window.sessionStorage.setItem(VIEWER_KEY, asParam);
      return window.sessionStorage.getItem(VIEWER_KEY) === "member" ? "member" : "admin";
    } catch (e) {
      return asParam === "member" ? "member" : "admin";
    }
  })();

  var state = null;
  var loading = null;
  var listeners = [];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function read() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function write() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // Private mode / quota: the change still shows until the page reloads.
    }
    listeners.forEach(function (fn) {
      try {
        fn(state);
      } catch (e) {}
    });
  }

  function fromSeed(seed) {
    var next = clone(seed || {});
    next.users = next.users || [];
    next.roles = next.roles || [];
    next.invitations = next.invitations || [];
    next.business = next.business || {};
    next.business.settings = next.business.settings || {};
    return next;
  }

  function fetchSeed() {
    if (!window.DataSource) return Promise.reject(new Error("DataSource missing"));
    return window.DataSource.load(SEED);
  }

  function load() {
    if (state) return Promise.resolve(state);
    if (loading) return loading;
    var saved = read();
    if (saved && saved.users && saved.version === SEED_VERSION) {
      state = fromSeed(saved);
      return syncCurrentUser().then(function () {
        return state;
      });
    }
    loading = fetchSeed().then(function (seed) {
      state = fromSeed(seed);
      loading = null;
      write();
      return syncCurrentUser().then(function () {
        return state;
      });
    });
    return loading;
  }

  // The signed-in user ("Me") is the person in the top bar: name and email come
  // from the company profile contact (shared.js getMyCompanyProfile), as the
  // top bar's greeting and profile menu do.
  function syncCurrentUser() {
    if (typeof window.getMyCompanyProfile !== "function") return Promise.resolve();
    return window
      .getMyCompanyProfile()
      .then(function (profile) {
        var contact = (profile && profile.contact) || {};
        var me = state && rawUser(state.currentUserId);
        if (!me) return;
        var name = String(contact.name || "").trim();
        var email = String(contact.email || "").trim();
        var changed = false;
        // Once Me edits their name on the profile page, that edit wins.
        if (name && !me.nameEdited) {
          var parts = name.split(/\s+/);
          var first = parts.shift();
          var last = parts.join(" ");
          if (me.firstName !== first || me.lastName !== last) {
            me.firstName = first;
            me.lastName = last;
            changed = true;
          }
        }
        if (email && me.email !== email) {
          me.email = email;
          changed = true;
        }
        if (changed) write();
      })
      .catch(function () {});
  }

  function reset() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    state = null;
    loading = null;
    return load().then(function (next) {
      write();
      return next;
    });
  }

  function rawUser(id) {
    return state
      ? state.users.filter(function (user) {
          return user.id === id;
        })[0] || null
      : null;
  }

  // As a member, Me is a View Only user and the first other admin owns the business.
  function present(user) {
    if (viewerMode !== "member" || !state) return user;
    if (user.id === state.currentUserId)
      return Object.assign({}, user, { roleIds: ["view-only"], owner: false });
    if (user.id === memberViewOwnerId())
      return Object.assign({}, user, { owner: true });
    return user;
  }

  function memberViewOwnerId() {
    var owner = state.users.filter(function (user) {
      return user.id !== state.currentUserId && (user.roleIds || []).indexOf("admin") !== -1;
    })[0];
    return owner ? owner.id : null;
  }

  function getUsers() {
    return state ? state.users.map(present) : [];
  }

  function getUser(id) {
    var user = rawUser(id);
    return user ? present(user) : null;
  }

  function getViewer() {
    return {
      mode: viewerMode,
      isAdmin: viewerMode === "admin",
      user: getCurrentUser(),
    };
  }

  var EDITABLE = ["firstName", "lastName", "phone", "photo"];

  function updateUser(id, patch) {
    var user = rawUser(id);
    if (!user || !patch) return null;
    EDITABLE.forEach(function (key) {
      if (!Object.prototype.hasOwnProperty.call(patch, key)) return;
      var value = patch[key];
      if (value === null || value === "") delete user[key];
      else user[key] = String(value);
    });
    if (id === state.currentUserId && ("firstName" in patch || "lastName" in patch))
      user.nameEdited = true;
    write();
    return getUser(id);
  }

  function getRoles() {
    return state ? state.roles.slice() : [];
  }

  function getRole(id) {
    return getRoles().filter(function (role) {
      return role.id === id;
    })[0] || null;
  }

  function getCurrentUser() {
    return state ? getUser(state.currentUserId) : null;
  }

  function getBusiness() {
    return state ? state.business : null;
  }

  function removeUser(id) {
    if (!state || id === state.currentUserId) return false;
    var before = state.users.length;
    state.users = state.users.filter(function (user) {
      return user.id !== id;
    });
    if (state.users.length === before) return false;
    write();
    return true;
  }

  function setBusinessSetting(key, value) {
    if (!state) return;
    state.business.settings[key] = value;
    write();
  }

  function onChange(fn) {
    if (typeof fn === "function") listeners.push(fn);
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    load: load,
    reset: reset,
    getUsers: getUsers,
    getUser: getUser,
    getRoles: getRoles,
    getRole: getRole,
    getCurrentUser: getCurrentUser,
    getViewer: getViewer,
    updateUser: updateUser,
    getBusiness: getBusiness,
    removeUser: removeUser,
    setBusinessSetting: setBusinessSetting,
    onChange: onChange,
  };
})();

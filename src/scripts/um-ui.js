/**
 * um-ui.js
 * Markup shared by the User Management pages (user-management.js, user-profile.js):
 *   UMUi.escapeHtml(v), .fullName(user), .initials(user), .roleNames(user)
 *   UMUi.avatar(user, { size, text })  photo (path under src/ or data URL) or initials
 *                                      on a solid colour (Figma 6.0)
 *   UMUi.statusBadge(user)             pill with a leading icon: Active / Inactive / Pending
 *   UMUi.withViewer(href)              keeps ?as=member on links between UM pages
 *   UMUi.syncTopbar()                  shows Me's name / photo in <app-topbar> on UM pages
 *                                      (data-topbar-* hooks; the avatar <img> has no hook)
 */
window.UMUi = (function () {
  "use strict";

  var ICON_CHECK_CIRCLE =
    '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="size-3.5 shrink-0"><path fill-rule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm3.844-8.791a.75.75 0 0 0-1.188-.918l-3.7 4.79-1.649-1.833a.75.75 0 1 0-1.114 1.004l2.25 2.5a.75.75 0 0 0 1.15-.043l4.25-5.5Z" clip-rule="evenodd" /></svg>';
  var ICON_LINK_OFF =
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="size-3.5 shrink-0"><path stroke-linecap="round" stroke-linejoin="round" d="M6.5 4.5 7.6 3.4a2.83 2.83 0 0 1 4 4L10.5 8.5M9.5 11.5l-1.1 1.1a2.83 2.83 0 0 1-4-4L5.5 7.5M2 2l12 12" /></svg>';
  var ICON_CLOCK =
    '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="size-3.5 shrink-0"><path fill-rule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5v-3.5Z" clip-rule="evenodd" /></svg>';
  var STATUS = {
    active: {
      label: "Active",
      icon: ICON_CHECK_CIRCLE,
      cls: "bg-green-100 text-green-800 dark:bg-green-400/10 dark:text-green-400",
      iconCls: "text-green-500 dark:text-green-400",
    },
    inactive: {
      label: "Inactive",
      icon: ICON_LINK_OFF,
      cls: "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300",
      iconCls: "text-gray-500 dark:text-gray-400",
    },
    pending: {
      label: "Pending",
      icon: ICON_CLOCK,
      cls: "bg-amber-100 text-amber-800 dark:bg-amber-400/10 dark:text-amber-400",
      iconCls: "text-amber-500 dark:text-amber-400",
    },
  };

  var AVATAR_TONES = [
    "bg-purple-500",
    "bg-cyan-500",
    "bg-indigo-500",
    "bg-pink-500",
    "bg-emerald-500",
    "bg-orange-500",
  ];

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function fullName(user) {
    return ((user.firstName || "") + " " + (user.lastName || "")).trim();
  }

  function initials(user) {
    return ((user.firstName || "").charAt(0) + (user.lastName || "").charAt(0)).toUpperCase();
  }

  function roleNames(user) {
    return (user.roleIds || [])
      .map(function (id) {
        var role = window.UMStore && window.UMStore.getRole(id);
        return role ? role.name : null;
      })
      .filter(Boolean);
  }

  function avatarTone(user) {
    var hash = 5381;
    for (var i = 0; i < user.id.length; i += 1)
      hash = ((hash * 33) ^ user.id.charCodeAt(i)) >>> 0;
    return AVATAR_TONES[hash % AVATAR_TONES.length];
  }

  function photoSrc(user) {
    if (!user.photo) return "";
    return /^data:image\//.test(user.photo) ? user.photo : "../../../src/" + user.photo;
  }

  /** opts.size: size class (default size-10); opts.text: initials text class (default text-base). */
  function avatar(user, opts) {
    var size = (opts && opts.size) || "size-10";
    var text = (opts && opts.text) || "text-base";
    if (user.photo)
      return (
        '<img src="' +
        escapeHtml(photoSrc(user)) +
        '" alt="" class="' +
        size +
        ' shrink-0 rounded-full object-cover outline -outline-offset-1 outline-black/5 dark:outline-white/10" />'
      );
    return (
      '<span aria-hidden="true" class="flex ' +
      size +
      " shrink-0 items-center justify-center rounded-full text-white " +
      text +
      " " +
      avatarTone(user) +
      '">' +
      escapeHtml(initials(user)) +
      "</span>"
    );
  }

  function statusBadge(user) {
    var status = STATUS[user.status] || STATUS.inactive;
    return (
      '<span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 type-label-small whitespace-nowrap ' +
      status.cls +
      '"><span class="inline-flex ' +
      status.iconCls +
      '">' +
      status.icon +
      "</span>" +
      status.label +
      "</span>"
    );
  }

  function withViewer(href) {
    var viewer = window.UMStore && window.UMStore.getViewer();
    if (!viewer || viewer.isAdmin) return href;
    return href + (href.indexOf("?") === -1 ? "?" : "&") + "as=member";
  }

  // The top bar fills its name hooks from the company profile; after Me edits their
  // name or photo on the profile page, the UM pages show the edit there too.
  function syncTopbar() {
    var me = window.UMStore && window.UMStore.getCurrentUser();
    var bar = document.querySelector("app-topbar");
    if (!me || !bar) return;
    var name = fullName(me);
    bar.querySelectorAll("[data-topbar-greeting-name], [data-topbar-profile-name]").forEach(function (node) {
      node.textContent = name;
    });
    bar.querySelectorAll("[data-topbar-greeting]").forEach(function (node) {
      node.title = "Hello, " + name;
    });
    bar.querySelectorAll("[data-topbar-avatar-initials]").forEach(function (node) {
      node.textContent = initials(me);
    });
    var button = bar.querySelector('button[aria-label="Open user menu"]');
    var img = button && button.querySelector("img");
    if (!img) return;
    var fallback = button.querySelector("[data-um-topbar-initials]");
    if (me.photo) {
      img.src = photoSrc(me);
      img.hidden = false;
      if (fallback) fallback.remove();
      return;
    }
    img.hidden = true;
    if (!fallback) {
      fallback = document.createElement("span");
      fallback.setAttribute("data-um-topbar-initials", "");
      fallback.setAttribute("aria-hidden", "true");
      button.appendChild(fallback);
    }
    fallback.className =
      "flex size-10 items-center justify-center rounded-full border-2 border-white text-base text-white dark:border-gray-800 " +
      avatarTone(me);
    fallback.textContent = initials(me);
  }

  return {
    syncTopbar: syncTopbar,
    escapeHtml: escapeHtml,
    fullName: fullName,
    initials: initials,
    roleNames: roleNames,
    avatar: avatar,
    photoSrc: photoSrc,
    statusBadge: statusBadge,
    withViewer: withViewer,
  };
})();

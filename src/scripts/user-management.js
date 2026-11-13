/**
 * user-management.js
 * SMART Hub › Settings › User Management (Figma [REVIEW] User Management,
 * section 1. Users): 6.0 list, 6.1 row actions + tooltips, 6.2 Remove user
 * modal, 6.4 Multiple roles modal. Tabs Users | Roles (?tab=roles; Roles is
 * phase 4). Data from UMStore (um-store.js). Table / pagination / confirm modal
 * markup is copied from vendors-page.js; phones get one card per user.
 */
(function () {
  "use strict";

  var DEFAULT_PAGE_SIZE = 10;
  var MAX_ROLES_INLINE = 3;

  var state = {
    search: "",
    currentPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    loaded: false,
    sortKey: "",
    sortDir: "",
  };
  var refs = {};
  var pendingRemoveId = null;
  var pendingRemoveMode = "user"; // "user" | "revoke" | "expired" | "requires-action"

  // Avatar, status badge and names are shared with the profile page (um-ui.js).
  var UI = window.UMUi;
  var escapeHtml = UI.escapeHtml;
  var fullName = UI.fullName;
  var roleNames = UI.roleNames;
  var avatar = UI.avatar;
  var statusBadge = UI.statusBadge;

  var T = UI.table;
  var HEADER_CELL = T.HEADER_CELL;
  var CELL = T.CELL;
  var GROUP_BUTTON = T.GROUP_BUTTON;
  var ICON_PENCIL = T.ICON_PENCIL;
  var ICON_TRASH = T.ICON_TRASH;

  function toast(message, tone) {
    if (typeof window.showGlobalTopToast === "function")
      window.showGlobalTopToast(message, tone ? { tone: tone } : undefined);
  }

  function businessName() {
    var active = window.AppPlans && window.AppPlans.getActiveBusiness();
    if (active && active.name) return active.name;
    var business = window.UMStore.getBusiness();
    return (business && business.name) || "this business";
  }

  function isYou(user) {
    var me = window.UMStore.getCurrentUser();
    return !!me && me.id === user.id;
  }

  function sortValue(user, key) {
    return key === "role" ? roleNames(user).join(", ") : fullName(user);
  }

  function getFilteredUsers() {
    var query = state.search.trim().toLowerCase();
    var users = window.UMStore.getUsers();
    if (state.sortKey) {
      var dir = state.sortDir === "desc" ? -1 : 1;
      users.sort(function (a, b) {
        return sortValue(a, state.sortKey).localeCompare(sortValue(b, state.sortKey)) * dir;
      });
    } else {
      // Unsorted: Me first, then the owner, then the list as seeded (Figma 6.0 / 6.5).
      // Figma 6.9i: invitations and Requires Action rows come right after Me / the owner.
      var rank = function (user) {
        if (isYou(user)) return 4;
        if (user.owner) return 3;
        var st = status(user);
        if (st === "invited" || st === "expired" || st === "revoked") return 2;
        return st === "requires-action" ? 1 : 0;
      };
      // Within the invitations: the most recently sent first, so a new invite shows right under Me.
      var sentAt = function (user) {
        var inv = window.UMStore.getInvitationForUser && window.UMStore.getInvitationForUser(user.id);
        var time = inv && Date.parse(inv.sentAt);
        return isNaN(time) ? 0 : time || 0;
      };
      // Among the other users: people who joined through an invitation first, latest first.
      var joinedAt = function (user) {
        var inv = window.UMStore.getInvitationForUser && window.UMStore.getInvitationForUser(user.id);
        var time = inv && inv.acceptedAt && Date.parse(inv.acceptedAt);
        return time || 0;
      };
      users.sort(function (a, b) {
        return (
          rank(b) - rank(a) ||
          (rank(a) === 2 ? sentAt(b) - sentAt(a) : rank(a) === 0 ? joinedAt(b) - joinedAt(a) : 0)
        );
      });
    }
    if (!query) return users;
    return users.filter(function (user) {
      return (
        [fullName(user), user.email, roleNames(user).join(" "), user.status]
          .join(" ")
          .toLowerCase()
          .indexOf(query) !== -1
      );
    });
  }

  function getTotalPages(count) {
    return Math.max(1, Math.ceil(count / state.pageSize));
  }

  function pageSlice() {
    var filtered = getFilteredUsers();
    var totalPages = getTotalPages(filtered.length);
    if (state.currentPage > totalPages) state.currentPage = totalPages;
    var start = (state.currentPage - 1) * state.pageSize;
    return { all: filtered, page: filtered.slice(start, start + state.pageSize) };
  }

  // ── Cell pieces (shared by the table and the phone cards) ──

  function meBadge() {
    return '<span class="inline-flex shrink-0 items-center gap-1 rounded px-2 py-0.5 text-xs/4 font-medium border border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-400">Me</span>';
  }

  function nameBlock(user) {
    var name = UI.displayName(user);
    return (
      '<div class="flex min-w-0 items-center gap-3">' +
      avatar(user) +
      '<div class="flex min-w-0 flex-col">' +
      '<div class="flex min-w-0 items-center gap-2">' +
      '<span class="truncate type-label text-default" title="' +
      escapeHtml(name) +
      '">' +
      escapeHtml(name) +
      "</span>" +
      (isYou(user) ? meBadge() : "") +
      "</div>" +
      '<span class="truncate type-body text-tertiary" title="' +
      escapeHtml(user.email) +
      '">' +
      escapeHtml(user.email) +
      "</span>" +
      "</div></div>"
    );
  }

  var ICON_RESEND =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clip-rule="evenodd" /></svg>';

  function status(user) {
    return window.UMStore.getUserStatus(user);
  }

  function rolesBlock(user) {
    // Figma 6.9i: people added without an invitation get "Send Invitation →" instead of a role.
    if (status(user) === "requires-action" && isAdmin())
      return (
        '<button type="button" data-um-send-invite="' +
        escapeHtml(user.id) +
        '" class="inline-flex cursor-pointer items-center gap-1 rounded-md type-body text-blue-600 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-blue-400 dark:hover:text-blue-300">Send Invitation<span class="sr-only"> to ' +
        escapeHtml(user.email) +
        '</span><svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path fill-rule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clip-rule="evenodd" /></svg></button>'
      );
    var names = roleNames(user);
    if (!names.length) return '<span class="type-body text-tertiary">—</span>';
    var owner = user.owner
      ? ' <span class="type-caption text-tertiary">(Owner)</span>'
      : "";
    var shown = names.slice(0, MAX_ROLES_INLINE).join(", ");
    var extra = names.length - MAX_ROLES_INLINE;
    return (
      '<div class="flex min-w-0 items-center gap-2">' +
      '<span class="truncate type-body text-default" title="' +
      escapeHtml(names.join(", ")) +
      '">' +
      escapeHtml(shown) +
      owner +
      "</span>" +
      (extra > 0
        ? '<button type="button" data-um-roles="' +
          escapeHtml(user.id) +
          '" aria-label="' +
          escapeHtml("Show all " + names.length + " roles for " + fullName(user)) +
          '" class="inline-flex shrink-0 cursor-pointer items-center rounded-full bg-gray-100 px-1.5 py-0.5 type-label-small text-gray-600 hover:bg-gray-200 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:bg-gray-300 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20 dark:hover:text-white dark:active:bg-white/25">+' +
          extra +
          "</button>"
        : "") +
      "</div>"
    );
  }

  function isAdmin() {
    return window.UMStore.getViewer().isAdmin;
  }

  function profileHref(user) {
    return UI.withViewer("user-profile.html?id=" + encodeURIComponent(user.id));
  }

  function actions(user) {
    var name = fullName(user);
    // A member (Figma 6.5) only gets "Edit my profile" on their own row.
    if (!isAdmin()) {
      if (!isYou(user)) return "";
      return (
        '<div class="flex justify-end"><span class="isolate inline-flex rounded-md shadow-xs dark:shadow-none"><a href="' +
        escapeHtml(profileHref(user)) +
        '" data-tooltip="Edit my profile" aria-label="Edit my profile" class="' +
        GROUP_BUTTON +
        ' rounded-md">' +
        ICON_PENCIL +
        "</a></span></div>"
      );
    }
    var st = status(user);
    var who = UI.displayName(user) === "-" ? user.email : name;
    function trash(mode, tip, label) {
      return (
        '<button type="button" data-um-remove="' +
        escapeHtml(user.id) +
        '" data-um-remove-mode="' +
        mode +
        '" data-tooltip="' +
        tip +
        '" aria-label="' +
        escapeHtml(label + " " + who) +
        '" class="' +
        GROUP_BUTTON
      );
    }
    function group(inner) {
      return '<div class="flex justify-end"><span class="isolate inline-flex rounded-md shadow-xs dark:shadow-none">' + inner + "</span></div>";
    }
    // Requires Action (6.9i): only delete. Invitation Sent: resend + revoke. Expired / Revoked: resend + remove.
    if (st === "requires-action")
      return group(trash("requires-action", "Delete", "Delete") + ' rounded-md">' + ICON_TRASH + "</button>");
    if (st === "invited" || st === "expired" || st === "revoked")
      return group(
        '<button type="button" data-um-resend="' +
          escapeHtml(user.id) +
          '" data-tooltip="Resend invitation" aria-label="Resend invitation to ' +
          escapeHtml(who) +
          '" class="' +
          GROUP_BUTTON +
          ' rounded-l-md">' +
          ICON_RESEND +
          "</button>" +
          (st === "invited"
            ? trash("revoke", "Revoke invitation", "Revoke invitation for")
            : trash(st === "revoked" ? "revoked" : "expired", "Remove", "Remove")) +
          ' -ml-px rounded-r-md">' +
          ICON_TRASH +
          "</button>",
      );
    // Me → my profile page (photo, inline edit). Anyone else → the Edit modal (same layout as Invite).
    var edit = isYou(user)
      ? '<a href="' +
        escapeHtml(profileHref(user)) +
        '" data-tooltip="Edit my profile" aria-label="Edit my profile" class="' +
        GROUP_BUTTON +
        (user.owner ? " rounded-md" : " rounded-l-md") +
        '">' +
        ICON_PENCIL +
        "</a>"
      : '<button type="button" data-um-edit-user="' +
        escapeHtml(user.id) +
        '" data-tooltip="Edit user" aria-label="Edit ' +
        escapeHtml(name) +
        '" class="' +
        GROUP_BUTTON +
        (user.owner ? " rounded-md" : " rounded-l-md") +
        '">' +
        ICON_PENCIL +
        "</button>";
    // The owner can't be removed: only the edit button (Figma 6.0).
    var remove = user.owner
      ? ""
      : '<button type="button" data-um-remove="' +
        escapeHtml(user.id) +
        '" data-tooltip="Delete" aria-label="Remove ' +
        escapeHtml(name) +
        '" class="' +
        GROUP_BUTTON +
        ' -ml-px rounded-r-md">' +
        ICON_TRASH +
        "</button>";
    return (
      '<div class="flex justify-end"><span class="isolate inline-flex rounded-md shadow-xs dark:shadow-none">' +
      edit +
      remove +
      "</span></div>"
    );
  }

  // ── Table (≥ md) ──

  function sortHeader(key, label) {
    return T.sortHeader(key, label, state.sortKey, state.sortDir, "data-um-sort");
  }

  function buildHeader() {
    return (
      "<colgroup><col />" +
      '<col class="w-3/10" />' +
      '<col class="w-40" />' +
      '<col class="w-24" />' +
      "</colgroup>" +
      "<thead><tr>" +
      sortHeader("name", "Name") +
      sortHeader("role", "Role") +
      '<th scope="col" class="' + HEADER_CELL + '">Status</th>' +
      '<th scope="col" data-action-column class="' + HEADER_CELL + ' bg-white text-right dark:bg-gray-900"><span class="sr-only">Actions</span></th>' +
      "</tr></thead>"
    );
  }

  function emptyState(tag) {
    var box =
      '<div class="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center dark:border-white/10 dark:bg-white/5"><h3 class="type-title-small text-default">No users found</h3><p class="mt-1 type-description text-tertiary">Try another name, email or role.</p></div>';
    return tag === "tr"
      ? '<tr><td colspan="4" class="px-0 py-6">' + box + "</td></tr>"
      : '<li class="py-6">' + box + "</li>";
  }

  function buildRows(users) {
    return users
      .map(function (user) {
        return (
          '<tr data-um-row="' +
          escapeHtml(user.id) +
          '" class="group bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-white/5">' +
          '<td class="' + CELL + '">' + nameBlock(user) + "</td>" +
          '<td class="' + CELL + '">' + rolesBlock(user) + "</td>" +
          '<td class="' + CELL + '">' + statusBadge(user) + "</td>" +
          '<td data-action-column class="' + CELL + ' bg-white group-hover:bg-gray-50 dark:bg-gray-900 dark:group-hover:bg-gray-900 dark:group-hover:bg-linear-to-r dark:group-hover:from-white/5 dark:group-hover:to-white/5">' + actions(user) + "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  // ── Cards (< md) ──

  function buildCards(users) {
    return users
      .map(function (user) {
        return (
          '<li data-um-row="' +
          escapeHtml(user.id) +
          '" class="flex flex-col gap-3 py-4">' +
          '<div class="flex items-start justify-between gap-2">' +
          '<div class="min-w-0 flex-1">' + nameBlock(user) + "</div>" +
          actions(user) +
          "</div>" +
          '<dl class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2 pl-13">' +
          '<dt class="type-label-small text-tertiary">Role</dt><dd class="min-w-0">' + rolesBlock(user) + "</dd>" +
          '<dt class="type-label-small text-tertiary">Status</dt><dd>' + statusBadge(user) + "</dd>" +
          "</dl></li>"
        );
      })
      .join("");
  }

  function renderPagination(total) {
    if (!refs.pagination) return;
    refs.pagination.innerHTML = T.pagination({
      page: state.currentPage,
      pageSize: state.pageSize,
      total: total,
      sizeId: "um-page-size",
    });
  }

  function renderCount() {
    if (!refs.count) return;
    var count = window.UMStore.getUsers().length;
    refs.count.textContent = count + (count === 1 ? " User" : " Users");
  }

  function renderSkeleton() {
    if (window.TableSkeleton && refs.table) {
      window.TableSkeleton.render({
        tableEl: refs.table,
        rowCount: 6,
        headerHtml: buildHeader(),
        columns: [
          { key: "name", label: "Name" },
          { key: "role", label: "Role" },
          { key: "status", label: "Status" },
          { key: "actions", label: "", type: "action" },
        ],
      });
    }
    if (refs.cards)
      refs.cards.innerHTML = [0, 1, 2]
        .map(function () {
          return '<li class="flex animate-pulse items-center gap-3 py-4"><span class="size-10 rounded-full bg-gray-200 dark:bg-white/15"></span><span class="flex flex-1 flex-col gap-2"><span class="h-3 w-1/2 rounded bg-gray-200 dark:bg-white/15"></span><span class="h-3 w-3/4 rounded bg-gray-200 dark:bg-white/15"></span></span></li>';
        })
        .join("");
  }

  // Pinned actions column (Bills/Payables principle); the classes live in UMUi.table.
  var stickyBound = false;

  function syncStickyActions() {
    if (!stickyBound) {
      stickyBound = true;
      window.addEventListener("resize", syncStickyActions);
    }
    T.syncSticky(refs.table);
  }

  function render() {
    if (!state.loaded) return;
    var slice = pageSlice();
    renderCount();
    if (refs.table)
      refs.table.innerHTML =
        buildHeader() +
        "<tbody>" +
        (slice.page.length ? buildRows(slice.page) : emptyState("tr")) +
        "</tbody>";
    syncStickyActions();
    if (refs.cards)
      refs.cards.innerHTML = slice.page.length
        ? buildCards(slice.page)
        : emptyState("li");
    renderPagination(slice.all.length);
  }

  // ── Tabs ──

  function selectTab(tab, focus) {
    var next = tab === "roles" ? "roles" : "users";
    document.querySelectorAll("[data-um-tab]").forEach(function (button) {
      var on = button.getAttribute("data-um-tab") === next;
      button.setAttribute("aria-selected", on ? "true" : "false");
      button.tabIndex = on ? 0 : -1;
      if (on && focus) button.focus();
    });
    var users = document.getElementById("um-panel-users");
    var roles = document.getElementById("um-panel-roles");
    if (users) users.hidden = next !== "users";
    if (roles) roles.hidden = next !== "roles";
    var url = new URL(window.location.href);
    if (next === "roles") url.searchParams.set("tab", "roles");
    else url.searchParams.delete("tab");
    window.history.replaceState(null, "", url.toString());
  }

  function bindTabs() {
    var buttons = Array.prototype.slice.call(
      document.querySelectorAll("[data-um-tab]"),
    );
    buttons.forEach(function (button, index) {
      button.addEventListener("click", function () {
        selectTab(button.getAttribute("data-um-tab"));
      });
      button.addEventListener("keydown", function (event) {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        event.preventDefault();
        var step = event.key === "ArrowRight" ? 1 : -1;
        var target = buttons[(index + step + buttons.length) % buttons.length];
        selectTab(target.getAttribute("data-um-tab"), true);
      });
    });
    selectTab(new URLSearchParams(window.location.search).get("tab"));
  }

  // ── Modals ──

  // One destructive confirm (Figma 6.2) for every way a row leaves the list.
  var REMOVE_COPY = {
    user: { title: "Remove User from Business", button: "Remove", text: "Are you sure you want to Remove User {who}?" },
    revoke: {
      title: "Revoke Invitation",
      button: "Revoke",
      text: "Are you sure you want to revoke the invitation for {who}? The link in their email will stop working.",
    },
    expired: { title: "Remove Invitation", button: "Remove", text: "Are you sure you want to remove the expired invitation for {who}?" },
    revoked: { title: "Remove Invitation", button: "Remove", text: "Are you sure you want to remove the revoked invitation for {who}?" },
    "requires-action": { title: "Remove User from Business", button: "Remove", text: "Are you sure you want to remove {who} from this business?" },
  };

  function openRemove(userId, mode) {
    var user = window.UMStore.getUser(userId);
    var dialog = document.getElementById("um-remove-dialog");
    if (!user || !dialog) return;
    pendingRemoveId = user.id;
    pendingRemoveMode = REMOVE_COPY[mode] ? mode : "user";
    var copy = REMOVE_COPY[pendingRemoveMode];
    var who = UI.displayName(user) === "-" ? user.email : fullName(user);
    document.getElementById("um-remove-title").textContent = copy.title;
    document.getElementById("um-remove-confirm").textContent = copy.button;
    document.getElementById("um-remove-text").innerHTML = escapeHtml(copy.text).replace(
      "{who}",
      '<span class="font-medium text-gray-900 dark:text-white">' + escapeHtml(who) + "</span>",
    );
    dialog.showModal();
  }

  function confirmRemove() {
    var dialog = document.getElementById("um-remove-dialog");
    var user = pendingRemoveId && window.UMStore.getUser(pendingRemoveId);
    pendingRemoveId = null;
    if (!user) return dialog && dialog.close();
    // The dialog hands focus back to its trigger on close; that row is gone,
    // so focus the search once the close has finished.
    if (dialog)
      dialog.addEventListener(
        "close",
        function () {
          setTimeout(function () {
            if (refs.search) refs.search.focus();
          }, 0);
        },
        { once: true },
      );
    var who = UI.displayName(user) === "-" ? user.email : fullName(user);
    if (pendingRemoveMode === "revoke") {
      // Revoke keeps the row (status "Revoked"); Resend brings the invitation back.
      if (window.UMStore.revokeInvitation(user.id)) toast("Invitation for " + who + " was revoked");
    } else if (window.UMStore.removeUser(user.id)) toast(who + " was removed from " + businessName());
    if (dialog) dialog.close();
  }

  function resend(userId, button) {
    var inv = window.UMStore.resendInvitation(userId);
    if (!inv) return;
    if (button) button.disabled = true;
    window.UMEmail.sendInvite(inv).then(function (result) {
      if (button) button.disabled = false;
      if (result.sent) toast("Invitation resent to " + inv.email);
      else window.UMInvite.showResult(inv, result, { resent: true });
    });
  }

  function openRoles(userId) {
    var user = window.UMStore.getUser(userId);
    var dialog = document.getElementById("um-roles-dialog");
    if (!user || !dialog) return;
    document.getElementById("um-roles-title").innerHTML =
      'Roles for: <span class="font-semibold">' + escapeHtml(fullName(user)) + "</span>";
    document.getElementById("um-roles-list").innerHTML = roleNames(user)
      .map(function (name) {
        return '<li class="py-1.5 type-body text-default">' + escapeHtml(name) + "</li>";
      })
      .join("");
    dialog.showModal();
  }

  // ── Events ──

  function bindEvents() {
    if (refs.search)
      refs.search.addEventListener("input", function () {
        state.search = refs.search.value;
        state.currentPage = 1;
        render();
      });

    var addUser = document.getElementById("um-add-user");
    if (addUser)
      addUser.addEventListener("click", function () {
        window.UMInvite.open();
      });

    var confirm = document.getElementById("um-remove-confirm");
    if (confirm) confirm.addEventListener("click", confirmRemove);

    document.addEventListener("change", function (event) {
      if (event.target && event.target.id === "um-page-size") {
        state.pageSize = Number(event.target.value) || DEFAULT_PAGE_SIZE;
        state.currentPage = 1;
        render();
      }
    });

    document.addEventListener("click", function (event) {
      var target = event.target.closest
        ? event.target.closest(
            "[data-um-remove],[data-um-roles],[data-um-sort],[data-page-nav],[data-um-resend],[data-um-send-invite],[data-um-edit-user]",
          )
        : null;
      if (!target || !document.getElementById("um-panel-users").contains(target))
        return;
      if (target.hasAttribute("data-um-remove"))
        return openRemove(target.getAttribute("data-um-remove"), target.getAttribute("data-um-remove-mode"));
      if (target.hasAttribute("data-um-resend"))
        return resend(target.getAttribute("data-um-resend"), target);
      if (target.hasAttribute("data-um-edit-user"))
        return window.UMInvite.openEdit(target.getAttribute("data-um-edit-user"));
      if (target.hasAttribute("data-um-send-invite")) {
        var row = window.UMStore.getUser(target.getAttribute("data-um-send-invite"));
        return row && window.UMInvite.open({ email: row.email });
      }
      if (target.hasAttribute("data-um-roles"))
        return openRoles(target.getAttribute("data-um-roles"));
      if (target.hasAttribute("data-um-sort")) {
        var key = target.getAttribute("data-um-sort");
        var next = T.nextSort(event, target, key, state.sortKey, state.sortDir);
        state.sortKey = next.key;
        state.sortDir = next.dir;
        render();
        var again = refs.table.querySelector('[data-um-sort="' + key + '"]');
        if (again) again.focus();
        return;
      }
      var nav = target.getAttribute("data-page-nav");
      var totalPages = getTotalPages(getFilteredUsers().length);
      if (nav === "first") state.currentPage = 1;
      if (nav === "prev") state.currentPage = Math.max(1, state.currentPage - 1);
      if (nav === "next")
        state.currentPage = Math.min(totalPages, state.currentPage + 1);
      if (nav === "last") state.currentPage = totalPages;
      render();
      var again = refs.pagination.querySelector('[data-page-nav="' + nav + '"]');
      if (again && !again.disabled) again.focus();
    });
  }

  // ── Demo controls (pattern of sx-demo-case.js #sx-demo-bar): accept the newest pending
  // invite as if its link had been opened, and reset the module's demo data. ──

  var DEMO_BUTTON =
    "rounded-sm px-2 py-1 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 bg-white text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 active:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white dark:bg-white/10 dark:text-white dark:inset-ring-white/10 dark:hover:bg-white/20 dark:disabled:hover:bg-white/10 cursor-pointer";

  function newestPending() {
    return window.UMStore.getUsers()
      .filter(function (user) {
        return status(user) === "invited";
      })
      .map(function (user) {
        return window.UMStore.getInvitationForUser(user.id);
      })
      .filter(Boolean)
      .sort(function (a, b) {
        return String(b.sentAt).localeCompare(String(a.sentAt));
      })[0];
  }

  function renderDemoBar() {
    if (document.getElementById("um-demo-bar") || document.getElementById("sx-demo-bar")) return;
    var bar = document.createElement("div");
    bar.id = "um-demo-bar";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Demo controls");
    bar.className =
      "fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-lg bg-white py-1.5 pr-1.5 pl-3 shadow-lg ring-1 ring-gray-900/10 dark:bg-gray-800 dark:ring-white/10";
    bar.innerHTML =
      '<span class="text-xs font-medium text-gray-500 dark:text-gray-400">Demo</span>' +
      '<button type="button" data-um-demo="accept" class="' + DEMO_BUTTON + '">Simulate accept</button>' +
      '<button type="button" data-um-demo="reset" class="' + DEMO_BUTTON + '">Reset demo data</button>';
    document.body.appendChild(bar);
    // Room under the card so the fixed bar never covers the pagination.
    var main = document.querySelector("#main-content-wrapper main");
    if (main) main.classList.add("pb-20");
    bar.addEventListener("click", function (event) {
      var button = event.target.closest("[data-um-demo]");
      if (!button) return;
      if (button.getAttribute("data-um-demo") === "reset") {
        window.UMStore.reset().then(function () {
          toast("Demo data reset");
        });
        return;
      }
      var inv = newestPending();
      if (!inv) return;
      window.UMStore.acceptInvitation(inv.id);
      toast((inv.firstName + " " + inv.lastName).trim() + " accepted the invitation");
    });
    syncDemoBar();
  }

  function syncDemoBar() {
    var accept = document.querySelector('[data-um-demo="accept"]');
    if (!accept) return;
    var inv = newestPending();
    accept.disabled = !inv;
    accept.title = inv ? "Accept the invitation for " + inv.email : "No invitation is waiting";
  }

  function init() {
    refs.table = document.getElementById("um-users-table");
    refs.cards = document.getElementById("um-users-cards");
    refs.count = document.getElementById("um-users-count");
    refs.search = document.getElementById("um-search");
    refs.pagination = document.querySelector("[data-um-pagination]");
    if (!refs.table || !window.UMStore) return;
    bindTabs();
    bindEvents();
    renderSkeleton();
    window.UMStore.onChange(render);
    window.UMStore.onChange(syncDemoBar);
    window.UMStore.load()
      .then(function () {
        state.loaded = true;
        // Figma 6.5: a member can't invite users.
        var addUser = document.getElementById("um-add-user");
        if (addUser) addUser.hidden = !isAdmin();
        if (isAdmin()) renderDemoBar();
        render();
      })
      .catch(function () {
        refs.cards.innerHTML = refs.table.innerHTML = "";
        toast("Users could not be loaded. Reload the page to try again.", "error");
      });
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();

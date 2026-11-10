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
  var PAGE_SIZE_OPTIONS = [10, 25, 50];
  var MAX_ROLES_INLINE = 3;
  var ASSETS = "../../../src/assets/vendors/";

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

  // Avatar, status badge and names are shared with the profile page (um-ui.js).
  var UI = window.UMUi;
  var escapeHtml = UI.escapeHtml;
  var fullName = UI.fullName;
  var roleNames = UI.roleNames;
  var avatar = UI.avatar;
  var statusBadge = UI.statusBadge;

  var HEADER_CELL =
    "h-16 border-b border-gray-200 px-4 pt-5 pb-3 align-middle text-left type-overline text-gray-500 dark:border-white/10 dark:text-gray-400";
  var CELL =
    "border-b border-gray-200 px-4 py-3 align-middle type-body text-gray-500 dark:border-white/10 dark:text-gray-400";
  // Row actions: 32px bordered icon buttons joined as a button group (Figma 6.1).
  var GROUP_BUTTON =
    "relative inline-flex size-8 cursor-pointer items-center justify-center bg-white text-gray-600 inset-ring inset-ring-gray-300 hover:bg-gray-50 hover:text-gray-900 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:bg-gray-100 dark:bg-white/5 dark:text-gray-300 dark:inset-ring-white/10 dark:hover:bg-white/10 dark:hover:text-white dark:active:bg-white/15";

  var ICON_PENCIL =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path d="M2.695 14.762l-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.886L17.5 5.501a2.121 2.121 0 0 0-3-3L3.58 13.419a4 4 0 0 0-.885 1.343Z" /></svg>';
  var ICON_TRASH =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd" /></svg>';

  function asset(name) {
    return ASSETS + name;
  }

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
      var rank = function (user) {
        return isYou(user) ? 2 : user.owner ? 1 : 0;
      };
      users.sort(function (a, b) {
        return rank(b) - rank(a);
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
    return '<span class="inline-flex shrink-0 items-center rounded-full bg-blue-100 px-2.5 py-0.5 type-label-small text-blue-800 dark:bg-blue-400/10 dark:text-blue-400">Me</span>';
  }

  function nameBlock(user) {
    var name = fullName(user);
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

  function rolesBlock(user) {
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
    var edit =
      '<a href="' +
      escapeHtml(profileHref(user)) +
      '" data-tooltip="Edit Profile" aria-label="Edit profile of ' +
      escapeHtml(name) +
      '" class="' +
      GROUP_BUTTON +
      (user.owner ? " rounded-md" : " rounded-l-md") +
      '">' +
      ICON_PENCIL +
      "</a>";
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

  // Sort icon: Figma's double selector (header-sort.svg), drawn inline as two halves on
  // currentColor. Unsorted: both halves light gray, darker on hover. Sorted: the half for the
  // direction (up = ascending, down = descending) turns strong with the label; the other half
  // stays light, so the column and the direction both read without changing the icon.
  var SORT_UP = "M10 3C10.2652 3 10.5196 3.10536 10.7071 3.29289L13.7071 6.29289C14.0976 6.68342 14.0976 7.31658 13.7071 7.70711C13.3166 8.09763 12.6834 8.09763 12.2929 7.70711L10 5.41421L7.70711 7.70711C7.31658 8.09763 6.68342 8.09763 6.29289 7.70711C5.90237 7.31658 5.90237 6.68342 6.29289 6.29289L9.29289 3.29289C9.48043 3.10536 9.73478 3 10 3Z";
  var SORT_DOWN = "M6.29289 12.2929C6.68342 11.9024 7.31658 11.9024 7.70711 12.2929L10 14.5858L12.2929 12.2929C12.6834 11.9024 13.3166 11.9024 13.7071 12.2929C14.0976 12.6834 14.0976 13.3166 13.7071 13.7071L10.7071 16.7071C10.3166 17.0976 9.68342 17.0976 9.29289 16.7071L6.29289 13.7071C5.90237 13.3166 5.90237 12.6834 6.29289 12.2929Z";
  var SORT_IDLE = "text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300";
  var SORT_STRONG = "text-blue-600 dark:text-blue-400";
  var SORT_DIM = "text-gray-300 dark:text-gray-600";

  function sortHeader(key, label) {
    var on = state.sortKey === key;
    var dir = on ? (state.sortDir === "desc" ? "desc" : "asc") : "none";
    var ariaSort = on ? (dir === "desc" ? "descending" : "ascending") : "none";
    var upTone = dir === "none" ? SORT_IDLE : dir === "asc" ? SORT_STRONG : SORT_DIM;
    var downTone = dir === "none" ? SORT_IDLE : dir === "desc" ? SORT_STRONG : SORT_DIM;
    var buttonTone = on
      ? "text-gray-900 dark:text-white"
      : "hover:text-gray-700 dark:hover:text-gray-200";
    return (
      '<th scope="col" aria-sort="' +
      ariaSort +
      '" class="' +
      HEADER_CELL +
      '"><button type="button" data-um-sort="' +
      key +
      '" class="group inline-flex cursor-pointer items-center gap-1 rounded-md uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ' +
      buttonTone +
      '"><span>' +
      label +
      '</span><svg viewBox="0 0 20 20" aria-hidden="true" class="size-5 shrink-0">' +
      '<path fill="currentColor" class="' + upTone + '" d="' + SORT_UP + '"/>' +
      '<path fill="currentColor" class="' + downTone + '" d="' + SORT_DOWN + '"/>' +
      "</svg></button></th>"
    );
  }

  function buildHeader() {
    return (
      "<colgroup><col />" +
      '<col class="w-3/10" />' +
      '<col class="w-28" />' +
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
          '<td data-action-column class="' + CELL + ' bg-white group-hover:bg-gray-50 dark:bg-gray-900 dark:group-hover:bg-gray-800">' + actions(user) + "</td>" +
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

  // ── Pagination (copied from vendors-page.js) ──

  function pageButton(nav, icon, label, disabled) {
    return (
      '<button type="button" data-page-nav="' +
      nav +
      '" aria-label="' +
      label +
      '" class="inline-flex size-[30px] cursor-pointer items-center justify-center rounded-md border border-gray-300 bg-white p-2 shadow-xs hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 dark:disabled:hover:bg-white/5"' +
      (disabled ? " disabled" : "") +
      '><img src="' +
      asset(icon) +
      '" alt="" width="20" height="20" class="max-w-none" /></button>'
    );
  }

  function renderPagination(total) {
    if (!refs.pagination) return;
    var totalPages = getTotalPages(total);
    var start = total ? (state.currentPage - 1) * state.pageSize + 1 : 0;
    var end = Math.min(total, state.currentPage * state.pageSize);
    var isFirst = state.currentPage === 1;
    var isLast = state.currentPage === totalPages;
    refs.pagination.innerHTML =
      '<div class="flex flex-wrap items-center justify-end gap-4 text-sm/5 text-gray-700 dark:text-gray-300">' +
      '<label class="flex items-center gap-4"><span>Rows per page:</span>' +
      '<span class="grid grid-cols-1"><select id="um-page-size" class="col-start-1 row-start-1 h-10 w-[75px] cursor-pointer appearance-none rounded-md bg-white py-2 pr-8 pl-3 text-base text-gray-900 shadow-xs outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:*:bg-gray-800">' +
      PAGE_SIZE_OPTIONS.map(function (size) {
        return (
          '<option value="' +
          size +
          '"' +
          (size === state.pageSize ? " selected" : "") +
          ">" +
          size +
          "</option>"
        );
      }).join("") +
      '</select><img src="' +
      asset("select-chevron.svg") +
      '" alt="" width="20" height="20" class="pointer-events-none col-start-1 row-start-1 mr-3 self-center justify-self-end" /></span></label>' +
      '<p>Showing <span class="font-semibold">' +
      start +
      " - " +
      end +
      '</span> of <span class="font-semibold">' +
      total +
      "</span> results</p>" +
      '<div class="flex gap-2">' +
      pageButton("first", "page-first.svg", "First page", isFirst) +
      pageButton("prev", "page-prev.svg", "Previous page", isFirst) +
      pageButton("next", "page-next.svg", "Next page", isLast) +
      pageButton("last", "page-last.svg", "Last page", isLast) +
      "</div></div>";
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

  // Same principle as Bills/Payables (bills-payables-table.js initStickyAction): when the
  // table overflows its card, the actions column sticks to the right edge with a shadow (no divider line).
  // The edge is a horizontal gradient on each cell (::before), not a box-shadow: a blurred
  // box-shadow fades at every cell's top and bottom, so the column showed a seam on each row.
  var STUCK_CLASSES = [
    "sticky",
    "right-0",
    "z-10",
    "before:pointer-events-none",
    "before:absolute",
    "before:inset-y-0",
    "before:right-full",
    "before:w-6",
    "before:bg-linear-to-l",
    "before:from-black/5",
    "before:to-transparent",
    "dark:before:from-black/20",
  ];
  var stickyBound = false;

  function syncStickyActions() {
    var table = refs.table;
    var scroller = table && table.closest("[data-table-scroll]");
    if (!scroller) return;
    if (!stickyBound) {
      stickyBound = true;
      window.addEventListener("resize", syncStickyActions);
    }
    var overflowing = scroller.scrollWidth - scroller.clientWidth > 0.5;
    table.querySelectorAll("[data-action-column]").forEach(function (cell) {
      STUCK_CLASSES.forEach(function (cls) {
        cell.classList.toggle(cls, overflowing);
      });
    });
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

  function openRemove(userId) {
    var user = window.UMStore.getUser(userId);
    var dialog = document.getElementById("um-remove-dialog");
    if (!user || !dialog) return;
    pendingRemoveId = user.id;
    document.getElementById("um-remove-text").innerHTML =
      'Are you sure you want to Remove User <span class="font-medium text-gray-900 dark:text-white">' +
      escapeHtml(fullName(user)) +
      "</span>?";
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
    if (window.UMStore.removeUser(user.id))
      toast(fullName(user) + " was removed from " + businessName());
    if (dialog) dialog.close();
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
        toast("Inviting users is not in this demo yet.", "info");
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
            "[data-um-remove],[data-um-roles],[data-um-sort],[data-page-nav]",
          )
        : null;
      if (!target || !document.getElementById("um-panel-users").contains(target))
        return;
      if (target.hasAttribute("data-um-remove"))
        return openRemove(target.getAttribute("data-um-remove"));
      if (target.hasAttribute("data-um-roles"))
        return openRoles(target.getAttribute("data-um-roles"));
      if (target.hasAttribute("data-um-sort")) {
        var key = target.getAttribute("data-um-sort");
        // A click on the arrows picks that direction: the upper arrow sorts ascending, the
        // lower one descending; clicking the active arrow again clears the sort.
        var icon = event.target.closest && event.target.closest("svg");
        if (icon && target.contains(icon) && event.detail > 0) {
          var box = icon.getBoundingClientRect();
          var picked = event.clientY < box.top + box.height / 2 ? "asc" : "desc";
          if (state.sortKey === key && state.sortDir === picked) {
            state.sortKey = state.sortDir = "";
          } else {
            state.sortKey = key;
            state.sortDir = picked;
          }
        }
        // A click on the label (or Enter / Space): asc → desc → unsorted, like the Vendors table.
        else if (state.sortKey !== key) {
          state.sortKey = key;
          state.sortDir = "asc";
        } else if (state.sortDir === "asc") state.sortDir = "desc";
        else state.sortKey = state.sortDir = "";
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
    window.UMStore.onChange(UI.syncTopbar);
    window.UMStore.load()
      .then(function () {
        state.loaded = true;
        UI.syncTopbar();
        // Figma 6.5: a member can't invite users.
        var addUser = document.getElementById("um-add-user");
        if (addUser) addUser.hidden = !isAdmin();
        render();
      })
      .catch(function () {
        refs.cards.innerHTML = refs.table.innerHTML = "";
        toast("Users could not be loaded. Reload the page to try again.", "info");
      });
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();

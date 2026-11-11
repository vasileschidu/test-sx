/**
 * um-ui.js
 * Markup shared by the User Management pages (user-management.js, user-profile.js):
 *   UMUi.escapeHtml(v), .fullName(user), .initials(user), .roleNames(user)
 *   UMUi.avatar(user, { size, text })  photo (path under src/ or data URL) or initials
 *                                      on a solid colour (Figma 6.0)
 *   UMUi.statusBadge(user)             pill with a leading icon: Active / Inactive / Invitation Sent /
 *                                      Expired / Requires Action (UMStore.getUserStatus)
 *   UMUi.withViewer(href)              keeps ?as=member on links between UM pages
 *   UMUi.table                         table pieces shared by Users and Roles: cell classes, row-action
 *                                      button + icons, sortHeader / nextSort, pagination, syncSticky
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
    // Figma 6.9i: blue pill with a dashed circle.
    invited: {
      label: "Invitation Sent",
      icon: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 2" aria-hidden="true" class="size-3.5 shrink-0"><circle cx="8" cy="8" r="6" /></svg>',
      cls: "bg-blue-100 text-blue-800 dark:bg-blue-400/10 dark:text-blue-400",
      iconCls: "text-blue-500 dark:text-blue-400",
    },
    expired: {
      label: "Expired",
      icon: ICON_CLOCK,
      cls: "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300",
      iconCls: "text-gray-500 dark:text-gray-400",
    },
    revoked: {
      label: "Revoked",
      icon: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="size-3.5 shrink-0"><path fill-rule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm2.78-4.22a.75.75 0 0 1-1.06 0L8 9.06l-1.72 1.72a.75.75 0 1 1-1.06-1.06L6.94 8 5.22 6.28a.75.75 0 0 1 1.06-1.06L8 6.94l1.72-1.72a.75.75 0 1 1 1.06 1.06L9.06 8l1.72 1.72a.75.75 0 0 1 0 1.06Z" clip-rule="evenodd" /></svg>',
      cls: "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300",
      iconCls: "text-gray-500 dark:text-gray-400",
    },
    "requires-action": {
      label: "Requires Action",
      icon: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="size-3.5 shrink-0"><path fill-rule="evenodd" d="M6.701 2.25c.577-1 2.02-1 2.598 0l5.196 9a1.5 1.5 0 0 1-1.299 2.25H2.804a1.5 1.5 0 0 1-1.3-2.25l5.197-9ZM8 4a.75.75 0 0 1 .75.75v3a.75.75 0 1 1-1.5 0v-3A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd" /></svg>',
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

  /** The name a list shows: "-" for people added without a name (Figma 6.9i Requires Action). */
  function displayName(user) {
    return fullName(user) || "-";
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
    // No name yet (Requires Action): gray placeholder person, as in Figma 6.9i.
    if (!user.photo && !initials(user))
      return (
        '<span aria-hidden="true" class="flex ' +
        size +
        ' shrink-0 overflow-hidden rounded-full bg-gray-100 text-gray-300 dark:bg-white/10 dark:text-gray-600"><svg viewBox="0 0 24 24" fill="currentColor" class="size-full"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg></span>'
      );
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
    var key = window.UMStore ? window.UMStore.getUserStatus(user) : user.status;
    var status = STATUS[key] || STATUS.inactive;
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


  // ── Table pieces shared by the Users and Roles tables (UMUi.table) ──
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

  var SORT_UP = "M10 3C10.2652 3 10.5196 3.10536 10.7071 3.29289L13.7071 6.29289C14.0976 6.68342 14.0976 7.31658 13.7071 7.70711C13.3166 8.09763 12.6834 8.09763 12.2929 7.70711L10 5.41421L7.70711 7.70711C7.31658 8.09763 6.68342 8.09763 6.29289 7.70711C5.90237 7.31658 5.90237 6.68342 6.29289 6.29289L9.29289 3.29289C9.48043 3.10536 9.73478 3 10 3Z";
  var SORT_DOWN = "M6.29289 12.2929C6.68342 11.9024 7.31658 11.9024 7.70711 12.2929L10 14.5858L12.2929 12.2929C12.6834 11.9024 13.3166 11.9024 13.7071 12.2929C14.0976 12.6834 14.0976 13.3166 13.7071 13.7071L10.7071 16.7071C10.3166 17.0976 9.68342 17.0976 9.29289 16.7071L6.29289 13.7071C5.90237 13.3166 5.90237 12.6834 6.29289 12.2929Z";
  var SORT_IDLE = "text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300";
  var SORT_STRONG = "text-blue-600 dark:text-blue-400";
  var SORT_DIM = "text-gray-300 dark:text-gray-600";

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

  var PAGE_SIZE_OPTIONS = [10, 25, 50];
  var VENDOR_ASSETS = "../../../src/assets/vendors/";

  /** Sort header cell: Figma's double selector; `attr` is the button's data attribute (data-um-sort…). */
  function sortHeader(key, label, sortKey, sortDir, attr) {
    var on = sortKey === key;
    var dir = on ? (sortDir === "desc" ? "desc" : "asc") : "none";
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
      '"><button type="button" ' +
      (attr || "data-um-sort") +
      '="' +
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

  /** Next { key, dir } after a click on a sort header: the upper arrow = asc, the lower = desc,
   *  the active arrow again = off; the label / keyboard cycles asc → desc → off. */
  function nextSort(event, button, key, sortKey, sortDir) {
    var icon = event.target.closest && event.target.closest("svg");
    if (icon && button.contains(icon) && event.detail > 0) {
      var box = icon.getBoundingClientRect();
      var picked = event.clientY < box.top + box.height / 2 ? "asc" : "desc";
      return sortKey === key && sortDir === picked ? { key: "", dir: "" } : { key: key, dir: picked };
    }
    if (sortKey !== key) return { key: key, dir: "asc" };
    if (sortDir === "asc") return { key: key, dir: "desc" };
    return { key: "", dir: "" };
  }

  function pageButton(nav, icon, label, disabled) {
    return (
      '<button type="button" data-page-nav="' +
      nav +
      '" aria-label="' +
      label +
      '" class="inline-flex size-[30px] cursor-pointer items-center justify-center rounded-md border border-gray-300 bg-white p-2 shadow-xs hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 dark:disabled:hover:bg-white/5"' +
      (disabled ? " disabled" : "") +
      '><img src="' +
      VENDOR_ASSETS +
      icon +
      '" alt="" width="20" height="20" class="max-w-none" /></button>'
    );
  }

  /** Pagination row (copied from vendors-page.js). opts: { page, pageSize, total, sizeId }. */
  function pagination(opts) {
    var totalPages = Math.max(1, Math.ceil(opts.total / opts.pageSize));
    var start = opts.total ? (opts.page - 1) * opts.pageSize + 1 : 0;
    var end = Math.min(opts.total, opts.page * opts.pageSize);
    var isFirst = opts.page === 1;
    var isLast = opts.page === totalPages;
    return (
      '<div class="flex flex-wrap items-center justify-end gap-4 text-sm/5 text-gray-700 dark:text-gray-300">' +
      '<label class="flex items-center gap-4"><span>Rows per page:</span>' +
      '<span class="grid grid-cols-1"><select id="' +
      opts.sizeId +
      '" class="col-start-1 row-start-1 h-10 w-[75px] cursor-pointer appearance-none rounded-md bg-white py-2 pr-8 pl-3 text-base text-gray-900 shadow-xs outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:*:bg-gray-800">' +
      PAGE_SIZE_OPTIONS.map(function (size) {
        return '<option value="' + size + '"' + (size === opts.pageSize ? " selected" : "") + ">" + size + "</option>";
      }).join("") +
      '</select><img src="' +
      VENDOR_ASSETS +
      'select-chevron.svg" alt="" width="20" height="20" class="pointer-events-none col-start-1 row-start-1 mr-3 self-center justify-self-end" /></span></label>' +
      '<p>Showing <span class="font-semibold">' +
      start +
      " - " +
      end +
      '</span> of <span class="font-semibold">' +
      opts.total +
      "</span> results</p>" +
      '<div class="flex gap-2">' +
      pageButton("first", "page-first.svg", "First page", isFirst) +
      pageButton("prev", "page-prev.svg", "Previous page", isFirst) +
      pageButton("next", "page-next.svg", "Next page", isLast) +
      pageButton("last", "page-last.svg", "Last page", isLast) +
      "</div></div>"
    );
  }

  /** Pinned actions column: sticky + edge gradient only while the table overflows its card. */
  function syncSticky(table) {
    var scroller = table && table.closest("[data-table-scroll]");
    if (!scroller) return;
    var overflowing = scroller.scrollWidth - scroller.clientWidth > 0.5;
    table.querySelectorAll("[data-action-column]").forEach(function (cell) {
      STUCK_CLASSES.forEach(function (cls) {
        cell.classList.toggle(cls, overflowing);
      });
    });
  }

  var table = {
    HEADER_CELL: HEADER_CELL,
    CELL: CELL,
    GROUP_BUTTON: GROUP_BUTTON,
    ICON_PENCIL: ICON_PENCIL,
    ICON_TRASH: ICON_TRASH,
    sortHeader: sortHeader,
    nextSort: nextSort,
    pagination: pagination,
    syncSticky: syncSticky,
  };

  return {
    table: table,
    escapeHtml: escapeHtml,
    fullName: fullName,
    displayName: displayName,
    initials: initials,
    roleNames: roleNames,
    avatar: avatar,
    photoSrc: photoSrc,
    statusBadge: statusBadge,
    withViewer: withViewer,
  };
})();

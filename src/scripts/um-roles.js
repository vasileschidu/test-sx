/**
 * um-roles.js
 * Roles tab of User Management (Figma [REVIEW] User Management, section 4. Roles, 7.01–7.13).
 *   List (7.01 / 7.06): Role Name (sortable), Application, Description (2 lines), actions
 *     edit · delete · ⋮ (Edit, Duplicate, Delete — 7.11); newest role first.
 *   Form (7.02–7.04, 7.07–7.09, 7.12–7.13), in place of the list: Select Preset (prefills the
 *     permissions of an existing role), Role Information, Permissions accordion with
 *     Select All / Deselect All / Remove Selection and toggle chips (+ gray / × blue) with a
 *     description tooltip. Create → "Role Created" (7.05); Save → toast.
 *   Delete: destructive confirm; a role somebody holds is blocked ("Role in Use" → Show Users).
 *   Member view (?as=member): read-only list.
 * API: UMRoles.openCreate({ onCreated(role), onCancel(), returnLabel }) / openEdit(id) — used by
 * "+ Create Role" in the invite dialog (um-invite.js). Shared table pieces: UMUi.table.
 */
window.UMRoles = (function () {
  "use strict";

  var UI = window.UMUi;
  var T = UI.table;
  var esc = UI.escapeHtml;
  var DEFAULT_PAGE_SIZE = 10;

  var state = {
    search: "",
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    sortKey: "",
    sortDir: "",
    loaded: false,
  };
  // Form state.
  var form = {
    mode: "create", // "create" | "edit"
    editId: null,
    presetId: null,
    selected: {},
    expanded: {},
    flow: null, // { onCreated, onCancel, returnLabel } when opened from the invite dialog
  };
  var refs = {};
  var pendingDelete = null;

  var ICON_MORE =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path d="M10 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM11.5 15.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0Z" /></svg>';
  var ICON_PLUS =
    '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="size-3.5 shrink-0 text-gray-400 dark:text-gray-500"><path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" /></svg>';
  var ICON_X =
    '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="size-3.5 shrink-0 text-blue-500 dark:text-blue-400"><path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" /></svg>';
  var ICON_CHEVRON =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 shrink-0 text-gray-400 transition-transform group-aria-expanded:-rotate-90 dark:text-gray-500"><path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>';
  var ICON_CHECK =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 shrink-0 text-blue-600 dark:text-blue-400"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" /></svg>';
  var LINK_BLUE =
    "cursor-pointer rounded-md type-body text-blue-600 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-blue-400 dark:hover:text-blue-300";
  var LINK_RED =
    "cursor-pointer rounded-md type-body text-red-600 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-red-400 dark:hover:text-red-300";
  // Row ⋮ menu items: the Vendors row-menu style (vendors-page.js) — text-sm/5 gray-900, 20px icon, hover gray-50.
  var MENU_ITEM_BASE =
    "flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left text-sm/5 font-medium whitespace-nowrap hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none dark:hover:bg-white/5 dark:focus-visible:bg-white/5";
  var MENU_ITEM = MENU_ITEM_BASE + " text-gray-900 dark:text-white";
  var MENU_ITEM_DANGER = MENU_ITEM_BASE + " text-red-600 dark:text-red-400";
  // Heroicons v2 mini (20, solid) — same pencil / trash as the row buttons (Figma 7.11).
  var MENU_ICON_EDIT =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 shrink-0 text-gray-500 dark:text-gray-400"><path d="M2.695 14.762l-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.886L17.5 5.501a2.121 2.121 0 0 0-3-3L3.58 13.419a4 4 0 0 0-.885 1.343Z" /></svg>';
  // Heroicons v2 mini (20, solid) — same pencil / trash as the row buttons (Figma 7.11).
  var MENU_ICON_DUPLICATE =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 shrink-0 text-gray-500 dark:text-gray-400"><path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z" /><path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z" /></svg>';
  // Heroicons v2 mini (20, solid) — same pencil / trash as the row buttons (Figma 7.11).
  var MENU_ICON_DELETE =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 shrink-0 text-red-600 dark:text-red-400"><path fill-rule="evenodd" clip-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" /></svg>';

  function toast(message, tone) {
    if (typeof window.showGlobalTopToast === "function")
      window.showGlobalTopToast(message, tone ? { tone: tone } : undefined);
  }

  function isAdmin() {
    return window.UMStore.getViewer().isAdmin;
  }

  function store() {
    return window.UMStore;
  }

  // ── List ──

  function getFilteredRoles() {
    var roles = store().getRoles();
    if (state.sortKey) {
      var dir = state.sortDir === "desc" ? -1 : 1;
      roles.sort(function (a, b) {
        return a.name.localeCompare(b.name) * dir;
      });
    } else {
      // Newest first (7.06); seeded roles keep their order after the created ones.
      roles = roles
        .map(function (role, i) {
          return { role: role, i: i };
        })
        .sort(function (a, b) {
          var at = a.role.createdAt || "";
          var bt = b.role.createdAt || "";
          if (at !== bt) return at < bt ? 1 : -1;
          return a.i - b.i;
        })
        .map(function (x) {
          return x.role;
        });
    }
    var query = state.search.trim().toLowerCase();
    if (!query) return roles;
    return roles.filter(function (role) {
      return [role.name, role.description, role.apps].join(" ").toLowerCase().indexOf(query) !== -1;
    });
  }

  function appsOf(role) {
    return role.apps || store().roleApps(role.permissionIds);
  }

  function actions(role) {
    if (!isAdmin()) return "";
    var name = esc(role.name);
    return (
      '<div class="flex justify-end"><span class="isolate inline-flex rounded-md shadow-xs dark:shadow-none">' +
      '<button type="button" data-umr-edit="' + esc(role.id) + '" data-tooltip="Edit" aria-label="Edit ' + name + '" class="' + T.GROUP_BUTTON + ' rounded-l-md">' + T.ICON_PENCIL + "</button>" +
      '<button type="button" data-umr-delete="' + esc(role.id) + '" data-tooltip="Delete" aria-label="Delete ' + name + '" class="' + T.GROUP_BUTTON + ' -ml-px">' + T.ICON_TRASH + "</button>" +
      '<el-dropdown class="-ml-px inline-flex">' +
      '<button type="button" data-tooltip="More" aria-label="More actions for ' + name + '" class="' + T.GROUP_BUTTON + ' rounded-r-md aria-expanded:z-10 aria-expanded:outline-2 aria-expanded:outline-offset-2 aria-expanded:outline-blue-600">' + ICON_MORE + "</button>" +
      '<el-menu anchor="bottom end" popover class="min-w-44 origin-top-right overflow-hidden rounded-md bg-white py-1 shadow-lg outline-1 outline-black/5 transition [--anchor-gap:--spacing(1)] data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in dark:bg-gray-800 dark:-outline-offset-1 dark:outline-white/10">' +
      '<button type="button" role="menuitem" data-umr-edit="' + esc(role.id) + '" class="' + MENU_ITEM + '">' + MENU_ICON_EDIT + "Edit</button>" +
      '<button type="button" role="menuitem" data-umr-duplicate="' + esc(role.id) + '" class="' + MENU_ITEM + '">' + MENU_ICON_DUPLICATE + "Duplicate</button>" +
      '<button type="button" role="menuitem" data-umr-delete="' + esc(role.id) + '" class="' + MENU_ITEM_DANGER + '">' + MENU_ICON_DELETE + "Delete</button>" +
      "</el-menu></el-dropdown>" +
      "</span></div>"
    );
  }

  function description(role) {
    var text = role.description || "";
    return text
      ? '<p class="line-clamp-2 type-body text-default" title="' + esc(text) + '">' + esc(text) + "</p>"
      : ""; // no description: the cell stays empty (no dash)
  }

  function buildHeader() {
    return (
      "<colgroup>" +
      '<col class="w-1/4" />' +
      '<col class="w-1/5" />' +
      "<col />" +
      (isAdmin() ? '<col class="w-32" />' : "") +
      "</colgroup><thead><tr>" +
      T.sortHeader("name", "Role Name", state.sortKey, state.sortDir, "data-umr-sort") +
      '<th scope="col" class="' + T.HEADER_CELL + '">Application</th>' +
      '<th scope="col" class="' + T.HEADER_CELL + '">Description</th>' +
      (isAdmin()
        ? '<th scope="col" data-action-column class="' + T.HEADER_CELL + ' bg-white text-right dark:bg-gray-900"><span class="sr-only">Actions</span></th>'
        : "") +
      "</tr></thead>"
    );
  }

  function buildRows(roles) {
    return roles
      .map(function (role) {
        return (
          '<tr data-umr-row="' + esc(role.id) + '" class="group bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-white/5">' +
          '<td class="' + T.CELL + '"><span class="block truncate type-label text-default" title="' + esc(role.name) + '">' + esc(role.name) + "</span></td>" +
          '<td class="' + T.CELL + '"><span class="type-caption text-secondary">' + esc(appsOf(role)) + "</span></td>" +
          '<td class="' + T.CELL + '">' + description(role) + "</td>" +
          (isAdmin()
            ? '<td data-action-column class="' + T.CELL + ' bg-white group-hover:bg-gray-50 dark:bg-gray-900 dark:group-hover:bg-gray-900 dark:group-hover:bg-linear-to-r dark:group-hover:from-white/5 dark:group-hover:to-white/5">' + actions(role) + "</td>"
            : "") +
          "</tr>"
        );
      })
      .join("");
  }

  function buildCards(roles) {
    return roles
      .map(function (role) {
        return (
          '<li data-umr-row="' + esc(role.id) + '" class="flex flex-col gap-2 py-4">' +
          '<div class="flex items-start justify-between gap-3"><div class="flex min-w-0 flex-col gap-0.5">' +
          '<span class="truncate type-label text-default">' + esc(role.name) + "</span>" +
          '<span class="type-caption text-secondary">' + esc(appsOf(role)) + "</span></div>" +
          actions(role) +
          "</div>" +
          description(role) +
          "</li>"
        );
      })
      .join("");
  }

  function emptyState(tag) {
    var box =
      '<div class="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center dark:border-white/10 dark:bg-white/5"><h3 class="type-title-small text-default">No roles found</h3><p class="mt-1 type-description text-tertiary">Try another name or description.</p></div>';
    return tag === "tr"
      ? '<tr><td colspan="4" class="px-0 py-6">' + box + "</td></tr>"
      : '<li class="py-6">' + box + "</li>";
  }

  function renderList() {
    if (!state.loaded) return;
    var all = getFilteredRoles();
    var totalPages = Math.max(1, Math.ceil(all.length / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    var start = (state.page - 1) * state.pageSize;
    var page = all.slice(start, start + state.pageSize);
    var count = store().getRoles().length;
    refs.count.textContent = count + (count === 1 ? " Role" : " Roles");
    refs.table.innerHTML = buildHeader() + "<tbody>" + (page.length ? buildRows(page) : emptyState("tr")) + "</tbody>";
    T.syncSticky(refs.table);
    refs.cards.innerHTML = page.length ? buildCards(page) : emptyState("li");
    refs.pagination.innerHTML = T.pagination({ page: state.page, pageSize: state.pageSize, total: all.length, sizeId: "um-roles-page-size" });
    refs.create.hidden = !isAdmin();
  }

  // ── Form ──

  function categories() {
    return store().getPermissionCategories();
  }

  function selectedIds() {
    return Object.keys(form.selected).filter(function (id) {
      return form.selected[id];
    });
  }

  function groupLinks(cat) {
    var total = cat.permissions.length;
    var on = cat.permissions.filter(function (p) {
      return form.selected[p.id];
    }).length;
    var id = esc(cat.id);
    var label = esc(cat.name);
    // 7.02 none → Select All · 7.09 all → Deselect All (red) · 7.13 some → Select All + Remove Selection.
    if (on === total)
      return '<button type="button" data-umr-group-none="' + id + '" class="' + LINK_RED + '">Deselect All<span class="sr-only"> in ' + label + "</span></button>";
    var select = '<button type="button" data-umr-group-all="' + id + '" class="' + LINK_BLUE + '">Select All<span class="sr-only"> in ' + label + "</span></button>";
    if (!on) return select;
    return select + '<button type="button" data-umr-group-none="' + id + '" class="' + LINK_RED + '">Remove Selection<span class="sr-only"> in ' + label + "</span></button>";
  }

  function chip(p) {
    var on = !!form.selected[p.id];
    return (
      '<li><button type="button" data-umr-perm="' + esc(p.id) + '" aria-pressed="' + on + '" data-tooltip="' + esc(p.description || p.name) + '" data-tooltip-side="top" class="inline-flex cursor-pointer items-center gap-1 rounded-full text-left py-0.5 pr-2.5 pl-2 type-body focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 ' +
      (on
        ? "bg-blue-100 text-blue-800 hover:bg-blue-200 active:bg-blue-300 dark:bg-blue-400/15 dark:text-blue-300 dark:hover:bg-blue-400/25 dark:active:bg-blue-400/30"
        : "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/15 dark:active:bg-white/20") +
      '">' + (on ? ICON_X : ICON_PLUS) + esc(p.name) + "</button></li>"
    );
  }

  function renderGroups() {
    refs.groups.innerHTML = categories()
      .map(function (cat) {
        var open = !!form.expanded[cat.id];
        var panel = "umr-perm-" + cat.id;
        return (
          '<div class="border-b border-gray-200 dark:border-white/10">' +
          // The whole row is the hover / click target (the links keep their own action).
          '<div data-umr-row="' + esc(cat.id) + '" class="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 px-2 py-3 hover:bg-gray-50 sm:flex-nowrap dark:hover:bg-white/5' + (open ? " bg-gray-50 dark:bg-white/5" : "") + '">' +
          '<button type="button" data-umr-toggle="' + esc(cat.id) + '" aria-expanded="' + open + '" aria-controls="' + panel + '" class="group -mx-2 flex min-w-0 cursor-pointer items-center gap-3 rounded-md px-2 py-1 text-left text-default focus-visible:outline-2 focus-visible:outline-blue-600">' +
          ICON_CHEVRON +
          '<span class="text-base/6 font-medium text-default">' + esc(cat.name) + "</span>" +
          '<span class="type-caption text-tertiary">' + esc(cat.app) + "</span></button>" +
          '<span aria-hidden="true" class="hidden h-6 w-px bg-gray-200 sm:block dark:bg-white/10"></span>' +
          '<div class="flex items-center gap-4">' + groupLinks(cat) + "</div>" +
          "</div>" +
          '<ul id="' + panel + '" role="list" aria-label="' + esc(cat.name) + ' permissions" class="flex flex-wrap gap-2 px-2 pt-4 pb-6"' + (open ? "" : " hidden") + ">" +
          cat.permissions.map(chip).join("") +
          "</ul></div>"
        );
      })
      .join("");
  }

  function presetMenu() {
    // "No preset" (first item) clears the preset and its permissions, back to an empty selection.
    var none = !form.presetId;
    refs.presetMenu.innerHTML =
      '<button type="button" data-umr-preset="" class="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-left text-sm text-gray-500 focus:bg-gray-100 focus:outline-hidden dark:text-gray-400 dark:focus:bg-white/5' + (none ? " font-semibold text-gray-900 dark:text-white" : "") + '">' +
      '<span class="truncate">No preset</span>' + (none ? ICON_CHECK : "") + "</button>" +
      store()
      .getRoles()
      .map(function (role) {
        var on = role.id === form.presetId;
        return (
          '<button type="button" data-umr-preset="' + esc(role.id) + '" class="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-left text-sm text-gray-900 focus:bg-gray-100 focus:outline-hidden dark:text-white dark:focus:bg-white/5' + (on ? " font-semibold" : "") + '">' +
          '<span class="truncate">' + esc(role.name) + "</span>" + (on ? ICON_CHECK : "") + "</button>"
        );
      })
      .join("");
    var role = form.presetId && store().getRole(form.presetId);
    refs.presetLabel.innerHTML = role
      ? 'Preset: <span class="font-semibold text-default">' + esc(role.name) + "</span>"
      : "Select Preset";
  }

  function setNameError(message) {
    window.OBField.setError(refs.name, !!message, document.getElementById("umr-name-error"), message);
  }

  function setPermError(message) {
    var p = document.getElementById("umr-perm-error");
    p.textContent = message || "";
    p.classList.toggle("hidden", !message);
  }

  function showForm(values) {
    form.selected = {};
    (values.permissionIds || []).forEach(function (id) {
      form.selected[id] = true;
    });
    form.expanded = {};
    form.presetId = values.presetId || null;
    refs.name.value = values.name || "";
    refs.description.value = values.description || "";
    setNameError("");
    setPermError("");
    refs.title.textContent = form.mode === "edit" ? "Edit Role" : "Create Role";
    refs.submit.textContent = form.mode === "edit" ? "Save" : "Create";
    renderGroups();
    presetMenu();
    refs.list.hidden = true;
    refs.form.hidden = false;
    selectRolesTab();
    window.scrollTo({ top: 0 });
    refs.name.focus({ preventScroll: true });
  }

  function showList(focusSelector) {
    refs.form.hidden = true;
    refs.list.hidden = false;
    form.flow = null;
    renderList();
    var target = focusSelector && document.querySelector(focusSelector);
    if (target) target.focus();
  }

  function selectRolesTab() {
    var tab = document.getElementById("um-tab-roles");
    if (tab && tab.getAttribute("aria-selected") !== "true") tab.click();
  }

  function selectUsersTab() {
    var tab = document.getElementById("um-tab-users");
    if (tab && tab.getAttribute("aria-selected") !== "true") tab.click();
  }

  function openCreate(flow) {
    if (!isAdmin()) return;
    form.mode = "create";
    form.editId = null;
    form.flow = flow || null;
    showForm({});
  }

  function openEdit(id) {
    var role = store().getRole(id);
    if (!role || !isAdmin()) return;
    form.mode = "edit";
    form.editId = id;
    form.flow = null;
    showForm({ name: role.name, description: role.description, permissionIds: role.permissionIds });
  }

  /** 7.12: the copy is called "<name> (duplicate n)" and starts from the original's permissions. */
  function openDuplicate(id) {
    var role = store().getRole(id);
    if (!role) return;
    var n = 1;
    while (store().isRoleNameTaken(role.name + " (duplicate " + n + ")")) n += 1;
    form.mode = "create";
    form.editId = null;
    form.flow = null;
    showForm({
      name: role.name + " (duplicate " + n + ")",
      description: role.description,
      permissionIds: role.permissionIds,
      presetId: role.id,
    });
  }

  function applyPreset(id) {
    if (!id) {
      form.presetId = null;
      form.selected = {};
      renderGroups();
      presetMenu();
      return;
    }
    var role = store().getRole(id);
    if (!role) return;
    form.presetId = id;
    form.selected = {};
    role.permissionIds.forEach(function (p) {
      form.selected[p] = true;
    });
    setPermError("");
    renderGroups();
    presetMenu();
  }

  function nameMessage() {
    var value = refs.name.value.trim();
    if (!value) return "Role Name is Required";
    if (store().isRoleNameTaken(value, form.mode === "edit" ? form.editId : null)) return "A role with this name already exists";
    return "";
  }

  function submit(event) {
    event.preventDefault();
    var nameError = nameMessage();
    var permError = selectedIds().length ? "" : "Select at least one permission";
    setNameError(nameError);
    setPermError(permError);
    if (nameError) return refs.name.focus();
    if (permError) {
      var first = refs.groups.querySelector("[data-umr-toggle]");
      return first && first.focus();
    }
    var data = { name: refs.name.value, description: refs.description.value, permissionIds: selectedIds() };
    if (form.mode === "edit") {
      var updated = store().updateRole(form.editId, data);
      if (updated.error) return setNameError(nameMessage());
      toast("Changes to " + updated.name + " saved.");
      showList('[data-umr-row="' + form.editId + '"] [data-umr-edit]');
      return;
    }
    var role = store().createRole(data);
    if (role.error) return setNameError(nameMessage());
    var flow = form.flow;
    showList();
    showCreated(role, flow);
  }

  function showCreated(role, flow) {
    var dialog = document.getElementById("um-role-created-dialog");
    document.getElementById("umrc-text").innerHTML =
      '<span class="font-medium text-gray-900 dark:text-white">' + esc(role.name) + "</span> role has been created. You can now assign it to your users.";
    var done = document.getElementById("umrc-done");
    done.textContent = (flow && flow.returnLabel) || "Done";
    dialog.addEventListener(
      "close",
      function () {
        // Opened from the invite: back to it, with the new role ticked.
        if (flow && typeof flow.onCreated === "function") {
          selectUsersTab();
          flow.onCreated(role);
        }
      },
      { once: true },
    );
    dialog.showModal();
  }

  function cancel() {
    var flow = form.flow;
    var editId = form.editId;
    showList(editId ? '[data-umr-row="' + editId + '"] [data-umr-edit]' : "#um-create-role");
    if (flow && typeof flow.onCancel === "function") {
      selectUsersTab();
      flow.onCancel();
    }
  }

  // ── Delete ──

  function openDelete(id) {
    var role = store().getRole(id);
    if (!role) return;
    var dialog = document.getElementById("um-role-delete-dialog");
    var count = store().getRoleUsage(id);
    var icon = dialog.querySelector("svg.size-11");
    var confirm = document.getElementById("umrd-confirm");
    var name = '<span class="font-medium text-gray-900 dark:text-white">' + esc(role.name) + "</span>";
    pendingDelete = { id: id, blocked: count > 0, name: role.name };
    icon.classList.toggle("text-red-600", !count);
    icon.classList.toggle("dark:text-red-500", !count);
    icon.classList.toggle("text-amber-500", !!count);
    icon.classList.toggle("dark:text-amber-400", !!count);
    if (count) {
      document.getElementById("umrd-title").textContent = "Role in Use";
      document.getElementById("umrd-text").innerHTML =
        name + " is assigned to " + count + (count === 1 ? " user" : " users") + ". Give them another role before you delete it.";
      confirm.textContent = "Show Users";
      confirm.className = confirm.className
        .replace(/bg-red-600/g, "bg-blue-600").replace(/hover:bg-red-500/g, "hover:bg-blue-500").replace(/active:bg-red-700/g, "active:bg-blue-700")
        .replace(/focus-visible:outline-red-600/g, "focus-visible:outline-blue-600").replace(/dark:bg-red-500/g, "dark:bg-blue-500").replace(/dark:hover:bg-red-400/g, "dark:hover:bg-blue-400");
    } else {
      document.getElementById("umrd-title").textContent = "Delete Role";
      document.getElementById("umrd-text").innerHTML = "Are you sure you want to delete the role " + name + "? This can’t be undone.";
      confirm.textContent = "Delete";
      confirm.className = confirm.className
        .replace(/bg-blue-600/g, "bg-red-600").replace(/hover:bg-blue-500/g, "hover:bg-red-500").replace(/active:bg-blue-700/g, "active:bg-red-700")
        .replace(/focus-visible:outline-blue-600/g, "focus-visible:outline-red-600").replace(/dark:bg-blue-500/g, "dark:bg-red-500").replace(/dark:hover:bg-blue-400/g, "dark:hover:bg-red-400");
    }
    dialog.showModal();
  }

  function confirmDelete() {
    var dialog = document.getElementById("um-role-delete-dialog");
    var job = pendingDelete;
    pendingDelete = null;
    if (!job) return dialog.close();
    dialog.addEventListener(
      "close",
      function () {
        setTimeout(function () {
          if (job.blocked) {
            // Show who holds the role: Users tab, searched by the role name.
            selectUsersTab();
            var search = document.getElementById("um-search");
            if (search) {
              search.value = job.name;
              search.dispatchEvent(new Event("input", { bubbles: true }));
              search.focus();
            }
          } else refs.search.focus();
        }, 0);
      },
      { once: true },
    );
    if (!job.blocked) {
      var result = store().deleteRole(job.id);
      if (result.ok) toast(job.name + " was deleted");
    }
    dialog.close();
  }

  // ── Events ──

  function bind() {
    refs.search.addEventListener("input", function () {
      state.search = refs.search.value;
      state.page = 1;
      renderList();
    });
    refs.create.addEventListener("click", function () {
      openCreate();
    });
    document.getElementById("umrd-confirm").addEventListener("click", confirmDelete);
    document.addEventListener("change", function (event) {
      if (event.target && event.target.id === "um-roles-page-size") {
        state.pageSize = Number(event.target.value) || DEFAULT_PAGE_SIZE;
        state.page = 1;
        renderList();
      }
    });
    refs.list.addEventListener("click", function (event) {
      var t = event.target.closest("[data-umr-edit],[data-umr-delete],[data-umr-duplicate],[data-umr-sort],[data-page-nav]");
      if (!t) return;
      if (t.hasAttribute("data-umr-edit")) return openEdit(t.getAttribute("data-umr-edit"));
      if (t.hasAttribute("data-umr-delete")) return openDelete(t.getAttribute("data-umr-delete"));
      if (t.hasAttribute("data-umr-duplicate")) return openDuplicate(t.getAttribute("data-umr-duplicate"));
      if (t.hasAttribute("data-umr-sort")) {
        var next = T.nextSort(event, t, "name", state.sortKey, state.sortDir);
        state.sortKey = next.key;
        state.sortDir = next.dir;
        renderList();
        var again = refs.table.querySelector("[data-umr-sort]");
        if (again) again.focus();
        return;
      }
      var nav = t.getAttribute("data-page-nav");
      var total = Math.max(1, Math.ceil(getFilteredRoles().length / state.pageSize));
      if (nav === "first") state.page = 1;
      if (nav === "prev") state.page = Math.max(1, state.page - 1);
      if (nav === "next") state.page = Math.min(total, state.page + 1);
      if (nav === "last") state.page = total;
      renderList();
      var focus = refs.pagination.querySelector('[data-page-nav="' + nav + '"]');
      if (focus && !focus.disabled) focus.focus();
    });

    refs.form.addEventListener("submit", submit);
    document.getElementById("umr-cancel").addEventListener("click", cancel);
    // Back arrow next to the title = Cancel (back to the list, or to the invite it came from).
    document.getElementById("umr-back").addEventListener("click", cancel);
    refs.name.addEventListener("input", function () {
      if (refs.name.getAttribute("aria-invalid") === "true") setNameError(nameMessage());
    });
    refs.presetMenu.addEventListener("click", function (event) {
      var item = event.target.closest("[data-umr-preset]");
      if (item) applyPreset(item.getAttribute("data-umr-preset") || null);
    });
    refs.groups.addEventListener("click", function (event) {
      var t = event.target.closest("[data-umr-toggle],[data-umr-group-all],[data-umr-group-none],[data-umr-perm]");
      if (!t) {
        var row = event.target.closest("[data-umr-row]");
        if (row) t = row.querySelector("[data-umr-toggle]");
      }
      if (!t) return;
      var focusSel = null;
      if (t.hasAttribute("data-umr-toggle")) {
        var gid = t.getAttribute("data-umr-toggle");
        form.expanded[gid] = !form.expanded[gid];
        focusSel = '[data-umr-toggle="' + gid + '"]';
      } else if (t.hasAttribute("data-umr-perm")) {
        var pid = t.getAttribute("data-umr-perm");
        form.selected[pid] = !form.selected[pid];
        focusSel = '[data-umr-perm="' + pid + '"]';
      } else {
        var all = t.hasAttribute("data-umr-group-all");
        var cid = t.getAttribute(all ? "data-umr-group-all" : "data-umr-group-none");
        var cat = categories().filter(function (c) {
          return c.id === cid;
        })[0];
        cat.permissions.forEach(function (p) {
          form.selected[p.id] = all;
        });
        // Selecting opens the group so the change is visible.
        if (all) form.expanded[cid] = true;
        focusSel = '[data-umr-toggle="' + cid + '"]';
      }
      if (selectedIds().length) setPermError("");
      renderGroups();
      var again = refs.groups.querySelector(focusSel);
      if (again) again.focus();
    });
  }

  function init() {
    refs.list = document.getElementById("um-roles-view");
    refs.form = document.getElementById("um-role-form");
    if (!refs.list || !refs.form || !window.UMStore) return;
    refs.table = document.getElementById("um-roles-table");
    refs.cards = document.getElementById("um-roles-cards");
    refs.count = document.getElementById("um-roles-count");
    refs.search = document.getElementById("um-roles-search");
    refs.create = document.getElementById("um-create-role");
    refs.pagination = document.querySelector("[data-um-roles-pagination]");
    refs.groups = document.getElementById("umr-groups");
    refs.title = document.getElementById("umr-title");
    refs.submit = document.getElementById("umr-submit");
    refs.presetMenu = document.getElementById("umr-preset-menu");
    refs.presetLabel = document.getElementById("umr-preset-label");
    refs.description = document.getElementById("umr-description");
    // Fields: SMART System text field (OBField), as in the invite dialog.
    document.querySelector("[data-umr-name-wrap]").innerHTML =
      '<input id="umr-name" type="text" autocomplete="off" aria-invalid="false" aria-describedby="umr-name-error" class="' +
      window.OBField.INPUT +
      '" />' +
      window.OBField.errorIcon();
    refs.name = document.getElementById("umr-name");
    document.getElementById("umr-name-error").className = "hidden " + window.OBField.ERROR_TEXT;
    document.getElementById("umr-perm-error").className = "hidden mt-2 " + window.OBField.ERROR_TEXT;
    refs.description.className = window.OBField.TEXTAREA + " resize-y";
    bind();
    window.addEventListener("resize", function () {
      T.syncSticky(refs.table);
    });
    window.UMStore.onChange(renderList);
    window.UMStore.load().then(function () {
      state.loaded = true;
      renderList();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  return { openCreate: openCreate, openEdit: openEdit };
})();

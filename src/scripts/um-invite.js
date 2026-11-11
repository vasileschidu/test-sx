/**
 * um-invite.js
 * "Invite Business Member" (Figma [REVIEW] User Management, section 3. Invite user (SH),
 * 6.10–6.13) and the "Invitation Sent" result (6.12). Shared by SMART Hub (user-management.html)
 * and, later, the SX Invite People modal. Injects its own dialogs on first use.
 *
 *   UMInvite.open({ email, onDone })        email: prefilled + read-only (6.13, from a
 *                                           "Send Invitation →" row)
 *   UMInvite.showResult(invitation, result, { resent })
 *                                           result = UMEmail.sendInvite(); when the email was
 *                                           not sent, shows the link (copy / mailto) instead
 *
 * Needs: UMStore, UMUi, UMEmail, OBField (onboarding-field.js), OBModal.copyButton
 * (onboarding-modal.js), <app-checkbox> (checkbox-component.js + checkbox.css).
 */
window.UMInvite = (function () {
  "use strict";

  var DEFAULT_MESSAGE = "Hi, please help me with setting up the company profile for SMART Hub.";
  var esc = function (v) {
    return window.UMUi.escapeHtml(v);
  };

  var CLOSE_BUTTON =
    "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus-visible:outline-2 focus-visible:outline-blue-600 dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-300 dark:focus-visible:outline-blue-400";
  var X_ICON =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>';
  var SECONDARY =
    "inline-flex cursor-pointer items-center justify-center rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/5 dark:text-white dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/10";
  var PRIMARY =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 dark:bg-blue-500 dark:shadow-none dark:hover:bg-blue-400 dark:disabled:bg-blue-500/40";
  var LABEL = "type-label text-default";
  var SPINNER =
    '<svg class="size-4 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z"></path></svg>';
  var ICON_MAIL =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-gray-400 dark:text-gray-500"><path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z" /><path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z" /></svg>';
  var ICON_PHONE =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-gray-400 dark:text-gray-500"><path fill-rule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.513 2.31a1.5 1.5 0 0 1-1.02 1.756l-.97.33a11.04 11.04 0 0 0 5.793 5.793l.33-.97a1.5 1.5 0 0 1 1.756-1.02l2.31.513A1.5 1.5 0 0 1 18 13.352V14.5a1.5 1.5 0 0 1-1.5 1.5H15c-7.18 0-13-5.82-13-13V3.5Z" clip-rule="evenodd" /></svg>';
  // Heroicons v2, 20 solid (mini) "information-circle".
  var ICON_INFO =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4.5"><path fill-rule="evenodd" clip-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" /></svg>';
  var ICON_CHEVRON =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 shrink-0 text-gray-400 transition-transform group-aria-expanded:rotate-90 dark:text-gray-500"><path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>';

  var expanded = {}; // permission category id → open
  var opts = {};
  var editId = null;

  // ── Markup ──

  function field(id, label, input, extra) {
    return (
      '<div class="flex flex-col gap-2' +
      (extra && extra.cls ? " " + extra.cls : "") +
      '">' +
      '<div class="flex items-baseline justify-between gap-2"><label for="' +
      id +
      '" class="' +
      LABEL +
      '">' +
      label +
      "</label>" +
      (extra && extra.hint ? '<span class="type-body text-tertiary">' + extra.hint + "</span>" : "") +
      "</div>" +
      '<div class="relative">' +
      input +
      "</div>" +
      '<p id="' +
      id +
      '-error" class="hidden ' +
      window.OBField.ERROR_TEXT +
      '"></p></div>'
    );
  }

  function input(id, attrs, cls) {
    return (
      '<input id="' +
      id +
      '" aria-invalid="false" aria-describedby="' +
      id +
      '-error" ' +
      attrs +
      ' class="' +
      window.OBField.INPUT +
      (cls ? " " + cls : "") +
      '" />' +
      window.OBField.errorIcon()
    );
  }

  function dialogShell(id, labelledBy, panelCls, inner) {
    return (
      '<el-dialog><dialog id="' +
      id +
      '" aria-labelledby="' +
      labelledBy +
      '" class="fixed inset-0 size-auto max-h-none max-w-none overflow-y-auto bg-transparent backdrop:bg-transparent">' +
      '<el-dialog-backdrop class="fixed inset-0 bg-gray-900/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"></el-dialog-backdrop>' +
      inner(panelCls) +
      "</dialog></el-dialog>"
    );
  }

  function inviteDialogHtml() {
    var left =
      '<div class="flex flex-col gap-6 p-4 sm:p-6">' +
      '<div class="grid grid-cols-1 gap-6 sm:grid-cols-2">' +
      field("umi-first", "First Name", input("umi-first", 'type="text" autocomplete="off" placeholder="e.g. John" required')) +
      field("umi-last", "Last Name", input("umi-last", 'type="text" autocomplete="off" placeholder="e.g. Smith" required')) +
      "</div>" +
      '<div class="grid grid-cols-1 gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,200px)]">' +
      field(
        "umi-email",
        "Email Address",
        ICON_MAIL +
          input(
            "umi-email",
            'type="email" autocomplete="off" placeholder="name@company.com" required',
            "pl-10 read-only:bg-gray-50 read-only:text-gray-500 dark:read-only:bg-white/10 dark:read-only:text-gray-400",
          ),
      ) +
      field("umi-phone", "Phone Number", ICON_PHONE + input("umi-phone", 'type="tel" autocomplete="off" placeholder="+1 555 000 0000"', "pl-10"), {
        hint: "Optional",
      }) +
      "</div>" +
      '<div id="umi-message-block" class="flex flex-col gap-2"><label for="umi-message" class="' +
      LABEL +
      '">Add a Message</label><textarea id="umi-message" rows="3" placeholder="' + DEFAULT_MESSAGE + '" class="' +
      window.OBField.TEXTAREA +
      ' resize-y"></textarea></div>' +
      '<div class="h-px bg-gray-200 dark:bg-white/10"></div>' +
      '<fieldset class="flex flex-col gap-4" aria-describedby="umi-roles-error">' +
      '<legend class="mb-4 type-label text-default">Select Role:</legend>' +
      '<div id="umi-roles" class="grid grid-cols-1 gap-4 sm:grid-cols-2"></div>' +
      '<p id="umi-roles-error" class="hidden ' +
      window.OBField.ERROR_TEXT +
      '"></p>' +
      "</fieldset>" +
      '<div><button type="button" data-umi-create-role class="inline-flex cursor-pointer items-center gap-1.5 rounded-md type-link text-blue-600 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-blue-400 dark:hover:text-blue-300">' +
      '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>Create Role</button></div>' +
      "</div>";
    var right =
      '<div class="flex flex-col gap-4 border-t border-gray-200 p-4 sm:p-6 lg:border-t-0 lg:border-l dark:border-white/10">' +
      '<div class="flex flex-col gap-1"><h3 class="text-lg/7 font-medium text-default">Permissions Category</h3>' +
      '<p class="type-description text-tertiary">When you choose an existing role, you can see here the list of permissions.</p></div>' +
      '<div id="umi-permissions" class="flex flex-col"></div>' +
      "</div>";
    return dialogShell(
      "um-invite-dialog",
      "umi-title",
      "relative flex w-full transform flex-col overflow-hidden bg-white text-left shadow-lg ring-1 ring-black/5 transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in max-sm:min-h-dvh sm:max-h-[calc(100dvh-2rem)] sm:max-w-6xl sm:rounded-lg data-closed:sm:translate-y-0 data-closed:sm:scale-95 dark:bg-gray-900 dark:ring-white/10",
      function (panel) {
        return (
          '<div tabindex="0" class="flex min-h-full items-stretch justify-center focus:outline-none sm:items-center sm:p-4">' +
          '<el-dialog-panel class="' +
          panel +
          '">' +
          '<div class="flex shrink-0 items-center gap-3 border-b border-gray-200 py-3 pr-3 pl-6 dark:border-white/10">' +
          '<span data-umi-icon="invite" class="contents"><svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 shrink-0 text-gray-400 dark:text-gray-500"><path d="M10 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM16.25 5.75a.75.75 0 0 0-1.5 0v2h-2a.75.75 0 0 0 0 1.5h2v2a.75.75 0 0 0 1.5 0v-2h2a.75.75 0 0 0 0-1.5h-2v-2Z" /></svg></span><span data-umi-icon="edit" class="hidden"><svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 shrink-0 text-gray-400 dark:text-gray-500"><path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" /><path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" /></svg></span>' +
          '<h2 id="umi-title" class="min-w-0 flex-1 truncate text-lg/7 font-medium text-default">Invite Business Member</h2>' +
          '<button type="button" command="close" commandfor="um-invite-dialog" class="' +
          CLOSE_BUTTON +
          '"><span class="sr-only">Close</span>' +
          X_ICON +
          "</button></div>" +
          '<form id="umi-form" novalidate class="flex min-h-0 flex-1 flex-col">' +
          '<div class="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:min-h-160 lg:grid-cols-2">' +
          left +
          right +
          "</div>" +
          '<div class="flex shrink-0 justify-end gap-3 border-t border-gray-200 px-4 py-4 sm:px-6 dark:border-white/10">' +
          '<button type="button" command="close" commandfor="um-invite-dialog" class="' +
          SECONDARY +
          ' flex-1 sm:flex-none">Cancel</button>' +
          '<button id="umi-send" type="submit" class="' +
          PRIMARY +
          ' flex-1 sm:flex-none">Send Invite</button>' +
          "</div></form>" +
          "</el-dialog-panel></div>"
        );
      },
    );
  }

  // Figma 6.12: the Vendors result dialog (vn-result-dialog) with a green check.
  function resultDialogHtml() {
    return dialogShell(
      "um-sent-dialog",
      "ums-title",
      "relative w-full transform overflow-hidden rounded-lg bg-white text-left shadow-lg ring-1 ring-black/5 transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in data-closed:sm:translate-y-0 data-closed:sm:scale-95 dark:bg-gray-900 dark:ring-white/10 sm:max-w-[512px]",
      function (panel) {
        return (
          '<div tabindex="0" class="flex min-h-full items-end justify-center p-4 focus:outline-none sm:items-center">' +
          '<el-dialog-panel class="' +
          panel +
          '">' +
          '<div class="flex h-14 items-end justify-end px-4 pt-4"><button type="button" command="close" commandfor="um-sent-dialog" class="' +
          CLOSE_BUTTON +
          '"><span class="sr-only">Close</span>' +
          X_ICON +
          "</button></div>" +
          '<div class="flex flex-col items-center gap-6 px-6 pb-6">' +
          '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-11 text-emerald-500 dark:text-emerald-400"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" /></svg>' +
          '<div class="flex w-full flex-col gap-2 text-center"><h2 id="ums-title" class="text-lg/6 font-semibold text-gray-900 dark:text-white">Invitation Sent</h2>' +
          '<p id="ums-text" class="text-sm/5 text-gray-500 dark:text-gray-400"></p></div>' +
          '<div id="ums-link" hidden class="flex w-full flex-col gap-2 rounded-md bg-gray-50 p-4 text-left dark:bg-white/5">' +
          '<p id="ums-reason" class="type-description text-secondary"></p>' +
          '<div class="flex items-center gap-3"><label for="ums-url" class="sr-only">Invite link</label>' +
          '<input id="ums-url" type="text" readonly class="' +
          window.OBField.INPUT +
          ' min-w-0 flex-1 truncate font-normal" /><span id="ums-copy" class="inline-flex shrink-0"></span></div>' +
          '<a id="ums-mailto" href="#" class="inline-flex w-fit items-center gap-1.5 rounded-md type-link text-blue-600 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-blue-400 dark:hover:text-blue-300">' +
          '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z" /><path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z" /></svg>Open in email app</a>' +
          "</div></div>" +
          '<div class="px-6 pb-6"><button type="button" command="close" commandfor="um-sent-dialog" class="w-full cursor-pointer rounded-md bg-blue-600 px-6 py-3 text-base/6 font-medium text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:bg-blue-700 dark:bg-blue-500 dark:shadow-none dark:hover:bg-blue-400">Done</button></div>' +
          "</el-dialog-panel></div>"
        );
      },
    );
  }

  /** Injects the dialogs once. A just-inserted <el-dialog> initialises a tick later (and
   *  closes its <dialog>), so callers open through whenReady(). */
  var ready = null;
  function ensureDialogs() {
    if (ready) return ready;
    var host = document.createElement("div");
    host.innerHTML = inviteDialogHtml() + resultDialogHtml();
    while (host.firstChild) document.body.appendChild(host.firstChild);
    bind();
    ready = new Promise(function (resolve) {
      requestAnimationFrame(function () {
        setTimeout(resolve, 0);
      });
    });
    return ready;
  }

  // ── Roles + permissions ──

  // Roles offered when inviting: every role the business has, so roles created later in the
  // Roles tab show up here too. Today: Full Access, View Only.
  function roleCards() {
    return window.UMStore.getRoles()
      .map(function (role) {
        return (
          '<label class="flex cursor-pointer items-start gap-3 rounded-lg border text-default border-gray-200 bg-white p-4 hover:bg-gray-50 has-checked:border-blue-600 has-checked:ring-1 has-checked:ring-blue-600 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 dark:has-checked:border-blue-400 dark:has-checked:ring-blue-400">' +
          '<app-checkbox data-umi-role="' +
          esc(role.id) +
          '" aria-label="' +
          esc(role.name) +
          '" class="mt-0.5"></app-checkbox>' +
          '<span class="flex min-w-0 flex-col gap-0.5"><span class="flex items-center gap-1.5"><span class="type-label text-default">' +
          esc(role.name) +
          '</span>' +
          // SMART System "Information circle + Tooltip" (Figma PdvEp0MAIlof6O8MYaXCcy 9352:21601,
          // Type=Hover (Bottom Text), Size=Big): 18px solid info icon, gray-400 → gray-900 on hover;
          // tooltip under it: gray-900, p-3, rounded-lg, max 343px, text-sm regular gray-100, left-aligned,
          // centred 20×9 arrow on top. Shows on hover and on keyboard focus.
          '<span class="group/info relative inline-flex size-5 items-center justify-center">' +
          '<span tabindex="0" role="button" data-umi-role-info aria-describedby="umi-role-tip-' +
          esc(role.id) +
          '" class="inline-flex cursor-help rounded-full text-gray-400 hover:text-gray-900 focus-visible:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 dark:text-gray-500 dark:hover:text-white dark:focus-visible:text-white dark:focus-visible:outline-blue-400">' +
          '<span class="sr-only">About ' +
          esc(role.name) +
          "</span>" +
          ICON_INFO +
          "</span>" +
          '<span id="umi-role-tip-' +
          esc(role.id) +
          '" role="tooltip" class="pointer-events-none invisible absolute top-full left-1/2 z-30 mt-3 w-max max-w-64 -translate-x-2/5 sm:max-w-[343px] rounded-lg bg-gray-900 p-3 text-left text-sm/5 font-normal text-gray-100 opacity-0 shadow-xs transition-opacity duration-150 group-hover/info:visible group-hover/info:opacity-100 group-has-focus-visible/info:visible group-has-focus-visible/info:opacity-100 before:absolute before:-top-1 before:left-2/5 before:size-3 before:-translate-x-1/2 before:rotate-45 before:rounded-[2px] before:bg-inherit dark:bg-gray-950 dark:ring-1 dark:ring-white/10">' +
          esc(role.description || "") +
          "</span></span></span>" +
          '<span class="type-caption text-tertiary">' +
          esc(role.apps || "SMART Hub") +
          "</span></span></label>"
        );
      })
      .join("");
  }

  function selectedRoles() {
    return Array.prototype.slice
      .call(document.querySelectorAll("#umi-roles input[type=checkbox]:checked"))
      .map(function (box) {
        return box.getAttribute("data-umi-role");
      });
  }

  function renderPermissions() {
    var ids = {};
    selectedRoles().forEach(function (roleId) {
      var role = window.UMStore.getRole(roleId);
      ((role && role.permissionIds) || []).forEach(function (p) {
        ids[p] = true;
      });
    });
    var groups = window.UMStore.getPermissionCategories().filter(function (cat) {
      return cat.permissions.some(function (p) {
        return ids[p.id];
      });
    });
    if (groups.length && !Object.keys(expanded).length) expanded[groups[0].id] = true;
    document.getElementById("umi-permissions").innerHTML = groups
      .map(function (cat) {
        var open = !!expanded[cat.id];
        var panelId = "umi-perm-" + cat.id;
        return (
          '<div class="border-b border-gray-200 first:border-t dark:border-white/10">' +
          '<button type="button" data-umi-group="' +
          esc(cat.id) +
          '" aria-expanded="' +
          open +
          '" aria-controls="' +
          panelId +
          '" class="group flex w-full cursor-pointer text-default items-center gap-3 px-2 py-4 text-left hover:bg-gray-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 aria-expanded:bg-gray-50 dark:hover:bg-white/5 dark:aria-expanded:bg-white/5">' +
          ICON_CHEVRON +
          '<span class="text-base/6 font-medium text-default">' +
          esc(cat.name) +
          '</span><span class="type-caption text-tertiary">' +
          esc(cat.app) +
          "</span></button>" +
          '<ul id="' +
          panelId +
          '" role="list" class="flex flex-wrap gap-2 px-2 py-4"' +
          (open ? "" : " hidden") +
          ">" +
          cat.permissions
            .filter(function (p) {
              return ids[p.id];
            })
            .map(function (p) {
              return '<li class="rounded-full bg-gray-100 px-2.5 py-0.5 type-body text-gray-800 dark:bg-white/10 dark:text-gray-200">' + esc(p.name) + "</li>";
            })
            .join("") +
          "</ul></div>"
        );
      })
      .join("");
  }

  // ── Validation ──

  var FIELD_IDS = ["umi-first", "umi-last", "umi-email", "umi-phone"];

  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
  }

  function messageFor(id) {
    var value = document.getElementById(id).value.trim();
    if (id === "umi-first") return value ? "" : "First Name is Required";
    if (id === "umi-last") return value ? "" : "Last Name is Required";
    if (id === "umi-email") {
      if (!value) return "Email Address is Required";
      if (!validEmail(value)) return "Enter a valid email address";
      if (editId) return "";
      var taken = window.UMStore.findEmail(value);
      if (taken === "user") return "This person is already a user of this business";
      if (taken === "invited") return "An invitation was already sent to this email";
      return "";
    }
    if (id === "umi-phone" && value) {
      var digits = value.replace(/\D/g, "");
      if (!/^\+?[0-9\s().-]+$/.test(value) || digits.length < 7 || digits.length > 15)
        return "Enter a valid phone number";
    }
    return "";
  }

  function setFieldError(id, message) {
    window.OBField.setError(document.getElementById(id), !!message, document.getElementById(id + "-error"), message);
  }

  function rolesError(show) {
    var p = document.getElementById("umi-roles-error");
    p.textContent = show ? "Select at least one role" : "";
    p.classList.toggle("hidden", !show);
  }

  function validateAll() {
    var first = null;
    FIELD_IDS.forEach(function (id) {
      var message = messageFor(id);
      setFieldError(id, message);
      if (message && !first) first = document.getElementById(id);
    });
    var noRole = !selectedRoles().length;
    rolesError(noRole);
    if (noRole && !first) first = document.querySelector("#umi-roles input[type=checkbox]");
    return first;
  }

  // ── Open / send ──

  function setMode(edit, name) {
    document.getElementById("umi-title").textContent = edit ? name || "Edit Business Member" : "Invite Business Member";
    document.querySelector('[data-umi-icon="invite"]').classList.toggle("hidden", edit);
    // Edit: the title is just the person's name, no icon.
    document.querySelector('[data-umi-icon="edit"]').classList.add("hidden");
    document.getElementById("umi-message-block").classList.toggle("hidden", edit);
  }

  function reset(email) {
    var form = document.getElementById("umi-form");
    form.reset();
    FIELD_IDS.forEach(function (id) {
      setFieldError(id, "");
    });
    rolesError(false);
    expanded = {};
    document.getElementById("umi-roles").innerHTML = roleCards();
    document.getElementById("umi-message").value = "";
    var emailInput = document.getElementById("umi-email");
    emailInput.value = email || "";
    emailInput.readOnly = !!email;
    renderPermissions();
    var send = document.getElementById("umi-send");
    send.disabled = false;
    send.innerHTML = editId ? "Save Changes" : "Send Invite";
    var editing = editId && window.UMStore.getUser(editId);
    setMode(!!editId, editing && [editing.firstName, editing.lastName].filter(Boolean).join(" "));
  }

  // Edit a business member in the same dialog as Invite (Andrian, 2026-11-11): names, phone and
  // roles prefilled; email read-only; no message; "Save Changes".
  function openEdit(userId, options) {
    var user = window.UMStore.getUser(userId);
    if (!user) return Promise.resolve();
    opts = options || {};
    editId = userId;
    return ensureDialogs().then(function () {
      reset(user.email);
      document.getElementById("umi-first").value = user.firstName || "";
      document.getElementById("umi-last").value = user.lastName || "";
      document.getElementById("umi-phone").value = user.phone || "";
      (user.roleIds || []).forEach(function (id) {
        var box = document.querySelector('[data-umi-role="' + id + '"]');
        if (box) {
          var input = box.querySelector("input[type=checkbox]") || box;
          if ("checked" in input) input.checked = true;
          else box.setAttribute("checked", "");
        }
      });
      renderPermissions();
      document.getElementById("um-invite-dialog").showModal();
      setTimeout(function () {
        document.getElementById("umi-first").focus();
      }, 50);
    });
  }

  function open(options) {
    opts = options || {};
    editId = null;
    return ensureDialogs().then(function () {
      reset(opts.email);
      document.getElementById("um-invite-dialog").showModal();
      setTimeout(function () {
        document.getElementById("umi-first").focus();
      }, 50);
    });
  }

  function submit(event) {
    event.preventDefault();
    var send = document.getElementById("umi-send");
    if (send.disabled) return;
    var invalid = validateAll();
    if (invalid) {
      invalid.focus();
      return;
    }
    if (editId) {
      var savedUser = window.UMStore.updateUser(editId, {
        firstName: document.getElementById("umi-first").value.trim(),
        lastName: document.getElementById("umi-last").value.trim(),
        phone: document.getElementById("umi-phone").value.trim(),
        roleIds: selectedRoles(),
      });
      document.getElementById("um-invite-dialog").close();
      if (typeof window.showGlobalTopToast === "function")
        window.showGlobalTopToast(
          "Changes to " +
            ((savedUser && [savedUser.firstName, savedUser.lastName].filter(Boolean).join(" ")) || "the user") +
            " saved.",
          { tone: "success" },
        );
      if (typeof opts.onDone === "function") opts.onDone();
      return;
    }
    send.disabled = true;
    send.setAttribute("aria-busy", "true");
    send.innerHTML = SPINNER + "<span>Sending…</span>";
    var created = window.UMStore.createInvitation({
      firstName: document.getElementById("umi-first").value,
      lastName: document.getElementById("umi-last").value,
      email: document.getElementById("umi-email").value,
      phone: document.getElementById("umi-phone").value,
      message: document.getElementById("umi-message").value,
      roleIds: selectedRoles(),
    });
    // A short beat so the loading state reads, even when nothing goes over the network.
    var pause = new Promise(function (resolve) {
      setTimeout(resolve, 600);
    });
    Promise.all([window.UMEmail.sendInvite(created.invitation), pause]).then(function (out) {
      send.removeAttribute("aria-busy");
      document.getElementById("um-invite-dialog").close();
      showResult(created.invitation, out[0]);
      if (typeof opts.onDone === "function") opts.onDone(created);
    });
  }

  function showResult(invitation, result, flags) {
    return ensureDialogs().then(function () {
      fillResult(invitation, result, flags);
    });
  }

  function fillResult(invitation, result, flags) {
    var resent = flags && flags.resent;
    var sent = result && result.sent;
    document.getElementById("ums-title").textContent = resent ? "Invitation Resent" : "Invitation Sent";
    var email = '<span class="font-medium text-gray-900 dark:text-white">' + esc(invitation.email) + "</span>";
    document.getElementById("ums-text").innerHTML = sent
      ? "Invitation to " + email + " was successfully sent." + (resent ? "" : " The user was added to your business user list.")
      : "Invitation to " + email + " was created." + (resent ? " The new link is valid for 7 days." : " The user was added to your business user list.");
    var box = document.getElementById("ums-link");
    box.hidden = !!sent;
    if (!sent) {
      document.getElementById("ums-reason").textContent = window.UMEmail.reasonText(result && result.reason);
      document.getElementById("ums-url").value = result.link;
      document.getElementById("ums-copy").innerHTML = window.OBModal ? window.OBModal.copyButton("invite link", result.link) : "";
      var business = (window.UMStore.getBusiness() || {}).name || "SMART Hub";
      document.getElementById("ums-mailto").href =
        "mailto:" +
        encodeURIComponent(invitation.email) +
        "?subject=" +
        encodeURIComponent("You're invited to " + business + " on SMART Hub") +
        "&body=" +
        encodeURIComponent((invitation.message ? invitation.message + "\n\n" : "") + "Accept the invitation: " + result.link);
    }
    document.getElementById("um-sent-dialog").showModal();
  }

  // ── Events ──

  function bind() {
    document.getElementById("umi-form").addEventListener("submit", submit);
    FIELD_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      el.addEventListener("blur", function () {
        if (el.value.trim() || el.getAttribute("aria-invalid") === "true") setFieldError(id, messageFor(id));
      });
      el.addEventListener("input", function () {
        if (el.getAttribute("aria-invalid") === "true") setFieldError(id, messageFor(id));
      });
    });
    var roles = document.getElementById("umi-roles");
    roles.addEventListener("change", function () {
      renderPermissions();
      if (selectedRoles().length) rolesError(false);
    });
    // The info icon sits inside the card's label: it explains, it doesn't toggle.
    roles.addEventListener("click", function (event) {
      if (event.target.closest("[data-umi-role-info]")) event.preventDefault();
    });
    document.getElementById("umi-permissions").addEventListener("click", function (event) {
      var button = event.target.closest("[data-umi-group]");
      if (!button) return;
      var id = button.getAttribute("data-umi-group");
      expanded[id] = !expanded[id];
      renderPermissions();
      var again = document.querySelector('[data-umi-group="' + id + '"]');
      if (again) again.focus();
    });
    document.querySelector("[data-umi-create-role]").addEventListener("click", function () {
      if (typeof window.showGlobalTopToast === "function")
        window.showGlobalTopToast("Creating roles is coming soon.", { tone: "info" });
    });
  }

  return { open: open, openEdit: openEdit, showResult: showResult };
})();

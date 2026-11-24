/**
 * smart-enroll/invite.js
 * SMART Enroll "Invite people" (TCDM-5250, T10). Spec: wiki/products/smart-enroll/flows/application-shell.md
 * § Invite people, decision D-14. No new modal: opens the User Management "Invite Business Member" dialog
 * (um-invite.js) with the Contributor role only (can fill and edit tabs, cannot submit or sign) and its
 * Invite / Members tabs.
 *
 * Triggers: the shell's `smart-enroll:invite` event, fired by every [data-se-invite] (top bar, card header,
 * "Invite someone to help" links inside tabs).
 * After "Send Invite": the invitee becomes a person on the application — avatar in the top bar / card header
 * (SmartEnroll.addPerson) and a row in the Members tab. Kept in sessionStorage for the tab.
 *
 * Needs: shell.js, data-source.js, onboarding-field.js, onboarding-modal.js, checkbox-component.js,
 * um-store.js, um-ui.js, um-email.js, um-invite.js (+ user-management.json role "contributor", scope "enroll").
 */
(function () {
  "use strict";

  var KEY = "se_members_v1";
  var ROLE_ID = "contributor";
  var COLORS = ["bg-purple-500", "bg-pink-500", "bg-amber-500", "bg-emerald-500", "bg-indigo-500"];
  var storeReady = null;

  function read() {
    try {
      return JSON.parse(window.sessionStorage.getItem(KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function write(list) {
    try {
      window.sessionStorage.setItem(KEY, JSON.stringify(list));
    } catch (e) {
      /* private mode: the avatar still shows for this page */
    }
  }

  function initials(first, last) {
    return ((first || "").charAt(0) + (last || "").charAt(0)).toUpperCase() || "?";
  }

  function toPerson(m) {
    return { id: m.id, name: m.name, email: m.email, role: "Contributor", initials: m.initials, color: m.color, pending: true };
  }

  function members() {
    return window.SmartEnroll.getPeople().map(function (p) {
      return {
        name: p.name,
        email: p.email,
        role: p.role,
        status: p.pending ? "Invited" : "",
        initials: p.initials,
        color: p.color,
        photo: p.photo ? "../../" + p.photo : "",
      };
    });
  }

  function loadStore() {
    if (!storeReady) storeReady = window.UMStore.load();
    return storeReady;
  }

  function open(source) {
    var which = source === "members" ? "members" : "invite";
    loadStore().then(function () {
      return window.UMInvite.open({
        roleIds: [ROLE_ID],
        title: "Invite People",
        members: members,
        tab: which,
        added: "They were added to this application as a Contributor.",
        onDone: function (created) {
          if (!created || !created.invitation) return;
          var inv = created.invitation;
          var list = read();
          var person = {
            id: "inv_" + inv.id,
            name: [inv.firstName, inv.lastName].filter(Boolean).join(" ") || inv.email,
            email: inv.email,
            initials: initials(inv.firstName, inv.lastName),
            color: COLORS[list.length % COLORS.length],
          };
          list.push(person);
          write(list);
          window.SmartEnroll.addPerson(toPerson(person));
        },
      });
    });
  }

  function init() {
    window.SmartEnroll.on("invite", function (detail, event) {
      event.preventDefault();
      open(detail.source);
    });
    // People invited earlier in this tab come back after a reload.
    window.SmartEnroll.ready.then(function () {
      read().forEach(function (m) {
        window.SmartEnroll.addPerson(toPerson(m));
      });
    });
  }

  if (window.SmartEnroll) init();
  else document.addEventListener("DOMContentLoaded", init);
})();

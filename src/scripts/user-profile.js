/**
 * user-profile.js
 * User profile (Figma [REVIEW] User Management, section 2. User Profile, 6.6–6.9):
 * user-profile.html?id=<userId>, no id = Me.
 *   - Header: avatar (photo or initials) with an upload badge and, when there is a
 *     photo, a remove badge (Me only); name, role pill, Status / Created On.
 *   - Profile Information: Email (read-only), First Name, Last Name, Phone Number,
 *     each with "Update" → inline input + Cancel / Save (Enter saves, Esc cancels,
 *     one row at a time). First / Last Name are required; phone is optional.
 *   - Who: an admin can open and edit anyone; a member only themself (another
 *     ?id goes to their own profile). Email stays read-only for everyone.
 * Data: UMStore.updateUser(); markup shared with the list: UMUi; fields: OBField.
 */
(function () {
  "use strict";

  var UI = window.UMUi;
  var esc = UI.escapeHtml;
  var MAX_PHOTO_BYTES = 2 * 1024 * 1024;
  var PHOTO_MAX_SIDE = 256;
  var PHOTO_TYPES = ["image/png", "image/jpeg"];

  var FIELDS = [
    { key: "email", label: "Email", readOnly: true },
    { key: "firstName", label: "First Name", required: true, autocomplete: "given-name" },
    { key: "lastName", label: "Last Name", required: true, autocomplete: "family-name" },
    { key: "phone", label: "Phone Number", type: "tel", autocomplete: "tel" },
  ];

  var SECONDARY_MD =
    "inline-flex cursor-pointer items-center justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:bg-gray-100 dark:bg-white/5 dark:text-white dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/10";
  var PRIMARY_MD =
    "inline-flex cursor-pointer items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 dark:bg-blue-500 dark:shadow-none dark:hover:bg-blue-400 dark:disabled:bg-blue-500/40 dark:disabled:text-white/60";
  var LINK =
    "shrink-0 cursor-pointer rounded-md px-1 type-link text-blue-600 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-blue-400 dark:hover:text-blue-300";

  var userId = null;
  var editing = null; // key of the row in edit mode

  function toast(message, tone) {
    if (typeof window.showGlobalTopToast === "function")
      window.showGlobalTopToast(message, tone ? { tone: tone } : undefined);
  }

  function user() {
    return window.UMStore.getUser(userId);
  }

  function isMe() {
    var me = window.UMStore.getCurrentUser();
    return !!me && me.id === userId;
  }

  function canEdit() {
    return window.UMStore.getViewer().isAdmin || isMe();
  }

  function formatDate(iso) {
    var date = new Date(String(iso) + "T00:00:00");
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  }

  // ── Header ──

  function renderHeader() {
    var u = user();
    var name = UI.fullName(u);
    document.getElementById("up-avatar").innerHTML = UI.avatar(u, { size: "size-20", text: "text-3xl" });
    var nameEl = document.getElementById("up-name");
    nameEl.textContent = name;
    nameEl.title = name;
    var roles = UI.roleNames(u);
    var role = document.getElementById("up-role");
    role.textContent = roles.join(", ") || "No role";
    role.title = roles.join(", ");
    document.getElementById("up-status").innerHTML = UI.statusBadge(u);
    var business = window.UMStore.getBusiness() || {};
    document.getElementById("up-created").textContent = formatDate(u.createdOn || business.createdOn);
    // Photo badges: only on your own profile (Figma 6.6 / 6.7).
    document.getElementById("up-photo-edit").hidden = !isMe();
    document.getElementById("up-photo-remove").hidden = !isMe() || !u.photo;
    document.title = name + " - User Management";
  }

  // ── Profile Information rows ──

  function displayValue(field, u) {
    var value = u[field.key];
    return value ? esc(value) : "-";
  }

  function viewRow(field, u) {
    // An empty optional field reads "Add Phone Number" instead of "-" + "Update".
    var empty = !u[field.key];
    var update =
      !field.readOnly && canEdit()
        ? '<button type="button" data-up-update="' +
          field.key +
          '" class="' +
          LINK +
          '">' +
          (empty
            ? "Add " + esc(field.label)
            : 'Update<span class="sr-only"> ' + esc(field.label) + "</span>") +
          "</button>"
        : "";
    return (
      '<div class="flex flex-col gap-1 py-4 sm:grid sm:min-h-22 sm:grid-cols-3 sm:items-center sm:gap-4 sm:py-6">' +
      '<dt class="type-label text-default">' +
      esc(field.label) +
      "</dt>" +
      '<dd class="flex min-w-0 items-center justify-between gap-4 sm:col-span-2">' +
      (empty && update
        ? "<span></span>"
        : '<span class="min-w-0 truncate type-body-large text-secondary" title="' +
          esc(u[field.key] || "") +
          '">' +
          displayValue(field, u) +
          "</span>") +
      update +
      "</dd></div>"
    );
  }

  function editRow(field, u) {
    var id = "up-input-" + field.key;
    return (
      // sm:pb-5.75: 24 + 40px input + 23 + 1px line = the 88px of a view row, so nothing below moves.
      '<div class="flex flex-col gap-2 py-4 sm:grid sm:min-h-22 sm:grid-cols-3 sm:items-start sm:gap-4 sm:pt-6 sm:pb-5.75">' +
      '<dt class="sm:flex sm:h-10 sm:items-center"><label for="' +
      id +
      '" class="type-label text-default">' +
      esc(field.label) +
      "</label></dt>" +
      '<dd class="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">' +
      // sm:-ml-3 = the input's px-3, so the typed text stays where the value was (Figma 6.7).
      '<div class="flex w-full flex-col gap-1 sm:-ml-3 sm:max-w-xs">' +
      '<div class="relative">' +
      '<input id="' +
      id +
      '" data-up-input="' +
      field.key +
      '" type="' +
      (field.type || "text") +
      '" autocomplete="' +
      (field.autocomplete || "off") +
      '" value="' +
      esc(u[field.key] || "") +
      '" aria-invalid="false" aria-describedby="' +
      id +
      '-error"' +
      (field.required ? " required" : "") +
      ' class="' +
      window.OBField.INPUT +
      '" />' +
      window.OBField.errorIcon() +
      "</div>" +
      '<p id="' +
      id +
      '-error" class="hidden ' +
      window.OBField.ERROR_TEXT +
      '"></p>' +
      "</div>" +
      '<div class="flex shrink-0 gap-3 sm:gap-6">' +
      '<button type="button" data-up-cancel class="' +
      SECONDARY_MD +
      ' flex-1 sm:w-26 sm:flex-none">Cancel</button>' +
      '<button type="button" data-up-save class="' +
      PRIMARY_MD +
      ' flex-1 sm:w-26 sm:flex-none">Save</button>' +
      "</div>" +
      "</dd></div>"
    );
  }

  function renderRows() {
    var u = user();
    document.getElementById("up-rows").innerHTML = FIELDS.map(function (field) {
      return editing === field.key ? editRow(field, u) : viewRow(field, u);
    }).join("");
  }

  function render() {
    if (!user()) return;
    renderHeader();
    renderRows();
  }

  // ── Inline edit ──

  function startEdit(key) {
    editing = key;
    renderRows();
    var input = document.querySelector('[data-up-input="' + key + '"]');
    if (input) {
      input.focus();
      input.select();
    }
  }

  function stopEdit(key) {
    editing = null;
    renderRows();
    var button = document.querySelector('[data-up-update="' + key + '"]');
    if (button) button.focus();
  }

  function validate(field, value) {
    if (field.required && !value) return field.label + " is Required";
    if (field.key === "phone" && value) {
      var digits = value.replace(/\D/g, "");
      if (!/^\+?[0-9\s().-]+$/.test(value) || digits.length < 7 || digits.length > 15)
        return "Enter a valid phone number";
    }
    return "";
  }

  function save() {
    var field = FIELDS.filter(function (f) {
      return f.key === editing;
    })[0];
    var input = field && document.querySelector('[data-up-input="' + field.key + '"]');
    if (!input) return;
    var value = input.value.trim().replace(/\s+/g, " ");
    var message = validate(field, value);
    window.OBField.setError(input, !!message, document.getElementById(input.id + "-error"), message);
    if (message) {
      input.focus();
      return;
    }
    var patch = {};
    patch[field.key] = value;
    window.UMStore.updateUser(userId, patch);
    toast(field.label + " updated");
    stopEdit(field.key);
  }

  // ── Photo (Me only) ──

  function resizeToDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(img.width, img.height));
        var canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(
          file.type === "image/png"
            ? canvas.toDataURL("image/png")
            : canvas.toDataURL("image/jpeg", 0.85),
        );
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("unreadable image"));
      };
      img.src = url;
    });
  }

  function onPhotoPicked(event) {
    var input = event.target;
    var file = input.files && input.files[0];
    input.value = "";
    if (!file) return;
    if (PHOTO_TYPES.indexOf(file.type) === -1)
      return toast("Photo not uploaded: use a PNG or JPG image.", "error");
    if (file.size > MAX_PHOTO_BYTES)
      return toast("Photo not uploaded: the image is larger than 2 MB.", "error");
    resizeToDataUrl(file)
      .then(function (dataUrl) {
        window.UMStore.updateUser(userId, { photo: dataUrl });
        toast("Photo updated");
        document.getElementById("up-photo-edit").focus();
      })
      .catch(function () {
        toast("Photo not uploaded: the image could not be read.", "error");
      });
  }

  function openRemovePhoto() {
    var dialog = document.getElementById("um-photo-dialog");
    document.getElementById("um-photo-text").innerHTML =
      'Are you sure you want to remove the image for <span class="font-medium text-gray-900 dark:text-white">' +
      esc(UI.fullName(user())) +
      "</span>?";
    dialog.showModal();
  }

  function confirmRemovePhoto() {
    var dialog = document.getElementById("um-photo-dialog");
    dialog.addEventListener(
      "close",
      function () {
        // The remove badge is gone; hand focus to the upload badge.
        setTimeout(function () {
          document.getElementById("up-photo-edit").focus();
        }, 0);
      },
      { once: true },
    );
    window.UMStore.updateUser(userId, { photo: null });
    toast("Photo removed");
    dialog.close();
  }

  // ── Events ──

  function bindEvents() {
    var rows = document.getElementById("up-rows");
    rows.addEventListener("click", function (event) {
      var update = event.target.closest("[data-up-update]");
      if (update) return startEdit(update.getAttribute("data-up-update"));
      if (event.target.closest("[data-up-cancel]")) return stopEdit(editing);
      if (event.target.closest("[data-up-save]")) return save();
    });
    rows.addEventListener("keydown", function (event) {
      if (!event.target.matches("[data-up-input]")) return;
      if (event.key === "Enter") {
        event.preventDefault();
        save();
      } else if (event.key === "Escape") {
        event.preventDefault();
        stopEdit(editing);
      }
    });
    rows.addEventListener("input", function (event) {
      var input = event.target.closest("[data-up-input]");
      // Clear the error as soon as the field is fixed.
      if (input && input.getAttribute("aria-invalid") === "true") {
        var field = FIELDS.filter(function (f) {
          return f.key === input.getAttribute("data-up-input");
        })[0];
        var message = validate(field, input.value.trim());
        window.OBField.setError(input, !!message, document.getElementById(input.id + "-error"), message);
      }
    });
    document.getElementById("up-photo-edit").addEventListener("click", function () {
      document.getElementById("up-photo-input").click();
    });
    document.getElementById("up-photo-input").addEventListener("change", onPhotoPicked);
    document.getElementById("up-photo-remove").addEventListener("click", openRemovePhoto);
    document.getElementById("um-photo-confirm").addEventListener("click", confirmRemovePhoto);
    // Keep ?as=member on the tab links.
    document.querySelectorAll("[data-um-link]").forEach(function (link) {
      link.setAttribute("href", UI.withViewer(link.getAttribute("href")));
    });
  }

  function init() {
    if (!window.UMStore || !document.getElementById("up-body")) return;
    window.UMStore.load()
      .then(function () {
        var me = window.UMStore.getCurrentUser();
        var requested = new URLSearchParams(window.location.search).get("id");
        userId = requested || (me && me.id);
        // A member may only see their own profile; an unknown id goes back to the list.
        if (requested && !window.UMStore.getViewer().isAdmin && me && requested !== me.id) {
          window.location.replace(UI.withViewer("user-profile.html"));
          return;
        }
        if (!user()) {
          window.location.replace(UI.withViewer("user-management.html"));
          return;
        }
        bindEvents();
        render();
        window.UMStore.onChange(function () {
          renderHeader();
          if (!editing) renderRows();
        });
        document.getElementById("up-body").removeAttribute("aria-busy");
      })
      .catch(function () {
        toast("The profile could not be loaded. Reload the page to try again.", "error");
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

/**
 * smart-enroll/file-upload.js
 * File Upload — SMART System "Upload File Parts" (Figma PdvEp0MAIlof6O8MYaXCcy, frame 9431:16522,
 * set 9432:4806: Upload / Upload Hover / Upload (error) / Preparing your file / Uploaded file /
 * Uploaded Hover). Never the "(old) File Upload" still used in the Enroll file (DS-003).
 *
 * One file by default (R1); `multiple: true` only for the Business or Service License.
 * States: default, hover, focus-visible, drag-over, uploading (simulated), done (file row with
 * replace + remove), error, disabled. Dark mode on every state.
 *
 *   var up = FileUpload.mount(el, {
 *     id: 'license',                 // ids for the input / error line (required, unique on the page)
 *     name: 'license',               // input name
 *     label: 'Business License',     // aria-label of the input (the visible label lives outside)
 *     accept: '.pdf,.png,.jpg',      // extensions checked on pick / drop
 *     acceptLabel: 'PDF, PNG, JPG up to 8MB',
 *     maxSizeMb: 8,
 *     multiple: false,
 *     disabled: false,
 *     files: [{ name, size, type }], // already uploaded (optional)
 *     onChange: function (files) {}  // after an upload finishes or a file is removed
 *   });
 *   up.getFiles() / setFiles(list) / setError(msg|null) / setDisabled(bool) / clear() / destroy()
 */
window.FileUpload = (function () {
  "use strict";

  // Drop zone (Figma Type=Upload, 50px: two 16px lines + py-2 + 1px dashed border).
  var ZONE =
    "group/fu relative flex w-full cursor-pointer items-center justify-center rounded-md border border-dashed border-gray-300 bg-white px-4 py-2 transition-colors " +
    "not-has-disabled:hover:border-gray-400 not-has-disabled:hover:bg-gray-50 " +
    "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-blue-600 " +
    "data-dragover:border-solid data-dragover:border-blue-600 data-dragover:bg-blue-50 " +
    "data-invalid:border-red-300 not-has-disabled:data-invalid:hover:border-red-400 " +
    "has-disabled:cursor-not-allowed has-disabled:border-gray-200 has-disabled:bg-gray-50 " +
    "dark:border-white/15 dark:bg-white/5 dark:not-has-disabled:hover:border-white/25 dark:not-has-disabled:hover:bg-white/10 " +
    "dark:has-focus-visible:outline-blue-400 dark:data-dragover:border-blue-400 dark:data-dragover:bg-blue-400/10 " +
    "dark:data-invalid:border-red-400/50 dark:not-has-disabled:data-invalid:hover:border-red-400 " +
    "dark:has-disabled:border-white/10 dark:has-disabled:bg-white/5";
  var ZONE_LINK =
    "font-semibold text-blue-600 group-hover/fu:text-blue-700 group-has-disabled/fu:text-gray-400 dark:text-blue-400 dark:group-hover/fu:text-blue-300 dark:group-has-disabled/fu:text-gray-500";
  var ZONE_TEXT = "type-caption text-gray-600 group-has-disabled/fu:text-gray-400 dark:text-gray-300 dark:group-has-disabled/fu:text-gray-500";
  var ZONE_HINT = "type-caption text-gray-500 group-has-disabled/fu:text-gray-400 dark:text-gray-400 dark:group-has-disabled/fu:text-gray-500";

  // File row (Figma Type=Uploaded file / Preparing your file): gray-50 box, link icon, name + meta.
  var ROW = "group/row flex items-center gap-3 rounded-md bg-gray-50 px-3 py-2 dark:bg-white/5";
  var ROW_ICON = "size-5 shrink-0 text-gray-500 dark:text-gray-400";
  // Replace / remove: the User Management row-action group (32px joined icon buttons).
  var GROUP_BUTTON =
    "relative inline-flex size-8 cursor-pointer items-center justify-center bg-white text-gray-600 inset-ring inset-ring-gray-300 hover:bg-gray-50 hover:text-gray-900 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:bg-gray-100 dark:bg-white/5 dark:text-gray-300 dark:inset-ring-white/10 dark:hover:bg-white/10 dark:hover:text-white dark:active:bg-white/15 dark:focus-visible:outline-blue-400";

  var ICON_LINK =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="' + ROW_ICON + '"><path fill-rule="evenodd" d="M15.621 4.379a3 3 0 0 0-4.242 0l-7 7a3 3 0 0 0 4.241 4.243h.001l.497-.5a.75.75 0 0 1 1.064 1.057l-.498.501-.002.002a4.5 4.5 0 0 1-6.364-6.364l7-7a4.5 4.5 0 0 1 6.368 6.36l-3.455 3.553A2.625 2.625 0 1 1 9.52 9.52l3.45-3.451a.75.75 0 1 1 1.061 1.06l-3.45 3.451a1.125 1.125 0 0 0 1.587 1.595l3.454-3.553a3 3 0 0 0 0-4.243Z" clip-rule="evenodd" /></svg>';
  var ICON_PENCIL =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path d="M2.695 14.762l-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.886L17.5 5.501a2.121 2.121 0 0 0-3-3L3.58 13.419a4 4 0 0 0-.885 1.343Z" /></svg>';
  var ICON_TRASH =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd" /></svg>';

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function ext(name) {
    var m = /\.([a-z0-9]+)$/i.exec(name || "");
    return m ? m[1].toLowerCase() : "";
  }

  function formatSize(bytes) {
    if (!bytes && bytes !== 0) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (Math.round((bytes / 1024) * 10) / 10) + " KB";
    return (Math.round((bytes / 1024 / 1024) * 10) / 10) + " MB";
  }

  function reducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function mount(root, opts) {
    opts = opts || {};
    var id = opts.id || "fu-" + Math.random().toString(36).slice(2, 8);
    var accept = (opts.accept || "").split(",").map(function (s) { return s.trim().replace(/^\./, "").toLowerCase(); }).filter(Boolean);
    var maxBytes = (opts.maxSizeMb || 8) * 1024 * 1024;
    var state = {
      files: (opts.files || []).map(function (f) { return { name: f.name, size: f.size, type: f.type || ext(f.name).toUpperCase() }; }),
      uploading: [], // { key, name, size, type, pct }
      error: null,
      disabled: !!opts.disabled,
    };
    var timers = [];

    root.setAttribute("data-file-upload", id);
    root.innerHTML =
      '<div class="flex flex-col gap-2">' +
      '<ul data-fu-list role="list" class="flex flex-col gap-2 empty:hidden"></ul>' +
      '<label data-fu-zone class="' + ZONE + '">' +
      '<input type="file" id="' + esc(id) + '-input" name="' + esc(opts.name || id) + '"' +
      (accept.length ? ' accept="' + esc(accept.map(function (a) { return "." + a; }).join(",")) + '"' : "") +
      (opts.multiple ? " multiple" : "") +
      ' aria-label="' + esc(opts.label || "Upload a file") + '" aria-describedby="' + esc(id) + '-hint" class="sr-only">' +
      '<span class="flex flex-col text-left">' +
      '<span class="' + ZONE_TEXT + '"><span class="' + ZONE_LINK + '">Upload a file</span> or drag and drop</span>' +
      '<span id="' + esc(id) + '-hint" class="' + ZONE_HINT + '">' + esc(opts.acceptLabel || "") + "</span>" +
      "</span>" +
      "</label>" +
      '<p data-fu-error id="' + esc(id) + '-error" class="hidden type-description text-red-600 dark:text-red-400"></p>' +
      '<span data-fu-live class="sr-only" aria-live="polite"></span>' +
      "</div>";

    var list = root.querySelector("[data-fu-list]");
    var zone = root.querySelector("[data-fu-zone]");
    var input = root.querySelector('input[type="file"]');
    var errorEl = root.querySelector("[data-fu-error]");
    var live = root.querySelector("[data-fu-live]");

    function announce(msg) {
      live.textContent = "";
      setTimeout(function () { live.textContent = msg; }, 30);
    }

    function rowHtml(file, index) {
      var meta = [file.type || ext(file.name).toUpperCase(), formatSize(file.size)].filter(Boolean).join(" · ");
      var actions = state.disabled
        ? ""
        : '<span class="isolate inline-flex shrink-0 rounded-md shadow-xs dark:shadow-none">' +
          '<button type="button" data-fu-replace="' + index + '" data-tooltip="Replace file" class="' + GROUP_BUTTON + ' rounded-l-md">' +
          '<span class="sr-only">Replace ' + esc(file.name) + "</span>" + ICON_PENCIL + "</button>" +
          '<button type="button" data-fu-remove="' + index + '" data-tooltip="Remove file" class="' + GROUP_BUTTON + ' -ml-px rounded-r-md">' +
          '<span class="sr-only">Remove ' + esc(file.name) + "</span>" + ICON_TRASH + "</button>" +
          "</span>";
      return (
        '<li class="' + ROW + '">' + ICON_LINK +
        '<span class="flex min-w-0 flex-1 flex-col">' +
        '<span class="truncate type-label-small text-default" title="' + esc(file.name) + '">' + esc(file.name) + "</span>" +
        '<span class="type-caption text-tertiary">' + esc(meta) + "</span>" +
        "</span>" + actions + "</li>"
      );
    }

    function uploadingHtml(up) {
      return (
        '<li class="' + ROW + '" aria-busy="true">' + ICON_LINK +
        '<span class="flex min-w-0 flex-1 flex-col gap-1">' +
        '<span class="flex items-center justify-between gap-3">' +
        '<span class="truncate type-label-small text-default" title="' + esc(up.name) + '">' + esc(up.name) + "</span>" +
        '<span class="shrink-0 type-caption text-tertiary tabular-nums">' + up.pct + "%</span>" +
        "</span>" +
        '<span class="type-caption text-tertiary">Preparing your file…</span>' +
        '<span class="block h-1 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10" role="progressbar" aria-label="Uploading ' + esc(up.name) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + up.pct + '">' +
        '<span data-fu-bar class="block h-full rounded-full bg-blue-600 transition-[width] duration-150 ease-out motion-reduce:transition-none dark:bg-blue-500 ' + widthClass(up.pct) + '"></span>' +
        "</span>" +
        "</span></li>"
      );
    }

    // Tailwind v4 fraction width (w-37/100): class-only, no inline style.
    function widthClass(pct) {
      return pct <= 0 ? "w-0" : pct >= 100 ? "w-full" : "w-" + pct + "/100";
    }

    function render() {
      list.innerHTML =
        state.files.map(rowHtml).join("") +
        state.uploading.map(uploadingHtml).join("");
      var full = !opts.multiple && (state.files.length > 0 || state.uploading.length > 0);
      zone.classList.toggle("hidden", full);
      input.disabled = state.disabled;
      if (state.error) {
        zone.setAttribute("data-invalid", "");
        input.setAttribute("aria-invalid", "true");
        input.setAttribute("aria-describedby", id + "-hint " + id + "-error");
        errorEl.textContent = state.error;
        errorEl.classList.remove("hidden");
      } else {
        zone.removeAttribute("data-invalid");
        input.removeAttribute("aria-invalid");
        input.setAttribute("aria-describedby", id + "-hint");
        errorEl.textContent = "";
        errorEl.classList.add("hidden");
      }
    }

    function changed() {
      if (typeof opts.onChange === "function") opts.onChange(getFiles());
    }

    function validate(file) {
      if (accept.length && accept.indexOf(ext(file.name)) === -1) {
        return "Invalid file format. Please upload a file in one of the supported formats (" +
          accept.map(function (a) { return "." + a; }).join(", ") + ").";
      }
      if (file.size > maxBytes) return "This file is too large. The maximum size is " + (opts.maxSizeMb || 8) + "MB.";
      return null;
    }

    function startUpload(file) {
      var up = { key: Math.random().toString(36).slice(2), name: file.name, size: file.size, type: ext(file.name).toUpperCase(), pct: 1 };
      state.uploading.push(up);
      function finish() {
        state.uploading = state.uploading.filter(function (u) { return u.key !== up.key; });
        state.files.push({ name: up.name, size: up.size, type: up.type });
        render();
        announce(up.name + " uploaded");
        changed();
      }
      if (reducedMotion()) { up.pct = 100; finish(); return; }
      var t = setInterval(function () {
        up.pct = Math.min(100, up.pct + 12 + Math.round(Math.random() * 14));
        if (up.pct >= 100) { clearInterval(t); setTimeout(finish, 150); }
        render();
      }, 120);
      timers.push(t);
    }

    function take(fileList) {
      if (state.disabled) return;
      var files = Array.prototype.slice.call(fileList || []);
      if (!files.length) return;
      if (!opts.multiple) files = files.slice(0, 1);
      var firstError = null;
      files.forEach(function (file) {
        var err = validate(file);
        if (err) { firstError = firstError || err; return; }
        if (!opts.multiple) state.files = [];
        startUpload(file);
      });
      state.error = firstError;
      render();
      if (firstError) announce(firstError);
    }

    var replaceIndex = null;
    input.addEventListener("change", function () {
      if (replaceIndex != null && input.files && input.files[0]) {
        var err = validate(input.files[0]);
        if (!err) state.files.splice(replaceIndex, 1);
      }
      replaceIndex = null;
      take(input.files);
      input.value = "";
    });

    // Drag and drop on the zone.
    var depth = 0;
    zone.addEventListener("dragenter", function (e) {
      if (state.disabled) return;
      e.preventDefault();
      depth += 1;
      zone.setAttribute("data-dragover", "");
    });
    zone.addEventListener("dragover", function (e) {
      if (state.disabled) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    });
    zone.addEventListener("dragleave", function () {
      depth = Math.max(0, depth - 1);
      if (!depth) zone.removeAttribute("data-dragover");
    });
    zone.addEventListener("drop", function (e) {
      e.preventDefault();
      depth = 0;
      zone.removeAttribute("data-dragover");
      if (e.dataTransfer) take(e.dataTransfer.files);
    });

    list.addEventListener("click", function (e) {
      var rm = e.target.closest("[data-fu-remove]");
      var rp = e.target.closest("[data-fu-replace]");
      if (rm) {
        var idx = Number(rm.getAttribute("data-fu-remove"));
        var removed = state.files.splice(idx, 1)[0];
        state.error = null;
        render();
        input.focus();
        if (removed) announce(removed.name + " removed");
        changed();
      } else if (rp) {
        replaceIndex = Number(rp.getAttribute("data-fu-replace"));
        // Single mode hides the zone while a file is there; the picker still opens from the hidden input.
        input.click();
      }
    });

    function getFiles() {
      return state.files.map(function (f) { return { name: f.name, size: f.size, type: f.type }; });
    }

    function setFiles(files) {
      state.files = (files || []).map(function (f) { return { name: f.name, size: f.size, type: f.type || ext(f.name).toUpperCase() }; });
      state.error = null;
      render();
    }

    function setError(msg) {
      state.error = msg || null;
      render();
    }

    function setDisabled(on) {
      state.disabled = !!on;
      render();
    }

    function clear() {
      timers.forEach(clearInterval);
      state.uploading = [];
      setFiles([]);
    }

    function destroy() {
      timers.forEach(clearInterval);
      root.innerHTML = "";
      root.removeAttribute("data-file-upload");
    }

    render();
    return { getFiles: getFiles, setFiles: setFiles, setError: setError, setDisabled: setDisabled, clear: clear, destroy: destroy, input: input };
  }

  return { mount: mount, formatSize: formatSize };
})();

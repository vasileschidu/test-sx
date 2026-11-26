/**
 * smart-enroll/sign-in.js
 * SMART Enroll sign in (TCDM-5242, T2) for src/pages/smart-enroll/sign-in.html.
 * Spec: wiki/products/smart-enroll/flows/sign-in.md (D-7, D-8). Figma [R1] SMART Enroll jLooCmHwqJcYV5p5d8BHnO
 * page 28003:23013. Card, code boxes, business list and field markup are copied from um-accept.js
 * (invite/accept.html); fields use OBField.
 *
 * Steps: email → code (everyone, D-7) | microsoft (Microsoft-linked accounts only, instead of the code)
 *        → business (only with 2+ businesses) → platform (only when the business is Approved, D-8)
 *        → otherwise application.html?status=<business status> (business id in sessionStorage se_business_v1).
 * Prototype rules: no real auth; any email works except the demo "unknown" one; any 6 digits pass except for
 * the demo "wrongCode" email, which locks after data.failedAttemptsBeforeLock wrong codes (session only).
 * Demo: ?step=email|code|microsoft|business|platform|locked&email=<demo email>.
 */
(function () {
  "use strict";

  var DATA_PATH = "../../data/smart-enroll-sign-in.json";
  var SHELL_DATA_PATH = "../../data/smart-enroll.json";
  var APP_URL = "application.html";
  var SIGN_UP_URL = "sign-up.html";
  var HUB_URL = "../dashboard/ap-ar-payments.html";
  var STORE_KEY = "se_signin_v1";
  var BUSINESS_KEY = "se_business_v1"; // read by smart-enroll/shell.js
  var CODE_LEN = 6;
  var LOADING_MS = 600;

  var F = null;
  var data = null;
  var session = { email: "", failed: {}, locked: [] };

  /* ---------- classes (components skill; SMART System button sizes) ---------- */

  var FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400";
  // Primary xl (44px), full width (um-accept.js PRIMARY).
  var PRIMARY =
    "inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-blue-600 px-3.5 py-2.5 text-base/6 font-semibold text-white shadow-xs hover:bg-blue-500 active:bg-blue-700 " + FOCUS +
    " disabled:cursor-not-allowed disabled:bg-blue-300 dark:bg-blue-500 dark:shadow-none dark:hover:bg-blue-400 dark:disabled:bg-blue-500/40 dark:disabled:text-white/60";
  // Soft primary xl (Figma "Resend Code"): blue-50 fill.
  var SOFT =
    "inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-blue-50 px-3.5 py-2.5 text-base/6 font-semibold text-blue-600 hover:bg-blue-100 active:bg-blue-200 " + FOCUS +
    " disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 dark:active:bg-blue-500/25";
  // Secondary md (32px), full width (Figma "Sign Out").
  var SECONDARY =
    "inline-flex w-full cursor-pointer items-center justify-center rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 active:bg-gray-100 " + FOCUS +
    " dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/20";
  var LINK = "cursor-pointer rounded-sm font-semibold text-blue-600 hover:text-blue-500 " + FOCUS + " dark:text-blue-400 dark:hover:text-blue-300";
  // Dismiss X (CLAUDE.md rule 8, Decline Payment dialog).
  var CLOSE =
    "shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-300 cursor-pointer " + FOCUS;
  var CARD = "w-full max-w-107 overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-black/5 dark:bg-gray-900 dark:shadow-none dark:ring-white/10";
  var DIGIT =
    "h-10 min-w-0 flex-1 rounded-md border-0 bg-white text-center text-base text-gray-900 shadow-xs outline-1 -outline-offset-1 outline-gray-300 hover:outline-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 aria-invalid:text-red-800 aria-invalid:outline-red-300 focus:aria-invalid:outline-red-600 dark:bg-white/5 dark:text-white dark:outline-white/15 dark:hover:outline-white/20 dark:focus:outline-blue-500 dark:aria-invalid:text-red-400 dark:aria-invalid:outline-red-500/50 dark:focus:aria-invalid:outline-red-500";
  var AVATAR_TONES = ["bg-gray-500", "bg-orange-600", "bg-indigo-500", "bg-teal-600", "bg-pink-500"];

  /* ---------- icons ---------- */

  var SPINNER =
    '<svg class="size-4 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z"></path></svg>';
  var ICON = {
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="size-5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>',
    xCircle: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 shrink-0 text-red-400"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" /></svg>',
    warning: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 shrink-0 text-yellow-400 dark:text-yellow-300"><path fill-rule="evenodd" clip-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" /></svg>',
    back: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clip-rule="evenodd" /></svg>',
    info: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4.5"><path fill-rule="evenodd" clip-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" /></svg>',
    search: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-gray-400 dark:text-gray-500"><path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clip-rule="evenodd" /></svg>',
    plus: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>',
    arrowUpRight: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 shrink-0"><path fill-rule="evenodd" d="M5.22 14.78a.75.75 0 0 0 1.06 0l7.22-7.22v5.69a.75.75 0 0 0 1.5 0v-7.5a.75.75 0 0 0-.75-.75h-7.5a.75.75 0 0 0 0 1.5h5.69l-7.22 7.22a.75.75 0 0 0 0 1.06Z" clip-rule="evenodd" /></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>',
    plusLarge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>',
  };

  // Figma "Smart Logo" (Smart Suite): colour cube in a white hexagon. Choose a Business / Select Platform use the
  // pale hexagon logo (same asset as invite/accept.html).
  var LOGO_SUITE = '<img src="../../assets/smart-enroll/suite-logo-hex.svg" alt="" width="72" height="72" class="size-18 drop-shadow-md" />';
  var LOGO_PALE =
    '<div class="flex size-18 items-center justify-center"><img src="../../assets/invite/portal-logo-hex.svg" alt="" width="101" height="109" class="-mx-3.5 -my-4.5 max-w-none" /></div>';

  /* ---------- helpers ---------- */

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function $(id) {
    return document.getElementById(id);
  }

  function load() {
    try {
      var saved = JSON.parse(window.sessionStorage.getItem(STORE_KEY));
      if (saved) session = { email: saved.email || "", failed: saved.failed || {}, locked: saved.locked || [] };
    } catch (e) {}
  }

  function save() {
    try {
      window.sessionStorage.setItem(STORE_KEY, JSON.stringify(session));
    } catch (e) {}
  }

  function accountFor(email) {
    var key = String(email || "").trim().toLowerCase();
    var found = (data.accounts || []).filter(function (a) { return a.email === key; })[0];
    if (found) return found;
    var local = key.split("@")[0].split(/[._-]/)[0] || "";
    return {
      email: key,
      firstName: local ? local.charAt(0).toUpperCase() + local.slice(1) : "",
      businesses: (data.defaultAccount && data.defaultAccount.businesses) || [],
    };
  }

  function business(id) {
    var b = (data.businesses || {})[id];
    return b ? Object.assign({ id: id }, b) : null;
  }

  function isLocked(email) {
    return session.locked.indexOf(String(email).toLowerCase()) !== -1;
  }

  function initials(name) {
    return String(name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join("");
  }

  /* ---------- view plumbing ---------- */

  function view(html) {
    var el = $("si-view");
    el.innerHTML = html;
    el.removeAttribute("aria-busy");
    var t = $("si-title");
    if (t) t.focus({ preventScroll: true });
  }

  function cardHeader(titleHtml, opts) {
    opts = opts || {};
    return (
      '<div class="flex flex-col items-center gap-6 border-b border-gray-200 p-8 dark:border-white/10">' +
      (opts.logo || LOGO_SUITE) +
      '<div class="flex flex-col items-center gap-1 text-center">' +
      '<h1 id="si-title" tabindex="-1" class="text-2xl/8 font-semibold text-default focus:outline-hidden">' + titleHtml + "</h1>" +
      (opts.subtitle ? '<p class="type-description text-tertiary">' + esc(opts.subtitle) + "</p>" : "") +
      "</div></div>"
    );
  }

  var SIGN_IN_TITLE = '<span class="font-normal">Sign into</span> SMART Suite';

  function loading(fn) {
    var el = $("si-loading");
    el.setAttribute("data-open", "");
    $("si-view").setAttribute("aria-busy", "true");
    setTimeout(function () {
      el.removeAttribute("data-open");
      fn();
    }, LOADING_MS);
  }

  // Top alert (Tailwind Plus alert + dismiss; X = CLAUDE.md rule 8).
  function alertTop(message) {
    var host = $("si-alert");
    host.innerHTML =
      '<div role="alert" class="pointer-events-auto flex w-fit max-w-xl items-start gap-3 rounded-md bg-red-50 p-4 shadow-lg ring-1 ring-red-600/10 dark:bg-gray-900 dark:bg-linear-to-r dark:from-red-500/15 dark:to-red-500/15 dark:shadow-none dark:ring-red-500/25">' +
      ICON.xCircle +
      '<p class="min-w-0 flex-1 type-body text-red-800 dark:text-red-200">' + esc(message) + "</p>" +
      '<button type="button" data-si-alert-close class="-my-1 ' + CLOSE + '"><span class="sr-only">Dismiss</span>' + ICON.x + "</button></div>";
    host.querySelector("[data-si-alert-close]").addEventListener("click", clearAlert);
  }

  function clearAlert() {
    $("si-alert").innerHTML = "";
  }

  function lockedMessage() {
    var email = (data.support && data.support.email) || "support@smart-hub.com";
    return (
      "Your account has been locked due to multiple unsuccessful login attempts. For security reasons, we have locked your account to protect your information. To unlock your account, please contact our customer support team at " +
      email + ". We apologize for the inconvenience and thank you for helping us keep our application secure for all users."
    );
  }

  /* ---------- 1. Email (28429:27507; errors 28682:80726, 81133, 82192) ---------- */

  function renderEmail(opts) {
    opts = opts || {};
    closeMicrosoft();
    view(
      '<section class="' + CARD + '">' +
      cardHeader(SIGN_IN_TITLE) +
      '<form id="si-email-form" novalidate class="flex flex-col gap-6 p-8">' +
      '<div class="flex flex-col gap-1">' +
      '<label for="si-email" class="' + F.LABEL + '">Email</label>' +
      '<div class="relative"><input id="si-email" type="email" autocomplete="email" placeholder="you@example.com" value="' + esc(session.email) + '" aria-invalid="false" aria-describedby="si-email-error" class="' + F.INPUT + '" />' + F.errorIcon() + "</div>" +
      '<p id="si-email-error" class="hidden ' + F.ERROR_TEXT + '"></p>' +
      "</div>" +
      '<div id="si-email-warning" class="hidden"></div>' +
      '<div class="flex flex-col gap-6">' +
      '<button id="si-email-submit" type="submit" class="' + PRIMARY + '">Sign in</button>' +
      '<p class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 type-body text-secondary">Don’t have an account? <a href="' + SIGN_UP_URL + '" class="' + LINK + '">Enroll now</a></p>' +
      "</div></form></section>",
    );
    var form = $("si-email-form");
    var input = $("si-email");
    var submit = $("si-email-submit");
    var warning = $("si-email-warning");

    function setWarning(msg) {
      warning.innerHTML = msg
        ? '<div role="alert" class="flex gap-3 rounded-md bg-yellow-50 p-4 dark:bg-yellow-500/10 dark:outline dark:outline-yellow-500/15">' + ICON.warning +
          '<p class="type-body text-yellow-700 dark:text-yellow-200">' + esc(msg) + "</p></div>"
        : "";
      warning.classList.toggle("hidden", !msg);
    }

    input.addEventListener("input", function () {
      if (input.value.trim()) F.setError(input, false, $("si-email-error"), "");
      setWarning("");
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (submit.disabled) return;
      var email = input.value.trim();
      setWarning("");
      if (!email) {
        F.setError(input, true, $("si-email-error"), "Email address is required");
        input.focus();
        return;
      }
      F.setError(input, false, $("si-email-error"), "");
      var account = accountFor(email);
      if (account.unknown) {
        setWarning("Your email address does not exist in our records, please click on the ‘Enroll now’.");
        return;
      }
      session.email = email;
      save();
      if (isLocked(email)) {
        alertTop(lockedMessage());
        return;
      }
      clearAlert();
      submit.disabled = true;
      submit.setAttribute("aria-busy", "true");
      submit.innerHTML = SPINNER + "<span>Signing in…</span>";
      loading(function () {
        if (account.microsoft) renderMicrosoft(account);
        else renderCode(account);
      });
    });
    if (opts.locked) alertTop(lockedMessage());
    if (!opts.keepFocus) input.focus();
  }

  /* ---------- 2. Code (28437:29823; errors 28682:80802, 81210) ---------- */

  function renderCode(account) {
    var boxes = "";
    for (var i = 0; i < CODE_LEN; i += 1) {
      boxes +=
        '<input data-si-digit="' + i + '" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="' + (i === 0 ? "one-time-code" : "off") + '" maxlength="1" aria-label="Digit ' + (i + 1) + " of " + CODE_LEN + '" aria-invalid="false" aria-describedby="si-code-error" class="' + DIGIT + '" />';
    }
    view(
      '<section class="' + CARD + '">' +
      cardHeader(SIGN_IN_TITLE) +
      '<form id="si-code-form" novalidate class="flex flex-col gap-8 p-8"><div class="flex flex-col gap-6"><div class="flex flex-col gap-2">' +
      '<button type="button" id="si-back" class="-m-1 w-fit cursor-pointer rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 ' + FOCUS + ' dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-300"><span class="sr-only">Back</span>' + ICON.back + "</button>" +
      '<p class="type-body-large text-secondary">A one-time passcode has been sent to<br /><span class="font-semibold break-all text-default">' + esc(session.email) + "</span></p></div>" +
      '<fieldset class="flex min-w-0 flex-col gap-2"><legend class="sr-only">Enter the 6 digit code</legend>' +
      '<div class="flex w-full items-center justify-between gap-2 pb-2"><span aria-hidden="true" class="' + F.LABEL + '">Enter the 6 digit code</span>' +
      // Information circle + Tooltip (components skill), end-aligned: the icon sits at the card's right edge.
      '<span class="group/info relative inline-flex size-5 items-center justify-center"><span tabindex="0" role="button" aria-describedby="si-code-tip" class="inline-flex cursor-help rounded-full text-gray-400 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 dark:text-gray-500 dark:hover:text-white dark:focus-visible:outline-blue-400"><span class="sr-only">About the code</span>' + ICON.info + "</span>" +
      '<span id="si-code-tip" role="tooltip" class="pointer-events-none invisible absolute top-full right-0 z-30 -mr-1 mt-3 w-max max-w-64 rounded-lg bg-gray-900 p-3 text-left text-sm/5 font-normal text-gray-100 opacity-0 shadow-xs transition-opacity duration-150 group-hover/info:visible group-hover/info:opacity-100 group-has-focus-visible/info:visible group-has-focus-visible/info:opacity-100 before:absolute before:-top-1 before:right-1.5 before:size-3 before:rotate-45 before:rounded-xs before:bg-inherit dark:bg-gray-950 dark:ring-1 dark:ring-white/10">The code is valid for 10 minutes. Check your spam folder if you can’t find the email.</span></span></div>' +
      '<div class="flex gap-2.5">' + boxes + "</div>" +
      '<p id="si-code-error" class="hidden ' + F.ERROR_TEXT + '"></p></fieldset>' +
      '</div><div class="flex flex-col gap-4">' +
      '<button id="si-code-submit" type="submit" class="' + PRIMARY + '">Submit</button>' +
      '<button id="si-resend" type="button" class="' + SOFT + '">Resend Code</button>' +
      '<p id="si-resent" role="status" class="hidden text-center type-caption text-tertiary"></p>' +
      "</div></form></section>",
    );
    bindCode(account);
  }

  function bindCode(account) {
    var inputs = Array.prototype.slice.call(document.querySelectorAll("[data-si-digit]"));
    var form = $("si-code-form");
    var submit = $("si-code-submit");
    var error = $("si-code-error");

    function value() { return inputs.map(function (i) { return i.value; }).join(""); }
    function setError(msg) {
      error.textContent = msg || "";
      error.classList.toggle("hidden", !msg);
      inputs.forEach(function (i) { i.setAttribute("aria-invalid", msg ? "true" : "false"); });
    }
    function fill(from, text) {
      var digits = String(text || "").replace(/\D/g, "").split("");
      if (!digits.length) return;
      for (var k = 0; k < digits.length && from + k < inputs.length; k += 1) inputs[from + k].value = digits[k];
      var next = Math.min(from + digits.length, inputs.length - 1);
      inputs[next].focus();
      inputs[next].select();
    }

    inputs.forEach(function (input, idx) {
      input.addEventListener("focus", function () { input.select(); });
      input.addEventListener("input", function () {
        setError("");
        var v = input.value.replace(/\D/g, "");
        if (v.length > 1) { input.value = ""; fill(idx, v); return; }
        input.value = v;
        if (v && idx < inputs.length - 1) inputs[idx + 1].focus();
      });
      input.addEventListener("keydown", function (e) {
        if (e.key === "Backspace" && !input.value && idx > 0) { inputs[idx - 1].value = ""; inputs[idx - 1].focus(); e.preventDefault(); }
        else if (e.key === "Delete") { input.value = ""; e.preventDefault(); }
        else if (e.key === "ArrowLeft" && idx > 0) { inputs[idx - 1].focus(); e.preventDefault(); }
        else if (e.key === "ArrowRight" && idx < inputs.length - 1) { inputs[idx + 1].focus(); e.preventDefault(); }
        else if (e.key === "Home") { inputs[0].focus(); e.preventDefault(); }
        else if (e.key === "End") { inputs[inputs.length - 1].focus(); e.preventDefault(); }
      });
      input.addEventListener("paste", function (e) {
        e.preventDefault();
        setError("");
        fill(idx, (e.clipboardData || window.clipboardData).getData("text"));
      });
    });

    $("si-back").addEventListener("click", function () { clearAlert(); renderEmail(); });
    $("si-resend").addEventListener("click", function () {
      inputs.forEach(function (i) { i.value = ""; });
      setError("");
      clearAlert();
      var note = $("si-resent");
      note.textContent = "A new code has been sent to " + session.email + ".";
      note.classList.remove("hidden");
      inputs[0].focus();
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (submit.disabled) return;
      var code = value();
      if (code.length < CODE_LEN) {
        setError("The code is required");
        var empty = inputs.filter(function (i) { return !i.value; })[0] || inputs[0];
        empty.focus();
        return;
      }
      setError("");
      if (account.wrongCode) {
        var key = session.email.toLowerCase();
        session.failed[key] = (session.failed[key] || 0) + 1;
        if (session.failed[key] >= (data.failedAttemptsBeforeLock || 5)) {
          if (session.locked.indexOf(key) === -1) session.locked.push(key);
          save();
          renderEmail({ locked: true, keepFocus: true });
          return;
        }
        save();
        alertTop("Code is invalid or expired.");
        inputs[0].focus();
        return;
      }
      clearAlert();
      submit.disabled = true;
      submit.setAttribute("aria-busy", "true");
      submit.innerHTML = SPINNER + "<span>Submitting…</span>";
      loading(function () { afterAuth(account); });
    });
    inputs[0].focus();
  }

  /* ---------- 2b. Microsoft account picker (28437:30146) ---------- */

  function closeMicrosoft() {
    var el = $("si-microsoft");
    el.removeAttribute("data-open");
    el.innerHTML = "";
    $("si-page").classList.remove("hidden");
  }

  function renderMicrosoft(account) {
    var el = $("si-microsoft");
    var name = [account.firstName, account.lastName].filter(Boolean).join(" ") || session.email;
    var ROW =
      "flex w-full cursor-pointer items-center gap-3 px-6 py-3 text-left text-default hover:bg-gray-100 active:bg-gray-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 sm:px-11 dark:hover:bg-white/10 dark:active:bg-white/15 dark:focus-visible:outline-blue-400";
    el.innerHTML =
      '<section aria-labelledby="si-ms-title" class="w-full max-w-110 bg-white p-6 shadow-xl sm:p-11 dark:bg-gray-900 dark:shadow-none dark:ring-1 dark:ring-white/10">' +
      '<div class="flex items-center gap-2"><img src="../../assets/smart-enroll/microsoft-logo.svg" alt="" width="21" height="21" class="size-5" /><span class="type-title-small text-secondary">Microsoft</span></div>' +
      '<h1 id="si-ms-title" tabindex="-1" class="mt-4 type-title-section text-default focus:outline-hidden">Pick an account</h1>' +
      '<ul role="list" class="-mx-6 mt-4 mb-10 flex flex-col sm:-mx-11">' +
      '<li><button type="button" data-si-ms-account class="' + ROW + '">' +
      '<span aria-hidden="true" class="flex size-10 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-700 dark:bg-white/10 dark:text-gray-300">' + ICON.user + "</span>" +
      '<span class="flex min-w-0 flex-col"><span class="truncate type-body text-default">' + esc(name) + '</span><span class="truncate type-caption text-secondary">' + esc(session.email) + '</span><span class="type-caption text-tertiary">Signed in</span></span></button></li>' +
      '<li><button type="button" data-si-ms-other class="' + ROW + '">' +
      '<span aria-hidden="true" class="flex size-10 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-700 dark:bg-white/10 dark:text-gray-300">' + ICON.plusLarge + "</span>" +
      '<span class="type-body text-default">Use another account</span></button></li></ul></section>';
    el.setAttribute("data-open", "");
    clearAlert();
    // Microsoft's own screen: the SMART page underneath is hidden, not just covered.
    $("si-page").classList.add("hidden");
    el.querySelector("[data-si-ms-account]").addEventListener("click", function () {
      loading(function () { closeMicrosoft(); afterAuth(account); });
    });
    el.querySelector("[data-si-ms-other]").addEventListener("click", function () {
      session.email = "";
      save();
      renderEmail();
    });
    $("si-ms-title").focus({ preventScroll: true });
  }

  /* ---------- after sign in: business count (D-8) ---------- */

  function afterAuth(account) {
    var list = (account.businesses || []).map(business).filter(Boolean);
    if (list.length >= 2) return renderBusiness(account, list);
    if (list.length === 1) return enter(account, list[0]);
    window.location.href = APP_URL;
  }

  function enter(account, biz) {
    try {
      window.sessionStorage.setItem(BUSINESS_KEY, JSON.stringify(biz.id));
    } catch (e) {}
    if (biz.status === "approved") return renderPlatform(account, biz);
    window.location.href = APP_URL + "?status=" + encodeURIComponent(biz.status || "not-submitted");
  }

  /* ---------- 3. Choose a Business (28456:32053) ---------- */

  function renderBusiness(account, list) {
    var rows = list.map(function (b, i) {
      return (
        '<li><button type="button" data-si-business="' + esc(b.id) + '" class="flex w-full cursor-pointer items-center gap-3 px-4 py-4 text-left text-default hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 dark:hover:bg-white/5 dark:active:bg-white/10 dark:focus-visible:outline-blue-400">' +
        '<span aria-hidden="true" class="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-medium text-white ' + AVATAR_TONES[i % AVATAR_TONES.length] + '">' + esc(initials(b.name)) + "</span>" +
        '<span class="flex min-w-0 flex-1 flex-col gap-1"><span class="truncate type-label text-default">' + esc(b.name) + "</span>" +
        '<span class="flex min-w-0 items-center gap-2"><span class="inline-flex shrink-0 items-center rounded-sm border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs/4 font-medium text-gray-800 dark:border-white/15 dark:bg-white/10 dark:text-gray-300">ID : ' + esc(b.number) + "</span>" +
        (b.invitedBy ? '<span aria-hidden="true" class="type-caption text-tertiary">•</span><span class="truncate type-caption text-secondary" title="' + esc(b.invitedBy) + '"><span class="sr-only">Invited by </span>' + esc(b.invitedBy) + "</span>" : "") +
        "</span></span></button></li>"
      );
    }).join("");
    view(
      '<section class="' + CARD + '">' +
      cardHeader("Choose a Business", { logo: LOGO_PALE, subtitle: "to continue with Onboarding" }) +
      '<div class="border-b border-gray-200 p-4 dark:border-white/10"><div class="relative">' + ICON.search +
      '<input id="si-business-search" type="search" placeholder="Search business" aria-label="Search business" aria-controls="si-business-list" class="' + F.INPUT + ' pl-10" /></div></div>' +
      '<ul id="si-business-list" role="list" class="max-h-83 divide-y divide-gray-200 overflow-y-auto dark:divide-white/10">' + rows + "</ul>" +
      '<p id="si-business-empty" role="status" class="hidden px-6 py-6 text-center type-body text-tertiary">No business matches your search.</p>' +
      '<div class="flex justify-center border-t border-gray-200 px-4 py-4 dark:border-white/10"><a href="' + SIGN_UP_URL + '" class="inline-flex items-center gap-1 px-2 py-1.5 type-body-large ' + LINK + '">' + ICON.plus + "Set Up a New Business</a></div>" +
      '<div class="border-t border-gray-200 p-4 dark:border-white/10"><button type="button" id="si-sign-out" class="' + SECONDARY + '">Sign Out</button></div>' +
      "</section>",
    );
    var search = $("si-business-search");
    search.addEventListener("input", function () {
      var q = search.value.trim().toLowerCase();
      var shown = 0;
      document.querySelectorAll("#si-business-list li").forEach(function (li) {
        var match = li.textContent.toLowerCase().indexOf(q) !== -1;
        li.classList.toggle("hidden", !match);
        if (match) shown += 1;
      });
      $("si-business-empty").classList.toggle("hidden", shown > 0);
    });
    $("si-business-list").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-si-business]");
      if (!btn) return;
      var biz = business(btn.getAttribute("data-si-business"));
      loading(function () { enter(account, biz); });
    });
    $("si-sign-out").addEventListener("click", signOut);
  }

  function signOut() {
    session.email = "";
    save();
    try {
      window.sessionStorage.removeItem(BUSINESS_KEY);
    } catch (e) {}
    loading(function () { renderEmail(); });
  }

  /* ---------- 4. Select Platform (28437:30376) ---------- */

  function platformCard(opts) {
    return (
      '<a href="' + opts.href + '" class="group flex flex-col gap-8 rounded-3xl bg-white p-8 text-default shadow-lg ring-1 ring-black/5 transition hover:shadow-xl hover:ring-blue-600/30 active:ring-blue-600/50 ' + FOCUS + ' motion-reduce:transition-none dark:bg-gray-900 dark:shadow-none dark:ring-white/10 dark:hover:bg-gray-800 dark:hover:ring-blue-400/40 dark:active:ring-blue-400/60">' +
      '<div class="flex justify-center">' + LOGO_PALE + "</div>" +
      '<div class="flex flex-col gap-2"><h2 class="text-2xl/8 font-semibold text-default">SMART <span class="font-normal">' + opts.product + "</span></h2>" +
      '<p class="type-description text-tertiary">' + opts.text + "</p></div>" +
      '<span class="flex items-center justify-between gap-2 type-link text-blue-600 group-hover:text-blue-500 dark:text-blue-400 dark:group-hover:text-blue-300">' + opts.action + ICON.arrowUpRight + "</span></a>"
    );
  }

  function renderPlatform(account, biz) {
    var first = account.firstName || "there";
    view(
      '<section class="flex w-full max-w-198 flex-col items-center gap-8">' +
      '<div class="flex max-w-165 flex-col items-center gap-1 text-center">' +
      '<h1 id="si-title" tabindex="-1" class="type-title-page text-default focus:outline-hidden">Hi ' + esc(first) + ",</h1>" +
      '<p class="type-body-large text-secondary">For edits to your enrollment please select SMART Enroll. To begin managing your payments, select SMART Hub:</p></div>' +
      '<div class="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8">' +
      platformCard({ href: APP_URL + "?status=" + encodeURIComponent(biz.status), product: "Enroll", text: "Onboarding portal for SMART Suite access", action: "Go to Onboarding Portal" }) +
      platformCard({ href: HUB_URL, product: "Hub", text: "Portal to initiate and manage payments", action: "Go to SMART Hub" }) +
      "</div></section>",
    );
  }

  /* ---------- demo hint ---------- */

  // Built when the hint opens (and emptied when it closes) so no hidden controls sit in the page.
  function renderDemo() {
    var details = $("si-demo");
    var list = document.querySelector("[data-si-demo-list]");
    if (!details || !list) return;
    details.addEventListener("toggle", function () {
      list.innerHTML = !details.open
        ? ""
        : (data.accounts || []).map(function (a) {
            return '<li class="flex flex-col"><button type="button" data-si-demo-email="' + esc(a.email) + '" class="w-fit ' + LINK + ' type-caption">' + esc(a.email) + "</button>" +
              '<span class="type-caption text-tertiary">' + esc(a.hint || "") + "</span></li>";
          }).join("") +
          '<li class="type-caption text-tertiary">Any other email: one Not submitted business → the application. Any 6 digits pass.</li>';
    });
    list.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-si-demo-email]");
      if (!btn) return;
      session.email = btn.getAttribute("data-si-demo-email");
      save();
      clearAlert();
      renderEmail();
    });
  }

  /* ---------- boot ---------- */

  function init(json) {
    data = json || {};
    load();
    renderDemo();
    var params = new URLSearchParams(window.location.search);
    if (params.get("email")) {
      session.email = params.get("email");
      save();
    }
    var account = accountFor(session.email || "jordan.ellis@brightline-supply.example");
    var step = params.get("step");
    if (step === "code") return renderCode(account);
    if (step === "microsoft") return renderMicrosoft(account);
    if (step === "business") return renderBusiness(account, ((account.businesses || []).length >= 2 ? account : accountFor("multi@smart-enroll.demo")).businesses.map(business).filter(Boolean));
    if (step === "platform") return renderPlatform(account, business("biz_northwind"));
    if (step === "locked") return renderEmail({ locked: true, keepFocus: true });
    renderEmail();
  }

  function start() {
    F = window.OBField;
    // Support address comes from the shell data (one placeholder, TODO(confirm) in sign-in.md).
    Promise.all([
      window.DataSource.load(DATA_PATH),
      window.DataSource.load(SHELL_DATA_PATH).catch(function () { return {}; }),
    ])
      .then(function (res) {
        res[0].support = res[1].support;
        init(res[0]);
      })
      .catch(function () { init({}); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();

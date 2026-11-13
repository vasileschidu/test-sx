/**
 * um-accept.js
 * src/pages/invite/accept.html — the invitation link (User Management phase 3).
 *   ?inv=<base64url JSON {id, email, firstName, lastName, roleNames, business, invitedBy, message, exp}>
 * States: "form" → "code" → "business" → "done", "expired", "revoked" (revoked or
 * unknown to this browser's store), "already" (accepted before), "broken" (no / bad link).
 * On the inviter's browser (sx_um_v1 present) the store decides revoked / accepted and
 * accepting turns the user Active; on any other browser the link alone is enough, and
 * accepting is remembered locally (sx_um_accepted) so the link then reads "already accepted".
 * Figma qiy6GvUHQMhdbC7hkXCCyb 271:111827: Initial Form → Enter Verification Code (any 6 digits
 * pass except 000000) → Choose a Business → You are in SMART Hub. Fields: OBField.
 */
(function () {
  "use strict";

  var ACCEPTED_KEY = "sx_um_accepted";
  var HUB_URL = "../dashboard/user-management.html";
  var F = null;
  var invite = null;

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function card() {
    return document.getElementById("ua-card");
  }

  function show(html) {
    var el = card();
    el.innerHTML = html;
    el.removeAttribute("aria-busy");
  }

  function readAccepted() {
    try {
      return JSON.parse(window.localStorage.getItem(ACCEPTED_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function rememberAccepted(id) {
    var list = readAccepted();
    if (list.indexOf(id) === -1) list.push(id);
    try {
      window.localStorage.setItem(ACCEPTED_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  function formatDate(iso) {
    var date = new Date(iso);
    return isNaN(date.getTime())
      ? ""
      : date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }

  // ── Card shell (Figma "Create Account from Invitation" 271:111827) ──

  var LOGO =
    '<div class="flex size-18 items-center justify-center"><img src="../../assets/invite/portal-logo-hex.svg" alt="" width="101" height="109" class="-mx-3.5 -my-4.5 max-w-none" /></div>';

  var PRIMARY =
    "inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-blue-600 px-3.5 py-2.5 text-base/6 font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 dark:bg-blue-500 dark:shadow-none dark:hover:bg-blue-400 dark:disabled:bg-blue-500/40 dark:disabled:text-white/60";
  var LINK =
    "cursor-pointer rounded-sm font-semibold text-blue-600 hover:text-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-blue-400 dark:hover:text-blue-300";
  var SPINNER =
    '<svg class="size-4 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z"></path></svg>';
  var INFO_ICON =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 shrink-0 text-blue-400"><path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clip-rule="evenodd" /></svg>';

  // Header: logo, title, optional subtitle / extra (the invited-by box), bottom rule.
  function header(title, opts) {
    opts = opts || {};
    return (
      '<div class="flex flex-col gap-4 border-b border-gray-200 p-8 dark:border-white/10">' +
      '<div class="flex flex-col items-center gap-6">' + LOGO +
      '<div class="flex flex-col items-center gap-1 text-center">' +
      '<h1 id="ua-title" tabindex="-1" class="text-2xl/8 font-semibold text-gray-900 focus:outline-hidden dark:text-white">' + title + "</h1>" +
      (opts.subtitle ? '<p class="text-sm/5 text-gray-500 dark:text-gray-400">' + opts.subtitle + "</p>" : "") +
      "</div></div>" +
      (opts.extra || "") +
      "</div>"
    );
  }

  function screen(headerHtml, bodyHtml) {
    show(headerHtml + (bodyHtml ? '<div class="flex flex-col gap-6 p-8">' + bodyHtml + "</div>" : ""));
    var t = document.getElementById("ua-title");
    if (t && document.activeElement === document.body) t.focus({ preventScroll: true });
  }

  // ── Status cards (expired / revoked / already / broken) in the same card ──

  var ICONS = {
    error: { tile: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400", svg: '<path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clip-rule="evenodd" />' },
    clock: { tile: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400", svg: '<path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clip-rule="evenodd" />' },
    check: { tile: "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400", svg: '<path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" />' },
  };

  function statusCard(kind, title, text, action) {
    var icon = ICONS[kind];
    screen(
      header(title),
      '<div class="flex flex-col items-center gap-4 text-center">' +
      '<span class="flex size-12 items-center justify-center rounded-full ' + icon.tile + '"><svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-6">' + icon.svg + "</svg></span>" +
      '<p class="text-sm/5 text-gray-600 dark:text-gray-400">' + text + "</p>" +
      (action || "") +
      "</div>",
    );
  }

  function hubButton(label) {
    return '<a href="' + HUB_URL + '" class="' + PRIMARY + ' mt-2">' + esc(label) + "</a>";
  }

  function renderBroken() {
    statusCard("error", "This link doesn’t work",
      "The invitation link is incomplete or damaged. Open it again from the email, or ask the person who invited you to send a new one.");
  }

  function renderRevoked() {
    statusCard("error", "This invitation is no longer valid",
      "It was cancelled by " + esc(invite.invitedBy || "the business") + ". Ask them to send you a new invitation to " + esc(invite.business || "the business") + ".");
  }

  function renderExpired() {
    statusCard("clock", "This invitation has expired",
      "It expired on " + esc(formatDate(invite.exp)) + ". Ask " + esc(invite.invitedBy || "the person who invited you") + " to resend it.");
  }

  function renderAlready() {
    statusCard("check", "You’ve already accepted this invitation",
      "Your account for " + esc(invite.business || "this business") + " is set up. Sign in to SMART Hub to continue.",
      hubButton("Go to SMART Hub"));
  }

  // ── 1. Initial Form (271:113206) ──

  function textField(id, label, value, opts) {
    opts = opts || {};
    return (
      '<div class="flex flex-col gap-1">' +
      '<div class="flex items-start gap-1 text-sm/5 font-medium"><label for="' + id + '" class="text-gray-700 dark:text-gray-300">' + label + "</label>" +
      (opts.hint ? '<span class="flex-1 text-right text-gray-400 dark:text-gray-500">' + opts.hint + "</span>" : "") +
      "</div>" +
      '<div class="relative">' +
      (opts.icon || "") +
      '<input id="' + id + '" type="' + (opts.type || "text") + '" value="' + esc(value) + '" autocomplete="' + (opts.autocomplete || "off") + '"' +
      (opts.placeholder ? ' placeholder="' + esc(opts.placeholder) + '"' : "") +
      (opts.inputmode ? ' inputmode="' + opts.inputmode + '"' : "") +
      ' aria-invalid="false" aria-describedby="' + id + '-error"' +
      (opts.disabled ? " disabled" : "") +
      ' class="' + F.INPUT + (opts.inputClass ? " " + opts.inputClass : "") + '" />' +
      F.errorIcon() +
      "</div>" +
      '<p id="' + id + '-error" class="hidden ' + F.ERROR_TEXT + '"></p>' +
      "</div>"
    );
  }

  var PHONE_ICON =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-gray-400 dark:text-gray-500"><path fill-rule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.513 2.31a1.5 1.5 0 0 1-1.02 1.76l-1.296.433a12.035 12.035 0 0 0 7.012 7.012l.433-1.296a1.5 1.5 0 0 1 1.76-1.02l2.31.513A1.5 1.5 0 0 1 18 14.352V15.5a1.5 1.5 0 0 1-1.5 1.5H15c-7.18 0-13-5.82-13-13V3.5Z" clip-rule="evenodd" /></svg>';

  var profile = { firstName: "", lastName: "", phone: "" };

  function renderForm() {
    var invitedBy = invite.invitedByEmail || invite.invitedBy;
    screen(
      header("Welcome to SMART Hub", {
        extra:
          '<div class="rounded-lg bg-gray-50 p-4 text-sm/5 font-medium text-gray-600 dark:bg-white/5 dark:text-gray-400">' +
          "You’ve been invited by " +
          (invitedBy ? '<span class="text-blue-600 dark:text-blue-400">' + esc(invitedBy) + "</span>" : "your team") +
          " to join " + '<span class="font-semibold">' + esc(invite.business || "the") + "</span> business." +
          (invite.message ? '<span class="mt-2 block font-normal text-gray-500 italic dark:text-gray-400">“' + esc(invite.message) + "”</span>" : "") +
          "</div>",
      }),
      '<div class="flex gap-3 rounded-md bg-blue-50 p-4 dark:bg-blue-500/10">' + INFO_ICON +
      '<p class="text-xs/4 font-medium text-blue-800 dark:text-blue-300">Some fields are pre-filled for your convenience. You can edit them if needed to ensure accuracy. Your information, your control.</p></div>' +
      '<form id="ua-form" novalidate class="flex flex-col gap-6">' +
      textField("ua-email", "Email", invite.email, { type: "email", disabled: true }) +
      '<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">' +
      textField("ua-first", "First name", profile.firstName || invite.firstName, { autocomplete: "given-name" }) +
      textField("ua-last", "Last name", profile.lastName || invite.lastName, { autocomplete: "family-name" }) +
      "</div>" +
      textField("ua-phone", "Phone number", profile.phone, { type: "tel", autocomplete: "tel", hint: "Optional", placeholder: "+1 00 000 000", inputmode: "tel", icon: PHONE_ICON, inputClass: "pl-10" }) +
      '<div class="flex flex-col gap-6">' +
      '<div class="flex flex-col gap-1"><div class="flex items-start gap-2">' +
      '<app-checkbox id="ua-terms-box" input-id="ua-terms" aria-describedby="ua-terms-error"></app-checkbox>' +
      '<label for="ua-terms" class="text-xs/4 font-medium text-gray-500 dark:text-gray-400">I’ve read, understood and consent to the ' +
      '<a href="https://smart-enroll.com/terms-of-use/EN" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-500 dark:text-blue-400">Terms of Use</a> and ' +
      '<a href="https://smart-enroll.com/privacy-policy/EN" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-500 dark:text-blue-400">Privacy Policy</a></label></div>' +
      '<p id="ua-terms-error" class="hidden ' + F.ERROR_TEXT + '"></p></div>' +
      '<button id="ua-submit" type="submit" class="' + PRIMARY + '">Get Started</button>' +
      "</div></form>",
    );
    bindForm();
  }

  function bindForm() {
    var form = document.getElementById("ua-form");
    var first = document.getElementById("ua-first");
    var last = document.getElementById("ua-last");
    var phone = document.getElementById("ua-phone");
    var submit = document.getElementById("ua-submit");
    var touched = {};

    function err(input, message) {
      F.setError(input, !!message, document.getElementById(input.id + "-error"), message || "");
    }
    function termsInput() {
      return document.getElementById("ua-terms");
    }
    function messages() {
      var digits = phone.value.replace(/\D/g, "");
      return {
        first: first.value.trim() ? "" : "First name is required",
        last: last.value.trim() ? "" : "Last name is required",
        phone: !phone.value.trim() || digits.length >= 7 ? "" : "Enter a valid phone number",
        terms: termsInput() && termsInput().checked ? "" : "Accept the Terms of Use and Privacy Policy to continue",
      };
    }
    function paint(all) {
      var m = messages();
      [["first", first], ["last", last], ["phone", phone]].forEach(function (pair) {
        if (all || touched[pair[0]]) err(pair[1], m[pair[0]]);
      });
      if (all || touched.terms) {
        var p = document.getElementById("ua-terms-error");
        p.textContent = m.terms;
        p.classList.toggle("hidden", !m.terms);
        var box = document.getElementById("ua-terms-box");
        if (box) box.toggleAttribute("error", !!m.terms);
      }
      return m;
    }

    [["first", first], ["last", last], ["phone", phone]].forEach(function (pair) {
      pair[1].addEventListener("input", function () { paint(false); });
      pair[1].addEventListener("blur", function () { touched[pair[0]] = true; paint(false); });
    });
    form.addEventListener("change", function (event) {
      if (event.target && event.target.id === "ua-terms") { touched.terms = true; paint(false); }
    });
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (submit.disabled) return;
      var m = paint(true);
      var order = [["first", first], ["last", last], ["phone", phone], ["terms", termsInput()]];
      for (var i = 0; i < order.length; i += 1) {
        if (m[order[i][0]]) { if (order[i][1]) order[i][1].focus(); return; }
      }
      profile = { firstName: first.value.trim(), lastName: last.value.trim(), phone: phone.value.trim() };
      submit.disabled = true;
      submit.setAttribute("aria-busy", "true");
      submit.innerHTML = SPINNER + "<span>Sending code…</span>";
      setTimeout(renderCode, 600);
    });
    first.focus();
  }

  // ── 2. Enter Verification Code (271:113281) ──
  // Prototype: any 6 digits pass, except 000000 (shows the error state).

  var CODE_LEN = 6;
  var DEMO_WRONG = "000000";

  function renderCode() {
    var boxes = "";
    for (var i = 0; i < CODE_LEN; i += 1) {
      boxes +=
        '<input data-ua-digit="' + i + '" type="text" inputmode="numeric" autocomplete="' + (i === 0 ? "one-time-code" : "off") + '" maxlength="1" aria-label="Digit ' + (i + 1) + ' of ' + CODE_LEN + '" ' +
        'class="h-10 min-w-0 flex-1 rounded-md border-0 bg-white text-center text-base text-gray-900 shadow-xs outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 aria-invalid:outline-red-300 dark:bg-white/5 dark:text-white dark:outline-white/15 dark:focus:outline-blue-500 dark:aria-invalid:outline-red-500/50" />';
    }
    // Figma 271:113281: top (back + text, gap 8) → 24 → code (label, 16, boxes gap 10) → 32 → buttons (gap 16).
    screen(
      header("Enter Verification Code"),
      '<form id="ua-code-form" novalidate class="-mt-0 flex flex-col gap-8"><div class="flex flex-col gap-6"><div class="flex flex-col gap-2">' +
      '<button type="button" id="ua-back" class="-m-1 w-fit cursor-pointer rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-2 focus-visible:outline-blue-600 dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-300">' +
      '<span class="sr-only">Back</span><svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clip-rule="evenodd" /></svg></button>' +
      '<p class="text-base/6 text-gray-700 dark:text-gray-300">A one-time passcode has been sent&nbsp;to&nbsp;-<br /><span class="font-semibold text-gray-900 dark:text-white">' + esc(invite.email) + "</span></p></div>" +
      '<fieldset class="flex min-w-0 flex-col gap-2"><legend class="sr-only">Enter the 6 digit code</legend>' +
      '<div class="flex w-full items-center gap-2 pb-2 text-sm/5 font-medium text-gray-700 dark:text-gray-300"><span aria-hidden="true">Enter the 6 digit code</span>' +
      '<span class="group/info relative inline-flex size-5 items-center justify-center"><span tabindex="0" role="button" aria-describedby="ua-code-tip" class="inline-flex cursor-help rounded-full text-gray-400 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 dark:text-gray-500 dark:hover:text-white"><span class="sr-only">About the code</span><svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" clip-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" /></svg></span>' +
      '<span id="ua-code-tip" role="tooltip" class="pointer-events-none invisible absolute top-full left-1/2 z-30 mt-3 w-max max-w-64 -translate-x-2/5 rounded-lg bg-gray-900 p-3 text-left text-sm/5 font-normal text-gray-100 opacity-0 shadow-xs transition-opacity duration-150 group-hover/info:visible group-hover/info:opacity-100 group-has-focus-visible/info:visible group-has-focus-visible/info:opacity-100 before:absolute before:-top-1 before:left-2/5 before:size-3 before:-translate-x-1/2 before:rotate-45 before:rounded-[2px] before:bg-inherit dark:bg-gray-950 dark:ring-1 dark:ring-white/10">The code is valid for 10 minutes. Check your spam folder if you can’t find the email.</span></span></div>' +
      '<div class="flex gap-2.5">' + boxes + "</div>" +
      '<p id="ua-code-error" class="hidden ' + F.ERROR_TEXT + '"></p></fieldset>' +
      '</div><div class="flex flex-col items-center gap-4">' +
      '<button id="ua-code-submit" type="submit" class="' + PRIMARY + '">Sign in</button>' +
      '<button id="ua-resend" type="button" class="w-fit px-3.5 py-2.5 text-base/6 ' + LINK + '">Resend code</button>' +
      '<p id="ua-resent" role="status" class="hidden text-center text-xs/4 text-gray-500 dark:text-gray-400"></p>' +
      "</div></form>",
    );
    bindCode();
  }

  function bindCode() {
    var inputs = Array.prototype.slice.call(document.querySelectorAll("[data-ua-digit]"));
    var form = document.getElementById("ua-code-form");
    var submit = document.getElementById("ua-code-submit");
    var error = document.getElementById("ua-code-error");

    function value() { return inputs.map(function (i) { return i.value; }).join(""); }
    function setError(msg) {
      error.textContent = msg || "";
      error.classList.toggle("hidden", !msg);
      inputs.forEach(function (i) { i.setAttribute("aria-invalid", msg ? "true" : "false"); });
    }
    function fill(from, text) {
      var digits = text.replace(/\D/g, "").split("");
      for (var k = 0; k < digits.length && from + k < inputs.length; k += 1) inputs[from + k].value = digits[k];
      var next = Math.min(from + digits.length, inputs.length - 1);
      inputs[next].focus();
      inputs[next].select();
    }

    inputs.forEach(function (input, idx) {
      input.addEventListener("input", function () {
        setError("");
        var v = input.value.replace(/\D/g, "");
        if (v.length > 1) { input.value = ""; fill(idx, v); return; }
        input.value = v;
        if (v && idx < inputs.length - 1) inputs[idx + 1].focus();
      });
      input.addEventListener("keydown", function (e) {
        if (e.key === "Backspace" && !input.value && idx > 0) { inputs[idx - 1].focus(); inputs[idx - 1].value = ""; e.preventDefault(); }
        else if (e.key === "ArrowLeft" && idx > 0) inputs[idx - 1].focus();
        else if (e.key === "ArrowRight" && idx < inputs.length - 1) inputs[idx + 1].focus();
      });
      input.addEventListener("paste", function (e) {
        e.preventDefault();
        fill(idx, (e.clipboardData || window.clipboardData).getData("text"));
      });
    });

    document.getElementById("ua-back").addEventListener("click", renderForm);
    document.getElementById("ua-resend").addEventListener("click", function () {
      inputs.forEach(function (i) { i.value = ""; });
      setError("");
      var note = document.getElementById("ua-resent");
      note.textContent = "A new code has been sent to " + invite.email + ".";
      note.classList.remove("hidden");
      inputs[0].focus();
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (submit.disabled) return;
      var code = value();
      if (code.length < CODE_LEN) { setError("Enter all 6 digits of the code."); inputs[Math.min(code.length, CODE_LEN - 1)].focus(); return; }
      if (code === DEMO_WRONG) { setError("That code isn’t right. Check the email and try again."); inputs[0].focus(); inputs[0].select(); return; }
      submit.disabled = true;
      submit.setAttribute("aria-busy", "true");
      submit.innerHTML = SPINNER + "<span>Signing in…</span>";
      setTimeout(function () {
        accept({ firstName: profile.firstName, lastName: profile.lastName, phone: profile.phone }).then(function (outcome) {
          if (outcome === "revoked" || outcome === "unknown") return renderRevoked();
          if (outcome === "expired") return renderExpired();
          rememberAccepted(invite.id);
          renderBusiness();
        });
      }, 700);
    });
    inputs[0].focus();
  }

  // ── 3. Choose a Business (271:113362) ──

  var AVATAR_TONES = ["bg-indigo-500", "bg-orange-500", "bg-emerald-500", "bg-rose-500", "bg-teal-500"];

  function initials(name) {
    return String(name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join("");
  }
  function businessId(name) {
    var h = 0;
    for (var i = 0; i < String(name).length; i += 1) h = (h * 31 + String(name).charCodeAt(i)) >>> 0;
    return String(100000000 + (h % 899999999));
  }

  function renderBusiness() {
    var list = [invite.business || "Your business"];
    var rows = list.map(function (name, i) {
      return (
        '<li><button type="button" data-ua-business="' + esc(name) + '" class="flex w-full cursor-pointer items-center gap-3 px-6 py-3 text-left hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-hidden dark:hover:bg-white/5 dark:focus-visible:bg-white/5">' +
        '<span aria-hidden="true" class="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-medium text-white ' + AVATAR_TONES[i % AVATAR_TONES.length] + '">' + esc(initials(name)) + "</span>" +
        '<span class="flex min-w-0 flex-col gap-1"><span class="truncate text-sm/5 font-medium text-gray-900 dark:text-white">' + esc(name) + "</span>" +
        '<span class="inline-flex w-fit items-center rounded border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs/4 font-medium text-gray-800 dark:border-white/15 dark:bg-white/10 dark:text-gray-300">ID : ' + businessId(name) + "</span></span>" +
        "</button></li>"
      );
    }).join("");
    show(
      header("Choose a Business", { subtitle: "to continue to SMART Hub" }) +
      '<div class="border-b border-gray-200 p-3 dark:border-white/10"><div class="relative">' +
      '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-gray-400 dark:text-gray-500"><path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clip-rule="evenodd" /></svg>' +
      '<input id="ua-business-search" type="search" placeholder="Search profile" aria-label="Search profile" class="' + F.INPUT + ' pl-10" /></div></div>' +
      '<ul id="ua-business-list" class="max-h-72 divide-y divide-gray-200 overflow-y-auto dark:divide-white/10">' + rows + "</ul>" +
      '<p id="ua-business-empty" class="hidden px-6 py-6 text-center text-sm/5 text-gray-500 dark:text-gray-400">No business matches your search.</p>' +
      '<div class="flex justify-center border-t border-gray-200 px-6 py-4 dark:border-white/10"><a href="../sx-enroll/index.html" class="inline-flex items-center gap-1 text-sm/5 ' + LINK + '">' +
      '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>Set Up a New Business</a></div>',
    );
    var t = document.getElementById("ua-title");
    if (t) t.focus({ preventScroll: true });
    var search = document.getElementById("ua-business-search");
    search.addEventListener("input", function () {
      var q = search.value.trim().toLowerCase();
      var shown = 0;
      document.querySelectorAll("#ua-business-list li").forEach(function (li) {
        var match = li.textContent.toLowerCase().indexOf(q) !== -1;
        li.classList.toggle("hidden", !match);
        if (match) shown += 1;
      });
      document.getElementById("ua-business-empty").classList.toggle("hidden", shown > 0);
    });
    document.getElementById("ua-business-list").addEventListener("click", function (e) {
      if (e.target.closest("[data-ua-business]")) renderDone();
    });
  }

  // ── 4. You are in SMART Hub (271:113417) ──

  function renderDone() {
    show(
      '<div class="flex flex-col items-center gap-6 p-8">' + LOGO +
      '<h1 id="ua-title" tabindex="-1" class="text-xl/7 font-semibold text-gray-900 focus:outline-hidden dark:text-white">You are in SMART Hub</h1>' +
      '<p class="-mt-4 text-sm/5 text-gray-500 dark:text-gray-400">Taking you to ' + esc(invite.business || "your business") + "…</p></div>",
    );
    var t = document.getElementById("ua-title");
    if (t) t.focus({ preventScroll: true });
    setTimeout(function () { window.location.href = HUB_URL; }, 1800);
  }

  // ── Store (inviter's browser only) ──

  function storeState() {
    if (!window.UMStore || !window.UMStore.hasSavedState()) return Promise.resolve(null);
    return window.UMStore.load().then(function () {
      var inv = window.UMStore.getInvitation(invite.id);
      // The store's dates win: a resent invitation makes an older link valid again.
      if (inv && inv.expiresAt) invite.exp = inv.expiresAt;
      return inv ? inv.status : "unknown";
    });
  }

  function accept(names) {
    if (!window.UMStore || !window.UMStore.hasSavedState()) return Promise.resolve("accepted");
    return window.UMStore.load().then(function () {
      var result = window.UMStore.acceptInvitation(invite.id, names);
      return result === "already" ? "accepted" : result;
    });
  }

  function init() {
    F = window.OBField;
    var token = new URLSearchParams(window.location.search).get("inv");
    invite = token && window.UMEmail ? window.UMEmail.decodeInvite(token) : null;
    if (!invite) return renderBroken();
    if (readAccepted().indexOf(invite.id) !== -1) return renderAlready();
    storeState()
      .then(function (status) {
        if (status === "accepted") return renderAlready();
        if (status === "revoked" || status === "unknown") return renderRevoked();
        if (new Date(invite.exp).getTime() < Date.now()) return renderExpired();
        renderForm();
      })
      .catch(renderForm);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

/**
 * um-accept.js
 * src/pages/invite/accept.html — the invitation link (User Management phase 3).
 *   ?inv=<base64url JSON {id, email, firstName, lastName, roleNames, business, invitedBy, message, exp}>
 * States: "form" (set up your account) → "done" (welcome), "expired", "revoked" (revoked or
 * unknown to this browser's store), "already" (accepted before), "broken" (no / bad link).
 * On the inviter's browser (sx_um_v1 present) the store decides revoked / accepted and
 * accepting turns the user Active; on any other browser the link alone is enough, and
 * accepting is remembered locally (sx_um_accepted) so the link then reads "already accepted".
 * Fields: OBField; password rules + eye button as on sx-enroll/create-account.html.
 */
(function () {
  "use strict";

  var ACCEPTED_KEY = "sx_um_accepted";
  var HUB_URL = "../dashboard/user-management.html";
  var F = null;
  var invite = null;

  var RULES = [
    ["length", "At least 8 characters", function (v) { return v.length >= 8; }],
    ["upper", "At least one upper case letter", function (v) { return /[A-Z]/.test(v); }],
    ["lower", "At least one lower case letter", function (v) { return /[a-z]/.test(v); }],
    ["number", "At least one number", function (v) { return /[0-9]/.test(v); }],
    ["special", "At least one special character", function (v) { return /[^A-Za-z0-9]/.test(v); }],
    ["sequence", "Don't use more than four consecutive characters (e.g., 1234 or abcd)", function (v) { return !hasRun(v, 4); }],
  ];

  function hasRun(value, len) {
    var run = 1;
    var direction = 0;
    for (var i = 1; i < value.length; i += 1) {
      var delta = value.charCodeAt(i) - value.charCodeAt(i - 1);
      if (delta === 1 || delta === -1) {
        if (delta === direction) run += 1;
        else {
          direction = delta;
          run = 2;
        }
        if (run >= len) return true;
      } else {
        direction = 0;
        run = 1;
      }
    }
    return false;
  }

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

  // ── Status cards (components skill › "link expired" card, per state) ──

  var ICONS = {
    error: {
      tile: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
      svg: '<path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clip-rule="evenodd" />',
    },
    clock: {
      tile: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
      svg: '<path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clip-rule="evenodd" />',
    },
    check: {
      tile: "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400",
      svg: '<path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" />',
    },
  };

  var PRIMARY =
    "inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 dark:bg-blue-500 dark:shadow-none dark:hover:bg-blue-400 dark:disabled:bg-blue-500/40 dark:disabled:text-white/60";

  function statusCard(kind, title, text, action) {
    var icon = ICONS[kind];
    return (
      '<div class="flex flex-col items-center gap-4 text-center">' +
      '<span class="flex size-12 items-center justify-center rounded-full ' +
      icon.tile +
      '"><svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-6">' +
      icon.svg +
      "</svg></span>" +
      '<h1 class="type-title-modal text-default">' +
      title +
      "</h1>" +
      '<p class="type-description text-tertiary">' +
      text +
      "</p>" +
      (action || "") +
      "</div>"
    );
  }

  function hubButton(label) {
    return '<a href="' + HUB_URL + '" class="' + PRIMARY + ' mt-2">' + esc(label) + "</a>";
  }

  function renderBroken() {
    show(
      statusCard(
        "error",
        "This link doesn’t work",
        "The invitation link is incomplete or damaged. Open it again from the email, or ask the person who invited you to send a new one.",
      ),
    );
  }

  function renderRevoked() {
    show(
      statusCard(
        "error",
        "This invitation is no longer valid",
        "It was cancelled by " +
          esc(invite.invitedBy || "the business") +
          ". Ask them to send you a new invitation to " +
          esc(invite.business || "the business") +
          ".",
      ),
    );
  }

  function renderExpired() {
    show(
      statusCard(
        "clock",
        "This invitation has expired",
        "It expired on " +
          esc(formatDate(invite.exp)) +
          ". Ask " +
          esc(invite.invitedBy || "the person who invited you") +
          " to resend it.",
      ),
    );
  }

  function renderAlready() {
    show(
      statusCard(
        "check",
        "You’ve already accepted this invitation",
        "Your account for " + esc(invite.business || "this business") + " is set up. Sign in to SMART Hub to continue.",
        hubButton("Go to SMART Hub"),
      ),
    );
  }

  function renderDone(firstName) {
    show(
      statusCard(
        "check",
        "Welcome to SMART Hub, " + esc(firstName) + "!",
        "Your account for " + esc(invite.business || "the business") + " is ready.",
        hubButton("Go to SMART Hub"),
      ),
    );
    var link = card().querySelector("a");
    if (link) link.focus();
  }

  // ── Set up your account ──

  function textField(id, label, value, opts) {
    opts = opts || {};
    return (
      '<div class="flex flex-col gap-2">' +
      '<label for="' + id + '" class="type-label text-default">' + label + "</label>" +
      '<div class="relative">' +
      '<input id="' + id + '" type="' + (opts.type || "text") + '" value="' + esc(value) + '" autocomplete="' + (opts.autocomplete || "off") +
      '" aria-invalid="false" aria-describedby="' + id + '-error' + (opts.describedBy ? " " + opts.describedBy : "") + '"' +
      (opts.disabled ? " disabled" : "") +
      ' class="' + F.INPUT + (opts.inputClass ? " " + opts.inputClass : "") + '" />' +
      (opts.after || F.errorIcon()) +
      "</div>" +
      (opts.helper ? '<p class="' + F.HELPER + '">' + esc(opts.helper) + "</p>" : "") +
      '<p id="' + id + '-error" class="hidden ' + F.ERROR_TEXT + '"></p>' +
      "</div>"
    );
  }

  var EYE =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /><path fill-rule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clip-rule="evenodd" /></svg>';

  function eyeButton(id) {
    return (
      '<button type="button" data-ua-eye="' + id + '" aria-pressed="false" class="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-600 focus-visible:outline-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400">' +
      '<span class="sr-only">Show password</span>' + EYE + "</button>"
    );
  }

  function rulesList() {
    return (
      '<ul id="ua-rules" aria-label="Password rules" class="flex flex-col gap-1 rounded-lg bg-gray-50 p-3 dark:bg-white/5">' +
      RULES.map(function (rule) {
        return (
          '<li data-rule="' + rule[0] + '" class="flex items-center gap-1 text-gray-700 dark:text-gray-300"><svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" data-rule-icon class="size-3 shrink-0 text-gray-400 dark:text-gray-500"><path d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" fill-rule="evenodd" /></svg><span class="text-xs">' +
          esc(rule[1]) + "</span></li>"
        );
      }).join("") +
      "</ul>"
    );
  }

  function renderForm() {
    var roles = (invite.roleNames || []).join(", ");
    show(
      '<div class="flex flex-col gap-8">' +
      '<div class="flex flex-col gap-2">' +
      '<p class="type-overline text-tertiary">Invitation</p>' +
      '<h1 class="type-title-section text-default">You’ve been invited to ' + esc(invite.business || "a business") + "</h1>" +
      '<p class="type-description text-tertiary">' +
      (invite.invitedBy ? '<span class="font-medium text-secondary">' + esc(invite.invitedBy) + "</span> invited you to join SMART Hub" : "You were invited to join SMART Hub") +
      (roles ? ' as <span class="font-medium text-secondary">' + esc(roles) + "</span>" : "") +
      ". The invitation expires on " + esc(formatDate(invite.exp)) + ".</p>" +
      (invite.message
        ? '<blockquote class="mt-2 border-l-2 border-gray-200 pl-3 type-body text-secondary italic dark:border-white/15">“' + esc(invite.message) + "”</blockquote>"
        : "") +
      "</div>" +
      '<form id="ua-form" novalidate class="flex flex-col gap-5">' +
      '<h2 class="type-title-card text-default">Set up your account</h2>' +
      '<div class="grid grid-cols-1 gap-5 sm:grid-cols-2">' +
      textField("ua-first", "First Name", invite.firstName, { autocomplete: "given-name" }) +
      textField("ua-last", "Last Name", invite.lastName, { autocomplete: "family-name" }) +
      "</div>" +
      textField("ua-email", "Email", invite.email, { type: "email", disabled: true, helper: "Your username. The invitation was sent to this address." }) +
      textField("ua-password", "Create Password", "", {
        type: "password", autocomplete: "new-password", inputClass: "pr-10 aria-invalid:pr-10", after: eyeButton("ua-password"), describedBy: "ua-rules",
      }) +
      textField("ua-confirm", "Confirm Password", "", {
        type: "password", autocomplete: "new-password", inputClass: "pr-10 aria-invalid:pr-10", after: eyeButton("ua-confirm"),
      }) +
      rulesList() +
      '<div class="flex flex-col gap-2"><app-checkbox id="ua-terms-box" input-id="ua-terms" label="I accept the Terms of Use and Privacy Policy" aria-describedby="ua-terms-error"></app-checkbox>' +
      '<p id="ua-terms-error" class="hidden ' + F.ERROR_TEXT + '"></p></div>' +
      '<button id="ua-submit" type="submit" class="' + PRIMARY + '">Create account</button>' +
      "</form></div>",
    );
    bindForm();
  }

  function paintRules(value) {
    var all = true;
    RULES.forEach(function (rule) {
      var li = document.querySelector('#ua-rules [data-rule="' + rule[0] + '"]');
      var ok = rule[2](value);
      if (!ok) all = false;
      var icon = li.querySelector("[data-rule-icon]");
      icon.classList.toggle("text-green-600", ok);
      icon.classList.toggle("text-gray-400", !ok);
      icon.classList.toggle("dark:text-gray-500", !ok);
      li.classList.toggle("text-gray-900", ok);
      li.classList.toggle("dark:text-white", ok);
      li.classList.toggle("text-gray-700", !ok);
      li.classList.toggle("dark:text-gray-300", !ok);
    });
    return all;
  }

  function bindForm() {
    var form = document.getElementById("ua-form");
    var first = document.getElementById("ua-first");
    var last = document.getElementById("ua-last");
    var password = document.getElementById("ua-password");
    var confirm = document.getElementById("ua-confirm");
    var submit = document.getElementById("ua-submit");
    var touched = {};

    function err(input, message) {
      F.setError(input, !!message, document.getElementById(input.id + "-error"), message || "");
    }

    function termsInput() {
      return document.getElementById("ua-terms");
    }

    function messages() {
      var rulesOk = paintRules(password.value);
      return {
        first: first.value.trim() ? "" : "First Name is required",
        last: last.value.trim() ? "" : "Last Name is required",
        password: !password.value ? "Create a password" : rulesOk ? "" : "The password doesn’t meet every rule below",
        confirm: !confirm.value ? "Confirm your password" : confirm.value === password.value ? "" : "Passwords don’t match",
        terms: termsInput() && termsInput().checked ? "" : "Accept the Terms of Use and Privacy Policy to continue",
      };
    }

    function paint(all) {
      var m = messages();
      [["first", first], ["last", last], ["password", password], ["confirm", confirm]].forEach(function (pair) {
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

    [["first", first], ["last", last], ["password", password], ["confirm", confirm]].forEach(function (pair) {
      pair[1].addEventListener("input", function () {
        paint(false);
      });
      pair[1].addEventListener("blur", function () {
        touched[pair[0]] = true;
        paint(false);
      });
    });
    form.addEventListener("change", function (event) {
      if (event.target && event.target.id === "ua-terms") {
        touched.terms = true;
        paint(false);
      }
    });

    form.addEventListener("click", function (event) {
      var eye = event.target.closest("[data-ua-eye]");
      if (!eye) return;
      var input = document.getElementById(eye.getAttribute("data-ua-eye"));
      var showIt = input.type === "password";
      input.type = showIt ? "text" : "password";
      eye.setAttribute("aria-pressed", String(showIt));
      eye.querySelector(".sr-only").textContent = showIt ? "Hide password" : "Show password";
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (submit.disabled) return;
      var m = paint(true);
      var order = [["first", first], ["last", last], ["password", password], ["confirm", confirm], ["terms", termsInput()]];
      for (var i = 0; i < order.length; i += 1) {
        if (m[order[i][0]]) {
          if (order[i][1]) order[i][1].focus();
          return;
        }
      }
      submit.disabled = true;
      submit.setAttribute("aria-busy", "true");
      submit.innerHTML =
        '<svg class="size-4 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z"></path></svg><span>Creating account…</span>';
      var names = { firstName: first.value.trim(), lastName: last.value.trim() };
      setTimeout(function () {
        accept(names).then(function (outcome) {
          if (outcome === "revoked" || outcome === "unknown") return renderRevoked();
          if (outcome === "expired") return renderExpired();
          rememberAccepted(invite.id);
          renderDone(names.firstName);
        });
      }, 700);
    });

    first.focus();
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

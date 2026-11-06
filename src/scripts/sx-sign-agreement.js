/**
 * sx-sign-agreement.js — the other signer's "Review & Sign Agreement" page
 * (src/pages/sx-enroll/sign-agreement.html; Figma 9DRzbyv7FDCDYFYN5ZGuwZ
 * 36525:45392, expired 37764:150589).
 *
 * Enrolment branch B (sx-enroll-acp.js) sends the request with
 * STPState.sendAgreementEmail({ linkUrl: <this page> }). The worker drops
 * the query of linkUrl, so the email opens
 *   sign-agreement.html?stpAgreement=review&email=<signer>&token=<token>
 * and the demo case is read from this browser's storage (same-browser demo).
 * The enrolment's "Open signer's link" adds ?case=<id>&email=<signer>.
 *
 * Valid link: a case with enrol { stp: 'on', signer: 'other' }, a sent
 * request (agreement.sentAt) not signed yet, STP at agreement_signature_pending
 * and — when given — matching ?case= and ?email=. Anything else (no case,
 * reset, Change signer, already signed) → "This link has expired".
 *
 *   document → Confirm → loading → "Agreement was confirmed" + First / Last
 *   name (prefilled from case.signer) → Confirm Acceptance → loading →
 *   SXDemoCase.signAgreement(name) → "Acknowledgement Complete".
 * The enrolment and portal tabs follow via storage events.
 */
(function () {
  "use strict";

  var X = window.SXEnroll;
  var esc = X.esc;

  var BADGE_DONE =
    "inline-flex w-fit items-center rounded-md bg-green-50 dark:bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400 inset-ring inset-ring-green-600/20 dark:inset-ring-green-500/20";

  var LOADER =
    '<div role="status" class="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-gray-900/70">' +
    '<img src="../../assets/onboarding/loader.svg" alt="" width="44" height="44" class="size-11 animate-spin motion-reduce:animate-none">' +
    '<span class="sr-only">Loading…</span>' +
    "</div>";

  var params = (function () {
    try {
      return new URLSearchParams(window.location.search);
    } catch (error) {
      return new URLSearchParams("");
    }
  })();

  /** "pending" when this link can still be signed, else "invalid". */
  function linkState(c) {
    if (!c) return "invalid";
    var urlCase = params.get("case");
    if (urlCase && urlCase !== c.id) return "invalid";
    var e = c.enrol || {};
    var a = e.agreement || {};
    if (e.stp !== "on" || e.signer !== "other" || !a.sentAt || e.agreementSigned)
      return "invalid";
    var email = String(params.get("email") || "").trim().toLowerCase();
    if (email && email !== String(a.email || "").trim().toLowerCase()) return "invalid";
    var S = window.STPState;
    if (S && S.getStpState().stpStep !== S.STEP_AGREEMENT_SIGNATURE_PENDING) return "invalid";
    return "pending";
  }

  document.addEventListener("DOMContentLoaded", function () {
    var pageEl = document.querySelector("[data-sign-page]");
    var expiredEl = document.querySelector("[data-sign-expired]");
    var panel = document.querySelector("[data-sign-panel]");
    var actions = document.querySelector("[data-sign-actions]");
    var confirmBtn = document.querySelector("[data-sign-confirm]");

    var c = window.SXDemoCase ? window.SXDemoCase.get() : null;
    // "document" | "form" | "done" | "expired"
    var view = linkState(c) === "pending" ? "document" : "expired";
    var signer = (c && c.signer) || {};
    var form = { first: signer.firstName || "", last: signer.lastName || "" };
    var busy = false;

    if (c && c.supplier && c.supplier.name) {
      var org = document.querySelector("[data-sign-org]");
      if (org) org.textContent = c.supplier.name;
    }

    function documentView() {
      return (
        '<div class="relative">' +
        '<div tabindex="0" aria-label="Visa AR Manager Participation Agreement" class="h-96 overflow-y-auto rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4 focus-visible:outline-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400 lg:h-150">' +
        X.agreementArticle() +
        "</div>" +
        (busy ? LOADER : "") +
        "</div>"
      );
    }

    function formView() {
      return (
        '<div class="relative flex flex-col gap-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-4">' +
        '<div class="flex items-center gap-3 rounded-md bg-green-50 dark:bg-green-500/10 px-4 py-3">' +
        '<img src="../../assets/onboarding/icon-check-circle-green.svg" alt="" width="20" height="20" class="size-5 shrink-0">' +
        '<p class="min-w-0 flex-1 text-sm font-medium text-gray-900 dark:text-white">Agreement was confirmed</p>' +
        "</div>" +
        '<fieldset data-sign-fieldset class="flex flex-col gap-4"' + (busy ? " disabled" : "") + ">" +
        '<legend class="sr-only">Your name</legend>' +
        X.textField("sx-sign-first", "First Name", form.first, { autocomplete: "given-name", placeholder: "Enter first name" }) +
        X.textField("sx-sign-last", "Last Name", form.last, { autocomplete: "family-name", placeholder: "Enter last name" }) +
        '<div><button type="button" data-sign-accept class="' + window.OBModal.PRIMARY_BUTTON_MD + '">Confirm Acceptance</button></div>' +
        "</fieldset>" +
        (busy ? LOADER : "") +
        "</div>"
      );
    }

    // Status card (components skill), same as branch A's acknowledgement.
    function doneView() {
      var a = ((window.SXDemoCase.get() || {}).enrol || {}).agreement || {};
      return (
        '<section aria-label="Acknowledgement Complete" class="overflow-hidden rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900">' +
        '<h2 tabindex="-1" class="border-b border-gray-200 dark:border-white/10 px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white focus:outline-hidden">Acknowledgement Complete</h2>' +
        '<div class="flex flex-col gap-2 p-4">' +
        X.row("Status", '<span class="' + BADGE_DONE + '">Completed</span>') +
        X.row("Signed by", esc(a.signedBy)) +
        X.row("Confirmed at", esc(X.stamp(a.confirmedAt))) +
        "</div>" +
        "</section>"
      );
    }

    function render() {
      var expired = view === "expired";
      pageEl.hidden = expired;
      expiredEl.hidden = !expired;
      document.title = (expired ? "Link expired" : "Review & Sign Agreement") + " · SMART Exchange";
      if (expired) return;
      actions.hidden = view !== "document";
      confirmBtn.disabled = busy;
      if (busy) confirmBtn.setAttribute("aria-busy", "true");
      else confirmBtn.removeAttribute("aria-busy");
      panel.innerHTML = view === "document" ? documentView() : view === "form" ? formView() : doneView();
      if (view === "form") bindForm();
    }

    function filled() {
      return !!(form.first.trim() && form.last.trim());
    }

    function bindForm() {
      var first = document.getElementById("sx-sign-first");
      var last = document.getElementById("sx-sign-last");
      var accept = panel.querySelector("[data-sign-accept]");
      accept.disabled = busy || !filled();
      [[first, "first", "First Name"], [last, "last", "Last Name"]].forEach(function (t) {
        t[0].addEventListener("input", function () {
          form[t[1]] = t[0].value;
          accept.disabled = !filled();
          if (t[0].value.trim()) X.fieldError(t[0], "");
        });
        t[0].addEventListener("blur", function () {
          X.fieldError(t[0], t[0].value.trim() ? "" : t[2] + " is required");
        });
      });
      accept.addEventListener("click", function () {
        if (!filled() || busy) return;
        if (linkState(window.SXDemoCase.get()) !== "pending") {
          view = "expired";
          render();
          return;
        }
        busy = true;
        render();
        window.setTimeout(function () {
          window.SXDemoCase.signAgreement((form.first.trim() + " " + form.last.trim()).trim());
          busy = false;
          view = "done";
          render();
          var heading = panel.querySelector("h2");
          if (heading) heading.focus({ preventScroll: true });
        }, 1500);
      });
    }

    confirmBtn.addEventListener("click", function () {
      if (busy) return;
      busy = true;
      render();
      window.setTimeout(function () {
        busy = false;
        view = linkState(window.SXDemoCase.get()) === "pending" ? "form" : "expired";
        render();
        var input = document.getElementById("sx-sign-first");
        if (input) input.focus({ preventScroll: true });
      }, 1200);
    });

    // The supplier resets the case, changes the signer or the request is
    // signed elsewhere → this link is no longer valid.
    function recheck() {
      if (view === "done" || view === "expired" || busy) return;
      if (linkState(window.SXDemoCase.get()) !== "pending") {
        view = "expired";
        render();
      }
    }
    window.addEventListener(window.SXDemoCase.CHANGE_EVENT, recheck);
    if (window.STPState) window.STPState.subscribe(recheck);

    render();
  });
})();

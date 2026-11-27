/**
 * sd-uk-cop.js
 * Account validation with CoP (Confirmation of Payee), SMART Disburse UK bank
 * flow (TCDM-5266). Figma "SD Versioning" 3xOqsx6FVPNEAiSSpPCLJN, board
 * "Account validation - CoP UK - SD" 20476:105335 (desktop 1728 + mobile 375).
 *
 * Runs when the payee confirms the deposit on the bank summary page
 * (bank-summary.html). Which outcome the (simulated) check returns is a demo
 * choice: `?cop=<scenario>` or the "Demo: CoP outcome" bar (kept in the UK flow
 * state, `SDUK.getState().cop`). Default `match` = the flow is unchanged.
 *
 *   SDUKCop.run(button, onVerified)   // call from the Confirm click
 *   SDUKCop.mountDemo()               // the outcome switch (prototype only)
 *
 * Attempts (MAX_ATTEMPTS = 3): the failure modal of attempt 2 adds "Final
 * attempt, review your details carefully."; a third failure shows "Verification
 * Limit Reached". Frame names carry the CoP reason codes (MBAM, BAMM / PAMM,
 * ANNM, OPTO / SCNAS / ACNS / AC01 / CASS, IVCR); the design does not explain
 * them, so the scenarios are named by outcome.
 *
 * TODO(confirm): the value shown for "Account Holder Name" (Figma sample
 * "Jonathan Alexander Williamson" differs from the page holder) and for
 * "Account Type" ("Personal"); what "Edit Details" does on the account
 * reference modal (here: reopens the reference field); Try Again result.
 */
window.SDUKCop = (function () {
  "use strict";

  var MAX_ATTEMPTS = 3;
  var REF_MAX = 140;

  var SCENARIOS = [
    { id: "match", label: "Verified (match)" },
    { id: "reference", label: "Account reference needed" },
    { id: "reference-nomatch", label: "Account reference does not match" },
    { id: "close-name", label: "Close match: name" },
    { id: "close-name-type", label: "Close match: name, account type no match" },
    { id: "no-name", label: "No match: name" },
    { id: "no-name-type", label: "No match: name and account type" },
    { id: "unable", label: "Unable to verify" },
    { id: "unavailable", label: "Verification unavailable" },
    { id: "limit", label: "Limit reached, other method available" },
    { id: "limit-none", label: "Limit reached, no alternatives" },
  ];

  var TIPS = {
    reference:
      "For example, a building society roll number or customer reference required by the bank to route payments correctly. Contact your bank if you need help finding this information.",
    refNoMatch:
      "The account reference entered does not match the one registered with your bank. This may be due to a typing or transposition error, or information that differs from your bank’s records. Contact your bank if you need help finding this information.",
    closeName:
      "The name entered is similar to the one registered with your bank. This may be due to spelling differences, abbreviations, or a shortened name.",
    noName:
      "The name entered does not match the one registered with your bank. This may be due to a different registered name, spelling differences, or a joint or business account.",
    noType:
      "The account type entered does not match the one registered with your bank. This may be due to a difference between personal and business account types.",
  };

  // Heroicons (outline 24 / mini 20), same set as the rest of the UK flow.
  var P = {
    warn: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z",
    bank: "M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z",
    x: "M6 18 18 6M6 6l12 12",
  };
  var MINI_WARN =
    "M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z";
  var MINI_INFO =
    "M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z";
  var MINI_ERR =
    "M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z";

  var TONES = {
    amber: { circle: "bg-amber-100 dark:bg-amber-400/10", icon: "text-amber-600 dark:text-amber-400" },
    red: { circle: "bg-red-100 dark:bg-red-400/10", icon: "text-red-600 dark:text-red-400" },
    blue: { circle: "bg-blue-50 dark:bg-blue-400/10", icon: "text-blue-600 dark:text-blue-400" },
  };

  var FOCUS =
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-500";
  // Same primary as the summary page's Deposit button (bank-summary.html).
  var BTN_PRIMARY =
    "uk-grad flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-3.5 text-base font-semibold text-white shadow-[0_16px_24px_0_rgba(55,115,255,0.16)] transition-opacity hover:opacity-90 " +
    FOCUS;
  var BTN_SECONDARY =
    "flex h-14 w-full cursor-pointer items-center justify-center rounded-lg bg-white px-3.5 text-base font-semibold text-gray-700 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-white/5 dark:text-gray-300 dark:ring-white/10 dark:hover:bg-white/10 " +
    FOCUS;

  // ── State ──

  function state() {
    return (SDUK.getState().cop || {});
  }
  function save(patch) {
    SDUK.saveState({ cop: Object.assign({}, state(), patch) });
  }
  function scenario() {
    var q = new URLSearchParams(window.location.search).get("cop");
    if (q && SCENARIOS.some(function (s) { return s.id === q; })) {
      if (state().scenario !== q) save({ scenario: q, attempts: 0, reference: "" });
      return q;
    }
    return state().scenario || "match";
  }
  function attempts() {
    return Number(state().attempts || 0);
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  // ── Pieces ──

  function svg(path, cls, mini) {
    return mini
      ? '<svg viewBox="0 0 20 20" fill="currentColor" class="' + cls + '" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="' + path + '"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="' + cls + '" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="' + path + '"/></svg>';
  }

  function illustration(tone, icon) {
    var t = TONES[tone];
    return (
      '<div class="mx-auto flex size-12 items-center justify-center rounded-full ' + t.circle + '">' +
      svg(P[icon], "size-6 " + t.icon) +
      "</div>"
    );
  }

  /** Information circle + tooltip above it (Figma: dark bubble, arrow down). Hover, focus and tap. */
  function infoTip(id, label, html, align) {
    return (
      '<span class="group/info relative inline-flex size-5 items-center justify-center">' +
      '<span tabindex="0" role="button" aria-label="' + esc(label) + '" aria-describedby="' + id + '" ' +
      'class="inline-flex rounded-sm text-gray-400 hover:text-gray-900 focus-visible:text-gray-900 focus-visible:outline-2 focus-visible:outline-blue-600 group-focus-within/info:text-gray-900 dark:text-gray-500 dark:hover:text-white dark:group-focus-within/info:text-white dark:focus-visible:outline-blue-500">' +
      svg(MINI_INFO, "size-4.5", true) +
      "</span>" +
      '<span id="' + id + '" role="tooltip" class="pointer-events-none invisible absolute bottom-full z-10 mb-3 w-max max-w-[min(343px,calc(100vw-4rem))] ' +
      (align === "right" ? "right-[-12px]" : "left-[-12px]") +
      ' rounded-lg bg-gray-900 p-3 text-left text-sm/5 font-normal text-gray-100 opacity-0 shadow-xs transition-opacity before:absolute before:top-full before:' +
      (align === "right" ? "right-4" : "left-4") +
      ' before:-mt-1.5 before:size-3 before:rotate-45 before:rounded-[2px] before:bg-gray-900 group-hover/info:visible group-hover/info:opacity-100 group-focus-within/info:visible group-focus-within/info:opacity-100 dark:bg-gray-950 dark:ring-1 dark:ring-white/10 dark:before:bg-gray-950">' +
      html +
      "</span></span>"
    );
  }

  /** Result card: grey header ("Close Match" / "Doesn’t Match") + info tip + rows. */
  function resultCard(id, title, tip, rows) {
    return (
      '<div class="rounded-lg border border-gray-200 dark:border-white/10">' +
      '<div class="flex items-center gap-1.5 rounded-t-[7px] border-b border-gray-200 bg-gray-100 px-4 py-2 dark:border-white/10 dark:bg-white/10">' +
      '<span class="text-sm/5 font-semibold text-gray-900 dark:text-white">' + title + "</span>" +
      infoTip(id, "About “" + title.replace("&rsquo;", "’") + "”", tip, "left") +
      "</div>" +
      rows
        .map(function (r) {
          var cls = r.tone === "amber" ? "text-amber-700 dark:text-amber-400" : "text-red-600 dark:text-red-400";
          var ico = r.tone === "amber" ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";
          return (
            '<div class="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">' +
            '<span class="text-sm/5 text-gray-700 dark:text-gray-300">' + r.label + "</span>" +
            '<span class="flex items-start gap-2 sm:justify-end"><span class="text-sm/5 font-medium ' + cls + ' sm:text-right">' + esc(r.value) + "</span>" +
            svg(MINI_WARN, "mt-px size-5 shrink-0 " + ico, true) + "</span></div>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function note(text) {
    return (
      '<p class="flex items-center justify-center gap-2 text-xs/4 text-gray-500 dark:text-gray-400">' +
      svg(MINI_WARN, "size-4 shrink-0 text-amber-500", true) + text + "</p>"
    );
  }

  var trigger = null;

  /**
   * One CoP dialog (Figma: 512 / 343 card, X top-left, 48px circle, heading,
   * body, optional result cards or field, stacked full-width buttons).
   */
  function dialog(o) {
    var html =
      '<div class="flex items-start justify-start px-4 pt-4">' +
      '<button type="button" data-uk-close aria-label="Close" class="cursor-pointer rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-300 ' + FOCUS + '">' +
      '<span class="sr-only">Close</span>' + svg(P.x, "size-5") + "</button></div>" +
      '<div class="flex flex-col gap-6 px-4 pb-6 sm:px-6">' +
      '<div class="flex flex-col items-center gap-4 text-center">' +
      illustration(o.tone, o.icon) +
      '<div class="flex flex-col gap-2"><h2 class="text-lg/6 font-medium text-gray-900 dark:text-white">' + o.title + "</h2>" +
      '<div class="flex flex-col gap-2 text-sm/5 text-gray-700 dark:text-gray-300">' + o.body + "</div></div></div>" +
      (o.extra || "") +
      "</div>" +
      '<div class="flex flex-col gap-3 px-6 pb-6">' +
      '<button type="button" data-cop-primary class="' + BTN_PRIMARY + '">' + o.primary + "</button>" +
      (o.secondary ? '<button type="button" data-cop-secondary class="' + BTN_SECONDARY + '">' + o.secondary + "</button>" : "") +
      (o.note ? '<div class="pt-1">' + o.note + "</div>" : "") +
      "</div>";
    var panel = SDUK.modal({ bare: true, html: html });
    panel.setAttribute("aria-label", o.title.replace(/<[^>]+>/g, ""));
    panel.querySelector("[data-cop-primary]").addEventListener("click", function () {
      o.onPrimary();
    });
    var sec = panel.querySelector("[data-cop-secondary]");
    if (sec) sec.addEventListener("click", function () { (o.onSecondary || SDUK.closeModal)(); });
    // Tab stays inside the dialog.
    panel.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;
      var f = Array.prototype.filter.call(
        panel.querySelectorAll('button, [href], input, textarea, [tabindex]:not([tabindex="-1"])'),
        function (n) { return !n.disabled && n.offsetParent !== null; }
      );
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    setTimeout(function () {
      var target = panel.querySelector("[data-cop-ref]") || panel.querySelector("[data-cop-primary]");
      if (target) target.focus({ preventScroll: true });
    }, 60);
    return panel;
  }

  // ── Modals ──

  function names() {
    var b = SDUK.model().bank || {};
    var m = SDUK.model();
    return {
      holder: ((b.holderFirst || m.claimant.firstName) + " " + (b.holderLast || m.claimant.lastName)).trim(),
      type: b.accountKind || "Personal",
    };
  }

  /** Additional Information Needed: Account Reference (required, max 140). */
  function referenceModal(prefill) {
    var panel = dialog({
      tone: "blue",
      icon: "bank",
      title: "Additional Information Needed",
      body: "<p>To help ensure payment is sent to the correct account, enter the reference required by the bank.</p>",
      extra:
        '<div class="flex flex-col gap-1.5">' +
        '<div class="flex items-center gap-1.5"><label for="cop-ref" class="text-sm/5 font-medium text-gray-700 dark:text-gray-300">Account Reference</label>' +
        infoTip("cop-ref-tip", "About the account reference", TIPS.reference, "left") + "</div>" +
        '<div class="relative">' +
        '<textarea id="cop-ref" data-cop-ref rows="1" placeholder="Enter Reference" autocomplete="off" aria-describedby="cop-ref-error" ' +
        'class="block min-h-10 w-full resize-none overflow-hidden rounded-md bg-white px-3 py-2 pr-10 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 hover:outline-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 aria-invalid:text-red-900 aria-invalid:outline-red-300 aria-invalid:placeholder:text-red-300 aria-invalid:focus:outline-red-600 dark:bg-gray-900 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:hover:outline-white/20 dark:focus:outline-blue-500 dark:aria-invalid:text-red-200 dark:aria-invalid:outline-red-400/50 dark:aria-invalid:focus:outline-red-500 sm:text-sm/6"></textarea>' +
        '<span data-cop-ref-icon hidden class="pointer-events-none absolute top-0 right-3 flex h-10 items-center text-red-500 dark:text-red-400">' + svg(MINI_ERR, "size-5", true) + "</span></div>" +
        '<p id="cop-ref-error" data-cop-ref-error hidden role="alert" class="text-sm/5 text-red-600 dark:text-red-400"></p></div>',
      primary: "Confirm",
      secondary: "Cancel",
      onPrimary: function () {
        var v = field.value.trim();
        var msg = !v ? "Account Reference is required." : v.length > REF_MAX ? "Maximum of " + REF_MAX + " characters allowed." : "";
        showError(msg);
        if (msg) { field.focus(); return; }
        save({ reference: v });
        SDUK.closeModal();
        verify();
      },
    });
    var field = panel.querySelector("[data-cop-ref]");
    var err = panel.querySelector("[data-cop-ref-error]");
    var icon = panel.querySelector("[data-cop-ref-icon]");
    function grow() { field.style.height = "auto"; field.style.height = field.scrollHeight + "px"; }
    function showError(msg) {
      field.setAttribute("aria-invalid", msg ? "true" : "false");
      err.hidden = !msg;
      err.textContent = msg;
      icon.hidden = !msg;
    }
    field.value = prefill || "";
    field.addEventListener("input", function () { grow(); if (!err.hidden) showError(""); });
    field.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); panel.querySelector("[data-cop-primary]").click(); }
    });
    grow();
    return panel;
  }

  function refNoMatchModal() {
    dialog({
      tone: "amber",
      icon: "warn",
      title: "Update Required",
      body: "<p>Some of the details you entered don’t match those registered with your bank. Make sure they match your bank’s records.</p>",
      extra: resultCard("cop-t1", "Doesn&rsquo;t Match", TIPS.refNoMatch, [
        { label: "Account Reference", value: state().reference || "000000000000", tone: "red" },
      ]),
      primary: "Edit Details",
      onPrimary: function () { SDUK.closeModal(); referenceModal(state().reference); },
    });
  }

  /** Close match / no match: "Update Required" with result cards. */
  function updateModal(kind, final) {
    var n = names();
    var cards = "";
    if (kind === "close-name")
      cards = resultCard("cop-t1", "Close Match", TIPS.closeName, [{ label: "Account Holder Name", value: n.holder, tone: "amber" }]);
    else if (kind === "close-name-type")
      cards =
        resultCard("cop-t1", "Close Match", TIPS.closeName, [{ label: "Account Holder Name", value: n.holder, tone: "amber" }]) +
        resultCard("cop-t2", "Doesn&rsquo;t Match", TIPS.noType, [{ label: "Account Type", value: n.type, tone: "red" }]);
    else if (kind === "no-name")
      cards = resultCard("cop-t1", "Doesn&rsquo;t Match", TIPS.noName, [{ label: "Account Holder Name", value: n.holder, tone: "red" }]);
    else
      cards = resultCard(
        "cop-t1",
        "Doesn&rsquo;t Match",
        "<ol class=\"list-decimal space-y-2 pl-4\"><li>" + TIPS.noName + "</li><li>" + TIPS.noType + "</li></ol>",
        [
          { label: "Account Holder Name", value: n.holder, tone: "red" },
          { label: "Account Type", value: n.type, tone: "red" },
        ]
      );
    dialog({
      tone: "amber",
      icon: "warn",
      title: "Update Required",
      body: "<p>Some of the details you entered don’t match those registered with your bank. Make sure they match your bank’s records.</p>",
      extra: '<div class="flex flex-col gap-3">' + cards + "</div>",
      primary: "Edit Details",
      note: final ? note("Final attempt, review your details carefully.") : "",
      onPrimary: function () { SDUK.go("bank.html"); },
    });
  }

  function unableModal(final) {
    dialog({
      tone: "amber",
      icon: "warn",
      title: "Unable to Verify Bank Account",
      body:
        "<p>We couldn’t identify an account using the details you entered.</p>" +
        "<p>Make sure all details match your bank’s records and that your account is active.</p>",
      primary: "Review all bank details",
      note: final ? note("Final attempt, review your details carefully.") : "",
      onPrimary: function () { SDUK.go("bank.html"); },
    });
  }

  function limitModal(alternatives) {
    dialog({
      tone: "amber",
      icon: "warn",
      title: "Verification Limit Reached",
      body: alternatives
        ? "<p>For your security, we limit how many times a payment method can be verified. This one can’t be verified again.</p>"
        : "<p>For your security, we limit how many times a payment method can be verified.</p><p>There are no other methods available for this payment. Contact us to discuss your options.</p>",
      primary: alternatives ? "Choose Another Method" : "Contact Us",
      onPrimary: function () { SDUK.go(alternatives ? "payment.html" : "contact.html"); },
    });
  }

  function unavailableModal() {
    dialog({
      tone: "red",
      icon: "x",
      title: "Verification Temporarily Unavailable",
      body: "<p>We couldn’t verify the bank account because the verification service is currently unavailable.</p>",
      primary: "Try Again",
      secondary: "Close",
      onPrimary: function () { SDUK.closeModal(); verify(); },
    });
  }

  // ── Check ──

  var pending = null; // { button, onVerified }

  function busy(on) {
    var b = pending && pending.button;
    if (!b) return;
    if (on) {
      b.dataset.copLabel = b.innerHTML;
      b.innerHTML = "Verifying…";
      b.disabled = true;
    } else if (b.dataset.copLabel) {
      b.innerHTML = b.dataset.copLabel;
      delete b.dataset.copLabel;
      b.disabled = false;
    }
  }

  function fail(kind) {
    var n = attempts() + 1;
    save({ attempts: n });
    if (n >= MAX_ATTEMPTS) { limitModal(true); return; }
    var final = n === MAX_ATTEMPTS - 1;
    if (kind === "unable") unableModal(final);
    else if (kind === "reference-nomatch") refNoMatchModal();
    else updateModal(kind, final);
  }

  function verify() {
    var s = scenario();
    busy(true);
    setTimeout(function () {
      busy(false);
      if (s === "match" || s === "reference") { save({ attempts: 0 }); pending.onVerified(); return; }
      if (s === "unavailable") { unavailableModal(); return; }
      if (s === "limit") { limitModal(true); return; }
      if (s === "limit-none") { limitModal(false); return; }
      fail(s);
    }, 900);
  }

  /** Call on Confirm: asks for the reference first when the scenario needs one. */
  function run(button, onVerified) {
    pending = { button: button, onVerified: onVerified };
    var s = scenario();
    if ((s === "reference" || s === "reference-nomatch") && !state().reference) referenceModal("");
    else verify();
  }

  // ── Demo switch (prototype only) ──

  function mountDemo() {
    if (document.getElementById("uk-cop-demo")) return;
    var bar = document.createElement("div");
    bar.id = "uk-cop-demo";
    bar.className =
      "fixed right-4 bottom-4 z-30 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-lg bg-white p-2 pl-3 text-xs/4 shadow-lg ring-1 ring-gray-900/10 dark:bg-gray-900 dark:ring-white/10";
    bar.innerHTML =
      '<label for="uk-cop-select" class="shrink-0 font-medium text-gray-600 dark:text-gray-400">Demo: CoP outcome</label>' +
      '<select id="uk-cop-select" class="min-w-0 rounded-md bg-white py-1 pr-7 pl-2 text-xs/4 text-gray-900 outline-1 -outline-offset-1 outline-gray-300 hover:outline-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 dark:bg-gray-900 dark:text-white dark:outline-white/10 dark:hover:outline-white/20 dark:focus:outline-blue-500">' +
      SCENARIOS.map(function (s) { return '<option value="' + s.id + '">' + s.label + "</option>"; }).join("") +
      "</select>";
    document.body.appendChild(bar);
    document.body.classList.add("pb-20");
    var sel = bar.querySelector("select");
    sel.value = scenario();
    sel.addEventListener("change", function () {
      save({ scenario: sel.value, attempts: 0, reference: "" });
    });
  }

  return { run: run, mountDemo: mountDemo, scenarios: SCENARIOS, reset: function () { save({ attempts: 0, reference: "" }); } };
})();

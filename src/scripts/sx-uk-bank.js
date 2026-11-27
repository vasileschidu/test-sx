/**
 * sx-uk-bank.js
 * UK bank account step + Account validation with CoP (Confirmation of Payee)
 * for the SMART Exchange token flows, Preboarding and Onboarding with payment
 * (TCDM-5266). UK region only (`?region=uk`, sx-region.js): the US flows keep
 * their own form.
 *
 * Dialogs: Figma "SD Versioning" 3xOqsx6FVPNEAiSSpPCLJN, board "Account
 * validation - CoP UK - SD - 13.07.26" 20476:105335 (desktop 1728 + mobile 375).
 * The board draws them over the SMART Disburse UK bank summary; here they run
 * on the bank step of the SX flows (Alina, 2026-11-27). The form itself has no
 * Figma in these flows: it is the Preboarding bank form with the UK fields
 * (TODO(confirm)).
 *
 *   SXUkBank.isUk()
 *   SXUkBank.mount({
 *     fieldsEl, nextBtn,           // where the form goes, the Next button
 *     saved,                       // { holder, type, sortCode, account, isDefault }
 *     defaultHolder,               // prefill for Name on Account (the business)
 *     withDefault,                 // add "Set as default for future payments"
 *     paymentHref,                 // "Choose Another Method" goes here
 *     onVerified(bank)             // CoP passed: save and go on
 *   })
 *
 * The outcome of the (simulated) check is a demo choice: `?cop=<scenario>` or
 * the "Demo: CoP outcome" bar (sessionStorage `sx-uk-cop`). Default `match`.
 * Three attempts: the failure dialog of attempt 2 adds "Final attempt, review
 * your details carefully."; a third failure shows "Verification Limit Reached".
 * The design names the CoP reason codes (MBAM, BAMM / PAMM, ANNM, OPTO / SCNAS /
 * ACNS / AC01 / CASS, IVCR) only in frame names and does not explain them.
 *
 * TODO(confirm): the value shown under "Account Holder Name" (Figma sample
 * "Jonathan Alexander Williamson") and "Account Type"; what "Edit Details" does
 * on the account reference dialog (here: reopens the reference field); the
 * result of "Try Again"; mobile tooltip text (Figma carries a stale one).
 */
window.SXUkBank = (function () {
  "use strict";

  var KEY = "sx-uk-cop";
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

  // Heroicons outline 24 / mini 20 (the set the flows already use).
  var P = {
    warn: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z",
    bank: "M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z",
    x: "M6 18 18 6M6 6l12 12",
  };
  var MINI_WARN =
    "M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z";
  var MINI_INFO =
    "M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z";

  var TONES = {
    amber: { circle: "bg-amber-100 dark:bg-amber-400/10", icon: "text-amber-600 dark:text-amber-400" },
    red: { circle: "bg-red-100 dark:bg-red-400/10", icon: "text-red-600 dark:text-red-400" },
    blue: { circle: "bg-blue-50 dark:bg-blue-400/10", icon: "text-blue-600 dark:text-blue-400" },
  };

  var FOCUS =
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400";
  var RADIO =
    "relative size-4 shrink-0 cursor-pointer appearance-none rounded-full border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 before:absolute before:inset-1 before:rounded-full before:bg-white not-checked:before:hidden not-checked:hover:border-gray-400 dark:not-checked:hover:border-white/20 checked:border-blue-600 dark:checked:border-blue-500 checked:bg-blue-600 dark:checked:bg-blue-500 aria-invalid:border-red-300 " +
    FOCUS;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function isUk() {
    return !!(window.SXRegion && window.SXRegion.region === "uk");
  }

  // ── State (demo outcome, attempts, reference) ──

  function state() {
    try { return JSON.parse(sessionStorage.getItem(KEY) || "{}"); } catch (e) { return {}; }
  }
  function save(patch) {
    try { sessionStorage.setItem(KEY, JSON.stringify(Object.assign({}, state(), patch))); } catch (e) {}
  }
  function scenario() {
    var q = new URLSearchParams(window.location.search).get("cop");
    if (q && SCENARIOS.some(function (s) { return s.id === q; })) {
      if (state().scenario !== q) save({ scenario: q, attempts: 0, reference: "" });
      return q;
    }
    return state().scenario || "match";
  }
  function attempts() { return Number(state().attempts || 0); }

  // ── Dialog pieces ──

  function svg(path, cls, mini) {
    return mini
      ? '<svg viewBox="0 0 20 20" fill="currentColor" class="' + cls + '" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="' + path + '"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="' + cls + '" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="' + path + '"/></svg>';
  }

  function illustration(tone, icon) {
    var t = TONES[tone];
    return '<div class="mx-auto flex size-12 items-center justify-center rounded-full ' + t.circle + '">' + svg(P[icon], "size-6 " + t.icon) + "</div>";
  }

  /** Information circle + tooltip above it (Figma: dark bubble, arrow down). Hover, focus and tap. */
  function infoTip(id, label, html) {
    return (
      '<span class="group/info relative inline-flex size-5 items-center justify-center">' +
      '<span tabindex="0" role="button" aria-label="' + esc(label) + '" aria-describedby="' + id + '" ' +
      'class="inline-flex cursor-help rounded-sm text-gray-400 hover:text-gray-900 focus-visible:text-gray-900 group-focus-within/info:text-gray-900 dark:text-gray-500 dark:hover:text-white dark:group-focus-within/info:text-white ' + FOCUS + '">' +
      svg(MINI_INFO, "size-4.5", true) + "</span>" +
      '<span id="' + id + '" role="tooltip" class="pointer-events-none invisible absolute bottom-full left-[-12px] z-10 mb-3 w-max max-w-[min(343px,calc(100vw-4rem))] rounded-lg bg-gray-900 p-3 text-left text-sm/5 font-normal text-gray-100 opacity-0 shadow-xs transition-opacity before:absolute before:top-full before:left-4 before:-mt-1.5 before:size-3 before:rotate-45 before:rounded-[2px] before:bg-gray-900 group-hover/info:visible group-hover/info:opacity-100 group-focus-within/info:visible group-focus-within/info:opacity-100 dark:bg-gray-950 dark:ring-1 dark:ring-white/10 dark:before:bg-gray-950">' +
      html + "</span></span>"
    );
  }

  /** Result card: grey header ("Close Match" / "Doesn’t Match") + info tip, then rows. */
  function resultCard(id, title, tip, rows) {
    return (
      '<div class="rounded-lg border border-gray-200 dark:border-white/10">' +
      '<div class="flex items-center gap-1.5 rounded-t-[7px] border-b border-gray-200 bg-gray-100 px-4 py-2 dark:border-white/10 dark:bg-white/10">' +
      '<span class="text-sm/5 font-semibold text-gray-900 dark:text-white">' + title + "</span>" +
      infoTip(id, "About “" + title.replace("&rsquo;", "’") + "”", tip) + "</div>" +
      rows.map(function (r) {
        var cls = r.tone === "amber" ? "text-amber-700 dark:text-amber-400" : "text-red-600 dark:text-red-400";
        var ico = r.tone === "amber" ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";
        return (
          '<div class="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">' +
          '<span class="text-sm/5 text-gray-700 dark:text-gray-300">' + r.label + "</span>" +
          '<span class="flex items-start gap-2 sm:justify-end"><span class="text-sm/5 font-medium ' + cls + ' sm:text-right">' + esc(r.value) + "</span>" +
          svg(MINI_WARN, "mt-px size-5 shrink-0 " + ico, true) + "</span></div>"
        );
      }).join("") + "</div>"
    );
  }

  function note(text) {
    return (
      '<p class="flex items-center justify-center gap-2 text-xs/4 text-gray-500 dark:text-gray-400">' +
      svg(MINI_WARN, "size-4 shrink-0 text-amber-500", true) + text + "</p>"
    );
  }

  var ctx = null; // the mounted form: { opts, button, bank }

  function closeDialog() { window.OBModal.close(); }

  /**
   * One CoP dialog (Figma: 512 / 343 card, X top-left, 48px circle, heading,
   * body, optional cards or field, stacked full-width buttons).
   */
  function dialog(o) {
    var M = window.OBModal;
    var header =
      '<div class="flex h-14 shrink-0 items-start justify-start px-4 pt-4">' + M.closeButton("data-ob-modal-close") + "</div>";
    var body =
      '<div class="flex flex-col gap-6 px-4 pb-6 sm:px-6">' +
      '<div class="flex flex-col items-center gap-4 text-center">' + illustration(o.tone, o.icon) +
      '<div class="flex flex-col gap-2"><h2 id="sxuk-cop-title" class="type-title-modal text-default">' + o.title + "</h2>" +
      '<div class="flex flex-col gap-2 text-sm/5 text-gray-700 dark:text-gray-300">' + o.body + "</div></div></div>" +
      (o.extra || "") + "</div>";
    var footer =
      '<div class="flex flex-col gap-3 px-6 pb-6">' +
      '<button type="button" data-cop-primary class="' + M.PRIMARY_BUTTON + '">' + o.primary + "</button>" +
      (o.secondary
        ? '<button type="button" data-cop-secondary class="' + M.BUTTON_BASE + ' border border-gray-300 bg-white text-gray-700 shadow-xs hover:bg-gray-50 dark:border-white/10 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/5 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400">' + o.secondary + "</button>"
        : "") +
      (o.note ? '<div class="pt-1">' + o.note + "</div>" : "") + "</div>";
    M.open(body, "sxuk-cop-title", { bare: true, header: header, footer: footer });
    var panel = document.querySelector("[data-ob-modal-dialog]");
    panel.querySelector("[data-cop-primary]").addEventListener("click", function () { o.onPrimary(); });
    var sec = panel.querySelector("[data-cop-secondary]");
    if (sec) sec.addEventListener("click", function () { closeDialog(); });
    setTimeout(function () {
      var t = panel.querySelector("[data-cop-ref]") || panel.querySelector("[data-cop-primary]");
      if (t) t.focus({ preventScroll: true });
    }, 60);
    return panel;
  }

  function names() {
    return { holder: (ctx.bank && ctx.bank.holder) || "", type: (ctx.bank && ctx.bank.type === "business" ? "Business" : "Personal") };
  }

  function focusForm() {
    var first = ctx.opts.fieldsEl.querySelector("input:not([type=radio]), textarea");
    if (first) first.focus();
  }

  // ── Dialogs ──

  function referenceModal(prefill) {
    var panel = dialog({
      tone: "blue",
      icon: "bank",
      title: "Additional Information Needed",
      body: "<p>To help ensure payment is sent to the correct account, enter the reference required by the bank.</p>",
      extra:
        '<div class="flex flex-col gap-1">' +
        '<div class="flex min-h-5 items-center gap-1"><label for="sxuk-cop-ref" class="' + window.OBField.LABEL + '">Account Reference</label>' +
        infoTip("sxuk-cop-ref-tip", "About the account reference", TIPS.reference) + "</div>" +
        '<div class="relative">' +
        '<textarea id="sxuk-cop-ref" data-cop-ref rows="1" placeholder="Enter Reference" autocomplete="off" aria-invalid="false" aria-describedby="sxuk-cop-ref-error" class="' + window.OBField.TEXTAREA + ' min-h-10 resize-none overflow-hidden aria-invalid:pr-10"></textarea>' +
        window.OBField.errorIcon() + "</div>" +
        '<p id="sxuk-cop-ref-error" data-cop-ref-error role="alert" class="hidden ' + window.OBField.ERROR_TEXT + '"></p></div>',
      primary: "Confirm",
      secondary: "Cancel",
      onPrimary: function () {
        var v = field.value.trim();
        var msg = !v ? "Account Reference is required." : v.length > REF_MAX ? "Maximum of " + REF_MAX + " characters allowed." : "";
        show(msg);
        if (msg) { field.focus(); return; }
        save({ reference: v });
        closeDialog();
        verify();
      },
    });
    var field = panel.querySelector("[data-cop-ref]");
    var err = panel.querySelector("[data-cop-ref-error]");
    function grow() { field.style.height = "auto"; field.style.height = field.scrollHeight + "px"; }
    function show(msg) { window.OBField.setError(field, !!msg, err, msg || ""); }
    field.value = prefill || "";
    field.addEventListener("input", function () { grow(); if (field.getAttribute("aria-invalid") === "true") show(""); });
    field.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); panel.querySelector("[data-cop-primary]").click(); }
    });
    grow();
  }

  function refNoMatchModal() {
    dialog({
      tone: "amber",
      icon: "warn",
      title: "Update Required",
      body: "<p>Some of the details you entered don’t match those registered with your bank. Make sure they match your bank’s records.</p>",
      extra: resultCard("sxuk-t1", "Doesn&rsquo;t Match", TIPS.refNoMatch, [
        { label: "Account Reference", value: state().reference || "000000000000", tone: "red" },
      ]),
      primary: "Edit Details",
      onPrimary: function () { closeDialog(); referenceModal(state().reference); },
    });
  }

  function updateModal(kind, final) {
    var n = names();
    var cards;
    if (kind === "close-name")
      cards = resultCard("sxuk-t1", "Close Match", TIPS.closeName, [{ label: "Account Holder Name", value: n.holder, tone: "amber" }]);
    else if (kind === "close-name-type")
      cards =
        resultCard("sxuk-t1", "Close Match", TIPS.closeName, [{ label: "Account Holder Name", value: n.holder, tone: "amber" }]) +
        resultCard("sxuk-t2", "Doesn&rsquo;t Match", TIPS.noType, [{ label: "Account Type", value: n.type, tone: "red" }]);
    else if (kind === "no-name")
      cards = resultCard("sxuk-t1", "Doesn&rsquo;t Match", TIPS.noName, [{ label: "Account Holder Name", value: n.holder, tone: "red" }]);
    else
      cards = resultCard(
        "sxuk-t1", "Doesn&rsquo;t Match",
        '<ol class="list-decimal space-y-2 pl-4"><li>' + TIPS.noName + "</li><li>" + TIPS.noType + "</li></ol>",
        [{ label: "Account Holder Name", value: n.holder, tone: "red" }, { label: "Account Type", value: n.type, tone: "red" }]
      );
    dialog({
      tone: "amber",
      icon: "warn",
      title: "Update Required",
      body: "<p>Some of the details you entered don’t match those registered with your bank. Make sure they match your bank’s records.</p>",
      extra: '<div class="flex flex-col gap-3">' + cards + "</div>",
      primary: "Edit Details",
      note: final ? note("Final attempt, review your details carefully.") : "",
      onPrimary: function () { closeDialog(); setTimeout(focusForm, 120); },
    });
  }

  function unableModal(final) {
    dialog({
      tone: "amber",
      icon: "warn",
      title: "Unable to Verify Bank Account",
      body: "<p>We couldn’t identify an account using the details you entered.</p><p>Make sure all details match your bank’s records and that your account is active.</p>",
      primary: "Review all bank details",
      note: final ? note("Final attempt, review your details carefully.") : "",
      onPrimary: function () { closeDialog(); setTimeout(focusForm, 120); },
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
      onPrimary: function () {
        if (alternatives) window.location.href = ctx.opts.paymentHref;
        else { closeDialog(); setTimeout(function () { if (window.OBContact) window.OBContact.open(); }, 250); }
      },
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
      onPrimary: function () { closeDialog(); verify(); },
    });
  }

  // ── The check ──

  function busy(on) {
    var b = ctx.opts.nextBtn;
    if (on) { b.dataset.copLabel = b.innerHTML; b.innerHTML = "Verifying…"; b.disabled = true; }
    else if (b.dataset.copLabel) { b.innerHTML = b.dataset.copLabel; delete b.dataset.copLabel; b.disabled = false; }
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
      if (s === "match" || s === "reference") { save({ attempts: 0 }); ctx.opts.onVerified(ctx.bank); return; }
      if (s === "unavailable") { unavailableModal(); return; }
      if (s === "limit") { limitModal(true); return; }
      if (s === "limit-none") { limitModal(false); return; }
      fail(s);
    }, 900);
  }

  function run(bank) {
    ctx.bank = bank;
    var s = scenario();
    if ((s === "reference" || s === "reference-nomatch") && !state().reference) referenceModal("");
    else verify();
  }

  // ── Demo switch (prototype only) ──

  function mountDemo() {
    if (document.getElementById("sxuk-cop-demo")) return;
    var bar = document.createElement("div");
    bar.id = "sxuk-cop-demo";
    bar.className =
      "fixed top-4 right-4 z-30 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-lg bg-white p-2 pl-3 text-xs/4 shadow-lg ring-1 ring-gray-900/10 max-lg:static max-lg:mx-auto max-lg:mb-4 max-lg:w-fit dark:bg-gray-900 dark:ring-white/10";
    bar.innerHTML =
      '<label for="sxuk-cop-select" class="shrink-0 font-medium text-gray-600 dark:text-gray-400">Demo: CoP outcome</label>' +
      '<select id="sxuk-cop-select" class="min-w-0 rounded-md bg-white py-1 pr-7 pl-2 text-xs/4 text-gray-900 outline-1 -outline-offset-1 outline-gray-300 hover:outline-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 dark:bg-gray-900 dark:text-white dark:outline-white/10 dark:hover:outline-white/20 dark:focus:outline-blue-500">' +
      SCENARIOS.map(function (s) { return '<option value="' + s.id + '">' + s.label + "</option>"; }).join("") + "</select>";
    document.body.appendChild(bar);
    var sel = bar.querySelector("select");
    sel.value = scenario();
    sel.addEventListener("change", function () { save({ scenario: sel.value, attempts: 0, reference: "" }); });
  }

  // ── UK bank form ──

  function labelRow(id, text, tip) {
    return '<div class="flex min-h-5 items-center gap-1"><label for="' + id + '" class="' + window.OBField.LABEL + '">' + esc(text) + "</label>" + (tip || "") + "</div>";
  }

  function textField(id, label, value, o) {
    var F = window.OBField;
    o = o || {};
    return (
      '<div class="flex w-full min-w-0 flex-col gap-1">' + labelRow(id, label) +
      '<div class="relative"><input id="' + id + '" type="text" value="' + esc(value) + '" autocomplete="' + (o.autocomplete || "off") + '"' +
      (o.inputmode ? ' inputmode="' + o.inputmode + '"' : "") + (o.maxLength ? ' maxlength="' + o.maxLength + '"' : "") +
      (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : "") +
      ' aria-invalid="false" aria-describedby="' + id + '-error" class="' + F.INPUT + '">' + F.errorIcon() + "</div>" +
      (o.helper ? '<p class="' + F.HELPER + '">' + esc(o.helper) + "</p>" : "") +
      '<p id="' + id + '-error" class="hidden ' + F.ERROR_TEXT + '"></p></div>'
    );
  }

  function radio(name, value, label, checked) {
    return (
      '<label class="flex cursor-pointer items-center gap-2 text-sm leading-5 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">' +
      '<input type="radio" name="' + name + '" value="' + value + '"' + (checked ? " checked" : "") + ' aria-invalid="false" class="' + RADIO + '">' + esc(label) + "</label>"
    );
  }

  function fieldError(input, message) {
    window.OBField.setError(input, !!message, document.getElementById(input.id + "-error"), message || "");
  }

  function digits(v) { return String(v || "").replace(/\D/g, ""); }
  function formatSort(v) {
    var d = digits(v).slice(0, 6);
    return d.replace(/^(\d{2})(\d{0,2})(\d{0,2}).*$/, function (_, a, b, c) { return a + (b ? "-" + b : "") + (c ? "-" + c : ""); });
  }

  function mount(opts) {
    ctx = { opts: opts, bank: null };
    var saved = opts.saved || {};
    var type = saved.type === "business" ? "business" : saved.type === "personal" ? "personal" : "";
    opts.fieldsEl.innerHTML =
      '<div role="note" class="flex w-full items-start gap-3 rounded-md bg-blue-50 p-4 dark:bg-blue-500/10"><img src="../../assets/onboarding/icon-info-circle-blue.svg" alt="" width="20" height="20" class="size-5 shrink-0"><p class="min-w-0 flex-1 text-sm leading-5 text-blue-800 dark:text-blue-300">Please make sure the details are accurate to ensure the payment is received.</p></div>' +
      textField("sxuk-holder", "Name on Account", saved.holder || opts.defaultHolder || "", { placeholder: "Account Name", autocomplete: "name" }) +
      '<fieldset class="flex flex-col gap-3"><legend class="mb-3 ' + window.OBField.LABEL + '">Account Type</legend>' +
      '<div class="flex gap-6">' + radio("sxuk-type", "personal", "Personal", type === "personal") + radio("sxuk-type", "business", "Business", type === "business") + "</div>" +
      '<p id="sxuk-type-error" class="hidden ' + window.OBField.ERROR_TEXT + '"></p></fieldset>' +
      textField("sxuk-sort", "Sort Code", formatSort(saved.sortCode), { inputmode: "numeric", maxLength: 8, placeholder: "00-00-00" }) +
      textField("sxuk-account", "Account Number", saved.account || "", { inputmode: "numeric", maxLength: 8, placeholder: "00000000" }) +
      textField("sxuk-verify", "Confirm Account Number", saved.account || "", { inputmode: "numeric", maxLength: 8, placeholder: "00000000" }) +
      (opts.withDefault
        ? '<app-checkbox data-pb-bank-default label="Set as default for future payments"' + (saved.isDefault ? " checked" : "") + "></app-checkbox>"
        : "");

    var el = {
      holder: document.getElementById("sxuk-holder"),
      sort: document.getElementById("sxuk-sort"),
      account: document.getElementById("sxuk-account"),
      verify: document.getElementById("sxuk-verify"),
    };
    var types = opts.fieldsEl.querySelectorAll('input[name="sxuk-type"]');
    var typeError = document.getElementById("sxuk-type-error");
    var touched = {};

    var rules = {
      holder: function (v) {
        if (!v) return "Name on Account is required";
        return /^[A-Za-z0-9 .\-/\\'_,:#&]*$/.test(v) ? "" : "Name on Account contains characters that are not allowed";
      },
      sort: function (v) {
        var d = digits(v);
        return !d ? "Sort Code is required" : /^\d{6}$/.test(d) && !/^0+$/.test(d) ? "" : "Enter a valid 6-digit Sort Code";
      },
      account: function (v) {
        return !v ? "Account Number is required" : /^\d{8}$/.test(v) && !/^0+$/.test(v) ? "" : "Enter a valid 8-digit Account Number";
      },
      verify: function (v) {
        if (!v) return "Confirm Account Number is required";
        return v === el.account.value.trim() ? "" : "Account numbers do not match";
      },
    };
    function typeValue() {
      var t = opts.fieldsEl.querySelector('input[name="sxuk-type"]:checked');
      return t ? t.value : "";
    }
    function valid() {
      return !!typeValue() && Object.keys(rules).every(function (k) { return !rules[k](el[k].value.trim()); });
    }
    function sync() {
      Object.keys(el).forEach(function (k) { if (touched[k]) fieldError(el[k], rules[k](el[k].value.trim())); });
      opts.nextBtn.disabled = !valid();
    }
    Object.keys(el).forEach(function (k) {
      el[k].addEventListener("input", function () {
        if (k === "sort") el[k].value = formatSort(el[k].value);
        else if (k !== "holder") el[k].value = digits(el[k].value);
        sync();
      });
      el[k].addEventListener("blur", function () { touched[k] = true; sync(); });
    });
    for (var i = 0; i < types.length; i += 1)
      types[i].addEventListener("change", function () {
        for (var j = 0; j < types.length; j += 1) types[j].setAttribute("aria-invalid", "false");
        typeError.classList.add("hidden");
        sync();
      });

    opts.nextBtn.addEventListener("click", function () {
      if (!valid() || opts.nextBtn.dataset.copLabel) return;
      var def = opts.fieldsEl.querySelector("input[data-pb-bank-default]");
      run({
        holder: el.holder.value.trim(),
        type: typeValue(),
        sortCode: digits(el.sort.value),
        account: el.account.value.trim(),
        isDefault: !!(def && def.checked),
      });
    });
    mountDemo();
    sync();
  }

  return { isUk: isUk, mount: mount, scenarios: SCENARIOS, formatSort: formatSort };
})();

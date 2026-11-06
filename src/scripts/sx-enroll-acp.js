/**
 * sx-enroll-acp.js — step 6 "Automatic Card Processing" of the SMART Exchange
 * enrolment (src/pages/sx-enroll/card-processing.html).
 * Figma 9DRzbyv7FDCDYFYN5ZGuwZ: 8. 36525:48445, 8.1 review 36525:50666,
 * 8.2 opened 36525:48634; A (I'm authorized) 36525:49670 → 50319;
 * B (send to a signer) 36525:48843 → 49486; C opt out 33456:53560 / 53422.
 *
 *   Toggle on  → "Review agreement" opens the Visa AR Manager Participation
 *                Agreement (OBModal) → "Agreement was opened" + "Are you
 *                authorized to sign?" radio cards.
 *     A  names + Confirm Acceptance → "Acknowledgement Complete".
 *        STPState in_progress / terminal_completed_tid_mid_received;
 *        case enrol { stp: 'on', signer: 'self', agreementSigned: true }.
 *     B  names + email + note + Send signing request →
 *        STPState.sendAgreementEmail (allowlist / test mode) →
 *        "Waiting for acknowledgement"; enrol { stp: 'on', signer: 'other' }.
 *   Toggle off → Next asks "opt out?" → enrol { stp: 'skipped' },
 *        STPState back to disabled / opt_in_required.
 * Next is enabled with the toggle off, after A is acknowledged or B is sent.
 * Starting answers come from an earlier visit or the case enrolment (older
 * cases may still carry a scenario A / B / C).
 */
(function () {
  "use strict";

  var X = window.SXEnroll;
  var esc = X.esc;
  var UI_KEY = "acp";

  var BADGE = {
    done: "inline-flex w-fit items-center rounded-md bg-green-50 dark:bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400 inset-ring inset-ring-green-600/20 dark:inset-ring-green-500/20",
    progress: "inline-flex w-fit items-center rounded-md bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300 inset-ring inset-ring-blue-700/10 dark:inset-ring-blue-400/20",
  };

  // Native radio (same as the case launcher), with a disabled look.
  var RADIO =
    "relative size-4 shrink-0 cursor-pointer appearance-none rounded-full border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-900 before:absolute before:inset-1 before:rounded-full before:bg-white dark:before:bg-gray-900 not-checked:before:hidden checked:border-blue-600 dark:checked:border-blue-400 checked:bg-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400 disabled:cursor-not-allowed disabled:border-gray-300 dark:disabled:border-white/10 disabled:bg-gray-100 dark:disabled:bg-white/10 disabled:before:bg-gray-400";

  var LINK =
    "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-sm text-sm font-semibold text-blue-600 dark:text-blue-400 underline underline-offset-2 transition-colors hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400 disabled:cursor-not-allowed disabled:opacity-50";

  function ui() {
    return X.getState()[UI_KEY] || {};
  }

  function saveUi(patch) {
    var next = {};
    next[UI_KEY] = Object.assign(ui(), patch);
    X.saveState(next);
  }

  // ---- Agreement viewer ----------------------------------------------------

  var AGREEMENT = [
    "PLEASE READ THIS ONLINE PARTICIPATION AGREEMENT. IT CONTAINS THE TERMS AND CONDITIONS FOR VISA AR MANAGER (THE “SERVICES”). BY CLICKING “I ACCEPT” OR A SIMILAR AFFIRMATION, OR BY ACCESSING OR USING THE SERVICES, YOU AGREE THAT YOUR COMPANY WILL BE GOVERNED BY THIS AGREEMENT. YOU REPRESENT THAT YOU HAVE THE AUTHORITY TO ACCEPT THIS AGREEMENT ON BEHALF OF THE COMPANY YOU REPRESENT.",
    "This Visa AR Manager Online Participation Agreement is entered into by and between Visa U.S.A. Inc. (“Visa”) and the undersigned (“Company”), effective as of the date agreed to by Company (“Agreement Effective Date”). Visa and Company may each be referred to as a “Party” or collectively as the “Parties”.",
    "## 1. Services and Fees",
    "a. Services. Visa AR Manager is a payment processing service that automates the retrieval of Visa-branded virtual card account details from Company’s participating customers, the processing of virtual card payments from those customers, and the delivery of payment and invoice details to Company to assist with reconciliation.",
    "b. Fees. Visa shall provide Company with the Services free of charge unless different payment terms are agreed upon by the Parties in writing.",
    "## 2. Term and Termination",
    "This Agreement commences on the Agreement Effective Date and remains in effect until terminated by either Party in accordance with this section. Either Party may terminate this Agreement without cause by giving written notice to the other Party thirty (30) days prior to termination.",
    "## 3. Confidential Information",
    "Each Party shall protect the other Party’s Confidential Information with at least the same degree of care it uses to protect its own confidential information of a similar nature, and no less than a reasonable degree of care.",
    "## 4. Merchant Processor",
    "Company authorizes Visa to transmit virtual card payments to the merchant processor Company currently uses to settle card payments. Company confirms its merchant identifiers (MID / TID) may be shared with Visa for this purpose, and that a small verification deposit may be made to the account that receives those settlements.",
    "## 5. Opt-out",
    "Company may stop automatic processing at any time from the Payment Preferences of its SMART Exchange account. Payments already processed are not affected.",
    "This text is a placeholder for the prototype; the full agreement is provided by Visa.",
  ];

  function agreementBody() {
    return AGREEMENT.map(function (p) {
      if (p.indexOf("## ") === 0)
        return '<p class="pt-2 text-sm font-semibold text-gray-900 dark:text-white">' + esc(p.slice(3)) + "</p>";
      return '<p class="text-sm leading-6 text-gray-700 dark:text-gray-300">' + esc(p) + "</p>";
    }).join("");
  }

  /** The agreement "page" (also used by the signer page, sign-agreement.html). */
  function agreementArticle() {
    return (
      '<article class="mx-auto flex max-w-3xl flex-col gap-3 rounded-sm bg-white dark:bg-gray-900 p-6 shadow-sm ring-1 ring-black/5 dark:ring-white/10 sm:p-10">' +
      '<p class="self-end text-4xl font-extrabold tracking-tight text-blue-900 dark:text-blue-400 italic">VISA</p>' +
      '<h3 class="text-center text-lg font-semibold text-gray-900 dark:text-white">Visa AR Manager – Online Participation Agreement</h3>' +
      agreementBody() +
      "</article>"
    );
  }
  X.agreementArticle = agreementArticle;

  function openAgreement() {
    var M = window.OBModal;
    M.open(
      '<div class="flex min-h-0 flex-1 flex-col p-6">' +
        '<div tabindex="0" aria-label="Agreement text" class="min-h-0 flex-1 overflow-y-auto rounded border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4 focus-visible:outline-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400">' +
        agreementArticle() +
        "</div>" +
        "</div>",
      "sx-agreement-title",
      {
        bare: true,
        header:
          '<div class="flex shrink-0 items-center gap-2 border-b border-gray-200 dark:border-white/10 py-3 pr-3 pl-6">' +
          '<h2 id="sx-agreement-title" class="flex-1 text-base leading-6 font-medium text-gray-900 dark:text-white">Visa AR Manager Participation Agreement</h2>' +
          '<button type="button" data-ob-modal-close class="flex size-10 cursor-pointer items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400">' +
          '<span class="sr-only">Close</span><img src="../../assets/onboarding/icon-x-lined-gray.svg" alt="" width="24" height="24" class="size-6"></button>' +
          "</div>",
        footer:
          '<div class="flex justify-end border-t border-gray-200 dark:border-white/10 px-6 py-4">' +
          '<button type="button" data-ob-modal-close class="' +
          M.SECONDARY_BUTTON_MD +
          '">Close Agreement</button>' +
          "</div>",
        // Full height with a 16px gap: sx-enroll.js (fullHeightViewer).
      },
    );
  }

  // ---- Opt-out confirm (Figma 33456:53422) ---------------------------------

  function confirmOptOut(onConfirm) {
    var M = window.OBModal;
    var backdrop = M.open(
      '<div class="flex flex-col items-center gap-3 px-6 pb-6 text-center">' +
        M.illustration("icon-exclamation-triangle-red.svg", "bg-red-50 dark:bg-red-500/10") +
        '<h2 id="sx-optout-title" class="text-base leading-6 font-semibold text-gray-900 dark:text-white">You are electing to opt out of automated card processing. Please confirm below.</h2>' +
        '<p class="text-sm leading-5 text-gray-500 dark:text-gray-400">By opting out, card payments <span class="font-medium text-gray-900 dark:text-white">will not automatically process</span> and you will need to manually key in the information.</p>' +
        "</div>",
      "sx-optout-title",
      {
        footer:
          '<div class="grid grid-cols-2 gap-3 border-t border-gray-200 dark:border-white/10 px-6 py-4">' +
          '<button type="button" data-ob-modal-close class="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-white dark:bg-gray-900 px-3 text-sm font-semibold text-gray-900 dark:text-white shadow-xs inset-ring inset-ring-gray-300 dark:inset-ring-white/10 hover:bg-gray-50 dark:hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400">Cancel</button>' +
          '<button type="button" data-sx-optout-confirm class="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-red-600 px-3 text-sm font-semibold text-white shadow-xs hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-50">Yes, opt out</button>' +
          "</div>",
        panelClass: "relative flex w-full max-w-md flex-col rounded-lg bg-white dark:bg-gray-900 shadow-xl",
      },
    );
    backdrop.querySelector("[data-sx-optout-confirm]").addEventListener("click", function (event) {
      backdrop.setAttribute("data-busy", "true");
      X.setLoading(event.currentTarget, "Opting out…");
      window.setTimeout(function () {
        M.close();
        onConfirm();
      }, 600);
    });
  }

  // ---- Page ----------------------------------------------------------------

  X.page("card-processing", function (c) {
    var toggle = document.getElementById("sx-acp-toggle");
    var panel = document.querySelector("[data-acp-panel]");
    var next = document.querySelector("[data-sx-next]");
    var enrol = c.enrol || {};
    var saved = ui();
    var busy = false;

    // Starting answers: this visit's choices, else the case's enrolment, else the scenario.
    var on =
      typeof saved.on === "boolean"
        ? saved.on
        : enrol.stp === "on"
          ? true
          : enrol.stp === "skipped"
            ? false
            : c.scenario !== "C";
    var choice =
      saved.choice ||
      (enrol.signer === "self" ? "self" : enrol.signer === "other" ? "other" : null) ||
      (c.scenario === "A" ? "self" : c.scenario === "B" ? "other" : null);
    var opened = !!saved.opened || !!enrol.agreement;
    var formA = saved.formA || { first: c.supplier.contactFirst, last: c.supplier.contactLast };
    // The signer always starts as the case's authorized signer (launcher "Edit
    // case information"); only the note is remembered from an earlier visit.
    var formB = {
      first: (c.signer && c.signer.firstName) || "",
      last: (c.signer && c.signer.lastName) || "",
      email: (c.signer && c.signer.email) || "",
      note:
        (saved.formB && typeof saved.formB.note === "string" && saved.formB.note) ||
        "Please sign this agreement, it will allow us to have card payments automatically processed.",
    };
    var sendError = "";

    toggle.checked = on;

    function latest() {
      return X.currentCase() || c;
    }
    // A: confirmed here. B: the other signer signed on sign-agreement.html.
    function acknowledged() {
      var e = latest().enrol || {};
      return e.stp === "on" && e.agreementSigned === true && e.agreement && e.agreement.confirmedAt;
    }
    function sent() {
      var e = latest().enrol || {};
      return e.stp === "on" && e.signer === "other" && e.agreement && e.agreement.sentAt;
    }

    function persist() {
      saveUi({ on: on, choice: choice, opened: opened, formA: formA, formB: formB });
    }

    function syncNext() {
      next.disabled = busy || !(!on || acknowledged() || sent());
    }

    // -- Markup pieces

    function reviewRow() {
      return (
        '<div class="flex items-center gap-3 rounded-lg bg-gray-50 dark:bg-white/5 px-4 py-3">' +
        '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 shrink-0 text-gray-500 dark:text-gray-400"><path fill-rule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm2.25 8.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z" clip-rule="evenodd" /></svg>' +
        '<p class="min-w-0 flex-1 text-sm font-medium text-gray-900 dark:text-white">Visa AR Manager Participation Agreement</p>' +
        '<button type="button" data-acp-review class="' + LINK + '">Review agreement</button>' +
        "</div>"
      );
    }

    function openedBanner() {
      return (
        '<div class="flex items-center gap-3 rounded-md bg-green-50 dark:bg-green-500/10 px-4 py-3">' +
        '<img src="../../assets/onboarding/icon-check-circle-green.svg" alt="" width="20" height="20" class="size-5 shrink-0">' +
        '<p class="min-w-0 flex-1 text-sm font-medium text-gray-900 dark:text-white">Agreement was opened</p>' +
        '<button type="button" data-acp-review class="inline-flex shrink-0 cursor-pointer rounded-sm text-sm font-semibold text-gray-700 dark:text-gray-300 underline underline-offset-2 hover:text-gray-900 dark:hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400 disabled:cursor-not-allowed disabled:opacity-50">Review again</button>' +
        "</div>"
      );
    }

    function radioCard(value, label, formHtml) {
      var checked = choice === value;
      return (
        '<div class="overflow-hidden rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900">' +
        '<label class="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 has-checked:bg-gray-50 dark:has-checked:bg-white/5 has-disabled:cursor-not-allowed has-disabled:hover:bg-white dark:has-disabled:hover:bg-gray-900">' +
        '<input type="radio" name="sx-acp-signer" value="' + value + '"' + (checked ? " checked" : "") + ' class="' + RADIO + '">' +
        '<span class="text-sm font-medium text-gray-900 dark:text-white">' + esc(label) + "</span>" +
        "</label>" +
        (checked ? '<div class="flex flex-col gap-4 border-t border-gray-200 dark:border-white/10 p-4">' + formHtml + "</div>" : "") +
        "</div>"
      );
    }

    var BUTTON_MD = window.OBModal.PRIMARY_BUTTON_MD;

    function formSelf() {
      return (
        X.textField("sx-acp-a-first", "First Name", formA.first, { autocomplete: "given-name" }) +
        X.textField("sx-acp-a-last", "Last Name", formA.last, { autocomplete: "family-name" }) +
        '<p class="w-fit rounded-md border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-2 py-1 text-xs text-gray-700 dark:text-gray-300">Please confirm acceptance of the VISA AR Manager Participation Agreement.</p>' +
        '<div><button type="button" data-acp-confirm class="' + BUTTON_MD + '">Confirm Acceptance</button></div>'
      );
    }

    function formOther() {
      var F = window.OBField;
      return (
        X.textField("sx-acp-b-first", "First Name", formB.first, { autocomplete: "off" }) +
        X.textField("sx-acp-b-last", "Last Name", formB.last, { autocomplete: "off" }) +
        X.textField("sx-acp-b-email", "Email", formB.email, { type: "email", autocomplete: "off" }) +
        '<div class="flex w-full flex-col gap-1" data-sx-field="sx-acp-b-note">' +
        '<label for="sx-acp-b-note" class="' + F.LABEL + '">Note</label>' +
        '<textarea id="sx-acp-b-note" rows="3" maxlength="100" aria-invalid="false" aria-describedby="sx-acp-b-note-help sx-acp-b-note-error" class="' + F.TEXTAREA + ' resize-y">' + esc(formB.note) + "</textarea>" +
        '<p id="sx-acp-b-note-help" class="flex justify-between gap-2 ' + F.HELPER + '"><span>Maximum 100 characters</span><span data-acp-count aria-live="polite"></span></p>' +
        '<p id="sx-acp-b-note-error" class="hidden ' + F.ERROR_TEXT + '"></p>' +
        "</div>" +
        (sendError
          ? '<div role="alert" class="flex items-start gap-3 rounded-md bg-red-50 dark:bg-red-500/10 p-3"><img src="../../assets/onboarding/icon-exclamation-circle-red.svg" alt="" width="20" height="20" class="size-5 shrink-0"><p class="text-sm text-red-800 dark:text-red-300">' + esc(sendError) + "</p></div>"
          : "") +
        '<div><button type="button" data-acp-send class="' + BUTTON_MD + '">Send signing request</button></div>'
      );
    }

    function statusCard(title, rows, footHtml) {
      return (
        '<section aria-label="' + esc(title) + '" class="overflow-hidden rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900">' +
        '<h2 class="border-b border-gray-200 dark:border-white/10 px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">' + esc(title) + "</h2>" +
        '<div class="flex flex-col gap-2 p-4">' + rows + "</div>" +
        (footHtml ? '<div class="border-t border-gray-200 dark:border-white/10 px-4 py-3">' + footHtml + "</div>" : "") +
        "</section>"
      );
    }

    function ackCard() {
      var a = latest().enrol.agreement || {};
      return statusCard(
        "Acknowledgement Complete",
        X.row("Status", '<span class="' + BADGE.done + '">Completed</span>') +
          X.row("Signed by", esc(a.signedBy)) +
          X.row("Confirmed at", esc(X.stamp(a.confirmedAt))),
      );
    }

    function waitingCard() {
      var a = latest().enrol.agreement || {};
      var delivery = window.STPState ? window.STPState.getAgreementSentText() : "";
      return statusCard(
        "Waiting for acknowledgement",
        X.row("Status", '<span class="' + BADGE.progress + '">In Process</span>') +
          X.row("Delegated to", esc(a.delegatedTo)) +
          X.row("Email", '<span class="break-all">' + esc(a.email) + "</span>") +
          X.row("Sent at", esc(X.stamp(a.sentAt))),
        '<p class="text-sm text-gray-500 dark:text-gray-400"><span class="font-medium text-gray-900 dark:text-white">' + esc(a.delegatedTo) + "</span> will receive an email with a secure link to review and acknowledge the Visa AR Manager Participation Agreement.</p>" +
          (delivery ? '<p data-acp-delivery class="mt-2 text-xs text-gray-500 dark:text-gray-400">' + esc(delivery) + ".</p>" : "") +
          '<div class="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">' +
          '<button type="button" data-acp-change class="inline-flex cursor-pointer items-center gap-1.5 rounded-sm text-sm font-semibold text-blue-600 dark:text-blue-400 transition-colors hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400">Change signer</button>' +
          // Test mode (no email delivered): the presenter opens the signer's link here.
          (a.delivered === false
            ? '<a data-acp-signer-link href="' + esc(signerLink(a.email)) + '" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 rounded-sm text-sm font-semibold text-blue-600 dark:text-blue-400 transition-colors hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400">Open signer’s link' +
              '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path fill-rule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Z" clip-rule="evenodd" /><path fill-rule="evenodd" d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.553l-9.056 8.194a.75.75 0 0 0-.053 1.06Z" clip-rule="evenodd" /></svg>' +
              '<span class="sr-only">(opens in a new tab)</span></a>'
            : "") +
          "</div>",
      );
    }

    // Same link the email button opens (sign-agreement.html?case=…&email=…).
    function signerLink(email) {
      var href = window.SXDemoCase.urls(latest()).sign;
      return href + (href.indexOf("?") === -1 ? "?" : "&") + "email=" + encodeURIComponent(email || "");
    }

    // -- Render

    var mode = "";

    function render() {
      mode = !on ? "off" : acknowledged() ? "ack" : sent() ? "waiting" : !opened ? "review" : "form";
      if (!on) {
        panel.innerHTML = "";
        panel.hidden = true;
      } else if (acknowledged()) {
        panel.hidden = false;
        panel.innerHTML = ackCard();
      } else if (sent()) {
        panel.hidden = false;
        panel.innerHTML = waitingCard();
      } else if (!opened) {
        panel.hidden = false;
        panel.innerHTML = reviewRow();
      } else {
        panel.hidden = false;
        panel.innerHTML =
          '<div class="flex flex-col gap-4 rounded-lg border border-gray-200 dark:border-white/10 p-4">' +
          openedBanner() +
          '<fieldset data-acp-fieldset class="flex flex-col gap-3">' +
          '<legend class="mb-3 text-sm font-medium text-gray-900 dark:text-white">Are you authorized to sign?</legend>' +
          radioCard("self", "Yes, I am authorized to sign", formSelf()) +
          radioCard("other", "No, send to an authorized signer", formOther()) +
          "</fieldset>" +
          "</div>";
        bindForms();
      }
      syncNext();
    }

    function setBusy(on_) {
      busy = on_;
      toggle.disabled = on_;
      var fs = panel.querySelector("[data-acp-fieldset]");
      if (fs) fs.disabled = on_;
      panel.querySelectorAll("[data-acp-review]").forEach(function (b) {
        b.disabled = on_;
      });
      syncNext();
    }

    function required(input, label) {
      var msg = input.value.trim() ? "" : label + " is required";
      X.fieldError(input, msg);
      return !msg;
    }

    function bindForms() {
      var aFirst = document.getElementById("sx-acp-a-first");
      var aLast = document.getElementById("sx-acp-a-last");
      if (aFirst) {
        [[aFirst, "first", "First Name"], [aLast, "last", "Last Name"]].forEach(function (t) {
          t[0].addEventListener("input", function () {
            formA[t[1]] = t[0].value;
            persist();
            if (t[0].getAttribute("aria-invalid") === "true") required(t[0], t[2]);
          });
          t[0].addEventListener("blur", function () {
            required(t[0], t[2]);
          });
        });
      }
      var bFirst = document.getElementById("sx-acp-b-first");
      if (bFirst) {
        var bLast = document.getElementById("sx-acp-b-last");
        var bEmail = document.getElementById("sx-acp-b-email");
        var bNote = document.getElementById("sx-acp-b-note");
        var count = panel.querySelector("[data-acp-count]");
        var paintCount = function () {
          count.textContent = bNote.value.length + "/100";
        };
        paintCount();
        var checkEmail = function () {
          var v = bEmail.value.trim();
          var msg = !v ? "Email is required" : X.isEmail(v) ? "" : "Enter a valid email address";
          X.fieldError(bEmail, msg);
          return !msg;
        };
        [[bFirst, "first", "First Name"], [bLast, "last", "Last Name"]].forEach(function (t) {
          t[0].addEventListener("input", function () {
            formB[t[1]] = t[0].value;
            persist();
            if (t[0].getAttribute("aria-invalid") === "true") required(t[0], t[2]);
          });
          t[0].addEventListener("blur", function () {
            required(t[0], t[2]);
          });
        });
        bEmail.addEventListener("input", function () {
          formB.email = bEmail.value;
          persist();
          if (bEmail.getAttribute("aria-invalid") === "true") checkEmail();
        });
        bEmail.addEventListener("blur", checkEmail);
        bNote.addEventListener("input", function () {
          formB.note = bNote.value;
          persist();
          paintCount();
        });

        panel.querySelector("[data-acp-send]").addEventListener("click", function (event) {
          var ok = [required(bFirst, "First Name"), required(bLast, "Last Name"), checkEmail()];
          if (bNote.value.length > 100) {
            X.fieldError(bNote, "Use 100 characters or fewer");
            ok.push(false);
          }
          if (ok.indexOf(false) !== -1) {
            panel.querySelector('[aria-invalid="true"]').focus();
            return;
          }
          var recipient = (bFirst.value.trim() + " " + bLast.value.trim()).trim();
          var email = bEmail.value.trim();
          var restore = X.setLoading(event.currentTarget, "Sending…");
          setBusy(true);
          sendError = "";
          var current = latest();
          var send = window.STPState
            ? window.STPState.sendAgreementEmail({
                email: email,
                recipientName: recipient,
                senderName: X.contactName(current) || current.supplier.name,
                // The email button opens the signer page, not this one.
                linkUrl: window.location.origin + window.SXDemoCase.urls(current).sign.split("?")[0],
              })
            : Promise.reject(new Error("STP service is not loaded."));
          // Keep the loading state on screen for a moment even when it's instant.
          Promise.all([send, new Promise(function (r) { window.setTimeout(r, 900); })])
            .then(function (all) {
              var result = all[0] || {};
              window.SXDemoCase.update({
                signer: { firstName: bFirst.value.trim(), lastName: bLast.value.trim(), email: email },
                enrol: {
                  stp: "on",
                  signer: "other",
                  agreementSigned: false,
                  agreement: {
                    delegatedTo: recipient,
                    email: email,
                    note: bNote.value.trim(),
                    sentAt: new Date().toISOString(),
                    delivered: !!result.delivered,
                    signedBy: null,
                    confirmedAt: null,
                  },
                },
              });
              setBusy(false);
              render();
              focusPanel();
            })
            .catch(function (error) {
              sendError = (error && error.message) || "The signing request could not be sent. Try again.";
              restore();
              setBusy(false);
              render();
              var alert = panel.querySelector('[role="alert"]');
              if (alert) alert.scrollIntoView({ block: "nearest", behavior: "smooth" });
            });
        });
      }

      if (aFirst) {
        panel.querySelector("[data-acp-confirm]").addEventListener("click", function (event) {
          var ok = [required(aFirst, "First Name"), required(aLast, "Last Name")];
          if (ok.indexOf(false) !== -1) {
            panel.querySelector('[aria-invalid="true"]').focus();
            return;
          }
          X.setLoading(event.currentTarget, "Confirming…");
          setBusy(true);
          window.setTimeout(function () {
            var signedBy = (aFirst.value.trim() + " " + aLast.value.trim()).trim();
            window.SXDemoCase.update({
              enrol: {
                stp: "on",
                signer: "self",
                agreementSigned: true,
                agreement: {
                  signedBy: signedBy,
                  confirmedAt: new Date().toISOString(),
                  delegatedTo: null,
                  email: null,
                  sentAt: null,
                },
              },
            });
            if (window.STPState) {
              window.STPState.setStpStatus(window.STPState.STATUS_IN_PROGRESS);
              window.STPState.setStpStep(window.STPState.STEP_TERMINAL_COMPLETED);
            }
            setBusy(false);
            render();
            focusPanel();
          }, 1500);
        });
      }
    }

    function focusPanel() {
      var heading = panel.querySelector("h2");
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
        heading.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }

    // -- Events

    toggle.addEventListener("change", function () {
      on = toggle.checked;
      persist();
      render();
    });

    panel.addEventListener("change", function (event) {
      if (event.target.name !== "sx-acp-signer") return;
      choice = event.target.value;
      sendError = "";
      persist();
      render();
      var first = panel.querySelector('input[name="sx-acp-signer"]:checked');
      if (first) first.focus();
    });

    panel.addEventListener("click", function (event) {
      if (event.target.closest("[data-acp-review]")) {
        opened = true;
        persist();
        openAgreement();
        render();
        return;
      }
      if (event.target.closest("[data-acp-change]")) {
        // Back to the choice; the request stays sent until a new one replaces it.
        window.SXDemoCase.update({ enrol: { agreement: { sentAt: null } } });
        choice = "other";
        persist();
        render();
      }
    });

    next.addEventListener("click", function () {
      if (next.disabled) return;
      if (on) {
        X.go("create-account.html");
        return;
      }
      confirmOptOut(function () {
        window.SXDemoCase.update({
          enrol: { stp: "skipped", signer: null, agreementSigned: false, agreement: null },
        });
        if (window.STPState) window.STPState.setStpStep(window.STPState.STEP_OPT_IN_REQUIRED);
        X.go("create-account.html");
      });
    });

    // The signer signs in another tab → "Waiting" turns into "Acknowledgement Complete".
    window.addEventListener(window.SXDemoCase.CHANGE_EVENT, function () {
      if (mode === "waiting" && X.currentCase() && acknowledged()) render();
    });

    render();
  });
})();

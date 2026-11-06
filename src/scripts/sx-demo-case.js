/**
 * sx-demo-case.js — the demo "case" behind the STP walkthrough.
 *
 * A case is one payment plus the supplier who receives it. It is created on
 * the launcher (src/pages/demo/stp-case.html), walked through the enrolment
 * (src/pages/sx-enroll/) and then shown in a Supplier Portal instance that
 * holds only that payment (supplier-portal.html?case=<id>).
 *
 * Source of truth: localStorage `sx_demo_case_v1`. Changes are announced on
 * window as `sx-demo-case:change` (detail: { case }) in this tab and, via the
 * storage event, in every other tab.
 *
 * Load it BEFORE app-plans.js so the demo tenant (`sx-demo`) can appear.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "sx_demo_case_v1";
  var CHANGE_EVENT = "sx-demo-case:change";
  // Demo state that belongs to one walkthrough; cleared on create/reset.
  // The case's portal instance stays on in this browser once opened (any
  // dashboard page, with or without ?case=) until a new case or Reset demo.
  // The demo's STP state and payment overrides live under keys scoped to the
  // case ("<key>:<id>", see stp-state.js), so the general portal keeps its own.
  var OVERRIDES_BASE = "sx_exchange_entry_overrides_v1";
  var STP_BASE = "sx_global_stp_state_v3";
  // Before the demo was scoped it wrote the general keys: clear them once.
  var ISOLATED_FLAG = "sx_demo_isolated_v1";
  var LEGACY_SHARED_KEYS = [
    "sx_global_stp_state_v3",
    "sx_global_stp_status_v2",
    "sx_stp_agreement_request_v1",
    "sx_exchange_entry_overrides_v1",
    "sx_demo_instance_v1",
  ];
  try {
    if (!localStorage.getItem(ISOLATED_FLAG)) {
      LEGACY_SHARED_KEYS.forEach(function (key) {
        localStorage.removeItem(key);
      });
      localStorage.setItem(ISOLATED_FLAG, "1");
    }
  } catch (error) {}
  var DEMO_SESSION_PREFIX = "sx-enroll";

  // Paths resolve against this script, so they work from any page depth
  // (and under a GitHub Pages sub-path), e.g. /src/scripts/ → /src/pages/.
  var SCRIPT_SRC =
    (document.currentScript && document.currentScript.src) ||
    window.location.href;

  function resolve(relative) {
    try {
      var url = new URL(relative, SCRIPT_SRC);
      return url.pathname + url.search;
    } catch (error) {
      return relative;
    }
  }

  // The signer email defaults to the runtime config's test recipient so a
  // real Visa agreement email can be sent (only allowlisted addresses are).
  var defaultRecipient = "";
  var readyPromise = fetch(resolve("../data/public-runtime-config.json"), {
    cache: "no-store",
  })
    .then(function (response) {
      return response.ok ? response.json() : {};
    })
    .catch(function () {
      return {};
    })
    .then(function (config) {
      defaultRecipient = String(
        (config && config.defaultTestRecipient) || "",
      ).trim();
    });

  function todayIso() {
    var now = new Date();
    var month = String(now.getMonth() + 1).padStart(2, "0");
    var day = String(now.getDate()).padStart(2, "0");
    return now.getFullYear() + "-" + month + "-" + day;
  }

  function defaults() {
    return {
      id: "",
      createdAt: "",
      supplier: {
        name: "Pinnacle Group",
        address:
          "2972 Westheimer Rd\nSuite 1010\nChicago, Illinois 85486\nUnited States",
        tin: "12-3450001",
        contactFirst: "Johnny",
        contactLast: "Anderson",
        email: "johnny@hotmail.com",
        phone: "+1 (555) 987-6543",
      },
      payer: {
        name: "Horizon Inc",
        address:
          "3476 Orphan Road\nSuite 1010\nHayward, Wisconsin 54843\nUnited States",
      },
      payment: {
        amount: 3526.0,
        currency: "USD",
        invoice: "PG-3526",
        dateInitiated: todayIso(),
        cardBrand: "Visa",
        cardNumber: "5444123400005612",
        expires: "12/2026",
        cvc: "999",
      },
      signer: {
        firstName: "Michelle",
        lastName: "Jackson",
        email: defaultRecipient,
      },
      enrol: {
        stp: null,
        signer: null,
        cardProcessed: null,
        account: null,
        completedAt: null,
      },
      stp: { mid: null, tid: null },
    };
  }

  function isPlainObject(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      Object.prototype.toString.call(value) === "[object Object]"
    );
  }

  /** Objects merge key by key; arrays, primitives and null replace. */
  function deepMerge(base, patch) {
    var out = isPlainObject(base) ? Object.assign({}, base) : {};
    if (!isPlainObject(patch)) return out;
    Object.keys(patch).forEach(function (key) {
      var next = patch[key];
      if (next === undefined) return;
      out[key] =
        isPlainObject(next) && isPlainObject(out[key])
          ? deepMerge(out[key], next)
          : isPlainObject(next)
            ? deepMerge({}, next)
            : next;
    });
    return out;
  }

  function read() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      return isPlainObject(parsed) && parsed.id ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function write(value) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch (error) {}
  }

  function emit(value) {
    try {
      window.dispatchEvent(
        new CustomEvent(CHANGE_EVENT, { detail: { case: value } }),
      );
    } catch (error) {}
  }

  function newId() {
    var stamp = Date.now().toString(36).toUpperCase().slice(-5);
    var random = Math.floor(Math.random() * 1296)
      .toString(36)
      .toUpperCase()
      .padStart(2, "0");
    return "SX-" + stamp + random;
  }

  function get() {
    return read();
  }

  // The previous case's own keys only ("…:<id>", "sxdemo_<id>_…"); the
  // general portal's keys are left alone.
  function clearDemoState() {
    try {
      var old = read();
      localStorage.removeItem(STORAGE_KEY);
      if (old && old.id) {
        for (var j = localStorage.length - 1; j >= 0; j -= 1) {
          var k = localStorage.key(j) || "";
          if (k.slice(-(old.id.length + 1)) === ":" + old.id || k.indexOf("sxdemo_" + old.id + "_") === 0)
            localStorage.removeItem(k);
        }
      }
    } catch (error) {}
    try {
      for (var i = sessionStorage.length - 1; i >= 0; i -= 1) {
        var key = sessionStorage.key(i);
        if (key && key.indexOf(DEMO_SESSION_PREFIX) === 0)
          sessionStorage.removeItem(key);
      }
    } catch (error) {}
  }

  function reset() {
    clearDemoState();
    emit(null);
  }

  function create(fields) {
    clearDemoState();
    var next = deepMerge(defaults(), fields || {});
    next.id = newId();
    next.createdAt = new Date().toISOString();
    write(next);
    emit(next);
    return next;
  }

  function update(patch) {
    var current = read();
    if (!current) return null;
    var next = deepMerge(current, patch || {});
    next.id = current.id;
    write(next);
    emit(next);
    return next;
  }

  function caseIdFromUrl() {
    try {
      return new URLSearchParams(window.location.search).get("case") || "";
    } catch (error) {
      return "";
    }
  }

  // Only pages opened with this case's ?case= are the instance; the plain
  // portal URL always shows the general portal.
  function isPortalInstance() {
    var current = read();
    return !!current && caseIdFromUrl() === current.id;
  }

  function last4(cardNumber) {
    return String(cardNumber || "")
      .replace(/\D/g, "")
      .slice(-4);
  }

  function formatCardNumber(cardNumber) {
    return String(cardNumber || "")
      .replace(/\D/g, "")
      .replace(/(\d{4})(?=\d)/g, "$1 ");
  }

  /** The case payment as one row in the exact shape of exchanges.json rows. */
  function toPaymentRow(source) {
    var c = source || read() || deepMerge(defaults(), {});
    var payment = c.payment || {};
    var payer = c.payer || {};
    var ending = last4(payment.cardNumber);
    return {
      amount: Number(payment.amount) || 0,
      currency: payment.currency || "USD",
      // Vendor Entry = the supplier's business (Figma STP table "Pinnacle Group").
      vendorEntry: (c.supplier && c.supplier.name) || "",
      invoice: payment.invoice || "",
      customer: payer.name || "",
      dateInitiated: payment.dateInitiated || todayIso(),
      paymentMethod: "Card",
      paymentMethodEnding: ending,
      status: "pending",
      details: {
        notes: "",
        paymentInfo: {
          type: "card",
          cardholderName: payer.name || "",
          cardholderAddress: payer.address || "",
          cardType: payment.cardBrand || "Visa",
          cardNumber: formatCardNumber(payment.cardNumber),
          expires: payment.expires || "",
          cvc: "•••",
        },
        attachments: [],
        activityLog: [
          {
            user: payer.name || "Payer",
            action: "created the exchange",
            date: (payment.dateInitiated || todayIso()) + "T09:00",
            type: "event",
          },
        ],
      },
      methodType: "card",
      payeeId: "my-business",
    };
  }

  function toPaymentRowWithStatus(source) {
    var c = source || read();
    var row = toPaymentRow(c);
    // Processed in the terminal (enrolment or portal): Paid on every load.
    if (c && c.enrol && c.enrol.cardProcessed) row.status = "paid";
    return row;
  }

  function urls(source) {
    var c = source || read();
    var query = c && c.id ? "?case=" + encodeURIComponent(c.id) : "";
    // A pending card payment (STP off) lives on the Action Required tab;
    // once processed during enrolment (markCardProcessed) it is on Paid.
    var tab = c && c.enrol && c.enrol.cardProcessed ? "paid" : "action-required";
    return {
      enrol: resolve("../pages/sx-enroll/index.html" + query),
      portal: resolve(
        "../pages/dashboard/supplier-portal.html" +
          (query ? query + "&tab=" + tab : ""),
      ),
      launcher: resolve("../pages/demo/stp-case.html"),
      // The other signer's page (Batch 3). The email link has no ?case=
      // (the worker drops the query); the page then uses the stored case.
      sign: resolve("../pages/sx-enroll/sign-agreement.html" + query),
    };
  }

  function overridesKey(c) {
    return OVERRIDES_BASE + ":" + c.id;
  }

  function randomDigits(count) {
    var out = String(1 + Math.floor(Math.random() * 9));
    while (out.length < count) out += Math.floor(Math.random() * 10);
    return out;
  }

  function randomCode(count) {
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
    var out = "";
    while (out.length < count)
      out += chars.charAt(Math.floor(Math.random() * chars.length));
    return out;
  }

  /**
   * Demo control "I've processed this card in my terminal": the case payment
   * becomes Paid in the portal (same override shape exchanges-table.js writes
   * from Get paid), MID/TID are simulated, and when STP is on with the Visa
   * agreement already signed (stpStep terminal_completed_tid_mid_received)
   * STP moves on to bank_verification_required, as processing a card from
   * Get paid does. Returns the updated case (or null without one).
   */
  function markCardProcessed(options) {
    var current = read();
    if (!current) return null;
    var row = toPaymentRow(current);
    var now = new Date().toISOString();
    // The portal's own Mark as paid already wrote the row override.
    if (!(options && options.skipOverride)) try {
      var raw = localStorage.getItem(overridesKey(current));
      var overrides = raw ? JSON.parse(raw) : {};
      if (!isPlainObject(overrides)) overrides = {};
      overrides[row.invoice] = Object.assign({}, overrides[row.invoice], {
        status: "paid",
        methodType: "card",
        paymentMethod: "Card",
        paymentMethodEnding: row.paymentMethodEnding,
        details: {
          activityLog: row.details.activityLog.concat([
            {
              user:
                [current.supplier.contactFirst, current.supplier.contactLast]
                  .filter(Boolean)
                  .join(" ") || "Supplier",
              action: "processed the card in their terminal",
              date: now,
              type: "complete",
            },
          ]),
        },
      });
      localStorage.setItem(overridesKey(current), JSON.stringify(overrides));
    } catch (error) {}

    var stp = current.stp || {};
    var next = update({
      enrol: { cardProcessed: true },
      stp: {
        mid: stp.mid || randomDigits(15),
        tid: stp.tid || randomCode(8),
        processedAt: now,
      },
    });

    // Processing a card with the agreement signed (STP waiting for the first
    // virtual card payment, whichever way it got there: enrolment A/B or an
    // opt-in from the portal) moves STP on to the micro deposit.
    {
      var target = "bank_verification_required";
      if (window.STPState && typeof window.STPState.setStpStep === "function") {
        var state = window.STPState.getStpState();
        if (state.stpStep === "terminal_completed_tid_mid_received")
          window.STPState.setStpStep(target);
      } else {
        try {
          var stored = JSON.parse(localStorage.getItem(STP_BASE + ":" + current.id) || "{}");
          if (stored.stpStep === "terminal_completed_tid_mid_received")
            localStorage.setItem(
              STP_BASE + ":" + current.id,
              JSON.stringify({ stpStatus: "in_progress", stpStep: target }),
            );
        } catch (error) {}
      }
    }
    return next;
  }

  /**
   * The other signer (branch B) acknowledged the Visa agreement on
   * sign-agreement.html. Same result as branch A's Confirm Acceptance:
   * STP → terminal_completed_tid_mid_received, or bank_verification_required
   * when the card was already processed (MID/TID kept). The stored agreement
   * request is marked signed. Returns the updated case (or null).
   */
  function signAgreement(signedBy) {
    var current = read();
    if (!current) return null;
    var now = new Date().toISOString();
    var enrol = current.enrol || {};
    var target = enrol.cardProcessed
      ? "bank_verification_required"
      : "terminal_completed_tid_mid_received";
    var S = window.STPState;
    if (S && typeof S.setStpStep === "function") {
      if (typeof S.markAgreementSigned === "function")
        S.markAgreementSigned({ signedBy: signedBy, signedAt: now });
      S.setStpStep(target);
    } else {
      try {
        localStorage.setItem(
          STP_BASE + ":" + current.id,
          JSON.stringify({ stpStatus: "in_progress", stpStep: target }),
        );
      } catch (error) {}
    }
    return update({
      enrol: {
        agreementSigned: true,
        agreement: { signedBy: signedBy, confirmedAt: now, via: "email" },
      },
    });
  }


  // ── Portal instance (Batch 4) ──────────────────────────────────────────

  var STP_ORDER = [
    "opt_in_required",
    "agreement_signature_pending",
    "terminal_completed_tid_mid_received",
    "bank_verification_required",
    "completed",
  ];

  /** The STP step the case implies (enrolment answers + card processed). */
  function expectedStpStep(c) {
    var enrol = (c && c.enrol) || {};
    if (enrol.stp !== "on") return "opt_in_required";
    var signed = enrol.signer === "self" || enrol.agreementSigned === true;
    if (!signed) return "agreement_signature_pending";
    return enrol.cardProcessed
      ? "bank_verification_required"
      : "terminal_completed_tid_mid_received";
  }

  /**
   * Bring STPState in line with the case, forward only (never undoes a step
   * the presenter took in the portal, e.g. a verified deposit or a later
   * opt-in). A: processed → deposit to verify (Scenario 1), not processed →
   * eligibility (Scenario 2); B unsigned → agreement pending; C → opt-in
   * banner (Scenario 4). Runs on every instance page load and STP change.
   */
  function syncStp() {
    var c = read();
    var S = window.STPState;
    if (!c || !S || typeof S.getStpState !== "function") return null;
    var current = S.getStpState().stpStep;
    var target = expectedStpStep(c);
    // Signed and waiting for a card payment, but the card is already
    // processed (MID/TID known): straight to the micro deposit.
    if (
      current === "terminal_completed_tid_mid_received" &&
      c.enrol &&
      c.enrol.cardProcessed
    )
      target = "bank_verification_required";
    if (STP_ORDER.indexOf(target) > STP_ORDER.indexOf(current))
      S.setStpStep(target);
    return S.getStpState();
  }

  function contactName(c) {
    var s = (c && c.supplier) || {};
    return [s.contactFirst, s.contactLast].filter(Boolean).join(" ").trim();
  }

  /**
   * Opt in from the portal (Scenario 4, or B choosing to sign themselves).
   * self: the contact signs here → STP waits for a card payment (or goes to
   * the deposit when the card was already processed).
   * other: the Batch 3 email + sign-agreement.html flow to case.signer.
   * Returns a promise of the updated case.
   */
  function optIn(options) {
    var c = read();
    var S = window.STPState;
    if (!c || !S) return Promise.resolve(null);
    var now = new Date().toISOString();
    if (!options || options.self !== false) {
      if (typeof S.markAgreementSigned === "function")
        S.markAgreementSigned({ signedBy: contactName(c), signedAt: now });
      var next = update({
        enrol: {
          stp: "on",
          signer: "self",
          agreementSigned: true,
          agreement: { signedBy: contactName(c), confirmedAt: now, via: "portal" },
        },
      });
      S.setStpStep(
        next.enrol.cardProcessed
          ? "bank_verification_required"
          : "terminal_completed_tid_mid_received",
      );
      return Promise.resolve(next);
    }
    var signer = c.signer || {};
    var recipient = [signer.firstName, signer.lastName].filter(Boolean).join(" ");
    return S.sendAgreementEmail({
      email: signer.email,
      recipientName: recipient,
      senderName: contactName(c) || (c.supplier && c.supplier.name) || "",
      linkUrl: window.location.origin + urls(c).sign.split("?")[0],
    }).then(function (result) {
      return update({
        enrol: {
          stp: "on",
          signer: "other",
          agreementSigned: false,
          agreement: {
            delegatedTo: recipient,
            email: signer.email,
            note: "",
            sentAt: new Date().toISOString(),
            delivered: !!(result && result.delivered),
            signedBy: null,
            confirmedAt: null,
          },
        },
      });
    });
  }

  /** "?case=<id>" (or "&case=") for links that must stay in the instance. */
  function instanceQuery(prefix) {
    if (!isPortalInstance()) return "";
    return (prefix || "?") + "case=" + encodeURIComponent(read().id);
  }

  /** "line1\n[line2\n]City, State 12345\nCountry" → legalAddress fields. */
  function parseAddress(text) {
    var lines = String(text || "")
      .split("\n")
      .map(function (line) {
        return line.trim();
      })
      .filter(Boolean);
    var out = { line1: "", line2: "", city: "", state: "", postalCode: "", country: "" };
    if (lines.length > 1 && !/\d/.test(lines[lines.length - 1]))
      out.country = lines.pop();
    var cityLine = lines.length > 1 ? lines.pop() : "";
    var match = cityLine.match(/^(.*?),\s*(.*?)\s+(\S*\d\S*)$/);
    if (match) {
      out.city = match[1];
      out.state = match[2];
      out.postalCode = match[3];
    } else out.city = cityLine;
    out.line1 = lines[0] || "";
    out.line2 = lines.slice(1).join(", ");
    if (/^united states/i.test(out.country)) out.countryCode = "us";
    return out;
  }

  /** The case business as a my-company-profile.json-shaped profile. */
  function toCompanyProfile(source) {
    var c = source || read();
    if (!c) return null;
    var s = c.supplier || {};
    return {
      id: "my-business",
      legalName: s.name || "",
      businessPhone: s.phone || "",
      businessEmail: s.email || "",
      organizationIdType: "EIN",
      organizationIdLabel: "EIN",
      organizationIdValue: s.tin || "",
      dbaEnabled: false,
      contact: { name: contactName(c), email: s.email || "", phone: s.phone || "" },
      legalAddress: parseAddress(s.address),
      mailingAddress: { name: s.name || "", address: s.address || "" },
    };
  }

  /**
   * Payment Preferences data on the instance (PAYMENT_PREFERENCES_CONFIG.
   * transformSharedData): only the case — its virtual card (cardholder =
   * payer), its business as profile and check address, its payer as the
   * only customer, and no bank account (the page shows its empty state).
   */
  function toPaymentPreferencesData(payload, helpers) {
    var c = read();
    if (!c) return payload;
    var row = toPaymentRow(c);
    var payment = c.payment || {};
    row.details.paymentInfo.fullCardNumber = String(payment.cardNumber || "");
    row.details.paymentInfo.cvcFull = String(payment.cvc || "");
    row.details.paymentInfo.brand = String(payment.cardBrand || "Visa");
    var profile = toCompanyProfile(c);
    var cards =
      helpers && typeof helpers.extractCardsFromExchanges === "function"
        ? helpers.extractCardsFromExchanges({ entries: [row] }, null)
        : [];
    var payer = c.payer || {};
    cards = cards.map(function (card) {
      // Not "my-business": the cardholder is the payer, not the supplier.
      return Object.assign({}, card, {
        ownerId: "sx-demo-payer",
        holderName: payer.name || card.holderName,
        billingAddress: payer.address || card.billingAddress,
      });
    });
    var s = c.supplier || {};
    var lines = String(s.address || "").split("\n");
    return Object.assign({}, payload, {
      customers: [{ id: "sx-demo-payer", name: payer.name || "", vendorEntries: [] }],
      bankAccounts: [],
      checkAddresses: s.address
        ? [
            {
              id: "sx-demo-address",
              displayName: "Business Address",
              name: s.name || "",
              cityState: lines[2] || lines[1] || "",
              summary: lines.slice(0, -1).join(", "),
              address: s.address,
            },
          ]
        : [],
      myCompanyProfile: window.normalizeMyCompanyProfile
        ? window.normalizeMyCompanyProfile(profile)
        : profile,
      cards: cards,
    });
  }

  /**
   * Page config for the instance; the pages call it inline and the SPA shell
   * (shell-navigation.js configurePage) after a swap. No-op off the instance.
   */
  function applyPageConfig(pageFile) {
    if (!isPortalInstance()) return;
    var file =
      pageFile || (window.location.pathname || "").split("/").pop() || "";
    var c = read();
    if (file === "supplier-portal.html") {
      var table = (window.EXCHANGES_TABLE_CONFIG =
        window.EXCHANGES_TABLE_CONFIG || {});
      table.storageKey = overridesKey(c);
      table.transformData = function (json) {
        return Object.assign({}, json, { data: [toPaymentRowWithStatus()] });
      };
      // Mark as paid on the case row = the card was processed in the
      // terminal: MID/TID, STP to the micro deposit (exchanges-table.js).
      table.onMarkedPaid = function (entry) {
        var current = read();
        if (current && entry && entry.invoice === current.payment.invoice)
          markCardProcessed({ skipOverride: true });
      };
    }
    if (file === "payment-preferences.html") {
      var pp = (window.PAYMENT_PREFERENCES_CONFIG =
        window.PAYMENT_PREFERENCES_CONFIG || {});
      pp.storagePrefix = "sxdemo_" + c.id + "_pp_";
      pp.transformSharedData = toPaymentPreferencesData;
      window.__ppConfig = pp;
    }
  }

  // Links keep the instance: any dashboard page opened from it gets ?case=
  // (runs before shell-navigation.js's capture listener, which then reads
  // the decorated href).
  document.addEventListener(
    "click",
    function (event) {
      if (!isPortalInstance()) return;
      var link = event.target && event.target.closest && event.target.closest("a[href]");
      if (!link) return;
      var url;
      try {
        url = new URL(link.getAttribute("href"), window.location.href);
      } catch (error) {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (!/\/pages\/dashboard\/[^/]+\.html$/.test(url.pathname)) return;
      if (url.searchParams.get("case")) return;
      url.searchParams.set("case", read().id);
      link.setAttribute("href", url.pathname + url.search + url.hash);
    },
    true,
  );

  // Initial STP state on every instance page, then keep it consistent.
  function bootInstance() {
    if (!isPortalInstance() || !window.STPState) return;
    syncStp();
    if (typeof window.STPState.subscribe === "function")
      window.STPState.subscribe(function () {
        syncStp();
      });
    window.addEventListener(CHANGE_EVENT, function () {
      syncStp();
    });
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", bootInstance);
  else bootInstance();

  // Presenter control on every instance page: back to the launcher (case + new demo).
  var DEMO_LINK_CLASS =
    "rounded-sm px-2 py-1 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";
  function renderDemoBar() {
    if (/\/pages\/demo\//.test(window.location.pathname)) return; // the launcher itself
    if (!isPortalInstance() || document.getElementById("sx-demo-bar")) return;
    var c = read();
    var u = urls(c);
    var bar = document.createElement("div");
    bar.id = "sx-demo-bar";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Demo controls");
    bar.className =
      "fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-lg bg-white py-1.5 pr-1.5 pl-3 shadow-lg ring-1 ring-gray-900/10 dark:bg-gray-800 dark:ring-white/10";
    bar.innerHTML =
      '<span class="text-xs font-medium text-gray-500 dark:text-gray-400">Demo case ' +
      String(c.id).replace(/[<>&"]/g, "") +
      "</span>" +
      '<a href="' + u.launcher + '" class="' + DEMO_LINK_CLASS +
      ' bg-white text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 active:bg-gray-100 dark:bg-white/10 dark:text-white dark:inset-ring-white/10 dark:hover:bg-white/20">New demo</a>';
    document.body.appendChild(bar);
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", renderDemoBar);
  else renderDemoBar();

  // Other tabs (the signer's tab, the portal) hear about changes too.
  window.addEventListener("storage", function (event) {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    emit(read());
  });

  window.SXDemoCase = {
    STORAGE_KEY: STORAGE_KEY,
    CHANGE_EVENT: CHANGE_EVENT,
    ready: function () {
      return readyPromise;
    },
    defaults: defaults,
    get: get,
    create: create,
    update: update,
    reset: reset,
    isPortalInstance: isPortalInstance,
    toPaymentRow: toPaymentRow,
    urls: urls,
    markCardProcessed: markCardProcessed,
    signAgreement: signAgreement,
    expectedStpStep: expectedStpStep,
    syncStp: syncStp,
    optIn: optIn,
    instanceQuery: instanceQuery,
    toCompanyProfile: toCompanyProfile,
    toPaymentPreferencesData: toPaymentPreferencesData,
    applyPageConfig: applyPageConfig,
  };
})();

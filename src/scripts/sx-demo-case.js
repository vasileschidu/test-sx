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
  var DEMO_LOCAL_KEYS = [
    "sx_global_stp_state_v3",
    "sx_global_stp_status_v2",
    "sx_stp_agreement_request_v1",
    "sx_exchange_entry_overrides_v1",
  ];
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
      scenario: "A",
      cardProcessed: true,
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

  function clearDemoState() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      DEMO_LOCAL_KEYS.forEach(function (key) {
        localStorage.removeItem(key);
      });
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

  function isPortalInstance() {
    var current = read();
    var fromUrl = caseIdFromUrl();
    return Boolean(current && fromUrl && fromUrl === current.id);
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
      vendorEntry: payer.name || "",
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

  function urls(source) {
    var c = source || read();
    var query = c && c.id ? "?case=" + encodeURIComponent(c.id) : "";
    return {
      enrol: resolve("../pages/sx-enroll/index.html" + query),
      // A pending card payment (STP off) lives on the Action Required tab.
      portal: resolve(
        "../pages/dashboard/supplier-portal.html" +
          (query ? query + "&tab=action-required" : ""),
      ),
      launcher: resolve("../pages/demo/stp-case.html"),
    };
  }

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
  };
})();

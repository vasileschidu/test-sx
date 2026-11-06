/**
 * sx-enroll-complete.js — final screen of the SMART Exchange enrolment
 * (src/pages/sx-enroll/complete.html, Figma "11. Final" 33456:52931 and the
 * card details dialog 33456:52985).
 *
 *   - Amount, mini card, Transaction ID, payment date, username from the case.
 *   - Info banner "Continue processing payments manually…" only with STP on.
 *   - Reveal Card Details → el-dialog with the card, copy buttons and a demo
 *     control "I've processed this card in my terminal" →
 *     SXDemoCase.markCardProcessed() (row Paid, MID/TID, STP step).
 *     Used or not, it decides whether the card was processed during enrolment
 *     (otherwise the payment stays pending and is processed in the portal).
 *   - "Go to SMART Exchange" → SXDemoCase.urls().portal.
 *   - Sets enrol.completedAt if Submit didn't (direct visit).
 */
(function () {
  "use strict";

  var X = window.SXEnroll;
  var esc = X.esc;

  function txid(c) {
    // Stable per case: derived from the case id.
    var base = String(c.id || "SX").replace(/[^A-Z0-9]/gi, "").toUpperCase();
    return (base + "DFERDRGRG54EV45GT").slice(0, 16);
  }

  function shortExpiry(expires) {
    var m = String(expires || "").match(/^(\d{2})\/(\d{2,4})$/);
    return m ? m[1] + "/" + m[2].slice(-2) : expires;
  }

  function download(c) {
    var lines = [
      "SMART Exchange · Payment receipt",
      "Amount: " + X.money(c.payment.amount, c.payment.currency),
      "From: " + c.payer.name,
      "To: " + c.supplier.name,
      "Invoice: " + c.payment.invoice,
      "Transaction ID: " + txid(c),
      "Payment date: " + X.longDate(c.payment.dateInitiated),
      "Payment method: " + (c.payment.cardBrand || "Visa") + " ending in " + String(c.payment.cardNumber).slice(-4),
    ];
    var blob = new Blob([lines.join("\n") + "\n"], { type: "text/plain" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "payment-" + c.payment.invoice + ".txt";
    document.body.appendChild(a);
    a.click();
    window.setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
  }

  X.page("complete", function (c) {
    if (!c.enrol || !c.enrol.completedAt)
      c = window.SXDemoCase.update({ enrol: { completedAt: new Date().toISOString() } }) || c;

    var $ = function (sel) {
      return document.querySelector(sel);
    };
    var vc = function (name) {
      return document.querySelector('[data-sx-vc="' + name + '"]');
    };
    var amount = X.money(c.payment.amount, c.payment.currency);
    var digits = String(c.payment.cardNumber || "").replace(/\D/g, "");
    var last4 = digits.slice(-4);
    var stpOn = c.enrol && c.enrol.stp === "on";

    $("[data-sx-amount]").textContent = amount;
    $("[data-sx-last4]").textContent = last4;
    $("[data-sx-txid]").textContent = txid(c);
    $("[data-sx-txid]").title = txid(c);
    $("[data-sx-date]").textContent = X.longDate(c.payment.dateInitiated);
    $("[data-sx-method]").textContent = (c.payment.cardBrand || "Visa") + " •••• " + last4;
    var username = (c.enrol.account && c.enrol.account.username) || c.supplier.email;
    var userEl = $("[data-sx-username]");
    userEl.textContent = username;
    userEl.title = username;
    $("[data-sx-stp-banner]").hidden = !stpOn;
    $("[data-sx-download]").addEventListener("click", function () {
      download(X.currentCase() || c);
    });

    // Card details dialog
    vc("amount").textContent = amount;
    vc("card-number").textContent = "•••• " + last4;
    vc("expiry").textContent = shortExpiry(c.payment.expires);
    vc("name").textContent = c.payer.name;
    vc("pending-amount").textContent = amount + " " + (c.payment.currency || "USD");
    vc("holder-name").textContent = c.payer.name;
    vc("card-address").textContent = c.payer.address;
    vc("full-number").textContent = digits.replace(/(\d{4})(?=\d)/g, "$1 ");
    vc("full-expiry").textContent = c.payment.expires;
    vc("cvc2").textContent = c.payment.cvc;

    // "How can you use the payer's card?" opens and closes.
    var howBtn = $("[data-sx-how-toggle]");
    var howContent = document.getElementById("sx-card-how-content");
    howBtn.addEventListener("click", function () {
      var open = howBtn.getAttribute("aria-expanded") !== "true";
      howBtn.setAttribute("aria-expanded", String(open));
      howContent.classList.toggle("hidden", !open);
      howContent.classList.toggle("flex", open);
      howBtn.querySelector("[data-collapse-icon]").classList.toggle("rotate-180", open);
    });

    // Copy buttons: icon turns into a check for 2s.
    document.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-sx-copy]");
      if (!btn || !navigator.clipboard) return;
      var value = vc(btn.getAttribute("data-sx-copy")).textContent.trim();
      navigator.clipboard.writeText(value).then(
        function () {
          btn.setAttribute("aria-label", "Copied");
          btn.classList.add("bg-green-50", "dark:bg-green-500/10");
          window.setTimeout(function () {
            btn.removeAttribute("aria-label");
            btn.classList.remove("bg-green-50", "dark:bg-green-500/10");
          }, 2000);
        },
        function () {},
      );
    });

    // Processed state
    var processBtn = $("[data-sx-process-btn]");
    var hint = $("[data-sx-process-hint]");
    var processed = $("[data-sx-processed]");
    var paidBanner = $("[data-sx-paid-banner]");
    var portal = $("[data-sx-portal]");

    function paint() {
      var cur = X.currentCase() || c;
      var done = !!(cur.enrol && cur.enrol.cardProcessed);
      processBtn.hidden = done;
      hint.hidden = done;
      processed.hidden = !done;
      paidBanner.hidden = !done;
      $("[data-sx-stp-banner]").hidden = !stpOn || done;
      if (done && cur.stp)
        processed.querySelector("[data-sx-mid-tid]").textContent =
          "MID " + cur.stp.mid + " · TID " + cur.stp.tid;
      portal.href = window.SXDemoCase.urls(cur).portal;
    }

    processBtn.addEventListener("click", function () {
      var restore = X.setLoading(processBtn, "Processing…");
      window.setTimeout(function () {
        window.SXDemoCase.markCardProcessed();
        restore();
        paint();
        processed.setAttribute("tabindex", "-1");
        processed.focus();
      }, 1200);
    });

    window.addEventListener(window.SXDemoCase.CHANGE_EVENT, paint);
    paint();
  });
})();

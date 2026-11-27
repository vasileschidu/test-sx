/**
 * sx-preboarding-forms.js — the three form steps of SMART Exchange Preboarding
 * (TCDM-5263), on top of sx-preboarding.js (window.SXPreboarding):
 *
 *   business-details  Figma 38223:36606 / 36819 (m 36677 / 36748)
 *   bank-account      Figma 39297:245663 / 245711 (m 247063 / 247459)
 *   paper-check       Figma 39297:276923 / 276975 (m 277443 / 277880)
 *
 * Needs onboarding-field.js (OBField), onboarding-modal.js (OBModal),
 * checkbox-component.js (<app-checkbox>), @tailwindplus/elements (el-select);
 * bank-account also onboarding-bank.js (OBBank: help dialog, messages).
 * US states come from src/data/sd-virtual-card.json (stateCodes).
 */
(function () {
  "use strict";

  var P = window.SXPreboarding;
  if (!P) return;
  var esc = P.esc;

  var DBA_TIP =
    "Is only necessary if you are operating your business under a name different from your legal, given name (for sole proprietors) or your formally registered entity name (for LLCs/ Corporations).";
  var ADDRESS_TIP = "Enter the address most associated with your business.";

  function loadStates() {
    return window.OBModal.loadJson("../../data/sd-virtual-card.json", ["stateCodes"]).then(function (data) {
      var codes = (data && data.stateCodes) || {};
      P.setStateNames(codes);
      return Object.keys(codes).map(function (code) {
        return { value: code, label: codes[code] };
      });
    });
  }

  /** Form section card: gray title bar + white body (Figma "Primary Contact Information"). */
  function section(title, bodyHtml, opts) {
    opts = opts || {};
    var id = "pb-sec-" + title.toLowerCase().replace(/[^a-z]+/g, "-");
    return (
      '<section aria-labelledby="' +
      id +
      '" class="rounded-md border border-gray-200 dark:border-white/10">' +
      '<div class="flex items-center gap-1 rounded-t-md border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-white/10 dark:bg-white/5">' +
      '<h2 id="' +
      id +
      '" class="type-title-small text-default">' +
      esc(title) +
      "</h2>" +
      (opts.tip ? P.infoTip(id + "-tip", "About " + title, opts.tip) : "") +
      "</div>" +
      '<div class="flex flex-col gap-4 p-4">' +
      bodyHtml +
      "</div></section>"
    );
  }

  /** Address fields (Country, Address Line 1–3, City, State / Province, Zip / Postal Code). */
  function addressFields(prefix, a, states, labels) {
    a = a || {};
    return (
      P.selectField(prefix + "-country", "Country", [P.countryOption(labels.country)], "US") +
      P.textField(prefix + "-line1", "Address Line 1", a.line1 || "", { autocomplete: "address-line1" }) +
      P.textField(prefix + "-line2", "Address Line 2", a.line2 || "", { autocomplete: "address-line2", optional: true }) +
      P.textField(prefix + "-line3", "Address Line 3", a.line3 || "", { autocomplete: "address-line3", optional: true }) +
      P.textField(prefix + "-city", "City", a.city || "", { autocomplete: "address-level2" }) +
      '<div class="grid grid-cols-2 gap-4">' +
      P.selectField(prefix + "-state", labels.state, states, a.state || "", { placeholder: "Select" }) +
      P.textField(prefix + "-zip", labels.zip, a.zip || "", { autocomplete: "postal-code", inputmode: "numeric", maxLength: 10 }) +
      "</div>"
    );
  }

  function readAddress(prefix) {
    var v = function (key) {
      var el = document.getElementById(prefix + "-" + key);
      return el ? el.value.trim() : "";
    };
    return {
      country: P.selectValue(prefix + "-country") || "US",
      line1: v("line1"),
      line2: v("line2"),
      line3: v("line3"),
      city: v("city"),
      state: P.selectValue(prefix + "-state"),
      zip: v("zip"),
    };
  }

  /** Address checks: { key: message } for the empty required fields. */
  function addressErrors(prefix, a, labels) {
    var out = {};
    if (!a.line1) out.line1 = "Address Line 1 is required";
    if (!a.city) out.city = "City is required";
    if (!a.state) out.state = labels.state + " is required";
    if (!a.zip) out.zip = labels.zip + " is required";
    else if (!/^\d{5}(-\d{4})?$/.test(a.zip)) out.zip = "Enter a 5-digit ZIP code";
    return out;
  }

  function paintAddressErrors(prefix, errors, only) {
    ["line1", "city", "zip"].forEach(function (key) {
      if (only && only !== key) return;
      var el = document.getElementById(prefix + "-" + key);
      if (el) P.fieldError(el, errors[key] || "");
    });
    if (!only || only === "state") P.selectError(prefix + "-state", errors.state || "");
  }

  // ---- 2. Business Details ("Business Information on File") ------------------

  P.page("business-details", function (s) {
    var b = P.business(s);
    var form = document.querySelector("[data-pb-business-form]");
    var STATE_LABELS = { country: "USA", state: "State / Province", zip: "Zip / Postal Code" };
    setName(b.name);
    return loadStates().then(function (states) {
      form.innerHTML =
        section(
          "Primary Contact Information",
          '<div class="grid grid-cols-2 gap-4">' +
            P.textField("pb-first", "First Name", b.contactFirst, { autocomplete: "given-name" }) +
            P.textField("pb-last", "Last Name", b.contactLast, { autocomplete: "family-name" }) +
            "</div>" +
            P.textField("pb-email", "Email Address", b.email, { type: "email", autocomplete: "email", lead: "envelope" }) +
            P.textField("pb-phone", "Phone Number", b.phone, {
              type: "tel",
              autocomplete: "tel-national",
              optional: true,
              lead: "flag",
            }),
        ) +
        section(
          "Business Information",
          P.textField("pb-legal", "Business Legal Name", b.name, { autocomplete: "organization" }) +
            '<div class="flex flex-col gap-2">' +
            P.textField("pb-dba", "Doing Business As (DBA)", b.dbaSameAsLegal ? b.name : b.dba, {
              tip: DBA_TIP,
              disabled: !!b.dbaSameAsLegal,
            }) +
            '<div class="rounded-md bg-gray-50 px-3 py-2 dark:bg-white/5"><app-checkbox data-pb-dba-same label="Use Business Legal Name as DBA"' +
            (b.dbaSameAsLegal ? " checked" : "") +
            "></app-checkbox></div>" +
            "</div>" +
            P.textField("pb-tin", "Taxpayer Identification Number (TIN)", P.digits(b.tin), {
              optional: true,
              inputmode: "numeric",
              maxLength: 9,
              placeholder: "000000000",
            }),
        ) +
        section("Business Address", addressFields("pb-addr", b.address, states, STATE_LABELS), { tip: ADDRESS_TIP });

      var $ = function (id) {
        return document.getElementById(id);
      };
      var same = form.querySelector("input[data-pb-dba-same]");
      var legal = $("pb-legal");
      var dba = $("pb-dba");

      function syncDba() {
        if (!same) return;
        dba.disabled = same.checked;
        if (same.checked) {
          dba.value = legal.value;
          P.fieldError(dba, "");
        }
      }
      if (same) same.addEventListener("change", syncDba);
      legal.addEventListener("input", function () {
        if (same && same.checked) dba.value = legal.value;
        setName(legal.value.trim() || b.name);
      });

      var REQUIRED = {
        "pb-first": "First Name is required",
        "pb-last": "Last Name is required",
        "pb-email": "Email Address is required",
        "pb-legal": "Business Legal Name is required",
        // TODO(confirm): Figma doesn't mark DBA optional; the checkbox fills it.
        "pb-dba": "Doing Business As (DBA) is required",
      };
      function check(id) {
        var el = $(id);
        var v = el.value.trim();
        var msg = "";
        if (REQUIRED[id] && !v) msg = REQUIRED[id];
        else if (id === "pb-email" && !P.isEmail(v)) msg = "Enter a valid email address";
        else if (id === "pb-phone" && v && P.digits(v).length !== 10) msg = "Enter a 10-digit phone number";
        else if (id === "pb-tin" && v && P.digits(v).length !== 9) msg = "Enter the 9-digit TIN";
        P.fieldError(el, msg);
        return !msg;
      }
      Object.keys(REQUIRED)
        .concat(["pb-phone", "pb-tin"])
        .forEach(function (id) {
          $(id).addEventListener("blur", function () {
            check(id);
          });
          $(id).addEventListener("input", function () {
            if ($(id).getAttribute("aria-invalid") === "true") check(id);
          });
        });
      ["line1", "city", "zip"].forEach(function (key) {
        var el = $("pb-addr-" + key);
        el.addEventListener("blur", function () {
          paintAddressErrors("pb-addr", addressErrors("pb-addr", readAddress("pb-addr"), STATE_LABELS), key);
        });
      });
      var stateSel = $("pb-addr-state-select");
      if (stateSel)
        stateSel.addEventListener("change", function () {
          P.selectError("pb-addr-state", "");
        });

      document.querySelector("[data-pb-next]").addEventListener("click", function () {
        syncDba();
        var ids = ["pb-first", "pb-last", "pb-email", "pb-phone", "pb-legal", "pb-dba", "pb-tin"];
        var bad = ids.filter(function (id) {
          return !check(id);
        });
        var address = readAddress("pb-addr");
        var addrErr = addressErrors("pb-addr", address, STATE_LABELS);
        paintAddressErrors("pb-addr", addrErr);
        var firstBad = bad.length
          ? $(bad[0])
          : Object.keys(addrErr).length
            ? $("pb-addr-" + Object.keys(addrErr)[0])
            : null;
        if (firstBad) {
          firstBad.focus();
          return;
        }
        P.saveState({
          business: {
            contactFirst: $("pb-first").value.trim(),
            contactLast: $("pb-last").value.trim(),
            email: $("pb-email").value.trim(),
            phone: $("pb-phone").value.trim(),
            name: legal.value.trim(),
            dba: dba.value.trim(),
            dbaSameAsLegal: !!(same && same.checked),
            tin: $("pb-tin").value.trim(),
            address: address,
          },
        });
        P.go("payment-preference.html");
      });
    });
  });

  function setName(name) {
    var nodes = document.querySelectorAll("[data-pb-supplier]");
    for (var i = 0; i < nodes.length; i += 1) nodes[i].textContent = name;
  }

  // ---- Payment Preference → Send to Bank Account ------------------------------

  function radio(name, value, label, checked) {
    return (
      '<label class="flex cursor-pointer items-center gap-2 text-sm leading-5 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">' +
      '<input type="radio" name="' +
      name +
      '" value="' +
      value +
      '"' +
      (checked ? " checked" : "") +
      ' aria-invalid="false" aria-describedby="pb-type-error" class="' +
      P.RADIO +
      '">' +
      esc(label) +
      "</label>"
    );
  }

  function cornerLink(attr, label) {
    return '<button type="button" ' + attr + ' class="ml-auto shrink-0 ' + P.LINK + '">' + esc(label) + "</button>";
  }

  P.page("bank-account", function () {
    P.saveState({ method: "bank-account" });
    var saved = P.getState().bank || {};
    var fieldsEl = document.querySelector("[data-pb-bank]");
    var next = document.querySelector("[data-pb-next]");
    return window.OBBank.load().then(function (data) {
      if (!data) return;
      var msg = data.messages;
      fieldsEl.innerHTML =
        P.infoNotice("Please make sure the details are accurate to ensure the payment is received.") +
        P.textField("pb-holder", "Name on Account", saved.holder || "", { placeholder: "Account Name", autocomplete: "name" }) +
        '<fieldset class="flex flex-col gap-3">' +
        '<legend class="mb-3 ' +
        window.OBField.LABEL +
        '">Account Type</legend>' +
        '<div class="flex gap-6">' +
        radio("pb-type", "checking", "Checking", saved.type === "checking") +
        radio("pb-type", "savings", "Savings", saved.type === "savings") +
        "</div>" +
        '<p id="pb-type-error" class="hidden ' +
        window.OBField.ERROR_TEXT +
        '"></p></fieldset>' +
        P.textField("pb-routing", "Routing Number", saved.routing || "", {
          inputmode: "numeric",
          maxLength: 9,
          placeholder: "000000000",
          corner: cornerLink("data-pb-help", "Can’t find routing number?"),
        }) +
        P.textField("pb-account", "Account Number", saved.account || "", {
          inputmode: "numeric",
          maxLength: 17,
          placeholder: "00000000000000000",
          corner: cornerLink("data-pb-help", "Can’t find account number?"),
        }) +
        P.textField("pb-verify", "Confirm Account Number", saved.account || "", {
          inputmode: "numeric",
          maxLength: 17,
          placeholder: "00000000000000000",
        }) +
        // TODO(confirm): what unticking means when the payment preference is already the default.
        '<app-checkbox data-pb-bank-default label="Set as default for future payments"' +
        (saved.isDefault ? " checked" : "") +
        "></app-checkbox>";

      var el = {
        holder: document.getElementById("pb-holder"),
        routing: document.getElementById("pb-routing"),
        account: document.getElementById("pb-account"),
        verify: document.getElementById("pb-verify"),
      };
      var types = fieldsEl.querySelectorAll('input[name="pb-type"]');
      var typeError = document.getElementById("pb-type-error");
      var touched = {};

      function routingValid(v) {
        return /^\d{9}$/.test(v) && !/^0+$/.test(v);
      }
      function accountValid(v) {
        return /^\d{3,17}$/.test(v) && !/^0+$/.test(v);
      }
      var rules = {
        holder: function (v) {
          if (!v) return msg.holderRequired.replace("Account Holder Name", "Name on Account");
          if (data.allowedPattern && !new RegExp(data.allowedPattern).test(v)) return data.allowedMessage;
          return "";
        },
        routing: function (v) {
          return !v ? msg.routingRequired : routingValid(v) ? "" : msg.routingInvalid;
        },
        account: function (v) {
          return !v ? msg.accountRequired : accountValid(v) ? "" : msg.accountInvalid;
        },
        verify: function (v) {
          if (!v) return "Confirm Account Number is required";
          return v === el.account.value.trim() ? "" : msg.accountMismatch;
        },
      };
      function typeValue() {
        var t = fieldsEl.querySelector('input[name="pb-type"]:checked');
        return t ? t.value : "";
      }
      function valid() {
        return (
          !!typeValue() &&
          Object.keys(rules).every(function (k) {
            return !rules[k](el[k].value.trim());
          })
        );
      }
      function sync() {
        Object.keys(el).forEach(function (k) {
          if (touched[k]) P.fieldError(el[k], rules[k](el[k].value.trim()));
        });
        next.disabled = !valid();
      }
      Object.keys(el).forEach(function (k) {
        el[k].addEventListener("input", function () {
          if (k !== "holder") el[k].value = el[k].value.replace(/\D/g, "");
          sync();
        });
        el[k].addEventListener("blur", function () {
          touched[k] = true;
          sync();
        });
      });
      for (var i = 0; i < types.length; i += 1)
        types[i].addEventListener("change", function () {
          for (var j = 0; j < types.length; j += 1) types[j].setAttribute("aria-invalid", "false");
          typeError.classList.add("hidden");
          sync();
        });
      fieldsEl.addEventListener("click", function (event) {
        if (event.target.closest("[data-pb-help]")) window.OBBank.openHelp(data);
      });

      next.addEventListener("click", function () {
        if (!valid()) return;
        var isDefault = fieldsEl.querySelector("input[data-pb-bank-default]");
        P.saveState({
          method: "bank-account",
          bank: {
            holder: el.holder.value.trim(),
            type: typeValue(),
            routing: el.routing.value.trim(),
            account: el.account.value.trim(),
            isDefault: !!(isDefault && isDefault.checked),
          },
        });
        P.go("create-account.html");
      });
      sync();
    });
  });

  // ---- Payment Preference → Request a Paper Check ----------------------------

  P.page("paper-check", function (s) {
    P.saveState({ method: "check" });
    var b = P.business(s);
    var saved = P.getState().check || {};
    var box = document.querySelector("[data-pb-check]");
    var next = document.querySelector("[data-pb-next]");
    var LABELS = { country: "United States", state: "State/Province", zip: "Zip/Postal Code" };
    return loadStates().then(function (states) {
      document.querySelector("[data-pb-business-address]").innerHTML = P.row(
        "Business Address",
        esc(P.addressText(b.address)),
        "whitespace-pre-line",
      );
      box.innerHTML =
        '<h2 class="type-title-small text-default">Billing Address</h2>' +
        "<app-checkbox data-pb-same label=\"Billing Address is the same as Business Address\"" +
        (saved.sameAsBusiness ? " checked" : "") +
        "></app-checkbox>" +
        '<div data-pb-billing class="flex flex-col gap-4"' +
        (saved.sameAsBusiness ? " hidden" : "") +
        ">" +
        addressFields("pb-bill", saved.address, states, LABELS) +
        "</div>";

      var same = box.querySelector("input[data-pb-same]");
      var fields = box.querySelector("[data-pb-billing]");
      var touched = {};

      function errors() {
        return same && same.checked ? {} : addressErrors("pb-bill", readAddress("pb-bill"), LABELS);
      }
      function sync(onlyKey) {
        var errs = errors();
        Object.keys(touched).forEach(function (key) {
          if (!onlyKey || onlyKey === key) paintAddressErrors("pb-bill", errs, key);
        });
        next.disabled = Object.keys(errs).length > 0;
      }
      if (same)
        same.addEventListener("change", function () {
          fields.hidden = same.checked;
          sync();
        });
      ["line1", "city", "zip"].forEach(function (key) {
        var input = document.getElementById("pb-bill-" + key);
        input.addEventListener("input", function () {
          sync(key);
        });
        input.addEventListener("blur", function () {
          touched[key] = true;
          sync(key);
        });
      });
      var stateSel = document.getElementById("pb-bill-state-select");
      if (stateSel)
        stateSel.addEventListener("change", function () {
          touched.state = true;
          sync("state");
        });

      next.addEventListener("click", function () {
        if (next.disabled) return;
        P.saveState({
          method: "check",
          check: {
            sameAsBusiness: !!(same && same.checked),
            address: same && same.checked ? null : readAddress("pb-bill"),
          },
        });
        P.go("create-account.html");
      });
      sync();
    });
  });
})();

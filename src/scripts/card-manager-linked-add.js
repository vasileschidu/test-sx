/**
 * card-manager-linked-add.js
 * S13 - Add linked card (SMART Hub, Cards Manager). TCDM-5232.
 *
 * Opens the "Add new card" modal when CardManager emits `add-linked-card` (the empty-state
 * **Add Card** and the list's **+ Add New**, S12), validates it, adds the card to
 * CardManager.data.linkedCards as Active and emits `data-change` (S12 redraws the list and
 * the tab count).
 *
 * Figma (layout only): 10001:257969. Wiki: card-manager.md §4.12, BR-9.
 *
 *   CardManagerLinkedAdd.open()   open the modal (same as the event)
 *
 * Reuses, as the Create a Card modal (card-manager-create.js, S2) does: OBModal (dialog
 * shell: Esc, focus trap, focus back to the trigger), OBField (Text Field [New] + error
 * state), the skill's Select field (el-select, Country), Buttons and Link button.
 * Needs on the page: onboarding-modal.js, onboarding-field.js, card-manager.js, Tailwind Plus
 * Elements.
 *
 * Rules: Card number (13-19 digits, Luhn), Expiry (MM / YY, not in the past) and CVC (3-4
 * digits) are required. The "More info" block is optional; once Name on Card is filled,
 * Country, Address Line 1, City, State and ZIP Code become required (Address Line 2 stays
 * optional) (BR-9). Errors show on submit, then on blur.
 * TODO(confirm): error texts; the "Add Card" label; "More info" collapsed by default; the
 * country list; "—" as Card Name when Name on Card is empty.
 */
(function () {
  "use strict";

  var COUNTRIES = ["United States", "Canada", "Mexico", "United Kingdom"];

  var seq = 0;

  /* ---------- helpers ---------- */

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function assetUrl(file) {
    var path = window.location.pathname || "";
    var at = path.indexOf("/src/pages/");
    var root = at >= 0 ? path.slice(0, at) : "";
    return root + "/src/assets/cards-manager/" + file;
  }

  function digitsOf(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function luhn(digits) {
    var sum = 0;
    var dbl = false;
    for (var i = digits.length - 1; i >= 0; i--) {
      var d = Number(digits[i]);
      if (dbl) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
      dbl = !dbl;
    }
    return sum % 10 === 0;
  }

  /** Network from the number: 4 Visa; 51-55 / 2221-2720 Mastercard; 34/37 Amex; 6011/65/644-649 Discover. */
  function networkOf(digits) {
    var two = Number(digits.slice(0, 2));
    var three = Number(digits.slice(0, 3));
    var four = Number(digits.slice(0, 4));
    if (digits[0] === "4") return "visa";
    if ((two >= 51 && two <= 55) || (four >= 2221 && four <= 2720)) return "mastercard";
    if (two === 34 || two === 37) return "amex";
    if (four === 6011 || two === 65 || (three >= 644 && three <= 649)) return "discover";
    return "";
  }

  /** "MM / YY" -> { month, year } or null. */
  function parseExpiry(value) {
    var d = digitsOf(value);
    if (d.length !== 4) return null;
    return { month: Number(d.slice(0, 2)), year: 2000 + Number(d.slice(2)) };
  }

  /* ---------- markup ---------- */

  var ICON_CARD =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-gray-400 dark:text-gray-500"><path fill-rule="evenodd" clip-rule="evenodd" d="M2.5 4A1.5 1.5 0 0 0 1 5.5V6h18v-.5A1.5 1.5 0 0 0 17.5 4h-15ZM19 8.5H1v6A1.5 1.5 0 0 0 2.5 16h15a1.5 1.5 0 0 0 1.5-1.5v-6ZM3 13.25a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75Zm4.75-.75a.75.75 0 0 0 0 1.5h3.5a.75.75 0 0 0 0-1.5h-3.5Z" /></svg>';

  // Same chevron as the Create a Card balance toggle: down when collapsed, up when open.
  var ICON_CHEVRON_DOWN =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 shrink-0 transition-transform group-aria-expanded/toggle:rotate-180"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" /></svg>';

  var ICON_CHEVRON_UP_DOWN =
    '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-500 dark:text-gray-400"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.22 10.22a.75.75 0 0 1 1.06 0L8 11.94l1.72-1.72a.75.75 0 1 1 1.06 1.06l-2.25 2.25a.75.75 0 0 1-1.06 0l-2.25-2.25a.75.75 0 0 1 0-1.06ZM10.78 5.78a.75.75 0 0 1-1.06 0L8 4.06 6.28 5.78a.75.75 0 0 1-1.06-1.06l2.25-2.25a.75.75 0 0 1 1.06 0l2.25 2.25a.75.75 0 0 1 0 1.06Z"/></svg>';

  // Figma draws the modal 512 wide (OBModal's default width); every dialog is rounded-lg.
  var PANEL =
    "relative flex w-full max-w-lg flex-col rounded-lg bg-white shadow-xl dark:bg-gray-900 dark:ring-1 dark:ring-white/10";

  // Footer buttons: same as Create a Card (Secondary / Primary xl at text-base), dark pairs from the skill.
  var BTN_SECONDARY =
    "inline-flex flex-1 cursor-pointer items-center justify-center rounded-md bg-white px-3.5 py-2.5 text-base font-semibold text-gray-900 " +
    "shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 " +
    "dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/20 dark:focus-visible:outline-blue-500";

  var BTN_PRIMARY =
    "inline-flex flex-1 cursor-pointer items-center justify-center rounded-md bg-blue-600 px-3.5 py-2.5 text-base font-semibold text-white " +
    "shadow-xs hover:bg-blue-500 active:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 " +
    "disabled:cursor-not-allowed disabled:bg-blue-300 dark:bg-blue-500 dark:shadow-none dark:hover:bg-blue-400 dark:active:bg-blue-600 " +
    "dark:focus-visible:outline-blue-500 dark:disabled:bg-blue-500/40 dark:disabled:text-white/60";

  // Link button from the skill (the Create a Card balance toggle).
  var LINK_BTN =
    "inline-flex cursor-pointer items-center gap-1.5 rounded-md font-semibold text-blue-600 hover:text-blue-700 " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-blue-400 dark:hover:text-blue-300 " +
    "dark:focus-visible:outline-blue-500";

  var OPTIONAL = '<span class="shrink-0 text-sm/5 font-medium text-gray-400 dark:text-gray-500">Optional</span>';

  // Select field trigger (components skill), h-10 / text-base like the account picker, every state.
  var SELECT_TRIGGER =
    "grid h-10 w-full cursor-default grid-cols-1 items-center rounded-md bg-white py-0 pr-2 pl-3 text-left text-base/6 text-gray-900 shadow-xs " +
    "outline-1 -outline-offset-1 outline-gray-300 hover:outline-gray-400 " +
    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 " +
    "aria-expanded:outline-2 aria-expanded:-outline-offset-2 aria-expanded:outline-blue-600 " +
    "aria-invalid:outline-red-300 aria-invalid:hover:outline-red-400 aria-invalid:focus-visible:outline-red-600 aria-invalid:aria-expanded:outline-red-600 " +
    "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:outline-gray-200 " +
    "dark:bg-white/5 dark:text-white dark:outline-white/10 dark:hover:outline-white/20 " +
    "dark:focus-visible:outline-blue-500 dark:aria-expanded:outline-blue-500 " +
    "dark:aria-invalid:outline-red-400/50 dark:aria-invalid:focus-visible:outline-red-500 dark:aria-invalid:aria-expanded:outline-red-500 " +
    "dark:disabled:bg-white/10 dark:disabled:text-gray-500 dark:disabled:outline-white/5";

  var SELECT_OPTIONS =
    "max-h-60 w-(--button-width) overflow-auto rounded-md bg-white py-1 text-base shadow-lg outline-1 outline-black/5 " +
    "[--anchor-gap:--spacing(1)] transition transition-discrete data-closed:opacity-0 " +
    "data-enter:duration-100 data-enter:ease-out data-leave:duration-100 data-leave:ease-in " +
    "motion-reduce:transition-none dark:bg-gray-800 dark:outline-white/10";

  var SELECT_OPTION =
    "group/option relative block cursor-default py-2 pr-4 pl-3 text-gray-900 select-none " +
    "hover:bg-gray-100 focus:bg-gray-100 focus:outline-hidden aria-selected:bg-gray-100 " +
    "dark:text-white dark:hover:bg-white/10 dark:focus:bg-white/10 dark:aria-selected:bg-white/10";

  var PLACEHOLDER_SELECT = '<span class="truncate text-gray-400 dark:text-gray-500">Select a country</span>';

  var CLOSE_BTN =
    '<button type="button" data-ob-modal-close class="shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-300 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400"><span class="sr-only">Close</span>' +
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="size-5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>';

  /** OBField label + input + error line (same structure as Create a Card's textField). */
  function textField(id, label, attrs, opts) {
    var F = window.OBField;
    opts = opts || {};
    return (
      '<div class="flex w-full min-w-0 flex-col gap-1">' +
      '<div class="flex items-center justify-between gap-2">' +
      '<label for="' + id + '" class="' + F.LABEL + '">' + esc(label) + "</label>" + (opts.optional ? OPTIONAL : "") + "</div>" +
      '<div class="relative">' +
      (opts.icon || "") +
      '<input id="' + id + '" type="text" aria-invalid="false" aria-describedby="' + id + '-error" class="' + F.INPUT + (opts.icon ? " pl-10" : "") + '" ' + attrs + " />" +
      F.errorIcon() +
      "</div>" +
      '<p id="' + id + '-error" role="alert" class="hidden ' + F.ERROR_TEXT + '"></p></div>'
    );
  }

  function countryField(id) {
    var F = window.OBField;
    var options = COUNTRIES.map(function (country) {
      return (
        '<el-option value="' + esc(country) + '" class="' + SELECT_OPTION + '">' +
        '<span class="block truncate font-normal group-aria-selected/option:font-semibold">' + esc(country) + "</span></el-option>"
      );
    }).join("");
    return (
      '<div class="flex w-full flex-col gap-1">' +
      '<span id="' + id + '-label" class="' + F.LABEL + '">Country</span>' +
      '<el-select id="' + id + '" name="country" class="block">' +
      '<button type="button" data-cm-la-country aria-labelledby="' + id + '-label" aria-describedby="' + id + '-error" class="' + SELECT_TRIGGER + '">' +
      '<el-selectedcontent class="col-start-1 row-start-1 flex min-w-0 items-center gap-2 pr-6 text-gray-900 dark:text-white">' +
      PLACEHOLDER_SELECT + "</el-selectedcontent>" + ICON_CHEVRON_UP_DOWN + "</button>" +
      '<el-options anchor="bottom start" popover class="' + SELECT_OPTIONS + '">' + options + "</el-options>" +
      "</el-select>" +
      '<p id="' + id + '-error" role="alert" class="hidden ' + F.ERROR_TEXT + '"></p></div>'
    );
  }

  function body(ids) {
    return (
      '<form id="' + ids.form + '" novalidate autocomplete="off" class="flex flex-col gap-4 p-6">' +
      textField(ids.number, "Card number",
        'name="lcf1" inputmode="numeric" autocomplete="off" maxlength="23" placeholder="0000 0000 0000 0000"',
        { icon: ICON_CARD }) +
      '<div class="grid grid-cols-2 gap-6">' +
      textField(ids.expiry, "Expiry", 'name="lcf2" inputmode="numeric" autocomplete="off" maxlength="7" placeholder="MM / YY"') +
      textField(ids.cvc, "CVC", 'name="lcf3" inputmode="numeric" autocomplete="off" maxlength="4" placeholder="CVC"') +
      "</div>" +
      // Optional block ("More info" disclosure), collapsed by default. TODO(confirm)
      '<div class="mt-2 flex flex-col gap-6 rounded-md bg-gray-50 p-4 dark:bg-white/5">' +
      '<div class="flex items-center justify-between gap-4">' +
      '<button type="button" id="' + ids.toggle + '" aria-expanded="false" aria-controls="' + ids.panel + '" class="group/toggle ' + LINK_BTN + ' text-left text-base/6">' +
      ICON_CHEVRON_DOWN + "<span>More info</span></button>" + OPTIONAL + "</div>" +
      '<div id="' + ids.panel + '" hidden class="flex flex-col gap-4">' +
      textField(ids.name, "Name on Card", 'name="lcf4" autocomplete="off" placeholder="Full Name"') +
      countryField(ids.country) +
      textField(ids.line1, "Address Line 1", 'name="addressLine1" autocomplete="address-line1" placeholder="Address Line 1"') +
      textField(ids.line2, "Address Line 2", 'name="addressLine2" autocomplete="address-line2" placeholder="Address Line 2"', { optional: true }) +
      textField(ids.city, "City", 'name="city" autocomplete="address-level2" placeholder="City"') +
      '<div class="grid grid-cols-2 gap-6">' +
      textField(ids.zip, "ZIP Code", 'name="zip" autocomplete="postal-code" placeholder="ZIP Code"') +
      textField(ids.state, "State", 'name="state" autocomplete="address-level1" placeholder="State"') +
      "</div></div></div>" +
      "</form>"
    );
  }

  function header(titleId) {
    return (
      '<div class="flex items-center gap-6 border-b border-gray-200 py-3 pr-4 pl-6 dark:border-white/10">' +
      '<h2 id="' + titleId + '" class="min-w-0 flex-1 text-lg/6 font-medium text-gray-900 dark:text-white">Add new card</h2>' +
      CLOSE_BTN + "</div>"
    );
  }

  function footer(formId) {
    return (
      '<div class="flex items-start gap-6 rounded-b-lg border-t border-gray-200 px-6 py-5 dark:border-white/10">' +
      '<button type="button" data-ob-modal-close class="' + BTN_SECONDARY + '">Back</button>' +
      // TODO(confirm): submit label.
      '<button type="submit" form="' + formId + '" class="' + BTN_PRIMARY + '">Add Card</button></div>'
    );
  }

  /* ---------- formatting ---------- */

  /** Re-formats an input and keeps the caret after the same number of digits (end stays end). */
  function reformat(input, format) {
    var old = input.value;
    var caret = input.selectionStart == null ? old.length : input.selectionStart;
    var atEnd = caret >= old.length;
    var digitsBefore = digitsOf(old.slice(0, caret)).length;
    var next = format(old);
    input.value = next;
    if (document.activeElement !== input) return;
    var pos = next.length;
    if (!atEnd) {
      pos = 0;
      for (var i = 0, seen = 0; i < next.length && seen < digitsBefore; i++) {
        if (/\d/.test(next[i])) seen++;
        pos = i + 1;
      }
    }
    input.setSelectionRange(pos, pos);
  }

  function formatNumber(value) {
    return digitsOf(value).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");
  }

  function formatExpiry(value, deleting) {
    var d = digitsOf(value).slice(0, 4);
    if (d.length === 1 && Number(d) > 1) d = "0" + d; // "4" -> "04 / "
    if (d.length < 2) return d;
    if (d.length === 2) return deleting ? d : d + " / ";
    return d.slice(0, 2) + " / " + d.slice(2);
  }

  /* ---------- modal ---------- */

  function open() {
    var cm = window.CardManager;
    var ob = window.OBModal;
    var F = window.OBField;
    if (!cm || !ob || !F) {
      console.error("Add linked card needs card-manager.js, onboarding-modal.js and onboarding-field.js on the page.");
      return;
    }
    var uid = ++seq;
    var p = "cm-la-" + uid + "-";
    var ids = {
      form: p + "form", title: p + "title", number: p + "f1", expiry: p + "f2", cvc: p + "f3",
      toggle: p + "toggle", panel: p + "more", name: p + "f4", country: p + "country", line1: p + "line1",
      line2: p + "line2", city: p + "city", zip: p + "zip", state: p + "state",
    };
    var backdrop = ob.open(body(ids), ids.title, {
      bare: true,
      header: header(ids.title),
      footer: footer(ids.form),
      panelClass: PANEL,
    });

    function $(id) {
      return backdrop.querySelector("#" + id);
    }
    function field(id) {
      return { input: $(id), error: $(id + "-error") };
    }

    var form = $(ids.form);
    var toggle = $(ids.toggle);
    var panel = $(ids.panel);
    var number = field(ids.number);
    var expiry = field(ids.expiry);
    var cvc = field(ids.cvc);
    var name = field(ids.name);
    var line1 = field(ids.line1);
    var line2 = field(ids.line2);
    var city = field(ids.city);
    var zip = field(ids.zip);
    var stateF = field(ids.state);
    var countrySelect = $(ids.country);
    var countryBtn = backdrop.querySelector("[data-cm-la-country]");
    var countryOptions = countrySelect.querySelector("el-options");
    var countryErr = $(ids.country + "-error");
    var submitted = false;

    function countryValue() {
      var picked = countryOptions.querySelector('el-option[aria-selected="true"]');
      return picked ? String(picked.getAttribute("value") || "") : String(countrySelect.value || "");
    }

    function setCountryError(message) {
      if (message) countryBtn.setAttribute("aria-invalid", "true");
      else countryBtn.removeAttribute("aria-invalid");
      countryErr.textContent = message || "";
      countryErr.classList.toggle("hidden", !message);
    }

    function show(f, message) {
      F.setError(f.input, !!message, f.error, message || "");
      return !message;
    }

    /* Validators: each returns an error message or "". TODO(confirm): texts. */
    function numberError() {
      var d = digitsOf(number.input.value);
      if (!d) return "Enter a card number";
      if (d.length < 13 || d.length > 19 || !luhn(d)) return "Enter a valid card number";
      return "";
    }
    function expiryError() {
      if (!digitsOf(expiry.input.value)) return "Enter the expiry date";
      var e = parseExpiry(expiry.input.value);
      if (!e || e.month < 1 || e.month > 12) return "Enter a valid expiry date";
      var now = new Date();
      if (e.year < now.getFullYear() || (e.year === now.getFullYear() && e.month < now.getMonth() + 1)) {
        return "Enter a valid expiry date";
      }
      return "";
    }
    function cvcError() {
      var d = digitsOf(cvc.input.value);
      if (!d) return "Enter the CVC";
      if (d.length < 3) return "Enter a valid CVC";
      return "";
    }
    function addressRequired() {
      return !!name.input.value.trim();
    }
    function requiredText(f, message) {
      return function () {
        return addressRequired() && !f.input.value.trim() ? message : "";
      };
    }

    var checks = [
      { f: number, test: numberError },
      { f: expiry, test: expiryError },
      { f: cvc, test: cvcError },
      { f: line1, test: requiredText(line1, "Enter the address"), more: true },
      { f: city, test: requiredText(city, "Enter the city"), more: true },
      { f: zip, test: requiredText(zip, "Enter the ZIP code"), more: true },
      { f: stateF, test: requiredText(stateF, "Enter the state"), more: true },
    ];

    function countryError() {
      return addressRequired() && !countryValue() ? "Select a country" : "";
    }

    function validateAddress() {
      checks.forEach(function (c) {
        if (c.more) show(c.f, c.test());
      });
      setCountryError(countryError());
    }

    function setOpen(flag) {
      toggle.setAttribute("aria-expanded", flag ? "true" : "false");
      panel.hidden = !flag;
    }

    toggle.addEventListener("click", function () {
      // Values stay when the block is collapsed; its errors come back on the next submit.
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    number.input.addEventListener("input", function () {
      reformat(number.input, formatNumber);
      show(number, "");
    });
    expiry.input.addEventListener("input", function (event) {
      var deleting = event.inputType && event.inputType.indexOf("delete") === 0;
      reformat(expiry.input, function (v) { return formatExpiry(v, deleting); });
      show(expiry, "");
    });
    cvc.input.addEventListener("input", function () {
      cvc.input.value = digitsOf(cvc.input.value).slice(0, 4);
      show(cvc, "");
    });
    [line1, line2, city, zip, stateF].forEach(function (f) {
      f.input.addEventListener("input", function () { show(f, ""); });
    });
    name.input.addEventListener("input", function () {
      // Clearing Name on Card makes the address optional again: drop its errors.
      if (!addressRequired()) validateAddress();
    });

    // After the first submit, a field is checked again when it loses focus.
    checks.forEach(function (c) {
      c.f.input.addEventListener("blur", function () {
        if (submitted) show(c.f, c.test());
      });
    });
    name.input.addEventListener("blur", function () {
      if (submitted) validateAddress();
    });
    countrySelect.addEventListener("change", function () {
      if (countryValue()) setCountryError(null);
    });
    countryOptions.addEventListener("click", function () {
      setTimeout(function () { if (countryValue()) setCountryError(null); }, 0);
    });

    // Esc in an open country list closes the list only, not the dialog (OBModal listens on document).
    var listOpenOnKey = false;
    backdrop.addEventListener("keydown", function (event) {
      if (event.key === "Escape") listOpenOnKey = countryOptions.matches(":popover-open");
    }, true);
    backdrop.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && listOpenOnKey) {
        event.stopPropagation();
        countryBtn.focus();
      }
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      submitted = true;
      var firstBad = null;
      var firstErr = null;
      var moreBad = false;
      checks.forEach(function (c) {
        if (c.f === line1) {
          // Country sits between Name on Card and Address Line 1.
          var cErr = countryError();
          setCountryError(cErr);
          if (cErr) {
            moreBad = true;
            if (!firstBad) { firstBad = countryBtn; firstErr = countryErr; }
          }
        }
        if (!show(c.f, c.test())) {
          if (c.more) moreBad = true;
          if (!firstBad) { firstBad = c.f.input; firstErr = c.f.error; }
        }
      });
      if (moreBad) setOpen(true);
      if (firstBad) {
        ob.revealField(firstBad, firstErr);
        return;
      }
      addCard();
    });

    function addCard() {
      var digits = digitsOf(number.input.value);
      var exp = parseExpiry(expiry.input.value);
      var holderName = name.input.value.trim();
      var cards = cm.data.linkedCards || (cm.data.linkedCards = []);
      var last4 = digits.slice(-4);
      var id = "lc_" + last4;
      var n = 1;
      var taken = cards.map(function (c) { return c.id; });
      while (taken.indexOf(id) !== -1) id = "lc_" + last4 + "_" + ++n;
      var address = "";
      if (holderName) {
        address = [
          line1.input.value.trim(),
          line2.input.value.trim(),
          city.input.value.trim() + ", " + stateF.input.value.trim() + " " + zip.input.value.trim(),
          countryValue(),
        ].filter(Boolean).join("\n");
      }
      var now = new Date();
      var card = {
        id: id,
        last4: last4,
        network: networkOf(digits),
        name: holderName || "—",
        holder: { name: holderName || "—", address: address },
        status: "active",
        expires: exp.year + "-" + pad2(exp.month),
        createdAt: now.getFullYear() + "-" + pad2(now.getMonth() + 1) + "-" + pad2(now.getDate()) + "T" + pad2(now.getHours()) + ":" + pad2(now.getMinutes()) + ":00",
        number: formatNumber(digits),
        cvc: digitsOf(cvc.input.value),
        bills: [],
        transactions: [],
      };
      // New card first, so it shows on page 1 of the unsorted list.
      cards.unshift(card);
      ob.close();
      cm.emit("data-change", { reason: "linked-card-added", cardId: card.id });
      cm.emit("linked-card-added", { cardId: card.id });
      // The list redraws: focus its + Add New (the trigger OBModal returned focus to is gone).
      requestAnimationFrame(function () {
        var mount = cm.mount && cm.mount("linked");
        var add = mount && mount.querySelector("[data-cm-linked-add]");
        if (add && !mount.contains(document.activeElement)) add.focus();
      });
    }

    number.input.focus();
  }

  window.CardManagerLinkedAdd = { open: open };

  function bind() {
    if (window.CardManager) window.CardManager.on("add-linked-card", open);
  }
  if (window.CardManager) bind();
  else document.addEventListener("DOMContentLoaded", bind);
})();

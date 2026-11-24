/**
 * smart-enroll/configuration.js
 * SMART Enroll Configuration tab (TCDM-5247, T7): SMART Exchange payment preferences.
 * Spec: wiki/products/smart-enroll/flows/configuration.md. Figma [R1] SMART Enroll jLooCmHwqJcYV5p5d8BHnO
 * 28566:45740 (tab), 28615:40095 (account select open).
 *
 * Fills the Configuration slot via SmartEnroll.registerTab("configuration"). Needs shell.js, onboarding-field.js (OBField),
 * @tailwindplus/elements (el-select). Values live in sessionStorage under SmartEnroll.storageKey("configuration").
 * The tab is complete once saved (toggle off is a valid answer): setProgress("configuration", { required: 1, filled: 0|1 }).
 * Bank accounts: Connectors tab (T6) stores them under storageKey("connectors") as { bankAccounts: [{ id, name, last4 }] };
 * until it does, data.bankAccounts (demo) is used. "Add New Bank Account" goes to the Connectors tab.
 */
(function () {
  "use strict";

  var TAB = "configuration";
  var LOGO = "../../assets/sx-enroll/sx-logomark.svg";
  var FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400";
  var BTN_PRIMARY =
    "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md bg-blue-600 px-2.5 py-1.5 type-button text-white shadow-xs hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300 disabled:hover:bg-blue-300 dark:bg-blue-500 dark:shadow-none dark:hover:bg-blue-400 dark:disabled:bg-blue-500/40 dark:disabled:text-white/60 dark:disabled:hover:bg-blue-500/40 " + FOCUS;
  var TRIGGER =
    "group/select grid h-10 w-full cursor-default grid-cols-[minmax(0,1fr)] items-center rounded-md bg-white py-1.5 pr-2 pl-3 text-left text-base/6 font-medium text-gray-900 shadow-xs outline-1 -outline-offset-1 outline-gray-300 hover:outline-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 aria-invalid:outline-red-300 aria-invalid:hover:outline-red-400 aria-invalid:focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:hover:outline-white/20 dark:focus-visible:outline-blue-400 dark:aria-invalid:outline-red-400/60 dark:disabled:bg-white/10 dark:disabled:text-gray-400";
  var OPTION =
    "group/option relative block cursor-default py-2 pr-9 pl-3 text-gray-900 select-none focus:bg-blue-600 focus:text-white focus:outline-hidden dark:text-white dark:focus:bg-blue-500";
  var OPTIONS =
    "max-h-72 w-(--button-width) overflow-auto rounded-md bg-white py-1 text-base shadow-lg outline-1 outline-black/5 [--anchor-gap:--spacing(1)] transition transition-discrete data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-100 data-leave:ease-in motion-reduce:transition-none sm:text-sm dark:bg-gray-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10";
  var CHEVRON =
    '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-500 group-hover/select:text-gray-700 sm:size-4 dark:text-gray-400 dark:group-hover/select:text-gray-200"><path d="M5.22 10.22a.75.75 0 0 1 1.06 0L8 11.94l1.72-1.72a.75.75 0 1 1 1.06 1.06l-2.25 2.25a.75.75 0 0 1-1.06 0l-2.25-2.25a.75.75 0 0 1 0-1.06ZM10.78 5.78a.75.75 0 0 1-1.06 0L8 4.06 6.28 5.78a.75.75 0 0 1-1.06-1.06l2.25-2.25a.75.75 0 0 1 1.06 0l2.25 2.25a.75.75 0 0 1 0 1.06Z" clip-rule="evenodd" fill-rule="evenodd" /></svg>';
  var CHECK =
    '<span class="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-600 group-not-aria-selected/option:hidden group-focus/option:text-white in-[el-selectedcontent]:hidden dark:text-blue-400"><svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" /></svg></span>';
  var PLUS =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 shrink-0"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>';

  var ERR_ACCOUNT = "Select a default receiving account.";
  var ERR_RANGE = "Max. invoice amount must be greater than Min. invoice amount."; // TODO(confirm): not drawn in Figma
  var ERR_NUMBER = "Enter a valid amount."; // TODO(confirm)

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function load() {
    try { return JSON.parse(sessionStorage.getItem(window.SmartEnroll.storageKey(TAB))) || null; } catch (e) { return null; }
  }
  function persist(v) {
    try { sessionStorage.setItem(window.SmartEnroll.storageKey(TAB), JSON.stringify(v)); } catch (e) { /* private mode */ }
  }

  function bankAccounts(ctx) {
    try {
      var c = JSON.parse(sessionStorage.getItem(window.SmartEnroll.storageKey("connectors")));
      if (c && c.bankAccounts && c.bankAccounts.length) return c.bankAccounts;
    } catch (e) { /* fall through */ }
    return (ctx.data && ctx.data.bankAccounts) || [];
  }

  /** "1,250.5" -> 1250.5; "" -> null; junk / negative -> NaN. */
  function parseAmount(s) {
    var t = String(s || "").replace(/[$,\s]/g, "");
    if (t === "") return null;
    if (!/^(\d+\.?\d*|\.\d+)$/.test(t)) return NaN;
    return parseFloat(t);
  }
  function fmt(n) {
    return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function amountField(id, label, ph) {
    return (
      '<div class="flex min-w-0 flex-col gap-1.5">' +
      '<label for="' + id + '" class="' + OBField.LABEL + '">' + label + "</label>" +
      '<div class="relative">' +
      '<span aria-hidden="true" class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-base font-medium text-gray-500 dark:text-gray-400">$</span>' +
      '<input type="text" id="' + id + '" name="' + id + '" inputmode="decimal" autocomplete="off" placeholder="' + ph + '" aria-describedby="' + id + '-error" class="' + OBField.INPUT + ' pl-8" />' +
      OBField.errorIcon() +
      "</div>" +
      '<p id="' + id + '-error" role="alert" class="hidden ' + OBField.ERROR_TEXT + '"></p></div>'
    );
  }

  function render(el, ctx) {
    var saved = load();
    var accounts = bankAccounts(ctx);
    var cur = saved ? { enabled: !!saved.enabled, account: saved.account || "", min: saved.min || "", max: saved.max || "" } : { enabled: false, account: "", min: "", max: "" };

    var opts = accounts.map(function (a) {
      return '<el-option value="' + esc(a.id) + '" class="' + OPTION + '"><span class="block truncate font-normal group-aria-selected/option:font-semibold">' + esc(a.name) + " •••• " + esc(a.last4) + "</span>" + CHECK + "</el-option>";
    }).join("");
    opts += '<el-option value="__add" class="' + OPTION + ' flex items-center gap-2 font-medium text-blue-600 focus:text-white dark:text-blue-400">' + PLUS + '<span class="truncate">Add New Bank Account</span></el-option>';

    el.innerHTML =
      '<section aria-labelledby="se-cfg-title" class="rounded-lg border border-gray-200 bg-white p-4 shadow-xs sm:p-6 dark:border-white/10 dark:bg-white/5 dark:shadow-none">' +
      '<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">' +
      '<div class="flex min-w-0 gap-4">' +
      '<img src="' + LOGO + '" alt="" width="30" height="30" class="mt-0.5 size-8 shrink-0" />' +
      '<div class="flex min-w-0 flex-col gap-1">' +
      '<h2 id="se-cfg-title" tabindex="-1" class="type-title-section text-default focus:outline-none">SMART Exchange Payment Preferences</h2>' +
      '<p class="type-description text-tertiary">SMART Exchange is an option you can enable for instant payments. <a href="https://www.transcard.com/support" target="_blank" rel="noopener noreferrer" class="rounded-sm font-medium text-blue-600 hover:text-blue-700 ' + FOCUS + ' dark:text-blue-400 dark:hover:text-blue-300">What is SMART Exchange?<span class="sr-only"> (opens in a new tab)</span></a></p>' +
      "</div></div>" +
      '<div class="flex shrink-0 items-center gap-4 sm:gap-6">' +
      '<div class="flex items-center gap-3"><span data-cfg-state aria-hidden="true" class="type-label text-secondary w-6">Off</span>' +
      '<span class="group relative inline-flex w-11 shrink-0 cursor-pointer rounded-full bg-gray-200 p-0.5 inset-ring inset-ring-gray-900/5 outline-offset-2 outline-blue-600 transition-colors duration-200 ease-in-out has-checked:bg-blue-600 has-focus-visible:outline-2 has-disabled:cursor-not-allowed has-disabled:opacity-50 dark:bg-white/5 dark:inset-ring-white/10 dark:outline-blue-500 dark:has-checked:bg-blue-500">' +
      '<span class="size-5 rounded-full bg-white shadow-xs ring-1 ring-gray-900/5 transition-transform duration-200 ease-in-out group-has-checked:translate-x-5 motion-reduce:transition-none"></span>' +
      '<input type="checkbox" data-cfg-toggle name="smart-exchange-enabled" aria-label="Enable SMART Exchange payments" class="absolute inset-0 size-full cursor-pointer appearance-none focus:outline-hidden disabled:cursor-not-allowed" /></span></div>' +
      '<button type="button" data-cfg-save class="' + BTN_PRIMARY + '">Save</button>' +
      "</div></div>" +
      '<div data-cfg-fields hidden class="mt-6 flex flex-col gap-6 border-t border-gray-200 pt-6 dark:border-white/10">' +
      '<div class="flex max-w-sm flex-col gap-1.5">' +
      '<label id="se-cfg-account-label" for="se-cfg-account-btn" class="' + OBField.LABEL + '">Select Default Receiving Account</label>' +
      '<el-select data-cfg-account name="default-receiving-account" value="" class="block">' +
      '<button type="button" id="se-cfg-account-btn" aria-describedby="se-cfg-account-error" class="' + TRIGGER + '">' +
      '<el-selectedcontent class="col-start-1 row-start-1 flex min-w-0 items-center gap-2 truncate pr-6 text-gray-900 dark:text-white"><span class="truncate font-normal text-gray-400 dark:text-gray-500">Select bank account</span></el-selectedcontent>' +
      CHEVRON + "</button>" +
      '<el-options anchor="bottom start" popover class="' + OPTIONS + '">' + opts + "</el-options></el-select>" +
      '<p id="se-cfg-account-error" role="alert" class="hidden ' + OBField.ERROR_TEXT + '"></p></div>' +
      '<div class="grid gap-4 rounded-md bg-gray-50 p-4 md:grid-cols-[1fr_auto] md:items-center md:gap-6 dark:bg-white/5">' +
      '<p class="type-description text-tertiary">Please set the minimum and maximum value of each invoice that you would like to be eligible for payment through SMART Exchange. If no values are entered, all invoices will be eligible.</p>' +
      '<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:w-104">' + amountField("se-cfg-min", "Min. invoice amount", "0.00") + amountField("se-cfg-max", "Max. invoice amount", "0.00") + "</div>" +
      "</div></div></section>";

    var toggle = el.querySelector("[data-cfg-toggle]");
    var stateLbl = el.querySelector("[data-cfg-state]");
    var fields = el.querySelector("[data-cfg-fields]");
    var save = el.querySelector("[data-cfg-save]");
    var select = el.querySelector("[data-cfg-account]");
    var trigger = el.querySelector("#se-cfg-account-btn");
    var accErr = el.querySelector("#se-cfg-account-error");
    var min = el.querySelector("#se-cfg-min");
    var max = el.querySelector("#se-cfg-max");
    var minErr = el.querySelector("#se-cfg-min-error");
    var maxErr = el.querySelector("#se-cfg-max-error");

    function setAccountError(msg) {
      if (msg) trigger.setAttribute("aria-invalid", "true"); else trigger.removeAttribute("aria-invalid");
      accErr.textContent = msg || "";
      accErr.classList.toggle("hidden", !msg);
    }
    function validateAmounts() {
      var a = parseAmount(min.value);
      var b = parseAmount(max.value);
      var ok = true;
      var minMsg = "";
      var maxMsg = "";
      if (a !== null && isNaN(a)) { minMsg = ERR_NUMBER; ok = false; }
      if (b !== null && isNaN(b)) { maxMsg = ERR_NUMBER; ok = false; }
      if (!minMsg && !maxMsg && a !== null && b !== null && b < a) { maxMsg = ERR_RANGE; ok = false; }
      OBField.setError(min, !!minMsg, minErr, minMsg);
      OBField.setError(max, !!maxMsg, maxErr, maxMsg);
      return ok;
    }
    function snapshot() {
      return { enabled: toggle.checked, account: select.value && select.value !== "__add" ? select.value : "", min: min.value.trim(), max: max.value.trim() };
    }
    function same(a, b) {
      return a.enabled === b.enabled && (!a.enabled || (a.account === b.account && a.min === b.min && a.max === b.max));
    }
    function syncTitle() {
      // Long account names are truncated in the trigger: full text on hover.
      var o = select.value && select.value !== "__add" ? accounts.filter(function (a) { return a.id === select.value; })[0] : null;
      if (o) trigger.title = o.name + " •••• " + o.last4; else trigger.removeAttribute("title");
    }
    function syncSave() {
      // Never saved: Save stays available (toggle off is a valid answer). Saved: only when something changed.
      save.disabled = ctx.readOnly || (!!saved && same(snapshot(), saved));
    }
    function syncVisible() {
      fields.hidden = !toggle.checked;
      stateLbl.textContent = toggle.checked ? "On" : "Off";
    }

    toggle.checked = cur.enabled;
    min.value = cur.min;
    max.value = cur.max;
    syncVisible();
    var hasAccount = cur.account && accounts.some(function (a) { return a.id === cur.account; });
    select.value = hasAccount ? cur.account : "";
    syncTitle();
    syncSave();

    toggle.addEventListener("change", function () {
      syncVisible();
      if (!toggle.checked) { setAccountError(""); validateAmounts(); }
      syncSave();
    });
    select.addEventListener("change", function () {
      if (select.value === "__add") {
        select.value = (saved && saved.account) || "";
        window.SmartEnroll.goToTab("connectors");
        return;
      }
      setAccountError("");
      syncTitle();
      syncSave();
    });
    [min, max].forEach(function (inp) {
      inp.addEventListener("input", function () {
        if (inp.getAttribute("aria-invalid") === "true") validateAmounts();
        syncSave();
      });
      inp.addEventListener("blur", function () {
        var n = parseAmount(inp.value);
        if (n !== null && !isNaN(n)) inp.value = fmt(n);
        validateAmounts();
        syncSave();
      });
      inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); save.click(); } });
    });

    save.addEventListener("click", function () {
      var v = snapshot();
      if (v.enabled) {
        var ok = true;
        if (!v.account) { setAccountError(ERR_ACCOUNT); ok = false; }
        if (!validateAmounts()) ok = false;
        if (!ok) {
          var bad = !v.account ? trigger : el.querySelector('input[aria-invalid="true"]');
          if (bad) bad.focus();
          return;
        }
        var a = parseAmount(min.value);
        var b = parseAmount(max.value);
        v.min = a === null ? "" : fmt(a);
        v.max = b === null ? "" : fmt(b);
        min.value = v.min;
        max.value = v.max;
      }
      saved = v;
      persist(v);
      window.SmartEnroll.setProgress(TAB, { required: 1, filled: 1 });
      syncSave();
      if (typeof window.showGlobalTopToast === "function") window.showGlobalTopToast("Configuration saved.", { tone: "success" });
      el.querySelector("#se-cfg-title").focus();
    });
  }

  window.SmartEnroll.registerTab(TAB, { render: render });
  window.SmartEnroll.ready.then(function () {
    // Tab status must show without opening it first.
    window.SmartEnroll.setProgress(TAB, { required: 1, filled: load() ? 1 : 0 });
  });
})();

/**
 * card-manager-account-picker.js
 * C1 - Account picker (grouped select), new component. TCDM-5219.
 *
 * One select that lists accounts in two groups, "Card" and "Bank Account", with
 * each balance shown. Used by Add Funds ("Transfer from"), Transfer Funds
 * ("From") and Close / Remove ("Choose destination account").
 *
 *   var picker = CardManagerAccountPicker.mount(el, {
 *     sources: [...],            // see "Source" below, or CardManagerAccountPicker.fromData(CardManager.data)
 *     exclude: ["sc_3204"],      // ids to hide (the card you are on)
 *     placeholder: "Select account",
 *     value: "ba_1010",          // optional preselected id
 *     label: "Transfer from",    // optional aria-label for the trigger
 *     onChange: function (source) {} // source object, or null when cleared
 *   });
 *   picker.getValue() / getSource() / setValue(id) / setSources(list) /
 *   picker.setExclude(ids) / setError(message | null) / setDisabled(bool) / destroy()
 *
 * Source:
 *   card: { id, type: "card", name, last4, network, expires: "YYYY-MM", balance }
 *   bank: { id, type: "bank", name, bank, last4, balance }
 *
 * Needs on the page: Tailwind Plus Elements (el-select) and
 * payment-preferences-components.js (PPComponents.getCardBrandLogoMarkup for the
 * network logo; without it the logo is left out).
 *
 * States: default, hover, focus-visible, open, selected, disabled, error
 * (red outline + message under the field), all in dark mode.
 */
(function () {
  "use strict";

  var seq = 0;

  var BANK_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 18 18" fill="none" aria-hidden="true" class="size-5"><path fill-rule="evenodd" clip-rule="evenodd" d="M8.7075 1.86718C8.8929 1.77767 9.10901 1.77767 9.29441 1.86718L15.8194 5.01718C16.1552 5.17925 16.2959 5.58279 16.1339 5.9185C15.9827 6.23168 15.6213 6.37521 15.301 6.26151V14.85H15.526C15.8988 14.85 16.201 15.1523 16.201 15.525C16.201 15.8978 15.8988 16.2 15.526 16.2H2.47594C2.10314 16.2 1.80094 15.8978 1.80094 15.525C1.80094 15.1523 2.10314 14.85 2.47594 14.85H2.70094V6.26151C2.38057 6.37521 2.01925 6.23168 1.86806 5.9185C1.70599 5.58279 1.84676 5.17925 2.18248 5.01718L8.7075 1.86718ZM9.90081 5.40005C9.90081 5.89711 9.49786 6.30005 9.0008 6.30005C8.50375 6.30005 8.1008 5.89711 8.1008 5.40005C8.1008 4.90299 8.50375 4.50005 9.0008 4.50005C9.49786 4.50005 9.90081 4.90299 9.90081 5.40005ZM6.7508 8.77505C6.7508 8.40226 6.44859 8.10005 6.07579 8.10005C5.703 8.10005 5.40079 8.40226 5.40079 8.77505V13.725C5.40079 14.0978 5.703 14.4 6.07579 14.4C6.44859 14.4 6.7508 14.0978 6.7508 13.725V8.77505ZM9.6758 8.77505C9.6758 8.40226 9.3736 8.10005 9.0008 8.10005C8.62801 8.10005 8.3258 8.40226 8.3258 8.77505V13.725C8.3258 14.0978 8.62801 14.4 9.0008 14.4C9.3736 14.4 9.6758 14.0978 9.6758 13.725V8.77505ZM12.6008 8.77505C12.6008 8.40226 12.2986 8.10005 11.9258 8.10005C11.553 8.10005 11.2508 8.40226 11.2508 8.77505V13.725C11.2508 14.0978 11.553 14.4 11.9258 14.4C12.2986 14.4 12.6008 14.0978 12.6008 13.725V8.77505Z" fill="currentColor"/></svg>';

  var CHEVRON =
    '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-500 dark:text-gray-400"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.22 10.22a.75.75 0 0 1 1.06 0L8 11.94l1.72-1.72a.75.75 0 1 1 1.06 1.06l-2.25 2.25a.75.75 0 0 1-1.06 0l-2.25-2.25a.75.75 0 0 1 0-1.06ZM10.78 5.78a.75.75 0 0 1-1.06 0L8 4.06 6.28 5.78a.75.75 0 0 1-1.06-1.06l2.25-2.25a.75.75 0 0 1 1.06 0l2.25 2.25a.75.75 0 0 1 0 1.06Z"/></svg>';

  // Trigger: the components skill "Select field" button, plus open (aria-expanded)
  // and disabled, so every state exists in light and dark.
  var TRIGGER_CLS =
    "grid h-10 w-full cursor-default grid-cols-1 items-center rounded-md bg-white py-0 pr-2 pl-3 text-left text-base/6 text-gray-900 " +
    "outline-1 -outline-offset-1 outline-gray-300 hover:outline-gray-400 " +
    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 " +
    "aria-expanded:outline-2 aria-expanded:-outline-offset-2 aria-expanded:outline-blue-600 " +
    "aria-invalid:outline-red-300 aria-invalid:focus-visible:outline-red-600 aria-invalid:aria-expanded:outline-red-600 " +
    "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:outline-gray-200 disabled:hover:outline-gray-200 " +
    "dark:bg-white/5 dark:text-white dark:outline-white/10 dark:hover:outline-white/20 " +
    "dark:focus-visible:outline-blue-500 dark:aria-expanded:outline-blue-500 " +
    "dark:aria-invalid:outline-red-400/50 dark:aria-invalid:focus-visible:outline-red-500 dark:aria-invalid:aria-expanded:outline-red-500 " +
    "dark:disabled:bg-white/10 dark:disabled:text-gray-500 dark:disabled:outline-white/5 dark:disabled:hover:outline-white/5";

  var OPTIONS_CLS =
    "max-h-[21rem] w-(--button-width) overflow-auto rounded-md bg-white shadow-lg outline-1 outline-black/5 " +
    "[--anchor-gap:--spacing(1)] transition transition-discrete data-closed:opacity-0 " +
    "data-enter:duration-100 data-enter:ease-out data-leave:duration-100 data-leave:ease-in " +
    "motion-reduce:transition-none dark:bg-gray-800 dark:outline-white/10";

  var OPTION_CLS =
    "group/option block cursor-pointer border-b border-gray-200 p-4 select-none " +
    "hover:bg-gray-50 focus:bg-gray-50 focus:outline-hidden aria-selected:bg-gray-50 " +
    "dark:border-white/10 dark:hover:bg-white/5 dark:focus:bg-white/5 dark:aria-selected:bg-white/5";

  var GROUP_CLS =
    "sticky top-0 z-10 border-b border-gray-200 bg-gray-100 px-4 py-2 text-sm/5 font-normal text-gray-500 " +
    "dark:border-white/10 dark:bg-gray-900 dark:text-gray-400";

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function money(amount) {
    var n = Number(amount) || 0;
    return (
      "$" +
      n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  /** "2028-05" -> "05/2028" */
  function expiry(value) {
    var m = /^(\d{4})-(\d{2})/.exec(String(value || ""));
    return m ? m[2] + "/" + m[1] : "";
  }

  function networkLogo(source) {
    var pp = window.PPComponents;
    if (!pp || typeof pp.getCardBrandLogoMarkup !== "function") return "";
    // The 24x16 flag. Visa's gradient fill is flattened: el-select copies the option
    // into the trigger, which duplicates the gradient id, and a gradient that lives in
    // the closed (display:none) list no longer paints.
    return (pp.getCardBrandLogoMarkup(source.network) || "")
      .replace(/fill="url\(#[^)]*\)"/g, 'fill="#243B8F"')
      .replace(/<defs>[\s\S]*?<\/defs>/g, "");
  }

  /** The logo / icon that leads a row. */
  function leadingIcon(source) {
    if (source.type === "bank") {
      return (
        '<span class="flex size-5 shrink-0 items-center justify-center text-gray-500 dark:text-gray-400">' +
        BANK_ICON +
        "</span>"
      );
    }
    var logo = networkLogo(source);
    return logo
      ? '<span class="flex size-5 shrink-0 items-center justify-center">' +
          '<span class="flex h-4 w-6 shrink-0 items-center justify-center">' +
          logo +
          "</span></span>"
      : '<span class="size-5 shrink-0"></span>';
  }

  /** "name •••• 3204" - the one-line value. */
  function nameWithLast4(source) {
    if (!source.last4) return source.name;
    // Figma: "Name •••• 4708" for cards, "Secondary Bank Account ••••1010" for banks.
    return source.name + (source.type === "bank" ? " ••••" : " •••• ") + source.last4;
  }

  function optionHtml(source) {
    var isCard = source.type === "card";
    var secondary = isCard
      ? expiry(source.expires)
        ? "Expires " + expiry(source.expires)
        : ""
      : [source.bank, source.last4 ? "••••" + source.last4 : ""]
          .filter(Boolean)
          .join(" ");
    var primary = isCard ? nameWithLast4(source) : source.name;

    // Two-line block in the list; one line once it is the selected value.
    var listBlock =
      '<div class="flex items-start gap-3 in-[el-selectedcontent]:hidden">' +
      '<div class="flex h-12 shrink-0 flex-col">' +
      leadingIcon(source) +
      "</div>" +
      '<div class="flex min-w-0 flex-1 flex-col gap-1">' +
      '<span class="truncate text-sm leading-5 font-semibold text-gray-900 dark:text-white">' +
      escapeHtml(primary) +
      "</span>" +
      (secondary
        ? '<span class="truncate text-sm leading-5 font-normal text-gray-500 dark:text-gray-400">' +
          escapeHtml(secondary) +
          "</span>"
        : "") +
      "</div>" +
      '<div class="flex shrink-0 flex-col items-end gap-1 text-right text-sm leading-5 whitespace-nowrap">' +
      '<span class="font-normal text-gray-500 dark:text-gray-400">Balance</span>' +
      '<span class="font-medium text-gray-900 dark:text-white">' +
      escapeHtml(money(source.balance)) +
      "</span>" +
      "</div>" +
      "</div>";

    var oneLine =
      '<span class="hidden min-w-0 items-center gap-2 in-[el-selectedcontent]:flex">' +
      leadingIcon(source) +
      '<span class="truncate text-gray-900 dark:text-white">' +
      escapeHtml(nameWithLast4(source)) +
      "</span>" +
      (isCard && expiry(source.expires)
        ? '<span class="shrink-0 text-gray-500 dark:text-gray-400">Expires ' +
          escapeHtml(expiry(source.expires)) +
          "</span>"
        : "") +
      "</span>";

    return (
      '<el-option value="' +
      escapeHtml(source.id) +
      '" class="' +
      OPTION_CLS +
      '">' +
      listBlock +
      oneLine +
      "</el-option>"
    );
  }

  function optionsHtml(sources) {
    var cards = sources.filter(function (s) {
      return s.type === "card";
    });
    var banks = sources.filter(function (s) {
      return s.type === "bank";
    });
    var html = "";
    if (cards.length) {
      html +=
        '<div role="presentation" class="' + GROUP_CLS + '">Card</div>' + cards.map(optionHtml).join("");
    }
    if (banks.length) {
      html +=
        '<div role="presentation" class="' +
        GROUP_CLS +
        '">Bank Account</div>' +
        banks.map(optionHtml).join("");
    }
    return html;
  }

  function placeholderHtml(text) {
    return (
      '<span class="truncate text-gray-400 dark:text-gray-500">' +
      escapeHtml(text) +
      "</span>"
    );
  }

  /**
   * Sources for the picker from CardManager.data: the active SMART cards and the
   * bank accounts. Pass { cardStatuses: [...] } to change which cards count.
   */
  function fromData(data, options) {
    var statuses = (options && options.cardStatuses) || ["active"];
    var cards = ((data && data.smartCards) || [])
      .filter(function (c) {
        return statuses.indexOf(c.status) !== -1;
      })
      .map(function (c) {
        return {
          id: c.id,
          type: "card",
          name: c.name,
          last4: c.last4,
          network: c.network,
          expires: c.expires,
          balance: c.availableBalance,
        };
      });
    var banks = ((data && data.fundingSources) || [])
      .filter(function (f) {
        return f.type === "bank";
      })
      .map(function (f) {
        return {
          id: f.id,
          type: "bank",
          name: f.name,
          bank: f.bank,
          last4: f.last4,
          balance: f.balance,
        };
      });
    return cards.concat(banks);
  }

  function mount(host, options) {
    if (!host) throw new Error("CardManagerAccountPicker.mount: no element");
    if (host.__accountPicker) host.__accountPicker.destroy();
    options = options || {};

    var uid = ++seq;
    var state = {
      sources: Array.isArray(options.sources) ? options.sources.slice() : [],
      exclude: (options.exclude || []).map(String),
      placeholder: options.placeholder || "Select account",
      lastValue: "",
      disabled: false,
    };

    var errorId = "cm-account-picker-error-" + uid;

    host.innerHTML =
      '<el-select name="' +
      escapeHtml(options.name || "account-" + uid) +
      '" class="block">' +
      '<button type="button" class="' +
      TRIGGER_CLS +
      '"' +
      (options.label ? ' aria-label="' + escapeHtml(options.label) + '"' : "") +
      ' aria-describedby="' +
      errorId +
      '">' +
      '<el-selectedcontent class="col-start-1 row-start-1 flex min-w-0 items-center gap-2 pr-6 text-gray-900 dark:text-white">' +
      placeholderHtml(state.placeholder) +
      "</el-selectedcontent>" +
      CHEVRON +
      "</button>" +
      '<el-options anchor="bottom start" popover class="' +
      OPTIONS_CLS +
      '"></el-options>' +
      "</el-select>" +
      '<p id="' +
      errorId +
      '" data-picker-error role="alert" class="mt-2 hidden text-sm/5 text-red-600 dark:text-red-400"></p>';

    var select = host.querySelector("el-select");
    var trigger = host.querySelector("button");
    var optionsEl = host.querySelector("el-options");
    var selected = host.querySelector("el-selectedcontent");
    var errorEl = host.querySelector("[data-picker-error]");

    function visibleSources() {
      return state.sources.filter(function (s) {
        return state.exclude.indexOf(String(s.id)) === -1;
      });
    }

    function readValue() {
      var picked = optionsEl.querySelector('el-option[aria-selected="true"]');
      if (picked) return String(picked.getAttribute("value") || "");
      return String((select && select.value) || "");
    }

    function findSource(id) {
      var found = null;
      state.sources.forEach(function (s) {
        if (String(s.id) === String(id)) found = s;
      });
      return found;
    }

    function renderOptions() {
      optionsEl.innerHTML = optionsHtml(visibleSources());
    }

    function emitChange() {
      var value = readValue();
      if (value === state.lastValue) return;
      state.lastValue = value;
      if (value) api.setError(null);
      if (typeof options.onChange === "function") {
        options.onChange(value ? findSource(value) : null);
      }
    }

    // el-select dispatches change; the click is a fallback for builds that do not.
    function onChange() {
      emitChange();
    }
    function onOptionClick() {
      setTimeout(emitChange, 0);
    }
    select.addEventListener("change", onChange);
    optionsEl.addEventListener("click", onOptionClick);

    var api = {
      el: host,
      select: select,
      getValue: function () {
        return readValue();
      },
      getSource: function () {
        var value = readValue();
        return value ? findSource(value) : null;
      },
      setValue: function (id) {
        select.value = id == null ? "" : String(id);
        if (!id) selected.innerHTML = placeholderHtml(state.placeholder);
        // The element renders the selection on the next frame.
        setTimeout(emitChange, 0);
      },
      setSources: function (sources) {
        var keep = readValue();
        state.sources = Array.isArray(sources) ? sources.slice() : [];
        renderOptions();
        if (keep && visibleSources().some(function (s) { return String(s.id) === keep; })) {
          api.setValue(keep);
        } else if (keep) {
          api.setValue("");
        }
      },
      setExclude: function (ids) {
        var keep = readValue();
        state.exclude = (ids || []).map(String);
        renderOptions();
        if (keep && state.exclude.indexOf(keep) !== -1) api.setValue("");
        else if (keep) api.setValue(keep);
      },
      /** A message shows the error state (red outline + text); null clears it. */
      setError: function (message) {
        if (message) {
          trigger.setAttribute("aria-invalid", "true");
          errorEl.textContent = message;
          errorEl.classList.remove("hidden");
        } else {
          trigger.removeAttribute("aria-invalid");
          errorEl.textContent = "";
          errorEl.classList.add("hidden");
        }
      },
      setDisabled: function (flag) {
        state.disabled = !!flag;
        trigger.disabled = state.disabled;
      },
      destroy: function () {
        select.removeEventListener("change", onChange);
        optionsEl.removeEventListener("click", onOptionClick);
        host.innerHTML = "";
        delete host.__accountPicker;
      },
    };

    renderOptions();
    host.__accountPicker = api;
    if (options.value) api.setValue(options.value);
    if (options.disabled) api.setDisabled(true);
    return api;
  }

  window.CardManagerAccountPicker = {
    mount: mount,
    fromData: fromData,
    format: { money: money, expiry: expiry },
  };
})();

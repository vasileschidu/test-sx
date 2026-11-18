/**
 * card-manager-statements.js
 * S6 - Export Monthly Statements (SMART Hub, Cards Manager). TCDM-5225, wiki card-manager.md §4.6.
 * Figma: modal 8014:141186 (month list open 8014:141248 / 8015:141532). The frames are misnamed "Transfer Funds".
 *
 * CardManager `statements` { cardId } opens "Download Monthly Statements": the explanation text,
 * **Select Month** (CardManager.data.statementMonths, newest first, the newest preselected) and **Format**
 * (PDF or CSV; no Amount field), Cancel / **Download**.
 * Download builds the card's transactions for that month, saves "<card name> - <Mon YYYY>.<ext>", closes
 * the dialog and shows a success toast. CSV is built here (UTF-8 BOM, quoted); PDF loads jsPDF + autoTable
 * from jsDelivr the way table-export.js does (its builders are private, so they are not called).
 *
 * Needs: onboarding-modal.js, card-manager.js, shared.js (showGlobalTopToast).
 * TODO(confirm): the toast text; the columns of the statement; which statement months a card has (the data
 * lists the same months for every card).
 */
(function () {
  "use strict";

  var cm = window.CardManager;
  if (!cm) return;

  var seq = 0;

  var TEXT =
    "A monthly statement is a written record prepared by a financial institution, usually once a month, listing all credit card transactions for an account, including purchases, payments, fees and finance charges.";
  var FORMATS = [
    { key: "pdf", label: "PDF" },
    { key: "csv", label: "CSV" },
  ];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var PDF_LIBS = [
    "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js",
    "https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js",
  ];

  var PANEL =
    "relative flex w-full max-w-125 flex-col rounded-lg bg-white shadow-xl dark:bg-gray-900 dark:ring-1 dark:ring-white/10";
  var BTN_SECONDARY =
    "inline-flex cursor-pointer items-center justify-center rounded-md bg-white px-3 py-1.5 text-sm/5 font-semibold text-gray-900 " +
    "shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 " +
    "dark:bg-white/10 dark:text-white dark:inset-ring-white/10 dark:hover:bg-white/20";
  var BTN_PRIMARY =
    "inline-flex cursor-pointer items-center justify-center rounded-md bg-blue-600 px-3 py-1.5 text-sm/5 font-semibold text-white " +
    "shadow-xs hover:bg-blue-500 active:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 " +
    "disabled:cursor-wait disabled:bg-blue-300 dark:focus-visible:outline-blue-400 dark:disabled:bg-blue-500/40 dark:disabled:text-white/60";
  var CLOSE_BTN =
    '<button type="button" data-ob-modal-close class="shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-300 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400">' +
    '<span class="sr-only">Close</span>' +
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="size-5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>';
  var CHEVRON =
    '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-500 dark:text-gray-400"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.22 10.22a.75.75 0 0 1 1.06 0L8 11.94l1.72-1.72a.75.75 0 1 1 1.06 1.06l-2.25 2.25a.75.75 0 0 1-1.06 0l-2.25-2.25a.75.75 0 0 1 0-1.06ZM10.78 5.78a.75.75 0 0 1-1.06 0L8 4.06 6.28 5.78a.75.75 0 0 1-1.06-1.06l2.25-2.25a.75.75 0 0 1 1.06 0l2.25 2.25a.75.75 0 0 1 0 1.06Z"/></svg>';
  // Select field trigger (components skill + the C1 picker): h-10, text-base/6, every state in light and dark.
  var TRIGGER =
    "grid h-10 w-full cursor-default grid-cols-1 items-center rounded-md bg-white py-0 pr-2 pl-3 text-left text-base/6 text-gray-900 " +
    "outline-1 -outline-offset-1 outline-gray-300 hover:outline-gray-400 " +
    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 " +
    "aria-expanded:outline-2 aria-expanded:-outline-offset-2 aria-expanded:outline-blue-600 " +
    "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:outline-gray-200 " +
    "dark:bg-white/5 dark:text-white dark:outline-white/10 dark:hover:outline-white/20 " +
    "dark:focus-visible:outline-blue-500 dark:aria-expanded:outline-blue-500 " +
    "dark:disabled:bg-white/10 dark:disabled:text-gray-500 dark:disabled:outline-white/5";
  var OPTIONS =
    "max-h-60 w-(--button-width) overflow-auto rounded-md bg-white py-1 shadow-lg outline-1 outline-black/5 " +
    "[--anchor-gap:--spacing(1)] transition transition-discrete data-closed:opacity-0 " +
    "data-enter:duration-100 data-enter:ease-out data-leave:duration-100 data-leave:ease-in " +
    "motion-reduce:transition-none dark:bg-gray-800 dark:outline-white/10";
  var OPTION =
    "group/option block cursor-pointer px-3 py-2.5 text-sm/5 text-gray-900 select-none " +
    "hover:bg-gray-50 focus:bg-gray-50 focus:outline-hidden aria-selected:bg-gray-50 " +
    "dark:text-white dark:hover:bg-white/5 dark:focus:bg-white/5 dark:aria-selected:bg-white/5";

  /* ---------- helpers ---------- */

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function findCard(id) {
    var list = cm.data.smartCards || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /** "2026-10" -> "Oct 2026" */
  function monthLabel(value) {
    var m = /^(\d{4})-(\d{2})$/.exec(String(value));
    return m ? MONTHS[Number(m[2]) - 1] + " " + m[1] : String(value);
  }

  function focusAfterRedraw(selector) {
    var el = document.querySelector(selector);
    if (el) el.focus();
  }

  function monthsNewestFirst() {
    return (cm.data.statementMonths || []).slice().sort().reverse();
  }

  /** One statement: the card's transactions that fall in the month. */
  function statementRows(card, month) {
    return (card.transactions || [])
      .filter(function (t) {
        return String(t.dateTime || "").indexOf(month) === 0;
      })
      .sort(function (a, b) {
        return String(a.dateTime).localeCompare(String(b.dateTime));
      })
      .map(function (t) {
        var d = String(t.dateTime).replace("T", " ").slice(0, 16);
        return [d, t.merchant || "", t.description || "", t.status || "", (Number(t.amount) || 0).toFixed(2) + " " + (t.currency || "USD")];
      });
  }

  var COLUMNS = ["Date", "Merchant", "Description", "Status", "Amount"];

  function saveBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  var loading = {};
  function loadScript(src) {
    if (!loading[src]) {
      loading[src] = new Promise(function (resolve, reject) {
        var s = document.createElement("script");
        s.src = src;
        s.async = true;
        s.onload = resolve;
        s.onerror = function () {
          delete loading[src];
          reject(new Error("Could not load " + src));
        };
        document.head.appendChild(s);
      });
    }
    return loading[src];
  }

  function writeCsv(rows, filename) {
    var quote = function (v) {
      return '"' + String(v == null ? "" : v).replace(/\s+/g, " ").trim().replace(/"/g, '""') + '"';
    };
    var lines = [COLUMNS.map(quote).join(",")].concat(rows.map(function (r) { return r.map(quote).join(","); }));
    saveBlob(new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" }), filename);
    return Promise.resolve();
  }

  function writePdf(rows, filename, title) {
    return PDF_LIBS.reduce(function (p, src) {
      return p.then(function () { return loadScript(src); });
    }, Promise.resolve()).then(function () {
      var doc = new window.jspdf.jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      doc.setFontSize(12);
      doc.text(title, 40, 36);
      doc.autoTable({
        head: [COLUMNS],
        body: rows,
        startY: 50,
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [37, 99, 235] },
        margin: { left: 40, right: 40 },
      });
      doc.save(filename);
    });
  }

  function toast(message, tone) {
    if (typeof window.showGlobalTopToast === "function") window.showGlobalTopToast(message, { tone: tone });
  }

  /* ---------- the modal ---------- */

  function selectHtml(name, label, labelId, options) {
    return (
      '<div class="flex min-w-0 flex-1 flex-col gap-1">' +
      '<span id="' + labelId + '" class="text-sm/5 font-medium text-gray-700 dark:text-gray-300">' + esc(label) + "</span>" +
      '<el-select name="' + name + '" class="block">' +
      '<button type="button" aria-labelledby="' + labelId + '" class="' + TRIGGER + '">' +
      '<el-selectedcontent class="col-start-1 row-start-1 flex min-w-0 items-center pr-6 text-gray-900 dark:text-white"></el-selectedcontent>' +
      CHEVRON + "</button>" +
      '<el-options anchor="bottom start" popover class="' + OPTIONS + '">' +
      options.map(function (o) {
        return '<el-option value="' + esc(o.value) + '" class="' + OPTION + '"><span class="block truncate font-normal group-aria-selected/option:font-semibold">' + esc(o.label) + "</span></el-option>";
      }).join("") +
      "</el-options></el-select></div>"
    );
  }

  function open(cardId) {
    var card = findCard(cardId);
    var ob = window.OBModal;
    if (!card || !ob) return;
    var months = monthsNewestFirst();
    var uid = ++seq;
    var titleId = "cm-stmt-title-" + uid;
    var monthOptions = months.map(function (m) { return { value: m, label: monthLabel(m) }; });

    var body =
      '<div class="flex flex-col gap-6 p-6">' +
      '<p class="text-sm/5 font-normal text-gray-600 dark:text-gray-400">' + esc(TEXT) + "</p>" +
      '<div class="flex gap-4">' +
      selectHtml("month", "Select Month", "cm-stmt-month-label-" + uid, monthOptions) +
      selectHtml("format", "Format", "cm-stmt-format-label-" + uid, FORMATS.map(function (f) { return { value: f.key, label: f.label }; })) +
      "</div></div>";
    var header =
      '<div class="flex items-center gap-6 border-b border-gray-200 py-3 pr-4 pl-6 dark:border-white/10">' +
      '<h2 id="' + titleId + '" class="min-w-0 flex-1 text-lg/6 font-medium text-gray-900 dark:text-white">Download Monthly Statements</h2>' +
      CLOSE_BTN + "</div>";
    var footer =
      '<div class="flex items-start justify-end gap-4 rounded-b-lg border-t border-gray-200 px-6 py-5 dark:border-white/10">' +
      '<button type="button" data-ob-modal-close class="' + BTN_SECONDARY + '">Cancel</button>' +
      '<button type="button" data-cm-stmt-download class="' + BTN_PRIMARY + '">Download</button></div>';

    var backdrop = ob.open(body, titleId, { bare: true, header: header, footer: footer, panelClass: PANEL });
    var selects = backdrop.querySelectorAll("el-select");
    var monthSel = selects[0];
    var formatSel = selects[1];
    var button = backdrop.querySelector("[data-cm-stmt-download]");

    function value(select, fallback) {
      var picked = select.querySelector('el-option[aria-selected="true"]');
      return (picked && picked.getAttribute("value")) || select.value || fallback;
    }

    // Newest month and PDF are preselected; the element paints the selection on the next frame.
    if (months.length) monthSel.value = months[0];
    formatSel.value = FORMATS[0].key;

    button.addEventListener("click", function () {
      var month = value(monthSel, months[0]);
      var format = value(formatSel, "pdf");
      if (!month) return;
      var label = monthLabel(month);
      var rows = statementRows(card, month);
      var name = card.name + " - " + label;
      button.disabled = true;
      Promise.resolve()
        .then(function () {
          return format === "csv"
            ? writeCsv(rows, name + ".csv")
            : writePdf(rows, name + ".pdf", card.name + " •••• " + card.last4 + " - " + label);
        })
        .then(function () {
          ob.close();
          focusAfterRedraw("[data-cm-details-menu]");
          toast("Statement for " + label + " downloaded as " + format.toUpperCase() + ".");
        })
        .catch(function () {
          button.disabled = false;
          toast("Couldn’t download the statement. Check your connection and try again.", "error");
        });
    });
  }

  cm.on("statements", function (payload) {
    if (!payload || !payload.cardId) return;
    // OBModal returns focus to whatever had it at open: make that the ⋯ button.
    focusAfterRedraw("[data-cm-details-menu]");
    open(payload.cardId);
  });
})();

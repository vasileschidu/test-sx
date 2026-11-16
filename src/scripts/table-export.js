/**
 * table-export.js — the table toolbar "Export" button as a format menu
 * (Figma R3 SX 27072:70123): CSV (.csv) / JSON (.json) / Excel (.xlsx) / PDF (.pdf).
 *
 *   TableExport.attach(button, {
 *     name: "smart-exchange",                // file name stem
 *     getData: () => ({ columns: [..], rows: [[..], ..], label: "Pending" }),
 *   });
 *
 * attach() wraps the existing button in <el-dropdown> + <el-menu> (Tailwind Plus
 * Elements), so the button keeps its markup / sizes. CSV and JSON are built in
 * the browser; Excel (SheetJS) and PDF (jsPDF + autoTable) load from the CDN on
 * first use. The table supplies every filtered + sorted row and the visible
 * columns, not just the current page.
 */
window.TableExport = (function () {
  "use strict";

  var FORMATS = [
    { key: "csv", label: "CSV (.csv)" },
    { key: "json", label: "JSON (.json)" },
    { key: "xlsx", label: "Excel (.xlsx)" },
    { key: "pdf", label: "PDF (.pdf)" },
  ];
  var LIBS = {
    xlsx: ["https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"],
    pdf: [
      "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js",
      "https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js",
    ],
  };

  // Same panel as the other dropdown menus (user menu): white, shadow-lg ring.
  var MENU_CLASS =
    "w-max min-w-40 origin-top-right rounded-md bg-white py-1 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-2px_rgba(0,0,0,0.05),0px_0px_0px_1px_rgba(0,0,0,0.05)] outline outline-transparent transition transition-discrete [--anchor-gap:--spacing(1)] data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in dark:bg-gray-800 dark:shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.40),0px_4px_6px_-2px_rgba(0,0,0,0.30),0px_0px_0px_1px_rgba(255,255,255,0.10)]";
  var ITEM_CLASS =
    "block w-full cursor-pointer px-4 py-3 text-left text-sm/5 font-medium text-gray-900 hover:bg-gray-50 focus:bg-gray-50 focus:outline-hidden disabled:cursor-wait disabled:opacity-50 dark:text-white dark:hover:bg-white/5 dark:focus:bg-white/5";
  // Open state = the focus ring from Figma (2px white gap + 4px blue).
  var OPEN_RING =
    " aria-expanded:shadow-[0px_1px_2px_rgba(0,0,0,0.05),0px_0px_0px_2px_#fff,0px_0px_0px_4px_#2563eb] dark:aria-expanded:shadow-[0px_0px_0px_2px_#111827,0px_0px_0px_4px_#3b82f6]";

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
  function loadLibs(list) {
    return list.reduce(function (p, src) {
      return p.then(function () {
        return loadScript(src);
      });
    }, Promise.resolve());
  }

  function cell(value) {
    return value == null ? "" : String(value).replace(/\s+/g, " ").trim();
  }

  function download(blob, filename) {
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

  function fileName(name, data, ext) {
    var stem = [name, data.label]
      .filter(Boolean)
      .join("-")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    var d = new Date();
    var day = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    return stem + "-" + day + "." + ext;
  }

  var WRITERS = {
    csv: function (data, file) {
      var quote = function (v) {
        return '"' + cell(v).replace(/"/g, '""') + '"';
      };
      var lines = [data.columns.map(quote).join(",")].concat(
        data.rows.map(function (r) {
          return r.map(quote).join(",");
        }),
      );
      // BOM so Excel opens UTF-8 (€, ł …) correctly.
      download(new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" }), file);
    },
    json: function (data, file) {
      var list = data.rows.map(function (r) {
        var o = {};
        data.columns.forEach(function (c, i) {
          o[c] = cell(r[i]);
        });
        return o;
      });
      download(new Blob([JSON.stringify(list, null, 2)], { type: "application/json" }), file);
    },
    xlsx: function (data, file) {
      return loadLibs(LIBS.xlsx).then(function () {
        var XLSX = window.XLSX;
        var sheet = XLSX.utils.aoa_to_sheet(
          [data.columns].concat(
            data.rows.map(function (r) {
              return r.map(cell);
            }),
          ),
        );
        sheet["!cols"] = data.columns.map(function (c, i) {
          var w = c.length;
          data.rows.forEach(function (r) {
            w = Math.max(w, cell(r[i]).length);
          });
          return { wch: Math.min(w + 2, 48) };
        });
        var book = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(book, sheet, (data.label || "Export").slice(0, 31));
        XLSX.writeFile(book, file);
      });
    },
    pdf: function (data, file) {
      return loadLibs(LIBS.pdf).then(function () {
        var doc = new window.jspdf.jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
        doc.setFontSize(12);
        doc.text(data.title || "Export", 40, 36);
        doc.autoTable({
          head: [data.columns],
          body: data.rows.map(function (r) {
            return r.map(cell);
          }),
          startY: 50,
          styles: { fontSize: 8, cellPadding: 4 },
          headStyles: { fillColor: [37, 99, 235] },
          margin: { left: 40, right: 40 },
        });
        doc.save(file);
      });
    },
  };

  function toast(message, tone) {
    if (typeof window.showGlobalTopToast === "function") window.showGlobalTopToast(message, { tone: tone });
  }

  function run(format, opts, menu) {
    var data = opts.getData ? opts.getData() : null;
    if (!data || !data.columns || !data.columns.length) return;
    var label = FORMATS.filter(function (f) {
      return f.key === format;
    })[0].label.split(" ")[0];
    var items = menu ? menu.querySelectorAll("[data-export-format]") : [];
    items.forEach(function (b) {
      b.disabled = true;
    });
    Promise.resolve()
      .then(function () {
        return WRITERS[format](data, fileName(opts.name, data, format));
      })
      .then(function () {
        var n = data.rows.length;
        toast("Exported " + n + (n === 1 ? " row" : " rows") + " as " + label + ".");
      })
      .catch(function () {
        toast("Couldn’t export as " + label + ". Check your connection and try again.", "error");
      })
      .then(function () {
        items.forEach(function (b) {
          b.disabled = false;
        });
      });
  }

  function attach(button, opts) {
    if (!button || button.dataset.tableExport) return;
    button.dataset.tableExport = "true";
    button.setAttribute("aria-haspopup", "menu");
    button.className += OPEN_RING;

    var dropdown = document.createElement("el-dropdown");
    // Keep the button's own layout (w-full on phones, auto from sm).
    dropdown.className = "relative inline-flex w-full sm:w-auto";
    button.parentNode.insertBefore(dropdown, button);
    dropdown.appendChild(button);

    var menu = document.createElement("el-menu");
    menu.setAttribute("anchor", "bottom end");
    menu.setAttribute("popover", "");
    menu.className = MENU_CLASS;
    menu.innerHTML = FORMATS.map(function (f) {
      return '<button type="button" data-export-format="' + f.key + '" class="' + ITEM_CLASS + '">' + f.label + "</button>";
    }).join("");
    dropdown.appendChild(menu);

    menu.addEventListener("click", function (event) {
      var item = event.target.closest("[data-export-format]");
      if (!item || item.disabled) return;
      if (typeof menu.hidePopover === "function") {
        try {
          menu.hidePopover();
        } catch (e) {}
      }
      run(item.getAttribute("data-export-format"), opts, menu);
    });
  }

  return { attach: attach, FORMATS: FORMATS };
})();

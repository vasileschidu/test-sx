/**
 * DateRangeCalendar — inline month calendar for a From / To date filter.
 *
 *   DateRangeCalendar.attach(fromInput, toInput, mountEl)
 *
 * The inputs keep working on their own (typed "MM / DD / YYYY"); the calendar reads them and
 * writes picked days back as "MM / DD / YYYY" + an `input` event, so the table's own
 * input handler stays the single source of state.
 * Picking: first click sets From, the next sets To (a day before From restarts the range).
 * Look follows the Pay page "Schedule for Later" calendar (same nav buttons, round days,
 * today blue), sized for a filter panel (size-9 days). Dark mode included.
 */
(function () {
  "use strict";

  var NAV_BTN =
    "inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-300";
  var PREV =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd" /></svg>';
  var NEXT =
    '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>';
  var DOW = [
    ["S", "Sunday"], ["M", "Monday"], ["T", "Tuesday"], ["W", "Wednesday"],
    ["T", "Thursday"], ["F", "Friday"], ["S", "Saturday"],
  ];

  function pad(n) {
    return (n < 10 ? "0" : "") + n;
  }
  function parseUs(value) {
    var d = String(value || "").replace(/\D/g, "");
    if (d.length !== 8) return null;
    var m = +d.slice(0, 2), day = +d.slice(2, 4), y = +d.slice(4, 8);
    var date = new Date(y, m - 1, day);
    return date.getMonth() === m - 1 && date.getDate() === day ? date : null;
  }
  function formatUs(d) {
    return pad(d.getMonth() + 1) + " / " + pad(d.getDate()) + " / " + d.getFullYear();
  }
  function key(d) {
    return d ? d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate() : 0;
  }

  function attach(fromInput, toInput, mount) {
    if (!fromInput || !toInput || !mount || mount._drc) return;
    mount._drc = true;
    var today = new Date();
    today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var start = parseUs(fromInput.value) || today;
    var view = new Date(start.getFullYear(), start.getMonth(), 1);
    var next = "from"; // which end the next click sets
    var hoverK = 0; // day under the pointer while picking To: previews the range
    // A floating card under the focused field (native popover="auto": top layer, so the filter's
    // overflow can't clip it; it stays a DOM child of the filter, so clicks in it don't close the filter).
    mount.setAttribute("popover", "auto");
    mount.className =
      "m-0 max-w-[calc(100vw-2rem)] rounded-lg bg-white p-4 shadow-lg outline-1 outline-black/5 dark:bg-gray-800 dark:outline-white/10";
    var anchor = fromInput;
    function isOpen() {
      return mount.matches(":popover-open");
    }
    function place() {
      // Always under To (Andrian, 2026-11-16): From and To both stay visible while picking.
      var r = toInput.getBoundingClientRect();
      var rFrom = fromInput.getBoundingClientRect();
      mount.style.width = Math.round(Math.max(288, r.width)) + "px"; // as wide as the field
      var h = mount.offsetHeight, w = mount.offsetWidth;
      var top = r.bottom + 8;
      if (top + h > window.innerHeight - 8) top = Math.max(8, rFrom.top - 8 - h);
      var left = Math.min(r.left, window.innerWidth - w - 8);
      mount.style.inset = "auto";
      mount.style.top = Math.round(top) + "px";
      mount.style.left = Math.round(Math.max(8, left)) + "px";
    }
    function open(input) {
      anchor = input;
      var d = parseUs(input.value) || parseUs(fromInput.value);
      if (d) view = new Date(d.getFullYear(), d.getMonth(), 1);
      render();
      if (!isOpen()) {
        try { mount.showPopover(); } catch (e) {}
      }
      place();
    }
    function close() {
      hoverK = 0;
      if (isOpen()) {
        try { mount.hidePopover(); } catch (e) {}
      }
    }

    function setInput(input, date) {
      input.value = date ? formatUs(date) : "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }

    function pick(date) {
      var from = parseUs(fromInput.value);
      if (next === "from" || !from || key(date) < key(from)) {
        setInput(fromInput, date);
        setInput(toInput, null);
        next = "to";
        render();
        toInput.focus({ preventScroll: true }); // the next click picks To
        anchor = toInput;
        place();
      } else {
        setInput(toInput, date);
        next = "from";
        close(); // range complete
      }
    }

    function render() {
      var from = parseUs(fromInput.value);
      var to = parseUs(toInput.value);
      var fk = key(from), tk = key(to), nk = key(today);
      // While choosing To, the day under the pointer stands in for it (preview band).
      var preview = !tk && next === "to" && fk && hoverK > fk;
      if (preview) tk = hoverK;
      var y = view.getFullYear(), m = view.getMonth();
      var first = new Date(y, m, 1).getDay();
      var days = new Date(y, m + 1, 0).getDate();
      var label = view.toLocaleDateString("en-US", { month: "long", year: "numeric" });

      var cells = "";
      for (var i = 0; i < first; i += 1) cells += "<div></div>";
      for (var d = 1; d <= days; d += 1) {
        var date = new Date(y, m, d);
        var k = key(date);
        var isEnd = k === fk || k === tk;
        var inRange = fk && tk && k > fk && k < tk;
        // Range band behind the days: rounded at the ends, full width between.
        var band = "";
        if (fk && tk && fk !== tk && (inRange || isEnd)) {
          band =
            "bg-blue-50 dark:bg-blue-400/10 " +
            (k === fk ? "rounded-l-full " : "") +
            (k === tk ? "rounded-r-full " : "");
        }
        var btn =
          "mx-auto flex size-9 cursor-pointer items-center justify-center rounded-full text-sm/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ";
        if (preview && k === tk) btn += "bg-blue-100 font-semibold text-blue-700 dark:bg-blue-400/20 dark:text-blue-300";
        else if (isEnd) btn += "bg-blue-600 font-semibold text-white hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400";
        else if (inRange) btn += "text-blue-700 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-400/20";
        else if (k === nk) btn += "font-semibold text-blue-600 hover:bg-gray-100 dark:text-blue-400 dark:hover:bg-white/10";
        else btn += "text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-white/10";
        cells +=
          '<div class="py-0.5 ' + band + '"><button type="button" data-drc-day="' + k + '" class="' + btn + '"' +
          (isEnd ? ' aria-pressed="true"' : "") +
          ' aria-label="' + date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) + '">' +
          d + "</button></div>";
      }

      mount.innerHTML =
        '<div class="flex items-center justify-between">' +
        '<button type="button" data-drc-nav="-1" class="' + NAV_BTN + '"><span class="sr-only">Previous month</span>' + PREV + "</button>" +
        '<div aria-live="polite" class="text-sm/6 font-semibold text-gray-900 dark:text-white">' + label + "</div>" +
        '<button type="button" data-drc-nav="1" class="' + NAV_BTN + '"><span class="sr-only">Next month</span>' + NEXT + "</button>" +
        "</div>" +
        '<div class="mt-2 grid grid-cols-7 text-center text-xs/5 text-gray-500 dark:text-gray-400">' +
        DOW.map(function (w) { return '<abbr title="' + w[1] + '" class="py-1 no-underline">' + w[0] + "</abbr>"; }).join("") +
        "</div>" +
        '<div class="grid grid-cols-7">' + cells + "</div>";
    }

    mount.addEventListener("click", function (event) {
      var nav = event.target.closest("[data-drc-nav]");
      if (nav) {
        view = new Date(view.getFullYear(), view.getMonth() + +nav.getAttribute("data-drc-nav"), 1);
        render();
        return;
      }
      var day = event.target.closest("[data-drc-day]");
      if (!day) return;
      var k = +day.getAttribute("data-drc-day");
      pick(new Date(Math.floor(k / 10000), Math.floor(k / 100) % 100 - 1, k % 100));
    });

    mount.addEventListener("mouseover", function (event) {
      var day = event.target.closest("[data-drc-day]");
      var k = day ? +day.getAttribute("data-drc-day") : 0;
      if (k === hoverK || next !== "to") return;
      hoverK = k;
      render();
    });
    mount.addEventListener("mouseleave", function () {
      if (!hoverK) return;
      hoverK = 0;
      render();
    });
    // Outside clicks close it (popover light dismiss); the fields reopen it.
    window.addEventListener("resize", function () { if (isOpen()) place(); });
    window.addEventListener("scroll", function () { if (isOpen()) place(); }, true);

    // Typing in the fields (or Reset clearing them) redraws the calendar on that month.
    function onTyped(event) {
      if (!event.isTrusted) return;
      var d = parseUs(event.target.value);
      if (d) view = new Date(d.getFullYear(), d.getMonth(), 1);
      render();
    }
    fromInput.addEventListener("input", onTyped);
    toInput.addEventListener("input", onTyped);
    fromInput.addEventListener("focus", function () { next = "from"; open(fromInput); });
    toInput.addEventListener("focus", function () { next = parseUs(fromInput.value) ? "to" : "from"; open(toInput); });
    fromInput.addEventListener("click", function () { if (!isOpen()) { next = "from"; open(fromInput); } });
    toInput.addEventListener("click", function () { if (!isOpen()) { next = parseUs(fromInput.value) ? "to" : "from"; open(toInput); } });
    // Values set from code (Reset, reopening the panel) don't fire input: redraw when shown.
    new MutationObserver(function () {
      if (!fromInput.checkVisibility || !fromInput.checkVisibility()) close(); // panel hidden
      else if (isOpen()) render();
    })
      .observe(mount.closest("[id^='bp-table-filter-panel'], [id*='filter-panel']") || mount.parentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
    registry.push(render);
    render();
  }

  var registry = [];
  /** Redraw every calendar, e.g. after Reset cleared the inputs from code. */
  function refreshAll() {
    registry.forEach(function (fn) { fn(); });
  }

  window.DateRangeCalendar = { attach: attach, refreshAll: refreshAll };
})();

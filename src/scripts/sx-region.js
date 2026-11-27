/**
 * sx-region.js
 * Region showcases for the SMART Exchange token flows (TCDM-5265): the same
 * pages, shown in British English (?region=uk) or Canadian French (?region=ca).
 *
 * Works like the SMART Disburse flow switch (onboarding-flow.js): `?region=`
 * is remembered for the tab (sessionStorage `sx-region`), no parameter keeps
 * the last one, and the US flow (default) is untouched: with no region this
 * script does nothing.
 *
 * The language packs live next to each flow's launcher:
 *   src/pages/sx-preboarding-regions/{uk,ca}.json
 *   src/pages/sx-onboarding-regions/{uk,ca}.json
 * The pack is chosen from the page's folder (sx-preboarding / sx-onboarding).
 *
 *   { "lang": "fr-CA",
 *     "text":     { "English text": "Translation" },        // exact, whitespace-normalised
 *     "patterns": [ ["^Hi, (.+)$", "Bonjour, $1"] ],         // for text with a value inside
 *     "months":   ["janvier", …], "dateFormat": "{d} {m} {y}" } // "November 27, 2026" -> "27 novembre 2026"
 *
 * Mixed text (a sentence with a bold part or a link) is one key; each inner
 * element is written as <1>…</1>, <2>…</2> in order, e.g.
 *   "We are <1>fast</1> and easy." -> "Nous sommes <1>rapides</1> et simples."
 * The inner elements keep their classes and listeners, only their text changes.
 *
 * Everything the pages draw later (dialogs, errors, step labels) is translated
 * as it appears (MutationObserver), so the flow scripts stay unchanged.
 * Debug: `?i18n=missing` logs the visible English text without a translation;
 * SXRegion.missing() returns it.
 *
 * Loads the pack with a synchronous request so the first paint is already
 * translated (prototype only, local files).
 */
window.SXRegion = (function () {
  "use strict";

  var KEY = "sx-region";
  var REGIONS = { uk: "en-GB", ca: "fr-CA" };
  var FLOW_FOLDERS = { "sx-preboarding": "sx-preboarding-regions", "sx-onboarding": "sx-onboarding-regions" };
  var ATTRS = ["placeholder", "aria-label", "title", "alt", "data-tooltip", "aria-description"];

  var api = { region: "us", lang: "en-US", missing: function () { return []; }, t: function (s) { return s; } };

  var params = new URLSearchParams(window.location.search);
  var asked = (params.get("region") || "").toLowerCase();
  var region = "us";
  try {
    if (asked === "us" || REGIONS[asked]) sessionStorage.setItem(KEY, asked);
    region = sessionStorage.getItem(KEY) || "us";
  } catch (e) {
    region = REGIONS[asked] ? asked : "us";
  }
  if (!REGIONS[region]) return api;

  // ---- Pack ---------------------------------------------------------------

  var folder = null;
  Object.keys(FLOW_FOLDERS).forEach(function (name) {
    if (window.location.pathname.indexOf("/" + name + "/") !== -1) folder = FLOW_FOLDERS[name];
  });
  var script = document.currentScript;
  if (!folder || !script) return api;
  var url = script.src.replace(/\/scripts\/[^/]*$/, "/pages/" + folder + "/" + region + ".json");

  var pack = null;
  try {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, false);
    xhr.send();
    if (xhr.status === 200 || (xhr.status === 0 && xhr.responseText)) pack = JSON.parse(xhr.responseText);
  } catch (e) {
    pack = null;
  }
  if (!pack) {
    if (window.console) console.warn("[sx-region] language pack not found: " + url);
    return api;
  }

  var TEXT = pack.text || {};
  var PATTERNS = (pack.patterns || []).map(function (p) {
    return [new RegExp(p[0]), p[1]];
  });
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var DATE_RE = new RegExp("^(" + MONTHS.join("|") + ") (\\d{1,2}), (\\d{4})$");
  api.region = region;
  api.lang = pack.lang || REGIONS[region];
  document.documentElement.setAttribute("lang", api.lang);

  var seen = Object.create(null); // untranslated text -> true

  function norm(s) {
    return String(s).replace(/\s+/g, " ").trim();
  }

  function lookup(text) {
    var n = norm(text);
    if (!n) return null;
    if (Object.prototype.hasOwnProperty.call(TEXT, n)) return TEXT[n];
    var dm = pack.months && DATE_RE.exec(n);
    if (dm) {
      return (pack.dateFormat || "{d} {m} {y}")
        .replace("{d}", String(Number(dm[2])))
        .replace("{m}", pack.months[MONTHS.indexOf(dm[1])])
        .replace("{y}", dm[3]);
    }
    for (var i = 0; i < PATTERNS.length; i++) {
      if (PATTERNS[i][0].test(n)) return n.replace(PATTERNS[i][0], PATTERNS[i][1]);
    }
    return null;
  }

  function note(text) {
    var n = norm(text);
    if (n && /[A-Za-zÀ-ɏ]{2}/.test(n)) seen[n] = true;
  }

  api.t = function (text) {
    var r = lookup(text);
    return r === null ? text : r;
  };

  // ---- Walk ---------------------------------------------------------------

  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, SVG: 1, CODE: 1 };

  function skipEl(el) {
    return !el || SKIP[el.tagName && el.tagName.toUpperCase()] || (el.closest && el.closest("[data-no-i18n]"));
  }

  function setText(node, translated) {
    var v = node.nodeValue;
    var lead = (v.match(/^\s*/) || [""])[0];
    var trail = (v.match(/\s*$/) || [""])[0];
    var next = lead + translated + trail;
    if (next !== v) node.nodeValue = next;
  }

  /** A sentence with inline elements: one key with <1>…</1> markers. */
  function mixed(el) {
    var kids = el.childNodes;
    var elements = [];
    var hasText = false;
    var key = "";
    for (var i = 0; i < kids.length; i++) {
      var k = kids[i];
      if (k.nodeType === 3) {
        if (norm(k.nodeValue)) hasText = true;
        key += k.nodeValue;
      } else if (k.nodeType === 1) {
        if (k.tagName === "BR") {
          key += "<br>";
        } else if (k.children.length === 0 && !SKIP[k.tagName.toUpperCase()]) {
          elements.push(k);
          key += "<" + elements.length + ">" + k.textContent + "</" + elements.length + ">";
        } else {
          return false; // nested or icon child: translate the text nodes one by one
        }
      }
    }
    if (!elements.length || !hasText) return false;
    var translated = lookup(key);
    if (translated === null) {
      note(key);
      return false;
    }
    var frag = document.createDocumentFragment();
    var re = /<(\d+)>([\s\S]*?)<\/\1>|<br>/g;
    var last = 0;
    var m;
    while ((m = re.exec(translated))) {
      if (m.index > last) frag.appendChild(document.createTextNode(translated.slice(last, m.index)));
      if (m[0] === "<br>") {
        frag.appendChild(document.createElement("br"));
      } else {
        var child = elements[Number(m[1]) - 1];
        if (child) {
          child.textContent = m[2];
          frag.appendChild(child);
        }
      }
      last = m.index + m[0].length;
    }
    if (last < translated.length) frag.appendChild(document.createTextNode(translated.slice(last)));
    el.textContent = "";
    el.appendChild(frag);
    return true;
  }

  function attrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var v = el.getAttribute(ATTRS[i]);
      if (!v) continue;
      var t = lookup(v);
      if (t !== null) {
        if (t !== v) el.setAttribute(ATTRS[i], t);
      } else if (ATTRS[i] !== "alt" || v.length > 3) {
        note(v);
      }
    }
    if (el.tagName === "INPUT" && /^(button|submit|reset)$/i.test(el.type) && el.value) {
      var tv = lookup(el.value);
      if (tv !== null && tv !== el.value) el.value = tv;
    }
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) {
      if (!skipEl(root.parentNode)) text(root);
      return;
    }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1 && skipEl(root)) return;
    if (root.nodeType === 1) {
      attrs(root);
      if (mixed(root)) {
        var inner = root.querySelectorAll("*");
        for (var j = 0; j < inner.length; j++) attrs(inner[j]);
        return;
      }
    }
    var kids = root.childNodes;
    for (var i = 0; i < kids.length; i++) {
      var c = kids[i];
      if (c.nodeType === 3) text(c);
      else if (c.nodeType === 1) walk(c);
    }
  }

  function text(node) {
    var t = lookup(node.nodeValue);
    if (t === null) note(node.nodeValue);
    else setText(node, t);
  }

  // ---- Observe ------------------------------------------------------------

  var observer = new MutationObserver(function (records) {
    observer.disconnect();
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      if (r.type === "childList") {
        for (var j = 0; j < r.addedNodes.length; j++) walk(r.addedNodes[j]);
        if (r.target.nodeType === 1 && r.target.childNodes.length && !skipEl(r.target)) mixed(r.target);
      } else if (r.type === "characterData") {
        if (r.target.parentNode && !skipEl(r.target.parentNode)) {
          if (!(r.target.parentNode.nodeType === 1 && mixed(r.target.parentNode))) text(r.target);
        }
      } else if (r.type === "attributes" && !skipEl(r.target)) {
        attrs(r.target);
      }
    }
    start();
  });

  function start() {
    observer.observe(document, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRS.concat(["value"]),
    });
  }

  walk(document);
  start();
  document.addEventListener("DOMContentLoaded", function () {
    walk(document);
    if (params.get("i18n") === "missing" || params.get("i18n") === "dump") {
      setTimeout(function () {
        var list = api.missing();
        if (window.console) console.warn("[sx-region] untranslated (" + list.length + "):", list);
        if (params.get("i18n") === "dump") {
          var out = document.createElement("script");
          out.type = "application/json";
          out.id = "sxr-missing";
          out.setAttribute("data-no-i18n", "");
          out.textContent = JSON.stringify(list);
          document.body.appendChild(out);
        }
      }, 3500);
    }
  });

  /** Visible English text still in the page (text nodes and attributes). */
  api.missing = function () {
    var out = [];
    var w = document.createTreeWalker(document.body || document, NodeFilter.SHOW_TEXT);
    var n;
    while ((n = w.nextNode())) {
      var p = n.parentNode;
      if (!p || skipEl(p) || p.offsetParent === null) continue;
      var s = norm(n.nodeValue);
      if (s && /[A-Za-zÀ-ɏ]{2}/.test(s) && lookup(s) === null && !isTranslated(s)) out.push(s);
    }
    Object.keys(seen).forEach(function (s) {
      if (out.indexOf(s) === -1 && lookup(s) === null && !isTranslated(s)) out.push(s);
    });
    return out.filter(function (s) {
      return !isTranslated(norm(s.replace(/<\/?\d+>|<br>/g, " ")));
    });
  };

  var VALUES = null;
  function isTranslated(s) {
    if (!VALUES) {
      VALUES = Object.create(null);
      Object.keys(TEXT).forEach(function (k) {
        var v = norm(TEXT[k].replace(/<\/?\d+>|<br>/g, " "));
        VALUES[v] = true;
        // a translated sentence is re-read piece by piece after it is drawn
        v.split(/(?<=[.!?:])\s+/).forEach(function (part) {
          VALUES[part] = true;
        });
      });
    }
    return !!VALUES[s];
  }

  return api;
})();

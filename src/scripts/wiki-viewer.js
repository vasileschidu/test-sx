/**
 * wiki-viewer.js
 * Renders the Markdown wiki in /wiki for humans. The Markdown files stay the
 * source of truth (agents read them directly); this page only presents them.
 *
 * Route: #/<path relative to /wiki>[#<heading-id>], e.g. #/suite/layouts.md#2-enroll-smart-enroll
 * Navigation comes from wiki/manifest.json. Any .md link works, listed or not.
 */
(function () {
  "use strict";

  var WIKI_ROOT = "../../../wiki/";
  var MANIFEST_PATH = WIKI_ROOT + "manifest.json";

  var state = {
    manifest: null,
    pages: [], // flat list of { path, label, section, group }
    cache: {}, // path -> raw markdown
    current: "",
    searchIndex: null,
  };

  var el = {};

  /* ===== Paths ===== */

  function dirname(path) {
    var i = path.lastIndexOf("/");
    return i === -1 ? "" : path.slice(0, i + 1);
  }

  // Resolves href against the current page directory. Returns null when the
  // target leaves /wiki (e.g. a link into src/), so callers can send it to GitHub.
  function resolvePath(fromPath, href) {
    var parts = (dirname(fromPath) + href).split("/");
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p === "" || p === ".") continue;
      if (p === "..") {
        if (!out.length) return null;
        out.pop();
      } else out.push(p);
    }
    var resolved = out.join("/");
    if (href.slice(-1) === "/" || resolved === "") resolved += (resolved ? "/" : "") + "README.md";
    return resolved;
  }

  function parseRoute() {
    var hash = decodeURIComponent(window.location.hash.replace(/^#\/?/, ""));
    var i = hash.indexOf("#");
    var path = i === -1 ? hash : hash.slice(0, i);
    var anchor = i === -1 ? "" : hash.slice(i + 1);
    return { path: path || (state.manifest && state.manifest.home) || "README.md", anchor: anchor };
  }

  function routeHref(path, anchor) {
    return "#/" + path + (anchor ? "#" + anchor : "");
  }

  /* ===== Frontmatter ===== */

  function splitFrontmatter(raw) {
    var m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
    if (!m) return { meta: {}, body: raw };
    var meta = {};
    m[1].split(/\r?\n/).forEach(function (line) {
      var kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
      if (!kv) return;
      var value = kv[2].replace(/\s+#.*$/, "").trim().replace(/^["']|["']$/g, "");
      meta[kv[1]] = value;
    });
    return { meta: meta, body: raw.slice(m[0].length) };
  }

  /* ===== Loading ===== */

  function fetchText(url) {
    return fetch(url, { cache: "no-store" }).then(function (res) {
      if (!res.ok) throw new Error(res.status + " " + url);
      return res.text();
    });
  }

  function loadPage(path) {
    if (state.cache[path] != null) return Promise.resolve(state.cache[path]);
    return fetchText(WIKI_ROOT + path).then(function (text) {
      state.cache[path] = text;
      return text;
    });
  }

  function flattenManifest(manifest) {
    var list = [];
    (manifest.sections || []).forEach(function (section) {
      (section.pages || []).forEach(function (p) {
        list.push({ path: p.path, label: p.label, section: section.title, group: "" });
      });
      (section.groups || []).forEach(function (group) {
        (group.pages || []).forEach(function (p) {
          list.push({ path: p.path, label: p.label, section: section.title, group: group.title });
        });
      });
    });
    return list;
  }

  /* ===== Navigation ===== */

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function navLink(page) {
    return (
      '<a href="' + routeHref(page.path) + '" data-nav-path="' + escapeHtml(page.path) + '" class="wiki-nav-link">' +
      escapeHtml(page.label) +
      "</a>"
    );
  }

  function renderNav() {
    var html = "";
    state.manifest.sections.forEach(function (section) {
      html += '<div class="mb-6"><h2 class="wiki-nav-heading">' + escapeHtml(section.title) + "</h2>";
      if (section.pages) {
        html += '<ul class="space-y-0.5">';
        section.pages.forEach(function (p) {
          html += "<li>" + navLink(p) + "</li>";
        });
        html += "</ul>";
      }
      (section.groups || []).forEach(function (group) {
        html +=
          '<details class="wiki-nav-group" data-nav-group>' +
          '<summary class="wiki-nav-group-title">' + escapeHtml(group.title) + "</summary>" +
          '<ul class="mt-0.5 mb-2 ml-3 space-y-0.5 border-l border-gray-200 pl-2 dark:border-white/10">';
        group.pages.forEach(function (p) {
          html += "<li>" + navLink(p) + "</li>";
        });
        html += "</ul></details>";
      });
      html += "</div>";
    });
    el.nav.innerHTML = html;
  }

  function highlightNav(path) {
    el.nav.querySelectorAll("[data-nav-path]").forEach(function (a) {
      var active = a.getAttribute("data-nav-path") === path;
      a.classList.toggle("is-active", active);
      if (active) {
        a.setAttribute("aria-current", "page");
        var group = a.closest("[data-nav-group]");
        if (group) group.open = true;
      } else a.removeAttribute("aria-current");
    });
  }

  /* ===== Rendering ===== */

  function slugify(text, used) {
    var base = text
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s_-]/gu, "")
      .replace(/\s/g, "-");
    var slug = base;
    var n = 1;
    while (used[slug]) slug = base + "-" + n++;
    used[slug] = true;
    return slug;
  }

  var META_LABELS = {
    version: "Version",
    current_version: "Version",
    based_on: "Based on",
    product: "Product",
    client: "Client",
    branch: "Branch",
    layout_family: "Layout",
    variant_status: "Variant status",
    upstream_candidate: "Upstream candidate",
    decision_status: "Decision",
    last_reviewed: "Last reviewed",
  };

  function renderMeta(meta, path) {
    var chips = "";
    if (meta.status === "draft") chips += '<span class="wiki-chip wiki-chip-amber">Draft · unverified</span>';
    if (meta.status === "reviewed") chips += '<span class="wiki-chip wiki-chip-green">Reviewed</span>';
    if (meta.example === "true") chips += '<span class="wiki-chip wiki-chip-purple">Worked example, not a real client</span>';
    Object.keys(META_LABELS).forEach(function (key) {
      var v = meta[key];
      if (!v || v === "TODO" || /^</.test(v)) return;
      chips +=
        '<span class="wiki-chip"><span class="wiki-chip-key">' + META_LABELS[key] + "</span> " + escapeHtml(v) + "</span>";
    });
    var repo = state.manifest.repoUrl;
    var links =
      '<a class="wiki-meta-link" href="' + WIKI_ROOT + escapeHtml(path) + '" target="_blank" rel="noopener">Raw Markdown</a>' +
      (repo
        ? '<a class="wiki-meta-link" href="' + repo + escapeHtml(path) + '" target="_blank" rel="noopener">View on GitHub</a>'
        : "");
    var source = meta.source ? '<p class="mt-2 text-xs text-gray-500 dark:text-gray-400">Source: ' + escapeHtml(meta.source) + "</p>" : "";
    el.meta.innerHTML =
      '<div class="mb-6 border-b border-gray-200 pb-4 dark:border-white/10">' +
      '<div class="flex flex-wrap items-center gap-2">' + chips + '<span class="ml-auto flex gap-3">' + links + "</span></div>" +
      source +
      "</div>";
  }

  function rewriteLinks(root, path) {
    var repo = state.manifest.repoUrl ? state.manifest.repoUrl.replace(/wiki\/$/, "") : "";
    root.querySelectorAll("a[href]").forEach(function (a) {
      var href = a.getAttribute("href");
      if (/^[a-z]+:/i.test(href)) {
        a.target = "_blank";
        a.rel = "noopener";
        return;
      }
      if (href.charAt(0) === "#") {
        a.setAttribute("href", routeHref(path, href.slice(1)));
        return;
      }
      var hashAt = href.indexOf("#");
      var target = hashAt === -1 ? href : href.slice(0, hashAt);
      var anchor = hashAt === -1 ? "" : href.slice(hashAt + 1);
      var resolved = resolvePath(path, target);
      if (resolved === null) {
        // Outside /wiki: point at the file in the repo.
        if (repo) {
          a.href = repo + target.replace(/^(\.\.\/)+/, "");
          a.target = "_blank";
          a.rel = "noopener";
        }
        return;
      }
      if (/\.md$/i.test(resolved)) a.setAttribute("href", routeHref(resolved, anchor));
      else a.setAttribute("href", WIKI_ROOT + resolved);
    });
  }

  function markTodos(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) {
      var n = walker.currentNode;
      if (/TODO/.test(n.nodeValue) && !n.parentElement.closest("pre, code, .mermaid")) nodes.push(n);
    }
    nodes.forEach(function (node) {
      var frag = document.createDocumentFragment();
      node.nodeValue.split(/(TODO(?:\([^)]*\))?:?)/).forEach(function (part, i) {
        if (i % 2) {
          var mark = document.createElement("mark");
          mark.className = "wiki-todo";
          mark.textContent = part;
          frag.appendChild(mark);
        } else if (part) frag.appendChild(document.createTextNode(part));
      });
      node.parentNode.replaceChild(frag, node);
    });
  }

  function decorate(root) {
    // Tables scroll on narrow screens instead of breaking the layout.
    root.querySelectorAll("table").forEach(function (t) {
      var wrap = document.createElement("div");
      wrap.className = "wiki-table-wrap";
      t.parentNode.insertBefore(wrap, t);
      wrap.appendChild(t);
    });
    // Mermaid blocks become diagrams.
    root.querySelectorAll("pre > code.language-mermaid").forEach(function (code) {
      var div = document.createElement("div");
      div.className = "mermaid";
      div.setAttribute("data-source", code.textContent);
      div.textContent = code.textContent;
      code.parentNode.replaceWith(div);
    });
  }

  function renderToc(root) {
    var heads = root.querySelectorAll("h2");
    if (heads.length < 2) {
      el.toc.innerHTML = "";
      return;
    }
    var html = '<p class="mb-2 font-semibold text-gray-900 dark:text-white">On this page</p><ul class="space-y-1.5">';
    heads.forEach(function (h) {
      html += '<li><a class="wiki-toc-link" href="' + routeHref(state.current, h.id) + '">' + escapeHtml(h.textContent) + "</a></li>";
    });
    el.toc.innerHTML = html + "</ul>";
  }

  function renderMermaid() {
    if (!window.mermaid) return;
    var nodes = el.content.querySelectorAll(".mermaid");
    if (!nodes.length) return;
    nodes.forEach(function (n) {
      n.removeAttribute("data-processed");
      n.textContent = n.getAttribute("data-source");
    });
    window.mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: document.documentElement.classList.contains("dark") ? "dark" : "default",
      fontFamily: "Inter, sans-serif",
    });
    window.mermaid.run({ nodes: nodes }).catch(function (e) {
      console.warn("[wiki] mermaid", e);
    });
  }

  function renderPage(path, anchor) {
    state.current = path;
    highlightNav(path);
    closeMobileNav();
    return loadPage(path)
      .then(function (raw) {
        var parts = splitFrontmatter(raw);
        renderMeta(parts.meta, path);
        var html = window.marked.parse(parts.body, { gfm: true });
        el.content.innerHTML = window.DOMPurify.sanitize(html);
        var used = {};
        el.content.querySelectorAll("h1, h2, h3, h4").forEach(function (h) {
          h.id = slugify(h.textContent, used);
        });
        rewriteLinks(el.content, path);
        decorate(el.content);
        markTodos(el.content);
        renderToc(el.content);
        renderMermaid();
        var h1 = el.content.querySelector("h1");
        document.title = (h1 ? h1.textContent + " · " : "") + "SMART Suite Wiki";
        scrollToAnchor(anchor);
      })
      .catch(function (err) {
        console.error("[wiki]", err);
        el.meta.innerHTML = "";
        el.toc.innerHTML = "";
        el.content.innerHTML =
          "<h1>Page not found</h1><p>Could not load <code>" + escapeHtml(path) +
          '</code>. It may have been moved or renamed.</p><p><a href="' + routeHref(state.manifest.home) + '">Go to the wiki home</a></p>';
      });
  }

  function scrollToAnchor(anchor) {
    if (anchor) {
      var target = document.getElementById(anchor);
      if (target) {
        target.scrollIntoView({ block: "start" });
        return;
      }
    }
    window.scrollTo(0, 0);
    el.content.focus({ preventScroll: true });
  }

  /* ===== Search ===== */

  function buildSearchIndex() {
    if (state.searchIndex) return state.searchIndex;
    state.searchIndex = Promise.all(
      state.pages.map(function (p) {
        return loadPage(p.path)
          .then(function (raw) {
            var body = splitFrontmatter(raw).body;
            var text = body
              .replace(/```[\s\S]*?```/g, " ")
              .replace(/[#>*_`|[\]()-]+/g, " ")
              .replace(/\s+/g, " ");
            return { page: p, text: text, lower: text.toLowerCase() };
          })
          .catch(function () {
            return null;
          });
      }),
    ).then(function (list) {
      return list.filter(Boolean);
    });
    return state.searchIndex;
  }

  function runSearch(query) {
    var q = query.trim().toLowerCase();
    if (q.length < 2) {
      el.results.classList.add("hidden");
      el.nav.classList.remove("hidden");
      return;
    }
    buildSearchIndex().then(function (index) {
      if (el.search.value.trim().toLowerCase() !== q) return;
      var hits = [];
      index.forEach(function (entry) {
        var labelHit = entry.page.label.toLowerCase().indexOf(q) !== -1 || (entry.page.group || "").toLowerCase().indexOf(q) !== -1;
        var at = entry.lower.indexOf(q);
        if (!labelHit && at === -1) return;
        var count = entry.lower.split(q).length - 1;
        var snippet = "";
        if (at !== -1) {
          var start = Math.max(0, at - 50);
          snippet =
            (start ? "…" : "") +
            escapeHtml(entry.text.slice(start, at)) +
            "<mark>" + escapeHtml(entry.text.slice(at, at + q.length)) + "</mark>" +
            escapeHtml(entry.text.slice(at + q.length, at + q.length + 70)) + "…";
        }
        hits.push({ entry: entry, score: (labelHit ? 100 : 0) + count, snippet: snippet });
      });
      hits.sort(function (a, b) {
        return b.score - a.score;
      });
      var html = '<p class="wiki-nav-heading">' + hits.length + (hits.length === 1 ? " result" : " results") + "</p>";
      if (!hits.length) html += '<p class="px-2 text-gray-500 dark:text-gray-400">Nothing matches “' + escapeHtml(query) + "”.</p>";
      html += '<ul class="space-y-1">';
      hits.slice(0, 40).forEach(function (h) {
        var p = h.entry.page;
        html +=
          '<li><a class="wiki-result" href="' + routeHref(p.path) + '">' +
          '<span class="block font-medium">' + escapeHtml((p.group ? p.group + " · " : "") + p.label) + "</span>" +
          '<span class="block text-xs text-gray-500 dark:text-gray-400">' + escapeHtml(p.section) + "</span>" +
          (h.snippet ? '<span class="mt-1 block text-xs text-gray-600 dark:text-gray-300">' + h.snippet + "</span>" : "") +
          "</a></li>";
      });
      el.results.innerHTML = html + "</ul>";
      el.nav.classList.add("hidden");
      el.results.classList.remove("hidden");
      openMobileNav();
    });
  }

  /* ===== Mobile nav + theme ===== */

  function openMobileNav() {
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    el.sidebar.classList.remove("hidden");
    el.navToggle.setAttribute("aria-expanded", "true");
  }

  function closeMobileNav() {
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    el.sidebar.classList.add("hidden");
    el.navToggle.setAttribute("aria-expanded", "false");
  }

  // Same storage key and class as shared.js initThemeToggle(); shared.js itself
  // is dashboard-specific (breadcrumbs, dev reload), so it is not loaded here.
  function initTheme() {
    var root = document.documentElement;
    function sync() {
      var isDark = root.classList.contains("dark");
      el.themeToggle.setAttribute("aria-pressed", isDark ? "true" : "false");
      el.themeToggle.querySelector('[data-theme-icon="light"]').classList.toggle("hidden", isDark);
      el.themeToggle.querySelector('[data-theme-icon="dark"]').classList.toggle("hidden", !isDark);
    }
    el.themeToggle.addEventListener("click", function () {
      var isDark = !root.classList.contains("dark");
      root.classList.toggle("dark", isDark);
      try {
        localStorage.setItem("theme", isDark ? "dark" : "light");
      } catch (e) {}
      sync();
      renderMermaid();
    });
    sync();
  }

  /* ===== Init ===== */

  function onRoute() {
    var r = parseRoute();
    if (r.path === state.current && el.content.querySelector("h1")) {
      scrollToAnchor(r.anchor);
      closeMobileNav();
      return;
    }
    renderPage(r.path, r.anchor);
  }

  function init() {
    el.nav = document.getElementById("wiki-nav");
    el.results = document.getElementById("wiki-search-results");
    el.sidebar = document.getElementById("wiki-sidebar");
    el.navToggle = document.getElementById("wiki-nav-toggle");
    el.meta = document.getElementById("wiki-meta");
    el.content = document.getElementById("wiki-content");
    el.toc = document.getElementById("wiki-toc");
    el.search = document.getElementById("wiki-search");
    el.themeToggle = document.getElementById("wiki-theme-toggle");

    initTheme();
    el.navToggle.addEventListener("click", function () {
      if (el.sidebar.classList.contains("hidden")) openMobileNav();
      else closeMobileNav();
    });
    var searchTimer = 0;
    el.search.addEventListener("input", function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        runSearch(el.search.value);
      }, 150);
    });
    el.search.addEventListener("focus", buildSearchIndex, { once: true });
    el.results.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        el.search.value = "";
        runSearch("");
      }
    });

    fetchText(MANIFEST_PATH)
      .then(function (text) {
        state.manifest = JSON.parse(text);
        if (!state.manifest || !Array.isArray(state.manifest.sections)) throw new Error("manifest.sections missing");
        state.pages = flattenManifest(state.manifest);
        renderNav();
        window.addEventListener("hashchange", onRoute);
        onRoute();
      })
      .catch(function (err) {
        console.error("[wiki] manifest", err);
        el.content.innerHTML =
          "<h1>Wiki unavailable</h1><p>Could not load <code>wiki/manifest.json</code>. Serve the repo root over HTTP (e.g. <code>python3 -m http.server</code>) and reload.</p>";
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

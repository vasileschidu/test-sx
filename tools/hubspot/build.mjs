#!/usr/bin/env node
/**
 * tools/hubspot/build.mjs
 * Builds the prototype for HubSpot CMS. No dependencies, no changes to the source.
 *
 * Output (hubspot-dist/):
 *   files/   → static files (src/scripts, styles, assets, data, wiki, assets/) for the
 *              HubSpot File Manager. Served on the connected domain at
 *              https://<domain>/hubfs/<fileManagerFolder>/<path>.
 *   design/  → one coded page template per HTML page, for the Design Manager.
 *   pages.json → page manifest (template path, slug, title) used by sync-pages.mjs.
 *
 * How the site keeps working unchanged:
 *   - Every HubSpot page gets the same path as the file in the repo
 *     (src/pages/dashboard/supplier-portal.html → https://<domain>/src/pages/dashboard/supplier-portal.html),
 *     so relative links between pages and every location.pathname check keep working.
 *   - Static references written in the HTML are rewritten to /hubfs/<folder>/… at build time.
 *   - Paths the scripts build at runtime (JSON fetches, dynamic <script>, icons) resolve to
 *     /src/…, /wiki/…, /assets/… on the domain; sync-pages.mjs adds redirects for those to /hubfs/.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/hubspot/config.json"), "utf8"));
const OUT = path.join(ROOT, "hubspot-dist");
const FILES_OUT = path.join(OUT, "files");
const DESIGN_OUT = path.join(OUT, "design");
const HUBFS = "/hubfs/" + CONFIG.fileManagerFolder;

const SKIP_DIRS = new Set([".git", ".history", ".lh", "node_modules", ".DS_Store"]);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const rel = (file) => path.relative(ROOT, file).split(path.sep).join("/");
const isPage = (r) => r === "index.html" || (r.startsWith("src/pages/") && r.endsWith(".html"));
const isExcluded = (r) => (CONFIG.excludePages || []).some((p) => r.startsWith(p));

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

// ---------- 1. static files ----------
fs.rmSync(OUT, { recursive: true, force: true });
const staticFiles = new Set();
for (const root of CONFIG.staticRoots) {
  for (const file of walk(path.join(ROOT, root))) {
    const r = rel(file);
    if (isPage(r)) continue; // pages become HubSpot pages, not files
    copyFile(file, path.join(FILES_OUT, r));
    staticFiles.add(r);
  }
}

// ---------- 1b. runtime path literals in the copied scripts / data ----------
// The scripts build URLs like "../../../src/data/payees.json", "/src/scripts/x.js" or
// "../../assets/onboarding/…". On HubSpot those files live under /hubfs/<folder>/, so the
// copies (never the source) get those literals rewritten. Every page lives in
// src/pages/<dir>/, so relative literals resolve the way the browser resolves them there.
// Page paths (/src/pages/…) are left alone: pages keep their repo paths on HubSpot.
const staticPrefixes = [...staticFiles];
const hasStatic = (p) => staticFiles.has(p) || staticPrefixes.some((f) => f.startsWith(p.endsWith("/") ? p : p + "/"));
const LITERAL = /(["'`])((?:\.\.\/)+|\/(?=(?:src|wiki|assets)\/))([A-Za-z0-9_-][^"'`\s?#]*)/g;
const GH_PAGES_BASE = /(["'`])\/test-sx\/src\/pages\//g; // GitHub Pages project path baked into one script

function rewriteLiterals(text, counter) {
  text = text.replace(GH_PAGES_BASE, (all, q) => { counter.n++; return `${q}/src/pages/`; });
  return text.replace(LITERAL, (all, q, prefix, rest) => {
    const target = prefix === "/" ? rest : path.posix.resolve("/src/pages/_page/", prefix + rest).slice(1);
    if (target.startsWith("src/pages/") || !hasStatic(target.replace(/\/$/, "") || target)) return all;
    counter.n++;
    return `${q}${HUBFS}/${target}${rest.endsWith("/") && !target.endsWith("/") ? "/" : ""}`;
  });
}

const literalCount = { n: 0 };
for (const r of staticFiles) {
  if (!/\.(js|mjs|json)$/i.test(r) || !r.startsWith("src/")) continue;
  const file = path.join(FILES_OUT, r);
  const before = fs.readFileSync(file, "utf8");
  const after = rewriteLiterals(before, literalCount);
  if (after !== before) fs.writeFileSync(file, after);
}

// ---------- 2. page templates ----------
const SKIP_REF = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\{)/i; // http:, data:, mailto:, //cdn, #anchor, {{…}}

function rewriteRef(ref, pageDir, missing) {
  const raw = ref.trim();
  if (!raw || SKIP_REF.test(raw)) return ref;
  const cut = raw.search(/[?#]/);
  const pathPart = cut === -1 ? raw : raw.slice(0, cut);
  const suffix = cut === -1 ? "" : raw.slice(cut);
  if (!pathPart || /\.html?$/i.test(pathPart)) return ref; // links to pages stay as they are
  const resolved = path.posix.resolve("/" + pageDir, pathPart).slice(1);
  let decoded = resolved;
  try { decoded = decodeURI(resolved); } catch (_) {}
  if (!staticFiles.has(decoded)) {
    missing.add(raw);
    return ref; // leave untouched; the /src redirect still catches it
  }
  return HUBFS + "/" + resolved + suffix;
}

function htmlTitle(html, fallback) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return (m ? m[1].replace(/\s+/g, " ").trim() : "") || fallback;
}

const annotation = (label) =>
  `<!--\n  templateType: page\n  isAvailableForNewContent: true\n  label: ${label}\n-->\n`;

const pages = [];
const warnings = [];
for (const file of [path.join(ROOT, "index.html"), ...walk(path.join(ROOT, "src/pages"))]) {
  const r = rel(file);
  if (!isPage(r) || isExcluded(r)) continue;
  let html = fs.readFileSync(file, "utf8");
  const pageDir = path.posix.dirname(r) === "." ? "" : path.posix.dirname(r);
  const missing = new Set();

  if (/\{\{|\{%|\{#/.test(html)) warnings.push(`${r}: contains {{ / {% / {# — kept inside {% raw %}`);

  html = html.replace(/\b(src|href|poster|data-src)=(["'])([^"']*)\2/gi, (all, attr, q, value) =>
    `${attr}=${q}${rewriteRef(value, pageDir, missing)}${q}`
  );
  html = html.replace(/\bsrcset=(["'])([^"']*)\1/gi, (all, q, value) =>
    `srcset=${q}${value
      .split(",")
      .map((part) => {
        const [u, ...rest] = part.trim().split(/\s+/);
        return [rewriteRef(u, pageDir, missing), ...rest].join(" ");
      })
      .join(", ")}${q}`
  );
  for (const m of missing) warnings.push(`${r}: file not found for "${m}"`);
  html = rewriteLiterals(html, literalCount); // paths inside inline <script> blocks

  const headIdx = html.search(/<\/head>/i);
  const bodyIdx = html.search(/<\/body>/i);
  if (headIdx === -1 || bodyIdx === -1) {
    warnings.push(`${r}: no </head> or </body>, skipped`);
    continue;
  }
  const robots = CONFIG.noindex ? '<meta name="robots" content="noindex, nofollow">\n' : "";
  const out =
    annotation(`SX prototype · ${r}`) +
    "{% raw %}" +
    html.slice(0, headIdx) +
    "{% endraw %}\n" +
    robots +
    "{{ standard_header_includes }}\n{% raw %}" +
    html.slice(headIdx, bodyIdx) +
    "{% endraw %}\n{{ standard_footer_includes }}\n{% raw %}" +
    html.slice(bodyIdx) +
    "{% endraw %}\n";

  const templateRel = "templates/" + r;
  fs.mkdirSync(path.dirname(path.join(DESIGN_OUT, templateRel)), { recursive: true });
  fs.writeFileSync(path.join(DESIGN_OUT, templateRel), out);
  pages.push({
    source: r,
    templatePath: `${CONFIG.designManagerFolder}/${templateRel}`,
    slug: r === "index.html" ? "" : r,
    name: `SX prototype · ${r}`,
    htmlTitle: htmlTitle(html, r),
  });
}

fs.writeFileSync(path.join(OUT, "pages.json"), JSON.stringify({ config: CONFIG, pages }, null, 2));

console.log(`Static files: ${staticFiles.size} → hubspot-dist/files`);
console.log(`Page templates: ${pages.length} → hubspot-dist/design/templates`);
console.log(`Runtime paths pointed at ${HUBFS}: ${literalCount.n}`);
if (warnings.length) {
  console.log(`\nWarnings (${warnings.length}):`);
  for (const w of warnings) console.log("  - " + w);
}

// UI QA — code (SX). Opens pages in Chrome and measures what the browser renders against the
// design-system skill: spacing / radius / font size off the Tailwind scale, colours outside the
// palette (tailwind-theme.js), clipped text without a tooltip, overlapping controls, horizontal
// overflow, console errors and failed requests. Also scans the lines a change added for raw hex
// and Tailwind arbitrary values. Findings are grouped by rule + value to keep the report short.
//
// Usage (prototype served on :8899 — `python3 tools/serve.py`):
//   node tools/ui-qa/code-audit.mjs --pages src/pages/dashboard/vendors.html[,…]
//        [--scope "main"] [--viewports 1440,390] [--dark] [--files <changed files>] [--out dir]
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { launch, settle, arg, flag, list, BASE } from "./browser.mjs";

const PAGES = list("pages");
const FILES = list("files");
const SCOPE = arg("scope", "");
const VIEWPORTS = (list("viewports").length ? list("viewports") : ["1440", "390"]).map(Number);
const OUT = arg("out", "tools/ui-qa/out/code");
fs.mkdirSync(OUT, { recursive: true });

// Tailwind scales (px). Spacing = 0.5 steps (2px) up to 14, then 4px steps; plus common layout sizes.
const SPACING = [0, 1, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96, 112, 128, 144, 160];
const RADIUS = [0, 2, 4, 6, 8, 12, 16, 24, 32];
const FONT = [12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72, 96, 128];

// The palette = tailwind-theme.js (classic Tailwind hex) + white / black.
const theme = fs.readFileSync("src/scripts/tailwind-theme.js", "utf8");
const hexes = [...theme.matchAll(/"#([0-9a-fA-F]{6})"/g)].map((m) => m[1]);
const PALETTE = ["ffffff", "000000", ...hexes].map((h) => [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(","));

// ---- static scan of added lines --------------------------------------------------------------
const added = (f) => {
  try {
    const diff = execSync(`git diff -U0 HEAD -- "${f}"`, { encoding: "utf8" });
    const set = new Set();
    for (const l of diff.split("\n")) {
      const m = l.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
      if (m) for (let k = 0; k < (m[2] === undefined ? 1 : +m[2]); k++) set.add(+m[1] + k);
    }
    return set;
  } catch (e) { return null; }
};
const staticFindings = [];
for (const f of FILES) {
  if (!fs.existsSync(f) || /design-tokens\.js|tailwind-theme\.js|\.json$/.test(f)) continue;
  const only = flag("all-lines") ? null : added(f);
  fs.readFileSync(f, "utf8").split("\n").forEach((line, i) => {
    if (only && !only.has(i + 1)) return;
    const code = line.replace(/\bd="[^"]*"/g, "").replace(/url\([^)]*\)/g, "");
    if (/\[#[0-9a-fA-F]{3,8}\]/.test(code)) staticFindings.push({ severity: "major", rule: "arbitrary-colour", where: `${f}:${i + 1}`, text: line.trim().slice(0, 140), fix: "use a palette class or a semantic class (design-system skill)" });
    else if (/(?<![&\w])#[0-9a-fA-F]{6}\b/.test(code) && !/fill="#|stroke="#|stop-color|&#/.test(code)) staticFindings.push({ severity: "minor", rule: "raw-hex", where: `${f}:${i + 1}`, text: line.trim().slice(0, 140) });
    if (/-\[\d+(\.\d+)?px\]/.test(code)) staticFindings.push({ severity: "minor", rule: "arbitrary-px", where: `${f}:${i + 1}`, text: line.trim().slice(0, 140), fix: "use the Tailwind step if one exists; otherwise keep and note why" });
    if (/\sstyle="/.test(code)) staticFindings.push({ severity: "minor", rule: "inline-style", where: `${f}:${i + 1}`, text: line.trim().slice(0, 140) });
  });
}

// ---- browser measurement ---------------------------------------------------------------------
const MEASURE = ({ scope, SPACING, RADIUS, FONT, PALETTE }) => {
  const vis = (el) => { const cs = getComputedStyle(el); if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const root = (scope && [...document.querySelectorAll(scope)].find(vis)) || document.body;
  const sel = (el) => { const p = []; for (let n = el, i = 0; n && n !== document.body && i < 3; i++, n = n.parentElement) { let s = n.tagName.toLowerCase(); if (n.id) s += "#" + n.id; else { const c = [...n.classList].slice(0, 2).join("."); if (c) s += "." + c; } p.unshift(s); } return p.join(" > "); };
  const on = (v, s) => s.some((x) => Math.abs(v - x) < 0.6);
  const rgb = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return { key: p.slice(0, 3).map(Math.round).join(","), a: p.length > 3 ? p[3] : 1 }; };
  const inPalette = (c) => { const r = rgb(c); return !r || r.a === 0 || PALETTE.includes(r.key); };
  const groups = new Map();
  const add = (rule, value, el) => { const k = rule + "|" + value; const g = groups.get(k) || { rule, value, count: 0, examples: [] }; g.count++; if (g.examples.length < 3) g.examples.push(sel(el)); groups.set(k, g); };
  for (const el of [...root.querySelectorAll("*")].filter(vis)) {
    if (el.closest("svg")) continue;
    const cs = getComputedStyle(el);
    for (const p of ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "rowGap", "columnGap"]) { const v = parseFloat(cs[p]); if (v && !on(v, SPACING)) add("spacing-off-scale", `${v}px`, el); }
    const rad = parseFloat(cs.borderTopLeftRadius); const h = el.getBoundingClientRect().height;
    if (rad && !on(rad, RADIUS) && rad < h / 2 - 0.5 && !cs.borderTopLeftRadius.includes("%")) add("radius-off-scale", `${rad}px`, el);
    const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (ownText) {
      const fs = parseFloat(cs.fontSize); if (!on(fs, FONT)) add("font-size-off-scale", `${fs}px`, el);
      if (!inPalette(cs.color)) add("text-colour-off-palette", cs.color, el);
      if (el.scrollWidth > el.clientWidth + 1 && cs.overflow !== "visible" && !el.closest("[title],[data-tooltip],.sr-only")) add("clipped-text-no-tooltip", `${el.scrollWidth}>${el.clientWidth}`, el);
    }
    if (!inPalette(cs.backgroundColor)) add("background-off-palette", cs.backgroundColor, el);
    if (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== "none" && !inPalette(cs.borderTopColor)) add("border-off-palette", cs.borderTopColor, el);
  }
  // each control's box clipped to its overflow containers: collapsed submenus and scrolled-away rows don't count
  const clip = (el) => {
    const r = el.getBoundingClientRect(); let b = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
      const o = getComputedStyle(n); if (o.overflowX === "visible" && o.overflowY === "visible") continue;
      const c = n.getBoundingClientRect(); b = { left: Math.max(b.left, c.left), top: Math.max(b.top, c.top), right: Math.min(b.right, c.right), bottom: Math.min(b.bottom, c.bottom) };
    }
    return b;
  };
  const ctrls = [...root.querySelectorAll("button, input:not([type=hidden]), select, a[href]")].filter(vis).map((el) => [el, clip(el)]).filter(([, r]) => r.right - r.left > 1 && r.bottom - r.top > 1);
  for (let i = 0; i < ctrls.length; i++) for (let j = i + 1; j < ctrls.length; j++) {
    const [a, ra] = ctrls[i], [b, rb] = ctrls[j];
    if (a.contains(b) || b.contains(a) || a.closest("label") === b.closest("label") && a.closest("label")) continue;
    const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (ox > 2 && oy > 2) add("controls-overlap", `${sel(b)}`, a);
  }
  return { overflow: document.documentElement.scrollWidth > window.innerWidth + 1 ? document.documentElement.scrollWidth : 0, groups: [...groups.values()] };
};

const SEVERITY = { "controls-overlap": "major", "clipped-text-no-tooltip": "major", "page-horizontal-overflow": "major", "console-error": "major", "failed-request": "major", "text-colour-off-palette": "minor", "background-off-palette": "minor", "border-off-palette": "minor", "spacing-off-scale": "minor", "radius-off-scale": "minor", "font-size-off-scale": "minor" };

const browser = await launch();
const findings = [...staticFindings];
for (const p of PAGES) {
  for (const w of VIEWPORTS) for (const dark of flag("dark") ? [false, true] : [false]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w > 800 ? 1000 : 844 } });
    if (dark) await ctx.addInitScript(() => { try { localStorage.setItem("theme", "dark"); } catch (e) {} });
    const page = await ctx.newPage();
    const errors = []; const failed = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") { const u = (m.location() || {}).url || ""; if (!/favicon\.ico/.test(u)) errors.push(m.text() + (u ? " — " + u.replace(BASE, "") : "")); } });
    page.on("response", (r) => { if (r.status() >= 400 && !/favicon\.ico/.test(r.url())) failed.push(`${r.status()} ${r.url().replace(BASE, "")}`); });
    await page.goto(`${BASE}/${p}`);
    await settle(page, 1200);
    const tag = `${path.basename(p, ".html")}-${w}${dark ? "-dark" : ""}`;
    await page.screenshot({ path: `${OUT}/${tag}.png`, fullPage: true });
    const r = await page.evaluate(MEASURE, { scope: SCOPE, SPACING, RADIUS, FONT, PALETTE });
    const where = `${p} @${w}${dark ? " dark" : ""}`;
    for (const e of [...new Set(errors)]) findings.push({ severity: "major", rule: "console-error", where, value: e.slice(0, 160) });
    for (const f of [...new Set(failed)]) findings.push({ severity: "major", rule: "failed-request", where, value: f });
    if (r.overflow) findings.push({ severity: "major", rule: "page-horizontal-overflow", where, value: `${r.overflow}px > ${w}px` });
    for (const g of r.groups) findings.push({ severity: SEVERITY[g.rule] || "minor", rule: g.rule, where, value: g.value, count: g.count, examples: g.examples });
    await ctx.close();
  }
}
await browser.close();
fs.writeFileSync(`${OUT}/qa.json`, JSON.stringify(findings, null, 1));
const by = (s) => findings.filter((f) => f.severity === s);
console.log(`code-audit: ${PAGES.length} page(s) × ${VIEWPORTS.join("/")}${flag("dark") ? " × light/dark" : ""} — major ${by("major").length}, minor ${by("minor").length}`);
for (const f of by("major").slice(0, 25)) console.log(`  MAJOR ${f.rule} · ${f.where} · ${f.value || f.text || ""}${f.count ? ` ×${f.count}` : ""}`);
const minorRules = {}; for (const f of by("minor")) minorRules[f.rule] = (minorRules[f.rule] || 0) + (f.count || 1);
if (Object.keys(minorRules).length) console.log("  minor:", Object.entries(minorRules).map(([k, v]) => `${k} ${v}`).join(" · "));
console.log(`  report ${OUT}/qa.json · screenshots ${OUT}/*.png`);

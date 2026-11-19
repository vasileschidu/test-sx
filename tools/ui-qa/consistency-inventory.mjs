#!/usr/bin/env node
// Consistency inventory: counts how many variants of each UI element the code has
// (buttons, headings, modal/card headers, inputs, hand-typed values) and compares
// buttons with the SMART System Figma sizes and headings with the type-* text roles.
//
//   npm run qa:consistency                 → tools/ui-qa/out/consistency/inventory.json + summary on stdout
//   npm run qa:consistency -- --wiki       → also rewrites wiki/design-system/consistency-report.md
//
// Static analysis of class strings in src/**/*.html and src/**/*.js (no browser). It reads
// <button>/<a>/<h1-3>/<input> markup written in HTML or inside JS strings; markup built from
// class constants (e.g. OBModal.PRIMARY_BUTTON) is not counted. Read it as a trend, not a census.

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const OUT_DIR = path.join(ROOT, "tools/ui-qa/out/consistency");
const WIKI = path.join(ROOT, "wiki/design-system/consistency-report.md");
const SKIP = /(design-tokens|tailwind-theme)\.js$|\/vendor\//;

// SMART System (Figma PdvEp0MAIlof6O8MYaXCcy, page Buttons, Button/Primary 2200:43522 and
// Button/Secondary 8841:59169, State=Default), read 2026-11-19. Same for every button type.
const FIGMA_BUTTON_SIZES = {
  xs: { h: 20, px: 6, fs: 12, classes: "rounded px-1.5 py-0.5 text-xs" },
  sm: { h: 28, px: 8, fs: 14, classes: "rounded px-2 py-1 text-sm" },
  md: { h: 32, px: 10, fs: 14, classes: "rounded-md px-2.5 py-1.5 text-sm" },
  lg: { h: 40, px: 12, fs: 16, classes: "rounded-md px-3 py-2 text-base" },
  xl: { h: 44, px: 14, fs: 16, classes: "rounded-md px-3.5 py-2.5 text-base" },
};

// type-* text roles (design-system skill) → the size/weight they stand for.
const ROLES = {
  "text-3xl font-semibold": "type-title-page",
  "text-xl font-semibold": "type-title-section",
  "text-lg font-semibold": "type-title-modal",
  "text-base font-semibold": "type-title-card",
  "text-sm font-semibold": "type-title-small",
};

const FONT = { "text-xs": [12, 16], "text-sm": [14, 20], "text-base": [16, 24], "text-lg": [18, 28], "text-xl": [20, 28], "text-2xl": [24, 32], "text-3xl": [30, 36] };

function product(rel) {
  if (/src\/pages\/(onboarding|sd-uk)\/|src\/scripts\/(onboarding-|sd-|review-documents)/.test(rel)) return "SMART Disburse";
  if (/sx-enroll|sx-sign-agreement/.test(rel)) return "SX enrolment";
  if (/src\/pages\/dashboard\/consumer-|consumer-/.test(rel)) return "Consumer Portal";
  if (/src\/pages\/(demo|wiki|reports)\/|src\/pages\/index/.test(rel)) return "Demo / internal";
  if (/src\/pages\//.test(rel)) return "Hub / SX portal";
  return "Shared scripts";
}

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(html|js)$/.test(e.name) && !SKIP.test(p)) acc.push(p);
  }
  return acc;
}

const sp = (v) => (v === "px" ? 1 : Number(v) * 4); // Tailwind spacing → px
function tokens(cls) {
  // Base (unprefixed) utilities only: responsive / state / dark variants are ignored for sizing.
  return cls.split(/\s+/).filter((t) => t && !t.includes(":"));
}
function measure(cls) {
  const t = tokens(cls);
  let py, px, h, fs, lh, size, rounded;
  for (const x of t) {
    let m;
    if ((m = x.match(/^py-([\d.]+|px)$/))) py = sp(m[1]);
    else if ((m = x.match(/^px-([\d.]+|px)$/))) px = sp(m[1]);
    else if ((m = x.match(/^p-([\d.]+|px)$/))) { py ??= sp(m[1]); px ??= sp(m[1]); }
    else if ((m = x.match(/^py-\[(\d+)px\]$/))) py = Number(m[1]);
    else if ((m = x.match(/^px-\[(\d+)px\]$/))) px = Number(m[1]);
    else if ((m = x.match(/^h-([\d.]+)$/))) h = sp(m[1]);
    else if ((m = x.match(/^h-\[(\d+)px\]$/))) h = Number(m[1]);
    else if ((m = x.match(/^size-([\d.]+)$/))) size = sp(m[1]);
    else if ((m = x.match(/^(text-(?:xs|sm|base|lg|xl|2xl|3xl))(?:\/(\d+))?$/))) { [fs, lh] = FONT[m[1]]; if (m[2]) lh = sp(m[2]); }
    else if ((m = x.match(/^text-\[(\d+)px\]$/))) fs = Number(m[1]);
    else if ((m = x.match(/^leading-([\d.]+)$/))) lh = sp(m[1]);
    else if ((m = x.match(/^leading-\[(\d+)px\]$/))) lh = Number(m[1]);
    else if (/^rounded/.test(x)) rounded = x;
  }
  if (size) h = size;
  if (!h && py != null) h = py * 2 + (lh || 20); // no text size → inherits text-sm/20 from the button default
  return { py, px, h, fs, lh, rounded, iconOnly: !!size };
}

function buttonKind(cls) {
  const s = ` ${cls} `;
  if (/ bg-(blue|indigo)-(5|6|7)00 | bg-brand |bg-\[linear-gradient/.test(s)) return "primary";
  if (/ bg-red-(5|6)00 /.test(s)) return "danger";
  if (/ bg-white /.test(s) && /inset-ring|ring-1| border /.test(s)) return "secondary";
  if (/ bg-gray-(50|100) /.test(s) && !/inset-ring|ring-1| border /.test(s)) return "gray";
  if (!/ bg-/.test(s) && / text-blue-(6|7)00 /.test(s) && /font-semibold/.test(s)) return "link";
  return null;
}

function figmaSize(m) {
  if (m.h == null) return { match: "unknown", note: "no height (no py/h)" };
  const hit = Object.entries(FIGMA_BUTTON_SIZES).find(([, f]) => f.h === m.h);
  if (!hit) return { match: "off-scale", note: `${m.h}px tall` };
  const [name, f] = hit;
  if (m.iconOnly) return { match: "exact", size: name };
  const diffs = [];
  if (m.px != null && m.px !== f.px) diffs.push(`padding ${m.px}px (Figma ${f.px})`);
  if (m.fs != null && m.fs !== f.fs) diffs.push(`font ${m.fs}px (Figma ${f.fs})`);
  return diffs.length ? { match: "near", size: name, note: diffs.join(", ") } : { match: "exact", size: name };
}

const sig = (cls, re) => tokens(cls).filter((x) => re.test(x)).sort().join(" ") || "(none)";
const lineOf = (text, idx) => text.slice(0, idx).split("\n").length;

const files = walk(path.join(ROOT, "src"));
const buttons = [], headings = [], headers = [], inputs = [];
const raw = {};

const CLASS = `class=\\\\?["']([^"'\\\\]+)`;
const reButton = new RegExp(`<(button|a)\\b[^>]*?${CLASS}`, "g");
const reHeading = new RegExp(`<(h[1-3])\\b[^>]*?${CLASS}`, "g");
const reHeader = new RegExp(`${CLASS}["'][^<]{0,60}<h[23]\\b`, "g");
const reInput = new RegExp(`<input\\b(?![^>]*type=\\\\?["'](?:checkbox|radio|hidden|file|range)["'\\\\])[^>]*?${CLASS}`, "g");

for (const f of files) {
  const text = fs.readFileSync(f, "utf8");
  const rel = path.relative(ROOT, f);
  const prod = product(rel);
  let m;
  reButton.lastIndex = 0;
  while ((m = reButton.exec(text))) {
    const cls = m[2], kind = buttonKind(cls);
    if (!kind) continue;
    const meas = measure(cls);
    const fig = kind === "link" ? { match: "n/a" } : figmaSize(meas);
    buttons.push({ file: rel, line: lineOf(text, m.index), product: prod, kind, tag: m[1],
      signature: sig(cls, /^(px|py|p|h|size|rounded|text-(xs|sm|base|lg|\[)|leading|font-(normal|medium|semibold|bold))(-|$)/), ...meas, ...fig });
  }
  reHeading.lastIndex = 0;
  while ((m = reHeading.exec(text))) {
    const cls = m[2];
    const role = tokens(cls).find((x) => x.startsWith("type-"));
    const s = sig(cls, /^(text-(xs|sm|base|lg|xl|2xl|3xl|\[)|font-(normal|medium|semibold|bold)|leading-)/);
    const base = tokens(cls).filter((x) => /^(text-(xs|sm|base|lg|xl|2xl|3xl)|font-(normal|medium|semibold|bold))$/.test(x)).sort((a, b) => (a.startsWith("text") ? -1 : 1)).join(" ");
    const sizeOnly = tokens(cls).find((x) => /^text-(xs|sm|base|lg|xl|2xl|3xl)(\/\d+)?$/.test(x))?.split("/")[0];
    const weight = tokens(cls).find((x) => /^font-(normal|medium|semibold|bold)$/.test(x));
    const asRole = ROLES[`${sizeOnly} ${weight}`];
    headings.push({ file: rel, line: lineOf(text, m.index), product: prod, tag: m[1], signature: s,
      status: role ? "uses type-* role" : asRole ? `matches ${asRole} (not using it)` : "no matching role", role: role || asRole || null, base });
  }
  reHeader.lastIndex = 0;
  while ((m = reHeader.exec(text))) {
    if (!/border-b/.test(m[1])) continue;
    headers.push({ file: rel, line: lineOf(text, m.index), product: prod, signature: sig(m[1], /^(p|px|py|pl|pr|pt|pb|gap)-/) });
  }
  reInput.lastIndex = 0;
  while ((m = reInput.exec(text))) {
    inputs.push({ file: rel, line: lineOf(text, m.index), product: prod,
      signature: sig(m[1], /^(px|py|p|pl|pr|h|rounded|text-(xs|sm|base|\[)|outline-1|ring-1|border)(-|$)/) });
  }
  const arb = (text.match(/(?<![\w-])(?:w|h|min-w|max-w|min-h|max-h|text|p[xytblr]?|m[xytblr]?|gap|rounded|leading|top|left|right|bottom|size)-\[[^\]\s]+\]/g) || []).length;
  const hex = (text.match(/-\[#[0-9a-fA-F]{3,8}\]/g) || []).length;
  if (arb || hex) raw[rel] = { arbitrary: arb, hex, product: prod };
}

// ---- aggregate -----------------------------------------------------------------
function group(list, key) {
  const g = new Map();
  for (const it of list) {
    const k = key(it);
    if (!g.has(k)) g.set(k, { key: k, count: 0, files: new Set(), example: `${it.file}:${it.line}`, item: it });
    const e = g.get(k); e.count++; e.files.add(it.file);
  }
  return [...g.values()].map((e) => ({ ...e, files: e.files.size })).sort((a, b) => b.count - a.count);
}
const sized = buttons.filter((b) => b.kind !== "link");
const byMatch = (list) => list.reduce((a, b) => ((a[b.match] = (a[b.match] || 0) + 1), a), {});
const products = [...new Set(buttons.map((b) => b.product))].sort();
const summary = {
  generated: new Date().toISOString().slice(0, 10),
  files: files.length,
  buttons: {
    total: buttons.length,
    sized: sized.length,
    variants: group(sized, (b) => `${b.kind} | ${b.signature}`).length,
    figma: byMatch(sized),
    byKind: Object.fromEntries(["primary", "secondary", "gray", "danger", "link"].map((k) => [k, { count: buttons.filter((b) => b.kind === k).length, variants: group(buttons.filter((b) => b.kind === k), (b) => b.signature).length }])),
    byProduct: Object.fromEntries(products.map((p) => [p, byMatch(sized.filter((b) => b.product === p))])),
  },
  headings: { total: headings.length, variants: group(headings, (h) => h.signature).length, byStatus: headings.reduce((a, h) => ((a[h.status.split(" (")[0]] = (a[h.status.split(" (")[0]] || 0) + 1), a), {}) },
  headers: { total: headers.length, variants: group(headers, (h) => h.signature).length },
  inputs: { total: inputs.length, variants: group(inputs, (h) => h.signature).length },
  raw: { arbitrary: Object.values(raw).reduce((a, r) => a + r.arbitrary, 0), hex: Object.values(raw).reduce((a, r) => a + r.hex, 0) },
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, "inventory.json"), JSON.stringify({ summary, buttons, headings, headers, inputs, raw }, null, 1));

console.log(`consistency: ${files.length} files`);
console.log(`  buttons  ${summary.buttons.sized} sized (+${buttons.length - sized.length} link) · ${summary.buttons.variants} variants · Figma exact ${summary.buttons.figma.exact || 0} / near ${summary.buttons.figma.near || 0} / off-scale ${summary.buttons.figma["off-scale"] || 0} / unknown ${summary.buttons.figma.unknown || 0}`);
console.log(`  headings ${summary.headings.total} · ${summary.headings.variants} variants · ${JSON.stringify(summary.headings.byStatus)}`);
console.log(`  headers  ${summary.headers.total} · ${summary.headers.variants} variants   inputs ${summary.inputs.total} · ${summary.inputs.variants} variants`);
console.log(`  raw      ${summary.raw.arbitrary} arbitrary values · ${summary.raw.hex} hex colours`);
console.log(`  report   ${path.relative(ROOT, OUT_DIR)}/inventory.json`);

if (!process.argv.includes("--wiki")) process.exit(0);

// ---- wiki report ------------------------------------------------------------------
const pct = (n, d) => (d ? `${Math.round((n / d) * 100)}%` : "—");
const row = (cells) => `| ${cells.join(" | ")} |`;
const L = [];
L.push("---", "title: Consistency report (code)", "type: guide", "status: draft", `last_reviewed: ${summary.generated}`,
  "source: generated by tools/ui-qa/consistency-inventory.mjs (npm run qa:consistency -- --wiki); do not edit by hand", "---", "");
L.push("# Consistency report (code)", "");
L.push(`Generated ${summary.generated} from \`main\`-line code: ${files.length} HTML/JS files under \`src/\`. Re-run with`,
  "`npm run qa:consistency -- --wiki`. Discrepancies people spot by eye go in [discrepancies.md](discrepancies.md).", "");
L.push("Static count of class strings: markup built from class constants (e.g. `OBModal.PRIMARY_BUTTON`) is not counted,",
  "and responsive/state variants are ignored. Read it as a trend to drive down, not an exact census.", "");
L.push("## Summary", "");
L.push(row(["Element", "Instances", "Different variants", "Target"]), row(["---", "---", "---", "---"]));
L.push(row(["Buttons (primary, secondary, gray, danger)", summary.buttons.sized, summary.buttons.variants, "5 Figma sizes per type"]));
L.push(row(["Headings h1–h3", summary.headings.total, summary.headings.variants, "type-* roles (~6)"]));
L.push(row(["Modal / card headers (border-b + title)", summary.headers.total, summary.headers.variants, "1–2"]));
L.push(row(["Text inputs", summary.inputs.total, summary.inputs.variants, "1 (`@input field`)"]));
L.push(row(["Hand-typed values `x-[…]`", summary.raw.arbitrary, "—", "only with a reason"]));
L.push(row(["Hand-typed colours `-[#…]`", summary.raw.hex, "—", "0 (tokens)"]), "");

L.push("## Buttons vs SMART System sizes", "");
L.push("Figma sizes (SMART System `PdvEp0MAIlof6O8MYaXCcy`, Button/Primary `2200:43522`, Button/Secondary `8841:59169`; same for every type):", "");
L.push(row(["Size", "Height", "Padding x", "Font", "Tailwind"]), row(["---", "---", "---", "---", "---"]));
for (const [k, f] of Object.entries(FIGMA_BUTTON_SIZES)) L.push(row([k, `${f.h}px`, `${f.px}px`, `${f.fs}px`, `\`${f.classes}\``]));
L.push("", "**exact** = height, padding and font match a Figma size · **near** = right height, other padding or font · **off-scale** = a height Figma doesn't have.", "");
const fig = summary.buttons.figma, tot = summary.buttons.sized;
L.push(row(["", "exact", "near", "off-scale", "unknown"]), row(["---", "---", "---", "---", "---"]));
L.push(row(["**All**", `${fig.exact || 0} (${pct(fig.exact || 0, tot)})`, `${fig.near || 0} (${pct(fig.near || 0, tot)})`, `${fig["off-scale"] || 0} (${pct(fig["off-scale"] || 0, tot)})`, fig.unknown || 0]));
for (const p of products) { const b = summary.buttons.byProduct[p]; L.push(row([p, b.exact || 0, b.near || 0, b["off-scale"] || 0, b.unknown || 0])); }
L.push("", "SMART Disburse follows its own Figma file (56px onboarding buttons), so its off-scale count is expected there.", "");
L.push("### Button variants by type", "");
L.push(row(["Type", "Buttons", "Variants"]), row(["---", "---", "---"]));
for (const [k, v] of Object.entries(summary.buttons.byKind)) L.push(row([k, v.count, v.variants]));
L.push("", "### Most used button variants that are not an exact Figma size", "");
L.push(row(["Type", "Classes", "Height", "Figma", "Uses", "Files", "Example"]), row(["---", "---", "---", "---", "---", "---", "---"]));
for (const g of group(sized.filter((b) => b.match !== "exact"), (b) => `${b.kind} | ${b.signature}`).slice(0, 25)) {
  const it = g.item;
  L.push(row([it.kind, `\`${it.signature}\``, it.h ? `${it.h}px` : "—", it.match === "near" ? `${it.size}: ${it.note}` : it.note || it.match, g.count, g.files, `\`${g.example}\``]));
}
L.push("", "### Files with the most non-exact buttons", "");
L.push(row(["File", "Product", "Non-exact", "Of"]), row(["---", "---", "---", "---"]));
for (const g of group(sized, (b) => b.file).map((g) => ({ ...g, bad: sized.filter((b) => b.file === g.key && b.match !== "exact").length })).sort((a, b) => b.bad - a.bad).slice(0, 15))
  L.push(row([`\`${g.key}\``, g.item.product, g.bad, g.count]));

L.push("", "## Headings (h1–h3)", "");
L.push(row(["Status", "Count"]), row(["---", "---"]));
for (const [k, v] of Object.entries(summary.headings.byStatus)) L.push(row([k, v]));
L.push("", row(["Classes", "Status", "Uses", "Files", "Example"]), row(["---", "---", "---", "---", "---"]));
for (const g of group(headings.filter((h) => !h.status.startsWith("uses")), (h) => h.signature).slice(0, 20))
  L.push(row([`\`${g.key}\``, g.item.status, g.count, g.files, `\`${g.example}\``]));

L.push("", "## Modal and card headers (padding)", "");
L.push(row(["Padding / gap", "Uses", "Files", "Example"]), row(["---", "---", "---", "---"]));
for (const g of group(headers, (h) => h.signature).slice(0, 15)) L.push(row([`\`${g.key}\``, g.count, g.files, `\`${g.example}\``]));

L.push("", "## Text inputs", "");
L.push(row(["Classes", "Uses", "Files", "Example"]), row(["---", "---", "---", "---"]));
for (const g of group(inputs, (h) => h.signature).slice(0, 15)) L.push(row([`\`${g.key}\``, g.count, g.files, `\`${g.example}\``]));

L.push("", "## Hand-typed values by file", "");
L.push(row(["File", "Product", "`x-[…]` values", "`-[#…]` colours"]), row(["---", "---", "---", "---"]));
for (const [f, r] of Object.entries(raw).sort((a, b) => b[1].arbitrary + b[1].hex - (a[1].arbitrary + a[1].hex)).slice(0, 20))
  L.push(row([`\`${f}\``, r.product, r.arbitrary, r.hex]));
L.push("");
fs.writeFileSync(WIKI, L.join("\n"));
console.log(`  wiki     ${path.relative(ROOT, WIKI)}`);

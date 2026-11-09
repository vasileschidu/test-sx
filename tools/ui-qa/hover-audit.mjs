// UI QA — hover (SX). Moves a real mouse over every interactive element and checks that it
// visibly changes (background, colour, border, shadow, underline, opacity, an icon's colour)
// and that nothing invisible sits on top of it. Static screenshots never catch broken hover.
//
// Usage: node tools/ui-qa/hover-audit.mjs --pages src/pages/dashboard/vendors.html[,…] [--scope "main"] [--max 150]
//        [--init <js file>]  (runs before every page, e.g. to seed localStorage for a demo case)
//        [--dark]  (opens pages with ?theme=dark and also flags hover states that turn light or unreadable)
import fs from "node:fs";
import { launch, settle, arg, list, BASE } from "./browser.mjs";

const PAGES = list("pages");
const SCOPE = arg("scope", "");
const MAX = Number(arg("max", "150"));
const OUT = arg("out", "tools/ui-qa/out/hover");
const DARK = process.argv.includes("--dark");
const INIT = arg("init", "") ? fs.readFileSync(arg("init", ""), "utf8") : "";
fs.mkdirSync(OUT, { recursive: true });

const SNAP = (i) => {
  const el = window.__hoverEls[i];
  const pick = (e) => { const c = getComputedStyle(e); return [c.backgroundColor, c.color, c.borderTopColor, c.boxShadow, c.textDecorationLine, c.opacity, c.outlineStyle, c.filter].join("|"); };
  const icon = el.querySelector("svg, img");
  return pick(el) + "#" + (icon ? pick(icon) : "") + "#" + [...el.children].slice(0, 3).map(pick).join(";");
};

// Dark mode: the element's effective background (first opaque ancestor) and its text contrast.
const DARK_CHECK = (i) => {
  const el = window.__hoverEls[i];
  const rgba = (s) => { const m = s.match(/[\d.]+/g) || [0, 0, 0, 0]; return { r: +m[0], g: +m[1], b: +m[2], a: m[3] === undefined ? 1 : +m[3] }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const layers = []; let n = el;
  while (n && n.nodeType === 1) { const c = rgba(getComputedStyle(n).backgroundColor); if (c.a > 0) { layers.push(c); if (c.a >= 1) break; } n = n.parentElement; }
  let bg = { r: 17, g: 24, b: 39 };
  for (const c of layers.reverse()) bg = { r: c.r * c.a + bg.r * (1 - c.a), g: c.g * c.a + bg.g * (1 - c.a), b: c.b * c.a + bg.b * (1 - c.a) };
  const fg = rgba(getComputedStyle(el).color);
  const L1 = lum(bg), L2 = lum(fg); const contrast = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
  return { bgLum: +L1.toFixed(2), contrast: +contrast.toFixed(1), hasText: !!(el.innerText || "").trim() };
};

const browser = await launch();
const findings = [];
let checked = 0;
for (const p of PAGES) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  if (INIT) await page.addInitScript(INIT);
  await page.goto(`${BASE}/${p}${DARK ? (p.includes("?") ? "&" : "?") + "theme=dark" : ""}`);
  await settle(page, 1200);
  const n = await page.evaluate(({ scope, max }) => {
    const vis = (el) => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return cs.visibility !== "hidden" && cs.display !== "none" && +cs.opacity > 0 && r.width > 4 && r.height > 4; };
    const root = (scope && [...document.querySelectorAll(scope)].find(vis)) || document.body;
    window.__hoverEls = [...root.querySelectorAll("button:not(:disabled), a[href], [role=button], [role=tab], [role=menuitem], el-select > button, label:has(input[type=checkbox]), label:has(input[type=radio])")]
      .filter(vis).filter((el) => !el.closest("[aria-hidden=true]")).slice(0, max);
    return window.__hoverEls.length;
  }, { scope: SCOPE, max: MAX });
  for (let i = 0; i < n; i++) {
    const info = await page.evaluate((i) => {
      const el = window.__hoverEls[i]; el.scrollIntoView({ block: "center" });
      const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const top = document.elementFromPoint(x, y);
      const label = (el.innerText || el.getAttribute("aria-label") || el.getAttribute("title") || el.tagName).trim().replace(/\s+/g, " ").slice(0, 40);
      return { x, y, covered: !!top && top !== el && !el.contains(top) && !top.contains(el), label, cls: el.className && String(el.className).slice(0, 60) };
    }, i);
    await page.mouse.move(5, 5); await page.waitForTimeout(60);
    const before = await page.evaluate(SNAP, i);
    await page.mouse.move(info.x, info.y); await page.waitForTimeout(160);
    const after = await page.evaluate(SNAP, i);
    checked++;
    if (DARK) {
      const d = await page.evaluate(DARK_CHECK, i);
      if (d.bgLum > 0.5) findings.push({ severity: "major", rule: "dark-light-hover", where: p, value: info.label, cls: info.cls, d });
      else if (d.hasText && d.contrast < 3) findings.push({ severity: "major", rule: "dark-low-contrast", where: p, value: info.label, cls: info.cls, d });
    }
    if (info.covered) findings.push({ severity: "major", rule: "covered", where: p, value: info.label, cls: info.cls });
    else if (before === after) findings.push({ severity: "major", rule: "no-hover", where: p, value: info.label, cls: info.cls });
  }
  await page.close();
}
await browser.close();
fs.writeFileSync(`${OUT}/hover.json`, JSON.stringify(findings, null, 1));
console.log(`hover-audit: ${checked} elements on ${PAGES.length} page(s) — no-hover ${findings.filter((f) => f.rule === "no-hover").length}, covered ${findings.filter((f) => f.rule === "covered").length}${DARK ? `, dark-light-hover ${findings.filter((f) => f.rule === "dark-light-hover").length}, dark-low-contrast ${findings.filter((f) => f.rule === "dark-low-contrast").length}` : ""}`);
for (const f of findings.slice(0, Number(arg("show", "25")))) console.log(`  ${f.rule} · ${f.where} · "${f.value}"${f.d ? " " + JSON.stringify(f.d) : ""}`);
console.log(`  report ${OUT}/hover.json`);

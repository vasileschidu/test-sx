// UI QA — hover (SX). Moves a real mouse over every interactive element and checks that it
// visibly changes (background, colour, border, shadow, underline, opacity, an icon's colour)
// and that nothing invisible sits on top of it. Static screenshots never catch broken hover.
//
// Usage: node tools/ui-qa/hover-audit.mjs --pages src/pages/dashboard/vendors.html[,…] [--scope "main"] [--max 150]
import fs from "node:fs";
import { launch, settle, arg, list, BASE } from "./browser.mjs";

const PAGES = list("pages");
const SCOPE = arg("scope", "");
const MAX = Number(arg("max", "150"));
const OUT = arg("out", "tools/ui-qa/out/hover");
fs.mkdirSync(OUT, { recursive: true });

const SNAP = (i) => {
  const el = window.__hoverEls[i];
  const pick = (e) => { const c = getComputedStyle(e); return [c.backgroundColor, c.color, c.borderTopColor, c.boxShadow, c.textDecorationLine, c.opacity, c.outlineStyle, c.filter].join("|"); };
  const icon = el.querySelector("svg, img");
  return pick(el) + "#" + (icon ? pick(icon) : "") + "#" + [...el.children].slice(0, 3).map(pick).join(";");
};

const browser = await launch();
const findings = [];
let checked = 0;
for (const p of PAGES) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`${BASE}/${p}`);
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
    if (info.covered) findings.push({ severity: "major", rule: "covered", where: p, value: info.label, cls: info.cls });
    else if (before === after) findings.push({ severity: "major", rule: "no-hover", where: p, value: info.label, cls: info.cls });
  }
  await page.close();
}
await browser.close();
fs.writeFileSync(`${OUT}/hover.json`, JSON.stringify(findings, null, 1));
console.log(`hover-audit: ${checked} elements on ${PAGES.length} page(s) — no-hover ${findings.filter((f) => f.rule === "no-hover").length}, covered ${findings.filter((f) => f.rule === "covered").length}`);
for (const f of findings.slice(0, 25)) console.log(`  ${f.rule} · ${f.where} · "${f.value}"`);
console.log(`  report ${OUT}/hover.json`);

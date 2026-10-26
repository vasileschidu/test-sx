// UI QA — pixel compare (SX). Proves a change is visually neutral (or shows exactly where it isn't).
//   1. node tools/ui-qa/pixel-compare.mjs --capture before --pages <list> [--dark]
//   2. make the change
//   3. node tools/ui-qa/pixel-compare.mjs --capture after  --pages <list> [--dark]
//   4. node tools/ui-qa/pixel-compare.mjs --compare before,after
// Diff images land next to the screenshots (diff-*.png).
import fs from "node:fs";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { launch, settle, arg, flag, list, BASE } from "./browser.mjs";

const OUT = arg("out", "tools/ui-qa/out/pixel");
fs.mkdirSync(OUT, { recursive: true });

if (arg("capture")) {
  const tag = arg("capture");
  const browser = await launch();
  for (const dark of flag("dark") ? [false, true] : [false]) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
    if (dark) await ctx.addInitScript(() => { try { localStorage.setItem("theme", "dark"); } catch (e) {} });
    const page = await ctx.newPage();
    for (const [i, p] of list("pages").entries()) {
      await page.goto(`${BASE}/${p}`);
      await settle(page, 2500);
      await page.addStyleTag({ content: "*{caret-color:transparent!important;animation:none!important;transition:none!important}" });
      await page.waitForTimeout(200);
      await page.screenshot({ path: `${OUT}/${tag}-${dark ? "d" : "l"}-${i}.png`, fullPage: true });
    }
    await ctx.close();
  }
  await browser.close();
  console.log(`captured "${tag}" into ${OUT}`);
} else if (arg("compare")) {
  const [a, b] = arg("compare").split(",");
  let changed = 0, total = 0;
  for (const f of fs.readdirSync(OUT).filter((f) => f.startsWith(a + "-"))) {
    const other = f.replace(a + "-", b + "-"); if (!fs.existsSync(`${OUT}/${other}`)) continue;
    total++;
    const x = PNG.sync.read(fs.readFileSync(`${OUT}/${f}`)), y = PNG.sync.read(fs.readFileSync(`${OUT}/${other}`));
    if (x.width !== y.width || x.height !== y.height) { changed++; console.log(`  ${f}: size ${x.width}×${x.height} → ${y.width}×${y.height}`); continue; }
    const diff = new PNG({ width: x.width, height: x.height });
    const n = pixelmatch(x.data, y.data, diff.data, x.width, x.height, { threshold: 0.05 });
    if (n) { changed++; fs.writeFileSync(`${OUT}/diff-${f}`, PNG.sync.write(diff)); console.log(`  ${f}: ${n} px differ → diff-${f}`); }
  }
  console.log(`pixel-compare: ${total - changed} of ${total} identical`);
} else {
  console.log("use --capture <tag> --pages … or --compare before,after");
}

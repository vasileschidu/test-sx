// UI QA — Figma (SX). READ-ONLY. Paste this whole file as the `code` of a use_figma call
// (figma-b, the Agile Partners login) after putting the node ids to audit in ROOTS.
// Returns counts per rule + up to 60 findings with node ids. Never mutates anything.
//
// Rules (from .claude/skills/components + design-system, SMART System library):
//  raw-control        a frame/group that looks like a control (button, input, select, checkbox, radio,
//                     toggle, badge, tag, chip, tab, modal, menu) but is not an INSTANCE of a component
//  unbound-colour     a SOLID fill or stroke with no variable binding and no paint style
//  no-text-style      a TEXT with no text style (use the Tailwind or role styles: Title/…, Description/…)
//  font-not-inter     a font other than Inter (Roboto Mono allowed on card numbers)
//  spacing-off-scale  auto-layout padding / gap not on the Tailwind spacing scale
//  spacing-unbound    (minor) padding / gap on the scale but not bound to a `spacing` variable
//  radius-off-scale   corner radius not on the Tailwind radius scale
//  not-auto-layout    a frame with 2+ children and no auto-layout (screens' overlay layers excepted)
//  clipped-content    a child cut vertically by a frame that clips content
//  fractional         x / y / width / height not whole pixels (outside instances)
//  image-fill-icon    an IMAGE fill on an icon-sized node (≤ 64 px) — icons are vector instances
const ROOTS = ["PUT:NODE-IDS-HERE"];
const SPACING = [0, 1, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96, 112, 128];
const RADIUS = [0, 2, 4, 6, 8, 12, 16, 24, 32, 9999];
const CONTROL = /\b(button|btn|input|text ?field|select|dropdown|checkbox|radio|toggle|switch|badge|tag|chip|tab|modal|dialog|menu|tooltip|pagination|breadcrumb)\b/i;

const counts = {}; const findings = [];
const add = (rule, n, detail, severity) => {
  counts[rule] = (counts[rule] || 0) + 1;
  if (findings.length < 60) findings.push({ rule, severity: severity || "major", id: n.id, name: n.name.slice(0, 50), detail });
};
const on = (v, s) => s.some((x) => Math.abs(v - x) < 0.01);
const insideInstance = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };

async function visit(n, depth) {
  if (n.visible === false) return;
  const inInst = insideInstance(n);
  if (!inInst) {
    if ((n.type === "FRAME" || n.type === "GROUP") && CONTROL.test(n.name) && depth > 0) add("raw-control", n, "should be a component instance");
    if ("x" in n && n.type !== "PAGE" && [n.x, n.y, n.width, n.height].some((v) => Math.abs(v - Math.round(v)) > 0.01)) add("fractional", n, `${n.x},${n.y} ${n.width}×${n.height}`, "minor");
    for (const key of ["fills", "strokes"]) {
      const paints = n[key];
      if (!Array.isArray(paints)) continue;
      const styled = key === "fills" ? n.fillStyleId : n.strokeStyleId;
      paints.forEach((p, i) => {
        if (p.visible === false) return;
        if (p.type === "SOLID" && !(p.boundVariables && p.boundVariables.color) && !styled) add("unbound-colour", n, `${key}[${i}]`);
        if (p.type === "IMAGE" && n.width <= 64 && n.height <= 64) add("image-fill-icon", n, `${Math.round(n.width)}×${Math.round(n.height)}`);
      });
    }
    if (n.type === "TEXT") {
      if (!n.textStyleId || n.textStyleId === figma.mixed) add("no-text-style", n, n.characters.slice(0, 30));
      const fonts = n.fontName === figma.mixed ? n.getStyledTextSegments(["fontName"]).map((s) => s.fontName) : [n.fontName];
      for (const f of fonts) if (!/^(Inter|Roboto Mono)$/.test(f.family)) { add("font-not-inter", n, f.family); break; }
    }
    if (n.type === "FRAME" || n.type === "COMPONENT") {
      if (n.layoutMode && n.layoutMode !== "NONE") {
        const bv = n.boundVariables || {};
        for (const k of ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "itemSpacing"]) {
          const v = n[k]; if (!v) continue;
          if (!on(v, SPACING)) add("spacing-off-scale", n, `${k} ${v}`);
          else if (!bv[k]) add("spacing-unbound", n, `${k} ${v}`, "minor");
        }
      } else if ("children" in n && n.children.filter((c) => c.visible !== false).length >= 2 && depth > 0) add("not-auto-layout", n, `${n.children.length} children, absolute`);
      if (typeof n.cornerRadius === "number" && n.cornerRadius && !on(n.cornerRadius, RADIUS) && n.cornerRadius < Math.min(n.width, n.height) / 2) add("radius-off-scale", n, `${n.cornerRadius}`);
      if (n.clipsContent && "children" in n) for (const c of n.children) {
        if (c.visible === false || !("y" in c) || c.layoutPositioning === "ABSOLUTE") continue;
        if (c.y + c.height > n.height + 1 && n.layoutMode !== "HORIZONTAL") { add("clipped-content", c, `cut at ${Math.round(n.height)} (child ends ${Math.round(c.y + c.height)})`); break; }
      }
    }
  }
  if ("children" in n && n.type !== "INSTANCE") for (const c of n.children) await visit(c, depth + 1);
}

for (const id of ROOTS) {
  const n = await figma.getNodeByIdAsync(id);
  if (!n) { findings.push({ rule: "missing", id }); continue; }
  let page = n; while (page.parent && page.type !== "PAGE") page = page.parent;
  if (page.type === "PAGE" && figma.currentPage !== page) await figma.setCurrentPageAsync(page);
  await visit(n, 0);
}
const major = findings.filter((f) => f.severity === "major").length;
return { roots: ROOTS, verdict: Object.keys(counts).some((r) => r !== "spacing-unbound" && r !== "fractional") ? "FAIL" : "PASS", counts, majorShown: major, findings };

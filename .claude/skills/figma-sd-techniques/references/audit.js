// Overlap audit for flow arrows. Paste together with arrows.js (needs connectorSegments).
// Returns { n, issues: ["<id> <name> -> <screens crossed>"] }. 0 issues is the bar.
async function auditArrows(page, onlyIds /* optional Set of connector ids */) {
  const screens = page.findAll(n => n.type === 'FRAME' && n.parent.type === 'SECTION' && !/Documentation/.test(n.name))
    .map(f => { const b = f.absoluteBoundingBox; return { id: f.id, n: f.name.slice(0, 30), x: b.x, y: b.y, r: b.x + b.width, bt: b.y + b.height }; });
  const screenOf = async id => {
    let n = await figma.getNodeByIdAsync(id);
    while (n && !(n.type === 'FRAME' && n.parent && n.parent.type === 'SECTION')) n = n.parent;
    return n ? n.id : null;
  };
  const issues = []; let n = 0;
  for (const c of page.findAllWithCriteria({ types: ['CONNECTOR'] })) {
    if (onlyIds && !onlyIds.has(c.id)) continue;
    n++;
    const sa = await screenOf(c.connectorStart.endpointNodeId), sb = await screenOf(c.connectorEnd.endpointNodeId);
    const segs = await connectorSegments(c);
    const hits = new Set();
    for (const s of segs) for (const f of screens) {
      if (f.id === sa || f.id === sb) continue;
      const hit = s[0] === 'H'
        ? (s[1] > f.y + 2 && s[1] < f.bt - 2 && s[3] > f.x + 2 && s[2] < f.r - 2)
        : (s[1] > f.x + 2 && s[1] < f.r - 2 && s[3] > f.y + 2 && s[2] < f.bt - 2);
      if (hit) hits.add(f.n);
    }
    if (hits.size) issues.push(c.id + ' ' + c.name + ' -> ' + [...hits].join('; '));
  }
  return { n, issues };
}

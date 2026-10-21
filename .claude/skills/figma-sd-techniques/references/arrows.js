// Paste into a use_figma script. Requires: await figma.setCurrentPageAsync(page) first.

// Point of an endpoint in absolute coordinates.
function endpointPoint(node, ep) {
  const b = node.absoluteBoundingBox;
  if (ep.position) return [b.x + ep.position.x, b.y + ep.position.y];
  switch (ep.magnet) {
    case 'TOP': return [b.x + b.width / 2, b.y];
    case 'BOTTOM': return [b.x + b.width / 2, b.y + b.height];
    case 'LEFT': return [b.x, b.y + b.height / 2];
    case 'RIGHT': return [b.x + b.width, b.y + b.height / 2];
    default: return [b.x + b.width / 2, b.y + b.height / 2];
  }
}

// Real stroke segments of a connector in absolute coordinates: [['H', y, x1, x2] | ['V', x, y1, y2]].
async function connectorSegments(c) {
  const P = endpointPoint(await figma.getNodeByIdAsync(c.connectorStart.endpointNodeId), c.connectorStart);
  const svg = await c.exportAsync({ format: 'SVG_STRING' });
  const d = svg.match(/<path[^>]* d="([^"]+)"/)[1];
  const first = d.split('Z')[0].match(/-?[\d.]+/g).map(Number);
  const xs = first.filter((_, k) => k % 2 === 0), ys = first.filter((_, k) => k % 2 === 1);
  const mag = c.connectorStart.magnet; let tx, ty;
  if (mag === 'LEFT') { tx = Math.max(...xs); ty = (Math.min(...ys) + Math.max(...ys)) / 2; }
  else if (mag === 'RIGHT') { tx = Math.min(...xs); ty = (Math.min(...ys) + Math.max(...ys)) / 2; }
  else if (mag === 'BOTTOM') { tx = (Math.min(...xs) + Math.max(...xs)) / 2; ty = Math.min(...ys); }
  else { tx = (Math.min(...xs) + Math.max(...xs)) / 2; ty = Math.max(...ys); }
  const ox = P[0] - tx, oy = P[1] - ty;
  const toks = d.match(/[MLHVCZ]|-?[\d.]+/gi); let i = 0, x = 0, y = 0, cmd = ''; const raw = [];
  while (i < toks.length) {
    if (/[A-Z]/i.test(toks[i])) cmd = toks[i++];
    if (cmd === 'M' || cmd === 'L') { x = +toks[i++]; y = +toks[i++]; }
    else if (cmd === 'H') { const nx = +toks[i++]; if (Math.abs(nx - x) > 40) raw.push(['H', y + oy, Math.min(x, nx) + ox, Math.max(x, nx) + ox]); x = nx; }
    else if (cmd === 'V') { const ny = +toks[i++]; if (Math.abs(ny - y) > 40) raw.push(['V', x + ox, Math.min(y, ny) + oy, Math.max(y, ny) + oy]); y = ny; }
    else if (cmd === 'C') { i += 4; x = +toks[i++]; y = +toks[i++]; } else i++;
  }
  // Keep only the paired edges of the real stroke; unpaired runs are phantom subpath jumps.
  return raw.filter((s, k) => raw.some((o, j) => j !== k && o[0] === s[0] &&
    Math.abs(o[1] - s[1]) > 0.5 && Math.abs(o[1] - s[1]) < 4 &&
    Math.abs(o[2] - s[2]) < 30 && Math.abs(o[3] - s[3]) < 30));
}

// Bend point W = [lane x, approach y] of an existing connector, read from its real route.
async function deriveW(c) {
  const P = endpointPoint(await figma.getNodeByIdAsync(c.connectorStart.endpointNodeId), c.connectorStart);
  const T = endpointPoint(await figma.getNodeByIdAsync(c.connectorEnd.endpointNodeId), c.connectorEnd);
  const segs = await connectorSegments(c);
  const lanes = segs.filter(s => s[0] === 'V' && Math.abs(s[1] - P[0]) > 6).sort((a, b) => (b[3] - b[2]) - (a[3] - a[2]));
  const appr = segs.filter(s => s[0] === 'H' && Math.abs(s[1] - T[1]) > 6);
  const apprP = appr.filter(h => h[2] <= P[0] + 8 && h[3] >= P[0] - 8);
  const Wx = lanes.length ? lanes[0][1] : P[0];
  const Wy = apprP.length ? apprP[0][1] : (appr.length ? appr[0][1] : T[1]);
  return [Math.round(Wx), Math.round(Wy)];
}

// Find the editor-routed source connector ("Request Code" in the email subsection).
function findArrowSource(page) {
  return page.findAllWithCriteria({ types: ['CONNECTOR'] })
    .find(c => c.name === 'Request Code' && /Email/.test(c.parent.name));
}

// Build an attached elbow arrow with bend point W.
// start = target endpoint ({endpointNodeId, magnet|position}); end = trigger endpoint.
async function cloneArrow({ src, srcW, parent, W, start, end, label, name }) {
  const pb = parent.type === 'PAGE' ? { x: 0, y: 0 } : parent.absoluteBoundingBox;
  const sp = src.parent.type === 'PAGE' ? { x: 0, y: 0 } : src.parent.absoluteBoundingBox;
  await figma.loadFontAsync(src.text.fontName);
  const tmp = figma.createFrame(); parent.appendChild(tmp);
  tmp.fills = []; tmp.clipsContent = false; tmp.resize(10, 10);
  tmp.x = W[0] - srcW[0] + sp.x - pb.x; tmp.y = W[1] - srcW[1] + sp.y - pb.y;
  const c = src.clone(); tmp.appendChild(c); c.x = src.x; c.y = src.y;
  c.connectorStart = start; c.connectorEnd = end;
  parent.appendChild(c); tmp.remove();
  c.text.characters = label; c.name = name || label;
  return c;
}

/* Example:
const page = await figma.getNodeByIdAsync('867:9754'); await figma.setCurrentPageAsync(page);
const src = findArrowSource(page); const srcW = await deriveW(src);
const c = await cloneArrow({ src, srcW, parent: someSection, W: [laneX, approachY],
  start: { endpointNodeId: targetContentId, magnet: 'TOP' },
  end:   { endpointNodeId: buttonId, position: { x: buttonWidth, y: buttonHeight / 2 } },
  label: 'Next' });
// then run the audit (audit.js) and return ids
*/

// Diff two snapshot folders made by snapshot.mjs (before = --a, after = --b).
//
// Usage:
//   node compare.mjs --a <before dir> --b <after dir> --out <report dir> [--min 150] [--delta 24]
//
// A shot counts as changed when more than --min pixels differ by more than --delta in any
// channel (below that is anti-aliasing noise). Writes <out>/<shot>.diff.png (after, faded,
// with changed pixels in red), <out>/report.html (before | after | diff for every changed
// shot) and <out>/summary.json, and prints the changed shots, largest first.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:net';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
  return acc;
}, []));
if (!args.a || !args.b || !args.out) { console.error('usage: --a <dir> --b <dir> --out <dir>'); process.exit(2); }
const A = resolve(args.a), B = resolve(args.b), OUT = resolve(args.out);
const MIN = +(args.min || 150), DELTA = +(args.delta || 24);
mkdirSync(OUT, { recursive: true });

const pngs = d => new Set(readdirSync(d).filter(f => f.endsWith('.png') && !f.endsWith('.diff.png')));
const inA = pngs(A), inB = pngs(B);
const names = [...new Set([...inA, ...inB])].sort();
const manifest = d => { try { return JSON.parse(readFileSync(join(d, 'manifest.json'), 'utf8')).shots || {}; } catch { return {}; } };
const mA = manifest(A), mB = manifest(B);

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = await new Promise(r => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const profile = mkdtempSync(join(tmpdir(), 'sd-diff-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Runs in the page: decode both PNGs on canvases and count / paint the changed pixels.
const DIFF = `async (a, b, delta) => {
  const load = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
  const [ia, ib] = await Promise.all([load(a), load(b)]);
  const w = Math.max(ia.width, ib.width), h = Math.max(ia.height, ib.height);
  const px = img => { const c = new OffscreenCanvas(w, h), x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h).data; };
  const pa = px(ia), pb = px(ib);
  const c = new OffscreenCanvas(w, h), x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.globalAlpha = 0.25; x.drawImage(ib, 0, 0); x.globalAlpha = 1;
  const out = x.getImageData(0, 0, w, h), o = out.data;
  const near = (p, i, q, j) => Math.abs(p[i] - q[j]) <= delta && Math.abs(p[i + 1] - q[j + 1]) <= delta && Math.abs(p[i + 2] - q[j + 2]) <= delta;
  // Text anti-aliasing differs between runs by a pixel: a pixel only counts when no pixel within
  // 1px in the other image matches it, in both directions. Real changes (colour, size, moves) still show.
  const shifted = (p, q, i) => { const x0 = (i / 4) % w, y0 = (i / 4 - x0) / w;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = x0 + dx, y = y0 + dy; if (x < 0 || y < 0 || x >= w || y >= h) continue;
      if (near(p, i, q, (y * w + x) * 4)) return true;
    } return false; };
  // Sub-pixel text positioning also changes the grey levels of glyph edges; averaged over 2x2
  // blocks that cancels out, while a real change still differs. A pixel must fail both tests.
  const bw = Math.ceil(w / 2), bh = Math.ceil(h / 2);
  const blocks = p => { const m = new Float32Array(bw * bh * 3), c = new Uint8Array(bw * bh);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const b = (y >> 1) * bw + (x >> 1), i = (y * w + x) * 4;
      m[b * 3] += p[i]; m[b * 3 + 1] += p[i + 1]; m[b * 3 + 2] += p[i + 2]; c[b]++; }
    for (let b = 0; b < c.length; b++) { m[b * 3] /= c[b]; m[b * 3 + 1] /= c[b]; m[b * 3 + 2] /= c[b]; }
    return m; };
  const ba = blocks(pa), bb = blocks(pb);
  const blockChanged = i => { const x = (i / 4) % w, y = (i / 4 - x) / w, b = ((y >> 1) * bw + (x >> 1)) * 3;
    return Math.abs(ba[b] - bb[b]) > delta || Math.abs(ba[b + 1] - bb[b + 1]) > delta || Math.abs(ba[b + 2] - bb[b + 2]) > delta; };
  let n = 0, x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let i = 0; i < pa.length; i += 4) {
    if (!near(pa, i, pb, i) && !(shifted(pa, pb, i) && shifted(pb, pa, i)) && blockChanged(i)) {
      n++; o[i] = 255; o[i + 1] = 0; o[i + 2] = 0; o[i + 3] = 255;
      const p = i / 4, px_ = p % w, py = (p - px_) / w;
      if (px_ < x0) x0 = px_; if (px_ > x1) x1 = px_; if (py < y0) y0 = py; if (py > y1) y1 = py;
    }
  }
  let png = null;
  if (n) { x.putImageData(out, 0, 0); const blob = await c.convertToBlob({ type: 'image/png' }); png = await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); }); }
  return { n, w, h, sizeA: [ia.width, ia.height], sizeB: [ib.width, ib.height], box: n ? [x0, y0, x1 - x0 + 1, y1 - y0 + 1] : null, png };
}`;

const rows = [];
try {
  let targets = [];
  for (let i = 0; i < 60 && !targets.length; i++) {
    try { targets = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).filter(t => t.type === 'page'); } catch { /* not up yet */ }
    if (!targets.length) await sleep(200);
  }
  const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
  await new Promise(r => { ws.onopen = r; });
  let id = 0; const pending = {};
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pending[d.id]) { pending[d.id](d.result || d.error); delete pending[d.id]; } };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });

  for (const name of names) {
    const key = name.replace(/\.png$/, '');
    const note = [mA[key]?.redirected && 'before redirected', mB[key]?.redirected && 'after redirected',
      mB[key]?.errors?.length && 'JS error after: ' + mB[key].errors[0], mB[key]?.missing?.length && '404 after: ' + mB[key].missing.join(' ')].filter(Boolean).join(' · ');
    if (!inA.has(name) || !inB.has(name)) { rows.push({ key, status: inA.has(name) ? 'only before' : 'only after', note }); continue; }
    const uri = d => 'data:image/png;base64,' + readFileSync(join(d, name)).toString('base64');
    const r = (await send('Runtime.evaluate', { expression: `(${DIFF})(${JSON.stringify(uri(A))}, ${JSON.stringify(uri(B))}, ${DELTA})`, awaitPromise: true, returnByValue: true })).result?.value;
    if (!r) { rows.push({ key, status: 'error', note: 'diff failed' }); continue; }
    const changed = r.n > MIN || r.sizeA.join() !== r.sizeB.join();
    if (changed && r.png) writeFileSync(join(OUT, key + '.diff.png'), Buffer.from(r.png.split(',')[1], 'base64'));
    rows.push({ key, status: changed ? 'changed' : 'same', pixels: r.n, pct: +(100 * r.n / (r.w * r.h)).toFixed(2), box: r.box,
      size: r.sizeA.join() !== r.sizeB.join() ? `${r.sizeA.join('×')} → ${r.sizeB.join('×')}` : undefined, note: note || undefined });
  }
  ws.close();
} finally {
  chrome.kill();
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ }
}

const changed = rows.filter(r => r.status !== 'same').sort((x, y) => (y.pixels || 1e9) - (x.pixels || 1e9));
writeFileSync(join(OUT, 'summary.json'), JSON.stringify({ before: A, after: B, total: rows.length, changed }, null, 1));

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const img = (d, f) => existsSync(join(d, f)) ? `<img src="file://${esc(join(d, f))}">` : '<p>—</p>';
writeFileSync(join(OUT, 'report.html'), `<!doctype html><meta charset="utf-8"><title>SD regression</title>
<style>body{font:14px system-ui;margin:24px;color:#111}h2{font-size:16px;margin:32px 0 8px}.g{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;align-items:start}
.g img{width:100%;border:1px solid #ddd}.m{color:#666}</style>
<h1>SD regression — ${changed.length} of ${rows.length} shots changed</h1><p class="m">Before: ${esc(A)}<br>After: ${esc(B)}</p>
${changed.map(r => `<h2>${esc(r.key)} <span class="m">— ${r.status}${r.pct != null ? `, ${r.pct}% (${r.pixels} px)` : ''}${r.size ? ', size ' + r.size : ''}${r.note ? ' · ' + esc(r.note) : ''}</span></h2>
<div class="g"><div><p class="m">Before</p>${img(A, r.key + '.png')}</div><div><p class="m">After</p>${img(B, r.key + '.png')}</div><div><p class="m">Diff</p>${img(OUT, r.key + '.diff.png')}</div></div>`).join('')}`);

console.log(`${changed.length} of ${rows.length} shots changed → ${join(OUT, 'report.html')}`);
for (const r of changed) console.log(`  ${r.key.padEnd(38)} ${r.status}${r.pct != null ? ` ${r.pct}%` : ''}${r.box ? ` box ${r.box.join(',')}` : ''}${r.size ? ` size ${r.size}` : ''}${r.note ? ' · ' + r.note : ''}`);

// Screenshot every SD onboarding state (pages + dialogs) at phone / tablet / desktop, so two
// snapshots (before / after a change) can be diffed with compare.mjs.
//
// Usage:
//   node snapshot.mjs --out <dir> [--base http://127.0.0.1:8091] [--states states.json]
//                     [--widths 375,768,1280] [--only id,id|page.html] [--jobs 4]
//
// Each shot gets a fresh tab and cleared storage, then the state's seed (flow) and preset,
// so shots don't leak state into each other. Time, Math.random and animations are pinned
// so an unchanged page renders the same pixels twice. Writes <out>/<id>@<w>.png and
// <out>/manifest.json (redirects, 404s and JS errors per shot).
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
  return acc;
}, []));
if (!args.out) { console.error('missing --out'); process.exit(2); }
const BASE = (args.base || 'http://127.0.0.1:8091').replace(/\/$/, '');
const SPEC = JSON.parse(readFileSync(args.states || join(HERE, '..', 'states.json'), 'utf8'));
const HEIGHTS = { 375: 812, 768: 1024, 1280: 900 };
const widths = String(args.widths || '375,768,1280').split(',').map(Number);
const only = args.only ? String(args.only).split(',') : null;
const JOBS = +(args.jobs || 4);
mkdirSync(args.out, { recursive: true });

const states = SPEC.states.filter(s => !only || only.some(o => o === s.id || s.path.endsWith('/' + o)));
const shots = states.flatMap(s => (s.widths || widths).filter(w => widths.includes(w)).map(w => ({ s, w })));

// --- parent: split the shots over --jobs child processes, then merge their manifests ---
if (!args.shard) {
  const t0 = Date.now();
  const n = Math.max(1, Math.min(JOBS, shots.length));
  const self = fileURLToPath(import.meta.url);
  const pass = process.argv.slice(2).filter((a, i, all) => a !== '--jobs' && all[i - 1] !== '--jobs');
  await Promise.all(Array.from({ length: n }, (_, k) => new Promise(r => {
    const c = spawn(process.execPath, [self, ...pass, '--shard', `${k}/${n}`], { stdio: ['ignore', 'inherit', 'inherit'] });
    c.on('exit', r);
  })));
  const manifest = {};
  for (let k = 0; k < n; k++) {
    const f = join(args.out, `.manifest-${k}.json`);
    if (existsSync(f)) { Object.assign(manifest, JSON.parse(readFileSync(f, 'utf8'))); rmSync(f); }
  }
  writeFileSync(join(args.out, 'manifest.json'), JSON.stringify({ base: BASE, widths, shots: manifest }, null, 1));
  const bad = Object.entries(manifest).filter(([, m]) => m.redirected || m.missing?.length || m.errors?.length);
  console.log(`${Object.keys(manifest).length} shots in ${Math.round((Date.now() - t0) / 1000)}s → ${args.out}`);
  for (const [k, m] of bad) console.log(`  ! ${k}: ${[m.redirected && 'redirected to ' + m.redirected, m.missing?.length && '404 ' + m.missing.join(' '), m.errors?.length && 'JS ' + m.errors[0]].filter(Boolean).join(' · ')}`);
  process.exit(0);
}

// --- child: render its share of the shots in one Chrome ---
const [k, n] = String(args.shard).split('/').map(Number);
const mine = shots.filter((_, i) => i % n === k);
const PIN = `(() => {
  // Frozen clock and a constant Math.random: async scripts call random() a different number of
  // times per run, so a seeded sequence still gave different receipt IDs. No SD code loops on it.
  const R = Date, FIXED = new R('2026-11-01T10:00:00').getTime();
  class D extends R { constructor(...a) { if (a.length) super(...a); else super(FIXED); } static now() { return FIXED; } }
  window.Date = D;
  Math.random = () => 0.5;
  const css = '*,*::before,*::after{animation-duration:1ms!important;animation-delay:0s!important;animation-iteration-count:1!important;transition-duration:1ms!important;transition-delay:0s!important;caret-color:transparent!important}';
  const add = () => { const st = document.createElement('style'); st.textContent = css; (document.head || document.documentElement).appendChild(st); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
})();`;

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = await new Promise(r => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const profile = mkdtempSync(join(tmpdir(), 'sd-snap-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--font-render-hinting=none',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const http = async (path, method = 'GET') => (await fetch(`http://127.0.0.1:${port}${path}`, { method })).json();

const preset = v => (v && SPEC.presets?.pre?.[v]) || v;
const seedUrl = flow => BASE + (SPEC.presets?.seed?.[flow || 'us'] || SPEC.presets.seed.us);
const out = {};

try {
  for (let i = 0; i < 60; i++) { try { await http('/json/version'); break; } catch { await sleep(200); } }
  for (const { s, w } of mine) {
    const key = `${s.id}@${w}`;
    const tab = await http('/json/new?about:blank', 'PUT');
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise(r => { ws.onopen = r; });
    let id = 0; const pending = {}; const errors = []; const missing = []; const inflight = new Set();
    ws.onmessage = m => {
      const d = JSON.parse(m.data);
      if (d.method === 'Network.requestWillBeSent') inflight.add(d.params.requestId);
      if (d.method === 'Network.loadingFinished' || d.method === 'Network.loadingFailed') inflight.delete(d.params.requestId);
      if (d.id && pending[d.id]) { pending[d.id](d.result || d.error); delete pending[d.id]; }
      if (d.method === 'Runtime.exceptionThrown') errors.push((d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).split('\n')[0]);
      if (d.method === 'Network.responseReceived' && d.params.response.status >= 400 && !d.params.response.url.endsWith('/favicon.ico')) missing.push(d.params.response.url.replace(BASE, ''));
    };
    const send = (method, params = {}) => new Promise(r => { const i = ++id; pending[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
    const evaluate = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;
    // After the fixed wait, also wait (max 8s) until the network is idle and images and fonts are in,
    // or a slow image is captured half-loaded and shows up as a false change.
    const settle = async () => {
      for (let i = 0, quiet = 0; i < 40 && quiet < 5; i++) {
        const ready = await evaluate("document.readyState==='complete'&&document.fonts.status==='loaded'&&[...document.images].every(i=>i.complete)");
        quiet = ready && !inflight.size ? quiet + 1 : 0;
        await sleep(200);
      }
    };
    try {
      await send('Storage.clearDataForOrigin', { origin: BASE, storageTypes: 'all' });
      await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
      await send('Page.addScriptToEvaluateOnNewDocument', { source: PIN });
      const H = HEIGHTS[w] || 900;
      await send('Emulation.setDeviceMetricsOverride', { width: w, height: H, deviceScaleFactor: 1, mobile: w < 1024 });
      await send('Page.navigate', { url: seedUrl(s.flow) }); await sleep(3000);
      if (s.pre) { await evaluate(preset(s.pre)); await sleep(300); }
      errors.length = 0; missing.length = 0;
      await send('Page.navigate', { url: BASE + s.path }); await sleep(s.wait || 5000); await settle();
      const landed = await evaluate('location.pathname');
      for (const step of s.steps || []) {
        if (step.click) await evaluate(`(document.querySelector(${JSON.stringify(step.click)})||{click(){}}).click()`);
        if (step.eval) await evaluate(step.eval);
        await sleep(step.wait || 1200);
      }
      if ((s.steps || []).length) await settle();
      // Dialogs are screenshotted at the viewport; pages at full height (capped).
      if (s.full !== false && !(s.steps || []).length) {
        const h = Math.min(6000, await evaluate('document.documentElement.scrollHeight'));
        if (h > H) { await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 1024 }); await sleep(400); await settle(); }
      }
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(join(args.out, key + '.png'), Buffer.from(shot.data, 'base64'));
      out[key] = { redirected: landed !== new URL(BASE + s.path).pathname ? landed : undefined, missing: [...new Set(missing)], errors: [...new Set(errors)] };
    } catch (e) {
      out[key] = { errors: ['snapshot failed: ' + e.message] };
    } finally {
      ws.close();
      try { await http('/json/close/' + tab.id); } catch { /* already gone */ }
    }
  }
} finally {
  writeFileSync(join(args.out, `.manifest-${k}.json`), JSON.stringify(out));
  chrome.kill();
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ }
}

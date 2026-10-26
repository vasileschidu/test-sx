// Render a sandbox page at an exact viewport (true phone widths), optionally click/run JS,
// then save a screenshot and/or print a JSON measurement.
//
// Usage:
//   node render.mjs --url <url> [--w 375] [--h 812] [--out shot.png]
//                   [--click "<css selector>"] [--eval "<js expression returning JSON-able>"]
//                   [--wait 6000] [--full] [--element "<selector>"]
//                   [--seed <entry url>] [--pre "<js run on the seed page>"]
//
// `--window-size` in headless Chrome cannot go below ~500px, so this uses the DevTools
// protocol (Emulation.setDeviceMetricsOverride). Each run gets its own free port and
// profile, so several runs can go in parallel (keep it to about 3 at a time on a busy machine).
// The final path is checked: a redirect away from --url is reported on stderr.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
  return acc;
}, []));
if (!args.url) { console.error('missing --url'); process.exit(2); }
const W = +(args.w || 375), H = +(args.h || 812), WAIT = +(args.wait || 6000);

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
// Ask the OS for a free port so parallel runs never attach to each other's Chrome.
const port = await new Promise(r => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const profile = mkdtempSync(join(tmpdir(), 'sd-render-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

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
  const evaluate = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;

  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 1024 });
  await send('Page.enable');
  // --seed <url>: open this page first (e.g. index.html?flow=multi-party) so the demo
  // state is stored in this run's profile before the target page loads.
  if (args.seed) { await send('Page.navigate', { url: args.seed }); await sleep(3500); }
  // --pre <js>: runs on the seed page, e.g. SDOnboardingContext.saveState({...}) so summary
  // and submitted pages have the data they need instead of redirecting.
  if (args.pre) { await evaluate(args.pre); await sleep(300); }
  await send('Page.navigate', { url: args.url });
  await sleep(WAIT);
  const landed = await evaluate('location.pathname');
  const wanted = new URL(args.url).pathname;
  if (landed !== wanted) console.error(`REDIRECTED: asked for ${wanted}, landed on ${landed}`);
  if (args.click) { await evaluate(`(document.querySelector(${JSON.stringify(args.click)})||{click(){}}).click()`); await sleep(800); }
  if (args.eval) { const v = await evaluate(args.eval); console.log(typeof v === 'string' ? v : JSON.stringify(v)); }
  if (args.out) {
    const params = { format: 'png' };
    if (args.element) {
      // Capture just one element (padded by 16px), at 2x for close-ups.
      const r = await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(args.element)}); if(!e) return null; e.scrollIntoView({block:'center'}); const b=e.getBoundingClientRect(); return {x:b.x+scrollX-16,y:b.y+scrollY-16,width:b.width+32,height:b.height+32};})()`);
      if (r) params.clip = { ...r, scale: 2 };
    }
    if (args.full) {
      const h = await evaluate('document.documentElement.scrollHeight');
      await send('Emulation.setDeviceMetricsOverride', { width: W, height: h, deviceScaleFactor: 1, mobile: W < 1024 });
      await sleep(300);
    }
    const shot = await send('Page.captureScreenshot', params);
    writeFileSync(args.out, Buffer.from(shot.data, 'base64'));
  }
  ws.close();
} finally {
  chrome.kill();
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ }
}

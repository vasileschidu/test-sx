// Which changes reach SMART Disburse? Lists commits (by colleagues, or one given commit, or my
// uncommitted work) that touch SD pages, SD scripts or shared files the SD pages load, and (with
// --visual) renders the affected SD states before / after and diffs them.
//
// Usage (from the repo root):
//   node changes.mjs                       # commits on origin/main that HEAD doesn't have yet
//   node changes.mjs --ref origin/foo      # another branch
//   node changes.mjs --since "14 days"     # commits by others already in HEAD (e.g. "what did Alina do")
//   node changes.mjs --author alina        # only that author (name or email, substring)
//   node changes.mjs --commit 8401e41      # one commit (anyone's); with --visual: its parent vs it
//   node changes.mjs --local               # my uncommitted changes; with --visual: HEAD vs working tree
//   node changes.mjs --visual --tmp <scratchpad dir> [--widths 375,768,1280] [--all]
//   --no-fetch skips `git fetch origin`.
//
// --visual: worktree A = HEAD, worktree B = HEAD + the ref merged in (not committed); with --commit,
// A = its parent and B = the commit; with --local, A = HEAD and B = this working tree. Both are served and snapshotted; uncommitted work is not involved.
import { execSync, spawn } from 'node:child_process';
import { readFileSync, readdirSync, existsSync, symlinkSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname, resolve, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
  return acc;
}, []));
const ROOT = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
const git = (cmd, cwd = ROOT) => execSync('git ' + cmd, { cwd, encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const REF = args.ref || 'origin/main';
const ME = git('config user.email');
const PAGES_DIR = 'src/pages/onboarding';

if (!args['no-fetch']) { try { git('fetch origin --quiet'); } catch (e) { console.error('git fetch failed: ' + e.message.split('\n')[0]); } }

// --- the SD file set: onboarding pages + every local file they load (one level into SD scripts) ---
const loads = new Map(); // repo path -> Set(page)
const add = (file, page) => { if (!loads.has(file)) loads.set(file, new Set()); loads.get(file).add(page); };
const refsIn = (text, fromDir) => [...text.matchAll(/(?:src|href)=["']([^"'#]+)["']|["']((?:\.\.\/|\/)[^"'\s]+\.(?:js|css|svg|png|json))(?:\?[^"']*)?["']/g)]
  .map(m => (m[1] || m[2]).split('?')[0])
  .filter(u => !/^(https?:|data:|mailto:|tel:|javascript:)/.test(u) && /\.\w+$/.test(u))
  .map(u => u.startsWith('/') ? u.slice(1) : posix.normalize(posix.join(fromDir, u)))
  .filter(p => !p.startsWith('..'));
for (const f of readdirSync(join(ROOT, PAGES_DIR)).filter(f => f.endsWith('.html'))) {
  const page = posix.join(PAGES_DIR, f);
  add(page, page);
  // Links to other pages (.html) are navigation, not something this page loads.
  for (const r of refsIn(readFileSync(join(ROOT, page), 'utf8'), PAGES_DIR).filter(r => !r.endsWith('.html'))) {
    add(r, page);
    if (r.endsWith('.js') && existsSync(join(ROOT, r))) for (const r2 of refsIn(readFileSync(join(ROOT, r), 'utf8'), PAGES_DIR)) add(r2, page);
  }
}
// A file the dashboard (or any non-SD page) also loads is SHARED: report it, the owner changes it.
const elsewhere = new Set();
const walk = d => readdirSync(join(ROOT, d), { withFileTypes: true }).flatMap(e => e.isDirectory()
  ? (/^(node_modules|\.git|\.claude|wiki)$/.test(e.name) || posix.join(d, e.name) === PAGES_DIR ? [] : walk(posix.join(d, e.name)))
  : e.name.endsWith('.html') ? [posix.join(d, e.name)] : []);
for (const page of walk('.').map(p => p.replace(/^\.\//, ''))) for (const r of refsIn(readFileSync(join(ROOT, page), 'utf8'), posix.dirname(page))) elsewhere.add(r);
const sdOwned = p => p.startsWith(PAGES_DIR + '/') || !elsewhere.has(p);

// --- commits by others that touch the set ---
const range = args.commit ? `-1 ${args.commit}` : args.since ? `--since="${args.since}" HEAD` : `HEAD..${REF}`;
const log = git(`log --no-merges --date=short --format=%H%x09%an%x09%ae%x09%ad%x09%s ${range}`);
const commits = (log ? log.split('\n') : []).map(l => { const [hash, name, email, date, subject] = l.split('\t'); return { hash, name, email, date, subject }; })
  .filter(c => (args.commit || c.email !== ME) && (!args.author || (c.name + c.email).toLowerCase().includes(String(args.author).toLowerCase())));

const hits = [];
if (args.local) {
  commits.length = 0;
  const files = git('status --porcelain --untracked-files=all').split('\n').filter(Boolean).map(l => l.slice(3).split(' -> ').pop()).filter(f => !f.startsWith('.claude/'));
  const sd = files.filter(f => loads.has(f));
  commits.push({});
  if (sd.length) hits.push({ hash: 'working', date: 'now', name: 'me', subject: 'uncommitted changes', files: sd, total: files.length });
}
for (const c of commits.filter(c => c.hash)) {
  const files = git(`show --name-only --format= ${c.hash}`).split('\n').filter(Boolean);
  const sd = files.filter(f => loads.has(f));
  if (sd.length) hits.push({ ...c, files: sd, total: files.length });
}

const label = args.local ? 'uncommitted' : args.commit ? 'the given commit' : args.since ? `already in HEAD, since ${args.since}` : `on ${REF}, not yet in HEAD`;
console.log(args.local ? `Uncommitted changes ${hits.length ? 'reach' : 'do not reach'} SD.\n` : args.commit ? `Commit ${args.commit} ${hits.length ? 'reaches' : 'does not reach'} SD.\n` : `${hits.length} of ${commits.length} commits by others (${label}) reach SD.\n`);
const touched = new Set();
for (const c of hits) {
  console.log(`${c.hash.slice(0, 7)} ${c.date} ${c.name} — ${c.subject} (${c.total} files)`);
  c.files.forEach(f => touched.add(f));
  const pages = c.files.filter(f => f.startsWith(PAGES_DIR + '/')).map(f => f.split('/').pop());
  if (pages.length) console.log(`    SD     ${pages.length} page${pages.length > 1 ? 's' : ''}: ${pages.length > 8 ? pages.slice(0, 8).join(', ') + ', …' : pages.join(', ')}`);
  for (const f of c.files.filter(f => !f.startsWith(PAGES_DIR + '/'))) {
    const n = loads.get(f).size;
    console.log(`    ${sdOwned(f) ? 'SD    ' : 'SHARED'} ${f}  ← loaded by ${n} SD page${n > 1 ? 's' : ''}`);
  }
}
const affectedPages = new Set([...touched].flatMap(f => [...loads.get(f)]));
if (hits.length) console.log(`\nSD pages affected: ${affectedPages.size} — ${[...affectedPages].map(p => p.split('/').pop()).join(', ')}`);

if (!args.visual) process.exit(0);
if (args.since) { console.error('\n--visual needs the default range mode or --commit.'); process.exit(1); }
if (!hits.length) { console.log('Nothing to render.'); process.exit(0); }

// --- visual: worktree A = HEAD, B = HEAD + REF merged; serve, snapshot, compare ---
const TMP = resolve(args.tmp || join(ROOT, '..', '.sd-changes'));
const A = join(TMP, 'wt-before'), B = args.local ? ROOT : join(TMP, 'wt-after');
const cleanup = () => { for (const d of [A, B].filter(d => d !== ROOT)) { try { git(`worktree remove --force "${d}"`); } catch { /* not there */ } } };
mkdirSync(TMP, { recursive: true }); cleanup();
for (const d of ['shots-before', 'shots-after', 'diff']) rmSync(join(TMP, d), { recursive: true, force: true });
git(`worktree add --detach "${A}" ${args.commit ? args.commit + '~1' : 'HEAD'}`);
if (!args.local) git(`worktree add --detach "${B}" ${args.commit || 'HEAD'}`);
try {
  if (!args.commit && !args.local) try { git(`merge --no-commit --no-ff ${REF}`, B); } catch {
    const conflicts = git('diff --name-only --diff-filter=U', B);
    console.log(`\nMerging ${REF} into HEAD conflicts in:\n  ${conflicts.split('\n').join('\n  ')}\nResolve with the owner before taking it in; no render done.`);
    process.exit(1);
  }
  for (const d of [A, B]) if (existsSync(join(ROOT, 'node_modules')) && !existsSync(join(d, 'node_modules'))) symlinkSync(join(ROOT, 'node_modules'), join(d, 'node_modules'));

  const freePort = () => new Promise(r => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
  const serve = join(ROOT, '.claude/skills/sandbox-render/scripts/serve.py');
  const [pa, pb] = [await freePort(), await freePort()];
  const servers = [spawn('python3', [serve, A, String(pa)], { stdio: 'ignore' }), spawn('python3', [serve, B, String(pb)], { stdio: 'ignore' })];
  try {
    await new Promise(r => setTimeout(r, 800));
    const states = JSON.parse(readFileSync(join(HERE, '..', 'states.json'), 'utf8')).states;
    const only = args.all ? null : states.filter(s => affectedPages.has(s.path.split('?')[0].slice(1))).map(s => s.id);
    const run = (base, out) => execSync(`node "${join(HERE, 'snapshot.mjs')}" --base http://127.0.0.1:${base} --out "${out}"` +
      (args.widths ? ` --widths ${args.widths}` : '') + (only ? ` --only ${only.join(',')}` : ''), { stdio: 'inherit' });
    console.log(`\nRendering ${only ? only.length : 'all'} SD states before / after…`);
    run(pa, join(TMP, 'shots-before')); run(pb, join(TMP, 'shots-after'));
    execSync(`node "${join(HERE, 'compare.mjs')}" --a "${join(TMP, 'shots-before')}" --b "${join(TMP, 'shots-after')}" --out "${join(TMP, 'diff')}"`, { stdio: 'inherit' });
  } finally { servers.forEach(s => s.kill()); }
} finally {
  cleanup();
  try { git('worktree prune'); } catch { /* ignore */ }
}

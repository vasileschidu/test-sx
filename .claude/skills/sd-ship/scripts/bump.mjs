// Bump the ?v= cache-buster for every changed SD script/stylesheet, in every SD page (and SD script)
// that loads it, so browsers pick up the new file. One stamp per ship: <today><next letter>, e.g. 20261104a.
//
// Usage (from the repo root):
//   node bump.mjs [--dry-run] [--files src/scripts/a.js,src/styles/b.css]
//
// Without --files it takes the changed .js/.css under src/ from `git status`. Files that a non-SD page
// also loads are SHARED: they're listed and NOT bumped there (dashboard pages are not ours to edit).
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, posix } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
  return acc;
}, []));
const ROOT = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
const SD_PAGES = 'src/pages/onboarding';

const changed = args.files ? String(args.files).split(',') :
  execSync('git status --porcelain --untracked-files=all', { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean)
    .map(l => l.slice(3).split(' -> ').pop()).filter(f => /^src\/.*\.(js|css)$/.test(f));
if (!changed.length) { console.log('No changed .js/.css under src/ — nothing to bump.'); process.exit(0); }

const walk = d => readdirSync(join(ROOT, d), { withFileTypes: true }).flatMap(e => e.isDirectory()
  ? (/^(node_modules|\.git|\.claude|wiki)$/.test(e.name) ? [] : walk(posix.join(d, e.name)))
  : /\.(html|js)$/.test(e.name) ? [posix.join(d, e.name)] : []).map(p => p.replace(/^\.\//, ''));
const files = walk('.');
const sdFiles = files.filter(f => f.startsWith(SD_PAGES + '/') || (f.endsWith('.js') && /^src\/scripts\/(onboarding-|sd-)/.test(f)));
const otherPages = files.filter(f => f.endsWith('.html') && !f.startsWith(SD_PAGES + '/'));

// Next free stamp for today across the whole repo.
const now = new Date();
const today = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
let max = '';
for (const f of files) for (const m of readFileSync(join(ROOT, f), 'utf8').matchAll(new RegExp(`\\?v=${today}([a-z])`, 'g'))) if (m[1] > max) max = m[1];
if (max === 'z') { console.error(`All stamps for ${today} are used (a–z).`); process.exit(1); }
const STAMP = today + (max ? String.fromCharCode(max.charCodeAt(0) + 1) : 'a');

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const edits = new Map(); // file -> new text
let total = 0;
console.log(`Stamp ${STAMP}${args['dry-run'] ? ' (dry run)' : ''}\n`);
for (const asset of changed) {
  // References look like ../../../src/scripts/x.js?v=… or /src/scripts/x.js — match on "/scripts/x.js".
  const tail = asset.replace(/^src\//, '');
  const re = new RegExp(`((["'])[^"'\\s]*/${esc(tail)})(\\?v=[^"'\\s]*)?(?=\\2)`, 'g');
  const hit = [];
  for (const f of sdFiles) {
    const text = edits.get(f) ?? readFileSync(join(ROOT, f), 'utf8');
    let n = 0;
    const next = text.replace(re, (_, ref) => { n++; return `${ref}?v=${STAMP}`; });
    if (n) { edits.set(f, next); hit.push(f.split('/').pop()); total += n; }
  }
  const once = new RegExp(re.source);
  const shared = otherPages.filter(f => once.test(readFileSync(join(ROOT, f), 'utf8')));
  console.log(`${asset}: ${hit.length ? `${hit.length} SD file${hit.length > 1 ? 's' : ''}` : 'not loaded by any SD page'}`);
  if (shared.length) console.log(`  SHARED — also loaded by ${shared.length} non-SD page(s), not bumped there: ${shared.slice(0, 5).join(', ')}${shared.length > 5 ? ', …' : ''}`);
}
if (!args['dry-run']) for (const [f, text] of edits) writeFileSync(join(ROOT, f), text);
console.log(`\n${total} reference${total === 1 ? '' : 's'} ${args['dry-run'] ? 'would be set' : 'set'} to ?v=${STAMP} in ${edits.size} file${edits.size === 1 ? '' : 's'}.`);

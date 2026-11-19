#!/usr/bin/env python3
"""
Figma consistency audit (read-only, Figma REST API).

  python3 tools/figma-consistency/audit.py <fileKey> [<fileKey> ...]     → ~/figma-audit/consistency/<key>.json
  python3 tools/figma-consistency/audit.py --report                       → wiki/design-system/figma-consistency-report.md

Token: ~/.figma_token_agile (same as ~/figma-audit/tools/inventory.py). Nothing is written to Figma.

Per file it counts, on every page except Trash/Cover/Archive-like pages:
  - component instances by library (SMART System vs local vs other library) and by component set;
  - instances of "Button (old)" (deprecated set in SMART System) and other "(old)/deprecated" sets;
  - button instances whose height is not one of the SMART System sizes (20/28/32/40/44) → resized or old;
  - instances with overridden layout/text fields (padding, spacing, size, font) — "hand-edited" instances;
  - detached suspects: frames/groups named like a component that are not instances;
  - TEXT nodes without a text style or text variable, and font sizes off the Tailwind scale;
  - SOLID fills/strokes without a colour style or variable (raw colours).
Each finding keeps a few example node ids for links.
"""
import collections, json, os, re, sys, time, urllib.error, urllib.request, http.client, socket

HOME = os.path.expanduser('~/figma-audit')
OUT = os.path.join(HOME, 'consistency')
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
WIKI = os.path.join(REPO, 'wiki', 'design-system', 'figma-consistency-report.md')
TOKEN = open(os.path.expanduser('~/.figma_token_agile')).read().strip()

LIBRARY_FILE = 'PdvEp0MAIlof6O8MYaXCcy'  # SMART System
BUTTON_HEIGHTS = {20, 28, 32, 40, 44}
TW_FONT = {12, 14, 16, 18, 20, 24, 30, 36, 48, 60}
SKIP_PAGE = re.compile(r'trash|cover|archive|old|graveyard|🗑', re.I)
# Width/height are left out: resizing an instance to its container is normal use, not an edit.
LAYOUT_FIELDS = {'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'itemSpacing',
                 'fontSize', 'lineHeight', 'fontName', 'fontWeight', 'textStyleId', 'cornerRadius'}
EX = 5  # examples kept per bucket


def api(path, retries=7):
    for attempt in range(retries):
        req = urllib.request.Request('https://api.figma.com' + path, headers={'X-Figma-Token': TOKEN})
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429 or e.code >= 500:
                wait = int(e.headers.get('Retry-After') or 0) or 15 * (attempt + 1)
                sys.stderr.write(f'{e.code} {path[:60]} wait {wait}s\n'); time.sleep(min(wait, 120)); continue
            raise
        except (http.client.IncompleteRead, urllib.error.URLError, socket.timeout, ConnectionError) as e:
            sys.stderr.write(f'net {type(e).__name__}, retry\n'); time.sleep(20 * (attempt + 1)); continue
    raise RuntimeError('gave up ' + path)


def fetch(key, ids, on_node, comps, sets):
    try:
        res = api(f'/v1/files/{key}/nodes?ids={",".join(ids)}&geometry=omit')
    except urllib.error.HTTPError as e:
        if e.code == 400 and len(ids) > 1:
            mid = len(ids) // 2
            fetch(key, ids[:mid], on_node, comps, sets); fetch(key, ids[mid:], on_node, comps, sets); return
        if e.code == 400:
            sys.stderr.write(f'node {ids[0]} too large, skipped\n'); return
        raise
    for nid in ids:
        entry = (res.get('nodes') or {}).get(nid)
        if not entry:
            continue
        comps.update(entry.get('components') or {}); sets.update(entry.get('componentSets') or {})
        on_node(entry['document'])


class Tally:
    def __init__(self):
        self.n = collections.Counter(); self.ex = collections.defaultdict(list)

    def add(self, bucket, node_id, k=1):
        self.n[bucket] += k
        if len(self.ex[bucket]) < EX:
            self.ex[bucket].append(node_id)


def audit(key):
    shell = api(f'/v1/files/{key}?depth=2')
    styles = shell.get('styles') or {}
    comps, sets = {}, {}
    t = Tally()
    inst_by_set = collections.Counter(); inst_by_lib = collections.Counter()
    comp_names = set()
    pages_done = []

    def set_name(cid):
        c = comps.get(cid) or {}
        sid = c.get('componentSetId')
        return (sets.get(sid) or {}).get('name') or c.get('name') or '?'

    def walk(n, page):
        if n.get('visible') is False:
            return
        typ = n.get('type')
        if typ == 'INSTANCE':
            cid = n.get('componentId'); c = comps.get(cid) or {}
            name = set_name(cid)
            lib = 'SMART System' if c.get('remote') and c.get('key') in lib_keys else ('library' if c.get('remote') else 'local')
            inst_by_lib[lib] += 1; inst_by_set[name] += 1
            if re.search(r'\(old\)|deprecated|legacy', name, re.I):
                t.add(f'old component: {name}', n['id'])
            if re.match(r'^button', name, re.I) and not re.search(r'group', name, re.I):
                h = round((n.get('absoluteBoundingBox') or {}).get('height') or 0)
                if h and h not in BUTTON_HEIGHTS:
                    t.add(f'button height {h}px', n['id'])
            ov = set()
            for o in n.get('overrides') or []:
                ov |= set(o.get('overriddenFields') or [])
            hit = sorted(ov & LAYOUT_FIELDS)
            if hit:
                t.add('instance with edited layout/text', n['id'])
                for f in hit:
                    t.n[f'edited field: {f}'] += 1
            return  # don't descend into instance internals
        if typ in ('FRAME', 'GROUP') and n.get('name') in comp_names:
            t.add(f'detached suspect: {n.get("name")}', n['id'])
        if typ == 'TEXT':
            st = (n.get('styles') or {}).get('text')
            bound = (n.get('boundVariables') or {})
            if not st and not any(k in bound for k in ('fontSize', 'fontFamily', 'fontWeight', 'lineHeight')):
                t.add('text without style/variable', n['id'])
            fs = (n.get('style') or {}).get('fontSize')
            if fs and round(fs) not in TW_FONT:
                t.add(f'font size {round(fs, 1)}px (off scale)', n['id'])
        for prop in ('fills', 'strokes'):
            paints = n.get(prop) or []
            if any(p.get('type') == 'SOLID' and p.get('visible', True) is not False for p in paints):
                has_style = (n.get('styles') or {}).get(prop[:-1]) or (n.get('styles') or {}).get(prop)
                bound = (n.get('boundVariables') or {}).get(prop) or any((p.get('boundVariables') or {}) for p in paints)
                if not has_style and not bound:
                    t.add(f'raw colour ({prop})', n['id'])
        for c in n.get('children') or []:
            walk(c, page)

    # SMART System component keys, to tell its instances from other libraries'.
    lib_keys = LIB_KEYS
    for page in shell['document'].get('children', []):
        if SKIP_PAGE.search(page.get('name', '')):
            continue
        ids = [c['id'] for c in page.get('children') or [] if c.get('visible') is not False]

        def on_node(n, pname=page.get('name')):
            # fetch() has already merged this batch's component/set metadata into comps/sets.
            comp_names.update(v.get('name') for v in comps.values())
            comp_names.update(v.get('name') for v in sets.values())
            walk(n, pname)
        for i in range(0, len(ids), 4):
            fetch(key, ids[i:i + 4], on_node, comps, sets)
        pages_done.append(page.get('name'))
        sys.stderr.write(f'{shell.get("name")} · {page.get("name")} done\n')

    instances = sum(inst_by_lib.values())
    out = {'fileKey': key, 'name': shell.get('name'), 'lastModified': shell.get('lastModified'), 'pages': pages_done,
           'instances': instances, 'by_library': dict(inst_by_lib), 'top_sets': inst_by_set.most_common(40),
           'counts': dict(t.n.most_common()), 'examples': {k: v for k, v in t.ex.items()}}
    os.makedirs(OUT, exist_ok=True)
    json.dump(out, open(os.path.join(OUT, key + '.json'), 'w'), indent=1, ensure_ascii=False)
    return out


def load_lib_keys():
    path = os.path.join(OUT, '_smart_system_keys.json')
    if os.path.exists(path):
        return set(json.load(open(path)))
    keys = set()
    for kind in ('components', 'component_sets'):
        res = api(f'/v1/files/{LIBRARY_FILE}/{kind}')
        keys |= {c['key'] for c in (res.get('meta') or {}).get(kind.replace('_sets', '_sets'), [])}
    os.makedirs(OUT, exist_ok=True); json.dump(sorted(keys), open(path, 'w'))
    return keys


# Layer names too generic to call a frame a detached component (they match library sub-parts by chance).
GENERIC = {'Container', 'Content', 'Actions', 'Footer', 'Header', 'Logo', 'Search', 'Frame', 'Group', 'Body', 'Text',
           'Title', 'Icon', 'Wrapper', 'Row', 'Column', 'Left', 'Right', 'Top', 'Bottom', 'Label', 'Image', 'Divider'}


def is_detached(k):
    return k.startswith('detached suspect: ') and k[len('detached suspect: '):] not in GENERIC


def report():
    rows = [json.load(open(os.path.join(OUT, f))) for f in sorted(os.listdir(OUT)) if f.endswith('.json') and not f.startswith('_')]
    link = lambda key, nid: f'[{nid}](https://www.figma.com/design/{key}/?node-id={nid.replace(":", "-")})'
    L = ['---', 'title: Consistency report (Figma)', 'type: guide', 'status: draft',
         f'last_reviewed: {time.strftime("%Y-%m-%d")}',
         'source: generated by tools/figma-consistency/audit.py (Figma REST API, read-only); do not edit by hand', '---', '',
         '# Consistency report (Figma)', '',
         'How the product Figma files use the SMART System library. Code side: [consistency-report.md](consistency-report.md);',
         'what people report by eye: [discrepancies.md](discrepancies.md). Trash, Cover and archive-like pages are skipped.', '',
         '## Summary', '',
         '| File | Instances | SMART System | Other library | Local | Old components | Buttons off-size | Edited instances | Detached suspects | Text without style | Raw colours |',
         '|---|---|---|---|---|---|---|---|---|---|---|']
    for r in sorted(rows, key=lambda r: -r['instances']):
        c = r['counts']; s = lambda pre: sum(v for k, v in c.items() if k.startswith(pre))
        b = r['by_library']; tot = r['instances'] or 1
        L.append(f"| [{r['name'].replace('|', '/').replace('[', '\\[').replace(']', '\\]')}](https://www.figma.com/design/{r['fileKey']}) | {r['instances']} | {b.get('SMART System', 0)} ({round(100 * b.get('SMART System', 0) / tot)}%) | "
                 f"{b.get('library', 0)} | {b.get('local', 0)} | {s('old component')} | {s('button height')} | {c.get('instance with edited layout/text', 0)} | "
                 f"{sum(v for k, v in c.items() if is_detached(k))} | {c.get('text without style/variable', 0)} | {s('raw colour')} |")
    L += ['', 'Columns: **Old components** = instances of "(old)" / deprecated sets (e.g. "Button (old)"); **Buttons off-size** = button',
          'instances not 20/28/32/40/44px tall; **Edited instances** = instances with padding, spacing, radius or font overridden (resizing is not counted);',
          '**Detached suspects** = frames named exactly like a component but not instances (generic names such as Container/Footer left out); **Text without style** = text with no',
          'text style or variable; **Raw colours** = solid fills/strokes with no colour style or variable.', '',
          'Caveat: very small sizes (buttons 16px tall, fonts 4.7–7.5px) mostly come from scaled-down preview/thumbnail frames,',
          'not from real screens. Counts are a trend to drive down, not a census.', '']
    for r in sorted(rows, key=lambda r: -r['instances']):
        c, ex, key = r['counts'], r['examples'], r['fileKey']
        L += [f"## {r['name'].replace('|', '/').replace('[', '\\[').replace(']', '\\]')}", '', f"`{key}` · last modified {str(r.get('lastModified', ''))[:10]} · pages: {', '.join(r['pages'][:12])}", '']
        L += ['| Finding | Count | Examples |', '|---|---|---|']
        for k, v in [kv for kv in sorted(c.items(), key=lambda kv: -kv[1]) if not kv[0].startswith('detached') or is_detached(kv[0])][:25]:
            L.append(f"| {k} | {v} | {' '.join(link(key, i) for i in ex.get(k, [])[:3])} |")
        L += ['', '**Most used components:** ' + ', '.join(f'{n} ({v})' for n, v in r['top_sets'][:12]), '']
    os.makedirs(os.path.dirname(WIKI), exist_ok=True)
    open(WIKI, 'w').write('\n'.join(L) + '\n')
    print('wrote', WIKI)


if __name__ == '__main__':
    if '--report' in sys.argv:
        report(); sys.exit(0)
    LIB_KEYS = load_lib_keys()
    for key in sys.argv[1:]:
        r = audit(key)
        print(json.dumps({'file': r['name'], 'instances': r['instances'], 'by_library': r['by_library'],
                          'top': dict(list(r['counts'].items())[:8])}, ensure_ascii=False))

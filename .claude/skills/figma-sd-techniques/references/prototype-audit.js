// Prototype audit (READ-ONLY). Paste into a use_figma script on the Multi-Party Flow page.
// Never writes to the file: it only reads nodes and returns a compact JSON report.
// Checks: 1 fixed children on modal screens, 2 modal structure (standard / inner-scroller exception),
// 3 prototype reactions (broken destinations; scroll-end triggers listed as OK), 4 detached connector endpoints.
// Expected values were read from the user-built frames 4.12 desktop 959:25701 (standard; the original reference
// 1545:94795 no longer exists) and 6.6 desktop 1170:9894 (exception) on 2026-11-04. Both must come out clean (selfTest).
//
// Usage (one call; batch with opts.section if a call ever times out):
//   const page = await figma.getNodeByIdAsync('867:9754'); await figma.setCurrentPageAsync(page);
//   return await prototypeAudit(page, { limit: 25 });
// opts: limit = items per category (default 25); section = RegExp on the top-level section name, to batch;
//       selfTest = ids that must have 0 deviations (default the two reference frames).
async function prototypeAudit(page, opts = {}) {
  const LIMIT = opts.limit || 25;
  const SELF = opts.selfTest || ['959:25701', '1170:9894'];
  const MB = 'Modal & Background', WR = 'Modal Wrapper', SCROLLER = /^(Agreement \(scroll\)|Viewer)$/;

  // ---- safe readers (figma.mixed is a symbol and breaks JSON; instances/text lack some props) ----
  const val = (n, k) => {
    if (!n || !(k in n)) return 'n/a';
    let v; try { v = n[k]; } catch (e) { return 'ERR'; }
    return v === figma.mixed ? 'MIXED' : v;
  };
  const r1 = v => typeof v === 'number' ? Math.round(v * 100) / 100 : v;
  const isScreen = n => n && n.type === 'FRAME' && n.parent && (n.parent.type === 'SECTION' || n.parent.type === 'PAGE');
  const screenOf = n => { while (n && !isScreen(n)) n = n.parent; return n; };
  const topSection = n => { let s = null; while (n && n.type !== 'PAGE') { if (n.type === 'SECTION') s = n; n = n.parent; } return s; };
  const device = name => /\(m\)/.test(name) ? 'm' : /\(t\)/.test(name) ? 't' : 'd';
  const short = s => (s || '').slice(0, 60);
  const cut = arr => arr.slice(0, LIMIT);

  // expect(node, label, {prop: expected}) -> pushes "label.prop exp X got Y" to devs
  function expect(devs, n, label, spec) {
    for (const k in spec) {
      const got = val(n, k), exp = spec[k];
      const ok = typeof exp === 'number' && typeof got === 'number' ? Math.abs(got - exp) < 0.5 : got === exp;
      if (!ok) devs.push(label + '.' + k + ' exp ' + exp + ' got ' + r1(got));
    }
  }
  function checkBackdrop(devs, mb, frame, spec) {
    if (mb.type !== 'FRAME') { devs.push('MB.type exp FRAME got ' + mb.type); return false; }
    expect(devs, mb, 'MB', spec);
    const c = val(mb, 'constraints');
    if (!c || c.horizontal !== 'STRETCH' || c.vertical !== 'STRETCH') devs.push('MB.constraints exp STRETCH/STRETCH got ' + (c && c.horizontal) + '/' + (c && c.vertical));
    if (Math.abs(mb.x) > 1 || Math.abs(mb.y) > 1 || Math.abs(mb.width - frame.width) > 1 || Math.abs(mb.height - frame.height) > 1)
      devs.push('MB.box exp 0,0 ' + frame.width + 'x' + frame.height + ' got ' + [mb.x, mb.y, mb.width, mb.height].map(Math.round).join(','));
    const fills = val(mb, 'fills');
    const f0 = Array.isArray(fills) ? fills.filter(p => p.visible !== false) : [];
    if (!(f0.length === 1 && f0[0].type === 'SOLID' && f0[0].color.r + f0[0].color.g + f0[0].color.b < 0.01 && Math.abs((f0[0].opacity ?? 1) - 0.75) < 0.02))
      devs.push('MB.fill exp #000@75% got ' + (f0.length ? f0.map(p => p.type + (p.color ? '@' + r1(p.opacity ?? 1) : '')).join('+') : 'none'));
    const fx = val(mb, 'effects');
    const blur = Array.isArray(fx) && fx.find(e => e.type === 'BACKGROUND_BLUR' && e.visible !== false);
    if (!blur || Math.abs(blur.radius - 5) > 0.5) devs.push('MB.blur exp 5 got ' + (blur ? blur.radius : 'none'));
    return true;
  }
  // Any frame below `root` with its own scroll, except `allow` (the intended scroller).
  const extraScrollers = (root, allow) => ('findAll' in root ? root.findAll(n => n !== allow && 'overflowDirection' in n && val(n, 'overflowDirection') !== 'NONE' && val(n, 'overflowDirection') !== 'n/a') : []);

  function auditModal(frame, mb) {
    const devs = [];
    const scroller = 'findOne' in mb ? mb.findOne(n => SCROLLER.test(n.name)) : null;
    const kind = scroller ? 'exception' : 'standard';
    const common = { layoutPositioning: 'ABSOLUTE', layoutMode: 'VERTICAL', primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER', paddingLeft: 16, paddingRight: 16 };
    if (kind === 'standard') {
      if (!checkBackdrop(devs, mb, frame, Object.assign({}, common, { paddingTop: 0, paddingBottom: 0, clipsContent: true, overflowDirection: 'VERTICAL' }))) return { kind, devs };
      const flow = mb.children.filter(c => val(c, 'layoutPositioning') !== 'ABSOLUTE');
      if (flow.length !== 1) devs.push('MB.children exp 1 (Modal Wrapper) got ' + flow.length + ' [' + flow.map(c => c.name).join(', ') + ']');
      const wr = mb.children.find(c => c.name === WR);
      if (!wr) { devs.push('Wrapper missing (MB > ' + mb.children.map(c => c.name).join(', ') + ')'); }
      else {
        if (wr.type !== 'FRAME') devs.push('Wrapper.type exp FRAME got ' + wr.type);
        expect(devs, wr, 'Wrapper', { layoutPositioning: 'AUTO', layoutMode: 'HORIZONTAL', layoutSizingHorizontal: 'HUG', layoutSizingVertical: 'HUG', paddingTop: 24, paddingBottom: 24, clipsContent: false, overflowDirection: 'NONE' });
      }
      const card = wr && 'children' in wr ? wr.children.find(c => c.name === 'Modal') : null;
      if (!card) { if (wr) devs.push('Modal missing in Wrapper (' + wr.children.map(c => c.name).join(', ') + ')'); }
      else {
        expect(devs, card, 'Modal', { layoutPositioning: 'AUTO', layoutSizingHorizontal: 'FIXED', layoutSizingVertical: 'HUG', maxHeight: null, clipsContent: true, overflowDirection: 'NONE' });
        for (const s of extraScrollers(card, null).slice(0, 3)) devs.push('Modal has own scroll: ' + s.name + ' ' + s.id + ' (' + val(s, 'overflowDirection') + ')');
      }
    } else {
      if (!checkBackdrop(devs, mb, frame, Object.assign({}, common, { paddingTop: 24, paddingBottom: 24, clipsContent: false, overflowDirection: 'NONE' }))) return { kind, devs };
      if (mb.children.some(c => c.name === WR)) devs.push('Wrapper present (exception expects MB > Modal directly)');
      const card = mb.children.find(c => c.name === 'Modal');
      if (!card) devs.push('Modal not a direct child of MB (' + mb.children.map(c => c.name).join(', ') + ')');
      else expect(devs, card, 'Modal', { layoutPositioning: 'AUTO', layoutSizingHorizontal: 'FIXED', layoutSizingVertical: 'FILL', maxHeight: 752, clipsContent: true, overflowDirection: 'NONE' });
      expect(devs, scroller, 'Scroller', { layoutSizingVertical: 'FILL', overflowDirection: 'VERTICAL' });
      // every layer between the card and the scroller must FILL height, or the scroller cannot fill the card
      for (let p = scroller.parent; p && p !== mb && p.name !== 'Modal'; p = p.parent)
        if (val(p, 'layoutSizingVertical') !== 'FILL') devs.push('Between.' + p.name + '.layoutSizingVertical exp FILL got ' + val(p, 'layoutSizingVertical'));
      for (const s of extraScrollers(mb, scroller).slice(0, 3)) devs.push('extra scroll: ' + s.name + ' ' + s.id + ' (' + val(s, 'overflowDirection') + ')');
    }
    return { kind, devs };
  }

  // ---------------- screens ----------------
  let screens = page.findAll(n => isScreen(n) && !/Documentation/.test(n.name));
  if (opts.section) screens = screens.filter(f => { const s = topSection(f); return s && opts.section.test(s.name); });
  const R = { page: page.name, screens: screens.length, modalFrames: 0, standard: 0, exception: 0 };
  const fixed = [], legacy = [], modalIssues = [], devCount = {}, selfTest = {};
  for (const f of screens) {
    const kids = f.children;
    const mb = kids.find(c => c.name === MB);
    const old = kids.find(c => c.name === 'Overlay' || c.name === 'Modal');
    if (!mb && !old) continue;
    R.modalFrames++;
    const nf = val(f, 'numberOfFixedChildren');
    // Fixed layers sit at the top of the layers panel = the LAST n children (6.2.2 (m): Top Bar + backdrop).
    if (typeof nf === 'number' && nf > 0) fixed.push(short(f.name) + ' ' + f.id + ' fixed=' + nf + ' [' + kids.slice(-nf).map(c => c.name).join(', ') + ']' +
      (!mb ? ' legacy' : mb.findOne(n => SCROLLER.test(n.name)) ? ' exception' : ' standard'));
    if (!mb) { legacy.push(short(f.name) + ' ' + f.id + ' (' + old.name + ', no ' + MB + ')'); continue; }
    const { kind, devs } = auditModal(f, mb);
    R[kind]++;
    if (SELF.includes(f.id)) selfTest[f.id] = devs.length ? devs : 'clean';
    if (devs.length) {
      for (const d of devs) {
        const key = kind[0] + ':' + (d.includes(' exp ') ? d.split(' exp ')[0] : d.split(/[:(]/)[0].trim());
        devCount[key] = (devCount[key] || 0) + 1;
      }
      modalIssues.push({ f: short(f.name), id: f.id, kind, devs: devs.slice(0, 8) });
    }
  }
  R.fixedChildren = { n: fixed.length, items: cut(fixed) };
  R.legacyModal = { n: legacy.length, items: cut(legacy) };
  R.modal = { framesWithIssues: modalIssues.length, byCheck: devCount, items: cut(modalIssues) };
  R.selfTest = selfTest;

  // ---------------- prototype reactions ----------------
  const inScope = n => !opts.section || (topSection(n) && opts.section.test(topSection(n).name));
  const reactive = page.findAll(n => 'reactions' in n && n.reactions && n.reactions.length > 0 && inScope(n));
  const okTrig = [], broken = [], empty = []; let actions = 0;
  for (const n of reactive) {
    const scr = screenOf(n);
    const where = short(scr ? scr.name : '?') + ' > ' + n.name + ' ' + n.id;
    for (const r of n.reactions) {
      const acts = (r.actions && r.actions.length) ? r.actions : (r.action ? [r.action] : []);
      const trig = r.trigger ? r.trigger.type : 'none';
      if (!acts.length) { empty.push(where + ' (' + trig + ', no action)'); continue; }
      for (const a of acts) {
        actions++;
        if (a.type !== 'NODE') continue;                         // BACK, CLOSE, URL, SET_VARIABLE… have no node destination
        if (!a.destinationId) { broken.push(where + ' ' + trig + '/' + a.navigation + ' -> no destination'); continue; }
        const d = await figma.getNodeByIdAsync(a.destinationId);
        let why = null;
        if (!d) why = 'destination ' + a.destinationId + ' does not exist';
        else if (a.navigation === 'SCROLL_TO') { if (screenOf(d) !== scr) why = 'SCROLL_TO target outside this screen'; }
        else if (a.navigation === 'CHANGE_TO') { /* variant swap: destination is a variant component, existing is enough */ }
        else {
          let p = d; while (p && p.type !== 'PAGE') p = p.parent;
          if (p !== page) why = 'destination on another page (' + (p ? p.name : 'none') + ')';
          else if (!isScreen(d)) why = 'destination ' + d.id + ' "' + short(d.name) + '" is a ' + d.type + ' inside ' + short(d.parent && d.parent.name) + ', not a top-level frame';
        }
        const isTrig = /Scroll end trigger/i.test(n.name);
        if (isTrig && !why && scr && device(scr.name) !== device(d.name)) why = 'scroll-end trigger jumps to another device (' + short(d.name) + ')';
        if (why) broken.push(where + ' ' + trig + '/' + a.navigation + ' -> ' + why);
        else if (isTrig) okTrig.push(short(scr && scr.name).slice(0, 30) + ' -> ' + short(d.name).slice(0, 30) + ' ' + d.id);
      }
    }
  }
  R.reactions = { nodes: reactive.length, actions, broken: { n: broken.length, items: cut(broken) }, empty: { n: empty.length, items: cut(empty) }, scrollEndTriggersOK: { n: okTrig.length, items: cut(okTrig) } };

  // ---------------- connectors: detached endpoints ----------------
  const cons = page.findAllWithCriteria({ types: ['CONNECTOR'] }).filter(inScope);
  const detached = [], offScreen = [];
  for (const c of cons) {
    const probs = [], notes = [];
    for (const [end, ep] of [['start(target)', c.connectorStart], ['end(trigger)', c.connectorEnd]]) {
      if (!ep || !ep.endpointNodeId) { probs.push(end + ' free (not attached)'); continue; }
      const n = await figma.getNodeByIdAsync(ep.endpointNodeId);
      if (!n) { probs.push(end + ' node ' + ep.endpointNodeId + ' missing'); continue; }
      let p = n, hidden = false; while (p && p.type !== 'PAGE') { if (p.visible === false) hidden = true; p = p.parent; }
      if (p !== page) { probs.push(end + ' on another page'); continue; }
      if (hidden) probs.push(end + ' on hidden layer ' + short(n.name) + ' ' + n.id);
      if (!screenOf(n)) notes.push(end + ' on ' + n.type + ' "' + short(n.name) + '"');
    }
    const label = c.id + ' "' + short(c.name) + '" in ' + short(c.parent && c.parent.name);
    if (probs.length) detached.push(label + ': ' + probs.join('; '));
    else if (notes.length) offScreen.push(label + ': ' + notes.join('; '));
  }
  R.connectors = { n: cons.length, detached: { n: detached.length, items: cut(detached) }, endpointNotInScreen: { n: offScreen.length, items: cut(offScreen) } };
  return R;
}

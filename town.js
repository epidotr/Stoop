// Live town: people (dots) wander the map's streets in real time, bump into each other and chat.
// Part 1 is the DOM-free simulation (so it can be tested with node); part 2 draws it on app.js's SVG map.
(function () {
  // ---------- part 1: simulation ----------
  // Same four streets mapSvg() in app.js draws (viewBox 0..100).
  const STREETS = [{a: [0, 40], b: [100, 34]}, {a: [0, 78], b: [100, 74]}, {a: [30, 0], b: [34, 100]}, {a: [70, 0], b: [66, 100]}];
  const rnd = (a, b) => a + Math.random() * (b - a), pickOne = arr => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function cross(p, q) {  // where two street segments meet: t along p, u along q (or null)
    const r = [p.b[0] - p.a[0], p.b[1] - p.a[1]], s = [q.b[0] - q.a[0], q.b[1] - q.a[1]], den = r[0] * s[1] - r[1] * s[0];
    if (!den) return null;
    const qp = [q.a[0] - p.a[0], q.a[1] - p.a[1]], t = (qp[0] * s[1] - qp[1] * s[0]) / den, u = (qp[0] * r[1] - qp[1] * r[0]) / den;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? {t, u} : null;
  }
  STREETS.forEach((s, i) => {
    s.len = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
    s.j = [];  // junctions: at position t on this street you can step onto street `other` at its position `to`
    STREETS.forEach((o, k) => { const c = i === k ? null : cross(s, o); if (c) s.j.push({t: c.t, other: k, to: c.u}); });
  });

  const pos = d => { const s = STREETS[d.street]; return [s.a[0] + (s.b[0] - s.a[0]) * d.t, s.a[1] + (s.b[1] - s.a[1]) * d.t]; };
  function nearest(x, y) {  // closest street + position on it, so a neighbor's dot starts on a road, not in a yard
    let best = null;
    STREETS.forEach((s, i) => {
      const rx = s.b[0] - s.a[0], ry = s.b[1] - s.a[1], t = clamp(((x - s.a[0]) * rx + (y - s.a[1]) * ry) / (s.len * s.len), 0, 1);
      const dist = Math.hypot(s.a[0] + rx * t - x, s.a[1] + ry * t - y);
      if (!best || dist < best.dist) best = {street: i, t, dist};
    });
    return best;
  }

  const dots = [], stats = {chats: 0};
  let uid = 0;
  function makeDot(o) {
    const d = Object.assign({id: 'd' + (++uid), name: 'Someone', kind: 'npc', speed: 2, color: '#7A7A8C', lines: [], dir: Math.random() < .5 ? -1 : 1,
      street: Math.floor(Math.random() * STREETS.length), t: Math.random(), wait: 0, cool: 0, say: null, ignore: null}, o);
    dots.push(d);
    return d;
  }
  const say = (d, text, secs = 3.2) => { d.say = {text, left: secs}; };

  function move(d, dt) {
    if (d.wait > 0) { d.wait -= dt; return; }
    const s = STREETS[d.street], t0 = d.t, t1 = t0 + d.dir * d.speed * dt / s.len;
    if (d.ignore && (d.ignore.street !== d.street || Math.abs(d.t - d.ignore.t) > 0.02)) d.ignore = null;  // moved off the junction we just turned at
    const lo = Math.min(t0, t1), hi = Math.max(t0, t1);
    const jn = s.j.find(j => j.t >= lo && j.t <= hi && !(d.ignore && Math.abs(j.t - d.ignore.t) < 1e-3));
    if (jn && Math.random() < 0.55) {                         // turn the corner
      d.street = jn.other; d.t = jn.to; d.dir = Math.random() < .5 ? -1 : 1; d.ignore = {street: jn.other, t: jn.to};
      if (Math.random() < 0.15) d.wait = rnd(.5, 1.8);        // sometimes stop and think
    } else if (t1 < 0 || t1 > 1) { d.t = clamp(t1, 0, 1); d.dir *= -1; }  // end of the street: turn around
    else d.t = t1;
  }

  function step(dt) {
    dots.forEach(d => { d.cool = Math.max(0, d.cool - dt); if (d.say && (d.say.left -= dt) <= 0) d.say = null; move(d, dt); });
    for (let i = 0; i < dots.length; i++) for (let k = i + 1; k < dots.length; k++) {
      const a = dots[i], b = dots[k];
      if (a.cool || b.cool) continue;
      const pa = pos(a), pb = pos(b);
      if (Math.hypot(pa[0] - pb[0], pa[1] - pb[1]) < 2.4) {   // two people met: stop, chat, maybe say something
        a.cool = b.cool = 7; a.wait = b.wait = rnd(1, 2.4); stats.chats++;
        const talker = Math.random() < .5 ? a : b;
        say(talker, Math.random() < .3 ? '💬' : pickOne(talker.lines.length ? talker.lines : GENERIC));
      }
    }
  }

  const GENERIC = ['Nice weather for returning stuff.', 'Has anyone seen my ladder?', 'I only came out for a screwdriver.', 'Just walking. Definitely not casing your shed.', 'Is it Tuesday?', '*waves awkwardly*'];
  const NPCS = [
    {name: 'Jogger Janet', speed: 3.6, color: '#2BB673', lines: ["Can't talk, cardio!", 'Is this still Maple Ave?']},
    {name: 'Pizza guy', speed: 4.5, color: '#FF5C39', lines: ['Anyone order a large pepperoni?', 'Wrong address. AGAIN.']},
    {name: 'Kid on scooter', speed: 5.5, color: '#F2C230', lines: ['WHEEEEE', 'Watch this! ...never mind.']},
    {name: 'Dog walker', speed: 2, color: '#8A5CF6', lines: ['The dog is walking ME.', "He's friendly! ...mostly."]},
    {name: 'Leaf blower guy', speed: 1.6, color: '#7A7A8C', lines: ['*VROOOOM*', "WHAT? I CAN'T HEAR YOU."]},
    {name: "Someone's uncle", speed: 1.2, color: '#C0752F', lines: ['Back in my day we owned our tools.', "I could fix that. Don't ask how."]},
    {name: 'Guy with a ladder', speed: 1.8, color: '#1F6B3A', lines: ["Nobody tell Dev I have this.", "Ladder's fine. It's totally fine."]},
  ];
  const PALETTE = ['#3A4BFF', '#E0457B', '#00A6A6', '#9B5DE5', '#F28C28', '#4C9F70'];

  function sync(neighbors, meId) {  // one dot per neighbor, plus the ambient townsfolk (created once)
    neighbors.forEach(n => {
      let d = dots.find(x => x.nid === n.id);
      if (!d) { const p = nearest(n.x, n.y); d = makeDot({nid: n.id, street: p.street, t: p.t, speed: rnd(2.2, 3.4), color: PALETTE[n.id % PALETTE.length]}); }
      d.name = n.name.replace(' (you)', ''); d.kind = n.id === meId ? 'me' : 'neighbor';
      if (d.kind === 'me') d.color = '#1B1B2F';
    });
    for (let i = dots.length - 1; i >= 0; i--) if (dots[i].nid && !neighbors.some(n => n.id === dots[i].nid)) dots.splice(i, 1);
    if (!dots.some(d => d.npc)) NPCS.forEach(n => makeDot(Object.assign({npc: true}, n)));
  }

  const core = {STREETS, dots, stats, step, sync, makeDot, say, pos, nearest, NPCS, GENERIC, rnd, pickOne};
  if (typeof document === 'undefined') { module.exports = core; return; }

  // ---------- part 2: draw it on the map (wraps render() so the dots survive app.js re-rendering the SVG) ----------
  const NS = 'http://www.w3.org/2000/svg';
  let layer = null, els = {}, paused = false, speed = 1, last = 0;
  const mk = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); Object.keys(attrs).forEach(k => e.setAttribute(k, attrs[k])); if (parent) parent.appendChild(e); return e; };

  function build(d) {
    const g = mk('g', {'data-dot': d.id, style: 'cursor:pointer'}, layer);
    if (d.kind === 'me') mk('circle', {r: 3.6, fill: '#3A4BFF', opacity: .2}, g);
    mk('circle', {r: d.npc ? 1.3 : 1.9, fill: d.color, stroke: '#fff', 'stroke-width': .5}, g);
    if (!d.npc) { const t = mk('text', {y: -3, 'font-size': 2.2, 'text-anchor': 'middle', 'font-weight': 800, fill: '#1B1B2F', 'paint-order': 'stroke', stroke: '#FFF8DC', 'stroke-width': .7}, g); t.textContent = d.name; }
    els[d.id] = {g, bub: null};
  }
  function paint() {
    dots.forEach(d => {
      const e = els[d.id]; if (!e) return;
      const [x, y] = pos(d);
      e.g.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
      if (d.say) {
        if (!e.bub) { e.bub = mk('g', {}, e.g); mk('rect', {rx: 1.2, fill: '#fff', stroke: '#1B1B2F', 'stroke-width': .25, height: 4.4, y: -3.2}, e.bub); mk('text', {'font-size': 2.2, 'text-anchor': 'middle', fill: '#1B1B2F', 'font-weight': 600}, e.bub); }
        const w = d.say.text.length * 1.25 + 3, dx = Math.max(1 + w / 2 - x, Math.min(99 - w / 2 - x, 0));  // keep the bubble inside the map
        e.bub.setAttribute('transform', `translate(${dx.toFixed(2)} -7.5)`);
        const r = e.bub.firstChild, t = e.bub.lastChild;
        r.setAttribute('width', w); r.setAttribute('x', -w / 2); t.setAttribute('y', 0); t.textContent = d.say.text;
      } else if (e.bub) { e.bub.remove(); e.bub = null; }
    });
  }
  function counts() { const c = $('#tCount'); if (c) c.textContent = `${dots.length} people out · ${stats.chats} chats`; }
  function mount() {
    layer = null; els = {};
    const svg = document.querySelector('.map svg');
    if (!svg) return;                                          // not on the map view
    sync(S.neighbors, S.me.id);
    layer = mk('g', {id: 'dots'}, svg);
    dots.forEach(build);
    const bar = document.createElement('div');
    bar.className = 'townbar';
    bar.innerHTML = `<button id="tPause">${paused ? '▶ Play' : '⏸ Pause'}</button><button id="tRush">🚶 Rush hour</button><button id="tEmpty">🏠 Everyone go home</button>
      <label>Speed <input id="tSpeed" type="range" min=".5" max="3" step=".5" value="${speed}"></label><span id="tCount"></span>`;
    svg.parentNode.appendChild(bar);
    counts();
  }
  function frame(ts) {
    const dt = Math.min(0.1, (ts - last) / 1000); last = ts;
    if (layer && layer.isConnected) { if (!paused) { const c = stats.chats; step(dt * speed); if (c !== stats.chats) counts(); } paint(); }
    requestAnimationFrame(frame);
  }

  async function poke(id) {  // click a dot: it says something; clicking a neighbor also sends them a wave (and a Gazette headline)
    const d = dots.find(x => x.id === id); if (!d) return;
    if (d.kind === 'me') return say(d, 'Yep, that is you. Looking sharp.');
    say(d, pickOne(d.lines.length ? d.lines : GENERIC)); d.wait = 1.5;
    if (d.kind === 'neighbor') { const r = await api('/api/wave', {id: d.nid}); if (r && r.line) window.toast(r.line); }
  }
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-dot]');
    if (g) return poke(g.dataset.dot);
    if (e.target.closest('#tPause')) { paused = !paused; $('#tPause').textContent = paused ? '▶ Play' : '⏸ Pause'; }
    else if (e.target.closest('#tRush')) {
      for (let i = 0; i < 6 && dots.length < 40; i++) { const d = makeDot({npc: true, extra: true, name: 'Commuter', speed: rnd(1.5, 4.5), color: pickOne(['#E0457B', '#00A6A6', '#F28C28', '#9B5DE5']), lines: GENERIC}); build(d); }
      counts();
    } else if (e.target.closest('#tEmpty')) {
      for (let i = dots.length - 1; i >= 0; i--) if (dots[i].extra) { els[dots[i].id] && els[dots[i].id].g.remove(); delete els[dots[i].id]; dots.splice(i, 1); }
      counts();
    }
  });
  document.addEventListener('input', e => { if (e.target.id === 'tSpeed') speed = +e.target.value; });

  const REACT = {ask: '🙏', approve: '🎉', return: '📦', wish: '🔍', grant: '🦸', nudge: '😬', wave: '👋', add: '🔨', remove: '🗑️'};
  window.Town = {  // screens.js feeds every fresh Gazette event in here, so the street reacts in real time
    onEvent(ev) {
      if (!REACT[ev.kind]) return;
      dots.filter(d => !d.npc && ev.text.includes(d.name)).forEach(d => { say(d, REACT[ev.kind], 4); d.wait = 2; });
    },
  };

  const baseRender = render;
  render = function () { baseRender(); mount(); };
  requestAnimationFrame(frame);
  if (S) render();
})();

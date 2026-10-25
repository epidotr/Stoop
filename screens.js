// Extra screens + funny text, layered on top of app.js WITHOUT editing its internals:
// we wrap the global render() and api() functions instead. Load order: app.js, then this file.
(() => {
  const SCREENS = {};                                   // view name -> {html(), after()}
  const KEYS = {4: 'gazette', 5: 'wanted', 6: 'fame'};  // number-key shortcuts for the new views
  window.Screens = {register: (name, def) => { SCREENS[name] = def; }};

  // ---------- funny text + toasts ----------
  window.quip = k => { const a = (S && S.quips && S.quips[k]) || ['...']; return a[Math.floor(Math.random() * a.length)]; };
  let toastTimer;
  window.toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 2800); };
  const TOASTS = [[/^\/api\/tools$/, 'toast_add'], [/\/delete$/, 'toast_remove'], [/\/request$/, 'toast_ask'],
                  [/wishes\/add$/, 'toast_wish'], [/wishes\/\d+\/grant$/, 'toast_grant'], [/\/loans\/\d+\/approve$/, 'toast_approve'], [/\/decline$/, 'toast_decline'], [/\/return$/, 'toast_return'], [/\/nudge$/, 'toast_nudge']];
  const baseApi = api;
  api = async function (url, body) {                    // wrapper: same behaviour, plus a quip when a POST succeeds
    const r = await baseApi(url, body);
    if (body && !(r && r.error)) { const hit = TOASTS.find(([re]) => re.test(url)); if (hit) window.toast(window.quip(hit[1])); }
    return r;
  };

  // ---------- render wrapper: draw the original, then let new screens take over #view ----------
  const baseRender = render;
  render = function () {
    baseRender();
    const sc = SCREENS[view];
    if (sc) { $('#view').innerHTML = sc.html(); if (sc.after) sc.after(); }
  };
  document.addEventListener('keydown', e => {
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || e.ctrlKey || e.metaKey) return;
    if (KEYS[e.key] && SCREENS[KEYS[e.key]]) { view = KEYS[e.key]; render(); }
  });

  // ---------- Town Gazette: live feed, polled every 5s ----------
  const ICON = {add: '🔨', remove: '🗑️', ask: '🙏', approve: '✅', decline: '❌', return: '📦', nudge: '👀', wish: '🔍', grant: '🦸', wave: '👋', gossip: '🗣️'};
  let feed = [], lastId = 0;
  const ago = iso => { const s = Math.max(0, (Date.now() - new Date(iso)) / 1000); return s < 20 ? 'just now' : s < 90 ? 'a minute ago' : s < 3600 ? Math.round(s / 60) + ' min ago' : s < 86400 ? Math.round(s / 3600) + ' h ago' : Math.round(s / 86400) + ' d ago'; };
  const story = e => `<div class="story ${esc(e.kind)}"><span class="ic">${ICON[e.kind] || '📰'}</span><p>${esc(e.text)}<small>${ago(e.created)}</small></p></div>`;
  const paint = () => {
    const t = $('#ticker'), f = $('#feed');
    if (t && feed[0]) t.innerHTML = `<b>LIVE</b> ${esc(feed[0].text)}`;
    if (f) f.innerHTML = feed.map(story).join('') || '<div class="empty">No news yet. Go do something newsworthy.</div>';
  };
  async function poll() {
    if (document.hidden) return;
    try {
      const r = await baseApi('/api/gazette?since=' + lastId);
      if (r.events && r.events.length) {
        if (lastId && window.Town) r.events.slice().reverse().forEach(window.Town.onEvent);   // only brand-new events, not the first backlog
        feed = [...r.events, ...feed].slice(0, 60); lastId = r.events[0].id; paint();
      }
    } catch (err) { /* server napping, try again next tick */ }
  }
  SCREENS.gazette = {
    html: () => `<div class="full gazette"><div class="mast"><div class="mast-title">The Stoop Gazette</div><small>All the tools that are fit to print · <span class="live">● live</span></small></div><div id="feed"></div></div>`,
    after: paint,
  };
  poll(); setInterval(poll, 5000);
  // ---------- Wanted board: "I need a ___" ----------
  let wishes = null;
  const wishRow = w => `<div class="card" style="cursor:default"><div class="ico ${w.granted_by ? '' : 'coral'}"></div><div style="flex:1"><b>${esc(w.mine ? 'You are' : w.author + ' is')} looking for ${esc(w.text)}</b><small>${w.granted_by ? '✅ ' + esc(w.granted_by) + ' has one!' : ago(w.created)}</small></div>
    ${w.can_grant ? `<button class="primary" data-wish-grant="${w.id}">I've got one!</button>` : ''}${w.mine ? `<button data-wish-del="${w.id}">Remove</button>` : ''}</div>`;
  const paintWishes = () => { const el = $('#wishes'); if (el && wishes) el.innerHTML = wishes.map(wishRow).join('') || `<div class="empty">${esc(window.quip('empty_wanted'))}</div>`; };
  const loadWishes = async () => { wishes = (await baseApi('/api/wishes')).wishes; paintWishes(); };
  SCREENS.wanted = {
    html: () => `<div class="full"><h2 style="margin:6px 0 0">Wanted</h2><small class="due">Need something nobody has listed? Ask the street.</small>
      <form id="wishForm" class="wishform"><input id="wishText" maxlength="120" placeholder="Looking for ${esc(window.quip('wish_hint'))}..." autocomplete="off"><button class="primary">Post wish</button></form><div id="wishes"></div></div>`,
    after: () => { paintWishes(); loadWishes(); },
  };
  document.addEventListener('submit', async e => {
    if (e.target.id !== 'wishForm') return;
    e.preventDefault();
    const text = $('#wishText').value.trim();
    if (text) { await api('/api/wishes/add', {text}); await loadWishes(); $('#wishText').value = ''; }
  });
  document.addEventListener('click', async e => {
    const g = e.target.closest('[data-wish-grant]'), d = e.target.closest('[data-wish-del]');
    if (g) { await api(`/api/wishes/${g.dataset.wishGrant}/grant`, {}); await loadWishes(); }
    else if (d) { await api(`/api/wishes/${d.dataset.wishDel}/delete`, {}); await loadWishes(); }
  });

  // ---------- Hall of Fame: karma + badges ----------
  let fame = null;
  const fameRow = r => `<div class="card ${r.is_me ? 'on' : ''}" style="cursor:default"><div class="rank">${['🥇', '🥈', '🥉'][r.rank - 1] || '#' + r.rank}</div>
    <div style="flex:1"><b>${esc(r.name)}${r.is_me ? ' (you)' : ''}</b> <small style="display:inline">· ${esc(r.title)}</small>
    <small>${r.lent} lent · ${r.borrowed} borrowed · ${r.tools} listed · ${r.late} late · ${r.granted} wishes granted</small>
    <div class="badges">${r.badges.map(b => `<span class="badge">${b.icon} ${esc(b.title)}</span>`).join('')}</div></div>
    <div class="karma"><b>${r.karma}</b><small>karma</small></div></div>`;
  const paintFame = () => { const el = $('#fame'); if (el && fame) el.innerHTML = fame.map(fameRow).join(''); };
  SCREENS.fame = {
    html: () => `<div class="full"><h2 style="margin:6px 0 0">Hall of Fame</h2><small class="due">Karma: lending earns it, returning on time keeps it, lateness spends it.</small><div id="fame" class="full" style="margin-top:8px"></div></div>`,
    after: async () => { paintFame(); fame = (await baseApi('/api/fame')).rows; paintFame(); },
  };

  if (S) render();                                      // app.js may have rendered before we loaded
})();

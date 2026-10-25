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
                  [/\/loans\/\d+\/approve$/, 'toast_approve'], [/\/decline$/, 'toast_decline'], [/\/return$/, 'toast_return'], [/\/nudge$/, 'toast_nudge']];
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
      if (r.events && r.events.length) { feed = [...r.events, ...feed].slice(0, 60); lastId = r.events[0].id; paint(); }
    } catch (err) { /* server napping, try again next tick */ }
  }
  SCREENS.gazette = {
    html: () => `<div class="full gazette"><div class="mast"><div class="mast-title">The Stoop Gazette</div><small>All the tools that are fit to print · <span class="live">● live</span></small></div><div id="feed"></div></div>`,
    after: paint,
  };
  poll(); setInterval(poll, 5000);
  if (S) render();                                      // app.js may have rendered before we loaded
})();

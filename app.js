const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let delId = null, S = null, view = 'map', sel = null, q = '', cat = 'All';
const csrf = () => (document.cookie.split('; ').find(c => c.startsWith('csrftoken=')) || '').split('=')[1] || '';
async function api(url, body) {
  const r = await fetch(url, {method: body ? 'POST' : 'GET', headers: {'Content-Type': 'application/json', 'X-CSRFToken': csrf()}, body: body ? JSON.stringify(body) : undefined});
  return r.json();
}
async function load() { S = await api('/api/state'); render(); }
const visible = () => S.tools.filter(t => !t.mine && (cat === 'All' || t.category === cat) && (t.name + t.owner).toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.distance - b.distance);
function card(t, extra = '') {
  return `<div class="card ${sel === t.id ? 'on' : ''}" data-tool="${t.id}"><div class="ico ${t.category === 'Garden' ? 'coral' : ''}"></div>
  <div style="flex:1"><b>${esc(t.name)}</b><small>${esc(t.owner)} · ${esc(t.street)} · ${t.distance} mi</small></div>
  <span class="${t.status}">${t.status === 'free' ? 'Free' : 'Out'}</span>${extra}</div>`;
}
function mapSvg(tools) {
  const pins = tools.map((t, i) => { const cx = t.x + (i % 3) * 5, cy = t.y - 6; return `<g data-tool="${t.id}" style="cursor:pointer"><circle cx="${cx}" cy="${cy}" r="${sel === t.id ? 5.5 : 4.4}" fill="${t.category === 'Garden' ? '#FF5C39' : '#3A4BFF'}"/><text x="${cx}" y="${cy + 1}" font-size="2.6" fill="#fff" text-anchor="middle" font-weight="800">${esc(t.name.split(' ').pop().slice(0, 7))}</text></g>`; }).join('');
  return `<svg viewBox="0 0 100 100" width="100%" style="max-height:62vh"><rect width="100" height="100" fill="#FFF8DC" rx="3"/>
  <rect x="62" y="12" width="26" height="20" rx="4" fill="#CDEBB0"/>
  <g stroke="#fff" stroke-width="3.5" stroke-linecap="round"><path d="M0 40 L100 34"/><path d="M0 78 L100 74"/><path d="M30 0 L34 100"/><path d="M70 0 L66 100"/></g>
  <circle cx="${S.me.x}" cy="${S.me.y}" r="7" fill="#3A4BFF" opacity=".15"/><circle cx="${S.me.x}" cy="${S.me.y}" r="2.2" fill="#1B1B2F"/>${pins}</svg>`;
}
function detail() {
  const t = S.tools.find(x => x.id === sel);
  if (!t) return '<div class="detail empty">Pick a tool on the map or list.</div>';
  const ask = t.asked ? '<button disabled>Request sent</button>' : t.status === 'out' ? '<button disabled>Currently out</button>' : `<textarea id="msg" rows="2" placeholder="Say hi, when do you need it?"></textarea><button class="primary" data-ask="${t.id}">Ask ${esc(t.owner)} to borrow</button>`;
  return `<div class="detail"><b style="font-size:20px">${esc(t.name)}</b><small>${esc(t.owner)} · ${t.distance} mi · ${esc(t.category)}</small><p>${esc(t.description) || 'No notes.'}</p>${ask}</div>`;
}
function render() {
  $('#me').innerHTML = S.neighbors.map(n => `<option value="${n.id}" ${n.id === S.me.id ? 'selected' : ''}>${esc(n.name)}</option>`).join('');
  document.querySelectorAll('.nav').forEach(b => b.classList.toggle('on', b.dataset.view === view));
  $('#badge').textContent = S.loans.filter(l => l.incoming && l.status === 'requested').length || '';
  const cats = ['All', ...new Set(S.tools.map(t => t.category))];
  $('#chips').innerHTML = cats.map(c => `<button class="chip ${c === cat ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
  const d = Math.ceil((new Date(S.next_tool_at) - Date.now()) / 864e5);
  $('#next').textContent = d <= 0 ? 'A new neighbor tool is arriving' : `Next new tool in ${d} day${d === 1 ? '' : 's'}`;
  const v = $('#view');
  if (view === 'map') {
    const ts = visible();
    v.innerHTML = `<div class="map">${mapSvg(ts)}</div><div class="panel">${detail()}${ts.map(t => card(t)).join('') || '<div class="empty">No tools match.</div>'}</div>`;
  } else if (view === 'mine') {
    const mine = S.tools.filter(t => t.mine);
    v.innerHTML = `<div class="full">${mine.map(t => card(t, `<button data-del="${t.id}">Remove</button>`)).join('') || '<div class="empty">You have not listed anything yet. Press Ctrl N.</div>'}</div>`;
  } else {
    const row = l => `<div class="card" style="cursor:default"><div style="flex:1"><b>${esc(l.tool)}</b><small>${l.incoming ? esc(l.borrower) + ' wants it' : 'You asked ' + esc(l.owner)}${l.message ? ' · "' + esc(l.message) + '"' : ''}</small></div><span class="${l.status === 'approved' ? 'free' : ''}">${esc(l.status)}</span>
    ${l.incoming && l.status === 'requested' ? `<button class="primary" data-loan="${l.id}" data-a="approve">Approve</button><button data-loan="${l.id}" data-a="decline">Decline</button>` : ''}
    ${l.incoming && l.status === 'approved' ? `<button data-loan="${l.id}" data-a="return">Mark returned</button>` : ''}</div>`;
    v.innerHTML = `<div class="full">${S.loans.map(row).join('') || '<div class="empty">No requests yet.</div>'}</div>`;
  }
}
document.addEventListener('click', async e => {
  const t = e.target.closest('[data-tool]'), n = e.target.closest('[data-view]'), c = e.target.closest('[data-cat]');
  const ask = e.target.closest('[data-ask]'), del = e.target.closest('[data-del]'), ln = e.target.closest('[data-loan]');
  if (ask) { await api(`/api/tools/${ask.dataset.ask}/request`, {message: ($('#msg') || {}).value}); await load(); }
  else if (del) { delId = +del.dataset.del; $('#delName').textContent = S.tools.find(x => x.id === delId).name; $('#del').showModal(); }
  else if (ln) { await api(`/api/loans/${ln.dataset.loan}/${ln.dataset.a}`, {}); await load(); }
  else if (n) { view = n.dataset.view; render(); }
  else if (c) { cat = c.dataset.cat; render(); }
  else if (t) { sel = +t.dataset.tool; render(); }
});
$('#me').onchange = async e => { await api('/api/me', {id: +e.target.value}); sel = null; await load(); };
$('#q').oninput = e => { q = e.target.value; render(); };
$('#addBtn').onclick = () => $('#add').showModal();
$('#addForm').onsubmit = async e => {
  if (e.submitter && e.submitter.value === 'ok') {
    await api('/api/tools', Object.fromEntries(new FormData(e.target)));
    e.target.reset(); view = 'mine'; await load();
  }
};
$('#delForm').onsubmit = async e => {
  if (e.submitter && e.submitter.value === 'ok') { await api(`/api/tools/${delId}/delete`, {}); await load(); }
};
window.addEventListener('focus', load);
document.addEventListener('keydown', e => {
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') { e.preventDefault(); $('#add').showModal(); }
  else if (!typing && e.key === '/') { e.preventDefault(); $('#q').focus(); }
  else if (!typing && ['1', '2', '3'].includes(e.key)) { view = ['map', 'mine', 'loans'][+e.key - 1]; render(); }
});
load();

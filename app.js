// Shared client helpers for the landing page (index.html) and the portal (portal.html).
// Loaded as a classic script before each page's inline script.

const TOKEN_KEY = 'cs_token';
const getTok = () => { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } };
const setTok = (t) => { try { localStorage.setItem(TOKEN_KEY, t); } catch {} };
const clearTok = () => { try { localStorage.removeItem(TOKEN_KEY); } catch {} };

async function api(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Accept': 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (auth) { const t = getTok(); if (t) headers['Authorization'] = 'Bearer ' + t; }
  const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = {}; try { data = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, data };
}

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = (u) => { try { const x = new URL(u); return (x.protocol === 'http:' || x.protocol === 'https:') ? x.href : ''; } catch { return ''; } };
const fmtDate = (ts) => { try { return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return ''; } };
const ICON_LINK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>';
const ICON_GH = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.36 1.09 2.94.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"/></svg>';

let me = null;            // the signed-in account, or null
const projCache = {};     // id -> project, for the edit flow
function canManage(p) { return me && (me.role === 'admin' || me.id === p.userId); }

function projectCard(p) {
  if (p && p.id) projCache[p.id] = p;
  const live = safeUrl(p.projectLink), gh = safeUrl(p.githubLink);
  let links = '';
  if (live) links += `<a href="${esc(live)}" target="_blank" rel="noopener">${ICON_LINK} Live</a>`;
  if (gh) links += `<a href="${esc(gh)}" target="_blank" rel="noopener">${ICON_GH} Code</a>`;
  const ctrl = canManage(p)
    ? `<div class="proj-ctrl"><button type="button" class="pbtn" data-edit="${esc(p.id)}">Edit</button><button type="button" class="pbtn danger" data-del="${esc(p.id)}">Delete</button></div>`
    : '';
  return `<article class="proj">
    <div class="proj-top"><h3>${esc(p.title)}</h3><span class="proj-cat">${esc(p.category)}</span></div>
    ${p.name ? `<div class="by">by <b>${esc(p.name)}</b></div>` : ''}
    <p class="desc">${esc(p.writeup)}</p>
    ${links ? `<div class="proj-links">${links}</div>` : ''}
    ${ctrl}
  </article>`;
}

async function loadShowcase() {
  const grid = document.getElementById('showcaseGrid');
  if (!grid) return;
  try {
    const res = await fetch('/api/projects', { headers: { 'Accept': 'application/json' } });
    const data = await res.json().catch(() => ({}));
    const projects = Array.isArray(data.projects) ? data.projects : [];
    grid.innerHTML = projects.length
      ? projects.map(projectCard).join('')
      : '<div class="showcase-empty">No projects published yet — be the first to ship something this summer.</div>';
  } catch (err) {
    grid.innerHTML = '<div class="showcase-empty">Showcase is warming up. Check back shortly.</div>';
  }
}

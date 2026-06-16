import { redis, hasRedis, PROJECTS_KEY, loadProjects } from './_redis.js';
import { getUser, publicUser } from './_auth.js';

// Owner/admin only.
//   GET  → every account + every submission (full detail)
//   POST → manage accounts:
//            { action: 'deactivate' | 'activate' | 'delete', id }
//            { action: 'deactivate-students' }
export default async function handler(req, res) {
  if (!hasRedis) return res.status(503).json({ error: 'Database not configured yet.' });
  const me = await getUser(req);
  if (!me) return res.status(401).json({ error: 'Not signed in.' });
  if (me.role !== 'admin') return res.status(403).json({ error: 'Admins only.' });

  // ---- GET: dashboard data ----
  if (req.method === 'GET') {
    const ids = await redis.lrange('users:all', 0, 999);
    let users = [];
    if (ids.length) {
      const raw = await redis.mget(...ids.map((id) => 'user:' + id));
      users = raw.filter(Boolean).map((u) => publicUser(typeof u === 'string' ? JSON.parse(u) : u));
    }
    const projects = await loadProjects(0, 999);
    return res.status(200).json({ users, projects });
  }

  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'Method not allowed' }); }

  // ---- POST: account management ----
  let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } } b = b || {};
  const action = String(b.action || '');

  if (action === 'deactivate-students') {
    const ids = await redis.lrange('users:all', 0, 9999);
    let count = 0;
    for (const id of ids) {
      const u = await redis.get('user:' + id);
      if (u && u.role !== 'admin' && u.active !== false) {
        await redis.set('user:' + id, { ...u, active: false });
        count++;
      }
    }
    return res.status(200).json({ ok: true, deactivated: count });
  }

  const id = String(b.id || '');
  if (!id) return res.status(400).json({ error: 'Missing account id.' });
  if (id === me.id) return res.status(400).json({ error: "You can't change your own account here." });

  const owner = await redis.get('meta:owner');
  if (id === owner) return res.status(400).json({ error: "The owner account can't be removed or deactivated." });

  const target = await redis.get('user:' + id);
  if (!target) return res.status(404).json({ error: 'Account not found.' });

  if (action === 'deactivate' || action === 'activate') {
    await redis.set('user:' + id, { ...target, active: action === 'activate' });
    return res.status(200).json({ ok: true });
  }

  if (action === 'delete') {
    const projIds = await redis.lrange(PROJECTS_KEY, 0, 9999);
    if (projIds.length) {
      const raw = await redis.mget(...projIds.map((pid) => 'project:' + pid));
      for (const item of raw) {
        const p = typeof item === 'string' ? JSON.parse(item) : item;
        if (p && p.userId === id) {
          await redis.del('project:' + p.id);
          await redis.lrem(PROJECTS_KEY, 0, p.id);
        }
      }
    }
    await redis.del('user:' + id);
    if (target.username) await redis.del('user:byname:' + target.username.toLowerCase());
    await redis.lrem('users:all', 0, id);
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'Unknown action.' });
}

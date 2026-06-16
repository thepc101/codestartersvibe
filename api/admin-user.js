import { redis, hasRedis, PROJECTS_KEY } from './_redis.js';
import { getUser } from './_auth.js';

// Owner/admin: manage accounts.
//   { action: 'deactivate' | 'activate' | 'delete', id }   — one account
//   { action: 'deactivate-students' }                       — all non-admin accounts
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  if (!hasRedis) return res.status(503).json({ error: 'Database not configured yet.' });

  const me = await getUser(req);
  if (!me) return res.status(401).json({ error: 'Not signed in.' });
  if (me.role !== 'admin') return res.status(403).json({ error: 'Admins only.' });

  let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } } b = b || {};
  const action = String(b.action || '');

  // ---- Bulk: deactivate every non-admin account (end-of-bootcamp) ----
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

  // ---- Single-account actions ----
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
    // Remove the account, its username reservation, and all its submissions.
    const projIds = await redis.lrange(PROJECTS_KEY, 0, 9999);
    if (projIds.length) {
      const raw = await redis.mget(...projIds.map((pid) => 'project:' + pid));
      for (let i = 0; i < raw.length; i++) {
        const p = typeof raw[i] === 'string' ? JSON.parse(raw[i]) : raw[i];
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

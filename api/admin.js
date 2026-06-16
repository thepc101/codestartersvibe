import { redis, hasRedis, loadProjects } from './_redis.js';
import { getUser, publicUser } from './_auth.js';

// Owner/admin only. Returns every account and every submission (full detail).
export default async function handler(req, res) {
  if (!hasRedis) return res.status(503).json({ error: 'Database not configured yet.' });
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Not signed in.' });
  if (user.role !== 'admin') return res.status(403).json({ error: 'Admins only.' });

  const ids = await redis.lrange('users:all', 0, 999);
  let users = [];
  if (ids.length) {
    const raw = await redis.mget(...ids.map((id) => 'user:' + id));
    users = raw.filter(Boolean).map((u) => publicUser(typeof u === 'string' ? JSON.parse(u) : u));
  }

  const projects = await loadProjects(0, 999); // every submission, full detail

  return res.status(200).json({ users, projects });
}

import { redis, hasRedis, PROJECTS_KEY } from './_redis.js';
import { getUser } from './_auth.js';

const str = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

// Delete a submission. Owner of the submission, or any admin, may delete.
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  if (!hasRedis) return res.status(503).json({ error: 'Database not configured yet.' });

  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in.' });

  let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } } b = b || {};
  const id = str(b.id, 80);
  if (!id) return res.status(400).json({ error: 'Missing project id.' });

  const project = await redis.get('project:' + id);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  if (project.userId !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: "You can only delete your own projects." });
  }

  await redis.del('project:' + id);
  await redis.lrem(PROJECTS_KEY, 0, id); // drop the id from the index
  return res.status(200).json({ ok: true });
}

import { hasRedis, loadProjects } from './_redis.js';
import { getUser } from './_auth.js';

// The signed-in user's own submissions (full detail), newest first.
export default async function handler(req, res) {
  if (!hasRedis) return res.status(503).json({ error: 'Database not configured yet.' });
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Not signed in.' });

  const all = await loadProjects(0, 999);
  const projects = all.filter((p) => p.userId === user.id);
  return res.status(200).json({ projects });
}

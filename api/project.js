import { redis, hasRedis, PROJECTS_KEY } from './_redis.js';
import { getUser } from './_auth.js';

const str = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const CATEGORIES = ['AI App', 'AI Agent', 'AI Automation', 'Startup Idea'];

// POST { action: 'update' | 'delete', id, ...fields }
// A submission's author, or any admin, may edit or delete it.
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  if (!hasRedis) return res.status(503).json({ error: 'Database not configured yet.' });

  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in.' });

  let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } } b = b || {};
  const action = String(b.action || '');
  const id = str(b.id, 80);
  if (!id) return res.status(400).json({ error: 'Missing project id.' });

  const project = await redis.get('project:' + id);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  if (project.userId !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: 'You can only change your own projects.' });
  }

  if (action === 'delete') {
    await redis.del('project:' + id);
    await redis.lrem(PROJECTS_KEY, 0, id);
    return res.status(200).json({ ok: true });
  }

  if (action === 'update') {
    const title = str(b.project_title, 160);
    const category = str(b.category, 40);
    const writeup = str(b.writeup, 2000);
    if (!title || !category || !writeup) return res.status(400).json({ error: 'Please fill in project title, category, and write-up.' });
    if (!CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category.' });
    const updated = {
      ...project,
      title, category, writeup,
      projectLink: str(b.project_link, 500),
      githubLink: str(b.github_link, 500),
      screenshots: str(b.screenshots, 500),
      updatedAt: Date.now(),
    };
    await redis.set('project:' + id, updated);
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'Unknown action.' });
}

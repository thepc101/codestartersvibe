import { redis, hasRedis, PROJECTS_KEY } from './_redis.js';
import { getUser, newId } from './_auth.js';

const MAX = 500; // keep the newest 500 submissions

const str = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const CATEGORIES = ['AI App', 'AI Agent', 'AI Automation', 'Startup Idea'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!hasRedis) {
    return res.status(503).json({ error: 'Database not configured yet. Connect Redis in Vercel → Storage.' });
  }

  // Must be signed in to publish.
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in to publish a project.' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  // Honeypot — bots fill hidden fields; humans never do.
  if (str(body._honey, 100)) return res.status(200).json({ ok: true });

  const title = str(body.project_title, 160);
  const category = str(body.category, 40);
  const writeup = str(body.writeup, 2000);
  const projectLink = str(body.project_link, 500);
  const githubLink = str(body.github_link, 500);
  const screenshots = str(body.screenshots, 500);

  if (!title || !category || !writeup) {
    return res.status(400).json({ error: 'Please fill in project title, category, and write-up.' });
  }
  if (!CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Invalid category.' });
  }

  const id = newId();
  const record = {
    id,
    name: user.username,   // author is the signed-in account
    userId: user.id,
    title, category, writeup,
    projectLink, githubLink, screenshots,
    ts: Date.now(),
  };

  try {
    await redis.set('project:' + id, record);   // the record lives in its own key (editable/deletable)
    await redis.lpush(PROJECTS_KEY, id);         // the list just holds ids, newest first
    await redis.ltrim(PROJECTS_KEY, 0, MAX - 1);
  } catch (err) {
    return res.status(500).json({ error: 'Could not save your project. Please try again.' });
  }

  return res.status(200).json({ ok: true, id });
}

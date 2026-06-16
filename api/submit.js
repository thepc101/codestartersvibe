import { redis, hasRedis, PROJECTS_KEY } from './_redis.js';

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

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  // Honeypot — bots fill hidden fields; humans never do.
  if (str(body._honey, 100)) return res.status(200).json({ ok: true });

  const name = str(body.name, 120);
  const title = str(body.project_title, 160);
  const category = str(body.category, 40);
  const writeup = str(body.writeup, 2000);
  const email = str(body.email, 200);
  const projectLink = str(body.project_link, 500);
  const githubLink = str(body.github_link, 500);
  const screenshots = str(body.screenshots, 500);

  if (!name || !title || !category || !writeup) {
    return res.status(400).json({ error: 'Please fill in name, project title, category, and write-up.' });
  }
  if (!CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Invalid category.' });
  }

  const record = {
    id: (globalThis.crypto?.randomUUID?.() || String(Date.now()) + Math.round(Math.random() * 1e6)),
    name, title, category, writeup,
    projectLink, githubLink, screenshots,
    email,                 // stored for organizers only — never returned by /api/projects
    ts: Date.now(),
  };

  try {
    await redis.lpush(PROJECTS_KEY, record); // newest first
    await redis.ltrim(PROJECTS_KEY, 0, MAX - 1);
  } catch (err) {
    return res.status(500).json({ error: 'Could not save your project. Please try again.' });
  }

  return res.status(200).json({ ok: true, id: record.id });
}

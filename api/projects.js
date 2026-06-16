import { hasRedis, loadProjects } from './_redis.js';

// Public showcase feed (newest 200). Includes userId so a signed-in client can tell
// which cards it owns (to show edit/delete) — no private fields are stored at all.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!hasRedis) {
    return res.status(200).json({ projects: [], configured: false });
  }
  try {
    const projects = await loadProjects(0, 199);
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
    return res.status(200).json({ projects, configured: true });
  } catch (err) {
    return res.status(500).json({ error: 'Could not load projects.' });
  }
}

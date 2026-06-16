import { redis, hasRedis, PROJECTS_KEY } from './_redis.js';

// Public showcase feed. Returns published projects WITHOUT private fields (email).
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!hasRedis) {
    // Don't break the page before the DB is connected — just show an empty showcase.
    return res.status(200).json({ projects: [], configured: false });
  }

  try {
    const raw = await redis.lrange(PROJECTS_KEY, 0, 199); // newest 200
    const projects = raw.map((p) => (typeof p === 'string' ? JSON.parse(p) : p)); // @upstash auto-parses; guard anyway
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
    return res.status(200).json({ projects, configured: true });
  } catch (err) {
    return res.status(500).json({ error: 'Could not load projects.' });
  }
}

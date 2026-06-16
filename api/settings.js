import { redis, hasRedis, getSettings } from './_redis.js';
import { getUser } from './_auth.js';

// GET  → current portal-access flags (public, so the login page can reflect them)
// POST → owner/admin updates the flags { signupOpen?, loginOpen? }
export default async function handler(req, res) {
  if (!hasRedis) return res.status(200).json({ signupOpen: true, loginOpen: true, configured: false });

  if (req.method === 'GET') {
    return res.status(200).json(await getSettings());
  }
  if (req.method === 'POST') {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Not signed in.' });
    if (user.role !== 'admin') return res.status(403).json({ error: 'Admins only.' });

    let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } } b = b || {};
    if (typeof b.signupOpen === 'boolean') await redis.set('meta:signupOpen', b.signupOpen ? 1 : 0);
    if (typeof b.loginOpen === 'boolean') await redis.set('meta:loginOpen', b.loginOpen ? 1 : 0);
    return res.status(200).json({ ok: true, ...(await getSettings()) });
  }
  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}

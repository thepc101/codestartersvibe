import { redis, hasRedis, getSettings } from './_redis.js';
import { verifyPassword, createSession, publicUser } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  if (!hasRedis) return res.status(503).json({ error: 'Database not configured yet. Connect Redis in Vercel → Storage.' });

  let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } } b = b || {};
  const username = String(b.username || '').trim();
  const password = String(b.password || '');
  if (!username || !password) return res.status(400).json({ error: 'Enter your username and password.' });

  const id = await redis.get('user:byname:' + username.toLowerCase());
  if (!id) return res.status(401).json({ error: 'Invalid username or password.' });

  const user = await redis.get('user:' + id);
  if (!user || !verifyPassword(password, user.salt, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }
  if (user.active === false) {
    return res.status(403).json({ error: 'This account has been deactivated. Contact the organizers.' });
  }
  // When logins are closed, students are blocked but admins can always get in.
  if (user.role !== 'admin') {
    const { loginOpen } = await getSettings();
    if (!loginOpen) return res.status(403).json({ error: 'Logins are currently closed by the organizers.' });
  }

  const token = await createSession(id);
  return res.status(200).json({ token, user: publicUser(user) });
}

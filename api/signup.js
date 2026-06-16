import { redis, hasRedis, getSettings } from './_redis.js';
import { USER_RE, makeSalt, hashPassword, newId, createSession, publicUser } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  if (!hasRedis) return res.status(503).json({ error: 'Database not configured yet. Connect Redis in Vercel → Storage.' });

  let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } } b = b || {};
  const username = String(b.username || '').trim();
  const password = String(b.password || '');
  const firstName = String(b.firstName || '').trim().slice(0, 60);
  const lastName = String(b.lastName || '').trim().slice(0, 60);

  if (!USER_RE.test(username)) return res.status(400).json({ error: 'Username must be 3–30 characters: letters, numbers, _ or .' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  // If signups are closed, block new accounts — but always allow the very first
  // account so the portal can be bootstrapped.
  const existingOwner = await redis.get('meta:owner');
  if (existingOwner) {
    const { signupOpen } = await getSettings();
    if (!signupOpen) return res.status(403).json({ error: 'New account signups are currently closed.' });
  }

  const id = newId();
  const lower = username.toLowerCase();

  // Reserve the username atomically — fails if already taken.
  const reserved = await redis.set('user:byname:' + lower, id, { nx: true });
  if (reserved !== 'OK' && reserved !== true) return res.status(409).json({ error: 'That username is already taken.' });

  // First account ever created becomes the owner/admin.
  const claimedOwner = await redis.set('meta:owner', id, { nx: true });
  const role = (claimedOwner === 'OK' || claimedOwner === true) ? 'admin' : 'user';

  const salt = makeSalt();
  const user = { id, username, firstName, lastName, passwordHash: hashPassword(password, salt), salt, role, active: true, createdAt: Date.now() };

  await redis.set('user:' + id, user);
  await redis.lpush('users:all', id);

  const token = await createSession(id);
  return res.status(200).json({ token, user: publicUser(user) });
}

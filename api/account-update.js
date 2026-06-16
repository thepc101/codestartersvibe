import { redis, hasRedis } from './_redis.js';
import { getUser, publicUser, verifyPassword, hashPassword, makeSalt } from './_auth.js';

// Update your own profile (first/last name) and/or change your password.
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  if (!hasRedis) return res.status(503).json({ error: 'Database not configured yet.' });

  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in.' });

  let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } } b = b || {};

  const updated = { ...user };
  if (typeof b.firstName === 'string') updated.firstName = b.firstName.trim().slice(0, 60);
  if (typeof b.lastName === 'string') updated.lastName = b.lastName.trim().slice(0, 60);

  // Optional password change — requires the current password.
  const newPassword = String(b.newPassword || '');
  if (newPassword) {
    const currentPassword = String(b.currentPassword || '');
    if (!verifyPassword(currentPassword, user.salt, user.passwordHash)) {
      return res.status(400).json({ error: 'Your current password is incorrect.' });
    }
    if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    updated.salt = makeSalt();
    updated.passwordHash = hashPassword(newPassword, updated.salt);
  }

  await redis.set('user:' + user.id, updated);
  return res.status(200).json({ ok: true, user: publicUser(updated) });
}

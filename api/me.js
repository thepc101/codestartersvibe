import { hasRedis } from './_redis.js';
import { getUser, publicUser } from './_auth.js';

export default async function handler(req, res) {
  if (!hasRedis) return res.status(503).json({ error: 'Database not configured yet.' });
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Not signed in.' });
  return res.status(200).json({ user: publicUser(user) });
}

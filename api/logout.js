import { redis, hasRedis } from './_redis.js';
import { bearer } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  if (hasRedis) {
    const token = bearer(req);
    if (token) await redis.del('sess:' + token);
  }
  return res.status(200).json({ ok: true });
}

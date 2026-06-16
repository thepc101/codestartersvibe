import { redis, hasRedis } from './_redis.js';

// Quick connectivity check. Visit /api/health after deploying to confirm Redis is wired up.
export default async function handler(req, res) {
  if (!hasRedis) {
    return res.status(200).json({ ok: false, redis: 'missing-env', hint: 'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel, then redeploy.' });
  }
  try {
    const pong = await redis.ping();
    return res.status(200).json({ ok: true, redis: 'connected', ping: pong });
  } catch (err) {
    return res.status(500).json({ ok: false, redis: 'error', error: String(err && err.message || err) });
  }
}

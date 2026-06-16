import { Redis } from '@upstash/redis';

// Reads the Upstash REST credentials. Supports every naming scheme Vercel/Upstash use:
//  - Upstash console / "Upstash for Redis":  UPSTASH_REDIS_REST_URL / _TOKEN
//  - Vercel storage integration:             STORAGE_KV_REST_API_URL / _TOKEN
//  - Older Vercel KV:                        KV_REST_API_URL / _TOKEN
// IMPORTANT: use the REST URL (https://…upstash.io) + REST (read/write) token, NOT the
// redis:// URL and NOT the READ_ONLY token (writes would fail).
const clean = (v) => (typeof v === 'string' ? v.trim() : v);
const url = clean(process.env.UPSTASH_REDIS_REST_URL || process.env.STORAGE_KV_REST_API_URL || process.env.KV_REST_API_URL);
const token = clean(process.env.UPSTASH_REDIS_REST_TOKEN || process.env.STORAGE_KV_REST_API_TOKEN || process.env.KV_REST_API_TOKEN);

export const PROJECTS_KEY = 'cs:projects';
export const hasRedis = Boolean(url && token);
export const redis = hasRedis ? new Redis({ url, token }) : null;

import { Redis } from '@upstash/redis';

// Works with either the Vercel KV integration (KV_REST_API_*) or a direct
// Upstash for Redis integration (UPSTASH_REDIS_REST_*). Whichever pair Vercel
// injected, we pick it up.
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const PROJECTS_KEY = 'cs:projects';
export const hasRedis = Boolean(url && token);
export const redis = hasRedis ? new Redis({ url, token }) : null;

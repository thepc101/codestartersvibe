import crypto from 'node:crypto';
import { redis } from './_redis.js';

const SESSION_TTL = 60 * 60 * 24 * 30; // 30 days

export const USER_RE = /^[a-zA-Z0-9_.]{3,30}$/;

export function makeSalt() { return crypto.randomBytes(16).toString('hex'); }
export function hashPassword(password, salt) { return crypto.scryptSync(password, salt, 64).toString('hex'); }
export function verifyPassword(password, salt, expected) {
  const got = Buffer.from(hashPassword(password, salt), 'hex');
  const exp = Buffer.from(String(expected || ''), 'hex');
  return got.length === exp.length && crypto.timingSafeEqual(got, exp);
}
export function newId() { return crypto.randomUUID(); }
export function newToken() { return crypto.randomBytes(32).toString('hex'); }

export async function createSession(userId) {
  const token = newToken();
  await redis.set('sess:' + token, userId, { ex: SESSION_TTL });
  return token;
}

export function bearer(req) {
  const h = req.headers['authorization'] || req.headers['Authorization'] || '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : '';
}

// Returns the full user record (incl. hash/salt) or null. Sanitize before sending to clients.
// Deactivated accounts are treated as not-signed-in (locked out everywhere).
export async function getUser(req) {
  const token = bearer(req);
  if (!token) return null;
  const id = await redis.get('sess:' + token);
  if (!id) return null;
  const user = await redis.get('user:' + id);
  if (!user || user.active === false) return null;
  return user;
}

// Public-safe view of a user.
export function publicUser(u) {
  if (!u) return null;
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
  return {
    id: u.id, username: u.username, role: u.role,
    firstName: u.firstName || '', lastName: u.lastName || '', name,
    active: u.active !== false, createdAt: u.createdAt,
  };
}

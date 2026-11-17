import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { AppEnv, SessionUser } from '../env';
import type { Role } from '../../shared/domain';
import { randomToken, sha256 } from './crypto';

export const SESSION_COOKIE = 'wfb_session';
export const DEVICE_COOKIE = 'wfb_device';
const SESSION_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days
const DEVICE_TTL = 1000 * 60 * 60 * 24 * 90; // 90 days

const cookieOpts = (c: Context<AppEnv>, maxAgeMs: number) => ({
  httpOnly: true,
  secure: new URL(c.req.url).protocol === 'https:',
  sameSite: 'Lax' as const,
  path: '/',
  maxAge: Math.floor(maxAgeMs / 1000),
});

export async function createSession(c: Context<AppEnv>, userId: string, mfaPassed: boolean) {
  const token = randomToken();
  const now = Date.now();
  await c.env.DB.prepare('INSERT INTO sessions (id, user_id, mfa_passed, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(await sha256(token), userId, mfaPassed ? 1 : 0, now + SESSION_TTL, now)
    .run();
  setCookie(c, SESSION_COOKIE, token, cookieOpts(c, SESSION_TTL));
}

export async function destroySession(c: Context<AppEnv>) {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(await sha256(token)).run();
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
}

export async function loadSessionUser(c: Context<AppEnv>): Promise<SessionUser | null> {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return null;
  const id = await sha256(token);
  const row = await c.env.DB.prepare(
    `SELECT s.id AS sid, s.mfa_passed, s.expires_at, u.id, u.email, u.first_name, u.last_name, u.role, u.email_verified
     FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?`,
  )
    .bind(id)
    .first<{
      sid: string; mfa_passed: number; expires_at: number; id: string; email: string;
      first_name: string; last_name: string; role: Role; email_verified: number;
    }>();
  if (!row || row.expires_at < Date.now()) return null;
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    emailVerified: !!row.email_verified,
    mfaPassed: !!row.mfa_passed,
    sessionId: row.sid,
  };
}

export async function markSessionMfa(c: Context<AppEnv>, sessionId: string) {
  await c.env.DB.prepare('UPDATE sessions SET mfa_passed = 1 WHERE id = ?').bind(sessionId).run();
}

export async function trustDevice(c: Context<AppEnv>, userId: string) {
  const token = randomToken();
  await c.env.DB.prepare('INSERT INTO trusted_devices (id, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(await sha256(token), userId, Date.now() + DEVICE_TTL)
    .run();
  setCookie(c, DEVICE_COOKIE, token, cookieOpts(c, DEVICE_TTL));
}

export async function isTrustedDevice(c: Context<AppEnv>, userId: string): Promise<boolean> {
  const token = getCookie(c, DEVICE_COOKIE);
  if (!token) return false;
  const row = await c.env.DB.prepare('SELECT expires_at FROM trusted_devices WHERE id = ? AND user_id = ?')
    .bind(await sha256(token), userId)
    .first<{ expires_at: number }>();
  return !!row && row.expires_at > Date.now();
}

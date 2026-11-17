import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv, Bindings } from '../env';
import { hashPassword, newId, otpCode, sha256, verifyPassword } from '../lib/crypto';
import { otpEmail, sendEmail } from '../lib/email';
import { body, checkTurnstile, currentUser, fail } from '../lib/http';
import { createSession, destroySession, isTrustedDevice, markSessionMfa, trustDevice } from '../lib/session';

type Purpose = 'verify_email' | 'login' | 'reset_password';
const OTP_TTL = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const MAX_FAILED_LOGINS = 5;
const FAILED_LOGIN_WINDOW = 15 * 60 * 1000;

const password = z
  .string()
  .min(10, 'Use at least 10 characters.')
  .max(128)
  .refine((p) => /[a-zA-Z]/.test(p) && /\d/.test(p), 'Use letters and at least one number.');
const email = z.email().max(254).transform((e) => e.trim().toLowerCase());
const code = z.string().regex(/^\d{6}$/, 'Enter the 6-digit code.');

async function issueOtp(env: Bindings, user: { id: string; email: string }, purpose: Purpose) {
  const last = await env.DB.prepare(
    'SELECT created_at FROM otp_codes WHERE user_id = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1',
  )
    .bind(user.id, purpose)
    .first<{ created_at: number }>();
  if (last && Date.now() - last.created_at < 30_000) fail(429, 'Please wait 30 seconds before requesting another code.');

  const value = otpCode();
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare('UPDATE otp_codes SET used = 1 WHERE user_id = ? AND purpose = ? AND used = 0').bind(user.id, purpose),
    env.DB.prepare(
      'INSERT INTO otp_codes (id, user_id, purpose, code_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).bind(newId(), user.id, purpose, await sha256(user.id + ':' + value), now + OTP_TTL, now),
  ]);
  await sendEmail(env, {
    to: user.email,
    subject: `${value} is your ${env.APP_NAME} code`,
    text: otpEmail(env.APP_NAME, value, purpose),
  });
}

async function consumeOtp(env: Bindings, userId: string, purpose: Purpose, value: string) {
  const row = await env.DB.prepare(
    'SELECT id, code_hash, attempts, expires_at FROM otp_codes WHERE user_id = ? AND purpose = ? AND used = 0 ORDER BY created_at DESC LIMIT 1',
  )
    .bind(userId, purpose)
    .first<{ id: string; code_hash: string; attempts: number; expires_at: number }>();
  if (!row || row.expires_at < Date.now()) fail(400, 'This code has expired. Request a new one.');
  if (row.attempts >= MAX_OTP_ATTEMPTS) fail(429, 'Too many wrong attempts. Request a new code.');
  if ((await sha256(userId + ':' + value)) !== row.code_hash) {
    await env.DB.prepare('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?').bind(row.id).run();
    fail(400, 'That code is not correct.');
  }
  await env.DB.prepare('UPDATE otp_codes SET used = 1 WHERE id = ?').bind(row.id).run();
}

/** Links pending team invitations to the user once their email is confirmed. */
async function activateInvites(env: Bindings, userId: string, userEmail: string) {
  await env.DB.prepare(
    "UPDATE memberships SET user_id = ?, status = 'active' WHERE email = ? AND status = 'pending'",
  )
    .bind(userId, userEmail)
    .run();
}

export const auth = new Hono<AppEnv>();

auth.get('/me', (c) => {
  const u = c.get('user');
  if (!u) return c.json({ user: null, next: null });
  const next = !u.emailVerified ? 'verify_email' : !u.mfaPassed ? 'login_code' : null;
  const { sessionId: _s, ...pub } = u;
  return c.json({ user: pub, next });
});

auth.post('/signup', async (c) => {
  const b = await body(
    c,
    z.object({
      email,
      password,
      firstName: z.string().trim().min(1).max(80),
      lastName: z.string().trim().min(1).max(80),
      turnstileToken: z.string().optional(),
    }),
  );
  await checkTurnstile(c, b.turnstileToken);
  const exists = await c.env.DB.prepare('SELECT 1 FROM users WHERE email = ?').bind(b.email).first();
  if (exists) fail(409, 'An account with this email already exists. Log in instead.');

  const id = newId();
  await c.env.DB.prepare(
    'INSERT INTO users (id, email, password_hash, first_name, last_name, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(id, b.email, await hashPassword(b.password), b.firstName, b.lastName, Date.now())
    .run();
  await createSession(c, id, false);
  await issueOtp(c.env, { id, email: b.email }, 'verify_email');
  return c.json({ next: 'verify_email' }, 201);
});

auth.post('/login', async (c) => {
  const b = await body(c, z.object({ email, password: z.string().min(1).max(128), turnstileToken: z.string().optional() }));
  await checkTurnstile(c, b.turnstileToken);

  const since = Date.now() - FAILED_LOGIN_WINDOW;
  const recent = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE email = ? AND created_at > ?')
    .bind(b.email, since)
    .first<{ n: number }>();
  if ((recent?.n ?? 0) >= MAX_FAILED_LOGINS) fail(429, 'Too many attempts. Try again in 15 minutes, or reset your password.');

  const user = await c.env.DB.prepare('SELECT id, email, password_hash, email_verified FROM users WHERE email = ?')
    .bind(b.email)
    .first<{ id: string; email: string; password_hash: string; email_verified: number }>();
  if (!user || !(await verifyPassword(b.password, user.password_hash))) {
    await c.env.DB.prepare('INSERT INTO login_attempts (email, created_at) VALUES (?, ?)').bind(b.email, Date.now()).run();
    fail(401, 'Email or password is incorrect.');
  }
  await c.env.DB.prepare('DELETE FROM login_attempts WHERE email = ?').bind(b.email).run();

  if (!user.email_verified) {
    await createSession(c, user.id, false);
    await issueOtp(c.env, user, 'verify_email');
    return c.json({ next: 'verify_email' });
  }
  if (await isTrustedDevice(c, user.id)) {
    await createSession(c, user.id, true);
    return c.json({ next: null });
  }
  await createSession(c, user.id, false);
  await issueOtp(c.env, user, 'login');
  return c.json({ next: 'login_code' });
});

auth.post('/verify', async (c) => {
  const u = currentUser(c);
  const b = await body(c, z.object({ code, rememberDevice: z.boolean().default(true) }));
  if (!u.emailVerified) {
    await consumeOtp(c.env, u.id, 'verify_email', b.code);
    await c.env.DB.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').bind(u.id).run();
    await activateInvites(c.env, u.id, u.email);
  } else if (!u.mfaPassed) {
    await consumeOtp(c.env, u.id, 'login', b.code);
  } else {
    return c.json({ next: null });
  }
  await markSessionMfa(c, u.sessionId);
  if (b.rememberDevice) await trustDevice(c, u.id);
  return c.json({ next: null });
});

auth.post('/resend', async (c) => {
  const u = currentUser(c);
  if (!u.emailVerified) await issueOtp(c.env, u, 'verify_email');
  else if (!u.mfaPassed) await issueOtp(c.env, u, 'login');
  return c.json({ ok: true });
});

auth.post('/logout', async (c) => {
  await destroySession(c);
  return c.json({ ok: true });
});

auth.post('/forgot', async (c) => {
  const b = await body(c, z.object({ email, turnstileToken: z.string().optional() }));
  await checkTurnstile(c, b.turnstileToken);
  const user = await c.env.DB.prepare('SELECT id, email FROM users WHERE email = ?')
    .bind(b.email)
    .first<{ id: string; email: string }>();
  // Same response whether or not the account exists, so emails can't be probed.
  if (user) {
    try {
      await issueOtp(c.env, user, 'reset_password');
    } catch {
      /* throttled: still respond the same way */
    }
  }
  return c.json({ ok: true });
});

auth.post('/reset', async (c) => {
  const b = await body(c, z.object({ email, code, password }));
  const user = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(b.email).first<{ id: string }>();
  if (!user) fail(400, 'That code is not correct.');
  await consumeOtp(c.env, user.id, 'reset_password', b.code);
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE users SET password_hash = ?, email_verified = 1 WHERE id = ?').bind(await hashPassword(b.password), user.id),
    c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id),
    c.env.DB.prepare('DELETE FROM trusted_devices WHERE user_id = ?').bind(user.id),
    c.env.DB.prepare('DELETE FROM login_attempts WHERE email = ?').bind(b.email),
  ]);
  return c.json({ ok: true });
});

import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { z } from 'zod';
import type { AppEnv, SessionUser } from '../env';

export function fail(status: 400 | 401 | 403 | 404 | 409 | 413 | 415 | 422 | 429, message: string): never {
  throw new HTTPException(status, { message });
}

/** Parse a JSON body against a zod schema, returning a 422 with the first issue on failure. */
export async function body<T extends z.ZodType>(c: Context<AppEnv>, schema: T): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    fail(400, 'Invalid JSON body.');
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    fail(422, issue ? `${issue.path.join('.') || 'body'}: ${issue.message}` : 'Invalid input.');
  }
  return parsed.data;
}

export function currentUser(c: Context<AppEnv>): SessionUser {
  const u = c.get('user');
  if (!u) fail(401, 'Please log in.');
  return u;
}

/** Verifies a Cloudflare Turnstile token when TURNSTILE_SECRET_KEY is configured. */
export async function checkTurnstile(c: Context<AppEnv>, token: string | undefined) {
  const secret = c.env.TURNSTILE_SECRET_KEY;
  if (!secret) return;
  if (!token) fail(400, 'Please complete the security check.');
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  const ip = c.req.header('CF-Connecting-IP');
  if (ip) form.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  const out = (await res.json()) as { success: boolean };
  if (!out.success) fail(400, 'Security check failed. Please try again.');
}

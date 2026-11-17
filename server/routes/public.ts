import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import { hmacSha512Hex, newId, safeEqual } from '../lib/crypto';
import { sendEmail } from '../lib/email';
import { body, checkTurnstile } from '../lib/http';
import { notifyProfile } from '../lib/notify';
import { getSettings } from '../lib/settings';

export const pub = new Hono<AppEnv>();

pub.get('/settings', async (c) => c.json({ settings: await getSettings(c.env.DB) }));

pub.post('/contact', async (c) => {
  const b = await body(
    c,
    z.object({
      name: z.string().trim().min(1).max(120),
      email: z.email().max(254),
      message: z.string().trim().min(1).max(5000),
      turnstileToken: z.string().optional(),
    }),
  );
  await checkTurnstile(c, b.turnstileToken);
  await c.env.DB.prepare('INSERT INTO contact_messages (id, name, email, message, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(newId(), b.name, b.email, b.message, Date.now())
    .run();
  await sendEmail(c.env, {
    to: c.env.SUPPORT_EMAIL,
    subject: `Website message from ${b.name}`,
    text: `From: ${b.name} <${b.email}>\n\n${b.message}`,
  });
  return c.json({ ok: true }, 201);
});

/**
 * Paystack webhooks. Configure the URL https://<your-site>/api/webhooks/paystack in the Paystack dashboard.
 * Signature: HMAC-SHA512 of the raw body with your secret key, in the x-paystack-signature header.
 */
pub.post('/webhooks/paystack', async (c) => {
  const secret = c.env.PAYSTACK_SECRET_KEY;
  if (!secret) return c.json({ ok: false }, 404);
  const raw = await c.req.text();
  const sig = c.req.header('x-paystack-signature') ?? '';
  if (!safeEqual(await hmacSha512Hex(secret, raw), sig)) return c.json({ ok: false }, 401);

  const evt = JSON.parse(raw) as { event: string; data: { customer_code?: string; reason?: string } };
  if (evt.event === 'customeridentification.success' || evt.event === 'customeridentification.failed') {
    const ok = evt.event.endsWith('success');
    const p = await c.env.DB.prepare('SELECT id FROM profiles WHERE paystack_customer_code = ?')
      .bind(evt.data.customer_code ?? '')
      .first<{ id: string }>();
    if (p) {
      await c.env.DB.prepare('UPDATE profiles SET bvn_status = ?, bvn_failure_reason = ? WHERE id = ?')
        .bind(ok ? 'verified' : 'failed', ok ? null : evt.data.reason ?? 'Verification failed', p.id)
        .run();
      await notifyProfile(c.env, p.id, {
        title: ok ? 'BVN verified' : 'BVN check failed',
        body: ok ? 'Your BVN has been verified.' : `We couldn’t verify your BVN: ${evt.data.reason ?? 'unknown reason'}. Please try again.`,
        link: '/dashboard',
      });
    }
  }
  // Always 200 for events we don't handle, so Paystack doesn't retry them.
  return c.json({ ok: true });
});

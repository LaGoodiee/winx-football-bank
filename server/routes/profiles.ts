import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import { requireAuth, profileAccess } from '../lib/access';
import { newId, reference } from '../lib/crypto';
import { sendEmail } from '../lib/email';
import { body, currentUser, fail } from '../lib/http';
import { createCustomer, isSimulated, listBanks, validateCustomer } from '../lib/paystack';
import { notifyProfile } from '../lib/notify';
import { getSettings } from '../lib/settings';

const ngPhone = z
  .string()
  .transform((s) => s.replace(/[\s-]/g, ''))
  .refine((s) => /^(\+234|0)[789][01]\d{8}$/.test(s), 'Enter a valid Nigerian phone number.');

export const profiles = new Hono<AppEnv>();
profiles.use('*', requireAuth);

profiles.get('/banks', async (c) => c.json({ banks: await listBanks(c.env), simulated: isSimulated(c.env) }));

profiles.get('/profiles', async (c) => {
  const u = currentUser(c);
  const { results } = await c.env.DB.prepare(
    `SELECT p.id, p.type, p.name, p.status, p.bvn_status AS bvnStatus, p.bvn_last4 AS bvnLast4, m.role,
       (SELECT id FROM applications a WHERE a.profile_id = p.id AND a.kind = 'account' ORDER BY created_at DESC LIMIT 1) AS accountApplicationId
     FROM memberships m JOIN profiles p ON p.id = m.profile_id
     WHERE m.user_id = ? AND m.status = 'active' ORDER BY p.created_at`,
  )
    .bind(u.id)
    .all();
  return c.json({ profiles: results });
});

profiles.post('/profiles', async (c) => {
  const u = currentUser(c);
  const b = await body(
    c,
    z.object({
      type: z.enum(['player', 'club', 'academy']),
      name: z.string().trim().min(2).max(120),
      address: z.string().trim().min(5).max(300),
      phone: ngPhone,
    }),
  );
  if (b.type === 'player') {
    const has = await c.env.DB.prepare(
      "SELECT 1 FROM profiles p JOIN memberships m ON m.profile_id = p.id WHERE m.user_id = ? AND m.role = 'owner' AND p.type = 'player'",
    )
      .bind(u.id)
      .first();
    if (has) fail(409, 'You already have a player account.');
  }
  const pid = newId();
  const aid = newId();
  const now = Date.now();
  await c.env.DB.batch([
    c.env.DB.prepare(
      'INSERT INTO profiles (id, type, name, address, phone, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).bind(pid, b.type, b.name, b.address, b.phone, u.id, now),
    c.env.DB.prepare(
      "INSERT INTO memberships (profile_id, email, user_id, role, status, created_at) VALUES (?, ?, ?, 'owner', 'active', ?)",
    ).bind(pid, u.email, u.id, now),
    c.env.DB.prepare(
      "INSERT INTO applications (id, reference, profile_id, kind, data, created_by, created_at, updated_at) VALUES (?, ?, ?, 'account', ?, ?, ?, ?)",
    ).bind(aid, reference(), pid, JSON.stringify({ address: b.address, phone: b.phone }), u.id, now, now),
  ]);
  return c.json({ profileId: pid, applicationId: aid }, 201);
});

profiles.get('/profiles/:id', async (c) => {
  const id = c.req.param('id');
  const role = await profileAccess(c, id, { allowStaff: true });
  const p = await c.env.DB.prepare(
    `SELECT id, type, name, address, phone, status, bvn_status AS bvnStatus, bvn_last4 AS bvnLast4,
            bvn_failure_reason AS bvnFailureReason, created_at AS createdAt FROM profiles WHERE id = ?`,
  )
    .bind(id)
    .first();
  const { results: members } = await c.env.DB.prepare(
    `SELECT m.email, m.role, m.status, u.first_name AS firstName, u.last_name AS lastName
     FROM memberships m LEFT JOIN users u ON u.id = m.user_id WHERE m.profile_id = ? ORDER BY m.created_at`,
  )
    .bind(id)
    .all();
  return c.json({ profile: p, members, myRole: role });
});

profiles.post('/profiles/:id/members', async (c) => {
  const id = c.req.param('id');
  await profileAccess(c, id, { ownerOnly: true });
  const u = currentUser(c);
  const b = await body(c, z.object({ email: z.email().transform((e) => e.trim().toLowerCase()) }));
  const p = await c.env.DB.prepare('SELECT type, name FROM profiles WHERE id = ?').bind(id).first<{ type: string; name: string }>();
  if (p?.type === 'player') fail(400, 'Team members can only be added to club and academy accounts.');
  const existing = await c.env.DB.prepare('SELECT id, email_verified FROM users WHERE email = ?')
    .bind(b.email)
    .first<{ id: string; email_verified: number }>();
  const active = existing?.email_verified ? 1 : 0;
  try {
    await c.env.DB.prepare(
      "INSERT INTO memberships (profile_id, email, user_id, role, status, created_at) VALUES (?, ?, ?, 'member', ?, ?)",
    )
      .bind(id, b.email, active ? existing!.id : null, active ? 'active' : 'pending', Date.now())
      .run();
  } catch {
    fail(409, 'This person is already on the team.');
  }
  await sendEmail(c.env, {
    to: b.email,
    subject: `${u.firstName} added you to ${p?.name} on ${c.env.APP_NAME}`,
    text: `${u.firstName} ${u.lastName} added you as a team member of ${p?.name}.\n\n${
      active ? 'Log in to see it on your dashboard.' : 'Create an account with this email address to get access.'
    }`,
  });
  return c.json({ ok: true, status: active ? 'active' : 'pending' }, 201);
});

profiles.delete('/profiles/:id/members/:email', async (c) => {
  const id = c.req.param('id');
  await profileAccess(c, id, { ownerOnly: true });
  const res = await c.env.DB.prepare("DELETE FROM memberships WHERE profile_id = ? AND email = ? AND role != 'owner'")
    .bind(id, decodeURIComponent(c.req.param('email')).toLowerCase())
    .run();
  if (!res.meta.changes) fail(404, 'Member not found.');
  return c.json({ ok: true });
});

/**
 * BVN check through Paystack. The BVN itself is never stored, only the last 4 digits.
 * Simulated mode (no Paystack key): a BVN ending in 0000 fails, any other passes.
 */
profiles.post('/profiles/:id/bvn', async (c) => {
  const id = c.req.param('id');
  await profileAccess(c, id, { ownerOnly: true });
  const u = currentUser(c);
  const b = await body(
    c,
    z.object({
      bvn: z.string().regex(/^\d{11}$/, 'BVN must be 11 digits.'),
      bankCode: z.string().min(3).max(10),
      accountNumber: z.string().regex(/^\d{10}$/, 'Account number must be 10 digits.'),
      firstName: z.string().trim().min(1).max(80),
      lastName: z.string().trim().min(1).max(80),
    }),
  );
  const p = await c.env.DB.prepare('SELECT bvn_status, paystack_customer_code, phone FROM profiles WHERE id = ?')
    .bind(id)
    .first<{ bvn_status: string; paystack_customer_code: string | null; phone: string | null }>();
  if (!p) fail(404, 'Not found.');
  if (p.bvn_status === 'verified') fail(409, 'BVN is already verified.');
  if (p.bvn_status === 'pending' && !isSimulated(c.env)) fail(409, 'A BVN check is already in progress.');

  let codeStr = p.paystack_customer_code;
  try {
    if (!codeStr) {
      codeStr = await createCustomer(c.env, { email: u.email, firstName: b.firstName, lastName: b.lastName, phone: p.phone ?? undefined });
    }
    await validateCustomer(c.env, codeStr, b);
  } catch (e) {
    console.error(e);
    fail(400, 'We couldn’t start the BVN check. Check the details and try again.');
  }

  let status: 'pending' | 'verified' | 'failed' = 'pending';
  let reason: string | null = null;
  if (isSimulated(c.env)) {
    status = b.bvn.endsWith('0000') ? 'failed' : 'verified';
    reason = status === 'failed' ? 'Simulated failure: the BVN does not match the bank account.' : null;
  }
  await c.env.DB.prepare(
    'UPDATE profiles SET bvn_status = ?, bvn_last4 = ?, bvn_failure_reason = ?, paystack_customer_code = ? WHERE id = ?',
  )
    .bind(status, b.bvn.slice(-4), reason, codeStr, id)
    .run();
  if (status !== 'pending') {
    await notifyProfile(c.env, id, {
      title: status === 'verified' ? 'BVN verified' : 'BVN check failed',
      body: status === 'verified' ? 'Your BVN has been verified.' : reason ?? 'Your BVN could not be verified.',
      link: '/dashboard',
    });
  }
  return c.json({ status, reason });
});

// ---- Savings goals (tracking only in Phase 1) ----

profiles.get('/profiles/:id/savings', async (c) => {
  const id = c.req.param('id');
  await profileAccess(c, id, { allowStaff: true });
  const { results } = await c.env.DB.prepare(
    `SELECT id, name, plan_type AS planType, target_kobo AS targetKobo, saved_kobo AS savedKobo,
            interest_rate AS interestRate, duration_days AS durationDays, start_date AS startDate
     FROM savings_goals WHERE profile_id = ? ORDER BY created_at`,
  )
    .bind(id)
    .all();
  return c.json({ goals: results });
});

profiles.post('/profiles/:id/savings', async (c) => {
  const id = c.req.param('id');
  await profileAccess(c, id);
  const u = currentUser(c);
  const b = await body(
    c,
    z.object({
      name: z.string().trim().min(2).max(80),
      planType: z.enum(['flexible', 'fixed']),
      durationDays: z.number().int().positive(),
      targetAmount: z.number().positive().max(1_000_000_000),
    }),
  );
  const settings = await getSettings(c.env.DB);
  const plan = settings.savings.plans.find((p) => p.days === b.durationDays);
  if (!plan) fail(422, 'Choose one of the available durations.');
  const rate = b.planType === 'fixed' ? plan.fixedRate : plan.flexibleRate;
  const gid = newId();
  const now = Date.now();
  await c.env.DB.prepare(
    `INSERT INTO savings_goals (id, profile_id, name, plan_type, target_kobo, interest_rate, duration_days, start_date, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(gid, id, b.name, b.planType, Math.round(b.targetAmount * 100), rate, b.durationDays, now, u.id, now)
    .run();
  return c.json({ id: gid }, 201);
});

profiles.patch('/savings/:goalId', async (c) => {
  const g = await c.env.DB.prepare('SELECT profile_id, target_kobo FROM savings_goals WHERE id = ?')
    .bind(c.req.param('goalId'))
    .first<{ profile_id: string; target_kobo: number }>();
  if (!g) fail(404, 'Not found.');
  await profileAccess(c, g.profile_id);
  const b = await body(c, z.object({ savedAmount: z.number().min(0).max(1_000_000_000) }));
  await c.env.DB.prepare('UPDATE savings_goals SET saved_kobo = ? WHERE id = ?')
    .bind(Math.round(b.savedAmount * 100), c.req.param('goalId'))
    .run();
  return c.json({ ok: true });
});

profiles.delete('/savings/:goalId', async (c) => {
  const g = await c.env.DB.prepare('SELECT profile_id FROM savings_goals WHERE id = ?')
    .bind(c.req.param('goalId'))
    .first<{ profile_id: string }>();
  if (!g) fail(404, 'Not found.');
  await profileAccess(c, g.profile_id);
  await c.env.DB.prepare('DELETE FROM savings_goals WHERE id = ?').bind(c.req.param('goalId')).run();
  return c.json({ ok: true });
});

// ---- Notifications ----

profiles.get('/notifications', async (c) => {
  const u = currentUser(c);
  const { results } = await c.env.DB.prepare(
    'SELECT id, title, body, link, read_at AS readAt, created_at AS createdAt FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
  )
    .bind(u.id)
    .all();
  const unread = results.filter((n) => !n.readAt).length;
  return c.json({ notifications: results, unread });
});

profiles.post('/notifications/read', async (c) => {
  const u = currentUser(c);
  await c.env.DB.prepare('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL').bind(Date.now(), u.id).run();
  return c.json({ ok: true });
});

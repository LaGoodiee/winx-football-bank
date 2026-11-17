import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import { KIND_LABEL, REVIEW_TRANSITIONS, STATUS_LABEL, type ApplicationStatus, type Settings } from '../../shared/domain';
import { requireRole } from '../lib/access';
import { body, currentUser, fail } from '../lib/http';
import { notifyProfile } from '../lib/notify';
import { getSettings, saveSettings } from '../lib/settings';
import { applicationDetail, loadApplication, recordStatus } from './applications';

export const admin = new Hono<AppEnv>();
admin.use('*', requireRole('reviewer', 'admin'));

admin.get('/stats', async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT status, COUNT(*) AS n FROM applications WHERE status != 'draft' GROUP BY status",
  ).all<{ status: ApplicationStatus; n: number }>();
  const unhandled = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM contact_messages WHERE handled = 0').first<{ n: number }>();
  return c.json({ byStatus: Object.fromEntries(results.map((r) => [r.status, r.n])), unhandledMessages: unhandled?.n ?? 0 });
});

admin.get('/applications', async (c) => {
  const status = c.req.query('status');
  const kind = c.req.query('kind');
  const q = c.req.query('q')?.trim();
  const where: string[] = ["a.status != 'draft'"];
  const params: unknown[] = [];
  if (status) {
    where.push('a.status = ?');
    params.push(status);
  }
  if (kind) {
    where.push('a.kind = ?');
    params.push(kind);
  }
  if (q) {
    where.push('(a.reference LIKE ? OR p.name LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }
  const { results } = await c.env.DB.prepare(
    `SELECT a.id, a.reference, a.kind, a.status, a.amount_kobo AS amountKobo, a.submitted_at AS submittedAt,
            a.updated_at AS updatedAt, p.name AS profileName, p.type AS profileType, p.bvn_status AS bvnStatus
     FROM applications a JOIN profiles p ON p.id = a.profile_id
     WHERE ${where.join(' AND ')} ORDER BY a.submitted_at ASC LIMIT 200`,
  )
    .bind(...params)
    .all();
  return c.json({ applications: results });
});

admin.get('/applications/:id', async (c) => {
  const row = await loadApplication(c.env, c.req.param('id'));
  const detail = await applicationDetail(c.env, row);
  const profile = await c.env.DB.prepare(
    `SELECT id, type, name, address, phone, status, bvn_status AS bvnStatus, bvn_last4 AS bvnLast4,
            bvn_failure_reason AS bvnFailureReason, created_at AS createdAt FROM profiles WHERE id = ?`,
  )
    .bind(row.profile_id)
    .first();
  const { results: members } = await c.env.DB.prepare(
    `SELECT m.email, m.role, m.status, u.first_name AS firstName, u.last_name AS lastName
     FROM memberships m LEFT JOIN users u ON u.id = m.user_id WHERE m.profile_id = ?`,
  )
    .bind(row.profile_id)
    .all();
  return c.json({ application: detail, profile, members, transitions: REVIEW_TRANSITIONS[row.status] ?? [] });
});

admin.post('/applications/:id/status', async (c) => {
  const u = currentUser(c);
  const row = await loadApplication(c.env, c.req.param('id'));
  const b = await body(
    c,
    z.object({
      to: z.enum(['verification', 'assessment', 'approved', 'rejected', 'changes_requested']),
      note: z.string().trim().max(2000).optional(),
    }),
  );
  const allowed = REVIEW_TRANSITIONS[row.status] ?? [];
  if (!allowed.includes(b.to)) fail(409, `Can’t move from ${STATUS_LABEL[row.status]} to ${STATUS_LABEL[b.to]}.`);
  if ((b.to === 'changes_requested' || b.to === 'rejected') && !b.note)
    fail(422, 'Add a note telling the applicant what is missing or why.');
  if (row.kind === 'account' && b.to === 'approved' && row.bvn_status !== 'verified')
    fail(409, 'The BVN must be verified before the account can be approved.');

  const now = Date.now();
  const stmts = [
    c.env.DB.prepare('UPDATE applications SET status = ?, reviewer_note = COALESCE(?, reviewer_note), updated_at = ? WHERE id = ?').bind(
      b.to,
      b.note ?? null,
      now,
      row.id,
    ),
  ];
  if (row.kind === 'account' && (b.to === 'approved' || b.to === 'rejected')) {
    stmts.push(
      c.env.DB.prepare('UPDATE profiles SET status = ? WHERE id = ?').bind(b.to === 'approved' ? 'verified' : 'rejected', row.profile_id),
    );
  }
  await c.env.DB.batch(stmts);
  await recordStatus(c.env, row.id, row.status, b.to, u.id, b.note ?? null);

  const label = KIND_LABEL[row.kind];
  const messages: Record<string, string> = {
    verification: 'We’re now checking your documents.',
    assessment: 'Your documents are verified. We’re now assessing your application.',
    approved: row.kind === 'account' ? 'Your account is approved. You can now apply for loans and grants.' : 'Your application has been approved.',
    rejected: `Your application was not approved. Reason: ${b.note ?? ''}`,
    changes_requested: `We need a few changes before we can continue: ${b.note ?? ''}`,
  };
  await notifyProfile(c.env, row.profile_id, {
    title: `${label} application ${row.reference}: ${STATUS_LABEL[b.to]}`,
    body: messages[b.to],
    link: `/dashboard/applications/${row.id}`,
  });
  return c.json({ ok: true });
});

// ---- Settings (rules) ----

admin.get('/settings', async (c) => c.json({ settings: await getSettings(c.env.DB) }));

const settingsSchema: z.ZodType<Settings> = z.object({
  loan: z.object({
    minAmount: z.number().positive(),
    maxAmount: z.number().positive(),
    periods: z
      .array(z.object({ label: z.string().min(1).max(40), months: z.number().int().positive(), monthlyRate: z.number().min(0).max(100) }))
      .min(1),
    maxApplicationsPerDay: z.number().int().min(1).max(50),
  }),
  grant: z.object({
    minAmount: z.number().positive(),
    maxAmount: z.number().positive(),
    categories: z.array(z.string().min(1).max(60)).min(1),
  }),
  savings: z.object({
    plans: z
      .array(
        z.object({
          label: z.string().min(1).max(40),
          days: z.number().int().positive(),
          flexibleRate: z.number().min(0).max(100),
          fixedRate: z.number().min(0).max(100),
        }),
      )
      .min(1),
  }),
});

admin.put('/settings', requireRole('admin'), async (c) => {
  const u = currentUser(c);
  const s = await body(c, settingsSchema);
  if (s.loan.minAmount > s.loan.maxAmount || s.grant.minAmount > s.grant.maxAmount)
    fail(422, 'Minimum amounts must be below maximum amounts.');
  await saveSettings(c.env.DB, s, u.id);
  return c.json({ ok: true });
});

// ---- Users & roles (admins only) ----

admin.get('/users', requireRole('admin'), async (c) => {
  const q = c.req.query('q')?.trim().toLowerCase() ?? '';
  const { results } = await c.env.DB.prepare(
    `SELECT id, email, first_name AS firstName, last_name AS lastName, role, email_verified AS emailVerified, created_at AS createdAt
     FROM users WHERE email LIKE ? OR lower(first_name || ' ' || last_name) LIKE ? ORDER BY created_at DESC LIMIT 100`,
  )
    .bind(`%${q}%`, `%${q}%`)
    .all();
  return c.json({ users: results });
});

admin.patch('/users/:id', requireRole('admin'), async (c) => {
  const u = currentUser(c);
  const b = await body(c, z.object({ role: z.enum(['customer', 'reviewer', 'admin']) }));
  if (c.req.param('id') === u.id) fail(409, 'You can’t change your own role.');
  const res = await c.env.DB.prepare('UPDATE users SET role = ? WHERE id = ?').bind(b.role, c.req.param('id')).run();
  if (!res.meta.changes) fail(404, 'User not found.');
  // Force re-login so the new role applies cleanly.
  await c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(c.req.param('id')).run();
  return c.json({ ok: true });
});

// ---- Contact messages ----

admin.get('/messages', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, name, email, message, handled, created_at AS createdAt FROM contact_messages ORDER BY handled, created_at DESC LIMIT 100',
  ).all();
  return c.json({ messages: results });
});

admin.post('/messages/:id/handled', async (c) => {
  await c.env.DB.prepare('UPDATE contact_messages SET handled = 1 WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ ok: true });
});

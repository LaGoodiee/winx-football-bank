import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv, Bindings } from '../env';
import {
  ALLOWED_UPLOAD_TYPES,
  EDITABLE_STATUSES,
  KIND_LABEL,
  MAX_UPLOAD_BYTES,
  documentSlots,
  type ApplicationKind,
  type ApplicationStatus,
  type ProfileType,
} from '../../shared/domain';
import { profileAccess, requireAuth } from '../lib/access';
import { newId, reference } from '../lib/crypto';
import { body, currentUser, fail } from '../lib/http';
import { notifyProfile } from '../lib/notify';
import { getSettings } from '../lib/settings';

interface AppRow {
  id: string;
  reference: string;
  profile_id: string;
  kind: ApplicationKind;
  status: ApplicationStatus;
  data: string;
  amount_kobo: number | null;
  reviewer_note: string | null;
  submitted_at: number | null;
  created_at: number;
  updated_at: number;
  profile_type: ProfileType;
  profile_name: string;
  profile_status: string;
  bvn_status: string;
}

export async function loadApplication(env: Bindings, id: string) {
  const row = await env.DB.prepare(
    `SELECT a.*, p.type AS profile_type, p.name AS profile_name, p.status AS profile_status, p.bvn_status
     FROM applications a JOIN profiles p ON p.id = a.profile_id WHERE a.id = ?`,
  )
    .bind(id)
    .first<AppRow>();
  if (!row) fail(404, 'Application not found.');
  return row;
}

export async function applicationDetail(env: Bindings, row: AppRow) {
  const [{ results: documents }, { results: history }] = await Promise.all([
    env.DB.prepare(
      'SELECT id, slot, filename, content_type AS contentType, size, created_at AS createdAt FROM documents WHERE application_id = ? ORDER BY created_at',
    )
      .bind(row.id)
      .all(),
    env.DB.prepare(
      `SELECT h.from_status AS fromStatus, h.to_status AS toStatus, h.note, h.created_at AS createdAt,
              u.first_name AS byFirstName, u.role AS byRole
       FROM status_history h LEFT JOIN users u ON u.id = h.changed_by WHERE h.application_id = ? ORDER BY h.created_at`,
    )
      .bind(row.id)
      .all(),
  ]);
  return {
    id: row.id,
    reference: row.reference,
    profileId: row.profile_id,
    profileType: row.profile_type,
    profileName: row.profile_name,
    profileStatus: row.profile_status,
    bvnStatus: row.bvn_status,
    kind: row.kind,
    status: row.status,
    data: JSON.parse(row.data) as Record<string, unknown>,
    reviewerNote: row.reviewer_note,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    slots: documentSlots(row.kind, row.profile_type),
    documents,
    history,
  };
}

export async function recordStatus(
  env: Bindings,
  appId: string,
  from: ApplicationStatus | null,
  to: ApplicationStatus,
  userId: string,
  note: string | null,
) {
  await env.DB.prepare(
    'INSERT INTO status_history (id, application_id, from_status, to_status, note, changed_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(newId(), appId, from, to, note, userId, Date.now())
    .run();
}

const dataSchema = {
  account: z.object({
    address: z.string().max(300).optional(),
    phone: z.string().max(20).optional(),
    nin: z.string().max(11).optional(),
  }),
  funding: z.object({
    amount: z.number().min(0).max(1_000_000_000).optional(),
    option: z.string().max(80).optional(),
    purpose: z.string().max(2000).optional(),
    phone: z.string().max(20).optional(),
  }),
};

const startOfLagosDay = () => {
  // Africa/Lagos is UTC+1 with no daylight saving.
  const now = Date.now() + 3_600_000;
  return now - (now % 86_400_000) - 3_600_000;
};

export const applications = new Hono<AppEnv>();
applications.use('*', requireAuth);

applications.get('/applications', async (c) => {
  const u = currentUser(c);
  const { results } = await c.env.DB.prepare(
    `SELECT a.id, a.reference, a.kind, a.status, a.amount_kobo AS amountKobo, a.updated_at AS updatedAt,
            a.submitted_at AS submittedAt, p.name AS profileName, p.type AS profileType, p.id AS profileId
     FROM applications a
     JOIN profiles p ON p.id = a.profile_id
     JOIN memberships m ON m.profile_id = p.id AND m.user_id = ? AND m.status = 'active'
     ORDER BY a.updated_at DESC`,
  )
    .bind(u.id)
    .all();
  return c.json({ applications: results });
});

applications.post('/applications', async (c) => {
  const u = currentUser(c);
  const b = await body(c, z.object({ profileId: z.string(), kind: z.enum(['loan', 'grant']) }));
  await profileAccess(c, b.profileId);
  const p = await c.env.DB.prepare('SELECT status, phone FROM profiles WHERE id = ?')
    .bind(b.profileId)
    .first<{ status: string; phone: string | null }>();
  if (p?.status !== 'verified') fail(403, 'Your account must be approved before you can apply for a loan or grant.');

  const settings = await getSettings(c.env.DB);
  const option = b.kind === 'loan' ? settings.loan.periods[0]?.label : settings.grant.categories[0];
  const id = newId();
  const now = Date.now();
  await c.env.DB.prepare(
    'INSERT INTO applications (id, reference, profile_id, kind, data, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(id, reference(), b.profileId, b.kind, JSON.stringify({ option, phone: p.phone ?? '' }), u.id, now, now)
    .run();
  return c.json({ id }, 201);
});

applications.get('/applications/:id', async (c) => {
  const row = await loadApplication(c.env, c.req.param('id'));
  await profileAccess(c, row.profile_id, { allowStaff: true });
  return c.json({ application: await applicationDetail(c.env, row) });
});

/** Autosave endpoint: merges the given fields into the draft. */
applications.patch('/applications/:id', async (c) => {
  const row = await loadApplication(c.env, c.req.param('id'));
  await profileAccess(c, row.profile_id);
  if (!EDITABLE_STATUSES.includes(row.status)) fail(409, 'This application can no longer be edited.');
  const schema = row.kind === 'account' ? dataSchema.account : dataSchema.funding;
  const b = await body(c, z.object({ data: schema }));
  const merged = { ...JSON.parse(row.data), ...b.data } as Record<string, unknown>;
  const amount = typeof merged.amount === 'number' ? Math.round(merged.amount * 100) : null;
  const now = Date.now();
  await c.env.DB.prepare('UPDATE applications SET data = ?, amount_kobo = ?, updated_at = ? WHERE id = ?')
    .bind(JSON.stringify(merged), amount, now, row.id)
    .run();
  return c.json({ ok: true, updatedAt: now });
});

applications.delete('/applications/:id', async (c) => {
  const row = await loadApplication(c.env, c.req.param('id'));
  await profileAccess(c, row.profile_id);
  if (row.status !== 'draft' || row.kind === 'account') fail(409, 'Only loan and grant drafts can be deleted.');
  const { results } = await c.env.DB.prepare('SELECT r2_key FROM documents WHERE application_id = ?').bind(row.id).all<{ r2_key: string }>();
  if (results.length) await c.env.DOCS.delete(results.map((d) => d.r2_key));
  await c.env.DB.prepare('DELETE FROM applications WHERE id = ?').bind(row.id).run();
  return c.json({ ok: true });
});

/** Returns a list of problems that block submission (empty = ready). */
async function completenessProblems(env: Bindings, row: AppRow): Promise<string[]> {
  const d = JSON.parse(row.data) as Record<string, unknown>;
  const problems: string[] = [];
  const phoneOk = typeof d.phone === 'string' && /^(\+234|0)[789][01]\d{8}$/.test(d.phone.replace(/[\s-]/g, ''));

  if (row.kind === 'account') {
    if (typeof d.address !== 'string' || d.address.trim().length < 5) problems.push('Add your address.');
    if (!phoneOk) problems.push('Add a valid Nigerian phone number.');
    if (typeof d.nin !== 'string' || !/^\d{11}$/.test(d.nin)) problems.push('Add your 11-digit NIN.');
    if (row.bvn_status === 'none' || row.bvn_status === 'failed') problems.push('Complete the BVN check.');
  } else {
    const s = await getSettings(env.DB);
    const rules = row.kind === 'loan' ? s.loan : s.grant;
    const amount = typeof d.amount === 'number' ? d.amount : 0;
    if (amount < rules.minAmount || amount > rules.maxAmount)
      problems.push(`Enter an amount between ₦${rules.minAmount.toLocaleString()} and ₦${rules.maxAmount.toLocaleString()}.`);
    const options = row.kind === 'loan' ? s.loan.periods.map((p) => p.label) : s.grant.categories;
    if (typeof d.option !== 'string' || !options.includes(d.option))
      problems.push(row.kind === 'loan' ? 'Choose a repayment period.' : 'Choose a grant category.');
    if (typeof d.purpose !== 'string' || d.purpose.trim().length < 20) problems.push('Describe the purpose in at least 20 characters.');
    if (!phoneOk) problems.push('Add a valid Nigerian phone number.');
  }

  const { results } = await env.DB.prepare('SELECT DISTINCT slot FROM documents WHERE application_id = ?').bind(row.id).all<{ slot: string }>();
  const have = new Set(results.map((r) => r.slot));
  for (const s of documentSlots(row.kind, row.profile_type)) {
    if (s.required && !have.has(s.slot)) problems.push(`Upload: ${s.label}.`);
  }
  return problems;
}

applications.post('/applications/:id/submit', async (c) => {
  const u = currentUser(c);
  const row = await loadApplication(c.env, c.req.param('id'));
  await profileAccess(c, row.profile_id);
  if (!EDITABLE_STATUSES.includes(row.status)) fail(409, 'This application has already been submitted.');

  const problems = await completenessProblems(c.env, row);
  if (problems.length) return c.json({ error: 'Your application is not complete yet.', problems }, 422);

  if (row.kind === 'loan' && row.status === 'draft') {
    const s = await getSettings(c.env.DB);
    const today = await c.env.DB.prepare(
      "SELECT COUNT(*) AS n FROM applications WHERE profile_id = ? AND kind = 'loan' AND submitted_at >= ?",
    )
      .bind(row.profile_id, startOfLagosDay())
      .first<{ n: number }>();
    if ((today?.n ?? 0) >= s.loan.maxApplicationsPerDay)
      fail(429, `You can submit up to ${s.loan.maxApplicationsPerDay} loan applications per day. Try again tomorrow.`);
  }

  const now = Date.now();
  await c.env.DB.prepare("UPDATE applications SET status = 'submitted', submitted_at = ?, updated_at = ? WHERE id = ?")
    .bind(now, now, row.id)
    .run();
  await recordStatus(c.env, row.id, row.status, 'submitted', u.id, null);
  await notifyProfile(c.env, row.profile_id, {
    title: `${KIND_LABEL[row.kind]} application ${row.status === 'draft' ? 'received' : 'resubmitted'} (${row.reference})`,
    body: 'We’ve received your application. We’ll verify your documents and let you know at each step.',
    link: `/dashboard/applications/${row.id}`,
  });
  return c.json({ ok: true, status: 'submitted' });
});

// ---- Documents ----

applications.post('/applications/:id/documents', async (c) => {
  const u = currentUser(c);
  const row = await loadApplication(c.env, c.req.param('id'));
  await profileAccess(c, row.profile_id);
  if (!EDITABLE_STATUSES.includes(row.status)) fail(409, 'Documents can’t be changed after submission.');

  const form = await c.req.formData();
  const slot = form.get('slot');
  const file = form.get('file');
  if (typeof slot !== 'string' || !(file instanceof File)) fail(400, 'Send a slot and a file.');
  const def = documentSlots(row.kind, row.profile_type).find((s) => s.slot === slot);
  if (!def) fail(400, 'Unknown document type.');
  if (file.size > MAX_UPLOAD_BYTES) fail(413, 'Files must be 5 MB or smaller.');
  if (!ALLOWED_UPLOAD_TYPES.includes(file.type) || !def.accept.split(',').includes(file.type))
    fail(415, `This document must be ${def.accept.includes('pdf') ? 'a PDF, JPG or PNG' : 'a JPG or PNG'}.`);

  const id = newId();
  const key = `applications/${row.id}/${id}`;
  await c.env.DOCS.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
    customMetadata: { filename: file.name.slice(0, 200), uploadedBy: u.id },
  });

  // One file per slot: replace the previous one.
  const { results: old } = await c.env.DB.prepare('SELECT id, r2_key FROM documents WHERE application_id = ? AND slot = ?')
    .bind(row.id, slot)
    .all<{ id: string; r2_key: string }>();
  const now = Date.now();
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM documents WHERE application_id = ? AND slot = ?').bind(row.id, slot),
    c.env.DB.prepare(
      'INSERT INTO documents (id, application_id, slot, r2_key, filename, content_type, size, uploaded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).bind(id, row.id, slot, key, file.name.slice(0, 200), file.type, file.size, u.id, now),
    c.env.DB.prepare('UPDATE applications SET updated_at = ? WHERE id = ?').bind(now, row.id),
  ]);
  if (old.length) await c.env.DOCS.delete(old.map((d) => d.r2_key));
  return c.json({ document: { id, slot, filename: file.name, contentType: file.type, size: file.size, createdAt: now } }, 201);
});

applications.delete('/documents/:docId', async (c) => {
  const d = await c.env.DB.prepare(
    'SELECT d.r2_key, d.application_id, a.profile_id, a.status FROM documents d JOIN applications a ON a.id = d.application_id WHERE d.id = ?',
  )
    .bind(c.req.param('docId'))
    .first<{ r2_key: string; application_id: string; profile_id: string; status: ApplicationStatus }>();
  if (!d) fail(404, 'Not found.');
  await profileAccess(c, d.profile_id);
  if (!EDITABLE_STATUSES.includes(d.status)) fail(409, 'Documents can’t be changed after submission.');
  await c.env.DOCS.delete(d.r2_key);
  await c.env.DB.prepare('DELETE FROM documents WHERE id = ?').bind(c.req.param('docId')).run();
  return c.json({ ok: true });
});

/** Streams a document to its owner or to staff. Never cached, never public. */
applications.get('/documents/:docId/file', async (c) => {
  const d = await c.env.DB.prepare(
    'SELECT d.r2_key, d.filename, d.content_type, a.profile_id FROM documents d JOIN applications a ON a.id = d.application_id WHERE d.id = ?',
  )
    .bind(c.req.param('docId'))
    .first<{ r2_key: string; filename: string; content_type: string; profile_id: string }>();
  if (!d) fail(404, 'Not found.');
  await profileAccess(c, d.profile_id, { allowStaff: true });
  const obj = await c.env.DOCS.get(d.r2_key);
  if (!obj) fail(404, 'File missing.');
  return new Response(obj.body, {
    headers: {
      'Content-Type': d.content_type,
      'Content-Disposition': `inline; filename="${d.filename.replace(/[^\w.\- ]/g, '_')}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
});

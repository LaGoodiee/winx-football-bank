import type { Bindings } from '../env';
import { newId } from './crypto';
import { sendEmail } from './email';

/** In-dashboard notification plus email, to every active member of a profile. */
export async function notifyProfile(
  env: Bindings,
  profileId: string,
  n: { title: string; body: string; link?: string },
) {
  const { results } = await env.DB.prepare(
    "SELECT u.id, u.email FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.profile_id = ? AND m.status = 'active'",
  )
    .bind(profileId)
    .all<{ id: string; email: string }>();

  const now = Date.now();
  if (results.length) {
    await env.DB.batch(
      results.map((u) =>
        env.DB.prepare('INSERT INTO notifications (id, user_id, title, body, link, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(
          newId(),
          u.id,
          n.title,
          n.body,
          n.link ?? null,
          now,
        ),
      ),
    );
  }
  await Promise.all(
    results.map((u) =>
      sendEmail(env, { to: u.email, subject: n.title, text: `${n.body}\n\nLog in to your dashboard to see the details.` }),
    ),
  );
}

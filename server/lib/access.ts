import type { Context, MiddlewareHandler } from 'hono';
import type { AppEnv } from '../env';
import type { Role } from '../../shared/domain';
import { currentUser, fail } from './http';

/** Requires a fully signed-in user (password + one-time code done). */
export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const u = currentUser(c);
  if (!u.mfaPassed || !u.emailVerified) fail(401, 'Please finish signing in.');
  await next();
};

export const requireRole =
  (...roles: Role[]): MiddlewareHandler<AppEnv> =>
  async (c, next) => {
    const u = currentUser(c);
    if (!u.mfaPassed || !u.emailVerified) fail(401, 'Please finish signing in.');
    if (!roles.includes(u.role)) fail(403, 'You don’t have access to this.');
    await next();
  };

export const isStaff = (role: Role) => role === 'reviewer' || role === 'admin';

/** Returns the caller's membership role on a profile, or fails with 404. Staff get read access to everything. */
export async function profileAccess(
  c: Context<AppEnv>,
  profileId: string,
  opts: { allowStaff?: boolean; ownerOnly?: boolean } = {},
): Promise<'owner' | 'member' | 'staff'> {
  const u = currentUser(c);
  const m = await c.env.DB.prepare(
    "SELECT role FROM memberships WHERE profile_id = ? AND user_id = ? AND status = 'active'",
  )
    .bind(profileId, u.id)
    .first<{ role: 'owner' | 'member' }>();
  if (m) {
    if (opts.ownerOnly && m.role !== 'owner') fail(403, 'Only the account owner can do this.');
    return m.role;
  }
  if (opts.allowStaff && isStaff(u.role)) return 'staff';
  fail(404, 'Not found.');
}

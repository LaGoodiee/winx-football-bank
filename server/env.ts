import type { Role } from '../shared/domain';

export interface Bindings {
  DB: D1Database;
  DOCS: R2Bucket;
  APP_NAME: string;
  EMAIL_FROM: string;
  SUPPORT_EMAIL: string;
  RESEND_API_KEY?: string;
  PAYSTACK_SECRET_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
}

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  emailVerified: boolean;
  mfaPassed: boolean;
  sessionId: string;
}

export type AppEnv = {
  Bindings: Bindings;
  Variables: { user: SessionUser | null };
};

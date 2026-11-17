import type { ApplicationStatus } from '../../shared/domain';

export const naira = (n: number, decimals = 0) =>
  '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export const fromKobo = (k: number | null | undefined) => (k ?? 0) / 100;

export const date = (ms: number | null | undefined) =>
  ms ? new Date(ms).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const dateTime = (ms: number | null | undefined) =>
  ms
    ? new Date(ms).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '—';

export const fileSize = (b: number) => (b < 1024 * 1024 ? `${Math.ceil(b / 1024)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

/** CSS class for the status badge. */
export function badge(s: ApplicationStatus | string): string {
  if (s === 'approved' || s === 'verified' || s === 'active') return 'badge';
  if (s === 'rejected' || s === 'failed') return 'badge r';
  if (s === 'draft' || s === 'none' || s === 'pending_invite') return 'badge g';
  return 'badge w';
}

export const isNgPhone = (s: string) => /^(\+234|0)[789][01]\d{8}$/.test(s.replace(/[\s-]/g, ''));
export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

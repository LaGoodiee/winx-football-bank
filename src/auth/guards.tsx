import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

function Loading() {
  return (
    <div className="wrap" style={{ padding: '80px 22px' }}>
      <p className="mut">Loading…</p>
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { loading, user, next } = useAuth();
  const loc = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  if (next) return <Navigate to={`/verify?next=${encodeURIComponent(loc.pathname)}`} replace />;
  return <>{children}</>;
}

export function RequireStaff({ children }: { children: ReactNode }) {
  const { loading, user } = useAuth();
  if (loading) return <Loading />;
  if (!user || (user.role !== 'reviewer' && user.role !== 'admin')) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

/** Only allow same-site relative paths as post-login redirects. */
export function safeNext(raw: string | null, fallback = '/dashboard') {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : fallback;
}

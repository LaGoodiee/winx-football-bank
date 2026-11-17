import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type AuthNext, type Me, type ProfileSummary } from '../lib/api';

interface AuthState {
  loading: boolean;
  user: Me | null;
  next: AuthNext;
  /** Fully signed in: password and one-time code both done. */
  ready: boolean;
  profiles: ProfileSummary[];
  profile: ProfileSummary | null;
  selectProfile: (id: string) => void;
  refresh: () => Promise<void>;
  refreshProfiles: () => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);
const PROFILE_KEY = 'wfb-profile';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<Me | null>(null);
  const [next, setNext] = useState<AuthNext>(null);
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(() => {
    try {
      return localStorage.getItem(PROFILE_KEY);
    } catch {
      return null;
    }
  });

  const refreshProfiles = useCallback(async () => {
    const { profiles } = await api.profiles();
    setProfiles(profiles);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const r = await api.me();
      setUser(r.user);
      setNext(r.next);
      if (r.user && !r.next) await refreshProfiles();
      else setProfiles([]);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [refreshProfiles]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectProfile = useCallback((id: string) => {
    setSelected(id);
    try {
      localStorage.setItem(PROFILE_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const logout = useCallback(async () => {
    await api.logout().catch(() => undefined);
    setUser(null);
    setNext(null);
    setProfiles([]);
  }, []);

  const value = useMemo<AuthState>(() => {
    const profile = profiles.find((p) => p.id === selected) ?? profiles[0] ?? null;
    return {
      loading,
      user,
      next,
      ready: !!user && !next,
      profiles,
      profile,
      selectProfile,
      refresh,
      refreshProfiles,
      logout,
    };
  }, [loading, user, next, profiles, selected, selectProfile, refresh, refreshProfiles, logout]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used inside AuthProvider');
  return c;
}

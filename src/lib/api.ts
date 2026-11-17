/** Typed fetch wrapper for the /api backend (Cloudflare Pages Functions). */
import type {
  ApplicationKind,
  ApplicationStatus,
  BvnStatus,
  DocSlot,
  ProfileStatus,
  ProfileType,
  Role,
  Settings,
} from '../../shared/domain';

export class ApiError extends Error {
  status: number;
  problems?: string[];
  constructor(status: number, message: string, problems?: string[]) {
    super(message);
    this.status = status;
    this.problems = problems;
  }
}

async function request<T>(method: string, path: string, payload?: unknown): Promise<T> {
  const init: RequestInit = { method, credentials: 'same-origin', headers: {} };
  if (payload instanceof FormData) init.body = payload;
  else if (payload !== undefined) {
    init.body = JSON.stringify(payload);
    (init.headers as Record<string, string>)['Content-Type'] = 'application/json';
  }
  const res = await fetch('/api' + path, init);
  const text = await res.text();
  const json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  if (!res.ok) throw new ApiError(res.status, (json.error as string) ?? 'Request failed.', json.problems as string[] | undefined);
  return json as T;
}

export const http = {
  get: <T>(p: string) => request<T>('GET', p),
  post: <T>(p: string, b?: unknown) => request<T>('POST', p, b ?? {}),
  patch: <T>(p: string, b: unknown) => request<T>('PATCH', p, b),
  put: <T>(p: string, b: unknown) => request<T>('PUT', p, b),
  del: <T>(p: string) => request<T>('DELETE', p),
};

// ---- Response shapes ----

export interface Me {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  emailVerified: boolean;
  mfaPassed: boolean;
}
export type AuthNext = 'verify_email' | 'login_code' | null;

export interface ProfileSummary {
  id: string;
  type: ProfileType;
  name: string;
  status: ProfileStatus;
  bvnStatus: BvnStatus;
  bvnLast4: string | null;
  role: 'owner' | 'member';
  accountApplicationId: string | null;
}

export interface Member {
  email: string;
  role: 'owner' | 'member';
  status: 'pending' | 'active';
  firstName: string | null;
  lastName: string | null;
}

export interface ProfileDetail {
  id: string;
  type: ProfileType;
  name: string;
  address: string | null;
  phone: string | null;
  status: ProfileStatus;
  bvnStatus: BvnStatus;
  bvnLast4: string | null;
  bvnFailureReason: string | null;
  createdAt: number;
}

export interface ApplicationRow {
  id: string;
  reference: string;
  kind: ApplicationKind;
  status: ApplicationStatus;
  amountKobo: number | null;
  updatedAt: number;
  submittedAt: number | null;
  profileName: string;
  profileType: ProfileType;
  profileId: string;
  bvnStatus?: BvnStatus;
}

export interface DocumentInfo {
  id: string;
  slot: string;
  filename: string;
  contentType: string;
  size: number;
  createdAt: number;
}

export interface HistoryItem {
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  note: string | null;
  createdAt: number;
  byFirstName: string | null;
  byRole: Role | null;
}

export interface ApplicationDetail {
  id: string;
  reference: string;
  profileId: string;
  profileType: ProfileType;
  profileName: string;
  profileStatus: ProfileStatus;
  bvnStatus: BvnStatus;
  kind: ApplicationKind;
  status: ApplicationStatus;
  data: Record<string, unknown>;
  reviewerNote: string | null;
  submittedAt: number | null;
  createdAt: number;
  updatedAt: number;
  slots: DocSlot[];
  documents: DocumentInfo[];
  history: HistoryItem[];
}

export interface SavingsGoal {
  id: string;
  name: string;
  planType: 'flexible' | 'fixed';
  targetKobo: number;
  savedKobo: number;
  interestRate: number;
  durationDays: number;
  startDate: number;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  link: string | null;
  readAt: number | null;
  createdAt: number;
}

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  emailVerified: number;
  createdAt: number;
}

export interface ContactMsg {
  id: string;
  name: string;
  email: string;
  message: string;
  handled: number;
  createdAt: number;
}

export interface Bank {
  name: string;
  code: string;
}

// ---- Endpoints ----

export const api = {
  me: () => http.get<{ user: Me | null; next: AuthNext }>('/auth/me'),
  signup: (b: { email: string; password: string; firstName: string; lastName: string; turnstileToken?: string }) =>
    http.post<{ next: AuthNext }>('/auth/signup', b),
  login: (b: { email: string; password: string; turnstileToken?: string }) => http.post<{ next: AuthNext }>('/auth/login', b),
  verify: (code: string, rememberDevice: boolean) => http.post<{ next: AuthNext }>('/auth/verify', { code, rememberDevice }),
  resend: () => http.post<{ ok: true }>('/auth/resend'),
  logout: () => http.post<{ ok: true }>('/auth/logout'),
  forgot: (email: string, turnstileToken?: string) => http.post<{ ok: true }>('/auth/forgot', { email, turnstileToken }),
  reset: (b: { email: string; code: string; password: string }) => http.post<{ ok: true }>('/auth/reset', b),

  settings: () => http.get<{ settings: Settings }>('/settings'),
  contact: (b: { name: string; email: string; message: string; turnstileToken?: string }) => http.post<{ ok: true }>('/contact', b),

  profiles: () => http.get<{ profiles: ProfileSummary[] }>('/profiles'),
  createProfile: (b: { type: ProfileType; name: string; address: string; phone: string }) =>
    http.post<{ profileId: string; applicationId: string }>('/profiles', b),
  profile: (id: string) => http.get<{ profile: ProfileDetail; members: Member[]; myRole: string }>(`/profiles/${id}`),
  invite: (id: string, email: string) => http.post<{ status: string }>(`/profiles/${id}/members`, { email }),
  removeMember: (id: string, email: string) => http.del<{ ok: true }>(`/profiles/${id}/members/${encodeURIComponent(email)}`),
  banks: () => http.get<{ banks: Bank[]; simulated: boolean }>('/banks'),
  verifyBvn: (id: string, b: { bvn: string; bankCode: string; accountNumber: string; firstName: string; lastName: string }) =>
    http.post<{ status: BvnStatus; reason: string | null }>(`/profiles/${id}/bvn`, b),

  applications: () => http.get<{ applications: ApplicationRow[] }>('/applications'),
  createApplication: (profileId: string, kind: 'loan' | 'grant') => http.post<{ id: string }>('/applications', { profileId, kind }),
  application: (id: string) => http.get<{ application: ApplicationDetail }>(`/applications/${id}`),
  saveDraft: (id: string, data: Record<string, unknown>) => http.patch<{ updatedAt: number }>(`/applications/${id}`, { data }),
  deleteApplication: (id: string) => http.del<{ ok: true }>(`/applications/${id}`),
  submit: (id: string) => http.post<{ status: ApplicationStatus }>(`/applications/${id}/submit`),
  upload: (id: string, slot: string, file: File) => {
    const fd = new FormData();
    fd.append('slot', slot);
    fd.append('file', file);
    return http.post<{ document: DocumentInfo }>(`/applications/${id}/documents`, fd);
  },
  deleteDocument: (docId: string) => http.del<{ ok: true }>(`/documents/${docId}`),
  documentUrl: (docId: string) => `/api/documents/${docId}/file`,

  savings: (profileId: string) => http.get<{ goals: SavingsGoal[] }>(`/profiles/${profileId}/savings`),
  createGoal: (profileId: string, b: { name: string; planType: 'flexible' | 'fixed'; durationDays: number; targetAmount: number }) =>
    http.post<{ id: string }>(`/profiles/${profileId}/savings`, b),
  updateGoal: (goalId: string, savedAmount: number) => http.patch<{ ok: true }>(`/savings/${goalId}`, { savedAmount }),
  deleteGoal: (goalId: string) => http.del<{ ok: true }>(`/savings/${goalId}`),

  notifications: () => http.get<{ notifications: Notification[]; unread: number }>('/notifications'),
  markRead: () => http.post<{ ok: true }>('/notifications/read'),

  admin: {
    stats: () => http.get<{ byStatus: Partial<Record<ApplicationStatus, number>>; unhandledMessages: number }>('/admin/stats'),
    applications: (q: { status?: string; kind?: string; q?: string }) => {
      const p = new URLSearchParams(Object.entries(q).filter(([, v]) => v) as [string, string][]);
      return http.get<{ applications: ApplicationRow[] }>(`/admin/applications?${p}`);
    },
    application: (id: string) =>
      http.get<{ application: ApplicationDetail; profile: ProfileDetail; members: Member[]; transitions: ApplicationStatus[] }>(
        `/admin/applications/${id}`,
      ),
    setStatus: (id: string, to: ApplicationStatus, note?: string) => http.post<{ ok: true }>(`/admin/applications/${id}/status`, { to, note }),
    settings: () => http.get<{ settings: Settings }>('/admin/settings'),
    saveSettings: (s: Settings) => http.put<{ ok: true }>('/admin/settings', s),
    users: (q: string) => http.get<{ users: AdminUser[] }>(`/admin/users?q=${encodeURIComponent(q)}`),
    setRole: (id: string, role: Role) => http.patch<{ ok: true }>(`/admin/users/${id}`, { role }),
    messages: () => http.get<{ messages: ContactMsg[] }>('/admin/messages'),
    handled: (id: string) => http.post<{ ok: true }>(`/admin/messages/${id}/handled`),
  },
};

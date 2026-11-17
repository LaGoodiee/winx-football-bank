/**
 * API client stub.
 * Every function here will call a Cloudflare Pages Function (/functions/api/*) once the backend is built.
 * Until then, each one simulates a successful request so the UI flow can be tested end to end.
 */
import type { ApplicantType, ApplicationKind } from '../types';

const USE_MOCK = true;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface SubmitResult {
  ok: boolean;
  reference?: string;
  error?: string;
}

async function post(path: string, body: FormData): Promise<SubmitResult> {
  if (USE_MOCK) {
    await delay(700);
    return { ok: true, reference: 'WSB-' + Math.floor(1000 + Math.random() * 9000) };
  }
  const res = await fetch(path, { method: 'POST', body });
  if (!res.ok) return { ok: false, error: `Request failed (${res.status})` };
  return (await res.json()) as SubmitResult;
}

export interface AccountApplication {
  accountType: ApplicantType;
  fullName: string;
  address: string;
  phone: string;
  email: string;
  passportPhoto: File | null;
  identification: File | null;
  footballDocs: File | null;
}

export interface FundingApplication {
  kind: ApplicationKind;
  applicantType: ApplicantType;
  name: string;
  phone: string;
  amount: number;
  option: string; // repayment period (loan) or grant category (grant)
  purpose: string;
  identification: File | null;
  credentials: File | null;
}

export interface ContactMessage {
  name: string;
  email: string;
  message: string;
}

function toFormData(obj: object): FormData {
  const fd = new FormData();
  Object.entries(obj).forEach(([k, v]) => {
    if (v instanceof File) fd.append(k, v);
    else if (v !== null && v !== undefined) fd.append(k, String(v));
  });
  return fd;
}

export const api = {
  openAccount: (a: AccountApplication) => post('/api/accounts', toFormData(a)),
  applyFunding: (a: FundingApplication) => post(`/api/${a.kind.toLowerCase()}s`, toFormData(a)),
  sendContact: (m: ContactMessage) => post('/api/contact', toFormData(m)),
};

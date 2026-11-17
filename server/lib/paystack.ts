import type { Bindings } from '../env';

/**
 * Thin Paystack client. Everything Paystack-specific lives here so a different
 * provider can be swapped in later without touching the routes.
 *
 * Without PAYSTACK_SECRET_KEY the client runs in "simulated" mode for local development.
 */
const BASE = 'https://api.paystack.co';

export const isSimulated = (env: Bindings) => !env.PAYSTACK_SECRET_KEY;

async function call<T>(env: Bindings, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const json = (await res.json()) as { status: boolean; message: string; data: T };
  if (!res.ok || !json.status) throw new Error(`Paystack: ${json.message ?? res.status}`);
  return json.data;
}

export interface Bank {
  name: string;
  code: string;
}

const DEMO_BANKS: Bank[] = [
  { name: 'Access Bank', code: '044' },
  { name: 'First Bank of Nigeria', code: '011' },
  { name: 'Guaranty Trust Bank', code: '058' },
  { name: 'Opay', code: '999992' },
  { name: 'United Bank For Africa', code: '033' },
  { name: 'Zenith Bank', code: '057' },
];

export async function listBanks(env: Bindings): Promise<Bank[]> {
  if (isSimulated(env)) return DEMO_BANKS;
  const data = await call<{ name: string; code: string; active: boolean }[]>(env, '/bank?country=nigeria&perPage=200');
  return data.filter((b) => b.active).map((b) => ({ name: b.name, code: b.code }));
}

export async function createCustomer(
  env: Bindings,
  c: { email: string; firstName: string; lastName: string; phone?: string },
): Promise<string> {
  if (isSimulated(env)) return 'CUS_sim_' + crypto.randomUUID().slice(0, 8);
  const data = await call<{ customer_code: string }>(env, '/customer', {
    method: 'POST',
    body: JSON.stringify({ email: c.email, first_name: c.firstName, last_name: c.lastName, phone: c.phone }),
  });
  return data.customer_code;
}

/**
 * Starts BVN validation. Paystack replies asynchronously with a
 * customeridentification.success / .failed webhook.
 */
export async function validateCustomer(
  env: Bindings,
  customerCode: string,
  v: { bvn: string; bankCode: string; accountNumber: string; firstName: string; lastName: string },
): Promise<void> {
  if (isSimulated(env)) return;
  await call(env, `/customer/${customerCode}/identification`, {
    method: 'POST',
    body: JSON.stringify({
      country: 'NG',
      type: 'bank_account',
      account_number: v.accountNumber,
      bvn: v.bvn,
      bank_code: v.bankCode,
      first_name: v.firstName,
      last_name: v.lastName,
    }),
  });
}

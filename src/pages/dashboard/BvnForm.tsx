import { useState, type FormEvent } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { Field } from '../../components/ui';
import { useAsync } from '../../hooks/useAsync';
import { api, ApiError } from '../../lib/api';

/** Starts a BVN check through Paystack. The BVN is sent once and never stored in full. */
export function BvnForm({ profileId, onDone }: { profileId: string; onDone: () => void }) {
  const { user, refreshProfiles } = useAuth();
  const banks = useAsync(() => api.banks(), []);
  const [f, setF] = useState({ bvn: '', bankCode: '', accountNumber: '', firstName: user?.firstName ?? '', lastName: user?.lastName ?? '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{11}$/.test(f.bvn)) return setErr('BVN must be 11 digits.');
    if (!f.bankCode) return setErr('Choose your bank.');
    if (!/^\d{10}$/.test(f.accountNumber)) return setErr('Account number must be 10 digits.');
    setErr('');
    setBusy(true);
    try {
      const r = await api.verifyBvn(profileId, f);
      if (r.status === 'failed') setErr(r.reason ?? 'We couldn’t verify your BVN.');
      await refreshProfiles();
      onDone();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: k === 'bvn' || k === 'accountNumber' ? e.target.value.replace(/\D/g, '') : e.target.value });

  return (
    <form className="f inner" onSubmit={submit} noValidate>
      <p className="full mut small">
        We check that your BVN matches a bank account in your name. We only keep the last 4 digits.
        {banks.data?.simulated && <><br /><b>Test mode:</b> any BVN passes, except one ending in 0000.</>}
      </p>
      <Field label="First name (as on BVN)"><input value={f.firstName} onChange={set('firstName')} /></Field>
      <Field label="Last name (as on BVN)"><input value={f.lastName} onChange={set('lastName')} /></Field>
      <Field label="BVN"><input inputMode="numeric" maxLength={11} value={f.bvn} onChange={set('bvn')} /></Field>
      <Field label="Bank">
        <select value={f.bankCode} onChange={set('bankCode')}>
          <option value="">Choose your bank</option>
          {banks.data?.banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
        </select>
      </Field>
      <Field className="full" label="Account number (linked to this BVN)">
        <input inputMode="numeric" maxLength={10} value={f.accountNumber} onChange={set('accountNumber')} />
      </Field>
      {err && <div className="err-box full">{err}</div>}
      <div className="full"><button className="btn" disabled={busy}>{busy ? 'Checking…' : 'Verify BVN'}</button></div>
    </form>
  );
}

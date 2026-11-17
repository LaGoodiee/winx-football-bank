import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Field, Steps } from '../../components/ui';
import { api, ApiError } from '../../lib/api';
import { isNgPhone } from '../../lib/format';
import { PROFILE_TYPE_LABEL, type ProfileType } from '../../../shared/domain';

export default function OpenAccount() {
  const nav = useNavigate();
  const { user, refreshProfiles, selectProfile } = useAuth();
  const [type, setType] = useState<ProfileType>('player');
  const [name, setName] = useState(user ? `${user.firstName} ${user.lastName}` : '');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const nameLabel = type === 'player' ? 'Full name (as on your ID)' : type === 'club' ? 'Registered club name' : 'Academy name';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v: Record<string, string> = {};
    if (name.trim().length < 2) v.name = 'Enter a name.';
    if (address.trim().length < 5) v.address = 'Enter the full address.';
    if (!isNgPhone(phone)) v.phone = 'Enter a valid Nigerian phone number.';
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    setErr('');
    try {
      const r = await api.createProfile({ type, name, address, phone });
      await refreshProfiles();
      selectProfile(r.profileId);
      nav(`/dashboard/applications/${r.applicationId}`, { replace: true });
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="split">
      <form className="f" onSubmit={submit} noValidate>
        <h3>Account type</h3>
        <div className="full">
          <select
            value={type}
            onChange={(e) => {
              const t = e.target.value as ProfileType;
              setType(t);
              if (t !== 'player') setName('');
            }}
          >
            {(Object.keys(PROFILE_TYPE_LABEL) as ProfileType[]).map((t) => (
              <option key={t} value={t}>{PROFILE_TYPE_LABEL[t]}</option>
            ))}
          </select>
        </div>
        <h3>Details</h3>
        <Field className="full" label={nameLabel} error={errors.name}>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field className="full" label="Address" error={errors.address}>
          <input placeholder="House number, street, city, state" value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <Field className="full" label="Phone number" error={errors.phone}>
          <input type="tel" placeholder="0803 000 0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        {err && <div className="err-box full">{err}</div>}
        <div className="full"><button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Continue to documents'}</button></div>
      </form>
      <div>
        <h2>Open an account</h2>
        <Steps
          items={[
            { title: 'Your details', text: 'Choose the account type and add your contact details.' },
            { title: 'Documents and BVN', text: 'Upload your ID and football documents, and verify your BVN.' },
            { title: 'Review', text: 'We check every file. You’ll get an email at each step.' },
            { title: 'Account active', text: 'Apply for loans and grants and set savings goals.' },
          ]}
        />
      </div>
    </div>
  );
}

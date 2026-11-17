import { useState, type FormEvent } from 'react';
import { Icon } from '../components/Icons';
import { Field, FileUpload, PageHeader, Steps } from '../components/ui';
import { api, type AccountApplication } from '../lib/api';
import { isEmail, isNgPhone, required, type Errors } from '../lib/validate';
import type { ApplicantType } from '../types';

const EMPTY: AccountApplication = {
  accountType: 'player',
  fullName: '',
  address: '',
  phone: '',
  email: '',
  passportPhoto: null,
  identification: null,
  footballDocs: null,
};

function validate(v: AccountApplication): Errors<AccountApplication> {
  const e: Errors<AccountApplication> = {};
  if (!required(v.fullName)) e.fullName = 'Enter your full name.';
  if (!required(v.address)) e.address = 'Enter your address.';
  if (!isNgPhone(v.phone)) e.phone = 'Enter a valid Nigerian phone number.';
  if (!isEmail(v.email)) e.email = 'Enter a valid email address.';
  if (!v.passportPhoto) e.passportPhoto = 'Upload a passport photograph.';
  if (!v.identification) e.identification = 'Upload a valid ID.';
  return e;
}

export default function Account() {
  const [form, setForm] = useState<AccountApplication>(EMPTY);
  const [errors, setErrors] = useState<Errors<AccountApplication>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const set = <K extends keyof AccountApplication>(k: K, val: AccountApplication[K]) =>
    setForm((f) => ({ ...f, [k]: val }));

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate(form);
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const res = await api.openAccount(form);
    setBusy(false);
    if (res.ok) {
      setDone(res.reference ?? '');
      setForm(EMPTY);
    } else setErrors({ fullName: res.error });
  };

  return (
    <>
      <PageHeader title="Open an account" lead="For players, clubs and academies. It takes about ten minutes." />
      <section className="s">
        <div className="wrap split">
          <form className="f" onSubmit={onSubmit} noValidate>
            <h3>Account type</h3>
            <div className="full">
              <select value={form.accountType} onChange={(e) => set('accountType', e.target.value as ApplicantType)}>
                <option value="player">Individual player</option>
                <option value="club">Registered football club</option>
                <option value="academy">Football academy</option>
              </select>
            </div>

            <h3>Personal details</h3>
            <Field className="full" label="Full name" error={errors.fullName}>
              <input placeholder="As shown on your ID" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
            </Field>
            <Field className="full" label="Address" error={errors.address}>
              <input placeholder="House number, street, city, state" value={form.address} onChange={(e) => set('address', e.target.value)} />
            </Field>
            <Field label="Phone number" error={errors.phone}>
              <input type="tel" placeholder="+234 800 000 0000" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </Field>
            <Field label="Email address" error={errors.email}>
              <input type="email" placeholder="you@example.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </Field>

            <h3>Documents</h3>
            <Field error={errors.passportPhoto}>
              <FileUpload name="passportPhoto" label="Passport photograph" hint="JPG or PNG, plain background"
                accept="image/jpeg,image/png" onChange={(f) => set('passportPhoto', f)} />
            </Field>
            <Field error={errors.identification}>
              <FileUpload name="identification" label="Valid identification" hint="National ID, passport or licence"
                onChange={(f) => set('identification', f)} />
            </Field>
            <Field className="full">
              <FileUpload name="footballDocs" label="Supporting football documents"
                hint="Club registration, player card, trial invitations" onChange={(f) => set('footballDocs', f)} />
            </Field>

            <div className="full note"><Icon name="shield" size={18} />Encrypted upload. Documents are used only for verification.</div>
            {done !== null && (
              <div className="ok-msg">Application received. Your reference is {done}. Track it from your dashboard.</div>
            )}
            <div className="full">
              <button className="btn" type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit application'}</button>
            </div>
          </form>

          <div>
            <h2>What happens next</h2>
            <Steps
              items={[
                { title: 'Submit', text: 'Complete the form and upload your documents.' },
                { title: 'Document verification', text: 'We check every file against your details.' },
                { title: 'Eligibility assessment', text: 'We confirm the account type fits your profile.' },
                { title: 'Account active', text: 'Track progress from your dashboard.' },
              ]}
            />
          </div>
        </div>
      </section>
    </>
  );
}

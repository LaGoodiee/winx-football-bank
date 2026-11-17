import { useState, type FormEvent } from 'react';
import { Field, FileUpload, PageHeader, Steps } from '../components/ui';
import { api, type FundingApplication } from '../lib/api';
import { isNgPhone, required, type Errors } from '../lib/validate';
import type { ApplicantType, ApplicationKind } from '../types';

const TABS: { type: ApplicantType; tab: string; heading: string; nameLabel: string; docLabel: string }[] = [
  { type: 'player', tab: 'Individual player', heading: 'Player details', nameLabel: 'Full name', docLabel: 'Football credentials' },
  { type: 'club', tab: 'Registered club', heading: 'Club details', nameLabel: 'Registered club name', docLabel: 'Club registration certificate' },
  { type: 'academy', tab: 'Football academy', heading: 'Academy details', nameLabel: 'Academy name', docLabel: 'Academy registration certificate' },
];

const OPTIONS: Record<ApplicationKind, string[]> = {
  Loan: ['3 months', '6 months', '12 months'],
  Grant: ['Talent development', 'Equipment', 'Facilities', 'Travel and trials'],
};

const blank = (kind: ApplicationKind, applicantType: ApplicantType): FundingApplication => ({
  kind,
  applicantType,
  name: '',
  phone: '',
  amount: 0,
  option: OPTIONS[kind][0],
  purpose: '',
  identification: null,
  credentials: null,
});

export default function Apply({ kind }: { kind: ApplicationKind }) {
  const isLoan = kind === 'Loan';
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState<FundingApplication>(() => blank(kind, 'player'));
  const [errors, setErrors] = useState<Errors<FundingApplication>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const cfg = TABS[tab];

  const set = <K extends keyof FundingApplication>(k: K, val: FundingApplication[K]) =>
    setForm((f) => ({ ...f, [k]: val }));

  const pickTab = (i: number) => {
    setTab(i);
    set('applicantType', TABS[i].type);
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    const e: Errors<FundingApplication> = {};
    if (!required(form.name)) e.name = `Enter the ${cfg.nameLabel.toLowerCase()}.`;
    if (!isNgPhone(form.phone)) e.phone = 'Enter a valid Nigerian phone number.';
    if (!(form.amount > 0)) e.amount = 'Enter an amount greater than zero.';
    if (!required(form.purpose)) e.purpose = 'Tell us how the money will be used.';
    if (!form.identification) e.identification = 'Upload a valid ID.';
    if (!form.credentials) e.credentials = `Upload the ${cfg.docLabel.toLowerCase()}.`;
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const res = await api.applyFunding(form);
    setBusy(false);
    if (res.ok) {
      setDone(res.reference ?? '');
      setForm(blank(kind, cfg.type));
    }
  };

  return (
    <>
      <PageHeader
        title={`Apply for a ${kind.toLowerCase()}`}
        lead={
          isLoan
            ? 'Every application goes through document verification and an eligibility assessment.'
            : 'Non-repayable football funding, assessed after your documents are verified.'
        }
      />
      <section className="s">
        <div className="wrap">
          <div className="tabs" role="tablist">
            {TABS.map((t, i) => (
              <button key={t.type} type="button" role="tab" aria-selected={i === tab}
                className={i === tab ? 'on' : undefined} onClick={() => pickTab(i)}>
                {t.tab}
              </button>
            ))}
          </div>
          <div className="split">
            <form className="f" onSubmit={onSubmit} noValidate>
              <h3>{cfg.heading}</h3>
              <Field label={cfg.nameLabel} error={errors.name}>
                <input value={form.name} onChange={(e) => set('name', e.target.value)} />
              </Field>
              <Field label="Phone number" error={errors.phone}>
                <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              </Field>
              <Field label={isLoan ? 'Loan amount (₦)' : 'Grant amount (₦)'} error={errors.amount}>
                <input type="number" min={0} value={form.amount || ''}
                  onChange={(e) => set('amount', Number(e.target.value))} />
              </Field>
              <Field label={isLoan ? 'Repayment period' : 'Grant category'}>
                <select value={form.option} onChange={(e) => set('option', e.target.value)}>
                  {OPTIONS[kind].map((o) => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field className="full" label={isLoan ? 'Purpose' : 'How will the grant be used?'} error={errors.purpose}>
                <textarea rows={3} value={form.purpose} onChange={(e) => set('purpose', e.target.value)} />
              </Field>
              <Field error={errors.identification}>
                <FileUpload name="identification" label="Valid identification" hint="Upload file"
                  onChange={(f) => set('identification', f)} />
              </Field>
              <Field error={errors.credentials}>
                <FileUpload key={cfg.type} name="credentials" label={cfg.docLabel} hint="Upload file"
                  onChange={(f) => set('credentials', f)} />
              </Field>
              {done !== null && (
                <div className="ok-msg">Application received. Your reference is {done}.</div>
              )}
              <div className="full">
                <button className="btn" type="submit" disabled={busy}>
                  {busy ? 'Submitting…' : `Submit ${kind.toLowerCase()} application`}
                </button>
              </div>
            </form>
            <div>
              <h2>What happens next</h2>
              <Steps
                items={[
                  { title: 'Documents checked', text: 'Identity and football credentials are verified.' },
                  { title: 'Eligibility assessed', text: 'Amount, purpose and plan are reviewed.' },
                  { title: 'Decision shared', text: 'See the outcome on your dashboard.' },
                ]}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

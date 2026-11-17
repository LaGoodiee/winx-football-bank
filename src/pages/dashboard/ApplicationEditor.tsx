import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { DataSummary, DocList, Timeline } from '../../components/ApplicationParts';
import { Icon } from '../../components/Icons';
import { Field } from '../../components/ui';
import { useAsync } from '../../hooks/useAsync';
import { api, ApiError, type ApplicationDetail, type DocumentInfo } from '../../lib/api';
import { badge, fileSize, naira } from '../../lib/format';
import { BvnForm } from './BvnForm';
import { EDITABLE_STATUSES, KIND_LABEL, MAX_UPLOAD_BYTES, STATUS_LABEL, type DocSlot, type Settings } from '../../../shared/domain';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function ApplicationEditor() {
  const { id = '' } = useParams();
  const { data, error, loading, reload } = useAsync(() => api.application(id), [id]);
  const settings = useAsync(() => api.settings(), []);

  if (loading && !data) return <p className="mut">Loading…</p>;
  if (error || !data) return <div className="err-box">{error ?? 'Not found.'}</div>;
  const app = data.application;
  const editable = EDITABLE_STATUSES.includes(app.status);

  return (
    <>
      <div className="top">
        <div>
          <Link to="/dashboard/applications" className="more">← Applications</Link>
          <h2 style={{ margin: '6px 0 0' }}>{KIND_LABEL[app.kind]} application</h2>
          <span className="mut small">{app.reference} · {app.profileName}</span>
        </div>
        <span className={badge(app.status)}>{STATUS_LABEL[app.status]}</span>
      </div>

      {app.status === 'changes_requested' && app.reviewerNote && (
        <div className="notice warn">
          <b>Changes requested</b>
          <p>{app.reviewerNote}</p>
        </div>
      )}
      {app.status === 'rejected' && app.reviewerNote && (
        <div className="notice bad"><b>Not approved</b><p>{app.reviewerNote}</p></div>
      )}

      {editable && settings.data ? (
        <Editor app={app} settings={settings.data.settings} reload={reload} />
      ) : (
        <div className="acct">
          <div className="card">
            <h3>Details</h3>
            <DataSummary app={app} />
            <h3 style={{ marginTop: 20 }}>Documents</h3>
            <DocList app={app} />
          </div>
          <div className="card">
            <h3>Progress</h3>
            <Timeline app={app} />
          </div>
        </div>
      )}
    </>
  );
}

function Editor({ app, settings, reload }: { app: ApplicationDetail; settings: Settings; reload: () => Promise<void> }) {
  const nav = useNavigate();
  const { profile, refreshProfiles } = useAuth();
  const [data, setData] = useState<Record<string, unknown>>(app.data);
  const [save, setSave] = useState<SaveState>('idle');
  const [docs, setDocs] = useState<DocumentInfo[]>(app.documents);
  const [problems, setProblems] = useState<string[]>([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const dirty = useRef<Record<string, unknown>>({});
  const timer = useRef<number>();

  const flush = useCallback(async () => {
    const patch = dirty.current;
    if (!Object.keys(patch).length) return;
    dirty.current = {};
    setSave('saving');
    try {
      await api.saveDraft(app.id, patch);
      setSave('saved');
    } catch {
      dirty.current = { ...patch, ...dirty.current };
      setSave('error');
    }
  }, [app.id]);

  // Autosave 800 ms after the last keystroke, and on leaving the page.
  const set = (k: string, v: unknown) => {
    setData((d) => ({ ...d, [k]: v }));
    dirty.current[k] = v;
    setSave('idle');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), 800);
  };
  useEffect(() => () => {
    window.clearTimeout(timer.current);
    void flush();
  }, [flush]);

  const submit = async () => {
    setErr('');
    setProblems([]);
    setBusy(true);
    try {
      window.clearTimeout(timer.current);
      await flush();
      await api.submit(app.id);
      await refreshProfiles();
      await reload();
    } catch (e) {
      if (e instanceof ApiError && e.problems) setProblems(e.problems);
      else setErr(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete()) return;
    await api.deleteApplication(app.id);
    nav('/dashboard/applications', { replace: true });
  };

  const isAccount = app.kind === 'account';
  const isLoan = app.kind === 'loan';
  const rules = isLoan ? settings.loan : settings.grant;
  const amount = typeof data.amount === 'number' ? data.amount : 0;
  const period = settings.loan.periods.find((p) => p.label === data.option);
  const bvnStatus = profile?.id === app.profileId ? profile.bvnStatus : app.bvnStatus;

  return (
    <div className="split">
      <div className="dm">
        <form className="f" onSubmit={(e) => e.preventDefault()} noValidate>
          <div className="full row-between">
            <h3 style={{ margin: 0 }}>{isAccount ? 'Your details' : 'Application details'}</h3>
            <span className="mut small save-state">
              {save === 'saving' ? 'Saving…' : save === 'saved' ? 'Saved' : save === 'error' ? 'Couldn’t save. Retrying when you type.' : ''}
            </span>
          </div>

          {isAccount ? (
            <>
              <Field className="full" label="Address">
                <input value={(data.address as string) ?? ''} onChange={(e) => set('address', e.target.value)} />
              </Field>
              <Field label="Phone number">
                <input type="tel" value={(data.phone as string) ?? ''} onChange={(e) => set('phone', e.target.value)} />
              </Field>
              <Field label="NIN (11 digits)">
                <input inputMode="numeric" maxLength={11} value={(data.nin as string) ?? ''}
                  onChange={(e) => set('nin', e.target.value.replace(/\D/g, ''))} />
              </Field>
            </>
          ) : (
            <>
              <Field label={`${isLoan ? 'Loan' : 'Grant'} amount (₦)`}>
                <input type="number" min={rules.minAmount} max={rules.maxAmount} value={amount || ''}
                  onChange={(e) => set('amount', e.target.value === '' ? 0 : Number(e.target.value))} />
                <span className="mut small">{naira(rules.minAmount)} to {naira(rules.maxAmount)}</span>
              </Field>
              <Field label={isLoan ? 'Repayment period' : 'Grant category'}>
                <select value={(data.option as string) ?? ''} onChange={(e) => set('option', e.target.value)}>
                  {(isLoan ? settings.loan.periods.map((p) => p.label) : settings.grant.categories).map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </Field>
              <Field label="Phone number">
                <input type="tel" value={(data.phone as string) ?? ''} onChange={(e) => set('phone', e.target.value)} />
              </Field>
              <Field className="full" label={isLoan ? 'What is the loan for?' : 'How will the grant be used?'}>
                <textarea rows={4} value={(data.purpose as string) ?? ''} onChange={(e) => set('purpose', e.target.value)} />
              </Field>
              {isLoan && period && amount > 0 && (
                <div className="full estimate">
                  <span>Estimated repayment</span>
                  <b>{naira(Math.ceil((amount * (1 + (period.monthlyRate / 100) * period.months)) / period.months))} / month</b>
                  <span className="mut small">
                    {period.monthlyRate}% per month over {period.months} months. Total{' '}
                    {naira(Math.ceil(amount * (1 + (period.monthlyRate / 100) * period.months)))}. Final terms are confirmed on approval.
                  </span>
                </div>
              )}
            </>
          )}

          <h3>Documents</h3>
          {app.slots.map((s) => (
            <DocSlotUpload key={s.slot} appId={app.id} slot={s} doc={docs.find((d) => d.slot === s.slot)}
              onChange={(d) => setDocs((all) => [...all.filter((x) => x.slot !== s.slot), ...(d ? [d] : [])])} />
          ))}
          <div className="full note"><Icon name="shield" size={18} />Files are stored privately and used only for verification.</div>
        </form>

        {isAccount && (
          <div className="card">
            <div className="row-between">
              <h3 style={{ margin: 0 }}>BVN check</h3>
              <span className={badge(bvnStatus)}>
                {bvnStatus === 'none' ? 'Not started' : bvnStatus === 'pending' ? 'Checking' : bvnStatus === 'verified' ? 'Verified' : 'Failed'}
              </span>
            </div>
            {bvnStatus === 'verified' && <p className="mut">Your BVN is verified{profile?.bvnLast4 ? ` (ending ${profile.bvnLast4})` : ''}.</p>}
            {bvnStatus === 'pending' && <p className="mut">We’re waiting for the result. This usually takes a few minutes.</p>}
            {(bvnStatus === 'none' || bvnStatus === 'failed') &&
              (profile?.role === 'owner' ? (
                <BvnForm profileId={app.profileId} onDone={() => void reload()} />
              ) : (
                <p className="mut">The account owner needs to complete the BVN check.</p>
              ))}
          </div>
        )}
      </div>

      <div>
        <div className="card sticky">
          <h3>Ready to submit?</h3>
          <p className="mut">Your progress is saved automatically. You can come back to this at any time.</p>
          {problems.length > 0 && (
            <div className="err-box">
              <b>Still needed:</b>
              <ul>{problems.map((p) => <li key={p}>{p}</li>)}</ul>
            </div>
          )}
          {err && <div className="err-box">{err}</div>}
          <div className="cta" style={{ marginTop: 12 }}>
            <button className="btn" onClick={submit} disabled={busy}>
              {busy ? 'Submitting…' : app.status === 'changes_requested' ? 'Resubmit application' : 'Submit application'}
            </button>
            {!isAccount && app.status === 'draft' && (
              <button className="btn line" onClick={remove}>Delete draft</button>
            )}
          </div>
          {app.history.length > 0 && (
            <>
              <h3 style={{ marginTop: 24 }}>History</h3>
              <Timeline app={app} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const confirmDelete = () => window.confirm('Delete this draft? This can’t be undone.');

function DocSlotUpload({ appId, slot, doc, onChange }: {
  appId: string;
  slot: DocSlot;
  doc?: DocumentInfo;
  onChange: (d: DocumentInfo | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setErr('');
    if (file.size > MAX_UPLOAD_BYTES) return setErr('Files must be 5 MB or smaller.');
    if (!slot.accept.split(',').includes(file.type)) return setErr(slot.accept.includes('pdf') ? 'Use a PDF, JPG or PNG.' : 'Use a JPG or PNG.');
    setBusy(true);
    try {
      const r = await api.upload(appId, slot.slot, file);
      onChange(r.document);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!doc) return;
    await api.deleteDocument(doc.id);
    onChange(null);
  };

  return (
    <div className="full">
      <label className={`up${doc ? ' done' : ''}`}>
        <b>{slot.label}{slot.required ? '' : ' (optional)'}</b>
        {busy ? 'Uploading…' : doc ? `${doc.filename} · ${fileSize(doc.size)} · click to replace` : slot.hint}
        <input type="file" accept={slot.accept} disabled={busy} onChange={(e) => void pick(e.target.files?.[0])} />
      </label>
      {doc && (
        <div className="doc-actions">
          <a href={api.documentUrl(doc.id)} target="_blank" rel="noopener noreferrer" className="more">View</a>
          <button type="button" className="linkbtn" onClick={remove}>Remove</button>
        </div>
      )}
      {err && <span className="err">{err}</span>}
    </div>
  );
}

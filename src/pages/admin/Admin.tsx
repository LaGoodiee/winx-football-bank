import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { DataSummary, DocList, Timeline } from '../../components/ApplicationParts';
import { Icon } from '../../components/Icons';
import { Field } from '../../components/ui';
import { useAsync } from '../../hooks/useAsync';
import { api, ApiError } from '../../lib/api';
import { badge, date, dateTime, fromKobo, naira } from '../../lib/format';
import {
  KIND_LABEL,
  PROFILE_TYPE_LABEL,
  STATUS_LABEL,
  type ApplicationStatus,
  type Role,
  type Settings,
} from '../../../shared/domain';

const msg = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong.');

export function AdminLayout() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  return (
    <div className="wrap dash">
      <aside className="side">
        <NavLink to="/admin" end className={({ isActive }) => (isActive ? 'on' : undefined)}><Icon name="doc" />Review queue</NavLink>
        <NavLink to="/admin/messages" className={({ isActive }) => (isActive ? 'on' : undefined)}><Icon name="send" />Messages</NavLink>
        {isAdmin && <NavLink to="/admin/settings" className={({ isActive }) => (isActive ? 'on' : undefined)}><Icon name="coin" />Rules</NavLink>}
        {isAdmin && <NavLink to="/admin/users" className={({ isActive }) => (isActive ? 'on' : undefined)}><Icon name="shield" />Staff and users</NavLink>}
        <NavLink to="/dashboard"><Icon name="home" />My dashboard</NavLink>
      </aside>
      <div className="dm"><Outlet /></div>
    </div>
  );
}

const QUEUE_STATUSES: ApplicationStatus[] = ['submitted', 'verification', 'assessment', 'changes_requested', 'approved', 'rejected'];

export function Queue() {
  const nav = useNavigate();
  const [status, setStatus] = useState<string>('submitted');
  const [kind, setKind] = useState('');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const stats = useAsync(() => api.admin.stats(), []);
  const list = useAsync(() => api.admin.applications({ status, kind, q: query }), [status, kind, query]);

  return (
    <>
      <h2 style={{ margin: 0 }}>Review queue</h2>
      <div className="statrow">
        {QUEUE_STATUSES.map((s) => (
          <button key={s} className={`stat${status === s ? ' on' : ''}`} onClick={() => setStatus(s)}>
            <b>{stats.data?.byStatus[s] ?? 0}</b>
            <span>{STATUS_LABEL[s]}</span>
          </button>
        ))}
      </div>
      <form className="filters" onSubmit={(e) => { e.preventDefault(); setQuery(q); }}>
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">All types</option>
          <option value="account">Account opening</option>
          <option value="loan">Loan</option>
          <option value="grant">Grant</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {QUEUE_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <input placeholder="Search reference or name" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn sm">Search</button>
      </form>
      <div className="card scroll">
        {list.loading ? <p className="mut">Loading…</p> : !list.data?.applications.length ? <p className="mut">Nothing here.</p> : (
          <table className="tbl">
            <thead><tr><th>Reference</th><th>Applicant</th><th>Type</th><th>Amount</th><th>BVN</th><th>Submitted</th><th>Status</th></tr></thead>
            <tbody>
              {list.data.applications.map((a) => (
                <tr key={a.id} className="clickable" onClick={() => nav(`/admin/applications/${a.id}`)}>
                  <td>{a.reference}</td>
                  <td>{a.profileName}<br /><span className="mut small">{PROFILE_TYPE_LABEL[a.profileType]}</span></td>
                  <td>{KIND_LABEL[a.kind]}</td>
                  <td>{a.amountKobo ? naira(fromKobo(a.amountKobo)) : '—'}</td>
                  <td><span className={badge(a.bvnStatus ?? 'none')}>{a.bvnStatus}</span></td>
                  <td>{date(a.submittedAt)}</td>
                  <td><span className={badge(a.status)}>{STATUS_LABEL[a.status]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

const ACTION_LABEL: Partial<Record<ApplicationStatus, string>> = {
  verification: 'Start document check',
  assessment: 'Documents OK: move to assessment',
  approved: 'Approve',
  changes_requested: 'Request changes',
  rejected: 'Reject',
};

export function Review() {
  const { id = '' } = useParams();
  const { data, error, reload } = useAsync(() => api.admin.application(id), [id]);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (error) return <div className="err-box">{error}</div>;
  if (!data) return <p className="mut">Loading…</p>;
  const { application: app, profile, members, transitions } = data;

  const act = async (to: ApplicationStatus) => {
    setErr('');
    if ((to === 'rejected' || to === 'changes_requested') && !note.trim())
      return setErr('Add a note telling the applicant what is missing or why.');
    if (to === 'rejected' && !window.confirm('Reject this application? The applicant will be notified.')) return;
    setBusy(true);
    try {
      await api.admin.setStatus(app.id, to, note.trim() || undefined);
      setNote('');
      await reload();
    } catch (e) {
      setErr(msg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="top">
        <div>
          <Link to="/admin" className="more">← Queue</Link>
          <h2 style={{ margin: '6px 0 0' }}>{KIND_LABEL[app.kind]}: {app.reference}</h2>
          <span className="mut small">Submitted {dateTime(app.submittedAt)}</span>
        </div>
        <span className={badge(app.status)}>{STATUS_LABEL[app.status]}</span>
      </div>

      <div className="acct">
        <div className="dm">
          <div className="card">
            <h3>Applicant</h3>
            <dl className="kv">
              <div><dt>Name</dt><dd>{profile.name}</dd></div>
              <div><dt>Type</dt><dd>{PROFILE_TYPE_LABEL[profile.type]}</dd></div>
              <div><dt>Account status</dt><dd><span className={badge(profile.status)}>{profile.status}</span></dd></div>
              <div><dt>BVN</dt><dd><span className={badge(profile.bvnStatus)}>{profile.bvnStatus}</span>{profile.bvnLast4 && ` ending ${profile.bvnLast4}`}</dd></div>
              {profile.bvnFailureReason && <div><dt>BVN failure</dt><dd>{profile.bvnFailureReason}</dd></div>}
              <div><dt>Phone</dt><dd>{profile.phone}</dd></div>
              <div><dt>Address</dt><dd>{profile.address}</dd></div>
              <div><dt>People</dt><dd>{members.map((m) => `${m.firstName ?? ''} ${m.lastName ?? ''} <${m.email}> (${m.role})`).join(', ')}</dd></div>
            </dl>
          </div>
          <div className="card">
            <h3>Application</h3>
            <DataSummary app={app} maskNin={false} />
          </div>
          <div className="card">
            <h3>Documents</h3>
            <DocList app={app} />
          </div>
        </div>

        <div>
          <div className="card sticky">
            <h3>Decision</h3>
            {transitions.length === 0 ? (
              <p className="mut">No further action needed.</p>
            ) : (
              <>
                <Field label="Note to applicant (required for changes or rejection)">
                  <textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
                </Field>
                {err && <div className="err-box">{err}</div>}
                <div className="actions">
                  {transitions.map((t) => (
                    <button key={t} disabled={busy}
                      className={`btn sm${t === 'rejected' ? ' danger' : t === 'changes_requested' ? ' line' : ''}`}
                      onClick={() => act(t)}>
                      {ACTION_LABEL[t] ?? STATUS_LABEL[t]}
                    </button>
                  ))}
                </div>
                {app.kind === 'account' && profile.bvnStatus !== 'verified' && transitions.includes('approved') && (
                  <p className="mut small">The BVN must be verified before this account can be approved.</p>
                )}
              </>
            )}
            <h3 style={{ marginTop: 24 }}>History</h3>
            <Timeline app={app} />
          </div>
        </div>
      </div>
    </>
  );
}

export function RulesEditor() {
  const { data } = useAsync(() => api.admin.settings(), []);
  const [s, setS] = useState<Settings | null>(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);
  useEffect(() => { if (data) setS(data.settings); }, [data]);
  if (!s) return <p className="mut">Loading…</p>;

  const save = async () => {
    setErr('');
    setOk(false);
    try {
      await api.admin.saveSettings(s);
      setOk(true);
    } catch (e) {
      setErr(msg(e));
    }
  };
  const num = (v: string) => (v === '' ? 0 : Number(v));

  return (
    <>
      <div className="top"><h2 style={{ margin: 0 }}>Rules</h2><button className="btn sm" onClick={save}>Save changes</button></div>
      {err && <div className="err-box">{err}</div>}
      {ok && <div className="ok-msg">Saved. New applications use these rules straight away.</div>}

      <div className="card">
        <h3>Loans</h3>
        <div className="grid2">
          <Field label="Minimum amount (₦)"><input type="number" value={s.loan.minAmount} onChange={(e) => setS({ ...s, loan: { ...s.loan, minAmount: num(e.target.value) } })} /></Field>
          <Field label="Maximum amount (₦)"><input type="number" value={s.loan.maxAmount} onChange={(e) => setS({ ...s, loan: { ...s.loan, maxAmount: num(e.target.value) } })} /></Field>
          <Field label="Max loan applications per day"><input type="number" value={s.loan.maxApplicationsPerDay} onChange={(e) => setS({ ...s, loan: { ...s.loan, maxApplicationsPerDay: num(e.target.value) } })} /></Field>
        </div>
        <h4>Repayment periods</h4>
        <table className="tbl edit">
          <thead><tr><th>Label</th><th>Months</th><th>Interest % per month</th><th /></tr></thead>
          <tbody>
            {s.loan.periods.map((p, i) => {
              const upd = (patch: Partial<typeof p>) => setS({ ...s, loan: { ...s.loan, periods: s.loan.periods.map((x, j) => (j === i ? { ...x, ...patch } : x)) } });
              return (
                <tr key={i}>
                  <td><input value={p.label} onChange={(e) => upd({ label: e.target.value })} /></td>
                  <td><input type="number" value={p.months} onChange={(e) => upd({ months: num(e.target.value) })} /></td>
                  <td><input type="number" step="0.01" value={p.monthlyRate} onChange={(e) => upd({ monthlyRate: num(e.target.value) })} /></td>
                  <td><button className="linkbtn" onClick={() => setS({ ...s, loan: { ...s.loan, periods: s.loan.periods.filter((_, j) => j !== i) } })}>Remove</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button className="linkbtn" onClick={() => setS({ ...s, loan: { ...s.loan, periods: [...s.loan.periods, { label: 'New period', months: 1, monthlyRate: 2 }] } })}>+ Add period</button>
      </div>

      <div className="card">
        <h3>Grants</h3>
        <div className="grid2">
          <Field label="Minimum amount (₦)"><input type="number" value={s.grant.minAmount} onChange={(e) => setS({ ...s, grant: { ...s.grant, minAmount: num(e.target.value) } })} /></Field>
          <Field label="Maximum amount (₦)"><input type="number" value={s.grant.maxAmount} onChange={(e) => setS({ ...s, grant: { ...s.grant, maxAmount: num(e.target.value) } })} /></Field>
        </div>
        <Field label="Categories (one per line)">
          <textarea rows={5} value={s.grant.categories.join('\n')}
            onChange={(e) => setS({ ...s, grant: { ...s.grant, categories: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) } })} />
        </Field>
      </div>

      <div className="card">
        <h3>Savings plans</h3>
        <table className="tbl edit">
          <thead><tr><th>Label</th><th>Days</th><th>Flexible % a year</th><th>Fixed % a year</th><th /></tr></thead>
          <tbody>
            {s.savings.plans.map((p, i) => {
              const upd = (patch: Partial<typeof p>) => setS({ ...s, savings: { plans: s.savings.plans.map((x, j) => (j === i ? { ...x, ...patch } : x)) } });
              return (
                <tr key={i}>
                  <td><input value={p.label} onChange={(e) => upd({ label: e.target.value })} /></td>
                  <td><input type="number" value={p.days} onChange={(e) => upd({ days: num(e.target.value) })} /></td>
                  <td><input type="number" step="0.1" value={p.flexibleRate} onChange={(e) => upd({ flexibleRate: num(e.target.value) })} /></td>
                  <td><input type="number" step="0.1" value={p.fixedRate} onChange={(e) => upd({ fixedRate: num(e.target.value) })} /></td>
                  <td><button className="linkbtn" onClick={() => setS({ ...s, savings: { plans: s.savings.plans.filter((_, j) => j !== i) } })}>Remove</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button className="linkbtn" onClick={() => setS({ ...s, savings: { plans: [...s.savings.plans, { label: 'New plan', days: 60, flexibleRate: 6, fixedRate: 8 }] } })}>+ Add plan</button>
      </div>
    </>
  );
}

export function Users() {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const { data, reload } = useAsync(() => api.admin.users(query), [query]);
  const [err, setErr] = useState('');

  const setRole = async (id: string, role: Role) => {
    setErr('');
    try {
      await api.admin.setRole(id, role);
      await reload();
    } catch (e) {
      setErr(msg(e));
    }
  };

  return (
    <>
      <h2 style={{ margin: 0 }}>Staff and users</h2>
      <p className="mut">Reviewers can process applications. Admins can also change rules and roles. Changing a role signs that person out.</p>
      <form className="filters" onSubmit={(e) => { e.preventDefault(); setQuery(q); }}>
        <input placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn sm">Search</button>
      </form>
      {err && <div className="err-box">{err}</div>}
      <div className="card scroll">
        <table className="tbl">
          <thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Role</th></tr></thead>
          <tbody>
            {data?.users.map((u) => (
              <tr key={u.id}>
                <td>{u.firstName} {u.lastName}</td>
                <td>{u.email}{!u.emailVerified && <span className="mut small"> (unverified)</span>}</td>
                <td>{date(u.createdAt)}</td>
                <td>
                  <select value={u.role} disabled={u.id === user?.id} onChange={(e) => setRole(u.id, e.target.value as Role)}>
                    <option value="customer">Customer</option>
                    <option value="reviewer">Reviewer</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function Messages() {
  const { data, reload } = useAsync(() => api.admin.messages(), []);
  return (
    <>
      <h2 style={{ margin: 0 }}>Contact messages</h2>
      <div className="card">
        {!data?.messages.length ? <p className="mut">No messages.</p> : (
          <ul className="notes">
            {data.messages.map((m) => (
              <li key={m.id} className={m.handled ? '' : 'unread'}>
                <b>{m.name} · <a href={`mailto:${m.email}`}>{m.email}</a></b>
                <p style={{ whiteSpace: 'pre-wrap' }}>{m.message}</p>
                <span className="mut small">{dateTime(m.createdAt)}</span>{' '}
                {!m.handled && <button className="linkbtn" onClick={async () => { await api.admin.handled(m.id); await reload(); }}>Mark handled</button>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

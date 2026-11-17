import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Field } from '../../components/ui';
import { useAsync } from '../../hooks/useAsync';
import { api, ApiError } from '../../lib/api';
import { badge, date, dateTime, fromKobo, isEmail, naira } from '../../lib/format';
import { KIND_LABEL, STATUS_LABEL } from '../../../shared/domain';

const msg = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong.');

// ---------- Applications ----------

export function Applications() {
  const nav = useNavigate();
  const { profile } = useAuth();
  const { data, loading } = useAsync(() => api.applications(), []);
  const [err, setErr] = useState('');
  const rows = (data?.applications ?? []).filter((a) => !profile || a.profileId === profile.id);

  const start = async (kind: 'loan' | 'grant') => {
    if (!profile) return;
    setErr('');
    try {
      const r = await api.createApplication(profile.id, kind);
      nav(`/dashboard/applications/${r.id}`);
    } catch (e) {
      setErr(msg(e));
    }
  };

  return (
    <>
      <div className="top">
        <h2 style={{ margin: 0 }}>Applications</h2>
        {profile?.status === 'verified' && (
          <div className="cta" style={{ marginTop: 0 }}>
            <button className="btn sm" onClick={() => start('loan')}>New loan application</button>
            <button className="btn soft sm" onClick={() => start('grant')}>New grant application</button>
          </div>
        )}
      </div>
      {err && <div className="err-box">{err}</div>}
      <div className="card scroll">
        {loading ? <p className="mut">Loading…</p> : rows.length === 0 ? (
          <p className="mut">No applications yet. {!profile && <Link to="/dashboard/open-account">Open an account</Link>}</p>
        ) : (
          <table className="tbl">
            <thead><tr><th>Reference</th><th>Type</th><th>Amount</th><th>Submitted</th><th>Last update</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="clickable" onClick={() => nav(`/dashboard/applications/${a.id}`)}>
                  <td>{a.reference}</td>
                  <td>{KIND_LABEL[a.kind]}</td>
                  <td>{a.amountKobo ? naira(fromKobo(a.amountKobo)) : '—'}</td>
                  <td>{date(a.submittedAt)}</td>
                  <td>{date(a.updatedAt)}</td>
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

// ---------- Savings ----------

export function Savings() {
  const { profile } = useAuth();
  const settings = useAsync(() => api.settings(), []);
  const goals = useAsync(() => (profile ? api.savings(profile.id) : Promise.resolve({ goals: [] })), [profile?.id]);
  const [f, setF] = useState({ name: '', planType: 'fixed' as 'fixed' | 'flexible', durationDays: 90, targetAmount: '' });
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(false);

  if (!profile) return <p className="mut">Open an account first.</p>;
  const plans = settings.data?.settings.savings.plans ?? [];
  const plan = plans.find((p) => p.days === f.durationDays);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    const amt = Number(f.targetAmount);
    if (f.name.trim().length < 2) return setErr('Name your goal.');
    if (!(amt > 0)) return setErr('Enter a target amount.');
    try {
      await api.createGoal(profile.id, { name: f.name, planType: f.planType, durationDays: f.durationDays, targetAmount: amt });
      setF({ ...f, name: '', targetAmount: '' });
      setOpen(false);
      await goals.reload();
    } catch (e2) {
      setErr(msg(e2));
    }
  };

  return (
    <>
      <div className="top">
        <h2 style={{ margin: 0 }}>Savings goals</h2>
        <button className="btn sm" onClick={() => setOpen((o) => !o)}>{open ? 'Cancel' : 'New goal'}</button>
      </div>
      <div className="notice">
        <b>Goal tracking</b>
        <p>For now, savings goals help you plan and track progress. Real balances and interest payments start when money features launch.</p>
      </div>
      {open && (
        <form className="f" onSubmit={create} noValidate>
          <Field className="full" label="Goal name"><input placeholder="Boots and kit" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Target amount (₦)"><input type="number" min={1} value={f.targetAmount} onChange={(e) => setF({ ...f, targetAmount: e.target.value })} /></Field>
          <Field label="Duration">
            <select value={f.durationDays} onChange={(e) => setF({ ...f, durationDays: Number(e.target.value) })}>
              {plans.map((p) => <option key={p.days} value={p.days}>{p.label}</option>)}
            </select>
          </Field>
          <Field className="full" label="Plan type">
            <div className="radio-row">
              <label className="check"><input type="radio" checked={f.planType === 'fixed'} onChange={() => setF({ ...f, planType: 'fixed' })} />
                Fixed: locked until maturity{plan ? `, ${plan.fixedRate}% a year` : ''}</label>
              <label className="check"><input type="radio" checked={f.planType === 'flexible'} onChange={() => setF({ ...f, planType: 'flexible' })} />
                Flexible: withdraw any time{plan ? `, ${plan.flexibleRate}% a year` : ''}</label>
            </div>
          </Field>
          {err && <div className="err-box full">{err}</div>}
          <div className="full"><button className="btn">Create goal</button></div>
        </form>
      )}
      {(goals.data?.goals ?? []).length === 0 && !goals.loading && <p className="mut">No goals yet.</p>}
      {goals.data?.goals.map((g) => <GoalCard key={g.id} goal={g} onChange={() => void goals.reload()} />)}
    </>
  );
}

function GoalCard({ goal: g, onChange }: { goal: import('../../lib/api').SavingsGoal; onChange: () => void }) {
  const [edit, setEdit] = useState(false);
  const [val, setVal] = useState(String(fromKobo(g.savedKobo)));
  const pct = Math.min(100, Math.round((g.savedKobo / g.targetKobo) * 100));
  const daysLeft = Math.max(0, Math.ceil((g.startDate + g.durationDays * 86_400_000 - Date.now()) / 86_400_000));
  return (
    <div className="card plan">
      <span className="bag">₦</span>
      <b>{g.name} <span className="badge g">{g.planType === 'fixed' ? 'Fixed' : 'Flexible'}</span></b>
      <span className="amt">{naira(fromKobo(g.savedKobo), 2)} <span className="mut small">of {naira(fromKobo(g.targetKobo))}</span></span>
      <span className="rate">Interest rate {g.interestRate.toFixed(1)}%</span>
      <span className="d">{daysLeft} days to maturity</span>
      <div className="bar"><i style={{ width: `${pct}%` }} /></div>
      <div className="goal-actions">
        {edit ? (
          <>
            <input type="number" min={0} value={val} onChange={(e) => setVal(e.target.value)} />
            <button className="btn sm" onClick={async () => { await api.updateGoal(g.id, Number(val) || 0); setEdit(false); onChange(); }}>Save</button>
            <button className="linkbtn" onClick={() => setEdit(false)}>Cancel</button>
          </>
        ) : (
          <>
            <button className="linkbtn" onClick={() => setEdit(true)}>Update amount saved</button>
            <button className="linkbtn" onClick={async () => { if (window.confirm('Delete this goal?')) { await api.deleteGoal(g.id); onChange(); } }}>Delete</button>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Team ----------

export function Team() {
  const { profile } = useAuth();
  const { data, reload } = useAsync(() => (profile ? api.profile(profile.id) : Promise.resolve(null)), [profile?.id]);
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  if (!profile) return <p className="mut">Open an account first.</p>;
  const owner = data?.myRole === 'owner';
  const isTeam = profile.type !== 'player';

  const invite = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    setOk('');
    if (!isEmail(email)) return setErr('Enter a valid email address.');
    try {
      const r = await api.invite(profile.id, email);
      setOk(r.status === 'active' ? `${email} now has access.` : `Invitation sent. ${email} will get access once they sign up.`);
      setEmail('');
      await reload();
    } catch (e2) {
      setErr(msg(e2));
    }
  };

  return (
    <>
      <h2 style={{ margin: 0 }}>Team</h2>
      {!isTeam ? (
        <div className="card"><p className="mut">Team members are available for club and academy accounts.</p></div>
      ) : (
        <>
          <div className="card scroll">
            <table className="tbl">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th /></tr></thead>
              <tbody>
                {data?.members.map((m) => (
                  <tr key={m.email}>
                    <td>{m.firstName ? `${m.firstName} ${m.lastName}` : '—'}</td>
                    <td>{m.email}</td>
                    <td>{m.role === 'owner' ? 'Owner' : 'Member'}</td>
                    <td><span className={badge(m.status === 'active' ? 'active' : 'pending_invite')}>{m.status === 'active' ? 'Active' : 'Invited'}</span></td>
                    <td>
                      {owner && m.role !== 'owner' && (
                        <button className="linkbtn" onClick={async () => { await api.removeMember(profile.id, m.email); await reload(); }}>Remove</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {owner && (
            <form className="f" onSubmit={invite} noValidate>
              <h3>Add a team member</h3>
              <p className="full mut small">Team members can fill in and submit applications for {profile.name}. Only you can add or remove members and complete the BVN check.</p>
              <Field className="full" label="Email address"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
              {err && <div className="err-box full">{err}</div>}
              {ok && <div className="ok-msg">{ok}</div>}
              <div className="full"><button className="btn">Add member</button></div>
            </form>
          )}
        </>
      )}
    </>
  );
}

// ---------- Notifications ----------

export function Notifications() {
  const nav = useNavigate();
  const { data, reload } = useAsync(() => api.notifications(), []);
  const list = data?.notifications ?? [];
  return (
    <>
      <div className="top">
        <h2 style={{ margin: 0 }}>Notifications</h2>
        {(data?.unread ?? 0) > 0 && <button className="btn soft sm" onClick={async () => { await api.markRead(); await reload(); }}>Mark all as read</button>}
      </div>
      <div className="card">
        {list.length === 0 ? <p className="mut">Nothing yet.</p> : (
          <ul className="notes">
            {list.map((n) => (
              <li key={n.id} className={n.readAt ? '' : 'unread'} onClick={() => n.link && nav(n.link)}>
                <b>{n.title}</b>
                <p>{n.body}</p>
                <span className="mut small">{dateTime(n.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Icon } from '../../components/Icons';
import { useAsync } from '../../hooks/useAsync';
import { api } from '../../lib/api';
import { badge, date, fromKobo, naira } from '../../lib/format';
import { KIND_LABEL, PROFILE_TYPE_LABEL, STATUS_LABEL } from '../../../shared/domain';

const BVN_LABEL = { none: 'Not started', pending: 'Checking', verified: 'Verified', failed: 'Failed' } as const;
const PROFILE_LABEL = { pending: 'Under review', verified: 'Active', rejected: 'Not approved' } as const;

export default function Overview() {
  const { user, profile, profiles } = useAuth();
  const nav = useNavigate();
  const apps = useAsync(() => api.applications(), []);
  const savings = useAsync(() => (profile ? api.savings(profile.id) : Promise.resolve({ goals: [] })), [profile?.id]);

  if (!profiles.length) {
    return (
      <>
        <h2 style={{ margin: 0 }}>Hi {user?.firstName}</h2>
        <div className="card">
          <h3>Open your account</h3>
          <p className="mut">Choose whether you’re a player, a registered club or an academy, then upload your documents.</p>
          <Link className="btn" to="/dashboard/open-account">Open an account</Link>
        </div>
      </>
    );
  }
  if (!profile) return null;

  const mine = (apps.data?.applications ?? []).filter((a) => a.profileId === profile.id);
  const saved = (savings.data?.goals ?? []).reduce((s, g) => s + g.savedKobo, 0);
  const accountApp = mine.find((a) => a.kind === 'account');
  const verified = profile.status === 'verified';

  return (
    <>
      <div className="top">
        <h2 style={{ margin: 0 }}>Hi {user?.firstName}</h2>
        <div className="tier">
          <span className="chip">{PROFILE_TYPE_LABEL[profile.type]}</span>
          <span className="chip">BVN: {BVN_LABEL[profile.bvnStatus]}</span>
        </div>
      </div>

      <div className="acct">
        <div className="card big">
          <div className="cs">
            <div className="c1">Savings goals<b>{naira(fromKobo(saved), 2)}</b></div>
            <div className="c2">Loans</div>
            <div className="c3">
              {profile.name}
              <span className="act" style={{ background: verified ? '#1b9a3f' : '#b7791f' }}>{PROFILE_LABEL[profile.status]}</span>
              <small>Account balance</small>
              <em>Available after launch</em>
            </div>
          </div>
          <div className="pills">
            <span className="btn soft disabled" title="Coming in Phase 2">+ Add money</span>
            <span className="btn soft disabled" title="Coming in Phase 2">Send money</span>
          </div>
        </div>

        <div className="card">
          <h3>Account status</h3>
          {!verified ? (
            <div className="inel">
              <span className="ic"><Icon name="shield" /></span>
              <div>
                <b>{accountApp?.status === 'draft' ? 'Finish your account application.' : accountApp?.status === 'changes_requested' ? 'We need a few changes.' : 'Your account is under review.'}</b>
                <br />
                <small className="mut">Loans and grants open once your account is approved.</small>
              </div>
            </div>
          ) : (
            <div className="inel">
              <span className="ic"><Icon name="coin" /></span>
              <div>
                <b>Your account is active.</b>
                <br />
                <small className="mut">You can apply for loans and grants.</small>
              </div>
            </div>
          )}
          {accountApp && !verified && (
            <Link className="btn" to={`/dashboard/applications/${accountApp.id}`}>
              {accountApp.status === 'draft' || accountApp.status === 'changes_requested' ? 'Continue application' : 'View application'}
            </Link>
          )}
          {verified && (
            <div className="cta" style={{ marginTop: 0 }}>
              <button className="btn" onClick={() => api.createApplication(profile.id, 'loan').then((r) => nav(`/dashboard/applications/${r.id}`))}>
                Apply for a loan
              </button>
              <button className="btn soft" onClick={() => api.createApplication(profile.id, 'grant').then((r) => nav(`/dashboard/applications/${r.id}`))}>
                Apply for a grant
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="card scroll">
        <div className="row-between"><h3>My applications</h3><Link className="more" to="/dashboard/applications">See all</Link></div>
        {mine.length === 0 ? (
          <p className="mut">No applications yet.</p>
        ) : (
          <table className="tbl">
            <thead><tr><th>Reference</th><th>Type</th><th>Amount</th><th>Updated</th><th>Status</th></tr></thead>
            <tbody>
              {mine.slice(0, 5).map((a) => (
                <tr key={a.id} className="clickable" onClick={() => nav(`/dashboard/applications/${a.id}`)}>
                  <td>{a.reference}</td>
                  <td>{KIND_LABEL[a.kind]}</td>
                  <td>{a.amountKobo ? naira(fromKobo(a.amountKobo)) : '—'}</td>
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

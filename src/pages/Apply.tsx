import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { PageHeader, Steps } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { api, ApiError } from '../lib/api';
import { naira } from '../lib/format';

const WHO = [
  { tab: 'Individual player', text: 'Boots, kit, medicals, trials and relocation. You’ll upload your ID and football credentials.' },
  { tab: 'Registered club', text: 'Working capital, facilities, kit and transport. You’ll upload the club registration certificate.' },
  { tab: 'Football academy', text: 'Coaching, equipment and facilities. You’ll upload the academy registration certificate.' },
];

export default function Apply({ kind }: { kind: 'loan' | 'grant' }) {
  const isLoan = kind === 'loan';
  const nav = useNavigate();
  const { ready, profile } = useAuth();
  const { data } = useAsync(() => api.settings(), []);
  const [tab, setTab] = useState(0);
  const [err, setErr] = useState('');
  const s = data?.settings;
  const rules = s ? (isLoan ? s.loan : s.grant) : null;

  const start = async () => {
    if (!ready) return nav(`/login?next=/${kind}`);
    if (!profile) return nav('/dashboard/open-account');
    setErr('');
    try {
      const r = await api.createApplication(profile.id, kind);
      nav(`/dashboard/applications/${r.id}`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Something went wrong.');
    }
  };

  return (
    <>
      <PageHeader
        title={`Apply for a ${kind}`}
        lead={
          isLoan
            ? 'Every application goes through document verification and an eligibility assessment.'
            : 'Non-repayable football funding, assessed after your documents are verified.'
        }
      />
      <section className="s">
        <div className="wrap">
          <div className="tabs" role="tablist">
            {WHO.map((w, i) => (
              <button key={w.tab} type="button" role="tab" aria-selected={i === tab} className={i === tab ? 'on' : undefined} onClick={() => setTab(i)}>
                {w.tab}
              </button>
            ))}
          </div>
          <div className="split">
            <div className="card">
              <h3>{WHO[tab].tab}</h3>
              <p>{WHO[tab].text}</p>
              {rules && (
                <dl className="kv">
                  <div><dt>Amount</dt><dd>{naira(rules.minAmount)} to {naira(rules.maxAmount)}</dd></div>
                  {isLoan && s ? (
                    <div><dt>Repayment</dt><dd>{s.loan.periods.map((p) => `${p.label} (${p.monthlyRate}% a month)`).join(', ')}</dd></div>
                  ) : s ? (
                    <div><dt>Categories</dt><dd>{s.grant.categories.join(', ')}</dd></div>
                  ) : null}
                </dl>
              )}
              <p className="mut small">You need an approved Winx account to apply. Your application saves as you type, so you can finish it later.</p>
              {err && <div className="err-box">{err}</div>}
              <button className="btn" onClick={start}>
                {!ready ? `Log in to apply` : !profile ? 'Open an account first' : `Start ${kind} application`}
              </button>
              {!ready && <p className="mut small" style={{ marginTop: 12 }}>New to Winx? <Link to="/signup">Open an account</Link></p>}
            </div>
            <div>
              <h2>What happens next</h2>
              <Steps
                items={[
                  { title: 'Documents checked', text: 'Identity and football credentials are verified.' },
                  { title: 'Eligibility assessed', text: 'Amount, purpose and plan are reviewed.' },
                  { title: 'Decision shared', text: 'You get an email, and the outcome appears on your dashboard.' },
                ]}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

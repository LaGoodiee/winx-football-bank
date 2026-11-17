import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../components/Icons';
import { CardStack, SavingsPlanCard } from '../components/ui';
import { applications, demoUser, formatNaira, savingsPlans } from '../data/mock';
import type { ApplicationStatus } from '../types';

const SIDE: { icon: IconName; label: string }[] = [
  { icon: 'home', label: 'Home' },
  { icon: 'card', label: 'Accounts' },
  { icon: 'save', label: 'Savings' },
  { icon: 'send', label: 'Payments' },
  { icon: 'coin', label: 'Loans' },
  { icon: 'doc', label: 'Statements' },
];

const QUICK: { icon: IconName; label: string }[] = [
  { icon: 'doc', label: 'Credit report' },
  { icon: 'card', label: 'Cards' },
  { icon: 'send', label: 'Pay bills' },
  { icon: 'coin', label: 'Buy airtime' },
];

function badgeClass(s: ApplicationStatus) {
  if (s === 'Approved') return 'badge';
  if (s === 'Draft') return 'badge g';
  return 'badge w';
}

export default function Dashboard() {
  const [showBal, setShowBal] = useState(false);
  const [section, setSection] = useState('Home');
  const u = demoUser;
  const academy = savingsPlans.find((p) => p.id === 'academy');

  return (
    <div className="wrap dash">
      <aside className="side">
        {SIDE.map((s) => (
          <a key={s.label} className={section === s.label ? 'on' : undefined} onClick={() => setSection(s.label)}>
            <Icon name={s.icon} />
            {s.label}
          </a>
        ))}
      </aside>

      <div className="dm">
        <div className="top">
          <h2 style={{ margin: 0 }}>Hi {u.firstName}</h2>
          <div className="tier">
            <span className="chip">Tier {u.tier}</span>
            <span className="chip">KYC level {u.kycLevel}</span>
          </div>
        </div>

        <div className="acct">
          <div className="card big">
            <CardStack
              savings={formatNaira(u.savingsTotal)}
              accountLabel="Balance"
              extra={<button className="eye" onClick={() => setShowBal((v) => !v)}>{showBal ? 'Hide' : 'Show'}</button>}
              accountValue={showBal ? formatNaira(u.mainBalance) : '₦ ••••••'}
            />
            <div className="pills">
              <Link className="btn soft" to="/dashboard">+ Add money</Link>
              <Link className="btn soft" to="/dashboard">Send money</Link>
            </div>
          </div>
          <div className="card">
            <h3>Loan eligibility</h3>
            <div className="inel">
              <span className="ic"><Icon name="coin" /></span>
              <div>
                <b>{u.loanEligible ? 'You’re eligible for a loan.' : 'You’re currently ineligible for a loan.'}</b>
                <br />
                <small className="mut">{u.loanAppsUsedToday} of {u.loanAppsDailyLimit} applications used today</small>
              </div>
            </div>
            <div className="rate98"><span>Average on-time repayment</span><b>{u.onTimeRepaymentPct}%</b></div>
          </div>
        </div>

        <div className="card">
          <h3>Quick access</h3>
          <div className="qg">
            {QUICK.map((q) => (
              <Link key={q.label} to="/dashboard">
                <div className="ic"><Icon name={q.icon} /></div>
                {q.label}
              </Link>
            ))}
          </div>
        </div>

        {academy && (
          <div className="card">
            <h3>My savings</h3>
            <SavingsPlanCard plan={academy} bare />
          </div>
        )}

        <div className="card scroll">
          <h3>My applications</h3>
          <table className="tbl">
            <thead>
              <tr><th>Reference</th><th>Type</th><th>Applicant</th><th>Status</th></tr>
            </thead>
            <tbody>
              {applications.map((a) => (
                <tr key={a.reference}>
                  <td>{a.reference}</td>
                  <td>{a.type}</td>
                  <td>{a.applicant}</td>
                  <td><span className={badgeClass(a.status)}>{a.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

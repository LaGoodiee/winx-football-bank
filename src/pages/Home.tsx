import { Link } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { CardStack, FeatureCard, SavingsPlanCard } from '../components/ui';
import { demoUser, formatNaira, savingsPlans } from '../data/demo';

export default function Home() {
  return (
    <>
      <div className="hero">
        <div className="wrap">
          <div>
            <h1>Banking built for the beautiful game.</h1>
            <p className="lead">
              Savings, loans and grants for players, clubs and academies. Open an account in minutes and track every
              application from your phone.
            </p>
            <div className="cta">
              <Link className="btn" to="/account">Open an account</Link>
              <Link className="btn line" to="/loan">Apply for a loan</Link>
            </div>
            <div className="trust">
              <span><Icon name="shield" />Encrypted document upload</span>
              <span><Icon name="shield" />Every file verified</span>
            </div>
          </div>

          <div className="phone" aria-hidden="true">
            <div className="hi"><i className="av">{demoUser.initials}</i>Hi {demoUser.firstName}</div>
            <CardStack
              savings={formatNaira(demoUser.savingsTotal)}
              accountLabel="Account number"
              accountValue={demoUser.accountNumberMasked}
            />
            <div className="pills"><span>+ Add money</span><span>Send money</span></div>
            <div className="qa">
              <span><i style={{ background: '#e8a05a' }} />Credit report</span>
              <span><i style={{ background: '#f08ab8' }} />Cards</span>
              <span><i style={{ background: '#5fbf7a' }} />Pay bills</span>
              <span><i style={{ background: '#7aa8f0' }} />Airtime</span>
            </div>
          </div>
        </div>
      </div>

      <div className="strip">
        <div className="wrap">
          <div><b>Players, clubs, academies</b><span>One account for all three</span></div>
          <div><b>Verified files</b><span>Checked before approval</span></div>
          <div><b>Live tracking</b><span>Follow each application</span></div>
          <div><b>Overseas pathways</b><span>Trials and scouting</span></div>
        </div>
      </div>

      <section className="s">
        <div className="wrap">
          <div className="head">
            <h2>Everything your football money needs</h2>
            <p className="mut">Four services, each with a secure application and a verified review.</p>
          </div>
          <div className="grid">
            <FeatureCard icon="card" title="Account opening" link={<Link className="more" to="/account">Open account</Link>}>
              Set up online with your ID and football documents.
            </FeatureCard>
            <FeatureCard icon="save" title="Football savings" link={<Link className="more" to="/savings">See savings</Link>}>
              Goal-based plans with fixed interest and a clear maturity date.
            </FeatureCard>
            <FeatureCard icon="coin" title="Football loans" link={<Link className="more" to="/loan">Apply for a loan</Link>}>
              Boots, kit, trials and travel, repaid on a schedule that fits your season.
            </FeatureCard>
            <FeatureCard icon="star" title="Football grants" link={<Link className="more" to="/grant">Apply for a grant</Link>}>
              Non-repayable support for talent, academies and community clubs.
            </FeatureCard>
          </div>
        </div>
      </section>

      <section className="s alt">
        <div className="wrap split">
          <div>
            <h2>Save toward a goal, watch it grow</h2>
            <p className="mut">
              Name your plan, pick a duration and see your balance, interest rate and days to maturity at a glance.
            </p>
            <Link className="btn" to="/savings">Explore savings</Link>
          </div>
          <div>
            {savingsPlans.slice(0, 2).map((p) => <SavingsPlanCard key={p.id} plan={p} />)}
          </div>
        </div>
      </section>

      <section className="s">
        <div className="wrap">
          <div className="band">
            <div>
              <h2>Your documents stay protected</h2>
              <p>
                Uploads are encrypted and used only for verification. Incomplete files come back with a note on exactly
                what is missing.
              </p>
              <Link className="btn w" to="/account">Open an account</Link>
            </div>
            <ul>
              <li>Encrypted uploads</li>
              <li>Document verification before approval</li>
              <li>Step-by-step application tracking</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}

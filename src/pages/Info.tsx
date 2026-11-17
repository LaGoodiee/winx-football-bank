// Simple content pages: About, Services, International, Privacy, Terms, NotFound
import { Link } from 'react-router-dom';
import { FeatureCard, PageHeader } from '../components/ui';

export function About() {
  return (
    <>
      <PageHeader title="About Winx Football Bank" lead="Building Football Dreams, Financing Football Futures." />
      <section className="s">
        <div className="wrap grid">
          <FeatureCard title="Our mission">
            To finance football talent and clubs responsibly, making professional pathways reachable.
          </FeatureCard>
          <FeatureCard title="Our vision">
            A world where no player is stopped by lack of funds, and every registered club can plan beyond one season.
          </FeatureCard>
          <FeatureCard title="Club support">
            Operational funding, registration and reporting guidance, and academy growth grants.
          </FeatureCard>
        </div>
      </section>
    </>
  );
}

const SERVICES = [
  { title: 'Club financing', text: 'Working capital, facility upgrades, kit and transport for registered clubs.', to: '/loan', cta: 'Apply' },
  { title: 'Player loans', text: 'Short, flexible loans for boots, medicals, trials and relocation.', to: '/loan', cta: 'Apply' },
  { title: 'Football grants', text: 'Non-repayable funding after an eligibility review.', to: '/grant', cta: 'Apply' },
  { title: 'Football savings', text: 'Named plans with fixed rates, built around a football goal.', to: '/savings', cta: 'View plans' },
  { title: 'International opportunities', text: 'Trials, development programmes, scouting and partner clubs.', to: '/international', cta: 'Explore' },
  { title: 'Club management', text: 'Registration, record keeping, budgeting and reporting.', to: '/contact', cta: 'Talk to us' },
];

export function Services() {
  return (
    <>
      <PageHeader title="Our services" lead="Six services, one football-first bank." />
      <section className="s">
        <div className="wrap grid">
          {SERVICES.map((s) => (
            <FeatureCard key={s.title} title={s.title} link={<Link className="more" to={s.to}>{s.cta}</Link>}>
              {s.text}
            </FeatureCard>
          ))}
        </div>
      </section>
    </>
  );
}

const INTL = [
  { title: 'International trials', text: 'Verified players are matched with open trial days at partner clubs abroad.' },
  { title: 'Overseas development', text: 'Training programmes and academy placements with funding support.' },
  { title: 'Club partnerships', text: 'Introductions between Winx member clubs and overseas clubs.' },
  { title: 'Scouting', text: 'Put your profile and match footage in front of accredited scouts.' },
];

export function International() {
  return (
    <>
      <PageHeader title="International opportunities" lead="From local pitch to overseas pathway." />
      <section className="s">
        <div className="wrap grid">
          {INTL.map((i) => (
            <FeatureCard key={i.title} icon="globe" title={i.title}>{i.text}</FeatureCard>
          ))}
        </div>
      </section>
    </>
  );
}

export function Privacy() {
  return (
    <>
      <PageHeader title="Privacy policy" />
      <section className="s">
        <div className="wrap legaltxt">
          <h3>What we collect</h3>
          <p>Name, address, phone number, passport photograph, identification and football documents submitted with an application.</p>
          <h3>How we use it</h3>
          <p>Document verification, eligibility assessment and application tracking. Placeholder text: replace with your final policy.</p>
          <h3>How we protect it</h3>
          <p>Encrypted forms and restricted staff access.</p>
        </div>
      </section>
    </>
  );
}

export function Terms() {
  return (
    <>
      <PageHeader title="Terms and conditions" />
      <section className="s">
        <div className="wrap legaltxt">
          <h3>Eligibility</h3>
          <p>Applicants must provide accurate details and valid documents. Approval is subject to verification and assessment.</p>
          <h3>Loans and grants</h3>
          <p>Loans are repayable under the agreed schedule. Grants are non-repayable when used for the stated purpose. Placeholder text: replace with your final terms.</p>
        </div>
      </section>
    </>
  );
}

export function NotFound() {
  return (
    <>
      <PageHeader title="Page not found" lead="That page doesn’t exist." />
      <section className="s"><div className="wrap"><Link className="btn" to="/">Back to home</Link></div></section>
    </>
  );
}

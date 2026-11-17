import { Link } from 'react-router-dom';
import { PageHeader, SavingsPlanCard, Steps } from '../components/ui';
import { savingsPlans } from '../data/demo';

export default function Savings() {
  return (
    <>
      <PageHeader title="Football savings" lead="Save toward a goal and see interest and days to maturity at a glance." />
      <section className="s">
        <div className="wrap split">
          <div>
            {savingsPlans.map((p) => <SavingsPlanCard key={p.id} plan={p} />)}
          </div>
          <div>
            <h2>How it works</h2>
            <Steps
              items={[
                { title: 'Name your goal', text: 'Boots, a trial abroad, a club bus.' },
                { title: 'Pick a duration', text: 'The longer you save, the higher the rate.' },
                { title: 'Watch it grow', text: 'Balance and maturity date stay visible.' },
              ]}
            />
            <Link className="btn" to="/account">Open an account to start</Link>
          </div>
        </div>
      </section>
    </>
  );
}

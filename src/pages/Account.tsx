import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Icon } from '../components/Icons';
import { PageHeader, Steps } from '../components/ui';

export default function Account() {
  const { ready } = useAuth();
  return (
    <>
      <PageHeader title="Open an account" lead="For players, clubs and academies. It takes about ten minutes." />
      <section className="s">
        <div className="wrap split">
          <div className="card">
            <h3>What you’ll need</h3>
            <ul className="checklist">
              <li>A passport photograph (JPG or PNG, plain background)</li>
              <li>A valid ID: NIN slip, international passport or driver’s licence</li>
              <li>Your NIN and BVN, plus a bank account linked to the BVN</li>
              <li>Clubs and academies: your registration certificate</li>
              <li>Players: a player card or trial invitation, if you have one</li>
            </ul>
            <div className="note" style={{ margin: '14px 0 20px' }}>
              <Icon name="shield" size={18} />Documents are stored privately and used only for verification.
            </div>
            <Link className="btn" to={ready ? '/dashboard/open-account' : '/signup'}>
              {ready ? 'Continue to your application' : 'Start now'}
            </Link>
          </div>
          <div>
            <h2>What happens next</h2>
            <Steps
              items={[
                { title: 'Create your login', text: 'Email and password, confirmed with a one-time code.' },
                { title: 'Submit details and documents', text: 'Your progress saves automatically, so you can finish later.' },
                { title: 'Verification', text: 'We check your BVN and every document against your details.' },
                { title: 'Account active', text: 'Apply for loans and grants and track everything from your dashboard.' },
              ]}
            />
          </div>
        </div>
      </section>
    </>
  );
}

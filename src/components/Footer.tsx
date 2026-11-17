import { Link } from 'react-router-dom';
import { Icon } from './Icons';

export default function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="cols">
          <div>
            <Link className="logo" to="/" style={{ marginBottom: 12 }}>
              <Icon name="crest" />
              Winx Football Bank
            </Link>
            <p>Building Football Dreams, Financing Football Futures.</p>
          </div>
          <div>
            <h4>Bank</h4>
            <Link to="/account">Open account</Link>
            <Link to="/savings">Savings</Link>
            <Link to="/loan">Loans</Link>
            <Link to="/grant">Grants</Link>
          </div>
          <div>
            <h4>Company</h4>
            <Link to="/about">About us</Link>
            <Link to="/services">Services</Link>
            <Link to="/international">International</Link>
            <Link to="/contact">Contact</Link>
          </div>
          <div>
            <h4>Legal</h4>
            <Link to="/privacy">Privacy policy</Link>
            <Link to="/terms">Terms and conditions</Link>
            <Link to="/login">Log in</Link>
          </div>
        </div>
        <div className="legal">
          © {new Date().getFullYear()} Winx Football Bank. Banking services are provided with a licensed partner
          institution. Add your partner’s licence details here.
        </div>
      </div>
    </footer>
  );
}

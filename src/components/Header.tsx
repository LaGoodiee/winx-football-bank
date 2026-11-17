import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Icon } from './Icons';
import { useTheme } from '../hooks/useTheme';

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/services', label: 'Services' },
  { to: '/savings', label: 'Savings' },
  { to: '/loan', label: 'Loans' },
  { to: '/grant', label: 'Grants' },
  { to: '/international', label: 'International' },
  { to: '/contact', label: 'Contact' },
];

function AuthButtons() {
  return (
    <>
      <Link className="btn soft sm" to="/dashboard">Log in</Link>
      <Link className="btn sm" to="/account">Open account</Link>
    </>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [spin, setSpin] = useState(false);
  const { theme, toggle } = useTheme();
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const onToggle = () => {
    toggle();
    setSpin(true);
    window.setTimeout(() => setSpin(false), 520);
  };

  return (
    <header className={scrolled ? 'sc' : undefined}>
      <div className="wrap nav">
        <Link className="logo" to="/">
          <Icon name="crest" />
          Winx Football Bank
        </Link>
        <nav id="nav" className={open ? 'open' : undefined}>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'}>
              {n.label}
            </NavLink>
          ))}
          <div className="m"><AuthButtons /></div>
        </nav>
        <div className="hd-cta"><AuthButtons /></div>
        <button id="mb" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          Menu
        </button>
        <button
          className={`tg${spin ? ' spin' : ''}`}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={onToggle}
        >
          <svg className="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
            <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />
          </svg>
          <svg className="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        </button>
      </div>
    </header>
  );
}

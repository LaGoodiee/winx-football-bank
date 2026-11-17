import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { IconSprite } from './Icons';
import { useReveal } from '../hooks/useReveal';

export default function Layout() {
  const { pathname } = useLocation();

  useEffect(() => window.scrollTo(0, 0), [pathname]);
  useReveal(pathname);

  return (
    <>
      <IconSprite />
      <Header />
      <main>
        {/* key forces the page fade-in animation on each route change */}
        <div className="page on" key={pathname}>
          <Outlet />
        </div>
      </main>
      <Footer />
    </>
  );
}

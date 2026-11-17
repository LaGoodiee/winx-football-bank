import { useEffect } from 'react';

const SELECTOR = '.page .card,.page .steps>div,.band,.head,.strip .wrap>div,.tabs,form.f,.ph .wrap>*';

/** Fade-up-on-scroll, re-applied whenever the route (key) changes. */
export function useReveal(key: string) {
  useEffect(() => {
    document.documentElement.classList.add('js');
    const els = Array.from(document.querySelectorAll<HTMLElement>(SELECTOR));
    const io =
      'IntersectionObserver' in window
        ? new IntersectionObserver(
            (entries) =>
              entries.forEach((e) => {
                if (e.isIntersecting) {
                  e.target.classList.add('in');
                  io?.unobserve(e.target);
                }
              }),
            { threshold: 0.1, rootMargin: '0px 0px -30px 0px' },
          )
        : null;

    els.forEach((el) => {
      if (el.classList.contains('in')) return;
      el.classList.add('rv');
      const idx = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
      el.style.setProperty('--d', `${(idx % 4) * 0.09}s`);
      if (io) io.observe(el);
      else el.classList.add('in');
    });
    return () => io?.disconnect();
  }, [key]);
}

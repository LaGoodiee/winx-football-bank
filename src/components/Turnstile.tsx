import { useEffect, useRef } from 'react';

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: { sitekey: string; callback: (t: string) => void; 'expired-callback'?: () => void }) => string;
      remove: (id: string) => void;
    };
  }
}

/** Cloudflare Turnstile bot check. Renders nothing when VITE_TURNSTILE_SITE_KEY isn't set. */
export function Turnstile({ onToken }: { onToken: (t: string | undefined) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!SITE_KEY || !ref.current) return;
    let id: string | undefined;
    const mount = () => {
      if (ref.current && window.turnstile)
        id = window.turnstile.render(ref.current, { sitekey: SITE_KEY, callback: onToken, 'expired-callback': () => onToken(undefined) });
    };
    if (window.turnstile) mount();
    else {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = mount;
      document.head.appendChild(s);
    }
    return () => {
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, [onToken]);
  if (!SITE_KEY) return null;
  return <div ref={ref} className="full" />;
}

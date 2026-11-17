export type IconName = 'crest' | 'card' | 'save' | 'coin' | 'star' | 'globe' | 'shield' | 'home' | 'send' | 'doc';

/** One hidden SVG sprite, rendered once in the layout. */
export function IconSprite() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <symbol id="crest" viewBox="0 0 40 40">
          <path d="M20 2 36 8v13c0 9-7 15-16 18C11 36 4 30 4 21V8z" fill="#5b2de0" />
          <circle cx="20" cy="19" r="8" fill="none" stroke="#fff" strokeWidth="2.4" />
          <path d="M20 14l4 3-1.5 5h-5L16 17z" fill="#fff" />
        </symbol>
        <symbol id="i-card" viewBox="0 0 24 24">
          <rect x="3" y="6" width="18" height="13" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M3 10h18" stroke="currentColor" strokeWidth="2" />
        </symbol>
        <symbol id="i-save" viewBox="0 0 24 24">
          <path d="M5 20h14l-1-9a6 6 0 0 0-3-5l1-3H8l1 3a6 6 0 0 0-3 5z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-coin" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M9 8v8M15 8v8M8 11h8M8 14h8" stroke="currentColor" strokeWidth="1.8" />
        </symbol>
        <symbol id="i-star" viewBox="0 0 24 24">
          <path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-globe" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" fill="none" stroke="currentColor" strokeWidth="2" />
        </symbol>
        <symbol id="i-shield" viewBox="0 0 24 24">
          <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M8.5 12l2.5 2.5 4.5-5" fill="none" stroke="currentColor" strokeWidth="2" />
        </symbol>
        <symbol id="i-home" viewBox="0 0 24 24">
          <path d="M4 11l8-7 8 7v9H4z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-send" viewBox="0 0 24 24">
          <path d="M7 17L17 7M9 7h8v8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </symbol>
        <symbol id="i-doc" viewBox="0 0 24 24">
          <path d="M6 3h9l4 4v14H6z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M9 12h7M9 16h7" stroke="currentColor" strokeWidth="2" />
        </symbol>
      </defs>
    </svg>
  );
}

export function Icon({ name, size }: { name: IconName; size?: number }) {
  const href = name === 'crest' ? '#crest' : `#i-${name}`;
  return (
    <svg width={size} height={size} aria-hidden="true">
      <use href={href} />
    </svg>
  );
}

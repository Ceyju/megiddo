'use client';

import Link from 'next/link';

export default function MangaError({ retry }: { retry: () => void }) {
  return (
    <section role="alert" className="player-empty" style={{ padding: '3rem' }}>
      <h2>Manga source temporarily unavailable</h2>
      <p>Please retry shortly or choose another title.</p>
      <button className="editorial-button" onClick={retry}>Retry</button>
      <Link className="editorial-button" href="/manga">Browse manga</Link>
    </section>
  );
}

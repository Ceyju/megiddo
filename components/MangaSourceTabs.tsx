'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const SOURCES = [
  { id: 'anilist',  label: 'AniList',   color: '#02a9ff' },
  { id: 'mangadex', label: 'MangaDex',  color: '#FF6740' },
  { id: 'kitsu',    label: 'Kitsu',     color: '#7B52AB' },
];

export default function MangaSourceTabs() {
  const searchParams = useSearchParams();
  const current = searchParams.get('source') ?? 'anilist';

  return (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '2rem' }}>
      {SOURCES.map(s => {
        const active = s.id === current;
        return (
          <Link
            key={s.id}
            href={`/manga?source=${s.id}`}
            style={{
              fontFamily: 'var(--font-condensed, Arial)',
              fontSize: '0.68rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              padding: '6px 16px',
              textDecoration: 'none',
              color: active ? 'var(--ink)' : 'var(--muted)',
              background: active ? s.color : 'transparent',
              border: `1px solid ${active ? s.color : 'var(--border-2)'}`,
              transition: 'color 0.15s, background 0.15s, border-color 0.15s',
            }}
          >
            {s.label}
          </Link>
        );
      })}
    </div>
  );
}

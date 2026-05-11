'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

const SOURCES = [
  { id: 'anilist',  label: 'AniList',   color: '#02a9ff' },
  { id: 'mangadex', label: 'MangaDex',  color: '#FF6740' },
  { id: 'kitsu',    label: 'Kitsu',     color: '#7B52AB' },
];

export default function MangaSourceTabs() {
  const searchParams = useSearchParams();
  const current = searchParams.get('source') ?? 'anilist';
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
      {SOURCES.map(s => {
        const active = s.id === current;
        const isHov = hovered === s.id && !active;
        return (
          <Link
            key={s.id}
            href={`/manga?source=${s.id}`}
            onMouseEnter={() => setHovered(s.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              fontFamily: 'var(--font-condensed, Arial)',
              fontSize: '0.65rem',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              padding: '6px 20px',
              textDecoration: 'none',
              color: active ? 'var(--ink)' : isHov ? 'var(--paper)' : 'var(--muted)',
              background: active ? s.color : isHov ? 'var(--surface-2)' : 'transparent',
              border: `1px solid ${active ? s.color : isHov ? 'var(--border-2)' : 'var(--border-2)'}`,
              transition: 'color 0.15s, background 0.15s',
            }}
          >
            {s.label}
          </Link>
        );
      })}
    </div>
  );
}


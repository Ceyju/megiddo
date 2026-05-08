"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import type { MDManga } from '@/lib/mangadex';

const KNOWN_HOSTS = [
  'uploads.mangadex.org', 'media.kitsu.app', 's4.anilist.co',
];

function isKnownHost(url: string | null): boolean {
  if (!url) return false;
  try { return KNOWN_HOSTS.some(h => new URL(url).hostname.endsWith(h)); }
  catch { return false; }
}

export default function MangaCard({ manga, href, priority }: { manga: MDManga; href?: string; priority?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const typeLabel = manga.type === 'manhwa' ? 'MANHWA' : manga.type === 'manhua' ? 'MANHUA' : 'MANGA';
  const typeColor = manga.type === 'manhwa' ? 'var(--lime)' : manga.type === 'manhua' ? '#FF8800' : 'var(--red)';
  const resolvedHref = href ?? `/manga/${manga.id}`;

  return (
    <Link href={resolvedHref} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        style={{ position: 'relative', aspectRatio: '2/3', overflow: 'hidden', background: 'var(--surface)', marginBottom: '0.5rem' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {manga.coverUrl ? (
          <Image
            src={manga.coverUrl}
            alt={manga.title}
            fill
            unoptimized={!isKnownHost(manga.coverUrl)}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 180px"
            style={{ objectFit: 'cover', transition: 'transform 0.4s ease', transform: hovered ? 'scale(1.04)' : 'scale(1)' }}
            priority={priority}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'var(--font-display, Impact)', fontSize: '2rem', color: 'var(--border-2)' }}>?</span>
          </div>
        )}
        <div style={{ position: 'absolute', top: '6px', left: '6px', padding: '2px 7px', background: typeColor, fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.5rem', letterSpacing: '0.12em', color: typeColor === 'var(--lime)' ? 'var(--ink)' : 'var(--paper)', textTransform: 'uppercase' }}>
          {typeLabel}
        </div>
        {manga.status === 'completed' && (
          <div style={{ position: 'absolute', bottom: '6px', right: '6px', padding: '2px 6px', background: 'var(--ink)', border: '1px solid var(--border-2)', fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.45rem', letterSpacing: '0.1em', color: 'var(--paper-2)', textTransform: 'uppercase' }}>COMPLETE</div>
        )}
      </div>
      <p style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.72rem', letterSpacing: '0.05em', color: 'var(--paper)', textTransform: 'uppercase', lineHeight: 1.2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
        {manga.title}
      </p>
      {manga.latestChapter && (
        <p style={{ fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.6rem', color: 'var(--muted)', marginTop: '2px' }}>
          Ch. {manga.latestChapter}
        </p>
      )}
    </Link>
  );
}
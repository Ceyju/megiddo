'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import type { NFListNovel } from '@/lib/novelfire';

interface Props {
  novel: NFListNovel;
  rank: number;
}

export default function NFRecommendCard({ novel, rank }: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link href={`/webnovels/${novel.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
      {/* Cover */}
      <div
        style={{ position: 'relative', aspectRatio: '2/3', overflow: 'hidden', background: 'var(--surface)', marginBottom: '0.45rem' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {novel.coverUrl ? (
          <Image
            src={novel.coverUrl}
            alt={novel.title}
            fill
            unoptimized
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 20vw, 160px"
            style={{ objectFit: 'cover', transition: 'transform 0.4s ease', transform: hovered ? 'scale(1.07)' : 'scale(1)' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)' }}>
            <span style={{ fontFamily: 'var(--font-display, Impact)', fontSize: '2rem', color: 'var(--border-2)' }}>NF</span>
          </div>
        )}

        {/* Bottom gradient */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(11,10,8,0.72) 0%, transparent 50%)', pointerEvents: 'none', opacity: hovered ? 1 : 0.6, transition: 'opacity 0.3s' }} />

        {/* Rating badge */}
        {novel.rating && (
          <div style={{
            position: 'absolute', bottom: '6px', left: '6px',
            padding: '2px 7px',
            background: 'rgba(11,10,8,0.88)',
            border: '1px solid rgba(248,155,43,0.4)',
            fontFamily: 'var(--font-condensed, Arial)',
            fontSize: '0.58rem',
            letterSpacing: '0.06em',
            color: '#F89B2B',
          }}>
            ★ {novel.rating}
          </div>
        )}

        {/* Hover tint */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(200,30,30,0.08)', opacity: hovered ? 1 : 0, transition: 'opacity 0.3s', pointerEvents: 'none' }} />
      </div>

      {/* Title */}
      <p style={{
        fontFamily: 'var(--font-condensed, Arial)',
        fontSize: '0.72rem',
        letterSpacing: '0.04em',
        color: hovered ? 'var(--paper)' : 'var(--paper-2)',
        lineHeight: 1.25,
        margin: '0 0 3px',
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        transition: 'color 0.2s',
      }}>
        {novel.title}
      </p>

      {/* Rank */}
      <p style={{
        fontFamily: 'var(--font-condensed, Arial)',
        fontSize: '0.52rem',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--muted)',
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
      }}>
        <span style={{ color: 'var(--red)', fontSize: '0.6rem' }}>▸</span>
        RANK {rank}
      </p>
    </Link>
  );
}

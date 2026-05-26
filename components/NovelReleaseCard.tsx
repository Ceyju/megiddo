'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import type { NFListNovel } from '@/lib/novelfire';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  ongoing:   { bg: 'var(--red)',  text: '#fff' },
  completed: { bg: '#0a7c5c',    text: '#fff' },
  hiatus:    { bg: '#b56b00',    text: '#fff' },
};

function statusColor(status: string | null) {
  const key = (status ?? '').toLowerCase();
  return STATUS_COLORS[key] ?? { bg: 'var(--border-2)', text: 'var(--paper)' };
}

export default function LNVolumeCard({
  volume: novel,
  index,
}: {
  volume: NFListNovel;
  index: number;
}) {
  const [hovered, setHovered] = useState(false);
  const colors = statusColor(novel.status);

  return (
    <Link
      href={`/webnovels/${novel.slug}`}
      className="card-reveal"
      style={{ cursor: 'pointer', textDecoration: 'none', display: 'block', animationDelay: `${0.04 + index * 0.025}s` }}
    >
      <div
        style={{ position: 'relative', aspectRatio: '2/3', overflow: 'hidden', background: 'var(--surface)', marginBottom: '0.5rem' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {novel.coverUrl ? (
          <Image
            src={novel.coverUrl}
            alt={novel.title}
            fill
            unoptimized
            loading="eager"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 180px"
            style={{ objectFit: 'cover', transition: 'transform 0.5s ease', transform: hovered ? 'scale(1.07)' : 'scale(1)' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontFamily: 'var(--font-display, Impact)', fontSize: '2rem', color: 'var(--border-2)' }}>NF</span>
          </div>
        )}

        {/* Bottom gradient overlay */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: '55%',
          background: 'linear-gradient(to top, rgba(11,10,8,0.88) 0%, rgba(11,10,8,0.3) 60%, transparent 100%)',
          pointerEvents: 'none',
          transition: 'opacity 0.3s',
          opacity: hovered ? 1 : 0.5,
        }} />

        {/* Status badge */}
        <div style={{
          position: 'absolute', top: '6px', left: '6px',
          padding: '2px 7px',
          background: colors.bg,
          color: colors.text,
          fontFamily: 'var(--font-condensed, Arial)',
          fontSize: '0.48rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          maxWidth: 'calc(100% - 12px)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {novel.status ?? 'Novel'}
        </div>

        {/* Latest chapter badge */}
        {novel.latestChapter && (
          <div style={{
            position: 'absolute', bottom: '6px', right: '6px',
            padding: '2px 6px',
            background: 'var(--ink)',
            border: '1px solid var(--border-2)',
            fontFamily: 'var(--font-condensed, Arial)',
            fontSize: '0.48rem',
            letterSpacing: '0.08em',
            color: 'var(--muted)',
            whiteSpace: 'nowrap',
          }}>
            {novel.latestChapter}
          </div>
        )}
      </div>

      <p
        className="novel-title"
        style={{
          fontFamily: 'var(--font-condensed, Arial)',
          fontSize: '0.72rem',
          letterSpacing: '0.05em',
          color: hovered ? 'var(--paper)' : 'var(--paper-2)',
          textTransform: 'uppercase',
          lineHeight: 1.2,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          transition: 'color 0.2s',
          margin: '0 0 2px',
        }}
      >
        {novel.title}
      </p>

      {novel.genres.length > 0 && (
        <p style={{
          fontFamily: 'var(--font-body, sans-serif)',
          fontSize: '0.6rem',
          color: 'var(--muted)',
          margin: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {novel.genres[0]}
        </p>
      )}

      <style>{`a:hover .novel-title { color: var(--red) !important; }`}</style>
    </Link>
  );
}


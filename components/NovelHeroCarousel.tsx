'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { NFListNovel } from '@/lib/novelfire';

const STATUS_BADGE: Record<string, { color: string; text: string }> = {
  ongoing:   { color: 'var(--red)',  text: '#fff' },
  completed: { color: '#0a7c5c',     text: '#fff' },
  hiatus:    { color: '#b56b00',     text: '#fff' },
};

function statusBadge(status: string | null, genres: string[]) {
  const key = (status ?? '').toLowerCase();
  if (STATUS_BADGE[key]) return { ...STATUS_BADGE[key], label: (status ?? 'Novel').toUpperCase() };
  const tag = genres[0] ?? 'WEB NOVEL';
  return { color: 'var(--border-2)', text: 'var(--paper)', label: tag.toUpperCase() };
}

const INTERVAL = 5200;

export default function NovelHeroCarousel({ items }: { items: NFListNovel[] }) {
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback((idx: number) => {
    if (animating || idx === current) return;
    setAnimating(true);
    setPrev(current);
    setCurrent(idx);
    setProgress(0);
    setTimeout(() => { setPrev(null); setAnimating(false); }, 600);
  }, [animating, current]);

  const next = useCallback(() => {
    goTo((current + 1) % items.length);
  }, [current, goTo, items.length]);

  const startTimers = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    setProgress(0);
    let p = 0;
    progressRef.current = setInterval(() => {
      p += 100 / (INTERVAL / 50);
      setProgress(Math.min(p, 100));
    }, 50);
    intervalRef.current = setInterval(next, INTERVAL);
  }, [next]);

  useEffect(() => {
    startTimers();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [startTimers]);

  if (!items.length) return null;

  const item     = items[current];
  const prevItem = prev !== null ? items[prev] : null;
  const badge    = statusBadge(item.status, item.genres);

  return (
    <div
      style={{ position: 'relative', width: '100%', height: 'clamp(320px, 45vw, 540px)', overflow: 'hidden', background: 'var(--surface)' }}
      onMouseEnter={() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (progressRef.current) clearInterval(progressRef.current);
      }}
      onMouseLeave={() => startTimers()}
    >
      {/* Blurred bg — prev */}
      {prevItem?.coverUrl && (
        <div key={`bg-prev-${prev}`} style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0 }}>
          <Image src={prevItem.coverUrl} alt="" fill unoptimized sizes="100vw"
            style={{ objectFit: 'cover', filter: 'blur(4px) saturate(1.2)', transform: 'scale(1.12)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(11,10,8,0.72)' }} />
        </div>
      )}

      {/* Blurred bg — current */}
      {item.coverUrl && (
        <div key={`bg-${current}`} style={{ position: 'absolute', inset: 0, zIndex: 1, animation: 'nvBgIn 0.7s ease both' }}>
          <Image src={item.coverUrl} alt="" fill unoptimized sizes="100vw"
            style={{ objectFit: 'cover', filter: 'blur(4px) saturate(1.3)', transform: 'scale(1.12)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(11,10,8,0.70)' }} />
        </div>
      )}

      {/* Gradients */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'linear-gradient(to right, rgba(11,10,8,0.92) 0%, rgba(11,10,8,0.5) 50%, transparent 100%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'linear-gradient(to top, rgba(11,10,8,0.9) 0%, transparent 55%)', pointerEvents: 'none' }} />

      {/* Content */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 3, display: 'flex', alignItems: 'stretch', padding: '2rem clamp(1.5rem, 4vw, 3.5rem)' }}>
        {/* Info */}
        <div key={current} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: '1rem', animation: 'nvTextIn 0.55s ease both' }}>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignSelf: 'flex-start', padding: '3px 10px', marginBottom: '0.75rem', background: badge.color, fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.55rem', letterSpacing: '0.16em', color: badge.text, textTransform: 'uppercase' }}>
            {badge.label}
          </div>

          {/* Title */}
          <h2 style={{ fontFamily: 'var(--font-display, Impact)', fontSize: 'clamp(1.8rem, 4.5vw, 3.5rem)', letterSpacing: '0.02em', color: 'var(--paper)', lineHeight: 0.92, margin: '0 0 0.75rem', maxWidth: '20ch' }}>
            {item.title}
          </h2>

          {/* Meta row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {item.latestChapter && (
              <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.62rem', letterSpacing: '0.14em', color: 'var(--paper-2)', textTransform: 'uppercase' }}>
                {item.latestChapter}
              </span>
            )}
            {item.views && (
              <>
                <span style={{ color: 'var(--border-2)', fontSize: '0.5rem' }}>|</span>
                <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.62rem', letterSpacing: '0.14em', color: 'var(--muted)' }}>
                  {item.views} reads
                </span>
              </>
            )}
            {item.status && (
              <>
                <span style={{ color: 'var(--border-2)', fontSize: '0.5rem' }}>|</span>
                <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.62rem', letterSpacing: '0.14em', color: 'var(--muted)' }}>
                  {item.status}
                </span>
              </>
            )}
          </div>

          {/* Genre tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '1.5rem' }}>
            {(item.genres.length > 0 ? item.genres : ['WEB NOVEL']).slice(0, 4).map(tag => (
              <span key={tag} style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.5rem', letterSpacing: '0.12em', color: 'var(--muted)', textTransform: 'uppercase', border: '1px solid var(--border-2)', padding: '2px 8px' }}>
                {tag}
              </span>
            ))}
          </div>

          <Link
            href={`/webnovels/${item.slug}`}
            style={{ alignSelf: 'flex-start', fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.65rem', letterSpacing: '0.18em', textTransform: 'uppercase', padding: '8px 22px', background: 'var(--red)', color: 'var(--paper)', textDecoration: 'none', border: '1px solid var(--red)' }}
          >
            READ NOW
          </Link>
        </div>

        {/* Cover */}
        <div key={`cover-${current}`} style={{ flexShrink: 0, width: 'clamp(100px, 13vw, 190px)', alignSelf: 'center', marginLeft: 'auto', animation: 'nvCoverIn 0.6s ease both' }}>
          {item.coverUrl && (
            <div style={{ position: 'relative', aspectRatio: '2/3', boxShadow: '0 24px 60px rgba(0,0,0,0.7)', overflow: 'hidden' }}>
              <Image src={item.coverUrl} alt={item.title} fill unoptimized sizes="190px" style={{ objectFit: 'cover' }} priority />
            </div>
          )}
        </div>
      </div>

      {/* Dots */}
      <div style={{ position: 'absolute', bottom: '1.25rem', left: 'clamp(1.5rem, 4vw, 3.5rem)', zIndex: 4, display: 'flex', alignItems: 'center', gap: '8px' }}>
        {items.map((_, i) => (
          <button key={i} onClick={() => { goTo(i); startTimers(); }} aria-label={`Slide ${i + 1}`}
            style={{ width: i === current ? '28px' : '6px', height: '3px', background: i === current ? 'var(--red)' : 'var(--border-2)', border: 'none', padding: 0, cursor: 'pointer', transition: 'width 0.3s ease, background 0.3s ease', position: 'relative', overflow: 'hidden' }}>
            {i === current && <span style={{ position: 'absolute', inset: 0, width: `${progress}%`, background: 'var(--paper)', transition: 'width 0.05s linear' }} />}
          </button>
        ))}
      </div>

      {/* Counter */}
      <div style={{ position: 'absolute', bottom: '1.35rem', right: 'clamp(1.5rem, 4vw, 3.5rem)', zIndex: 4, fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.6rem', letterSpacing: '0.14em', color: 'var(--muted)' }}>
        {String(current + 1).padStart(2, '0')}&nbsp;/&nbsp;{String(items.length).padStart(2, '0')}
      </div>

      <style>{`
        @keyframes nvBgIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes nvTextIn  { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes nvCoverIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  );
}
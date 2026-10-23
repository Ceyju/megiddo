'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
  mangaId: string;
  chapterNumber: string | null;
  providerLabel: string;
  officialUrl: string;
  canEmbed: boolean;
  experimental?: boolean;
  prevChapterId: string | null;
  nextChapterId: string | null;
}

const controlStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: '44px',
  fontFamily: 'var(--font-condensed, Arial)',
  fontSize: '0.62rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  padding: '6px 12px',
  border: '1px solid var(--border-2)',
  color: 'var(--paper-2)',
  textDecoration: 'none',
  background: 'transparent',
};

export default function ExternalChapterReader({
  mangaId,
  chapterNumber,
  providerLabel,
  officialUrl,
  canEmbed,
  experimental = false,
  prevChapterId,
  nextChapterId,
}: Props) {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'slow'>('loading');
  const timeoutRef = useRef<number | null>(null);

  const clearLoadTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!canEmbed) return;
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      setStatus('slow');
    }, 12_000);
    return clearLoadTimeout;
  }, [attempt, canEmbed, clearLoadTimeout, officialUrl]);

  const handleLoad = useCallback(() => {
    clearLoadTimeout();
    setStatus('loaded');
  }, [clearLoadTimeout]);
  const retry = useCallback(() => {
    clearLoadTimeout();
    setStatus('loading');
    setAttempt(value => value + 1);
  }, [clearLoadTimeout]);

  const previousHref = prevChapterId ? `/manga/${mangaId}/${prevChapterId}` : null;
  const nextHref = nextChapterId ? `/manga/${mangaId}/${nextChapterId}` : null;

  return (
    <section aria-label={`${providerLabel} chapter reader`} style={{ minHeight: 'calc(100dvh - 56px)', display: 'flex', flexDirection: 'column', background: 'var(--ink)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'rgba(11,10,8,0.97)' }}>
        <Link href={`/manga/${mangaId}`} style={controlStyle}>‹ ALL CHAPTERS</Link>
        <strong style={{ fontFamily: 'var(--font-display, Impact)', fontSize: '0.9rem', letterSpacing: '0.08em', color: 'var(--paper)' }}>
          CH. {chapterNumber ?? '?'}
        </strong>
        <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.6rem', letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase' }}>
          {providerLabel}
        </span>
        {experimental && (
          <span style={{ padding: '2px 7px', border: '1px solid #FF8800', color: '#FFAA44', fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.52rem', letterSpacing: '0.1em' }}>
            EXPERIMENTAL
          </span>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginLeft: 'auto' }}>
          {previousHref ? <Link href={previousHref} style={controlStyle}>‹ PREV</Link> : <span aria-disabled="true" style={{ ...controlStyle, opacity: 0.35 }}>‹ PREV</span>}
          {nextHref ? <Link href={nextHref} style={{ ...controlStyle, background: 'var(--red)', borderColor: 'var(--red)', color: 'var(--paper)' }}>NEXT ›</Link> : <span aria-disabled="true" style={{ ...controlStyle, opacity: 0.35 }}>NEXT ›</span>}
          <a href={officialUrl} target="_blank" rel="noopener noreferrer" style={controlStyle}>OPEN OFFICIAL READER ↗</a>
        </div>
      </div>

      {canEmbed ? (
        <div style={{ position: 'relative', flex: 1, minHeight: '70dvh', background: '#050505' }}>
          {status === 'loading' && (
            <div role="status" style={{ position: 'absolute', inset: 0, zIndex: 1, display: 'grid', placeItems: 'center', color: 'var(--muted)', fontFamily: 'var(--font-condensed, Arial)', letterSpacing: '0.1em' }}>
              LOADING OFFICIAL READER…
            </div>
          )}
          {status === 'slow' && (
            <div role="alert" style={{ position: 'absolute', zIndex: 2, top: '16px', left: '50%', transform: 'translateX(-50%)', width: 'min(92%, 520px)', padding: '12px', border: '1px solid #FF8800', background: 'rgba(11,10,8,0.96)', color: 'var(--paper)', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-display, Impact)', letterSpacing: '0.06em', marginBottom: '8px' }}>Official reader is taking too long</p>
              <button type="button" onClick={retry} style={{ ...controlStyle, cursor: 'pointer', marginRight: '6px' }}>Retry reader</button>
              <a href={officialUrl} target="_blank" rel="noopener noreferrer" style={controlStyle}>Open externally ↗</a>
            </div>
          )}
          <iframe
            key={`${officialUrl}:${attempt}`}
            src={officialUrl}
            title={`${providerLabel} — Chapter ${chapterNumber ?? '?'}`}
            sandbox="allow-scripts allow-same-origin allow-forms"
            referrerPolicy="no-referrer"
            onLoad={handleLoad}
            style={{ width: '100%', height: '100%', minHeight: '70dvh', border: 0, display: 'block', background: '#050505' }}
          />
        </div>
      ) : (
        <div role="status" style={{ flex: 1, minHeight: '65dvh', display: 'grid', placeItems: 'center', padding: '2rem' }}>
          <div style={{ maxWidth: '560px', padding: '2rem', border: '1px solid var(--border-2)', background: 'var(--surface)', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-display, Impact)', fontSize: '1.35rem', letterSpacing: '0.07em', color: 'var(--paper)', marginBottom: '0.75rem' }}>
              Publisher does not allow embedding
            </p>
            <p style={{ fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.8rem', lineHeight: 1.6, color: 'var(--muted)', marginBottom: '1rem' }}>
              {providerLabel} requires this chapter to be read on its official website. The app will not copy or proxy the publisher’s pages.
            </p>
            <a href={officialUrl} target="_blank" rel="noopener noreferrer" style={{ ...controlStyle, display: 'inline-block', background: 'var(--red)', borderColor: 'var(--red)', color: 'var(--paper)' }}>
              OPEN OFFICIAL READER ↗
            </a>
          </div>
        </div>
      )}
    </section>
  );
}

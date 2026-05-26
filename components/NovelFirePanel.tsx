'use client';

import { useState, useEffect, useCallback } from 'react';
import type { NFChapterRef, NFChapterContent } from '@/lib/novelfire';

interface Props {
  initialSlug: string;
  novelTitle: string;
}

type PanelState = 'loading' | 'loaded' | 'error';

export default function NovelFirePanel({ initialSlug, novelTitle }: Props) {
  const [slug, setSlug] = useState(initialSlug);
  const [slugInput, setSlugInput] = useState(initialSlug);
  const [chapters, setChapters] = useState<NFChapterRef[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [panelState, setPanelState] = useState<PanelState>('loading');

  // Reader state
  const [chapterContent, setChapterContent] = useState<NFChapterContent | null>(null);
  const [chapterLoading, setChapterLoading] = useState(false);

  const loadChapters = useCallback(async (targetSlug: string, page = 1) => {
    setPanelState('loading');
    setChapterContent(null);
    try {
      const res = await fetch(
        `/api/novelfire?action=chapters&slug=${encodeURIComponent(targetSlug)}&page=${page}`,
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (!data.chapters?.length) throw new Error('no chapters');
      setChapters(data.chapters);
      setTotalPages(data.totalPages ?? 1);
      setCurrentPage(page);
      setSlug(targetSlug);
      setPanelState('loaded');
    } catch {
      setPanelState('error');
    }
  }, []);

  useEffect(() => {
    loadChapters(initialSlug);
  }, [initialSlug, loadChapters]);

  const openChapter = async (chSlug: string) => {
    setChapterLoading(true);
    setChapterContent(null);
    try {
      const res = await fetch(
        `/api/novelfire?action=chapter&slug=${encodeURIComponent(slug)}&chapter=${encodeURIComponent(chSlug)}`,
      );
      if (!res.ok) throw new Error();
      const data: NFChapterContent = await res.json();
      setChapterContent(data);
    } catch {
      setChapterContent(null);
    } finally {
      setChapterLoading(false);
    }
  };

  const navigateChapter = (chSlug: string | null) => {
    if (chSlug) openChapter(chSlug);
  };

  // ── Inline reader ──────────────────────────────────────────────────────────
  if (chapterContent || chapterLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '80vh' }}>
        {/* Reader header */}
        <div
          style={{
            padding: '0.6rem 1.25rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'var(--ink)',
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => { setChapterContent(null); setChapterLoading(false); }}
            style={linkBtn}
          >
            ← CHAPTERS
          </button>
          {chapterContent && (
            <span
              style={{
                fontFamily: 'var(--font-condensed, Arial)',
                fontSize: '0.65rem',
                color: 'var(--paper)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}
            >
              {chapterContent.title}
            </span>
          )}
          {chapterContent?.wordCount ? (
            <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.55rem', color: 'var(--muted)', flexShrink: 0 }}>
              {chapterContent.wordCount.toLocaleString()} words
            </span>
          ) : null}
        </div>

        {/* Spinner */}
        {chapterLoading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
            <style>{`@keyframes nfSpin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ width: '22px', height: '22px', border: '2px solid var(--border)', borderTopColor: 'var(--red)', borderRadius: '50%', animation: 'nfSpin 0.7s linear infinite' }} />
            <span style={labelStyle}>Loading chapter…</span>
          </div>
        )}

        {/* Chapter content */}
        {!chapterLoading && chapterContent && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '2rem 2.5rem 3rem', background: 'var(--ink)' }}>
            {/* Nav top */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '2rem', justifyContent: 'center' }}>
              <button
                onClick={() => navigateChapter(chapterContent.prevChapterSlug)}
                disabled={!chapterContent.prevChapterSlug}
                style={navBtn(!chapterContent.prevChapterSlug, false)}
              >
                ‹ Prev
              </button>
              <button
                onClick={() => navigateChapter(chapterContent.nextChapterSlug)}
                disabled={!chapterContent.nextChapterSlug}
                style={navBtn(!chapterContent.nextChapterSlug, true)}
              >
                Next ›
              </button>
            </div>

            {/* Chapter title */}
            <h2
              style={{
                fontFamily: 'var(--font-display, Impact)',
                fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)',
                letterSpacing: '0.02em',
                color: 'var(--paper)',
                margin: '0 0 0.25rem',
                lineHeight: 1.1,
              }}
            >
              {chapterContent.title}
            </h2>
            <p style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.58rem', letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', margin: '0 0 2rem' }}>
              [{chapterContent.wordCount.toLocaleString()} words]
            </p>

            {/* Paragraphs */}
            {chapterContent.paragraphs.map((p, i) => (
              <p
                key={i}
                style={{
                  fontFamily: '"Georgia", serif',
                  fontSize: '1rem',
                  lineHeight: 1.9,
                  color: 'var(--paper)',
                  marginBottom: '1rem',
                  maxWidth: '68ch',
                }}
              >
                {p}
              </p>
            ))}

            {/* Nav bottom */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '2.5rem', justifyContent: 'center' }}>
              <button
                onClick={() => navigateChapter(chapterContent.prevChapterSlug)}
                disabled={!chapterContent.prevChapterSlug}
                style={navBtn(!chapterContent.prevChapterSlug, false)}
              >
                ‹ Prev
              </button>
              <button
                onClick={() => navigateChapter(chapterContent.nextChapterSlug)}
                disabled={!chapterContent.nextChapterSlug}
                style={navBtn(!chapterContent.nextChapterSlug, true)}
              >
                Next ›
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Chapter list ───────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '80vh' }}>
      {/* Panel header with slug input */}
      <div
        style={{
          padding: '0.6rem 1.25rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }} />
        <span style={labelStyle}>NOVELFIRE</span>

        <form
          onSubmit={e => { e.preventDefault(); loadChapters(slugInput); }}
          style={{ display: 'flex', gap: '4px', marginLeft: 'auto', alignItems: 'center' }}
        >
          <input
            value={slugInput}
            onChange={e => setSlugInput(e.target.value)}
            placeholder="novel-slug"
            style={{
              width: '180px',
              background: 'var(--ink)',
              border: '1px solid var(--border)',
              color: 'var(--paper)',
              fontFamily: 'var(--font-condensed, Arial)',
              fontSize: '0.6rem',
              padding: '3px 8px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '3px 10px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--muted)',
              fontFamily: 'var(--font-condensed, Arial)',
              fontSize: '0.55rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Load
          </button>
        </form>
      </div>

      {/* Loading */}
      {panelState === 'loading' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
          <style>{`@keyframes nfSpin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ width: '22px', height: '22px', border: '2px solid var(--border)', borderTopColor: 'var(--red)', borderRadius: '50%', animation: 'nfSpin 0.7s linear infinite' }} />
          <span style={labelStyle}>Finding chapters…</span>
        </div>
      )}

      {/* Error */}
      {panelState === 'error' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '10px', padding: '2rem', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.8rem', color: 'var(--muted)', margin: 0 }}>
            Not found on NovelFire as{' '}
            <code style={{ fontFamily: 'monospace', color: 'var(--paper-2)', fontSize: '0.75rem' }}>{slug}</code>.
          </p>
          <p style={{ fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.72rem', color: 'var(--muted)', margin: 0 }}>
            Edit the slug above and click <strong style={{ color: 'var(--paper-2)' }}>Load</strong>.
          </p>
          <a
            href={`https://novelfire.net/search?q=${encodeURIComponent(novelTitle)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--red)', textDecoration: 'none', marginTop: '4px' }}
          >
            Search on NovelFire ↗
          </a>
        </div>
      )}

      {/* Loaded — chapter list */}
      {panelState === 'loaded' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '0.5rem 1.25rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <span style={{ ...labelStyle, color: 'var(--border-2)' }}>
              {chapters.length} chapters · page {currentPage} of {totalPages}
            </span>
          </div>

          {chapters.map(ch => (
            <button
              key={ch.slug}
              onClick={() => openChapter(ch.slug)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.65rem 1.25rem',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
                textAlign: 'left',
                gap: '8px',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.52rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                  {ch.slug.replace(/-/g, ' ').toUpperCase()}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-body, sans-serif)',
                    fontSize: '0.78rem',
                    color: 'var(--paper-2)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {ch.title}
                </span>
              </div>
              {ch.releaseDate && (
                <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.5rem', color: 'var(--border-2)', flexShrink: 0 }}>
                  {ch.releaseDate}
                </span>
              )}
            </button>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.75rem 1.25rem',
                borderTop: '1px solid var(--border)',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <button
                onClick={() => loadChapters(slug, currentPage - 1)}
                disabled={currentPage === 1}
                style={pgBtn(currentPage === 1)}
              >
                ‹
              </button>
              <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.6rem', color: 'var(--muted)', padding: '0 8px' }}>
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => loadChapters(slug, currentPage + 1)}
                disabled={currentPage === totalPages}
                style={pgBtn(currentPage === totalPages)}
              >
                ›
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Style helpers ─────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-condensed, Arial)',
  fontSize: '0.6rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
};

const linkBtn: React.CSSProperties = {
  fontFamily: 'var(--font-condensed, Arial)',
  fontSize: '0.6rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 0,
  flexShrink: 0,
};

function navBtn(disabled: boolean, accent: boolean): React.CSSProperties {
  return {
    padding: '7px 22px',
    background: accent && !disabled ? 'var(--red)' : 'transparent',
    border: `1px solid ${accent && !disabled ? 'var(--red)' : 'var(--border)'}`,
    color: disabled ? 'var(--border-2)' : accent ? '#fff' : 'var(--paper-2)',
    fontFamily: 'var(--font-condensed, Arial)',
    fontSize: '0.62rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    cursor: disabled ? 'default' : 'pointer',
  };
}

function pgBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: '3px 12px',
    background: 'transparent',
    border: `1px solid ${disabled ? 'var(--border)' : 'var(--border-2)'}`,
    color: disabled ? 'var(--border-2)' : 'var(--paper-2)',
    fontFamily: 'var(--font-condensed, Arial)',
    fontSize: '0.7rem',
    cursor: disabled ? 'default' : 'pointer',
  };
}

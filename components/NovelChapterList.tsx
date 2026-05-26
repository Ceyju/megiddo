'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import type { NFNovelInfo, NFChapter } from '@/lib/novelfire';

interface Props {
  slug: string;
  novel: NFNovelInfo;
  initialChapters: NFChapter[];
  initialTotalPages: number;
}

export default function NovelChapterList({
  slug,
  novel,
  initialChapters,
  initialTotalPages,
}: Props) {
  const [chapters, setChapters] = useState<NFChapter[]>(initialChapters);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [paging, setPaging] = useState(false);
  const [pageError, setPageError] = useState(false);

  const loadPage = useCallback(
    async (page: number) => {
      setPaging(true);
      setPageError(false);
      try {
        const res = await fetch(
          `/api/novelfire?action=chapters&slug=${encodeURIComponent(slug)}&page=${page}`,
        );
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        setChapters(data.chapters ?? []);
        setTotalPages(data.totalPages ?? totalPages);
        setCurrentPage(page);
        document.getElementById('chapter-list-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch {
        setPageError(true);
      } finally {
        setPaging(false);
      }
    },
    [slug, totalPages],
  );

  const PaginationBar = () => {
    if (totalPages <= 1) return null;

    const pages: (number | '…')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 4) pages.push('…');
      for (
        let i = Math.max(2, currentPage - 2);
        i <= Math.min(totalPages - 1, currentPage + 2);
        i++
      ) {
        pages.push(i);
      }
      if (currentPage < totalPages - 3) pages.push('…');
      pages.push(totalPages);
    }

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          padding: '1.25rem 1rem',
          borderTop: '1px solid var(--border)',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={() => loadPage(currentPage - 1)}
          disabled={currentPage === 1 || paging}
          style={paginationBtnStyle(false, currentPage === 1 || paging)}
        >
          ‹
        </button>

        {pages.map((p, i) =>
          p === '…' ? (
            <span
              key={`ell-${i}`}
              style={{ color: 'var(--muted)', fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.65rem', padding: '0 2px' }}
            >
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => p !== currentPage && loadPage(p as number)}
              disabled={paging}
              style={paginationBtnStyle(p === currentPage, paging)}
            >
              {p}
            </button>
          ),
        )}

        <button
          onClick={() => loadPage(currentPage + 1)}
          disabled={currentPage === totalPages || paging}
          style={paginationBtnStyle(false, currentPage === totalPages || paging)}
        >
          ›
        </button>
      </div>
    );
  };

  return (
    <div id="chapter-list-top">
      {/* ── Toolbar row ── */}
      <div
        style={{
          padding: '0.8rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-condensed, Arial)',
            fontSize: '0.6rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
          }}
        >
          Page {currentPage} of {totalPages} · {chapters.length} chapters shown
        </span>

        {/* Jump to chapter */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const val = (e.currentTarget.elements.namedItem('chNum') as HTMLInputElement).value;
            const num = parseInt(val);
            if (num > 0) window.location.href = `/webnovels/${slug}/chapter-${num}`;
          }}
          style={{ display: 'flex', gap: '6px', alignItems: 'center' }}
        >
          <label
            htmlFor="chNum"
            style={{
              fontFamily: 'var(--font-condensed, Arial)',
              fontSize: '1rem',
              letterSpacing: '0.1em',
              color: 'var(--muted)',
              textTransform: 'uppercase',
            }}
          >
            Jump to:
          </label>
          <input
            id="chNum"
            name="chNum"
            type="number"
            min={1}
            placeholder="Ch. #"
            style={{
              width: '100px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--paper)',
              fontFamily: 'var(--font-condensed, Arial)',
              fontSize: '0.7rem',
              padding: '4px 8px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '4px 14px',
              background: 'var(--red)',
              border: 'none',
              color: '#fff',
              fontFamily: 'var(--font-condensed, Arial)',
              fontSize: '0.6rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Go
          </button>
        </form>
      </div>

      {/* ── Chapter grid ── */}
      <div
        style={{
          position: 'relative',
          transition: 'opacity 0.2s',
          opacity: paging ? 0.4 : 1,
          pointerEvents: paging ? 'none' : 'auto',
        }}
      >
        {pageError && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)', fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.85rem' }}>
            Failed to load page.{' '}
            <button
              onClick={() => loadPage(currentPage)}
              style={{ color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: 'inherit' }}
            >
              Retry
            </button>
          </div>
        )}

        {!pageError && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              borderLeft: '1px solid var(--border)',
            }}
          >
            {chapters.map((ch) => (
              <Link
                key={ch.slug}
                href={`/webnovels/${slug}/${ch.slug}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '4px',
                  padding: '0.9rem 1.1rem',
                  background: 'transparent',
                  borderRight: '1px solid var(--border)',
                  borderBottom: '1px solid var(--border)',
                  textDecoration: 'none',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = 'var(--surface)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-condensed, Arial)',
                    fontSize: '0.55rem',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                  }}
                >
                  {ch.number > 0 ? `CHAPTER ${ch.number}` : ch.slug.replace(/-/g, ' ').toUpperCase()}
                </span>

                <span
                  style={{
                    fontFamily: 'var(--font-body, sans-serif)',
                    fontSize: '0.82rem',
                    color: 'var(--paper-2)',
                    lineHeight: 1.35,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {(() => {
                    if (ch.number <= 0) return ch.title;
                    const stripped = ch.title
                      .replace(new RegExp(`^Chapter\\s+${ch.number}\\s*[-\u2013\u2014:]?\\s*`, 'i'), '')
                      .replace(/^\d+(?:\.\d+)?\s*[-\u2013\u2014:]\s*/, '')
                      .trim();
                    return stripped.length >= 2 ? stripped : ch.title;
                  })()}
                </span>

                {ch.timeAgo && (
                  <span
                    style={{
                      fontFamily: 'var(--font-condensed, Arial)',
                      fontSize: '0.55rem',
                      letterSpacing: '0.06em',
                      color: 'var(--border-2)',
                      marginTop: '2px',
                    }}
                  >
                    {ch.timeAgo}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      <PaginationBar />
    </div>
  );
}

function paginationBtnStyle(active: boolean, disabled: boolean): React.CSSProperties {
  return {
    minWidth: '40px',
    height: '40px',
    padding: '0 8px',
    background: active ? 'var(--red)' : 'transparent',
    border: `1px solid ${active ? 'var(--red)' : 'var(--border)'}`,
    color: active ? '#fff' : disabled ? 'var(--border-2)' : 'var(--paper-2)',
    fontFamily: 'var(--font-condensed, Arial)',
    fontSize: '0.65rem',
    letterSpacing: '0.06em',
    cursor: disabled ? 'default' : 'pointer',
    transition: 'background 0.12s, border-color 0.12s',
  };
}
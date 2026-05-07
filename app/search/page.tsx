'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import AnimeCard from '@/components/AnimeCard';
import type { AniListAnime } from '@/types';

const GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy',
  'Horror', 'Mecha', 'Music', 'Mystery', 'Psychological',
  'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller',
];

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';

  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [results, setResults] = useState<AniListAnime[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  const fetchResults = useCallback(
    async (q: string, genres: string[], pg: number, append: boolean) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(pg), perPage: '24' });
        if (q.trim()) params.set('q', q.trim());
        if (genres.length) params.set('genres', genres.join(','));
        const res = await fetch('/api/search?' + params);
        const data = await res.json();
        setResults(prev => append ? [...prev, ...data.media] : data.media);
        setHasNextPage(data.pageInfo.hasNextPage);
      } catch { setResults([]); } finally { setLoading(false); }
    }, []
  );

  useEffect(() => {
    setPage(1);
    fetchResults(debouncedQuery, selectedGenres, 1, false);
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    router.replace('/search?' + params, { scroll: false });
  }, [debouncedQuery, selectedGenres, fetchResults, router]);

  function toggleGenre(g: string) {
    setSelectedGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  }

  function loadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchResults(debouncedQuery, selectedGenres, nextPage, true);
  }

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>

      {/* Page header */}
      <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
        <h1 style={{
          fontFamily: 'var(--font-display, Impact)',
          fontSize: 'clamp(2.4rem, 5vw, 4rem)',
          letterSpacing: '0.06em',
          color: 'var(--paper)',
          lineHeight: 1,
          marginBottom: '1.25rem',
        }}>
          BROWSE ANIME
        </h1>

        {/* Search input — underline style */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          borderBottom: focused ? '2px solid var(--red)' : '2px solid var(--border-2)',
          paddingBottom: '8px',
          maxWidth: '560px',
          transition: 'border-color 0.2s',
        }}>
          <span style={{ color: focused ? 'var(--red)' : 'var(--muted)', fontSize: '1rem', transition: 'color 0.2s' }}>⌕</span>
          <input
            type='text'
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder='Search by title...'
            autoFocus
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--paper)',
              fontFamily: 'var(--font-body, sans-serif)',
              fontSize: '1.1rem',
            }}
          />
          {query && (
            <button
              type='button'
              onClick={() => setQuery('')}
              style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Filter toggle */}
      <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <button
          style={{
            fontFamily: 'var(--font-condensed, Arial)',
            fontSize: '0.68rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            padding: '5px 14px',
            border: showFilters || selectedGenres.length > 0 ? '1px solid var(--red)' : '1px solid var(--border-2)',
            background: showFilters || selectedGenres.length > 0 ? 'var(--red-dim)' : 'transparent',
            color: showFilters || selectedGenres.length > 0 ? 'var(--paper)' : 'var(--muted)',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          GENRES {selectedGenres.length > 0 ? '(' + selectedGenres.length + ')' : ''}
        </button>
        {selectedGenres.map(g => (
          <span
            key={g}
            onClick={() => toggleGenre(g)}
            style={{
              fontFamily: 'var(--font-condensed, Arial)',
              fontSize: '0.63rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '3px 10px',
              border: '1px solid var(--red)',
              background: 'var(--red-dim)',
              color: 'var(--paper)',
              cursor: 'pointer',
            }}
          >
            {g} ✕
          </span>
        ))}
      </div>

      {/* Genre grid */}
      {showFilters && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          marginBottom: '1.5rem',
          padding: '1rem',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
        }}>
          {GENRES.map(g => (
            <button
              key={g}
              onClick={() => toggleGenre(g)}
              style={{
                fontFamily: 'var(--font-condensed, Arial)',
                fontSize: '0.63rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '4px 12px',
                border: selectedGenres.includes(g) ? '1px solid var(--red)' : '1px solid var(--border-2)',
                background: selectedGenres.includes(g) ? 'var(--red)' : 'transparent',
                color: selectedGenres.includes(g) ? 'var(--paper)' : 'var(--paper-2)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {loading && results.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem 0' }}>
          <div className='animate-spin' style={{
            width: '36px', height: '36px',
            border: '3px solid var(--border-2)',
            borderTopColor: 'var(--red)',
            borderRadius: '50%',
          }} />
        </div>
      ) : results.length > 0 ? (
        <>
          <div style={{
            fontFamily: 'var(--font-condensed, Arial)',
            fontSize: '0.68rem',
            letterSpacing: '0.12em',
            color: 'var(--muted)',
            textTransform: 'uppercase',
            marginBottom: '1rem',
          }}>
            {results.length} RESULTS{debouncedQuery ? ' FOR &ldquo;' + debouncedQuery + '&rdquo;' : ''}
          </div>
          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4'>
            {results.map((a, i) => <AnimeCard key={a.id} anime={a} index={i} />)}
          </div>
          {hasNextPage && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2.5rem' }}>
              <button
                onClick={loadMore}
                disabled={loading}
                style={{
                  fontFamily: 'var(--font-display, Impact)',
                  fontSize: '1rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  padding: '10px 32px',
                  border: '1px solid var(--border-2)',
                  background: 'transparent',
                  color: 'var(--paper-2)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--red)'; (e.currentTarget as HTMLElement).style.color = 'var(--paper)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-2)'; (e.currentTarget as HTMLElement).style.color = 'var(--paper-2)'; }}
              >
                {loading ? 'LOADING...' : 'LOAD MORE'}
              </button>
            </div>
          )}
        </>
      ) : (debouncedQuery || selectedGenres.length > 0) ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '5rem 0', gap: '8px' }}>
          <div style={{ fontFamily: 'var(--font-display, Impact)', fontSize: '2rem', letterSpacing: '0.06em', color: 'var(--border-2)' }}>NO RESULTS</div>
          <p style={{ fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.83rem', color: 'var(--muted)' }}>Try a different title or adjust your genre filters</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '5rem 0', gap: '8px' }}>
          <div style={{ fontFamily: 'var(--font-display, Impact)', fontSize: '3rem', letterSpacing: '0.06em', color: 'var(--border-2)', lineHeight: 1 }}>TYPE TO SEARCH</div>
          <p style={{ fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.83rem', color: 'var(--muted)' }}>or filter by genre above</p>
        </div>
      )}
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
        <div className='animate-spin' style={{ width: '36px', height: '36px', border: '3px solid var(--border-2)', borderTopColor: 'var(--red)', borderRadius: '50%' }} />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}

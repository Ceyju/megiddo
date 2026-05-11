import Link from 'next/link';
import Image from 'next/image';
import { searchManga } from '@/lib/mangadex';

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function MangaSearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';
  const merged = query.length > 1 ? await searchManga(query, 18) : [];

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 1.5rem 4rem' }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <header style={{ padding: '2.5rem 0 1.75rem', borderBottom: '1px solid var(--border)', marginBottom: '0' }}>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1.25rem' }}>
          <Link href="/manga" style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.63rem', letterSpacing: '0.14em', color: 'var(--muted)', textDecoration: 'none', textTransform: 'uppercase' }}>
            MANGA
          </Link>
          <span style={{ color: 'var(--red)', fontSize: '0.6rem' }}>›</span>
          <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.63rem', letterSpacing: '0.14em', color: 'var(--paper-2)', textTransform: 'uppercase' }}>
            SEARCH
          </span>
        </nav>

        <h1 style={{
          fontFamily: 'var(--font-display, Impact)',
          fontSize: 'clamp(3.5rem, 10vw, 7.5rem)',
          letterSpacing: '0.01em',
          color: 'var(--paper)',
          lineHeight: 0.88,
          margin: 0,
        }}>
          SEARCH
        </h1>
      </header>

      {/* ── Search Form ──────────────────────────────────────── */}
      <div style={{ padding: '1.5rem 0', borderBottom: '1px solid var(--border)', marginBottom: '2.5rem' }}>
        <form action="/manga/search" method="get" style={{ display: 'flex', gap: '0', maxWidth: '600px' }}>
          <input
            name="q"
            defaultValue={query}
            placeholder="Search manga, manhwa, manhua..."
            autoFocus
            style={{
              flex: 1,
              background: 'var(--surface)',
              border: '1px solid var(--border-2)',
              borderRight: 'none',
              color: 'var(--paper)',
              fontFamily: 'var(--font-body, sans-serif)',
              fontSize: '0.85rem',
              padding: '10px 16px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              fontFamily: 'var(--font-condensed, Arial)',
              fontSize: '0.63rem', letterSpacing: '0.14em',
              textTransform: 'uppercase',
              padding: '10px 22px',
              background: 'var(--red)',
              border: '1px solid var(--red)',
              color: 'var(--paper)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            SEARCH
          </button>
        </form>
      </div>

      {/* ── Results Header ───────────────────────────────────── */}
      {query && (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', marginBottom: '2rem' }}>
          <span
            aria-hidden
            style={{
              fontFamily: 'var(--font-display, Impact)',
              fontSize: 'clamp(4rem, 8vw, 5.5rem)',
              lineHeight: 0.8,
              color: 'var(--surface-2)',
              letterSpacing: '0.02em',
              userSelect: 'none',
              flexShrink: 0,
            }}
          >
            {merged.length}
          </span>
          <div style={{ paddingBottom: '0.5rem', flex: 1 }}>
            <div style={{ width: '100%', height: '1px', background: 'var(--red)', marginBottom: '7px' }} />
            <h2 style={{
              fontFamily: 'var(--font-condensed, Arial)',
              fontSize: '0.68rem', letterSpacing: '0.22em',
              color: 'var(--paper-2)', textTransform: 'uppercase',
              margin: 0,
            }}>
              RESULTS FOR &ldquo;{query.toUpperCase()}&rdquo;
            </h2>
          </div>
        </div>
      )}

      {/* ── Results Grid ─────────────────────────────────────── */}
      {merged.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
          {merged.map((m, i) => {
            const typeLabel = m.type === 'manhwa' ? 'MANHWA' : m.type === 'manhua' ? 'MANHUA' : 'MANGA';
            const typeColor = m.type === 'manhwa' ? 'var(--lime)' : m.type === 'manhua' ? '#FF8800' : 'var(--red)';
            return (
              <div key={m.id} className="card-reveal" style={{ animationDelay: `${0.04 + i * 0.03}s` }}>
                <Link href={`/manga/${m.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                  <div style={{ position: 'relative', aspectRatio: '2/3', overflow: 'hidden', background: 'var(--surface)', marginBottom: '0.5rem' }}>
                    {m.coverUrl ? (
                      <Image src={m.coverUrl} alt={m.title} fill sizes="160px" style={{ objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontFamily: 'var(--font-display, Impact)', fontSize: '2rem', color: 'var(--border-2)' }}>?</span>
                      </div>
                    )}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%', background: 'linear-gradient(to top, rgba(11,10,8,0.8) 0%, transparent 100%)', pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', top: '6px', left: '6px', padding: '2px 7px', background: typeColor, fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.5rem', letterSpacing: '0.12em', color: typeColor === 'var(--lime)' ? 'var(--ink)' : 'var(--paper)', textTransform: 'uppercase' }}>
                      {typeLabel}
                    </div>
                  </div>
                  <p style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.72rem', letterSpacing: '0.05em', color: 'var(--paper)', textTransform: 'uppercase', lineHeight: 1.2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {m.title}
                  </p>
                </Link>
              </div>
            );
          })}
        </div>
      ) : query ? (
        <p style={{ fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.85rem', color: 'var(--muted)' }}>No results found.</p>
      ) : null}
    </div>
  );
}


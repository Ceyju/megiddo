import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { searchManga } from '@/lib/mangadex';

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function MangaSearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';
  const results = query.length > 1 ? await searchManga(query, 24) : [];

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem 1.5rem 4rem' }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1.25rem' }}>
        <Link href="/manga" style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.68rem', letterSpacing: '0.1em', color: 'var(--muted)', textDecoration: 'none', textTransform: 'uppercase' }}>MANGA</Link>
        <span style={{ color: 'var(--red)', fontSize: '0.6rem' }}>›</span>
        <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.68rem', letterSpacing: '0.1em', color: 'var(--paper-2)', textTransform: 'uppercase' }}>SEARCH</span>
      </nav>

      <form action="/manga/search" method="get" style={{ marginBottom: '2rem', display: 'flex', gap: '8px', maxWidth: '520px' }}>
        <input
          name="q"
          defaultValue={query}
          placeholder="Search manga, manhwa, manhua..."
          autoFocus
          style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border-2)', color: 'var(--paper)', fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.85rem', padding: '8px 14px', outline: 'none' }}
        />
        <button type="submit" style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '8px 18px', background: 'var(--red)', border: '1px solid var(--red)', color: 'var(--paper)', cursor: 'pointer' }}>
          SEARCH
        </button>
      </form>

      {query && (
        <h2 style={{ fontFamily: 'var(--font-display, Impact)', fontSize: '1.2rem', letterSpacing: '0.08em', color: 'var(--paper)', marginBottom: '1.25rem' }}>
          {results.length} RESULTS FOR &ldquo;{query.toUpperCase()}&rdquo;
        </h2>
      )}

      {results.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
          {results.map(m => {
            const typeLabel = m.type === 'manhwa' ? 'MANHWA' : m.type === 'manhua' ? 'MANHUA' : 'MANGA';
            const typeColor = m.type === 'manhwa' ? 'var(--lime)' : m.type === 'manhua' ? '#FF8800' : 'var(--red)';
            return (
              <Link key={m.id} href={`/manga/${m.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                <div style={{ position: 'relative', aspectRatio: '2/3', overflow: 'hidden', background: 'var(--surface)', marginBottom: '0.5rem' }}>
                  {m.coverUrl ? (
                    <Image src={m.coverUrl} alt={m.title} fill sizes="160px" style={{ objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-display, Impact)', fontSize: '2rem', color: 'var(--border-2)' }}>?</span>
                    </div>
                  )}
                  <div style={{ position: 'absolute', top: '6px', left: '6px', padding: '2px 7px', background: typeColor, fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.5rem', letterSpacing: '0.12em', color: typeColor === 'var(--lime)' ? 'var(--ink)' : 'var(--paper)', textTransform: 'uppercase' }}>
                    {typeLabel}
                  </div>
                </div>
                <p style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.72rem', letterSpacing: '0.05em', color: 'var(--paper)', textTransform: 'uppercase', lineHeight: 1.2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {m.title}
                </p>
              </Link>
            );
          })}
        </div>
      ) : query ? (
        <p style={{ fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.85rem', color: 'var(--muted)' }}>No results found.</p>
      ) : null}
    </div>
  );
}

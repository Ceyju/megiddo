import Link from 'next/link';
import { getPopularManga, getLatestManga } from '@/lib/mangadex';
import { getMHMangaList, type MHManga } from '@/lib/mangahook';
import MangaCard from '@/components/MangaCard';

export const revalidate = 600;

function Section({ label, accent, children }: { label: string; accent?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '3rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display, Impact)', fontSize: 'clamp(1.2rem, 3vw, 1.8rem)', letterSpacing: '0.08em', color: accent ?? 'var(--paper)', lineHeight: 1 }}>
          {label}
        </h2>
      </div>
      {children}
    </section>
  );
}

function MHCard({ manga }: { manga: MHManga }) {
  return (
    <Link href={`/manga/${manga.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{ position: 'relative', aspectRatio: '2/3', overflow: 'hidden', background: 'var(--surface)', marginBottom: '0.5rem' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={manga.image}
          alt={manga.title}
          referrerPolicy="no-referrer"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', top: '6px', left: '6px', padding: '2px 7px', background: 'var(--red)', fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.5rem', letterSpacing: '0.12em', color: 'var(--paper)', textTransform: 'uppercase' }}>
          MK
        </div>
      </div>
      <p style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.72rem', letterSpacing: '0.05em', color: 'var(--paper)', textTransform: 'uppercase', lineHeight: 1.2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
        {manga.title}
      </p>
      <p style={{ fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.6rem', color: 'var(--muted)', marginTop: '2px' }}>
        {manga.chapter?.replace(/-/g, ' ')}
      </p>
    </Link>
  );
}

export default async function MangaPage() {
  const [popular, latest, mkTrending] = await Promise.all([
    getPopularManga(24),
    getLatestManga(24),
    getMHMangaList('topview'),
  ]);

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '1.5rem 1.5rem 4rem' }}>

      {/* Page header */}
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display, Impact)', fontSize: 'clamp(2rem, 5vw, 3.5rem)', letterSpacing: '0.06em', color: 'var(--paper)', lineHeight: 1 }}>
          MANGA <span style={{ color: 'var(--red)' }}>&</span> MANHWA
        </h1>
        <p style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.75rem', letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginTop: '4px' }}>
          Powered by MangaDex — Free, ad-free, community-driven
        </p>
      </div>

      {/* Search bar */}
      <form action="/manga/search" method="get" style={{ marginBottom: '2.5rem', display: 'flex', gap: '8px', maxWidth: '520px' }}>
        <input
          name="q"
          placeholder="Search manga, manhwa, manhua..."
          style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border-2)', color: 'var(--paper)', fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.85rem', padding: '8px 14px', outline: 'none' }}
        />
        <button type="submit" style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '8px 18px', background: 'var(--red)', border: '1px solid var(--red)', color: 'var(--paper)', cursor: 'pointer' }}>
          SEARCH
        </button>
      </form>

      <Section label="MOST POPULAR" accent="var(--paper)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
          {popular.map(m => <MangaCard key={m.id} manga={m} />)}
        </div>
      </Section>

      <Section label="LATEST UPDATES" accent="var(--red)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
          {latest.map(m => <MangaCard key={m.id} manga={m} />)}
        </div>
      </Section>

      {mkTrending.length > 0 && (
        <Section label="TRENDING ON MANGAKAKALOT" accent="var(--lime)">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
            {mkTrending.map(m => <MHCard key={m.id} manga={m} />)}
            </div>
        </Section>
      )}
    </div>
  );
}

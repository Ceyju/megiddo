import { Suspense } from 'react';
import { getPopularManga, getLatestManga, getTrendingManga } from '@/lib/mangadex';
import { getKitsuPopular, getKitsuLatest, getKitsuTopRated } from '@/lib/kitsu';
import { getPopularMangaAL, getLatestMangaAL, getTrendingMangaAL } from '@/lib/anilist';
import { type MDManga } from '@/lib/mangadex';
import MangaCard from '@/components/MangaCard';
import MangaSourceTabs from '@/components/MangaSourceTabs';

export const revalidate = 600;

interface Props {
  searchParams: Promise<{ source?: string }>;
}

type SourceData = {
  popular: MDManga[];
  latest: MDManga[];
  trending: MDManga[];
  trendingLabel: string;
};

async function fetchBySource(source: string): Promise<SourceData> {
  switch (source) {
    case 'kitsu': {
      const [popular, latest, trending] = await Promise.all([
        getKitsuPopular(20),
        getKitsuLatest(20),
        getKitsuTopRated(20),
      ]);
      return { popular, latest, trending, trendingLabel: 'TOP RATED' };
    }
    case 'anilist': {
      // AniList catalogue — chapters + images served via MangaDex
      const [popular, latest, trending] = await Promise.all([
        getPopularMangaAL(20),
        getLatestMangaAL(20),
        getTrendingMangaAL(20),
      ]);
      return { popular, latest, trending, trendingLabel: 'TRENDING' };
    }
    default: {
      // mangadex
      const [popular, latest, trending] = await Promise.all([
        getPopularManga(24),
        getLatestManga(24),
        getTrendingManga(24),
      ]);
      return { popular, latest, trending, trendingLabel: 'TRENDING' };
    }
  }
}

function cardHref(manga: MDManga): string {
  // comix titles redirect to search since they don't have direct detail pages
  if (manga.id.startsWith('comix:')) {
    return `/manga/search?q=${encodeURIComponent(manga.title)}`;
  }
  return `/manga/${encodeURIComponent(manga.id)}`;
}

function Section({
  label,
  accent,
  children,
}: {
  label: string;
  accent?: string;
  children: React.ReactNode;
}) {
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

function Grid({ items }: { items: MDManga[] }) {
  if (!items.length) {
    return (
      <p style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.75rem', letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', padding: '1.5rem 0' }}>
        No data available from this source
      </p>
    );
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
      {items.map((m, i) => <MangaCard key={m.id} manga={m} href={cardHref(m)} priority={i === 0} />)}
    </div>
  );
}

const SOURCE_LABELS: Record<string, string> = {
  mangadex: 'MangaDex',
  kitsu: 'GoManga',
  anilist: 'MangaDex',
};

const VALID_SOURCES = ['mangadex', 'kitsu', 'anilist'];

export default async function MangaPage({ searchParams }: Props) {
  const { source: rawSource } = await searchParams;
  const source = VALID_SOURCES.includes(rawSource ?? '')
    ? (rawSource as string)
    : 'anilist';

  const { popular, latest, trending, trendingLabel } = await fetchBySource(source);

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '1.5rem 1.5rem 4rem' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display, Impact)', fontSize: 'clamp(2rem, 5vw, 3.5rem)', letterSpacing: '0.06em', color: 'var(--paper)', lineHeight: 1 }}>
          MANGA <span style={{ color: 'var(--red)' }}>|</span> MANHUA <span style={{ color: 'var(--red)' }}>|</span> MANHWA
        </h1>
        <p style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.75rem', letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginTop: '4px' }}>
          Source: {SOURCE_LABELS[source]} — Free, ad-free, community-driven
        </p>
      </div>

      {/* Search */}
      <form action="/manga/search" method="get" style={{ marginBottom: '2rem', display: 'flex', gap: '8px', maxWidth: '520px' }}>
        <input
          name="q"
          placeholder="Search manga, manhwa, manhua..."
          style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border-2)', color: 'var(--paper)', fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.85rem', padding: '8px 14px', outline: 'none' }}
        />
        <button type="submit" style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '8px 18px', background: 'var(--red)', border: '1px solid var(--red)', color: 'var(--paper)', cursor: 'pointer' }}>
          SEARCH
        </button>
      </form>

      {/* Source tabs */}
      <Suspense fallback={<div style={{ height: '38px', marginBottom: '2rem' }} />}>
        <MangaSourceTabs />
      </Suspense>

      <Section label="MOST POPULAR" accent="var(--paper)">
        <Grid items={popular} />
      </Section>

      <Section label="LATEST UPDATES" accent="var(--red)">
        <Grid items={latest} />
      </Section>

      {trendingLabel && trending.length > 0 && (
        <Section label={trendingLabel} accent="var(--lime)">
          <Grid items={trending} />
        </Section>
      )}
    </div>
  );
}
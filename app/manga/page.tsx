import { Suspense } from 'react';
import { getPopularManga, getLatestManga, getTrendingManga } from '@/lib/mangadex';
import { getKitsuPopular, getKitsuLatest, getKitsuTopRated } from '@/lib/kitsu';
import { getPopularMangaAL, getLatestMangaAL, getTrendingMangaAL } from '@/lib/anilist';
import { type MDManga } from '@/lib/mangadex';
import MangaCard from '@/components/MangaCard';
import MangaSourceTabs from '@/components/MangaSourceTabs';
import MangaHeroCarousel from '@/components/MangaHeroCarousel';

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
      const [popular, latest, trending] = await Promise.all([
        getPopularMangaAL(20),
        getLatestMangaAL(20),
        getTrendingMangaAL(20),
      ]);
      return { popular, latest, trending, trendingLabel: 'TRENDING' };
    }
    default: {
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
  if (manga.id.startsWith('comix:')) {
    return `/manga/search?q=${encodeURIComponent(manga.title)}`;
  }
  return `/manga/${encodeURIComponent(manga.id)}`;
}

const GENRE_TAGS = [
  'ACTION', 'ROMANCE', 'ISEKAI', 'FANTASY', 'THRILLER', 'HORROR',
  'SLICE OF LIFE', 'SHOUNEN', 'SEINEN', 'PSYCHOLOGICAL', 'ADVENTURE',
  'COMEDY', 'DRAMA', 'SUPERNATURAL', 'SCI-FI', 'MYSTERY', 'SPORTS', 'MARTIAL ARTS',
  'ACTION', 'ROMANCE', 'ISEKAI', 'FANTASY', 'THRILLER', 'HORROR',
  'SLICE OF LIFE', 'SHOUNEN', 'SEINEN', 'PSYCHOLOGICAL', 'ADVENTURE',
  'COMEDY', 'DRAMA', 'SUPERNATURAL', 'SCI-FI', 'MYSTERY', 'SPORTS', 'MARTIAL ARTS',
];

function Section({
  label,
  accent,
  number,
  children,
}: {
  label: string;
  accent?: string;
  number: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: '4rem', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', marginBottom: '1.75rem' }}>
        <span
          aria-hidden
          style={{
            fontFamily: 'var(--font-display, Impact)',
            fontSize: 'clamp(4rem, 8vw, 6rem)',
            lineHeight: 0.8,
            color: 'var(--surface-2)',
            letterSpacing: '0.02em',
            userSelect: 'none',
            flexShrink: 0,
          }}
        >
          {number}
        </span>
        <div style={{ flex: 1, paddingBottom: '0.55rem' }}>
          <div style={{ width: '100%', height: '1px', background: accent ?? 'var(--border)', marginBottom: '7px' }} />
          <h2
            style={{
              fontFamily: 'var(--font-condensed, Arial)',
              fontSize: '0.72rem',
              letterSpacing: '0.22em',
              color: accent ?? 'var(--paper)',
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            {label}
          </h2>
        </div>
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
      {items.map((m, i) => (
        <div key={m.id} className="card-reveal" style={{ animationDelay: `${0.04 + i * 0.025}s` }}>
          <MangaCard manga={m} href={cardHref(m)} priority={i === 0} />
        </div>
      ))}
    </div>
  );
}

const SOURCE_LABELS: Record<string, string> = {
  mangadex: 'MangaDex',
  kitsu: 'GoManga',
  anilist: 'AniList',
};

const VALID_SOURCES = ['mangadex', 'kitsu', 'anilist'];

export default async function MangaPage({ searchParams }: Props) {
  const { source: rawSource } = await searchParams;
  const source = VALID_SOURCES.includes(rawSource ?? '')
    ? (rawSource as string)
    : 'anilist';

  const { popular, latest, trending, trendingLabel } = await fetchBySource(source);

  return (
    <div style={{ maxWidth: '2000px', margin: '0 auto', padding: '0 0 4rem' }}>

      {/* ── Hero Carousel ────────────────────────────────────── */}
      <MangaHeroCarousel items={popular.slice(0, 8)} />

      {/* ── Genre Ticker ─────────────────────────────────────── */}
      <div
        className="overflow-hidden py-3 border-y"
        style={{ borderColor: 'var(--border)', background: 'var(--ink-2)', marginBottom: '2.25rem' }}
      >
        <div className="marquee-inner">
          {GENRE_TAGS.map((g, i) => (
            <span
              key={i}
              style={{
                fontFamily: 'var(--font-condensed, Arial)',
                fontSize: '0.65rem',
                letterSpacing: '0.16em',
                color: 'var(--muted)',
                padding: '0 20px',
                whiteSpace: 'nowrap',
                textTransform: 'uppercase',
              }}
            >
              {g}
              <span style={{ color: 'var(--red)', marginLeft: '20px' }}>·</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Source Tabs ─────────────────────────────────────── */}
      <div style={{ padding: '0 1.5rem', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '3.5rem' }}>
        <Suspense fallback={<div style={{ height: '34px' }} />}>
          <MangaSourceTabs />
        </Suspense>
      </div>

      {/* ── Sections ─────────────────────────────────────────── */}
      <div style={{ padding: '0 1.5rem' }}>
      <Section label="MOST POPULAR" accent="var(--paper)" number="01">
        <Grid items={popular} />
      </Section>

      <Section label="LATEST UPDATES" accent="var(--red)" number="02">
        <Grid items={latest} />
      </Section>

      {trendingLabel && trending.length > 0 && (
        <Section label={trendingLabel} accent="var(--lime)" number="03">
          <Grid items={trending} />
        </Section>
      )}
      </div>
    </div>
  );
}
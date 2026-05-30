import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  getPopularNovels,
  getTopUpdatedNovels,
  getTopReadMonthly,
  getTopRatedNovels,
  type NFListNovel,
} from '@/lib/novelfire';
import NFNovelCard from '@/components/NovelReleaseCard';
import NFRecommendCard from '@/components/NFRecommendCard';
import NovelHeroCarousel from '@/components/NovelHeroCarousel';

export const revalidate = 1800;

const GENRE_TAGS = [
  'ISEKAI', 'FANTASY', 'LITRPG', 'PROGRESSION', 'ROMANCE', 'CULTIVATION',
  'REINCARNATION', 'SYSTEM', 'ADVENTURE', 'MAGIC', 'ACTION', 'MYSTERY',
  'SCI-FI', 'SLICE OF LIFE', 'VILLAINESS', 'DUNGEON', 'HAREM', 'PORTAL FANTASY',
  'ISEKAI', 'FANTASY', 'LITRPG', 'PROGRESSION', 'ROMANCE', 'CULTIVATION',
  'REINCARNATION', 'SYSTEM', 'ADVENTURE', 'MAGIC', 'ACTION', 'MYSTERY',
  'SCI-FI', 'SLICE OF LIFE', 'VILLAINESS', 'DUNGEON', 'HAREM', 'PORTAL FANTASY',
];

// ── Section (matches manga/anime layout) ─────────────────────────────────────
function Section({
  label,
  accent,
  number,
  seeMore,
  children,
}: {
  label: string;
  accent?: string;
  number: string;
  seeMore?: string;
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
            {seeMore && (
              <Link href={seeMore} style={{
                fontFamily: 'var(--font-condensed, Arial)',
                fontSize: '0.58rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--red)',
                textDecoration: 'none',
              }}>
                See More ›
              </Link>
            )}
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}

// ── Compact ranking list item ─────────────────────────────────────────────────
function RankingItem({ novel, rank, stat }: { novel: NFListNovel; rank: number; stat: string | null }) {
  return (
    <Link href={`/webnovels/${novel.slug}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      {/* Rank number */}
      <span style={{
        fontFamily: 'var(--font-display, Impact)',
        fontSize: '1rem',
        color: rank <= 3 ? 'var(--red)' : 'var(--border-2)',
        lineHeight: 1,
        width: '18px',
        flexShrink: 0,
        paddingTop: '2px',
        textAlign: 'right',
      }}>
        {rank}
      </span>

      {/* Cover thumbnail */}
      {novel.coverUrl && (
        <div style={{ position: 'relative', width: '36px', height: '48px', flexShrink: 0, overflow: 'hidden', background: 'var(--surface)' }}>
          <Image src={novel.coverUrl} alt={novel.title} fill unoptimized sizes="36px" style={{ objectFit: 'cover' }} />
        </div>
      )}

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: 'var(--font-body, sans-serif)',
          fontSize: '0.74rem',
          color: 'var(--paper-2)',
          margin: '0 0 4px',
          lineHeight: 1.3,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {novel.title}
        </p>
        {stat && (
          <p style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.58rem', letterSpacing: '0.06em', color: 'var(--muted)', margin: 0 }}>
            {stat}
          </p>
        )}
      </div>
    </Link>
  );
}

// ── Ranking column ────────────────────────────────────────────────────────────
function RankingColumn({
  title,
  color,
  items,
  getStat,
}: {
  title: string;
  color: string;
  items: NFListNovel[];
  getStat: (n: NFListNovel) => string | null;
}) {
  return (
    <div>
      <div style={{
        display: 'inline-block',
        padding: '5px 16px',
        background: color,
        fontFamily: 'var(--font-condensed, Arial)',
        fontSize: '0.65rem',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: '#fff',
        marginBottom: '4px',
      }}>
        {title}
      </div>
      <div>
        {items.slice(0, 8).map((novel, i) => (
          <RankingItem key={novel.slug} novel={novel} rank={i + 1} stat={getStat(novel)} />
        ))}
      </div>
    </div>
  );
}

// ── Novel grid ────────────────────────────────────────────────────────────────
function NovelGrid({ novels }: { novels: NFListNovel[] }) {
  if (!novels.length) return null;
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
      gap: '1.25rem 0.9rem',
    }}>
      {novels.map((n, i) => (
        <NFNovelCard key={n.slug} volume={n} index={i} />
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function WebNovelsPage() {
  const [popularRaw, monthly, updatedRaw, ratedRaw] = await Promise.all([
    getPopularNovels(),
    getTopReadMonthly(),
    getTopUpdatedNovels(),
    getTopRatedNovels(),
  ]);

  // Graceful fallbacks — sections never render empty when any source has data
  const anyData = monthly.length > 0 ? monthly : popularRaw;
  const popular = popularRaw.length > 0 ? popularRaw : anyData;
  const updated = updatedRaw.length > 0 ? updatedRaw : popular;
  const rated   = ratedRaw.length   > 0 ? ratedRaw   : monthly;

  return (
    <div style={{ maxWidth: '2000px', margin: '0 auto', padding: '0 0 5rem' }}>

      {/* ── Hero Carousel ──────────────────────────────────── */}
      <NovelHeroCarousel items={popular.slice(0, 6)} />

      {/* ── Genre Ticker ───────────────────────────────────── */}
      <div
        className="overflow-hidden py-3 border-y"
        style={{ borderColor: 'var(--border)', background: 'var(--ink-2)', marginBottom: '2.5rem' }}
      >
        <div className="marquee-inner">
          {GENRE_TAGS.map((g, i) => (
            <span
              key={i}
              style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.65rem', letterSpacing: '0.16em', color: 'var(--muted)', padding: '0 20px', whiteSpace: 'nowrap', textTransform: 'uppercase' }}
            >
              {g}<span style={{ color: 'var(--red)', marginLeft: '20px' }}>·</span>
            </span>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 1.5rem' }}>

        {/* ── 01 · Recommendations ─────────────────────────────── */}
        <Section label="Recommendations" accent="var(--paper)" number="01">
          <Suspense fallback={<div style={{ height: '280px' }} />}>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
              {popular.slice(0, 12).map((n, i) => (
                <NFRecommendCard key={n.slug} novel={n} rank={i + 1} />
              ))}
            </div>
          </Suspense>
        </Section>

        {/* ── 02 · Ranking ──────────────────────────────────── */}
        <Section label="Ranking" accent="var(--red)" number="02" seeMore="/webnovels">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <RankingColumn
              title="Most Read"
              color="#0077BB"
              items={monthly}
              getStat={n => n.views ? `👁 ${n.views} (Monthly)` : null}
            />
            <RankingColumn
              title="New Trend"
              color="#00999A"
              items={updated}
              getStat={n => n.latestChapter ?? null}
            />
            <RankingColumn
              title="User Rated"
              color="#CC7700"
              items={rated}
              getStat={n => n.rating ? `★ ${n.rating}` : null}
            />
          </div>
        </Section>

        {/* ── 03 · Latest Novels ────────────────────────────── */}
        <Section label="Latest Novels" accent="var(--lime)" number="03">
          <Suspense fallback={<div style={{ height: '280px' }} />}>
            <NovelGrid novels={updated} />
          </Suspense>
        </Section>

      </div>
    </div>
  );
}



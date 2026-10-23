import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  getPopularNovels,
  getTopUpdatedNovels,
  getMostReadNovels,
  getTopRatedNovels,
  searchNovels,
  type NFListNovel,
} from '@/lib/novelfire';
import NFNovelCard from '@/components/NovelReleaseCard';
import NFRecommendCard from '@/components/NFRecommendCard';
import NovelHeroCarousel from '@/components/NovelHeroCarousel';
import MediaCardGrid from '@/components/MediaCardGrid';
import ProviderUnavailable from '@/components/ProviderUnavailable';

export const revalidate = 1800;

const GENRE_TAGS = [
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
    <MediaCardGrid>
      {novels.map((n, i) => (
        <NFNovelCard key={n.slug} volume={n} index={i} />
      ))}
    </MediaCardGrid>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function WebNovelsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';
  if (query) {
    if (query.length > 100) return <ProviderUnavailable title="Search query is too long" message="Use 100 characters or fewer." backHref="/webnovels" backLabel="Browse novels" />;
    let matches;
    try { matches = await searchNovels(query); }
    catch { return <ProviderUnavailable title="Novel search temporarily unavailable" backHref="/webnovels" backLabel="Browse novels" retryHref={`/webnovels?q=${encodeURIComponent(query)}`} />; }
    const novels: NFListNovel[] = matches.map(match => ({
      slug: match.slug, title: match.title, coverUrl: match.cover, status: match.status,
      genres: [], latestChapter: null, views: null, rating: null,
    }));
    return (
      <div className="page-gutter" style={{ maxWidth: '1400px', margin: '0 auto', paddingBlock: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Search results for “{query}”</h1>
        <Link href="/webnovels">Browse all novels</Link>
        {novels.length ? <NovelGrid novels={novels} /> : <p role="status" style={{ padding: '2rem 0' }}>No novels found. Try a different title.</p>}
      </div>
    );
  }
  const sections = await Promise.allSettled([
    getPopularNovels(), getMostReadNovels(), getTopUpdatedNovels(), getTopRatedNovels(),
  ]);
  const [popular, mostRead, updated, rated] = sections.map(result => result.status === 'fulfilled' ? result.value : []);
  const hasFailure = sections.some(result => result.status === 'rejected');

  return (
    <div style={{ maxWidth: '2000px', margin: '0 auto', padding: '0 0 5rem' }}>

      {hasFailure && <p role="status" style={{ padding: '1rem 1.5rem' }}>Some novel lists are temporarily unavailable. <Link href="/webnovels">Retry lists</Link></p>}

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

      <div className="page-gutter">

        {/* ── 01 · Recommendations ─────────────────────────────── */}
        <Section label="Recommendations" accent="var(--paper)" number="01">
          <Suspense fallback={<div style={{ height: '280px' }} />}>
            <MediaCardGrid>
              {popular.slice(0, 12).map((n, i) => (
                <NFRecommendCard key={n.slug} novel={n} rank={i + 1} />
              ))}
            </MediaCardGrid>
          </Suspense>
        </Section>

        {/* ── 02 · Ranking ──────────────────────────────────── */}
        <Section label="Ranking" accent="var(--red)" number="02" seeMore="/webnovels">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <RankingColumn
              title="Most Read"
              color="#0077BB"
              items={mostRead}
              getStat={n => n.views ? `👁 ${n.views} (Most Read)` : null}
            />
            <RankingColumn
              title="Recently Updated"
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
        <Section label="Recently Updated" accent="var(--lime)" number="03">
          <Suspense fallback={<div style={{ height: '280px' }} />}>
            <NovelGrid novels={updated} />
          </Suspense>
        </Section>

      </div>
    </div>
  );
}



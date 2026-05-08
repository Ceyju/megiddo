import { notFound } from 'next/navigation';
import Link from 'next/link';
import HoverLink from '@/components/HoverLink';
import Image from 'next/image';
import { type MDManga, type MDChapter, getMangaById, getMangaChapters, findMangaByTitle } from '@/lib/mangadex';
import { getKitsuMangaById, getKitsuChapters } from '@/lib/kitsu';
import { getMangaByIdAL } from '@/lib/anilist';

export const revalidate = 3600;

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}

const CHAPTERS_PER_PAGE = 96;
const KITSU_CHAPTERS_PER_PAGE = 20;

export default async function MangaDetailPage({ params, searchParams }: Props) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);

  let manga: MDManga | null = null;
  let chapters: MDChapter[] = [];
  let total = 0;
  let sourceLabel: string;

  // ── Kitsu ─────────────────────────────────────────────────────
  if (id.startsWith('kitsu:')) {
    const kitsuId = id.slice('kitsu:'.length);
    const kitsuOffset = (page - 1) * KITSU_CHAPTERS_PER_PAGE;

    [manga, { chapters, total }] = await Promise.all([
      getKitsuMangaById(kitsuId),
      getKitsuChapters(kitsuId, kitsuOffset, KITSU_CHAPTERS_PER_PAGE),
    ]);
    sourceLabel = 'KITSU + GOMANGA';

    if (!manga) return notFound();

  // ── AniList + MangaDex ───────────────────────────────────────
  } else if (id.startsWith('anilist:')) {
    const anilistId = Number(id.slice('anilist:'.length));
    manga = await getMangaByIdAL(anilistId);
    if (!manga) return notFound();

    const mdxManga = await findMangaByTitle(manga.title, manga.altTitles);
    if (mdxManga) {
      const offset = (page - 1) * CHAPTERS_PER_PAGE;
      ({ chapters, total } = await getMangaChapters(mdxManga.id, offset, CHAPTERS_PER_PAGE));
      // Store MangaDex UUID in slug so the reader can use it for navigation
      manga = { ...manga, slug: mdxManga.id };
    }
    sourceLabel = 'ANILIST + MANGADEX';

  // ── MangaDex (direct UUID) ───────────────────────────────────
  } else {
    const offset = (page - 1) * CHAPTERS_PER_PAGE;
    [manga, { chapters, total }] = await Promise.all([
      getMangaById(id),
      getMangaChapters(id, offset, CHAPTERS_PER_PAGE),
    ]);
    sourceLabel = 'VIA MANGADEX';

    if (!manga) return notFound();
  }

  const perPage = id.startsWith('kitsu:') ? KITSU_CHAPTERS_PER_PAGE : CHAPTERS_PER_PAGE;
  const totalPages = Math.ceil(total / perPage);
  const firstChapter = chapters[0] ?? null;

  const typeLabel =
    manga.type === 'manhwa' ? 'MANHWA'
    : manga.type === 'manhua' ? 'MANHUA'
    : 'MANGA';
  const typeColor =
    manga.type === 'manhwa' ? 'var(--lime)'
    : manga.type === 'manhua' ? '#FF8800'
    : 'var(--red)';
  const typeTextColor = manga.type === 'manhwa' ? 'var(--ink)' : 'var(--paper)';
  const statusColors: Record<string, string> = {
    ongoing: 'var(--lime)',
    completed: 'var(--paper-2)',
    hiatus: '#FF8800',
    cancelled: 'var(--red)',
  };

  const updatedAtLabel = manga.updatedAt
    ? new Date(manga.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : null;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem 1.5rem 4rem' }}>

      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1.25rem' }}>
        <Link
          href={id.startsWith('anilist:') ? '/manga?source=anilist' : '/manga?source=kitsu'}
          style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.68rem', letterSpacing: '0.1em', color: 'var(--muted)', textDecoration: 'none', textTransform: 'uppercase' }}
        >
          MANGA
        </Link>
        <span style={{ color: 'var(--red)', fontSize: '0.6rem' }}>›</span>
        <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.68rem', letterSpacing: '0.1em', color: 'var(--paper-2)', textTransform: 'uppercase', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {manga.title}
        </span>
      </nav>

      {/* Detail */}
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '3rem' }}>

        {/* Cover */}
        <div style={{ flexShrink: 0, width: '200px' }}>
          <div style={{ position: 'relative', aspectRatio: '2/3', overflow: 'hidden', background: 'var(--surface)' }}>
            {manga.coverUrl ? (
              <Image
                src={manga.coverUrl}
                alt={manga.title}
                fill
                sizes="200px"
                style={{ objectFit: 'cover' }}
                priority
              />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'var(--font-display, Impact)', fontSize: '3rem', color: 'var(--border-2)' }}>?</span>
              </div>
            )}
          </div>
          {firstChapter && (
            <Link
              href={`/manga/${id}/${firstChapter.id}`}
              style={{ display: 'block', marginTop: '0.75rem', textAlign: 'center', fontFamily: 'var(--font-display, Impact)', fontSize: '1rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px', background: 'var(--red)', border: '1px solid var(--red)', color: 'var(--paper)', textDecoration: 'none' }}
            >
              READ CH.1 ›
            </Link>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ padding: '3px 10px', background: typeColor, fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.6rem', letterSpacing: '0.12em', color: typeTextColor, textTransform: 'uppercase' }}>
              {typeLabel}
            </span>
            <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.6rem', letterSpacing: '0.12em', color: statusColors[manga.status] ?? 'var(--muted)', textTransform: 'uppercase' }}>
              ● {manga.status.toUpperCase()}
            </span>
            {manga.year && (
              <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.6rem', letterSpacing: '0.08em', color: 'var(--muted)' }}>
                {manga.year}
              </span>
            )}
          </div>

          <h1 style={{ fontFamily: 'var(--font-display, Impact)', fontSize: 'clamp(1.4rem, 4vw, 2.5rem)', letterSpacing: '0.06em', color: 'var(--paper)', lineHeight: 1.05, marginBottom: '0.75rem' }}>
            {manga.title.toUpperCase()}
          </h1>

          {manga.altTitles.length > 0 && (
            <p style={{ fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '0.75rem', lineHeight: 1.4 }}>
              {manga.altTitles.join(' · ')}
            </p>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '1rem' }}>
            {manga.tags.slice(0, 10).map(tag => (
              <span key={tag} style={{ padding: '2px 8px', border: '1px solid var(--border-2)', fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.55rem', letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase' }}>
                {tag}
              </span>
            ))}
          </div>

          {manga.description && (
            <div>
              <p style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.62rem', letterSpacing: '0.1em', color: 'var(--red)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                SYNOPSIS
              </p>
              <p style={{ fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.83rem', color: 'var(--paper-2)', lineHeight: 1.65, maxWidth: '680px' }}>
                {manga.description.slice(0, 600)}{manga.description.length > 600 ? '\u2026' : ''}
              </p>
            </div>
          )}

          <p style={{ marginTop: '1rem', fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.6rem', letterSpacing: '0.08em', color: 'var(--muted)', textTransform: 'uppercase' }}>
            {total} CHAPTERS · {sourceLabel}
            {updatedAtLabel && ` · UPDATED ${updatedAtLabel}`}
          </p>
        </div>
      </div>

      {/* Chapter list */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display, Impact)', fontSize: '1.4rem', letterSpacing: '0.08em', color: 'var(--paper)' }}>
            CHAPTERS
          </h2>
          <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.65rem', letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase' }}>
            {total} TOTAL
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '1.5rem' }}>
          {chapters.map(ch => (
            <HoverLink
              key={ch.id}
              href={`/manga/${id}/${ch.id}`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface)', textDecoration: 'none', borderLeft: '2px solid transparent', transition: 'all 0.12s' }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.78rem', letterSpacing: '0.08em', color: 'var(--paper)', textTransform: 'uppercase', minWidth: '70px' }}>
                  CH. {ch.chapter ?? '?'}
                </span>
                {ch.title && (
                  <span style={{ fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.75rem', color: 'var(--paper-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '360px' }}>
                    {ch.title}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
                <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.55rem', color: 'var(--muted)', letterSpacing: '0.06em' }}>
                  {ch.scanlationGroup}
                </span>
                <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.55rem', color: 'var(--muted)', letterSpacing: '0.06em' }}>
                  {ch.pages > 0 ? `${ch.pages}P` : ''}
                </span>
                <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.55rem', color: 'var(--red)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  READ ›
                </span>
              </div>
            </HoverLink>
          ))}
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <Link
                key={p}
                href={`/manga/${id}?page=${p}`}
                style={{ padding: '5px 11px', fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.65rem', letterSpacing: '0.08em', textDecoration: 'none', border: p === page ? '1px solid var(--red)' : '1px solid var(--border-2)', color: p === page ? 'var(--paper)' : 'var(--paper-2)', background: p === page ? 'var(--red)' : 'transparent' }}
              >
                {p}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
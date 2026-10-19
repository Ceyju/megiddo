import { notFound } from 'next/navigation';
import Link from 'next/link';
import HoverLink from '@/components/HoverLink';
import Image from 'next/image';
import { type MDManga, type MDChapter, getMangaById, getMangaChapters, findMangaForCatalogEntry } from '@/lib/mangadex';
import { getKitsuMangaById } from '@/lib/kitsu';
import { getMangaByIdAL } from '@/lib/anilist';
import {
  getMangaUpdatesPublication,
  type MangaUpdatesPublication,
} from '@/lib/mangaupdates';

export const revalidate = 3600;

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}

const CHAPTERS_PER_PAGE = 96;

function mergeOfficialLinks(...linkGroups: Array<MDManga['officialLinks']>) {
  const links = linkGroups.flatMap(group => group ?? []);
  return links.filter((link, index) => links.findIndex(candidate => candidate.url === link.url) === index);
}

function PublicationSummaryRail({ publication }: { publication: MangaUpdatesPublication }) {
  const updatedLabel = publication.lastUpdated
    ? new Date(publication.lastUpdated).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    : null;
  const publicationStatus = publication.status
    ?? (publication.completed === true ? 'Complete' : publication.completed === false ? 'Ongoing' : 'TBA');

  return (
    <aside
      aria-label="MangaUpdates publication metadata"
      className="w-full md:col-span-2 xl:col-span-1 xl:w-[300px]"
      style={{ alignSelf: 'flex-start', border: '1px solid var(--border-2)', background: 'var(--surface)', padding: '0.9rem 1rem' }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '0.7rem' }}>
        <p style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.85rem', letterSpacing: '0.12em', color: 'var(--red)', textTransform: 'uppercase' }}>
          PUBLICATION DATA
        </p>
        <a
          href={publication.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '1rem', letterSpacing: '0.1em', color: 'var(--paper-2)', textDecoration: 'none', textTransform: 'uppercase' }}
        >
          ↗
        </a>
      </div>

      <dl style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', margin: 0 }}>
        <div style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
          <dt style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.52rem', letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase' }}>Latest reported chapter</dt>
          <dd style={{ margin: '3px 0 0', fontFamily: 'var(--font-display, Impact)', fontSize: '1rem', letterSpacing: '0.05em', color: 'var(--paper)' }}>
            {publication.latestChapter ? `CH. ${publication.latestChapter}` : 'TBA'}
          </dd>
        </div>
        <div style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
          <dt style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.52rem', letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase' }}>Publication status</dt>
          <dd style={{ margin: '3px 0 0', fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.72rem', color: 'var(--paper-2)' }}>
            {publicationStatus}
          </dd>
        </div>
        <div>
          <dt style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.52rem', letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase' }}>Publishers</dt>
          <dd style={{ margin: '3px 0 0', fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.72rem', color: 'var(--paper-2)' }}>
            {publication.publishers.join(' · ') || 'TBA'}
          </dd>
        </div>
      </dl>

      <p style={{ marginTop: '0.75rem', fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.62rem', lineHeight: 1.45, color: 'var(--muted)' }}>
        Publication metadata does not indicate that a chapter is readable in this app.
        {updatedLabel && ` Last verified ${updatedLabel}.`}
      </p>
    </aside>
  );
}

function PublicationContributors({ publication }: { publication: MangaUpdatesPublication }) {
  const contributorNames = Array.from(new Set(publication.authors.map(author => author.name))).slice(0, 4);
  const relatedSeries = publication.relatedSeries.slice(0, 6);

  if (contributorNames.length === 0 && relatedSeries.length === 0) return null;

  return (
    <section
      aria-label="MangaUpdates contributors and related titles"
      style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem 1.5rem', marginTop: '1rem', padding: '0.8rem 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
    >
      {contributorNames.length > 0 && (
        <div style={{ flex: '1 1 200px' }}>
          <p style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.85rem', letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            Authors / artists
          </p>
          <p style={{ fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.72rem', lineHeight: 1.5, color: 'var(--paper-2)' }}>
            {contributorNames.join(' · ')}
          </p>
        </div>
      )}

      {relatedSeries.length > 0 && (
        <div style={{ flex: '2 1 320px' }}>
          <p style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.85rem', letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            Related titles
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {relatedSeries.map(related => related.url ? (
              <a
                key={`${related.relation}:${related.title}`}
                href={related.url}
                target="_blank"
                rel="noopener noreferrer"
                title={related.relation ?? undefined}
                style={{ display: 'block', padding: '4px 7px', border: '1px solid var(--border-2)', fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.56rem', letterSpacing: '0.05em', color: 'var(--paper-2)', textDecoration: 'none' }}
              >
                {related.title} ↗
              </a>
            ) : (
              <span key={`${related.relation}:${related.title}`} style={{ padding: '4px 7px', border: '1px solid var(--border-2)', fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.56rem', color: 'var(--muted)' }}>
                {related.title}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default async function MangaDetailPage({ params, searchParams }: Props) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);

  let manga: MDManga | null = null;
  let chapters: MDChapter[] = [];
  let total = 0;
  let readableTotal = 0;
  let complete = true;
  let mangaDexMatch: MDManga | null = null;
  let sourceLabel: string;

  // ── Kitsu ─────────────────────────────────────────────────────
  if (id.startsWith('kitsu:')) {
    const kitsuId = id.slice('kitsu:'.length);
    manga = await getKitsuMangaById(kitsuId);
    if (!manga) return notFound();

    mangaDexMatch = await findMangaForCatalogEntry(manga);
    if (mangaDexMatch) {
      const inventory = await getMangaChapters(mangaDexMatch.id, (page - 1) * CHAPTERS_PER_PAGE, CHAPTERS_PER_PAGE);
      ({ chapters, total, readableTotal, complete } = inventory);
      manga = {
        ...manga,
        slug: mangaDexMatch.id,
        externalIds: { ...mangaDexMatch.externalIds, ...manga.externalIds },
        officialLinks: mergeOfficialLinks(manga.officialLinks, mangaDexMatch.officialLinks),
      };
    }
    sourceLabel = 'KITSU METADATA + MANGADEX';

  // ── AniList + MangaDex ───────────────────────────────────────
  } else if (id.startsWith('anilist:')) {
    const anilistId = Number(id.slice('anilist:'.length));
    manga = await getMangaByIdAL(anilistId);
    if (!manga) return notFound();

    mangaDexMatch = await findMangaForCatalogEntry(manga);
    if (mangaDexMatch) {
      const offset = (page - 1) * CHAPTERS_PER_PAGE;
      ({ chapters, total, readableTotal, complete } = await getMangaChapters(mangaDexMatch.id, offset, CHAPTERS_PER_PAGE));
      manga = {
        ...manga,
        slug: mangaDexMatch.id,
        externalIds: { ...mangaDexMatch.externalIds, ...manga.externalIds },
        officialLinks: mergeOfficialLinks(manga.officialLinks, mangaDexMatch.officialLinks),
      };
    }
    sourceLabel = 'ANILIST + MANGADEX';

  // ── MangaDex (direct UUID) ───────────────────────────────────
  } else {
    const offset = (page - 1) * CHAPTERS_PER_PAGE;
    [manga, { chapters, total, readableTotal, complete }] = await Promise.all([
      getMangaById(id),
      getMangaChapters(id, offset, CHAPTERS_PER_PAGE),
    ]);
    sourceLabel = 'VIA MANGADEX';

    if (!manga) return notFound();
    mangaDexMatch = manga;
  }

  const publication = await getMangaUpdatesPublication(manga, mangaDexMatch);
  if (publication) sourceLabel += ' + MANGAUPDATES';

  const totalPages = Math.ceil(total / CHAPTERS_PER_PAGE);
  const chapterOne = page === 1
    ? chapters.find(chapter => chapter.availability === 'hosted' && Number(chapter.chapter) === 1)
    : null;
  const displayAltTitles = [manga.titleRomaji, manga.titleNative]
    .filter((title): title is string => Boolean(title && title !== manga.title))
    .filter((title, index, titles) => titles.indexOf(title) === index);
  const publishedTotal = manga.publishedChapterCount;

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
          href={id.startsWith('anilist:') ? '/manga?source=anilist' : id.startsWith('kitsu:') ? '/manga?source=kitsu' : '/manga?source=mangadex'}
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
      <div
        className="grid gap-8 md:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[200px_minmax(0,1fr)_300px]"
        style={{ alignItems: 'flex-start', marginBottom: '3rem' }}
      >

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
          {chapterOne && (
            <Link
              href={`/manga/${id}/${chapterOne.id}`}
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

          {displayAltTitles.length > 0 && (
            <p style={{ fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '0.75rem', lineHeight: 1.4 }}>
              {displayAltTitles.join(' · ')}
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
              <p style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '1.10rem', letterSpacing: '0.1em', color: 'var(--red)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                SYNOPSIS
              </p>
              <p style={{ fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.83rem', color: 'var(--paper-2)', lineHeight: 1.65, maxWidth: '680px' }}>
                {manga.description.slice(0, 600)}{manga.description.length > 600 ? '\u2026' : ''}
              </p>
            </div>
          )}

          {publication && <PublicationContributors publication={publication} />}

          <p style={{ marginTop: '1rem', fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.6rem', letterSpacing: '0.08em', color: 'var(--muted)', textTransform: 'uppercase' }}>
            {readableTotal} READABLE CHAPTERS
            {publishedTotal != null && ` · ${publishedTotal} PUBLISHED`}
            {` · ${sourceLabel}`}
            {updatedAtLabel && ` · UPDATED ${updatedAtLabel}`}
          </p>
        </div>

        {publication && <PublicationSummaryRail publication={publication} />}
      </div>

      {/* Chapter list */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display, Impact)', fontSize: '1.4rem', letterSpacing: '0.08em', color: 'var(--paper)' }}>
            CHAPTERS
          </h2>
          <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.65rem', letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase' }}>
            {readableTotal} READABLE
          </span>
        </div>

        {!complete && <p role="status" style={{ padding: '1rem', color: 'var(--muted)' }}>Chapter inventory is incomplete. Counts reflect only the entries returned; retry this page for the full list.</p>}

        {readableTotal === 0 && complete && (
          <div role="status" style={{ padding: '1rem', marginBottom: '1rem', border: '1px solid var(--border-2)', background: 'var(--surface)' }}>
            <p style={{ fontFamily: 'var(--font-display, Impact)', letterSpacing: '0.06em', color: 'var(--paper)', marginBottom: '0.35rem' }}>
              No chapters available in the reader
            </p>
            <p style={{ fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.5 }}>
              Published chapter totals are catalog metadata and do not guarantee readable pages.
            </p>
            {(manga.officialLinks?.length ?? 0) > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                {manga.officialLinks?.map(link => (
                  <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" style={{ padding: '7px 10px', border: '1px solid var(--red)', color: 'var(--paper)', textDecoration: 'none', fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {link.label} ↗
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '1.5rem' }}>
          {chapters.map(ch => {
            const content = (
              <>
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
                  {ch.pageCount > 0 ? `${ch.pageCount}P` : ''}
                </span>
                <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.55rem', color: 'var(--red)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {ch.availability === 'hosted' ? 'READ ›' : ch.availability === 'external' ? 'OFFICIAL ↗' : 'UNAVAILABLE'}
                </span>
              </div>
              </>
            );
            const rowStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface)', textDecoration: 'none', borderLeft: '2px solid transparent', transition: 'all 0.12s' } as const;

            if (ch.availability === 'hosted') {
              return <HoverLink key={ch.id} href={`/manga/${id}/${ch.id}`} style={rowStyle}>{content}</HoverLink>;
            }
            if (ch.availability === 'external' && ch.externalUrl) {
              return <HoverLink key={ch.id} href={`/manga/${id}/${ch.id}`} style={rowStyle}>{content}</HoverLink>;
            }
            return <div key={ch.id} aria-disabled="true" style={{ ...rowStyle, opacity: 0.62 }}>{content}</div>;
          })}
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

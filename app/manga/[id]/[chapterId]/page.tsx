import { notFound } from 'next/navigation';
import { getChapterPages, getAllMangaChapters, getChapterInfo } from '@/lib/mangadex';
import { getKitsuChapters, getKitsuMangaById } from '@/lib/kitsu';
import { getMangaByIdAL } from '@/lib/anilist';
import { getMangaFirePagesWithFallback } from '@/lib/mangafire';
import { getGoMangaPagesWithFallback } from '@/lib/gomanga';
import MangaReader from '@/components/MangaReader';
import type { MDChapter } from '@/lib/mangadex';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string; chapterId: string }>;
}

function ProviderBadge({ provider, source }: { provider: string; source: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 2px', gap: '6px' }}>
      <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '3px 10px', border: '1px solid var(--border-2)', color: 'var(--muted)' }}>
        {source}
      </span>
      <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '3px 10px', background: 'var(--surface)', border: '1px solid var(--border-2)', color: 'var(--paper-2)' }}>
        IMAGES · {provider}
      </span>
    </div>
  );
}

function KitsuReaderFallback({
  mangaId,
  chapterNumber,
  prevChapterId,
  nextChapterId,
}: {
  mangaId: string;
  chapterNumber: string | null;
  prevChapterId: string | null;
  nextChapterId: string | null;
}) {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', padding: '2rem', background: 'var(--bg)' }}>
      <p style={{ fontFamily: 'var(--font-display, Impact)', fontSize: '1.1rem', letterSpacing: '0.1em', color: 'var(--paper)', textTransform: 'uppercase' }}>
        {chapterNumber ? `CH. ${chapterNumber} — ` : ''}GOMANGA DOES NOT HAVE THIS CHAPTER
      </p>
      <p style={{ fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.82rem', color: 'var(--muted)', maxWidth: '400px', textAlign: 'center', lineHeight: 1.6 }}>
        Kitsu is a metadata source and does not host chapter images. GoManga may not have every chapter that Kitsu lists.
      </p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {prevChapterId && (
          <a href={`/manga/${mangaId}/${prevChapterId}`}
            style={{ padding: '8px 18px', fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', border: '1px solid var(--border-2)', color: 'var(--paper-2)', textDecoration: 'none' }}>
            ‹ PREV
          </a>
        )}
        <a href={`/manga/${mangaId}`}
          style={{ padding: '8px 18px', fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'var(--red)', border: '1px solid var(--red)', color: 'var(--paper)', textDecoration: 'none' }}>
          BACK TO MANGA
        </a>
        {nextChapterId && (
          <a href={`/manga/${mangaId}/${nextChapterId}`}
            style={{ padding: '8px 18px', fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', border: '1px solid var(--border-2)', color: 'var(--paper-2)', textDecoration: 'none' }}>
            NEXT ›
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * Finds a chapter by ID across paginated Kitsu chapter pages.
 *
 * Kitsu chapters are paginated at 20/page. The target chapter may not be
 * in the first page — this fetches additional pages until found or exhausted.
 * Returns the chapter and its neighbours for prev/next navigation.
 */
async function findKitsuChapter(
  kitsuMangaId: string,
  targetChapterId: string,
): Promise<{
  current: MDChapter | null;
  prev: string | null;
  next: string | null;
  allChapters: MDChapter[];
}> {
  const PAGE_SIZE = 20;
  let offset = 0;
  let fetched: MDChapter[] = [];
  let total = Infinity;

  // Fetch pages until we find the target chapter or exhaust all pages
  while (offset <= total) {
    const { chapters, total: t } = await getKitsuChapters(kitsuMangaId, offset, PAGE_SIZE);
    total = t;
    fetched = [...fetched, ...chapters];

    const idx = fetched.findIndex(c => c.id === targetChapterId);
    if (idx !== -1) {
      // Found — but we need the next chapter too, which may be on the next page
      if (idx === fetched.length - 1 && fetched.length < total) {
        // Target is the last fetched item — fetch one more page to get "next"
        const { chapters: nextPage } = await getKitsuChapters(kitsuMangaId, offset + PAGE_SIZE, PAGE_SIZE);
        fetched = [...fetched, ...nextPage];
      }
      const finalIdx = fetched.findIndex(c => c.id === targetChapterId);
      return {
        current: fetched[finalIdx],
        prev: finalIdx > 0 ? fetched[finalIdx - 1].id : null,
        next: finalIdx < fetched.length - 1 ? fetched[finalIdx + 1].id : null,
        allChapters: fetched,
      };
    }

    if (chapters.length === 0 || fetched.length >= total) break;
    offset += PAGE_SIZE;
  }

  // Not found — return nulls with whatever we fetched
  return { current: null, prev: null, next: null, allChapters: fetched };
}

export default async function MangaReaderPage({ params }: Props) {
  const { id: rawMangaId, chapterId: rawChapterId } = await params;
  const mangaId = decodeURIComponent(rawMangaId);
  const chapterId = decodeURIComponent(rawChapterId);

  // ── Kitsu + GoManga ───────────────────────────────────────────────────────
  if (mangaId.startsWith('kitsu:') || chapterId.startsWith('kitsu-ch:')) {
    const kitsuMangaId = mangaId.startsWith('kitsu:')
      ? mangaId.slice('kitsu:'.length)
      : mangaId;

    // Fetch manga metadata and search for chapter in parallel.
    // findKitsuChapter paginates through Kitsu's chapter list until it finds
    // the target — needed because chapters may be beyond page 1.
    const [kitsuManga, { current: currentChapter, prev: prevChapterId, next: nextChapterId }] =
      await Promise.all([
        getKitsuMangaById(kitsuMangaId),
        findKitsuChapter(kitsuMangaId, chapterId),
      ]);

    const chapterNumber = currentChapter?.chapter ?? null;

    // Attempt to serve pages via GoManga using Kitsu metadata.
    // kitsuManga.slug is the Kitsu slug (e.g. "haikyuu") — now mapped from
    // the Kitsu API response. GoManga resolution uses search-first strategy.
    if (kitsuManga && chapterNumber) {
      const result = await getGoMangaPagesWithFallback(
        kitsuManga.slug ?? undefined,
        kitsuManga.title,
        kitsuManga.altTitles,
        chapterNumber,
      );

      if (result.found) {
        return (
          <>
            <ProviderBadge provider={result.provider} source="KITSU + GOMANGA" />
            <MangaReader
              pages={result.pages}
              chapterId={chapterId}
              mangaId={mangaId}
              chapterNumber={chapterNumber}
              prevChapterId={prevChapterId}
              nextChapterId={nextChapterId}
            />
          </>
        );
      }
    }

    // GoManga had no match — show fallback screen with navigation
    return (
      <KitsuReaderFallback
        mangaId={mangaId}
        chapterNumber={chapterNumber}
        prevChapterId={prevChapterId}
        nextChapterId={nextChapterId}
      />
    );
  }

  // ── AniList + MangaDex ────────────────────────────────────────────────────
  if (mangaId.startsWith('anilist:')) {
    const anilistId = Number(mangaId.slice('anilist:'.length));

    // Fetch chapter info + pages in parallel. Chapter info tells us:
    //  - which MangaDex manga UUID this chapter belongs to (for nav)
    //  - the chapter number (for fallback label + MangaFire)
    const [alManga, chapterInfo, pages] = await Promise.all([
      getMangaByIdAL(anilistId),
      getChapterInfo(chapterId),
      getChapterPages(chapterId),
    ]);
    if (!alManga) return notFound();

    // Use the manga UUID from the chapter itself — guaranteed consistent
    const mdxMangaId = chapterInfo?.mangaId ?? null;
    const allChapters = mdxMangaId ? await getAllMangaChapters(mdxMangaId) : [];

    const idx = allChapters.findIndex(c => c.id === chapterId);
    const currentChapter = allChapters[idx] ?? chapterInfo?.asChapter ?? null;
    const prevChapterId = idx > 0 ? allChapters[idx - 1].id : null;
    const nextChapterId = idx !== -1 && idx < allChapters.length - 1 ? allChapters[idx + 1].id : null;

    // Try MangaFire scraper if MangaDex at-home returned nothing
    let finalPages = pages;
    let provider = 'MangaDex';
    if (!finalPages.length && currentChapter?.chapter) {
      finalPages = await getMangaFirePagesWithFallback(alManga.title, currentChapter.chapter, alManga.altTitles);
      if (finalPages.length) provider = 'MangaFire';
    }

    if (!finalPages.length) return notFound();

    return (
      <>
        <ProviderBadge provider={provider} source="ANILIST + MANGADEX" />
        <MangaReader
          pages={finalPages}
          chapterId={chapterId}
          mangaId={mangaId}
          chapterNumber={currentChapter?.chapter ?? null}
          prevChapterId={prevChapterId}
          nextChapterId={nextChapterId}
        />
      </>
    );
  }

  // ── MangaDex (direct UUID) ────────────────────────────────────────────────
  const [pages, allChapters] = await Promise.all([
    getChapterPages(chapterId),
    getAllMangaChapters(mangaId),
  ]);

  if (!pages.length) return notFound();

  const idx = allChapters.findIndex(c => c.id === chapterId);
  const currentChapter = allChapters[idx] ?? null;
  const prevChapterId = idx > 0 ? allChapters[idx - 1].id : null;
  const nextChapterId = idx !== -1 && idx < allChapters.length - 1 ? allChapters[idx + 1].id : null;

  return (
    <MangaReader
      pages={pages}
      chapterId={chapterId}
      mangaId={mangaId}
      chapterNumber={currentChapter?.chapter ?? null}
      prevChapterId={prevChapterId}
      nextChapterId={nextChapterId}
    />
  );
}
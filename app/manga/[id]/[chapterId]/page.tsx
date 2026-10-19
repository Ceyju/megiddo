import { notFound, redirect } from 'next/navigation';
import {
  findMangaForCatalogEntry,
  getMangaChapterInventory,
  getMangaById,
  getChapterInfo,
} from '@/lib/mangadex';
import {
  getReadableChapterNavigation,
  mangaDexPageProvider,
  resolveExternalReaderPolicy,
} from '@/lib/manga-reader-providers';
import { getMangaByIdAL } from '@/lib/anilist';
import { getKitsuMangaById } from '@/lib/kitsu';
import ExternalChapterReader from '@/components/ExternalChapterReader';
import MangaReader from '@/components/MangaReader';
import ProviderUnavailable from '@/components/ProviderUnavailable';
import { ProviderNotFoundError } from '@/lib/server/provider-errors';
import { uuid, providerId } from '@/lib/server/validation';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string; chapterId: string }>;
}

function ProviderBadge({ source }: { source: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 2px', gap: '6px' }}>
      <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '3px 10px', border: '1px solid var(--border-2)', color: 'var(--muted)' }}>
        {source}
      </span>
      <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '3px 10px', background: 'var(--surface)', border: '1px solid var(--border-2)', color: 'var(--paper-2)' }}>
        IMAGES · MANGADEX
      </span>
    </div>
  );
}

async function verifyMangaIdentity(mangaId: string, mangaDexId: string): Promise<string | null> {
  if (mangaId.startsWith('anilist:')) {
    const anilistId = Number(mangaId.slice('anilist:'.length));
    if (!Number.isInteger(anilistId)) return null;
    const catalogManga = await getMangaByIdAL(anilistId);
    if (!catalogManga) return null;
    const mappedManga = await findMangaForCatalogEntry(catalogManga);
    return mappedManga?.id === mangaDexId ? 'ANILIST + MANGADEX' : null;
  }

  if (mangaId.startsWith('kitsu:')) {
    const kitsuId = mangaId.slice('kitsu:'.length);
    const catalogManga = await getKitsuMangaById(kitsuId);
    if (!catalogManga) return null;
    const mappedManga = await findMangaForCatalogEntry(catalogManga);
    return mappedManga?.id === mangaDexId ? 'KITSU + MANGADEX' : null;
  }

  return mangaId === mangaDexId ? 'MANGADEX' : null;
}

export default async function MangaReaderPage({ params }: Props) {
  const { id: rawMangaId, chapterId: rawChapterId } = await params;
  const mangaId = decodeURIComponent(rawMangaId);
  const chapterId = decodeURIComponent(rawChapterId);

  // Kitsu's old chapter IDs were publication metadata, not verified inventory.
  if (chapterId.startsWith('kitsu-ch:')) {
    redirect(`/manga/${encodeURIComponent(mangaId)}`);
  }
  try { uuid(chapterId); providerId(mangaId); } catch { return notFound(); }
  const backHref = `/manga/${encodeURIComponent(mangaId)}`;
  const unavailable = async (missing: boolean, knownMangaId?: string) => {
    const metadata = await (mangaId.startsWith('anilist:')
      ? getMangaByIdAL(Number(mangaId.slice(8)))
      : mangaId.startsWith('kitsu:')
        ? getKitsuMangaById(mangaId.slice(6))
        : getMangaById(knownMangaId ?? mangaId)).catch(() => null);
    return <ProviderUnavailable title={missing ? 'Chapter unavailable' : 'Manga source temporarily unavailable'} message={missing ? 'This chapter listing no longer resolves to readable pages. Choose another chapter or an official release.' : 'The chapter source could not be reached. Please retry shortly.'} backHref={backHref} backLabel="All chapters" retryHref={`${backHref}/${encodeURIComponent(chapterId)}`} officialLinks={metadata?.officialLinks} />;
  };
  let chapterInfo;
  try { chapterInfo = await getChapterInfo(chapterId); } catch { return unavailable(false); }
  if (!chapterInfo?.mangaId || chapterInfo.asChapter.availability === 'unavailable') return unavailable(true);

  const sourceLabel = await verifyMangaIdentity(mangaId, chapterInfo.mangaId);
  if (!sourceLabel) return notFound();

  const inventory = await getMangaChapterInventory(chapterInfo.mangaId);
  const matchedNavigation = getReadableChapterNavigation(inventory.chapters, chapterId);
  const navigation = matchedNavigation
    ?? { current: chapterInfo.asChapter, previousId: null, nextId: null };

  const currentChapter = navigation.current;
  const prevChapterId = navigation.previousId;
  const nextChapterId = navigation.nextId;

  if (currentChapter.availability === 'external') {
    if (!currentChapter.externalUrl) return notFound();
    const policy = resolveExternalReaderPolicy(currentChapter.externalUrl);
    if (!policy) return notFound();

    return (
      <ExternalChapterReader
        mangaId={mangaId}
        chapterNumber={currentChapter.chapter}
        providerLabel={policy.id === 'official-external' ? currentChapter.scanlationGroup : policy.label}
        officialUrl={currentChapter.externalUrl}
        canEmbed={policy.mode === 'iframe'}
        experimental={policy.experimental}
        prevChapterId={prevChapterId}
        nextChapterId={nextChapterId}
      />
    );
  }

  if (!mangaDexPageProvider.canHandle(currentChapter)) return notFound();
  let pages;
  try { pages = await mangaDexPageProvider.resolvePages(chapterId); }
  catch (error) { return unavailable(error instanceof ProviderNotFoundError, chapterInfo.mangaId); }

  return (
    <>
      <ProviderBadge source={sourceLabel} />
      {!inventory.complete && <p role="status" style={{ padding: '1rem' }}>Chapter navigation is incomplete because the source could not return its full inventory.</p>}
      <MangaReader
        pages={pages}
        chapterId={chapterId}
        mangaId={mangaId}
        chapterNumber={currentChapter.chapter}
        prevChapterId={prevChapterId}
        nextChapterId={nextChapterId}
        scanlationGroup={currentChapter.scanlationGroup}
        inventoryComplete={inventory.complete && matchedNavigation !== null}
      />
    </>
  );
}

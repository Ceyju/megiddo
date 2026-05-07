import { notFound } from 'next/navigation';
import { getChapterPages, getMangaChapters, type MDPage } from '@/lib/mangadex';
import { isMHId, getMHChapterDetail, getMHMangaDetail } from '@/lib/mangahook';
import MangaReader from '@/components/MangaReader';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string; chapterId: string }>;
}

export default async function MangaReaderPage({ params }: Props) {
  const { id: mangaId, chapterId } = await params;

  if (isMHId(mangaId)) {
    // ── MangaHook path ─────────────────────────────────────────
    const detail = await getMHChapterDetail(mangaId, chapterId);
    if (!detail || !detail.images.length) return notFound();

    const pages: MDPage[] = detail.images.map(img => ({
      url: img.image,
      dataSaver: img.image, // no separate low-quality version
    }));

    const allChapterIds = detail.chapterListIds;
    const idx = allChapterIds.findIndex(c => c.id === chapterId);
    const prevChapterId = idx !== -1 && idx < allChapterIds.length - 1 ? allChapterIds[idx + 1].id : null;
    const nextChapterId = idx > 0 ? allChapterIds[idx - 1].id : null;
    const chapterNumber = chapterId.replace('chapter-', '');

    return (
      <MangaReader
        pages={pages}
        chapterId={chapterId}
        mangaId={mangaId}
        chapterNumber={chapterNumber}
        prevChapterId={prevChapterId}
        nextChapterId={nextChapterId}
      />
    );
  }

  // ── MangaDex path (existing code) ─────────────────────────────
  const [pages, { chapters }] = await Promise.all([
    getChapterPages(chapterId),
    getMangaChapters(mangaId, 0, 500),
  ]);

  if (!pages.length) return notFound();

  const idx = chapters.findIndex(c => c.id === chapterId);
  const currentChapter = chapters[idx] ?? null;
  const prevChapterId = idx > 0 ? chapters[idx - 1].id : null;
  const nextChapterId = idx !== -1 && idx < chapters.length - 1 ? chapters[idx + 1].id : null;

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
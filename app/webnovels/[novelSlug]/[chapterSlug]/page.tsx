import { notFound } from 'next/navigation';
import { parseChapterContent } from '@/lib/novelfire';
import NovelFireReader from '@/components/NovelFireReader';
import { chapterSlug as validChapterSlug, slug as validSlug } from '@/lib/server/validation';
import ProviderUnavailable from '@/components/ProviderUnavailable';

interface Props {
  params: Promise<{ novelSlug: string; chapterSlug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { novelSlug, chapterSlug } = await params;
  return { title: `${chapterSlug.replace('-', ' ')} — ${novelSlug} · Megiddo` };
}

export default async function ChapterPage({ params }: Props) {
  const { novelSlug, chapterSlug } = await params;

  try { validSlug(novelSlug); validChapterSlug(chapterSlug); } catch { return notFound(); }
  let chapter;
  try {
    chapter = await parseChapterContent(novelSlug, chapterSlug);
  } catch {
    return <ProviderUnavailable backHref={`/webnovels/${novelSlug}`} backLabel="All chapters" retryHref={`/webnovels/${novelSlug}/${chapterSlug}`} />;
  }
  if (!chapter) return notFound();

  return (
    <NovelFireReader
      novelSlug={novelSlug}
      chapterSlug={chapterSlug}
      chapter={chapter}
    />
  );
}

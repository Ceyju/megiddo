import { notFound } from 'next/navigation';
import { parseChapterContent } from '@/lib/novelfire';
import NovelFireReader from '@/components/NovelFireReader';

interface Props {
  params: Promise<{ novelSlug: string; chapterSlug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { novelSlug, chapterSlug } = await params;
  return { title: `${chapterSlug.replace('-', ' ')} — ${novelSlug} · Megiddo` };
}

export default async function ChapterPage({ params }: Props) {
  const { novelSlug, chapterSlug } = await params;

  if (!/^[a-z0-9-]{1,80}$/.test(novelSlug) || !/^chapter-\d+$/.test(chapterSlug))
    return notFound();

  const chapter = await parseChapterContent(novelSlug, chapterSlug);
  if (!chapter) return notFound();

  return (
    <NovelFireReader
      novelSlug={novelSlug}
      chapterSlug={chapterSlug}
      chapter={chapter}
    />
  );
}
import { NextRequest, NextResponse } from 'next/server';
import { parseNovel, parseChapterList, parseChapterContent, searchNovels } from '@/lib/novelfire';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const slug = searchParams.get('slug');

  if (!slug || !/^[a-z0-9-]{1,80}$/.test(slug))
    return NextResponse.json({ error: 'Missing or invalid slug' }, { status: 400 });

  try {
    switch (action) {
      case 'novel': {
        const data = await parseNovel(slug);
        if (!data) return NextResponse.json({ error: 'Novel not found' }, { status: 404 });
        return NextResponse.json(data, { headers: { 'Cache-Control': 'public, s-maxage=3600' } });
      }
      case 'chapters': {
        const page = Math.max(1, parseInt(searchParams.get('page') ?? '1') || 1);
        const data = await parseChapterList(slug, page);
        // Always return chapters in ascending order (chapter 1 first)
        const sorted = {
          ...data,
          chapters: [...data.chapters].sort((a, b) =>
            parseFloat(a.number ?? '0') - parseFloat(b.number ?? '0'),
          ),
        };
        return NextResponse.json(sorted, { headers: { 'Cache-Control': 'public, s-maxage=900' } });
      }
      case 'chapter': {
        const chapter = searchParams.get('chapter');
        if (!chapter || !/^chapter-\d+$/.test(chapter))
          return NextResponse.json({ error: 'Missing or invalid chapter' }, { status: 400 });
        const data = await parseChapterContent(slug, chapter);
        if (!data) return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
        return NextResponse.json(data, { headers: { 'Cache-Control': 'public, s-maxage=1800' } });
      }
      case 'search': {
        const q = searchParams.get('q')?.slice(0, 100).trim();
        if (!q) return NextResponse.json({ results: [] });
        const results = await searchNovels(q);
        return NextResponse.json({ results });
      }
      default:
        return NextResponse.json({ error: 'Invalid action. Use: novel, chapters, chapter, search' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
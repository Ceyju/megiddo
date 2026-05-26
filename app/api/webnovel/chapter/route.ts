import { NextRequest, NextResponse } from 'next/server';
import { parseChapterContent } from '@/lib/novelfire';

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug');
  const ch = req.nextUrl.searchParams.get('ch');

  if (!slug || !ch)
    return NextResponse.json({ error: 'slug and ch required' }, { status: 400 });
  if (!/^[a-z0-9-]{1,80}$/.test(slug))
    return NextResponse.json({ error: 'invalid slug' }, { status: 400 });
  if (!/^chapter-\d+$/.test(ch))
    return NextResponse.json({ error: 'invalid chapter id' }, { status: 400 });

  try {
    const data = await parseChapterContent(slug, ch);
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch chapter' }, { status: 502 });
  }
}

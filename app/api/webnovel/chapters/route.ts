import { NextRequest, NextResponse } from 'next/server';
import { getNovelChapters } from '@/lib/novelfire';

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug');
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') ?? '1') || 1);

  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });
  if (!/^[a-z0-9-]{1,80}$/.test(slug))
    return NextResponse.json({ error: 'invalid slug' }, { status: 400 });

  try {
    const data = await getNovelChapters(slug, page);
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600' },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch chapters' }, { status: 502 });
  }
}

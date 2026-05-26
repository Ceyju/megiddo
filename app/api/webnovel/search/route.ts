import { NextRequest, NextResponse } from 'next/server';
import { searchNovels } from '@/lib/novelfire';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.slice(0, 100).trim();
  if (!q) return NextResponse.json({ results: [] });

  try {
    const results = await searchNovels(q);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface NyaaItem {
  title: string;
  magnet: string;
  seeders: number;
}

function buildVariants(q: string): string[] {
  const variants: string[] = [q];

  const noSeason = q.replace(/\s+(season|part)\s*\d+/gi, '').replace(/\s{2,}/g, ' ').trim();
  if (noSeason !== q) variants.push(noSeason);

  const colonIdx = q.indexOf(':');
  if (colonIdx > 2) {
    const beforeColon = q.slice(0, colonIdx).trim();
    const ep = q.split(/\s+/).at(-1) ?? '';
    variants.push(`${beforeColon} ${ep}`);
    const noSeasonBeforeColon = noSeason.slice(0, noSeason.lastIndexOf(' ')).trim();
    if (noSeasonBeforeColon && noSeasonBeforeColon !== beforeColon) {
      variants.push(`${noSeasonBeforeColon} ${ep}`);
    }
  }

  const words = q.split(/\s+/);
  if (words.length > 4) {
    const shortTitle = words.slice(0, 2).join(' ');
    const ep = words.at(-1) ?? '';
    variants.push(`${shortTitle} ${ep}`);
  }

  return [...new Set(variants)];
}

function parseItems(xml: string): NyaaItem[] {
  const items: NyaaItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const titleRaw =
      block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] ||
      block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ||
      '';
    const title = titleRaw.trim();

    const magnet = (block.match(/<nyaa:magnetUri>([\s\S]*?)<\/nyaa:magnetUri>/)?.[1] || '').trim();
    const seeders = parseInt(
      block.match(/<nyaa:seeders>(\d+)<\/nyaa:seeders>/)?.[1] || '0',
      10
    );

    if (magnet && title && magnet.startsWith('magnet:')) {
      items.push({ title, magnet, seeders });
    }

    if (items.length >= 10) break;
  }

  return items;
}

async function fetchNyaa(q: string): Promise<NyaaItem[]> {
  // c=1_2 = English-translated anime, f=0 = no filter
  const rssUrl = `https://nyaa.si/?page=rss&q=${encodeURIComponent(q)}&c=1_2&f=0`;
  const res = await fetch(rssUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; anime-app/1.0)' },
    next: { revalidate: 300 },
  });
  if (!res.ok) return [];
  return parseItems(await res.text());
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 });
  }

  try {
    const variants = buildVariants(q.trim());
    let items: NyaaItem[] = [];

    for (const variant of variants) {
      items = await fetchNyaa(variant);
      if (items.length > 0) break;
    }

    items.sort((a, b) => b.seeders - a.seeders);
    return NextResponse.json({ items: items.slice(0, 5) });
  } catch {
    return NextResponse.json({ error: 'Internal error', items: [] }, { status: 500 });
  }
}

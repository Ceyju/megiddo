//move to env
const BASE = process.env.MANGADEX_API_BASE;
const UPLOADS = process.env.MANGADEX_UPLOADS_BASE;

const HEADERS: Record<string, string> = {
  'User-Agent': process.env.USER_AGENT ?? 'Mozilla/5.0 (compatible; anime-app/1.0)',
};

async function mdFetch(url: string, opts: RequestInit = {}): Promise<Response> {
  return fetch(url, { ...opts, headers: { ...HEADERS, ...(opts.headers as object ?? {}) } });
}

// ─── Types ─────────────────────────────────────────────────────────────────

export interface MDManga {
  id: string;
  title: string;
  altTitles: string[];
  description: string;
  status: string;
  contentRating: string;
  tags: string[];
  coverUrl: string | null;
  type: 'manga' | 'manhwa' | 'manhua' | 'novel' | 'one_shot'; //'doujinshi'
  year: number | null;
  latestChapter: string | null;
  updatedAt?: string | null;
  slug?: string | null;
}

export interface MDChapter {
  id: string;
  chapter: string | null;
  title: string | null;
  volume: string | null;
  publishAt: string;
  pages: number;
  scanlationGroup: string;
}

export interface MDPage {
  url: string;   // normal quality
  dataSaver: string; // compressed
}

// ─── Internal helpers ───────────────────────────────────────────────────────

function extractTitle(attributes: Record<string, unknown>): string {
  const titles = attributes.title as Record<string, string>;
  return (
    titles['en'] ||
    titles['ja-ro'] ||
    titles['ja'] ||
    Object.values(titles)[0] ||
    'Unknown'
  );
}

function extractDescription(attributes: Record<string, unknown>): string {
  const desc = attributes.description as Record<string, string>;
  return desc?.['en'] || Object.values(desc ?? {})[0] || '';
}

function extractCover(
  mangaId: string,
  relationships: Array<{ type: string; attributes?: { fileName?: string } }>
): string | null {
  const rel = relationships.find((r) => r.type === 'cover_art');
  if (!rel?.attributes?.fileName) return null;
  return `${UPLOADS}/covers/${mangaId}/${rel.attributes.fileName}.512.jpg`;
}

function parseManga(item: Record<string, unknown>): MDManga {
  const id = item.id as string;
  const attr = item.attributes as Record<string, unknown>;
  const rels = (item.relationships as Array<{ type: string; attributes?: { fileName?: string; name?: string } }>) ?? [];

  const altTitleRaw = (attr.altTitles as Array<Record<string, string>>) ?? [];
  const altTitles = altTitleRaw.flatMap((obj) => Object.values(obj)).slice(0, 3);

  const tagRaw = (attr.tags as Array<{ attributes: { name: Record<string, string> } }>) ?? [];
  const tags = tagRaw.map((t) => t.attributes.name['en'] ?? Object.values(t.attributes.name)[0]).filter(Boolean);

  return {
    id,
    title: extractTitle(attr),
    altTitles,
    description: extractDescription(attr),
    status: (attr.status as string) ?? 'unknown',
    contentRating: (attr.contentRating as string) ?? 'safe',
    tags,
    coverUrl: extractCover(id, rels),
    type: (attr.originalLanguage as string) === 'ko'
      ? 'manhwa'
      : (attr.originalLanguage as string) === 'zh' || (attr.originalLanguage as string) === 'zh-hk'
      ? 'manhua'
      : ((attr.publicationDemographic as string) ?? 'manga') === 'none'
      ? 'manga'
      : 'manga',
    year: (attr.year as number | null) ?? null,
    latestChapter: (attr.lastChapter as string | null) ?? null,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function searchManga(q: string, limit = 20): Promise<MDManga[]> {
  const url = new URL(`${BASE}/manga`);
  url.searchParams.set('title', q);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('includes[]', 'cover_art');
  url.searchParams.set('availableTranslatedLanguage[]', 'en');
  url.searchParams.set('contentRating[]', 'safe');
  url.searchParams.append('contentRating[]', 'suggestive');
  url.searchParams.set('hasAvailableChapters', 'true');
  url.searchParams.set('order[relevance]', 'desc');

  const res = await fetch(url.toString(), { next: { revalidate: 300 } })
  if (!res.ok) return [];
  const json = await res.json();
  return (json.data as Record<string, unknown>[]).map(parseManga);
}

export async function getPopularManga(limit = 24): Promise<MDManga[]> {
  const url = new URL(`${BASE}/manga`);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('includes[]', 'cover_art');
  url.searchParams.set('availableTranslatedLanguage[]', 'en');
  url.searchParams.set('contentRating[]', 'safe');
  url.searchParams.append('contentRating[]', 'suggestive');
  url.searchParams.set('hasAvailableChapters', 'true');
  url.searchParams.set('order[followedCount]', 'desc');

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.data as Record<string, unknown>[]).map(parseManga);
}

export async function getLatestManga(limit = 24): Promise<MDManga[]> {
  const url = new URL(`${BASE}/manga`);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('includes[]', 'cover_art');
  url.searchParams.set('availableTranslatedLanguage[]', 'en');
  url.searchParams.set('contentRating[]', 'safe');
  url.searchParams.append('contentRating[]', 'suggestive');
  url.searchParams.set('hasAvailableChapters', 'true');
  url.searchParams.set('order[latestUploadedChapter]', 'desc');

  const res = await mdFetch(url.toString(), { next: { revalidate: 600 } });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.data as Record<string, unknown>[]).map(parseManga);
}

export async function getMangaById(id: string): Promise<MDManga | null> {
  const url = `${BASE}/manga/${id}?includes[]=cover_art&includes[]=author&includes[]=artist`;
  const res = await mdFetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return null;
  const json = await res.json();
  return parseManga(json.data);
}

export async function getMangaChapters(
  mangaId: string,
  offset = 0,
  limit = 96
): Promise<{ chapters: MDChapter[]; total: number }> {
  const url = new URL(`${BASE}/manga/${mangaId}/feed`);
  url.searchParams.set('translatedLanguage[]', 'en');
  url.searchParams.set('order[chapter]', 'asc');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));
  url.searchParams.set('includes[]', 'scanlation_group');
  url.searchParams.set('contentRating[]', 'safe');
  url.searchParams.append('contentRating[]', 'suggestive');

  const res = await mdFetch(url.toString(), { next: { revalidate: 600 } });
  if (!res.ok) return { chapters: [], total: 0 };
  const json = await res.json();

  const raw: MDChapter[] = (json.data as Array<Record<string, unknown>>).map((item) => {
    const attr = item.attributes as Record<string, unknown>;
    const rels = (item.relationships as Array<{ type: string; attributes?: { name?: string } }>) ?? [];
    const group = rels.find((r) => r.type === 'scanlation_group');
    return {
      id: item.id as string,
      chapter: (attr.chapter as string | null) ?? null,
      title: (attr.title as string | null) || null,
      volume: (attr.volume as string | null) ?? null,
      publishAt: (attr.publishAt as string) ?? '',
      pages: (attr.pages as number) ?? 0,
      scanlationGroup: group?.attributes?.name ?? 'Unknown',
    };
  });

  // Deduplicate: one entry per chapter number, prefer the one with most pages.
  // Filter out external chapters (pages=0) — MangaDex at-home can't serve them.
  const seen = new Map<string, MDChapter>();
  for (const ch of raw) {
    if ((ch.pages ?? 0) === 0) continue; // skip external/empty chapters
    const key = ch.chapter ?? 'oneshot';
    const prev = seen.get(key);
    if (!prev || ch.pages > (prev.pages ?? 0)) seen.set(key, ch);
  }
  const chapters = Array.from(seen.values());

  // total from API may include external chapters; clamp to what we actually return
  const apiTotal = json.total as number;
  return { chapters, total: Math.min(apiTotal, chapters.length + (apiTotal - raw.length)) };
}

export async function getChapterPages(chapterId: string): Promise<MDPage[]> {
  try {
    const res = await mdFetch(`${BASE}/at-home/server/${chapterId}`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json();
    if (json.result === 'error' || !json.chapter?.data?.length) return [];
    const { baseUrl, chapter } = json as {
      baseUrl: string;
      chapter: { hash: string; data: string[]; dataSaver: string[] };
    };
    return chapter.data.map((filename, i) => ({
      url: `${baseUrl}/data/${chapter.hash}/${filename}`,
      dataSaver: `${baseUrl}/data-saver/${chapter.hash}/${chapter.dataSaver[i]}`,
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch basic info about a single chapter: its number and parent manga UUID.
 * Used in the reader to avoid re-running findMangaByTitle for navigation.
 */
export async function getChapterInfo(chapterId: string): Promise<{
  mangaId: string | null;
  chapterNumber: string | null;
  asChapter: MDChapter;
} | null> {
  try {
    const res = await mdFetch(
      `${BASE}/chapter/${chapterId}?includes[]=scanlation_group`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (json.result === 'error' || !json.data) return null;
    const item = json.data as Record<string, unknown>;
    const attr = item.attributes as Record<string, unknown>;
    const rels = (item.relationships as Array<{ type: string; id: string; attributes?: { name?: string } }>) ?? [];
    const mangaRel = rels.find(r => r.type === 'manga');
    const groupRel = rels.find(r => r.type === 'scanlation_group');
    return {
      mangaId: mangaRel?.id ?? null,
      chapterNumber: (attr.chapter as string | null) ?? null,
      asChapter: {
        id: item.id as string,
        chapter: (attr.chapter as string | null) ?? null,
        title: (attr.title as string | null) || null,
        volume: (attr.volume as string | null) ?? null,
        publishAt: (attr.publishAt as string) ?? '',
        pages: (attr.pages as number) ?? 0,
        scanlationGroup: groupRel?.attributes?.name ?? 'Unknown',
      },
    };
  } catch {
    return null;
  }
}

export async function getTrendingManga(limit = 24): Promise<MDManga[]> {  const url = new URL(`${BASE}/manga`);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('includes[]', 'cover_art');
  url.searchParams.set('availableTranslatedLanguage[]', 'en');
  url.searchParams.set('contentRating[]', 'safe');
  url.searchParams.append('contentRating[]', 'suggestive');
  url.searchParams.set('hasAvailableChapters', 'true');
  url.searchParams.set('order[rating]', 'desc');
  const res = await mdFetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.data as Record<string, unknown>[]).map(parseManga);
}

/**
 * Search MangaDex for a manga by title, trying altTitles as fallbacks.
 * Returns the best match or null.
 */
export async function findMangaByTitle(title: string, altTitles: string[] = []): Promise<MDManga | null> {
  for (const term of [title, ...altTitles]) {
    if (!term) continue;
    try {
      const url = new URL(`${BASE}/manga`);
      url.searchParams.set('title', term);
      url.searchParams.set('limit', '5');
      url.searchParams.set('includes[]', 'cover_art');
      url.searchParams.set('availableTranslatedLanguage[]', 'en');
      url.searchParams.set('contentRating[]', 'safe');
      url.searchParams.append('contentRating[]', 'suggestive');
      url.searchParams.set('order[relevance]', 'desc');
      const res = await mdFetch(url.toString(), { next: { revalidate: 300 } });
      if (!res.ok) continue;
      const json = await res.json();
      const items = (json.data as Record<string, unknown>[]) ?? [];
      if (items.length) return parseManga(items[0]);
    } catch { continue; }
  }
  return null;
}

/**
 * Fetch every available English chapter for a manga (batched, deduplicated).
 * Used for prev/next navigation in the reader.
 */
export async function getAllMangaChapters(mangaId: string): Promise<MDChapter[]> {
  const BATCH = 500;
  const all: MDChapter[] = [];
  let offset = 0;
  let total = Infinity;

  while (offset < total && offset < 2500) {
    try {
      const url = new URL(`${BASE}/manga/${mangaId}/feed`);
      url.searchParams.set('translatedLanguage[]', 'en');
      url.searchParams.set('order[chapter]', 'asc');
      url.searchParams.set('limit', String(BATCH));
      url.searchParams.set('offset', String(offset));
      url.searchParams.set('includes[]', 'scanlation_group');
      url.searchParams.set('contentRating[]', 'safe');
      url.searchParams.append('contentRating[]', 'suggestive');
      const res = await mdFetch(url.toString(), { next: { revalidate: 600 } });
      if (!res.ok) break;
      const json = await res.json();
      total = json.total as number;
      const raw: MDChapter[] = (json.data as Array<Record<string, unknown>>).map((item) => {
        const attr = item.attributes as Record<string, unknown>;
        const rels = (item.relationships as Array<{ type: string; attributes?: { name?: string } }>) ?? [];
        const group = rels.find((r) => r.type === 'scanlation_group');
        return {
          id: item.id as string,
          chapter: (attr.chapter as string | null) ?? null,
          title: (attr.title as string | null) || null,
          volume: (attr.volume as string | null) ?? null,
          publishAt: (attr.publishAt as string) ?? '',
          pages: (attr.pages as number) ?? 0,
          scanlationGroup: group?.attributes?.name ?? 'Unknown',
        };
      });
      all.push(...raw);
      if (raw.length < BATCH) break;
      offset += BATCH;
    } catch { break; }
  }

  const seen = new Map<string, MDChapter>();
  for (const ch of all) {
    if ((ch.pages ?? 0) === 0) continue; // skip external/empty chapters
    const key = ch.chapter ?? 'oneshot';
    const prev = seen.get(key);
    if (!prev || ch.pages > (prev.pages ?? 0)) seen.set(key, ch);
  }
  return Array.from(seen.values());
}

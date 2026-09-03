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
  titleEnglish?: string | null;
  titleRomaji?: string | null;
  titleNative?: string | null;
  description: string;
  status: string;
  contentRating: string;
  tags: string[];
  coverUrl: string | null;
  type: 'manga' | 'manhwa' | 'manhua' | 'novel' | 'one_shot'; //'doujinshi'
  year: number | null;
  latestChapter: string | null;
  publishedChapterCount?: number | null;
  externalIds?: {
    anilist?: string;
    mal?: string;
    kitsu?: string;
    mangaUpdates?: string;
  };
  officialLinks?: Array<{ label: string; url: string }>;
  updatedAt?: string | null;
  slug?: string | null;
}

export type ChapterAvailability = 'hosted' | 'external' | 'unavailable';

export interface MDChapter {
  id: string;
  chapter: string | null;
  title: string | null;
  volume: string | null;
  publishAt: string;
  pages: number;
  pageCount: number;
  scanlationGroup: string;
  availability: ChapterAvailability;
  provider: 'MangaDex' | 'Kitsu';
  externalUrl: string | null;
}

export interface MDPage {
  url: string;   // normal quality
  dataSaver: string; // compressed
}

// ─── Internal helpers ───────────────────────────────────────────────────────

export function selectLocalizedMangaTitle(titles: Record<string, string>): string {
  return titles.en || titles['ja-ro'] || titles.ja || Object.values(titles)[0] || 'Unknown';
}

function extractTitle(attributes: Record<string, unknown>): string {
  const titles = attributes.title as Record<string, string>;
  return selectLocalizedMangaTitle(titles ?? {});
}

const OFFICIAL_MANGA_HOSTS = [
  'mangaplus.shueisha.co.jp',
  'viz.com',
  'www.viz.com',
  'comikey.com',
  'www.comikey.com',
  'azuki.co',
  'www.azuki.co',
  'kmanga.kodansha.com',
  'kodansha.us',
  'www.kodansha.us',
  'webtoons.com',
  'www.webtoons.com',
  'tapas.io',
  'www.tapas.io',
  'global.bookwalker.jp',
  'bookwalker.jp',
  'www.bookwalker.jp',
  'mangamo.com',
  'www.mangamo.com',
  'pocket.shonenmagazine.com',
  'comic-days.com',
  'shonenjumpplus.com',
  'manga-up.com',
  'global.manga-up.com',
  'webnovel.com',
  'www.webnovel.com',
  'tappytoon.com',
  'www.tappytoon.com',
  'pocketcomics.com',
  'www.pocketcomics.com',
];

export function sanitizeOfficialMangaUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    return OFFICIAL_MANGA_HOSTS.includes(url.hostname.toLowerCase())
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function localizedTitle(
  titles: Record<string, string> | undefined,
  language: string,
): string | null {
  const value = titles?.[language];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
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

  const titles = (attr.title as Record<string, string>) ?? {};
  const altTitleRaw = (attr.altTitles as Array<Record<string, string>>) ?? [];
  const englishAlt = altTitleRaw.flatMap((obj) =>
    Object.entries(obj)
      .filter(([language]) => language === 'en')
      .map(([, value]) => value),
  );
  const romajiAlt = altTitleRaw.flatMap((obj) =>
    Object.entries(obj)
      .filter(([language]) => language === 'ja-ro')
      .map(([, value]) => value),
  );
  const remainingAlt = altTitleRaw.flatMap((obj) => Object.values(obj));
  const altTitles = Array.from(new Set([...englishAlt, ...romajiAlt, ...remainingAlt]))
    .filter(Boolean)
    .slice(0, 8);
  const links = (attr.links as Record<string, string> | null) ?? {};
  const licensedEnglishUrl = sanitizeOfficialMangaUrl(links.engtl);
  const titleEnglish = localizedTitle(titles, 'en') ?? englishAlt[0] ?? null;
  const titleRomaji = localizedTitle(titles, 'ja-ro') ?? romajiAlt[0] ?? null;
  const titleNative = localizedTitle(titles, 'ja')
    ?? localizedTitle(titles, 'ko')
    ?? localizedTitle(titles, 'zh')
    ?? null;

  const tagRaw = (attr.tags as Array<{ attributes: { name: Record<string, string> } }>) ?? [];
  const tags = tagRaw.map((t) => t.attributes.name['en'] ?? Object.values(t.attributes.name)[0]).filter(Boolean);

  return {
    id,
    title: extractTitle(attr),
    altTitles,
    titleEnglish,
    titleRomaji,
    titleNative,
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
    publishedChapterCount: null,
    externalIds: {
      anilist: links.al || undefined,
      mal: links.mal || undefined,
      kitsu: links.kt || undefined,
      mangaUpdates: links.mu || undefined,
    },
    officialLinks: licensedEnglishUrl
      ? [{ label: 'Official English release', url: licensedEnglishUrl }]
      : [],
  };
}

function parseChapter(item: Record<string, unknown>): MDChapter {
  const attr = item.attributes as Record<string, unknown>;
  const rels = (item.relationships as Array<{
    type: string;
    attributes?: { name?: string };
  }>) ?? [];
  const group = rels.find((relationship) => relationship.type === 'scanlation_group');
  const pageCount = (attr.pages as number) ?? 0;
  const externalUrl = sanitizeOfficialMangaUrl(attr.externalUrl);
  const isUnavailable = attr.isUnavailable === true;
  const availability: ChapterAvailability = isUnavailable
    ? 'unavailable'
    : externalUrl
      ? 'external'
      : pageCount > 0
        ? 'hosted'
        : 'unavailable';

  return {
    id: item.id as string,
    chapter: (attr.chapter as string | null) ?? null,
    title: (attr.title as string | null) || null,
    volume: (attr.volume as string | null) ?? null,
    publishAt: (attr.publishAt as string) ?? '',
    pages: pageCount,
    pageCount,
    scanlationGroup: group?.attributes?.name ?? 'Unknown',
    availability,
    provider: 'MangaDex',
    externalUrl,
  };
}

function chapterPreference(chapter: MDChapter): number {
  if (chapter.availability === 'hosted') return 3;
  if (chapter.availability === 'external') return 2;
  return 1;
}

export function deduplicateMangaChapters(chapters: MDChapter[]): MDChapter[] {
  const seen = new Map<string, MDChapter>();
  for (const chapter of chapters) {
    const key = chapter.chapter ?? `oneshot:${chapter.id}`;
    const previous = seen.get(key);
    if (
      !previous
      || chapterPreference(chapter) > chapterPreference(previous)
      || (
        chapterPreference(chapter) === chapterPreference(previous)
        && chapter.pageCount > previous.pageCount
      )
    ) {
      seen.set(key, chapter);
    }
  }

  return Array.from(seen.values()).sort((a, b) => {
    const aNumber = Number(a.chapter);
    const bNumber = Number(b.chapter);
    if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) return aNumber - bNumber;
    return (a.chapter ?? '').localeCompare(b.chapter ?? '', undefined, { numeric: true });
  });
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
): Promise<{ chapters: MDChapter[]; total: number; readableTotal: number }> {
  const inventory = await getAllMangaChapterInventory(mangaId);
  const safeOffset = Math.max(0, offset);
  const safeLimit = Math.min(Math.max(1, limit), 100);
  return {
    chapters: inventory.slice(safeOffset, safeOffset + safeLimit),
    total: inventory.length,
    readableTotal: inventory.filter((chapter) => chapter.availability !== 'unavailable').length,
  };
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
    return {
      mangaId: mangaRel?.id ?? null,
      chapterNumber: (attr.chapter as string | null) ?? null,
      asChapter: parseChapter(item),
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

export function normalizeMangaTitle(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function matchingTitles(manga: MDManga): Set<string> {
  return new Set(
    [manga.title, manga.titleEnglish, manga.titleRomaji, manga.titleNative, ...manga.altTitles]
      .filter((title): title is string => Boolean(title))
      .map(normalizeMangaTitle)
      .filter(Boolean),
  );
}

function mangaMatchScore(candidate: MDManga, target: MDManga): number | null {
  const targetAniListId = target.externalIds?.anilist
    ?? (target.id.startsWith('anilist:') ? target.id.slice('anilist:'.length) : undefined);
  const targetMalId = target.externalIds?.mal;

  if (targetAniListId && candidate.externalIds?.anilist === targetAniListId) return 1_000;
  if (targetMalId && candidate.externalIds?.mal === targetMalId) return 900;
  if (
    targetAniListId && candidate.externalIds?.anilist
    && candidate.externalIds.anilist !== targetAniListId
  ) return null;
  if (targetMalId && candidate.externalIds?.mal && candidate.externalIds.mal !== targetMalId) {
    return null;
  }

  const targetTitles = matchingTitles(target);
  const candidateTitles = matchingTitles(candidate);
  const hasExactTitle = Array.from(candidateTitles).some((title) => targetTitles.has(title));
  if (!hasExactTitle) return null;

  let score = 70;
  if (normalizeMangaTitle(candidate.title) === normalizeMangaTitle(target.title)) score += 10;
  if (candidate.year && target.year && candidate.year === target.year) score += 15;
  if (candidate.type === target.type) score += 10;
  return score;
}

export function selectBestMangaMatch(
  candidates: MDManga[],
  target: MDManga,
): MDManga | null {
  const scored = candidates
    .map((candidate) => ({ candidate, score: mangaMatchScore(candidate, target) }))
    .filter((entry): entry is { candidate: MDManga; score: number } => entry.score !== null)
    .sort((a, b) => b.score - a.score);
  if (!scored.length || scored[0].score < 80) return null;
  if (scored[1] && scored[1].score === scored[0].score) return null;
  return scored[0].candidate;
}

/** Resolve a catalog entry to MangaDex without trusting the first search result. */
export async function findMangaForCatalogEntry(target: MDManga): Promise<MDManga | null> {
  const terms = Array.from(new Set([
    target.titleEnglish,
    target.title,
    target.titleRomaji,
    ...target.altTitles,
  ].filter((term): term is string => Boolean(term)))).slice(0, 5);
  const candidates = new Map<string, MDManga>();

  for (const term of terms) {
    try {
      const url = new URL(`${BASE}/manga`);
      url.searchParams.set('title', term);
      url.searchParams.set('limit', '10');
      url.searchParams.set('includes[]', 'cover_art');
      url.searchParams.set('availableTranslatedLanguage[]', 'en');
      url.searchParams.set('contentRating[]', 'safe');
      url.searchParams.append('contentRating[]', 'suggestive');
      url.searchParams.set('order[relevance]', 'desc');
      const res = await mdFetch(url.toString(), { next: { revalidate: 300 } });
      if (!res.ok) continue;
      const json = await res.json();
      for (const item of (json.data as Record<string, unknown>[]) ?? []) {
        const parsed = parseManga(item);
        candidates.set(parsed.id, parsed);
      }
      const exactIdentity = selectBestMangaMatch(Array.from(candidates.values()), target);
      if (exactIdentity && mangaMatchScore(exactIdentity, target)! >= 900) return exactIdentity;
    } catch {
      continue;
    }
  }

  return selectBestMangaMatch(Array.from(candidates.values()), target);
}

/** @deprecated Prefer findMangaForCatalogEntry so external IDs can be verified. */
export async function findMangaByTitle(
  title: string,
  altTitles: string[] = [],
): Promise<MDManga | null> {
  return findMangaForCatalogEntry({
    id: 'legacy-title-search',
    title,
    altTitles,
    description: '',
    status: 'unknown',
    contentRating: 'safe',
    tags: [],
    coverUrl: null,
    type: 'manga',
    year: null,
    latestChapter: null,
  });
}

/**
 * Fetch every available English chapter for a manga (batched, deduplicated).
 * Used for prev/next navigation in the reader.
 */
export async function getAllMangaChapterInventory(mangaId: string): Promise<MDChapter[]> {
  const [hosted, external] = await Promise.all([
    getMangaChapterInventoryByExternalFlag(mangaId, false),
    getMangaChapterInventoryByExternalFlag(mangaId, true),
  ]);
  return deduplicateMangaChapters([...hosted, ...external]);
}

async function getMangaChapterInventoryByExternalFlag(
  mangaId: string,
  includeExternalUrl: boolean,
): Promise<MDChapter[]> {
  const BATCH = 100;
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
      // MangaDex treats this as a filter: false returns hosted chapters and
      // true returns external chapters. Both feeds are merged by the caller.
      url.searchParams.set('includeExternalUrl', includeExternalUrl ? '1' : '0');
      url.searchParams.set('contentRating[]', 'safe');
      url.searchParams.append('contentRating[]', 'suggestive');
      const res = await mdFetch(url.toString(), { next: { revalidate: 600 } });
      if (!res.ok) break;
      const json = await res.json();
      total = json.total as number;
      const raw = (json.data as Array<Record<string, unknown>>).map(parseChapter);
      all.push(...raw);
      if (raw.length < BATCH) break;
      offset += BATCH;
    } catch { break; }
  }

  return all;
}

/** Hosted chapters only, for internal reader previous/next navigation. */
export async function getAllMangaChapters(mangaId: string): Promise<MDChapter[]> {
  const inventory = await getAllMangaChapterInventory(mangaId);
  return inventory.filter((chapter) => chapter.availability === 'hosted');
}

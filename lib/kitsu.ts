import type { MDManga, MDChapter } from './mangadex';

const BASE = 'https://kitsu.io/api/edge';
const ACCEPT = 'application/vnd.api+json';

// Kitsu API docs: default page size is 10, max is 20.
const MAX_LIMIT = 20;

// Sparse fieldsets for list views.
// camelCase field names work for Kitsu sparse fieldsets in practice.
const LIST_FIELDS =
  'fields[manga]=canonicalTitle,titles,posterImage,averageRating,status,chapterCount,subtype,synopsis,startDate,slug,updatedAt,userCount,popularityRank' +
  '&fields[categories]=title,slug';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function ks<T = string>(val: unknown): T | null {
  if (val === null || val === undefined) return null;
  if (
    typeof val === 'object' &&
    !Array.isArray(val) &&
    Object.keys(val as object).length === 0
  )
    return null;
  return val as T;
}

function kitsuStatus(s: string | null): string {
  switch (s) {
    case 'finished':   return 'completed';
    case 'current':    return 'ongoing';
    case 'tba':        return 'upcoming';
    case 'unreleased': return 'upcoming';
    case 'upcoming':   return 'upcoming';
    default:           return s ?? 'unknown';
  }
}

/**
 * subtype is the real type discriminator on Kitsu.
 * mangaType is always null in real API responses — never use it.
 */
function kitsuType(subtype: string | null): MDManga['type'] {
  switch ((subtype ?? '').toLowerCase()) {
    case 'manhwa':   return 'manhwa';
    case 'manhua':   return 'manhua';
    case 'novel':    return 'novel';
    case 'oneshot':
    case 'one_shot': return 'one_shot';
    default:         return 'manga';
  }
}

function bestTitle(
  titles: Record<string, unknown> | null,
  canonical: string | null,
): string {
  if (canonical) return canonical;
  if (!titles) return 'Unknown';
  return (
    (titles['en'] as string) ||
    (titles['en_us'] as string) ||
    (titles['en_jp'] as string) ||
    (titles['ja_jp'] as string) ||
    (Object.values(titles).find((v) => typeof v === 'string' && v) as string) ||
    'Unknown'
  );
}

function kitsuContentRating(ageRating: string | null): MDManga['contentRating'] {
  switch (ageRating) {
    case 'R18+': return 'pornographic';
    case 'R':    return 'suggestive';
    default:     return 'safe';
  }
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type KitsuOptional<T> = T | Record<string, never>;

interface KitsuPosterImage {
  large?: string;
  original?: string;
}

interface KitsuAttrs {
  canonicalTitle?: string;
  titles?: Record<string, unknown>;
  abbreviatedTitles?: string[];
  posterImage?: KitsuOptional<KitsuPosterImage>;
  averageRating?: KitsuOptional<string>;
  status?: string;
  chapterCount?: KitsuOptional<number>;
  volumeCount?: KitsuOptional<number>;
  subtype?: string;
  synopsis?: string;
  description?: string;
  startDate?: string;
  endDate?: KitsuOptional<string>;
  slug?: string;
  ageRating?: KitsuOptional<string>;
  ageRatingGuide?: KitsuOptional<string>;
  serialization?: KitsuOptional<string>;
  ratingRank?: KitsuOptional<number>;
  popularityRank?: number;
  userCount?: number;
  favoritesCount?: number;
  updatedAt?: string;
  createdAt?: string;
}

interface KitsuRelData {
  id: string;
  type: string;
}

interface KitsuItem {
  id: string;
  attributes: KitsuAttrs;
  relationships?: {
    categories?: { data?: KitsuRelData[] };
  };
}

export interface KitsuCategory {
  id: string;
  title: string;
  slug: string;
  description: string;
  totalMediaCount: number;
  nsfw: boolean;
  childCount: number;
}

interface KitsuCategoryItem {
  id: string;
  type: string;
  attributes: {
    title: string;
    slug: string;
    description?: string;
    totalMediaCount?: number;
    nsfw?: boolean;
    childCount?: number;
  };
}

function buildCategoryMap(included: unknown[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of included) {
    const i = item as KitsuCategoryItem;
    if (i.type === 'categories' && i.attributes?.title) {
      map.set(i.id, i.attributes.title);
    }
  }
  return map;
}

interface KitsuChapterAttrs {
  canonicalTitle?: string;
  titles?: Record<string, unknown>;
  volumeNumber?: number | null;
  number?: number | null;
  synopsis?: string;
  published?: KitsuOptional<string>;
  length?: KitsuOptional<string | number>;
  thumbnail?: KitsuOptional<{ original?: string }>;
}

interface KitsuChapterItem {
  id: string;
  attributes: KitsuChapterAttrs;
}

// ---------------------------------------------------------------------------
// Converters
// ---------------------------------------------------------------------------

function kitsuToMDManga(
  item: KitsuItem,
  categoryMap?: Map<string, string>,
): MDManga {
  const a = item.attributes;
  const poster = ks<KitsuPosterImage>(a.posterImage);

  const tags: string[] = [];
  if (categoryMap && item.relationships?.categories?.data) {
    for (const rel of item.relationships.categories.data) {
      const title = categoryMap.get(rel.id);
      if (title) tags.push(title);
    }
  }

  return {
    id: `kitsu:${item.id}`,
    title: bestTitle(a.titles ?? null, a.canonicalTitle ?? null),
    altTitles: a.abbreviatedTitles ?? [],
    description: a.synopsis ?? a.description ?? '',
    status: kitsuStatus(a.status ?? null),
    contentRating: kitsuContentRating(ks<string>(a.ageRating)),
    tags,
    coverUrl:
      poster?.large ??
      poster?.original ??
      null,
    type: kitsuType(a.subtype ?? null),
    year: a.startDate ? Number(a.startDate.slice(0, 4)) : null,
    latestChapter:
      typeof a.chapterCount === 'number' ? String(a.chapterCount) : null,
    updatedAt: a.updatedAt ?? null,
    slug: a.slug ?? null,
  };
}

function kitsuToMDChapter(item: KitsuChapterItem): MDChapter {
  const a = item.attributes;
  const published = ks<string>(a.published);
  const pages = ks<string | number>(a.length);
  return {
    id: `kitsu-ch:${item.id}`,
    chapter:
      a.number !== null && a.number !== undefined ? String(a.number) : null,
    title: a.canonicalTitle ?? bestTitle(a.titles ?? null, null),
    volume:
      a.volumeNumber !== null && a.volumeNumber !== undefined
        ? String(a.volumeNumber)
        : null,
    publishAt: published ?? new Date(0).toISOString(),
    pages:
      typeof pages === 'number'
        ? pages
        : typeof pages === 'string'
          ? Number(pages) || 0
          : 0,
    scanlationGroup: 'Kitsu',
  };
}

// ---------------------------------------------------------------------------
// Internal fetch helper
// ---------------------------------------------------------------------------

async function kitsuFetch(
  sort: string,
  limit: number,
  extraFilters = '',
): Promise<MDManga[]> {
  const safeLimit = Math.min(limit, MAX_LIMIT);
  try {
    const url =
      `${BASE}/manga?sort=${sort}&page[limit]=${safeLimit}&${LIST_FIELDS}&include=categories${extraFilters}`;
    const res = await fetch(url, {
      headers: { Accept: ACCEPT },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const categoryMap = buildCategoryMap((json.included as unknown[]) ?? []);
    return (json.data as KitsuItem[]).map((item) =>
      kitsuToMDManga(item, categoryMap),
    );
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Most followed manga on Kitsu. */
export async function getKitsuPopular(limit = 20): Promise<MDManga[]> {
  return kitsuFetch('-user_count', limit);
}

/**
 * Most recently updated manga on Kitsu.
 * updated_at is bumped when chapters are added, making this the best
 * approximation of "latest chapter updates" without a chapter-level sort.
 */
export async function getKitsuLatest(limit = 20): Promise<MDManga[]> {
  return kitsuFetch('-updated_at', limit);
}

/** Highest rated manga on Kitsu. */
export async function getKitsuTopRated(limit = 20): Promise<MDManga[]> {
  return kitsuFetch('-average_rating', limit);
}

/** Newest manga by start date. */
export async function getKitsuNewest(limit = 20): Promise<MDManga[]> {
  return kitsuFetch('-start_date', limit);
}

/** Kitsu curated trending manga. */
export async function getKitsuTrending(limit = 20): Promise<MDManga[]> {
  const safeLimit = Math.min(limit, MAX_LIMIT);
  try {
    const url = `${BASE}/trending/manga?page[limit]=${safeLimit}&include=categories&${LIST_FIELDS}`;
    const res = await fetch(url, {
      headers: { Accept: ACCEPT },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const categoryMap = buildCategoryMap((json.included as unknown[]) ?? []);
    return (json.data as KitsuItem[]).map((item) =>
      kitsuToMDManga(item, categoryMap),
    );
  } catch {
    return [];
  }
}

/**
 * Fetch a single Kitsu manga by its numeric ID (e.g. "14900").
 *
 * Uses cache: 'no-store' to bypass Next.js per-render fetch deduplication.
 * Without this, a parallel getKitsuChapters call in Promise.all can poison
 * the fetch cache and cause a null response on subsequent renders.
 * Revalidation is handled at the page level via `export const revalidate`.
 */
export async function getKitsuMangaById(
  kitsuId: string,
): Promise<MDManga | null> {
  try {
    const url = `${BASE}/manga/${kitsuId}?include=categories`;
    const res = await fetch(url, {
      headers: { Accept: ACCEPT },
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error(`[kitsu] getKitsuMangaById(${kitsuId}) HTTP ${res.status}`);
      return null;
    }
    const json = await res.json();
    // Kitsu returns { data: { id, type, attributes, relationships } } for single items.
    // Guard against accidentally receiving a list response.
    if (!json.data || Array.isArray(json.data)) {
      console.error(`[kitsu] getKitsuMangaById(${kitsuId}) unexpected response shape:`, Object.keys(json));
      return null;
    }
    const categoryMap = buildCategoryMap((json.included as unknown[]) ?? []);
    return kitsuToMDManga(json.data as KitsuItem, categoryMap);
  } catch (err) {
    console.error(`[kitsu] getKitsuMangaById(${kitsuId}) threw:`, err);
    return null;
  }
}

/** Search Kitsu manga by text query. */
export async function searchKitsuManga(
  query: string,
  limit = 20,
): Promise<MDManga[]> {
  const safeLimit = Math.min(limit, MAX_LIMIT);
  try {
    const url =
      `${BASE}/manga?filter[text]=${encodeURIComponent(query)}&page[limit]=${safeLimit}&${LIST_FIELDS}&include=categories`;
    const res = await fetch(url, {
      headers: { Accept: ACCEPT },
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const categoryMap = buildCategoryMap((json.included as unknown[]) ?? []);
    return (json.data as KitsuItem[]).map((item) =>
      kitsuToMDManga(item, categoryMap),
    );
  } catch {
    return [];
  }
}

/**
 * Fetch chapters for a Kitsu manga by its numeric ID, with offset pagination.
 *
 * The Kitsu /chapters endpoint filters by mangaId (numeric ID, not slug).
 * Limit is capped at 20 per API constraints.
 *
 * NOTE: Most manga on Kitsu have zero chapters in this endpoint —
 * Kitsu only has chapter data for titles it has licensed/scanlated metadata for.
 * A total of 0 is expected and normal, not an error.
 */
export async function getKitsuChapters(
  kitsuId: string,
  offset = 0,
  limit = 20,
): Promise<{ chapters: MDChapter[]; total: number }> {
  const safeLimit = Math.min(limit, MAX_LIMIT);
  try {
    const url =
      `${BASE}/chapters?filter[mangaId]=${kitsuId}&page[limit]=${safeLimit}&page[offset]=${offset}&sort=number`;
    const res = await fetch(url, {
      headers: { Accept: ACCEPT },
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      console.error(`[kitsu] getKitsuChapters(${kitsuId}) HTTP ${res.status}`);
      return { chapters: [], total: 0 };
    }
    const json = await res.json();
    // meta.count is the total records across all pages per JSON:API spec.
    const total: number =
      (json.meta as { count?: number } | undefined)?.count ??
      (json.data as unknown[]).length;
    const chapters = (json.data as KitsuChapterItem[]).map(kitsuToMDChapter);
    return { chapters, total };
  } catch (err) {
    console.error(`[kitsu] getKitsuChapters(${kitsuId}) threw:`, err);
    return { chapters: [], total: 0 };
  }
}

/** Fetch all Kitsu categories, sorted by totalMediaCount descending. */
export async function getKitsuCategories(
  limit = 218,
): Promise<KitsuCategory[]> {
  try {
    const url = `${BASE}/categories?page[limit]=${limit}&sort=-total_media_count&filter[nsfw]=false`;
    const res = await fetch(url, {
      headers: { Accept: ACCEPT },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data as KitsuCategoryItem[]).map((item) => ({
      id: item.id,
      title: item.attributes.title,
      slug: item.attributes.slug,
      description: item.attributes.description ?? '',
      totalMediaCount: item.attributes.totalMediaCount ?? 0,
      nsfw: item.attributes.nsfw ?? false,
      childCount: item.attributes.childCount ?? 0,
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch manga filtered by a Kitsu category slug.
 * Uses filter[categories]=slug directly — single round-trip, no ID resolution needed.
 */
export async function getKitsuMangaByCategory(
  categorySlug: string,
  limit = 20,
  sort = '-user_count',
): Promise<MDManga[]> {
  const safeLimit = Math.min(limit, MAX_LIMIT);
  try {
    const url =
      `${BASE}/manga?filter[categories]=${encodeURIComponent(categorySlug)}&page[limit]=${safeLimit}&sort=${sort}&${LIST_FIELDS}&include=categories`;
    const res = await fetch(url, {
      headers: { Accept: ACCEPT },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const categoryMap = buildCategoryMap((json.included as unknown[]) ?? []);
    return (json.data as KitsuItem[]).map((item) =>
      kitsuToMDManga(item, categoryMap),
    );
  } catch {
    return [];
  }
}

/**
 * Fetch manga filtered by subtype.
 * Valid: "manga" | "manhwa" | "manhua" | "novel" | "oneshot"
 */
export async function getKitsuMangaBySubtype(
  subtype: 'manga' | 'manhwa' | 'manhua' | 'novel' | 'oneshot',
  limit = 20,
  sort = '-user_count',
): Promise<MDManga[]> {
  return kitsuFetch(sort, limit, `&filter[subtype]=${subtype}`);
}

/**
 * Fetch manga filtered by publication status.
 * Kitsu statuses: "current" (ongoing) | "finished" (completed) | "tba" | "unreleased" | "upcoming"
 */
export async function getKitsuMangaByStatus(
  status: 'current' | 'finished' | 'tba' | 'unreleased' | 'upcoming',
  limit = 20,
  sort = '-user_count',
): Promise<MDManga[]> {
  return kitsuFetch(sort, limit, `&filter[status]=${status}`);
}
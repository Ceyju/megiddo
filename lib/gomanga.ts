import type { MDPage } from './mangadex';

const BASE = process.env.GOMANGA_API_BASE;

// ---------------------------------------------------------------------------
// API response types (matching actual documented response shapes)
// ---------------------------------------------------------------------------

interface GoMangaChapterRef {
  chapterId: string;
  views: string;
  uploaded: string;
  timestamp: string;
}

interface GoMangaDetailResponse {
  id: string;
  title: string;
  imageUrl: string;
  author: string;
  status: string;
  lastUpdated: string;
  views: string;
  genres: string[];
  rating: string;
  chapters: GoMangaChapterRef[];
  error?: string;
}

// Chapter endpoint: { title, chapter, imageUrls }
// Note: no `provider` field on the chapter response — that was a false assumption.
interface GoMangaChapterResponse {
  title?: string;
  chapter?: string;
  imageUrls?: string[];
  error?: string;
}

interface GoMangaSearchResult {
  id: string;
  title: string;
  imgUrl: string;
  latestChapters: { name: string; chapter: string }[];
  authors: string;
  updated: string;
  views: string;
}

interface GoMangaSearchResponse {
  keyword: string;
  count: number;
  manga: GoMangaSearchResult[];
}

// ---------------------------------------------------------------------------
// Public result types
// ---------------------------------------------------------------------------

export interface GoMangaResult {
  pages: MDPage[];
  provider: string;
  found: boolean;
}

export interface GoMangaDetail {
  id: string;           // GoManga's own canonical slug
  title: string;
  coverUrl: string;
  status: string;
  genres: string[];
  chapters: GoMangaChapterRef[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Converts a title string to a GoManga-style slug.
 * GoManga slugs: lowercase, spaces→hyphens, strip most punctuation.
 * This is a best-effort approximation — use searchGoManga for accuracy.
 */
function titleToGoSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[''`]/g, '')           // strip apostrophes/backticks
    .replace(/[^a-z0-9\s-]/g, ' ')  // replace non-alphanumeric with space
    .trim()
    .replace(/\s+/g, '-');           // spaces to hyphens
}

// ---------------------------------------------------------------------------
// Core fetchers
// ---------------------------------------------------------------------------

/**
 * Fetch GoManga detail for a manga by its GoManga slug ID.
 * This gives you the canonical `id` and valid `chapterId` values to use.
 */
export async function getGoMangaDetail(
  goMangaId: string,
): Promise<GoMangaDetail | null> {
  try {
    const url = `${BASE}/manga/${encodeURIComponent(goMangaId)}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      console.error(`[gomanga] getGoMangaDetail(${goMangaId}) HTTP ${res.status}`);
      return null;
    }
    const json = (await res.json()) as GoMangaDetailResponse | null;
    // GoManga returns null (not an object) when a slug is not found, even with a 200 status
    if (!json || typeof json !== 'object' || json.error || !json.id) return null;
    return {
      id: json.id,
      title: json.title,
      coverUrl: json.imageUrl,
      status: json.status,
      genres: json.genres ?? [],
      chapters: json.chapters ?? [],
    };
  } catch (err) {
    console.error(`[gomanga] getGoMangaDetail(${goMangaId}) threw:`, err);
    return null;
  }
}

/**
 * Search GoManga by title query.
 * Returns the best matching result's canonical GoManga ID, or null if no match.
 *
 * Use this when the Kitsu slug doesn't directly resolve on GoManga —
 * the search gives you the correct `id` to use for detail and chapter fetches.
 */
export async function searchGoManga(
  query: string,
): Promise<GoMangaSearchResult[] | null> {
  try {
    // GoManga search: spaces should be encoded as %20 (encodeURIComponent is correct here)
    // but strip special chars that might break the path
    const safeQuery = query.replace(/[/\\?#]/g, ' ').trim();
    const url = `${BASE}/search/${encodeURIComponent(safeQuery)}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      console.error(`[gomanga] searchGoManga("${query}") HTTP ${res.status}`);
      return null;
    }
    const json = (await res.json()) as GoMangaSearchResponse | null;
    if (!json || typeof json !== 'object') return [];
    return json.manga ?? [];
  } catch (err) {
    console.error(`[gomanga] searchGoManga("${query}") threw:`, err);
    return null;
  }
}

/**
 * Fetch chapter page images from GoManga.
 *
 * @param goMangaId  GoManga's canonical manga slug (from detail or search response `id` field)
 * @param chapterId  Chapter ID string from GoManga's chapter list (e.g. "1", "12")
 *
 * IMPORTANT: Use GoManga's own `chapterId` from the detail endpoint's `chapters` array,
 * NOT the Kitsu chapter number. They usually match for integer chapters but may differ.
 */
export async function getGoMangaPages(
  goMangaId: string,
  chapterId: string,
): Promise<GoMangaResult> {
  try {
    const url = `${BASE}/manga/${encodeURIComponent(goMangaId)}/${chapterId}`;
    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
      console.error(`[gomanga] getGoMangaPages(${goMangaId}, ch${chapterId}) HTTP ${res.status}`);
      return { pages: [], provider: 'GoManga', found: false };
    }

    const json = (await res.json()) as GoMangaChapterResponse | null;

    if (!json || typeof json !== 'object') {
      return { pages: [], provider: 'GoManga', found: false };
    }

    if (json.error) {
      console.error(`[gomanga] getGoMangaPages(${goMangaId}, ch${chapterId}) API error: ${json.error}`);
      return { pages: [], provider: 'GoManga', found: false };
    }

    const imageUrls = json.imageUrls ?? [];
    if (!imageUrls.length) {
      return { pages: [], provider: 'GoManga', found: false };
    }

    const pages: MDPage[] = imageUrls.map((rawUrl) => {
      const secureUrl = rawUrl.replace(/^http:\/\//, 'https://');
      return { url: secureUrl, dataSaver: secureUrl };
    });

    return { pages, provider: 'GoManga', found: true };
  } catch (err) {
    console.error(`[gomanga] getGoMangaPages(${goMangaId}, ch${chapterId}) threw:`, err);
    return { pages: [], provider: 'GoManga', found: false };
  }
}

export async function resolveGoMangaId(
  kitsuSlug: string | null | undefined,
  title: string,
  altTitles: string[] = [],
): Promise<string | null> {
  // Step 1: Search by title first — most reliable approach
  // GoManga's slugs often don't match Kitsu slugs, so direct slug attempts frequently fail
  const searchResults = await searchGoManga(title);
  if (searchResults && searchResults.length > 0) {
    const titleLower = title.toLowerCase();
    const exact = searchResults.find(r => r.title.toLowerCase() === titleLower);
    const best = exact ?? searchResults[0];
    return best.id;
  }

  // Step 2: Try altTitles search if main title search failed
  for (const alt of altTitles.slice(0, 2)) {
    const altResults = await searchGoManga(alt);
    if (altResults && altResults.length > 0) {
      return altResults[0].id;
    }
  }

  // Step 3: Last resort — direct detail fetches with slug variants
  // Only reached if GoManga search itself returns nothing (title not in their catalog)
  const directSlugs = new Set<string>();
  if (kitsuSlug) directSlugs.add(kitsuSlug);
  directSlugs.add(titleToGoSlug(title));

  for (const slug of directSlugs) {
    const detail = await getGoMangaDetail(slug);
    if (detail) return detail.id;
  }

  return null;
}

/**
 * Full pipeline: given Kitsu manga metadata + a chapter number,
 * resolve the GoManga ID and fetch chapter page images.
 *
 * This is the main entry point for the reader page when using Kitsu + GoManga.
 *
 * @param kitsuSlug 
 * @param title       Kitsu canonical title (used for search fallback)
 * @param altTitles   Kitsu abbreviated titles (additional slug variants to try)
 * @param chapterNum  Chapter number string from the Kitsu chapter record (e.g. "1", "12")
 */
export async function getGoMangaPagesWithFallback(
  kitsuSlug: string | undefined,
  title: string,
  altTitles: string[] = [],
  chapterNum: string,
): Promise<GoMangaResult> {
  // Resolve GoManga's canonical ID
  const goMangaId = await resolveGoMangaId(kitsuSlug, title, altTitles);
  if (!goMangaId) {
    console.warn(`[gomanga] Could not resolve GoManga ID for "${title}"`);
    return { pages: [], provider: 'GoManga', found: false };
  }

  // GoManga chapterId is usually the same as the integer chapter number.
  // For decimal chapters (e.g. "12.5"), try exact first then floor.
  const chapterVariants = chapterNum.includes('.')
    ? [chapterNum, String(Math.floor(Number(chapterNum)))]
    : [chapterNum];

  for (const ch of chapterVariants) {
    const result = await getGoMangaPages(goMangaId, ch);
    if (result.found) return result;
  }

  console.warn(`[gomanga] No pages found for "${title}" ch${chapterNum} (goId: ${goMangaId})`);
  return { pages: [], provider: 'GoManga', found: false };
}
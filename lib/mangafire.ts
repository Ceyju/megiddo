/**
 * MangaFire scraper API — lightweight fallback for chapter page images.
 *
 * Self-host the API: https://github.com/MangaFire/MangaFire-API
 * Then set MANGAFIRE_API_BASE=http://localhost:8000/api in .env.local.
 *
 * If MANGAFIRE_API_BASE is not set, all functions return empty results
 * silently — MangaDex remains the primary source.
 */
import type { MDPage } from './mangadex';

const BASE = process.env.MANGAFIRE_API_BASE;

// ── Internal types ─────────────────────────────────────────────────────────

interface MFSearchResult {
  id: string;
  title: string;
  slug?: string;
  url?: string;
}

interface MFChapterResult {
  images?: string[];
  pages?: Array<{ url: string } | string>;
  data?: string[];
  error?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function mfFetch(path: string): Promise<Response | null> {
  if (!BASE) return null;
  try {
    return await fetch(`${BASE}${path}`, { cache: 'no-store' });
  } catch {
    return null;
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function searchMangaFire(title: string): Promise<MFSearchResult[]> {
  const res = await mfFetch(`/search?query=${encodeURIComponent(title)}`);
  if (!res?.ok) return [];
  try {
    const json = await res.json();
    // API may return { results: [...] }, { data: [...] }, or bare array
    return (json.results ?? json.data ?? (Array.isArray(json) ? json : [])) as MFSearchResult[];
  } catch { return []; }
}

export async function getMangaFirePages(mangaId: string, chapter: string): Promise<MDPage[]> {
  const res = await mfFetch(`/manga/${encodeURIComponent(mangaId)}/${encodeURIComponent(chapter)}`);
  if (!res?.ok) return [];
  try {
    const json = await res.json() as MFChapterResult;
    if (json.error) return [];
    const raw: string[] = json.images
      ?? (json.pages?.map(p => (typeof p === 'string' ? p : p.url)))
      ?? json.data
      ?? [];
    return raw.map(url => ({ url, dataSaver: url }));
  } catch { return []; }
}

/**
 * Full pipeline: given a manga title + chapter number, search MangaFire and
 * return page images. Returns empty if MANGAFIRE_API_BASE is not configured.
 */
export async function getMangaFirePagesWithFallback(
  title: string,
  chapter: string,
  altTitles: string[] = [],
): Promise<MDPage[]> {
  if (!BASE) return [];
  for (const term of [title, ...altTitles.slice(0, 2)]) {
    if (!term) continue;
    const results = await searchMangaFire(term);
    if (!results.length) continue;
    const termLower = term.toLowerCase();
    const match = results.find(r => r.title.toLowerCase() === termLower) ?? results[0];
    const pages = await getMangaFirePages(match.id, chapter);
    if (pages.length) return pages;
  }
  return [];
}

import { cache } from 'react';
import { unstable_rethrow } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { outboundFetch, UpstreamError } from './server/outbound';
import { ProviderNotFoundError } from './server/provider-errors';
import type { MDChapter } from './mangadex';
import { WEEBCENTRAL_ORIGIN, parseWeebCentralSearch, parseWeebCentralDetail, parseWeebCentralChapters, parseWeebCentralPages, weebCentralId } from './weebcentral-parsers';
export { weebCentralId } from './weebcentral-parsers';

export function reportWeebCentralFailure(error: unknown, operation: 'catalog' | 'search' | 'detail' | 'reader') {
  if (!(error instanceof UpstreamError)) return;
  const category = error.upstreamStatus === 403 ? 'access-denied'
    : error.upstreamStatus ? 'upstream-http'
    : error.status === 503 ? 'request-budget-or-rate-limit'
    : error.message.startsWith('Weeb Central returned') ? 'response-validation'
    : 'request-failed';
  // Only bounded diagnostic fields: never serialize error messages, URLs or bodies.
  console.warn(`[manga] ${JSON.stringify({ provider: 'weebcentral', operation, category, status: error.status, upstreamStatus: error.upstreamStatus ?? null })}`);
}

async function request(path: string, maxBytes = 2_097_152, cacheHtml = true): Promise<string | null> {
  try {
    return await outboundFetch<string>(`${WEEBCENTRAL_ORIGIN}${path}`, {
      allowedOrigins: [WEEBCENTRAL_ORIGIN], expectedType: 'html', maxBytes, redirect: 'error',
      headers: { Accept: 'text/html', 'User-Agent': process.env.USER_AGENT?.trim() || 'Megiddo/0.1 (personal manga reader)' },
      ...(cacheHtml ? { next: { revalidate: 300 } } : { cache: 'no-store' as const }),
    }) as string;
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof UpstreamError && [404, 410].includes(error.upstreamStatus ?? 0)) return null;
    if (error instanceof UpstreamError) throw error;
    throw new UpstreamError('Weeb Central is temporarily unavailable');
  }
}
export async function searchWeebCentral(query: string, limit = 18, sort: 'Popularity' | 'Latest Updates' | 'Recently Added' | 'Best Match' = 'Best Match') {
  if (query.length > 100 || !Number.isInteger(limit) || limit < 1 || limit > 32) throw new UpstreamError('Invalid Weeb Central search parameters', 400);
  const params = new URLSearchParams({ text: query, sort, order: 'Descending', adult: 'False', limit: '32', offset: '0', display_mode: 'Full Display' });
  for (const type of ['Manga', 'Manhwa', 'Manhua']) params.append('included_type', type);
  const html = await request(`/search/data?${params}`);
  if (html === null) throw new UpstreamError('Weeb Central search is unavailable');
  return parseWeebCentralSearch(html).slice(0, limit);
}
export async function discoverWeebCentral(sort: 'Popularity' | 'Latest Updates' | 'Recently Added', limit = 20) {
  return searchWeebCentral('', limit, sort);
}
// Large series exceed Next's 2 MB fetch-cache entry limit as raw HTML.
// Cache only the compact, validated inventory; keep the original body bounded.
const chapterInventory = unstable_cache(async (id: string) => {
  const html = await request(`/series/${id}/full-chapter-list`, 8_388_608, false);
  if (html === null) throw new UpstreamError('Weeb Central chapter inventory is unavailable');
  return parseWeebCentralChapters(html);
}, ['weebcentral-inventory-v1'], { revalidate: 300 });

export const getWeebCentralDetail = cache(async (mangaId: string) => {
  const id = weebCentralId(mangaId);
  const html = await request(`/series/${id}`);
  if (html === null) return null;
  const manga = parseWeebCentralDetail(html, mangaId);
  if (!manga) return null;
  const chapters = await chapterInventory(id);
  return { manga: { ...manga, latestChapter: chapters.at(-1)?.chapter ?? null }, chapters, complete: true };
});
export async function getWeebCentralChapterInventory(mangaId: string, chapterId: string) {
  weebCentralId(chapterId);
  const data = await getWeebCentralDetail(mangaId);
  if (!data || !data.chapters.some(chapter => chapter.id === chapterId)) return null;
  return data;
}
export async function getWeebCentralPages(mangaId: string, chapter: MDChapter) {
  weebCentralId(mangaId);
  const id = weebCentralId(chapter.id);
  const data = await getWeebCentralChapterInventory(mangaId, chapter.id);
  if (!data || chapter.provider !== 'Weeb Central') throw new ProviderNotFoundError('Chapter not found in this series');
  const html = await request(`/chapters/${id}/images?is_prev=False&reading_style=long_strip`);
  if (html === null) throw new ProviderNotFoundError('Chapter pages are unavailable');
  return parseWeebCentralPages(html, chapter.id);
}

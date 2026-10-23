import { cache } from 'react';
import type { MDManga, MDChapter, MDPage } from './mangadex';
import { serverBaseUrl } from './server/env';
import { outboundFetch, UpstreamError } from './server/outbound';
import { ProviderNotFoundError } from './server/provider-errors';
import { stripTags } from './novel-parsers';

interface Series {
  id: string; title: string; type: string; medium: string; isAdult: boolean;
  mbContentRating?: string; status?: string; synopsis?: string; description?: string;
  image?: string; poster?: string | { image?: string; largeImage?: string }; otherNames?: string[];
  genres?: Array<{ name: string }>; released?: number; year?: number;
  anilistId?: string; malId?: string; mangaUpdatesId?: string;
  totalChapterCount?: number; scanlators?: Array<{ id: string; name: string }>;
}
interface Release {
  id: string; scanlationMangaId: string; title: string; number: number;
  index: number; pageCount: number; createdAt?: number;
}
const TYPES: Record<string, MDManga['type']> = { Manga: 'manga', Manwha: 'manhwa', Manhwa: 'manhwa', Manhua: 'manhua' };
const validId = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value);
const qualified = (id: string) => `atsumaru:${id}`;

export function atsumaruId(value: string): string {
  const raw = value.startsWith('atsumaru:') ? value.slice(9) : '';
  if (!validId(raw)) throw new ProviderNotFoundError('Invalid Atsumaru identifier');
  return raw;
}
function required(value: unknown, message: string): asserts value {
  if (!value) throw new UpstreamError(`Atsumaru returned ${message}`);
}
async function request<T>(path: string, maxBytes = 1_048_576): Promise<T | null> {
  try {
    const base = serverBaseUrl('ATSUMARU_BASE_URL') ?? 'https://atsu.moe';
    return await outboundFetch<T>(`${base}${path}`, { allowedOrigins: [new URL(base).origin], expectedType: 'json', maxBytes,
      headers: { Accept: 'application/json' }, next: { revalidate: 300 } }) as T;
  } catch (error) {
    if (error instanceof UpstreamError && [404, 410].includes(error.upstreamStatus ?? 0)) return null;
    console.error(`[manga] ${JSON.stringify({ provider: 'atsumaru', category: 'request', upstreamStatus: error instanceof UpstreamError ? error.upstreamStatus : undefined })}`);
    if (error instanceof UpstreamError) throw error;
    throw new UpstreamError('Atsumaru is temporarily unavailable');
  }
}
function readable(series: Series) {
  required(series && typeof series.medium === 'string' && typeof series.type === 'string' && typeof series.isAdult === 'boolean', 'invalid series classification');
  return series.medium === 'Comic' && !!TYPES[series.type] && series.isAdult === false && !['Erotica', 'Pornographic'].includes(series.mbContentRating ?? '');
}
function asset(path: string): string {
  const base = serverBaseUrl('ATSUMARU_IMAGE_BASE_URL') ?? 'https://cdn.atsu.moe';
  // Poster fields omit the CDN's /static prefix; chapter pages already include it.
  const resolvedPath = /^\/?posters\//.test(path) ? `/static/${path.replace(/^\//, '')}` : path;
  const url = new URL(resolvedPath, `${base}/`);
  required(url.origin === new URL(base).origin && !url.username && !url.password && url.protocol === 'https:', 'an unapproved image URL');
  return url.href;
}
function toManga(series: Series): MDManga {
  required(validId(series.id) && typeof series.title === 'string' && series.title.trim(), 'invalid series metadata');
  const poster = typeof series.poster === 'string' ? series.poster : series.poster?.largeImage ?? series.poster?.image;
  return { id: qualified(series.id), title: series.title, altTitles: series.otherNames ?? [], description: stripTags(series.synopsis ?? series.description ?? ''),
    status: series.status?.toLowerCase() ?? '', contentRating: series.mbContentRating === 'Suggestive' ? 'suggestive' : 'safe',
    tags: [...new Set(series.genres?.map(g => g.name) ?? [])], coverUrl: poster || series.image ? asset(poster ?? series.image!) : null,
    type: TYPES[series.type], year: series.year ?? (series.released ? new Date(series.released).getUTCFullYear() : null), latestChapter: null,
    externalIds: { anilist: series.anilistId, mal: series.malId, mangaUpdates: series.mangaUpdatesId } };
}
export async function discoverAtsumaru(sort: 'popular' | 'recentlyUpdated' | 'topRated', limit = 20) {
  const params = new URLSearchParams({ offset: '0', limit: String(limit), mediums: 'Comic', types: 'Manga,Manwha,Manhua' });
  const data = await request<{ items: Series[] }>(`/api/home2/${sort}?${params}`);
  required(data && Array.isArray(data.items), 'an invalid discovery response');
  return data.items.filter(readable).map(toManga);
}
export async function searchAtsumaru(query: string, limit = 18) {
  const params = new URLSearchParams({ q: query, query_by: 'title', per_page: String(limit),
    filter_by: 'medium:=Comic && hidden:!=true && isAdult:=false && type:=[Manga,Manwha,Manhua]' });
  const data = await request<{ hits: Array<{ document: Series }> }>(`/collections/manga/documents/search?${params}`);
  required(data && Array.isArray(data.hits) && data.hits.every(hit => hit?.document), 'an invalid search response');
  return data.hits.map(hit => hit.document).filter(readable).map(toManga);
}

// Request-scoped deduplication avoids fetching the same large inventory twice in a render.
const seriesInventory = cache(async (id: string) => {
  const rawId = atsumaruId(id);
  const [data, inventory] = await Promise.all([
    request<{ mangaPage: Series }>(`/api/manga/page?id=${encodeURIComponent(rawId)}`),
    request<{ chapters: Release[] }>(`/api/manga/allChapters?mangaId=${encodeURIComponent(rawId)}`, 8_388_608),
  ]);
  if (!data || data.mangaPage === null) return null;
  required(data.mangaPage && data.mangaPage.id === rawId, 'a different series identity');
  const series = data.mangaPage;
  if (!readable(series)) return null;
  required(inventory && Array.isArray(inventory.chapters) && Array.isArray(series.scanlators), 'an invalid chapter inventory');
  const groups = new Map(series.scanlators.map(group => {
    required(validId(group.id) && typeof group.name === 'string', 'invalid translation metadata');
    return [group.id, group.name];
  }));
  const ids = new Set<string>();
  const chapters: MDChapter[] = inventory.chapters.map(ref => {
    required(ref && validId(ref.id) && !ids.has(ref.id) && groups.has(ref.scanlationMangaId) && typeof ref.title === 'string'
      && Number.isFinite(ref.number) && ref.number >= 0 && Number.isSafeInteger(ref.index) && ref.index >= 0
      && Number.isSafeInteger(ref.pageCount) && ref.pageCount >= 0, 'invalid chapter metadata');
    ids.add(ref.id);
    return { id: qualified(ref.id), chapter: String(ref.number), title: ref.title, volume: null,
      publishAt: ref.createdAt ? new Date(ref.createdAt).toISOString() : '', pages: ref.pageCount, pageCount: ref.pageCount,
      availability: ref.pageCount ? 'hosted' : 'unavailable', provider: 'Atsumaru', externalUrl: null,
      scanlationGroup: groups.get(ref.scanlationMangaId)!, scanlationId: ref.scanlationMangaId, sourceIndex: ref.index };
  });
  // Despite its name, totalChapterCount is the highest chapter label, sometimes a decimal.
  const maxNumber = chapters.reduce((max, chapter) => Math.max(max, Number(chapter.chapter)), 0);
  const complete = series.totalChapterCount == null || maxNumber >= series.totalChapterCount;
  return { manga: toManga(series), chapters, complete, groups };
});

export async function getAtsumaruDetail(id: string, translation?: string) {
  const data = await seriesInventory(id);
  if (!data) return null;
  const translations = [...data.groups].map(([groupId, name]) => ({ id: groupId, name, count: data.chapters.filter(c => c.scanlationId === groupId).length })).filter(g => g.count);
  const selected = translation ?? translations[0]?.id;
  if (translation && !translations.some(group => group.id === translation)) throw new ProviderNotFoundError('Translation not found');
  const chapters = data.chapters.filter(c => c.scanlationId === selected).sort((a, b) => a.sourceIndex! - b.sourceIndex!);
  required(new Set(chapters.map(chapter => chapter.sourceIndex)).size === chapters.length, 'ambiguous chapter ordering');
  return { ...data, manga: { ...data.manga, latestChapter: chapters.at(-1)?.chapter ?? null }, chapters, translations, translation: selected };
}
export async function getAtsumaruChapterInventory(id: string, chapterId: string) {
  atsumaruId(chapterId);
  const data = await seriesInventory(id);
  if (!data) return null;
  const current = data.chapters.find(chapter => chapter.id === chapterId);
  if (!current && !data.complete) throw new UpstreamError('Atsumaru chapter inventory is incomplete');
  if (!current) return null;
  return getAtsumaruDetail(id, current.scanlationId);
}
export async function getAtsumaruPages(mangaId: string, chapter: MDChapter): Promise<MDPage[]> {
  const id = atsumaruId(mangaId), chapterId = atsumaruId(chapter.id);
  const data = await request<{ readChapter: { id: string; number: number; scanlationMangaId: string; pages: Array<{ image: string; width: number; height: number; number: number }> } }>(`/api/read/chapter?mangaId=${encodeURIComponent(id)}&chapterId=${encodeURIComponent(chapterId)}`);
  if (!data || data.readChapter === null) throw new ProviderNotFoundError('Chapter no longer available');
  const reading = data.readChapter;
  required(reading?.id === chapterId && String(reading.number) === chapter.chapter && reading.scanlationMangaId === chapter.scanlationId, 'a different chapter identity');
  required(Array.isArray(reading.pages) && reading.pages.length > 0, 'empty chapter pages');
  return reading.pages.map((page, index) => {
    required(page && typeof page.image === 'string' && page.number === index && Number.isSafeInteger(page.width) && page.width > 0 && Number.isSafeInteger(page.height) && page.height > 0, 'invalid page metadata');
    return { url: asset(page.image), width: page.width, height: page.height };
  });
}

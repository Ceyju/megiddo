import type { NFNovel, NFChapterContent, NFListNovel, NovelChaptersResponse } from './novelfire';
import { readStoryParagraphs, stripTags } from './novel-parsers';
import { serverBaseUrl } from './server/env';
import { outboundFetch, UpstreamError } from './server/outbound';
import { ProviderNotFoundError } from './server/provider-errors';
import { isNovelSlug } from './novel-slug';

interface Chapter {
  id: string;
  slug: string;
  name: string;
  number: number | null;
  updated_at?: string;
}
interface Title {
  id: string;
  slug: string;
  name: string;
  cover?: string;
  status?: string;
  summary?: string;
  rating?: number;
  stats?: { chapters_count?: number; views?: number };
  genres?: Array<{ name: string }>;
  authors?: Array<{ name: string }>;
  latest_chapters?: Chapter[];
  updated_at?: string;
}

function required(condition: unknown, message: string): asserts condition {
  if (!condition) {
    console.error(`[novels] ${JSON.stringify({ provider: 'novelbuddy', category: 'schema', reason: message })}`);
    throw new UpstreamError(`NovelBuddy returned ${message}`);
  }
}

async function request<T>(path: string, operation: string, maxBytes = 1_048_576): Promise<T | null> {
  try {
    const base = serverBaseUrl('NOVELBUDDY_API_BASE') ?? 'https://api.novelbuddy.me';
    const response = await outboundFetch<{ success: boolean; data: T }>(`${base}${path}`, {
      allowedOrigins: [new URL(base).origin], expectedType: 'json', maxBytes,
      headers: { Accept: 'application/json' }, next: { revalidate: 1800 },
    }) as { success: boolean; data: T };
    required(response?.success === true && response.data && typeof response.data === 'object', 'an invalid API response');
    return response.data;
  } catch (error) {
    if (error instanceof UpstreamError && error.upstreamStatus === 404) return null;
    console.error(`[novels] ${JSON.stringify({ provider: 'novelbuddy', operation,
      category: error instanceof UpstreamError ? 'upstream' : typeof error === 'object' && error !== null && 'name' in error && error.name === 'TimeoutError' ? 'timeout' : 'request',
      upstreamStatus: error instanceof UpstreamError ? error.upstreamStatus : undefined })}`);
    if (error instanceof UpstreamError) throw error;
    throw new UpstreamError('NovelBuddy request failed');
  }
}

function checkedTitle(value: Title): Title {
  required(value && typeof value.id === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value.id) && isNovelSlug(value.slug) && typeof value.name === 'string' && value.name.trim(), 'invalid title metadata');
  return value;
}

async function titleBySlug(slug: string) {
  // Resolve the exact source slug; fuzzy search could silently select a different edition.
  const data = await request<{ title: Title }>(`/titles/by-slug/${encodeURIComponent(slug)}?include=details`, 'metadata');
  if (data === null) return null;
  const title = checkedTitle(data.title);
  required(title.slug === slug, 'a different novel identity');
  return title;
}

function cover(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.origin === 'https://rs.novelbuddy.me' ? url.toString() : null;
  } catch { return null; }
}

function numberOf(chapter: Chapter): number {
  const value = chapter.number ?? chapter.slug?.match(/^chapter-(\d+(?:\.\d+)?)(?:-|$)/)?.[1];
  required(value !== undefined && value !== null && /^\d{1,4}(?:\.\d{1,3})?$/.test(String(value)), 'unsupported chapter numbering');
  return Number(value);
}
const publicChapter = (chapter: Chapter) => `chapter-${numberOf(chapter)}`;

async function inventory(title: Title): Promise<Chapter[]> {
  // The upstream returns the full inventory. Bound large novels separately from small JSON responses.
  const data = await request<{ chapters: Chapter[] }>(`/titles/${title.id}/chapters`, 'inventory', 8_388_608);
  required(data && Array.isArray(data.chapters), 'an invalid chapter inventory');
  const numbers = new Set<number>();
  for (const chapter of data.chapters) {
    required(chapter && typeof chapter.id === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(chapter.id) && typeof chapter.name === 'string', 'invalid chapter metadata');
    const number = numberOf(chapter);
    required(!numbers.has(number), 'ambiguous chapter numbering');
    numbers.add(number);
  }
  required(data.chapters.length >= (title.stats?.chapters_count ?? 0), 'an incomplete chapter inventory');
  return data.chapters.sort((a, b) => numberOf(a) - numberOf(b));
}

export async function getBuddyNovel(slug: string): Promise<NFNovel | null> {
  const title = await titleBySlug(slug);
  if (!title) return null;
  return { slug, title: title.name, coverUrl: cover(title.cover), author: title.authors?.map(a => a.name).join(', ') || null,
    description: title.summary ? stripTags(title.summary) : null, status: title.status ?? null,
    genres: [...new Set(title.genres?.map(g => g.name) ?? [])], chapterCount: title.stats?.chapters_count ?? null,
    novelUrl: `https://novelbuddy.me/${title.slug}` };
}

export async function listBuddyNovels(sort: 'popular' | 'views' | 'latest' | 'rating' = 'popular', query?: string) {
  const params = new URLSearchParams({ sort, limit: '20' });
  if (query) { params.set('q', query); params.delete('sort'); }
  const data = await request<{ items: Title[] }>(`/titles/search?${params}`, query ? 'search' : `discovery:${sort}`);
  required(data && Array.isArray(data.items), 'an invalid novel list');
  return data.items.map(item => {
    const title = checkedTitle(item);
    return { slug: title.slug, title: title.name, coverUrl: cover(title.cover), status: title.status ?? null,
      genres: [...new Set(title.genres?.map(g => g.name) ?? [])], latestChapter: title.latest_chapters?.[0]?.name ?? null,
      views: title.stats?.views == null ? null : String(title.stats.views), rating: title.rating == null ? null : String(title.rating),
      chapterCount: title.stats?.chapters_count == null ? null : String(title.stats.chapters_count) } satisfies NFListNovel & { chapterCount: string | null };
  });
}

export async function getBuddyChapters(slug: string, page = 1): Promise<NovelChaptersResponse> {
  const title = await titleBySlug(slug);
  if (!title) throw new ProviderNotFoundError('Novel not found');
  const chapters = await inventory(title);
  const latest = chapters.at(-1);
  return { novel: { title: title.name, slug, coverUrl: cover(title.cover), status: title.status ?? null,
    updatedAt: title.updated_at ?? null, totalChapters: chapters.length, totalPages: Math.max(1, Math.ceil(chapters.length / 100)),
    latestChapter: latest ? { title: latest.name, slug: publicChapter(latest) } : null },
    chapters: chapters.slice((page - 1) * 100, page * 100).map(chapter => ({ title: chapter.name, number: numberOf(chapter),
      slug: publicChapter(chapter), timeAgo: chapter.updated_at ?? null })) };
}

export async function getBuddyChapter(slug: string, chapterSlug: string): Promise<NFChapterContent | null> {
  const title = await titleBySlug(slug);
  if (!title) return null;
  const chapters = await inventory(title);
  const ref = chapters.find(chapter => publicChapter(chapter) === chapterSlug);
  if (!ref) return null;
  const data = await request<{ chapter: Chapter & { content: string }; previous_chapter: Chapter | null; next_chapter: Chapter | null }>(`/titles/${title.id}/chapters/${ref.id}`, 'chapter');
  if (!data) return null;
  required(data.chapter?.id === ref.id && numberOf(data.chapter) === numberOf(ref) && typeof data.chapter.content === 'string', 'invalid chapter content');
  const paragraphs = readStoryParagraphs(data.chapter.content);
  required(paragraphs.length, 'empty chapter content');
  const navigation = (value: Chapter | null) => {
    if (value === null) return null;
    const chapter = chapters.find(c => c.id === value?.id);
    required(chapter, 'invalid chapter navigation');
    return publicChapter(chapter);
  };
  return { title: ref.name, chapterNumber: String(numberOf(ref)), paragraphs, content: paragraphs.join('\n\n'),
    prevChapterSlug: navigation(data.previous_chapter), nextChapterSlug: navigation(data.next_chapter),
    wordCount: paragraphs.join(' ').split(/\s+/).length };
}

import { serverBaseUrl } from './server/env';
import { outboundFetch, UpstreamError } from './server/outbound';
import { ProviderNotFoundError } from './server/provider-errors';
import { readNovelHtml, readChaptersHtml, readChapterHtml, readNovelListHtml } from './novel-parsers';
import { getBuddyNovel, getBuddyChapters, getBuddyChapter, listBuddyNovels } from './novelbuddy';
export { extractMeta, stripTags } from './novel-parsers';

export interface NFNovel {
  title: string;
  slug: string;
  coverUrl: string | null;
  author: string | null;
  description: string | null;
  status: string | null;
  genres: string[];
  chapterCount: number | null;
  novelUrl: string;
}

export interface NFChapterRef {
  title: string;
  slug: string;
  number: string | null;
  releaseDate: string | null;
  chapterUrl: string;
}

export interface NFChapterContent {
  title: string;
  chapterNumber: string | null;
  content: string;
  paragraphs: string[];
  prevChapterSlug: string | null;
  nextChapterSlug: string | null;
  wordCount: number;
}

// Kept for backward compat with app/webnovels/[novelSlug]/page.tsx
export interface NFNovelInfo {
  title: string;
  slug: string;
  coverUrl: string | null;
  status: string | null;
  updatedAt: string | null;
  totalChapters: number | null;
  totalPages: number;
  latestChapter: { title: string; slug: string } | null;
}
export interface NFChapter {
  number: number;
  title: string;
  slug: string;
  timeAgo: string | null;
}


export interface NFListNovel {
  slug: string;
  title: string;
  coverUrl: string | null;
  status: string | null;
  genres: string[];
  latestChapter: string | null;
  views: string | null;
  rating: string | null;
}

export interface NovelChaptersResponse {
  novel: NFNovelInfo;
  chapters: NFChapter[];
}

const baseUrl = () => serverBaseUrl('NOVELFIRE_API_BASE') ?? 'https://novelfire.net';

// Keep the existing import path and response contracts for readers and saved progress.
function isNovelBuddy() {
  const provider = process.env.NOVEL_PROVIDER?.trim() || 'novelbuddy';
  if (provider !== 'novelbuddy' && provider !== 'novelfire') {
    console.error(`[novels] ${JSON.stringify({ category: 'configuration', setting: 'NOVEL_PROVIDER' })}`);
    throw new UpstreamError('Invalid novel provider configuration', 500);
  }
  return provider === 'novelbuddy';
}

export async function nfFetch(path: string): Promise<string | null> {
  try {
    const base = baseUrl();
    return await outboundFetch(`${base}${path}`, {
      allowedOrigins: [new URL(base).origin], expectedType: 'html',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Megiddo/1.0)', Accept: 'text/html',
        Referer: process.env.NOVELFIRE_API_REFERER ?? `${base}/`,
      },
      next: { revalidate: 1800 },
    }) as string;
  } catch (error) {
    if (error instanceof UpstreamError && error.upstreamStatus === 404) return null;
    console.error(`[novels] ${JSON.stringify({ provider: 'novelfire', category: error instanceof UpstreamError ? 'upstream' : 'request',
      upstreamStatus: error instanceof UpstreamError ? error.upstreamStatus : undefined })}`);
    if (error instanceof UpstreamError) throw error;
    throw new UpstreamError('Novel provider request failed');
  }
}

export async function parseNovel(slug: string): Promise<NFNovel | null> {
  if (isNovelBuddy()) return getBuddyNovel(slug);
  const html = await nfFetch(`/book/${slug}`);
  return html === null ? null : readNovelHtml(html, slug, baseUrl());
}

export async function parseChapterList(slug: string, page = 1) {
  if (isNovelBuddy()) {
    const result = await getBuddyChapters(slug, page);
    return { totalPages: result.novel.totalPages, latestChapter: result.novel.latestChapter,
      chapters: result.chapters.map(chapter => ({ ...chapter, number: String(chapter.number), releaseDate: chapter.timeAgo,
        chapterUrl: `/webnovels/${slug}/${chapter.slug}` })) };
  }
  const html = await nfFetch(`/book/${slug}/chapters?page=${page}`);
  if (html === null) throw new ProviderNotFoundError('Chapter list not found');
  return readChaptersHtml(html, slug, baseUrl());
}

export async function parseChapterContent(slug: string, chapterSlug: string): Promise<NFChapterContent | null> {
  if (isNovelBuddy()) return getBuddyChapter(slug, chapterSlug);
  const html = await nfFetch(`/book/${slug}/${chapterSlug}`);
  return html === null ? null : readChapterHtml(html, slug, chapterSlug, baseUrl());
}

export async function searchNovels(query: string) {
  if (isNovelBuddy()) return (await listBuddyNovels('popular', query)).map(novel => ({
    title: novel.title, slug: novel.slug, cover: novel.coverUrl, status: novel.status, chapterCount: novel.chapterCount,
  }));
  const html = await nfFetch(`/search?keyword=${encodeURIComponent(query)}&type=title`);
  if (html === null) throw new UpstreamError('Novel search endpoint is unavailable');
  return readNovelListHtml(html, baseUrl()).map(novel => ({
    title: novel.title, slug: novel.slug, cover: novel.coverUrl,
    status: novel.status, chapterCount: novel.chapterCount,
  }));
}

async function discovery(path: string): Promise<NFListNovel[]> {
  const html = await nfFetch(path);
  if (html === null) throw new UpstreamError('Novel discovery endpoint is unavailable');
  return readNovelListHtml(html, baseUrl());
}

export const getPopularNovels = () => isNovelBuddy() ? listBuddyNovels('popular') : discovery('/ranking');
export const getTopUpdatedNovels = () => isNovelBuddy() ? listBuddyNovels('latest') : discovery('/latest-release-novels');
export const getMostReadNovels = () => isNovelBuddy() ? listBuddyNovels('views') : discovery('/ranking/most-read');
export const getTopRatedNovels = () => isNovelBuddy() ? listBuddyNovels('rating') : discovery('/ranking/ratings');

export async function getNovelChapters(slug: string, page = 1): Promise<NovelChaptersResponse> {
  if (isNovelBuddy()) return getBuddyChapters(slug, page);
  const [novel, listing] = await Promise.all([parseNovel(slug), parseChapterList(slug, page)]);
  if (!novel) throw new ProviderNotFoundError('Novel not found');
  return {
    novel: {
      title: novel.title, slug, coverUrl: novel.coverUrl, status: novel.status,
      updatedAt: null, totalChapters: novel.chapterCount,
      totalPages: listing.totalPages, latestChapter: listing.latestChapter,
    },
    chapters: listing.chapters.map(chapter => ({
      number: Number(chapter.number), title: chapter.title, slug: chapter.slug, timeAgo: chapter.releaseDate,
    })).sort((a, b) => a.number - b.number),
  };
}

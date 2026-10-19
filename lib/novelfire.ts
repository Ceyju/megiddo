import { serverBaseUrl } from './server/env';
import { outboundFetch, UpstreamError } from './server/outbound';
import { ProviderNotFoundError } from './server/provider-errors';
import { readNovelHtml, readChaptersHtml, readChapterHtml, readNovelListHtml } from './novel-parsers';
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

export async function nfFetch(path: string): Promise<string | null> {
  const base = baseUrl();
  try {
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
    if (error instanceof UpstreamError) throw error;
    throw new UpstreamError('Novel provider request failed');
  }
}

export async function parseNovel(slug: string): Promise<NFNovel | null> {
  const html = await nfFetch(`/book/${slug}`);
  return html === null ? null : readNovelHtml(html, slug, baseUrl());
}

export async function parseChapterList(slug: string, page = 1) {
  const html = await nfFetch(`/book/${slug}/chapters?page=${page}`);
  if (html === null) throw new ProviderNotFoundError('Chapter list not found');
  return readChaptersHtml(html, slug, baseUrl());
}

export async function parseChapterContent(slug: string, chapterSlug: string): Promise<NFChapterContent | null> {
  const html = await nfFetch(`/book/${slug}/${chapterSlug}`);
  return html === null ? null : readChapterHtml(html, slug, chapterSlug, baseUrl());
}

export async function searchNovels(query: string) {
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

export const getPopularNovels = () => discovery('/ranking');
export const getTopUpdatedNovels = () => discovery('/latest-release-novels');
export const getMostReadNovels = () => discovery('/ranking/most-read');
export const getTopRatedNovels = () => discovery('/ranking/ratings');

export async function getNovelChapters(slug: string, page = 1): Promise<NovelChaptersResponse> {
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

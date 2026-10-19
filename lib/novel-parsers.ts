import { load, type CheerioAPI } from 'cheerio';
import type { NFNovel, NFChapterRef, NFChapterContent, NFListNovel } from './novelfire';
import { UpstreamError } from './server/outbound';

const clean = (value: string) => value.replace(/\s+/g, ' ').trim();
const count = (value: string | undefined) => {
  const digits = value?.match(/[\d,]+/)?.[0]?.replaceAll(',', '');
  return digits ? Number(digits) : null;
};

function document(html: string): CheerioAPI {
  const $ = load(html);
  if (/just a moment|checking your browser|access denied/i.test($('title').text()) || $('#challenge-form').length) {
    throw new UpstreamError('Novel provider returned a challenge page');
  }
  return $;
}

function required(present: boolean, label: string) {
  if (!present) throw new UpstreamError(`Novel provider returned an unexpected ${label} page`);
}

function httpsUrl(value: string | undefined, base: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, base);
    if (url.protocol === 'http:') url.protocol = 'https:';
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : null;
  } catch { return null; }
}

function chapterLink(value: string | undefined, slug: string, base: string) {
  const resolved = httpsUrl(value, base);
  if (!resolved) return null;
  const url = new URL(resolved);
  if (url.origin !== new URL(base).origin) return null;
  const prefix = `/book/${slug}/`;
  if (!url.pathname.startsWith(prefix)) return null;
  const chapter = url.pathname.slice(prefix.length).replace(/\/$/, '');
  return /^chapter-\d{1,4}(?:\.\d{1,3})?$/.test(chapter) ? chapter : null;
}

export function extractMeta(html: string, property: string): string | null {
  const $ = load(html);
  return $('meta').filter((_, el) => $(el).attr('property') === property || $(el).attr('name') === property).first().attr('content')?.trim() || null;
}

export function stripTags(html: string): string {
  const $ = load(html);
  $('script,style').remove();
  return clean($.root().text());
}

export function readNovelHtml(html: string, slug: string, base: string): NFNovel {
  const $ = document(html);
  const header = $('.novel-header').first();
  required(header.length > 0 && header.find('h1').length > 0, 'novel');
  const stats = (name: string) => header.find('.header-stats span').filter((_, el) => clean($(el).find('small').text()).toLowerCase() === name).find('strong').text();
  return {
    slug,
    title: clean(header.find('h1').first().text()),
    coverUrl: httpsUrl(header.find('.cover img').attr('data-src') || header.find('.cover img').attr('src') || extractMeta(html, 'og:image') || undefined, base),
    author: clean(header.find('.author a').text()) || null,
    description: clean($('.summary .content, .summary').first().text()) || extractMeta(html, 'og:description'),
    status: clean(stats('status')) || null,
    genres: header.find('.categories a').map((_, el) => clean($(el).text())).get(),
    chapterCount: count(stats('chapters')),
    novelUrl: `${base}/book/${slug}`,
  };
}

export function readChaptersHtml(html: string, slug: string, base: string) {
  const $ = document(html);
  required($('.chapter-list').length > 0, 'chapter list');
  const seen = new Set<string>();
  const chapters: NFChapterRef[] = [];
  $('.chapter-list a[href]').each((_, el) => {
    const anchor = $(el);
    const chapter = chapterLink(anchor.attr('href'), slug, base);
    if (!chapter || seen.has(chapter)) return;
    seen.add(chapter);
    chapters.push({
      slug: chapter,
      title: clean(anchor.find('.chapter-title').text() || anchor.attr('title') || anchor.text()),
      number: chapter.slice('chapter-'.length),
      releaseDate: anchor.find('time').attr('datetime') || clean(anchor.find('time').text()) || null,
      chapterUrl: `${base}/book/${slug}/${chapter}`,
    });
  });
  let totalPages = 1;
  $('.pagination a[href], .pagination [aria-current="page"], .pagination .active').each((_, el) => {
    const item = $(el);
    const href = item.attr('href');
    const url = href ? new URL(href, base) : null;
    if (url && (url.origin !== new URL(base).origin || url.pathname !== `/book/${slug}/chapters`)) return;
    const page = url ? Number(url.searchParams.get('page')) : Number(clean(item.text()));
    if (Number.isSafeInteger(page) && page > totalPages) totalPages = page;
  });
  const latestAnchor = $('p').filter((_, el) => /^Latest Release:/i.test(clean($(el).text()))).first().find('a[href]').first();
  const latestSlug = chapterLink(latestAnchor.attr('href'), slug, base);
  const latestChapter = latestSlug ? { slug: latestSlug, title: clean(latestAnchor.text()) } : null;
  return { chapters, totalPages, latestChapter };
}

export function readChapterHtml(html: string, slug: string, chapterSlug: string, base: string): NFChapterContent {
  const $ = document(html);
  // The inner content excludes advertising and the restore-scroll toolbar.
  const content = $('#chapter-container #content, #chr-content, .chapter-content, .reading-content').first();
  required(content.length > 0, 'chapter');
  const story = content.clone();
  story.find('script,style,iframe,ins,nav,button,select,.nf-ads,.ads,.advertisement,.chapternav').remove();
  story.find('br').replaceWith('\n');
  story.find('p,div,blockquote,h2,h3,li').each((_, el) => {
    $(el).before('\n\n');
    $(el).after('\n\n');
  });
  const paragraphs = story.text().split(/\n\s*\n/).map(text => text.split('\n').map(line => line.replace(/[\t\r ]+/g, ' ').trim()).join('\n').trim()).filter(Boolean);
  required(paragraphs.length > 0, 'chapter content');
  const rawTitle = clean($('.chapter-title').first().text()) || extractMeta(html, 'og:title') || chapterSlug;
  let title = rawTitle.replace(/\s*[-|]\s*Novel\s*Fire\s*$/i, '');
  const start = title.search(/\bChapter\b/i);
  if (start > 0) title = title.slice(start);
  const navigation = (rel: 'prev' | 'next') => {
    const anchor = $(`.chapternav a[rel="${rel}"], .chapternav .${rel}chap`).not('.isDisabled,[aria-disabled="true"]').first();
    return chapterLink(anchor.attr('href'), slug, base);
  };
  return {
    title,
    chapterNumber: chapterSlug.slice('chapter-'.length),
    content: paragraphs.join('\n\n'),
    paragraphs,
    prevChapterSlug: navigation('prev'),
    nextChapterSlug: navigation('next'),
    wordCount: paragraphs.join(' ').split(/\s+/).length,
  };
}

export function readNovelListHtml(html: string, base: string, limit = 20) {
  const $ = document(html);
  // Search pages also contain a later "popular novels" recommendation list.
  const lists = $('.rank-novels, .novel-list').first();
  required(lists.length > 0, 'novel list');
  const seen = new Set<string>();
  const novels: Array<NFListNovel & { chapterCount: string | null }> = [];
  lists.children('li').each((_, el) => {
    if (novels.length >= limit) return;
    const card = $(el);
    const anchor = card.find('a[href]').filter((_, a) => {
      const url = httpsUrl($(a).attr('href'), base);
      return !!url && new URL(url).origin === new URL(base).origin && /^\/book\/[a-z0-9-]+\/?$/.test(new URL(url).pathname);
    }).first();
    const resolved = httpsUrl(anchor.attr('href'), base);
    if (!resolved) return;
    const slug = new URL(resolved).pathname.split('/')[2];
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug) || seen.has(slug)) return;
    seen.add(slug);
    const title = clean(card.find('.novel-title, .title').first().text() || anchor.attr('title') || anchor.text());
    if (!title) return;
    const stats = clean(card.find('.novel-stats').text());
    novels.push({
      slug, title,
      coverUrl: httpsUrl(card.find('img').attr('data-src') || card.find('img').attr('src'), base),
      status: clean(card.find('.status').text()) || null,
      genres: card.find('.categories span, .categories a').map((_, genre) => clean($(genre).text())).get(),
      latestChapter: clean(card.find('.chapter-title').text()) || null,
      views: stats.match(/([\d.,]+[KMB]?)\s*(?:views?|reads?)/i)?.[1] || null,
      rating: card.find('[data-rating]').attr('data-rating') || clean(card.find('.rating .nub, .rating .score').text()) || null,
      chapterCount: stats.match(/([\d,]+)\s*chapters?/i)?.[1]?.replaceAll(',', '') || null,
    });
  });
  return novels;
}

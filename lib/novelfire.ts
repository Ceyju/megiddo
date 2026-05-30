const NF_BASE = process.env.NOVELFIRE_API_BASE ?? '';

const FETCH_HEADERS: HeadersInit = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: process.env.NOVELFIRE_API_REFERER ?? '',
};

export async function nfFetch(path: string): Promise<string | null> {
  try {
    const res = await fetch(`${NF_BASE}${path}`, {
      headers: FETCH_HEADERS,
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

export function extractMeta(html: string, property: string): string | null {
  const m =
    html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i')) ??
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${property}["']`, 'i'));
  return m?.[1]?.trim() ?? null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(parseInt(n)));
}

export function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{3,}/g, '\n\n'),
  ).trim();
}

function extractBetween(html: string, start: string, end: string): string | null {
  const s = html.indexOf(start);
  if (s === -1) return null;
  const e = html.indexOf(end, s + start.length);
  if (e === -1) return null;
  return html.slice(s + start.length, e);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

export async function parseNovel(slug: string): Promise<NFNovel | null> {
  const html = await nfFetch(`/book/${slug}`);
  if (!html) return null;

  const title =
    extractMeta(html, 'og:title') ??
    html.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1]?.trim() ??
    'Unknown';

  const rawCoverUrl =
    extractMeta(html, 'og:image') ??
    html.match(/class="book-img[^"]*"[^>]*>\s*<img[^>]+data-src="([^"]+)"/)?.[1] ??
    html.match(/class="book-img[^"]*"[^>]*>\s*<img[^>]+src="([^"]+)"/)?.[1] ??
    html.match(/<img[^>]+class="[^"]*cover[^"]*"[^>]+data-src="([^"]+)"/i)?.[1] ??
    html.match(/<img[^>]+class="[^"]*cover[^"]*"[^>]+src="([^"]+)"/i)?.[1] ??
    html.match(/<img[^>]+data-src="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i)?.[1] ??
    html.match(/<img[^>]+src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i)?.[1] ??
    null;
  // Resolve relative paths (e.g. /server-1/slug.jpg) and enforce HTTPS
  const coverUrl = rawCoverUrl
    ? (rawCoverUrl.startsWith('/')
        ? `${NF_BASE}${rawCoverUrl}`.replace(/^http:\/\//, 'https://')
        : rawCoverUrl.replace(/^http:\/\//, 'https://'))
    : null;

  const description =
    extractMeta(html, 'og:description') ??
    extractMeta(html, 'description') ??
    null;

  const authorMatch =
    html.match(/[Aa]uthor[:\s]+<[^>]+>([^<]+)</) ??
    html.match(/author['"]\s*>\s*([^<]{2,60})</);
  const author = authorMatch?.[1]?.trim() ?? null;

  const statusMatch =
    html.match(/[Ss]tatus[:\s]+<[^>]+>([^<]+)</) ??
    html.match(/(Ongoing|Completed|Hiatus)/);
  const status = statusMatch?.[1]?.trim() ?? null;

  const genreMatches = [...html.matchAll(/class="[^"]*genre[^"]*"[^>]*>([^<]+)</gi)];
  const genres = genreMatches.map(m => m[1].trim()).filter(Boolean).slice(0, 10);

  const chapterCountMatch = html.match(/(\d+)\s*[Cc]hapters?/);
  const chapterCount = chapterCountMatch ? parseInt(chapterCountMatch[1]) : null;

  return {
    title, slug, coverUrl, author,
    description: description ? stripTags(description).slice(0, 800) : null,
    status, genres, chapterCount,
    novelUrl: `${NF_BASE}/book/${slug}`,
  };
}

export async function parseChapterList(
  slug: string,
  page = 1,
): Promise<{ chapters: NFChapterRef[]; totalPages: number }> {
  const html = await nfFetch(`/book/${slug}/chapters?page=${page}`);
  if (!html) return { chapters: [], totalPages: 1 };

  // Pass 1: find every chapter link href — don't require inline text (titles
  // are usually inside nested <span>/<h2> so a single-pass regex misses them)
  const hrefRe = new RegExp(`href="(/book/${slug}/(chapter-[^"?#\\s]+))"`, 'gi');

  const seen = new Set<string>();
  const chapters: NFChapterRef[] = [];
  let m: RegExpExecArray | null;

  while ((m = hrefRe.exec(html)) !== null) {
    const path  = m[1];
    const chSlug = m[2];
    if (seen.has(chSlug)) continue;
    seen.add(chSlug);

    const numMatch = chSlug.match(/chapter-(\d+(?:\.\d+)?)/i);

    // Pass 2: extract title + date from a small context window after the href
    const ctx    = html.slice(m.index, m.index + 600);
    const nearby = html.slice(Math.max(0, m.index - 100), m.index + 600);

    const titleRaw =
      ctx.match(/class="[^"]*(?:chapter-title|ch-name|chapter-name)[^"]*"[^>]*>([^<]{2,120})/i)?.[1] ??
      ctx.match(/<h[2-6][^>]*>([^<]{4,120})<\/h[2-6]>/i)?.[1] ??
      ctx.match(/<span[^>]*>([^<]*[Cc]hapter[^<]{0,80})<\/span>/i)?.[1] ??
      ctx.match(/>\s*([^<]*[Cc]hapter[^<]{0,80})\s*</)?.[1] ??
      (numMatch ? `Chapter ${numMatch[1]}` : chSlug);

    const dateMatch = nearby.match(/(\d{4}-\d{2}-\d{2}|\w+ \d{1,2},\s*\d{4})/);

    chapters.push({
      title: stripTags(titleRaw).trim(),
      slug: chSlug,
      number: numMatch?.[1] ?? null,
      releaseDate: dateMatch?.[1] ?? null,
      chapterUrl: `${NF_BASE}${path}`,
    });
  }

  const lastPageMatch =
    html.match(/page=(\d+)[^"]*"[^>]*>[^<]*[Ll]ast/) ??
    html.match(/href="[^"]*page=(\d+)"[^>]*>\s*»/) ??
    html.match(/page=(\d+)/g)?.slice(-1)[0]?.match(/page=(\d+)/);
  const totalPages = lastPageMatch ? parseInt(lastPageMatch[1]) : 1;

  return { chapters, totalPages };
}

export async function parseChapterContent(
  slug: string,
  chapterSlug: string,
): Promise<NFChapterContent | null> {
  const html = await nfFetch(`/book/${slug}/${chapterSlug}`);
  if (!html) return null;

  // Clean og:title: "Novel Name - Chapter X – Title - Novel Fire" → "Chapter X – Title"
  const rawTitle =
    extractMeta(html, 'og:title') ??
    html.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1]?.trim() ??
    chapterSlug;
  let title = rawTitle.replace(/\s*[-|]\s*Novel\s*Fire\s*$/i, '').trim();
  const chapterTitleIdx = title.search(/\bChapter\b/i);
  if (chapterTitleIdx > 0) title = title.slice(chapterTitleIdx).trim();

  const numMatch =
    chapterSlug.match(/chapter-(\d+(?:\.\d+)?)/i) ??
    title.match(/[Cc]hapter\s+(\d+(?:\.\d+)?)/);
  const chapterNumber = numMatch?.[1] ?? null;

  // Truncate at reliable end-of-content markers only.
  const footerIdx = html.search(
    /Tip:\s+You can use|class="chapter-comments|id="footer[^a-z]|class="footer[^a-z]/i,
  );
  const body = footerIdx > 0 ? html.slice(0, footerIdx) : html;

  let contentHtml =
    extractBetween(body, 'class="chapter-content">', '</div>') ??
    extractBetween(body, 'id="chr-content">', '</div>') ??
    extractBetween(body, 'id="chapter-container">', '</div>') ??
    extractBetween(body, 'class="content">', '<div class="chapter-end') ??
    extractBetween(body, '<div class="reading-content">', '</div>') ??
    null;

  if (!contentHtml) {
    // Fallback: keep the full <p>…</p> tags so the split below still works
    const pMatches = [...body.matchAll(/<p[^>]*>[\s\S]*?<\/p>/gi)];
    contentHtml = pMatches.filter(m => m[0].length > 80).map(m => m[0]).join('\n');
  }

  const rawParagraphs = (contentHtml ?? '').split(/<\/p>|<br\s*\/?>/gi);
  const paragraphs = rawParagraphs
    .map(p => stripTags(p).trim())
    .filter(p => p.length > 20)
    // Navigation breadcrumbs collapse into multi-line blobs — skip them
    .filter(p => !p.includes('\n\n'))
    .filter(p => {
      const lower = p.toLowerCase();
      return (
        !lower.includes('novelfire') &&
        !lower.includes('𝘯𝘰𝘷𝘦𝘭') &&
        !lower.includes('updated by') &&
        !lower.includes('tip: you can use') &&
        !lower.includes('novel ranking') &&
        !lower.includes('latest chapters') &&
        !lower.includes('privacy policy') &&
        !lower.includes('terms of service') &&
        !lower.includes('if you find any errors') &&
        !lower.includes('made with') &&
        !lower.includes('disclaimer:')
      );
    });

  const prevMatch = html.match(/href="([^"]*\/book\/[^"]+\/chapter-\d[^"]*)"[^>]*>[^<]*[Pp]rev/);
  const nextMatch = html.match(/href="([^"]*\/book\/[^"]+\/chapter-\d[^"]*)"[^>]*>[^<]*[Nn]ext/);
  const extractChSlug = (url: string) => url.split('/').pop() ?? null;

  const currNum = parseInt(chapterSlug.replace('chapter-', ''));
  const prevSlug = prevMatch
    ? extractChSlug(prevMatch[1])
    : currNum > 1 ? `chapter-${currNum - 1}` : null;
  const hasNext = nextMatch !== null || html.includes(`chapter-${currNum + 1}`);
  const nextSlug = nextMatch ? extractChSlug(nextMatch[1]) : `chapter-${currNum + 1}`;

  return {
    title, chapterNumber,
    content: paragraphs.join('\n\n'),
    paragraphs,
    prevChapterSlug: prevSlug,
    nextChapterSlug: hasNext ? nextSlug : null,
    wordCount: paragraphs.join(' ').split(/\s+/).filter(Boolean).length,
  };
}

export async function searchNovels(query: string): Promise<Array<{ title: string; slug: string; cover: string | null; status: string | null; chapterCount: string | null }>> {
  const html = await nfFetch(`/search?q=${encodeURIComponent(query)}`);
  if (!html) return [];

  const results: Array<{ title: string; slug: string; cover: string | null; status: string | null; chapterCount: string | null }> = [];
  const seen = new Set<string>();
  const cardRe = /href="\/book\/([a-z0-9-]+)"[^>]*>[\s\S]*?class="[^"]*(?:novel|book)[^"]*title[^"]*"[^>]*>([^<]+)</gi;
  let m;
  while ((m = cardRe.exec(html)) !== null && results.length < 20) {
    const sl = m[1];
    if (seen.has(sl)) continue;
    seen.add(sl);
    const slice = html.slice(Math.max(0, m.index - 500), m.index + 1000);
    const imgMatch = slice.match(/src="(https?:\/\/[^"]+)"/i);
    const statusMatch = slice.match(/(?:Ongoing|Completed|Hiatus)/i);
    const chMatch = slice.match(/(\d[\d,]*)\s+Chapters?/i);
    results.push({
      slug: sl, title: m[2].trim(),
      cover: imgMatch ? imgMatch[1] : null,
      status: statusMatch ? statusMatch[0] : null,
      chapterCount: chMatch ? chMatch[1].replace(/,/g, '') : null,
    });
  }
  return results;
}

// ---------------------------------------------------------------------------
// Browse / Discovery Lists
// ---------------------------------------------------------------------------

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

async function fetchFirstHtml(paths: string[]): Promise<string | null> {
  for (const path of paths) {
    const html = await nfFetch(path);
    if (html) return html;
  }
  return null;
}

function parseNovelListHtml(html: string, limit = 20): NFListNovel[] {
  const webnovels: NFListNovel[] = [];
  const seen = new Set<string>();
  const linkRe = /href="\/book\/([a-z0-9][a-z0-9-]{0,78})"/g;
  let m: RegExpExecArray | null;

  while ((m = linkRe.exec(html)) !== null && webnovels.length < limit) {
    const slug = m[1];
    if (seen.has(slug) || slug.includes('chapter')) continue;
    seen.add(slug);

    const pos = m.index;
    const ctx = html.slice(Math.max(0, pos - 500), pos + 700);

    const titleMatch =
      ctx.match(/class="[^"]*(?:novel-title|book-title|title)[^"]*"[^>]*>(?:<[^>]+>)?([^<]{2,140})/) ??
      ctx.match(/<h[2-5][^>]*>(?:<[^>]+>)?([^<]{2,140})/) ??
      ctx.match(/alt="([^"]{2,140})"/);

    if (!titleMatch?.[1]) continue;
    const title = stripTags(titleMatch[1]).trim();
    if (title.length < 2) continue;

    // data-src may be a relative path like /server-1/slug.jpg
    const coverRaw =
      ctx.match(/data-src="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i)?.[1] ??
      ctx.match(/src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)(?:\?[^"]{0,80})?)"/i)?.[1] ??
      null;
    const coverUrl = coverRaw
      ? (coverRaw.startsWith('/')
          ? `${NF_BASE}${coverRaw}`.replace(/^http:\/\//, 'https://')
          : coverRaw.replace(/^http:\/\//, 'https://'))
      : null;

    const statusMatch = ctx.match(/\b(Ongoing|Completed|Hiatus)\b/i);
    const chapMatch   = ctx.match(/[Cc]hapter[-\s]+(\d+(?:\.\d+)?)/);
    const viewMatch   = ctx.match(/([\d.,]+[KMB]?)\s*(?:views?|reads?)/i);
    const ratingMatch =
      ctx.match(/class="[^"]*(?:score|rating|point|stars?)[^"]*"[^>]*>\s*([\d]+\.[\d]+)/) ??
      ctx.match(/(?:★|⭐)\s*([\d]+\.[\d]+)/) ??
      ctx.match(/data-(?:score|rating)="([\d]+\.[\d]+)"/);
    const genreMatches = [...ctx.matchAll(/class="[^"]*genre[^"]*"[^>]*>([^<]{2,40})</gi)];
    const genres = genreMatches.map(gm => gm[1].trim()).filter(Boolean).slice(0, 4);

    webnovels.push({
      slug,
      title,
      coverUrl,
      status: statusMatch?.[1] ?? null,
      genres,
      latestChapter: chapMatch ? `Chapter ${chapMatch[1]}` : null,
      views: viewMatch?.[1] ?? null,
      rating: ratingMatch?.[1] ?? null,
    });
  }
  return webnovels;
}

export async function getPopularNovels(): Promise<NFListNovel[]> {
  const html = await fetchFirstHtml([
    '/popular',
    '/novel-list?type=popular',
    '/most-popular',
    '/ranking',
    '/novel-list',
    '/top-view?time=monthly',
    '/ranking?type=rating',
  ]);
  if (!html) return [];
  return parseNovelListHtml(html, 20);
}

export async function getTopUpdatedNovels(): Promise<NFListNovel[]> {
  const html = await fetchFirstHtml([
    '/latest-updates',
    '/recently-updated',
    '/novel-list?type=updated',
    '/novel-list?sort=latest',
    '/top-view?time=daily',
    '/top-view?time=weekly',
    '/popular',
    '/ranking',
  ]);
  if (!html) return [];
  return parseNovelListHtml(html, 20);
}

export async function getTopReadMonthly(): Promise<NFListNovel[]> {
  const html = await fetchFirstHtml(['/top-view?time=monthly', '/most-read?period=monthly', '/ranking?period=monthly', '/popular']);
  if (!html) return [];
  return parseNovelListHtml(html, 20);
}

export async function getTopRatedNovels(): Promise<NFListNovel[]> {
  const html = await fetchFirstHtml(['/ranking?type=rating', '/top-rated', '/best-webnovels', '/rating']);
  if (!html) return [];
  return parseNovelListHtml(html, 20);
}

// ---------------------------------------------------------------------------
// Backward compat for app/webnovels/[novelSlug]/page.tsx
// ---------------------------------------------------------------------------

export async function getNovelChapters(slug: string, page = 1): Promise<{ novel: NFNovelInfo; chapters: NFChapter[] }> {
  const [novel, chapterData] = await Promise.all([
    parseNovel(slug),
    parseChapterList(slug, page),
  ]);
  if (!novel) throw new Error('Novel not found');

  const raw = chapterData.chapters;

  // Latest chapter = highest chapter number in the fetched set (source is newest-first)
  const latestRaw = raw.length > 0
    ? raw.reduce((a, b) =>
        parseFloat(a.number ?? '0') >= parseFloat(b.number ?? '0') ? a : b,
      )
    : null;

  // Sort ascending so page 1 shows the earliest chapters first
  const chapters: NFChapter[] = raw
    .map(ch => ({
      number: parseInt(ch.number ?? '0'),
      title: ch.title,
      slug: ch.slug,
      timeAgo: ch.releaseDate,
    }))
    .sort((a, b) => a.number - b.number);

  return {
    novel: {
      title: novel.title, slug: novel.slug,
      coverUrl: novel.coverUrl, status: novel.status,
      updatedAt: null,
      totalChapters: novel.chapterCount,
      totalPages: chapterData.totalPages,
      latestChapter: latestRaw ? { title: latestRaw.title, slug: latestRaw.slug } : null,
    },
    chapters,
  };
}
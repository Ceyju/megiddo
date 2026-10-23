import { providerFetch } from './server/outbound';
import { normalizeMangaTitle, type MDManga } from './mangadex';

const BASE = (process.env.MANGAUPDATES_API_BASE ?? 'https://api.mangaupdates.com/v1')
  .replace(/\/$/, '');

export const MANGAUPDATES_CACHE_SECONDS = 60 * 60;

export interface MangaUpdatesSearchCandidate {
  seriesId: string;
  title: string;
  hitTitle: string | null;
  associatedTitles: string[];
  url: string;
  slug: string | null;
  type: string | null;
  year: number | null;
}

export interface MangaUpdatesPublication {
  seriesId: string;
  title: string;
  url: string;
  status: string | null;
  completed: boolean | null;
  latestChapter: string | null;
  publishers: string[];
  authors: Array<{ name: string; role: string | null }>;
  relatedSeries: Array<{
    title: string;
    relation: string | null;
    url: string | null;
  }>;
  lastUpdated: string | null;
}

interface SearchResponse {
  results?: Array<{
    record?: Record<string, unknown>;
    hit_title?: unknown;
  }>;
}

function stringValue(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function numberValue(value: unknown): number | null {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function mangaUpdatesUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || !['mangaupdates.com', 'www.mangaupdates.com'].includes(host)) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function mangaUpdatesSlug(value: unknown): string | null {
  const url = mangaUpdatesUrl(value);
  if (!url) return null;
  const match = new URL(url).pathname.match(/^\/series\/([^/]+)/i);
  return match?.[1]?.toLowerCase() ?? null;
}

function parseSearchCandidate(item: NonNullable<SearchResponse['results']>[number]): MangaUpdatesSearchCandidate | null {
  const record = item.record;
  if (!record) return null;
  const seriesId = stringValue(record.series_id);
  const title = stringValue(record.title);
  const url = mangaUpdatesUrl(record.url);
  if (!seriesId || !title || !url) return null;

  const associated = Array.isArray(record.associated)
    ? record.associated
      .map((entry) => stringValue((entry as Record<string, unknown>)?.title))
      .filter((entry): entry is string => Boolean(entry))
    : [];

  return {
    seriesId,
    title,
    hitTitle: stringValue(item.hit_title),
    associatedTitles: associated,
    url,
    slug: mangaUpdatesSlug(url),
    type: stringValue(record.type),
    year: numberValue(record.year),
  };
}

function expectedMangaUpdatesType(type: MDManga['type']): string[] {
  switch (type) {
    case 'manhwa': return ['manhwa'];
    case 'manhua': return ['manhua'];
    case 'novel': return ['novel', 'light novel'];
    case 'one_shot': return ['manga', 'oneshot', 'one shot'];
    default: return ['manga'];
  }
}

function targetTitles(target: MDManga): Set<string> {
  return new Set(
    [target.title, target.titleEnglish, target.titleRomaji, target.titleNative, ...target.altTitles]
      .filter((title): title is string => Boolean(title))
      .map(normalizeMangaTitle)
      .filter(Boolean),
  );
}

function candidateScore(
  candidate: MangaUpdatesSearchCandidate,
  target: MDManga,
  expectedSlug?: string | null,
): number | null {
  if (expectedSlug) {
    return candidate.slug === expectedSlug.toLowerCase() ? 1_000 : null;
  }

  const targets = targetTitles(target);
  const titles = [candidate.title, candidate.hitTitle, ...candidate.associatedTitles]
    .filter((title): title is string => Boolean(title))
    .map(normalizeMangaTitle);
  if (!titles.some((title) => targets.has(title))) return null;

  let score = normalizeMangaTitle(candidate.title) === normalizeMangaTitle(target.title) ? 80 : 70;
  if (target.year != null && candidate.year != null) {
    if (target.year !== candidate.year) return null;
    score += 15;
  }

  if (candidate.type) {
    const normalizedType = normalizeMangaTitle(candidate.type);
    if (!expectedMangaUpdatesType(target.type).includes(normalizedType)) return null;
    score += 10;
  }
  return score;
}

export function selectMangaUpdatesSearchMatch(
  candidates: MangaUpdatesSearchCandidate[],
  target: MDManga,
  expectedSlug?: string | null,
): MangaUpdatesSearchCandidate | null {
  const scored = candidates
    .map((candidate) => ({ candidate, score: candidateScore(candidate, target, expectedSlug) }))
    .filter((entry): entry is { candidate: MangaUpdatesSearchCandidate; score: number } => entry.score !== null)
    .sort((a, b) => b.score - a.score);

  if (!scored.length || scored[0].score < 90) return null;
  if (scored[1]?.score === scored[0].score) return null;
  return scored[0].candidate;
}

async function searchMangaUpdates(query: string): Promise<MangaUpdatesSearchCandidate[]> {
  try {
    const response = await providerFetch(`${BASE}/series/search`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ search: query }),
      cache: 'force-cache',
      next: {
        revalidate: MANGAUPDATES_CACHE_SECONDS,
        tags: [`mangaupdates-search:${normalizeMangaTitle(query).slice(0, 180)}`],
      },
    });
    if (!response.ok) return [];
    const json = await response.json() as SearchResponse;
    return (json.results ?? [])
      .map(parseSearchCandidate)
      .filter((candidate): candidate is MangaUpdatesSearchCandidate => Boolean(candidate));
  } catch (error) {
    console.error(`[mangaupdates] search failed for "${query}":`, error);
    return [];
  }
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

export function parseMangaUpdatesPublication(raw: Record<string, unknown>): MangaUpdatesPublication | null {
  const seriesId = stringValue(raw.series_id);
  const title = stringValue(raw.title);
  const url = mangaUpdatesUrl(raw.url);
  if (!seriesId || !title || !url) return null;

  const publishers = Array.isArray(raw.publishers)
    ? uniqueStrings(raw.publishers
      .map((publisher) => stringValue((publisher as Record<string, unknown>)?.publisher_name))
      .filter((publisher): publisher is string => Boolean(publisher)))
    : [];
  const authors = Array.isArray(raw.authors)
    ? raw.authors
      .map((author) => {
        const record = author as Record<string, unknown>;
        const name = stringValue(record.name);
        return name ? { name, role: stringValue(record.type) } : null;
      })
      .filter((author): author is { name: string; role: string | null } => Boolean(author))
    : [];
  const relatedSeries = Array.isArray(raw.related_series)
    ? raw.related_series
      .map((related) => {
        const record = related as Record<string, unknown>;
        const relatedTitle = stringValue(record.related_series_name);
        if (!relatedTitle) return null;
        return {
          title: relatedTitle,
          relation: stringValue(record.relation_type),
          url: mangaUpdatesUrl(record.related_series_url),
        };
      })
      .filter((related): related is MangaUpdatesPublication['relatedSeries'][number] => Boolean(related))
    : [];
  const lastUpdated = raw.last_updated && typeof raw.last_updated === 'object'
    ? stringValue((raw.last_updated as Record<string, unknown>).as_rfc3339)
    : null;

  return {
    seriesId,
    title,
    url,
    status: stringValue(raw.status),
    completed: typeof raw.completed === 'boolean' ? raw.completed : null,
    latestChapter: stringValue(raw.latest_chapter),
    publishers,
    authors,
    relatedSeries,
    lastUpdated,
  };
}

async function getMangaUpdatesSeries(seriesId: string): Promise<MangaUpdatesPublication | null> {
  if (!/^\d+$/.test(seriesId)) return null;
  try {
    const response = await providerFetch(`${BASE}/series/${seriesId}`, {
      headers: { Accept: 'application/json' },
      cache: 'force-cache',
      next: {
        revalidate: MANGAUPDATES_CACHE_SECONDS,
        tags: [`mangaupdates-series:${seriesId}`],
      },
    });
    if (!response.ok) return null;
    return parseMangaUpdatesPublication(await response.json() as Record<string, unknown>);
  } catch (error) {
    console.error(`[mangaupdates] series ${seriesId} failed:`, error);
    return null;
  }
}

/**
 * Resolve publication metadata without ever turning metadata-only chapter counts
 * into reader inventory. MangaDex's `links.mu` slug is preferred as an identity
 * hint; title/year/type matching is only a conservative fallback.
 */
export async function getMangaUpdatesPublication(
  target: MDManga,
  mangaDexMatch?: MDManga | null,
): Promise<MangaUpdatesPublication | null> {
  const expectedSlug = mangaDexMatch?.externalIds?.mangaUpdates
    ?? target.externalIds?.mangaUpdates
    ?? null;
  const terms = Array.from(new Set([
    target.titleEnglish,
    target.title,
    target.titleRomaji,
    ...target.altTitles,
  ].filter((term): term is string => Boolean(term)))).slice(0, 3);
  const candidates = new Map<string, MangaUpdatesSearchCandidate>();

  for (const term of terms) {
    for (const candidate of await searchMangaUpdates(term)) {
      candidates.set(candidate.seriesId, candidate);
    }
    const match = selectMangaUpdatesSearchMatch(Array.from(candidates.values()), target, expectedSlug);
    if (match) return getMangaUpdatesSeries(match.seriesId);
  }

  return null;
}

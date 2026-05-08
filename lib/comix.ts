import type { MDManga } from './mangadex';

// Only "comix" supports the /api/frontpage endpoint.
const PROXY = process.env.COMIX_PROXY;

// ── Internal types ────────────────────────────────────────────────────────────

interface ComixItem {
  id: string;
  title: string;
  url: string;
  coverImage?: string;
  latestChapter?: number | string;
  rating?: number;
  followers?: string | number;
}

function comixToMDManga(item: ComixItem): MDManga {
  return {
    id: `comix:${item.id}`,
    title: item.title,
    altTitles: [],
    description: '',
    status: 'unknown',
    contentRating: 'safe',
    tags: [],
    coverUrl: item.coverImage ?? null,
    type: 'manga',
    year: null,
    latestChapter: item.latestChapter ? String(item.latestChapter) : null,
    // comix is a discovery/listing source only — no slug or updatedAt available
    slug: null,
    updatedAt: null,
  };
}

// ── Internal fetch ────────────────────────────────────────────────────────────

async function comixSection(
  section: string,
  limit: number,
  days?: number,
): Promise<MDManga[]> {
  try {
    const body: Record<string, unknown> = { source: 'comix', section, limit };
    // Only pass `days` for time-windowed sections (trending, latest_hot).
    // most_followed does not use a days filter.
    if (days !== undefined) body.days = days;

    const res = await fetch(`${PROXY}/frontpage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      next: { revalidate: 600 },
    });

    if (!res.ok) return [];
    const json = await res.json();
    if (json.error) return [];

    const items: ComixItem[] = json.section?.items ?? [];
    return items.slice(0, limit).map(comixToMDManga);
  } catch {
    return [];
  }
}

/** Search across all sources via the aggregator */
export async function searchComixAll(q: string, source = 'all'): Promise<MDManga[]> {
  try {
    const res = await fetch(`${PROXY}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q, source }),
      next: { revalidate: 300 },
    });

    if (!res.ok) return [];
    const json = await res.json();
    if (json.error) return [];

    const results: Array<{ id: string; title: string; coverImage?: string; latestChapter?: number }> =
      json.results ?? [];

    return results.map(r =>
      comixToMDManga({
        id: r.id,
        title: r.title,
        url: '',
        coverImage: r.coverImage,
        latestChapter: r.latestChapter,
      }),
    );
  } catch {
    return [];
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Most followed comics — no days filter, this is an all-time ranking */
export async function getComixPopular(limit = 24): Promise<MDManga[]> {
  return comixSection('most_followed', limit);
}

/** Latest hot updates — recent activity window */
export async function getComixLatest(limit = 24): Promise<MDManga[]> {
  return comixSection('latest_hot', limit);
}

/** Trending this week (7-day window) */
export async function getComixTrending(limit = 24): Promise<MDManga[]> {
  return comixSection('trending', limit, 7);
}
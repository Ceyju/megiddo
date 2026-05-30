import type { ConsumetStreamData } from "@/types";

// Re-export ConsumetEpisode shape for compatibility with EpisodeList
export type { ConsumetEpisode } from "@/types";

const BASE_URL = (process.env.NEXT_PUBLIC_CONSUMET_URL ?? "https://consumet-api-two.vercel.app").replace(/\/$/, "");
const PROVIDER = process.env.ANI_WATCH_EPSERVER_URL ?? "gogoanime";

async function consumetFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`Consumet error: ${res.status} — ${url}`);
  return res.json() as Promise<T>;
}

interface SearchResult { id: string; title: string; url?: string }
interface RawEpisode { id: string; number: number; url?: string }

async function findProviderId(titles: (string | null | undefined)[]): Promise<string | null> {
  const queries = titles.filter((t): t is string => Boolean(t));
  for (const q of queries) {
    try {
      const data = await consumetFetch<{ results?: SearchResult[] }>(
        `${BASE_URL}/anime/${PROVIDER}/${encodeURIComponent(q)}`
      );
      const results = data?.results;
      if (!results?.length) continue;
      const norm = q.toLowerCase().replace(/[^a-z0-9]/g, "");
      const match = results.find(r => {
        const t = r.title.toLowerCase().replace(/[^a-z0-9]/g, "");
        return t === norm || t.includes(norm) || norm.includes(t);
      });
      return (match ?? results[0]).id;
    } catch {
      // try next title variant
    }
  }
  return null;
}

/**
 * Gets episodes for an anime by AniList ID.
 * Pass `title` (from AniList data already fetched) to avoid a redundant API call.
 */
export async function getEpisodeList(
  anilistId: number,
  title?: { english?: string | null; romaji?: string | null }
): Promise<{ id: string; number: number; url: string }[]> {
  const providerId = await findProviderId([title?.english, title?.romaji]);
  if (!providerId) return [];

  const info = await consumetFetch<{ episodes?: RawEpisode[] }>(
    `${BASE_URL}/anime/${PROVIDER}/info/${encodeURIComponent(providerId)}`
  );
  return (info?.episodes ?? []).map(ep => ({
    id: ep.id,
    number: ep.number,
    url: ep.url ?? "",
  }));
}

/**
 * Gets stream sources. episodeId is the provider-specific ID from getEpisodeList
 * (e.g. "one-piece-episode-1" for gogoanime).
 */
export async function getEpisodeSources(
  episodeId: string,
  _anilistId: number
): Promise<ConsumetStreamData> {
  const url = `${BASE_URL}/anime/${PROVIDER}/watch/${encodeURIComponent(episodeId)}`;
  return consumetFetch<ConsumetStreamData>(url);
}
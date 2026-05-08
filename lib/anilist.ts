import { GraphQLClient } from 'graphql-request';
import type { AniListAnime, AniListPageInfo } from '@/types';
import type { MDManga } from './mangadex';

const ANILIST_GQL = process.env.ANILIST_ENDPOINT ?? '';
const client = new GraphQLClient(ANILIST_GQL);

// ---------------------------------------------------------------------------
// Anime fragments & types
// ---------------------------------------------------------------------------

const ANIME_FRAGMENT = `
  id
  idMal
  title {
    romaji
    english
    native
  }
  description(asHtml: false)
  coverImage {
    large
    extraLarge
    color
  }
  bannerImage
  averageScore
  popularity
  episodes
  duration
  status
  season
  seasonYear
  genres
  format
  source
  studios(isMain: true) {
    nodes {
      name
    }
  }
  nextAiringEpisode {
    episode
    timeUntilAiring
  }
  trailer {
    id
    site
  }
  tags {
    name
    rank
  }
  relations {
    edges {
      relationType
      node {
        id
        title { romaji english }
        coverImage { large }
        format
        status
      }
    }
  }
  externalLinks {
    site
    url
  }
`;

// ---------------------------------------------------------------------------
// Anime public API — unchanged, each is a deliberate user-triggered query
// ---------------------------------------------------------------------------

export async function getTrending(
  page = 1,
  perPage = 20,
): Promise<{ media: AniListAnime[]; pageInfo: AniListPageInfo }> {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage perPage }
        media(sort: TRENDING_DESC, type: ANIME, isAdult: false) {
          ${ANIME_FRAGMENT}
        }
      }
    }
  `;
  const data = await client.request<{
    Page: { media: AniListAnime[]; pageInfo: AniListPageInfo };
  }>(query, { page, perPage });
  return data.Page;
}

export async function getPopular(
  page = 1,
  perPage = 20,
): Promise<{ media: AniListAnime[]; pageInfo: AniListPageInfo }> {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage perPage }
        media(sort: POPULARITY_DESC, type: ANIME, isAdult: false) {
          ${ANIME_FRAGMENT}
        }
      }
    }
  `;
  const data = await client.request<{
    Page: { media: AniListAnime[]; pageInfo: AniListPageInfo };
  }>(query, { page, perPage });
  return data.Page;
}

export async function getSeasonalAnime(
  season: string,
  year: number,
  page = 1,
  perPage = 20,
): Promise<{ media: AniListAnime[]; pageInfo: AniListPageInfo }> {
  const query = `
    query ($season: MediaSeason, $year: Int, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage perPage }
        media(season: $season, seasonYear: $year, type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
          ${ANIME_FRAGMENT}
        }
      }
    }
  `;
  const data = await client.request<{
    Page: { media: AniListAnime[]; pageInfo: AniListPageInfo };
  }>(query, { season, year, page, perPage });
  return data.Page;
}

export async function searchAnime(
  search: string,
  page = 1,
  perPage = 20,
  genres?: string[],
): Promise<{ media: AniListAnime[]; pageInfo: AniListPageInfo }> {
  const query = `
    query ($search: String, $page: Int, $perPage: Int, $genres: [String]) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage perPage }
        media(search: $search, type: ANIME, isAdult: false, genre_in: $genres) {
          ${ANIME_FRAGMENT}
        }
      }
    }
  `;
  const data = await client.request<{
    Page: { media: AniListAnime[]; pageInfo: AniListPageInfo };
  }>(query, { search, page, perPage, genres: genres?.length ? genres : undefined });
  return data.Page;
}

export async function getAnimeById(id: number): Promise<AniListAnime> {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        ${ANIME_FRAGMENT}
      }
    }
  `;
  const data = await client.request<{ Media: AniListAnime }>(query, { id });
  return data.Media;
}

export function getCurrentSeason(): { season: string; year: number } {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  let season: string;
  if (month >= 1 && month <= 3) season = 'WINTER';
  else if (month >= 4 && month <= 6) season = 'SPRING';
  else if (month >= 7 && month <= 9) season = 'SUMMER';
  else season = 'FALL';
  return { season, year };
}

// ---------------------------------------------------------------------------
// Manga types
// ---------------------------------------------------------------------------

interface ALMangaMedia {
  id: number;
  title: { romaji: string | null; english: string | null; native: string | null };
  description: string | null;
  coverImage: { large: string | null; extraLarge: string | null } | null;
  genres: string[] | null;
  status: string | null;
  format: string | null;
  startDate: { year: number | null } | null;
  chapters: number | null;
  averageScore: number | null;
}

const MANGA_FIELDS = `
  id
  title { romaji english native }
  description(asHtml: false)
  coverImage { large extraLarge }
  genres
  status
  format
  startDate { year }
  chapters
  averageScore
`;

// ---------------------------------------------------------------------------
// Manga converters
// ---------------------------------------------------------------------------

function alStatus(s: string | null): string {
  switch (s) {
    case 'RELEASING':  return 'ongoing';
    case 'FINISHED':   return 'completed';
    case 'CANCELLED':  return 'cancelled';
    case 'HIATUS':     return 'hiatus';
    default:           return 'unknown';
  }
}

function alFormat(f: string | null): MDManga['type'] {
  switch (f) {
    case 'MANHWA':   return 'manhwa';
    case 'MANHUA':   return 'manhua';
    case 'NOVEL':    return 'novel';
    case 'ONE_SHOT': return 'one_shot';
    default:         return 'manga';
  }
}

function alMangaToMDManga(m: ALMangaMedia): MDManga {
  return {
    id: `anilist:${m.id}`,
    title: m.title.english ?? m.title.romaji ?? 'Unknown',
    altTitles: [m.title.romaji, m.title.native].filter(
      (t): t is string => !!t && t !== (m.title.english ?? m.title.romaji),
    ),
    description: m.description ?? '',
    status: alStatus(m.status),
    contentRating: 'safe',
    tags: m.genres ?? [],
    coverUrl: m.coverImage?.extraLarge ?? m.coverImage?.large ?? null,
    type: alFormat(m.format),
    year: m.startDate?.year ?? null,
    latestChapter: m.chapters != null ? String(m.chapters) : null,
    slug: null,
    updatedAt: null,
  };
}

interface MangaSectionsCache {
  popular: MDManga[];
  latest: MDManga[];
  trending: MDManga[];
  fetchedAt: number;
}

// Module-level cache — survives across requests in the same Node.js process.
// This is the primary guard in dev mode where Next.js fetch cache doesn't apply.
let _mangaCache: MangaSectionsCache | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function fetchMangaSections(perPage: number): Promise<MangaSectionsCache> {
  // Return cached result if still fresh
  if (_mangaCache && Date.now() - _mangaCache.fetchedAt < CACHE_TTL_MS) {
    return _mangaCache;
  }

  // All three sections in one HTTP request via GraphQL aliases
  const query = `
    query ($perPage: Int) {
      popular: Page(page: 1, perPage: $perPage) {
        media(sort: POPULARITY_DESC, type: MANGA, isAdult: false, format_in: [MANGA, ONE_SHOT]) {
          ${MANGA_FIELDS}
        }
      }
      latest: Page(page: 1, perPage: $perPage) {
        media(sort: UPDATED_AT_DESC, type: MANGA, isAdult: false, format_in: [MANGA, ONE_SHOT]) {
          ${MANGA_FIELDS}
        }
      }
      trending: Page(page: 1, perPage: $perPage) {
        media(sort: TRENDING_DESC, type: MANGA, isAdult: false, format_in: [MANGA, ONE_SHOT]) {
          ${MANGA_FIELDS}
        }
      }
    }
  `;

  try {
    const data = await client.request<{
      popular:  { media: ALMangaMedia[] };
      latest:   { media: ALMangaMedia[] };
      trending: { media: ALMangaMedia[] };
    }>(query, { perPage });

    _mangaCache = {
      popular:  data.popular.media.map(alMangaToMDManga),
      latest:   data.latest.media.map(alMangaToMDManga),
      trending: data.trending.media.map(alMangaToMDManga),
      fetchedAt: Date.now(),
    };

    return _mangaCache;
  } catch (err) {
    console.error('[anilist] fetchMangaSections failed:', err);
    // Return stale cache if available rather than empty arrays
    if (_mangaCache) return _mangaCache;
    return { popular: [], latest: [], trending: [], fetchedAt: 0 };
  }
}

// ---------------------------------------------------------------------------
// Manga public API
// ---------------------------------------------------------------------------

/** Most popular manga on AniList by all-time popularity. */
export async function getPopularMangaAL(limit = 20): Promise<MDManga[]> {
  const { popular } = await fetchMangaSections(limit);
  return popular;
}

/** Most recently updated manga on AniList. */
export async function getLatestMangaAL(limit = 20): Promise<MDManga[]> {
  const { latest } = await fetchMangaSections(limit);
  return latest;
}

/** Currently trending manga on AniList. */
export async function getTrendingMangaAL(limit = 20): Promise<MDManga[]> {
  const { trending } = await fetchMangaSections(limit);
  return trending;
}

/** Fetch a single manga by AniList ID for the detail page. */
export async function getMangaByIdAL(id: number): Promise<MDManga | null> {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: MANGA) {
        ${MANGA_FIELDS}
      }
    }
  `;
  try {
    const data = await client.request<{ Media: ALMangaMedia }>(query, { id });
    return alMangaToMDManga(data.Media);
  } catch (err) {
    console.error(`[anilist] getMangaByIdAL(${id}) failed:`, err);
    return null;
  }
}

/** Search manga by title on AniList. */
export async function searchMangaAL(search: string, limit = 20): Promise<MDManga[]> {
  const query = `
    query ($search: String, $perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(search: $search, type: MANGA, isAdult: false) {
          ${MANGA_FIELDS}
        }
      }
    }
  `;
  try {
    const data = await client.request<{ Page: { media: ALMangaMedia[] } }>(
      query,
      { search, perPage: limit },
    );
    return data.Page.media.map(alMangaToMDManga);
  } catch (err) {
    console.error(`[anilist] searchMangaAL("${search}") failed:`, err);
    return [];
  }
}
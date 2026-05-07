import { GraphQLClient } from "graphql-request";
import type { AniListAnime, AniListPageInfo } from "@/types";

const client = new GraphQLClient(process.env.ANILIST_ENDPOINT as string);

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

export async function getTrending(page = 1, perPage = 20): Promise<{
  media: AniListAnime[];
  pageInfo: AniListPageInfo;
}> {
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
  const data = await client.request<{ Page: { media: AniListAnime[]; pageInfo: AniListPageInfo } }>(
    query,
    { page, perPage }
  );
  return data.Page;
}

export async function getPopular(page = 1, perPage = 20): Promise<{
  media: AniListAnime[];
  pageInfo: AniListPageInfo;
}> {
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
  const data = await client.request<{ Page: { media: AniListAnime[]; pageInfo: AniListPageInfo } }>(
    query,
    { page, perPage }
  );
  return data.Page;
}

export async function getSeasonalAnime(
  season: string,
  year: number,
  page = 1,
  perPage = 20
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
  const data = await client.request<{ Page: { media: AniListAnime[]; pageInfo: AniListPageInfo } }>(
    query,
    { season, year, page, perPage }
  );
  return data.Page;
}

export async function searchAnime(
  search: string,
  page = 1,
  perPage = 20,
  genres?: string[]
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
  const data = await client.request<{ Page: { media: AniListAnime[]; pageInfo: AniListPageInfo } }>(
    query,
    { search, page, perPage, genres: genres?.length ? genres : undefined }
  );
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
  if (month >= 1 && month <= 3) season = "WINTER";
  else if (month >= 4 && month <= 6) season = "SPRING";
  else if (month >= 7 && month <= 9) season = "SUMMER";
  else season = "FALL";
  return { season, year };
}

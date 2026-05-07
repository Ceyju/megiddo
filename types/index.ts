export interface AniListAnime {
  id: number;
  idMal: number | null;
  title: {
    romaji: string;
    english: string | null;
    native: string;
  };
  description: string | null;
  coverImage: {
    large: string;
    extraLarge: string;
    color: string | null;
  };
  bannerImage: string | null;
  averageScore: number | null;
  popularity: number;
  episodes: number | null;
  duration: number | null;
  status: string;
  season: string | null;
  seasonYear: number | null;
  genres: string[];
  studios: {
    nodes: { name: string }[];
  };
  nextAiringEpisode: {
    episode: number;
    timeUntilAiring: number;
  } | null;
  trailer: {
    id: string;
    site: string;
  } | null;
  format: string | null;
  source: string | null;
  tags: { name: string; rank: number }[];
  relations: {
    edges: {
      relationType: string;
      node: {
        id: number;
        title: { romaji: string; english: string | null };
        coverImage: { large: string };
        format: string | null;
        status: string;
      };
    }[];
  };
  externalLinks: { site: string; url: string }[];
}

export interface AniListPageInfo {
  total: number;
  currentPage: number;
  lastPage: number;
  hasNextPage: boolean;
  perPage: number;
}

export interface AniListResponse<T> {
  data: T;
}

// Consumet Types
export interface ConsumetAnimeInfo {
  id: string;
  title: string;
  url: string;
  image: string;
  releaseDate: string | null;
  description: string | null;
  genres: string[];
  subOrDub: "sub" | "dub";
  type: string | null;
  status: string;
  otherName: string | null;
  totalEpisodes: number;
  episodes: ConsumetEpisode[];
}

export interface ConsumetEpisode {
  id: string;
  number: number;
  url: string;
}

export interface ConsumetSource {
  url: string;
  isM3U8: boolean;
  quality?: string;
}

export interface ConsumetStreamData {
  headers: { Referer: string };
  sources: ConsumetSource[];
  download?: string;
}

export interface ConsumetSearchResult {
  currentPage: number;
  hasNextPage: boolean;
  results: {
    id: string;
    title: string;
    url: string;
    image: string;
    releaseDate: string | null;
    subOrDub: "sub" | "dub";
  }[];
}

export interface AnifyEpisode {
  id: string;
  number: number;
  title: string | null;
  isFiller: boolean;
}

export interface AnifyProvider {
  providerId: string;
  episodes: {
    sub: AnifyEpisode[];
    dub: AnifyEpisode[];
  };
}

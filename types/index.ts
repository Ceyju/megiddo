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
    airingAt: number;
    timeUntilAiring: number;
  } | null;
  airingSchedule?: {
    nodes: {
      episode: number;
      airingAt: number;
    }[];
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

export interface EpisodeRef {
  id: string;
  number: number;
  url: string;
  availability?: 'available' | 'upcoming';
  airingAt?: number | null;
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

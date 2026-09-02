import type { AniListAnime, EpisodeRef } from '@/types';

function validEpisodeNumber(value: number | undefined): value is number {
  return Number.isInteger(value) && (value ?? 0) > 0;
}

function validAiringTime(value: number | undefined): value is number {
  return Number.isFinite(value) && (value ?? 0) > 0;
}

/**
 * Builds the conservative episode availability model used by the anime page.
 * Unknown episodes remain upcoming instead of being exposed as watch links.
 */
export function buildAnimeEpisodes(
  anime: AniListAnime,
  nowUnix = Math.floor(Date.now() / 1000),
): EpisodeRef[] {
  const scheduleByEpisode = new Map<number, number>();

  for (const item of anime.airingSchedule?.nodes ?? []) {
    if (validEpisodeNumber(item.episode) && validAiringTime(item.airingAt)) {
      scheduleByEpisode.set(item.episode, item.airingAt);
    }
  }

  const nextEpisode = anime.nextAiringEpisode;
  if (
    nextEpisode
    && validEpisodeNumber(nextEpisode.episode)
    && validAiringTime(nextEpisode.airingAt)
    && !scheduleByEpisode.has(nextEpisode.episode)
  ) {
    scheduleByEpisode.set(nextEpisode.episode, nextEpisode.airingAt);
  }

  const confirmedEpisodeNumbers = [
    ...scheduleByEpisode.keys(),
    ...(nextEpisode && validEpisodeNumber(nextEpisode.episode) ? [nextEpisode.episode] : []),
  ];
  const confirmedCount = confirmedEpisodeNumbers.length > 0
    ? Math.max(...confirmedEpisodeNumbers)
    : 0;
  const episodeCount = validEpisodeNumber(anime.episodes ?? undefined)
    ? anime.episodes
    : confirmedCount;

  if (!episodeCount) return [];

  const nextAiringNumber = nextEpisode && validEpisodeNumber(nextEpisode.episode)
    ? nextEpisode.episode
    : [...scheduleByEpisode.entries()]
        .filter(([, airingAt]) => airingAt > nowUnix)
        .map(([episode]) => episode)
        .sort((a, b) => a - b)[0];

  return Array.from({ length: episodeCount }, (_, index) => {
    const number = index + 1;
    const scheduledAt = scheduleByEpisode.get(number) ?? null;
    const isExplicitlyFuture = scheduledAt !== null && scheduledAt > nowUnix;
    const isExplicitlyAired = scheduledAt !== null && scheduledAt <= nowUnix;
    const isAvailable = !isExplicitlyFuture && (
      anime.status === 'FINISHED'
      || isExplicitlyAired
      || (anime.status === 'RELEASING' && nextAiringNumber !== undefined && number < nextAiringNumber)
    );

    return {
      id: String(number),
      number,
      url: '',
      availability: isAvailable ? 'available' : 'upcoming',
      airingAt: isAvailable ? null : scheduledAt,
    };
  });
}

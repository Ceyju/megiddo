const VIDLINK_ORIGIN = 'https://vidlink.pro';

export type VidLinkAudio = 'sub' | 'dub';

export function buildVidLinkAnimeUrl(malId: number, episode: number, audio: VidLinkAudio) {
  const url = new URL(`/anime/${malId}/${episode}/${audio}`, VIDLINK_ORIGIN);
  url.searchParams.set('fallback', 'true');
  return url.toString();
}

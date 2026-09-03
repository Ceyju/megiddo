const VIDFAST_ORIGIN = 'https://vidfast.pro';

export function buildVidFastTvUrl(imdbId: string, season: number, episode: number) {
  const url = new URL(`/tv/${imdbId}/${season}/${episode}`, VIDFAST_ORIGIN);
  url.searchParams.set('autoPlay', 'true');
  url.searchParams.set('nextButton', 'false');
  url.searchParams.set('autoNext', 'false');
  url.searchParams.set('fullscreenButton', 'false');
  return url.toString();
}

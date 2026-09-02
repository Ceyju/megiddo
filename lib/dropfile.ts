const DROPFILE_ORIGIN = 'https://dropfile.cc';

export type DropFileAudio = 'sub' | 'dub' | 'raw';
export type DropFileLanguage = 'en' | 'es' | 'pt' | 'ja';

export function buildDropFileAnimeUrl(
  anilistId: number,
  season: number,
  episode: number,
  audio: DropFileAudio,
  language: DropFileLanguage,
) {
  const url = new URL(`/player/tv/anilist-${anilistId}/${season}/${episode}`, DROPFILE_ORIGIN);
  url.searchParams.set('audio', audio);
  url.searchParams.set('lang', language);
  return url.toString();
}

import { EMBED_PROVIDERS, type IframeProvider } from '../embed-providers';

export function buildAnimeProviders(anilistId: number, episode: number): IframeProvider[] {
  if (![anilistId, episode].every(value => Number.isSafeInteger(value) && value > 0)) {
    throw new Error('Anime and episode identifiers must be positive integers');
  }
  const provider = EMBED_PROVIDERS.aniembed;
  const url = new URL(`/e/${anilistId}/${episode}`, provider.origin);
  url.searchParams.set('lang', 'sub');
  url.searchParams.set('autoplay', '0');
  return [{ id: 'aniembed', label: provider.label, src: url.toString() }];
}

import { EMBED_PROVIDERS, safePlayerUrl, type IframeProvider } from '../embed-providers';
import { serverBaseUrl } from './env';

export function buildAnimeProviders(anilistId: number, episode: number): IframeProvider[] {
  if (![anilistId, episode].every(value => Number.isSafeInteger(value) && value > 0)) {
    throw new Error('Anime and episode identifiers must be positive integers');
  }
  return (Object.keys(EMBED_PROVIDERS) as Array<keyof typeof EMBED_PROVIDERS>).map(id => {
    const provider = EMBED_PROVIDERS[id];
    const variable = id === 'vidnest' ? 'VIDNEST_BASE_URL' : 'ANIWEEB_BASE_URL';
    const base = serverBaseUrl(variable) ?? provider.origin;
    if (!safePlayerUrl(base, id)) throw new Error(`${variable} must use ${provider.origin}`);
    const url = new URL(id === 'vidnest'
      ? `/anime/${anilistId}/${episode}/sub`
      : `/embed/ani/${anilistId}/${episode}`, base);
    if (id === 'aniweeb') url.searchParams.set('track', 'sub');
    return { id, label: provider.label, src: url.toString() };
  });
}

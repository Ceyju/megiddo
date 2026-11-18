export const EMBED_PROVIDERS = {
  aniembed: { label: 'AniEmbed', origin: 'https://aniembed.se' },
} as const;

export type EmbedProviderId = keyof typeof EMBED_PROVIDERS;

export interface IframeProvider {
  id: EmbedProviderId;
  label: string;
  src: string;
}

export const PLAYER_FRAME_ORIGINS = Object.values(EMBED_PROVIDERS).map(provider => provider.origin);

export function safePlayerUrl(value: string, id?: EmbedProviderId): string | null {
  try {
    const url = new URL(value);
    const approved = id
      ? url.origin === EMBED_PROVIDERS[id]?.origin
      : Object.values(EMBED_PROVIDERS).some(provider => provider.origin === url.origin);
    return url.protocol === 'https:' && !url.username && !url.password && approved ? url.toString() : null;
  } catch {
    return null;
  }
}

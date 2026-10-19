export const EMBED_PROVIDERS = {
  aniweeb: { label: 'Aniweeb', origin: 'https://api.aniweeb.net' },
  vidnest: { label: 'VidNest', origin: 'https://vidnest.fun' },
} as const;

export type EmbedProviderId = keyof typeof EMBED_PROVIDERS;

export interface IframeProvider {
  id: EmbedProviderId;
  label: string;
  src: string;
}

// Redirect targets are permitted in CSP, but are not selectable providers.
export const PLAYER_FRAME_ORIGINS = [
  ...Object.values(EMBED_PROVIDERS).map(provider => provider.origin),
  'https://nikastream.blog',
];

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

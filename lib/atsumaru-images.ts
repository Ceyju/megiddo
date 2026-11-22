export const ATSUMARU_IMAGE_ORIGIN = 'https://cdn.atsu.moe';

export function isAtsumaruImagePath(path: string): boolean {
  return path.length <= 1024 && /^\/static\/(?:pages|posters)\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.(?:avif|webp|png|jpe?g)$/i.test(path);
}

export function atsumaruImageSource(url: URL): string {
  // Preserve intentional custom image hosts; the relay only serves the fixed CDN.
  if (url.origin !== ATSUMARU_IMAGE_ORIGIN) return url.href;
  if (url.search || url.hash || !isAtsumaruImagePath(url.pathname)) throw new Error('Invalid Atsumaru image path');
  return `/api/manga/image?path=${encodeURIComponent(url.pathname)}`;
}

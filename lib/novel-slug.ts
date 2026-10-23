// NovelBuddy includes full titles in slugs; legitimate values can exceed 80 characters.
export function isNovelSlug(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,255}$/.test(value);
}

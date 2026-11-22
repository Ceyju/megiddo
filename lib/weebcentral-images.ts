export const WEEBCENTRAL_PAGE_ORIGINS = [
  'https://official.lowee.us',
  'https://hot.planeptune.us',
] as const;
export const WEEBCENTRAL_IMAGE_ORIGINS = [
  'https://temp.compsci88.com',
  ...WEEBCENTRAL_PAGE_ORIGINS,
] as const;

export function isWeebCentralImage(value: string): boolean {
  try {
    const url = new URL(value);
    return !url.username && !url.password && WEEBCENTRAL_IMAGE_ORIGINS.some(origin => url.origin === origin);
  } catch { return false; }
}

import { getChapterPages, type MDChapter, type MDPage } from './mangadex';

export type ExternalReaderMode = 'iframe' | 'notice';

export interface ExternalReaderPolicy {
  id: string;
  label: string;
  hosts: readonly string[];
  mode: ExternalReaderMode;
  experimental?: boolean;
}

const EXTERNAL_READER_POLICIES: readonly ExternalReaderPolicy[] = [
  {
    id: 'manga-plus',
    label: 'MANGA Plus',
    hosts: ['mangaplus.shueisha.co.jp'],
    mode: 'iframe',
    experimental: true,
  },
  {
    id: 'webnovel',
    label: 'Webnovel',
    hosts: ['webnovel.com', 'www.webnovel.com'],
    mode: 'notice',
  },
  {
    id: 'tappytoon',
    label: 'Tappytoon',
    hosts: ['tappytoon.com', 'www.tappytoon.com'],
    mode: 'notice',
  },
  {
    id: 'pocket-comics',
    label: 'Pocket Comics',
    hosts: ['pocketcomics.com', 'www.pocketcomics.com'],
    mode: 'notice',
  },
];

const UNKNOWN_EXTERNAL_POLICY: ExternalReaderPolicy = {
  id: 'official-external',
  label: 'Official publisher',
  hosts: [],
  mode: 'notice',
};

export function resolveExternalReaderPolicy(urlValue: string): ExternalReaderPolicy | null {
  try {
    const url = new URL(urlValue);
    if (url.protocol !== 'https:') return null;
    return EXTERNAL_READER_POLICIES.find(policy => policy.hosts.includes(url.hostname.toLowerCase()))
      ?? UNKNOWN_EXTERNAL_POLICY;
  } catch {
    return null;
  }
}

export function getReadableChapterNavigation(chapters: MDChapter[], chapterId: string) {
  const readable = chapters.filter(chapter => chapter.availability !== 'unavailable');
  const index = readable.findIndex(chapter => chapter.id === chapterId);
  if (index === -1) return null;
  return {
    current: readable[index],
    previousId: index > 0 ? readable[index - 1].id : null,
    nextId: index < readable.length - 1 ? readable[index + 1].id : null,
  };
}

export type MangaPageProviderAuthorization = 'documented-public-api' | 'licensed';

export interface MangaPageProviderAdapter {
  id: string;
  label: string;
  authorization: MangaPageProviderAuthorization;
  attribution: string;
  canHandle(chapter: MDChapter): boolean;
  resolvePages(chapterId: string): Promise<MDPage[]>;
}

export function defineMangaPageProvider(adapter: MangaPageProviderAdapter): MangaPageProviderAdapter {
  if (adapter.authorization !== 'documented-public-api' && adapter.authorization !== 'licensed') {
    throw new Error('A manga page provider requires a documented API allowance or explicit license.');
  }
  return Object.freeze(adapter);
}

export const mangaDexPageProvider = defineMangaPageProvider({
  id: 'mangadex',
  label: 'MangaDex',
  authorization: 'documented-public-api',
  attribution: 'Images served by MangaDex',
  canHandle: chapter => chapter.provider === 'MangaDex' && chapter.availability === 'hosted',
  resolvePages: getChapterPages,
});

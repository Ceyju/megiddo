// Extraction informed by Keiyoushi's Weeb Central extension (Apache-2.0).
// This TypeScript adapter validates live HTML independently; see THIRD_PARTY_NOTICES.md.
import { load, type CheerioAPI } from 'cheerio';
import type { AnyNode } from 'domhandler';
import type { MDManga, MDChapter, MDPage } from './mangadex';
import { UpstreamError } from './server/outbound';
import { ProviderNotFoundError } from './server/provider-errors';
import { isWeebCentralImage, WEEBCENTRAL_PAGE_ORIGINS } from './weebcentral-images';

export const WEEBCENTRAL_ORIGIN = 'https://weebcentral.com';
const ID = /^[0-9A-HJKMNP-TV-Z]{26}$/;
const TYPES: Record<string, MDManga['type']> = { Manga: 'manga', Manhwa: 'manhwa', Manhua: 'manhua' };
const qualified = (id: string) => `weebcentral:${id}`;

export function weebCentralId(value: string): string {
  const raw = value.startsWith('weebcentral:') ? value.slice(12) : '';
  if (!ID.test(raw)) throw new ProviderNotFoundError('Invalid Weeb Central identifier');
  return raw;
}
function requireValue(value: unknown, message: string): asserts value {
  if (!value) throw new UpstreamError(`Weeb Central returned ${message}`);
}
function siteUrl(value: string | undefined) {
  let url: URL;
  try { url = new URL(value ?? '', WEEBCENTRAL_ORIGIN); }
  catch { throw new UpstreamError('Weeb Central returned an invalid identity URL'); }
  requireValue(url.origin === WEEBCENTRAL_ORIGIN && !url.username && !url.password && !url.search && !url.hash, 'an invalid identity URL');
  return url;
}
function linkedId(value: string | undefined, kind: 'series' | 'chapters') {
  const parts = siteUrl(value).pathname.split('/');
  requireValue(parts[1] === kind && ID.test(parts[2] ?? '') && (kind === 'series' ? parts.length <= 4 : parts.length === 3), 'an invalid linked identity');
  return parts[2];
}
function field($: CheerioAPI, root: AnyNode, label: string) {
  const strong = $(root).find('strong').filter((_, el) => $(el).text().trim().replace(/:$/, '') === label).first();
  if (!strong.length) return '';
  const parent = strong.parent().clone();
  parent.children('strong').remove();
  return parent.text().replace(/\s+/g, ' ').trim();
}
function image(value: string | undefined, id?: string) {
  requireValue(value && isWeebCentralImage(value), 'an unapproved image URL');
  const url = new URL(value);
  requireValue(!url.search && !url.hash && /\.(?:webp|png|jpe?g|avif)$/i.test(url.pathname), 'an invalid image path');
  if (id) requireValue(url.origin === 'https://temp.compsci88.com' && new RegExp(`/cover/(?:normal|small|fallback)/${id}\\.`).test(url.pathname), 'a cover for a different series');
  return url.href;
}
function cover($: CheerioAPI, root: AnyNode, id: string) {
  const source = $(root).find('source').first().attr('srcset');
  const fallback = $(root).find('img').first().attr('src');
  return image(source ?? fallback, id);
}
function manga(id: string, title: string, type: MDManga['type'], coverUrl: string): MDManga {
  return { id: qualified(id), title, type, coverUrl, altTitles: [], description: '', status: '',
    contentRating: 'safe', tags: [], year: null, latestChapter: null };
}

export function parseWeebCentralSearch(html: string): MDManga[] {
  const $ = load(html);
  const rows = $('article').filter((_, el) => $(el).children('section').length > 0);
  if (!rows.length) {
    requireValue(/no (?:results|series|manga)(?:\s+(?:were\s+)?found)?/i.test($.text()), 'an unrecognized search response');
    return [];
  }
  const seen = new Set<string>();
  return rows.toArray().flatMap(row => {
    const link = $(row).children('section').eq(1).find('a').first();
    const id = linkedId(link.attr('href'), 'series');
    const title = link.text().trim();
    requireValue(title && !seen.has(id), 'an empty or duplicate search identity');
    seen.add(id);
    const type = TYPES[field($, row, 'Type')];
    if (!type) return [];
    const result = manga(id, title, type, cover($, row, id));
    const year = Number(field($, row, 'Year'));
    result.year = Number.isInteger(year) && year > 0 ? year : null;
    const status = field($, row, 'Status').toLowerCase();
    result.status = status === 'complete' ? 'completed' : status;
    result.tags = field($, row, 'Tag(s)').split(',').map(tag => tag.trim()).filter(Boolean);
    return [result];
  });
}

export function parseWeebCentralDetail(html: string, providerId: string): MDManga | null {
  const id = weebCentralId(providerId), $ = load(html);
  const root = $('section[x-data]').filter((_, el) => $(el).find('h1').length > 0).first();
  requireValue(root.length, 'missing series details');
  const rss = root.find('a').filter((_, el) => ($(el).attr('href') ?? '').endsWith('/rss')).first();
  requireValue(siteUrl(rss.attr('href')).pathname === `/series/${id}/rss`, 'details for a different series');
  const title = root.find('h1').first().text().trim();
  requireValue(title, 'an empty series title');
  const type = TYPES[field($, root[0], 'Type')];
  const adult = field($, root[0], 'Adult Content');
  requireValue(['Yes', 'No'].includes(adult), 'missing content classification');
  if (adult === 'Yes' || !type) return null;
  const result = manga(id, title, type, cover($, root[0], id));
  result.description = field($, root[0], 'Description');
  result.altTitles = field($, root[0], 'Associated Name(s)').split(/\s*\n\s*/).filter(Boolean);
  result.tags = field($, root[0], 'Tags(s)').split(',').map(tag => tag.trim()).filter(Boolean);
  const status = field($, root[0], 'Status').toLowerCase();
  result.status = status === 'complete' ? 'completed' : status === 'canceled' ? 'cancelled' : status;
  const year = Number(field($, root[0], 'Released'));
  result.year = Number.isInteger(year) && year > 0 ? year : null;
  const al = root.find('a').map((_, el) => $(el).attr('href')).get().find(href => /^https:\/\/anilist\.co\/manga\/\d+\/?$/.test(href));
  if (al) result.externalIds = { anilist: new URL(al).pathname.split('/')[2] };
  return result;
}

export function parseWeebCentralChapters(html: string): MDChapter[] {
  const $ = load(html);
  const links = $('a').filter((_, el) => /\/chapters\//.test($(el).attr('href') ?? ''));
  requireValue(links.length > 0 && links.length <= 5000, 'an empty or excessive chapter inventory');
  requireValue(!$('[hx-get]').toArray().some(el => /offset=|page=/.test($(el).attr('hx-get') ?? '')), 'a partial chapter inventory');
  const seen = new Set<string>();
  return links.toArray().reverse().map((el, index) => {
    const id = linkedId($(el).attr('href'), 'chapters');
    requireValue(!seen.has(id), 'duplicate chapter identities');
    seen.add(id);
    const title = $(el).find('span.grow > span').first().text().trim();
    requireValue(title, 'an empty chapter label');
    const number = /(?:chapter|episode|no\.)\s*(\d+(?:\.\d+)?)/i.exec(title)?.[1] ?? null;
    const date = $(el).find('time').attr('datetime');
    requireValue(!date || Number.isFinite(Date.parse(date)), 'an invalid chapter date');
    return { id: qualified(id), chapter: number, title, volume: null, publishAt: date ? new Date(date).toISOString() : '',
      pages: 0, pageCount: 0, provider: 'Weeb Central', availability: 'hosted', externalUrl: null,
      scanlationGroup: $(el).find('img').toArray().some(img => /chapter-badge-official/.test($(img).attr('src') ?? '')) ? 'Official (site label)' : 'Unknown', sourceIndex: index };
  });
}

export function parseWeebCentralPages(html: string, chapterId: string): MDPage[] {
  const id = weebCentralId(chapterId), $ = load(html), root = $('#chapter-images');
  requireValue(root.length === 1 && siteUrl(root.attr('hx-get')).pathname === `/chapters/${id}/images`, 'pages for a different chapter');
  const imgs = root.children('img');
  requireValue(imgs.length > 0 && imgs.length <= 1000, 'an empty or excessive page list');
  const seen = new Set<string>();
  return imgs.toArray().map((el, index) => {
    requireValue($(el).attr('alt') === `Page ${index + 1}`, 'an unordered page list');
    const url = image($(el).attr('src'));
    requireValue(WEEBCENTRAL_PAGE_ORIGINS.some(origin => new URL(url).origin === origin) && !seen.has(url), 'an unapproved or duplicate chapter image');
    seen.add(url);
    return { url };
  });
}

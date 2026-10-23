// Fixture upstreams run outside the app; no production routes or credentials are changed.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';

const mangaId = 'a1c7c817-4e59-43b7-9365-09675a149e98';
const chapterIds = [1, 2, 3].map(n => `c0a00000-0000-4000-8000-00000000000${n}`);
const title = 'The Adventurer Who Returned to a Very Different World After One Thousand Years';
const art = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="400" height="600" fill="#282217"/><path d="M0 600L400 100V600" fill="#7b241c"/><circle cx="200" cy="190" r="90" fill="#bcab77"/></svg>`;
const image = `data:image/svg+xml;base64,${Buffer.from(art).toString('base64')}`;
const description = 'An adventurer returns home and discovers a changed world. '.repeat(12);
const pageInfo = { total: 8, currentPage: 1, lastPage: 1, hasNextPage: false, perPage: 8 };
const anime = id => ({
  id, idMal: id, title: { english: title, romaji: title, native: '異世界の冒険' },
  description, coverImage: { large: image, extraLarge: image, color: '#7b241c' }, bannerImage: image,
  averageScore: 85, popularity: 1000, episodes: 24, duration: 24, status: id === 2 ? 'NOT_YET_RELEASED' : 'FINISHED',
  season: 'FALL', seasonYear: 2026, genres: ['Adventure', 'Fantasy'], format: 'TV', source: 'MANGA',
  studios: { nodes: [{ name: 'A Studio With An Unusually Long Name' }] }, nextAiringEpisode: null,
  airingSchedule: { nodes: [] }, trailer: null, tags: [], relations: { edges: [] }, externalLinks: [],
});
const alManga = { ...anime(1), format: 'MANGA', chapters: 3, startDate: { year: 2020 } };
const mdManga = {
  id: mangaId, type: 'manga', attributes: { title: { en: title }, altTitles: [{ 'ja-ro': title }],
    description: { en: description }, status: 'completed', originalLanguage: 'ja', year: 2020,
    contentRating: 'safe', tags: [], links: { al: '1', engtl: 'https://www.viz.com/shonenjump' } }, relationships: [],
};
const chapters = chapterIds.map((id, index) => ({ id, type: 'chapter', attributes: {
  chapter: String(index + 1), title: `${title}: Chapter ${index + 1}`, pages: index === 2 ? 0 : 2,
  publishAt: '2026-10-23T00:00:00Z', externalUrl: index === 2 ? 'https://www.viz.com/shonenjump' : null,
}, relationships: [{ type: 'manga', id: mangaId }, { type: 'scanlation_group', attributes: { name: 'A Translation Group With A Very Long UnbrokenNameForOverflowChecks' } }] }));
const book = `<header class="novel-header"><h1>${title}</h1><figure class="cover"><img src="/cover.svg"></figure><div class="author"><a>Example Author</a></div><div class="header-stats"><span><strong>3</strong><small>Chapters</small></span><span><strong>Completed</strong><small>Status</small></span></div><div class="categories"><a>Fantasy</a></div></header>`;
const cards = `<ul class="novel-list">${Array.from({ length: 8 }, (_, i) => `<li><a href="/book/${i ? `example-${i}` : 'example'}"><h4 class="novel-title">${title}</h4><img src="/cover.svg"><div class="novel-stats">3 Chapters</div></a></li>`).join('')}</ul>`;
const publication = { series_id: '1', title, type: 'Manga', year: 2020, url: 'https://www.mangaupdates.com/series/example',
  status: 'Complete', latest_chapter: '3', authors: [{ name: 'Example Author', type: 'Author' }], publishers: [{ publisher_name: 'Example Publisher' }] };

const upstream = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:3101');
  const send = (data, status = 200, type = 'application/json') => { res.writeHead(status, { 'Content-Type': type }); res.end(type === 'application/json' ? JSON.stringify(data) : data); };
  if (url.pathname === '/cover.svg') return send(art, 200, 'image/svg+xml');
  if (url.pathname.startsWith('/atsu/')) {
    const scanlators = [{ id: 'Alpha', name: 'Alpha Translation' }, { id: 'Beta', name: 'Beta Translation' }];
    const series = id => ({ id, title, type: id === 'hua' ? 'Manhua' : id === 'manga' ? 'Manga' : 'Manwha', medium: 'Comic', isAdult: false,
      status: 'Completed', synopsis: description, image: '/posters/fixture.webp', poster: { image: '/posters/fixture.webp' },
      genres: [{ name: 'Fantasy' }], scanlators, totalChapterCount: id === 'Long' ? 100 : 3 });
    const numbers = (url.searchParams.get('mangaId') ?? url.searchParams.get('id')) === 'Long' ? Array.from({ length: 101 }, (_, i) => i) : [0, 1, 1.5, 3];
    const refs = numbers.flatMap((number, index) => scanlators.map(group => ({ id: `${group.id}-${String(number).replace('.', '_')}`, title: `Chapter ${number}: ${title}`,
      number, index, scanlationMangaId: group.id, pageCount: 2, createdAt: 1792748800000 })));
    if (url.pathname.includes('/home2/')) return send({ items: ['Story', 'manga', 'hua'].map(series) });
    if (url.pathname.includes('/documents/search')) {
      if (url.searchParams.get('q') === 'offline') return send({ error: 'Offline' }, 503);
      return send({ hits: url.searchParams.get('q') === 'empty' ? [] : ['Story', 'manga', 'hua'].map(id => ({ document: series(id) })) });
    }
    if (url.pathname.endsWith('/page')) {
      if (url.searchParams.get('id') === 'missing') return send({}, 404);
      if (url.searchParams.get('id') === 'offline') return send({}, 503);
      return send({ mangaPage: series(url.searchParams.get('id')) });
    }
    if (url.pathname.endsWith('/allChapters')) return send({ chapters: refs });
    if (url.pathname.endsWith('/chapter')) {
      const ref = refs.find(c => c.id === url.searchParams.get('chapterId'));
      if (!ref) return send({}, 404);
      return send({ readChapter: { id: ref.id, number: ref.number, scanlationMangaId: ref.scanlationMangaId,
        pages: [0, 1].map(number => ({ number, image: `/static/pages/${ref.id}/${number}.webp`, width: 720, height: number ? 900 : 4000 })) } });
    }
    return send({}, 404);
  }
  if (url.pathname === '/graphql') {
    let body = ''; for await (const chunk of req) body += chunk;
    const { query, variables = {} } = JSON.parse(body);
    if (variables.search === 'offline') return send({ errors: [{ message: 'Fixture upstream unavailable' }] }, 503);
    const media = variables.search === 'empty' ? [] : Array.from({ length: 8 }, (_, i) => anime(i + 1));
    const data = query.includes('popular:') ? { popular: { media: [alManga] }, latest: { media: [alManga] }, trending: { media: [alManga] } }
      : query.includes('Media(id:') ? { Media: query.includes('type: MANGA') ? alManga : anime(variables.id) }
      : { Page: { media, pageInfo } };
    return send({ data });
  }
  if (url.pathname === '/md/manga') return send({ data: url.searchParams.get('title') === 'empty' ? [] : [mdManga] });
  if (url.pathname.endsWith('/feed')) return send({ data: url.searchParams.get('includeExternalUrl') === '1' ? chapters : chapters.slice(0, 2), total: url.searchParams.get('includeExternalUrl') === '1' ? 3 : 2 });
  if (url.pathname === `/md/manga/${mangaId}`) return send({ data: mdManga });
  if (url.pathname.startsWith('/md/chapter/')) {
    const chapter = chapters.find(c => url.pathname.endsWith(c.id));
    return send(chapter ? { data: chapter } : {}, chapter ? 200 : 404);
  }
  if (url.pathname.startsWith('/md/at-home/server/')) return send({ result: 'ok', baseUrl: 'https://uploads.mangadex.org', chapter: { hash: 'responsive-fixture', data: ['1.svg', '2.svg'], dataSaver: ['1.svg', '2.svg'] } });
  if (url.pathname === '/mu/series/search') return send({ results: [{ record: publication }] });
  if (url.pathname === '/mu/series/1') return send(publication);
  if (url.pathname.startsWith('/gb/volumes/')) return send({ id: 'example', volumeInfo: { title: 'Example', authors: ['Example Author'], description, imageLinks: { thumbnail: image }, pageCount: 200 } });
  if (url.pathname.startsWith('/nb/')) {
    const novel = slug => ({ id: slug, slug, name: title, status: 'Completed', cover: 'https://rs.novelbuddy.me/covers/shadow-slave.png',
      summary: description, authors: [{ name: 'Example Author' }], genres: [{ name: 'Fantasy' }], stats: { chapters_count: 3, views: 1000 }, rating: 4.8 });
    const refs = [3, 2, 1].map(n => ({ id: `chapter${n}`, slug: `chapter-${n}-the-adventurer`, name: `Chapter ${n}: ${title}`, number: n }));
    if (url.pathname === '/nb/titles/search') {
      if (url.searchParams.get('q') === 'offline') return send({ success: false }, 503);
      return send({ success: true, data: { items: url.searchParams.get('q') === 'empty' ? [] : Array.from({ length: 8 }, (_, i) => novel(i ? `example-${i}` : 'example')) } });
    }
    const slug = url.pathname.split('/')[4];
    if (url.pathname.startsWith('/nb/titles/by-slug/')) return send(slug === 'offline' ? { success: false } : { success: true, data: { title: novel(slug) } }, slug === 'offline' ? 503 : 200);
    if (url.pathname.endsWith('/chapters')) return send({ success: true, data: { chapters: refs } });
    const ref = refs.find(c => url.pathname.endsWith(`/chapters/${c.id}`));
    if (ref) return send({ success: true, data: { chapter: { ...ref, content: Array.from({ length: 30 }, () => `<p>${description}</p>`).join('') },
      previous_chapter: refs.find(c => c.number === ref.number - 1) ?? null, next_chapter: refs.find(c => c.number === ref.number + 1) ?? null } });
    return send({ success: false }, 404);
  }
  if (url.pathname === '/nf/search' || url.pathname.includes('/ranking') || url.pathname === '/nf/latest-release-novels') {
    if (url.searchParams.get('keyword') === 'offline') return send('Unavailable', 503, 'text/html');
    return send(url.searchParams.get('keyword') === 'empty' ? '<ul class="novel-list"></ul>' : cards.replaceAll('/cover.svg', 'http://127.0.0.1:3101/cover.svg'), 200, 'text/html');
  }
  if (url.pathname.startsWith('/nf/book/')) {
    const slug = url.pathname.split('/')[3];
    if (slug === 'offline') return send('Unavailable', 503, 'text/html');
    if (url.pathname.endsWith('/chapters')) return send(`<ul class="chapter-list">${[1, 2, 3].map(n => `<li><a href="/book/${slug}/chapter-${n}"><strong class="chapter-title">Chapter ${n}: ${title}</strong></a></li>`).join('')}</ul>`, 200, 'text/html');
    const number = Number(url.pathname.match(/chapter-(\d+)$/)?.[1]);
    if (number) return send(`<h1 class="chapter-title">Chapter ${number}: ${title}</h1><div id="chapter-container"><div id="content">${Array.from({ length: 30 }, () => `<p>${description}</p>`).join('')}</div></div><div class="chapternav">${number > 1 ? `<a rel="prev" href="/book/${slug}/chapter-${number - 1}">Previous</a>` : ''}${number < 3 ? `<a rel="next" href="/book/${slug}/chapter-${number + 1}">Next</a>` : ''}</div>`, 200, 'text/html');
    return send(book.replace('/cover.svg', 'http://127.0.0.1:3101/cover.svg'), 200, 'text/html');
  }
  send({}, 404);
});

upstream.listen(3101, '127.0.0.1', () => {
  const child = spawn(process.execPath, ['--require', './checks/e2e/redirect-novels.cjs', 'node_modules/next/dist/bin/next', 'dev', '--webpack', '--port', '3100'], {
    stdio: 'inherit', env: { ...process.env,
      ANILIST_ENDPOINT: 'http://127.0.0.1:3101/graphql', MANGADEX_API_BASE: 'http://127.0.0.1:3101/md',
      MANGAUPDATES_API_BASE: 'http://127.0.0.1:3101/mu', GOOGLE_BOOKS_API_BASE: 'http://127.0.0.1:3101/gb',
      GOOGLE_BOOKS_API_KEY: '', NOVELFIRE_API_BASE: 'https://novelfire.net', NOVELFIRE_API_REFERER: 'https://novelfire.net/',
      NOVEL_PROVIDER: 'novelbuddy', NOVELBUDDY_API_BASE: 'http://127.0.0.1:3101/nb',
      ATSUMARU_BASE_URL: 'http://127.0.0.1:3101/atsu', ATSUMARU_IMAGE_BASE_URL: 'https://cdn.atsu.moe',
      NEXT_TEST_DIST_DIR: '.next/responsive',
      UPSTASH_REDIS_REST_URL: '', UPSTASH_REDIS_REST_TOKEN: '', CSP_ENFORCE: 'true',
    },
  });
  const stop = () => { child.kill('SIGTERM'); upstream.close(); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  child.on('exit', code => upstream.close(() => process.exit(code ?? 0)));
});

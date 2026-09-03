import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAnimeById } from '@/lib/anilist';
import VideoPlayer, { type IframeProvider, type StreamingLink } from '@/components/VideoPlayer';
import EpisodeList from '@/components/EpisodeList';
import AiringTime from '@/components/AiringTime';
import { buildAnimeEpisodes } from '@/lib/anime-episodes';
import { getAnimeTitle } from '@/lib/utils';
import { buildVidFastTvUrl } from '@/lib/vidfast';
// import { buildVidLinkAnimeUrl } from '@/lib/vidlink';
// import { buildDropFileAnimeUrl } from '@/lib/dropfile';

interface Props {
  params: Promise<{ animeId: string; episodeId: string }>;
  searchParams: Promise<{ season?: string }>;
}

export const revalidate = 3600;

export default async function WatchPage({ params, searchParams }: Props) {
  const { animeId, episodeId: rawEpisodeId } = await params;
  const { season: rawSeason } = await searchParams;
  const episodeNumber = Number(rawEpisodeId);
  const seasonNumber = Number(rawSeason) || 1;
  const anilistId = Number(animeId);

  if (!Number.isInteger(anilistId) || anilistId <= 0 || !Number.isInteger(episodeNumber) || episodeNumber <= 0) {
    notFound();
  }

  const animeData = await getAnimeById(anilistId).catch(() => null);
  if (!animeData) return notFound();
  const anime = animeData;

  const title = getAnimeTitle(anime.title);

  const episodes = buildAnimeEpisodes(anime);
  const currentEpisode = episodes.find(e => e.number === episodeNumber);
  if (!currentEpisode) notFound();

  const availableEpisodes = episodes.filter(e => e.availability === 'available');
  const availableEpisodeCount = availableEpisodes.length;
  const previousEpisodes = availableEpisodes.filter(e => e.number < currentEpisode.number);
  const prevEpisode = previousEpisodes.at(-1) ?? null;
  const nextEpisode = availableEpisodes.find(e => e.number > currentEpisode.number) ?? null;
  const latestAvailableEpisode = availableEpisodes.at(-1) ?? null;
  const isUpcoming = currentEpisode.availability === 'upcoming';

  // SIMKL ID lookup: AniList ID → IMDb ID + TVDb ID (cached 24h)
  let imdbId: string | null = null;
  const simklClientId = process.env.SIMKL_CLIENT_ID;
  if (simklClientId && !isUpcoming) {
    try {
      // Step 1: resolve AniList ID → SIMKL ID
      const searchRes = await fetch(
        `https://api.simkl.com/search/id?anilist=${anilistId}&client_id=${simklClientId}`,
        { next: { revalidate: 86400 } }
      );
      if (searchRes.ok) {
        const searchData: Array<{ ids?: { simkl?: number } }> = await searchRes.json();
        const simklId = searchData?.[0]?.ids?.simkl;
        if (simklId) {
          // Step 2: get full details with IMDb / TVDb IDs
          const detailRes = await fetch(
            `https://api.simkl.com/anime/${simklId}?extended=full&client_id=${simklClientId}`,
            { next: { revalidate: 86400 } }
          );
          if (detailRes.ok) {
            const detail: { ids?: { imdb?: string; tvdb?: number } } = await detailRes.json();
            if (detail.ids?.imdb) imdbId = detail.ids.imdb;
          }
        }
      }
    } catch {
      // non-fatal
    }
  }

  const vidfastImdbId = imdbId && /^tt\d{7,10}$/.test(imdbId) ? imdbId : null;
  const iframeProviders: IframeProvider[] = [
    ...(vidfastImdbId
      ? [{ label: "VidFast", src: buildVidFastTvUrl(vidfastImdbId, seasonNumber, episodeNumber) }]
      : []),
    // ...(anime.idMal
    //   ? [{
    //       label: "VidLink",
    //       src: buildVidLinkAnimeUrl(anime.idMal, episodeNumber, "sub"),
    //       experimental: true,
    //       parameterSummary: `MAL ${anime.idMal} · EP ${episodeNumber} · SUB · FALLBACK ON`,
    //     }]
    //   : []),
    // {
    //   label: "DropFile",
    //   src: buildDropFileAnimeUrl(anilistId, seasonNumber, episodeNumber, "sub", "en"),
    //   experimental: true,
    //   parameterSummary: `ANILIST ${anilistId} · S${seasonNumber} · EP ${episodeNumber} · SUB · EN`,
    // },
  ];

  // // Jikan streaming services (official platforms) — server-side fetch, no CORS issues
  // let streamingLinks: StreamingLink[] = [];
  // if (anime.idMal) {
  //   try {
  //     const jikanRes = await fetch(
  //       `https://api.jikan.moe/v4/anime/${anime.idMal}/streaming`,
  //       { next: { revalidate: 86400 } }
  //     );
  //     if (jikanRes.ok) {
  //       const jikanData = await jikanRes.json();
  //       streamingLinks = (jikanData.data ?? []).map((s: { name: string; url: string }) => ({
  //         name: s.name,
  //         url: s.url,
  //       }));
  //     }
  //   } catch {
  //     // non-fatal — just skip the official tab
  //   }
  // }
  const streamingLinks: StreamingLink[] = [];

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '1.5rem 1.5rem 4rem' }}>

      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1.25rem' }}>
        <Link href='/' style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.68rem', letterSpacing: '0.1em', color: 'var(--muted)', textDecoration: 'none', textTransform: 'uppercase' }}>HOME</Link>
        <span style={{ color: 'var(--red)', fontSize: '0.6rem' }}>›</span>
        <Link href={'/anime/' + anilistId} style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.68rem', letterSpacing: '0.1em', color: 'var(--muted)', textDecoration: 'none', textTransform: 'uppercase', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title.toUpperCase()}
        </Link>
        <span style={{ color: 'var(--red)', fontSize: '0.6rem' }}>›</span>
        <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.68rem', letterSpacing: '0.1em', color: 'var(--paper-2)', textTransform: 'uppercase' }}>
          {currentEpisode ? 'EP ' + currentEpisode.number : 'WATCH'}
        </span>
      </nav>

      {/* Main layout */}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }} className='xl:flex-nowrap'>

        {/* Player column */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {isUpcoming ? (
            <section className="player-shell" aria-labelledby="episode-unavailable-title">
              <div className="player-empty" role="status">
                <h2 id="episode-unavailable-title">Episode not available yet</h2>
                <p>
                  Episode {currentEpisode.number} release:{' '}
                  <span style={{ color: 'var(--paper)' }}>
                    <AiringTime airingAt={currentEpisode.airingAt} />
                  </span>.
                </p>
                <div className="provider-links">
                  {latestAvailableEpisode && (
                    <Link className="editorial-button" href={'/watch/' + anilistId + '/' + encodeURIComponent(latestAvailableEpisode.id)}>
                      WATCH EP {latestAvailableEpisode.number}
                    </Link>
                  )}
                  <Link className="editorial-button" href={'/anime/' + anilistId}>
                    ALL EPISODES
                  </Link>
                </div>
              </div>
            </section>
          ) : (
            <VideoPlayer
              iframeProviders={iframeProviders}
              title={title + ' — Episode ' + currentEpisode.number}
              streamingLinks={streamingLinks}
            />
          )}

          {/* Episode title bar */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <h1 style={{ fontFamily: 'var(--font-display, Impact)', fontSize: 'clamp(1.1rem, 2.5vw, 1.8rem)', letterSpacing: '0.06em', color: 'var(--paper)', lineHeight: 1 }}>
              {title.toUpperCase()}
            </h1>
            <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.75rem', letterSpacing: '0.12em', color: isUpcoming ? 'var(--red)' : 'var(--muted)', textTransform: 'uppercase' }}>
              EP {String(currentEpisode.number).padStart(2, '0')}{isUpcoming ? ' · UPCOMING' : ''}
            </span>
          </div>

          {/* Navigation row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>

            {/* All episodes link
            <HoverLink href={'/anime/' + anilistId} style={{
              fontFamily: 'var(--font-condensed, Arial)',
              fontSize: '0.68rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              padding: '7px 16px',
              border: '1px solid var(--border-2)',
              color: 'var(--paper-2)',
              textDecoration: 'none',
              transition: 'all 0.15s',
            }}
            >
              ◫ ALL EPISODES
            </HoverLink> */}

            {/* Prev / Next */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {prevEpisode ? (
                <Link href={'/watch/' + anilistId + '/' + encodeURIComponent(prevEpisode.id)} style={{
                  fontFamily: 'var(--font-condensed, Arial)',
                  fontSize: '0.68rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  padding: '7px 16px',
                  border: '1px solid var(--border-2)',
                  color: 'var(--paper-2)',
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                }}>
                  ‹ EP {prevEpisode.number}
                </Link>
              ) : (
                <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '7px 16px', border: '1px solid var(--border)', color: 'var(--border-2)', userSelect: 'none' }}>‹ PREV</span>
              )}
              {nextEpisode ? (
                <Link href={'/watch/' + anilistId + '/' + encodeURIComponent(nextEpisode.id)} style={{
                  fontFamily: 'var(--font-display, Impact)',
                  fontSize: '0.9rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '7px 20px',
                  background: 'var(--red)',
                  border: '1px solid var(--red)',
                  color: 'var(--paper)',
                  textDecoration: 'none',
                  transition: 'opacity 0.15s',
                }}>
                  EP {nextEpisode.number} ›
                </Link>
              ) : (
                <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '7px 16px', border: '1px solid var(--border)', color: 'var(--border-2)', userSelect: 'none' }}>NEXT ›</span>
              )}
            </div>
          </div>
        </div>

        {/* Episode sidebar */}
        <div style={{ width: '288px', flexShrink: 0 }} className='w-full xl:w-72'>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ fontFamily: 'var(--font-display, Impact)', fontSize: '1.2rem', letterSpacing: '0.08em', color: 'var(--paper)' }}>EPISODES</span>
            {episodes.length > 0 && (
              <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.65rem', letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase' }}>{availableEpisodeCount} OF {episodes.length} AVAILABLE</span>
            )}
          </div>
          {episodes.length > 0 ? (
            <EpisodeList episodes={episodes} anilistId={anilistId} currentEpisodeId={String(episodeNumber)} />
          ) : (
            <p style={{ fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.83rem', color: 'var(--muted)' }}>No episodes available.</p>
          )}
        </div>
      </div>
    </div>
  );
}

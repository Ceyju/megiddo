import EpisodeList from '@/components/EpisodeList';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getAnimeById } from '@/lib/anilist';
import { getAnimeTitle, formatScore, formatStatus, stripHtml } from '@/lib/utils';

export const revalidate = 3600;

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  try {
    const anime = await getAnimeById(Number(id));
    const title = getAnimeTitle(anime.title);
    return { title: title + ' — MEGIDDO', description: anime.description ? stripHtml(anime.description).slice(0, 160) : undefined };
  } catch {
    return { title: 'Anime — MEGIDDO' };
  }
}

export default async function AnimePage({ params }: Props) {
  const { id } = await params;
  const anilistId = Number(id);

  const animeData = await getAnimeById(anilistId).catch(() => null);
  if (!animeData) return notFound();
  const anime = animeData;

  const title = getAnimeTitle(anime.title);

  // Generate episode list from AniList data — no external streaming API needed
  const episodeCount = anime.episodes
    ?? (anime.status === 'RELEASING' ? Math.max((anime.nextAiringEpisode?.episode ?? 1) - 1, 1) : 1);
  const episodes = Array.from({ length: episodeCount }, (_, i) => ({
    id: String(i + 1),
    number: i + 1,
    url: '',
  }));
  const firstEpisode = episodes[0];
  const studios = anime.studios.nodes.map(s => s.name).join(', ');

  return (
    <div style={{ minHeight: '100vh' }}>

      {/* Hero banner */}
      <div style={{ position: 'relative', height: 'clamp(200px, 30vw, 340px)', overflow: 'hidden' }}>
        {anime.bannerImage ? (
          <Image src={anime.bannerImage} alt={title} fill priority className='object-cover' unoptimized />
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            background: anime.coverImage.color
              ? `linear-gradient(135deg, ${anime.coverImage.color}28 0%, var(--ink) 100%)`
              : 'linear-gradient(135deg, var(--surface-2) 0%, var(--ink) 100%)'
          }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--ink) 0%, rgba(11,10,8,0.4) 50%, rgba(11,10,8,0.2) 100%)' }} />
        {/* Red top accent */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--red)' }} />
      </div>

      {/* Main */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem 5rem' }}>

        {/* Cover + title block — overlaps banner */}
        <div style={{ display: 'flex', gap: '1.75rem', marginTop: '-5rem', position: 'relative', zIndex: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>

          {/* Cover */}
          <div style={{
            position: 'relative',
            width: 'clamp(110px, 14vw, 168px)',
            aspectRatio: '2/3',
            flexShrink: 0,
            border: '1px solid var(--border-2)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
          }}>
            <Image src={anime.coverImage.extraLarge || anime.coverImage.large} alt={title} fill className='object-cover' sizes='168px' unoptimized />
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: 'var(--red)' }} />
          </div>

          {/* Title block */}
          <div style={{ flex: 1, minWidth: '220px', paddingBottom: '0.5rem' }}>
            {anime.title.native && (
              <div style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.7rem', letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                {anime.title.native}
              </div>
            )}
            <h1 style={{
              fontFamily: 'var(--font-display, Impact)',
              fontSize: 'clamp(1.8rem, 4vw, 3.5rem)',
              letterSpacing: '0.04em',
              color: 'var(--paper)',
              lineHeight: 1,
              marginBottom: '0.75rem',
            }}>
              {title.toUpperCase()}
            </h1>

            {/* Meta row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '0.75rem', alignItems: 'center' }}>
              {anime.averageScore && (
                <div style={{ fontFamily: 'var(--font-display, Impact)', fontSize: '1.5rem', letterSpacing: '0.04em', color: 'var(--paper)', lineHeight: 1 }}>
                  {formatScore(anime.averageScore)}
                  <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.65rem', color: 'var(--muted)', marginLeft: '3px' }}>/10</span>
                </div>
              )}
              {[
                formatStatus(anime.status),
                anime.format?.replace('_', ' '),
                anime.seasonYear ? (anime.season + ' ' + anime.seasonYear) : null,
                anime.duration ? (anime.duration + ' MIN/EP') : null,
              ].filter(Boolean).map((v, i) => (
                <span key={i} style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.68rem', letterSpacing: '0.1em', color: 'var(--paper-2)', textTransform: 'uppercase', borderLeft: '2px solid var(--border-2)', paddingLeft: '12px' }}>
                  {v}
                </span>
              ))}
            </div>

            {/* Genres */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {anime.genres.map(g => (
                <Link key={g} href={'?genres=' + encodeURIComponent(g)} style={{
                  fontFamily: 'var(--font-condensed, Arial)',
                  fontSize: '0.6rem',
                  letterSpacing: '0.1em',
                  color: 'var(--paper-2)',
                  border: '1px solid var(--border-2)',
                  padding: '2px 8px',
                  textDecoration: 'none',
                  textTransform: 'uppercase',
                  transition: 'all 0.15s',
                }}>
                  {g}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Watch button */}
        <div style={{ margin: '2rem 0', display: 'flex', gap: '12px', alignItems: 'center' }}>
          {firstEpisode ? (
            <Link href={'/watch/' + anilistId + '/' + encodeURIComponent(firstEpisode.id)} style={{
              fontFamily: 'var(--font-display, Impact)',
              fontSize: '1.1rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '12px 32px',
              background: 'var(--red)',
              color: 'var(--paper)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              ▶ WATCH EP 1
            </Link>
          ) : (
            <div style={{
              fontFamily: 'var(--font-condensed, Arial)',
              fontSize: '0.72rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '10px 20px',
              border: '1px solid var(--border-2)',
              color: 'var(--muted)',
            }}>
              STREAM UNAVAILABLE
            </div>
          )}
          {episodes.length > 0 && (
            <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.68rem', letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase' }}>
              {episodes.length} EPISODES AVAILABLE
            </span>
          )}
        </div>

        {/* Body: Synopsis + Episodes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '3rem' }} className='lg:grid-cols-3-auto'>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: '2.5rem' }} className='grid lg:grid-cols-[1fr_280px] lg:gap-10'>

            {/* Left */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
              {anime.description && (
                <div>
                  <div style={{ fontFamily: 'var(--font-display, Impact)', fontSize: '1.2rem', letterSpacing: '0.08em', color: 'var(--paper)', marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                    SYNOPSIS
                  </div>
                  <p style={{ fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.88rem', color: 'var(--paper-2)', lineHeight: 1.7 }}>
                    {stripHtml(anime.description)}
                  </p>
                </div>
              )}

              {/* Info grid */}
              <div>
                <div style={{ fontFamily: 'var(--font-display, Impact)', fontSize: '1.2rem', letterSpacing: '0.08em', color: 'var(--paper)', marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                  DETAILS
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {[
                    ['STUDIO', studios || 'Unknown'],
                    ['EPISODES', anime.episodes ? String(anime.episodes) : 'Unknown'],
                    ['SOURCE', anime.source?.replace('_', ' ') ?? 'Unknown'],
                    ['STATUS', formatStatus(anime.status)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.6rem', letterSpacing: '0.14em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '2px' }}>{label}</div>
                      <div style={{ fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.85rem', color: 'var(--paper)' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Relations */}
              {anime.relations.edges.length > 0 && (
                <div>
                  <div style={{ fontFamily: 'var(--font-display, Impact)', fontSize: '1.2rem', letterSpacing: '0.08em', color: 'var(--paper)', marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                    RELATED
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {anime.relations.edges
                      .filter(e => ['PREQUEL', 'SEQUEL', 'SIDE_STORY', 'ALTERNATIVE'].includes(e.relationType))
                      .map(e => (
                        <Link key={e.node.id} href={'/anime/' + e.node.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 12px',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          textDecoration: 'none',
                          maxWidth: '280px',
                          transition: 'border-color 0.15s',
                        }}>
                          <div style={{ position: 'relative', width: '32px', height: '48px', flexShrink: 0 }}>
                            <Image src={e.node.coverImage.large} alt={getAnimeTitle(e.node.title)} fill className='object-cover' sizes='32px' unoptimized />
                          </div>
                          <div>
                            <div style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.58rem', letterSpacing: '0.12em', color: 'var(--red)', textTransform: 'uppercase', marginBottom: '2px' }}>
                              {e.relationType.replace('_', ' ')}
                            </div>
                            <div style={{ fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.78rem', color: 'var(--paper)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                              {getAnimeTitle(e.node.title)}
                            </div>
                          </div>
                        </Link>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Episodes */}
            <div>
              <div style={{ fontFamily: 'var(--font-display, Impact)', fontSize: '1.2rem', letterSpacing: '0.08em', color: 'var(--paper)', marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                EPISODES
                {episodes.length > 0 && (
                  <span style={{ fontFamily: 'var(--font-condensed, Arial)', fontSize: '0.68rem', color: 'var(--muted)', letterSpacing: '0.1em' }}>
                    {episodes.length} TOTAL
                  </span>
                )}
              </div>
              {episodes.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '560px', overflowY: 'auto', border: '1px solid var(--border)' }}>
                  {episodes.length > 0 ? (
                    <EpisodeList episodes={episodes} anilistId={anilistId} />
                  ) : (
                    <p style={{ fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.83rem', color: 'var(--muted)' }}>
                      No episodes available.
                    </p>
                  )}
                </div>
              ) : (
                <p style={{ fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.83rem', color: 'var(--muted)' }}>No episodes available.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

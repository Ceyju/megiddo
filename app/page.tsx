import { getTrending, getPopular, getSeasonalAnime, getCurrentSeason } from "@/lib/anilist";
import AnimeHeroCarousel from "@/components/AnimeHeroCarousel";
import AnimeGrid from "@/components/AnimeGrid";
import ProviderUnavailable from '@/components/ProviderUnavailable';
import { UpstreamError } from '@/lib/server/outbound';
import { connection } from 'next/server';
import { unstable_rethrow } from 'next/navigation';

export const revalidate = 3600;

// Genre tags for the scrolling marquee
const GENRE_TAGS = [
  "ACTION", "ADVENTURE", "COMEDY", "DRAMA", "FANTASY", "HORROR",
  "MECHA", "MYSTERY", "PSYCHOLOGICAL", "ROMANCE", "SCI-FI",
  "SLICE OF LIFE", "SPORTS", "SUPERNATURAL", "THRILLER", "MUSIC",
  "ACTION", "ADVENTURE", "COMEDY", "DRAMA", "FANTASY", "HORROR",
  "MECHA", "MYSTERY", "PSYCHOLOGICAL", "ROMANCE", "SCI-FI",
  "SLICE OF LIFE", "SPORTS", "SUPERNATURAL", "THRILLER", "MUSIC",
];

export default async function HomePage() {
  await connection();
  const { season, year } = getCurrentSeason();

  let discovery;
  try {
    discovery = await Promise.all([
      getTrending(1, 20),
      getPopular(1, 18),
      getSeasonalAnime(season, year, 1, 18),
    ]);
  } catch (error) {
    unstable_rethrow(error);
    if (!(error instanceof UpstreamError)) throw error;
    return <main><ProviderUnavailable title="Anime library temporarily unavailable"
      message="Anime data cannot be loaded right now. Please retry shortly or browse another library."
      backHref="/manga" backLabel="Browse manga" retryHref="/" /></main>;
  }
  const [trending, popular, seasonal] = discovery;

  return (
    <main>
      {/* Hero */}
      <AnimeHeroCarousel items={trending.media.slice(0, 8)} />

      {/* Scrolling genre strip */}
      <div
        className="overflow-hidden py-3 border-y"
        style={{ borderColor: "var(--border)", background: "var(--ink-2)" }}
      >
        <div className="marquee-inner">
          {GENRE_TAGS.map((g, i) => (
            <span
              key={i}
              style={{
                fontFamily: "var(--font-condensed, Arial)",
                fontSize: "0.65rem",
                letterSpacing: "0.16em",
                color: "var(--muted)",
                padding: "0 20px",
                whiteSpace: "nowrap",
                textTransform: "uppercase",
              }}
            >
              {g}
              <span style={{ color: "var(--red)", marginLeft: "20px" }}>·</span>
            </span>
          ))}
        </div>
      </div>

      {/* Content sections */}
      <div className="page-gutter w-full mx-auto py-12 flex flex-col gap-14">
        <AnimeGrid title="TRENDING NOW" anime={trending.media.slice(1)} />
        <AnimeGrid
          title={`${season} ${year}`}
          anime={seasonal.media}
        />
        <AnimeGrid title="ALL-TIME POPULAR" anime={popular.media} />
      </div>
    </main>
  );
}

import { getTrending, getPopular, getSeasonalAnime, getCurrentSeason } from "@/lib/anilist";
import HeroBanner from "@/components/HeroBanner";
import AnimeGrid from "@/components/AnimeGrid";

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
  const { season, year } = getCurrentSeason();

  const [trending, popular, seasonal] = await Promise.all([
    getTrending(1, 20),
    getPopular(1, 18),
    getSeasonalAnime(season, year, 1, 18),
  ]);

  const hero = trending.media[0];

  return (
    <main>
      {/* Hero */}
      {hero && <HeroBanner anime={hero} />}

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
      <div className="w-full mx-auto px-6 py-12 flex flex-col gap-14">
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

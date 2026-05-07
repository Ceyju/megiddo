import AnimeCard from "@/components/AnimeCard";
import type { AniListAnime } from "@/types";

interface AnimeGridProps {
  title?: string;
  anime: AniListAnime[];
}

export default function AnimeGrid({ title, anime }: AnimeGridProps) {
  return (
    <section>
      {title && (
        <div className="flex items-baseline gap-4 mb-5">
          <h2
            style={{
              fontFamily: "var(--font-display, Impact)",
              fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
              letterSpacing: "0.06em",
              color: "var(--paper)",
              lineHeight: 1,
            }}
          >
            {title}
          </h2>
          <span
            style={{
              display: "block",
              height: "2px",
              flex: 1,
              background: "var(--border)",
              marginBottom: "4px",
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-condensed, Arial)",
              fontSize: "1rem",
              letterSpacing: "0.12em",
              color: "var(--red)",
              textTransform: "uppercase",
            }}
          >
            {anime.length} TITLES
          </span>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
        {anime.map((a, i) => (
          <AnimeCard key={a.id} anime={a} index={i} />
        ))}
      </div>
    </section>
  );
}

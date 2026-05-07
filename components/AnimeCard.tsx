import Link from "next/link";
import Image from "next/image";
import { cn, formatScore, getAnimeTitle } from "@/lib/utils";
import type { AniListAnime } from "@/types";

interface AnimeCardProps {
  anime: AniListAnime;
  className?: string;
  index?: number;
}

export default function AnimeCard({ anime, className, index = 0 }: AnimeCardProps) {
  const title = getAnimeTitle(anime.title);
  const score = formatScore(anime.averageScore);
  const delay = Math.min(index * 0.05, 0.5);

  return (
    <Link
      href={`/anime/${anime.id}`}
      className={cn("group relative flex flex-col card-lift", className)}
      style={{
        textDecoration: "none",
        animationDelay: `${delay}s`,
      }}
    >
      {/* Cover */}
      <div
        className="relative overflow-hidden card-reveal"
        style={{
          aspectRatio: "2/3",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          animationDelay: `${delay}s`,
        }}
      >
        <Image
          src={anime.coverImage.extraLarge || anime.coverImage.large}
          alt={title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          unoptimized
        />

        {/* Score — top-left pill */}
        {anime.averageScore && (
          <div
            className="absolute top-0 left-0 px-2 py-1"
            style={{
              background: "var(--ink)",
              fontFamily: "var(--font-display, Impact)",
              fontSize: "1rem",
              letterSpacing: "0.04em",
              color: "var(--paper)",
              lineHeight: 1,
            }}
          >
            {score}
          </div>
        )}

        {/* Status badge */}
        {anime.status === "RELEASING" && (
          <div
            className="absolute top-0 right-0 px-2 py-1"
            style={{
              background: "var(--lime)",
              fontFamily: "var(--font-condensed, Arial)",
              fontSize: "0.6rem",
              letterSpacing: "0.1em",
              color: "var(--ink)",
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            AIRING
          </div>
        )}

        {/* Hover overlay */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end"
          style={{ background: "linear-gradient(to top, rgba(11,10,8,0.95) 0%, rgba(11,10,8,0.4) 60%, transparent 100%)" }}
        >
          <div className="p-3 w-full">
            <div
              style={{
                fontFamily: "var(--font-condensed, Arial)",
                fontSize: "0.65rem",
                letterSpacing: "0.12em",
                color: "var(--red)",
                textTransform: "uppercase",
                marginBottom: "2px",
              }}
            >
              {anime.format?.replace("_", " ") ?? "ANIME"} · {anime.episodes ? `${anime.episodes} EPS` : "?"}
            </div>
            <div className="flex gap-1 flex-wrap">
              {anime.genres.slice(0, 2).map((g) => (
                <span
                  key={g}
                  style={{
                    fontFamily: "var(--font-condensed, Arial)",
                    fontSize: "0.58rem",
                    letterSpacing: "0.08em",
                    color: "var(--paper-2)",
                    border: "1px solid var(--border-2)",
                    padding: "1px 5px",
                  }}
                >
                  {g.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Red bottom accent bar */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "var(--red)" }}
        />
      </div>

      {/* Title */}
      <div
        className="pt-2 pb-0.5 card-reveal"
        style={{ animationDelay: `${delay + 0.05}s` }}
      >
        <h3
          className="line-clamp-2 leading-tight"
          style={{
            fontFamily: "var(--font-body, sans-serif)",
            fontSize: "0.78rem",
            fontWeight: 500,
            color: "var(--paper-2)",
            transition: "color 0.15s",
          }}
          // Can't use group-hover in inline style — handle via CSS class trick
        >
          {title}
        </h3>
      </div>
    </Link>
  );
}

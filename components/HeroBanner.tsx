"use client";

import Link from "next/link";
import Image from "next/image";
import { getAnimeTitle, formatScore, stripHtml } from "@/lib/utils";
import type { AniListAnime } from "@/types";

interface HeroBannerProps {
  anime: AniListAnime;
}

export default function HeroBanner({ anime }: HeroBannerProps) {
  const title = getAnimeTitle(anime.title);
  const score = formatScore(anime.averageScore);

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ minHeight: "clamp(420px, 50vw, 400px)" }}
    >
      {/* Background banner */}
      {anime.bannerImage ? (
        <Image
          src={anime.bannerImage}
          alt={title}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
          unoptimized
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: anime.coverImage.color
              ? `linear-gradient(120deg, ${anime.coverImage.color}30 0%, var(--ink) 60%)`
              : "linear-gradient(120deg, var(--surface-2) 0%, var(--ink) 60%)",
          }}
        />
      )}

      {/* Left fade overlay — strong ink coverage */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, var(--ink) 0%, var(--ink) 28%, rgba(11,10,8,0.82) 55%, rgba(11,10,8,0.2) 80%, transparent 100%)",
        }}
      />
      {/* Bottom fade */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, var(--ink) 0%, rgba(11,10,8,0.6) 30%, transparent 60%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 h-full flex items-end pb-12 md:pb-16 pt-12">
        <div className="flex gap-7 items-end w-full max-w-3xl">
          {/* Cover thumbnail */}
          <div
            className="hidden sm:block shrink-0 shadow-2xl"
            style={{
              width: "clamp(100px, 12vw, 148px)",
              border: "1px solid var(--border-2)",
              position: "relative",
              aspectRatio: "2/3",
            }}
          >
            <Image
              src={anime.coverImage.extraLarge || anime.coverImage.large}
              alt={title}
              fill
              className="object-cover"
              sizes="148px"
              unoptimized
            />
            {/* Red left-edge accent */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: "3px",
                background: "var(--red)",
              }}
            />
          </div>

          {/* Text block */}
          <div className="flex flex-col gap-3 flex-1 min-w-0">
            {/* Eyebrow row */}
            <div className="flex items-center gap-3 flex-wrap">
              {anime.status === "RELEASING" && (
                <span
                  style={{
                    background: "var(--lime)",
                    color: "var(--ink)",
                    fontFamily: "var(--font-condensed, Arial)",
                    fontSize: "0.62rem",
                    letterSpacing: "0.14em",
                    fontWeight: 700,
                    padding: "2px 8px",
                    textTransform: "uppercase",
                  }}
                >
                  NOW AIRING
                </span>
              )}
              {anime.seasonYear && (
                <span
                  style={{
                    fontFamily: "var(--font-condensed, Arial)",
                    fontSize: "0.7rem",
                    letterSpacing: "0.1em",
                    color: "var(--muted)",
                    textTransform: "uppercase",
                  }}
                >
                  {anime.season} {anime.seasonYear}
                </span>
              )}
              {anime.averageScore && (
                <span
                  style={{
                    fontFamily: "var(--font-display, Impact)",
                    fontSize: "1.1rem",
                    letterSpacing: "0.04em",
                    color: "var(--paper)",
                  }}
                >
                  {score}
                  <span
                    style={{
                      fontFamily: "var(--font-condensed, Arial)",
                      fontSize: "0.6rem",
                      color: "var(--muted)",
                      marginLeft: "3px",
                      letterSpacing: "0.1em",
                    }}
                  >
                    /10
                  </span>
                </span>
              )}
            </div>

            {/* Big title */}
            <h1
              className="line-clamp-3 leading-none"
              style={{
                fontFamily: "var(--font-display, Impact)",
                fontSize: "clamp(2.4rem, 5.5vw, 4.5rem)",
                letterSpacing: "0.03em",
                color: "var(--paper)",
                lineHeight: 0.95,
              }}
            >
              {title.toUpperCase()}
            </h1>

            {/* Genres */}
            <div className="flex flex-wrap gap-2">
              {anime.genres.slice(0, 4).map((g) => (
                <span
                  key={g}
                  style={{
                    fontFamily: "var(--font-condensed, Arial)",
                    fontSize: "0.62rem",
                    letterSpacing: "0.1em",
                    color: "var(--paper-2)",
                    border: "1px solid var(--border-2)",
                    padding: "2px 8px",
                    textTransform: "uppercase",
                  }}
                >
                  {g}
                </span>
              ))}
            </div>

            {/* Description */}
            {anime.description && (
              <p
                className="line-clamp-2 max-w-lg"
                style={{
                  fontFamily: "var(--font-body, sans-serif)",
                  fontSize: "0.83rem",
                  color: "var(--muted)",
                  lineHeight: 1.55,
                }}
              >
                {stripHtml(anime.description)}
              </p>
            )}

            {/* CTA */}
            <div className="flex items-center gap-3 mt-1">
              <Link
                href={`/anime/${anime.id}`}
                className="inline-flex items-center gap-2 transition-all"
                style={{
                  background: "var(--red)",
                  color: "var(--paper)",
                  fontFamily: "var(--font-display, Impact)",
                  fontSize: "1rem",
                  letterSpacing: "0.1em",
                  padding: "10px 24px",
                  textDecoration: "none",
                  textTransform: "uppercase",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.filter = "brightness(1.15)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.filter = "none")}
              >
                ▶ WATCH NOW
              </Link>
              {anime.episodes && (
                <span
                  style={{
                    fontFamily: "var(--font-condensed, Arial)",
                    fontSize: "0.7rem",
                    letterSpacing: "0.1em",
                    color: "var(--muted)",
                    textTransform: "uppercase",
                  }}
                >
                  {anime.episodes} EPISODES
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Decorative diagonal stripe */}
      <div
        className="absolute right-0 top-0 bottom-0 w-[2px] hidden lg:block"
        style={{ background: "var(--border)" }}
      />
    </div>
  );
}


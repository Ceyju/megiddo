"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { getAnimeTitle, formatScore, stripHtml } from "@/lib/utils";
import type { AniListAnime } from "@/types";

const INTERVAL = 5000;

export default function AnimeHeroCarousel({ items }: { items: AniListAnime[] }) {
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback((idx: number) => {
    if (animating || idx === current) return;
    setAnimating(true);
    setPrev(current);
    setCurrent(idx);
    setProgress(0);
    setTimeout(() => { setPrev(null); setAnimating(false); }, 600);
  }, [animating, current]);

  const next = useCallback(() => {
    goTo((current + 1) % items.length);
  }, [current, goTo, items.length]);

  const startTimers = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    setProgress(0);
    let p = 0;
    progressRef.current = setInterval(() => {
      p += 100 / (INTERVAL / 50);
      setProgress(Math.min(p, 100));
    }, 50);
    intervalRef.current = setInterval(() => { next(); }, INTERVAL);
  }, [next]);

  useEffect(() => {
    startTimers();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [startTimers]);

  if (!items.length) return null;

  const item = items[current];
  const prevItem = prev !== null ? items[prev] : null;
  const title = getAnimeTitle(item.title);
  const score = item.averageScore ? formatScore(item.averageScore) : null;
  const bgSrc = item.bannerImage || item.coverImage.extraLarge;
  const prevBgSrc = prevItem ? (prevItem.bannerImage || prevItem.coverImage.extraLarge) : null;

  return (
    <div
      style={{ position: "relative", width: "100%", height: "clamp(320px, 45vw, 540px)", overflow: "hidden", background: "var(--surface)" }}
      onMouseEnter={() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (progressRef.current) clearInterval(progressRef.current);
      }}
      onMouseLeave={() => startTimers()}
    >
      {/* Background blur layers */}
      {prevBgSrc && (
        <div key={`bg-prev-${prev}`} style={{ position: "absolute", inset: 0, zIndex: 0, opacity: 0, transition: "opacity 0.6s ease" }}>
          <Image src={prevBgSrc} alt="" fill unoptimized sizes="100vw"
            style={{ objectFit: "cover", filter: "blur(32px) saturate(1.2)", transform: "scale(1.12)" }} />
          <div style={{ position: "absolute", inset: 0, background: "rgba(11,10,8,0.72)" }} />
        </div>
      )}
      {bgSrc && (
        <div key={`bg-${current}`} style={{ position: "absolute", inset: 0, zIndex: 1, opacity: 1, animation: "mgBgIn 0.7s ease both" }}>
          <Image src={bgSrc} alt="" fill unoptimized sizes="100vw"
            style={{ objectFit: "cover", filter: "blur(5px) saturate(1.3)", transform: "scale(1.12)" }} />
          <div style={{ position: "absolute", inset: 0, background: "rgba(11,10,8,0.70)" }} />
        </div>
      )}

      {/* Vignettes */}
      <div style={{ position: "absolute", inset: 0, zIndex: 2, background: "linear-gradient(to right, rgba(11,10,8,0.92) 0%, rgba(11,10,8,0.5) 50%, transparent 100%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, zIndex: 2, background: "linear-gradient(to top, rgba(11,10,8,0.9) 0%, transparent 55%)", pointerEvents: "none" }} />

      {/* Content */}
      <div style={{ position: "absolute", inset: 0, zIndex: 3, display: "flex", alignItems: "stretch", padding: "2rem clamp(1.5rem, 4vw, 3.5rem)" }}>
        {/* Info side */}
        <div key={current} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingBottom: "1rem", animation: "mgTextIn 0.55s ease both" }}>
          {/* Status badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "0.75rem" }}>
            {item.status === "RELEASING" && (
              <div style={{ display: "inline-flex", alignSelf: "flex-start", padding: "3px 10px", background: "var(--lime)", fontFamily: "var(--font-condensed, Arial)", fontSize: "0.55rem", letterSpacing: "0.16em", color: "var(--ink)", textTransform: "uppercase" }}>
                NOW AIRING
              </div>
            )}
            {item.format && (
              <div style={{ display: "inline-flex", alignSelf: "flex-start", padding: "3px 10px", background: "var(--red)", fontFamily: "var(--font-condensed, Arial)", fontSize: "0.55rem", letterSpacing: "0.16em", color: "var(--paper)", textTransform: "uppercase" }}>
                {item.format}
              </div>
            )}
          </div>

          {/* Title */}
          <h2 style={{ fontFamily: "var(--font-display, Impact)", fontSize: "clamp(2rem, 5vw, 4rem)", letterSpacing: "0.02em", color: "var(--paper)", lineHeight: 0.9, margin: "0 0 0.75rem", maxWidth: "18ch" }}>
            {title.toUpperCase()}
          </h2>

          {/* Meta row */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "1.25rem" }}>
            {score && (
              <span style={{ fontFamily: "var(--font-display, Impact)", fontSize: "1.1rem", letterSpacing: "0.04em", color: "var(--paper)" }}>
                {score}<span style={{ fontFamily: "var(--font-condensed, Arial)", fontSize: "0.6rem", color: "var(--muted)", marginLeft: "3px", letterSpacing: "0.1em" }}>/10</span>
              </span>
            )}
            {item.season && item.seasonYear && (
              <>
                {score && <span style={{ color: "var(--border-2)", fontSize: "0.5rem" }}>|</span>}
                <span style={{ fontFamily: "var(--font-condensed, Arial)", fontSize: "0.62rem", letterSpacing: "0.14em", color: "var(--muted)", textTransform: "uppercase" }}>
                  {item.season} {item.seasonYear}
                </span>
              </>
            )}
            {item.episodes && (
              <>
                <span style={{ color: "var(--border-2)", fontSize: "0.5rem" }}>|</span>
                <span style={{ fontFamily: "var(--font-condensed, Arial)", fontSize: "0.62rem", letterSpacing: "0.14em", color: "var(--paper-2)", textTransform: "uppercase" }}>
                  {item.episodes} EPS
                </span>
              </>
            )}
          </div>

          {/* Genres */}
          {item.genres.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "1.5rem" }}>
              {item.genres.slice(0, 4).map(g => (
                <span key={g} style={{ fontFamily: "var(--font-condensed, Arial)", fontSize: "0.5rem", letterSpacing: "0.12em", color: "var(--muted)", textTransform: "uppercase", border: "1px solid var(--border-2)", padding: "2px 8px" }}>
                  {g}
                </span>
              ))}
            </div>
          )}

          <Link
            href={`/anime/${item.id}`}
            style={{ alignSelf: "flex-start", fontFamily: "var(--font-condensed, Arial)", fontSize: "0.65rem", letterSpacing: "0.18em", textTransform: "uppercase", padding: "8px 22px", background: "var(--red)", color: "var(--paper)", textDecoration: "none", border: "1px solid var(--red)", transition: "background 0.15s" }}
          >
            ▶ WATCH NOW
          </Link>
        </div>

        {/* Cover side */}
        <div key={`cover-${current}`} style={{ flexShrink: 0, width: "clamp(110px, 14vw, 200px)", alignSelf: "center", marginLeft: "auto", animation: "mgCoverIn 0.6s ease both" }}>
          <div style={{ position: "relative", aspectRatio: "2/3", boxShadow: "0 24px 60px rgba(0,0,0,0.7)", overflow: "hidden" }}>
            <Image src={item.coverImage.extraLarge || item.coverImage.large} alt={title} fill unoptimized sizes="200px" style={{ objectFit: "cover" }} priority />
          </div>
        </div>
      </div>

      {/* Dot indicators */}
      <div style={{ position: "absolute", bottom: "1.25rem", left: "clamp(1.5rem, 4vw, 3.5rem)", zIndex: 4, display: "flex", alignItems: "center", gap: "8px" }}>
        {items.map((_, i) => (
          <button key={i} onClick={() => { goTo(i); startTimers(); }} aria-label={`Go to slide ${i + 1}`}
            style={{ width: i === current ? "28px" : "6px", height: "3px", background: i === current ? "var(--red)" : "var(--border-2)", border: "none", padding: 0, cursor: "pointer", transition: "width 0.3s ease, background 0.3s ease", position: "relative", overflow: "hidden" }}>
            {i === current && (
              <span style={{ position: "absolute", inset: 0, left: 0, width: `${progress}%`, background: "var(--paper)", transition: "width 0.05s linear" }} />
            )}
          </button>
        ))}
      </div>

      {/* Slide counter */}
      <div style={{ position: "absolute", bottom: "1.35rem", right: "clamp(1.5rem, 4vw, 3.5rem)", zIndex: 4, fontFamily: "var(--font-condensed, Arial)", fontSize: "0.6rem", letterSpacing: "0.14em", color: "var(--muted)" }}>
        {String(current + 1).padStart(2, "0")}&nbsp;/&nbsp;{String(items.length).padStart(2, "0")}
      </div>

      <style>{`
        @keyframes mgBgIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes mgTextIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes mgCoverIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  );
}
"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import type { MDPage } from "@/lib/mangadex";

interface Props {
  pages: MDPage[];
  chapterId: string;
  mangaId: string;
  chapterNumber: string | null;
  prevChapterId: string | null;
  nextChapterId: string | null;
}

export default function MangaReader({ pages, mangaId, chapterNumber, prevChapterId, nextChapterId }: Props) {
  const [quality, setQuality] = useState<"normal" | "datasaver">("normal");
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});

  const onLoad = useCallback((i: number) => setLoaded(prev => ({ ...prev, [i]: true })), []);

  return (
    <div style={{ background: "var(--ink)", minHeight: "100vh" }}>

      {/* Controls bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(11,10,8,0.95)", backdropFilter: "blur(10px)", borderBottom: "1px solid var(--border)", padding: "6px 16px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <Link href={`/manga/${mangaId}`} style={{ fontFamily: "var(--font-condensed, Arial)", fontSize: "0.6rem", letterSpacing: "0.1em", color: "var(--muted)", textDecoration: "none", textTransform: "uppercase" }}>
          ‹ BACK
        </Link>
        <span style={{ fontFamily: "var(--font-display, Impact)", fontSize: "0.85rem", letterSpacing: "0.08em", color: "var(--paper)" }}>
          CH. {chapterNumber ?? "?"}
        </span>
        <span style={{ color: "var(--border-2)", fontSize: "0.6rem" }}>|</span>
        <span style={{ fontFamily: "var(--font-condensed, Arial)", fontSize: "0.6rem", letterSpacing: "0.08em", color: "var(--muted)" }}>
          {pages.length} PAGES
        </span>

        {/* Quality toggle */}
        <div style={{ display: "flex", gap: "3px", marginLeft: "auto" }}>
          {(["normal", "datasaver"] as const).map(q => (
            <button key={q} onClick={() => setQuality(q)} style={{ fontFamily: "var(--font-condensed, Arial)", fontSize: "0.55rem", letterSpacing: "0.1em", textTransform: "uppercase", padding: "3px 9px", cursor: "pointer", border: quality === q ? "1px solid var(--paper)" : "1px solid var(--border-2)", background: quality === q ? "var(--paper)" : "transparent", color: quality === q ? "var(--ink)" : "var(--paper-2)" }}>
              {q === "normal" ? "HD" : "LOW"}
            </button>
          ))}
        </div>

        {/* Prev / Next chapter */}
        <div style={{ display: "flex", gap: "4px" }}>
          {prevChapterId ? (
            <Link href={`/manga/${mangaId}/${prevChapterId}`} style={{ fontFamily: "var(--font-condensed, Arial)", fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", padding: "4px 12px", border: "1px solid var(--border-2)", color: "var(--paper-2)", textDecoration: "none" }}>‹ PREV</Link>
          ) : (
            <span style={{ fontFamily: "var(--font-condensed, Arial)", fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", padding: "4px 12px", border: "1px solid var(--border)", color: "var(--border-2)", userSelect: "none" }}>‹ PREV</span>
          )}
          {nextChapterId ? (
            <Link href={`/manga/${mangaId}/${nextChapterId}`} style={{ fontFamily: "var(--font-display, Impact)", fontSize: "0.78rem", letterSpacing: "0.08em", textTransform: "uppercase", padding: "4px 14px", background: "var(--red)", border: "1px solid var(--red)", color: "var(--paper)", textDecoration: "none" }}>NEXT ›</Link>
          ) : (
            <span style={{ fontFamily: "var(--font-condensed, Arial)", fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", padding: "4px 12px", border: "1px solid var(--border)", color: "var(--border-2)", userSelect: "none" }}>NEXT ›</span>
          )}
        </div>
      </div>

      {/* Pages */}
      <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "2px", padding: "8px 0" }}>
        {pages.map((p, i) => {
          const src = quality === "normal" ? p.url : p.dataSaver;
          return (
            <div key={i} style={{ position: "relative", width: "100%", minHeight: "200px", background: "var(--surface)" }}>
              {!loaded[i] && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div className="animate-spin" style={{ width: "24px", height: "24px", border: "2px solid var(--border-2)", borderTopColor: "var(--red)", borderRadius: "50%" }} />
                </div>
              )}
              <Image
                src={src}
                alt={`Page ${i + 1}`}
                width={800}
                height={1200}
                style={{ width: "100%", height: "auto", display: "block", opacity: loaded[i] ? 1 : 0, transition: "opacity 0.2s" }}
                onLoad={() => onLoad(i)}
                unoptimized
                loading={i < 3 ? "eager" : "lazy"}
                priority={i < 2}
                referrerPolicy="no-referrer"
              />
            </div>
          );
        })}
      </div>

      {/* Bottom nav */}
      <div style={{ display: "flex", justifyContent: "center", gap: "8px", padding: "2rem 1rem" }}>
        {prevChapterId ? (
          <Link href={`/manga/${mangaId}/${prevChapterId}`} style={{ fontFamily: "var(--font-condensed, Arial)", fontSize: "0.68rem", letterSpacing: "0.12em", textTransform: "uppercase", padding: "9px 20px", border: "1px solid var(--border-2)", color: "var(--paper-2)", textDecoration: "none" }}>‹ PREV CHAPTER</Link>
        ) : null}
        <Link href={`/manga/${mangaId}`} style={{ fontFamily: "var(--font-condensed, Arial)", fontSize: "0.68rem", letterSpacing: "0.12em", textTransform: "uppercase", padding: "9px 20px", border: "1px solid var(--border-2)", color: "var(--paper-2)", textDecoration: "none" }}>ALL CHAPTERS</Link>
        {nextChapterId ? (
          <Link href={`/manga/${mangaId}/${nextChapterId}`} style={{ fontFamily: "var(--font-display, Impact)", fontSize: "0.85rem", letterSpacing: "0.08em", textTransform: "uppercase", padding: "9px 24px", background: "var(--red)", border: "1px solid var(--red)", color: "var(--paper)", textDecoration: "none" }}>NEXT CHAPTER ›</Link>
        ) : (
          <Link href={`/manga/${mangaId}`} style={{ fontFamily: "var(--font-condensed, Arial)", fontSize: "0.68rem", letterSpacing: "0.12em", textTransform: "uppercase", padding: "9px 20px", background: "var(--paper)", border: "1px solid var(--paper)", color: "var(--ink)", textDecoration: "none" }}>FINISHED ✓</Link>
        )}
      </div>

      <p style={{ textAlign: "center", fontFamily: "var(--font-condensed, Arial)", fontSize: "0.55rem", letterSpacing: "0.08em", color: "var(--border-2)", paddingBottom: "2rem", textTransform: "uppercase" }}>
        Powered by MangaDex
      </p>
    </div>
  );
}

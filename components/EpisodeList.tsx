"use client";

import Link from "next/link";
import type { ConsumetEpisode } from "@/types";

interface EpisodeListProps {
  episodes: ConsumetEpisode[];
  anilistId: number;
  currentEpisodeId?: string;
}

export default function EpisodeList({ episodes, anilistId, currentEpisodeId }: EpisodeListProps) {
  return (
    <div className="flex flex-col max-h-[620px] overflow-y-auto">
      {episodes.map((ep) => {
        const isCurrent = ep.id === currentEpisodeId;
        return (
          <Link
            key={ep.id}
            href={`/watch/${anilistId}/${encodeURIComponent(ep.id)}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 12px",
              textDecoration: "none",
              borderBottom: "1px solid var(--border)",
              background: isCurrent ? "var(--surface-2)" : "transparent",
              borderLeft: isCurrent ? "3px solid var(--red)" : "3px solid transparent",
              transition: "background 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!isCurrent)
                (e.currentTarget as HTMLElement).style.background = "var(--surface)";
            }}
            onMouseLeave={(e) => {
              if (!isCurrent)
                (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            {/* Episode number */}
            <span
              style={{
                fontFamily: "var(--font-display, Impact)",
                fontSize: "1.1rem",
                letterSpacing: "0.04em",
                color: isCurrent ? "var(--red)" : "var(--border-2)",
                minWidth: "2rem",
                lineHeight: 1,
              }}
            >
              {String(ep.number).padStart(2, "0")}
            </span>

            {/* Label */}
            <span
              style={{
                fontFamily: "var(--font-body, sans-serif)",
                fontSize: "0.78rem",
                color: isCurrent ? "var(--paper)" : "var(--paper-2)",
                flex: 1,
              }}
            >
              Episode {ep.number}
            </span>

            {/* Playing indicator */}
            {isCurrent && (
              <span
                style={{
                  fontFamily: "var(--font-condensed, Arial)",
                  fontSize: "0.58rem",
                  letterSpacing: "0.12em",
                  color: "var(--red)",
                  textTransform: "uppercase",
                  border: "1px solid var(--red)",
                  padding: "1px 5px",
                }}
              >
                NOW
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

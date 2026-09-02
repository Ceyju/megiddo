"use client";

import Link from "next/link";
import AiringTime from "@/components/AiringTime";
import type { EpisodeRef } from "@/types";

interface EpisodeListProps {
  episodes: EpisodeRef[];
  anilistId: number;
  currentEpisodeId?: string;
}

export default function EpisodeList({ episodes, anilistId, currentEpisodeId }: EpisodeListProps) {
  return (
    <div className="flex flex-col max-h-[620px] overflow-y-auto">
      {episodes.map((ep) => {
        const isCurrent = ep.id === currentEpisodeId;
        const isUpcoming = ep.availability === "upcoming";
        const rowStyle = {
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 12px",
              textDecoration: "none",
              borderBottom: "1px solid var(--border)",
              background: isCurrent ? "var(--surface-2)" : "transparent",
              borderLeft: isCurrent ? "3px solid var(--red)" : "3px solid transparent",
              transition: "background 0.15s, border-color 0.15s",
              minHeight: "52px",
              opacity: isUpcoming ? 0.72 : 1,
              cursor: isUpcoming ? "not-allowed" : undefined,
            } as const;
        const content = (
          <>
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

            {isUpcoming ? (
              <span
                style={{
                  fontFamily: "var(--font-condensed, Arial)",
                  fontSize: "0.75rem",
                  letterSpacing: "0.08em",
                  color: "var(--muted)",
                  textAlign: "right",
                  textTransform: "uppercase",
                }}
              >
                <AiringTime airingAt={ep.airingAt} />
              </span>
            ) : ep.availability === "available" && !isCurrent ? (
              <span
                style={{
                  fontFamily: "var(--font-condensed, Arial)",
                  fontSize: "0.75rem",
                  letterSpacing: "0.1em",
                  color: "var(--lime)",
                  textTransform: "uppercase",
                }}
              >
                AVAILABLE
              </span>
            ) : null}

            {/* Playing indicator */}
            {isCurrent && !isUpcoming && (
              <span
                style={{
                  fontFamily: "var(--font-condensed, Arial)",
                  fontSize: "0.75rem",
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
          </>
        );

        if (isUpcoming) {
          return (
            <div
              key={ep.id}
              aria-disabled="true"
              aria-label={`Episode ${ep.number}, unavailable`}
              style={rowStyle}
            >
              {content}
            </div>
          );
        }

        return (
          <Link
            key={ep.id}
            href={`/watch/${anilistId}/${encodeURIComponent(ep.id)}`}
            style={rowStyle}
            onMouseEnter={(e) => {
              if (!isCurrent)
                (e.currentTarget as HTMLElement).style.background = "var(--surface)";
            }}
            onMouseLeave={(e) => {
              if (!isCurrent)
                (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            {content}
          </Link>
        );
      })}
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export interface MediaCardBadge {
  label: string;
  background?: string;
  color?: string;
  display?: boolean;
}

interface UniversalMediaCardProps {
  href: string;
  title: string;
  image: string | null;
  className?: string;
  priority?: boolean;
  unoptimized?: boolean;
  placeholder?: string;
  topLeftBadge?: MediaCardBadge;
  topRightBadge?: MediaCardBadge;
  overlayLabel?: string;
  chips?: string[];
}

function Badge({ badge, side }: { badge: MediaCardBadge; side: "left" | "right" }) {
  const style: CSSProperties = {
    background: badge.background ?? "var(--ink)",
    color: badge.color ?? "var(--paper)",
    fontFamily: badge.display ? "var(--font-display, Impact)" : "var(--font-condensed, Arial)",
    fontSize: badge.display ? "1rem" : "0.6rem",
    fontWeight: badge.display ? undefined : 700,
    letterSpacing: badge.display ? "0.04em" : "0.1em",
    lineHeight: 1,
    textTransform: badge.display ? undefined : "uppercase",
  };

  return (
    <span className={cn("absolute top-0 px-2 py-1", side === "left" ? "left-0" : "right-0")} style={style}>
      {badge.label}
    </span>
  );
}

/** The canonical 2:3 media card shared by anime, manga, and webnovels. */
export default function UniversalMediaCard({
  href,
  title,
  image,
  className,
  priority = false,
  unoptimized = false,
  placeholder = "?",
  topLeftBadge,
  topRightBadge,
  overlayLabel,
  chips = [],
}: UniversalMediaCardProps) {
  return (
    <Link
      href={href}
      className={cn("group relative flex flex-col card-lift", className)}
      style={{ textDecoration: "none" }}
    >
      <div
        className="relative aspect-[2/3] overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {image ? (
          <Image
            src={image}
            alt={title}
            fill
            priority={priority}
            unoptimized={unoptimized}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center" aria-hidden="true">
            <span
              style={{
                fontFamily: "var(--font-display, Impact)",
                fontSize: "2rem",
                color: "var(--border-2)",
              }}
            >
              {placeholder}
            </span>
          </div>
        )}

        {topLeftBadge && <Badge badge={topLeftBadge} side="left" />}
        {topRightBadge && <Badge badge={topRightBadge} side="right" />}

        {(overlayLabel || chips.length > 0) && (
          <div
            className="absolute inset-0 flex items-end opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
            style={{ background: "linear-gradient(to top, rgba(11,10,8,0.95) 0%, rgba(11,10,8,0.4) 60%, transparent 100%)" }}
          >
            <div className="w-full p-3">
              {overlayLabel && (
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
                  {overlayLabel}
                </div>
              )}
              <div className="flex flex-wrap gap-1">
                {chips.slice(0, 2).map((chip) => (
                  <span
                    key={chip}
                    style={{
                      fontFamily: "var(--font-condensed, Arial)",
                      fontSize: "0.58rem",
                      letterSpacing: "0.08em",
                      color: "var(--paper-2)",
                      border: "1px solid var(--border-2)",
                      padding: "1px 5px",
                    }}
                  >
                    {chip.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        <div
          className="absolute inset-x-0 bottom-0 h-[2px] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          style={{ background: "var(--red)" }}
        />
      </div>

      <div className="pt-2 pb-0.5">
        <h3
          className="line-clamp-2 min-h-[1.95rem] leading-tight text-[var(--paper-2)] transition-colors group-hover:text-[var(--paper)] group-focus-visible:text-[var(--paper)]"
          style={{
            fontFamily: "var(--font-body, sans-serif)",
            fontSize: "0.78rem",
            fontWeight: 500,
          }}
        >
          {title}
        </h3>
      </div>
    </Link>
  );
}

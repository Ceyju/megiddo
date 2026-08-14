import UniversalMediaCard from "@/components/UniversalMediaCard";
import type { MDManga } from "@/lib/mangadex";

const KNOWN_HOSTS = ["uploads.mangadex.org", "media.kitsu.app", "s4.anilist.co"];

function isKnownHost(url: string | null): boolean {
  if (!url) return false;
  try {
    return KNOWN_HOSTS.some((host) => new URL(url).hostname.endsWith(host));
  } catch {
    return false;
  }
}

export default function MangaCard({ manga, href, priority }: { manga: MDManga; href?: string; priority?: boolean }) {
  const typeLabel = manga.type === "manhwa" ? "MANHWA" : manga.type === "manhua" ? "MANHUA" : "MANGA";
  const typeColor = manga.type === "manhwa" ? "var(--lime)" : manga.type === "manhua" ? "#FF8800" : "var(--red)";

  return (
    <UniversalMediaCard
      href={href ?? `/manga/${encodeURIComponent(manga.id)}`}
      title={manga.title}
      image={manga.coverUrl}
      priority={priority}
      unoptimized={Boolean(manga.coverUrl && !isKnownHost(manga.coverUrl))}
      topLeftBadge={{
        label: typeLabel,
        background: typeColor,
        color: typeColor === "var(--lime)" ? "var(--ink)" : "var(--paper)",
      }}
      topRightBadge={manga.status === "completed" ? { label: "COMPLETE" } : undefined}
      overlayLabel={manga.latestChapter ? `CH. ${manga.latestChapter}` : manga.status || typeLabel}
      chips={manga.tags}
    />
  );
}

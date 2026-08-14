import UniversalMediaCard from "@/components/UniversalMediaCard";
import type { NFListNovel } from "@/lib/novelfire";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  ongoing: { bg: "var(--red)", text: "#fff" },
  completed: { bg: "#0a7c5c", text: "#fff" },
  hiatus: { bg: "#b56b00", text: "#fff" },
};

function statusColor(status: string | null) {
  return STATUS_COLORS[(status ?? "").toLowerCase()] ?? { bg: "var(--border-2)", text: "var(--paper)" };
}

export default function LNVolumeCard({ volume: novel, index }: { volume: NFListNovel; index: number }) {
  const colors = statusColor(novel.status);
  void index;

  return (
    <UniversalMediaCard
      href={`/webnovels/${encodeURIComponent(novel.slug)}`}
      title={novel.title}
      image={novel.coverUrl}
      unoptimized
      placeholder="NF"
      topLeftBadge={{ label: novel.status ?? "NOVEL", background: colors.bg, color: colors.text }}
      topRightBadge={novel.rating ? { label: `★ ${novel.rating}`, background: "var(--ink)", color: "#F89B2B" } : undefined}
      overlayLabel={novel.latestChapter ?? (novel.views ? `${novel.views} READS` : "WEBNOVEL")}
      chips={novel.genres}
    />
  );
}

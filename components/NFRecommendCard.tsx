import UniversalMediaCard from "@/components/UniversalMediaCard";
import type { NFListNovel } from "@/lib/novelfire";

interface Props {
  novel: NFListNovel;
  rank: number;
}

export default function NFRecommendCard({ novel, rank }: Props) {
  return (
    <UniversalMediaCard
      href={`/webnovels/${encodeURIComponent(novel.slug)}`}
      title={novel.title}
      image={novel.coverUrl}
      unoptimized
      placeholder="NF"
      topLeftBadge={novel.rating ? { label: `★ ${novel.rating}`, background: "var(--ink)", color: "#F89B2B" } : undefined}
      topRightBadge={{ label: `RANK ${rank}`, background: "var(--red)" }}
      overlayLabel={novel.latestChapter ?? (novel.views ? `${novel.views} READS` : novel.status ?? "WEBNOVEL")}
      chips={novel.genres}
    />
  );
}

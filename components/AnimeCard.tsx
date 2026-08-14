import UniversalMediaCard from "@/components/UniversalMediaCard";
import { formatScore, getAnimeTitle } from "@/lib/utils";
import type { AniListAnime } from "@/types";

interface AnimeCardProps {
  anime: AniListAnime;
  className?: string;
  index?: number;
}

export default function AnimeCard({ anime, className, index = 0 }: AnimeCardProps) {
  const title = getAnimeTitle(anime.title);
  void index;

  return (
    <UniversalMediaCard
      href={`/anime/${anime.id}`}
      title={title}
      image={anime.coverImage.extraLarge || anime.coverImage.large}
      className={className}
      topLeftBadge={anime.averageScore ? { label: formatScore(anime.averageScore), display: true } : undefined}
      topRightBadge={anime.status === "RELEASING" ? { label: "AIRING", background: "var(--lime)", color: "var(--ink)" } : undefined}
      overlayLabel={`${anime.format?.replace("_", " ") ?? "ANIME"} · ${anime.episodes ? `${anime.episodes} EPS` : "?"}`}
      chips={anime.genres}
    />
  );
}

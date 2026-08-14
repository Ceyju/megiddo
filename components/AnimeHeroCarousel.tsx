import type { AniListAnime } from "@/types";
import { formatScore, getAnimeTitle } from "@/lib/utils";
import EditorialHeroCarousel, { type EditorialSlide } from "@/components/carousel/EditorialHeroCarousel";

export default function AnimeHeroCarousel({ items }: { items: AniListAnime[] }) {
  const slides: EditorialSlide[] = items.map((item) => ({
    key: String(item.id),
    title: getAnimeTitle(item.title).toUpperCase(),
    href: `/anime/${item.id}`,
    image: item.coverImage.extraLarge || item.coverImage.large,
    background: item.bannerImage,
    badge: item.status === "RELEASING" ? "NOW AIRING" : item.format || "ANIME",
    badgeColor: item.status === "RELEASING" ? "var(--lime)" : "var(--red)",
    badgeTextColor: item.status === "RELEASING" ? "var(--ink)" : "var(--paper)",
    meta: [item.averageScore ? `${formatScore(item.averageScore)}/10` : "", item.season && item.seasonYear ? `${item.season} ${item.seasonYear}` : "", item.episodes ? `${item.episodes} EPS` : ""],
    tags: item.genres,
    action: "Watch now",
  }));
  return <EditorialHeroCarousel items={slides} label="Featured anime" />;
}


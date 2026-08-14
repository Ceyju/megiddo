import type { NFListNovel } from "@/lib/novelfire";
import EditorialHeroCarousel, { type EditorialSlide } from "@/components/carousel/EditorialHeroCarousel";

const STATUS: Record<string, string> = { ongoing: "var(--red)", completed: "#0a7c5c", hiatus: "#b56b00" };

export default function NovelHeroCarousel({ items }: { items: NFListNovel[] }) {
  const slides: EditorialSlide[] = items.map((item) => ({
    key: item.slug,
    title: item.title,
    href: `/webnovels/${item.slug}`,
    image: item.coverUrl,
    badge: (item.status || item.genres[0] || "WEB NOVEL").toUpperCase(),
    badgeColor: STATUS[(item.status || "").toLowerCase()] || "var(--border-2)",
    meta: [item.latestChapter || "", item.views ? `${item.views} reads` : "", item.status || ""],
    tags: item.genres.length ? item.genres : ["WEB NOVEL"],
    action: "Read now",
  }));
  return <EditorialHeroCarousel items={slides} label="Featured web novels" />;
}

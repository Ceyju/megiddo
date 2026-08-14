import type { MDManga } from "@/lib/mangadex";
import EditorialHeroCarousel, { type EditorialSlide } from "@/components/carousel/EditorialHeroCarousel";

const TYPES: Record<string, { label: string; color: string; text: string }> = {
  manhwa: { label: "MANHWA", color: "var(--lime)", text: "var(--ink)" },
  manhua: { label: "MANHUA", color: "#ff8800", text: "var(--ink)" },
  manga: { label: "MANGA", color: "var(--red)", text: "var(--paper)" },
};

export default function MangaHeroCarousel({ items }: { items: MDManga[] }) {
  const slides: EditorialSlide[] = items.map((item) => {
    const type = TYPES[item.type] || TYPES.manga;
    return {
      key: item.id,
      title: item.title,
      href: `/manga/${encodeURIComponent(item.id)}`,
      image: item.coverUrl,
      badge: type.label,
      badgeColor: type.color,
      badgeTextColor: type.text,
      meta: [item.latestChapter ? `CH. ${item.latestChapter}` : "", item.status || "", item.year ? String(item.year) : ""],
      tags: item.tags,
      action: "Read now",
    };
  });
  return <EditorialHeroCarousel items={slides} label="Featured manga" />;
}


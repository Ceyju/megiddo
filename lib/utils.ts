import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatScore(score: number | null): string {
  if (!score) return "N/A";
  return (score / 10).toFixed(1);
}

export function formatEpisodes(eps: number | null): string {
  return eps ? `${eps} eps` : "? eps";
}

export function formatStatus(status: string): string {
  const map: Record<string, string> = {
    FINISHED: "Finished",
    RELEASING: "Airing",
    NOT_YET_RELEASED: "Upcoming",
    CANCELLED: "Cancelled",
    HIATUS: "Hiatus",
  };
  return map[status] ?? status;
}

export function getAnimeTitle(title: {
  english: string | null;
  romaji: string;
  native?: string;
}): string {
  return title.english || title.romaji;
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

export function timeUntilAiring(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

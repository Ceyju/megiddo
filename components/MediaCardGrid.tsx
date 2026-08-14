import type { ReactNode } from "react";
import StaggerReveal from "@/components/motion/StaggerReveal";

export const MEDIA_CARD_GRID_CLASS =
  "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-5 xl:grid-cols-6";

export default function MediaCardGrid({ children }: { children: ReactNode }) {
  return <StaggerReveal className={MEDIA_CARD_GRID_CLASS}>{children}</StaggerReveal>;
}

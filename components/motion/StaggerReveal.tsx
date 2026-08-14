"use client";

import { animate, stagger } from "animejs";
import type { ReactNode } from "react";
import { useAnimeScope } from "./useAnimeScope";

export default function StaggerReveal({ children, className }: { children: ReactNode; className?: string }) {
  const root = useAnimeScope<HTMLDivElement>((scope, element) => {
    const targets = Array.from(element.children);
    if (scope.matches.reduceMotion) {
      animate(targets, { opacity: [0, 1], duration: 180, delay: stagger(20) });
      return;
    }
    animate(targets, { opacity: [0, 1], translateY: [16, 0], duration: 520, delay: stagger(45), ease: "out(3)" });
  });
  return <div ref={root} className={className}>{children}</div>;
}


"use client";

import { createScope, type Scope } from "animejs";
import { useEffect, useRef } from "react";

export function useAnimeScope<T extends HTMLElement>(setup: (scope: Scope, root: T) => void | (() => void)) {
  const root = useRef<T>(null);
  useEffect(() => {
    if (!root.current) return;
    const element = root.current;
    const scope = createScope({
      root,
      mediaQueries: { reduceMotion: "(prefers-reduced-motion: reduce)", finePointer: "(pointer: fine)" },
    }).add((activeScope) => setup(activeScope as Scope, element));
    return () => scope.revert();
  }, [setup]);

  return root;
}

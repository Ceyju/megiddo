"use client";

import { animate, utils } from "animejs";
import { useCallback, useEffect, useRef, useState } from "react";

export function useEditorialCarousel(length: number, intervalMs = 5_000) {
  const [current, setCurrent] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const pausedRef = useRef(false);
  const progressAnimation = useRef<ReturnType<typeof animate> | null>(null);
  const reducedMotion = useRef(false);

  const goTo = useCallback((index: number) => {
    if (length) setCurrent(utils.wrap(index, 0, length));
  }, [length]);
  const next = useCallback(() => setCurrent((value) => length ? utils.wrap(value + 1, 0, length) : 0), [length]);
  const previous = useCallback(() => setCurrent((value) => length ? utils.wrap(value - 1, 0, length) : 0), [length]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion.current = media.matches;
    const onChange = () => { reducedMotion.current = media.matches; };
    media.addEventListener("change", onChange);
    const timer = window.setInterval(() => {
      if (!pausedRef.current && !document.hidden && !reducedMotion.current) next();
    }, intervalMs);
    return () => {
      media.removeEventListener("change", onChange);
      window.clearInterval(timer);
    };
  }, [intervalMs, next]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const animations = [
      animate(root.querySelectorAll("[data-carousel-bg]"), { opacity: [0, 1], duration: 500, ease: "out(2)" }),
      animate(root.querySelectorAll("[data-carousel-content]"), reducedMotion.current ? { opacity: [0, 1], duration: 180 } : { opacity: [0, 1], translateY: [14, 0], duration: 520, ease: "out(3)" }),
      animate(root.querySelectorAll("[data-carousel-cover]"), reducedMotion.current ? { opacity: [0, 1], duration: 180 } : { opacity: [0, 1], translateX: [20, 0], duration: 600, ease: "out(3)" }),
    ];
    progressAnimation.current?.revert();
    progressAnimation.current = reducedMotion.current || !progressRef.current ? null : animate(progressRef.current, { scaleX: [0, 1], duration: intervalMs, ease: "linear" });
    return () => animations.forEach((animation) => animation.revert());
  }, [current, intervalMs]);

  const pause = () => { pausedRef.current = true; progressAnimation.current?.pause(); };
  const resume = () => { pausedRef.current = false; if (!reducedMotion.current) progressAnimation.current?.resume(); };
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowLeft") { event.preventDefault(); previous(); }
    if (event.key === "ArrowRight") { event.preventDefault(); next(); }
  };

  return { current, goTo, next, previous, rootRef, progressRef, pause, resume, onKeyDown };
}


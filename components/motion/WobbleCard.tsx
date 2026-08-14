"use client";

import { utils } from "animejs";
import type { PointerEvent, ReactNode } from "react";
import { useRef } from "react";
import { useAnimeScope } from "./useAnimeScope";

export default function WobbleCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const target = useRef({ x: 0, y: 0, rotateX: 0, rotateY: 0 });
  const current = useRef({ x: 0, y: 0, rotateX: 0, rotateY: 0 });
  const frame = useRef<number | null>(null);
  const startRef = useRef<() => void>(() => undefined);
  const reduceMotion = useRef(true);

  const root = useAnimeScope<HTMLDivElement>((scope, element) => {
    reduceMotion.current = scope.matches.reduceMotion || !scope.matches.finePointer;
    const tick = () => {
      const state = current.current;
      const next = target.current;
      state.x = utils.damp(state.x, next.x, 16.7, 0.045);
      state.y = utils.damp(state.y, next.y, 16.7, 0.045);
      state.rotateX = utils.damp(state.rotateX, next.rotateX, 16.7, 0.045);
      state.rotateY = utils.damp(state.rotateY, next.rotateY, 16.7, 0.045);
      utils.sync(() => {
        element.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) rotateX(${state.rotateX}deg) rotateY(${state.rotateY}deg)`;
      });
      const moving = Math.abs(state.x - next.x) + Math.abs(state.y - next.y) + Math.abs(state.rotateX - next.rotateX) + Math.abs(state.rotateY - next.rotateY) > 0.05;
      frame.current = moving ? requestAnimationFrame(tick) : null;
    };
    const start = () => { if (frame.current === null) frame.current = requestAnimationFrame(tick); };
    startRef.current = start;
    element.dataset.wobbleReady = "true";
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      element.style.removeProperty("transform");
    };
  });

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (reduceMotion.current || event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = utils.clamp(utils.mapRange(event.clientX, bounds.left, bounds.right, -1, 1), -1, 1);
    const y = utils.clamp(utils.mapRange(event.clientY, bounds.top, bounds.bottom, -1, 1), -1, 1);
    target.current = { x: x * 8, y: y * 8, rotateX: -y * 5, rotateY: x * 5 };
    startRef.current();
  };
  const reset = () => { target.current = { x: 0, y: 0, rotateX: 0, rotateY: 0 }; startRef.current(); };

  return <div ref={root} className={`wobble-card ${className}`} onPointerMove={onPointerMove} onPointerLeave={reset} onBlur={reset}>{children}</div>;
}

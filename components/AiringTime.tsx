"use client";

import { useSyncExternalStore } from "react";

interface AiringTimeProps {
  airingAt: number | null | undefined;
}

const subscribeToHydration = () => () => undefined;

export default function AiringTime({ airingAt }: AiringTimeProps) {
  const isHydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);

  if (!airingAt) return <span>TBA</span>;

  const date = new Date(airingAt * 1000);
  return (
    <time dateTime={date.toISOString()}>
      {isHydrated
        ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date)
        : "SCHEDULED"}
    </time>
  );
}

"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * The grid's real column count, from the browser's own layout of an empty grid with the same rules (`probe`). 0 on the
 * server, during hydration and while hidden – the grid then renders without collection rows.
 */
export function useGridColumns(probe: HTMLElement | null): number {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!probe) return () => {};
      const observer = new ResizeObserver(onChange);
      observer.observe(probe);
      return () => observer.disconnect();
    },
    [probe],
  );
  return useSyncExternalStore(
    subscribe,
    () => {
      const tracks = probe ? getComputedStyle(probe).gridTemplateColumns : "none";
      return tracks === "none" ? 0 : tracks.split(" ").length;
    },
    () => 0,
  );
}

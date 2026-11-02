"use client";

import { useSyncExternalStore } from "react";

/** Whether a media query matches – false on the server and during hydration, then the real value (live). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Tailwind's md breakpoint – where the site header (SiteHeader) takes over from the mobile chrome. */
export const MD_QUERY = "(min-width: 768px)";

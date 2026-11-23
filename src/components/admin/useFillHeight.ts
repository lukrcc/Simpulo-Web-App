"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * The height from an element's top to the window's bottom minus the page's bottom padding (40px) – for admin views that fill one screen
 * without scrolling (System › Überblick, Vision › Vier Schichten, Firmenstruktur › Zwei Motoren). From 1024px; below null (natural height).
 */
export function useFillHeight<T extends HTMLElement>(min = 240) {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState<number | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const top = ref.current?.getBoundingClientRect().top;
      setHeight(top === undefined || window.innerWidth < 1024 ? null : Math.max(min, Math.floor(window.innerHeight - (top + window.scrollY) - 40)));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [min]);
  return [ref, height] as const;
}

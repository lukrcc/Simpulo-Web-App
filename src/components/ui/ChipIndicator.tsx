"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * The chosen text chip's peach capsule: one element that slides to whichever chip in its row is chosen ([data-chip-active]). Goes
 * inside the positioned row, as its first child. Placed after every render, and when a chip's width changes (a font arriving, a window
 * resized). Its first place it takes without sliding.
 */
export function ChipIndicator() {
  const ref = useRef<HTMLSpanElement>(null);

  const place = () => {
    const el = ref.current;
    const row = el?.parentElement;
    if (!el || !row) return;
    const active = row.querySelector<HTMLElement>("[data-chip-active]");
    el.style.opacity = active ? "1" : "0";
    if (!active) return;
    el.style.transform = `translateX(${active.offsetLeft}px)`;
    el.style.width = `${active.offsetWidth}px`;
    if (!el.dataset.placed) requestAnimationFrame(() => (el.dataset.placed = "true"));
  };

  useLayoutEffect(place);
  useEffect(() => {
    const row = ref.current?.parentElement;
    if (!row) return;
    const observer = new ResizeObserver(place);
    observer.observe(row);
    for (const chip of row.children) observer.observe(chip);
    void document.fonts?.ready.then(place);
    return () => observer.disconnect();
  }, []);

  return <span ref={ref} aria-hidden className="chip-indicator" />;
}

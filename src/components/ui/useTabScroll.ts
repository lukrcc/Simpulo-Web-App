"use client";

import { useEffect, type RefObject } from "react";

/** The chosen one in a row: a tab, a radio, a link of the current page, or what marks itself data-active. */
const ACTIVE = '[aria-selected="true"], [aria-checked="true"], [aria-current="page"], [data-active]';

/**
 * Phones' tab rows (.tab-scroll in globals.css – TabBar, AdminTabs, CapsuleGroup): they scroll sideways instead of wrapping. This marks the
 * row while there's more to its right (data-more-end → the fade on the right only) and scrolls the chosen entry into view – on first show
 * and whenever `active` changes – keeping clear of the scroll padding (the page margin), so nothing is cut at the left edge. Only moves
 * the row itself, never the page.
 */
export function useTabScroll(ref: RefObject<HTMLElement | null>, active: unknown) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const more = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
      if (more) el.setAttribute("data-more-end", "");
      else el.removeAttribute("data-more-end");
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    el.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const chosen = el.querySelector<HTMLElement>(ACTIVE);
    if (!chosen) return;
    const pad = parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0;
    const box = el.getBoundingClientRect();
    const r = chosen.getBoundingClientRect();
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    if (r.left < box.left + pad) el.scrollBy({ left: r.left - box.left - pad, behavior });
    else if (r.right > box.right - pad) el.scrollBy({ left: r.right - box.right + pad, behavior });
  }, [ref, active]);
}

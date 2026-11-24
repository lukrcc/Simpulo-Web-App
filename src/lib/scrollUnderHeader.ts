import { MEDIA } from "@/config/breakpoints";

/**
 * Scrolls an element (Explore's results head) to just under the header: from 1100px 24px under its bar; below, under the chip row that sticks
 * under it. Smooth, at once with reduced motion.
 */
export function scrollUnderHeader(el: HTMLElement | null) {
  if (!el) return;
  const root = getComputedStyle(document.documentElement);
  const px = (name: string) => parseFloat(root.getPropertyValue(name)) || 0;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const desktop = window.matchMedia(MEDIA.desktop).matches;
  // The header's bottom as drawn (--header-h is a calc(), which parseFloat can't read – it gave 0 and the head landed under the bar).
  const headerBottom = document.querySelector<HTMLElement>("header[data-site-header]")?.getBoundingClientRect().bottom ?? px("--header-total");
  const offset = desktop ? headerBottom + 24 : px("--header-total") + px("--filter-row-h");
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: reduce ? "auto" : "smooth" });
}

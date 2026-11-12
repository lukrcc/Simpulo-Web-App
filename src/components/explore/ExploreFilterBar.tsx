"use client";

import type { ReactNode } from "react";

/*
 * The filter row in the page – only on city, vibe and collection pages (Where · When + Short trips | the categories that fit, "More ▾" |
 * "All filters"; the sort beside the section's title). Explore itself has its quick search in the header's one bar (SiteHeader).
 */

/**
 * Smoothly scrolls `el` to just under the header (its one 76px bar holds Explore's quick search; phones: the page's own chip row under the
 * safe area). Instant with reduced motion.
 */
export function scrollUnderHeader(el: HTMLElement | null) {
  if (!el) return;
  const root = getComputedStyle(document.documentElement);
  const px = (name: string) => parseFloat(root.getPropertyValue(name)) || 0;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // From md the header's one bar (the quick search in it): 24px under it. Phones: under the page's own chip row.
  const md = window.matchMedia("(min-width: 48rem)").matches;
  const offset = md ? px("--header-h") + px("--band-h") + 24 : px("--header-total") + px("--filter-row-h");
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: reduce ? "auto" : "smooth" });
}

export function ExploreFilterBar({ fields, chips, pageEnd }: { /** Where? and When?, before the chips */ fields?: ReactNode; chips: ReactNode; /** The row's last element ("All filters" as an ink capsule) */ pageEnd?: ReactNode }) {
  return (
    <div data-explore-filter-row className="mt-6 hidden h-11 items-center gap-6 md:flex">
      {fields && <div className="flex min-w-0 shrink-0 items-center gap-2">{fields}</div>}
      <div className="min-w-0 flex-1">{chips}</div>
      {pageEnd && <div className="flex shrink-0 items-center">{pageEnd}</div>}
    </div>
  );
}

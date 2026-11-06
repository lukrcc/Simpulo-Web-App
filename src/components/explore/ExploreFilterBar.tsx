"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { BAND_HEIGHT } from "@/lib/appMode";
import { NOTCH_OPEN_TOTAL, registerNotchFilters, setNotchAuto, useNotchState } from "@/lib/notchState";
import { cn } from "@/lib/utils";

/*
 * Open Houses' filters, from md. In the page: a plain row under the section's heading that doesn't stick (Where? + When? + Short trips |
 * chips 32px, as many as fit whole, the last place always "More ▾"); Sort and Filters sit beside the heading. In the tab: all of it in one row.
 * Once it has gone under the header the header's tab takes over with the same controls and the same state, until the grid's
 * bottom edge reaches the tab. Only one of the two is ever showing.
 */

/** The header's height at the tab, closed: the filters take over when the row has passed it. */
const NOTCH_CLOSED_TOTAL = 72 + BAND_HEIGHT;
/** Where a chip change puts the grid: 40px under the open tab, so the handle on its edge never lies on a card. The row above the grid is just over this line then, so the tab stays. */
const UNDER_TAB_TOTAL = NOTCH_OPEN_TOTAL + 40;
/** Everything below the fold counts as "not passed yet": a jump past the line still crosses it. */
const BELOW = 100_000;

/** Watches one line near the top of the window: `onCross(passed)` when the target goes above or comes back below it. */
function watchLine(target: Element, line: number, onCross: (passed: boolean) => void) {
  const observer = new IntersectionObserver(([entry]) => onCross(!entry.isIntersecting), { rootMargin: `-${line}px 0px ${BELOW}px 0px` });
  observer.observe(target);
  return observer;
}

/**
 * Smoothly scrolls `el` to just under the header and its filter row (phones: no top header, only the safe area).
 * Instant with reduced motion.
 */
export function scrollUnderHeader(el: HTMLElement | null) {
  if (!el) return;
  const root = getComputedStyle(document.documentElement);
  const px = (name: string) => parseFloat(root.getPropertyValue(name)) || 0;
  // The row showing (from md): the header's open tab takes its place, 40px under it. Else the page's own chip row.
  const row = document.querySelector<HTMLElement>("[data-explore-filter-row]");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const offset = row && row.offsetHeight > 0 ? UNDER_TAB_TOTAL : px("--header-total") + px("--filter-row-h");
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: reduce ? "auto" : "smooth" });
}

export function ExploreFilterBar({ fields, chips, controls, gridEndRef, handle }: { /** Sort and Filters: only in the header's tab; on the page they sit beside the section's title */ /** Where? and When?, before the chips */ fields?: ReactNode; chips: ReactNode; controls: ReactNode; gridEndRef: RefObject<HTMLDivElement | null>; /** The tab's handle: Explore itself */ handle: boolean }) {
  const startRef = useRef<HTMLDivElement>(null);
  const { chips: tabHasChips, slot } = useNotchState();

  useEffect(() => {
    const start = startRef.current;
    const end = gridEndRef.current;
    if (!start || !end) return;
    let inSection = false;
    let ended = false;
    const push = () => setNotchAuto(inSection && !ended);
    const unregister = registerNotchFilters({
      handle,
      adopt: () => {
        inSection = true;
        push();
      },
    });
    // On at the closed tab, off 40px under the open one: where a filter change scrolls to the row is between the two, and
    // the tab stays as it is.
    const observers = [
      watchLine(start, NOTCH_CLOSED_TOTAL, (passed) => {
        if (passed) {
          inSection = true;
          push();
        }
      }),
      watchLine(start, UNDER_TAB_TOTAL, (passed) => {
        if (!passed) {
          inSection = false;
          push();
        }
      }),
      watchLine(end, NOTCH_OPEN_TOTAL, (passed) => {
        ended = passed;
        push();
      }),
    ];
    return () => {
      observers.forEach((observer) => observer.disconnect());
      unregister();
    };
  }, [gridEndRef, handle]);

  const row = (withControls: boolean) => (
    <>
      {fields && <div className="flex min-w-0 shrink-0 items-center gap-1">{fields}</div>}
      <div className="min-w-0 flex-1">{chips}</div>
      {withControls && <div className="flex shrink-0 items-center gap-1">{controls}</div>}
    </>
  );
  return (
    <>
      <div data-explore-filter-row className={cn("mt-4 hidden h-8 items-center gap-6 md:flex", tabHasChips && "invisible")}>
        {row(false)}
      </div>
      <div ref={startRef} aria-hidden className="h-0" />
      {slot && createPortal(<div className="flex h-full items-center gap-6">{row(true)}</div>, slot)}
    </>
  );
}

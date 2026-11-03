"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { BAND_HEIGHT } from "@/lib/appMode";
import { NOTCH_OPEN_TOTAL, registerNotchFilters, setNotchAuto, useNotchState } from "@/lib/notchState";
import { cn } from "@/lib/utils";

/*
 * Open Houses' filters, from md. In the page: a plain row under the section's heading that doesn't stick (chips 36px,
 * 14px/500, 8px apart, as many as fit whole, the last place always "More ▾" | right: Sort capsule + Filters 36px).
 * Once it has gone under the header the header's tab takes over with the same controls and the same state, until the grid's
 * bottom edge reaches the tab. Only one of the two is ever showing.
 */

/** The header's height at the tab, closed: the filters take over when the row has passed it. */
const NOTCH_CLOSED_TOTAL = 80 + BAND_HEIGHT;
/** Where a chip change puts the grid: 24px under the open tab. The row above the grid is just over this line then, so the tab stays. */
const UNDER_TAB_TOTAL = NOTCH_OPEN_TOTAL + 24;
/** Everything below the fold counts as "not passed yet": a jump past the line still crosses it. */
const BELOW = 100_000;

/** Watches one line near the top of the window: `onCross(passed)` when the target goes above or comes back below it. */
function watchLine(target: Element, line: number, onCross: (passed: boolean) => void) {
  const observer = new IntersectionObserver(([entry]) => onCross(!entry.isIntersecting), { rootMargin: `-${line}px 0px ${BELOW}px 0px` });
  observer.observe(target);
  return observer;
}

export function ExploreFilterBar({ chips, controls, gridEndRef, handle }: { chips: ReactNode; controls: ReactNode; gridEndRef: RefObject<HTMLDivElement | null>; /** The tab's handle: Explore itself */ handle: boolean }) {
  const startRef = useRef<HTMLDivElement>(null);
  const { mode, slot } = useNotchState();

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
    // On at the closed tab, off 24px under the open one: where a filter change scrolls to the row is between the two, and
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

  const row = (
    <>
      <div className="min-w-0 flex-1">{chips}</div>
      <div className="flex shrink-0 items-center gap-2">{controls}</div>
    </>
  );
  return (
    <>
      <div data-explore-filter-row className={cn("hidden h-16 items-center gap-6 md:flex", mode === "filters" && "invisible")}>
        {row}
      </div>
      <div ref={startRef} aria-hidden className="h-0" />
      {slot && createPortal(<div className="flex h-full items-center gap-6">{row}</div>, slot)}
    </>
  );
}

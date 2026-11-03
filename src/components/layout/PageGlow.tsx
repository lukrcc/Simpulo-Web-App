"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";

const SPOT_W = 1100;
const SPOT_H = 700;
const FOOTER_SPOT_H = 500;
/** A long section (the grid) gets more spots in it: at least one per screen height while scrolling. */
const MAX_SPOT_DISTANCE = 1200;
/** The top spots of pages without a stage stay as they were: quiet. */
const TOP_W = 900;
const TOP_H = 600;

/** The pages with sections and a warm end: gaps and the footer's spot. Everywhere else only the top one. */
function hasSections(pathname: string): boolean {
  return pathname === "/" || pathname === "/explore" || pathname === "/host" || pathname.startsWith("/collections/");
}

interface Layout {
  /** The page's stage isn't showing: the top spot comes from here */
  top: boolean;
  /** Each spot's centre, from the page's top: the gaps, and in between where they're far apart */
  gaps: number[];
  /** Where the footer starts, from the page's top; null without its spot */
  footer: number | null;
}

const spot = (style: CSSProperties, background: string): CSSProperties => ({ position: "absolute", background, ...style });
const topPeach = `radial-gradient(closest-side, color-mix(in srgb, var(--stage-peach) 45%, transparent), transparent)`;
const peachSpot = `radial-gradient(closest-side, color-mix(in srgb, var(--stage-peach) 70%, transparent), transparent)`;

/** The gaps' centres, with evenly spaced ones added wherever two of them (or the last and the footer) are too far apart. */
function spreadSpots(gaps: number[], footer: number | null): number[] {
  const stops = footer === null ? gaps : [...gaps, footer];
  return stops.flatMap((stop, i) => {
    const from = stops[i - 1];
    const between = i === 0 ? 0 : Math.ceil((stop - from) / MAX_SPOT_DISTANCE) - 1;
    const added = Array.from({ length: between }, (_, k) => Math.round(from + ((stop - from) * (k + 1)) / (between + 1)));
    return i < gaps.length ? [...added, stop] : added;
  });
}

/**
 * The warm patches behind the page: scrolls with it, over its whole height, always from the stage tokens – never from an
 * image. A spot centred on every gap between two sections ([data-glow-section]) and at most 1200px apart, left and right edge in
 * turn, and a wide one behind the footer's top edge. Pages without those only have the top spot; on Explore and Host the top is the stage's
 * (StageBand). Plain radial gradients, no blur filter. Measured again whenever the page changes height.
 */
export function PageGlow() {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Layout>({ top: false, gaps: [], footer: null });

  useEffect(() => {
    const layer = ref.current;
    const main = document.querySelector("main");
    if (!layer || !main) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const origin = layer.getBoundingClientRect().top;
      const stageShows = [...document.querySelectorAll(".stage-gradient")].some((el) => el.getBoundingClientRect().height > 0);
      const sections = hasSections(pathname)
        ? [...main.querySelectorAll("[data-glow-section]")].map((el) => el.getBoundingClientRect()).filter((box) => box.height > 0)
        : [];
      const gaps = sections.slice(1).map((box, i) => Math.round((sections[i].bottom + box.top) / 2 - origin));
      const footerBox = hasSections(pathname) ? document.querySelector("footer")?.getBoundingClientRect() : undefined;
      const footer = footerBox && footerBox.height > 0 ? Math.round(footerBox.top - origin) : null;
      const next: Layout = { top: !stageShows, gaps: spreadSpots(gaps, footer), footer };
      setLayout((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    const observer = new ResizeObserver(schedule);
    observer.observe(main);
    window.addEventListener("resize", schedule);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return (
    <div ref={ref} aria-hidden data-page-glow style={{ zIndex: -1 }} className="pointer-events-none absolute inset-0 overflow-hidden">
      {layout.top && (
        <>
          <div data-glow-spot="top" style={spot({ left: -TOP_W / 2, top: -TOP_H / 2, width: TOP_W * 1.2, height: TOP_H * 1.4 }, topPeach)} />
          <div data-glow-spot="top" style={spot({ right: -TOP_W / 2, top: -TOP_H / 3, width: TOP_W, height: TOP_H }, "radial-gradient(closest-side, color-mix(in srgb, var(--stage-mist) 60%, transparent), transparent)")} />
        </>
      )}
      {/* Right first: the top's peach is on the left. */}
      {layout.gaps.map((y, i) => (
        <div
          key={i}
          data-glow-spot="gap"
          style={spot({ top: y - SPOT_H / 2, width: SPOT_W, height: SPOT_H, ...(i % 2 === 0 ? { right: -SPOT_W / 2 } : { left: -SPOT_W / 2 }) }, peachSpot)}
        />
      ))}
      {layout.footer !== null && (
        // Centred on the footer's top edge, half of it behind the footer: no edge where it starts.
        <div
          data-glow-spot="footer"
          style={spot(
            { left: 0, right: 0, top: layout.footer - FOOTER_SPOT_H / 2, height: FOOTER_SPOT_H },
            "radial-gradient(50% 50% at 25% 50%, color-mix(in srgb, var(--stage-peach) 75%, transparent), transparent), radial-gradient(50% 50% at 75% 50%, color-mix(in srgb, var(--stage-mist) 50%, transparent), transparent)",
          )}
        />
      )}
    </div>
  );
}

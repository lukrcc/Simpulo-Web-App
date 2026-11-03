"use client";

import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "@/lib/useMediaQuery";

const WIDTH_FINE = 32;
const WIDTH_COARSE = 40;
const HEIGHT = 8;
const DURATION_MS = 180;
const REST_Y = 4;
const DOWN_Y = 9;
const UP_Y = -1;

const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * The tab's handle: one line of three points, only the middle one moves. At rest straight; under the mouse an arrow: down
 * to open, up to close. The points are set frame by frame: Safari can't animate a path's shape in CSS.
 */
export function NotchGrip({ open, hover }: { open: boolean; hover: boolean }) {
  const width = useMediaQuery("(pointer: coarse)") ? WIDTH_COARSE : WIDTH_FINE;
  const target = hover ? (open ? UP_Y : DOWN_Y) : REST_Y;
  const lineRef = useRef<SVGPolylineElement>(null);
  const middle = useRef(target);
  // Only the first render sets the middle point: after that every move is the animation's, or it would jump to the end first.
  const [startY] = useState(target);

  useEffect(() => {
    const line = lineRef.current;
    if (!line) return;
    const draw = (y: number) => {
      middle.current = y;
      line.setAttribute("points", `0,${REST_Y} ${width / 2},${y.toFixed(2)} ${width},${REST_Y}`);
    };
    const from = middle.current;
    if (from === target || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      draw(target);
      return;
    }
    const start = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const t = Math.min(1, Math.max(0, (now - start) / DURATION_MS));
      draw(from + (target - from) * easeOut(t));
      if (t < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [target, width]);

  return (
    <svg data-notch-grip aria-hidden width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} className="block overflow-visible">
      <polyline ref={lineRef} points={`0,${REST_Y} ${width / 2},${startY} ${width},${REST_Y}`} fill="none" stroke="var(--muted)" strokeOpacity={0.6} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

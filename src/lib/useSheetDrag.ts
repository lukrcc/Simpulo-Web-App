"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

/*
 * Dragging something that runs on one number p, and letting it settle: the header's tab and the panels (Sheet). The caller owns p
 * and paints from it; this only says how far the pointer went and how fast it was at the end.
 */

const DRAG_THRESHOLD_PX = 6;
/** The drag's speed comes from this much of its end. */
const SPEED_WINDOW_MS = 100;
/** From this speed (px/ms) a release goes where it was heading, whatever p is. */
export const SNAP_SPEED = 0.4;
/** Settling after a drag: as long as its share of the way, at least this. */
export const MIN_SNAP_MS = 180;

/** cubic-bezier(0.32, 0.72, 0, 1) */
export function easeSheet(x: number): number {
  const bezier = (a: number, b: number, t: number) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3;
  let low = 0;
  let high = 1;
  for (let i = 0; i < 16; i++) {
    const t = (low + high) / 2;
    if (bezier(0.32, 0, t) < x) low = t;
    else high = t;
  }
  return bezier(0.72, 1, (low + high) / 2);
}

/** Where a release settles: `speed` positive towards 1. */
export const snapTarget = (p: number, speed: number, threshold: number): 0 | 1 => (speed > SNAP_SPEED ? 1 : speed < -SNAP_SPEED ? 0 : p > threshold ? 1 : 0);

/** The time for what's left of a move that takes `full` over the whole way. */
export const snapDuration = (from: number, to: number, full: number) => Math.max(MIN_SNAP_MS, full * Math.abs(to - from));

interface SheetDragOptions {
  axis: "x" | "y";
  /** The pointer went down: remember where p is. */
  onPress?: () => void;
  /** It really is a drag: stop whatever is animating p. */
  onStart: () => void;
  /** How far from where it went down, in px. */
  onDrag: (delta: number) => void;
  /** Let go, with the speed at the end (px/ms) along the axis. */
  onEnd: (speed: number, delta: number) => void;
}

/** Pointer handlers for the handle. A click that ended a drag is swallowed: `wasDrag()` says so. */
export function useSheetDrag(options: SheetDragOptions) {
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });
  const drag = useRef<{ start: number; samples: { at: number; t: number }[]; moved: boolean } | null>(null);
  const swallowClick = useRef(false);
  const [handlers] = useState(() => {
    const at = (e: ReactPointerEvent) => (latest.current.axis === "x" ? e.clientX : e.clientY);
    const up = (e: ReactPointerEvent) => {
      const d = drag.current;
      drag.current = null;
      if (!d?.moved) return;
      swallowClick.current = true;
      window.setTimeout(() => (swallowClick.current = false), 0);
      const recent = d.samples.filter((s) => e.timeStamp - s.t <= SPEED_WINDOW_MS);
      const first = recent[0] ?? d.samples[0];
      const elapsed = e.timeStamp - first.t;
      latest.current.onEnd(elapsed > 0 ? (at(e) - first.at) / elapsed : 0, at(e) - d.start);
    };
    return {
      onPointerDown(e: ReactPointerEvent<HTMLElement>) {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        latest.current.onPress?.();
        drag.current = { start: at(e), samples: [{ at: at(e), t: e.timeStamp }], moved: false };
      },
      onPointerMove(e: ReactPointerEvent<HTMLElement>) {
        const d = drag.current;
        if (!d) return;
        const delta = at(e) - d.start;
        if (!d.moved) {
          if (Math.abs(delta) < DRAG_THRESHOLD_PX) return;
          d.moved = true;
          latest.current.onStart();
        }
        d.samples.push({ at: at(e), t: e.timeStamp });
        latest.current.onDrag(delta);
      },
      onPointerUp: up,
      onPointerCancel: up,
    };
  });
  return { handlers, wasDrag: () => swallowClick.current };
}

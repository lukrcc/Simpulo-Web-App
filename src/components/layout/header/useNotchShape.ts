"use client";

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { setNotchOpen, type NotchMode } from "@/lib/notchState";

const BAR_H = 64;
/** The tab below the bar: closed, and how much further it goes when open (140px in all). */
const NOTCH_DEPTH = 16;
const NOTCH_EXTRA = 60;
const NOTCH_PADDING = 32;
const CONCAVE_R = 16;
const BOTTOM_R = 20;
/** The filters' inset from the open tab's edges. */
const SLOT_INSET = 20;
/** The handle's centre, up from the tab's bottom edge. */
const HANDLE_FROM_BOTTOM = 8;

const DURATION_MS = 420;
/** Opening: the form first, the content after this long. Closing: the content goes first, for this long. */
const CONTENT_DELAY_MS = 140;
const DRAG_THRESHOLD_PX = 6;
const SNAP_SPEED = 0.4;
/** The drag's speed comes from this much of its end. */
const SPEED_WINDOW_MS = 100;

/** cubic-bezier(0.32, 0.72, 0, 1) */
function ease(x: number): number {
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

const lerp = (from: number, to: number, p: number) => from + (to - from) * p;
const n = (v: number) => Math.round(v * 100) / 100;

/**
 * Bar and tab as one path, clockwise from the top left. Below 36px of depth the two curves can't both be round: they keep
 * their width and split the depth in proportion, so they still meet with the same tangent (elliptical arcs).
 */
function headerPath(width: number, notchWidth: number, notchCentre: number, notchDepth: number): string {
  const left = notchCentre - notchWidth / 2;
  const right = notchCentre + notchWidth / 2;
  const fit = Math.min(1, notchDepth / (CONCAVE_R + BOTTOM_R));
  const concave = CONCAVE_R * fit;
  const bottomArc = BOTTOM_R * fit;
  const bottom = BAR_H + notchDepth;
  return [
    `M0,0 H${n(width)} V${BAR_H}`,
    `H${n(right + CONCAVE_R)}`,
    `A${CONCAVE_R},${n(concave)} 0 0 0 ${n(right)},${n(BAR_H + concave)}`,
    `V${n(bottom - bottomArc)}`,
    `A${BOTTOM_R},${n(bottomArc)} 0 0 1 ${n(right - BOTTOM_R)},${n(bottom)}`,
    `H${n(left + BOTTOM_R)}`,
    `A${BOTTOM_R},${n(bottomArc)} 0 0 1 ${n(left)},${n(bottom - bottomArc)}`,
    `V${n(BAR_H + concave)}`,
    `A${CONCAVE_R},${n(concave)} 0 0 0 ${n(left - CONCAVE_R)},${BAR_H}`,
    "H0 Z",
  ].join(" ");
}

export interface NotchRefs {
  header: RefObject<HTMLElement | null>;
  nav: RefObject<HTMLElement | null>;
  shadow: RefObject<SVGSVGElement | null>;
  path: RefObject<SVGPathElement | null>;
  glass: RefObject<HTMLDivElement | null>;
  hit: RefObject<HTMLDivElement | null>;
  slot: RefObject<HTMLDivElement | null>;
  handle: RefObject<HTMLButtonElement | null>;
}

/**
 * Draws the header's one shape and moves it between its two states, straight on the DOM (never React state per frame).
 * `open` runs from 0 to 1; notchWidth and notchDepth both follow it, over 420ms or with the handle.
 */
export function useNotchShape(refs: NotchRefs, mode: NotchMode, hasHandle: boolean) {
  const [run] = useState(() => {
    const state = {
      open: 0,
      geometry: { width: 0, navLeft: 0, navRight: 0, contentLeft: 0, contentRight: 0 },
      frame: 0,
      timer: undefined as ReturnType<typeof setTimeout> | undefined,
      dragging: false,
      paint() {
        const { width, navLeft, navRight, contentLeft, contentRight } = state.geometry;
        if (width === 0) return;
        const left = lerp(navLeft - NOTCH_PADDING, contentLeft, state.open);
        const right = lerp(navRight + NOTCH_PADDING, contentRight, state.open);
        const depth = NOTCH_DEPTH + NOTCH_EXTRA * state.open;
        const centre = (left + right) / 2;
        const d = headerPath(width, right - left, centre, depth);
        refs.path.current?.setAttribute("d", d);
        if (refs.glass.current) refs.glass.current.style.clipPath = `path("${d}")`;
        if (refs.shadow.current) {
          refs.shadow.current.style.clipPath = `path(evenodd, "M-200,-200 H${n(width + 200)} V500 H-200 Z ${d}")`;
          refs.shadow.current.style.visibility = "visible";
        }
        if (refs.hit.current) {
          refs.hit.current.style.left = `${n(left)}px`;
          refs.hit.current.style.width = `${n(right - left)}px`;
          refs.hit.current.style.height = `${n(depth)}px`;
        }
        if (refs.handle.current) {
          refs.handle.current.style.left = `${n(centre)}px`;
          refs.handle.current.style.top = `${n(BAR_H + depth - HANDLE_FROM_BOTTOM)}px`;
        }
      },
      animate(to: number) {
        cancelAnimationFrame(state.frame);
        const from = state.open;
        if (from === to) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          state.open = to;
          state.paint();
          return;
        }
        const start = performance.now();
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / DURATION_MS);
          state.open = lerp(from, to, ease(t));
          state.paint();
          if (t < 1) state.frame = requestAnimationFrame(step);
        };
        state.frame = requestAnimationFrame(step);
      },
      showContent(show: boolean) {
        const slot = refs.slot.current;
        if (!slot) return;
        slot.toggleAttribute("data-open", show);
        slot.inert = !show;
      },
      /** To a state: opening, the form leads; closing, the content does. */
      settle(open: boolean) {
        clearTimeout(state.timer);
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          state.showContent(open);
          state.animate(open ? 1 : 0);
          return;
        }
        if (open) {
          state.animate(1);
          state.timer = setTimeout(() => state.showContent(true), CONTENT_DELAY_MS);
        } else {
          state.showContent(false);
          state.timer = setTimeout(() => state.animate(0), CONTENT_DELAY_MS);
        }
      },
    };
    return state;
  });

  // Window and nav width. The tab opens to the header's Container, the page content's edges.
  useLayoutEffect(() => {
    const header = refs.header.current;
    const nav = refs.nav.current;
    const container = nav?.parentElement;
    if (!header || !nav || !container) return;
    const measure = () => {
      const box = header.getBoundingClientRect();
      if (box.width === 0) return;
      const inner = nav.getBoundingClientRect();
      const outer = container.getBoundingClientRect();
      const style = getComputedStyle(container);
      const contentLeft = outer.left - box.left + parseFloat(style.paddingLeft);
      const contentRight = outer.right - box.left - parseFloat(style.paddingRight);
      run.geometry = { width: box.width, navLeft: inner.left - box.left, navRight: inner.right - box.left, contentLeft, contentRight };
      const slot = refs.slot.current;
      if (slot) {
        slot.style.left = `${n(contentLeft + SLOT_INSET)}px`;
        slot.style.width = `${n(contentRight - contentLeft - 2 * SLOT_INSET)}px`;
      }
      run.paint();
    };
    measure();
    run.showContent(false);
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [refs, run]);

  // The handle mounts with the page that offers it.
  useLayoutEffect(() => run.paint(), [hasHandle, run]);

  useEffect(() => {
    if (!run.dragging) run.settle(mode === "filters");
  }, [mode, run]);

  useEffect(
    () => () => {
      cancelAnimationFrame(run.frame);
      clearTimeout(run.timer);
    },
    [run],
  );

  // The handle: a click toggles, a drag follows the pointer and snaps on release.
  const drag = useRef<{ startY: number; startOpen: number; samples: { y: number; t: number }[]; moved: boolean } | null>(null);
  const swallowClick = useRef(false);

  function onPointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startY: e.clientY, startOpen: run.open, samples: [{ y: e.clientY, t: e.timeStamp }], moved: false };
  }
  function onPointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.startY;
    if (!d.moved) {
      if (Math.abs(dy) < DRAG_THRESHOLD_PX) return;
      d.moved = true;
      run.dragging = true;
      cancelAnimationFrame(run.frame);
      clearTimeout(run.timer);
    }
    d.samples.push({ y: e.clientY, t: e.timeStamp });
    run.open = Math.min(1, Math.max(0, d.startOpen + dy / NOTCH_EXTRA));
    run.paint();
    run.showContent(run.open > 0.5);
  }
  function onPointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    swallowClick.current = true;
    window.setTimeout(() => (swallowClick.current = false), 0);
    const recent = d.samples.filter((s) => e.timeStamp - s.t <= SPEED_WINDOW_MS);
    const first = recent[0] ?? d.samples[0];
    const elapsed = e.timeStamp - first.t;
    const speed = elapsed > 0 ? (e.clientY - first.y) / elapsed : 0;
    const open = speed > SNAP_SPEED ? true : speed < -SNAP_SPEED ? false : run.open > 0.5;
    run.dragging = false;
    setNotchOpen(open);
    // The state may not have changed: the form still has to get there.
    run.settle(open);
  }
  function onClick() {
    if (swallowClick.current) return;
    setNotchOpen(mode !== "filters");
  }
  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onClick };
}

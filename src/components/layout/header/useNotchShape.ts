"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { setNotchOpen, type NotchMode } from "@/lib/notchState";
import { easeSheet, snapDuration, snapTarget, useSheetDrag } from "@/lib/useSheetDrag";

const BAR_H = 64;
/** The tab below the bar: closed (the handle's 6px over the edge), and how much further it goes when open (140px in all). */
const NOTCH_DEPTH = 6;
const NOTCH_EXTRA = 70;
const NOTCH_PADDING = 32;
/** The SVG layers' height: the open tab, at its real pixel size. */
const SVG_H = 140;
const CONCAVE_R = 12;
const BOTTOM_R = 16;
/** The filters' inset from the open tab's edges. */
const SLOT_INSET = 20;
/** The handle's centre, up from the tab's bottom edge: 6px, and half its 3px line. */
const HANDLE_FROM_BOTTOM = 7.5;

const DURATION_MS = 420;
/** The filters start to show from here on, and only then take the pointer. */
const CONTENT_FROM = 0.6;
const CONTENT_SHIFT_PX = 8;
/** The filter row's bottom edge (top-20 + h-10) and how far above its centre the handle needs it to stay. */
const SLOT_BOTTOM = 120;
const HANDLE_CLEARANCE = 6;

const lerp = (from: number, to: number, p: number) => from + (to - from) * p;
const n = (v: number) => Math.round(v * 100) / 100;

/**
 * Bar and tab's outline, from the right, as true circular arcs: concave into the bar, convex at the bottom, same radii at any
 * depth. With room for both they are quarter circles joined by a straight side. Shallower (the closed tab: 6px, the
 * radii need 28px), the arcs are shorter but keep their radii, and meet with the same tangent.
 * `offset`: the same outline that far outside it, parallel, for the 1px line to lie on its own pixel row.
 */
function outline(left: number, right: number, depth: number, offset: number): { bar: number; d: string } {
  const concave = CONCAVE_R - offset;
  const convex = BOTTOM_R + offset;
  const reach = CONCAVE_R + BOTTOM_R;
  const cos = Math.max(0, (reach - depth) / reach);
  const sin = Math.sqrt(1 - cos * cos);
  const concaveY = BAR_H + CONCAVE_R;
  const convexY = BAR_H + depth - BOTTOM_R;
  const bar = BAR_H + offset;
  const bottom = BAR_H + depth + offset;
  const rightConvex = right - BOTTOM_R;
  const leftConvex = left + BOTTOM_R;
  const rightConcave = rightConvex + reach * sin;
  const leftConcave = leftConvex - reach * sin;
  const joinY = concaveY - concave * cos;
  const straight = depth >= reach;
  const d = [
    `H${n(rightConcave)}`,
    `A${n(concave)},${n(concave)} 0 0 0 ${n(rightConcave - concave * sin)},${n(joinY)}`,
    straight ? `V${n(convexY)}` : "",
    `A${n(convex)},${n(convex)} 0 0 1 ${n(rightConvex)},${n(bottom)}`,
    `H${n(leftConvex)}`,
    `A${n(convex)},${n(convex)} 0 0 1 ${n(leftConcave + concave * sin)},${n(straight ? convexY : joinY)}`,
    straight ? `V${n(concaveY)}` : "",
    `A${n(concave)},${n(concave)} 0 0 0 ${n(leftConcave)},${n(bar)}`,
  ]
    .filter(Boolean)
    .join(" ");
  return { bar, d };
}

/** The filled shape: bar and tab. */
function headerPath(width: number, left: number, right: number, depth: number): string {
  return `M0,0 H${width} V${BAR_H} ${outline(left, right, depth, 0).d} H0 Z`;
}

/** The edge alone, half a pixel outside the shape: a 1px stroke on exact pixels. */
function edgePath(width: number, left: number, right: number, depth: number): string {
  const edge = outline(left, right, depth, 0.5);
  return `M${width},${edge.bar} ${edge.d} H0`;
}

export interface NotchRefs {
  header: RefObject<HTMLElement | null>;
  nav: RefObject<HTMLElement | null>;
  shadow: RefObject<SVGSVGElement | null>;
  path: RefObject<SVGPathElement | null>;
  line: RefObject<SVGSVGElement | null>;
  edge: RefObject<SVGPathElement | null>;
  glass: RefObject<HTMLDivElement | null>;
  scrim: RefObject<HTMLDivElement | null>;
  clip: RefObject<HTMLDivElement | null>;
  hit: RefObject<HTMLDivElement | null>;
  slot: RefObject<HTMLDivElement | null>;
  handle: RefObject<HTMLButtonElement | null>;
}

/**
 * Draws the header's one shape and moves it between its two states, straight on the DOM (never React state per frame).
 * `open` (p, 0 to 1) is the only source: width, depth, the filters and the handle are all worked out from it in every frame,
 * whether it's dragged live or animated (420ms on a click or scroll; the rest of the way, at least 180ms, after a drag).
 * The filters lie under a clip of the same path as the shape, so nothing of them shows outside it.
 */
export function useNotchShape(refs: NotchRefs, mode: NotchMode, source: "auto" | "manual", hasHandle: boolean) {
  const [run] = useState(() => {
    const state = {
      open: 0,
      geometry: { width: 0, navLeft: 0, navRight: 0, contentLeft: 0, contentRight: 0 },
      frame: 0,
      /** Where the running animation goes */
      target: null as number | null,
      contentOn: null as boolean | null,
      scrimOn: false,
      dragging: false,
      paint() {
        const { width, navLeft, navRight, contentLeft, contentRight } = state.geometry;
        if (width === 0) return;
        // Whole pixels: width and depth animate, the radii don't.
        const left = Math.round(lerp(navLeft - NOTCH_PADDING, contentLeft, state.open));
        const right = Math.round(lerp(navRight + NOTCH_PADDING, contentRight, state.open));
        const depth = Math.round(NOTCH_DEPTH + NOTCH_EXTRA * state.open);
        const centre = (left + right) / 2;
        const d = headerPath(width, left, right, depth);
        refs.path.current?.setAttribute("d", d);
        refs.edge.current?.setAttribute("d", edgePath(width, left, right, depth));
        if (refs.glass.current) refs.glass.current.style.clipPath = `path("${d}")`;
        if (refs.clip.current) refs.clip.current.style.clipPath = `path("${d}")`;
        for (const svg of [refs.shadow.current, refs.line.current]) {
          if (!svg) continue;
          svg.setAttribute("width", String(width));
          svg.setAttribute("viewBox", `0 0 ${width} ${SVG_H}`);
          svg.style.visibility = "visible";
        }
        if (refs.shadow.current) refs.shadow.current.style.clipPath = `path(evenodd, "M-200,-200 H${width + 200} V500 H-200 Z ${d}")`;
        if (refs.hit.current) {
          refs.hit.current.style.left = `${n(left)}px`;
          refs.hit.current.style.width = `${n(right - left)}px`;
          refs.hit.current.style.height = `${n(depth)}px`;
        }
        if (refs.handle.current) {
          refs.handle.current.style.left = `${n(centre)}px`;
          refs.handle.current.style.top = `${n(BAR_H + depth - HANDLE_FROM_BOTTOM)}px`;
        }
        state.paintContent(depth);
        state.paintScrim();
      },
      /** The scrim under a tab opened by hand comes with p. A tab that opened by itself has none. */
      paintScrim() {
        const scrim = refs.scrim.current;
        if (!scrim) return;
        const on = state.scrimOn || state.dragging;
        scrim.style.opacity = on ? state.open.toFixed(3) : "0";
        scrim.style.pointerEvents = on && state.open > 0.01 ? "auto" : "none";
      },
      /** The filters, from p alone. Whatever would reach the handle is cut off: it never lies over a chip. */
      paintContent(depth: number) {
        const slot = refs.slot.current;
        if (!slot) return;
        const opacity = Math.min(1, Math.max(0, (state.open - CONTENT_FROM) / (1 - CONTENT_FROM)));
        const shift = (1 - opacity) * -CONTENT_SHIFT_PX;
        const overHandle = SLOT_BOTTOM + shift - (BAR_H + depth - HANDLE_FROM_BOTTOM - HANDLE_CLEARANCE);
        slot.style.opacity = opacity.toFixed(3);
        slot.style.transform = `translateY(${shift.toFixed(2)}px)`;
        slot.style.clipPath = overHandle > 0 ? `inset(0 0 ${n(overHandle)}px 0)` : "none";
        const on = state.open > CONTENT_FROM;
        if (on === state.contentOn) return;
        state.contentOn = on;
        slot.style.pointerEvents = on ? "auto" : "none";
        slot.inert = !on;
      },
      animate(to: number, duration = DURATION_MS) {
        // Already on its way there (the state catching up with a released drag): it isn't started over.
        if (state.frame !== 0 && state.target === to) return;
        cancelAnimationFrame(state.frame);
        state.frame = 0;
        state.target = to;
        const from = state.open;
        if (from === to) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          state.open = to;
          state.paint();
          return;
        }
        const start = performance.now();
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          state.open = lerp(from, to, easeSheet(t));
          state.paint();
          state.frame = t < 1 ? requestAnimationFrame(step) : 0;
        };
        state.frame = requestAnimationFrame(step);
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
      run.geometry = { width: Math.round(box.width), navLeft: inner.left - box.left, navRight: inner.right - box.left, contentLeft, contentRight };
      const slot = refs.slot.current;
      if (slot) {
        slot.style.left = `${n(contentLeft + SLOT_INSET)}px`;
        slot.style.width = `${n(contentRight - contentLeft - 2 * SLOT_INSET)}px`;
      }
      run.paint();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [refs, run]);

  // The handle mounts with the page that offers it.
  useLayoutEffect(() => run.paint(), [hasHandle, run]);

  useEffect(() => {
    if (!run.dragging) run.animate(mode === "filters" ? 1 : 0);
  }, [mode, run]);

  // A chip picked in the open tab hands it over to the page: the tab stays, its scrim goes on its own.
  useEffect(() => {
    run.scrimOn = source === "manual";
    if (refs.scrim.current) refs.scrim.current.style.transition = run.scrimOn ? "none" : "opacity 200ms";
    run.paintScrim();
  }, [source, refs, run]);

  useEffect(
    () => () => {
      cancelAnimationFrame(run.frame);
      run.frame = 0;
    },
    [run],
  );

  // The handle: a click toggles, a drag follows the pointer and snaps on release.
  const startOpen = useRef(0);
  const { handlers, wasDrag } = useSheetDrag({
    axis: "y",
    onPress: () => {
      startOpen.current = run.open;
    },
    onStart: () => {
      run.dragging = true;
      if (refs.scrim.current) refs.scrim.current.style.transition = "none";
      cancelAnimationFrame(run.frame);
      run.frame = 0;
    },
    onDrag: (delta) => {
      run.open = Math.min(1, Math.max(0, startOpen.current + delta / NOTCH_EXTRA));
      run.paint();
    },
    onEnd: (speed) => {
      const to = snapTarget(run.open, speed, 0.5);
      run.dragging = false;
      // First: the state changing right after this doesn't start it over at the full length.
      run.animate(to, snapDuration(run.open, to, DURATION_MS));
      setNotchOpen(to === 1);
    },
  });
  function onClick() {
    if (wasDrag()) return;
    setNotchOpen(mode !== "filters");
  }
  return { ...handlers, onClick };
}

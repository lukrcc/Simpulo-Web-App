"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { closeNotchPanel, setNotchOpen, setNotchStage, type NotchMode } from "@/lib/notchState";
import { easeSheet, snapDuration, snapTarget, useSheetDrag } from "@/lib/useSheetDrag";

const BAR_H = 56;
/** The tab below the bar: closed, and how much further it goes when open (108px in all: the 32px row with 10px above and below). */
const NOTCH_DEPTH = 6;
const NOTCH_EXTRA = 46;
const NOTCH_PADDING = 32;
const CONCAVE_R = 12;
const BOTTOM_R = 16;
/** The filters' inset from the open tab's edges. */
const SLOT_INSET = 20;
/** The handle is a pill on the tab's edge, half in, half out: this much of it reaches in. */
const HANDLE_REACH = 6;

const DURATION_MS = 420;
/** The filters start to show from here on, and only then take the pointer. */
const CONTENT_FROM = 0.6;
const CONTENT_SHIFT_PX = 8;
/** The filter row's bottom edge (top 66px + h-8). */
const SLOT_BOTTOM = 98;
/** The whole panel: from here on it shows and takes the pointer; up to here the chip row is still there. */
const PANEL_FROM = 1.4;
const ROW_UNTIL = 1.3;
/** Around the panel inside the tab: above it, and below it where the handle lies. */
const PANEL_TOP = 12;
const PANEL_BOTTOM = 24;
/** The third stage is clearer glass than the bar: this is where it ends up. */
/** The panel's glass: --glass-bg and --glass-blur (globals.css) as numbers, for p to run to. */
const PANEL_GLASS_ALPHA = 0.72;
/** The shadow's room around the shape. */
const SVG_MARGIN = 40;
/** Only with a mouse and the header showing: touch has the same content as a bottom sheet. */
const PANEL_QUERY = "(pointer: fine) and (min-width: 48rem)";

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
  panelSlot: RefObject<HTMLDivElement | null>;
  handle: RefObject<HTMLButtonElement | null>;
}

/**
 * Draws the header's one shape and moves it between its three stages, straight on the DOM (never React state per frame).
 * `open` (p: 0 nav, 1 chips, 2 the whole panel) is the only source: width, depth, the filters and the handle are all worked out from it in every frame,
 * whether it's dragged live or animated (420ms on a click or scroll; the rest of the way, at least 180ms, after a drag).
 * The filters lie under a clip of the same path as the shape, so nothing of them shows outside it.
 */
const stageOf = (mode: NotchMode) => (mode === "panel" ? 2 : mode === "filters" ? 1 : 0);

export function useNotchShape(refs: NotchRefs, mode: NotchMode, source: "auto" | "manual", hasHandle: boolean, auto: boolean) {
  const [run] = useState(() => {
    const state = {
      open: 0,
      geometry: { width: 0, navLeft: 0, navRight: 0, contentLeft: 0, contentRight: 0 },
      frame: 0,
      /** Where the running animation goes */
      target: null as number | null,
      contentOn: null as boolean | null,
      panelOn: null as boolean | null,
      /** The tab's depth at the whole panel */
      fullDepth: NOTCH_DEPTH + NOTCH_EXTRA,
      auto: false,
      scrimOn: false,
      dragging: false,
      depthAt(p: number) {
        const chips = NOTCH_DEPTH + NOTCH_EXTRA;
        return p <= 1 ? NOTCH_DEPTH + NOTCH_EXTRA * p : chips + (state.fullDepth - chips) * (p - 1);
      },
      /** The way back from a depth, for the drag. */
      stageAt(depth: number) {
        const chips = NOTCH_DEPTH + NOTCH_EXTRA;
        return depth <= chips ? (depth - NOTCH_DEPTH) / NOTCH_EXTRA : 1 + (depth - chips) / Math.max(1, state.fullDepth - chips);
      },
      paint() {
        const { width, navLeft, navRight, contentLeft, contentRight } = state.geometry;
        if (width === 0) return;
        // Whole pixels: width and depth animate, the radii don't.
        const wide = Math.min(1, state.open);
        const left = Math.round(lerp(navLeft - NOTCH_PADDING, contentLeft, wide));
        const right = Math.round(lerp(navRight + NOTCH_PADDING, contentRight, wide));
        const depth = Math.round(state.depthAt(state.open));
        const centre = (left + right) / 2;
        const d = headerPath(width, left, right, depth);
        refs.path.current?.setAttribute("d", d);
        // The panel's edge lies inside the form (a 2px line along it, its outer half cut away); the bar's and the chip row's just outside.
        const edgeInside = state.open > 1;
        refs.edge.current?.setAttribute("d", edgeInside ? d : edgePath(width, left, right, depth));
        refs.edge.current?.setAttribute("stroke-width", edgeInside ? "2" : "1");
        if (refs.line.current) refs.line.current.style.clipPath = edgeInside ? `path("${d}")` : "";
        if (refs.glass.current) refs.glass.current.style.clipPath = `path("${d}")`;
        if (refs.clip.current) refs.clip.current.style.clipPath = `path("${d}")`;
        const svgH = BAR_H + depth + SVG_MARGIN;
        for (const svg of [refs.shadow.current, refs.line.current]) {
          if (!svg) continue;
          svg.setAttribute("width", String(width));
          svg.setAttribute("height", String(svgH));
          svg.setAttribute("viewBox", `0 0 ${width} ${svgH}`);
          svg.style.visibility = "visible";
        }
        if (refs.shadow.current) refs.shadow.current.style.clipPath = `path(evenodd, "M-200,-200 H${width + 200} V${svgH + 200} H-200 Z ${d}")`;
        if (refs.hit.current) {
          refs.hit.current.style.left = `${n(left)}px`;
          refs.hit.current.style.width = `${n(right - left)}px`;
          refs.hit.current.style.height = `${n(depth)}px`;
        }
        if (refs.handle.current) {
          refs.handle.current.style.left = `${n(centre)}px`;
          refs.handle.current.style.top = `${n(BAR_H + depth)}px`;
        }
        state.paintGlass();
        state.paintContent(depth);
        state.paintScrim();
      },
      /** From the chip row to the panel: the shape goes from the bar's milk to clear glass, its shadow from a hint to a real one, its edge from dark to light. */
      paintGlass() {
        const to = Math.min(1, Math.max(0, state.open - 1));
        const glass = refs.glass.current;
        if (glass) {
          if (to === 0) {
            glass.style.backgroundImage = "";
            glass.style.backdropFilter = "";
            glass.style.setProperty("-webkit-backdrop-filter", "");
          } else {
            const tint = `rgba(${n(lerp(247, 250, to))}, ${n(lerp(245, 248, to))}, ${n(lerp(241, 244, to))}, ${n(lerp(0.94, PANEL_GLASS_ALPHA, to))})`;
            const blur = `blur(24px) saturate(${n(lerp(1.3, 1.2, to))}) brightness(${n(lerp(1, 1.12, to))})`;
            glass.style.backgroundImage = `linear-gradient(${tint}, ${tint})`;
            glass.style.backdropFilter = blur;
            glass.style.setProperty("-webkit-backdrop-filter", blur);
          }
        }
        const shadow = refs.shadow.current;
        if (shadow) {
          shadow.style.filter = `blur(${n(lerp(8, 32, to))}px)`;
          shadow.style.opacity = String(n(lerp(0.04, 0.16, to)));
          shadow.firstElementChild?.setAttribute("transform", `translate(0 ${n(lerp(4, 24, to))})`);
        }
        refs.edge.current?.setAttribute("stroke", to === 0 ? "rgba(0,0,0,0.08)" : `rgba(${Math.round(lerp(0, 255, to))},${Math.round(lerp(0, 255, to))},${Math.round(lerp(0, 255, to))},${n(lerp(0.08, 0.6, to))})`);
      },
      /** The scrim under a tab opened by hand comes with p. A tab that opened by itself has none. */
      paintScrim() {
        const scrim = refs.scrim.current;
        if (!scrim) return;
        const on = state.scrimOn || state.dragging;
        // Over a chip row that opened by itself it only comes with the panel.
        const strength = state.auto ? Math.max(0, state.open - 1) : Math.min(1, state.open);
        // Behind the panel nothing at all: the page shows as it is, only the panel is glass. The layer stays, for the click beside it.
        const toPanel = Math.min(1, Math.max(0, state.open - 1));
        const blur = `blur(${n(lerp(6, 0, toPanel))}px)`;
        scrim.style.backgroundColor = `rgba(34, 30, 27, ${n(lerp(0.12, 0, toPanel))})`;
        scrim.style.backdropFilter = blur;
        scrim.style.setProperty("-webkit-backdrop-filter", blur);
        scrim.style.opacity = on ? strength.toFixed(3) : "0";
        scrim.style.pointerEvents = on && strength > 0.01 ? "auto" : "none";
      },
      /** The filters, from p alone. Whatever would reach the handle is cut off: it never lies over a chip. */
      paintContent(depth: number) {
        const slot = refs.slot.current;
        if (!slot) return;
        const coming = Math.min(1, Math.max(0, (state.open - CONTENT_FROM) / (1 - CONTENT_FROM)));
        // Gives way to the whole panel.
        const opacity = Math.min(coming, Math.max(0, (ROW_UNTIL - state.open) / (ROW_UNTIL - 1)));
        const shift = (1 - coming) * -CONTENT_SHIFT_PX;
        const overHandle = SLOT_BOTTOM + shift - (BAR_H + depth - HANDLE_REACH);
        slot.style.opacity = opacity.toFixed(3);
        slot.style.transform = `translateY(${shift.toFixed(2)}px)`;
        slot.style.clipPath = overHandle > 0 ? `inset(0 0 ${n(overHandle)}px 0)` : "none";
        const on = state.open > CONTENT_FROM && state.open < ROW_UNTIL;
        if (on !== state.contentOn) {
          state.contentOn = on;
          slot.style.pointerEvents = on ? "auto" : "none";
          slot.inert = !on;
        }
        const panel = refs.panelSlot.current;
        if (!panel) return;
        const panelOpacity = Math.min(1, Math.max(0, (state.open - PANEL_FROM) / (2 - PANEL_FROM)));
        panel.style.opacity = panelOpacity.toFixed(3);
        panel.style.transform = `translateY(${((1 - panelOpacity) * -CONTENT_SHIFT_PX).toFixed(2)}px)`;
        const panelOn = state.open > PANEL_FROM;
        if (panelOn === state.panelOn) return;
        state.panelOn = panelOn;
        panel.style.pointerEvents = panelOn ? "auto" : "none";
        panel.inert = !panelOn;
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
      const panel = refs.panelSlot.current;
      if (panel) {
        panel.style.left = `${n(contentLeft + SLOT_INSET)}px`;
        panel.style.width = `${n(contentRight - contentLeft - 2 * SLOT_INSET)}px`;
      }
      run.paint();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    observer.observe(nav);
    // The panel decides how deep the third stage goes (it stops itself at 80vh).
    const panel = refs.panelSlot.current;
    const fit = () => {
      if (!panel || panel.offsetHeight === 0) return;
      run.fullDepth = Math.max(NOTCH_DEPTH + NOTCH_EXTRA, panel.offsetHeight + PANEL_TOP + PANEL_BOTTOM);
      run.paint();
    };
    const panelObserver = new ResizeObserver(fit);
    if (panel) panelObserver.observe(panel);
    return () => {
      observer.disconnect();
      panelObserver.disconnect();
    };
  }, [refs, run]);

  // The handle mounts with the page that offers it.
  useLayoutEffect(() => run.paint(), [hasHandle, run]);

  useEffect(() => {
    if (!run.dragging) run.animate(stageOf(mode));
  }, [mode, run]);

  // A chip picked in the open tab hands it over to the page: the tab stays, its scrim goes on its own.
  useEffect(() => {
    run.auto = auto;
    run.scrimOn = source === "manual";
    if (refs.scrim.current) refs.scrim.current.style.transition = run.scrimOn ? "none" : "opacity 200ms";
    run.paintScrim();
  }, [source, auto, refs, run]);

  useEffect(
    () => () => {
      cancelAnimationFrame(run.frame);
      run.frame = 0;
    },
    [run],
  );

  // The handle: a click goes to the next stage and closes from the last, a drag follows the pointer and snaps on release.
  const startOpen = useRef(0);
  const { handlers, wasDrag } = useSheetDrag({
    axis: "y",
    onPress: () => {
      startOpen.current = run.depthAt(run.open);
    },
    onStart: () => {
      run.dragging = true;
      if (refs.scrim.current) refs.scrim.current.style.transition = "none";
      cancelAnimationFrame(run.frame);
      run.frame = 0;
    },
    onDrag: (delta) => {
      // On to the whole panel with a mouse; touch stops at the chip row and has the sheet.
      const top = window.matchMedia(PANEL_QUERY).matches && refs.panelSlot.current?.childElementCount ? 2 : 1;
      run.open = Math.min(top, Math.max(0, run.stageAt(startOpen.current + delta)));
      run.paint();
    },
    onEnd: (speed) => {
      // Snaps within the stretch it was let go in.
      const from = Math.min(1, Math.floor(run.open));
      const to = (from + snapTarget(run.open - from, speed, 0.5)) as 0 | 1 | 2;
      run.dragging = false;
      // First: the state changing right after this doesn't start it over at the full length.
      run.animate(to, snapDuration(run.open, to, DURATION_MS));
      setNotchStage(to);
    },
  });
  function onClick() {
    if (wasDrag()) return;
    if (mode === "panel") return closeNotchPanel();
    if (mode === "nav") return setNotchOpen(true);
    // The whole panel is the mouse's; touch has it as a sheet, so there the chip row is the last stage.
    if (window.matchMedia(PANEL_QUERY).matches && refs.panelSlot.current?.childElementCount) setNotchStage(2);
    else setNotchOpen(false);
  }
  return { ...handlers, onClick };
}

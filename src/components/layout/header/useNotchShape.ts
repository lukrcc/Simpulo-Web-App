"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { closeNotchPanel, NOTCH_CORNER_W, NOTCH_SLOT_INSET, setNotchOpen, setNotchStage, type NotchMode } from "@/lib/notchState";
import { easeSheet, snapDuration, snapTarget, useSheetDrag } from "@/lib/useSheetDrag";

const BAR_H = 56;
/**
 * The tab below the bar: closed, and how much further it goes when open (132px in all: 8px above the 44px row, 24px below it – the
 * handle's pill then sits 18px under the row).
 */
const NOTCH_DEPTH = 6;
const NOTCH_EXTRA = 70;
/**
 * The closed tab around the nav: on both sides the space of the profile beside it (its gap and the avatar, measured – [data-header-profile])
 * and then this much air. Centred on the nav (the page's middle); the avatar lies wholly inside, 24px from the right curve, and the left
 * mirrors it.
 */
const NOTCH_PADDING = 24;
/** The profile beside the nav when it can't be measured yet: 12px gap + 36px avatar. */
const PROFILE_SIDE = 48;
const CONCAVE_R = 12;
const BOTTOM_R = 16;
/** The filters' inset from the open tab's edges. */
const SLOT_INSET = NOTCH_SLOT_INSET;
/** The chip row's tab: at most Explore's content width (--explore-max), centred. */
const ROW_MAX_W = 1440;
/** The whole panel: at most this wide, centred under the header (not the full container), its content this far in. */
const PANEL_MAX_W = 1120;
const PANEL_INSET = 28;
/** The handle is a line centred ON the tab's edge: half of its 6px reaches into the tab. */
const HANDLE_REACH = 3;
const HANDLE_BELOW = 0;

const DURATION_MS = 420;
/** The filters start to show from here on, and only then take the pointer. */
const CONTENT_FROM = 0.6;
const CONTENT_SHIFT_PX = 8;
/** The filter row's bottom edge (top 64px + h-11). */
const SLOT_BOTTOM = 108;
/** The whole panel: from here on it shows and takes the pointer; up to here the chip row is still there. */
const PANEL_FROM = 1.4;
const ROW_UNTIL = 1.3;
/** Around the panel inside the tab: above it, and below it where the handle lies. */
const PANEL_TOP = 12;
const PANEL_BOTTOM = 24;
/** The third stage is clearer glass than the bar: this is where it ends up. */
/** The panel's glass: --glass-bg and --glass-blur (globals.css) as numbers, for p to run to. */
/**
 * The panel's surface: warm liquid glass – rgba(251,247,242,0.80) over blur(40px) saturate(140%) (little saturation, so cold colours behind it
 * don't come through); the bar takes the same glass, so both read as one piece. A faint orange light from its top left (rgba(240,99,58,0.10)
 * fading out over about 40 % of it). Without backdrop-filter, or with reduced transparency asked for, it is solid --card (#FBF9F6).
 */
/**
 * The shape's colours come from CSS variables (globals.css, --hdr-*: light or dark, data-header on <html>), read once and again whenever the
 * header's theme changes – never per frame.
 */
interface HeaderPalette {
  dark: boolean;
  bar: [number, number, number, number];
  chips: [number, number, number, number];
  panel: [number, number, number, number];
  edge: [number, number, number, number];
  edgePanel: [number, number, number, number];
  grip: string;
}
function readPalette(): HeaderPalette {
  const css = getComputedStyle(document.documentElement);
  const rgba = (name: string): [number, number, number, number] => {
    const [r, g, b] = css.getPropertyValue(`--hdr-${name}-rgb`).split(",").map((v) => Number(v.trim()) || 0);
    return [r, g, b, Number(css.getPropertyValue(`--hdr-${name}-alpha`).trim()) || 0];
  };
  return {
    dark: document.documentElement.dataset.header === "dark",
    bar: rgba("bar"),
    chips: rgba("chips"),
    panel: rgba("panel"),
    edge: rgba("edge"),
    edgePanel: rgba("edge-panel"),
    grip: css.getPropertyValue("--hdr-grip-rgb").trim(),
  };
}
const mix = (a: readonly number[], b: readonly number[], p: number) => a.map((v, i) => lerp(v, b[i], p));
const rgbaOf = ([r, g, b, a]: readonly number[]) => `rgba(${n(r)}, ${n(g)}, ${n(b)}, ${n(a)})`;
const PANEL_SATURATE = 1.4;
const PANEL_GLOW_ALPHA = 0.1;
/** Behind the open panel: a light blur and a slight dimming, so the page stays recognisable. */
const PANEL_SCRIM_BLUR = 10;
const PANEL_SCRIM_ALPHA = 0.06;
/** Whether glass can be shown here: a backdrop-filter, and no request for reduced transparency. Read once per page. */
let glassAllowed: boolean | null = null;
function canGlass(): boolean {
  if (glassAllowed === null) {
    const supported = typeof CSS !== "undefined" && (CSS.supports("backdrop-filter", "blur(1px)") || CSS.supports("-webkit-backdrop-filter", "blur(1px)"));
    const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-transparency: reduce)").matches;
    glassAllowed = supported && !reduced;
  }
  return glassAllowed;
}
/** Its bottom corners: 24px (the bar's tab keeps 16px). */
const PANEL_R = 24;
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
function outline(left: number, right: number, depth: number, offset: number, bottomR = BOTTOM_R): { bar: number; d: string } {
  const concave = CONCAVE_R - offset;
  const convex = bottomR + offset;
  const reach = CONCAVE_R + bottomR;
  const cos = Math.max(0, (reach - depth) / reach);
  const sin = Math.sqrt(1 - cos * cos);
  const concaveY = BAR_H + CONCAVE_R;
  const convexY = BAR_H + depth - bottomR;
  const bar = BAR_H + offset;
  const bottom = BAR_H + depth + offset;
  const rightConvex = right - bottomR;
  const leftConvex = left + bottomR;
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
function headerPath(width: number, left: number, right: number, depth: number, bottomR = BOTTOM_R): string {
  return `M0,0 H${width} V${BAR_H} ${outline(left, right, depth, 0, bottomR).d} H0 Z`;
}

/** The edge alone, half a pixel outside the shape: a 1px stroke on exact pixels. */
function edgePath(width: number, left: number, right: number, depth: number, bottomR = BOTTOM_R): string {
  const edge = outline(left, right, depth, 0.5, bottomR);
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
  corner: RefObject<HTMLDivElement | null>;
  handle: RefObject<HTMLButtonElement | null>;
}

/**
 * The corner block's own silhouette, in its box (`w` = the block up to the tab's right edge, plus CONCAVE_R for the flare; `h` the tab's depth):
 * top left round with the tab's bottom radius (`r`); top right it follows the tab's own outline – along the bar's line, then the same concave
 * arc (CONCAVE_R) down into the tab's right edge, so block and header meet without a gap or a step; bottom right the tab's own convex corner
 * (`r`); bottom left square, flush with the tab's bottom edge. The header's clip lies over it as well, so nothing ever reaches past the outline.
 */
function cornerPath(w: number, h: number, r: number): string {
  const tl = Math.max(0, Math.min(r, h / 2));
  const flare = Math.max(0, Math.min(CONCAVE_R, h / 2));
  const edge = w - CONCAVE_R;
  const br = Math.max(0, Math.min(r, h / 2, edge / 2));
  return `M0,${n(tl)} A${n(tl)},${n(tl)} 0 0 1 ${n(tl)},0 H${n(edge + flare)} A${n(flare)},${n(flare)} 0 0 0 ${n(edge)},${n(flare)} V${n(h - br)} A${n(br)},${n(br)} 0 0 1 ${n(edge - br)},${n(h)} H0 Z`;
}

/**
 * Draws the header's one shape and moves it between its three stages, straight on the DOM (never React state per frame).
 * `open` (p: 0 nav, 1 chips, 2 the whole panel) is the only source: width, depth, the filters and the handle are all worked out from it in every frame,
 * whether it's dragged live or animated (420ms on a click or scroll; the rest of the way, at least 180ms, after a drag).
 * The filters lie under a clip of the same path as the shape, so nothing of them shows outside it.
 */
const stageOf = (mode: NotchMode) => (mode === "panel" ? 2 : mode === "filters" ? 1 : 0);

/**
 * `notchPage`: the tab hangs from the bar only on Explore (/ and /explore). Everywhere else the bar's bottom edge is straight – its 1px line
 * ink 8 %, no tab, no handle – unless a page's filters open it (p > 0).
 */
export function useNotchShape(refs: NotchRefs, mode: NotchMode, source: "auto" | "manual", hasHandle: boolean, auto: boolean, notchPage = true) {
  const [run] = useState(() => {
    const state = {
      open: 0,
      geometry: { width: 0, navLeft: 0, navRight: 0, contentLeft: 0, contentRight: 0, panelLeft: 0, panelRight: 0 },
      frame: 0,
      /** Where the running animation goes */
      target: null as number | null,
      contentOn: null as boolean | null,
      panelOn: null as boolean | null,
      /** The tab's depth at the whole panel */
      fullDepth: NOTCH_DEPTH + NOTCH_EXTRA,
      auto: false,
      /** Content runs under the header (the page is scrolled): only then the bar casts its soft shadow. */
      scrolled: false,
      /** No tabs (logged out) and no grip (not Explore): the bar alone, no tab under it. */
      bare: false,
      hasHandle: false,
      /** Explore: the closed tab hangs from the bar; elsewhere the bar is straight. */
      notchPage: true,
      scrimOn: false,
      dragging: false,
      /** The theme's colours (CSS variables), read on mount and when data-header changes */
      palette: { dark: false, bar: [247, 245, 241, 0.94], chips: [247, 245, 241, 0.94], panel: [251, 247, 242, 0.8], edge: [34, 30, 27, 0.08], edgePanel: [255, 255, 255, 0.6], grip: "34, 30, 27" } as HeaderPalette,
      depthAt(p: number) {
        const chips = NOTCH_DEPTH + NOTCH_EXTRA;
        // Not Explore (or no tabs): closed, the bar is straight – the tab grows from nothing, so no value of p near 0 can leave a 6px tab.
        const flat = (state.bare || !state.notchPage) && !state.hasHandle;
        if (p <= 1) return flat ? chips * Math.max(0, p) : NOTCH_DEPTH + NOTCH_EXTRA * p;
        return chips + (state.fullDepth - chips) * (p - 1);
      },
      /** The way back from a depth, for the drag. */
      stageAt(depth: number) {
        const chips = NOTCH_DEPTH + NOTCH_EXTRA;
        return depth <= chips ? (depth - NOTCH_DEPTH) / NOTCH_EXTRA : 1 + (depth - chips) / Math.max(1, state.fullDepth - chips);
      },
      paint() {
        const { width, navLeft, navRight, contentLeft, contentRight, panelLeft, panelRight } = state.geometry;
        if (width === 0) return;
        // Whole pixels: width and depth animate, the radii don't. Nav → the container's width (chip row) → the panel's narrower, centred width.
        const wide = Math.min(1, state.open);
        const toPanel = Math.min(1, Math.max(0, state.open - 1));
        const left = Math.round(lerp(lerp(navLeft - NOTCH_PADDING, contentLeft, wide), panelLeft, toPanel));
        const right = Math.round(lerp(lerp(navRight + NOTCH_PADDING, contentRight, wide), panelRight, toPanel));
        const depth = Math.round(state.depthAt(state.open));
        const centre = (left + right) / 2;
        // The panel's corners grow to 24px on the way there; the bar's tab keeps its 16px.
        const bottomR = Math.round(lerp(BOTTOM_R, PANEL_R, toPanel));
        const d = headerPath(width, left, right, depth, bottomR);
        refs.path.current?.setAttribute("d", d);
        // The panel's edge lies inside the form (a 2px line along it, its outer half cut away); the bar's and the chip row's just outside.
        const edgeInside = state.open > 1;
        refs.edge.current?.setAttribute("d", edgeInside ? d : edgePath(width, left, right, depth, bottomR));
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
        // "All filters" fills the chip row's right corner: from the bar's line to the tab's bottom, exactly to the tab's right edge; square but
        // for its bottom right, which is the tab's own. Only in the chip row's stage.
        const corner = refs.corner.current;
        if (corner) {
          // Ends exactly on the tab's right edge (never into the bar's flare beyond it); its bottom right corner is the tab's own (bottomR).
          // To the tab's right edge, plus the concave flare beyond it at the top (the outline's own curve there).
          const boxLeft = right - NOTCH_CORNER_W;
          const boxW = NOTCH_CORNER_W + CONCAVE_R;
          corner.style.left = `${n(boxLeft)}px`;
          corner.style.top = `${BAR_H}px`;
          corner.style.width = `${n(boxW)}px`;
          corner.style.height = `${n(depth)}px`;
          corner.style.clipPath = `path("${cornerPath(boxW, depth, bottomR)}")`;
        }
        if (refs.hit.current) {
          refs.hit.current.style.left = `${n(left)}px`;
          refs.hit.current.style.width = `${n(right - left)}px`;
          refs.hit.current.style.height = `${n(depth)}px`;
        }
        if (refs.handle.current) {
          refs.handle.current.style.left = `${n(centre)}px`;
          refs.handle.current.style.top = `${n(BAR_H + depth + HANDLE_BELOW)}px`;
        }
        state.paintGlass();
        state.paintContent(depth);
        state.paintScrim();
      },
      /**
       * From the chip row to the panel: the shape goes from the bar's milk to clear glass, its shadow from a hint to a real one, its edge from
       * ink 8 % to light. Bar and tab are one filled shape without a contour of their own – only the light 1px line follows its outline. At the
       * top of the page no shadow; once content runs under the header a very soft one (0 4px 16px rgba(0,0,0,0.04)).
       */
      paintGlass() {
        const to = Math.min(1, Math.max(0, state.open - 1));
        const wide = Math.min(1, Math.max(0, state.open));
        const palette = state.palette;
        const glass = refs.glass.current;
        if (glass) {
          if (to === 0 && (!palette.dark || wide === 0)) {
            glass.style.backgroundImage = "";
            glass.style.backdropFilter = "";
            glass.style.setProperty("-webkit-backdrop-filter", "");
          } else if (to === 0) {
            // Dark: the solid ink bar becomes the docked row's dark glass (.78, blur 20px) as the tab opens.
            const tint = rgbaOf(mix(palette.bar, palette.chips, wide));
            const blur = `blur(${n(lerp(0, 20, wide))}px)`;
            glass.style.backgroundImage = `linear-gradient(${tint}, ${tint})`;
            glass.style.backdropFilter = blur;
            glass.style.setProperty("-webkit-backdrop-filter", blur);
          } else {
            // To the panel's glass (or, where glass can't show, solid).
            const panel: [number, number, number, number] = canGlass() ? palette.panel : [...palette.panel.slice(0, 3), 1] as [number, number, number, number];
            const tint = rgbaOf(mix(palette.chips, panel, to));
            const blur = palette.dark ? `blur(${n(lerp(20, 24, to))}px)` : `blur(${n(lerp(24, 40, to))}px) saturate(${n(lerp(1.3, PANEL_SATURATE, to))})`;
            // The light from the panel's top left corner: an ellipse over about 40 % of it.
            const { panelLeft, panelRight } = state.geometry;
            const depth = state.depthAt(state.open);
            const glow = `radial-gradient(${n((panelRight - panelLeft) * 0.6)}px ${n(depth * 0.8)}px at ${n(panelLeft)}px ${BAR_H}px, rgba(240, 99, 58, ${n(PANEL_GLOW_ALPHA * to)}), rgba(240, 99, 58, 0))`;
            glass.style.backgroundImage = `${glow}, linear-gradient(${tint}, ${tint})`;
            glass.style.backdropFilter = blur;
            glass.style.setProperty("-webkit-backdrop-filter", blur);
          }
        }
        const shadow = refs.shadow.current;
        if (shadow) {
          // At the panel: 0 30px 80px rgba(0,0,0,0.18).
          shadow.style.filter = `blur(${n(lerp(8, 40, to))}px)`;
          shadow.style.opacity = String(n(lerp(state.scrolled ? 0.04 : 0, 0.18, to)));
          shadow.firstElementChild?.setAttribute("transform", `translate(0 ${n(lerp(4, 30, to))})`);
        }
        // The edge: the faint ink line of the bar becomes the glass's fine light contour (1px white 60 %, inside the shape).
        refs.edge.current?.setAttribute("stroke", rgbaOf(mix(palette.edge, palette.edgePanel, to)));
      },
      /** The scrim under a tab opened by hand comes with p. A tab that opened by itself has none. */
      paintScrim() {
        const scrim = refs.scrim.current;
        if (!scrim) return;
        // The open panel always has it – opened by hand or from the chip row that came by itself.
        const on = state.scrimOn || state.dragging || state.open > 1;
        // Over a chip row that opened by itself it only comes with the panel.
        const strength = state.auto ? Math.max(0, state.open - 1) : Math.min(1, state.open);
        // Behind the panel: a light blur (10px) and a slight dimming (6 %), growing with p.
        const toPanel = Math.min(1, Math.max(0, state.open - 1));
        const blur = `blur(${n(lerp(6, PANEL_SCRIM_BLUR, toPanel))}px)`;
        scrim.style.backgroundColor = `rgba(34, 30, 27, ${n(lerp(0.12, PANEL_SCRIM_ALPHA, toPanel))})`;
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
        const corner = refs.corner.current;
        if (corner) {
          // The block comes and goes with the row – fully opaque all the way: it slides in from the tab's right edge (cut by the tab's clip)
          // instead of fading, so nothing underneath ever shows through it. In the whole panel it's gone (the panel has its own ✕).
          corner.style.opacity = opacity > 0 ? "1" : "0";
          corner.style.transform = `translateX(${n((1 - opacity) * NOTCH_CORNER_W)}px)`;
          corner.style.visibility = opacity > 0 ? "visible" : "hidden";
        }
        slot.style.clipPath = overHandle > 0 ? `inset(0 0 ${n(overHandle)}px 0)` : "none";
        const on = state.open > CONTENT_FROM && state.open < ROW_UNTIL;
        if (on !== state.contentOn) {
          state.contentOn = on;
          slot.style.pointerEvents = on ? "auto" : "none";
          slot.inert = !on;
          if (corner) {
            corner.style.pointerEvents = on ? "auto" : "none";
            corner.inert = !on;
          }
        }
        const panel = refs.panelSlot.current;
        if (!panel) return;
        const panelOpacity = Math.min(1, Math.max(0, (state.open - PANEL_FROM) / (2 - PANEL_FROM)));
        panel.style.opacity = panelOpacity.toFixed(3);
        // Fully gone while not open: nothing of the panel's fields may show through the bar or the chip row.
        panel.style.visibility = panelOpacity > 0 ? "visible" : "hidden";
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
          // The last frame lands exactly on the target (the easing's own end can be off by a hair).
          state.open = t < 1 ? lerp(from, to, easeSheet(t)) : to;
          state.paint();
          state.frame = t < 1 ? requestAnimationFrame(step) : 0;
        };
        state.frame = requestAnimationFrame(step);
      },
    };
    return state;
  });

  // Scrolled or not: a 1px mark at the very top of the page. While it's in view, nothing lies under the header – no shadow. No scroll listener.
  useEffect(() => {
    const mark = document.createElement("div");
    mark.setAttribute("aria-hidden", "true");
    mark.style.cssText = "position:absolute;top:0;left:0;width:1px;height:1px;pointer-events:none;visibility:hidden";
    document.body.prepend(mark);
    const observer = new IntersectionObserver(([entry]) => {
      run.scrolled = !entry.isIntersecting;
      run.paintGlass();
    });
    observer.observe(mark);
    return () => {
      observer.disconnect();
      mark.remove();
    };
  }, [run]);

  // Window and nav width. The tab opens to the header's Container, the page content's edges.
  useLayoutEffect(() => {
    const header = refs.header.current;
    const nav = refs.nav.current;
    // The page container, not the nav's parent: the nav sits in its own wrapper (the avatar hangs beside it), and the open tab must span
    // the content's edges – like the logo and "Open a House" – whatever the nav's width. Only the closed tab follows the nav.
    const container = nav?.closest<HTMLElement>(".page-container");
    if (!header || !nav || !container) return;
    const measure = () => {
      const box = header.getBoundingClientRect();
      if (box.width === 0) return;
      const inner = nav.getBoundingClientRect();
      const outer = container.getBoundingClientRect();
      const style = getComputedStyle(container);
      // The chip row spans Explore's content: the container, at most --explore-max (1440px) wide and centred like it.
      const containerLeft = outer.left - box.left + parseFloat(style.paddingLeft);
      const containerRight = outer.right - box.left - parseFloat(style.paddingRight);
      const rowWidth = Math.min(containerRight - containerLeft, ROW_MAX_W);
      const contentLeft = Math.round((containerLeft + containerRight - rowWidth) / 2);
      const contentRight = contentLeft + Math.round(rowWidth);
      const panelWidth = Math.min(PANEL_MAX_W, contentRight - contentLeft);
      const centre = (contentLeft + contentRight) / 2;
      const panelLeft = Math.round(centre - panelWidth / 2);
      const panelRight = Math.round(centre + panelWidth / 2);
      // The profile beside the nav (gap + avatar), mirrored to the left too: the closed tab grows by it on both sides.
      const profile = nav.parentElement?.querySelector<HTMLElement>("[data-header-profile]");
      // Not laid out yet (its avatar still 0 wide): its intended space, 12px gap + the 44px avatar – never a lopsided tab.
      const measured = profile ? profile.getBoundingClientRect().right - inner.right : 0;
      const side = profile ? Math.max(PROFILE_SIDE, measured) : 0;
      run.geometry = { width: Math.round(box.width), navLeft: inner.left - box.left - side, navRight: inner.right - box.left + side, contentLeft, contentRight, panelLeft, panelRight };
      run.bare = inner.width < 1;
      const slot = refs.slot.current;
      if (slot) {
        slot.style.left = `${n(contentLeft + SLOT_INSET)}px`;
        slot.style.width = `${n(contentRight - contentLeft - 2 * SLOT_INSET)}px`;
      }
      const panel = refs.panelSlot.current;
      if (panel) {
        panel.style.left = `${n(panelLeft + PANEL_INSET)}px`;
        panel.style.width = `${n(panelRight - panelLeft - 2 * PANEL_INSET)}px`;
      }
      run.paint();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    observer.observe(nav);
    const profile = nav.parentElement?.querySelector<HTMLElement>("[data-header-profile]");
    if (profile) observer.observe(profile);
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

  // The colours: read now, and again whenever the header's theme (data-header on <html>) changes.
  useLayoutEffect(() => {
    const read = () => {
      run.palette = readPalette();
      run.paint();
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-header"] });
    return () => observer.disconnect();
  }, [run]);

  // The handle mounts with the page that offers it.
  useLayoutEffect(() => {
    run.hasHandle = hasHandle;
    run.notchPage = notchPage;
    run.paint();
  }, [hasHandle, notchPage, run]);

  useEffect(() => {
    if (!run.dragging) run.animate(stageOf(mode));
  }, [mode, run]);

  // A chip picked in the open tab hands it over to the page: the tab stays, its scrim goes on its own.
  useEffect(() => {
    run.auto = auto;
    run.scrimOn = source === "manual";
    if (refs.scrim.current) refs.scrim.current.style.transition = run.scrimOn ? "none" : "opacity 250ms";
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

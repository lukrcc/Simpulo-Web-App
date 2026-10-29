"use client";

import { useLayoutEffect, type RefObject } from "react";

/**
 * The card's whole silhouette as one path: a rounded rectangle (corner radius `r`) with the host tab's notch cut out
 * of the top-left – the tab is `tabW` × `tabH`, its own bottom-right corner and the two concave corners next to it
 * are tabH / 2 round (20px for the 40px tab). No tab (tabW 0): a plain rounded rectangle; a tab too wide for the card:
 * the notch spans the whole top edge.
 */
export function notchPath(w: number, h: number, tabW: number, tabH: number, r: number): string {
  const n = (v: number) => Math.round(v * 100) / 100;
  if (tabW <= 0 || tabH <= 0) {
    return `M${n(r)},0 H${n(w - r)} A${n(r)},${n(r)} 0 0 1 ${n(w)},${n(r)} V${n(h - r)} A${n(r)},${n(r)} 0 0 1 ${n(w - r)},${n(h)} H${n(r)} A${n(r)},${n(r)} 0 0 1 0,${n(h - r)} V${n(r)} A${n(r)},${n(r)} 0 0 1 ${n(r)},0 Z`;
  }
  const c = tabH / 2;
  // A tab as wide as the card (tiny previews): the notch takes the whole top – the card starts below the tab.
  if (tabW + c >= w - r) {
    return `M${n(c)},${n(tabH)} H${n(w - r)} A${n(r)},${n(r)} 0 0 1 ${n(w)},${n(tabH + r)} V${n(h - r)} A${n(r)},${n(r)} 0 0 1 ${n(w - r)},${n(h)} H${n(r)} A${n(r)},${n(r)} 0 0 1 0,${n(h - r)} V${n(tabH + c)} A${n(c)},${n(c)} 0 0 1 ${n(c)},${n(tabH)} Z`;
  }
  return [
    `M${n(tabW + c)},0`,
    `H${n(w - r)}`,
    `A${n(r)},${n(r)} 0 0 1 ${n(w)},${n(r)}`,
    `V${n(h - r)}`,
    `A${n(r)},${n(r)} 0 0 1 ${n(w - r)},${n(h)}`,
    `H${n(r)}`,
    `A${n(r)},${n(r)} 0 0 1 0,${n(h - r)}`,
    // Up the left edge, round the card's corner below the tab (convex for the card, concave for the page) …
    `V${n(tabH + c)}`,
    `A${n(c)},${n(c)} 0 0 1 ${n(c)},${n(tabH)}`,
    // … along the tab's bottom and around its bottom-right corner (concave for the card) …
    `H${n(tabW - c)}`,
    `A${n(c)},${n(c)} 0 0 0 ${n(tabW)},${n(c)}`,
    // … and round the card's corner right of the tab into the top edge.
    `A${n(c)},${n(c)} 0 0 1 ${n(tabW + c)},0`,
    "Z",
  ].join(" ");
}

/**
 * Clips `clipRef` (the card's image, gradient and overlays – one element) to the notched silhouette around the host
 * tab ([data-card-tab]) inside `frameRef`. The tab is a sibling of the clipped element, on the page background; the
 * frame is what scales on hover, so card and notch always move as one. Measured (and re-measured on resize) in the
 * frame's own, unscaled coordinates; until then (server render, before hydration) `data-notch` is "pending" and the
 * tab keeps its old page-coloured corner pieces (globals.css).
 */
export function useNotchClip(
  frameRef: RefObject<HTMLElement | null>,
  clipRef: RefObject<HTMLElement | null>,
  /** Changes when a different tab is shown (another host, another name width) – measure again */
  tabKey?: string,
) {
  useLayoutEffect(() => {
    const frame = frameRef.current;
    const clip = clipRef.current;
    if (!frame || !clip) return;
    const tab = frame.querySelector<HTMLElement>("[data-card-tab]");
    const update = () => {
      const w = clip.offsetWidth;
      const h = clip.offsetHeight;
      if (w === 0 || h === 0) return;
      const radius = parseFloat(getComputedStyle(clip).borderBottomRightRadius) || 0;
      let tabW = 0;
      let tabH = 0;
      // A hidden tab (md:hidden) has no box: then the card is a plain rounded rectangle.
      if (tab && tab.getClientRects().length > 0) {
        const scale = frame.getBoundingClientRect().width / frame.offsetWidth || 1;
        const box = tab.getBoundingClientRect();
        tabW = box.width / scale;
        tabH = box.height / scale;
      }
      clip.style.clipPath = `path("${notchPath(w, h, tabW, tabH, Math.min(radius, w / 2, h / 2))}")`;
      frame.dataset.notch = "ready";
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(clip);
    if (tab) observer.observe(tab);
    return () => observer.disconnect();
  }, [frameRef, clipRef, tabKey]);
}

"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const DELAY_MS = 500;
/** Within this long after one closed, the next opens at once. */
const WARM_MS = 300;
const GAP = 8;
const EDGE = 8;
/** Icon buttons are small: anything bigger with only an aria-label is a card or an overlay, not a control. */
const MAX_SIZE = 56;

/** What gets a tooltip: anything that asks for one, and every button or link that shows only an icon (its aria-label is the text). */
const CANDIDATE = "[data-tooltip], button[aria-label], a[aria-label], [role=button][aria-label]";

function hasVisibleText(el: Element): boolean {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim()) continue;
    // Text only for screen readers (sr-only) sits in a 1px box: not seen.
    const parent = node.parentElement?.getBoundingClientRect();
    if (parent && (parent.width <= 1 || parent.height <= 1)) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const box = range.getBoundingClientRect();
    if (box.width > 1 && box.height > 1) return true;
  }
  return false;
}

/** The tooltip's text for this element, or null: never on a control that shows text, an overlay or something large. */
function textFor(el: HTMLElement): string | null {
  if (el.hasAttribute("data-no-tooltip") || el.getAttribute("tabindex") === "-1" || el.getAttribute("aria-hidden") === "true") return null;
  const explicit = el.getAttribute("data-tooltip");
  if (!explicit) {
    const box = el.getBoundingClientRect();
    if (box.width > MAX_SIZE || box.height > MAX_SIZE || el.querySelector("img")) return null;
  }
  if (hasVisibleText(el)) return null;
  return explicit || el.getAttribute("aria-label");
}

/**
 * The one tooltip, for icon buttons (mounted once, in AppShell): after 500ms of hover, at once on keyboard focus, gone the moment the pointer leaves or
 * clicks; one right after another opens without the wait. Dark glass, under the element, above it at the window's bottom edge. Never on touch, never on a
 * control with visible text. The text is the element's aria-label (or data-tooltip, which then is the same words).
 */
export function Tooltip() {
  const [tip, setTip] = useState<{ text: string; anchor: HTMLElement } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ left: number; top: number; below: boolean } | null>(null);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let current: HTMLElement | null = null;
    let closedAt = -Infinity;
    let suppressed: HTMLElement | null = null;
    const hide = () => {
      clearTimeout(timer);
      if (current) closedAt = performance.now();
      current = null;
      setTip(null);
    };
    const show = (el: HTMLElement, text: string, wait: number) => {
      clearTimeout(timer);
      current = el;
      const open = () => current === el && setTip({ text, anchor: el });
      if (wait <= 0) open();
      else timer = setTimeout(open, wait);
    };
    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const el = (e.target as Element | null)?.closest<HTMLElement>(CANDIDATE);
      if (!el || el === current || el === suppressed) return;
      const text = textFor(el);
      if (!text) return;
      show(el, text, performance.now() - closedAt < WARM_MS || current ? 0 : DELAY_MS);
    };
    const onOut = (e: PointerEvent) => {
      if (!current) return;
      const to = e.relatedTarget as Node | null;
      if (to && current.contains(to)) return;
      if (suppressed && !(to && suppressed.contains(to))) suppressed = null;
      hide();
    };
    const onFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      if (!el.matches?.(":focus-visible")) return;
      const anchor = el.closest<HTMLElement>(CANDIDATE);
      const text = anchor && textFor(anchor);
      if (anchor && text) show(anchor, text, 0);
    };
    const onPress = () => {
      suppressed = current;
      hide();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && hide();
    document.addEventListener("pointerover", onOver, true);
    document.addEventListener("pointerout", onOut, true);
    document.addEventListener("focusin", onFocus, true);
    document.addEventListener("focusout", hide, true);
    document.addEventListener("pointerdown", onPress, true);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerover", onOver, true);
      document.removeEventListener("pointerout", onOut, true);
      document.removeEventListener("focusin", onFocus, true);
      document.removeEventListener("focusout", hide, true);
      document.removeEventListener("pointerdown", onPress, true);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // Under the element, 8px away; above it where the window ends; never past the side edges.
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!tip || !box) return setPlace(null);
    const a = tip.anchor.getBoundingClientRect();
    const w = box.offsetWidth;
    const h = box.offsetHeight;
    const below = a.bottom + GAP + h <= window.innerHeight - EDGE;
    const left = Math.min(Math.max(EDGE, a.left + a.width / 2 - w / 2), document.documentElement.clientWidth - EDGE - w);
    setPlace({ left, top: below ? a.bottom + GAP : a.top - GAP - h, below });
  }, [tip]);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box || !place) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = reduced ? "none" : `translateY(${place.below ? 2 : -2}px)`;
    box.animate([{ opacity: 0, transform: from }, { opacity: 1, transform: "none" }], { duration: 120, easing: "ease-out" });
  }, [place]);

  if (!tip) return null;
  return createPortal(
    <div
      ref={boxRef}
      role="tooltip"
      data-tooltip-box
      style={{ left: place?.left ?? -9999, top: place?.top ?? -9999 }}
      className="pointer-events-none fixed z-[90] max-w-[calc(100vw-16px)] truncate whitespace-nowrap rounded-lg bg-[rgba(34,30,27,0.85)] px-2.5 py-1.5 text-small text-white backdrop-blur-[8px]"
    >
      {tip.text}
    </div>,
    document.body,
  );
}

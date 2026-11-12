"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { lockScroll } from "@/components/ui/ModalOverlay";
import { cn } from "@/lib/utils";

/** How long it grows out of the bar (and back): globals.css .bar-sheet. */
const DURATION_MS = 260;
/** Where / When / More: this wide, under their opener. */
const NARROW_WIDTH = 520;

/** How many sheets hang from the bar right now: while one does, the bar loses its foot line (html[data-bar-sheet]) – bar and sheet are one. */
let openSheets = 0;

interface BarSheetProps {
  open: boolean;
  onClose: () => void;
  /** The opener in the bar: a narrow sheet sits under it; a click on it toggles (the caller), so it doesn't count as "outside" */
  anchor: RefObject<HTMLElement | null>;
  /** "narrow" 520px under the opener (Where · When, More) · "full" as wide as the bar's content, at most 1600, centred (All filters) */
  size?: "narrow" | "full";
  /** Narrow: "start" its left edge on the opener's (Where · When) · "end" its right edge on the opener's (More) */
  align?: "start" | "end";
  label: string;
  /** A fixed head over the scrolling content (All filters: title, count, ✕) */
  head?: ReactNode;
  /** A fixed foot under it (All filters: "Clear all" + "Show N houses") */
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * Every flyout of the bar (Where · When, More, All filters) – one piece with the bar: the bar's own graphite glass, only denser
 * (rgba(72,66,62,.90) + blur 32px saturate 160 %), cream words (muted 65 %), the bar's capsules (cream 8 %, chosen 26 %), fields cream 10 %
 * with a 1px cream 20 % edge. It hangs right on the bar's foot (0px), square on top, radius 24 below, and the bar drops its foot line while it's
 * open. It grows downwards out of the bar (clip-path from 100 % to 0 at the bottom, 260ms cubic-bezier(.2,.8,.2,1)), its content fades in 80ms
 * later; closing runs the other way (reduced motion: only the fade). Behind it the page dims (rgba(20,18,16,.18) + blur 4px) and stays put; a
 * click outside or Escape closes it. Narrow ones scroll inside (at most the window less 140px); the full one (All filters) is as high as its content.
 * While one is open the bar takes its exact glass (globals.css html[data-bar-sheet]).
 * The bar is the opener's closest [data-bar] – the header's bar, or a filter row in the page (city pages, phones).
 */
export function BarSheet({ open, onClose, anchor, size = "narrow", align = "start", label, head, footer, className, children }: BarSheetProps) {
  const [shown, setShown] = useState(open);
  const [closing, setClosing] = useState(false);
  // Open → mounted; closed → it plays its way back into the bar first, then unmounts.
  if (open && (!shown || closing)) {
    setShown(true);
    setClosing(false);
  }
  if (!open && shown && !closing) setClosing(true);
  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(() => {
      setShown(false);
      setClosing(false);
    }, DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [closing]);

  const sheetRef = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ top: number; left: number } | null>(null);
  useLayoutEffect(() => {
    if (!shown) return;
    const measure = () => {
      const opener = anchor.current;
      if (!opener) return;
      const bar = (opener.closest("[data-bar]") ?? opener.closest("[data-site-header]") ?? opener).getBoundingClientRect();
      const viewport = document.documentElement.clientWidth;
      // Never past the bar's content (.bar-width: at most 1600, 32px from the window's edges).
      const edge = Math.max(32, (viewport - 1600) / 2);
      const width = Math.min(NARROW_WIDTH, viewport - 2 * edge);
      const r = opener.getBoundingClientRect();
      const wanted = align === "end" ? r.right - width : r.left;
      setPlace({ top: bar.bottom, left: Math.max(edge, Math.min(wanted, viewport - edge - width)) });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [shown, anchor, align]);

  // While it hangs from the bar: the page stays put, the bar has no foot line.
  useEffect(() => {
    if (!shown) return;
    const unlock = lockScroll();
    openSheets += 1;
    document.documentElement.setAttribute("data-bar-sheet", "");
    return () => {
      unlock();
      openSheets -= 1;
      if (openSheets === 0) document.documentElement.removeAttribute("data-bar-sheet");
    };
  }, [shown]);

  // A click outside (not on the opener – it toggles – and not in a menu opened from inside, portalled to <body>) or Escape closes it.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Element;
      if (sheetRef.current?.contains(target) || anchor.current?.contains(target) || target.closest?.("[data-anchored]")) return;
      closeRef.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || document.querySelector("[data-anchored]")) return;
      closeRef.current();
      anchor.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, anchor]);

  if (!shown || !place) return null;
  const sheet = (
    <div ref={sheetRef} role="dialog" aria-modal="true" aria-label={label} data-closing={closing || undefined} className={cn("bar-sheet pointer-events-auto flex flex-col", size === "narrow" && "max-h-[calc(100vh-140px)]", className)}>
      {head && <div className="bar-sheet-body shrink-0">{head}</div>}
      {/* Full (All filters): as high as its content, no scrolling inside – it is laid out to fit. */}
      <div className={cn("bar-sheet-body min-h-0 flex-1", size === "narrow" && "overflow-y-auto overscroll-contain")}>{children}</div>
      {footer && <div className="bar-sheet-body shrink-0">{footer}</div>}
    </div>
  );
  const at: CSSProperties = { top: place.top };
  return createPortal(
    <>
      <div aria-hidden data-closing={closing || undefined} className="bar-sheet-scrim fixed inset-0 z-38" />
      {size === "full" ? (
        <div style={at} className="pointer-events-none fixed inset-x-0 z-39">
          <div className="bar-width">{sheet}</div>
        </div>
      ) : (
        <div style={{ ...at, left: place.left, width: `min(${NARROW_WIDTH}px, calc(100vw - 32px))` }} className="pointer-events-none fixed z-39">
          {sheet}
        </div>
      )}
    </>,
    document.body,
  );
}

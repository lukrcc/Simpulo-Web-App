"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { lockScroll } from "@/components/ui/ModalOverlay";
import { cn } from "@/lib/utils";
import { useIsPhone } from "@/lib/useMediaQuery";
import { MobileSheet } from "./MobileSheet";

/** How long it grows out of the bar (and back): globals.css .bar-sheet. */
const DURATION_MS = 260;
/** Where / When / More: this wide, under their opener. */
const NARROW_WIDTH = 520;
/** Room between the bar and every menu. */
const GAP_PX = 8;

/** How many sheets hang from the bar right now: while one does, the bar loses its foot line (html[data-bar-sheet]) – bar and sheet are one. */
let openSheets = 0;

interface BarSheetProps {
  open: boolean;
  onClose: () => void;
  /** The opener in the bar: a narrow sheet sits under it; a click on it toggles (the caller), so it doesn't count as "outside" */
  anchor: RefObject<HTMLElement | null>;
  /** "narrow" 520px under the opener (Where · When, More) · "full" as wide as the bar's content, at most 1600, centred (All filters) */
  size?: "narrow" | "full";
  label: string;
  /** A fixed head over the scrolling content (All filters: title, count, ✕) */
  head?: ReactNode;
  /** A fixed foot under it (All filters: "Clear all" + "Show N houses") */
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * Every menu of the bar (Where · When, Themes, All filters): the header's own graphite glass (--header-bg, --header-filter – one tone with the
 * bar), cream words (muted 65 %), the bar's capsules (white 8 %; chosen white filled with graphite words). It sits 8px under the bar, every
 * corner round (24). Narrow ones (Where · When, Themes) flush under their opener's left edge – if that would run past the window, flush with
 * its right edge; All filters as wide as the bar's content. It grows downwards (clip-path from 100 % to 0 at the bottom, 260ms
 * cubic-bezier(.2,.8,.2,1)), its content fades in 80ms later; closing runs the other way (reduced motion: only the fade). Behind it the page
 * dims (rgba(20,18,16,.18) + blur 4px) and stays put; a click outside or Escape closes it. Narrow ones scroll inside (at most the window less
 * 140px); the full one (All filters) is as high as its content.
 * The bar is the opener's closest [data-bar] – the header's bar, or a filter row in the page (city pages, phones).
 */
export function BarSheet({ open, onClose, anchor, size = "narrow", label, head, footer, className, children }: BarSheetProps) {
  // Phones (< 744px): the same content as a sheet from the bottom in the same dark glass (MobileSheet) – nothing hangs from a bar there.
  const phone = useIsPhone();
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
      const width = Math.min(NARROW_WIDTH, viewport - 32);
      const r = opener.getBoundingClientRect();
      // Flush under the opener's left edge; if it would run past the window's right side, flush with the opener's right edge instead.
      const fitsLeft = r.left + width <= viewport - 16;
      const wanted = fitsLeft ? r.left : r.right - width;
      setPlace({ top: bar.bottom + GAP_PX, left: Math.max(16, wanted) });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [shown, anchor]);

  // While it hangs from the bar: the page stays put, the bar has no foot line.
  useEffect(() => {
    if (!shown || phone) return;
    const unlock = lockScroll();
    openSheets += 1;
    document.documentElement.setAttribute("data-bar-sheet", "");
    return () => {
      unlock();
      openSheets -= 1;
      if (openSheets === 0) document.documentElement.removeAttribute("data-bar-sheet");
    };
  }, [shown, phone]);

  // A click outside (not on the opener – it toggles – and not in a menu opened from inside, portalled to <body>) or Escape closes it.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    if (!open || phone) return;
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
  }, [open, anchor, phone]);

  if (phone) {
    return (
      <MobileSheet open={open} onClose={onClose} label={label} tone="dark" className={className}>
        {head}
        {children}
        {footer}
      </MobileSheet>
    );
  }
  if (!shown || !place) return null;
  const sheet = (
    <div ref={sheetRef} role="dialog" aria-modal="true" aria-label={label} data-closing={closing || undefined} className={cn("bar-sheet pointer-events-auto flex flex-col", size === "narrow" && "max-h-[calc(100vh-148px)]", className)}>
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

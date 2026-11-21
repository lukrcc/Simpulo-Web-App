"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode, type Ref } from "react";
import { createPortal } from "react-dom";
import { lockScroll } from "@/components/ui/ModalOverlay";
import { cn } from "@/lib/utils";

/** How long it slides up (and back down): .mobile-sheet in tokens.css. */
const DURATION_MS = 260;
/** A drag down closes it past this far, or when released fast enough (px/ms). */
const CLOSE_DISTANCE = 96;
const CLOSE_SPEED = 0.5;
/** Sheets open right now (nested ones count): while any is, the tab bar steps back. */
let openCount = 0;

/**
 * Phones' sheet from the bottom (< 744px): what opens as a popover or a menu on a larger screen – the account menu, "Where to next?",
 * every ⋯ menu, the bar's sheets, sort and filter dropdowns, small confirmations. It takes the tone of the surface it comes from
 * (CLAUDE.md "Menüs nehmen den Ton der Fläche an"): `tone="dark"` the header's graphite glass (.bar-sheet), `tone="light"` the light milk
 * glass (.glass-panel). Top corners round (24), a grip, the bottom safe area kept free, at most 85 % high, scrolling inside. It slides up
 * (260ms); behind it the page dims and stays put. Closes on a tap beside it, Escape, or a drag down on its top (grip and head): past 96px or
 * a quick flick. Reduced motion: only a fade. `contentRef` points at the content (for the callers' own outside-click checks).
 */
export function MobileSheet({
  open,
  onClose,
  label,
  tone = "dark",
  className,
  contentRef,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  tone?: "dark" | "light";
  className?: string;
  contentRef?: Ref<HTMLDivElement>;
  children: ReactNode;
}) {
  const [shown, setShown] = useState(open);
  const [closing, setClosing] = useState(false);
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

  // While a sheet is up: the page stays put, and the tab bar steps back (it would show through the glass) – html[data-sheet-open].
  useEffect(() => {
    if (!shown) return;
    const unlock = lockScroll();
    openCount += 1;
    document.documentElement.setAttribute("data-sheet-open", "");
    return () => {
      unlock();
      openCount -= 1;
      if (openCount === 0) document.documentElement.removeAttribute("data-sheet-open");
    };
  }, [shown]);

  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Drag down on the grip to close: the sheet follows the finger (transform only), then closes or springs back.
  const panel = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; t: number; dy: number } | null>(null);
  const onDown = (e: ReactPointerEvent) => {
    drag.current = { y: e.clientY, t: e.timeStamp, dy: 0 };
    // The slide-in animation holds its transform; drop it so the sheet can follow the finger.
    if (panel.current) panel.current.style.animation = "none";
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: ReactPointerEvent) => {
    if (!drag.current || !panel.current) return;
    drag.current.dy = Math.max(0, e.clientY - drag.current.y);
    panel.current.style.transition = "none";
    panel.current.style.transform = `translateY(${drag.current.dy}px)`;
  };
  const onUp = (e: ReactPointerEvent) => {
    const d = drag.current;
    drag.current = null;
    const el = panel.current;
    if (!d || !el) return;
    const speed = d.dy / Math.max(1, e.timeStamp - d.t);
    el.style.transition = "transform 200ms cubic-bezier(0.32, 0.72, 0, 1)";
    if (d.dy > CLOSE_DISTANCE || speed > CLOSE_SPEED) {
      el.style.transform = "translateY(100%)";
      window.setTimeout(() => closeRef.current(), 180);
    } else {
      el.style.transform = "";
    }
  };

  if (!shown) return null;
  return createPortal(
    <div className="fixed inset-0 z-72">
      <button type="button" tabIndex={-1} aria-hidden onClick={onClose} data-closing={closing || undefined} className="bar-sheet-scrim absolute inset-0 cursor-default" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        data-closing={closing || undefined}
        data-mobile-sheet={tone}
        className={cn(tone === "dark" ? "bar-sheet" : "glass-panel", "mobile-sheet absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col pb-(--safe-bottom)", className)}
      >
        {/* The grip: a 44px strip to drag the sheet down. */}
        <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} data-sheet-grip className="flex h-6 shrink-0 cursor-grab touch-none items-center justify-center">
          <span aria-hidden className="h-1 w-9 rounded-full bg-ink/30" />
        </div>
        <div ref={contentRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

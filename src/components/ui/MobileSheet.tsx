"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { lockScroll } from "@/components/ui/ModalOverlay";
import { cn } from "@/lib/utils";

/** How long it slides up (and back down): .mobile-sheet in tokens.css. */
const DURATION_MS = 260;

/**
 * Phones' sheet from the bottom for what opens out of the mobile header or the tab bar ("Where to next?", the account menu): the header's
 * own graphite glass (.bar-sheet – the same tone as the bars it comes from, CLAUDE.md "Menüs nehmen den Ton der Fläche an"), top corners
 * round (24), a grip, the bottom safe area kept free. It slides up (260ms); behind it the page dims and stays put. A tap beside it or Escape
 * closes it; closing slides it back down, then it unmounts. Reduced motion: only a fade.
 */
export function MobileSheet({ open, onClose, label, className, children }: { open: boolean; onClose: () => void; label: string; className?: string; children: ReactNode }) {
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

  useEffect(() => {
    if (!shown) return;
    return lockScroll();
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

  if (!shown) return null;
  return createPortal(
    <div className="fixed inset-0 z-[70]">
      <button type="button" tabIndex={-1} aria-hidden onClick={onClose} data-closing={closing || undefined} className="bar-sheet-scrim absolute inset-0 cursor-default" />
      <div role="dialog" aria-modal="true" aria-label={label} data-closing={closing || undefined} className={cn("bar-sheet mobile-sheet absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col pb-(--safe-bottom)", className)}>
        <span aria-hidden className="mx-auto mb-1 mt-2.5 h-1 w-9 shrink-0 rounded-full bg-ink/30" />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

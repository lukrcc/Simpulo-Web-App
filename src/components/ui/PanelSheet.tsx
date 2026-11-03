"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { NotchGrip } from "@/components/layout/header/NotchGrip";
import { easeSheet, snapDuration, snapTarget, SNAP_SPEED, useSheetDrag } from "@/lib/useSheetDrag";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { cn } from "@/lib/utils";
import { GlassPanel } from "./GlassPanel";
import { IconButton } from "./IconButton";
import { useDialogBehaviour } from "./ModalOverlay";

const DURATION_MS = 360;
/** Dragged this far out, it closes: past 40 % of the way. */
const CLOSE_FROM_P = 0.6;
/** The bottom sheet, of the window's height, before it's pulled up to all of it. */
const SHEET_HEIGHT = 0.85;

export interface PanelSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Fixed at the bottom: the actions */
  footer?: ReactNode;
  /** After it has gone, with the page unlocked again */
  onClosed?: () => void;
  /** Beside the title, e.g. the live count */
  titleNote?: ReactNode;
  /** Two columns' room (Filters) */
  wide?: boolean;
  /** The top of a panel about one thing (a photo with its name): scrolls with the content, with only the X over it. It names the panel itself, `title` is for screen readers */
  hero?: ReactNode;
  children: ReactNode;
}

/**
 * A panel over the page. Mouse: floating at the right, 24px from the top, bottom and right. Touch or narrow: from the bottom, and
 * pulled up to the full height. Header and footer stay, only the middle scrolls. Closes with X, Escape, a click on the overlay or by
 * dragging the handle. Above everything but its own popovers. p (0 gone, 1 there) is the only source: position and overlay are
 * worked out from it every frame, dragged or animated.
 */
export function PanelSheet({ open, onClose, title, footer, onClosed, titleNote, wide = false, hero, children }: PanelSheetProps) {
  const t = useTranslations("common");
  const titleId = useId();
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  const bottom = useMediaQuery("(pointer: coarse), (max-width: 47.99rem)");
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const motion = useRef({ p: 0, full: 0, startP: 1, startFull: 0, frame: 0, dragging: false });
  const latest = useRef({ onClose, onClosed });
  useEffect(() => {
    latest.current = { onClose, onClosed };
  });
  // Focus starts on the X, never on the handle: that one is for the pointer.
  useDialogBehaviour(mounted, panelRef, onClose, "[data-sheet-head]");

  const paint = () => {
    const panel = panelRef.current;
    if (!panel) return;
    const { p, full } = motion.current;
    if (overlayRef.current) overlayRef.current.style.opacity = p.toFixed(3);
    if (bottom) {
      const h = window.innerHeight;
      panel.style.height = `${Math.round(h * (SHEET_HEIGHT + (1 - SHEET_HEIGHT) * full))}px`;
      panel.style.transform = `translateY(${((1 - p) * panel.offsetHeight).toFixed(2)}px)`;
    } else {
      panel.style.height = "";
      panel.style.transform = `translateX(${((1 - p) * (panel.offsetWidth + 24)).toFixed(2)}px)`;
    }
  };

  const settle = (toP: number, toFull: number, duration: number) => {
    const m = motion.current;
    cancelAnimationFrame(m.frame);
    m.frame = 0;
    const { p: fromP, full: fromFull } = m;
    const finish = () => {
      m.p = toP;
      m.full = toFull;
      paint();
      if (toP === 0) {
        setMounted(false);
        // After the unlock: it comes with the unmount.
        requestAnimationFrame(() => latest.current.onClosed?.());
      }
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || (fromP === toP && fromFull === toFull)) return finish();
    const start = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, Math.max(0, (now - start) / duration));
      m.p = fromP + (toP - fromP) * easeSheet(k);
      m.full = fromFull + (toFull - fromFull) * easeSheet(k);
      paint();
      if (k < 1) m.frame = requestAnimationFrame(step);
      else {
        m.frame = 0;
        finish();
      }
    };
    m.frame = requestAnimationFrame(step);
  };

  // In and out, from wherever p is: after a drag only what's left of the way.
  useEffect(() => {
    if (!mounted || motion.current.dragging) return;
    paint();
    settle(open ? 1 : 0, open ? motion.current.full : 0, snapDuration(motion.current.p, open ? 1 : 0, DURATION_MS));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when it opens, closes or changes form
  }, [open, mounted, bottom]);
  useEffect(() => () => cancelAnimationFrame(motion.current.frame), []);

  const { handlers } = useSheetDrag({
    axis: bottom ? "y" : "x",
    onPress: () => {
      motion.current.startP = motion.current.p;
      motion.current.startFull = motion.current.full;
    },
    onStart: () => {
      cancelAnimationFrame(motion.current.frame);
      motion.current.frame = 0;
      motion.current.dragging = true;
    },
    onDrag: (delta) => {
      const m = motion.current;
      const panel = panelRef.current;
      if (!panel) return;
      if (bottom) {
        const spare = Math.max(1, window.innerHeight * (1 - SHEET_HEIGHT));
        // Up: to the full height. Down: back from it first, then out.
        const full = m.startFull - delta / spare;
        m.full = Math.min(1, Math.max(0, full));
        const left = full < 0 ? -full * spare : 0;
        m.p = Math.min(1, Math.max(0, m.startP - left / (window.innerHeight * SHEET_HEIGHT)));
      } else {
        m.p = Math.min(1, Math.max(0, m.startP - Math.max(0, delta) / panel.offsetWidth));
      }
      paint();
    },
    onEnd: (speed) => {
      const m = motion.current;
      m.dragging = false;
      if (bottom) {
        // Fast: one stop further the way it was going.
        const closing = m.p < CLOSE_FROM_P || (speed > SNAP_SPEED && m.startFull === 0);
        if (closing) return latest.current.onClose();
        const toFull = speed < -SNAP_SPEED ? 1 : speed > SNAP_SPEED ? 0 : m.full > 0.5 ? 1 : 0;
        return settle(1, toFull, snapDuration(m.full, toFull, DURATION_MS));
      }
      if (snapTarget(m.p, -speed, CLOSE_FROM_P) === 0) return latest.current.onClose();
      settle(1, 0, snapDuration(m.p, 1, DURATION_MS));
    },
  });

  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[70]">
      <div ref={overlayRef} aria-hidden onClick={onClose} style={{ opacity: 0 }} className="absolute inset-0 bg-[rgba(34,30,27,0.18)] backdrop-blur-[16px]" />
      <GlassPanel
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={hero ? undefined : titleId}
        aria-label={hero ? title : undefined}
        tabIndex={-1}
        data-sheet-panel
        style={{ transform: bottom ? "translateY(100%)" : "translateX(calc(100% + 24px))" }}
        className={cn(
          "absolute flex flex-col overflow-hidden outline-none",
          bottom ? "inset-x-0 bottom-0 rounded-b-none" : cn("bottom-6 right-6 top-6 max-w-[calc(100vw-48px)]", wide ? "w-[clamp(720px,52vw,880px)]" : "w-[clamp(440px,34vw,560px)]"),
        )}
      >
        {/* The tab's handle: at the left edge pointing out, or at the top. */}
        <button
          type="button"
          aria-label={t("close")}
          tabIndex={-1}
          {...handlers}
          data-sheet-handle
          className={cn("absolute z-10 flex touch-none items-center justify-center outline-none", bottom ? "inset-x-0 top-0 h-7" : "left-0 top-1/2 h-16 w-6 -translate-y-1/2 pointer-fine:cursor-grab")}
        >
          <span className={bottom ? undefined : "rotate-90"}>
            <NotchGrip open={!bottom} hover={false} />
          </span>
        </button>
        {hero ? (
          <div data-sheet-head className="absolute right-3 top-3 z-20">
            <IconButton onClick={onClose} aria-label={t("close")}>
              <X className="size-5" aria-hidden />
            </IconButton>
          </div>
        ) : (
          <div data-sheet-head className={cn("flex shrink-0 items-center justify-between gap-4 px-6 pb-3", bottom ? "pt-8" : "pt-5")}>
            <div className="flex min-w-0 items-baseline gap-3">
              <h2 id={titleId} className="min-w-0 truncate text-h3 text-ink">
                {title}
              </h2>
              {titleNote && <span className="shrink-0 text-small text-muted">{titleNote}</span>}
            </div>
            <IconButton onClick={onClose} aria-label={t("close")}>
              <X className="size-5" aria-hidden />
            </IconButton>
          </div>
        )}
        <div data-sheet-body className="scroll-pane min-h-0 flex-1">
          {hero}
          {children}
        </div>
        {footer && <div className="flex shrink-0 items-center justify-between gap-4 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">{footer}</div>}
      </GlassPanel>
    </div>,
    document.body,
  );
}

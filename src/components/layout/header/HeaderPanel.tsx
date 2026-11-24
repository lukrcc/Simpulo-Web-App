"use client";

// The header's panels – Search, Themes, Filters – are ONE thing (CLAUDE.md "Aufräumen – ein Design"): a field over the full width right under
// the bar, in the panels' glass (.themes-menu: background, backdrop-filter AND -webkit-backdrop-filter), its content centred in at most 1200px
// with the same room as Themes (the page's margin, 32px above and below). It opens on hover (200ms) and on a click; once you work inside it
// (a pointer down, the focus, a key) it stays open – "eingerastet" – until a click beside it, Escape or a choice. Only one is open at a time
// (lib/headerPanels.ts). Fades in 180ms (opacity + 4px); reduced motion: only shown and hidden.
import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useDismiss } from "@/components/explore/Filters";
import { claimPanel, onPanelClaim, otherPanelOpen, releasePanel } from "@/lib/headerPanels";
import { useHydrated } from "@/lib/useHydrated";
import { cn } from "@/lib/utils";

/** Resting on a trigger this long opens its panel; leaving trigger and panel closes it this long after (unless it's locked). */
export const PANEL_OPEN_DELAY = 200;
export const PANEL_CLOSE_GRACE = 250;

export interface PanelHandlers {
  trigger: { onMouseEnter: () => void; onMouseLeave: () => void; onClick: () => void };
  panel: { onMouseEnter: () => void; onMouseLeave: () => void; onPointerDown: () => void; onFocusCapture: () => void; onKeyDown: () => void };
}

/**
 * Hover and click for one header panel (its open state stays the caller's): opens PANEL_OPEN_DELAY after the pointer rests on the trigger
 * (pointer devices, and only while no other panel is open), closes PANEL_CLOSE_GRACE after it left trigger and panel – unless something was
 * done inside the panel (locked); a click on the trigger toggles and locks. Claims the one place (lib/headerPanels.ts): another panel opening
 * closes this one.
 */
export function useHeaderPanel(open: boolean, setOpen: (open: boolean) => void): PanelHandlers {
  const id = useId();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locked = useRef(false);
  const setOpenRef = useRef(setOpen);
  useEffect(() => {
    setOpenRef.current = setOpen;
  });
  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const later = (next: boolean, ms: number) => {
    clear();
    timer.current = setTimeout(() => {
      if (!next && locked.current) return;
      setOpenRef.current(next);
    }, ms);
  };
  const hoverable = () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  useEffect(() => clear, []);
  useEffect(() => {
    if (!open) {
      locked.current = false;
      return;
    }
    claimPanel(id);
    const off = onPanelClaim((other) => {
      if (other === id) return;
      clear();
      setOpenRef.current(false);
    });
    return () => {
      off();
      releasePanel(id);
    };
  }, [open, id]);
  const lock = () => {
    locked.current = true;
    clear();
  };
  return {
    trigger: {
      onMouseEnter: () => {
        if (!hoverable()) return;
        if (open) clear();
        else if (!otherPanelOpen(id)) later(true, PANEL_OPEN_DELAY);
      },
      onMouseLeave: () => {
        if (hoverable()) later(false, PANEL_CLOSE_GRACE);
      },
      onClick: () => {
        clear();
        locked.current = !open;
        setOpenRef.current(!open);
      },
    },
    panel: {
      onMouseEnter: clear,
      onMouseLeave: () => {
        if (hoverable()) later(false, PANEL_CLOSE_GRACE);
      },
      onPointerDown: lock,
      onFocusCapture: lock,
      onKeyDown: lock,
    },
  };
}

/**
 * The panel itself, on the body (the header's glass would be the containing block of a fixed child): right under the bar, over the full
 * width; a click beside it (outside the trigger too) or Escape closes it (the focus back on the trigger).
 */
export function HeaderPanel({
  open,
  onClose,
  label,
  id,
  handlers,
  triggerRef,
  panelRef,
  head,
  footer,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  id?: string;
  handlers: PanelHandlers["panel"];
  /** The trigger (or its wrapper): a click there isn't "beside" */
  triggerRef: RefObject<HTMLElement | null>;
  panelRef?: RefObject<HTMLDivElement | null>;
  /** Above the content, in the same 1200px (Filters: its title and count) */
  head?: ReactNode;
  /** Under the content, in the same 1200px (Filters: "Clear all" · "Show N houses") */
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const own = useRef<HTMLDivElement>(null);
  const ref = panelRef ?? own;
  const hydrated = useHydrated();
  useDismiss(open, onClose, triggerRef, triggerRef, ref);
  if (!hydrated) return null;
  return createPortal(
    <div
      id={id}
      ref={ref}
      role="dialog"
      aria-label={label}
      aria-hidden={!open}
      data-header-panel
      {...handlers}
      className={cn(
        "themes-menu glass-bar fixed inset-x-0 top-(--header-total) z-40 border-b border-(--graphite-glass-line)",
        // Visible at once on opening (so the focus can land), hidden only after the fade on closing.
        "duration-[180ms] ease-out motion-reduce:transition-none",
        open ? "visible translate-y-0 opacity-100 transition-[opacity,translate]" : "pointer-events-none invisible -translate-y-1 opacity-0 transition-[opacity,translate,visibility]",
      )}
    >
      <div className={cn("mx-auto w-full max-w-[1200px] px-(--page-margin) py-8", className)}>
        {head}
        {children}
        {footer}
      </div>
    </div>,
    document.body,
  );
}

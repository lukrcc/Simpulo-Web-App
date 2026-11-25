"use client";

// The header's panels – Search, Themes, Filters – are ONE thing (CLAUDE.md "Aufräumen – ein Design"): a field over the full width right under
// the bar, in the panels' glass (.themes-menu: background, backdrop-filter AND -webkit-backdrop-filter), its content centred in at most 1200px
// with the same room as Themes (the page's margin, 32px above and below). It opens on hover (200ms) and on a click; once you work inside it
// (a pointer down, the focus, a key) it stays open – "eingerastet" – until a click beside it, Escape or a choice. Only one is open at a time
// (lib/headerPanels.ts). Fades in 180ms (opacity + 4px); reduced motion: only shown and hidden.
import { useEffect, useId, useRef, useState, type FocusEvent, type FormEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useDismiss } from "@/components/explore/Filters";
import { claimPanel, closePanels, onPanelClaim, otherPanelOpen, otherPanelPinned, otherPanelTyping, pinPanel, releasePanel, setPanelTyping } from "@/lib/headerPanels";
import { useHydrated } from "@/lib/useHydrated";
import { cn } from "@/lib/utils";

/** Resting on a trigger this long opens its panel; leaving trigger and panel closes it this long after (unless it's locked). */
export const PANEL_OPEN_DELAY = 200;
export const PANEL_CLOSE_GRACE = 300;
/** Hover over another entry while a panel is open (open or pinned): the content switches after this. */
export const PANEL_SWITCH_DELAY = 150;

export interface PanelHandlers {
  trigger: { onMouseEnter: () => void; onMouseLeave: () => void; onClick: () => void };
  panel: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onPointerDown: () => void;
    onFocusCapture: () => void;
    onKeyDown: () => void;
    onInputCapture: (event: FormEvent) => void;
    onBlurCapture: (event: FocusEvent) => void;
  };
}

/**
 * Hover and click for one header panel (its open state stays the caller's): opens PANEL_OPEN_DELAY after the pointer rests on the trigger
 * (pointer devices; PANEL_SWITCH_DELAY while another panel is open – it then switches, pinned or not), closes PANEL_CLOSE_GRACE after it left trigger and panel – unless something was
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
  /** Pinned (CLAUDE.md "Panels – Klick schließt nicht mehr direkt nach Hover-Öffnen"): leaving no longer closes it – only a click outside,
   *  Escape, a choice, or a click on its own entry again. Hovering another entry still switches the content (the pin goes with it). */
  const lock = () => {
    locked.current = true;
    pinPanel(id);
    clear();
  };
  return {
    trigger: {
      onMouseEnter: () => {
        if (!hoverable()) return;
        // Another panel already open (the pointer comes from Search or Filters): switch at once, like a menu bar – waiting for it to close
        // first left nothing open (the old cause of "Themes doesn't open on hover"). Otherwise after the short delay.
        // Hover only opens out of "closed": a pinned panel of another entry stays.
        // CLAUDE.md "Hover wechselt Panels auch im eingerasteten Zustand": another panel open (open or pinned) → this one's content after
        // PANEL_SWITCH_DELAY, keeping the state (a pinned panel hands its pin on). Not while a field in the open panel is being typed into.
        if (open) clear();
        else if (otherPanelOpen(id)) {
          if (otherPanelTyping(id)) return;
          clear();
          timer.current = setTimeout(() => {
            if (otherPanelTyping(id) || !otherPanelOpen(id)) return;
            if (otherPanelPinned(id)) lock();
            setOpenRef.current(true);
          }, PANEL_SWITCH_DELAY);
        } else later(true, PANEL_OPEN_DELAY);
      },
      onMouseLeave: () => {
        if (hoverable()) later(false, PANEL_CLOSE_GRACE);
      },
      // A click: closed → open and pinned; open by hover → pinned (never closed by it); pinned → closed. On another entry while one is open:
      // this one opens (the content switches) and is pinned. Touch has no hover – only this.
      onClick: () => {
        clear();
        if (!open) {
          lock();
          setOpenRef.current(true);
        } else if (!locked.current) lock();
        else setOpenRef.current(false);
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
      // Typed into a field: hover over other entries no longer switches, until the field loses the focus.
      onInputCapture: (event: FormEvent) => {
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) setPanelTyping(id, true);
      },
      onBlurCapture: (event: FocusEvent) => {
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) setPanelTyping(id, false);
      },
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
  scroll = false,
}: {
  /** Filters: the panel ends above the tab bar (--tabbar-safe); only the content scrolls, the head and the foot stay */
  scroll?: boolean;
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
        // Only the content: the surface, its edge and shadow and the layer behind are the ONE shell (HeaderPanelShell) – switching between
        // Search, Themes and Filters cross-fades the contents (200ms) on the shell that stays.
        "themes-menu fixed inset-x-0 top-(--header-total) z-41",
        "duration-200 ease-out motion-reduce:transition-none",
        open ? "visible opacity-100 transition-opacity" : "pointer-events-none invisible opacity-0 transition-[opacity,visibility]",
      )}
    >
      {scroll ? (
        <div className={cn("mx-auto flex max-h-[calc(100dvh-var(--header-total)-var(--tabbar-safe))] w-full max-w-[1200px] flex-col px-(--page-margin) py-6", className)}>
          <div className="shrink-0">{head}</div>
          <div data-panel-scroll className="scroll-pane min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {children}
          </div>
          <div className="shrink-0">{footer}</div>
        </div>
      ) : (
        <div className={cn("mx-auto w-full max-w-[1200px] px-(--page-margin) py-8", className)}>
          {head}
          {children}
          {footer}
        </div>
      )}
    </div>,
    document.body,
  );
}

/**
 * The ONE panel of the header (CLAUDE.md "Kopfleiste wie apple.com"), rendered once: the surface under whichever of Search, Themes and Filters
 * is open – almost opaque in the page's colour, a fine line at its foot, a soft shadow – and the soft layer over the page behind it (a click
 * there closes). Its height follows the open content (ResizeObserver) and glides (200ms); switching content it stays where it is – no closing
 * and opening, only the contents cross-fade. Closing to nothing it fades out.
 */
export function HeaderPanelShell() {
  const hydrated = useHydrated();
  const [height, setHeight] = useState(0);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!hydrated) return;
    let observed: Element | null = null;
    const sizes = new ResizeObserver(() => measure());
    const measure = () => {
      const panel = document.querySelector<HTMLElement>('[data-header-panel][aria-hidden="false"]');
      if (panel !== observed) {
        if (observed) sizes.unobserve(observed);
        if (panel) sizes.observe(panel);
        observed = panel;
      }
      setOpen(Boolean(panel));
      if (panel) setHeight(panel.offsetHeight);
    };
    // A panel opening, switching or closing changes its aria-hidden; watch that (and new panels mounting).
    const changes = new MutationObserver(() => requestAnimationFrame(measure));
    changes.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["aria-hidden"], childList: true });
    measure();
    return () => {
      sizes.disconnect();
      changes.disconnect();
    };
  }, [hydrated]);
  if (!hydrated) return null;
  return createPortal(
    <>
      <div aria-hidden data-open={open || undefined} className="panel-scrim" onClick={closePanels} />
      <div aria-hidden data-open={open || undefined} className="header-panel-shell" style={{ height }} />
    </>,
    document.body,
  );
}

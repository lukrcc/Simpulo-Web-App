"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/** Open modals and sheets, oldest first – Escape only closes the topmost one (e.g. the AuthSheet over a request sheet). */
export const modalStack: string[] = [];

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The control the user last pressed. Safari (and scripted clicks) don't focus a clicked button, so focus can't
 * always tell what opened a modal – this can.
 */
let lastPressed: HTMLElement | null = null;
if (typeof window !== "undefined") {
  window.addEventListener(
    "pointerdown",
    (e) => {
      lastPressed = e.target instanceof Element ? e.target.closest<HTMLElement>("button, a[href], [role=button]") : null;
    },
    { capture: true },
  );
}

let scrollLocks = 0;
let lockedScrollY = 0;

/**
 * Locks page scrolling without a jump: the body is pinned at the current offset (works on iOS too, where
 * overflow: hidden alone doesn't stop the page) and the scrollbar's width is kept as padding. Nested locks share one.
 */
function lockScroll(): () => void {
  if (scrollLocks++ === 0) {
    lockedScrollY = window.scrollY;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    Object.assign(document.body.style, {
      position: "fixed",
      top: `-${lockedScrollY}px`,
      left: "0",
      right: "0",
      paddingRight: scrollbar > 0 ? `${scrollbar}px` : "",
    });
  }
  return () => {
    if (--scrollLocks > 0) return;
    Object.assign(document.body.style, { position: "", top: "", left: "", right: "", paddingRight: "" });
    // "instant": the page's smooth scrolling must not animate the way back.
    window.scrollTo({ top: lockedScrollY, behavior: "instant" });
  };
}

interface ModalOverlayProps {
  open: boolean;
  onClose: () => void;
  /** id of the dialog's title */
  labelledBy: string;
  /** Classes of the dialog panel (white card / bottom sheet) – the overlay only positions and animates it */
  panelClassName?: string;
  /** Inside the panel: where the first focusable element gets focus on open (default: the whole panel) */
  initialFocus?: string;
  children: ReactNode;
}

/**
 * Full-screen focus overlay for a dialog: the page behind is blurred and slightly dimmed (globals.css .modal-backdrop),
 * above everything incl. header and DevSwitcher. Bottom sheet on phones, centred card from md. Scroll is locked
 * while open, Escape / backdrop click close it, focus stays inside and returns to where it was on close.
 */
export function ModalOverlay({ open, onClose, labelledBy, panelClassName, initialFocus, children }: ModalOverlayProps) {
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  // Latest onClose without re-running the effect (which would move this modal to the top of the stack).
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const focused = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
    const opener = focused ?? lastPressed;
    modalStack.push(id);
    const unlock = lockScroll();

    const panel = panelRef.current;
    const scope = (initialFocus && panel?.querySelector<HTMLElement>(initialFocus)) || panel;
    (scope?.querySelector<HTMLElement>(FOCUSABLE) ?? panel)?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (modalStack.at(-1) !== id || !panel) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      // Focus trap: Tab / Shift+Tab wrap around inside the dialog.
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const inside = panel.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      modalStack.splice(modalStack.indexOf(id), 1);
      unlock();
      // Back to the button that opened it (e.g. "Log in"), if it's still there.
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [open, id, initialFocus]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center md:items-center md:p-6">
      <div aria-hidden onClick={onClose} className="modal-backdrop absolute inset-0" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={cn("modal-panel relative outline-none", panelClassName)}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

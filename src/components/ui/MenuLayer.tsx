"use client";

import type { HTMLAttributes, ReactNode, RefObject } from "react";
import { useIsPhone } from "@/lib/useMediaQuery";
import { Anchored } from "./Anchored";
import { MobileSheet } from "./MobileSheet";

/**
 * Where a popover menu opens: from 744px under its opener (Anchored, the panel with its own look); on phones as a sheet from the bottom
 * (MobileSheet) in the tone of the surface it comes from – `tone` dark (the header glass) or light (milk glass). The same content in both;
 * `panelRef` is the content either way, so the caller's outside-click check keeps working. Desktop unchanged.
 */
export function MenuLayer({
  open,
  onClose,
  anchor,
  panelRef,
  align = "end",
  width,
  label,
  tone,
  panelClassName,
  panelProps,
  children,
}: {
  open: boolean;
  onClose: () => void;
  anchor: RefObject<HTMLElement | null>;
  panelRef?: RefObject<HTMLDivElement | null>;
  align?: "start" | "end";
  width?: number;
  /** The sheet's accessible name on phones */
  label: string;
  tone: "dark" | "light";
  /** The popover's own look (from 744px) */
  panelClassName?: string;
  /** role, id, aria-label, onClick … – on the popover and on the sheet's content */
  panelProps?: HTMLAttributes<HTMLDivElement>;
  children: ReactNode;
}) {
  const phone = useIsPhone();
  if (phone) {
    return (
      <MobileSheet open={open} onClose={onClose} label={label} tone={tone} contentRef={panelRef}>
        <div {...panelProps} className="px-3 pb-4 pt-1">
          {children}
        </div>
      </MobileSheet>
    );
  }
  if (!open) return null;
  return (
    <Anchored anchor={anchor} ref={panelRef} align={align} width={width}>
      <div {...panelProps} className={panelClassName}>
        {children}
      </div>
    </Anchored>
  );
}

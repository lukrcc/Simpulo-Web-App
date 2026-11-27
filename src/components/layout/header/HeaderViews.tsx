"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { usePageSlot } from "@/lib/headerSlot";
import { cn } from "@/lib/utils";
import { hdrItem, hdrViewsRow } from "./headerItem";

export interface HeaderView<T extends string> {
  value: T;
  label: string;
  /** A view that is a page of its own (Profile · Settings): a link instead of a switch */
  href?: string;
  /** An entry that opens something instead of being a view (Messages › Search) – never shown as chosen */
  onSelect?: () => void;
}

/**
 * A page's views in the bar's middle (CLAUDE.md "Kopfleiste als Seitenwerkzeug"): its entries in the style of Explore's (hdrItem –
 * words only, the chosen one in the primary colour, medium). From 1100px they're portalled into the bar's middle (usePageSlot); below it the
 * bar has no middle, so the same row stands at the top of the page (`inline`, centred).
 */
export function HeaderViews<T extends string>({ label, views, value, onChange, inline = true }: { label: string; views: readonly HeaderView<T>[]; value: T | null; onChange?: (value: T) => void; /** Also a row on the page below 1100px */ inline?: boolean }) {
  const slot = usePageSlot();
  const row = (
    <nav aria-label={label} data-header-views className={hdrViewsRow}>
      {views.map((view) => {
        const on = view.value === value && !view.onSelect;
        const props = { "aria-current": on ? ("page" as const) : undefined, "data-on": on ? "" : undefined, className: hdrItem };
        return view.href ? (
          <Link key={view.value} href={view.href} {...props}>
            {view.label}
          </Link>
        ) : (
          <button key={view.value} type="button" onClick={() => (view.onSelect ? view.onSelect() : onChange?.(view.value))} {...props}>
            {view.label}
          </button>
        );
      })}
    </nav>
  );
  return (
    <>
      {slot && createPortal(row, slot)}
      {inline && <div className={cn("flex justify-center pt-3 split:hidden")}>{row}</div>}
    </>
  );
}

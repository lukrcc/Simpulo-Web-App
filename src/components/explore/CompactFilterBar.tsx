"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import type { ActiveChip } from "@/components/explore/Filters";
import { Container } from "@/components/layout/Container";
import { cn } from "@/lib/utils";

interface CompactFilterBarProps {
  /** Desktop: the filter pills row (Country · Language · Month · Budget · Sort) – the bar takes over once it's gone */
  watchRef: RefObject<HTMLElement | null>;
  /** Phones (no pills row): the "Filters" + vibe row */
  mobileWatchRef: RefObject<HTMLElement | null>;
  resultLabel: string;
  chips: ActiveChip[];
  activeCount: number;
  /** Phones: the filter sheet */
  onOpenSheet: () => void;
  /** Desktop: the full filter row, opened as a panel under the bar */
  panel: ReactNode;
}

/** The header bar's height right now (px) – the full row counts as gone once it's under it. */
function headerBarHeight(): number {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-bar-h")) || 0;
}

/**
 * Explore's sticky compact filter bar (Airbnb-style): once the filter pills row has scrolled up under the header, a 44px
 * glass bar slides out from under it – result count, the active filters as removable chips, "Filters" with the active
 * count. Desktop: "Filters" or a chip opens the full row as a panel under the bar (Esc / outside click closes it).
 * Phones: "Filters" opens the sheet. Toggled by an IntersectionObserver on the pills row (phones: the Filters row),
 * with the header bar's current height as the top margin – so the bar replaces the row right where it disappears. It
 * slides by transform only (no animation with reduced motion) and is fixed, so the page never moves.
 */
export function CompactFilterBar({ watchRef, mobileWatchRef, resultLabel, chips, activeCount, onOpenSheet, panel }: CompactFilterBarProps) {
  const t = useTranslations("explore");
  const tf = useTranslations("explore.filtersUi");
  const [shown, setShown] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    let observer: IntersectionObserver | null = null;
    // (Re)observe the row for this width, below the header bar as tall as it is right now.
    const observe = () => {
      observer?.disconnect();
      const row = (desktop.matches ? watchRef : mobileWatchRef).current;
      if (!row) return;
      observer = new IntersectionObserver(
        ([entry]) => {
          // Gone upwards (not just below the fold): show the bar. Back in view: hide it, and its panel with it.
          const above = !entry.isIntersecting && entry.boundingClientRect.bottom <= (entry.rootBounds?.top ?? 0) + 1;
          setShown(above);
          if (!above) setPanelOpen(false);
        },
        { rootMargin: `-${headerBarHeight()}px 0px 0px 0px` },
      );
      observer.observe(row);
    };
    observe();
    desktop.addEventListener("change", observe);
    // The header shrinks once scrolled (HeaderShrink) – the margin follows it.
    const headerWatch = new MutationObserver(observe);
    headerWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-header-compact"] });
    return () => {
      observer?.disconnect();
      headerWatch.disconnect();
      desktop.removeEventListener("change", observe);
    };
  }, [watchRef, mobileWatchRef]);

  useEffect(() => {
    if (!panelOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setPanelOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPanelOpen(false);
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [panelOpen]);

  const isDesktop = () => window.matchMedia("(min-width: 768px)").matches;
  const openFilters = () => (isDesktop() ? setPanelOpen((open) => !open) : onOpenSheet());

  return (
    <div
      ref={barRef}
      role="region"
      aria-label={tf("compactLabel")}
      aria-hidden={!shown}
      inert={!shown}
      className={cn(
        // Under the header (z-40), so it slides out from beneath it; invisible once slid away.
        "fixed inset-x-0 top-(--header-bar-h) z-30 transition-[translate,visibility] duration-200 ease-out motion-reduce:transition-none",
        shown ? "visible translate-y-0" : "invisible -translate-y-full",
      )}
    >
      <div className="glass relative rounded-none border-0 bg-[rgba(245,244,241,0.72)] shadow-none after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-black/5">
        <Container className="flex h-11 items-center gap-3">
          <span className="hidden shrink-0 text-sm font-medium text-ink md:inline">{resultLabel}</span>
          {/* Phones: "Filters" first, like the full row; desktop: on the right. */}
          <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto max-md:order-2">
            {chips.map((chip) => (
              <span key={chip.key} className="inline-flex h-7 shrink-0 items-center rounded-full bg-ink/[0.06] text-[13px] text-ink">
                <button
                  type="button"
                  onClick={openFilters}
                  aria-label={tf("editFilter", { label: chip.label })}
                  className="h-full rounded-l-full pl-3 pr-1 hover:bg-ink/5"
                >
                  {chip.label}
                </button>
                <button
                  type="button"
                  onClick={chip.onRemove}
                  aria-label={tf("remove", { label: chip.label })}
                  className="flex h-full items-center rounded-r-full pl-0.5 pr-2 hover:bg-ink/5"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={openFilters}
            aria-expanded={panelOpen}
            aria-label={activeCount > 0 ? tf("filtersCount", { count: activeCount }) : t("filters")}
            className="relative inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 text-sm font-medium text-ink max-md:order-1"
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            {t("filters")}
            {activeCount > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white">{activeCount}</span>
            )}
          </button>
        </Container>
      </div>

      {/* Desktop: the full filter row as a dropdown panel under the bar. */}
      {panelOpen && (
        <div className="hidden border-b border-black/5 bg-page shadow-[0_12px_32px_rgba(30,30,34,0.10)] md:block">
          <Container className="py-4">{panel}</Container>
        </div>
      )}
    </div>
  );
}

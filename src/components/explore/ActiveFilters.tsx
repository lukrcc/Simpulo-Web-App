"use client";

// THE results head (CLAUDE.md "Aufräumen – ein Design"): one component for Explore's results, Explore's "Open Houses" and every "See all" page
// (/collections/…), and – compact – the bar that runs along under the header once it has scrolled away. Line 1: the title ("16 houses",
// "Just opened") ≈ 32px and beside it in grey "7 houses · 7 countries", the sort on the right; line 2, only with filters on: neutral capsules
// with × (black 5 % / white 8 %, dark words, a small grey ×) and "Clear all" as grey text – no black, no orange edge; optionally ONE grey line
// of description. The bar: 200ms in and out; reduced motion: no animation.
import { X } from "lucide-react";
import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { Container } from "@/components/layout/Container";
import type { ExploreFilters } from "@/lib/exploreFilters";
import { cn } from "@/lib/utils";

export interface ActiveChip {
  key: string;
  label: string;
  patch: Partial<ExploreFilters>;
}

export function ActiveFilterChips({ chips, label, removeLabel, clearLabel, onRemove, onClear, compact = false, className }: { chips: readonly ActiveChip[]; label: string; removeLabel: (label: string) => string; clearLabel: string; onRemove: (chip: ActiveChip) => void; onClear: () => void; /** The bar: one line, a little smaller */ compact?: boolean; className?: string }) {
  if (chips.length === 0) return null;
  return (
    <ul aria-label={label} className={cn("flex min-w-0 items-center gap-2", compact ? "flex-nowrap overflow-hidden" : "flex-wrap", className)}>
      {chips.map((chip) => (
        <li key={chip.key} className="shrink-0">
          <button
            type="button"
            onClick={() => onRemove(chip)}
            aria-label={removeLabel(chip.label)}
            className={cn("press inline-flex items-center gap-1.5 rounded-full bg-(--filter-chip-bg) pl-3.5 pr-2.5 text-nav font-medium text-ink transition-colors duration-150 hover:bg-(--filter-chip-bg-hover)", compact ? "h-8" : "h-9")}
          >
            {chip.label}
            <X aria-hidden className="size-3.5 text-muted" strokeWidth={2.25} />
          </button>
        </li>
      ))}
      {/* Only with at least one filter (the list isn't drawn without). */}
      <li className="shrink-0">
        <button type="button" onClick={onClear} className={cn("px-2 text-nav text-muted underline-offset-4 transition-colors duration-150 hover:text-ink hover:underline", compact ? "h-8" : "h-9")}>
          {clearLabel}
        </button>
      </li>
    </ul>
  );
}

/** The results head: title + grey summary + sort; the active filters; one line of description. `compact`: the bar's one line. */
export function ResultsHead({ title, summary, sort, chips, description, compact = false, className }: { title: string; summary?: string; sort?: ReactNode; chips?: ReactNode; description?: string; compact?: boolean; className?: string }) {
  if (compact)
    return (
      <div className={cn("flex h-full min-w-0 items-center gap-3", className)}>
        <p className="shrink-0 text-body font-semibold text-ink">{title}</p>
        {summary && <p className="shrink-0 text-small text-muted">{summary}</p>}
        <div className="min-w-0 flex-1">{chips}</div>
        {sort && <div className="shrink-0">{sort}</div>}
      </div>
    );
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex min-w-0 items-baseline gap-3">
          <h1 className="min-w-0 truncate text-section text-ink">{title}</h1>
          {summary && <p className="shrink-0 text-body text-muted max-md:hidden">{summary}</p>}
        </div>
        {sort && <div className="shrink-0">{sort}</div>}
      </div>
      {summary && <p className="mt-1 text-body text-muted md:hidden">{summary}</p>}
      {description && <p className="mt-1 truncate text-body text-muted">{description}</p>}
      {chips && <div className="mt-4">{chips}</div>}
    </div>
  );
}

/** The bar that runs along: shown while the head (`headRef`) is above the header's bottom edge – the same head, compact. */
export function ResultsBar({ headRef, title, summary, chips, sort }: { headRef: RefObject<HTMLElement | null>; title: string; summary?: string; chips: ReactNode; sort: ReactNode }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const head = headRef.current;
    if (!head) return;
    const top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-total")) || 48;
    // Out of view = its bottom has gone under the header's bottom edge (scrolled past upwards).
    const observer = new IntersectionObserver(([entry]) => setShown(!entry.isIntersecting && entry.boundingClientRect.top < top), { rootMargin: `-${Math.round(top)}px 0px 0px 0px` });
    observer.observe(head);
    return () => observer.disconnect();
  }, [headRef]);
  return (
    <div
      data-results-bar
      aria-hidden={!shown}
      inert={!shown}
      className={cn(
        "fixed inset-x-0 top-(--header-total) z-30 h-12 border-b border-(--graphite-glass-line) bg-(--graphite-glass) [backdrop-filter:var(--graphite-glass-filter)] [-webkit-backdrop-filter:var(--graphite-glass-filter)] max-split:hidden",
        "transition-[opacity,translate,visibility] duration-200 ease-out motion-reduce:transition-none",
        shown ? "visible translate-y-0 opacity-100" : "pointer-events-none invisible -translate-y-2 opacity-0",
      )}
    >
      <Container className="explore-width h-full">
        <ResultsHead compact title={title} summary={summary} chips={chips} sort={sort} />
      </Container>
    </div>
  );
}

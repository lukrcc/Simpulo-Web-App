"use client";

import { cn } from "@/lib/utils";

export interface SegmentOption<T> {
  value: T;
  label: string;
  /** Something new behind this option: the orange dot after the label */
  dot?: boolean;
}

/**
 * One choice out of a few, always visible (the filters' Crew size, Who, Length …, Open a House's crew size). A rail of ink 5 %. Black means
 * "chosen by you": a chosen value gets the knob in ink with white text, gliding between values (transform, 220ms). The quiet default
 * (the option whose value is null, "Any") has no knob – just its label in bold. Equal widths, so the knob only ever moves.
 * Page tabs aren't this: they're <TabBar>.
 */
export function SegmentedControl<T extends string | number | null>({ options, value, onChange, label, className }: { options: ReadonlyArray<SegmentOption<T>>; value: T; onChange: (value: T) => void; label: string; className?: string }) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const quiet = value === null;
  return (
    <div role="radiogroup" aria-label={label} className={cn("segmented relative flex h-10 rounded-full bg-ink/5 p-1", className)}>
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-1 left-1 rounded-full bg-ink transition-[transform,opacity] duration-[220ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
          quiet ? "opacity-0" : "opacity-100",
        )}
        style={{ width: `calc((100% - 8px) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map((option) => {
        const chosen = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={chosen}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative z-1 grid min-w-0 flex-1 rounded-full text-small transition-colors duration-150",
              chosen ? (quiet ? "font-semibold text-ink" : "font-semibold text-white") : "text-ink/80 hover:text-ink",
            )}
          >
            {/* As wide as in bold, so choosing moves nothing. */}
            <span className="col-start-1 row-start-1 truncate">
              {option.label}
              {option.dot && <span aria-hidden className="ml-1.5 inline-block size-1.5 -translate-y-px rounded-full bg-accent align-middle" />}
            </span>
            <span aria-hidden className="invisible col-start-1 row-start-1 h-0 overflow-hidden font-semibold">
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

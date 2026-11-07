"use client";

import { cn } from "@/lib/utils";

export interface SegmentOption<T> {
  value: T;
  label: string;
  /** Something new behind this option: the orange dot after the label */
  dot?: boolean;
}

/**
 * One choice out of a few, always visible: a rail with a light knob that glides to the chosen option (transform, 220ms). Equal
 * widths, so the knob only ever moves.
 */
export function SegmentedControl<T extends string | number | null>({ options, value, onChange, label, className }: { options: ReadonlyArray<SegmentOption<T>>; value: T; onChange: (value: T) => void; label: string; className?: string }) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div role="radiogroup" aria-label={label} className={cn("segmented relative flex h-10 rounded-full p-1", className)}>
      <span aria-hidden className="segmented-knob absolute inset-y-1 left-1 rounded-full" style={{ width: `calc((100% - 8px) / ${options.length})`, transform: `translateX(${index * 100}%)` }} />
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn("relative z-1 min-w-0 flex-1 truncate rounded-full text-small transition-colors duration-150", option.value === value ? "font-semibold text-ink" : "text-muted hover:text-ink")}
        >
          {option.label}
          {option.dot && <span aria-hidden className="ml-1.5 inline-block size-1.5 -translate-y-px rounded-full bg-accent align-middle" />}
        </button>
      ))}
    </div>
  );
}

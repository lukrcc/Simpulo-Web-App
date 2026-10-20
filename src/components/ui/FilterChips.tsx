"use client";

import { cn } from "@/lib/utils";

interface FilterChipsProps<T extends string> {
  /** Accessible name of the chip group */
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  /** null = "All" */
  value: T | null;
  onChange: (value: T | null) => void;
  /** Label of the "no filter" chip */
  allLabel?: string;
}

/** Single row of chips: scrolls horizontally on mobile, wraps on desktop. */
export function FilterChips<T extends string>({ label, options, value, onChange, allLabel = "All" }: FilterChipsProps<T>) {
  const chips: Array<{ value: T | null; label: string }> = [{ value: null, label: allLabel }, ...options];
  return (
    <div
      role="group"
      aria-label={label}
      className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
    >
      {chips.map((chip) => {
        const active = chip.value === value;
        return (
          <button
            key={chip.value ?? "all"}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(chip.value)}
            className={cn(
              "h-9 shrink-0 rounded-full px-4 text-sm font-medium transition-colors",
              active ? "bg-ink text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200",
            )}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}

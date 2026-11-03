"use client";

import { useTranslations } from "next-intl";
import { Chip } from "./Chip";

interface FilterChipsProps<T extends string> {
  /** Accessible name of the chip group */
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  /** null = "All" */
  value: T | null;
  onChange: (value: T | null) => void;
  /** Label of the "no filter" chip */
  allLabel?: string;
  /** Lighter, smaller chips for a secondary filter row */
  small?: boolean;
}

/** Single row of chips: scrolls horizontally on mobile (edges fade out), wraps on desktop. */
export function FilterChips<T extends string>({ label, options, value, onChange, allLabel, small = false }: FilterChipsProps<T>) {
  const t = useTranslations("common.ui.filterChips");
  const chips: Array<{ value: T | null; label: string }> = [{ value: null, label: allLabel ?? t("all") }, ...options];
  return (
    <div
      role="group"
      aria-label={label}
      className="no-scrollbar -ml-4 flex gap-2 overflow-x-auto px-4 max-md:mask-[linear-gradient(to_right,transparent,black_16px,black_calc(100%-24px),transparent)] md:ml-0 md:flex-wrap md:overflow-visible md:px-0"
    >
      {chips.map((chip) => {
        const active = chip.value === value;
        return (
          // "All" never shows the check – it is the absence of a filter.
          <Chip key={chip.value ?? "all"} active={active} check={chip.value !== null} size={small ? "sm" : "md"} onClick={() => onChange(chip.value)}>
            {chip.label}
          </Chip>
        );
      })}
    </div>
  );
}

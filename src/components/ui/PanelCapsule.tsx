"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The header panels' ONE capsule (CLAUDE.md "Panels Themes, Search, Filters einheitlich"): every choice in Search, Themes and Filters – one
 * height (40px), one padding, one type size, a neutral fill; hover a little darker; chosen the graphite fill with white words (dark mode the
 * other way round). The look is `.panel-cap` (globals.css), its colours the panel's tokens.
 */
export function PanelCapsule({ on = false, className, children, ...rest }: { on?: boolean; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" data-on={on || undefined} className={cn("panel-cap", className)} {...rest}>
      {children}
    </button>
  );
}

/** A row of capsules for one choice (or several with `multiple`); nothing chosen = all. */
export function PanelCapsules<T extends string | number>({
  label,
  options,
  value,
  onChange,
  multiple = false,
}: {
  label: string;
  options: ReadonlyArray<{ value: T; label: ReactNode }>;
  value: readonly T[];
  onChange: (value: T[]) => void;
  multiple?: boolean;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <PanelCapsule
            key={String(o.value)}
            on={on}
            aria-pressed={on}
            onClick={() => onChange(multiple ? (on ? value.filter((v) => v !== o.value) : [...value, o.value]) : on ? [] : [o.value])}
          >
            {o.label}
          </PanelCapsule>
        );
      })}
    </div>
  );
}

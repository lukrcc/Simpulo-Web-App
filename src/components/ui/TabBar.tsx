"use client";

import { cn } from "@/lib/utils";

export interface TabOption<T> {
  value: T;
  label: string;
  /** Something new behind this tab: the orange dot after the label */
  dot?: boolean;
  /** A count in an accent dot after the label (Your houses › Requests) */
  count?: number;
  /** For screen readers when the label alone isn't enough ("Requests, 3 new") */
  ariaLabel?: string;
}

/**
 * Page tabs, like the header's: text, the chosen one ink with a 2px underline 6px below, the others muted (hover ink). Your houses
 * "All · Hosting · Joined · Past", a House's tabs, the FAQ "Joining · Hosting", Messages "Chats · Updates". No pill, no surface.
 */
export function TabBar<T extends string>({ options, value, onChange, label, className }: { options: ReadonlyArray<TabOption<T>>; value: T; onChange: (value: T) => void; label: string; className?: string }) {
  return (
    <div role="tablist" aria-label={label} className={cn("flex min-w-0 items-center gap-6", className)}>
      {options.map((option) => {
        const chosen = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={chosen}
            aria-label={option.ariaLabel}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap text-nav-main transition-colors duration-150",
              chosen ? "text-ink after:absolute after:inset-x-0 after:bottom-0.5 after:h-0.5 after:rounded-full after:bg-ink" : "text-muted hover:text-ink",
            )}
          >
            {option.label}
            {option.dot && <span aria-hidden className="size-1.5 rounded-full bg-accent" />}
            {option.count ? (
              <span aria-hidden className="flex size-4.5 items-center justify-center rounded-full bg-accent text-small text-on-signal">
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

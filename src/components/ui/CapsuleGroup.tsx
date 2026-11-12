"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";

/**
 * The capsule group – the standard for tabs and for filters with few options (the header's tabs, Messages' All · Unread, the Dev menu's Mode):
 * a track 44px, fully round, 4px inside, its segments 36px. Its colours come from the ground (src/styles/tokens.css): the track the words'
 * colour at 5 %; the chosen one on a light ground an outline capsule (1.5px ink), on a dark ground (stage, header, Messages) a filled cream 12 %
 * capsule without an edge – --sel-bg / --sel-border; its words at full strength and semibold, the others muted, hover a 6 % fill. `equal`:
 * segments of one width, the chosen capsule glides between them (300ms spring; none with reduced motion); otherwise each as wide as its
 * content. A segment is a link (`href`) or a button. `size="sm"` (the Dev menu): 36px, 14px words, the others at 60 %.
 */
export interface CapsuleOption<T extends string> {
  value: T;
  /** What the segment shows: icon, word, a count, a dot … */
  content: ReactNode;
  href?: string;
  onClick?: (e: MouseEvent) => void;
  ariaLabel?: string;
  tooltip?: string;
  /** Quiet: something that's done (the words at 50 %) */
  quiet?: boolean;
}

export function CapsuleGroup<T extends string>({
  options,
  value,
  onChange,
  label,
  equal = false,
  size = "md",
  as = "group",
  className,
  ref,
}: {
  options: ReadonlyArray<CapsuleOption<T>>;
  /** The chosen one; null: none (e.g. a page that isn't one of the tabs) */
  value: T | null;
  onChange?: (value: T) => void;
  label: string;
  size?: "md" | "sm";
  equal?: boolean;
  /** "nav": a <nav> of links (aria-current); "group": a radiogroup of buttons */
  as?: "nav" | "group";
  className?: string;
  ref?: Ref<HTMLElement>;
}) {
  const index = options.findIndex((o) => o.value === value);
  const Root = as === "nav" ? "nav" : "div";
  return (
    <Root
      ref={ref as Ref<HTMLDivElement>}
      aria-label={label}
      role={as === "group" ? "radiogroup" : undefined}
      className={cn(
        "relative flex items-center rounded-full bg-ink/5",
        size === "sm" ? "h-9 p-0.5" : "h-11 p-1",
        className,
      )}
    >
      <div className={cn("relative h-full items-stretch", equal ? "grid auto-cols-fr grid-flow-col" : "flex gap-0.5")}>
        {/* Equal segments: one capsule that glides; otherwise each chosen segment draws its own. */}
        {equal && (
          <span
            aria-hidden
            className={cn("absolute inset-y-0 left-0 rounded-full bg-(--sel-bg) shadow-[inset_0_0_0_1.5px_var(--sel-border)] transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.34,1.36,0.64,1)] motion-reduce:transition-none", index < 0 && "opacity-0")}
            style={{ width: `calc(100% / ${options.length})`, transform: `translateX(${Math.max(0, index) * 100}%)` }}
          />
        )}
        {options.map((option) => {
          const current = option.value === value;
          const segment = cn(
            "relative z-1 flex items-center justify-center whitespace-nowrap rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)",
            size === "sm" ? "px-3 text-nav" : "px-4 text-nav-main",
            current
              ? cn("font-semibold text-ink", !equal && "bg-(--sel-bg) shadow-[inset_0_0_0_1.5px_var(--sel-border)]")
              : cn(option.quiet ? "text-ink/50" : size === "sm" ? "text-ink/60" : "text-muted", "hover:bg-ink/6 hover:text-ink"),
          );
          if (option.href) {
            return (
              <Link key={option.value} href={option.href} onClick={option.onClick} aria-current={current ? "page" : undefined} aria-label={option.ariaLabel} data-tooltip={option.tooltip} className={segment}>
                {option.content}
              </Link>
            );
          }
          return (
            <button
              key={option.value}
              type="button"
              role={as === "group" ? "radio" : undefined}
              aria-checked={as === "group" ? current : undefined}
              aria-label={option.ariaLabel}
              data-tooltip={option.tooltip}
              onClick={(e) => {
                option.onClick?.(e);
                onChange?.(option.value);
              }}
              className={segment}
            >
              {option.content}
            </button>
          );
        })}
      </div>
    </Root>
  );
}

"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";

/**
 * The capsule group – the standard for tabs and for filters with few options (the header's tabs, Your houses › Needs you): a track 44px, fully
 * round, 4px inside, its segments 36px. The chosen one is an outline capsule (1.5px, the text's colour), its words at full strength and
 * semibold; the others muted, hover full. Variants: "light" (on the page or the light header: the track ink 5 %, or the header's --hdr-pill)
 * and "on-dark" (Ember and dark surfaces: the track cream 6 %, cream words). `equal`: segments of one width, the outline glides between them
 * (300ms spring; none with reduced motion); otherwise each as wide as its content. A segment is a link (`href`) or a button.
 */
export interface CapsuleOption<T extends string> {
  value: T;
  /** What the segment shows: icon, word, a count, a dot … */
  content: ReactNode;
  href?: string;
  onClick?: (e: MouseEvent) => void;
  ariaLabel?: string;
  tooltip?: string;
  /** Quiet: something that's done (cream 50 % on dark) */
  quiet?: boolean;
}

export function CapsuleGroup<T extends string>({
  options,
  value,
  onChange,
  label,
  variant = "light",
  equal = false,
  as = "group",
  className,
  ref,
}: {
  options: ReadonlyArray<CapsuleOption<T>>;
  /** The chosen one; null: none (e.g. a page that isn't one of the tabs) */
  value: T | null;
  onChange?: (value: T) => void;
  label: string;
  variant?: "light" | "on-dark";
  equal?: boolean;
  /** "nav": a <nav> of links (aria-current); "group": a radiogroup of buttons */
  as?: "nav" | "group";
  className?: string;
  ref?: Ref<HTMLElement>;
}) {
  const index = options.findIndex((o) => o.value === value);
  const dark = variant === "on-dark";
  const Root = as === "nav" ? "nav" : "div";
  return (
    <Root
      ref={ref as Ref<HTMLDivElement>}
      aria-label={label}
      role={as === "group" ? "radiogroup" : undefined}
      className={cn(
        "relative flex h-11 items-center rounded-full p-1",
        dark ? "bg-[rgba(244,238,231,0.06)] text-[#F4EEE7]" : "bg-(--hdr-pill) shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] backdrop-blur-md",
        className,
      )}
    >
      <div className={cn("relative h-full items-stretch", equal ? "grid auto-cols-fr grid-flow-col" : "flex gap-0.5")}>
        {/* Equal segments: one outline that glides; otherwise each chosen segment draws its own. */}
        {equal && (
          <span
            aria-hidden
            className={cn("absolute inset-y-0 left-0 rounded-full shadow-[inset_0_0_0_1.5px_currentColor] transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.34,1.36,0.64,1)] motion-reduce:transition-none", dark ? "text-[#F4EEE7]" : "text-ink", index < 0 && "opacity-0")}
            style={{ width: `calc(100% / ${options.length})`, transform: `translateX(${Math.max(0, index) * 100}%)` }}
          />
        )}
        {options.map((option) => {
          const current = option.value === value;
          const segment = cn(
            "relative z-1 flex items-center justify-center whitespace-nowrap rounded-full px-4 text-nav-main transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2",
            dark ? "focus-visible:ring-[#F4EEE7]/40" : "focus-visible:ring-(--focus-ring)",
            current
              ? cn("font-semibold", dark ? "text-[#F4EEE7]" : "text-ink", !equal && "shadow-[inset_0_0_0_1.5px_currentColor]")
              : dark
                ? cn(option.quiet ? "text-[#F4EEE7]/50" : "text-[#F4EEE7]/75", "hover:bg-[#F4EEE7]/6 hover:text-[#F4EEE7]")
                : "text-(--hdr-muted) hover:text-ink",
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

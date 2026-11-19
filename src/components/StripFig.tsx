"use client";

import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { useTabScroll } from "@/components/ui/useTabScroll";
import { cn } from "@/lib/utils";

/**
 * One number in a dark strip (Your houses, the profile – the strip's type scale: the number text-bar-num, its label text-bar-label). In a
 * strip the whole strip is never a link: each number is its own, recognisable by the "→" after its label. A link: the label 70 % → 100 %
 * white on hover, the arrow 2px to the right, 150ms – no scaling, no glow; a visible ring for the keyboard. Without `href`: just the number.
 */
export function StripFig({ value, label, href, sub, dot = false, className }: { value: ReactNode; label: ReactNode; href?: string; sub?: ReactNode; dot?: boolean; className?: string }) {
  const body = (
    <>
      <span className="flex items-center gap-2">
        {dot && <span aria-hidden className="size-2 shrink-0 rounded-full bg-accent" />}
        <span className="whitespace-nowrap text-bar-num tabular-nums text-ink">{value}</span>
      </span>
      <span className={cn("inline-flex items-center gap-1 whitespace-nowrap text-bar-label transition-colors duration-150", href ? "text-ink/70 group-hover:text-ink group-focus-visible:text-ink" : "text-ink/60")}>
        {label}
        {sub && <span className="text-ink/60">· {sub}</span>}
        {href && (
          <span aria-hidden className="transition-transform duration-150 group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5 motion-reduce:transition-none">
            →
          </span>
        )}
      </span>
    </>
  );
  const box = cn("flex shrink-0 flex-col border-l border-ink/12 px-6 first:border-l-0 first:pl-0", className);
  return href ? (
    <Link href={href} className={cn(box, "group rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--focus-ring)")}>
      {body}
    </Link>
  ) : (
    <div className={box}>{body}</div>
  );
}

/**
 * The numbers of a strip in a row. Phones (< 768px): one line that scrolls sideways (.tab-scroll – no wrapping, the fade on the right only
 * while more follows); every number stays its own link with its →. From 768px a plain row.
 */
export function StripRow({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useTabScroll(ref, null);
  return (
    <div ref={ref} className={cn("tab-scroll strip-scroll flex min-w-0 items-center", className)}>
      {children}
    </div>
  );
}

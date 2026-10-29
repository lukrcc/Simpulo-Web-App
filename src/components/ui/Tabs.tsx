"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Tab<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface TabsProps<T extends string> {
  tabs: ReadonlyArray<Tab<T>>;
  value: T;
  onChange: (value: T) => void;
}

/** Which ends of a horizontal scroller have more content behind them. */
function useScrollEdges(ref: React.RefObject<HTMLElement | null>) {
  const [edges, setEdges] = useState({ start: false, end: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setEdges({ start: el.scrollLeft > 1, end: el.scrollLeft + el.clientWidth < el.scrollWidth - 1 });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, [ref]);
  return edges;
}

/** Segmented tabs; equal widths when they fit, otherwise the row scrolls sideways (faded edges show there's more). */
export function Tabs<T extends string>({ tabs, value, onChange }: TabsProps<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const edges = useScrollEdges(ref);

  // The active tab is always in view (also when opened via a deep link).
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("[aria-selected=true]")?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [value]);

  const fade = edges.start && edges.end ? "linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)" : edges.end ? "linear-gradient(to right, black calc(100% - 32px), transparent)" : edges.start ? "linear-gradient(to right, transparent, black 32px)" : undefined;

  return (
    <div
      ref={ref}
      role="tablist"
      className="no-scrollbar flex gap-1 overflow-x-auto rounded-full bg-black/5 p-1"
      style={fade ? { maskImage: fade, WebkitMaskImage: fade } : undefined}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              // Tighter below sm; never narrower than the label – the row scrolls instead.
              "flex min-h-11 flex-1 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition-colors sm:gap-1.5 sm:px-4 md:min-h-0",
              active ? "bg-white text-ink shadow-sm" : "text-neutral-500 hover:text-ink",
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs",
                  active ? "bg-accent-soft text-accent" : "bg-neutral-200 text-neutral-600",
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

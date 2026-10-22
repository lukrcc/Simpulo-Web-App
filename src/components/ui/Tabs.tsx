"use client";

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

export function Tabs<T extends string>({ tabs, value, onChange }: TabsProps<T>) {
  return (
    <div role="tablist" className="flex gap-1 rounded-full bg-black/5 p-1">
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
              "flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors",
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

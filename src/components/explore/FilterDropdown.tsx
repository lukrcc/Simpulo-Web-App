"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Up to this many options a plain native select is enough; above, the popover gets a search field. */
export const SEARCH_THRESHOLD = 8;

export interface FilterDropdownOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  /** Accessible name, e.g. "Country" */
  label: string;
  /** Label of the "no filter" entry – also shown on the button while nothing is picked ("Anywhere") */
  allLabel: string;
  options: readonly FilterDropdownOption[];
  /** null = no filter */
  value: string | null;
  onChange: (value: string | null) => void;
  searchPlaceholder: string;
  noMatchesLabel: string;
}

const TRIGGER =
  "cursor-pointer appearance-none bg-transparent text-sm font-medium text-ink underline-offset-4 outline-none hover:underline focus-visible:underline";

/** Quiet toolbar filter ("Anywhere ▾"): a native select for short lists, a searchable popover for long ones. */
export function FilterDropdown(props: FilterDropdownProps) {
  return props.options.length > SEARCH_THRESHOLD ? <SearchablePopover {...props} /> : <PlainSelect {...props} />;
}

function PlainSelect({ label, allLabel, options, value, onChange }: FilterDropdownProps) {
  return (
    <label className="group relative flex items-center gap-1 text-sm font-medium text-ink">
      <span className="sr-only">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className={cn(TRIGGER, "pr-5 [field-sizing:content] group-hover:underline")}
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-0 size-4 text-zinc-500" aria-hidden />
    </label>
  );
}

function SearchablePopover({ label, allLabel, options, value, onChange, searchPlaceholder, noMatchesLabel }: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const panelId = useId();

  const selected = options.find((o) => o.value === value);
  const needle = query.trim().toLocaleLowerCase();
  const matches = needle ? options.filter((o) => o.label.toLocaleLowerCase().includes(needle)) : options;
  const entries: ReadonlyArray<{ value: string | null; label: string }> = needle ? matches : [{ value: null, label: allLabel }, ...matches];

  // Clicks outside close the popover.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function toggle() {
    setQuery("");
    setOpen((o) => !o);
  }

  function pick(next: string | null) {
    onChange(next);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    // Arrow keys move between the search field and the entries.
    event.preventDefault();
    const items = [...(listRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === "ArrowDown" ? index + 1 : index - 1;
    if (next < 0) rootRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    else items[Math.min(next, items.length - 1)]?.focus();
  }

  return (
    <div ref={rootRef} className="relative" onKeyDown={open ? onKeyDown : undefined}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${label}: ${selected?.label ?? allLabel}`}
        className={cn(TRIGGER, "flex items-center gap-1")}
      >
        {selected?.label ?? allLabel}
        <ChevronDown className={cn("size-4 text-zinc-500 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div
          id={panelId}
          className="animate-fade-in absolute right-0 top-full z-30 mt-2 w-64 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5"
        >
          <label className="flex items-center gap-2 border-b border-black/5 px-3 py-2.5">
            <Search className="size-4 shrink-0 text-zinc-400" aria-hidden />
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && matches[0]) {
                  e.preventDefault();
                  pick(matches[0].value);
                }
              }}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-zinc-400"
            />
          </label>
          {entries.length === 0 ? (
            <p className="px-4 py-3 text-sm text-zinc-500">{noMatchesLabel}</p>
          ) : (
            <ul ref={listRef} aria-label={label} className="scroll-pane max-h-72 py-1">
              {entries.map((entry) => {
                const active = entry.value === value;
                return (
                  <li key={entry.value ?? ""}>
                    <button
                      type="button"
                      onClick={() => pick(entry.value)}
                      aria-pressed={active}
                      className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm text-ink outline-none hover:bg-neutral-50 focus-visible:bg-neutral-100"
                    >
                      <span className="truncate">{entry.label}</span>
                      {active && <Check className="size-4 shrink-0 text-ink" aria-hidden />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

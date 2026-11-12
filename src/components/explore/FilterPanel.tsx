"use client";

import { ChevronDown, Search, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Anchored } from "@/components/ui/Anchored";
import { DarkMenuItem, darkMenuClass, darkMenuScroll } from "@/components/ui/DarkMenu";
import { cn } from "@/lib/utils";
import { useDismiss } from "./Filters";

/**
 * The filter panel's rows: the label on the left (150px, 14px semibold; on a narrow sheet above), the content on the right; 16px above and
 * below, a 1px line (ink 9 %) between rows (the panel's list: `divide-y`). Several picked: their number as a small orange count after
 * the label. No "Any" anywhere – nothing picked means everything.
 */
export function FilterRow({ label, count = 0, aside, children, className }: { label: ReactNode; count?: number; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid items-center gap-x-6 gap-y-2 py-4 first:pt-0 last:pb-0 sm:grid-cols-[150px_minmax(0,1fr)]", className)}>
      <span className="flex items-center gap-2 text-nav font-semibold text-ink">
        {label}
        {count > 0 && (
          <span aria-hidden className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-accent text-eyebrow leading-none tracking-normal text-on-signal tabular-nums">
            {count}
          </span>
        )}
      </span>
      <div className="flex min-w-0 items-center gap-4">
        <div className="min-w-0 flex-1">{children}</div>
        {aside}
      </div>
    </div>
  );
}

/** The panel's option capsule: 36px, padding 0 16px, a 1px ink 9 % edge, ink 75 % text; chosen the orange tone (.pick-option, .pick-on). */
const optionClass = (on: boolean) => cn("pick-option press inline-flex h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-4 text-nav [&>svg]:size-3.5 [&>svg]:shrink-0", on && "pick-on");

/** A capsule's line icon, 16px before its words: ink 60 %, chosen #F0633A. */
function OptionIcon({ icon: Icon, on }: { icon?: LucideIcon; on: boolean }) {
  if (!Icon) return null;
  return (
    <span aria-hidden className={cn("-ml-0.5 mr-1 flex shrink-0 transition-colors duration-150", on ? "text-accent" : "text-ink/60")}>
      <Icon className="size-4" strokeWidth={1.75} />
    </span>
  );
}

type Option<T> = { value: T; label: string; icon?: LucideIcon };

/**
 * Options as capsules, 8px apart, wrapping. `multiple`: several at once (Category, Length, Crew size); otherwise one, and clicking the
 * chosen one again clears it.
 */
export function PickOptions<T extends string | number>({ label, options, value, onChange, multiple = false, trailing }: { label: string; options: ReadonlyArray<Option<T>>; value: readonly T[]; onChange: (value: T[]) => void; multiple?: boolean; /** After the last capsule, e.g. "+ N more" */ trailing?: ReactNode }) {
  return (
    <div role={multiple ? "group" : "radiogroup"} aria-label={label} className="flex flex-wrap items-center gap-2">
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button
            key={String(o.value)}
            type="button"
            role={multiple ? undefined : "radio"}
            aria-checked={multiple ? undefined : on}
            aria-pressed={multiple ? on : undefined}
            onClick={() => onChange(multiple ? (on ? value.filter((v) => v !== o.value) : [...value, o.value]) : on ? [] : [o.value])}
            className={optionClass(on)}
          >
            <OptionIcon icon={o.icon} on={on} />
            {o.label}
          </button>
        );
      })}
      {trailing}
    </div>
  );
}

/**
 * A several-at-once list in a dark popover: a search field on top (fixed), below it the options with checkboxes (scrolling; the whole
 * popover at most 320px).
 */
function SearchableChecklist<T extends string | number>({ label, options, value, onChange }: { label: string; options: ReadonlyArray<{ value: T; label: string; hint?: string }>; value: readonly T[]; onChange: (value: T[]) => void }) {
  const t = useTranslations("explore.filtersUi");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  return (
    // 320px in all: the menu's own 6px padding top and bottom included.
    <div className="flex max-h-[calc(20rem-12px)] flex-col">
      <label className="relative mb-1 block shrink-0">
        <span className="sr-only">{t("searchIn", { label })}</span>
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/50" />
        <input
          autoFocus
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="h-10 w-full rounded-xl bg-ink/10 pl-9 pr-3 text-body text-ink outline-none placeholder:text-ink/50 focus:ring-2 focus:ring-ink/30"
        />
      </label>
      <div role="group" aria-label={label} className="min-h-0 overflow-y-auto overscroll-contain">
        {shown.length === 0 ? (
          <p className="px-3 py-2.5 text-small text-ink/60">{t("noMatch")}</p>
        ) : (
          shown.map((o) => {
            const on = value.includes(o.value);
            return (
              <DarkMenuItem key={String(o.value)} checkbox role="checkbox" aria-checked={on} selected={on} hint={o.hint} onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}>
                {o.label}
              </DarkMenuItem>
            );
          })
        )}
      </div>
    </div>
  );
}

/** The panel's gap between capsules, and how many rows a long list may take before the rest goes under "+ N more". */
const OPTION_GAP = 8;
const MAX_ROWS = 2;

/**
 * Many options as capsules (Category): at most two rows. What doesn't fit goes under a last capsule "+ N more" – a dark popover with a
 * search and checkboxes (several at once). Chosen ones are always in the row, also those picked in the popover. Measured against the
 * row's width (ResizeObserver) from an invisible copy of every capsule.
 */
export function OverflowPickOptions<T extends string>({ label, options, value, onChange }: { label: string; options: ReadonlyArray<Option<T>>; value: readonly T[]; onChange: (value: T[]) => void }) {
  const t = useTranslations("explore.filtersUi");
  const rowRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState<readonly T[] | null>(null);
  const valueKey = value.join(",");

  useLayoutEffect(() => {
    const row = rowRef.current;
    const measure = measureRef.current;
    if (!row || !measure) return;
    const compute = () => {
      const widths = [...measure.children].map((el) => (el as HTMLElement).offsetWidth);
      const moreW = widths.pop() ?? 0;
      const avail = row.clientWidth;
      // Does this set (in the options' order), plus "+ N more" if anything is left out, fit in two rows?
      const fits = (indices: number[]) => {
        const list = indices.map((i) => widths[i]);
        if (indices.length < options.length) list.push(moreW);
        let rows = 1;
        let x = 0;
        for (const w of list) {
          if (x > 0 && x + OPTION_GAP + w > avail) {
            rows += 1;
            x = w;
          } else x += (x > 0 ? OPTION_GAP : 0) + w;
        }
        return rows <= MAX_ROWS;
      };
      const chosen = options.map((o, i) => (value.includes(o.value) ? i : -1)).filter((i) => i >= 0);
      const picked = new Set(chosen);
      for (let i = 0; i < options.length; i++) {
        if (picked.has(i)) continue;
        const next = [...picked, i].toSorted((a, b) => a - b);
        if (!fits(next)) break;
        picked.add(i);
      }
      const next = options.filter((_, i) => picked.has(i)).map((o) => o.value);
      setVisible((current) => (current && current.length === next.length && current.every((v, i) => v === next[i]) ? current : next));
    };
    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(row);
    return () => observer.disconnect();
    // valueKey: the chosen ones as a string, so a new array with the same picks doesn't re-measure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, valueKey]);

  const shown = visible ? options.filter((o) => visible.includes(o.value)) : options;
  const hidden = visible ? options.length - shown.length : 0;
  return (
    <div ref={rowRef} className="relative min-w-0">
      {/* Every capsule once, invisible – what the row measures; the last one is "+ 99 more". */}
      <div className="absolute inset-x-0 top-0 h-0 overflow-hidden">
        <div ref={measureRef} aria-hidden inert className="pointer-events-none invisible absolute left-0 top-0 flex w-max">
          {options.map((o) => (
            <span key={String(o.value)} className={cn(optionClass(true), "font-semibold")}>
              <OptionIcon icon={o.icon} on />
              {o.label}
            </span>
          ))}
          <span className={optionClass(false)}>{t("moreCount", { count: 99 })}</span>
        </div>
      </div>
      <div className={cn(visible === null && "invisible")}>
        <PickOptions multiple label={label} options={shown} value={value} onChange={onChange} trailing={hidden > 0 ? <MoreOptions label={t("moreCount", { count: hidden })} name={label} options={options} value={value} onChange={onChange} /> : undefined} />
      </div>
    </div>
  );
}

/** "+ N more": the rest of a long list in a dark popover with a search and checkboxes. */
function MoreOptions<T extends string>({ label, name, options, value, onChange }: { label: string; name: string; options: ReadonlyArray<Option<T>>; value: readonly T[]; onChange: (value: T[]) => void }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), rootRef, buttonRef, menuRef);
  return (
    <div ref={rootRef} className="relative shrink-0">
      <button ref={buttonRef} type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={id} aria-haspopup="dialog" className={optionClass(false)}>
        {label}
      </button>
      {open && (
        <Anchored anchor={buttonRef} ref={menuRef} align="start" width={280}>
          <div id={id} role="dialog" aria-label={name} className={cn(darkMenuClass, "w-70")}>
            <SearchableChecklist label={name} options={options} value={value} onChange={onChange} />
          </div>
        </Anchored>
      )}
    </div>
  );
}

/**
 * A dropdown capsule in the option style: "Who ⌄"; set, the orange tone with its value ("Crew age · 25–35"). Its menu is the dark one; single
 * choice closes it, `multiple` keeps it open; choosing the chosen one again clears it.
 */
export function FilterDropdown<T extends string | number>({
  label,
  options,
  value,
  onChange,
  multiple = false,
  summary,
  icon,
}: {
  label: string;
  /** Its line icon before the words (Who: a person, Crew age: a calendar …) */
  icon?: LucideIcon;
  options: ReadonlyArray<{ value: T; label: string; hint?: string }>;
  value: readonly T[];
  onChange: (value: T[]) => void;
  multiple?: boolean;
  /** What follows the label when set; default: the chosen option, or with several the first and "+N" ("German +2") */
  summary?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), rootRef, buttonRef, menuRef);
  const set = value.length > 0;
  const chosen = options.filter((o) => value.includes(o.value));
  const shown = summary ?? (chosen.length > 1 ? `${chosen[0].label} +${chosen.length - 1}` : (chosen[0]?.label ?? ""));
  return (
    <div ref={rootRef} className="relative shrink-0">
      <button ref={buttonRef} type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={id} aria-haspopup="dialog" className={cn(optionClass(set), "max-w-64")}>
        <OptionIcon icon={icon} on={set} />
        <span className="truncate">{set ? `${label} · ${shown}` : label}</span>
        <ChevronDown aria-hidden className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <Anchored anchor={buttonRef} ref={menuRef} align="start" width={240}>
          <div id={id} role="dialog" aria-label={label} className={cn(darkMenuClass, multiple ? "w-70" : cn("w-60", darkMenuScroll))}>
            {multiple ? (
              <SearchableChecklist label={label} options={options} value={value} onChange={onChange} />
            ) : (
              <div role="radiogroup" aria-label={label}>
                {options.map((o) => {
                  const on = value.includes(o.value);
                  return (
                    <DarkMenuItem
                      key={String(o.value)}
                      role="radio"
                      aria-checked={on}
                      selected={on}
                      hint={o.hint}
                      onClick={() => {
                        onChange(on ? [] : [o.value]);
                        setOpen(false);
                      }}
                    >
                      {o.label}
                    </DarkMenuItem>
                  );
                })}
              </div>
            )}
          </div>
        </Anchored>
      )}
    </div>
  );
}

/** An on/off option in the same capsule style ("Verified hosts"): the orange tone while on. */
export function ToggleChip({ label, on, onChange, icon }: { label: string; on: boolean; onChange: (on: boolean) => void; icon?: LucideIcon }) {
  return (
    <button type="button" aria-pressed={on} onClick={() => onChange(!on)} className={optionClass(on)}>
      <OptionIcon icon={icon} on={on} />
      {label}
    </button>
  );
}

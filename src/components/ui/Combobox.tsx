"use client";

import { Check, ChevronDown } from "lucide-react";
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ComboOption {
  value: string;
  label: string;
  /** Group heading (e.g. the country); options of a group are listed together, in first-seen order */
  group?: string;
  /** Muted text after the label */
  hint?: string;
}

/** Case- and accent-insensitive "contains" (typing "sao" finds "São Lourenço"). */
const fold = (text: string) => text.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function filterOptions(options: ComboOption[], query: string): ComboOption[] {
  const q = fold(query.trim());
  if (!q) return options;
  return options.filter((o) => fold(o.label).includes(q) || (o.group && fold(o.group).includes(q)) || (o.hint && fold(o.hint).includes(q)));
}

/** Keyboard handling shared by the comboboxes: ↑/↓ move, Enter picks, Escape closes. */
export function useListNavigation(count: number) {
  const [active, setActive] = useState(0);
  const clamped = Math.min(active, Math.max(count - 1, 0));
  function onKey(e: KeyboardEvent, open: () => void): "pick" | "close" | null {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      open();
      if (count > 0) setActive((clamped + (e.key === "ArrowDown" ? 1 : count - 1)) % count);
      return null;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      return "pick";
    }
    if (e.key === "Escape") return "close";
    return null;
  }
  return { active: clamped, setActive, onKey };
}

interface OptionListProps {
  id: string;
  options: ComboOption[];
  active: number;
  selected?: (option: ComboOption) => boolean;
  onPick: (option: ComboOption) => void;
  onHover: (index: number) => void;
  /** Shown when nothing matches */
  empty?: ReactNode;
}

/** The dropdown list (role=listbox) below a combobox input; options stay clickable without blurring the input. */
export function OptionList({ id, options, active, selected, onPick, onHover, empty }: OptionListProps) {
  const groups: Array<{ name: string | undefined; items: Array<{ option: ComboOption; index: number }> }> = [];
  options.forEach((option, index) => {
    const group = groups.find((g) => g.name === option.group) ?? groups[groups.push({ name: option.group, items: [] }) - 1];
    group.items.push({ option, index });
  });
  // Callers pass `inDisplayOrder` options, so indices (↑/↓, aria-activedescendant) follow what is on screen.
  return (
    <div
      id={id}
      role="listbox"
      onMouseDown={(e) => e.preventDefault()}
      className="scroll-pane absolute inset-x-0 top-full z-30 mt-1.5 max-h-72 rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-black/5"
    >
      {options.length === 0 && empty && <p className="px-3 py-2.5 text-sm text-zinc-500">{empty}</p>}
      {groups.map((group, g) => (
        <div key={group.name ?? `group-${g}`} role="group" aria-label={group.name}>
          {group.name && <p className="px-3 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{group.name}</p>}
          {group.items.map(({ option, index }) => {
            const isSelected = selected?.(option) ?? false;
            return (
              <div
                key={option.value}
                id={`${id}-${index}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => onPick(option)}
                onMouseMove={() => onHover(index)}
                className={cn(
                  "flex min-h-10 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm",
                  index === active && "bg-black/5",
                )}
              >
                <span className="min-w-0 flex-1 truncate">
                  {option.label}
                  {option.hint && <span className="ml-1.5 text-zinc-400">{option.hint}</span>}
                </span>
                {isSelected && <Check className="size-4 shrink-0 text-ink" aria-hidden />}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Puts the options in the order OptionList shows them (grouped), so indices match the screen. */
export function inDisplayOrder(options: ComboOption[]): ComboOption[] {
  const order: Array<string | undefined> = [];
  for (const o of options) if (!order.includes(o.group)) order.push(o.group);
  return order.flatMap((group) => options.filter((o) => o.group === group));
}

interface ComboboxProps {
  id?: string;
  /** Text shown in the closed field */
  value: string;
  options: ComboOption[];
  onPick: (option: ComboOption) => void;
  /** Typed text that matches no option, committed with Enter or on leaving the field. Without it only options count. */
  onFreeText?: (text: string) => void;
  /** Always listed first, also while filtering (e.g. "Still open") */
  pinned?: ComboOption;
  isSelected?: (option: ComboOption) => boolean;
  placeholder?: string;
  empty?: ReactNode;
  invalid?: boolean;
  onBlur?: () => void;
  className?: string;
  "aria-label"?: string;
}

/**
 * Searchable single-select: focus shows every option, typing filters (case and accents ignored), ↑/↓ + Enter
 * pick. With `onFreeText`, anything else typed is kept as is – suggestions, never a cage.
 */
export function Combobox({ id, value, options, onPick, onFreeText, pinned, isSelected, placeholder, empty, invalid, onBlur, className, ...aria }: ComboboxProps) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  /** null = not typed since opening: the field shows `value` and the list is unfiltered */
  const [query, setQuery] = useState<string | null>(null);
  // The pinned option stays on top – while filtering only if it matches, so Enter on typed text never picks it.
  const filtered = inDisplayOrder(filterOptions([...(pinned ? [pinned] : []), ...options], query ?? ""));
  const nav = useListNavigation(filtered.length);

  function close() {
    setOpen(false);
    setQuery(null);
  }

  function pick(option: ComboOption) {
    onPick(option);
    close();
  }

  /** Enter / leaving the field: an exact match counts as picking it, anything else typed as free text. */
  function commit() {
    const text = query?.trim();
    if (text) {
      const exact = options.find((o) => fold(o.label) === fold(text));
      if (exact) onPick(exact);
      else if (onFreeText) onFreeText(text);
    }
    close();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    const action = nav.onKey(e, () => setOpen(true));
    if (action === "close") close();
    if (action === "pick") {
      if (open && filtered[nav.active]) pick(filtered[nav.active]);
      else commit();
    }
  }

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && filtered.length > 0 ? `${listId}-${nav.active}` : undefined}
        aria-invalid={invalid || undefined}
        autoComplete="off"
        value={query ?? value}
        placeholder={placeholder}
        onFocus={(e) => {
          setOpen(true);
          e.target.select();
        }}
        onClick={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          nav.setActive(0);
        }}
        onBlur={() => {
          commit();
          onBlur?.();
        }}
        onKeyDown={onKeyDown}
        className="h-11 w-full rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] pl-4 pr-10 text-[15px] outline-none transition-shadow placeholder:text-neutral-400 focus:ring-2 focus:ring-ink/20 aria-invalid:border-red-300"
        {...aria}
      />
      <ChevronDown
        className={cn("pointer-events-none absolute right-3.5 top-3.5 size-4 text-zinc-400 transition-transform", open && "rotate-180")}
        aria-hidden
      />
      {open && (
        <OptionList
          id={listId}
          options={filtered}
          active={nav.active}
          selected={isSelected}
          onPick={pick}
          onHover={nav.setActive}
          empty={empty}
        />
      )}
    </div>
  );
}

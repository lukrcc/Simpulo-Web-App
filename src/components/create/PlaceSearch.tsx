"use client";

import { MapPin } from "lucide-react";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { formInput } from "@/components/form/FormLayout";
import { OptionList, useListNavigation, type ComboOption } from "@/components/ui/Combobox";
import type { PlaceProvider, PlaceSuggestion } from "@/lib/placeSearch";
import { cn } from "@/lib/utils";
import { ValueCheck } from "@/components/ui/ValueCheck";
import { placeProvider } from "./places";

interface PlaceSearchProps {
  id?: string;
  /** Text of the closed field */
  value: string;
  kind: "region" | "area";
  /** The region an area search is limited to */
  within?: string;
  onPick: (place: PlaceSuggestion) => void;
  /** Anything typed that wasn't picked – kept as it is ("" clears) */
  onFreeText: (text: string) => void;
  placeholder?: string;
  /** Shown while nothing matches */
  empty?: string;
  invalid?: boolean;
  onBlur?: () => void;
  "aria-label"?: string;
  provider?: PlaceProvider;
}

/**
 * Autocomplete for places: suggestions while typing ("Canggu · Bali, Indonesia"), ↑/↓ + Enter to pick, anything else
 * typed is kept as free text. The suggestions come from a PlaceProvider (mock list now, Google Places later).
 */
export function PlaceSearch({ id, value, kind, within, onPick, onFreeText, placeholder, empty, invalid, onBlur, provider = placeProvider, ...aria }: PlaceSearchProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  /** null = not typed since focusing: the field shows `value` */
  const [query, setQuery] = useState<string | null>(null);
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  // Answers can arrive out of order (a real provider is a network call): only the latest request counts.
  const request = useRef(0);
  const options: ComboOption[] = results.map((r) => ({ value: r.id, label: r.label, hint: r.secondary }));
  const nav = useListNavigation(options.length);

  function search(text: string) {
    const n = ++request.current;
    void provider.search(text, { kind, within }).then((found) => {
      if (n === request.current) setResults(found);
    });
  }

  function close() {
    setOpen(false);
    setQuery(null);
  }

  function pick(place: PlaceSuggestion) {
    onPick(place);
    close();
  }

  /** Enter / leaving the field without picking: an exact match counts as picking it, anything else as free text. */
  function commit() {
    if (query !== null) {
      const text = query.trim();
      const exact = results.find((r) => r.label.toLowerCase() === text.toLowerCase());
      if (exact && text) onPick(exact);
      else if (text !== value) onFreeText(text);
    }
    close();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // Enter with nothing typed since the last pick isn't for this field: it reaches the form (Enter = next step).
    if (e.key === "Enter" && query === null) return close();
    const action = nav.onKey(e, () => setOpen(true));
    if (action === "close") close();
    if (action === "pick") {
      const place = open ? results[nav.active] : undefined;
      if (place) pick(place);
      else commit();
    }
  }

  return (
    <div className="relative">
      <MapPin className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && options.length > 0 ? `${listId}-${nav.active}` : undefined}
        aria-invalid={invalid || undefined}
        autoComplete="off"
        value={query ?? value}
        placeholder={placeholder}
        onFocus={(e) => {
          setOpen(true);
          search("");
          e.target.select();
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          nav.setActive(0);
          search(e.target.value);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => {
          commit();
          onBlur?.();
        }}
        className={cn(formInput, "pl-10 pr-10")}
        {...aria}
      />
      {query === null && value && <ValueCheck text={value} inset="left-10" />}
      {open && (options.length > 0 || (query?.trim() && empty)) && (
        <OptionList
          id={listId}
          options={options}
          active={nav.active}
          selected={(o) => o.label === value}
          onPick={(o) => {
            const place = results.find((r) => r.id === o.value);
            if (place) pick(place);
          }}
          onHover={nav.setActive}
          empty={empty}
        />
      )}
    </div>
  );
}

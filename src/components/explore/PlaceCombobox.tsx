"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type KeyboardEvent } from "react";
import { formInput } from "@/components/form/FormLayout";
import { searchDestinations } from "@/lib/data";
import type { DestinationCandidate } from "@/lib/data/destinationTypes";
import { useDestinations } from "@/lib/destinations";
import { cn } from "@/lib/utils";

interface PlaceComboboxProps {
  id: string;
  onPick: (place: DestinationCandidate) => void;
  invalid?: boolean;
  /** A large field: 56px, surface, no frame */
  large?: boolean;
  placeholder?: string;
  label?: string;
}

/** The search over every place: you pick from the list, nothing typed is ever a place of its own. */
export function PlaceCombobox({ id, onPick, invalid, large = false, placeholder, label }: PlaceComboboxProps) {
  const t = useTranslations("explore.prelaunch");
  const { destinations } = useDestinations();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const hidden = new Set(destinations.filter((d) => d.status === "hidden").map((d) => d.id));
  const suggestions = searchDestinations(query).filter((d) => !hidden.has(d.id));

  function pick(place: DestinationCandidate) {
    setQuery("");
    setActive(0);
    onPick(place);
  }
  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(suggestions[active]);
    }
  }

  return (
    <div className="relative">
      <Search className={cn("pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted", large ? "left-5 size-5" : "left-4 size-4")} aria-hidden />
      <input
        id={id}
        type="search"
        role="combobox"
        autoComplete="off"
        aria-label={label}
        aria-expanded={suggestions.length > 0}
        aria-controls={`${id}-suggestions`}
        aria-autocomplete="list"
        aria-activedescendant={suggestions[active] ? `${id}-option-${active}` : undefined}
        aria-invalid={invalid ? true : undefined}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={onKey}
        placeholder={placeholder ?? t("destinationPlaceholder")}
        className={large ? "h-14 w-full rounded-[28px] bg-surface pl-13 pr-5 text-body text-ink outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-accent" : cn(formInput, "pl-10")}
      />
      {suggestions.length > 0 && (
        <ul id={`${id}-suggestions`} role="listbox" className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden glass-panel rounded-[20px]! py-1">
          {suggestions.map((d, i) => (
            <li key={d.id} id={`${id}-option-${i}`} role="option" aria-selected={i === active}>
              <button type="button" onClick={() => pick(d)} className={cn("flex w-full items-baseline gap-2 px-4 py-2.5 text-left text-body hover:bg-white/50", i === active && "bg-white/50")}>
                <span className="font-medium text-ink">{d.name}</span>
                <span className="text-muted">{d.country}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim() && suggestions.length === 0 && <p className="mt-1.5 text-small text-muted">{t("noMatch")}</p>}
    </div>
  );
}

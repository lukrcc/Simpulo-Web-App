"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { formInput } from "@/components/form/FormLayout";
import { Img } from "@/components/ui/Img";
import { searchPlaces } from "@/lib/data";
import { ALL_PLACES, coverOf, placeKindOf } from "@/lib/data/places";
import { isListedStay } from "@/lib/launch";
import { stayInPlace, type SearchPlace } from "@/lib/savedSearches";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/** How many places a search shows before anything's typed. */
const POPULAR = 5;

/** Where Houses are, most first: what the search offers before anything's typed. */
function usePopularPlaces(): SearchPlace[] {
  const { stays } = useStore();
  return useMemo(() => {
    const listed = stays.filter(isListedStay);
    return ALL_PLACES.filter((p) => placeKindOf(p.id) === "city")
      .map((place) => ({ place, houses: listed.filter((s) => stayInPlace(s, place)).length }))
      .filter((p) => p.houses > 0)
      .toSorted((a, b) => b.houses - a.houses)
      .slice(0, POPULAR)
      .map((p) => p.place);
  }, [stays]);
}

/** The one search over every place: cities, regions and countries. You pick from the list, nothing typed is ever a place of its own. */
export function PlaceCombobox({ id, onPick, label, placeholder }: { id: string; onPick: (place: SearchPlace) => void; label: string; placeholder: string }) {
  const t = useTranslations("explore.search");
  const popular = usePopularPlaces();
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<{ query: string; hits: SearchPlace[] } | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const search = new AbortController();
    searchPlaces(q, { signal: search.signal })
      .then((hits) => {
        if (!search.signal.aborted) setFound({ query: q, hits });
      })
      .catch(() => {
        // aborted, or the provider is unreachable: the list simply stays as it was
      });
    return () => search.abort();
  }, [query]);

  const q = query.trim();
  const suggestions = q ? (found?.hits ?? []) : popular;
  const nothing = q !== "" && found?.query === q && found.hits.length === 0;

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
      onPick(suggestions[active]);
    }
  }

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <input
          id={id}
          type="search"
          role="combobox"
          autoComplete="off"
          autoFocus
          aria-label={label}
          aria-expanded={suggestions.length > 0}
          aria-controls={`${id}-suggestions`}
          aria-autocomplete="list"
          aria-activedescendant={suggestions[active] ? `${id}-option-${active}` : undefined}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKey}
          placeholder={placeholder}
          className={cn(formInput, "pl-10")}
        />
      </div>
      {suggestions.length > 0 && (
        <ul id={`${id}-suggestions`} role="listbox" className="mt-2 max-h-80 overflow-y-auto overscroll-contain">
          {suggestions.map((place, i) => {
            const kind = placeKindOf(place.id);
            const cover = coverOf(place.id);
            return (
              <li key={place.id} id={`${id}-option-${i}`} role="option" aria-selected={i === active}>
                <button type="button" onClick={() => onPick(place)} className={cn("flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-body hover:bg-white/50", i === active && "bg-white/50")}>
                  {cover && (
                    <span className="relative size-10 shrink-0 overflow-hidden rounded-xl">
                      <Img src={cover} alt="" fill sizes="40px" className="object-cover" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium text-ink">{place.name}</span>{" "}
                    <span className="text-muted">{kind === "country" ? t("kindCountry") : kind === "world" ? t("kindRegion") : place.country}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {nothing && <p role="status" className="mt-2 px-1 text-small text-muted">{t("noPlace")}</p>}
    </div>
  );
}

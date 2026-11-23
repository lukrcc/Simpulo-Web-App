"use client";

import { placeImageOf } from "@/config/place-images";
import { MapPin, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { formInput } from "@/components/form/FormLayout";
import { Img } from "@/components/ui/Img";
import { searchPlaces } from "@/lib/data";
import { ALL_PLACES, placeKindOf } from "@/lib/data/places";
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
export function PlaceCombobox({ id, onPick, label, placeholder, limit }: { id: string; onPick: (place: SearchPlace) => void; label: string; placeholder: string; /** At most this many places (the header's sheet: 4 – it never scrolls) */ limit?: number }) {
  const t = useTranslations("explore.search");
  const popular = usePopularPlaces();
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<{ query: string; hits: SearchPlace[] } | null>(null);
  // The header's sheet (limit): nothing chosen in advance – a row gets its surface only on hover or by the keyboard (CLAUDE.md "ruhiger
  // Feinschliff"); elsewhere the first row stays the default.
  const none = limit ? -1 : 0;
  const [active, setActive] = useState(none);

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
  const suggestions = (q ? (found?.hits ?? []) : popular).slice(0, limit ?? Infinity);
  const nothing = q !== "" && found?.query === q && found.hits.length === 0;

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && suggestions[active]) {
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
            setActive(none);
          }}
          onKeyDown={onKey}
          placeholder={placeholder}
          className={cn(formInput, "pl-10")}
        />
      </div>
      {suggestions.length > 0 && (
        <ul id={`${id}-suggestions`} role="listbox" className={cn("mt-2", limit ? "overflow-hidden" : "max-h-80 overflow-y-auto overscroll-contain")}>
          {suggestions.map((place, i) => {
            const kind = placeKindOf(place.id);
            const cover = placeImageOf(place.id);
            return (
              <li key={place.id} id={`${id}-option-${i}`} role="option" aria-selected={i === active}>
                <button type="button" onClick={() => onPick(place)} onMouseEnter={limit ? () => setActive(none) : undefined} className={cn("flex w-full items-center gap-3 rounded-2xl text-left text-body hover:bg-ink/5", limit ? "min-h-13 px-2.5 py-2" : "px-3 py-2", i === active && "bg-ink/5")}>
                  {/* Every row alike: the place's picture in a square (40px; the header's sheet 36px, rows about 52px), or its pin in the same square. */}
                  <span className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-ink/8 text-muted", limit ? "size-9" : "size-10")}>
                    {cover ? <Img src={cover} alt="" fill sizes="40px" className="object-cover" /> : <MapPin aria-hidden className="size-4" />}
                  </span>
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

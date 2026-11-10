"use client";

import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState, type KeyboardEvent } from "react";
import { formInput } from "@/components/form/FormLayout";
import { worldPlaces } from "@/lib/places";
import type { SearchPlace } from "@/lib/savedSearches";
import { cn } from "@/lib/utils";

export type PlacePick = { kind: "place"; place: SearchPlace } | { kind: "text"; text: string };

/**
 * Open a House's "Where": cities, regions and countries worldwide (lib/places.ts › worldPlaces), each with the same pin – the place bold,
 * its country muted. Nothing that fits: what was typed can be used as it is (free text).
 */
export function PlaceSearch({ id, onPick }: { id: string; onPick: (pick: PlacePick) => void }) {
  const t = useTranslations("create.flow");
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const typed = query.trim();
  const hits = typed ? worldPlaces.search(typed) : worldPlaces.popular();
  const exact = hits.some((p) => p.name.toLowerCase() === typed.toLowerCase());
  const rows: PlacePick[] = [...hits.map((place): PlacePick => ({ kind: "place", place })), ...(typed && !exact ? [{ kind: "text", text: typed } as PlacePick] : [])];
  const pick = (row: PlacePick | undefined) => {
    if (!row) return;
    onPick(row);
    setQuery("");
  };
  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(rows.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" && rows.length > 0) {
      e.preventDefault();
      pick(rows[Math.min(active, rows.length - 1)]);
    }
  }
  return (
    <div>
      <input
        id={id}
        role="combobox"
        aria-expanded={rows.length > 0}
        aria-controls={listId}
        aria-label={t("searchLabel")}
        autoComplete="off"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
        placeholder={t("searchPlaceholder")}
        className={formInput}
      />
      <ul id={listId} role="listbox" aria-label={t("searchLabel")} className="mt-2 space-y-0.5">
        {rows.map((row, i) => (
          <li key={row.kind === "place" ? row.place.id : `text:${row.text}`} role="option" aria-selected={i === active}>
            <button
              type="button"
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(row)}
              className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150", i === active ? "bg-ink/5" : "hover:bg-ink/5")}
            >
              <MapPin className="size-4 shrink-0 text-muted" aria-hidden />
              {row.kind === "place" ? (
                <span className="min-w-0 truncate text-body">
                  <span className="font-semibold text-ink">{row.place.name}</span>
                  {row.place.country && row.place.country !== row.place.name && <span className="text-muted"> · {row.place.country}</span>}
                </span>
              ) : (
                <span className="min-w-0 truncate text-body text-ink">{t("useTyped", { query: row.text })}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {typed && hits.length === 0 && <p className="mt-1 px-3 text-small text-muted">{t("noMatch")}</p>}
    </div>
  );
}

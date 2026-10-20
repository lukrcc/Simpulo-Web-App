"use client";

import { SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { BentoTop } from "@/components/BentoTop";
import { SpotlightHero } from "@/components/SpotlightHero";
import { StayCard } from "@/components/StayCard";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterChips } from "@/components/ui/FilterChips";
import { START_FILTERS, VIBES } from "@/lib/mock";
import { findUser, getCrew, useStore } from "@/lib/store";
import type { Stay, Vibe } from "@/lib/types";
import { cn } from "@/lib/utils";

type StartFilterKey = Exclude<(typeof START_FILTERS)[number]["key"], "any">;
type SortKey = "soonest" | "newest";

const START_WINDOW_DAYS: Record<StartFilterKey, number> = { "14d": 14, "30d": 30, "90d": 90 };

const VIBE_OPTIONS = VIBES.map((v) => ({ value: v.key, label: v.label }));
const START_OPTIONS = START_FILTERS.filter((f) => f.key !== "any").map((f) => ({
  value: f.key as StartFilterKey,
  label: f.label,
}));
const ANY_DATE_LABEL = START_FILTERS.find((f) => f.key === "any")?.label ?? "Any date";

/** Start-date window as YYYY-MM-DD strings, computed from today when the filter is picked. */
interface StartWindow {
  key: StartFilterKey;
  from: string;
  to: string;
}

function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startWindow(key: StartFilterKey): StartWindow {
  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() + START_WINDOW_DAYS[key]);
  return { key, from: toIsoDate(today), to: toIsoDate(end) };
}

function isListed(stay: Stay): boolean {
  return stay.status === "published" || stay.status === "full";
}

export function ExploreFeed() {
  const store = useStore();
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [range, setRange] = useState<StartWindow | null>(null);
  const [sort, setSort] = useState<SortKey>("soonest");

  const listed = useMemo(() => store.stays.filter(isListed), [store.stays]);
  const featured = useMemo(() => listed.filter((s) => s.featured), [listed]);

  const results = listed
    .filter((s) => !vibe || s.vibe === vibe)
    .filter((s) => !range || (s.startDate >= range.from && s.startDate <= range.to))
    .toSorted(
      (a, b) =>
        // Full stays last, then the chosen order.
        Number(a.status === "full") - Number(b.status === "full") ||
        (sort === "soonest" ? a.startDate.localeCompare(b.startDate) : b.createdAt.localeCompare(a.createdAt)),
    );

  return (
    <div>
      {/* Carousel below lg, bento block from lg up – each hides itself at the other size. */}
      <SpotlightHero stays={featured} />
      <BentoTop stays={featured} />

      <div className="mx-auto max-w-[1600px] px-4 md:px-8">
        <div className="mt-6 space-y-3 md:mt-8">
          <FilterChips label="Filter by vibe" options={VIBE_OPTIONS} value={vibe} onChange={setVibe} />
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <FilterChips
                label="Filter by start date"
                options={START_OPTIONS}
                value={range?.key ?? null}
                onChange={(key) => setRange(key ? startWindow(key) : null)}
                allLabel={ANY_DATE_LABEL}
              />
            </div>
            <SortToggle value={sort} onChange={setSort} />
          </div>
        </div>

        {results.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((stay) => (
              <StayCard key={stay.id} stay={stay} host={findUser(store, stay.hostId)} crew={getCrew(store, stay)} />
            ))}
          </div>
        ) : (
          <div className="mt-6">
            <EmptyState
              icon={SearchX}
              title="No Houses match these filters"
              description="Try another vibe or date – or open your own House and let the crew find you."
              action={
                <button
                  type="button"
                  className={buttonClass("secondary", "sm")}
                  onClick={() => {
                    setVibe(null);
                    setRange(null);
                  }}
                >
                  Show all Houses
                </button>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SortToggle({ value, onChange }: { value: SortKey; onChange: (value: SortKey) => void }) {
  const options: Array<{ value: SortKey; label: string }> = [
    { value: "soonest", label: "Soonest first" },
    { value: "newest", label: "Newest" },
  ];
  return (
    <div role="group" aria-label="Sort" className="hidden shrink-0 items-center gap-2 md:flex">
      <span className="text-sm text-neutral-500">Sort:</span>
      <div className="flex rounded-full bg-neutral-100 p-0.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-8 rounded-full px-3 text-sm font-medium transition-colors",
              value === option.value ? "bg-white text-ink shadow-sm" : "text-neutral-500 hover:text-ink",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

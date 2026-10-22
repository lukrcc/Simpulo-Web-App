"use client";

import { ChevronDown, SearchX, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { BentoTop } from "@/components/BentoTop";
import { Container } from "@/components/layout/Container";
import { OpenHouseCard } from "@/components/OpenHouseCard";
import { SpotlightHero } from "@/components/SpotlightHero";
import { StayCard } from "@/components/StayCard";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterChips } from "@/components/ui/FilterChips";
import { Sheet } from "@/components/ui/Sheet";
import { START_FILTERS, VIBES } from "@/lib/mock";
import { findUser, getCrew, useStore } from "@/lib/store";
import type { Stay, Vibe } from "@/lib/types";
import { pluralize } from "@/lib/utils";

type StartFilterKey = (typeof START_FILTERS)[number]["key"];
type WindowKey = Exclude<StartFilterKey, "any">;
type SortKey = "soonest" | "newest";

const START_WINDOW_DAYS: Record<WindowKey, number> = { "14d": 14, "30d": 30, "90d": 90 };

const VIBE_OPTIONS = VIBES.map((v) => ({ value: v.key, label: v.label }));
const START_OPTIONS = START_FILTERS.map((f) => ({ value: f.key as StartFilterKey, label: f.label }));
const SORT_OPTIONS: ReadonlyArray<{ value: SortKey; label: string }> = [
  { value: "soonest", label: "Soonest first" },
  { value: "newest", label: "Newest" },
];

/** Start-date window as YYYY-MM-DD strings, computed from today when the filter is picked. */
interface StartWindow {
  key: WindowKey;
  from: string;
  to: string;
}

function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "any" → no window. Uses today's date, so only call it from event handlers. */
function startWindow(key: StartFilterKey): StartWindow | null {
  if (key === "any") return null;
  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() + START_WINDOW_DAYS[key]);
  return { key, from: toIsoDate(today), to: toIsoDate(end) };
}

function isListed(stay: Stay): boolean {
  return stay.status === "published";
}

/** "Bali, Indonesia" → "Indonesia"; "Portugal" → "Portugal". */
function countryOf(stay: Stay): string {
  return stay.region.split(",").at(-1)?.trim() ?? stay.region;
}

export function ExploreFeed() {
  const store = useStore();
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [range, setRange] = useState<StartWindow | null>(null);
  const [sort, setSort] = useState<SortKey>("soonest");
  const [sheetOpen, setSheetOpen] = useState(false);

  const listed = useMemo(() => store.stays.filter(isListed), [store.stays]);
  // The Spotlight only shows Houses that are taking requests.
  const featured = useMemo(() => listed.filter((s) => s.featured && s.acceptingRequests), [listed]);

  const results = listed
    .filter((s) => !vibe || s.vibe === vibe)
    .filter((s) => !range || (s.startDate >= range.from && s.startDate <= range.to))
    .toSorted(
      (a, b) =>
        // Houses that aren't taking requests go after the open ones, each group in the chosen order.
        Number(!a.acceptingRequests) - Number(!b.acceptingRequests) ||
        (sort === "soonest" ? a.startDate.localeCompare(b.startDate) : b.createdAt.localeCompare(a.createdAt)),
    );
  const countryCount = new Set(results.map(countryOf)).size;
  const startKey: StartFilterKey = range?.key ?? "any";
  const hasMoreFilters = startKey !== "any" || sort !== "soonest";

  return (
    <div>
      {/* Carousel below lg, bento block from lg up – each hides itself at the other size. */}
      <SpotlightHero stays={featured} />
      <BentoTop stays={featured} />

      <Container>
        {/* Section title + quiet desktop dropdowns */}
        <div className="mt-12 flex items-end justify-between gap-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-ink md:text-4xl">Open Houses</h2>
            <p className="mt-1 text-zinc-500">
              {pluralize(results.length, "house")} · {pluralize(countryCount, "country", "countries")}
            </p>
          </div>
          <div className="hidden items-center gap-6 md:flex">
            <QuietSelect
              label="Start date"
              value={startKey}
              options={START_OPTIONS}
              onChange={(key) => setRange(startWindow(key))}
            />
            <QuietSelect label="Sort" value={sort} options={SORT_OPTIONS} onChange={setSort} />
          </div>
        </div>

        {/* Vibe chips; on mobile the date/sort filters live behind the button at the end. */}
        <div className="mt-5 flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <FilterChips label="Filter by vibe" options={VIBE_OPTIONS} value={vibe} onChange={setVibe} />
          </div>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label={hasMoreFilters ? "Filters (active)" : "Filters"}
            className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-ink transition-colors hover:bg-zinc-100 md:hidden"
          >
            <SlidersHorizontal className="size-4" />
            {hasMoreFilters && (
              <span className="absolute right-0.5 top-0.5 size-2.5 rounded-full border-2 border-white bg-accent" />
            )}
          </button>
        </div>

        {results.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((stay) => (
              <StayCard key={stay.id} stay={stay} host={findUser(store, stay.hostId)} crew={getCrew(store, stay)} />
            ))}
            <OpenHouseCard />
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
      </Container>

      <FilterSheet
        open={sheetOpen}
        startKey={startKey}
        sort={sort}
        onClose={() => setSheetOpen(false)}
        onApply={(nextStart, nextSort) => {
          setRange(startWindow(nextStart));
          setSort(nextSort);
          setSheetOpen(false);
        }}
      />
    </div>
  );
}

interface QuietSelectProps<T extends string> {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
}

/** Native <select> dressed as a text button with a chevron – no border, underline on hover.
 * field-sizing: content keeps it as wide as the chosen option (Chromium; elsewhere it falls back to the widest). */
function QuietSelect<T extends string>({ label, value, options, onChange }: QuietSelectProps<T>) {
  return (
    <label className="group relative flex items-center gap-1 text-sm font-medium text-ink">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="cursor-pointer appearance-none bg-transparent pr-5 underline-offset-4 outline-none [field-sizing:content] group-hover:underline focus-visible:underline"
      >
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

interface FilterSheetProps {
  open: boolean;
  startKey: StartFilterKey;
  sort: SortKey;
  onClose: () => void;
  onApply: (start: StartFilterKey, sort: SortKey) => void;
}

/** Mobile bottom sheet for the start-date and sort filters. Changes apply only on "Apply". */
function FilterSheet({ open, startKey, sort, onClose, onApply }: FilterSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title="Filters">
      {/* Remounted on every open, so the draft always starts from the applied filters. */}
      {open && <FilterSheetBody startKey={startKey} sort={sort} onApply={onApply} />}
    </Sheet>
  );
}

function FilterSheetBody({ startKey, sort, onApply }: Omit<FilterSheetProps, "open" | "onClose">) {
  const [draftStart, setDraftStart] = useState(startKey);
  const [draftSort, setDraftSort] = useState(sort);

  return (
    <div>
      <RadioGroup legend="Start date" name="start" options={START_OPTIONS} value={draftStart} onChange={setDraftStart} />
      <RadioGroup legend="Sort" name="sort" options={SORT_OPTIONS} value={draftSort} onChange={setDraftSort} />
      <button
        type="button"
        onClick={() => onApply(draftStart, draftSort)}
        className={buttonClass("dark", "lg", "mt-6 w-full")}
      >
        Apply
      </button>
    </div>
  );
}

interface RadioGroupProps<T extends string> {
  legend: string;
  name: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}

function RadioGroup<T extends string>({ legend, name, options, value, onChange }: RadioGroupProps<T>) {
  return (
    <fieldset className="mt-4 first:mt-0">
      <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">{legend}</legend>
      <div className="divide-y divide-neutral-100">
        {options.map((option) => (
          <label key={option.value} className="flex cursor-pointer items-center justify-between py-3 text-[15px]">
            {option.label}
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="size-5 accent-ink"
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

"use client";

import { ChevronDown, SearchX, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
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
import { useFormat } from "@/i18n/format";
import { START_FILTERS, VIBES } from "@/lib/mock";
import { findUser, getCrew, getCurrentUser, settingsOf, useStore } from "@/lib/store";
import type { Stay, Vibe } from "@/lib/types";

type StartFilterKey = (typeof START_FILTERS)[number]["key"];
type WindowKey = Exclude<StartFilterKey, "any">;
type SortKey = "soonest" | "newest";

const START_WINDOW_DAYS: Record<WindowKey, number> = { "14d": 14, "30d": 30, "90d": 90 };

const SORT_KEYS: readonly SortKey[] = ["soonest", "newest"];

type Options<T extends string> = ReadonlyArray<{ value: T; label: string }>;

/** Start-date and sort options with their translated labels – shared by the dropdowns and the mobile sheet. */
function useFilterOptions(): { startOptions: Options<StartFilterKey>; sortOptions: Options<SortKey> } {
  const t = useTranslations("explore");
  return useMemo(
    () => ({
      startOptions: START_FILTERS.map((f) => ({ value: f.key, label: t(`startFilters.${f.key}`) })),
      sortOptions: SORT_KEYS.map((key) => ({ value: key, label: t(`sortOptions.${key}`) })),
    }),
    [t],
  );
}

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
  const t = useTranslations("explore");
  const tc = useTranslations("common");
  const te = useTranslations("states.exploreEmpty");
  const format = useFormat();
  const { startOptions, sortOptions } = useFilterOptions();
  const store = useStore();
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [region, setRegion] = useState<string | null>(null);
  const [language, setLanguage] = useState<string | null>(null);
  const [range, setRange] = useState<StartWindow | null>(null);
  const [sort, setSort] = useState<SortKey>("soonest");
  const [sheetOpen, setSheetOpen] = useState(false);

  // Houses of people you blocked never show up.
  const blocked = settingsOf(getCurrentUser(store)).blockedUserIds;
  const listed = useMemo(() => store.stays.filter((s) => isListed(s) && !blocked.includes(s.hostId)), [store.stays, blocked]);
  // The Spotlight only shows Houses that are taking requests.
  const featured = useMemo(() => listed.filter((s) => s.featured && s.acceptingRequests), [listed]);
  // Region chips only pay off with some spread – with fewer than 3 countries they're hidden.
  const regionOptions = useMemo(
    () => [...new Set(listed.map(countryOf))].toSorted().map((country) => ({ value: country, label: country })),
    [listed],
  );
  const showRegions = regionOptions.length >= 3;
  // Language chips only when the listed Houses actually run in more than one language.
  const languageOptions = useMemo(
    () =>
      [...new Set(listed.map((s) => s.language).filter(Boolean))]
        .map((code) => ({ value: code, label: format.language(code) }))
        .toSorted((a, b) => a.label.localeCompare(b.label)),
    [listed, format],
  );
  const showLanguages = languageOptions.length >= 2;
  const vibeOptions = useMemo(() => VIBES.map((v) => ({ value: v.key, label: format.vibe(v.key) })), [format]);

  const results = listed
    .filter((s) => !vibe || s.vibe === vibe)
    .filter((s) => !showRegions || !region || countryOf(s) === region)
    .filter((s) => !showLanguages || !language || s.language === language)
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
            <h2 className="text-3xl font-bold tracking-tight text-ink md:text-4xl">{t("title")}</h2>
            <p className="mt-1 text-zinc-500">
              {t("summary", {
                houses: tc("houses", { count: results.length }),
                countries: tc("countries", { count: countryCount }),
              })}
            </p>
          </div>
          <div className="hidden items-center gap-6 md:flex">
            <QuietSelect
              label={t("startDate")}
              value={startKey}
              options={startOptions}
              onChange={(key) => setRange(startWindow(key))}
            />
            <QuietSelect label={t("sort")} value={sort} options={sortOptions} onChange={setSort} />
          </div>
        </div>

        {/* Vibe chips; on mobile the date/sort filters live behind the button at the end. */}
        <div className="mt-5 flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <FilterChips
              label={t("filterByVibe")}
              options={vibeOptions}
              value={vibe}
              onChange={setVibe}
              allLabel={t("all")}
            />
          </div>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label={hasMoreFilters ? t("filtersActive") : t("filters")}
            className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-ink transition-colors hover:bg-zinc-100 md:hidden"
          >
            <SlidersHorizontal className="size-4" />
            {hasMoreFilters && (
              <span className="absolute right-0.5 top-0.5 size-2.5 rounded-full border-2 border-white bg-accent" />
            )}
          </button>
        </div>
        {showRegions && (
          <div className="mt-2">
            <FilterChips
              label={t("filterByRegion")}
              options={regionOptions}
              value={region}
              onChange={setRegion}
              allLabel={t("anywhere")}
              small
            />
          </div>
        )}
        {showLanguages && (
          <div className="mt-2">
            <FilterChips
              label={t("filterByLanguage")}
              options={languageOptions}
              value={language}
              onChange={setLanguage}
              allLabel={t("all")}
              small
            />
          </div>
        )}

        {/* Grid also without results: the empty state takes the first cells, the "Open your own House" card stays last. */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:grid-cols-4">
          {results.length > 0 ? (
            results.map((stay) => (
              <StayCard key={stay.id} stay={stay} host={findUser(store, stay.hostId)} crew={getCrew(store, stay)} />
            ))
          ) : (
            <div className="flex lg:col-span-2 xl:col-span-3 *:flex-1 *:justify-center">
              <EmptyState
                icon={SearchX}
                title={te("title")}
                action={
                  <button
                    type="button"
                    className={buttonClass("secondary", "sm")}
                    onClick={() => {
                      setVibe(null);
                      setRegion(null);
                      setLanguage(null);
                      setRange(null);
                    }}
                  >
                    {te("clear")}
                  </button>
                }
              />
            </div>
          )}
          <OpenHouseCard />
        </div>
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
  const t = useTranslations("explore");
  return (
    <Sheet open={open} onClose={onClose} title={t("filters")}>
      {/* Remounted on every open, so the draft always starts from the applied filters. */}
      {open && <FilterSheetBody startKey={startKey} sort={sort} onApply={onApply} />}
    </Sheet>
  );
}

function FilterSheetBody({ startKey, sort, onApply }: Omit<FilterSheetProps, "open" | "onClose">) {
  const [draftStart, setDraftStart] = useState(startKey);
  const [draftSort, setDraftSort] = useState(sort);
  const t = useTranslations("explore");
  const { startOptions, sortOptions } = useFilterOptions();

  return (
    <div>
      <RadioGroup legend={t("startDate")} name="start" options={startOptions} value={draftStart} onChange={setDraftStart} />
      <RadioGroup legend={t("sort")} name="sort" options={sortOptions} value={draftSort} onChange={setDraftSort} />
      <button
        type="button"
        onClick={() => onApply(draftStart, draftSort)}
        className={buttonClass("dark", "lg", "mt-6 w-full")}
      >
        {t("apply")}
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

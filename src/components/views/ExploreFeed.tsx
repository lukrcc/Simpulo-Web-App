"use client";

import { ChevronDown, Search, SearchX, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { BentoTop } from "@/components/BentoTop";
import { FilterDropdown, SEARCH_THRESHOLD, type FilterDropdownOption } from "@/components/explore/FilterDropdown";
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
import { cn } from "@/lib/utils";

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
  // The country dropdown only pays off with more than one country.
  const regionOptions = useMemo(
    () => [...new Set(listed.map(countryOf))].toSorted().map((country) => ({ value: country, label: country })),
    [listed],
  );
  const showRegions = regionOptions.length >= 2;
  // Language dropdown only when the listed Houses actually run in more than one language.
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
  const activeRegion = showRegions ? region : null;
  const activeLanguage = showLanguages ? language : null;
  const hasMoreFilters = startKey !== "any" || sort !== "soonest" || activeRegion !== null || activeLanguage !== null;

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
            {/* Logged out on mobile there's no tab bar – this is the way to "How it works" (plus the footer). */}
            {!store.currentUserId && (
              <Link href="/how-it-works" className="mt-1 inline-flex min-h-11 items-center text-sm font-medium text-ink underline underline-offset-2 md:hidden">
                {t("howItWorksLink")}
              </Link>
            )}
          </div>
          <div className="hidden items-center gap-6 md:flex">
            {showRegions && (
              <FilterDropdown
                label={t("country")}
                allLabel={t("anywhere")}
                options={regionOptions}
                value={region}
                onChange={setRegion}
                searchPlaceholder={t("searchCountries")}
                noMatchesLabel={t("noMatches")}
              />
            )}
            {showLanguages && (
              <FilterDropdown
                label={t("language")}
                allLabel={t("anyLanguage")}
                options={languageOptions}
                value={language}
                onChange={setLanguage}
                searchPlaceholder={t("searchLanguages")}
                noMatchesLabel={t("noMatches")}
              />
            )}
            <QuietSelect
              label={t("startDate")}
              value={startKey}
              options={startOptions}
              onChange={(key) => setRange(startWindow(key))}
            />
            <QuietSelect label={t("sort")} value={sort} options={sortOptions} onChange={setSort} />
          </div>
        </div>

        {/* Vibe chips; on mobile the country/language/date/sort filters live behind the button at the end. */}
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
        region={activeRegion}
        language={activeLanguage}
        regionOptions={showRegions ? regionOptions : []}
        languageOptions={showLanguages ? languageOptions : []}
        onClose={() => setSheetOpen(false)}
        onApply={(next) => {
          setRange(startWindow(next.start));
          setSort(next.sort);
          setRegion(next.region);
          setLanguage(next.language);
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

interface AppliedFilters {
  start: StartFilterKey;
  sort: SortKey;
  region: string | null;
  language: string | null;
}

interface FilterSheetProps {
  open: boolean;
  startKey: StartFilterKey;
  sort: SortKey;
  region: string | null;
  language: string | null;
  /** Empty = that filter is hidden */
  regionOptions: readonly FilterDropdownOption[];
  languageOptions: readonly FilterDropdownOption[];
  onClose: () => void;
  onApply: (filters: AppliedFilters) => void;
}

/** Mobile bottom sheet for the country, language, start-date and sort filters. Changes apply only on "Apply". */
function FilterSheet({ open, onClose, ...rest }: FilterSheetProps) {
  const t = useTranslations("explore");
  return (
    <Sheet open={open} onClose={onClose} title={t("filters")}>
      {/* Remounted on every open, so the draft always starts from the applied filters. */}
      {open && <FilterSheetBody {...rest} />}
    </Sheet>
  );
}

/** "" stands for "no filter" in the radio groups. */
const ALL = "";

function FilterSheetBody({
  startKey,
  sort,
  region,
  language,
  regionOptions,
  languageOptions,
  onApply,
}: Omit<FilterSheetProps, "open" | "onClose">) {
  const [draftStart, setDraftStart] = useState(startKey);
  const [draftSort, setDraftSort] = useState(sort);
  const [draftRegion, setDraftRegion] = useState(region ?? ALL);
  const [draftLanguage, setDraftLanguage] = useState(language ?? ALL);
  const t = useTranslations("explore");
  const { startOptions, sortOptions } = useFilterOptions();

  return (
    <div>
      {regionOptions.length > 0 && (
        <RadioGroup
          legend={t("country")}
          name="region"
          options={[{ value: ALL, label: t("anywhere") }, ...regionOptions]}
          value={draftRegion}
          onChange={setDraftRegion}
          searchPlaceholder={regionOptions.length > SEARCH_THRESHOLD ? t("searchCountries") : undefined}
        />
      )}
      {languageOptions.length > 0 && (
        <RadioGroup
          legend={t("language")}
          name="language"
          options={[{ value: ALL, label: t("anyLanguage") }, ...languageOptions]}
          value={draftLanguage}
          onChange={setDraftLanguage}
          searchPlaceholder={languageOptions.length > SEARCH_THRESHOLD ? t("searchLanguages") : undefined}
        />
      )}
      <RadioGroup legend={t("startDate")} name="start" options={startOptions} value={draftStart} onChange={setDraftStart} />
      <RadioGroup legend={t("sort")} name="sort" options={sortOptions} value={draftSort} onChange={setDraftSort} />
      <button
        type="button"
        onClick={() =>
          onApply({ start: draftStart, sort: draftSort, region: draftRegion || null, language: draftLanguage || null })
        }
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
  /** Long lists get a search field that narrows the options (the picked one always stays visible). */
  searchPlaceholder?: string;
}

function RadioGroup<T extends string>({ legend, name, options, value, onChange, searchPlaceholder }: RadioGroupProps<T>) {
  const t = useTranslations("explore");
  const [query, setQuery] = useState("");
  const needle = query.trim().toLocaleLowerCase();
  const visible = needle
    ? options.filter((o) => o.value === value || o.label.toLocaleLowerCase().includes(needle))
    : options;
  return (
    <fieldset className="mt-4 first:mt-0">
      <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">{legend}</legend>
      {searchPlaceholder && (
        <label className="mt-1 flex items-center gap-2 rounded-xl bg-page px-3 py-2.5">
          <Search className="size-4 shrink-0 text-zinc-400" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-zinc-400"
          />
        </label>
      )}
      <div className={cn("divide-y divide-neutral-100", searchPlaceholder && "scroll-pane max-h-64")}>
        {needle && visible.length <= 1 && !visible.some((o) => o.label.toLocaleLowerCase().includes(needle)) && (
          <p className="py-3 text-[15px] text-zinc-500">{t("noMatches")}</p>
        )}
        {visible.map((option) => (
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

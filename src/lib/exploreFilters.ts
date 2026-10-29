// Explore filters: OR within one filter, AND across filters – (Thailand OR Indonesia) AND English AND Feb 2027 AND
// (Fitness OR Surf). The whole state lives in the URL (?country=TH,ID&lang=en&month=2027-02&vibe=fitness,surf
// &budget=200-900&sort=newest), so a filtered Explore can be shared and survives a reload.
import { FLEXIBLE, worldRegionOf, type WorldRegion } from "./interests";
import { convertApprox } from "./mock-extras";
import type { Stay, Vibe } from "./types";

export type SortKey = "soonest" | "newest";
export const SORT_KEYS: readonly SortKey[] = ["soonest", "newest"];

export interface ExploreFilters {
  vibes: Vibe[];
  /** ISO 3166-1 alpha-2 ("TH") */
  countries: string[];
  /** ISO 639-1 ("en") */
  languages: string[];
  /** YYYY-MM – Houses that run in any of them */
  months: string[];
  /** Per person in EUR (≈ for Houses priced in other currencies) */
  budget: { min: number; max: number } | null;
  sort: SortKey;
}

export const EMPTY_FILTERS: ExploreFilters = { vibes: [], countries: [], languages: [], months: [], budget: null, sort: "soonest" };

/** Country names as stored on Houses ("Bali, Indonesia" → "Indonesia") ↔ the codes in the URL. */
const COUNTRY_CODES: Record<string, string> = {
  Argentina: "AR", Austria: "AT", Belgium: "BE", Brazil: "BR", Colombia: "CO", Croatia: "HR", Czechia: "CZ", Egypt: "EG",
  France: "FR", Georgia: "GE", Germany: "DE", Greece: "GR", Indonesia: "ID", Italy: "IT", Japan: "JP", Jordan: "JO",
  Kenya: "KE", Mexico: "MX", Morocco: "MA", Netherlands: "NL", Norway: "NO", Philippines: "PH", Portugal: "PT",
  "South Africa": "ZA", "South Korea": "KR", Spain: "ES", Switzerland: "CH", Taiwan: "TW", Thailand: "TH", Türkiye: "TR",
  "United Arab Emirates": "AE", "United Kingdom": "GB", Vietnam: "VN", Denmark: "DK", "United States": "US", Australia: "AU",
};
const CODE_COUNTRIES = Object.fromEntries(Object.entries(COUNTRY_CODES).map(([name, code]) => [code, name]));

/** "Bali, Indonesia" → "Indonesia" */
export const countryOf = (stay: Pick<Stay, "region">) => stay.region.split(",").at(-1)?.trim() ?? stay.region;
/** A House's country as a URL code (unknown countries: their name in lower case, still unique). */
export const countryCodeOf = (country: string) => COUNTRY_CODES[country] ?? country.toLowerCase();
export const countryNameOf = (code: string) => CODE_COUNTRIES[code] ?? code;
export const countryRegionOf = (code: string): WorldRegion | "" => worldRegionOf(countryNameOf(code));

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const list = (value: string | null) => (value ? value.split(",").map((v) => v.trim()).filter(Boolean) : []);

export function parseFilters(params: URLSearchParams, knownVibes: readonly string[]): ExploreFilters {
  const [min, max] = (params.get("budget") ?? "").split("-").map(Number);
  return {
    vibes: list(params.get("vibe")).filter((v): v is Vibe => knownVibes.includes(v)),
    countries: list(params.get("country")).map((c) => (c.length === 2 ? c.toUpperCase() : c)),
    languages: list(params.get("lang")).map((l) => l.toLowerCase()),
    // "Flexible" means any month – the same as no month filter.
    months: list(params.get("month")).filter((m) => MONTH.test(m) && m !== FLEXIBLE),
    budget: Number.isFinite(min) && Number.isFinite(max) && max >= min && max > 0 ? { min, max } : null,
    sort: params.get("sort") === "newest" ? "newest" : "soonest",
  };
}

/** The filters as a query string – on top of the URL's other parameters, which stay as they are. */
export function withFilters(params: URLSearchParams, filters: ExploreFilters): string {
  const next = new URLSearchParams(params);
  const set = (key: string, values: readonly string[]) => (values.length > 0 ? next.set(key, values.join(",")) : next.delete(key));
  set("country", filters.countries);
  set("lang", filters.languages);
  set("month", filters.months);
  set("vibe", filters.vibes);
  set("budget", filters.budget ? [`${filters.budget.min}-${filters.budget.max}`] : []);
  set("sort", filters.sort === "soonest" ? [] : [filters.sort]);
  const query = next.toString();
  return query ? `?${query.replace(/%2C/g, ",")}` : "";
}

/** Selected values across all filters (sort isn't a filter). */
export function activeCount(filters: ExploreFilters): number {
  return filters.vibes.length + filters.countries.length + filters.languages.length + filters.months.length + (filters.budget ? 1 : 0);
}

/** A House runs in a month when its stay overlaps it. Houses without dates match no month. */
export function runsIn(stay: Pick<Stay, "startDate" | "endDate">, month: string): boolean {
  if (!stay.startDate) return false;
  const end = stay.endDate || stay.startDate;
  return stay.startDate.slice(0, 7) <= month && end.slice(0, 7) >= month;
}

/** A House's price per person in EUR as a range (a fixed price is a range of one); null without a price. */
export function eurRange(stay: Pick<Stay, "pricePerPerson" | "budgetPerPerson" | "currency">): { min: number; max: number } | null {
  const toEur = (amount: number) => Math.round(convertApprox(amount, stay.currency, "EUR"));
  if (stay.pricePerPerson) return { min: toEur(stay.pricePerPerson), max: toEur(stay.pricePerPerson) };
  if (stay.budgetPerPerson) return { min: toEur(stay.budgetPerPerson.min), max: toEur(stay.budgetPerPerson.max) };
  return null;
}

type FilterKey = Exclude<keyof ExploreFilters, "sort">;

/** OR within a filter, AND across them. `except` leaves one filter out – for the counts next to its own options. */
export function matchesFilters(stay: Stay, filters: ExploreFilters, except?: FilterKey): boolean {
  if (except !== "vibes" && filters.vibes.length > 0 && !filters.vibes.includes(stay.vibe)) return false;
  if (except !== "countries" && filters.countries.length > 0 && !filters.countries.includes(countryCodeOf(countryOf(stay)))) return false;
  if (except !== "languages" && filters.languages.length > 0 && !filters.languages.includes(stay.language)) return false;
  if (except !== "months" && filters.months.length > 0 && !filters.months.some((m) => runsIn(stay, m))) return false;
  if (except !== "budget" && filters.budget) {
    const range = eurRange(stay);
    if (!range || range.max < filters.budget.min || range.min > filters.budget.max) return false;
  }
  return true;
}

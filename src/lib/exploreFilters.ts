// Explore filters: OR within one filter, AND across filters – Lisbon AND Feb 2027 AND English AND (Fitness OR Surf). The whole state
// lives in the URL (?place=lisbon&month=2027-02&lang=en&vibe=fitness,surf&budget=200-900&sort=newest), so a filtered Explore can be
// shared and survives a reload.
import { placeById } from "./data/places";
import { runsIn, stayInPlace } from "./savedSearches";
import { convertApprox } from "./rates";
import type { Stay, Vibe } from "./types";
import { openSpots } from "./utils";

/** soonest: start date · price: lowest per person first (≈ EUR; no price yet: last) · newest: just opened */
export type SortKey = "soonest" | "price" | "newest";
export const SORT_KEYS: readonly SortKey[] = ["soonest", "price", "newest"];

/** A House's length: weekend ≤ 5 nights · weeks 6–17 nights ("1–2 weeks") · long 18+ nights ("3+ weeks"). */
export type LengthKey = "weekend" | "weeks" | "long";
export const LENGTH_KEYS: readonly LengthKey[] = ["weekend", "weeks", "long"];
/** Open spots at least this many. */
export type SpotsMin = 1 | 3;
export const SPOTS_MINS: readonly SpotsMin[] = [1, 3];

/** The crew's size: 3–4 · 5–6 · 7 and up. */
export type CrewSizeKey = "3-4" | "5-6" | "7-10";
export const CREW_SIZE_KEYS: readonly CrewSizeKey[] = ["3-4", "5-6", "7-10"];
export type WhoKey = "mixed" | "women";
export const WHO_KEYS: readonly WhoKey[] = ["mixed", "women"];
export type AgeKey = "18-25" | "25-35" | "35+";
export const AGE_KEYS: readonly AgeKey[] = ["18-25", "25-35", "35+"];
/** booked: the place is locked · together: still decided with the crew */
export type AccommodationKey = "booked" | "together";
export const ACCOMMODATION_KEYS: readonly AccommodationKey[] = ["booked", "together"];

/** included: a host experience comes with it · none: the stay alone */
export type HostExperienceKey = "included" | "none";
export const HOST_EXPERIENCE_KEYS: readonly HostExperienceKey[] = ["included", "none"];

export interface ExploreFilters {
  vibes: Vibe[];
  /** Where? A place's id (data/places): Houses within 50km of a city, inside a region or country */
  place: string | null;
  /** When? One month, YYYY-MM: Houses that run in it */
  month: string | null;
  /** ISO 639-1 ("en") */
  languages: string[];
  /** Per person in EUR (≈ for Houses priced in other currencies) */
  budget: { min: number; max: number } | null;
  /** How long the House runs (null: any length) */
  length: LengthKey | null;
  /** At least this many open spots (null: any) */
  spots: SpotsMin | null;
  crewSize: CrewSizeKey | null;
  who: WhoKey | null;
  age: AgeKey | null;
  accommodation: AccommodationKey | null;
  hostExperience: HostExperienceKey | null;
  /** Only Houses whose host is verified */
  verifiedOnly: boolean;
  sort: SortKey;
}

export const EMPTY_FILTERS: ExploreFilters = { vibes: [], place: null, month: null, languages: [], budget: null, length: null, spots: null, crewSize: null, who: null, age: null, accommodation: null, hostExperience: null, verifiedOnly: false, sort: "soonest" };

/** "Bali, Indonesia" → "Indonesia" */
export const countryOf = (stay: Pick<Stay, "region">) => stay.region.split(",").at(-1)?.trim() ?? stay.region;

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const list = (value: string | null) => (value ? value.split(",").map((v) => v.trim()).filter(Boolean) : []);

export function parseFilters(params: URLSearchParams, knownVibes: readonly string[]): ExploreFilters {
  const [min, max] = (params.get("budget") ?? "").split("-").map(Number);
  return {
    vibes: list(params.get("vibe") ?? params.get("category")).filter((v): v is Vibe => knownVibes.includes(v)),
    place: placeById(params.get("place"))?.id ?? null,
    // An older link can hold several: the first counts.
    month: list(params.get("month")).find((m) => MONTH.test(m)) ?? null,
    languages: list(params.get("lang")).map((l) => l.toLowerCase()),
    budget: Number.isFinite(min) && Number.isFinite(max) && max >= min && max > 0 ? { min, max } : null,
    length: LENGTH_KEYS.find((key) => key === params.get("len")) ?? null,
    spots: SPOTS_MINS.find((n) => String(n) === params.get("spots")) ?? null,
    crewSize: CREW_SIZE_KEYS.find((key) => key === params.get("crew")) ?? null,
    who: WHO_KEYS.find((key) => key === params.get("who")) ?? null,
    age: AGE_KEYS.find((key) => key === params.get("age")) ?? null,
    accommodation: ACCOMMODATION_KEYS.find((key) => key === params.get("stay")) ?? null,
    hostExperience: HOST_EXPERIENCE_KEYS.find((key) => key === params.get("xp")) ?? null,
    verifiedOnly: params.get("verified") === "1",
    sort: SORT_KEYS.find((key) => key === params.get("sort")) ?? "soonest",
  };
}

/** The filters as a query string – on top of the URL's other parameters, which stay as they are. */
export function withFilters(params: URLSearchParams, filters: ExploreFilters): string {
  const next = new URLSearchParams(params);
  const set = (key: string, values: readonly string[]) => (values.length > 0 ? next.set(key, values.join(",")) : next.delete(key));
  set("place", filters.place ? [filters.place] : []);
  set("month", filters.month ? [filters.month] : []);
  set("lang", filters.languages);
  set("vibe", filters.vibes);
  set("budget", filters.budget ? [`${filters.budget.min}-${filters.budget.max}`] : []);
  set("len", filters.length ? [filters.length] : []);
  set("spots", filters.spots ? [String(filters.spots)] : []);
  set("crew", filters.crewSize ? [filters.crewSize] : []);
  set("who", filters.who ? [filters.who] : []);
  set("age", filters.age ? [filters.age] : []);
  set("stay", filters.accommodation ? [filters.accommodation] : []);
  set("xp", filters.hostExperience ? [filters.hostExperience] : []);
  set("verified", filters.verifiedOnly ? ["1"] : []);
  set("sort", filters.sort === "soonest" ? [] : [filters.sort]);
  const query = next.toString();
  return query ? `?${query.replace(/%2C/g, ",")}` : "";
}

/** Selected values across all filters (sort isn't a filter). */
export function activeCount(filters: ExploreFilters): number {
  return (
    filters.vibes.length +
    (filters.place ? 1 : 0) +
    (filters.month ? 1 : 0) +
    filters.languages.length +
    (filters.budget ? 1 : 0) +
    (filters.length ? 1 : 0) +
    (filters.spots ? 1 : 0) +
    (filters.crewSize ? 1 : 0) +
    (filters.who ? 1 : 0) +
    (filters.age ? 1 : 0) +
    (filters.accommodation ? 1 : 0) +
    (filters.hostExperience ? 1 : 0) +
    (filters.verifiedOnly ? 1 : 0)
  );
}

/** The filter panel's filters that are on – one each, however many values (not the category chips, not sort). */
export function panelFilterCount(filters: ExploreFilters): number {
  return [filters.place !== null, filters.month !== null, filters.length !== null, filters.budget !== null, filters.spots !== null, filters.languages.length > 0, filters.crewSize !== null, filters.who !== null, filters.age !== null, filters.accommodation !== null, filters.hostExperience !== null, filters.verifiedOnly].filter(Boolean).length;
}

const DAY_MS = 86_400_000;
/** Nights between a House's dates (null without both). */
export function nightsOf(stay: Pick<Stay, "startDate" | "endDate">): number | null {
  if (!stay.startDate || !stay.endDate) return null;
  return Math.round((Date.parse(stay.endDate) - Date.parse(stay.startDate)) / DAY_MS);
}

export function hasLength(stay: Pick<Stay, "startDate" | "endDate">, length: LengthKey): boolean {
  const nights = nightsOf(stay);
  if (nights === null) return false;
  if (length === "weekend") return nights <= 5;
  if (length === "weeks") return nights >= 6 && nights <= 17;
  return nights >= 18;
}

export { runsIn };

/** A House's price per person in EUR as a range (a fixed price is a range of one); null without a price. */
export function eurRange(stay: Pick<Stay, "pricePerPerson" | "budgetPerPerson" | "currency">): { min: number; max: number } | null {
  const toEur = (amount: number) => Math.round(convertApprox(amount, stay.currency, "EUR"));
  if (stay.pricePerPerson) return { min: toEur(stay.pricePerPerson), max: toEur(stay.pricePerPerson) };
  if (stay.budgetPerPerson) return { min: toEur(stay.budgetPerPerson.min), max: toEur(stay.budgetPerPerson.max) };
  return null;
}

function hasCrewSize(stay: Pick<Stay, "spotsTotal">, size: CrewSizeKey): boolean {
  if (size === "3-4") return stay.spotsTotal <= 4;
  if (size === "5-6") return stay.spotsTotal === 5 || stay.spotsTotal === 6;
  return stay.spotsTotal >= 7;
}

/** A House that names no ages is open to all of them. */
function hasAge(stay: Pick<Stay, "ageRange">, age: AgeKey): boolean {
  if (!stay.ageRange) return true;
  const { min, max } = stay.ageRange;
  if (age === "18-25") return min <= 25 && max >= 18;
  if (age === "25-35") return min <= 35 && max >= 25;
  return max >= 35;
}

type FilterKey = Exclude<keyof ExploreFilters, "sort">;

/** OR within a filter, AND across them. `except` leaves one filter out – for the counts next to its own options. `verifiedHosts`: who's verified, from the people. */
export function matchesFilters(stay: Stay, filters: ExploreFilters, except?: FilterKey, verifiedHosts?: ReadonlySet<string>): boolean {
  if (except !== "vibes" && filters.vibes.length > 0 && !filters.vibes.includes(stay.vibe)) return false;
  if (except !== "place" && filters.place) {
    const place = placeById(filters.place);
    if (place && !stayInPlace(stay, place)) return false;
  }
  if (except !== "month" && filters.month && !runsIn(stay, filters.month)) return false;
  if (except !== "languages" && filters.languages.length > 0 && ![stay.language, ...(stay.languages ?? [])].some((code) => filters.languages.includes(code))) return false;
  if (except !== "budget" && filters.budget) {
    const range = eurRange(stay);
    if (!range || range.max < filters.budget.min || range.min > filters.budget.max) return false;
  }
  if (except !== "length" && filters.length && !hasLength(stay, filters.length)) return false;
  if (except !== "spots" && filters.spots && openSpots(stay) < filters.spots) return false;
  if (except !== "crewSize" && filters.crewSize && !hasCrewSize(stay, filters.crewSize)) return false;
  // A House that doesn't say otherwise is mixed.
  if (except !== "who" && filters.who && (stay.who ?? "mixed") !== filters.who) return false;
  if (except !== "age" && filters.age && !hasAge(stay, filters.age)) return false;
  if (except !== "accommodation" && filters.accommodation && (stay.accommodationStatus === "locked") !== (filters.accommodation === "booked")) return false;
  if (except !== "hostExperience" && filters.hostExperience && Boolean(stay.hostFeePerPerson) !== (filters.hostExperience === "included")) return false;
  if (except !== "verifiedOnly" && filters.verifiedOnly && verifiedHosts && !verifiedHosts.has(stay.hostId)) return false;
  return true;
}

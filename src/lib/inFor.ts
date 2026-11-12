// "I'm in for …": a person tells hosts where and when they'd go (a place, a span of months, how long, maybe a few categories). No
// friend requests, no followers – a signal a host can answer with an invite. At most IN_FOR_POLICY.maxActive at once per person; each runs
// out by itself after its last month. Mock now (the store's `inFor`), the backend later behind the same functions.
import { IN_FOR_POLICY } from "@/config/policies";
import { placeById } from "./data/places";
import { stayInPlace } from "./savedSearches";
import type { Stay, Vibe } from "./types";

export type InForLength = "short" | "month" | "long";
export const IN_FOR_LENGTHS: readonly InForLength[] = ["short", "month", "long"];

export interface InFor {
  id: string;
  userId: string;
  /** A city or region of the place search (lib/data/places.ts) */
  placeId: string;
  /** YYYY-MM, both included */
  monthFrom: string;
  monthTo: string;
  length: InForLength;
  /** Empty: any */
  categories: Vibe[];
  createdAt: string;
}

export type InForDraft = Pick<InFor, "placeId" | "monthFrom" | "monthTo" | "length" | "categories">;

type Where = Pick<Stay, "city" | "region" | "location" | "lat" | "lng">;

/** Still running: its last month hasn't passed. */
export const isActiveInFor = (signal: Pick<InFor, "monthTo">, today: string) => signal.monthTo >= today.slice(0, 7);

/** A person's running signals, the soonest first. */
export function activeInForOf(list: readonly InFor[], userId: string, today: string): InFor[] {
  return list.filter((s) => s.userId === userId && isActiveInFor(s, today)).toSorted((a, b) => a.monthFrom.localeCompare(b.monthFrom));
}

/** Room for another one (IN_FOR_POLICY.maxActive). */
export const canAddInFor = (list: readonly InFor[], userId: string, today: string) => activeInForOf(list, userId, today).length < IN_FOR_POLICY.maxActive;

const NIGHT_MS = 86_400_000;
const nightsOf = (stay: Pick<Stay, "startDate" | "endDate">) => Math.round((Date.parse(stay.endDate) - Date.parse(stay.startDate)) / NIGHT_MS);

/** How long fits: short up to 5 nights (the Length filter's short trip), about a month 6–40, long from 4 weeks on. */
export function lengthFits(length: InForLength, stay: Pick<Stay, "startDate" | "endDate">): boolean {
  const nights = nightsOf(stay);
  if (length === "short") return nights <= 5;
  if (length === "month") return nights >= 6 && nights <= 40;
  return nights >= 28;
}

/** The place's short name ("Lisbon"); unknown ids: "". */
export const inForPlaceName = (signal: Pick<InFor, "placeId">) => placeById(signal.placeId)?.name.split(",")[0] ?? "";

export interface InForQuery extends Where {
  /** Unknown yet (Open a House before the dates): any */
  startDate: string;
  endDate: string;
  vibe: Vibe | "";
}

/** Would this House answer the signal? What the House doesn't say yet (dates, category) rules nobody out. */
export function inForMatches(signal: InFor, house: InForQuery): boolean {
  const place = placeById(signal.placeId);
  if (!place || !stayInPlace(house, place)) return false;
  if (house.startDate && house.endDate) {
    if (house.startDate.slice(0, 7) > signal.monthTo || house.endDate.slice(0, 7) < signal.monthFrom) return false;
    if (!lengthFits(signal.length, house)) return false;
  }
  return !house.vibe || signal.categories.length === 0 || signal.categories.includes(house.vibe);
}

/** Everyone in for this House (running signals, one entry per person), without `exclude`. */
export function peopleInFor(list: readonly InFor[], house: InForQuery, today: string, exclude: ReadonlySet<string> = new Set()): string[] {
  const ids = list.filter((s) => isActiveInFor(s, today) && !exclude.has(s.userId) && inForMatches(s, house)).map((s) => s.userId);
  return [...new Set(ids)];
}

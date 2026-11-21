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

/**
 * "I'm in for" is seen only between Your people (CLAUDE.md "Netzwerk-Seite"): the person themselves, or someone they both chose
 * (`isMine` / `together` come from lib/yourPeople.ts livedTogether). Everyone else: nothing.
 */
export function visibleInForOf(list: readonly InFor[], userId: string, today: string, viewer: { isMe: boolean; together: boolean }): InFor[] {
  return viewer.isMe || viewer.together ? activeInForOf(list, userId, today) : [];
}

export interface AlsoInFor {
  userId: string;
  placeId: string;
  /** The first month both are in for (YYYY-MM, not before this month) */
  month: string;
  /** A theme both named – or the one one of you named, when the other left it open; null: none named */
  category: Vibe | null;
}

/**
 * "Ana is also in for Surf in Ericeira in March": for each of your people, the first of their running signals that meets one of yours – same
 * place, overlapping months, a theme in common (an empty one fits any). One line per person.
 */
export function alsoInFor(list: readonly InFor[], me: string, peopleIds: readonly string[], today: string): AlsoInFor[] {
  const now = today.slice(0, 7);
  const mine = activeInForOf(list, me, today);
  const found: AlsoInFor[] = [];
  for (const id of peopleIds) {
    outer: for (const b of activeInForOf(list, id, today)) {
      for (const a of mine) {
        if (a.placeId !== b.placeId) continue;
        const month = [a.monthFrom, b.monthFrom, now].toSorted().at(-1)!;
        if (month > a.monthTo || month > b.monthTo) continue;
        const both = a.categories.filter((c) => b.categories.includes(c));
        if (a.categories.length && b.categories.length && both.length === 0) continue;
        found.push({ userId: id, placeId: a.placeId, month, category: both[0] ?? a.categories[0] ?? b.categories[0] ?? null });
        break outer;
      }
    }
  }
  return found;
}

export interface SharedInFor {
  /** The two people, in the order they were passed in */
  userIds: [string, string];
  placeId: string;
  /** The first month both are in for (YYYY-MM, not before this month) */
  month: string;
}

/**
 * Two of these people in for the same place in overlapping months ("Mara and Jonas are in for Lisbon in March – open a House?"): the
 * first such pair in the order of `userIds`, or null. Running signals only.
 */
export function sharedInFor(list: readonly InFor[], userIds: readonly string[], today: string): SharedInFor | null {
  const now = today.slice(0, 7);
  const signals = userIds.map((id) => activeInForOf(list, id, today));
  for (let i = 0; i < userIds.length; i++) {
    for (let j = i + 1; j < userIds.length; j++) {
      for (const a of signals[i]) {
        for (const b of signals[j]) {
          if (a.placeId !== b.placeId) continue;
          const month = [a.monthFrom, b.monthFrom, now].toSorted().at(-1)!;
          if (month <= a.monthTo && month <= b.monthTo) return { userIds: [userIds[i], userIds[j]], placeId: a.placeId, month };
        }
      }
    }
  }
  return null;
}

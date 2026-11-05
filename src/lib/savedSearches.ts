// The one way demand exists: a search on Explore that found too little, saved. A House answering it tells that person first
// (the store's announceToSearches). Mock now, the backend later behind the same functions.
import { areaRadiusKm, cityPoint, placeKindOf, regionOfCountry } from "./data/places";
import { foldPlace } from "./data/destinationTypes";
import type { Stay, Vibe } from "./types";

export interface SearchPlace {
  id: string;
  name: string;
  /** "" for a world region */
  country: string;
  lat: number;
  lng: number;
}

export interface SavedSearch {
  id: string;
  place: SearchPlace | null;
  /** YYYY-MM */
  month: string | null;
  category: Vibe | null;
  /** One of the two: an account, or an email without one */
  userId?: string;
  email?: string;
  consent: boolean;
  createdAt: string;
  /** Told about a House: done, it isn't announced again */
  notifiedAt: string | null;
}

export type SearchDraft = Pick<SavedSearch, "place" | "month" | "category">;

/** "Stadt": everything this close counts as being there. */
const CITY_RADIUS_KM = 50;
/** "Nearby" on an empty result. */
const NEARBY_KM = 800;
/** Saved in this browser without an account. */
export const LOCAL_SEARCH_PREFIX = "local-";

type Where = Pick<Stay, "city" | "region" | "location" | "lat" | "lng">;

const firstPart = (text: string) => foldPlace(text.split(",")[0].trim());

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Its coordinates; a House opened in the app has none, then those of its city if we know it. */
function pointOf(stay: Where): { lat: number; lng: number } | null {
  if (stay.lat || stay.lng) return { lat: stay.lat, lng: stay.lng };
  return [stay.location.city, stay.city, stay.region.split(",")[0]].map((name) => cityPoint(name ?? "")).find(Boolean) ?? null;
}

/** A city: within 50km. A region: its area. A country or world region: inside it. */
export function stayInPlace(stay: Where, place: SearchPlace): boolean {
  const kind = placeKindOf(place.id);
  const country = stay.location.country;
  if (kind === "world") return regionOfCountry(country) === place.id.slice("world:".length);
  if (kind === "country") return foldPlace(country) === foldPlace(place.country);
  const own = firstPart(place.name);
  if ([stay.city, stay.location.city, stay.region].some((name) => name && firstPart(name) === own)) return true;
  const at = pointOf(stay);
  return at !== null && distanceKm(at, place) <= (areaRadiusKm(place.id) ?? CITY_RADIUS_KM);
}

/** A House runs in a month when its stay overlaps it. Houses without dates match no month. */
export function runsIn(stay: Pick<Stay, "startDate" | "endDate">, month: string): boolean {
  if (!stay.startDate) return false;
  const end = stay.endDate || stay.startDate;
  return stay.startDate.slice(0, 7) <= month && end.slice(0, 7) >= month;
}

/** Whether a House answers a search. What a search leaves open, it takes as anything. */
export function searchMatches(search: SearchDraft, stay: Where & Pick<Stay, "startDate" | "endDate" | "vibe">): boolean {
  return (search.place === null || stayInPlace(stay, search.place)) && (search.month === null || runsIn(stay, search.month)) && (search.category === null || search.category === stay.vibe);
}

/** The searches a House would tell about itself: those that match and haven't been told yet. */
export const openSearchesFor = (searches: readonly SavedSearch[], stay: Parameters<typeof searchMatches>[1]) => searches.filter((s) => s.notifiedAt === null && searchMatches(s, stay));

const personOf = (search: SavedSearch) => search.userId ?? search.email ?? search.id;
/** One person with two searches is one person. */
export const peopleIn = (searches: readonly SavedSearch[]) => new Set(searches.map(personOf)).size;

export const sameSearch = (a: SearchDraft, b: SearchDraft) => (a.place?.id ?? null) === (b.place?.id ?? null) && a.month === b.month && a.category === b.category;

/** Already saved by this person (or, without an account, in this browser) and still waiting. */
export function isSaved(searches: readonly SavedSearch[], draft: SearchDraft, userId: string | null): boolean {
  return searches.some((s) => s.notifiedAt === null && sameSearch(s, draft) && (userId ? s.userId === userId : s.id.startsWith(LOCAL_SEARCH_PREFIX)));
}

export interface PlaceDemand {
  place: SearchPlace;
  people: number;
  /** Most searched first */
  months: { month: string; people: number }[];
}

/** Open searches per place, most people first. A place's people are told when a House opens, so only those count. */
export function demandByPlace(searches: readonly SavedSearch[]): PlaceDemand[] {
  const byPlace = new Map<string, SavedSearch[]>();
  for (const search of searches) {
    if (!search.place || search.notifiedAt !== null) continue;
    byPlace.set(search.place.id, [...(byPlace.get(search.place.id) ?? []), search]);
  }
  return [...byPlace.values()]
    .map((own): PlaceDemand => {
      const months = new Map<string, SavedSearch[]>();
      for (const search of own) if (search.month) months.set(search.month, [...(months.get(search.month) ?? []), search]);
      return {
        place: own[0].place!,
        people: peopleIn(own),
        months: [...months].map(([month, list]) => ({ month, people: peopleIn(list) })).toSorted((a, b) => b.people - a.people || a.month.localeCompare(b.month)),
      };
    })
    .toSorted((a, b) => b.people - a.people || a.place.name.localeCompare(b.place.name));
}

/**
 * An empty result's alternatives, closest to what was asked first: the place in another month, then other places nearby (the month fitting
 * first). Without a place: the same month's neighbours. The same category goes first.
 */
export function housesNearby<S extends Where & Pick<Stay, "startDate" | "endDate" | "vibe" | "id" | "acceptingRequests">>(stays: readonly S[], draft: SearchDraft, limit = 4): S[] {
  const { place, month, category } = draft;
  const monthGap = (stay: S) => {
    if (!month || !stay.startDate) return 0;
    const number = (m: string) => Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7));
    return Math.abs(number(stay.startDate.slice(0, 7)) - number(month));
  };
  const ranked = stays.flatMap((stay) => {
    if (!stay.acceptingRequests || !stay.startDate) return [];
    if (!place) return [{ stay, tier: 0, distance: 0 }];
    if (stayInPlace(stay, place)) return [{ stay, tier: 0, distance: 0 }];
    const at = pointOf(stay);
    const distance = at ? distanceKm(at, place) : Number.POSITIVE_INFINITY;
    return distance <= NEARBY_KM ? [{ stay, tier: 1, distance }] : [];
  });
  return ranked
    .toSorted((a, b) => a.tier - b.tier || Number(b.stay.vibe === category) - Number(a.stay.vibe === category) || monthGap(a.stay) - monthGap(b.stay) || a.distance - b.distance || a.stay.startDate.localeCompare(b.stay.startDate))
    .slice(0, limit)
    .map((r) => r.stay);
}

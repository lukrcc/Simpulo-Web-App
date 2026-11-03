"use client";

import { useMemo, useSyncExternalStore } from "react";
import { APP_MODE } from "./appMode";
import { DESTINATION_MIN_INTEREST, DESTINATIONS_ALL_FROM_HOUSES } from "@/config/explore";
import { getDestinations } from "./data";
import { findImageOnce } from "./data/destinationImages";
import type { Destination, DestinationCandidate, DestinationInterest, DestinationStatus } from "./data/destinationTypes";
import { aggregateDemand, FLEXIBLE, mergeMonths, type DemandSpot, type Interest } from "./interests";
import { isListedStay } from "./launch";
import { useStore } from "./store";

/*
 * Destinations in use: the curated ones, and places someone picked in "Somewhere else?" (status "pending", on a card only once
 * approved and with enough people). For now this lives in the browser; the Interest answers without an account too.
 */

interface DestinationState {
  created: Destination[];
  overrides: Record<string, { status?: DestinationStatus; coverImage?: string; imageSource?: Destination["imageSource"] }>;
  anonymous: DestinationInterest[];
  /** Places that have had their one image search */
  imageAsked: string[];
}

const KEY = "simpulo:destinations";
const EMPTY: DestinationState = { created: [], overrides: {}, anonymous: [], imageAsked: [] };
const listeners = new Set<() => void>();
let cache: DestinationState | null = null;

function read(): DestinationState {
  if (cache) return cache;
  try {
    cache = { ...EMPTY, ...(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<DestinationState>) };
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function write(next: DestinationState) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // not saved – still there for this visit
  }
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const useDestinationState = () => useSyncExternalStore(subscribe, read, () => EMPTY);

/** The Destination for what was picked in a search: the one that exists, or a new one, pending, with the fallback image. */
export function ensureDestination(candidate: DestinationCandidate): Destination {
  const state = read();
  const known = getDestinations().find((d) => d.id === candidate.id) ?? state.created.find((d) => d.id === candidate.id);
  if (known) return known;
  const created: Destination = { ...candidate, imageSource: "fallback", status: "pending", interestedCount: 0, interestedMonths: [] };
  write({ ...state, created: [...state.created, created] });
  void askForImage(created);
  return created;
}

async function askForImage(destination: Destination) {
  const asked = read().imageAsked.includes(destination.id);
  const found = await findImageOnce(destination, asked);
  const state = read();
  write({
    ...state,
    imageAsked: asked ? state.imageAsked : [...state.imageAsked, destination.id],
    created: found ? state.created.map((d) => (d.id === destination.id ? { ...d, ...found } : d)) : state.created,
  });
}

export function addAnonymousInterest(interest: DestinationInterest) {
  const state = read();
  const email = interest.email?.trim().toLowerCase();
  const same = (i: DestinationInterest) => i.destinationId === interest.destinationId && i.email === email;
  // One interest per person, place and month, here too: only the new months are added.
  const months = mergeMonths(state.anonymous.find(same)?.months ?? [], interest.months);
  write({ ...state, anonymous: [...state.anonymous.filter((i) => !same(i)), { ...interest, email, months }] });
}

export function setDestinationStatus(id: string, status: DestinationStatus) {
  const state = read();
  write({ ...state, overrides: { ...state.overrides, [id]: { ...state.overrides[id], status } } });
}

export function setDestinationImage(id: string, coverImage: string) {
  const state = read();
  write({ ...state, overrides: { ...state.overrides, [id]: { ...state.overrides[id], coverImage, imageSource: "curated" } } });
}

/** Every Destination with its counts. */
export function useDestinations(): { destinations: Destination[]; interests: Interest[] } {
  const { interests: stored } = useStore();
  const state = useDestinationState();
  return useMemo(() => {
    const base = [...getDestinations(), ...state.created].map((d) => ({ ...d, ...state.overrides[d.id] }));
    const byId = new Map(base.map((d) => [d.id, d]));
    const anonymous = state.anonymous.flatMap((item, i): Interest[] => {
      const place = byId.get(item.destinationId);
      if (!place) return [];
      return [
        {
          ...item,
          id: `anonymous-${i}`,
          userId: `anonymous-${i}`,
          placeName: place.name,
          country: place.country,
          region: place.region,
          months: item.months.length > 0 ? item.months : [FLEXIBLE],
          language: "en",
          notify: item.consent,
          visible: false,
        },
      ];
    });
    const interests = [...stored, ...anonymous];
    const destinations = base.map((d) => {
      const own = interests.filter((i) => i.destinationId === d.id);
      return { ...d, interestedCount: own.length, interestedMonths: [...new Set(own.flatMap((i) => i.months).filter((m) => m !== FLEXIBLE))].toSorted() };
    });
    return { destinations, interests };
  }, [stored, state]);
}

export type DestinationSpot = DemandSpot & { destination: Destination };

/**
 * What Explore may show, most wanted first: approved, with at least DESTINATION_MIN_INTEREST people. Curated places also
 * without them once there are enough Houses around to carry an empty card.
 */
/**
 * One person's Next stop as cards: every place of theirs, however few others want it. `own`: also what isn't approved yet,
 * and what they keep to themselves; anyone else only sees approved places they chose to show.
 */
export function useNextStopSpots(userId: string, own: boolean): DestinationSpot[] {
  const { destinations, interests } = useDestinations();
  const { interests: storeInterests } = useStore();
  return useMemo(() => {
    const spots = new Map(aggregateDemand(interests).map((spot) => [spot.destinationId, spot]));
    const theirs = storeInterests.filter((i) => i.userId === userId && (own || i.visible)).toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
    return theirs.flatMap((interest): DestinationSpot[] => {
      const destination = destinations.find((d) => d.id === interest.destinationId);
      const spot = spots.get(interest.destinationId);
      return destination && spot && (own || destination.status === "approved") ? [{ destination, ...spot }] : [];
    });
  }, [destinations, interests, storeInterests, userId, own]);
}

/** A picture fit for a public card (the dev stand-ins exist only with APP_MODE "dev"). */
const isCardImage = (d: Pick<Destination, "coverImage" | "imageSource">) => d.coverImage !== undefined && (d.imageSource === "curated" || d.imageSource === "pexels" || d.imageSource === "fallback-dev");
/** On a public card only with a real picture: no stage colours for a place in Where next, the grid or the pre-launch row. */
export const hasCardImage = (spot: DestinationSpot) => isCardImage(spot.destination);
/** A tile on /where-next: with a picture, and in dev also the fallback's colours, so a place without a fitting photo can be judged. */
export const hasTile = (spot: DestinationSpot) => hasCardImage(spot) || APP_MODE === "dev";
/** Curated places have a card without enough people too, once there are enough Houses around to carry an empty one. */
const isOnCard = (d: Destination, people: number, showAll: boolean) => d.status === "approved" && (people >= DESTINATION_MIN_INTEREST || (showAll && d.imageSource !== "pexels" && getDestinations().some((c) => c.id === d.id)));

/** Whether a place has a visible card once this many people want to go: then "Somewhere else?" leads to it, else it only says so. */
export function useHasCard(): (destination: Destination, people: number) => boolean {
  const { stays } = useStore();
  const showAll = stays.filter(isListedStay).length >= DESTINATIONS_ALL_FROM_HOUSES;
  return (destination, people) => isOnCard(destination, people, showAll) && isCardImage(destination);
}

export function useDemandSpots(): DestinationSpot[] {
  const { destinations, interests } = useDestinations();
  const { stays } = useStore();
  const showAll = stays.filter(isListedStay).length >= DESTINATIONS_ALL_FROM_HOUSES;
  return useMemo(() => {
    const spots = new Map(aggregateDemand(interests).map((spot) => [spot.destinationId, spot]));
    return destinations
      .filter((d) => isOnCard(d, d.interestedCount, showAll))
      .map((destination): DestinationSpot => ({
        destination,
        ...(spots.get(destination.id) ?? { destinationId: destination.id, placeName: destination.name, country: destination.country, region: destination.region, count: 0, months: [], anytime: 0 }),
      }))
      .toSorted((a, b) => b.count - a.count || Number(b.destination.coverImage !== undefined) - Number(a.destination.coverImage !== undefined) || a.placeName.localeCompare(b.placeName));
  }, [destinations, interests, showAll]);
}

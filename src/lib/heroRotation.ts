// The Explore hero (bento on desktop, carousel on phones): which Houses it shows, and in which order.
// Candidates: open Houses (listed, taking requests) with a free spot that haven't started. Weighted random order
// without repeats for the browser session – until every candidate was shown, then a new round.
import { useSyncExternalStore } from "react";
import type { Stay, User } from "./types";
import { openSpots, stayPrice } from "./utils";
import { isListedStay } from "./launch";

const DAY = 24 * 60 * 60 * 1000;
/** Weights multiply: a complete card ×2, starting within 30 days ×1.5, opened within the last 7 days ×1.5. */
const COMPLETE_CARD = 2;
const STARTS_SOON = 1.5;
const STARTS_SOON_DAYS = 30;
const JUST_OPENED = 1.5;
const JUST_OPENED_DAYS = 7;

const SESSION_KEY = "simpulo:hero";

/** Open, a free spot, not started. `today` "" (server: no clock) skips the start-date check. */
export function isHeroCandidate(stay: Stay, today: string): boolean {
  return isListedStay(stay) && stay.acceptingRequests && openSpots(stay) > 0 && (today === "" || stay.startDate > today);
}

/** Everything the card shows is there: the host's photo, title, quote and a price or budget. */
function isCompleteCard(stay: Stay, host: User | undefined): boolean {
  return Boolean(host?.photos[0] && stay.title.trim() && stay.hostNote?.trim() && stayPrice(stay).kind !== "tbd");
}

/** The weight of a candidate; `now` null (server) leaves out the time-based factors. */
export function heroWeight(stay: Stay, host: User | undefined, now: number | null): number {
  let weight = isCompleteCard(stay, host) ? COMPLETE_CARD : 1;
  if (now !== null) {
    const start = Date.parse(`${stay.startDate}T00:00:00Z`);
    if (start - now <= STARTS_SOON_DAYS * DAY) weight *= STARTS_SOON;
    if (now - Date.parse(stay.createdAt) <= JUST_OPENED_DAYS * DAY) weight *= JUST_OPENED;
  }
  return weight;
}

/**
 * Weighted random order without replacement (Efraimidis–Spirakis): each item draws u^(1/w) and the highest keys go
 * first – the same as repeatedly picking one at random by weight from what's left.
 */
export function weightedOrder<T>(items: readonly T[], weight: (item: T) => number, random: () => number = Math.random): T[] {
  return items
    .map((item) => ({ item, key: Math.pow(random(), 1 / Math.max(weight(item), 1e-6)) }))
    .toSorted((a, b) => b.key - a.key)
    .map((entry) => entry.item);
}

interface SessionState {
  /** This round's order (House ids) */
  order: string[];
  /** Already shown this round */
  seen: string[];
}

function readSession(): SessionState {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "null") as Partial<SessionState> | null;
    return { order: Array.isArray(saved?.order) ? saved.order : [], seen: Array.isArray(saved?.seen) ? saved.seen : [] };
  } catch {
    return { order: [], seen: [] };
  }
}

function writeSession(state: SessionState) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {
    // no session storage – the order just isn't kept across reloads
  }
}

/** The hero just put these Houses on screen – they won't lead again this round. */
export function markHeroSeen(ids: readonly string[]) {
  const state = readSession();
  const seen = [...new Set([...state.seen, ...ids.filter((id) => state.order.includes(id))])];
  if (seen.length !== state.seen.length) writeSession({ ...state, seen });
}

/** This page view's order: the round's unseen candidates first (in the round's order), then the seen ones. */
function sessionOrder(candidates: readonly Stay[], weightOf: (stay: Stay) => number): Stay[] {
  const ids = new Set(candidates.map((s) => s.id));
  let { order, seen } = readSession();
  order = order.filter((id) => ids.has(id));
  seen = seen.filter((id) => order.includes(id));
  // New candidates since the round started join it in a weighted order of their own.
  const fresh = weightedOrder(candidates.filter((s) => !order.includes(s.id)), weightOf).map((s) => s.id);
  order = [...order, ...fresh];
  // Everyone shown: a new round.
  if (order.every((id) => seen.includes(id))) {
    order = weightedOrder(candidates, weightOf).map((s) => s.id);
    seen = [];
  }
  writeSession({ order, seen });
  const byId = new Map(candidates.map((s) => [s.id, s]));
  return [...order.filter((id) => !seen.includes(id)), ...order.filter((id) => seen.includes(id))].map((id) => byId.get(id)!);
}

const noSubscribe = () => () => {};
/** One order per page view and candidate set – computed once, so the hero doesn't reshuffle on every render. */
let cached: { key: string; stays: Stay[] } | null = null;

/**
 * The hero's Houses in order. Server (and hydration): no clock, no randomness – the candidates by weight. Browser: the
 * session's weighted random order, so it changes right after hydration.
 */
export function useHeroStays(listed: readonly Stay[], hostOf: (stay: Stay) => User | undefined): Stay[] {
  const serverOrder = () => {
    const candidates = listed.filter((s) => isHeroCandidate(s, ""));
    return candidates.toSorted((a, b) => heroWeight(b, hostOf(b), null) - heroWeight(a, hostOf(a), null) || a.id.localeCompare(b.id));
  };
  const clientOrder = () => {
    const now = Date.now();
    const today = new Date(now).toISOString().slice(0, 10);
    const candidates = listed.filter((s) => isHeroCandidate(s, today));
    const key = candidates.map((s) => s.id).join(",");
    if (cached?.key !== key) cached = { key, stays: sessionOrder(candidates, (s) => heroWeight(s, hostOf(s), now)) };
    return cached.stays;
  };
  const server = serverSnapshot(serverOrder, listed);
  return useSyncExternalStore(noSubscribe, clientOrder, () => server);
}

/** The server snapshot must be the same object between calls – memoised on the input list. */
const serverOrders = new WeakMap<readonly Stay[], Stay[]>();
function serverSnapshot(compute: () => Stay[], listed: readonly Stay[]): Stay[] {
  let order = serverOrders.get(listed);
  if (!order) {
    order = compute();
    serverOrders.set(listed, order);
  }
  return order;
}

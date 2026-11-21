"use client";

// The arc's clock (CLAUDE.md "Bogen"): when each step of config/arc.ts is due for one person in one House, in the House's local time; at most
// one Simpulo card per House and day; muted per person; every step skippable. Progress (done / skipped) lives in each person's settings
// (UserSettings.arc) – Simpulo only reads signals from it (lib/analytics.ts arc_*), never what anyone wrote.
import { useMemo, useState, useSyncExternalStore } from "react";
import { AGREEMENT_HOURS, AGREEMENT_QUESTIONS, ARC_CARDS_PER_DAY, ARC_PHASES, ARC_STEPS, DAY_MOMENTS, HALFTIME_MIN_ANSWERS, MOMENT_MIN_YES, PEAK_IDEAS, type ArcAudience, type ArcPhase, type ArcStep } from "@/config/arc";
import { APP_MODE } from "./appMode";
import { readArcDay, subscribeDevSettings } from "./devSettings";
import { getCrew, getMyPayment, settingsOf, useStore, type StoreData } from "./store";
import type { ArcArrival, ArcIntention, Message, Stay, User } from "./types";
import { mockArrival, mockIntention } from "./mock-arc";

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const dayMs = (iso: string) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);

/**
 * The House's offset from UTC in hours. TODO(backend): the place's IANA zone (from the place search) – until then estimated from its
 * longitude (15° an hour), which is right within an hour for most places.
 */
export function houseOffsetHours(stay: Pick<Stay, "lng">): number {
  return Math.round((stay.lng ?? 0) / 15);
}

/** A moment in the House's local time → a UTC timestamp: `date` (YYYY-MM-DD) at `hour` local. */
function localAt(stay: Pick<Stay, "lng">, date: number, hour: number): number {
  return date + hour * HOUR_MS - houseOffsetHours(stay) * HOUR_MS;
}

/** The House's local calendar day (YYYY-MM-DD) of a UTC timestamp. */
export function localDay(stay: Pick<Stay, "lng">, at: number): string {
  return new Date(at + houseOffsetHours(stay) * HOUR_MS).toISOString().slice(0, 10);
}

/** Who this person is for the arc in this House: a guest, or its host (Pro with a host fee, else Share). */
export function arcAudienceOf(stay: Stay, userId: string): ArcAudience {
  if (stay.hostId !== userId) return "guest";
  return stay.hostFeePerPerson ? "hostPro" : "hostShare";
}

export interface ArcDue {
  step: ArcStep;
  /** When it is due (UTC ms), after the one-card-a-day rule moved it */
  at: number;
}

/** Each step's moment for this person (before the one-card-a-day rule); a daily step once per day of the stay. */
function rawSchedule(stay: Stay, audience: ArcAudience, paidAt: string | null): ArcDue[] {
  const start = dayMs(stay.startDate);
  const end = dayMs(stay.endDate);
  const days = Math.max(1, Math.round((end - start) / DAY_MS));
  const out: ArcDue[] = [];
  for (const step of ARC_STEPS) {
    if (!step.audience.includes(audience)) continue;
    // A Pro host who set their own high point: the crew gets no proposal.
    if (step.id === "peakVote" && stay.peak?.hostText) continue;
    const w = step.when;
    if (w.at === "paid") {
      if (paidAt) out.push({ step, at: Date.parse(paidAt) });
    } else if (w.at === "day") {
      const base = w.fromEnd ? end + w.day * DAY_MS : start + (w.day > 0 ? w.day - 1 : w.day) * DAY_MS;
      out.push({ step, at: localAt(stay, base, w.hour) });
    } else if (w.at === "daily") {
      for (let d = 0; d < days; d++) out.push({ step, at: localAt(stay, start + d * DAY_MS, w.hour) });
    } else if (w.at === "half") {
      out.push({ step, at: localAt(stay, start + Math.floor(days / 2) * DAY_MS, w.hour) });
    } else if (w.at === "peak") {
      out.push({ step, at: localAt(stay, start + Math.floor(days * 0.7) * DAY_MS, w.hour) });
    } else {
      out.push({ step, at: localAt(stay, end + w.days * DAY_MS, w.hour) });
    }
  }
  return out;
}

/**
 * The schedule after the rule "at most one Simpulo card per House and local day" (only chat cards count): by priority, each step takes its day; a later one on a
 * taken day moves to the next free day (same hour); a daily step only fills free days and is dropped otherwise. Oldest first.
 */
export function arcSchedule(stay: Stay, audience: ArcAudience, paidAt: string | null): ArcDue[] {
  // How far a step may move: to the end of its phase (before: the day before the first; arrival: day 2; together: the day before the last;
  // goodbye: the last day; after: a week).
  const start = localAt(stay, dayMs(stay.startDate), 0);
  const end = localAt(stay, dayMs(stay.endDate), 0);
  const phaseEnd = (item: ArcDue) => ({ before: start, arrival: start + 2 * DAY_MS, together: end - DAY_MS, goodbye: end + DAY_MS, after: item.at + 7 * DAY_MS })[item.step.phase];
  const taken = new Map<string, number>();
  const placed: ArcDue[] = [];
  const raw = rawSchedule(stay, audience, paidAt).toSorted((a, b) => b.step.priority - a.step.priority || a.at - b.at);
  for (const item of raw) {
    let at = item.at;
    // Only chat cards count for "one a day" – a step for the House area (or email) alone keeps its moment; so does the first night, the one
    // card with a slot of its own (config/arc.ts ownSlot).
    if (!item.step.channels.includes("card") || item.step.ownSlot) {
      placed.push(item);
      continue;
    }
    if (item.step.when.at === "daily") {
      if ((taken.get(localDay(stay, at)) ?? 0) >= ARC_CARDS_PER_DAY) continue;
    } else {
      while ((taken.get(localDay(stay, at)) ?? 0) >= ARC_CARDS_PER_DAY) at += DAY_MS;
      // Moved past its phase (a step paid late, before the House, may keep its own moment): left out.
      if (at !== item.at && at >= phaseEnd(item)) continue;
    }
    taken.set(localDay(stay, at), (taken.get(localDay(stay, at)) ?? 0) + 1);
    placed.push({ step: item.step, at });
  }
  return placed.toSorted((a, b) => a.at - b.at);
}

/** Where the House stands in its arc at `now`. */
export function arcPhaseAt(stay: Stay, now: number): ArcPhase {
  const start = localAt(stay, dayMs(stay.startDate), 0);
  const end = localAt(stay, dayMs(stay.endDate), 0);
  if (now < start) return "before";
  if (now < start + 2 * DAY_MS) return "arrival";
  if (now >= end + DAY_MS) return "after";
  if (now >= end - DAY_MS) return "goodbye";
  return "together";
}
export const ARC_PHASE_ORDER = ARC_PHASES;

/** A step's state for one person: done, skipped, or open. */
export type ArcState = "done" | "skipped" | "open";
export function arcStateOf(user: Pick<User, "settings"> | undefined, houseId: string, stepId: string): ArcState {
  return settingsOf(user as User).arc?.[houseId]?.[stepId] ?? "open";
}

/** A small fixed hash 0–1 (the demo's crew progress). */
function hashUnit(text: string): number {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

/**
 * How many of the crew (in the step's audience) did a step: their own records – and, in the mock, a fixed share of the others for steps due
 * more than a day ago (so a card reads "Done · 4 of 5" in the demo). TODO(backend): the crew's records only.
 */
export function crewDoneCount(data: StoreData, stay: Stay, stepId: string, dueAt: number, now: number): { done: number; of: number } {
  const step = ARC_STEPS.find((s) => s.id === stepId);
  const crew = getCrew(data, stay).filter((u) => (step ? step.audience.includes(arcAudienceOf(stay, u.id)) : true));
  const mock = APP_MODE !== "production";
  const done = crew.filter((u) => {
    const own = arcStateOf(u, stay.id, stepId);
    if (own !== "open" || u.id === data.currentUserId) return own === "done";
    return mock && now - dueAt > DAY_MS && hashUnit(`${u.id}:${stay.id}:${stepId}`) < 0.75;
  }).length;
  return { done, of: crew.length };
}

/** The Dev menu's "House day" (dev and demo only, never production): the simulated now – that day of the House at 21:00 local. */
export function useArcNow(stay: Pick<Stay, "startDate" | "lng"> | null): number {
  const simDay = useSyncExternalStore(subscribeDevSettings, readArcDay, () => null);
  // The real now, read once when the page opens (render stays pure).
  const [opened] = useState(() => Date.now());
  return useMemo(() => {
    if (!stay || simDay === null || APP_MODE === "production") return opened;
    return localAt(stay, dayMs(stay.startDate) + (simDay > 0 ? simDay - 1 : simDay) * DAY_MS, 21);
  }, [simDay, stay, opened]);
}

/** The arc for the person looking: the schedule, the cards due by now (unless muted), the phase, the next open step. */
export function useArc(stay: Stay | null) {
  const store = useStore();
  const now = useArcNow(stay);
  const me = store.currentUserId;
  const user = store.users.find((u) => u.id === me);
  const payment = stay ? getMyPayment(store, stay.id) : undefined;
  const paidAt = payment?.status === "paid" ? (payment.paidAt ?? null) : null;
  return useMemo(() => {
    if (!me || !stay) return null;
    const audience = arcAudienceOf(stay, me);
    const schedule = arcSchedule(stay, audience, paidAt);
    const muted = Boolean(settingsOf(user as User).arcMuted);
    const due = schedule.filter((d) => d.at <= now);
    const cards = muted ? [] : due.filter((d) => d.step.channels.includes("card"));
    const next = schedule.find((d) => d.at > now && arcStateOf(user, stay.id, d.step.id) === "open") ?? null;
    return { audience, schedule, due, cards, next, phase: arcPhaseAt(stay, now), now, muted };
  }, [stay, me, user, paidAt, now]);
}

/** The House chat's Simpulo cards as list entries (never stored): one per due card step, at its moment, sender "simpulo". */
export function arcCardMessages(stay: Stay, threadId: string, cards: readonly ArcDue[]): Message[] {
  return cards.map((c) => ({ id: `arc-${stay.id}-${c.step.id}-${c.at}`, threadId, senderId: "simpulo", text: "", createdAt: new Date(c.at).toISOString(), arcStep: c.step.id }));
}

/** A person's intention for a House: their own – or, in the mock, the demo's for others (lib/mock-arc.ts). */
export function intentionOf(data: Pick<StoreData, "currentUserId">, user: Pick<User, "id" | "settings">, stay: Stay): ArcIntention | null {
  const own = settingsOf(user as User).intentions?.[stay.id];
  if (own?.main || own?.teach || own?.askMe) return own;
  return APP_MODE !== "production" && user.id !== data.currentUserId ? mockIntention(user.id, stay) : null;
}

/** A person's arrival at a House: their own – or, in the mock, the demo's for others. */
export function arrivalOf(data: Pick<StoreData, "currentUserId">, user: Pick<User, "id" | "settings">, stay: Stay): ArcArrival | null {
  const own = settingsOf(user as User).arrivals?.[stay.id];
  if (own) return own;
  return APP_MODE !== "production" && user.id !== data.currentUserId ? mockArrival(user.id, stay) : null;
}

/** Minutes between two arrivals (the same day only); null on different days. */
export function arrivalGap(a: ArcArrival, b: ArcArrival): number | null {
  if (a.date !== b.date) return null;
  const min = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  return min(b.time) - min(a.time);
}

/** A moment in the House's local time, short: "Fri 7 Nov · 19:00" (day only: "Fri 7 Nov"). */
export function arcDateLabel(stay: Pick<Stay, "lng">, at: number, withTime = true): string {
  const d = new Date(at + houseOffsetHours(stay) * HOUR_MS);
  const day = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(d);
  if (!withTime) return day;
  return `${day} · ${new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(d)}`;
}

/** Has the House reached "this many days before its first day" (local midnight) at `now`? */
export function daysBeforeReached(stay: Pick<Stay, "startDate" | "lng">, days: number, now: number): boolean {
  return now >= localAt(stay, dayMs(stay.startDate) - days * DAY_MS, 0);
}

/**
 * When a person said "I'm here" (ISO) – their own; in the mock for others: their demo arrival, once that moment has passed (lib/mock-arc.ts).
 */
export function arrivedAt(data: Pick<StoreData, "currentUserId">, user: Pick<User, "id" | "settings">, stay: Stay, now: number): string | null {
  const own = settingsOf(user as User).arrived?.[stay.id];
  if (own) return own;
  if (APP_MODE === "production" || user.id === data.currentUserId) return null;
  const a = mockArrival(user.id, stay);
  if (!a) return null;
  const at = localAt(stay, dayMs(a.date), Number(a.time.slice(0, 2)) + Number(a.time.slice(3, 5)) / 60);
  return at <= now ? new Date(at).toISOString() : null;
}

/** The House agreement at `now`: per question the counts (whoever didn't vote counts for the preset), the result, open until when. */
export function agreementOf(data: StoreData, stay: Stay, now: number) {
  const crew = getCrew(data, stay);
  const due = localAt(stay, dayMs(stay.startDate) + DAY_MS, 11);
  const closesAt = due + AGREEMENT_HOURS * HOUR_MS;
  const mock = APP_MODE !== "production";
  const questions = AGREEMENT_QUESTIONS.map((q) => {
    const votes = stay.agreement?.votes[q.id] ?? {};
    const counts: Record<string, number> = Object.fromEntries(q.options.map((o) => [o, 0]));
    for (const u of crew) {
      let choice: string = votes[u.id] ?? q.preset;
      // The demo: others' votes once the card is out – most leave the preset.
      if (!votes[u.id] && mock && u.id !== data.currentUserId && now >= due) {
        const h = hashUnit(`${u.id}:${stay.id}:${q.id}`);
        if (h > 0.6) choice = q.options[Math.floor(h * 10) % q.options.length];
      }
      counts[choice] = (counts[choice] ?? 0) + 1;
    }
    const top = Math.max(...Object.values(counts));
    const result = counts[q.preset] === top ? q.preset : (q.options.find((o) => counts[o] === top) ?? q.preset);
    return { id: q.id, options: q.options as readonly string[], preset: q.preset as string, counts, result, mine: data.currentUserId ? (votes[data.currentUserId] ?? null) : null };
  });
  return { questions, due, closesAt, open: now >= due && now < closesAt, closed: now >= closesAt, confirmedAt: stay.agreement?.confirmedAt ?? null };
}

// ── The middle: the moment of the day, the high point, halftime ────────────────────────────────────────────────────────────────

/** The theme's suggestions first, then the general ones. */
function themed<T>(table: Readonly<Record<string, readonly T[]>>, stay: Pick<Stay, "vibe">): readonly T[] {
  return [...(table[stay.vibe] ?? []), ...table.general];
}

/** The proposal on a "moment" card posted at `at`: an idea for the next day at its hour (House time), in turn by the House. */
export function dayMomentAt(stay: Stay, at: number) {
  const pool = themed(DAY_MOMENTS, stay);
  const dayIndex = Math.round((dayMs(localDay(stay, at)) - dayMs(stay.startDate)) / DAY_MS);
  const idea = pool[(Math.floor(hashUnit(stay.id) * pool.length) + Math.max(0, dayIndex)) % pool.length];
  const day = localDay(stay, at);
  const forDate = new Date(dayMs(day) + DAY_MS).toISOString().slice(0, 10);
  return { ...idea, day, forDate };
}

/** In or out for a proposal: own votes; in the mock the others' too (most are in). */
function inOut(data: StoreData, stay: Stay, votes: Record<string, boolean> | undefined, key: string, live: boolean) {
  const crew = getCrew(data, stay);
  let yes = 0;
  let no = 0;
  for (const u of crew) {
    const v = votes?.[u.id] ?? (live && APP_MODE !== "production" && u.id !== data.currentUserId ? hashUnit(`${u.id}:${stay.id}:${key}`) < 0.65 : undefined);
    if (v === true) yes++;
    else if (v === false) no++;
  }
  const mine = data.currentUserId ? (votes?.[data.currentUserId] ?? null) : null;
  return { yes, no, mine };
}

/** Who's in for the moment proposed on `day`. */
export function momentVotes(data: StoreData, stay: Stay, day: string) {
  return inOut(data, stay, stay.dayMoments?.[day], `moment:${day}`, true);
}

/** The agreed moments (Plan › Rhythm): every proposal due by now with at least MOMENT_MIN_YES in, oldest first. */
export function agreedMoments(data: StoreData, stay: Stay, due: readonly ArcDue[]) {
  return due
    .filter((d) => d.step.id === "moment")
    .map((d) => {
      const m = dayMomentAt(stay, d.at);
      return { ...m, count: momentVotes(data, stay, m.day).yes };
    })
    .filter((m) => m.count >= MOMENT_MIN_YES);
}

/** The high point's proposal for this House (by theme) – or none when the Pro host set their own. */
export function peakIdea(stay: Stay): string | null {
  if (stay.peak?.hostText) return null;
  const pool = themed(PEAK_IDEAS, stay);
  return pool[Math.floor(hashUnit(`${stay.id}:peak`) * pool.length)];
}

/** Who's in for the high point's proposal (once its card is out). */
export function peakVotes(data: StoreData, stay: Stay, live: boolean) {
  return inOut(data, stay, stay.peak?.votes, "peak", live);
}

/**
 * Halftime, the crew's anonymous average (only for a Pro host): the guests' numbers – their own; in the mock the others' once halftime has
 * come – shown only from HALFTIME_MIN_ANSWERS answers.
 */
export function halftimeAverage(data: StoreData, stay: Stay, live: boolean) {
  const guests = getCrew(data, stay).filter((u) => u.id !== stay.hostId);
  const scores = guests.flatMap((u) => {
    const own = settingsOf(u).halftime?.[stay.id]?.score;
    if (own) return [own];
    if (live && APP_MODE !== "production" && u.id !== data.currentUserId && hashUnit(`${u.id}:${stay.id}:half`) > 0.2) return [2 + Math.floor(hashUnit(`${u.id}:${stay.id}:score`) * 4)];
    return [];
  });
  const average = scores.length ? Math.round((scores.reduce((n, x) => n + x, 0) / scores.length) * 10) / 10 : null;
  return { average, count: scores.length, shown: scores.length >= HALFTIME_MIN_ANSWERS };
}

/** When halftime comes for a House (the middle day, 18:00 local) – for everyone, also the host who gets no halftime card. */
export function halftimeAt(stay: Stay): number {
  const start = dayMs(stay.startDate);
  const days = Math.max(1, Math.round((dayMs(stay.endDate) - start) / DAY_MS));
  return localAt(stay, start + Math.floor(days / 2) * DAY_MS, 18);
}

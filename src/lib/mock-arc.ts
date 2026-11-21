// ⚠ MOCK: what other crew members wrote for the arc's "before" steps – their intention and their arrival – so the Crew page and Getting
// there are filled in the demo. Fixed per person and House (no randomness); about one in four hasn't written yet. Only for people other than
// the one looking, only when they have nothing of their own, never in production (lib/arc.ts intentionOf / arrivalOf).
import type { ArcArrival, ArcIntention, Stay } from "./types";

const MAIN = [
  "That I've finished the first draft and stopped apologising for it.",
  "That I sleep before midnight without my phone in bed.",
  "That I know three people here I'd call when I'm in their city.",
  "That I've surfed a green wave on my own.",
  "That I've said yes to something I'd normally skip.",
  "That I'm back in a training rhythm I can keep at home.",
  "That I've shipped the thing I keep talking about.",
  "That I feel at home somewhere new in under a week.",
];
const TEACH = ["How to make proper ramen broth", "Basic film photography", "A 20-minute mobility routine", "How to pitch in one breath", "Card tricks that actually work", ""];
const ASK = ["Living in Lisbon on a budget", "Why I quit my agency job", "Night trains across Europe", "Bouldering", "Fermenting anything", ""];

function unit(text: string): number {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  // A final mix, so keys that differ only at the end still spread (murmur3 fmix32).
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return ((h >>> 0) % 10_000) / 10_000;
}
const pick = <T,>(list: readonly T[], key: string) => list[Math.floor(unit(key) * list.length)];

/** A crew member's intention in the demo – or none (about a quarter haven't written yet). */
export function mockIntention(userId: string, stay: Pick<Stay, "id">): ArcIntention | null {
  const key = `${userId}:${stay.id}`;
  if (unit(`${key}:written`) < 0.25) return null;
  const teach = pick(TEACH, `${key}:teach`);
  const askMe = pick(ASK, `${key}:ask`);
  return { main: pick(MAIN, `${key}:main`), ...(teach ? { teach } : {}), ...(askMe ? { askMe } : {}) };
}

/** A crew member's arrival in the demo: the first day (or the evening before), a plane or a car – a few none yet. */
export function mockArrival(userId: string, stay: Pick<Stay, "id" | "startDate">): ArcArrival | null {
  const key = `${userId}:${stay.id}`;
  if (unit(`${key}:arrives`) < 0.08) return null;
  // Plane or car only – a train station isn't everywhere (Bali).
  const mode = pick(["plane", "plane", "plane", "car"] as const, `${key}:mode`);
  const date = unit(`${key}:day`) < 0.2 ? new Date(Date.parse(`${stay.startDate}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10) : stay.startDate.slice(0, 10);
  const minutes = 8 * 60 + Math.floor(unit(`${key}:time`) * 13 * 12) * 5;
  const time = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  // No place: the demo doesn't know the nearest airport – an invented one would be wrong (Mayrhofen has none).
  return { date, time, mode, place: "" };
}

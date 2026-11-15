// ⚠ MOCK: two years of House outcomes for Admin › Analyse – fixed (seeded), so the numbers are the same every time. Realistic, with visible
// differences: founder, creator and fitness Houses earn more per person; long stays hit the service-fee cap (max €50) but bring the most
// per stay; short trips bring people back more often; pro and anchor hosts add a host fee and fill faster. About 60 % share, 35 % pro and
// 5 % anchor hosts. The real source derives the same records from its Houses (lib/admin/metrics.ts outcomesFromRecords).
import type { HouseOutcome } from "./data/adapter";
import { stays as mockStays, users as mockUsers } from "./mock";
import { mockAudienceSize, mockRunsAsPro } from "./mock-admin";
import type { HostTier, Vibe } from "./types";

const TODAY = Date.UTC(2026, 10, 12);
const DAY = 86_400_000;
const HOUSES = 900;

/** mulberry32 – a small seeded random */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, weighted: readonly (readonly [T, number])[]): T {
  const total = weighted.reduce((n, [, w]) => n + w, 0);
  let r = rand() * total;
  for (const [value, w] of weighted) {
    r -= w;
    if (r <= 0) return value;
  }
  return weighted[weighted.length - 1][0];
}

const TOPICS: readonly (readonly [Vibe, number])[] = [
  ["fitness", 18],
  ["remote-work", 14],
  ["founder", 12],
  ["surf-water", 12],
  ["creator", 10],
  ["wellness", 10],
  ["social", 8],
  ["party", 6],
  ["culture", 4],
  ["adventure", 4],
  ["students", 2],
];
/** Per-night share per person (EUR) by kind of place, and a topic's price level */
const NIGHTLY: Record<string, number> = { classic: 55, liveWork: 38, program: 62, nature: 48, buyout: 30, regional: 50, water: 90, special: 85 };
const TOPIC_PRICE: Partial<Record<Vibe, number>> = { founder: 1.2, creator: 1.15, fitness: 1.05, wellness: 1.1, party: 0.9, "remote-work": 0.95, students: 0.6 };
/** How likely a guest of this topic is someone who came before */
const TOPIC_RETURN: Partial<Record<Vibe, number>> = { fitness: 0.1, social: 0.08, "surf-water": 0.05, founder: 0.04 };
const LENGTH_BY_TOPIC: Partial<Record<Vibe, readonly (readonly [string, number])[]>> = {
  fitness: [["short", 20], ["mid", 65], ["long", 15]],
  founder: [["short", 10], ["mid", 60], ["long", 30]],
  party: [["short", 75], ["mid", 25], ["long", 0]],
  "surf-water": [["short", 45], ["mid", 45], ["long", 10]],
  "remote-work": [["short", 10], ["mid", 35], ["long", 55]],
  students: [["short", 10], ["mid", 30], ["long", 60]],
};
const CATEGORIES: readonly (readonly [string, number])[] = [
  ["classic", 55],
  ["liveWork", 15],
  ["program", 15],
  ["nature", 8],
  ["buyout", 5],
  ["water", 1],
  ["special", 1],
];
const HUBS: readonly (readonly [string, number])[] = [
  ["Lisbon", 20],
  ["Bali", 18],
  ["Bangkok", 12],
  ["Berlin", 10],
  ["Barcelona", 10],
  ["Mexico City", 8],
  ["Cape Town", 6],
  ["Ericeira", 6],
  ["Chiang Mai", 5],
  ["Tarifa", 5],
];

let cache: HouseOutcome[] | null = null;

export function mockHouseOutcomes(): HouseOutcome[] {
  if (cache) return cache;
  const rand = seeded(2026);
  // The app's own mock hosts (Admin › Hosts shows the same people), busiest first; their tier by the same rule as the app – 100k+ followers
  // anchor, a host fee pro (mock-admin.ts mockRunsAsPro), else share.
  const houses = new Map<string, number>();
  for (const s of mockStays) if (!s.isExample) houses.set(s.hostId, (houses.get(s.hostId) ?? 0) + 1);
  const hosts = [...houses.entries()]
    .toSorted((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([id]) => {
      const user = mockUsers.find((u) => u.id === id);
      const followers = user?.socials?.length ? mockAudienceSize(id) : 0;
      const fee = mockStays.some((s) => s.hostId === id && s.hostFeePerPerson) || mockRunsAsPro(id);
      return { id, tier: (followers >= 100_000 ? "anchor" : fee ? "pro" : "share") as HostTier };
    });
  const past: { id: string; topic: Vibe }[] = [];
  let nextGuest = 1;
  const out: HouseOutcome[] = [];

  for (let n = 0; n < HOUSES; n++) {
    const daysAgo = Math.floor(730 * Math.pow(rand(), 1.6));
    const start = new Date(TODAY - daysAgo * DAY).toISOString().slice(0, 10);
    const host = hosts[Math.floor(Math.pow(rand(), 1.3) * hosts.length)];
    const topic = pick(rand, TOPICS);
    // Topics have their typical length: fitness and founder mostly one to three weeks, party and surf short, remote work long.
    const length = pick(rand, (LENGTH_BY_TOPIC[topic] ?? [["short", 30], ["mid", 45], ["long", 25]]) as readonly (readonly ["short" | "mid" | "long", number])[]);
    const nights = length === "short" ? 2 + Math.floor(rand() * 4) : length === "mid" ? 6 + Math.floor(rand() * 16) : 28 + Math.floor(rand() * 33);
    const crewBand = pick(rand, [["small", 30], ["mid", 58], ["big", 12]] as const);
    const crewSize = crewBand === "small" ? 2 + Math.floor(rand() * 3) : crewBand === "mid" ? 5 + Math.floor(rand() * 4) : 9 + Math.floor(rand() * 6);
    const category = pick(rand, CATEGORIES);

    // How full: pro and anchor hosts fill better, long stays and students less.
    let fill = 0.8 + (rand() - 0.5) * 0.3;
    fill += host.tier === "anchor" ? 0.14 : host.tier === "pro" ? 0.06 : 0;
    fill += topic === "fitness" || topic === "founder" ? 0.05 : topic === "students" ? -0.06 : 0;
    fill += length === "long" ? -0.08 : length === "short" ? 0.03 : 0;
    const capacity = crewSize - 1;
    const guestCount = Math.max(1, Math.min(capacity, Math.round(capacity * Math.min(1, fill))));
    const full = guestCount >= capacity;
    const daysToFull = full ? Math.max(3, Math.round((10 + rand() * 18) * (host.tier === "anchor" ? 0.5 : host.tier === "pro" ? 0.8 : 1) * (length === "short" ? 0.75 : length === "long" ? 1.3 : 1))) : null;

    // Who came: some came before (more often for short trips, fitness, social; anchors bring their people back).
    const returning = 0.16 + (TOPIC_RETURN[topic] ?? 0) + (length === "short" ? 0.08 : length === "long" ? -0.08 : 0) + (host.tier === "anchor" ? 0.1 : 0);
    const guestIds: string[] = [];
    for (let g = 0; g < guestCount; g++) {
      const sameTopic = past.filter((p) => p.topic === topic);
      const pool = sameTopic.length > 5 && rand() < 0.6 ? sameTopic : past;
      const id = pool.length > 20 && rand() < returning ? pool[Math.floor(rand() * pool.length)].id : `g-${nextGuest++}`;
      if (!guestIds.includes(id)) guestIds.push(id);
    }
    for (const id of guestIds) past.push({ id, topic });

    // What Simpulo kept: 10 % service fee per guest (min €10, max €50), and 10 % of the host fee (pro 18 %, anchor 25 % of the share).
    const share = (NIGHTLY[category] ?? 50) * nights * (TOPIC_PRICE[topic] ?? 1) * (0.85 + rand() * 0.3);
    const fee = Math.min(50, Math.max(10, share * 0.1));
    const hostFee = host.tier === "anchor" ? share * 0.25 : host.tier === "pro" ? share * 0.18 : 0;
    out.push({
      id: `o-${n + 1}`,
      hostId: host.id,
      topic,
      nights,
      crewSize,
      category,
      hub: pick(rand, HUBS),
      tier: host.tier,
      startDate: start,
      guestIds,
      serviceFee: Math.round(fee * guestIds.length),
      hostFeeShare: Math.round(hostFee * 0.1 * guestIds.length),
      daysToFull,
      fillRate: (guestIds.length + 1) / crewSize,
    });
  }
  cache = out.toSorted((a, b) => a.startDate.localeCompare(b.startDate));
  return cache;
}

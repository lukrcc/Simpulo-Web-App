// Mock growth data: where the seeded requests came from, a plausible analytics history for /admin/growth, and two
// Houses prepared for creators who haven't claimed them yet (/claim/demo-run-club, /claim/demo-sound-bath).
// Deterministic – the same ids always get the same channel – so server and client agree and reloads look the same.
import type { GrowthEvent, ShareChannel } from "./growth";
import type { Attribution, JoinRequest, Payment, Stay } from "./mock";

/** Seeded traffic mix; undefined = came direct (no tags). */
const SEED_CHANNELS: Array<ShareChannel | undefined> = ["instagram", "whatsapp", "instagram", "tiktok", "copy", "twitch", undefined, undefined];

/** Small stable hash of a string (FNV-1a). */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A seeded visitor's attribution: a channel, mostly with the host's ref (they share their own House the most). */
function seedAttribution(key: string, stay: Stay | undefined): Attribution {
  const h = hash(key);
  const channel = SEED_CHANNELS[h % SEED_CHANNELS.length];
  if (!channel) return {};
  const withRef = stay && stay.hostId && h % 3 !== 0;
  return { utmSource: channel, ...(withRef && { refUserId: stay.hostId }) };
}

/** Gives every mock join request a first-touch attribution (before payments are seeded, so they inherit it). */
export function withMockAttribution(requests: JoinRequest[], stays: Stay[]): JoinRequest[] {
  return requests.map((r) => ({ ...r, ...seedAttribution(r.id, stays.find((s) => s.id === r.stayId)) }));
}

const DAY_MS = 24 * 60 * 60 * 1000;
const LISTED = new Set<Stay["status"]>(["published", "booked", "completed"]);

/**
 * The demo's channel mix (utm_source; undefined = direct): share of the visits, visit → request and request → paid. The funnel stays
 * plausible: 8–12 % of visitors ask, 30–50 % of those pay.
 */
const DEMO_CHANNELS: ReadonlyArray<{ source: ShareChannel | "google" | "youtube" | "twitch" | undefined; share: number; ask: number; pay: number }> = [
  { source: "instagram", share: 0.26, ask: 0.09, pay: 0.36 },
  { source: undefined, share: 0.16, ask: 0.11, pay: 0.45 },
  { source: "whatsapp", share: 0.12, ask: 0.12, pay: 0.5 },
  { source: "tiktok", share: 0.12, ask: 0.08, pay: 0.3 },
  { source: "google", share: 0.09, ask: 0.1, pay: 0.4 },
  { source: "copy", share: 0.08, ask: 0.11, pay: 0.46 },
  { source: "story", share: 0.05, ask: 0.09, pay: 0.38 },
  { source: "youtube", share: 0.04, ask: 0.08, pay: 0.33 },
  { source: "invite", share: 0.04, ask: 0.12, pay: 0.5 },
  { source: "twitch", share: 0.04, ask: 0.09, pay: 0.4 },
];

/** The demo's traffic runs from here and grows ~3.5 % a month (visits a day at the start); the end leaves room for the dev clock. */
const DEMO_FROM = "2025-01-01";
const DEMO_TO = "2027-06-30";
const DEMO_VISITS_START = 40;
const DEMO_GROWTH = 1.035;
/** Visitors who create an account (Anmeldungen). */
const DEMO_SIGNUP_RATE = 0.045;

/**
 * Views, requests and payments as they would have been tracked – marked `seed`, never persisted. A steady daily rhythm per channel (no
 * single mock payment makes a week jump): each day's expected numbers accumulate and an event is emitted per whole one, so a week holds
 * its share. Each event belongs to a listed House, mostly with the host's ref (hosts share their own House the most).
 */
export function mockGrowthEvents({ stays }: { stays: Stay[]; joinRequests: JoinRequest[]; payments: Payment[] }): GrowthEvent[] {
  const listed = stays.filter((s) => LISTED.has(s.status) && !s.isExample).toSorted((a, b) => a.id.localeCompare(b.id));
  if (listed.length === 0) return [];
  // About one House in eight is "viewed a lot, asked little" (Wachstum › Houses): three times the visits, and its visitors rarely ask.
  const cold = (id: string) => hash(`cold-${id}`) % 8 === 0;
  const weighted = listed.flatMap((s) => (cold(s.id) ? [s, s, s] : [s]));
  const events: GrowthEvent[] = [];
  type Stage = "visits" | "requests" | "paid";
  const NAMES: Record<Stage, GrowthEvent["name"]> = { visits: "house_viewed", requests: "request_sent", paid: "payment_completed" };
  // One running total per step (so a week's sum stays smooth) and each channel's credit (which channel the next whole event goes to).
  const total: Record<Stage, number> = { visits: 0, requests: 0, paid: 0 };
  const credit: Record<Stage, number[]> = { visits: DEMO_CHANNELS.map(() => 0), requests: DEMO_CHANNELS.map(() => 0), paid: DEMO_CHANNELS.map(() => 0) };
  // Each request comes from an earlier visit of its channel, each payment from an earlier request (same House and ref) – so per House and per
  // referrer, too, paid ≤ requests ≤ visits.
  const pool: Record<"visits" | "requests", Array<Array<{ houseId: string; refUserId?: string; at: number }>>> = { visits: DEMO_CHANNELS.map(() => []), requests: DEMO_CHANNELS.map(() => []) };
  let n = 0;
  const from = Date.parse(`${DEMO_FROM}T00:00:00Z`);
  const to = Date.parse(`${DEMO_TO}T00:00:00Z`);
  for (let t = from, day = 0; t <= to; t += DAY_MS, day++) {
    const all = DEMO_VISITS_START * DEMO_GROWTH ** (day / 30.4);
    DEMO_CHANNELS.forEach((c, ci) => {
      // A small weekly wave per channel (weekends differ a little), never a jump.
      const visits = all * c.share * (1 + 0.08 * Math.sin((day * 2 * Math.PI) / 7 + ci));
      const add = { visits, requests: visits * c.ask, paid: visits * c.ask * c.pay };
      for (const stage of ["visits", "requests", "paid"] as const) {
        total[stage] += add[stage];
        credit[stage][ci] += add[stage];
      }
    });
    for (const stage of ["visits", "requests", "paid"] as const) {
      for (; total[stage] >= 1; total[stage] -= 1) {
        // The channel with the most credit – for a request or payment among those with a fresh earlier step (the last 24 h), so nothing is
        // dated back into another period.
        const fresh = (i: number) => stage === "visits" || pool[stage === "requests" ? "visits" : "requests"][i].some((e) => e.at >= t - DAY_MS);
        const order = credit[stage].map((v, i) => i).toSorted((a, b) => credit[stage][b] - credit[stage][a]);
        const ci = order.find(fresh) ?? order[0];
        credit[stage][ci] -= 1;
        const c = DEMO_CHANNELS[ci];
        const id = `seed-${stage}-${n++}`;
        const h = hash(id);
        const before = stage === "visits" ? undefined : pool[stage === "requests" ? "visits" : "requests"][ci];
        // The earlier step: one of the latest few (so not every visitor of a House asks); the step follows it within hours – both land in the
        // same period.
        const fresh24 = before ? before.map((e, i) => i).filter((i) => before[i].at >= t - DAY_MS) : [];
        // A request skips the visits of a cold House (3 times in 4); a payment follows its request as it is.
        const warm = stage === "requests" ? fresh24.filter((i) => !cold(before![i].houseId) || h % 4 === 0) : fresh24;
        const recent = warm.length > 0 ? warm : fresh24;
        const prior = before && recent.length > 0 ? before.splice(recent[Math.max(0, recent.length - 1 - (h % Math.min(recent.length, 3)))], 1)[0] : undefined;
        const stay = weighted[h % weighted.length];
        const at = prior ? prior.at + (1 + (h % 4)) * 30 * 60 * 1000 : t + (1 + ((h >>> 4) % 22)) * 60 * 60 * 1000;
        const origin = prior ? { ...prior, at } : { houseId: stay.id, at, ...(c.source !== undefined && h % 3 !== 0 && { refUserId: stay.hostId }) };
        if (stage !== "paid") {
          const mine = pool[stage][ci];
          mine.push(origin);
          if (mine.length > 60) mine.shift();
        }
        events.push({
          id,
          name: NAMES[stage],
          at: new Date(at).toISOString(),
          houseId: origin.houseId,
          ...(c.source && { utmSource: c.source }),
          ...(origin.refUserId && { refUserId: origin.refUserId }),
          // Simpulo's part of a paid share: the guest fee, here 26–47 €.
          ...(stage === "paid" && { revenue: 26 + (h % 22), currency: "EUR" }),
          seed: true,
        });
      }
    }
  }
  // Anmeldungen (auth_completed, Wachstum › Überblick): about 4.5 % of a day's visitors create an account, spread over the channels like the
  // visits; about two in five of them ask about a House afterwards – marked by its houseId (the demo has no user ids; real events link by user).
  let signupTotal = 0;
  let signups = 0;
  for (let t = from, day = 0; t <= to; t += DAY_MS, day++) {
    signupTotal += DEMO_VISITS_START * DEMO_GROWTH ** (day / 30.4) * DEMO_SIGNUP_RATE;
    for (; signupTotal >= 1; signupTotal -= 1) {
      const id = `seed-signup-${signups++}`;
      const h = hash(id);
      let pick = (h % 1000) / 1000;
      const c = DEMO_CHANNELS.find((x) => (pick -= x.share) < 0) ?? DEMO_CHANNELS[0];
      const stay = listed[h % listed.length];
      events.push({
        id,
        name: "auth_completed",
        at: new Date(t + (1 + ((h >>> 3) % 22)) * 60 * 60 * 1000).toISOString(),
        ...(c.source && { utmSource: c.source }),
        ...(h % 5 < 2 && { houseId: stay.id }),
        seed: true,
      });
    }
  }
  return events.toSorted((a, b) => a.at.localeCompare(b.at));
}

/** Prepared from a creator's post, waiting to be claimed. No host until then (hostId ""). */
export const mockClaimableStays: Stay[] = [
  {
    id: "s-claim-1",
    slug: "lisbon-run-club-house",
    title: "Lisbon Run Club House",
    hostId: "",
    vibe: "fitness",
    language: "en",
    city: "Santos",
    region: "Lisbon, Portugal",
    location: { city: "Lisbon", country: "Portugal", area: "Santos" },
    lat: 0,
    lng: 0,
    mapPreviewUrl: "",
    startDate: "2027-03-08",
    endDate: "2027-03-22",
    spotsTotal: 6,
    spotsFilled: 1,
    budgetPerPerson: { min: 550, max: 750 },
    currency: "EUR",
    accommodationStatus: "open",
    description: "Two weeks of morning runs along the Tejo, track sessions twice a week and long Sunday runs to Cascais.",
    whyText: "Two weeks of morning runs along the Tejo, track sessions twice a week and long Sunday runs to Cascais.",
    dayText: "",
    lookingForText: "",
    houseRules: [],
    interests: [],
    status: "draft_unclaimed",
    acceptingRequests: false,
    featured: false,
    createdAt: "2026-10-20T09:00:00.000Z",
    photos: ["/mock/houses/s35/1.webp", "/mock/houses/s35/3.webp"],
    claim: {
      token: "demo-run-club",
      name: "Bea Santos",
      photoUrl: "/mock/houses/s35/1.webp",
      sourceLink: "https://www.instagram.com/p/mock-run-club-lisbon/",
      createdAt: "2026-10-20T09:00:00.000Z",
    },
  },
  {
    id: "s-claim-2",
    slug: "ubud-sound-bath-retreat",
    title: "Ubud Sound Bath Retreat",
    hostId: "",
    vibe: "wellness",
    language: "en",
    city: "Ubud",
    region: "Bali, Indonesia",
    location: { city: "Bali", country: "Indonesia", area: "Ubud" },
    lat: 0,
    lng: 0,
    mapPreviewUrl: "",
    startDate: "2027-04-12",
    endDate: "2027-04-26",
    spotsTotal: 5,
    spotsFilled: 1,
    currency: "EUR",
    accommodationStatus: "open",
    description: "Sound healing every evening, slow mornings in the rice fields and a shared villa in Ubud.",
    whyText: "Sound healing every evening, slow mornings in the rice fields and a shared villa in Ubud.",
    dayText: "",
    lookingForText: "",
    houseRules: [],
    interests: [],
    status: "draft_unclaimed",
    acceptingRequests: false,
    featured: false,
    createdAt: "2026-10-24T15:30:00.000Z",
    photos: ["/mock/houses/s30/1.webp", "/mock/houses/s30/3.webp"],
    claim: {
      token: "demo-sound-bath",
      name: "Kadek Ayu",
      photoUrl: "/mock/houses/s30/3.webp",
      sourceLink: "https://www.tiktok.com/@mock.soundbath/video/1",
      createdAt: "2026-10-24T15:30:00.000Z",
    },
  },
];

// Mock growth data: where the seeded requests came from, a plausible analytics history for /admin/growth, and two
// Houses prepared for creators who haven't claimed them yet (/claim/demo-run-club, /claim/demo-sound-bath).
// Deterministic – the same ids always get the same channel – so server and client agree and reloads look the same.
import { paymentSplit } from "./fees";
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

const HOUR_MS = 60 * 60 * 1000;
const LISTED = new Set<Stay["status"]>(["published", "booked", "completed"]);

/** Views, requests, acceptances and payments as they would have been tracked – marked `seed`, never persisted. */
export function mockGrowthEvents({ stays, joinRequests, payments }: { stays: Stay[]; joinRequests: JoinRequest[]; payments: Payment[] }): GrowthEvent[] {
  const events: GrowthEvent[] = [];
  for (const stay of stays) {
    if (!LISTED.has(stay.status)) continue;
    const opened = new Date(stay.createdAt).getTime();
    const requests = joinRequests.filter((r) => r.stayId === stay.id).length;
    // Roughly 6–12 views per request, at least a handful for quiet Houses.
    const views = 5 + requests * (6 + (hash(stay.id) % 7)) + (hash(`${stay.id}-v`) % 9);
    for (let i = 0; i < views; i++) {
      const key = `${stay.id}-view-${i}`;
      events.push({
        id: `seed-${key}`,
        name: "house_viewed",
        at: new Date(opened + (hash(key) % (240 * 2)) * HOUR_MS).toISOString(),
        houseId: stay.id,
        ...seedAttribution(key, stay),
        seed: true,
      });
    }
  }
  for (const r of joinRequests) {
    const base = { houseId: r.stayId, userId: r.userId, refUserId: r.refUserId, utmSource: r.utmSource, seed: true };
    events.push({ id: `seed-${r.id}-sent`, name: "request_sent", at: r.createdAt, ...base });
    if (r.status === "accepted") {
      events.push({ id: `seed-${r.id}-accepted`, name: "request_accepted", at: new Date(new Date(r.createdAt).getTime() + 20 * HOUR_MS).toISOString(), ...base });
    }
  }
  for (const p of payments) {
    if (p.status !== "paid") continue;
    const stay = stays.find((s) => s.id === p.stayId);
    events.push({
      id: `seed-${p.id}-paid`,
      name: "payment_completed",
      at: p.paidAt ?? stay?.createdAt ?? new Date(0).toISOString(),
      houseId: p.stayId,
      userId: p.userId,
      refUserId: p.refUserId,
      utmSource: p.utmSource,
      amount: p.total,
      revenue: paymentSplit(p.share, p.hostFee).revenue,
      currency: stay?.currency,
      seed: true,
    });
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

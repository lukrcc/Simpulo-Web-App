// ⚠ DEMO DATA: 40 invented creator contacts across three niches for Admin › Launch › Marketing (Kontakte, Trichter) – no real people,
// fixed values (no randomness), so the funnel and the filters are filled in dev and demo. Production starts empty (Firestore marketingContacts).
import type { ContentPost, ContentSprint, MarketingMotivation, PartnerKind, MarketingContact, MarketingContactStatus, MarketingContactWay, MarketingPartner } from "./data/adapter";

const TODAY = Date.UTC(2026, 10, 19);
const DAY = 86_400_000;
const day = (back: number) => new Date(TODAY - back * DAY).toISOString().slice(0, 10);

type Seed = [name: string, channel: string, followers: number, way: MarketingContactWay, daysAgo: number | null, followUps: 0 | 1 | 2, status: MarketingContactStatus, consent: boolean];

/** Per niche: who, where, how big, how written to, when, follow-ups, how far – the niches differ on purpose (the funnel compares them). */
const NICHES: Record<string, Seed[]> = {
  Fitness: [
    ["Lena Moves", "Instagram", 48_000, "dm", 41, 1, "house", true],
    ["Coach Tarik", "YouTube", 120_000, "email", 38, 0, "demo", true],
    ["Mara Lifts", "Instagram", 22_000, "dm", 36, 2, "replied", false],
    ["Run with Jo", "TikTok", 64_000, "dm", 33, 2, "open", false],
    ["Strong Sofie", "Instagram", 15_500, "form", 30, 1, "replied", true],
    ["Kettlebell Kai", "YouTube", 31_000, "email", 28, 0, "demo", false],
    ["Hybrid Hannah", "Instagram", 9_800, "dm", 27, 2, "later", false],
    ["Mobility Max", "TikTok", 210_000, "dm", 25, 1, "open", false],
    ["Pilates Pia", "Instagram", 41_000, "email", 21, 0, "replied", false],
    ["Trail Tom", "YouTube", 18_200, "email", 19, 1, "open", false],
    ["Box Basti", "Instagram", 12_400, "dm", 15, 0, "open", false],
    ["Yoga Yara", "Instagram", 76_000, "dm", 12, 0, "later", true],
    ["Calisthenics Cem", "TikTok", 95_000, "dm", 9, 0, "open", false],
    ["Swim Selin", "Instagram", 7_300, "form", 6, 0, "open", false],
    ["Row Rafael", "YouTube", 26_000, "email", 3, 0, "open", false],
    ["Climb Clara", "Instagram", 33_000, "dm", null, 0, "open", false],
  ],
  Surf: [
    ["Salty Sam", "Instagram", 52_000, "dm", 40, 2, "replied", false],
    ["Wave Wiebke", "YouTube", 88_000, "email", 37, 1, "open", false],
    ["Board Ben", "TikTok", 140_000, "dm", 34, 2, "open", false],
    ["Reef Rosa", "Instagram", 19_000, "dm", 31, 1, "demo", true],
    ["Longboard Luis", "Instagram", 11_200, "form", 26, 2, "later", false],
    ["Swell Svenja", "YouTube", 23_500, "email", 22, 0, "open", false],
    ["Point Break Paul", "Instagram", 6_900, "dm", 18, 1, "open", false],
    ["Kite Kim", "TikTok", 37_000, "dm", 14, 0, "replied", false],
    ["Foil Finn", "Instagram", 14_800, "dm", 10, 0, "open", false],
    ["Barrel Bea", "YouTube", 61_000, "email", 7, 0, "open", false],
    ["Ericeira Eli", "Instagram", 8_400, "dm", 4, 0, "open", false],
    ["Canggu Carla", "Instagram", 29_000, "dm", null, 0, "open", false],
  ],
  "Remote work": [
    ["Nomad Nina", "YouTube", 74_000, "email", 42, 1, "house", true],
    ["Laptop Lars", "Instagram", 21_000, "dm", 39, 0, "demo", true],
    ["Deep Work Dana", "LinkedIn", 16_000, "email", 35, 1, "demo", false],
    ["Async Arne", "YouTube", 39_000, "email", 32, 2, "replied", false],
    ["Coworking Cleo", "Instagram", 12_600, "dm", 29, 1, "replied", true],
    ["Slow Travel Sven", "TikTok", 58_000, "dm", 24, 2, "later", false],
    ["Founder Fee", "LinkedIn", 9_100, "email", 20, 0, "demo", false],
    ["Workation Wim", "Instagram", 27_500, "dm", 16, 1, "open", false],
    ["Remote Rhea", "YouTube", 102_000, "email", 11, 0, "replied", false],
    ["Digital Dilan", "TikTok", 44_000, "dm", 8, 0, "open", false],
    ["Focus Frida", "Instagram", 6_200, "form", 5, 0, "open", false],
    ["Calm Code Kofi", "YouTube", 17_800, "email", null, 0, "open", false],
  ],
};

const MOTIVATION_CYCLE: readonly MarketingMotivation[] = ["peers", "money", "status", "peers", "money"];
/** LinkedIn → connector, big YouTube/TikTok every third → streamer, every fifth → community, else creator. */
function kindOf(channel: string, followers: number, n: number): PartnerKind {
  if (channel === "LinkedIn") return "connector";
  if ((channel === "YouTube" || channel === "TikTok") && followers >= 40_000 && n % 3 === 0) return "streamer";
  if (n % 5 === 0) return "community";
  return "creator";
}

export function mockMarketingContacts(): MarketingContact[] {
  let n = 0;
  return Object.entries(NICHES).flatMap(([niche, seeds]) =>
    seeds.map(([name, channel, followers, contactWay, daysAgo, followUps, status, consent]) => {
      n += 1;
      const first = daysAgo === null ? null : day(daysAgo);
      return {
        id: `mc-demo${String(n).padStart(2, "0")}`,
        name,
        channel,
        niche,
        followers,
        contactWay,
        firstMessageAt: first,
        followUps,
        status,
        launchConsent: consent,
        launchConsentAt: consent && daysAgo !== null ? day(Math.max(0, daysAgo - 3)) : null,
        note: "",
        // Kind and motivation fixed per contact, so the filters and the per-motivation rates are filled; every seventh not judged yet.
        ...(n % 7 === 0 ? {} : { kind: kindOf(channel, followers, n), motivation: MOTIVATION_CYCLE[(n * 3) % MOTIVATION_CYCLE.length] }),
        ...(status === "demo" || status === "house" ? { demoSeenAt: `${day(Math.max(0, (daysAgo ?? 0) - 2))}T10:00:00.000Z` } : {}),
        createdAt: `${day((daysAgo ?? 1) + 1)}T09:00:00.000Z`,
      };
    }),
  );
}

/**
 * ⚠ DEMO DATA: 6 partners – 3 creators, 2 community operators, 1 place – each tied to a mock host, so their Houses and their numbers (visits,
 * requests, paid stays from their own share links in the seeded growth events) are real mock data. Invented agreements and notes.
 */
export function mockMarketingPartners(): MarketingPartner[] {
  const base = (id: string, p: Omit<MarketingPartner, "id" | "refCode" | "createdAt" | "notes"> & { notes: [number, string][] }): MarketingPartner => ({
    ...p,
    id,
    refCode: id,
    notes: p.notes.map(([back, text], i) => ({ id: `${id}-n${i}`, at: `${day(back)}T10:00:00.000Z`, text })),
    createdAt: `${day(60)}T09:00:00.000Z`,
  });
  const agreement = (sharePercent: number, status: MarketingPartner["agreement"]["status"], from: number | null, collabPosts = true): MarketingPartner["agreement"] => ({
    sharePercent,
    from: from === null ? null : day(from),
    to: from === null ? null : day(from - 365),
    payoutAfterPaidStay: true,
    contentRights: status === "draft" ? "" : "Fotos und Clips aus dem House, 12 Monate, nur Simpulo-Kanäle",
    collabPosts,
    contractUrl: "",
    status,
  });
  return [
    base("mp-demo1", { contactId: "mc-demo01", name: "Mara", kind: "creator", reach: 48_000, channels: ["Instagram", "TikTok"], ladder: 2, foundingHost: true, hostUserId: "u2", motivation: "peers", agreement: agreement(15, "active", 40), houseIds: [], content: { planned: 6, delivered: 4, approved: 3 }, notes: [[40, "Vereinbarung unterschrieben."], [12, "Zweites House in Lissabon geplant."]], nextStep: { text: "Clips vom Editing House freigeben", due: day(2) } }),
    base("mp-demo2", { contactId: null, name: "Tom", kind: "creator", reach: 120_000, channels: ["YouTube"], ladder: 3, foundingHost: true, hostUserId: "u3", motivation: "status", agreement: agreement(20, "active", 30), houseIds: [], content: { planned: 4, delivered: 2, approved: 2 }, notes: [[30, "„Curated by Tom“ für Ericeira vereinbart."]], nextStep: { text: "Collab-Post zum Frühjahrs-House abstimmen", due: day(-5) } }),
    base("mp-demo3", { contactId: null, name: "Lena", kind: "creator", reach: 22_000, channels: ["Instagram"], ladder: 1, foundingHost: false, hostUserId: "u8", motivation: "money", agreement: agreement(10, "draft", null, false), houseIds: [], content: { planned: 3, delivered: 0, approved: 0 }, notes: [[6, "Will erst selbst ein House hosten."]], nextStep: { text: "Entwurf der Vereinbarung schicken", due: day(-1) } }),
    base("mp-demo4", { contactId: null, name: "Jonas", kind: "community", reach: 9_000, channels: ["Discord", "Newsletter"], ladder: 2, foundingHost: false, hostUserId: "u5", motivation: "peers", agreement: agreement(12, "active", 20), houseIds: [], content: { planned: 2, delivered: 1, approved: 1 }, notes: [[20, "Remote-Community in Chiang Mai, 9.000 Mitglieder."]], nextStep: { text: "Newsletter-Beitrag im Dezember", due: day(-14) } }),
    base("mp-demo5", { contactId: null, name: "Sofia", kind: "community", reach: 14_500, channels: ["Instagram", "WhatsApp-Gruppe"], ladder: 2, foundingHost: false, hostUserId: "u9", agreement: agreement(12, "ended", 200), houseIds: [], content: { planned: 2, delivered: 2, approved: 2 }, notes: [[200, "Pilates-Community Canggu."], [10, "Vereinbarung ausgelaufen – neu ansprechen?"]], nextStep: null }),
    base("mp-demo6", { contactId: null, name: "Villa Canggu", kind: "brand", reach: 3_200, channels: ["Website", "Instagram"], ladder: 1, foundingHost: false, hostUserId: "u1", motivation: "money", agreement: agreement(8, "active", 50, false), houseIds: [], content: { planned: 1, delivered: 1, approved: 0 }, notes: [[50, "Ort für Fitness House Canggu."]], nextStep: { text: "Fotos der Villa freigeben lassen", due: day(-3) } }),
  ];
}

// ⚠ DEMO DATA: the content calendar for Marketing › Content, around "today" (before the marketing start on 1 March 2027 – the Countdown
// then shows the preparation). Fixed dates, no randomness; the Dev menu's clock moves "today" over them.
const post = (id: number, date: string, title: string, channel: string, status: "planned" | "published"): ContentPost => ({ id: `cp-demo${id}`, date, title, channel, status });

export function mockContentPosts(): ContentPost[] {
  return [
    post(1, "2026-11-10", "Testfolge 2D: Die Ankunft", "Instagram Reels", "published"),
    post(2, "2026-11-12", "Testfolge 2D: Die Ankunft", "TikTok", "published"),
    post(3, "2026-11-14", "Was ist ein House?", "YouTube Shorts", "published"),
    post(4, "2026-11-17", "2D: Der Küchentisch", "Instagram Reels", "published"),
    post(5, "2026-11-20", "2D: Der Küchentisch", "TikTok", "published"),
    post(6, "2026-11-22", "Was ist ein House?", "Instagram Reels", "planned"),
    post(7, "2026-11-24", "2D: Die Abstimmung", "Instagram Reels", "planned"),
    post(8, "2026-11-26", "2D: Die Abstimmung", "TikTok", "planned"),
    post(9, "2026-11-28", "2D: Die Abstimmung", "YouTube Shorts", "planned"),
    post(10, "2026-12-01", "2D: Der letzte Abend", "Instagram Reels", "planned"),
    post(11, "2026-12-03", "2D: Der letzte Abend", "TikTok", "planned"),
  ];
}

export function mockContentSprints(): ContentSprint[] {
  return [{ id: "cs-demo1", from: "2026-12-07", to: "2026-12-11", label: "Sprint 1" }];
}

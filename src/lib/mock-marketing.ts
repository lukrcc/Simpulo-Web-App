// ⚠ DEMO DATA: 40 invented creator contacts across three niches for Admin › Launch › Marketing (Kontakte, Trichter) – no real people,
// fixed values (no randomness), so the funnel and the filters are filled in dev and demo. Production starts empty (Firestore marketingContacts).
import type { MarketingContact, MarketingContactStatus, MarketingContactWay } from "./data/adapter";

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
        ...(status === "demo" || status === "house" ? { demoSeenAt: `${day(Math.max(0, (daysAgo ?? 0) - 2))}T10:00:00.000Z` } : {}),
        createdAt: `${day((daysAgo ?? 1) + 1)}T09:00:00.000Z`,
      };
    }),
  );
}

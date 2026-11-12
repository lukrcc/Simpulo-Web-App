// ⚠ MOCK: the admin collections (/admin) – waitlist sign-ups, host applications, the admin log – and the demo traffic. Deterministic: the
// same entries every time. Only the data adapter reads this file (lib/data/mockAdapter.ts); the real source is Firestore (phase 4).
import type { AdminLogEntry, HostApplication, Vibe, WaitlistEntry } from "./types";

/** A small seeded random: the same list on every load. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const TODAY = Date.UTC(2026, 10, 12);
const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();

const FIRST = ["anna", "max", "lea", "tim", "sara", "jon", "mia", "ben", "nora", "luis", "ella", "finn", "zoe", "omar", "ida", "kai", "lina", "paul", "rosa", "noah"];
const DOMAINS = ["gmail.com", "icloud.com", "outlook.com", "proton.me", "web.de"];
const PLACES = ["Lisbon", "Bangkok", "Bali", "Lisbon", "Bangkok", "Mexico City", "Tbilisi", "Berlin", "Canggu", "Medellín"];
const MONTHS = ["2027-03", "2027-04", "2027-05", "2027-06", "2027-07"];
const SOURCES = ["instagram", "instagram", "instagram", "tiktok", "tiktok", "youtube", "newsletter", "friend", "reddit"];
const VIBES: Vibe[] = ["fitness", "surf-water", "remote-work", "founder", "creator", "wellness", "adventure", "culture", "party", "holiday", "social", "students"];
/** Remote work, founders and surf draw the most interest – so the Topics ranking has a shape. */
const VIBE_WEIGHT: Partial<Record<Vibe, number>> = { "remote-work": 4, founder: 3, "surf-water": 3, fitness: 2, creator: 2, wellness: 2 };

function pickVibes(rand: () => number, count: number): Vibe[] {
  const pool = VIBES.flatMap((v) => Array.from({ length: VIBE_WEIGHT[v] ?? 1 }, () => v));
  const out = new Set<Vibe>();
  while (out.size < count) out.add(pool[Math.floor(rand() * pool.length)]);
  return [...out];
}

/** 38 sign-ups over the last ten weeks, more of them lately. */
function waitlist(): WaitlistEntry[] {
  const rand = seeded(7);
  return Array.from({ length: 38 }, (_, i): WaitlistEntry => {
    // Later sign-ups come faster: the day goes as the square root.
    const daysAgo = Math.round(70 * (1 - Math.sqrt((i + 1) / 38)) + rand() * 2);
    const name = FIRST[i % FIRST.length];
    const source = rand() < 0.18 ? null : SOURCES[Math.floor(rand() * SOURCES.length)];
    return {
      id: `wl-${i + 1}`,
      email: `${name}.${(i * 37) % 97}@${DOMAINS[i % DOMAINS.length]}`,
      createdAt: iso(TODAY - daysAgo * DAY + Math.floor(rand() * DAY)),
      wantsToHost: rand() < 0.22,
      interests: pickVibes(rand, 1 + Math.floor(rand() * 3)),
      where: rand() < 0.2 ? null : PLACES[Math.floor(rand() * PLACES.length)],
      when: rand() < 0.3 ? null : MONTHS[Math.floor(rand() * MONTHS.length)],
      source,
      referredBy: source === "friend" ? (rand() < 0.5 ? "u1" : `wl-${Math.max(1, i - 3)}`) : null,
    };
  });
}

const APPLICANTS: readonly (readonly [name: string, topic: Vibe, hub: string, hostType: "share" | "pro", links: string[], pitch: string, userId?: string])[] = [
  ["Jonas", "remote-work", "Lisbon", "share", ["https://instagram.com/jonas.remote"], "A focused work month in Alfama – mornings deep work, evenings on the miradouros.", "u5"],
  ["Priya", "wellness", "Bangkok", "pro", ["https://instagram.com/priya.breathes", "https://youtube.com/@priyabreath"], "Breathwork and slow mornings in a teak house by the river.", "u6"],
  ["Diego", "founder", "Mexico City", "share", ["https://x.com/diego_builds"], "Six founders, one Roma Norte house, demo day at the end.", "u7"],
  ["Lena", "students", "Lisbon", "share", [], "A cheap first month abroad for students on exchange.", "u8"],
  ["Sofia", "surf-water", "Bali", "pro", ["https://instagram.com/sofia.surfs"], "Surf coaching every morning in Canggu, video review at night.", "u9"],
  ["Ben", "founder", "Lisbon", "share", ["https://linkedin.com/in/benbuilds"], "Bootstrapped founders sharing a house near the LX Factory.", "u10"],
  ["Yuki", "culture", "Bangkok", "share", ["https://instagram.com/yuki.walks"], "Markets, temples and cooking together.", "u11"],
  ["Marco", "fitness", "Bangkok", "pro", ["https://instagram.com/marco.muaythai", "https://tiktok.com/@marcofights"], "Muay Thai camp twice a day, recovery in between.", "u12"],
  ["Hannah", "remote-work", "Lisbon", "share", ["https://instagram.com/hannah.abroad"], "Quiet house, fast wifi, Sunday hikes in Sintra.", "u13"],
  ["Karim", "party", "Bangkok", "share", ["https://instagram.com/karim.nights"], "Rooftop weekends and a crew that likes to go out.", "u14"],
  ["Emma", "creator", "Lisbon", "pro", ["https://youtube.com/@emmafilms", "https://instagram.com/emmafilms"], "A creator house with a shared studio and weekly shoots.", "u15"],
  ["Raj", "founder", "Bangkok", "pro", ["https://x.com/rajships"], "AI founders, one sprint a week, pitch practice on Fridays.", "u16"],
  ["Noah", "adventure", "Tbilisi", "share", ["https://instagram.com/noah.outside"], "Hiking the Caucasus on weekends, working in the week.", "u17"],
  ["Nico", "surf-water", "Lisbon", "share", ["https://instagram.com/nico.ericeira"], "Surf in Ericeira, work from the house.", "u18"],
  ["Sasha", "wellness", "Bangkok", "share", [], "Yoga, cold plunges and early nights.", "u19"],
  ["Leo", "fitness", "Bali", "pro", ["https://instagram.com/leo.lifts", "https://tiktok.com/@leolifts"], "A strength block with coaching and meal prep.", "u20"],
  ["Clara", "remote-work", "Mexico City", "share", ["https://instagram.com/clara.cdmx"], "A month in Condesa for people who work remotely."],
  ["Felix", "founder", "Berlin", "share", ["https://linkedin.com/in/felixfounds"], "Pre-seed founders sharing an Altbau flat."],
  ["Ines", "culture", "Lisbon", "share", ["https://instagram.com/ines.fado"], "Fado nights, tiles and slow lunches."],
  ["Theo", "surf-water", "Bali", "share", ["https://tiktok.com/@theosurfs"], "Beginner surfers welcome, lessons shared."],
  ["Mila", "creator", "Bangkok", "pro", ["https://instagram.com/mila.makes", "https://youtube.com/@milamakes"], "Content sprint: 30 videos in 30 days, together."],
  ["Oskar", "students", "Berlin", "share", [], "Erasmus students, first weeks in the city."],
  ["Lucia", "holiday", "Bali", "share", ["https://instagram.com/lucia.sun"], "Two weeks of beach, books and good food."],
  ["Amir", "remote-work", "Tbilisi", "share", ["https://x.com/amir_remote"], "Cheap, central and full of people who work online."],
  ["Jade", "wellness", "Lisbon", "pro", ["https://instagram.com/jade.yoga"], "Yoga retreat feel without the retreat price."],
  ["Pedro", "party", "Lisbon", "share", ["https://instagram.com/pedro.bairro"], "Bairro Alto weekends, beach days to recover."],
  ["Hana", "remote-work", "Bangkok", "share", ["https://instagram.com/hana.works"], "Coworking by day, street food by night."],
  ["Viktor", "fitness", "Lisbon", "share", ["https://instagram.com/viktor.runs"], "Running club house – long runs along the Tejo."],
];
/** In order: the first ones were decided, the newest are still open. */
const DECIDED: readonly HostApplication["status"][] = ["yes", "yes", "no", "maybe", "yes", "maybe", "no", "yes", "maybe", "yes", "no", "maybe", "yes", "maybe", "no"];

/** 28 applications over eight weeks; the first 15 decided, the rest new. */
function applications(): HostApplication[] {
  const rand = seeded(23);
  return APPLICANTS.map(([name, topic, hub, hostType, audienceLinks, pitch, userId], i): HostApplication => ({
    id: `app-${i + 1}`,
    userId,
    name,
    topic,
    hub,
    hostType,
    audienceLinks,
    pitch,
    status: DECIDED[i] ?? "new",
    createdAt: iso(TODAY - Math.round(56 - i * 1.9) * DAY + Math.floor(rand() * DAY)),
  }));
}

/** The log so far: the phase switched to pre-launch, then the decisions on the first applications. */
function adminLog(apps: readonly HostApplication[]): AdminLogEntry[] {
  const entries: AdminLogEntry[] = [{ id: "log-1", action: "phase_changed", target: "prelaunch", by: "u1", createdAt: iso(TODAY - 70 * DAY) }];
  apps
    .filter((a) => a.status !== "new")
    .forEach((a, i) => {
      const at = Date.parse(a.createdAt) + (1 + (i % 3)) * DAY;
      entries.push({ id: `log-d${i}`, action: "application_decided", target: `${a.name} · ${a.status}`, by: "u1", createdAt: iso(at) });
      if (a.status === "yes") entries.push({ id: `log-f${i}`, action: "founding_host_added", target: a.name, by: "u1", createdAt: iso(at + 60_000) });
    });
  entries.push({ id: "log-2", action: "phase_changed", target: "beta", by: "u1", createdAt: iso(TODAY - 9 * DAY) });
  return entries.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** The users the decided "Yes" applications made founding hosts. */
export const MOCK_FOUNDING_HOST_IDS: readonly string[] = applications()
  .filter((a) => a.status === "yes" && a.userId)
  .map((a) => a.userId!);

export function mockAdminData() {
  const apps = applications();
  return { waitlist: waitlist(), applications: apps, log: adminLog(apps) };
}

/** ⚠ DEMO DATA: what Google Analytics will report from phase 4 – visitors per week, countries, sources, the way to the sign-up. */
export const MOCK_TRAFFIC = {
  visitorsPerWeek: [420, 510, 480, 630, 720, 690, 880, 1040, 990, 1230, 1410, 1580].map((visitors, i) => ({ week: iso(TODAY - (11 - i) * 7 * DAY).slice(0, 10), visitors })),
  countries: [
    { country: "Germany", share: 0.24 },
    { country: "United Kingdom", share: 0.14 },
    { country: "Portugal", share: 0.11 },
    { country: "United States", share: 0.1 },
    { country: "Netherlands", share: 0.07 },
    { country: "Thailand", share: 0.05 },
  ],
  sources: [
    { source: "Instagram", share: 0.38 },
    { source: "Direct", share: 0.22 },
    { source: "TikTok", share: 0.17 },
    { source: "Google", share: 0.12 },
    { source: "YouTube", share: 0.07 },
    { source: "Other", share: 0.04 },
  ],
  funnel: [
    { step: "visit", count: 1580 },
    { step: "house", count: 640 },
    { step: "joinTapped", count: 212 },
    { step: "signedUp", count: 96 },
  ],
} as const;

/**
 * ⚠ MOCK: the admin history the mock data can't hold (it has ~100 Houses, no year of bookings). Months as "months ago" (0 = this month,
 * so far), oldest first: a slow climb with one weaker month (3 months back up to now: 3 months above target in a row). The weekly trends
 * shape the Cockpit's sparklines: each the last 8 weeks as factors of today's value (1 = now) – up, with a dip; for numbers where lower is
 * better (open applications, days until full) it falls.
 */
export const MOCK_METRICS_HISTORY = {
  fullHousesPerMonth: [14, 17, 19, 22, 26, 31, 36, 24, 37, 39, 41, 38].map((full, i, all) => ({ monthsAgo: all.length - 1 - i, full })),
  /** What Simpulo kept, EUR */
  profitPerMonth: [1200, 1500, 1800, 2100, 2600, 3200, 3700, 2500, 3900, 4300, 4700, 4400].map((profit, i, all) => ({ monthsAgo: all.length - 1 - i, profit })),
  weekly: {
    rising: [0.78, 0.82, 0.86, 0.83, 0.89, 0.93, 0.96, 1],
    steady: [0.9, 0.92, 0.95, 0.91, 0.94, 0.97, 0.99, 1],
    falling: [1.35, 1.3, 1.22, 1.28, 1.16, 1.1, 1.04, 1],
  },
} as const;

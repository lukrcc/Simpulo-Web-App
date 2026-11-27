// ⚠ MOCK: the admin collections (/admin) – waitlist sign-ups, host applications, the admin log – and the demo traffic. Deterministic: the
// same entries every time. Only the data adapter reads this file (lib/data/mockAdapter.ts); the real source is Firestore (phase 4).
import { mockAcquisitionContacts } from "./mock-acquisition";
import { mockMarketingContacts, mockMarketingPartners, mockContentPosts, mockContentSprints, mockCostEntries } from "./mock-marketing";
import { MOCK_TAX_QUESTIONS } from "./mock-ledger";
import type { AdminLogEntry, HostApplication, SupportTicket, Vibe, WaitlistEntry, Withdrawal } from "./types";

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
      consent: true,
      // About one in eight hasn't clicked the confirmation link yet; one has unsubscribed.
      confirmedAt: i % 8 === 5 ? null : iso(TODAY - daysAgo * DAY + 3 * 3_600_000),
      ...(i === 11 && { unsubscribedAt: iso(TODAY - Math.max(0, daysAgo - 4) * DAY) }),
      token: `wlt-${i + 1}-${(i * 7919) % 10007}`,
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
/**
 * ⚠ MOCK: followers across someone's links – most a few thousand, about one in 25 a creator with 100k+ (an anchor by HOST_TIER_RULES).
 * Fixed per key, so the same person always has the same number.
 */
export function mockAudienceSize(key: string, hasLinks = true): number {
  if (!hasLinks) return 0;
  // FNV-1a, then a multiplicative mix – short keys ("u12") spread evenly.
  let h = 2166136261;
  for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 2246822507) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
  const r = (h >>> 0) / 4294967296;
  const s = ((h >>> 11) % 1000) / 1000;
  return r < 0.04 ? 120_000 + Math.round(s * 880_000) : 600 + Math.round(s * 42_000);
}

/**
 * ⚠ MOCK: some hosts who run their Houses as pro hosts (a host fee per guest) – so the host mix reads like a real one (about 60 % share,
 * 35 % pro, 5 % anchor; admin › Hosts). Fixed per host id.
 */
export function mockRunsAsPro(hostId: string): boolean {
  let h = 2166136261;
  for (const c of `pro-${hostId}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
  return h % 100 < 17;
}

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
    audienceSize: mockAudienceSize(`app-${name}`, audienceLinks.length > 0),
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
  return { waitlist: waitlist(), applications: apps, log: adminLog(apps), tickets: tickets(), withdrawals: WITHDRAWALS, taskStates: {}, receipts: {}, taxQuestions: MOCK_TAX_QUESTIONS.map((q) => ({ ...q })), fundingDocs: {}, backlog: {}, location: { country: null, reason: "" }, marketingContacts: mockMarketingContacts(), marketingSteps: {}, marketingClips: 2, marketingPartners: mockMarketingPartners(), houseDone: {}, contentHouses: [], launchTasks: {}, launchCustomTasks: [], contentPosts: mockContentPosts(), contentSprints: mockContentSprints(), costEntries: mockCostEntries(), acquisitionContacts: mockAcquisitionContacts(), acquisitionTemplates: {}, acquisitionDms: { "2026-11-27": 12 } };
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
 * ⚠ MOCK: the admin history the mock data can't hold (it has ~100 Houses, no year of bookings). Months as "months ago" (0 = this month – its
 * level for the whole month; the admin counts the part that has passed, lib/admin/metrics.ts monthSoFar), oldest first: a slow climb with one weaker month (3 months back up to now: 3 months above target in a row).
 */
export const MOCK_METRICS_HISTORY = {
  fullHousesPerMonth: [14, 17, 19, 22, 26, 31, 36, 24, 37, 39, 41, 38].map((full, i, all) => ({ monthsAgo: all.length - 1 - i, full })),
  /** What Simpulo kept, EUR */
  profitPerMonth: [1200, 1500, 1800, 2100, 2600, 3200, 3700, 2500, 3900, 4300, 4700, 4400].map((profit, i, all) => ({ monthsAgo: all.length - 1 - i, profit })),
  /**
   * The monthly series, oldest first (the last is this month so far): shared nights ≈ full Houses × 6 people × 9–10 nights; the booking
   * volume ≈ ten times what Simpulo keeps (guests pay rent and host fees through Simpulo, Simpulo keeps ≈ 10 %); active users well above the
   * guests (most search and save before they ever stay); new guests ≈ the guests of the month without the returning ones.
   */
  series: {
    // ⚠ Example values; the last four a little higher than before (Wert-Check: the nights per 100 € of revenue keep pace with the fee).
    sharedNights: [790, 980, 1110, 1290, 1520, 1830, 2140, 1390, 2240, 2500, 2750, 2560],
    bookingVolume: [11900, 15200, 18100, 21400, 26300, 32500, 37400, 25100, 39600, 43300, 47600, 44100],
    activeUsers: [840, 990, 1130, 1290, 1520, 1830, 2160, 1740, 2410, 2680, 2970, 2810],
    newGuests: [58, 69, 76, 86, 99, 117, 133, 88, 136, 141, 147, 128],
    repeatRate: [11, 12, 13, 14, 15, 16, 17, 17, 18, 19, 21, 22],
    connectionRate: [55, 56, 57, 56, 58, 59, 60, 60, 61, 62, 62, 61],
    /** ⚠ Example values (Wert-Check): still in touch after 30 days, second House within 6 months, new mutual pairs – all slowly rising. */
    stillInTouch: [38, 39, 41, 40, 42, 43, 44, 44, 46, 47, 48, 48],
    secondHouse: [18, 19, 21, 22, 23, 25, 26, 27, 29, 30, 32, 32],
    mutualPairs: [3, 4, 5, 5, 6, 8, 9, 6, 10, 11, 13, 11],
  },
  /** Guests with a booking who have Simpulo installed: iPhone lower than Android (three taps in Safari against one button), both rising. */
  installs: {
    ios: [{ booked: 34, installed: 3 }, { booked: 40, installed: 4 }, { booked: 44, installed: 5 }, { booked: 50, installed: 6 }, { booked: 58, installed: 8 }, { booked: 68, installed: 10 }, { booked: 77, installed: 11 }, { booked: 52, installed: 8 }, { booked: 80, installed: 13 }, { booked: 83, installed: 14 }, { booked: 87, installed: 16 }, { booked: 76, installed: 14 }],
    android: [{ booked: 24, installed: 4 }, { booked: 29, installed: 5 }, { booked: 32, installed: 6 }, { booked: 36, installed: 7 }, { booked: 41, installed: 8 }, { booked: 49, installed: 10 }, { booked: 56, installed: 12 }, { booked: 36, installed: 8 }, { booked: 56, installed: 13 }, { booked: 58, installed: 15 }, { booked: 60, installed: 16 }, { booked: 52, installed: 14 }],
  },
  /** Asking the host before a request (Wachstum › Verhalten), the last two full months, oldest first: direct chats, how many led to a
   *  request (≈ 40 %), the guest's messages before it (≈ 2.7 each), requests and how many carry a note (≈ 57 %). */
  asking: [
    { chats: 41, requested: 17, guestMessages: 44, requests: 118, withNote: 69 },
    { chats: 58, requested: 23, guestMessages: 64, requests: 164, withNote: 92 },
  ],
  /**
   * Admin › Houses: three upcoming Houses at risk (two quiet for over a week, one with a request unanswered for 61 h); the full Houses took
   * 6–21 days to fill. Houses not listed count as active.
   */
  houseActivity: {
    x47: { quietDays: 11 },
    x45: { quietDays: 9 },
    x23: { oldestPendingHours: 61 },
    s9: { daysToFull: 6 },
    s4: { daysToFull: 8 },
    s1: { daysToFull: 9 },
    s34: { daysToFull: 10 },
    x19: { daysToFull: 11 },
    s22: { daysToFull: 12 },
    s24: { daysToFull: 14 },
    s25: { daysToFull: 16 },
    s54: { daysToFull: 18 },
    x49: { daysToFull: 21 },
  },
  /**
   * The overview's numbers on the same day a week, a month and a year ago (this month so far, as they stood then): a week ago fewer Houses
   * had filled yet; on 15 Oct October stood a little higher in profit, lower in full Houses; a year ago Simpulo was small.
   */
  /**
   * ⚠ Example values: the 23 months before the last twelve (Jan 2024 – a year ago), a slow start that grows into the twelve months above –
   * profit (EUR), full Houses and the shared nights (≈ full Houses × 56). For the overview's quarters and years.
   */
  olderMonths: [
    [60, 1], [90, 1], [120, 1], [150, 2], [210, 2], [260, 3], [300, 3], [240, 2], [330, 3], [380, 4], [420, 4], [400, 4],
    [450, 5], [520, 5], [580, 6], [640, 6], [710, 7], [790, 8], [860, 9], [700, 7], [930, 10], [1010, 11], [1080, 12],
  ].map(([profit, full], i, all) => ({ monthsAgo: 12 + all.length - 1 - i, profit, full, sharedNights: full * 56 })),
  /** Open Houses at the end of the period compared with – a steady rise toward today's ~93. */
  openHousesBefore: { week: 90, month: 86, quarter: 74, year: 52 },
  snapshots: {
    week: { profit: 3900, fullHouses: 33, reservedShare: 49, repeatRate: 22, sharedNights: 1960 },
    month: { profit: 4700, fullHouses: 35, reservedShare: 46, repeatRate: 20, sharedNights: 2050, needsHelp: 5 },
    year: { profit: 900, fullHouses: 9, reservedShare: 31, repeatRate: 12, sharedNights: 510 },
  },
  /**
   * ⚠ Example values: what each provider cost over the last 12 months (EUR), against the year's revenue (35.900 €): Firebase ≈ 6 %, Stripe's
   * fees ≈ 12 % (they are charged on the whole amount, Simpulo keeps only the fee), analytics free, maps ≈ 2 %, e-mail ≈ 1 %.
   */
  providerCosts: { firebase: 2150, stripe: 4300, analytics: 0, maps: 720, email: 260 },
  /** Realistic for a young network: 41 % mutual pairs, 22 % repeat guests, 17 days until full (median). */
  network: {
    // Example values for the rating that isn't built yet (after.again): 38 of 120 answered pairs said "again" both ways.
    againPairs: 120,
    againMutual: 38,
    // Of 420 bookings 71 came through an invite, 46 through Your people (someone of theirs was already in): 28 % through the network.
    bookings: 420,
    bookingsViaInvite: 71,
    bookingsViaPeople: 46,
    mutualPairs: 49,
    allPairs: 120,
    peopleWithMutual: 74,
    guests: 312,
    repeatGuests: 69,
    fullHouses: 64,
    medianDaysToFull: 17,
    daysToFullBuckets: [
      { key: "0-3", count: 3 },
      { key: "4-7", count: 6 },
      { key: "8-14", count: 17 },
      { key: "15-30", count: 29 },
      { key: "30+", count: 9 },
    ],
  },
};

/** ⚠ MOCK: what the data says about each hypothesis so far (config/hypotheses.ts) – the current value and the verdict. */
export const MOCK_HYPOTHESIS_RESULTS = {
  topicsFirst: { current: "41 % schneller", status: "supported" },
  proFaster: { current: "12 % schneller", status: "open" },
  reservedFill: { current: "74 %", status: "open" },
  peopleRebook: { current: "2,1×", status: "supported" },
  shortTrips: { current: "3 % schneller", status: "rejected" },
  tiktokConverts: { current: "1,1× (38 Anmeldungen)", status: "open" },
} as const;

// ── Support ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

type MockTicket = readonly [category: SupportTicket["category"], status: SupportTicket["status"], message: string, page: string, tags: readonly string[], votes?: number, userId?: string, houseId?: string];

/** 36 tickets over seven weeks, the newest first: questions, bugs, ideas (some asked often) and three safety cases. */
const TICKETS: readonly MockTicket[] = [
  ["safety", "new", "The host asked me to pay the rest in cash when I arrive. Is that normal?", "/h/s5", ["payment", "host"], 1, "u9", "s5"],
  ["bug", "new", "The Pay button spins forever on my iPhone. Tried twice.", "/h/s2?focus=pay", ["payment", "ios"], 1, "u11", "s2"],
  ["idea", "new", "Please let me filter by \"private room only\". Sharing a room is a dealbreaker for me.", "/explore", ["filters", "rooms"], 1, "u13"],
  ["question", "new", "Can I join a House for only the first two weeks?", "/house/founder-house-lisbon", ["dates"], 1, undefined, "s3"],
  ["idea", "new", "Calendar sync with Google would be great – I keep forgetting dates.", "/your-houses", ["calendar"], 1, "u15"],
  ["bug", "open", "The map in the place tile doesn't load in Firefox.", "/house/slow-house-bangkok", ["house-page", "firefox"], 1, "u16", "s6"],
  ["question", "open", "How does the host fee work? Do I pay it on top of my share?", "/house/muay-thai-house-phuket", ["fees"], 1, "u17", "s4"],
  ["idea", "planned", "A dark mode for the app, please!", "/settings", ["design"], 14, "u18"],
  ["idea", "open", "Let us split the House into two smaller groups for day trips.", "/h/s1", ["crew"], 3, "u19", "s1"],
  ["safety", "open", "Someone in my crew keeps messaging me privately after I said no. Please help.", "/messages", ["harassment"], 1, "u20"],
  ["question", "answered", "Is the deposit refundable if the House doesn't fill?", "/faq", ["refund"], 1, "u5"],
  ["bug", "answered", "I got two emails for the same request.", "/your-houses", ["email"], 1, "u6"],
  ["idea", "planned", "Show how far the House is from the beach / gym.", "/house/surf-house-ericeira", ["house-page", "map"], 11, "u7", "s9"],
  ["idea", "open", "Private room only filter", "/explore", ["filters", "rooms"], 1, "u8"],
  ["question", "closed", "Can I change my email address?", "/settings", ["account"], 1, "u10"],
  ["bug", "closed", "Photos upload sideways from my Android phone.", "/settings/profile", ["photos", "android"], 1, "u12"],
  ["idea", "done", "Let me save Houses without logging in.", "/explore", ["saved"], 9],
  ["idea", "open", "Group video call before the House starts, to meet the crew.", "/h/s3", ["crew", "video"], 6, "u14", "s3"],
  ["question", "answered", "What happens if the host cancels?", "/cancellation", ["cancellation"], 1],
  ["bug", "open", "The \"Request with a friend\" link opens the wrong House.", "/h/s10", ["invite"], 1, "u2", "s10"],
  ["idea", "open", "Monthly price discounts for 3+ month stays.", "/create", ["pricing"], 4, "u3"],
  ["safety", "answered", "The apartment had no working smoke detector.", "/h/s9", ["accommodation"], 1, "u4", "s9"],
  ["question", "open", "Do you have Houses for families with kids?", "/explore", ["audience"], 1],
  ["idea", "open", "Pet-friendly Houses filter", "/explore", ["filters", "pets"], 5, "u21"],
  ["bug", "new", "The month picker shows 2026 twice.", "/explore?open=where", ["search"], 1, "u22"],
  ["question", "new", "How do I become a Founding Host?", "/faq?role=host", ["hosting"], 1],
  ["idea", "new", "Dark mode would be nice", "/settings", ["design"], 1, "u23"],
  ["bug", "answered", "Currency switch resets after reload.", "/settings", ["currency"], 1, "u24"],
  ["question", "closed", "Can I pay with PayPal?", "/h/s2?focus=pay", ["payment"], 1, "u25", "s2"],
  ["idea", "open", "A shared shopping list for the crew.", "/messages", ["crew", "tools"], 2, "u26"],
  ["bug", "open", "On iPad the Join bar covers the last line of House rules.", "/house/creator-house-uluwatu", ["house-page", "ipad"], 1, "u27", "s2"],
  ["question", "answered", "Why can't I message the host directly from their profile?", "/u/u3", ["messages"], 1, "u28"],
  ["idea", "done", "Show the crew's languages on the House page.", "/house/dev-house-da-nang", ["house-page"], 7],
  ["question", "new", "Is there an app in the App Store?", "/get", ["app"], 1],
  ["bug", "new", "Notifications badge doesn't clear after reading.", "/your-houses", ["notifications"], 1, "u29"],
  ["idea", "open", "Let hosts post a short video tour of the place.", "/create", ["house-page", "video"], 3, "u30"],
];

const DEVICES = ["Desktop · Chrome", "iPhone · Safari", "Desktop · Safari", "Android · Chrome", "iPad · Safari", "Desktop · Firefox"];
const WIDTHS = [1470, 390, 1728, 412, 1024, 1280];

function tickets(): SupportTicket[] {
  const rand = seeded(41);
  const list = TICKETS.map(([category, status, message, page, tags, votes, userId, houseId], i): SupportTicket => {
    const createdAt = iso(TODAY - Math.round(i * 1.35) * DAY - Math.floor(rand() * DAY));
    const answered = status === "answered" || status === "closed" || status === "planned" || status === "done";
    return {
      id: `t-${i + 1}`,
      userId,
      email: userId ? `${userId}@example.com` : `${FIRST[(i * 3) % FIRST.length]}.${i}@gmail.com`,
      category,
      message,
      context: { page, houseId, device: DEVICES[i % DEVICES.length], screenWidth: WIDTHS[i % WIDTHS.length], phase: "beta" },
      attachments: category === "bug" && i % 2 === 0 ? [{ name: "screenshot.png", size: 182_000 + i * 1000 }] : [],
      status,
      priority: category === "safety" ? "high" : "normal",
      tags,
      votes: votes ?? 1,
      adminNotes: category === "safety" && status !== "new" ? "Checked with the host – following up." : "",
      replies: answered ? [{ id: `r-${i}`, from: "admin", by: "u1", text: "Thanks for writing – we're on it and will get back to you here.", createdAt: iso(Date.parse(createdAt) + DAY / 3) }] : [],
      createdAt,
    };
  });
  // The second "private room only" and "dark mode" were merged into the first ones.
  return list.map((t) => (t.id === "t-14" ? { ...t, status: "closed", mergedInto: "t-3" } : t.id === "t-27" ? { ...t, status: "closed", mergedInto: "t-8" } : t));
}

/** Private withdrawals from the company account (Admin › Money), EUR. */
const WITHDRAWALS: Withdrawal[] = [
  { id: "wd-1", date: "2026-09-30", amount: 1500, note: "September" },
  { id: "wd-2", date: "2026-10-31", amount: 1800, note: "October" },
];

/** ⚠ MOCK: Simpulo's own Stripe payout settings (Admin › Money) – changed only in Stripe. */
export const MOCK_PLATFORM_PAYOUTS = {
  schedule: "weekly",
  account: "Qonto ••1234",
  available: 1240,
  next: { date: "2026-11-16", amount: 1240 },
  manageUrl: "https://dashboard.stripe.com/settings/payouts",
} as const;


/** ⚠ MOCK: two payments that didn't go through (Admin › Heute, "Geld"). */
export const MOCK_PAYMENT_ISSUES = [
  { id: "pi-1", stayId: "s2", userId: "u14", amount: 6_800_000, reason: "card_declined", at: iso(TODAY - 1 * DAY) },
  { id: "pi-2", stayId: "s16", userId: "u21", amount: 15_400, reason: "insufficient_funds", at: iso(TODAY - 2 * DAY + 5 * 3_600_000) },
] as const;

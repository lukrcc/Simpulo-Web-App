// Admin › Vision ("Where is Simpulo going?") – EVERY text of the page, in one place to edit by hand. Content only from the founders' brief:
// no revenue source, stage or criterion is added here that isn't in it. The numbers (revenue this month, the move, full Houses per hub, the
// current phase) come from lib/admin/metrics.ts – never from here.
import { MOVE_TARGET } from "./admin";

export const VISION_TITLE = "Where is Simpulo going?";
export const YOU_ARE_HERE = "You are here";
export const NOT_MEASURABLE = "not measurable yet";

export const VISION_TABS = [
  { key: "path", label: "Path" },
  { key: "tModel", label: "T-Model" },
  { key: "breadthDepth", label: "Breadth & Depth" },
  { key: "continuum", label: "Continuum" },
  { key: "roadmap", label: "Roadmap" },
] as const;
export type VisionTab = (typeof VISION_TABS)[number]["key"];

// ── Sources: status and measure ─────────────────────────────────────────────────────────────────────────────────────────────────

export const SOURCE_STATUSES = ["live", "prepared", "idea"] as const;
/** live – earning now · prepared – the product has the groundwork · idea – not built */
export type SourceStatus = (typeof SOURCE_STATUSES)[number];
export const SOURCE_STATUS_LABEL: Record<SourceStatus, string> = { live: "live", prepared: "prepared", idea: "idea" };
/** The legend: "2 live · 13 ideas" */
export const sourceCount = (count: number, status: SourceStatus) => `${count} ${status === "idea" && count !== 1 ? "ideas" : SOURCE_STATUS_LABEL[status]}`;

/** The two sources Simpulo earns from today – their revenue this month is measured (lib/admin/metrics.ts revenueBySource). */
export type RevenueMeasure = "serviceFee" | "hostFeeShare";

export interface Source {
  name: string;
  status: SourceStatus;
  /** Live sources only */
  measure?: RevenueMeasure;
}

const live = (name: string, measure: RevenueMeasure): Source => ({ name, status: "live", measure });
/** Everything not live is an idea until the brief says otherwise. */
const idea = (name: string): Source => ({ name, status: "idea" });

// ── Path ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export type UnlockKey = "move" | "round";

export const PATH = {
  earned: "Earned this month",
  now: "Now",
  opensWith: { move: "Opens with the move", round: "Opens with the round" } satisfies Record<UnlockKey, string>,
  stages: [
    { key: "germany", where: "Germany", title: "Prove the core", unlock: null, sources: [live("Service fee", "serviceFee"), live("Host fee share", "hostFeeShare"), idea("Partner links")] },
    { key: "abroad", where: "Abroad", title: "Ignite breadth", unlock: "move", sources: [idea("Host subscription"), idea("Featured placement"), idea("B2B offsites"), idea("Membership")] },
    { key: "afterRound", where: "After the round", title: "Go deep", unlock: "round", sources: [idea("Partner houses"), idea("Management fee"), idea("Licensing"), idea("Own houses via fund")] },
  ] as const satisfies readonly { key: string; where: string; title: string; unlock: UnlockKey | null; sources: readonly Source[] }[],
  unlocksTitle: "Unlocks",
  unlocks: {
    move: { title: "Move", condition: `€${MOVE_TARGET.profitPerMonth.toLocaleString("en-US")} profit, ${MOVE_TARGET.months} months in a row` },
    round: { title: "Round", condition: "Numbers convince investors" },
  } satisfies Record<UnlockKey, { title: string; condition: string }>,
  monthsInRow: (streak: number, of: number) => `${streak} of ${of} months`,
  thisMonth: (value: string, target: string) => `${value} this month of ${target}`,
} as const;

// ── T-Model ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export const T_MODEL = {
  breadth: {
    title: "Breadth – same mechanics for more people",
    fields: [
      { title: "Topics", text: "Fitness, Surf, Founder, Creator" },
      { title: "Audiences", text: "students, families, companies" },
      { title: "Places", text: "hubs by demand" },
      { title: "Duration", text: "1 day to 10 months" },
      { title: "Formats", text: "living, events, offsites, membership" },
    ],
  },
  depth: {
    title: "Depth – more of the chain",
    /** From the top; `active`: Simpulo does this step today */
    steps: [
      { title: "Discover", text: "Explore, search", active: true },
      { title: "Matching", text: "algorithm", active: true },
      { title: "Book & pay", text: "Stripe, deposit", active: true },
      { title: "Stay", text: "external, later own", active: false },
      { title: "Life in the house", text: "house kitty, services", active: false },
      { title: "Buildings", text: "Simpulo Houses", active: false },
      { title: "Capital", text: "Simpulo fund", active: false },
    ],
    active: "active",
  },
  /** The arrow from breadth to depth step 6 (1-based) */
  arrow: { toStep: 6, text: "Data shows where to build" },
  matrix: {
    phases: ["Pre-launch", "Launch", "Growth", "Scale", "Full"],
    rows: [
      { title: "Houses", cells: ["10 show houses", "20–30", "~100", "~500", "1,000+"] },
      { title: "Topics", cells: ["Fitness, Founder, Creator", "same", "+ Remote work, Surf, Wellness, Social", "+ Students, Families, Offsites", "all, ~50"] },
      { title: "Places", cells: ["Bali, Lisbon", "Bali, Lisbon", "8–10 hubs", "30+ countries", "worldwide"] },
      { title: "Stay", cells: ["waitlist", "booked externally", "partner houses", "Simpulo Houses", "flagships"] },
      { title: "Revenue", cells: ["none", "service fee, host fee share", "+ partners, host subscription", "+ membership, B2B, services", "+ licensing, fund"] },
    ],
  },
} as const;

/**
 * Which matrix phase Simpulo is in (lib/admin/metrics.ts visionPhase): pre-launch while the platform phase is pre-launch, then by real
 * Houses against the "Houses" row – from 100 Growth, from 500 Scale, from 1,000 Full, else Launch.
 */
export const MATRIX_HOUSES_FROM = { growth: 100, scale: 500, full: 1000 } as const;

// ── Breadth & Depth ─────────────────────────────────────────────────────────────────────────────────────────────────────────────

export type DepthUnlockMeasure = "fullHousesInOneHub" | null;

export const BREADTH_DEPTH = {
  breadthTitle: "Breadth",
  depthTitle: "Depth",
  breadth: [
    { key: "H1", title: "Core niche" },
    { key: "H2", title: "New topics" },
    { key: "H3", title: "Stretch duration" },
    { key: "H4", title: "New places" },
    { key: "H5", title: "B2B offsites" },
    { key: "H6", title: "Services in the house" },
  ],
  /** `unlock`: the diamond before the step – its criterion, and what measures it (null: not measurable yet) */
  depth: [
    { key: "V1", title: "Marketplace", unlock: null },
    { key: "V2", title: "Partner places", unlock: { criterion: "20+ full houses per month in one hub", measure: "fullHousesInOneHub", target: 20 } },
    { key: "V3", title: "Simpulo Houses", unlock: { criterion: "Partners see measurably higher occupancy", measure: null, target: null } },
    { key: "V4", title: "Own leases", unlock: { criterion: "12 months of occupancy data show 80 %+", measure: null, target: null } },
    { key: "V5", title: "Flagships", unlock: { criterion: "Several hubs profitable, investors for capital", measure: null, target: null } },
    { key: "V6", title: "Licensing worldwide", unlock: { criterion: "Standard proven and documented", measure: null, target: null } },
  ] as const satisfies readonly { key: string; title: string; unlock: { criterion: string; measure: DepthUnlockMeasure; target: number | null } | null }[],
  closing: "Breadth leads, depth follows – each step starts when its numbers are reached, not by date.",
  progress: (value: number, target: number) => `${value} of ${target}`,
} as const;

// ── Continuum ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export const CONTINUUM = {
  groups: [
    { title: "Platform (tech)", sources: [live("Service fee", "serviceFee"), live("Host fee share", "hostFeeShare"), idea("Partner commissions"), idea("Host subscription"), idea("Featured placement"), idea("Membership"), idea("B2B offsites")] },
    { title: "Brand & operations", sources: [idea("Partner house commission"), idea("Management fee"), idea("Services in the house"), idea("Licensing fees")] },
    { title: "Real estate", sources: [idea("Lease margin"), idea("Rent from own houses"), idea("Appreciation"), idea("Fund fees")] },
  ] as const satisfies readonly { title: string; sources: readonly Source[] }[],
  arrows: { right: "Capital and risk rise →", left: "← Valuation per euro of revenue rises" },
} as const;

// ── Roadmap ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export const ROADMAP = {
  /** 1-based: the stage Simpulo is on */
  current: 1,
  revenueLabel: "New revenue",
  stages: [
    { title: "Marketplace", text: "fill houses, prove demand", revenue: "service fee, host fee share" },
    { title: "Network", text: "Your people, repeats, matching", revenue: "host subscription, featured placement" },
    { title: "Partner houses", text: "first Simpulo branding in partner places", revenue: "commission, management fee" },
    { title: "Flagship", text: "first own house, designed from data", revenue: "rent, services" },
    { title: "Membership", text: "access to all Simpulo Houses", revenue: "recurring subscription" },
    { title: "Real-estate platform", text: "Simpulo fund finances more houses", revenue: "fund fees, own share" },
  ],
  partnerTitle: "Partner ecosystem",
  fromStage: (stage: number) => `from stage ${stage}`,
  /** `from`: the roadmap stage (1-based) the area starts with */
  partners: [
    { title: "Before the trip", text: "insurance, eSIM, flights, visa", from: 2 },
    { title: "On site", text: "surf school, yoga, gym, coworking", from: 2 },
    { title: "Money", text: "house kitty, currency, instalments", from: 2 },
    { title: "In the house", text: "cleaning, cook, laundry", from: 3 },
    { title: "Brands", text: "sponsors, creator deals", from: 3 },
    { title: "Build & interior", text: "furniture, design, smart home", from: 4 },
    { title: "Capital", text: "banks, funds, investors", from: 6 },
  ],
} as const;

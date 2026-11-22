// Admin › Launch › Marketing – the launch strategy as data (Countdown · Pipeline · Partner · Content). German like every admin text; numbers and goals here,
// computed values in lib/admin/metrics.ts (marketing*). Only what the plan says – what isn't filled in yet stays empty and the page says so.

import { LAUNCH, MARKETING_START } from "./roadmap";

/** Marketing start and launch – from config/roadmap.ts (the one source for the schedule). */
export const MARKETING_START_DATE = MARKETING_START.date;
export const LAUNCH_DATE = LAUNCH.date;

/** What the strategy counts – each phase's target is where the number should stand at the phase's end (cumulative). */
export const STRATEGY_METRICS = ["contacts", "housesOpened", "filled", "hubs", "waitlist", "shorts", "partners"] as const;
export type StrategyMetric = (typeof STRATEGY_METRICS)[number];

export type LaunchPhaseKey = "foundation" | "founding" | "proof" | "countdown";

/**
 * The phases in weeks from the marketing start (week 1 begins on the start day; weeks of 7 days): 1–2 Fundament · 3–4 Founding Hosts ·
 * 5–6 Beweis · 7–8 Countdown, each with the targets at its end. Weekly targets are the phase's increase spread evenly over its days
 * (lib/admin/metrics.ts strategyPhases, strategyTarget, weekTarget).
 */
export const LAUNCH_PHASES: readonly { key: LaunchPhaseKey; no: number; label: string; weeks: { from: number; to: number }; targets: Record<StrategyMetric, number> }[] = [
  { key: "foundation", no: 0, label: "Fundament", weeks: { from: 1, to: 2 }, targets: { contacts: 300, housesOpened: 0, filled: 0, hubs: 0, waitlist: 100, shorts: 9, partners: 0 } },
  { key: "founding", no: 1, label: "Founding Hosts", weeks: { from: 3, to: 4 }, targets: { contacts: 900, housesOpened: 15, filled: 0, hubs: 1, waitlist: 250, shorts: 15, partners: 3 } },
  { key: "proof", no: 2, label: "Beweis", weeks: { from: 5, to: 6 }, targets: { contacts: 1400, housesOpened: 30, filled: 1, hubs: 2, waitlist: 500, shorts: 21, partners: 4 } },
  { key: "countdown", no: 3, label: "Countdown", weeks: { from: 7, to: 8 }, targets: { contacts: 1800, housesOpened: 50, filled: 5, hubs: 3, waitlist: 1000, shorts: 27, partners: 5 } },
];
/** All weeks of the strategy. */
export const STRATEGY_WEEKS = LAUNCH_PHASES[LAUNCH_PHASES.length - 1].weeks.to;

/**
 * Fallback rules, shown as a hint in the Countdown (nothing moves by itself): 35–49 Houses → launch two weeks later; 30 Houses in 2 hubs
 * with good quality → launch possible (quality is judged by hand).
 */
export const FALLBACK_RULES: readonly { id: string; text: string; houses: { from: number; to: number }; hubs?: number }[] = [
  { id: "later", text: "35–49 Houses → Launch +2 Wochen", houses: { from: 35, to: 49 } },
  { id: "possible", text: "30 Houses in 2 Hubs mit guter Qualität → Launch möglich", houses: { from: 30, to: 49 }, hubs: 2 },
];

/** Countdown › the four rings (their goal: the last phase's target; the tick: where the number should stand today). */
export const STRATEGY_RINGS = ["housesOpened", "hubs", "waitlist", "filled"] as const satisfies readonly StrategyMetric[];
/** Countdown › "Wochenzahlen": actual against the week's share. */
export const STRATEGY_WEEK_BARS = ["contacts", "shorts", "housesOpened", "waitlist"] as const satisfies readonly StrategyMetric[];
/** Countdown › "Diese Woche": the week's numbers as tasks (only when the week's share is above 0). */
export const STRATEGY_WEEK_TASKS = ["contacts", "shorts", "housesOpened", "partners"] as const satisfies readonly StrategyMetric[];

/**
 * The plan's steps as tasks of a phase (shown in the weeks of that phase) (ticked off: AdminData.marketingSteps, logged; ids stay stable). `weekly`: comes back every week
 * (ticked per week, AdminData.launchTasks). `due` as the plan says it.
 */
export const MARKETING_NEXT_STEPS: readonly { id: string; text: string; due: string; phase: LaunchPhaseKey; weekly?: true }[] = [
  { id: "landing", text: "Landingpage öffentlich, Gründer-Abschnitt, Benachrichtigungsfeld", due: "bis Januar", phase: "foundation" },
  { id: "series", text: "Cast, 10 Skripte, 2D-Testfolge", due: "bis Januar", phase: "foundation" },
  { id: "communities", text: "In 2–3 Communities mitlesen, 15 Min. täglich", due: "ab jetzt", phase: "foundation", weekly: true },
  { id: "contacts", text: "Kontaktliste und Erstnachricht pro Nische", due: "bis Januar", phase: "foundation" },
  { id: "loops", text: "House Memories und Gratis-Schleifen ins Produkt", due: "mit Firebase", phase: "foundation" },
  { id: "partner", text: "Einen Partner für das erste House gewinnen", due: "Februar", phase: "founding" },
];

/** Content › the weekly target for shorts (the calendar marks each week against it). */
export const CONTENT_WEEKLY_TARGET = 3;
/** Content › where a short goes out (the plan's channel 4). */
export const SHORT_CHANNELS = ["Instagram Reels", "TikTok", "YouTube Shorts"] as const;

/** Contacts and partners: what they are (the same kinds as Partner, with Streamer). */
export const MARKETING_KINDS = ["creator", "streamer", "community", "connector", "brand"] as const;

/** What moves them most. */
export const MOTIVATIONS = ["money", "peers", "status"] as const;

/** "Passendes Angebot" per motivation (contact and partner detail); `{name}` = their name. */
export const MOTIVATION_OFFERS: Record<(typeof MOTIVATIONS)[number], readonly string[]> = {
  money: ["Host-Fee als Pro Host", "Bezahlung pro gefülltem House", "Partner-Anteil"],
  peers: ["„{name}'s people“", "Wiederkehrende Houses", "Früher Zugang für die Community"],
  status: ["Founding Host", "Bühne", "„Curated by“"],
};

/** The funnel's assumptions, each as a share of the contacts written to (from – to). */
export const FUNNEL_ASSUMPTIONS = {
  replied: { from: 0.1, to: 0.15 },
  demo: { from: 0.05, to: 0.08 },
  house: { from: 0.02, to: 0.04 },
} as const;
/** The projection: contacts needed for this many Houses at the current rate. */
export const PROJECTION_HOUSES = 50;
/** After the second follow-up: quiet. */
export const MAX_FOLLOW_UPS = 2;
/** The channels a contact can be on (the form's choices). */
export const CONTACT_CHANNELS = ["Instagram", "TikTok", "YouTube", "LinkedIn", "Twitch", "Website", "Andere"] as const;

/** Content › the shot list for a House. */
export const SHOT_LIST = ["Ankunft", "Rundgang", "Essen", "Arbeiten", "Abschied"] as const;
/** Content › the 2D series: the cast (4–5 types – they come with the next step "Cast, 10 Skripte, 2D-Testfolge"), the build of a clip, the clips before approaching hosts. */
export const SERIES_CAST: readonly string[] = [];
export const SERIES_CAST_SIZE = { from: 4, to: 5 } as const;
export const SERIES_STRUCTURE = ["Hook", "Situation", "Twist", "Schlussbild"] as const;
export const SERIES_CLIP_TARGET = { from: 6, to: 9 } as const;

/**
 * The loops (Admin › Marketing › Countdown, unten): what drives each, its status, and its numbers (lib/admin/metrics.ts marketingLoops). The status
 * of "Host wirbt Host" follows its switch (config/policies.ts HOST_REFERRAL): built but off = "vorbereitet".
 */
export const MARKETING_LOOPS = [
  { key: "guestToHost", label: "Gast wird Host" },
  { key: "guestBringsGuests", label: "Gast bringt Gäste" },
  { key: "hostRecruitsHost", label: "Host wirbt Host" },
] as const;
export type MarketingLoopKey = (typeof MARKETING_LOOPS)[number]["key"];

// The House's arc (Bogen) – the one place for its timeline (CLAUDE.md "Bogen"). Structure only: the words are in lib/i18n/en.ts (house.arc.*),
// the schedule is computed in lib/arc.ts (local time of the House, at most one Simpulo card per day, mutable, every step skippable).

/** The five phases, in order – the "Arc" bar on top of the Plan tab. */
export const ARC_PHASES = ["before", "arrival", "together", "goodbye", "after"] as const;
export type ArcPhase = (typeof ARC_PHASES)[number];

/** Who a step is for: a guest, a host who shares the rent (no host fee), a host who leads the House (a host fee – Pro). */
export type ArcAudience = "guest" | "hostShare" | "hostPro";
/** Where a step reaches people: a card in the House chat (sender "Simpulo"), the House area, an email (mock: the Dev log). */
export type ArcChannel = "card" | "area" | "email";
/** The House area's tab that keeps the step's result (and that the card opens). */
export type ArcTab = "chat" | "crew" | "plan" | "moments" | "me" | "manage";

/**
 * Visibility (Regel, CLAUDE.md "Bogen › Sichtbarkeit"): what happens with a step's content.
 * - spoken: said out loud in the House – nothing is stored, only that the step was done
 * - private: only the person sees it (their intention, who they'd live with again)
 * - crew: the House's crew sees it (moments, the agreement)
 * - public: shown outside the House only with the person's explicit consent
 * Simpulo itself only ever reads signals (card seen, action done, skipped – config/data-points.ts arc.*), never free text.
 */
export type ArcVisibility = "spoken" | "private" | "crew" | "public";

/**
 * When a step is due, relative to the House (in the House's local time):
 * - paid: right after the viewer's share is paid
 * - day: `day` days from the first day (1 = the first day, -7 = a week before, `fromEnd` counts back from the last day: 0 = the last day),
 *   at `hour` local time
 * - daily: every day of the stay at `hour` – the quietest kind: it only fills days without another card
 * - half: the middle of the stay · peak: the high point (70 % in)
 * - after: `days` days after the last day
 */
export type ArcWhen =
  | { at: "paid" }
  | { at: "day"; day: number; hour: number; fromEnd?: boolean }
  | { at: "daily"; hour: number }
  | { at: "half"; hour: number }
  | { at: "peak"; hour: number }
  | { at: "after"; days: number; hour: number };

/** What the card's button does in the tab: open it, write (a text kept as `visibility` says), vote, add a moment, talk (spoken). */
export type ArcAction = "open" | "write" | "vote" | "moment" | "talk";

export interface ArcStep {
  id: string;
  phase: ArcPhase;
  when: ArcWhen;
  audience: readonly ArcAudience[];
  channels: readonly ArcChannel[];
  tab: ArcTab;
  action: ArcAction;
  visibility: ArcVisibility;
  /**
   * Several due on one day (Regel "one card a day"): the more important step wins – the higher priority; the others move to the next free day
   * inside their phase (daily ones are dropped). Order of importance: first night · closing round 100 > arriving 95 > welcome · agreement ·
   * again 90 > hostCheckIn 88 > intention · practical 85 > gettingThere 80 > highlight 75 > halftime 70 > thirtyDays 60 > moment of the day 10.
   */
  priority: number;
  /**
   * The one exception to "one card a day" (Regel): the first evening's card has a slot of its own, so the arrival day can carry both
   * "I'm here" (morning) and "First night" (19:00). No other step may set it.
   */
  ownSlot?: true;
}

const ALL: readonly ArcAudience[] = ["guest", "hostShare", "hostPro"];
const GUESTS: readonly ArcAudience[] = ["guest", "hostShare"];

/** The timeline. Ids are stable (progress and signals are stored by them). */
export const ARC_STEPS: readonly ArcStep[] = [
  { id: "welcome", phase: "before", when: { at: "paid" }, audience: ALL, channels: ["card", "area", "email"], tab: "crew", action: "open", visibility: "crew", priority: 90 },
  // Right after paying: the intention – one question (skippable) and two optional ones; the crew sees it, never public, never analysed.
  { id: "intention", phase: "before", when: { at: "paid" }, audience: ALL, channels: ["card", "area", "email"], tab: "me", action: "write", visibility: "crew", priority: 85 },
  // A week before: how everyone gets there (Plan › Getting there) – nothing is booked.
  { id: "gettingThere", phase: "before", when: { at: "day", day: -7, hour: 10 }, audience: ALL, channels: ["card", "area", "email"], tab: "plan", action: "write", visibility: "crew", priority: 80 },
  // The host, five days before: check-in, what to bring (and, Pro, the programme) – Manage › Host tasks.
  { id: "hostCheckIn", phase: "before", when: { at: "day", day: -5, hour: 10 }, audience: ["hostShare", "hostPro"], channels: ["card", "area", "email"], tab: "manage", action: "write", visibility: "crew", priority: 88 },
  // Two days before: the exact address, check-in, House rules, what to bring (Plan › Practical).
  { id: "practical", phase: "before", when: { at: "day", day: -2, hour: 10 }, audience: ALL, channels: ["card", "area", "email"], tab: "plan", action: "open", visibility: "crew", priority: 85 },
  // Day 1: "I'm here" – the crew sees who has arrived.
  { id: "arrive", phase: "arrival", when: { at: "day", day: 1, hour: 10 }, audience: ALL, channels: ["card", "area"], tab: "plan", action: "open", visibility: "crew", priority: 95 },
  // Day 1, 19:00 local (or when the host starts it): the question cards – asked out loud, nothing saved.
  { id: "firstNight", phase: "arrival", when: { at: "day", day: 1, hour: 19 }, audience: ALL, channels: ["card", "area"], tab: "plan", action: "talk", visibility: "spoken", priority: 100, ownSlot: true },
  // Day 1–2: the House agreement – three votes in one card, one option preset each, the result after AGREEMENT_HOURS.
  { id: "agreement", phase: "arrival", when: { at: "day", day: 2, hour: 11 }, audience: ALL, channels: ["card", "area"], tab: "plan", action: "vote", visibility: "crew", priority: 90 },
  // Every day without another card: a small proposal for tomorrow to vote on (DAY_MOMENTS by theme) – the agreed ones go into Plan › Rhythm.
  { id: "moment", phase: "together", when: { at: "daily", hour: 18 }, audience: ALL, channels: ["card"], tab: "plan", action: "vote", visibility: "crew", priority: 10 },
  // Halftime: private – how close you are to your intention (1–5) and what would help; a Pro host sees only the anonymous average.
  { id: "halftime", phase: "together", when: { at: "half", hour: 18 }, audience: GUESTS, channels: ["card", "area"], tab: "me", action: "write", visibility: "private", priority: 70 },
  // The high point (second half): a Pro host sets their own (then no proposal), everyone else votes on a proposal by theme (PEAK_IDEAS).
  { id: "peakPlan", phase: "together", when: { at: "half", hour: 10 }, audience: ["hostPro"], channels: ["card", "area"], tab: "plan", action: "write", visibility: "crew", priority: 75 },
  { id: "peakVote", phase: "together", when: { at: "peak", hour: 10 }, audience: GUESTS, channels: ["card", "area"], tab: "plan", action: "vote", visibility: "crew", priority: 75 },
  { id: "closing", phase: "goodbye", when: { at: "day", day: -1, hour: 19, fromEnd: true }, audience: ALL, channels: ["card", "area"], tab: "plan", action: "talk", visibility: "spoken", priority: 100 },
  { id: "again", phase: "after", when: { at: "after", days: 1, hour: 10 }, audience: ALL, channels: ["card", "area", "email"], tab: "me", action: "write", visibility: "private", priority: 90 },
  { id: "thirtyDays", phase: "after", when: { at: "after", days: 30, hour: 10 }, audience: ALL, channels: ["card", "area", "email"], tab: "me", action: "write", visibility: "private", priority: 60 },
];

/**
 * At most this many Simpulo cards per House and local day (Regel). A card that has to move stays inside its phase (lib/arc.ts): a step that
 * finds no free day there is left out – a short House gets fewer cards, never a halftime after the goodbye.
 */
export const ARC_CARDS_PER_DAY = 1;

/** Dev menu "House day": the range of the simulated day relative to the House (1 = its first day). */
export const ARC_SIM_DAYS = { from: -7, to: 30 } as const;

/** Plan › Practical: the exact address shows this many days before the first day (and only after paying; the host always). */
export const ADDRESS_DAYS_BEFORE = 2;

/**
 * The host's tasks (Manage › Host tasks), in order: a Share host has three, a Pro host also the programme. One is active at a time – the
 * first not done. `step`: the arc step that reminds of it (a card to the host); `field`: done when the host filled it in, else when the step
 * is done. Due: like the step (lib/arc.ts).
 */
export interface HostTask {
  id: "checkIn" | "programme" | "welcome" | "agreement";
  step: string;
  pro?: true;
  /** Can be left out (it counts as done once skipped) */
  optional?: true;
  /** Done when the host filled it in */
  field?: "checkIn" | "programme";
}
/**
 * The host's tasks (Manage › Host tasks), in order. A Share host: 1 check-in info · 2 a welcome message (optional, from a template) · 3
 * confirm the House agreement; a Pro host also the daily programme. One is active at a time – the first not done (or skipped).
 */
export const HOST_TASKS: readonly HostTask[] = [
  { id: "checkIn", step: "hostCheckIn", field: "checkIn" },
  { id: "programme", step: "hostCheckIn", pro: true, field: "programme" },
  { id: "welcome", step: "arrive", optional: true },
  { id: "agreement", step: "agreement" },
];

/** The House agreement (step "agreement"): three questions, one option preset each; whoever doesn't vote leaves the preset (Regel). */
export const AGREEMENT_QUESTIONS = [
  { id: "quiet", options: ["22", "23", "24"], preset: "23" },
  { id: "cooking", options: ["together", "sometimes", "own"], preset: "sometimes" },
  { id: "friends", options: ["fine", "ask", "no"], preset: "ask" },
] as const;
export type AgreementQuestionId = (typeof AGREEMENT_QUESTIONS)[number]["id"];
/** The votes close this many hours after the card (its due moment); then the result stands. */
export const AGREEMENT_HOURS = 24;

/** Themes (Stay.vibe) as the arc's suggestions know them; anything else uses the general ones. */
type Theme = "fitness" | "surf-water" | "remote-work" | "founder" | "creator" | "wellness" | "adventure" | "culture" | "party" | "holiday" | "social" | "students";

/**
 * The moment of the day: small proposals for tomorrow, by theme, each at an hour (local) – words in en.ts house.dayMoments.<id>. A House
 * gets them in turn (its id picks where to start); the general ones fill in after the theme's.
 */
export const DAY_MOMENTS: Readonly<Record<Theme | "general", readonly { id: string; hour: number }[]>> = {
  general: [
    { id: "breakfast", hour: 9 },
    { id: "cookTogether", hour: 19 },
    { id: "sunset", hour: 18 },
    { id: "market", hour: 10 },
  ],
  fitness: [{ id: "morningSession", hour: 7 }, { id: "recoveryWalk", hour: 17 }],
  "surf-water": [{ id: "dawnPatrol", hour: 6 }, { id: "sunsetSwim", hour: 18 }],
  "remote-work": [{ id: "focusBlock", hour: 9 }, { id: "demoHour", hour: 17 }],
  founder: [{ id: "pitchPractice", hour: 18 }, { id: "walkingOneOnOnes", hour: 8 }],
  creator: [{ id: "shootWalk", hour: 17 }, { id: "feedbackRound", hour: 19 }],
  wellness: [{ id: "morningYoga", hour: 8 }, { id: "phoneFreeDinner", hour: 19 }],
  adventure: [{ id: "earlyHike", hour: 7 }, { id: "mapNight", hour: 20 }],
  culture: [{ id: "museumMorning", hour: 10 }, { id: "localDinner", hour: 20 }],
  party: [{ id: "lateBrunch", hour: 12 }, { id: "preDrinks", hour: 21 }],
  holiday: [{ id: "beachDay", hour: 11 }, { id: "boardGames", hour: 20 }],
  social: [{ id: "potluck", hour: 19 }, { id: "gameNight", hour: 20 }],
  students: [{ id: "studySession", hour: 10 }, { id: "cheapEats", hour: 19 }],
};

/** The high point: one shared activity for the second half, by theme – words in en.ts house.peakIdeas.<id>. */
export const PEAK_IDEAS: Readonly<Record<Theme | "general", readonly string[]>> = {
  general: ["dayTrip", "bigDinner"],
  fitness: ["miniRace"],
  "surf-water": ["boatTrip"],
  "remote-work": ["offlineDay"],
  founder: ["demoDay"],
  creator: ["showcase"],
  wellness: ["retreatDay"],
  adventure: ["summit"],
  culture: ["hostedNight"],
  party: ["houseParty"],
  holiday: ["islandDay"],
  social: ["longTable"],
  students: ["cityQuest"],
};

/** A proposal counts as agreed from this many "I'm in" (the moment goes into Plan › Rhythm). */
export const MOMENT_MIN_YES = 2;
/** Halftime: the Pro host sees the average only from this many answers (anonymous). */
export const HALFTIME_MIN_ANSWERS = 3;

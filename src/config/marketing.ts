// Admin › Launch › Marketing – the plan as data (Marketing-Plan, Stand 19.11.2026). German like every admin text; numbers and goals here,
// computed values in lib/admin/metrics.ts (marketing*). Only what the plan says – what isn't filled in yet stays empty and the page says so.

/** The one sentence on top of the plan. */
export const MARKETING_CORE = "Ein gefülltes, bezahltes House mit einem Host, der ein eigenes Publikum hat.";

/** The ladder: filled Houses (full real Houses, lib/admin/metrics.ts marketingFilledHouses) – 1 → 5 → 50+. */
export const MARKETING_STAGES = [
  { key: "one", target: 1, label: "Erstes House" },
  { key: "five", target: 5, label: "5 gefüllte" },
  { key: "fifty", target: 50, label: "50+ und Launch" },
] as const;

/** A channel's place right now. */
export type ChannelStatus = "now" | "later" | "no";
export const CHANNEL_STATUSES: readonly ChannelStatus[] = ["now", "later", "no"];

/**
 * The channels by leverage, 1–8, each with its classification and status. TODO: aus dem Marketing-Plan (Stand 19.11.2026) übernehmen –
 * the plan's channel list wasn't part of the brief, so nothing is made up here. Shape: { rank, name, note, status }.
 */
export const MARKETING_CHANNELS: readonly { rank: number; name: string; note: string; status: ChannelStatus }[] = [];

/** The timeline; `from` (YYYY-MM) is when a phase begins – the page marks the one today falls in. */
export const MARKETING_TIMELINE = [
  { key: "prepare", label: "Vorbereiten", when: "Nov–Jan", from: "2026-11" },
  { key: "first", label: "Erstes House", when: "Feb", from: "2027-02" },
  { key: "five", label: "5 gefüllte", when: "März–April", from: "2027-03" },
  { key: "launch", label: "50+ und Launch", when: "danach", from: "2027-05" },
] as const;

/** The next steps, ticked off on the page (AdminData.marketingSteps, logged). TODO: aus dem Marketing-Plan übernehmen – not in the brief. */
export const MARKETING_NEXT_STEPS: readonly { id: string; text: string }[] = [];

/** The funnel's assumptions, each as a share of the contacts written to (from – to). */
export const FUNNEL_ASSUMPTIONS = {
  replied: { from: 0.1, to: 0.15 },
  demo: { from: 0.05, to: 0.08 },
  house: { from: 0.02, to: 0.04 },
} as const;
/** "Die beste Nische bekommt die nächsten 500 Kontakte." */
export const NEXT_CONTACTS_FOR_BEST_NICHE = 500;
/** The projection: contacts needed for this many Houses at the current rate. */
export const PROJECTION_HOUSES = 50;
/** After the second follow-up: quiet. */
export const MAX_FOLLOW_UPS = 2;
/** The channels a contact can be on (the form's choices). */
export const CONTACT_CHANNELS = ["Instagram", "TikTok", "YouTube", "LinkedIn", "Twitch", "Website", "Andere"] as const;

/** Content › the shot list for a House. */
export const SHOT_LIST = ["Ankunft", "Rundgang", "Essen", "Arbeiten", "Abschied"] as const;
/** Content › the 2D series: the cast (4–5 types – TODO: aus dem Plan; not in the brief), the build of a clip, the clips before approaching hosts. */
export const SERIES_CAST: readonly string[] = [];
export const SERIES_CAST_SIZE = { from: 4, to: 5 } as const;
export const SERIES_STRUCTURE = ["Hook", "Situation", "Twist", "Schlussbild"] as const;
export const SERIES_CLIP_TARGET = { from: 6, to: 9 } as const;

/** The loops: whether the product has them yet; their number once it can be measured (lib/admin/metrics.ts marketingLoops). */
export const MARKETING_LOOPS = [
  { key: "guestToHost", label: "Gast wird Host", status: "product" },
  { key: "guestBringsGuests", label: "Gast bringt Gäste", status: "product" },
  { key: "hostRecruitsHost", label: "Host wirbt Host", status: "planned" },
] as const;
export type MarketingLoopKey = (typeof MARKETING_LOOPS)[number]["key"];

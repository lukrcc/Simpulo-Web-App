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
 * The channels by leverage, 1–8 (Marketing-Plan): name, its tools and status – jetzt · später · nein. Tools only where the plan names them;
 * `note` (the classification) only where the plan gives one – nothing is made up, an empty field simply isn't shown.
 */
export const MARKETING_CHANNELS: readonly { rank: number; name: string; tools: readonly string[]; note: string; status: ChannelStatus }[] = [
  { rank: 1, name: "Hosts direkt gewinnen", tools: [], note: "", status: "now" },
  { rank: 2, name: "House-Link als Werbemittel", tools: [], note: "", status: "now" },
  { rank: 3, name: "Echte Houses filmen", tools: [], note: "", status: "now" },
  { rank: 4, name: "Reels, TikTok, Shorts", tools: ["Instagram Reels", "TikTok", "YouTube Shorts"], note: "", status: "now" },
  { rank: 5, name: "Kleine Creator pro gefülltem House bezahlen", tools: [], note: "", status: "later" },
  { rank: 6, name: "SEO und KI-Suche", tools: [], note: "", status: "later" },
  { rank: 7, name: "Communities", tools: ["Skool", "Discord", "Reddit"], note: "", status: "now" },
  { rank: 8, name: "Bezahlte Anzeigen", tools: [], note: "", status: "no" },
];

/** The timeline; `from` (YYYY-MM) is when a phase begins – the page marks the one today falls in. */
export const MARKETING_TIMELINE = [
  { key: "prepare", label: "Vorbereiten", when: "Nov–Jan", from: "2026-11" },
  { key: "first", label: "Erstes House", when: "Feb", from: "2027-02" },
  { key: "five", label: "5 gefüllte", when: "März–April", from: "2027-03" },
  { key: "launch", label: "50+ und Launch", when: "danach", from: "2027-05" },
] as const;

/** The next steps (Marketing-Plan), ticked off on the page (AdminData.marketingSteps, logged); `due` as the plan says it. Ids stay stable. */
export const MARKETING_NEXT_STEPS: readonly { id: string; text: string; due: string }[] = [
  { id: "landing", text: "Landingpage öffentlich, Gründer-Abschnitt, Benachrichtigungsfeld", due: "bis Januar" },
  { id: "series", text: "Cast, 10 Skripte, 2D-Testfolge", due: "bis Januar" },
  { id: "communities", text: "In 2–3 Communities mitlesen, 15 Min. täglich", due: "ab jetzt" },
  { id: "contacts", text: "Kontaktliste und Erstnachricht pro Nische", due: "bis Januar" },
  { id: "loops", text: "House Memories und Gratis-Schleifen ins Produkt", due: "mit Firebase" },
  { id: "partner", text: "Einen Partner für das erste House gewinnen", due: "Februar" },
];

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
/** Content › the 2D series: the cast (4–5 types – they come with the next step "Cast, 10 Skripte, 2D-Testfolge"), the build of a clip, the clips before approaching hosts. */
export const SERIES_CAST: readonly string[] = [];
export const SERIES_CAST_SIZE = { from: 4, to: 5 } as const;
export const SERIES_STRUCTURE = ["Hook", "Situation", "Twist", "Schlussbild"] as const;
export const SERIES_CLIP_TARGET = { from: 6, to: 9 } as const;

/**
 * The loops (Admin › Marketing › Schleifen): what drives each, its status, and its numbers (lib/admin/metrics.ts marketingLoops). The status
 * of "Host wirbt Host" follows its switch (config/policies.ts HOST_REFERRAL): built but off = "vorbereitet".
 */
export const MARKETING_LOOPS = [
  { key: "guestToHost", label: "Gast wird Host" },
  { key: "guestBringsGuests", label: "Gast bringt Gäste" },
  { key: "hostRecruitsHost", label: "Host wirbt Host" },
] as const;
export type MarketingLoopKey = (typeof MARKETING_LOOPS)[number]["key"];

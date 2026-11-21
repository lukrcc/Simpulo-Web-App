// /host and /about (CLAUDE.md "Host-Werbeseite", "About"): their sections, pictures and – for /about – the founder. Structure only; the
// interface words are in lib/i18n/en.ts (hostPage.*, aboutPage.*), the i18n rule. The founder's own words are content, not interface, so they
// live here – to be filled by the founder (until then the section shows a placeholder in dev and stays hidden elsewhere).
import type { FaqRole } from "./faq";

/** /host, top to bottom. */
export const HOST_PAGE_SECTIONS = ["stage", "how", "types", "example", "home", "founding", "safety", "faq", "cta"] as const;

/** "How hosting works" – four steps, an icon each (lucide). */
export const HOST_STEPS = [
  { id: "open", icon: "Plus" },
  { id: "crew", icon: "CalendarRange" },
  { id: "accept", icon: "UserCheck" },
  { id: "live", icon: "Sun" },
] as const;

/** Share or Pro: the rows of the comparison. */
export const HOST_TYPE_ROWS = ["fee", "tasks", "programme", "simpulo", "you"] as const;

/** Founding Hosts (pre-launch and beta – config/platform.ts showsFoundingHosts): what they get. */
export const FOUNDING_PERKS = [
  { id: "badge", icon: "BadgeCheck" },
  { id: "stage", icon: "Sparkles" },
  { id: "early", icon: "KeyRound" },
] as const;

/** Safety and support for hosts. */
export const HOST_SAFETY = [
  { id: "decide", icon: "UserCheck" },
  { id: "pay", icon: "Wallet" },
  { id: "help", icon: "LifeBuoy" },
  { id: "report", icon: "Flag" },
] as const;

/** The host FAQ on /host: six of the FAQ's own (config/faq.ts, words faq.items.<id>). */
export const HOST_PAGE_FAQ: readonly { role: FaqRole; id: string }[] = [
  { role: "host", id: "host-fees" },
  { role: "host", id: "host-money" },
  { role: "host", id: "not-full" },
  { role: "host", id: "who-joins" },
  { role: "host", id: "place-host" },
  { role: "host", id: "host-at-home" },
];

export const HOST_PAGE_IMAGES = { stage: "/destinations/palma-mallorca.jpg", home: "/destinations/lisbon.jpg" } as const;

/** /about: the three paragraphs of "Why Simpulo" and the three values (words aboutPage.why.<id>, aboutPage.values.<id>). */
export const ABOUT_WHY = ["time", "dense", "houses"] as const;
export const ABOUT_VALUES = ["private", "real", "network"] as const;

/**
 * The founder (/about). TODO(founder): fill in – the photo (a file in public/, e.g. "/about/founder.jpg"), the first name, two sentences in
 * the founder's own words and the email to write to. While `name` is null the section is a placeholder in dev and hidden everywhere else.
 */
export const FOUNDER: { name: string | null; photo: string | null; text: string | null; email: string | null } = {
  name: null,
  photo: null,
  text: null,
  email: null,
};

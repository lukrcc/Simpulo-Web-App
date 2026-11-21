// The programme builder for Pro hosts (CLAUDE.md "Programm-Baukasten"): structure only – the words of the templates are in lib/i18n/en.ts
// program.templates.<theme>.<key>. A Pro host = a House with a host fee (lib/arc.ts arcAudienceOf "hostPro").
import type { Vibe } from "@/lib/types";

/** The arc's moments a Pro host can set themselves – a programme item marked as one replaces Simpulo's card for it. */
export const PROGRAM_MOMENTS = ["kickoff", "peak", "closing"] as const;
export type ProgramMoment = (typeof PROGRAM_MOMENTS)[number];

/** Which of the arc's cards (config/arc.ts) a host's own moment replaces: no Simpulo card for them then. */
export const MOMENT_REPLACES: Record<ProgramMoment, readonly string[]> = {
  kickoff: ["firstNight"],
  peak: ["peakVote", "peakPlan"],
  closing: ["closing"],
};

/** Guests see the whole programme from this many days before the first day (with the address – config/arc.ts ADDRESS_DAYS_BEFORE); before, a preview. */
export const PROGRAM_FULL_DAYS_BEFORE = 2;
/** The preview (House page "What's planned", Plan before −2): at most this many items. */
export const PROGRAM_PREVIEW_ITEMS = 4;

/** Templates per theme: a day's items (time + key of its words). Applied to one day; the host changes them freely. */
export const PROGRAM_TEMPLATES: Partial<Record<Vibe, readonly { time: string; key: string }[]>> = {
  fitness: [
    { time: "07:00", key: "morningTraining" },
    { time: "12:30", key: "lunch" },
    { time: "18:00", key: "mobility" },
  ],
  founder: [
    { time: "09:00", key: "focus" },
    { time: "13:00", key: "standup" },
    { time: "14:00", key: "focus2" },
    { time: "19:00", key: "demo" },
  ],
  "surf-water": [
    { time: "06:30", key: "surf" },
    { time: "10:00", key: "breakfast" },
    { time: "16:00", key: "surf2" },
  ],
  "remote-work": [
    { time: "09:00", key: "deepWork" },
    { time: "12:30", key: "lunch" },
    { time: "17:30", key: "walk" },
  ],
  creator: [
    { time: "10:00", key: "shoot" },
    { time: "15:00", key: "edit" },
    { time: "19:30", key: "screening" },
  ],
  wellness: [
    { time: "07:30", key: "yoga" },
    { time: "12:00", key: "lunch" },
    { time: "18:00", key: "breathwork" },
  ],
};
/** Themes without a template of their own get this one. */
export const PROGRAM_TEMPLATE_DEFAULT: readonly { time: string; key: string }[] = [
  { time: "10:00", key: "together" },
  { time: "19:00", key: "dinner" },
];

/** After the House: the programme's average shows the host only from this many ratings (like AFTER_MIN_ANSWERS). */
export const PROGRAM_FEEDBACK_MIN = 3;

// The programme of a Pro host's House (CLAUDE.md "Programm-Baukasten"): the day plan, the host's own arc moments, what guests may see when,
// and the feedback after. Pure.
import { MOMENT_REPLACES, PROGRAM_FEEDBACK_MIN, PROGRAM_FULL_DAYS_BEFORE, PROGRAM_PREVIEW_ITEMS, type ProgramMoment } from "@/config/program";
import type { ProgramItem, Stay } from "./types";

const DAY_MS = 86_400_000;

/** A Pro host's House: one with a host fee. */
export const isProHouse = (stay: Pick<Stay, "hostFeePerPerson">) => Boolean(stay.hostFeePerPerson);

/** The House's days (1 = the first day … the last day). */
export function programDays(stay: Pick<Stay, "startDate" | "endDate">): number {
  return Math.max(1, Math.round((Date.parse(stay.endDate) - Date.parse(stay.startDate)) / DAY_MS) + 1);
}

/** The date of a House day (YYYY-MM-DD). */
export const programDate = (stay: Pick<Stay, "startDate">, day: number) => new Date(Date.parse(`${stay.startDate}T12:00:00Z`) + (day - 1) * DAY_MS).toISOString().slice(0, 10);

/** The items of one day, in the host's order. */
export const itemsOfDay = (stay: Pick<Stay, "program">, day: number): ProgramItem[] => (stay.program ?? []).filter((i) => i.day === day);

/** The arc's cards the host's own moments replace (config/program.ts MOMENT_REPLACES) – lib/arc.ts leaves them out. */
export function replacedArcSteps(stay: Pick<Stay, "program" | "hostFeePerPerson">): Set<string> {
  if (!isProHouse(stay)) return new Set();
  const moments = new Set((stay.program ?? []).flatMap((i) => (i.moment ? [i.moment] : [])));
  return new Set([...moments].flatMap((m) => MOMENT_REPLACES[m as ProgramMoment]));
}

/** Guests: the whole programme from PROGRAM_FULL_DAYS_BEFORE days before the first day; before that a preview. The host always sees all. */
export function programFull(stay: Pick<Stay, "startDate">, now: number, isHost: boolean): boolean {
  return isHost || now >= Date.parse(`${stay.startDate}T00:00:00Z`) - PROGRAM_FULL_DAYS_BEFORE * DAY_MS;
}

/** The preview ("What's planned"): the host's moments first, then the first items – titles only, no times or places. */
export function programPreview(stay: Pick<Stay, "program">): ProgramItem[] {
  const all = stay.program ?? [];
  const moments = all.filter((i) => i.moment);
  const rest = all.filter((i) => !i.moment);
  return [...moments, ...rest].slice(0, PROGRAM_PREVIEW_ITEMS);
}

export interface ProgramFeedback {
  count: number;
  /** Shown only from PROGRAM_FEEDBACK_MIN ratings */
  average: number | null;
  notes: string[];
}

/** The crew's feedback on the programme (ArcAfter.programme / programmeNote): the average from PROGRAM_FEEDBACK_MIN on, sentences without names. */
export function summarizeProgramme(rows: readonly { programme?: number; programmeNote?: string }[]): ProgramFeedback {
  const xs = rows.map((r) => r.programme).filter((x): x is number => typeof x === "number");
  const average = xs.length >= PROGRAM_FEEDBACK_MIN ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10 : null;
  return { count: xs.length, average, notes: rows.flatMap((r) => (r.programmeNote ? [r.programmeNote] : [])).toSorted() };
}

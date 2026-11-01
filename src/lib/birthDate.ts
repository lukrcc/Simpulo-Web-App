// Date of birth → age. The date stays private; profiles only ever show the age.
import { useSyncExternalStore } from "react";

export const MIN_AGE = 18;
/** Oldest year the Year select offers, counted back from today */
export const MAX_AGE = 100;

export interface DateParts {
  day: string;
  month: string;
  year: string;
}

export const partsOf = (iso: string | undefined): DateParts => {
  const [year = "", month = "", day = ""] = iso?.split("-") ?? [];
  return { year, month: month && String(Number(month)), day: day && String(Number(day)) };
};

/** "1996-05-14" – or null while incomplete or not a real day (31 April, 29 February in a non-leap year). */
export function isoOf({ day, month, year }: DateParts): string | null {
  if (!day || !month || !year) return null;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date.getUTCDate() !== Number(day) || date.getUTCMonth() !== Number(month) - 1) return null;
  return date.toISOString().slice(0, 10);
}

/** Full years between the two YYYY-MM-DD dates. */
export function ageOn(birthDate: string, today: string): number {
  const years = Number(today.slice(0, 4)) - Number(birthDate.slice(0, 4));
  return today.slice(5) < birthDate.slice(5) ? years - 1 : years;
}

const noSubscribe = () => () => {};
/** Today (UTC, YYYY-MM-DD) in the browser; null while rendering on the server – no server clock reads. */
export function useTodayIso(): string | null {
  return useSyncExternalStore(noSubscribe, () => new Date().toISOString().slice(0, 10), () => null);
}

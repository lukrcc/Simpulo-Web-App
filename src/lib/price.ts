// Prices of a House from the host's own place ("Host from your place", lib/types.ts Place) – pro rata from the host's rent.
//
// THE ONE ROUNDING RULE: every amount is computed unrounded and rounded once – where it is stored or shown as a price – to whole units of
// its currency, half up (Math.round). A window's rent is rounded from the exact pro-rata value; a person's share is then the stored
// (rounded) total divided by the crew, rounded again by the same rule – so shares × crew is never more than half a unit per person away
// from the total. Nothing rounds down or up on its own (no floor/ceil), and no amount is rounded twice in a row.
import type { Place } from "./types";
import { nightsBetween } from "./utils";

/** A month of rent covers this many nights: 365 / 12 (≈ 30.42) – the same for every month, so February isn't dearer per night than March. */
export const NIGHTS_PER_MONTH = 365 / 12;

/** The rounding rule above: whole units of the currency, half up. */
export const roundMoney = (amount: number): number => Math.round(amount);

/** The host's rent per night, unrounded (only ever an intermediate value). */
export const rentPerNight = (place: Pick<Place, "monthlyRent">): number => place.monthlyRent / NIGHTS_PER_MONTH;

/**
 * The rent of one window, pro rata by nights: monthly rent × nights / (365 / 12), rounded once (roundMoney). 0 without dates or rent.
 * In the place's currency.
 */
export function windowRent(place: Pick<Place, "monthlyRent">, startDate: string, endDate: string): number {
  if (!startDate || !endDate || !(place.monthlyRent > 0)) return 0;
  const nights = nightsBetween(startDate, endDate);
  return nights > 0 ? roundMoney(rentPerNight(place) * nights) : 0;
}

/** One person's equal share of a total (the host pays one too): total / crew, by the rounding rule. */
export function rentShare(total: number, crew: number): number {
  return crew > 0 && total > 0 ? roundMoney(total / crew) : 0;
}

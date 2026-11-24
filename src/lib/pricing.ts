// A House's price per person for guests – ONE function for cards, the Spotlight, the House page and the request (CLAUDE.md "Preis auf Karten –
// eine Zahl"). Always what a guest pays: the rent share plus Simpulo's service fee (lib/fees.ts guestFee – the same as the payment step), never
// a range and never "≈".
//   · fixed (the place is locked): the share + fee, exact in the House's currency;
//   · variable (found together): the price at the host's planned crew size – the middle of the host's budget per person + fee –, rounded to
//     whole tens of the viewer's currency, marked as an estimate ("€560 pp est.");
//   · the cap (variable only): `priceCap` + fee – "You never pay more than €X"; without one in the data, no cap.
import { guestFee } from "./fees";
import { convertApprox } from "./rates";
import type { Currency, Stay } from "./types";

export type PricedStay = Pick<Stay, "accommodationStatus" | "pricePerPerson" | "budgetPerPerson" | "currency"> & Partial<Pick<Stay, "priceCap">>;

export interface GuestPrice {
  /** Per person including the service fee, in the currency asked for */
  amount: number;
  /** A variable price: the estimate at the planned crew ("est.") */
  estimated: boolean;
  /** The most anyone pays (variable prices with a cap only), same currency */
  cap: number | null;
  currency: string;
}

/** Share + the guest's service fee, in the House's currency (unrounded share in, whole units out). */
const withFee = (share: number, currency: string) => Math.round(share + guestFee(share, currency));

/** An estimate rounded to whole tens (in large currencies – IDR, KRW – to three significant digits). */
function roundEstimate(amount: number): number {
  if (amount < 10_000) return Math.round(amount / 10) * 10;
  const step = 10 ** (Math.floor(Math.log10(amount)) - 2);
  return Math.round(amount / step) * step;
}

/**
 * The guest's price per person – in the House's currency, or converted to `to` (the viewer's). null while there's nothing to show yet
 * ("Price set with crew").
 */
export function guestPrice(stay: PricedStay, to?: Currency | string | null): GuestPrice | null {
  const code = to ?? stay.currency;
  const convert = (amount: number) => (code === stay.currency ? amount : convertApprox(amount, stay.currency, code as Currency));
  if (stay.accommodationStatus === "locked" && stay.pricePerPerson)
    return { amount: Math.round(convert(withFee(stay.pricePerPerson, stay.currency))), estimated: false, cap: null, currency: code };
  if (stay.budgetPerPerson) {
    const planned = (stay.budgetPerPerson.min + stay.budgetPerPerson.max) / 2;
    const cap = stay.priceCap ? Math.round(convert(withFee(stay.priceCap, stay.currency))) : null;
    return { amount: roundEstimate(convert(withFee(planned, stay.currency))), estimated: true, cap, currency: code };
  }
  return null;
}

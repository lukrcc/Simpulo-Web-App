// "Getting there" – how a crew travels to its House together. Not a place to live (config/accommodation.ts is that). Shown in Admin › Vision ›
// Places; nothing in the app yet.
//
// ⚠ Simpulo sells no flights or travel. Coordinating ("we take the same flight") is fine; selling or bundling transport with the House
// may make Simpulo the organiser of a package (Pauschalreise, §§ 651a ff. BGB / EU Package Travel Directive 2015/2302) or of linked travel
// arrangements (verbundene Reiseleistungen, § 651w BGB) – with liability and insolvency protection. That legal question is open: anything
// beyond "coordinate only" waits for a lawyer's answer ("partner, legal check first").
import type { PlacePhase, PriceLevel } from "./accommodation";

/** Shown in the admin as written (German, CLAUDE.md "Admin") */
export type TravelMode = "nur koordinieren" | "Partner" | "Partner, vorher rechtlich prüfen";
/** Travel adds "normal" (the fare everyone pays anyway) and "very high" to the price levels. */
export type TravelPrice = PriceLevel | "normal" | "very high";

export interface TravelOption {
  id: string;
  types: readonly string[];
  crew: { min: number; max: number };
  price: TravelPrice;
  phase: PlacePhase;
  mode: TravelMode;
}

export const TRAVEL_OPTIONS: readonly TravelOption[] = [
  {
    id: "together",
    types: ["derselbe Linienflug (Plätze zusammen)", "Zugabteil", "Nachtzug", "Fähre"],
    crew: { min: 4, max: 12 },
    price: "normal",
    phase: "soon",
    mode: "nur koordinieren",
  },
  { id: "transfer", types: ["geteilter Flughafentransfer (Van)"], crew: { min: 4, max: 12 }, price: "low", phase: "soon", mode: "Partner" },
  { id: "jet", types: ["Privatjet-Charter", "Empty Legs"], crew: { min: 4, max: 8 }, price: "very high", phase: "highlight", mode: "Partner, vorher rechtlich prüfen" },
];

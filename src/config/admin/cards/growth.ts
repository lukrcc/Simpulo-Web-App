import type { CardDef } from "./types";

/** Wachstum: Besucher · Anmeldungen · Anfragen · Herkunft · Bester Kanal · Kosten pro Buchung · Warteliste · Nutzung. */
export const GROWTH_CARDS: readonly CardDef[] = [
  { topic: "visitors", icon: "Eye", tab: "houses", main: "visitors", subs: ["lookedNotAsked", "topHouse"] },
  { topic: "signups", icon: "UserPlus", tab: "origin", focus: "signups", main: "signups", subs: ["visitors", "requests"] },
  { topic: "requests", icon: "Mail", tab: "origin", focus: "requests", main: "requests", subs: ["paid", "askToRequest"] },
  { topic: "origin", icon: "Compass", tab: "origin", main: "origin", subs: ["topRef", "valueToCost"] },
  { topic: "bestChannel", icon: "Star", tab: "origin", focus: "bestChannel", main: "bestChannel", subs: ["paid", "costs"] },
  { topic: "costPerBooking", icon: "Coins", tab: "origin", focus: "costPerBooking", main: "costPerBooking", subs: ["costs", "paid"] },
  { topic: "waitlist", icon: "Clock", tab: "waitlist", main: "waitlist", subs: ["signups"] },
  { topic: "usage", icon: "Smartphone", tab: "usage", main: "installs", subs: ["askToRequest", "askNote"] },
];

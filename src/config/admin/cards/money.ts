import type { CardDef } from "./types";

/**
 * Geld: Verlauf · Kosten · Gäste · Hosts · Zahlungen · Steuern · Entnahmen · Prognose · Einnahmequellen (nine, 3 × 3 – the sources: the
 * marketplace fee and every lab with status „Einnahme“, CLAUDE.md „Labore: Weg und Status“).
 */
export const MONEY_CARDS: readonly CardDef[] = [
  { topic: "history", icon: "BarChart3", tab: "history", main: "revenue", subs: ["profit", "bookingVolume"] },
  { topic: "costs", icon: "MinusCircle", tab: "costs", main: "costs", subs: ["stripeFees", "otherCosts"] },
  { topic: "guests", icon: "User", tab: "guests", main: "perGuest", subs: ["valuePerGuestYear", "refunds"] },
  { topic: "hosts", icon: "Home", tab: "hosts", main: "valuePerHostYear", subs: ["hostFeeShare", "proHosts"] },
  { topic: "payments", icon: "CreditCard", tab: "payments", main: "openPayouts", subs: ["paidOut", "paymentIssues"] },
  { topic: "taxes", icon: "Percent", tab: "taxes", main: "taxReserve", subs: ["nextDeadline", "deadlines"] },
  { topic: "withdrawals", icon: "ArrowUpRight", tab: "withdrawals", main: "withdrawals", subs: ["inCompany", "profitYear"] },
  { topic: "forecast", icon: "TrendingUp", tab: "forecast", main: "monthForecast", subs: ["forecastProfit", "takeRate"] },
  { topic: "sources", icon: "Coins", tab: "sources", main: "sources", subs: ["source-0", "source-1", "source-2"], target: false },
];

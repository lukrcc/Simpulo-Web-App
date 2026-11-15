// Texts in German – shown only in the admin.
// What we believe and want to prove (Admin › Data & Algorithm). The statement, how it's measured and the target live here; the current value
// and the verdict come from the data (getHypothesisResults in lib/data – mock values now).

export type HypothesisStatus = "open" | "supported" | "rejected";

export interface Hypothesis {
  id: string;
  statement: string;
  /** What is measured (unset: not defined yet) */
  metric?: string;
  /** The value that would support it (unset: not defined yet) */
  target?: string;
}

export const HYPOTHESES: readonly Hypothesis[] = [
  { id: "topicsFirst", statement: "Fitness-, Founder- und Creator-Houses werden zuerst voll", metric: "Median der Tage bis voll: diese drei gegen alle anderen", target: "≥ 30 % schneller" },
  { id: "proFaster", statement: "Pro Hosts füllen Houses schneller", metric: "Median der Tage bis voll: Pro gegen Share Hosts", target: "≥ 20 % schneller" },
  { id: "reservedFill", statement: "Houses mit 2+ Vormerkungen werden voll", metric: "Anteil der Houses mit 2+ Vormerkungen, die voll werden", target: "≥ 80 %" },
  { id: "peopleRebook", statement: "Gegenseitige „Your people“ führen zu mehr Wiederbuchungen", metric: "Wiederbuchungsquote mit gegen ohne gegenseitige Verbindung", target: "≥ 1,5×" },
  { id: "shortTrips", statement: "Kurztrips werden schneller voll als Houses für einen Monat", metric: "Median der Tage bis voll: ≤ 5 Nächte gegen 28+ Nächte", target: "≥ 25 % schneller" },
  { id: "tiktokConverts", statement: "Anmeldungen über TikTok werden öfter zu Anfragen als über Instagram", metric: "Anfragequote innerhalb von 60 Tagen, je Quelle", target: "≥ 1,2×" },
  { id: "creatorCollab", statement: "Creator-Collab-Houses bringen mehr Anmeldungen pro House als normale" },
  { id: "lowFeeYes", statement: "Eine niedrige Gebühr erhöht die Ja-Quote von Pro Hosts" },
];

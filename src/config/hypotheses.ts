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
  /** The statement shortened to at most eight words (Algorithmus › Thesen, the cards) */
  short: string;
  /** Set apart as a card (the null hypothesis) */
  highlight?: boolean;
}

export const HYPOTHESES: readonly Hypothesis[] = [
  { id: "topicsFirst", statement: "Fitness-, Founder- und Creator-Houses werden zuerst voll", metric: "Median der Tage bis voll: diese drei gegen alle anderen", target: "≥ 30 % schneller", short: "Fitness, Founder, Creator werden zuerst voll" },
  { id: "proFaster", statement: "Pro Hosts füllen Houses schneller", metric: "Median der Tage bis voll: Pro gegen Share Hosts", target: "≥ 20 % schneller", short: "Pro Hosts füllen schneller" },
  { id: "reservedFill", statement: "Houses mit 2+ Vormerkungen werden voll", metric: "Anteil der Houses mit 2+ Vormerkungen, die voll werden", target: "≥ 80 %", short: "2+ Vormerkungen werden voll" },
  { id: "peopleRebook", statement: "Gegenseitige „Your people“ führen zu mehr Wiederbuchungen", metric: "Wiederbuchungsquote mit gegen ohne gegenseitige Verbindung", target: "≥ 1,5×", short: "Your people buchen öfter wieder" },
  { id: "shortTrips", statement: "Kurztrips werden schneller voll als Houses für einen Monat", metric: "Median der Tage bis voll: ≤ 5 Nächte gegen 28+ Nächte", target: "≥ 25 % schneller", short: "Kurztrips werden schneller voll" },
  { id: "tiktokConverts", statement: "Anmeldungen über TikTok werden öfter zu Anfragen als über Instagram", metric: "Anfragequote innerhalb von 60 Tagen, je Quelle", target: "≥ 1,2×", short: "TikTok führt öfter zu Anfragen als Instagram" },
  { id: "creatorCollab", statement: "Creator-Collab-Houses bringen mehr Anmeldungen pro House als normale", short: "Creator-Collabs bringen mehr Anmeldungen" },
  { id: "lowFeeYes", statement: "Eine niedrige Gebühr erhöht die Ja-Quote von Pro Hosts", short: "Niedrige Gebühr, mehr Ja von Pro Hosts" },
  // Raum und Longevity (Vision › Der Hof › Fünf Regeln) – noch ohne Messung: Status offen, Balken leer
  { id: "tableMiddle", statement: "Ein Tisch in der Mitte verbindet mehr als ein Tisch am Rand", short: "Tisch in der Mitte verbindet mehr" },
  { id: "ownRooms", statement: "Eigene Zimmer verbinden mehr als geteilte", short: "Eigene Zimmer verbinden mehr als geteilte" },
  { id: "pathsMiddle", statement: "Wege durch die Mitte erhöhen die Verbindung, ohne das Wohlfühlen zu senken", short: "Wege durch die Mitte verbinden" },
  { id: "noRetreat", statement: "Ohne Rückzugsort sinkt das Wohlfühlen", short: "Ohne Rückzugsort sinkt das Wohlfühlen" },
  { id: "levelCourtyard", statement: "Eine Ebene mit hohen Decken und Innenhof verbindet mehr als mehrere Etagen", short: "Eine Ebene mit Innenhof verbindet mehr" },
  { id: "spaceNull", statement: "Nullhypothese: Der Raum ist fast egal, nur Crew und Bogen zählen", short: "Nullhypothese: Der Raum ist fast egal", highlight: true },
  { id: "longevityFill", statement: "Longevity-Houses füllen sich so schnell wie Fitness-Houses", short: "Longevity-Houses füllen so schnell wie Fitness" },
];

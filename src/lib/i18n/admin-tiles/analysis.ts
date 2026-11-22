// Admin › Analyse › Überblick: the tiles' words (label + ⓘ: one sentence – meaning and a good value). German.
export const TILES_ANALYSIS = {
  sweetSpot: { label: "Sweet Spot", info: "Die Kombination aus Thema, Länge, Crew und Host-Stufe, die nach dem gewählten Maßstab am besten läuft – nur mit 10+ Houses." },
  sweetLine: "{main} · {repeat} kommen wieder",
  best: { info: "Die beste Gruppe dieser Blickrichtung nach dem gewählten Maßstab, darunter die schwächste – nur Gruppen mit 10+ Houses." },
  bestLine: "{value} · schwächstes: {worst}",
  onlyOne: "{value} · zu wenig Gruppen",
  leader: {
    value: { label: "Bestes Thema · Wert", info: "Das Thema mit dem höchsten Wert pro Person und Jahr – gut ist ein deutlicher Abstand zum Rest." },
    connection: { label: "Bestes Thema · Verbindung", info: "Das Thema mit der höchsten Verbindungsrate (gegenseitiges „Mit dir wieder“) – gut sind ab 60 %." },
    repeat: { label: "Bestes Thema · Wiederkehr", info: "Das Thema mit den meisten Wiederkehrern (2+ Houses in 12 Monaten) – gut sind ab 25 %." },
    speed: { label: "Bestes Thema · Tempo", info: "Das Thema, dessen Houses am schnellsten voll werden (Median Tage bis voll) – weniger ist besser." },
  },
  perHouse: { label: "Pro vollem House", info: "Was Simpulo je vollem House im Monat behält, gegen den Vormonat – gut ist ein Plus." },
  houses: { label: "Houses (12 Monate)", info: "Houses, die in den letzten 12 Monaten begonnen haben – die Grundlage jeder Zahl hier." },
  tooFew: { label: "Zu wenig Daten", info: "Gruppen über alle Blickrichtungen mit weniger als 10 Houses (grau in den Tabs) – gut ist, wenn es weniger werden." },
  tooFewLine: "von {count} Gruppen",
  none: "–",
  /** The detail lines under the numbers */
  d: {
    housesBooking: "{houses} Houses · {perBooking} pro Buchung",
    bestValue: "{value} · {houses} Houses",
    worst: "am Ende: {name} · {value}",
    onlyOne: "zu wenig Gruppen für einen Vergleich",
    groups: "{count} Gruppen, {few} zu klein",
    leaderValue: "{value} · {houses} Houses",
    second: "danach: {name} · {value}",
    fullMonth: "volle Houses diesen Monat {count}",
    profitMonth: "Gewinn diesen Monat {profit}",
    lengths: "Kurz {short} · Mittel {mid} · Lang {long}",
    biggest: "größtes Thema: {name} ({count})",
    sparse: "zu klein: {few} von {count} Gruppen",
  },
} as const;

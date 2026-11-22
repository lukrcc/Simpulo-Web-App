// Admin › Vision › Überblick: the tiles' words (label · ⓘ one sentence: meaning + a good value). German.
export const TILES_VISION = {
  phase: { label: "Phase", info: "Wo Simpulo auf dem Weg der vier Phasen steht – öffnet die Zeitleiste.", value: "{n} von {total}" },
  map: { label: "Bausteine", info: "Warum · Wie · Wohin als Karte aus Bausteinen – öffnet die Karte.", value: "{n}" },
  market: { label: "Gesamtmarkt", info: "Der Markt für Zusammenleben auf Zeit pro Jahr (Schätzung) – öffnet die Zielgruppen." },
  leader: { label: "Kategorie-Führer", info: "Was ein Kategorie-Führer mit 5–10 % davon umsetzt (Schätzung) – öffnet das Kontinuum." },
  today: { label: "Simpulo heute", info: "Simpulos Umsatz der letzten 12 Monate – öffnet das T-Modell." },
  core: { label: "Kern", info: "Gegenseitiges „Mit dir wieder“ der Crew-Paare – der Beweis, dass Zeit wirkt; gut sind 60 %." },
  segments: { label: "Zielgruppen", info: "Die Gruppen, für die Simpulo gebaut wird – öffnet ihre Marktspannen.", value: "{n}" },
  hosts: { label: "Hosts", info: "Hosts mit echten Houses, davon Pro – öffnet Hosts in der Vision.", extra: "davon {pro} Pro" },
  places: { label: "Orte & Anreise", info: "Kategorien von Orten, nach Phase geordnet – öffnet Orte & Anreise.", extra: "Arten von Orten" },
  tech: { label: "Technik", info: "Anbieter und ihr Anteil am Umsatz der letzten 12 Monate – gut ist unter 5 % je Anbieter.", extra: "{share} vom Umsatz", extraNone: "noch nicht messbar" },
  algorithm: { label: "Algorithmus", info: "Modelle, die aus den Daten lernen – öffnet Admin › Algorithmus.", extra: "Modelle" },
  continuum: { label: "Kontinuum", info: "Einnahmequellen vom Wochenende bis zum Hof – öffnet das Kontinuum.", extra: "Quellen" },
  roadmap: { label: "Roadmap", info: "Stufen von heute bis zur Börse – öffnet die Roadmap.", extra: "Stufen" },
  location: { label: "Standort", info: "Das Land für die Firma – offen, bis entschieden; öffnet Standort.", open: "offen" },
  funding: { label: "Finanzierung", info: "Kriterien der Bereitschaft für die erste Runde – öffnet Admin › Finanzierung.", value: "{met} / {total}", extra: "Kriterien erfüllt" },
} as const;

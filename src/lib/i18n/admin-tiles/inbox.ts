// Admin › Aufgaben › Überblick: the tiles' words – label and ⓘ (one sentence: meaning + a good value). German.
export const TILES_INBOX = {
  all: { label: "Alle offen", info: "Alle offenen Aufgaben aus allen Bereichen – gut ist 0." },
  houses: { label: "Houses", info: "Houses, die Hilfe brauchen (mit empfohlenem Hebel) – gut ist 0." },
  hosts: { label: "Hosts", info: "Bewerbungen, Anchor-Vorschläge, Host-Warnungen und Partner-Schritte – gut ist 0." },
  applications: { label: "Bewerbungen", info: "Neue Host-Bewerbungen ohne Entscheidung – gut ist, jede binnen 2 Tagen zu beantworten." },
  anchor: { label: "Anchor-Vorschläge", info: "Hosts, für die die Regeln Anchor vorschlagen und die noch nicht bestätigt sind." },
  safety: { label: "Sicherheit", info: "Meldungen, Widersprüche und Sicherheitstickets – gut ist 0, jede binnen 24 h." },
  reports: { label: "Meldungen", info: "Gemeldete Inhalte und Widersprüche ohne Entscheidung – gut ist 0." },
  money: { label: "Geld", info: "Fehlgeschlagene Zahlungen und Steuerfristen – gut ist 0." },
  deadlines: { label: "Fristen", info: "Steuerfristen in den nächsten 7 Tagen – gut ist, sie früh abzuhaken." },
  questions: { label: "Fragen", info: "Offene Support-Tickets (Fragen, Kaputt, Ideen) – gut ist, jede binnen 24 h zu beantworten." },
  oldest: { label: "Älteste offen", info: "Seit wie vielen Tagen die älteste offene Aufgabe wartet – gut sind höchstens 2 Tage." },
  oldestValue: "{days, plural, one {# Tag} other {# Tage}}",
  done: { label: "Erledigt", info: "Erledigte Aufgaben und beantwortete Tickets – zum Nachschauen." },
} as const;

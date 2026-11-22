// Admin › Algorithmus › Überblick: label and ⓘ (one sentence: meaning + a good value) per tile. German.
export const TILES_DATA = {
  points: { label: "Datenpunkte", info: "Alle Datenpunkte, die Simpulo erfassen darf (config/data-points.ts) – jeder neue steht zuerst dort." },
  used: { label: "Genutzt", info: "Datenpunkte, die ein Modell schon liest – je mehr, desto mehr lernt Simpulo aus seinen Daten." },
  collecting: { label: "Wird erfasst", info: "Datenpunkte, die gesammelt, aber noch von keinem Modell gelesen werden." },
  planned: { label: "Geplant", info: "Datenpunkte, die beschrieben, aber noch nicht gebaut sind." },
  moments: { label: "Momente", info: "Die Stellen im Ablauf, an denen Daten entstehen (Onboarding bis Support)." },
  models: { label: "Modelle", info: "Die Modelle, die aus den Daten Entscheidungen machen (config/models.ts)." },
  idea: { label: "Modelle · Idee", info: "Modelle, die nur beschrieben sind – noch keine Regeln, kein Training." },
  rules: { label: "Modelle · Regeln", info: "Modelle, die heute mit festen Regeln laufen – der Schritt vor dem Training." },
  trained: { label: "Modelle · trainiert", info: "Modelle, die aus Daten gelernt haben – das Ziel für jedes Modell." },
  decisions: { label: "Entscheidungen", info: "Was die Modelle steuern: Explore-Reihen, Vorschläge an Hosts, Do it again …" },
  theses: { label: "Thesen", info: "Annahmen mit Messgröße und Zielwert (config/hypotheses.ts)." },
  supported: { label: "Bestätigt", info: "Thesen, die die Daten bestätigen – gut ist, wenn es mehr werden." },
  open: { label: "Offen", info: "Thesen ohne Urteil – meist, weil die Daten noch fehlen." },
  rejected: { label: "Widerlegt", info: "Thesen, die die Daten widerlegen – auch ein Ergebnis: dann ändert sich der Plan." },
  never: { label: "Nie erfasst", info: "Was Simpulo nie erfasst (Gesundheit, Gesprochenes, Kameras …) – diese Liste wächst nur." },
  ofAll: "von {total}",
} as const;

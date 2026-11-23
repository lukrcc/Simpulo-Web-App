// Admin › Vision › Schichten: the map "Vier Schichten" as data (German, admin only). Left the four layers from the bottom up – each with its
// status (heute · nächstes · später), its parts, the proof that comes next and its building blocks (the detail field on a click);
// right the continuum (1 night … years), each stop belonging to a layer; under them, small, the flywheel. The layers are marked as the two
// engines (growth: layers 1–3, Simpulo Tech · return: layer 4, Simpulo Places – the line about them lives in Finanzierung › Firmenstruktur). The numbers of today come from lib/admin/metrics.ts (visionLayerNumbers) – never from here.

export type LayerKey = "marketplace" | "infrastructure" | "space" | "places";
export type LayerStatus = "now" | "next" | "later";

export interface VisionLayer {
  key: LayerKey;
  no: 1 | 2 | 3 | 4;
  title: string;
  /** What belongs to it, short */
  parts: readonly string[];
  /** One more line under the parts (optional) */
  note?: string;
  status: LayerStatus;
  /** The label of today's number (the value from metrics.ts) */
  metric: string;
  /** The next proof, one sentence */
  proof: string;
  /** Which engine it drives (Firmenstruktur › Zwei Motoren) */
  engine: "growth" | "return";
  /** Vision's building blocks of this layer (config/vision.ts BLOCK_MAP ids) – the detail field lists them, a click zooms in */
  blocks: readonly string[];
  /** One more way on: a capsule of Vision or a page (e.g. Finanzierung › Zwei Motoren) */
  link?: { label: string; href: string };
}

export const VISION_LAYERS: readonly VisionLayer[] = [
  {
    key: "marketplace",
    no: 1,
    title: "Marktplatz",
    parts: ["Houses eröffnen", "anfragen", "zahlen"],
    status: "now",
    metric: "Offene Houses",
    proof: "50 echte Houses in 2–3 Hubs, 60 % mit 2+ Vormerkungen.",
    engine: "growth",
    blocks: ["tModel"],
    link: { label: "Markt →", href: "/admin/vision?tab=market" },
  },
  {
    key: "infrastructure",
    no: 2,
    title: "Verbindungs-Infrastruktur",
    parts: ["Crew-Matching", "Bogen", "Vertrauen", "Daten"],
    note: "zuerst intern, dann für andere",
    status: "next",
    metric: "Verbindungsrate",
    proof: "60 % gegenseitige Wahl über drei Monate in Folge.",
    engine: "growth",
    blocks: ["core"],
  },
  {
    key: "space",
    no: 3,
    title: "Raum-Standard",
    parts: ["Muster", "Certified", "Entwurf für Partner"],
    status: "later",
    metric: "Houses mit Raum-Daten",
    proof: "Raum-Daten aus genug Houses zeigen, welcher Raum Verbindung stärkt.",
    engine: "growth",
    blocks: ["places"],
    link: { label: "Labore › Raum › Architektur →", href: "/admin/labore?tab=labs&focus=space&view=architecture" },
  },
  {
    key: "places",
    no: 4,
    title: "Simpulo Places",
    parts: ["Orte nach Hof-Muster"],
    note: "Besitz über Places, Partner, Fonds",
    status: "later",
    metric: "Freigabe",
    proof: "12 Monate über 80 % Auslastung vor dem ersten Bau.",
    engine: "return",
    blocks: ["hof"],
    link: { label: "Firmenstruktur › Zwei Motoren →", href: "/admin/funding?tab=structure&focus=motors" },
  },
];

/** The continuum (right): from one night to living – each stop belongs to a layer (its colour). Bottom → top. */
export const VISION_CONTINUUM: readonly { key: string; label: string; layer: LayerKey }[] = [
  { key: "night", label: "1 Nacht", layer: "marketplace" },
  { key: "weeks", label: "1–4 Wochen", layer: "marketplace" },
  { key: "months", label: "Monate", layer: "infrastructure" },
  { key: "years", label: "Jahre / Wohnen", layer: "places" },
];

/** The flywheel (bottom), in order – the last one feeds the first again. */
export const VISION_FLYWHEEL: readonly string[] = ["mehr Houses", "mehr Daten", "bessere Crews", "mehr Verbindung", "bessere Orte", "mehr Nachfrage"];

export const VISION_LAYERS_TEXT = {
  label: "Vier Schichten",
  status: { now: "heute", next: "nächstes", later: "später" } satisfies Record<LayerStatus, string>,
  proof: "Nächster Beweis",
  today: "Heute",
  continuum: "Kontinuum",
  flywheel: "Schwungrad",
  engines: { growth: "Wachstum · Tech", return: "Rendite · Places" },
  detail: "Bausteine dieser Schicht",
  noBlocks: "Noch kein eigener Baustein.",
  open: "Schicht {no} öffnen: {title}",
  release: "{months} von {of} Monaten über {percent} %",
  spaceOf: "{with} von {all}",
} as const;

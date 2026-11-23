import type { CardDef } from "./types";

/** Vision: Schichten · Verbindung · Kontinuum · Markt · Zielgruppen · Roadmap · Standort · Finanzierung (→ Finanzierung). */
export const VISION_CARDS: readonly CardDef[] = [
  { topic: "layers", icon: "Layers", tab: "layers", main: "layers", subs: ["nextLayer", "release"] },
  { topic: "connection", icon: "HeartHandshake", tab: "layers", focus: "infrastructure", main: "connection", subs: ["layer"] },
  { topic: "continuum", icon: "Infinity", tab: "continuum", main: "continuum", subs: ["live", "idea"] },
  { topic: "market", icon: "Globe", tab: "market", main: "market", subs: ["leader", "today12"] },
  { topic: "segments", icon: "Users", tab: "segments", main: "segments", subs: ["segmentsNow"] },
  { topic: "roadmap", icon: "Map", tab: "roadmap", main: "roadmap", subs: ["nextStage"] },
  { topic: "location", icon: "MapPin", tab: "location", main: "location", subs: ["candidates"] },
  { topic: "funding", icon: "Landmark", tab: "", href: "/admin/funding", main: "funding", subs: ["met", "open"] },
];

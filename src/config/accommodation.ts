// The kind of place a House is in (accommodation type) – the one list. Categories with their types, typical crew size, price level, phase
// (when Simpulo brings them) and whether people sleep there. Read by the admin (Houses › Type, "By type", Vision › Places); Open a House
// asks for it in its own prompt – the app shows nothing of it yet. Content exactly as the founders' brief; `topics` is not set yet.
import type { Vibe } from "@/lib/types";

export const PLACE_PHASES = ["launch", "soon", "later", "highlight", "abroad"] as const;
export type PlacePhase = (typeof PLACE_PHASES)[number];
export const PLACE_PHASE_LABEL: Record<PlacePhase, string> = { launch: "Launch", soon: "Soon", later: "Later", highlight: "Highlight", abroad: "Abroad" };

/** As in the brief: low · mid · high, and the two spans it names ("mid–high", "mixed") */
export type PriceLevel = "low" | "mid" | "high" | "mid-high" | "mixed";
export const PRICE_LABEL: Record<PriceLevel, string> = { low: "low", mid: "mid", high: "high", "mid-high": "mid–high", mixed: "mixed" };

export interface AccommodationCategory {
  id: string;
  label: string;
  /** Its types: id (stored on the House) and label */
  types: readonly { id: string; label: string }[];
  /** Typical crew size, host included */
  crew: { min: number; max: number };
  price: PriceLevel;
  /** Topics it suits (config/explore.ts categories) – not set yet: the brief names the field, not its values */
  topics: readonly Vibe[];
  phase: PlacePhase;
  /** false: a day place – nobody sleeps there */
  overnight: boolean;
}

const types = (...labels: string[]) => labels.map((label) => ({ id: label.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), label }));

export const ACCOMMODATION_CATEGORIES = [
  { id: "classic", label: "Classic", types: types("villa", "house", "townhouse", "large apartment", "penthouse", "beach house", "country house", "finca"), crew: { min: 4, max: 12 }, price: "mid-high", topics: [], phase: "launch", overnight: true },
  { id: "liveWork", label: "Live & work", types: types("coliving", "coworking with rooms", "serviced apartments", "aparthotel"), crew: { min: 4, max: 20 }, price: "mid", topics: [], phase: "launch", overnight: true },
  { id: "buyout", label: "Whole buyout", types: types("guesthouse", "B&B", "pension", "boutique hotel", "hostel floor", "whole hostel"), crew: { min: 8, max: 30 }, price: "mixed", topics: [], phase: "launch", overnight: true },
  { id: "regional", label: "Regional", types: types("riad", "ryokan", "agriturismo", "pousada", "casa rural"), crew: { min: 6, max: 16 }, price: "mid", topics: [], phase: "later", overnight: true },
  { id: "nature", label: "Nature", types: types("chalet", "mountain hut", "cabin", "lodge", "eco-lodge", "treehouse", "yurt", "glamping", "tiny house village"), crew: { min: 4, max: 14 }, price: "mid", topics: [], phase: "later", overnight: true },
  { id: "farm", label: "Farm & estate", types: types("farm", "vineyard", "estate", "olive grove"), crew: { min: 6, max: 20 }, price: "mid", topics: [], phase: "later", overnight: true },
  { id: "water", label: "Water", types: types("sailboat", "catamaran", "gulet", "houseboat", "river boat", "liveaboard"), crew: { min: 4, max: 12 }, price: "high", topics: [], phase: "highlight", overnight: true },
  { id: "special", label: "Special", types: types("castle", "manor", "monastery", "lighthouse", "old mill", "converted school"), crew: { min: 8, max: 30 }, price: "high", topics: [], phase: "highlight", overnight: true },
  { id: "program", label: "Program venue", types: types("retreat center", "surf camp", "training camp", "dive center", "yoga shala", "climbing lodge"), crew: { min: 8, max: 30 }, price: "mid", topics: [], phase: "launch", overnight: true },
  { id: "road", label: "On the road", types: types("campervan convoy", "road trip", "sleeper train"), crew: { min: 4, max: 10 }, price: "mid", topics: [], phase: "later", overnight: true },
  { id: "budget", label: "Budget", types: types("summer student housing", "hostel rooms"), crew: { min: 4, max: 30 }, price: "low", topics: [], phase: "later", overnight: true },
  { id: "business", label: "Business", types: types("seminar hotel", "conference villa"), crew: { min: 10, max: 40 }, price: "high", topics: [], phase: "abroad", overnight: true },
  { id: "dayOnly", label: "Day only", types: types("kitchen studio", "rooftop", "loft", "photo or music studio", "sports hall", "sauna", "garden"), crew: { min: 4, max: 30 }, price: "low", topics: [], phase: "soon", overnight: false },
] as const satisfies readonly AccommodationCategory[];

export type AccommodationCategoryId = (typeof ACCOMMODATION_CATEGORIES)[number]["id"];
/** A type's id, as stored on the House (`Stay.accommodationType`): "villa", "large-apartment", "b-and-b" … */
export type AccommodationTypeId = string;

const TYPE_INDEX = new Map(ACCOMMODATION_CATEGORIES.flatMap((c) => c.types.map((t) => [t.id, { type: t, category: c as AccommodationCategory }] as const)));

/** A type's label and its category; undefined for an unknown or missing type. */
export const accommodationOf = (typeId: string | undefined) => (typeId ? TYPE_INDEX.get(typeId) : undefined);

// ── Open a House: "Where will you live?" ─────────────────────────────────────────────────────────────────────────────────────────

/**
 * Per topic, the 2–3 types shown first, marked "Popular for {topic}" (the one nudge of the step). Topics not listed: no nudge, the plain
 * order.
 */
export const POPULAR_BY_TOPIC: Partial<Record<Vibe, readonly string[]>> = {
  fitness: ["surf-camp", "villa", "training-camp"],
  founder: ["coliving", "villa", "catamaran"],
  creator: ["villa", "catamaran", "castle"],
  "remote-work": ["coliving", "serviced-apartments"],
};

/**
 * ⚠ MOCK photos for the tiles (from the mock Houses, chosen to show the kind of place, no person in front); null = a quiet tile with an
 * icon. TODO: own photos per category and type.
 */
export const CATEGORY_IMAGE: Record<AccommodationCategoryId, string | null> = {
  classic: "/mock/houses/s10/3.webp",
  liveWork: "/mock/houses/s5/2.webp",
  buyout: "/mock/houses/s17/1.webp",
  regional: "/mock/houses/x41/1.webp",
  nature: "/mock/houses/x12/3.webp",
  farm: "/mock/houses/x9/3.webp",
  water: "/mock/houses/x31/3.webp",
  special: "/mock/houses/x44/3.webp",
  program: "/mock/houses/x37/3.webp",
  road: "/mock/houses/s16/2.webp",
  budget: "/mock/houses/x10/3.webp",
  business: "/mock/houses/x10/2.webp",
  dayOnly: "/mock/houses/s17/2.webp",
};
/** ⚠ MOCK: a second photo for a category whose own already shows on a popular type's tile above it (never the same photo twice). */
export const CATEGORY_IMAGE_ALT: Partial<Record<AccommodationCategoryId, string>> = {
  classic: "/mock/houses/x9/1.webp",
  program: "/mock/houses/x28/1.webp",
  liveWork: "/mock/houses/s16/1.webp",
};

/** ⚠ MOCK: the popular types' own photos; others use their category's. */
export const TYPE_IMAGE: Readonly<Record<string, string>> = {
  "surf-camp": "/mock/houses/x28/2.webp",
  villa: "/mock/houses/s10/3.webp",
  "training-camp": "/mock/houses/x37/3.webp",
  coliving: "/mock/houses/s5/2.webp",
  catamaran: "/mock/houses/x7/2.webp",
  castle: "/mock/houses/x17/3.webp",
  "serviced-apartments": "/mock/houses/x10/3.webp",
};

/**
 * The budget per person a price level starts "Crew and price" with (EUR, converted to the House currency and rounded) – a first guess the
 * host changes freely. Not from the brief: an assumption to tune here.
 */
export const PRICE_BUDGET_EUR: Record<PriceLevel, readonly [number, number]> = {
  low: [200, 400],
  mid: [400, 700],
  "mid-high": [500, 1000],
  high: [900, 1600],
  mixed: [300, 800],
};

/** The categories a House can be lived in (day places are for events, not "Where will you live?"), the topic's popular ones first, then by phase. */
export function livingCategoriesFor(topic: Vibe | "" | null): AccommodationCategory[] {
  const popular = (topic && POPULAR_BY_TOPIC[topic]) || [];
  const rank = (c: AccommodationCategory) => {
    const hit = popular.findIndex((id) => c.types.some((t) => t.id === id));
    return hit === -1 ? popular.length + PLACE_PHASES.indexOf(c.phase) : hit;
  };
  return (ACCOMMODATION_CATEGORIES as readonly AccommodationCategory[]).filter((c) => c.overnight).toSorted((a, b) => rank(a) - rank(b));
}

/** Boats: "Usually chartered with a skipper" on "Crew and price". */
export const CHARTERED_CATEGORY: AccommodationCategoryId = "water";

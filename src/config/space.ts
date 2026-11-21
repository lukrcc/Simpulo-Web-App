// "About the space" (Open a House, optional – CLAUDE.md "Raum-Daten"): what the place is like, no personal data. The structure here, the
// words in en.ts (create.space.*, house.space.*). Some answers show on the House page (PUBLIC_SPACE), the rest are only for us – the
// data points create.space.* (config/data-points.ts) and the model "Raum-Wirkung" (spaceEffect, config/models.ts).

export const ROOM_KINDS = ["private", "shared"] as const;
/** The shared spaces – several */
export const SHARED_SPACES = ["kitchenTable", "living", "workspace", "pool"] as const;
export const OUTDOORS = ["none", "balcony", "garden", "courtyard"] as const;
export const KITCHENS = ["open", "separate"] as const;
export const TABLE_SPOTS = ["center", "edge", "none"] as const;
export const DAYLIGHT = ["low", "medium", "high"] as const;
export const SETTINGS = ["city", "edge", "country"] as const;

/** Sensible bounds for the numbers (typed, never required) */
export const SPACE_LIMITS = { rooms: { min: 0, max: 50 }, seats: { min: 1, max: 60 }, area: { min: 10, max: 5000 } } as const;

/** Every answer optional; nothing about people. */
export interface HouseSpace {
  bedrooms?: number;
  bathrooms?: number;
  /** Own rooms or shared ones */
  rooms?: (typeof ROOM_KINDS)[number];
  shared?: Array<(typeof SHARED_SPACES)[number]>;
  outdoor?: (typeof OUTDOORS)[number];
  kitchen?: (typeof KITCHENS)[number];
  /** Where the biggest table stands */
  table?: (typeof TABLE_SPOTS)[number];
  /** How many fit at it */
  seats?: number;
  /** Does the way to the bathroom lead through a shared room? */
  bathThroughShared?: boolean;
  /** Is there a quiet place to withdraw to? */
  retreat?: boolean;
  /** Roughly, m² */
  area?: number;
  /** Daylight in the shared room */
  daylight?: (typeof DAYLIGHT)[number];
  setting?: (typeof SETTINGS)[number];
}

/** Shown on the House page; everything else stays internal. */
export const PUBLIC_SPACE = ["bedrooms", "bathrooms", "rooms", "outdoor", "kitchen"] as const satisfies ReadonlyArray<keyof HouseSpace>;

/** The answers that were given (empty values dropped) – undefined when nothing was. */
export function cleanSpace(space: HouseSpace | undefined): HouseSpace | undefined {
  if (!space) return undefined;
  const out = Object.fromEntries(Object.entries(space).filter(([, v]) => v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0) && !(typeof v === "number" && Number.isNaN(v)))) as HouseSpace;
  return Object.keys(out).length > 0 ? out : undefined;
}

/** How many answers the host gave ("4 of 14 added"). */
export const SPACE_FIELDS = ["bedrooms", "bathrooms", "rooms", "shared", "outdoor", "kitchen", "table", "seats", "bathThroughShared", "retreat", "area", "daylight", "setting"] as const satisfies ReadonlyArray<keyof HouseSpace>;
export const spaceAnswered = (space: HouseSpace | undefined) => SPACE_FIELDS.filter((k) => cleanSpace(space)?.[k] !== undefined).length;

// What the product knows whatever the data source: the categories and how a place is written.
import type { StayLocation, Vibe } from "./mock";

export const VIBES: { key: Vibe; label: string }[] = [
  { key: "fitness", label: "Fitness" },
  { key: "surf-water", label: "Surf & Water" },
  { key: "remote-work", label: "Remote work" },
  { key: "founder", label: "Founder" },
  { key: "creator", label: "Creator" },
  { key: "wellness", label: "Wellness" },
  { key: "adventure", label: "Adventure" },
  { key: "culture", label: "Culture" },
  { key: "party", label: "Party" },
  { key: "holiday", label: "Holiday" },
  { key: "social", label: "Social" },
  { key: "students", label: "Students" },
];

/** `location` from the two place fields: "Ari" + "Bangkok, Thailand" → Bangkok, Thailand (area Ari); "Lisbon" + "Portugal" → Lisbon, Portugal. */
export function locationOf(city: string, region: string): StayLocation {
  const parts = region.split(",").map((part) => part.trim());
  if (parts.length < 2) return { city, country: parts[0] };
  return { city: parts[0], country: parts.at(-1)!, ...(city && city !== parts[0] && { area: city }) };
}

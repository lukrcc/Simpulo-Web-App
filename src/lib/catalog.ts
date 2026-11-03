// What the product knows whatever the data source: the categories and how a place is written.
import type { StayLocation, Vibe } from "./mock";

export const VIBES: { key: Vibe; label: string }[] = [
  { key: "fitness", label: "Fitness" },
  { key: "surf", label: "Surf" },
  { key: "creator", label: "Creator" },
  { key: "streaming", label: "Streaming" },
  { key: "founder", label: "Founder" },
  { key: "remote-work", label: "Remote work" },
  { key: "trading", label: "Trading" },
  { key: "wellness", label: "Wellness" },
  { key: "yoga", label: "Yoga" },
  { key: "diving", label: "Diving" },
  { key: "climbing", label: "Climbing" },
  { key: "language", label: "Language" },
  { key: "students", label: "Students" },
  { key: "holiday", label: "Holiday" },
  { key: "mixed", label: "Mixed" },
  { key: "party", label: "Party" },
  { key: "singles", label: "Singles" },
  { key: "weekend", label: "Short trip" },
  { key: "business", label: "Business" },
  { key: "social", label: "Social" },
  { key: "adventure", label: "Adventure" },
  { key: "culture", label: "Culture" },
  { key: "food", label: "Food" },
  { key: "study", label: "Study" },
];

/** `location` from the two place fields: "Ari" + "Bangkok, Thailand" → Bangkok, Thailand (area Ari); "Lisbon" + "Portugal" → Lisbon, Portugal. */
export function locationOf(city: string, region: string): StayLocation {
  const parts = region.split(",").map((part) => part.trim());
  if (parts.length < 2) return { city, country: parts[0] };
  return { city: parts[0], country: parts.at(-1)!, ...(city && city !== parts[0] && { area: city }) };
}

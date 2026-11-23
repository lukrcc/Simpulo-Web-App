// What the product knows whatever the data source: the categories and how a place is written.
import type { StayLocation, Vibe } from "./mock";
import { activeThemes } from "./themes";

/** The words of the top themes (product, English); the list itself – which, in what order, active or hidden – is config/themes.ts. */
const VIBE_LABELS: Record<Vibe, string> = {
  fitness: "Fitness",
  "surf-water": "Surf & Water",
  "remote-work": "Remote work",
  founder: "Founder",
  creator: "Creator",
  wellness: "Wellness",
  adventure: "Adventure",
  culture: "Culture",
  party: "Party",
  holiday: "Holiday",
  social: "Social",
  students: "Students",
};

/** The categories every list shows (filters, Explore, Open a House, statistics): the active top themes of config/themes.ts, in its order. */
export const VIBES: { key: Vibe; label: string }[] = activeThemes().map((key) => ({ key, label: VIBE_LABELS[key] }));

/** `location` from the two place fields: "Ari" + "Bangkok, Thailand" → Bangkok, Thailand (area Ari); "Lisbon" + "Portugal" → Lisbon, Portugal. */
export function locationOf(city: string, region: string): StayLocation {
  const parts = region.split(",").map((part) => part.trim());
  if (parts.length < 2) return { city, country: parts[0] };
  return { city: parts[0], country: parts.at(-1)!, ...(city && city !== parts[0] && { area: city }) };
}

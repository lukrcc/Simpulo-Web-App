// Booking platforms the accommodation tile recognises by a listing's domain: name and brand colour, for the label and
// for the fallback surface when there's no picture. Anything else shows its domain on ink.
import { linkDomain } from "./links";

export interface Platform {
  name: string;
  /** Brand colour, the fallback surface */
  color: string;
}

const PLATFORMS: { match: RegExp; platform: Platform }[] = [
  { match: /(^|\.)airbnb\./, platform: { name: "Airbnb", color: "#FF385C" } },
  { match: /(^|\.)booking\.com$/, platform: { name: "Booking.com", color: "#003580" } },
  { match: /(^|\.)vrbo\.com$/, platform: { name: "Vrbo", color: "#245ABC" } },
  { match: /(^|\.)hostelworld\.com$/, platform: { name: "Hostelworld", color: "#F25822" } },
  { match: /(^|\.)agoda\.com$/, platform: { name: "Agoda", color: "#5542F6" } },
];

export function platformOf(url: string): Platform {
  const domain = linkDomain(url);
  return PLATFORMS.find((p) => p.match.test(domain))?.platform ?? { name: domain, color: "#221E1B" };
}

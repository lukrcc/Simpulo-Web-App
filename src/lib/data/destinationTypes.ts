// A city of the curated list: a source for the place search and the host's map, never a page or a card of its own.
import type { WorldRegion } from "../worldRegions";

export interface Destination {
  id: string;
  slug: string;
  name: string;
  country: string;
  countryCode: string;
  /** "": not known yet */
  region: WorldRegion | "";
  lat: number;
  lng: number;
  /** public/destinations/<slug>.jpg, if the file exists */
  coverImage?: string;
}

/** A city of the list without a picture. */
export type DestinationCandidate = Omit<Destination, "coverImage">;

const fold = (text: string) => text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ø/g, "o").replace(/ß/g, "ss").replace(/ł/g, "l");

/** "Funchal, Madeira" → "funchal-madeira" */
export const slugOf = (name: string) => fold(name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const foldPlace = fold;

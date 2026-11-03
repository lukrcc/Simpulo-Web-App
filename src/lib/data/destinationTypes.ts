// A place people can want to go. Everything that talks about a place refers to Destination.id, never to typed text.
import type { WorldRegion } from "../interests";

export type DestinationImageSource = "curated" | "pexels" | "fallback";
export type DestinationStatus = "approved" | "pending" | "hidden";

export interface Destination {
  id: string;
  slug: string;
  name: string;
  country: string;
  countryCode: string;
  region: WorldRegion;
  lat: number;
  lng: number;
  coverImage?: string;
  imageSource: DestinationImageSource;
  /** Only with imageSource "pexels": shown as the card's credit */
  photographer?: { name: string; url: string };
  status: DestinationStatus;
  interestedCount: number;
  /** YYYY-MM, sorted */
  interestedMonths: string[];
}

export interface DestinationInterest {
  destinationId: string;
  /** YYYY-MM, or just FLEXIBLE */
  months: string[];
  email?: string;
  userId?: string;
  consent: boolean;
  createdAt: string;
}

/** What a search finds: a place, not yet a Destination unless someone picks it. */
export type DestinationCandidate = Pick<Destination, "id" | "slug" | "name" | "country" | "countryCode" | "region" | "lat" | "lng">;

const fold = (text: string) => text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ø/g, "o").replace(/ß/g, "ss").replace(/ł/g, "l");

/** "Funchal, Madeira" → "funchal-madeira" */
export const slugOf = (name: string) => fold(name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const foldPlace = fold;

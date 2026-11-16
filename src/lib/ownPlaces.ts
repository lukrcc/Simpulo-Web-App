// "Host from your place": the places a host lives in and saved (lib/types.ts Place) and the windows opened in them (Houses with placeId).
// The one place that reads them – Your houses › Your places, Open a House, the "Host lives here" capsule.
import type { Place, Stay } from "./types";

type Records = { places: readonly Place[]; stays: readonly Stay[] };

/** A person's saved places, the newest first. */
export const placesOf = ({ places }: Pick<Records, "places">, userId: string | null | undefined): Place[] =>
  userId ? places.filter((p) => p.ownerId === userId).toSorted((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];

export const placeById = ({ places }: Pick<Records, "places">, id: string | null | undefined): Place | undefined => (id ? places.find((p) => p.id === id) : undefined);

/** The windows of a place: its Houses (no drafts, none closed), by start date. */
export const windowsOf = ({ stays }: Pick<Records, "stays">, placeId: string): Stay[] =>
  stays.filter((s) => s.placeId === placeId && s.status !== "draft" && s.status !== "draft_unclaimed" && s.status !== "closed").toSorted((a, b) => a.startDate.localeCompare(b.startDate));

/** "Host lives here": a House opened in the host's own place. */
export const hostLivesHere = (stay: Pick<Stay, "placeId" | "isExample">): boolean => Boolean(stay.placeId) && !stay.isExample;

/** A window's crew at most: the free rooms + the host (who counts as one of the crew, CLAUDE.md "Join-Ablauf"). */
export const maxCrewOf = (place: Pick<Place, "freeSpots">): number => place.freeSpots + 1;

/** A window lies inside the host's rental period (YYYY-MM-DD; the last night ends on rentTo at the latest). */
export const insideRental = (place: Pick<Place, "rentFrom" | "rentTo">, startDate: string, endDate: string): boolean =>
  Boolean(startDate && endDate) && startDate >= place.rentFrom && endDate <= place.rentTo;

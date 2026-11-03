import type { Destination } from "./destinationTypes";

/*
 * Pictures for new, not curated destinations: one search per destination, ever. The result (URL + photographer) stays on the
 * destination, shown with its credit. When this goes live it runs server-side, with the API key only there. For now a mock:
 * no real request, and no picture.
 */
export interface FoundImage {
  url: string;
  photographer: { name: string; url: string };
}

export interface DestinationImageFinder {
  /** Landscape only */
  find(query: string): Promise<FoundImage | null>;
}

export const mockPexels: DestinationImageFinder = {
  find: async () => null,
};

export const pexelsQuery = (destination: Pick<Destination, "name" | "country">) => `${destination.name} ${destination.country} skyline`;

/** The destination with its picture, if one was found. `alreadyAsked`: it has had its one search, whatever came of it. */
export async function findImageOnce<T extends Pick<Destination, "name" | "country">>(destination: T, alreadyAsked: boolean, finder: DestinationImageFinder = mockPexels): Promise<Partial<Destination> | null> {
  if (alreadyAsked) return null;
  const image = await finder.find(pexelsQuery(destination));
  return image && { coverImage: image.url, imageSource: "pexels", photographer: image.photographer };
}

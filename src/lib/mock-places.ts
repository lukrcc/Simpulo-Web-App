// ⚠ MOCK: "Host from your place" – the places a few hosts live in and saved, each with the Houses already opened in it as windows
// (Stay.placeId). Lukas (u1): his apartment in Barceloneta (one past window – "Open again") and the villa in Canggu (one coming window);
// u3: the house in Ericeira (two past windows and a coming one). Example Houses belong to nobody and are never linked.
import type { Place, Stay } from "./types";

const SAVED_AT = "2026-05-02T10:00:00.000Z";

const MOCK_PLACES: readonly (Place & { windows: readonly string[] })[] = [
  {
    id: "pl-u1-barceloneta",
    ownerId: "u1",
    name: "Apartment in Barceloneta",
    accommodationType: "large-apartment",
    photos: ["/mock/houses/s34/3.webp", "/mock/houses/s34/1.webp", "/mock/houses/s34/2.webp"],
    rooms: 5,
    freeSpots: 4,
    rules: ["Quiet after 23:00 – the neighbours are lovely", "Shoes off inside"],
    address: { city: "Barceloneta", region: "Barcelona, Spain", street: "Carrer de la Sal 12" },
    rentFrom: "2026-01-01",
    rentTo: "2027-12-31",
    monthlyRent: 2400,
    currency: "EUR",
    allowedToHost: true,
    createdAt: SAVED_AT,
    windows: ["s54"],
  },
  {
    id: "pl-u1-canggu",
    ownerId: "u1",
    name: "Villa in Canggu",
    accommodationType: "villa",
    photos: ["/mock/houses/s1/3.webp", "/mock/houses/s1/1.webp", "/mock/houses/s1/2.webp"],
    rooms: 5,
    freeSpots: 4,
    rules: ["Gym before breakfast is optional, the smoothie isn't", "No outdoor shoes by the pool"],
    address: { city: "Canggu", region: "Bali, Indonesia" },
    rentFrom: "2026-11-01",
    rentTo: "2027-06-30",
    monthlyRent: 45_000_000,
    currency: "IDR",
    allowedToHost: true,
    createdAt: "2026-09-14T08:30:00.000Z",
    windows: ["s1"],
  },
  {
    id: "pl-u3-ericeira",
    ownerId: "u3",
    name: "House in Ericeira",
    accommodationType: "house",
    photos: ["/mock/houses/s24/1.webp", "/mock/houses/s24/2.webp", "/mock/houses/s24/3.webp"],
    rooms: 4,
    freeSpots: 3,
    rules: ["Boards dry outside", "Last one up locks the door"],
    address: { city: "Ericeira", region: "Portugal" },
    rentFrom: "2026-06-01",
    rentTo: "2027-09-30",
    monthlyRent: 1900,
    currency: "EUR",
    allowedToHost: true,
    createdAt: "2026-06-03T09:00:00.000Z",
    windows: ["s24", "s9", "s55"],
  },
];

/** The mock places, and the Houses with their `placeId` – only real Houses of the place's owner, never an example. */
export function withMockPlaces(stays: Stay[]): { stays: Stay[]; places: Place[] } {
  const placeOf = new Map(MOCK_PLACES.flatMap((p) => p.windows.map((id) => [id, p] as const)));
  return {
    stays: stays.map((s) => {
      const place = placeOf.get(s.id);
      return place && !s.isExample && s.hostId === place.ownerId ? { ...s, placeId: place.id } : s;
    }),
    places: MOCK_PLACES.map((entry) => {
      const { windows, ...place } = entry;
      void windows;
      return { ...place, photos: [...place.photos], rules: [...place.rules], address: { ...place.address } };
    }),
  };
}

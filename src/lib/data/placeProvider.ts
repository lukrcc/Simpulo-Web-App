// The place search behind Where? on Explore. Every provider answers with the same SearchPlace: a place from a list, never typed
// text. Today our own list; Google Places or GeoNames plug in here.
import type { SearchPlace } from "../savedSearches";
import { foldPlace } from "./destinationTypes";

export interface PlaceSearchOptions {
  signal?: AbortSignal;
  limit?: number;
}

export interface PlaceProvider {
  search(query: string, options?: PlaceSearchOptions): Promise<SearchPlace[]>;
}

const DEFAULT_LIMIT = 8;

/** Over a known list. Names starting with the text first, then names or countries containing it. */
export function createListPlaceProvider(places: () => readonly SearchPlace[]): PlaceProvider {
  return {
    async search(query, { limit = DEFAULT_LIMIT } = {}) {
      const q = foldPlace(query.trim());
      if (!q) return [];
      const all = places();
      const starts = all.filter((d) => foldPlace(d.name).startsWith(q));
      const contains = all.filter((d) => !starts.includes(d) && (foldPlace(d.name).includes(q) || foldPlace(d.country).includes(q)));
      return [...starts, ...contains].slice(0, limit);
    },
  };
}

const candidate = (source: string, sourceId: string, name: string, country: string, lat: number, lng: number): SearchPlace => ({ id: `${source}:${sourceId}`, name, country, lat, lng });

/** GeoNames – prepared, not wired yet. Cities only, the largest first; everything a place needs comes in one call. */
export function createGeoNamesProvider({ username }: { username: string }): PlaceProvider {
  return {
    async search(query, { signal, limit = DEFAULT_LIMIT } = {}) {
      const input = query.trim();
      if (!input) return [];
      const params = new URLSearchParams({ name_startsWith: input, featureClass: "P", orderby: "population", maxRows: String(limit), style: "MEDIUM", username });
      const res = await fetch(`https://secure.geonames.org/searchJSON?${params}`, { signal });
      if (!res.ok) return [];
      const data = (await res.json()) as { geonames?: Array<{ geonameId: number; name: string; countryName: string; countryCode: string; lat: string; lng: string }> };
      return (data.geonames ?? []).map((g) => candidate("geonames", String(g.geonameId), g.name, g.countryName, Number(g.lat), Number(g.lng)));
    },
  };
}

/**
 * Google Places Autocomplete (New) – prepared, not wired yet. A browser key restricted to this site's referrers; `sessionToken`
 * groups one search's keystrokes into one billed session. Autocomplete doesn't say where a place is, so each hit asks for its details.
 */
export function createGooglePlacesProvider({ apiKey, sessionToken }: { apiKey: string; sessionToken?: string }): PlaceProvider {
  return {
    async search(query, { signal, limit = DEFAULT_LIMIT } = {}) {
      const input = query.trim();
      if (!input) return [];
      const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey },
        body: JSON.stringify({ input, includedPrimaryTypes: ["(cities)"], sessionToken }),
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { suggestions?: Array<{ placePrediction?: { placeId: string; structuredFormat?: { mainText?: { text: string } } } }> };
      const hits = (data.suggestions ?? []).flatMap(({ placePrediction: p }) => (p?.structuredFormat?.mainText?.text ? [{ id: p.placeId, name: p.structuredFormat.mainText.text }] : [])).slice(0, limit);
      const places = await Promise.all(
        hits.map(async ({ id, name }) => {
          const details = await fetch(`https://places.googleapis.com/v1/places/${id}`, { signal, headers: { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": "location,addressComponents" } });
          if (!details.ok) return null;
          const place = (await details.json()) as { location?: { latitude: number; longitude: number }; addressComponents?: Array<{ longText: string; shortText: string; types: string[] }> };
          const country = place.addressComponents?.find((c) => c.types.includes("country"));
          return place.location && country ? candidate("gplaces", id, name, country.longText, place.location.latitude, place.location.longitude) : null;
        }),
      );
      return places.filter((p): p is SearchPlace => p !== null);
    },
  };
}

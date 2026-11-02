/*
 * Place search behind one interface: a local mock list today, Google Places Autocomplete (New) later – both answer
 * with the same PlaceSuggestion shape, so PlaceSearch and the forms don't change when the provider does.
 */

export interface PlaceSuggestion {
  /** Local id now ("local:bali"); a Google place id later */
  id: string;
  /** Bold part: "Canggu", "Lisbon" */
  label: string;
  /** Muted part: "Bali, Indonesia", "Portugal" */
  secondary?: string;
  /** What a House stores as `region` ("Lisbon, Portugal") – for an area, its region */
  region: string;
  /** An area (neighbourhood, town) – set when the suggestion is one */
  city?: string;
}

export interface PlaceQuery {
  /** "region": cities and regions worldwide; "area": neighbourhoods and towns inside `within` */
  kind: "region" | "area";
  /** The region an area search is limited to ("Bali, Indonesia") */
  within?: string;
  signal?: AbortSignal;
}

export interface PlaceProvider {
  /** An empty query returns popular suggestions (or nothing). */
  search(query: string, options: PlaceQuery): Promise<PlaceSuggestion[]>;
}

/**
 * Google Places Autocomplete (New) – prepared, not wired yet. Pass a browser key restricted to this site's
 * referrers; `sessionToken` groups the keystrokes of one search into one billed session.
 */
export function createGooglePlacesProvider({ apiKey, sessionToken }: { apiKey: string; sessionToken?: string }): PlaceProvider {
  return {
    async search(query, { kind, within, signal }) {
      const input = query.trim();
      if (!input) return [];
      const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey },
        body: JSON.stringify({
          input: kind === "area" && within ? `${input}, ${within}` : input,
          includedPrimaryTypes: kind === "region" ? ["(cities)"] : ["sublocality", "neighborhood", "locality"],
          sessionToken,
        }),
      });
      if (!res.ok) return [];
      const data = (await res.json()) as {
        suggestions?: Array<{ placePrediction?: { placeId: string; structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } } } }>;
      };
      return (data.suggestions ?? []).flatMap(({ placePrediction: p }) => {
        const label = p?.structuredFormat?.mainText?.text;
        if (!p || !label) return [];
        const secondary = p.structuredFormat?.secondaryText?.text;
        return kind === "area"
          ? [{ id: p.placeId, label, secondary, region: within ?? secondary ?? "", city: label }]
          : [{ id: p.placeId, label, secondary, region: secondary ? `${label}, ${secondary.split(",").at(-1)!.trim()}` : label }];
      });
    },
  };
}

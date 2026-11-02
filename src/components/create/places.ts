import { PLACES } from "@/lib/places";
import type { PlaceProvider, PlaceSuggestion } from "@/lib/placeSearch";

/*
 * Suggestions for "Where" and "Area" in Open a House (the mock PlaceProvider). A House stores `region`
 * ("Bali, Indonesia") and `city` (the area, "Canggu" – empty = still open). Anything typed that isn't listed is kept
 * as free text.
 */

interface Region {
  name: string;
  country: string;
  areas: string[];
  /** Areas that are also offered directly under "Where" (picking one fills both fields) */
  featuredAreas?: string[];
}

const REGIONS: Region[] = [
  { name: "Bali", country: "Indonesia", areas: ["Canggu", "Uluwatu", "Ubud", "Seminyak", "Sanur", "Pererenan", "Berawa"], featuredAreas: ["Canggu", "Uluwatu", "Ubud"] },
  { name: "Lombok", country: "Indonesia", areas: ["Gili Air", "Kuta Lombok", "Gili Trawangan", "Selong Belanak"], featuredAreas: ["Gili Air"] },
  { name: "Lisbon", country: "Portugal", areas: ["Alfama", "Príncipe Real", "Cais do Sodré", "Santos", "Cascais"] },
  { name: "Ericeira", country: "Portugal", areas: ["Ribamar", "Foz do Lizandro", "São Lourenço"] },
  { name: "Madeira", country: "Portugal", areas: ["Funchal", "Ponta do Sol", "Calheta", "Machico"] },
  { name: "Porto", country: "Portugal", areas: ["Ribeira", "Bonfim", "Foz do Douro"] },
  { name: "Chiang Mai", country: "Thailand", areas: ["Nimman", "Old City", "Santitham", "Hang Dong"] },
  { name: "Bangkok", country: "Thailand", areas: ["Sukhumvit", "Thonglor", "Ekkamai", "Ari", "Silom"] },
  { name: "Phuket", country: "Thailand", areas: ["Rawai", "Kata", "Chalong", "Kamala"] },
  { name: "Koh Phangan", country: "Thailand", areas: ["Srithanu", "Haad Rin", "Thong Sala", "Haad Yao"] },
  { name: "Krabi", country: "Thailand", areas: ["Ao Nang", "Railay", "Klong Muang"] },
  { name: "Da Nang", country: "Vietnam", areas: ["My Khe", "An Thuong", "Son Tra", "Hoi An"] },
  { name: "Mexico City", country: "Mexico", areas: ["Roma Norte", "Condesa", "Coyoacán", "Juárez"] },
  { name: "Barcelona", country: "Spain", areas: ["Gràcia", "El Born", "Poblenou", "Barceloneta", "Eixample"] },
  { name: "Cape Town", country: "South Africa", areas: ["Sea Point", "Gardens", "Muizenberg", "Observatory", "Camps Bay"] },
  { name: "Tbilisi", country: "Georgia", areas: ["Vake", "Sololaki", "Vera", "Fabrika"] },
  { name: "Seoul", country: "South Korea", areas: ["Hongdae", "Itaewon", "Seongsu", "Gangnam", "Sinchon"] },
  { name: "Tokyo", country: "Japan", areas: ["Shibuya", "Shimokitazawa", "Nakameguro", "Asakusa", "Koenji"] },
  { name: "Kyoto", country: "Japan", areas: ["Higashiyama", "Gion", "Arashiyama"] },
  { name: "Dubai", country: "United Arab Emirates", areas: ["Dubai Marina", "JLT", "Downtown", "Jumeirah", "Al Quoz"] },
  { name: "Florianópolis", country: "Brazil", areas: ["Campeche", "Lagoa da Conceição", "Barra da Lagoa"] },
  { name: "Berlin", country: "Germany", areas: ["Kreuzberg", "Neukölln", "Friedrichshain", "Prenzlauer Berg"] },
];

/** How a region is stored on the House. */
const regionValue = (r: Region) => `${r.name}, ${r.country}`;

/** The region a stored value belongs to: "Bali, Indonesia" or just "Bali". */
function findRegion(region: string): Region | undefined {
  const value = region.trim().toLowerCase();
  if (!value) return undefined;
  return REGIONS.find((r) => regionValue(r).toLowerCase() === value || r.name.toLowerCase() === value.split(",")[0].trim());
}

/** Case- and accent-insensitive ("sao" finds "São Lourenço"). */
const fold = (text: string) => text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Everything "Where" can suggest: the regions with areas, a few well-known areas, and cities worldwide. */
const WHERE: PlaceSuggestion[] = [
  ...REGIONS.flatMap((r) => [
    { id: `local:${r.name}`, label: r.name, secondary: r.country, region: regionValue(r) },
    ...(r.featuredAreas ?? []).map((area) => ({ id: `local:${r.name}:${area}`, label: area, secondary: regionValue(r), region: regionValue(r), city: area })),
  ]),
  ...PLACES.filter((p) => !REGIONS.some((r) => fold(r.name) === fold(p.name) || r.featuredAreas?.some((a) => fold(a) === fold(p.name)))).map((p) => ({
    id: p.placeId,
    label: p.name,
    secondary: p.country,
    region: `${p.name}, ${p.country}`,
  })),
];

/** Shown on focus before anything is typed. */
const POPULAR = ["Bali", "Lisbon", "Chiang Mai", "Mexico City", "Cape Town", "Tokyo"];

function rank(items: PlaceSuggestion[], query: string, limit = 8): PlaceSuggestion[] {
  const q = fold(query.trim());
  const starts = items.filter((p) => fold(p.label).startsWith(q));
  const contains = items.filter((p) => !starts.includes(p) && (fold(p.label).includes(q) || fold(p.secondary ?? "").includes(q)));
  return [...starts, ...contains].slice(0, limit);
}

/** The mock provider: the lists above, answered at once. */
export const mockPlaceProvider: PlaceProvider = {
  async search(query, { kind, within }) {
    if (kind === "area") {
      const region = findRegion(within ?? "");
      if (!region) return [];
      const areas = region.areas.map((area) => ({ id: `local:${region.name}:${area}`, label: area, region: regionValue(region), city: area }));
      return query.trim() ? rank(areas, query) : areas;
    }
    if (!query.trim()) return POPULAR.flatMap((name) => WHERE.find((p) => p.label === name && !p.city) ?? []);
    return rank(WHERE, query);
  },
};

/** The provider the app uses – swap for createGooglePlacesProvider once the key is set up. */
export const placeProvider: PlaceProvider = mockPlaceProvider;

/** "Bali" from "Bali, Indonesia" – the short form used in title suggestions. */
export function regionShortName(region: string): string {
  return region.split(",")[0].trim();
}

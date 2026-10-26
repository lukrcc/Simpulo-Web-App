import type { ComboOption } from "@/components/ui/Combobox";

/*
 * Suggestions for "Where" and "Area" in Open a House. A House stores `region` ("Bali, Indonesia") and `city`
 * (the area, "Canggu" – empty = still open). Anything typed that isn't listed is kept as free text.
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

/** "Where" suggestions grouped by country: regions plus a few well-known areas (with their region as hint). */
export const WHERE_OPTIONS: ComboOption[] = REGIONS.flatMap((r) => [
  { value: `region:${r.name}`, label: r.name, group: r.country },
  ...(r.featuredAreas ?? []).map((area) => ({ value: `area:${r.name}:${area}`, label: area, group: r.country, hint: r.name })),
]);

/** What picking a "Where" option sets: the region, and the area when an area was picked directly. */
export function placeOf(option: ComboOption): { region: string; city?: string } {
  const [kind, name, area] = option.value.split(":");
  const region = REGIONS.find((r) => r.name === name);
  if (!region) return { region: option.label };
  return kind === "area" ? { region: regionValue(region), city: area } : { region: regionValue(region) };
}

/** "Area" suggestions for the chosen region (none for a free-text region). */
export function areaOptions(region: string): ComboOption[] {
  return (findRegion(region)?.areas ?? []).map((area) => ({ value: area, label: area }));
}

/** "Bali" from "Bali, Indonesia" – the short form used in title suggestions. */
export function regionShortName(region: string): string {
  return region.split(",")[0].trim();
}

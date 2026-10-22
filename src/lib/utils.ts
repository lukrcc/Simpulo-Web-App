import { VIBES } from "./mock";
import type { Currency, Stay, User } from "./types";

export const SIMPULO_FEE_RATE = 0.1;

const DAY_MS = 86_400_000;

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function simpuloFee(pricePerPerson: number): number {
  return Math.round(pricePerPerson * SIMPULO_FEE_RATE);
}

function toUtc(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function nightsBetween(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  return Math.max(0, Math.round((toUtc(endDate) - toUtc(startDate)) / DAY_MS));
}

/** "Bali, Indonesia" → "Bali"; "Portugal" → "Portugal". */
export function regionShort(stay: Pick<Stay, "region">): string {
  return stay.region.split(",")[0]?.trim() || stay.region;
}

/** Hosts may leave the city open ("we'll decide together") – then only the region is known. */
export function isCityOpen(stay: Pick<Stay, "city">): boolean {
  return !stay.city.trim();
}

/** Map target: exact coordinates when known, else a text search – the whole region while the city is open. */
export function mapQuery(stay: Pick<Stay, "lat" | "lng" | "city" | "region">): { query: string; zoom: number } {
  if (isCityOpen(stay)) return { query: encodeURIComponent(stay.region), zoom: 6 };
  if (stay.lat || stay.lng) return { query: `${stay.lat},${stay.lng}`, zoom: 13 };
  return { query: encodeURIComponent(`${stay.city}, ${stay.region}`), zoom: 12 };
}

export function stayNights(stay: Pick<Stay, "startDate" | "endDate">): number {
  return nightsBetween(stay.startDate, stay.endDate);
}

export function googleMapsUrl(stay: Pick<Stay, "lat" | "lng" | "city" | "region">): string {
  // Stays created in the app have no coordinates yet (0,0) – mapQuery falls back to a text search.
  return `https://www.google.com/maps/search/?api=1&query=${mapQuery(stay).query}`;
}

const URL_PATTERN = /https?:\/\/[^\s<>"]+[^\s<>".,;:!?)]/g;

/** All http(s) links in a text, in order. */
export function findUrls(text: string): string[] {
  return text.match(URL_PATTERN) ?? [];
}

/** Splits a text into plain parts and links, for rendering links inline. */
export function splitLinks(text: string): Array<{ text: string; url?: string }> {
  const parts: Array<{ text: string; url?: string }> = [];
  let last = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    const start = match.index ?? 0;
    if (start > last) parts.push({ text: text.slice(last, start) });
    parts.push({ text: match[0], url: match[0] });
    last = start + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

/** First sentence of a text, e.g. a one-line hook from a longer paragraph. */
export function firstSentence(text: string): string {
  const match = text.trim().match(/^.*?[.!?](?=\s|$)/);
  return match ? match[0] : text.trim();
}

/** "with Mara" – the host's first name. */
export function firstName(user: Pick<User, "name">): string {
  return user.name.split(" ")[0];
}

type PricedStay = Pick<Stay, "accommodationStatus" | "pricePerPerson" | "budgetPerPerson" | "currency">;

export type StayPrice =
  | { kind: "price"; amount: number; fee: number }
  | { kind: "budget"; min: number; max: number }
  | { kind: "tbd" };

/** A fixed price only exists once the place is locked; before that there's at most a rough budget. */
export function stayPrice(stay: PricedStay): StayPrice {
  if (stay.accommodationStatus === "locked" && stay.pricePerPerson) {
    return { kind: "price", amount: stay.pricePerPerson, fee: simpuloFee(stay.pricePerPerson) };
  }
  if (stay.budgetPerPerson) return { kind: "budget", ...stay.budgetPerPerson };
  return { kind: "tbd" };
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export { VIBES };

export const CURRENCIES: readonly Currency[] = ["EUR", "USD", "GBP", "AUD", "THB", "IDR"];

const COUNTRY_CURRENCY: Record<string, Currency> = {
  indonesia: "IDR",
  thailand: "THB",
  australia: "AUD",
  "united kingdom": "GBP",
  uk: "GBP",
  "united states": "USD",
  usa: "USD",
};

/** Default House currency from the host's country (plain-text country as on profiles); EUR otherwise. */
export function currencyForCountry(country: string): Currency {
  return COUNTRY_CURRENCY[country.trim().toLowerCase()] ?? "EUR";
}

const REGION_CURRENCY: Record<string, Currency> = { US: "USD", GB: "GBP", AU: "AUD", TH: "THB", ID: "IDR" };

/** Default preferred currency from a BCP 47 locale ("en-AU" → AUD, "th" → THB); EUR otherwise. */
export function currencyForLocale(locale: string): Currency {
  const parts = locale.split("-");
  const region = parts.find((p, i) => i > 0 && /^[A-Z]{2}$/i.test(p))?.toUpperCase();
  if (region && REGION_CURRENCY[region]) return REGION_CURRENCY[region];
  const language = parts[0]?.toLowerCase();
  if (language === "th") return "THB";
  if (language === "id") return "IDR";
  return "EUR";
}

/** Language names as stored on profiles ("German") → ISO 639-1 codes for a House's language. */
const LANGUAGE_CODES: Record<string, string> = {
  arabic: "ar", catalan: "ca", chinese: "zh", czech: "cs", danish: "da", dutch: "nl", english: "en", finnish: "fi",
  french: "fr", german: "de", greek: "el", hebrew: "he", hindi: "hi", indonesian: "id", italian: "it", japanese: "ja",
  korean: "ko", mandarin: "zh", norwegian: "no", polish: "pl", portuguese: "pt", russian: "ru", spanish: "es",
  swedish: "sv", tamil: "ta", thai: "th", turkish: "tr", ukrainian: "uk", vietnamese: "vi",
};

/** "German" → "de"; unknown names → undefined (they can't be a House language). */
export function languageCode(name: string): string | undefined {
  return LANGUAGE_CODES[name.trim().toLowerCase()];
}

/** Splits comma- or newline-separated input into trimmed, non-empty, unique entries. */
export function splitList(input: string, separator: RegExp = /[,\n]/): string[] {
  return Array.from(
    new Set(
      input
        .split(separator)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );
}

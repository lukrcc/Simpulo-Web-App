import { guestFee } from "./fees";
import { VIBES } from "./mock";
import type { Currency, Stay, User } from "./types";

const DAY_MS = 86_400_000;

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
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

/** Spots anyone can still request: not taken, and not held by an invite that's waiting for an answer. */
export function openSpots(stay: Pick<Stay, "spotsTotal" | "spotsFilled" | "spotsInvited">): number {
  return Math.max(0, stay.spotsTotal - stay.spotsFilled - (stay.spotsInvited ?? 0));
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
    return { kind: "price", amount: stay.pricePerPerson, fee: guestFee(stay.pricePerPerson) };
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

/**
 * A House's photos: the host's face first, then the House's theme photos. Houses opened in the app have no theme
 * photos, so the rest of the host's own photos fill in.
 */
export function stayPhotos(stay: Pick<Stay, "photos" | "coverImageOverride">, host?: Pick<User, "photos">): string[] {
  const face = host?.photos[0];
  const themes = stay.photos?.length ? stay.photos : (host?.photos.slice(1) ?? []);
  // A pinned cover replaces the first theme photo (and isn't shown twice).
  const rest = stay.coverImageOverride ? [stay.coverImageOverride, ...themes.slice(1).filter((p) => p !== stay.coverImageOverride)] : themes;
  return face ? [face, ...rest] : rest;
}

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

/**
 * The languages to pick from (profiles and Houses), most common first. Profiles store the English name ("German"),
 * Houses the ISO 639-1 code ("de").
 */
export const LANGUAGES: ReadonlyArray<{ code: string; name: string }> = [
  ["en", "English"], ["es", "Spanish"], ["pt", "Portuguese"], ["fr", "French"], ["de", "German"], ["it", "Italian"],
  ["nl", "Dutch"], ["ru", "Russian"], ["uk", "Ukrainian"], ["pl", "Polish"], ["tr", "Turkish"], ["ar", "Arabic"],
  ["he", "Hebrew"], ["hi", "Hindi"], ["ta", "Tamil"], ["bn", "Bengali"], ["ur", "Urdu"], ["zh", "Chinese"],
  ["ja", "Japanese"], ["ko", "Korean"], ["th", "Thai"], ["vi", "Vietnamese"], ["id", "Indonesian"], ["ms", "Malay"],
  ["tl", "Filipino"], ["sv", "Swedish"], ["no", "Norwegian"], ["da", "Danish"], ["fi", "Finnish"], ["is", "Icelandic"],
  ["cs", "Czech"], ["sk", "Slovak"], ["hu", "Hungarian"], ["ro", "Romanian"], ["bg", "Bulgarian"], ["hr", "Croatian"],
  ["sr", "Serbian"], ["el", "Greek"], ["ka", "Georgian"], ["ca", "Catalan"], ["sw", "Swahili"], ["af", "Afrikaans"],
].map(([code, name]) => ({ code, name }));

/** "German" → "de" (also "Mandarin" → "zh"); unknown names → undefined (they can't be a House language). */
export function languageCode(name: string): string | undefined {
  const key = name.trim().toLowerCase();
  if (key === "mandarin") return "zh";
  return LANGUAGES.find((l) => l.name.toLowerCase() === key)?.code;
}

/** ISO 3166-1 alpha-2 codes of all countries; names come from Intl in the UI language. */
const COUNTRY_CODES =
  "AD AE AF AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FR GA GB GD GE GH GM GN GQ GR GT GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KI KM KN KP KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PR PS PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VN VU WS XK YE ZA ZM ZW".split(" ");

/** Country names (as stored on profiles: plain text, no flags), sorted. */
export function countryNames(locale: string): string[] {
  const names = new Intl.DisplayNames([locale], { type: "region" });
  return COUNTRY_CODES.map((code) => names.of(code) ?? code).sort((a, b) => a.localeCompare(b, locale));
}

/** YYYY-MM-DD plus n days (calendar arithmetic in UTC, so no DST surprises). */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** YYYY-MM-DD plus n months, clamped to the month's last day (Jan 31 + 1 → Feb 28). */
export function addMonths(date: string, months: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
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

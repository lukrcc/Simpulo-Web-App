import { VIBES } from "./mock";
import type { Stay, User, Vibe } from "./types";

export const SIMPULO_FEE_RATE = 0.1;

const DAY_MS = 86_400_000;

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function simpuloFee(pricePerPerson: number): number {
  return Math.round(pricePerPerson * SIMPULO_FEE_RATE);
}

export function formatPrice(amount: number, currency = "EUR"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function toUtc(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function nightsBetween(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  return Math.max(0, Math.round((toUtc(endDate) - toUtc(startDate)) / DAY_MS));
}

// Dates are formatted in UTC with a fixed locale so server and client render identically.
export function formatDate(date: string, options: Intl.DateTimeFormatOptions): string {
  return new Date(toUtc(date)).toLocaleDateString("en-US", { ...options, timeZone: "UTC" });
}

export function formatDateRange(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return "Dates TBD";
  const sameYear = startDate.slice(0, 4) === endDate.slice(0, 4);
  const start = formatDate(startDate, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const end = formatDate(endDate, { month: "short", day: "numeric", year: "numeric" });
  return `${start} – ${end}`;
}

/** Compact range like "Feb 12–26" or "Dec 28 – Jan 3". */
export function formatShortRange(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return "Dates TBD";
  const day = (d: string) => formatDate(d, { day: "numeric" });
  const month = (d: string) => formatDate(d, { month: "short" });
  if (startDate.slice(0, 7) === endDate.slice(0, 7)) return `${month(startDate)} ${day(startDate)}–${day(endDate)}`;
  return `${month(startDate)} ${day(startDate)} – ${month(endDate)} ${day(endDate)}`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** "Canggu, Bali, Indonesia" */
export function placeLabel(stay: Pick<Stay, "city" | "region">): string {
  return [stay.city, stay.region].filter(Boolean).join(", ");
}

export function stayNights(stay: Pick<Stay, "startDate" | "endDate">): number {
  return nightsBetween(stay.startDate, stay.endDate);
}

export function googleMapsUrl(stay: Pick<Stay, "lat" | "lng" | "city" | "region">): string {
  // Stays created in the app have no coordinates yet (0,0) – fall back to a text search.
  const query = stay.lat || stay.lng ? `${stay.lat},${stay.lng}` : encodeURIComponent(placeLabel(stay));
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
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

/** "27 · Netherlands" */
export function ageAndCountry(user: Pick<User, "age" | "country">): string {
  return `${user.age} · ${user.country}`;
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

/** "€480 pp", "~€400–600 pp" or "Budget TBD". */
export function stayPriceLabel(stay: PricedStay): string {
  const price = stayPrice(stay);
  if (price.kind === "price") return `${formatPrice(price.amount, stay.currency)} pp`;
  if (price.kind === "budget") return `~${formatBudget(price.min, price.max, stay.currency)} pp`;
  return "Budget TBD";
}

export function formatBudget(min: number, max: number, currency = "EUR"): string {
  return `${formatPrice(min, currency)}–${max.toLocaleString("en-US")}`;
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

export function vibeLabel(vibe: Vibe): string {
  return VIBES.find((v) => v.key === vibe)?.label ?? vibe;
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

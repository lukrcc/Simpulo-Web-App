// App-side mock helpers that aren't part of the data contract in ./mock.ts.
import type { Currency, Stay } from "./types";

export const crewThreadId = (stayId: string) => `t-${stayId}`;

export interface LinkPreview {
  title: string;
  imageUrl: string;
  domain: string;
}

const mockLinkPreviewTitles: Record<string, string> = {
  "https://www.airbnb.com/rooms/example-canggu-villa": "Villa Sawah · 5BR pool villa near Batu Bolong",
  "https://www.booking.com/example-rawai-house": "Rawai Fight House · 4 rooms, 5 min to Tiger",
  "https://www.airbnb.com/rooms/example-danang-house": "Beach house with pool on An Thuong",
  "https://www.airbnb.com/rooms/example-ericeira": "Surf flat above Ribeira d'Ilhas",
  "https://www.airbnb.com/rooms/example-roma-norte": "Roma Norte loft with a chef's kitchen",
  "https://www.airbnb.com/rooms/example-floripa": "Campeche beach house · 5 rooms, 10 min to the mats",
  "https://www.airbnb.com/rooms/example-thonglor": "Thonglor high-rise · gym in the building",
  "https://www.booking.com/example-innsbruck": "Chalet Nordkette with sauna",
};

/** Small stable hash, so the same URL always gets the same placeholder image. */
function hashOf(text: string): number {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

/** "airbnb.com" – or the input itself when it isn't a valid URL. */
export function linkDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Mock link unfurl for any URL – a real implementation would fetch Open Graph data server-side. */
export function mockPreviewForUrl(url: string, fallbackTitle?: string): LinkPreview {
  const domain = linkDomain(url);
  const site = domain.split(".").at(-2) ?? domain;
  return {
    title: mockLinkPreviewTitles[url] ?? fallbackTitle ?? `${site.charAt(0).toUpperCase()}${site.slice(1)} listing`,
    imageUrl: `https://picsum.photos/seed/place-${hashOf(url)}/1200/800`,
    domain,
  };
}

/** Preview of a stay's accommodation link (the booked place once it's locked). */
export function mockLinkPreview(stay: Stay): LinkPreview | null {
  return stay.accommodationLink ? mockPreviewForUrl(stay.accommodationLink, stay.title) : null;
}

/**
 * Static mock rates, units per 1 EUR. Only for the "≈" hint next to a price – never for what's charged.
 * A real app would fetch daily rates server-side.
 */
export const MOCK_RATES_PER_EUR: Record<Currency, number> = {
  EUR: 1,
  USD: 1.08,
  GBP: 0.85,
  AUD: 1.65,
  THB: 38.5,
  IDR: 17500,
};

/** Converts between currencies with the mock rates. */
export function convertApprox(amount: number, from: Currency, to: Currency): number {
  return (amount / MOCK_RATES_PER_EUR[from]) * MOCK_RATES_PER_EUR[to];
}

/** Initial mock payment state: who already paid their share, per stay. The store keeps it from here. */
export const mockPaidUsers: Record<string, string[]> = {
  // Dev scenario: Fitness House Canggu 3 of 5 paid (Lukas, Aisha, Mara) – Lena and Hannah still open.
  s1: ["u1", "u4", "u2"],
  s3: ["u3"],
  s7: ["u7"],
};

/** Users with the app installed (home screen + notifications on) – they get a push as well as the email. */
export const mockInstalledUsers: ReadonlySet<string> = new Set(["u1", "u2", "u4", "u7"]);

/** When the current user last read each thread. Older than the last message = unread. */
export const mockLastReadAt: Record<string, string> = {
  "t-s1": "2026-10-18T14:32:00Z",
};

// Currencies – the one place for them (mock adapter). A House is priced and charged in its own currency (ISO code); a viewer sees prices
// converted into theirs, with "≈", from fixed mock rates against EUR.
// TODO(rates): a rate service (e.g. ECB reference rates or Open Exchange Rates), fetched once a day on the server and cached; the browser
// only ever reads the day's table. Never use these rates for what's charged.

/** The common currencies, in the order the pickers list them. */
export const CURRENCY_CODES = [
  "EUR", "USD", "GBP", "CHF", "CAD", "AUD", "NZD", "JPY", "KRW", "CNY", "HKD", "TWD", "SGD", "THB", "IDR", "VND", "PHP", "MYR", "INR", "LKR",
  "NPR", "AED", "SAR", "QAR", "ILS", "JOD", "TRY", "GEL", "MAD", "EGP", "ZAR", "KES", "TZS", "MXN", "BRL", "ARS", "CLP", "COP", "PEN", "CRC",
  "SEK", "NOK", "DKK", "ISK", "PLN", "CZK", "HUF", "RON", "BGN",
] as const;
export type CurrencyCode = (typeof CURRENCY_CODES)[number];

/** Mock: units per 1 EUR (fixed). */
export const RATES_PER_EUR: Record<CurrencyCode, number> = {
  EUR: 1, USD: 1.08, GBP: 0.85, CHF: 0.95, CAD: 1.47, AUD: 1.65, NZD: 1.8, JPY: 162, KRW: 1470, CNY: 7.8, HKD: 8.4, TWD: 34.8, SGD: 1.45,
  THB: 38.5, IDR: 17500, VND: 27400, PHP: 61, MYR: 5.05, INR: 90, LKR: 325, NPR: 144, AED: 3.97, SAR: 4.05, QAR: 3.93, ILS: 4.0, JOD: 0.77,
  TRY: 36, GEL: 2.95, MAD: 10.8, EGP: 52, ZAR: 19.8, KES: 140, TZS: 2900, MXN: 19.5, BRL: 5.9, ARS: 1050, CLP: 1010, COP: 4400, PEN: 4.05,
  CRC: 560, SEK: 11.5, NOK: 11.6, DKK: 7.46, ISK: 150, PLN: 4.3, CZK: 25.2, HUF: 395, RON: 4.97, BGN: 1.96,
};

export const isCurrency = (code: string | null | undefined): code is CurrencyCode => Boolean(code) && (CURRENCY_CODES as readonly string[]).includes(code as string);

/** Converts with the mock rates. */
export function convert(amount: number, from: CurrencyCode, to: CurrencyCode): number {
  if (from === to) return amount;
  return (amount / RATES_PER_EUR[from]) * RATES_PER_EUR[to];
}

/** Euro countries and the others, by English name (lower case) – a House's default currency comes from its place's country. */
const EURO = ["austria", "belgium", "croatia", "cyprus", "estonia", "finland", "france", "germany", "greece", "ireland", "italy", "latvia", "lithuania", "luxembourg", "malta", "monaco", "montenegro", "netherlands", "portugal", "slovakia", "slovenia", "spain", "andorra", "kosovo"];
const BY_COUNTRY: Record<string, CurrencyCode> = {
  ...Object.fromEntries(EURO.map((c) => [c, "EUR" as const])),
  "united states": "USD", usa: "USD", "puerto rico": "USD", ecuador: "USD", "el salvador": "USD", panama: "USD", cambodia: "USD",
  "united kingdom": "GBP", uk: "GBP", switzerland: "CHF", liechtenstein: "CHF", canada: "CAD", australia: "AUD", "new zealand": "NZD",
  japan: "JPY", "south korea": "KRW", china: "CNY", "hong kong": "HKD", taiwan: "TWD", singapore: "SGD", thailand: "THB", indonesia: "IDR",
  vietnam: "VND", philippines: "PHP", malaysia: "MYR", india: "INR", "sri lanka": "LKR", nepal: "NPR", "united arab emirates": "AED",
  "saudi arabia": "SAR", qatar: "QAR", israel: "ILS", jordan: "JOD", "türkiye": "TRY", turkey: "TRY", georgia: "GEL", morocco: "MAD",
  egypt: "EGP", "south africa": "ZAR", kenya: "KES", tanzania: "TZS", mexico: "MXN", brazil: "BRL", argentina: "ARS", chile: "CLP",
  colombia: "COP", peru: "PEN", "costa rica": "CRC", sweden: "SEK", norway: "NOK", denmark: "DKK", iceland: "ISK", poland: "PLN",
  czechia: "CZK", "czech republic": "CZK", hungary: "HUF", romania: "RON", bulgaria: "BGN",
};

/** The currency of a country (its English name); EUR when unknown. */
export function currencyForCountry(country: string): CurrencyCode {
  return BY_COUNTRY[country.trim().toLowerCase()] ?? "EUR";
}

/** By ISO 3166 region code, for a browser locale ("en-AU" → AUD). */
const BY_REGION: Record<string, CurrencyCode> = {
  US: "USD", GB: "GBP", CH: "CHF", CA: "CAD", AU: "AUD", NZ: "NZD", JP: "JPY", KR: "KRW", CN: "CNY", HK: "HKD", TW: "TWD", SG: "SGD", TH: "THB",
  ID: "IDR", VN: "VND", PH: "PHP", MY: "MYR", IN: "INR", LK: "LKR", NP: "NPR", AE: "AED", SA: "SAR", QA: "QAR", IL: "ILS", JO: "JOD", TR: "TRY",
  GE: "GEL", MA: "MAD", EG: "EGP", ZA: "ZAR", KE: "KES", TZ: "TZS", MX: "MXN", BR: "BRL", AR: "ARS", CL: "CLP", CO: "COP", PE: "PEN", CR: "CRC",
  SE: "SEK", NO: "NOK", DK: "DKK", IS: "ISK", PL: "PLN", CZ: "CZK", HU: "HUF", RO: "RON", BG: "BGN",
};
/** Without a region: the language's usual currency. */
const BY_LANGUAGE: Record<string, CurrencyCode> = { ja: "JPY", ko: "KRW", th: "THB", id: "IDR", vi: "VND", sv: "SEK", nb: "NOK", no: "NOK", da: "DKK", pl: "PLN", cs: "CZK", hu: "HUF", tr: "TRY" };

/** A viewer's first currency from their browser locale ("en-AU" → AUD, "de-DE" → EUR); EUR when nothing fits. */
export function currencyForLocale(locale: string): CurrencyCode {
  const parts = locale.split("-");
  const region = parts.find((p, i) => i > 0 && /^[A-Z]{2}$/i.test(p))?.toUpperCase();
  if (region) return BY_REGION[region] ?? "EUR";
  return BY_LANGUAGE[parts[0]?.toLowerCase() ?? ""] ?? "EUR";
}

// ─── The viewer's currency (browser; later the profile) ─────────────────────────

const VIEWER_KEY = "simpulo:currency";
const listeners = new Set<() => void>();

/** The viewer's own pick, or – on the first visit – what their browser suggests (saved then). EUR on the server. */
export function readViewerCurrency(): CurrencyCode {
  try {
    const saved = localStorage.getItem(VIEWER_KEY);
    if (isCurrency(saved)) return saved;
    const guess = currencyForLocale(navigator.language || "en");
    localStorage.setItem(VIEWER_KEY, guess);
    return guess;
  } catch {
    return typeof navigator === "undefined" ? "EUR" : currencyForLocale(navigator.language || "en");
  }
}

/** Changing it (the footer's picker, Settings): saved in this browser, everyone showing prices follows. */
export function setViewerCurrency(code: CurrencyCode) {
  try {
    localStorage.setItem(VIEWER_KEY, code);
  } catch {
    // blocked – it holds until reload
  }
  memo = code;
  listeners.forEach((listener) => listener());
}

let memo: CurrencyCode | null = null;
export function subscribeViewerCurrency(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function viewerCurrencySnapshot(): CurrencyCode {
  return (memo ??= readViewerCurrency());
}

// ─── Labels ──────────────────────────────────────────────────────────────────────

/** "€", "Rp", "฿" – the narrow symbol (Intl), or the code when there's none. */
export function currencySymbol(code: CurrencyCode, locale = "en"): string {
  try {
    const part = new Intl.NumberFormat(locale, { style: "currency", currency: code, currencyDisplay: "narrowSymbol" }).formatToParts(0).find((p) => p.type === "currency");
    return part?.value ?? code;
  } catch {
    return code;
  }
}

/** "IDR – Indonesian Rupiah" for the pickers. */
export function currencyName(code: CurrencyCode, locale = "en"): string {
  try {
    return new Intl.DisplayNames([locale], { type: "currency" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** A plain amount without symbol, grouped by the locale, whole units (House prices are whole amounts): "8,200,000". */
export function plainAmount(amount: number, _code: CurrencyCode, locale = "en"): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(amount);
}

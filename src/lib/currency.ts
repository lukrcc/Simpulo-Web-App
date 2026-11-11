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

// ─── The viewer's currency (browser; logged in also the profile) ────────────────
//
// Order (usePreferredCurrency): 1. the viewer's own pick, saved here – always wins · 2. the profile setting (logged in) · 3. the country
// the server saw (cookie `viewer_country`, set by src/proxy.ts from x-vercel-ip-country) · 4. the device's time zone · 5. a region in
// navigator.languages ("de-DE"; a bare "en" decides nothing) · 6. EUR. Only a manual pick is ever saved; 3–5 are worked out on each load.

/** Time zone → ISO 3166 country. Euro-zone zones are in it too, so Europe/Berlin is clearly DE (EUR), not "unknown". */
const TZ_COUNTRY: Record<string, string> = {
  "Europe/London": "GB", "Europe/Belfast": "GB", "Europe/Guernsey": "GB", "Europe/Jersey": "GB", "Europe/Isle_of_Man": "GB",
  "Europe/Dublin": "IE", "Europe/Lisbon": "PT", "Atlantic/Madeira": "PT", "Atlantic/Azores": "PT", "Europe/Madrid": "ES", "Atlantic/Canary": "ES",
  "Europe/Paris": "FR", "Europe/Berlin": "DE", "Europe/Busingen": "DE", "Europe/Amsterdam": "NL", "Europe/Brussels": "BE", "Europe/Luxembourg": "LU",
  "Europe/Vienna": "AT", "Europe/Rome": "IT", "Europe/Malta": "MT", "Europe/Athens": "GR", "Europe/Helsinki": "FI", "Europe/Tallinn": "EE",
  "Europe/Riga": "LV", "Europe/Vilnius": "LT", "Europe/Bratislava": "SK", "Europe/Ljubljana": "SI", "Europe/Zagreb": "HR", "Asia/Nicosia": "CY",
  "Europe/Monaco": "MC", "Europe/Andorra": "AD", "Europe/Podgorica": "ME",
  "Europe/Zurich": "CH", "Europe/Vaduz": "LI", "Europe/Stockholm": "SE", "Europe/Oslo": "NO", "Europe/Copenhagen": "DK", "Atlantic/Reykjavik": "IS",
  "Europe/Warsaw": "PL", "Europe/Prague": "CZ", "Europe/Budapest": "HU", "Europe/Bucharest": "RO", "Europe/Sofia": "BG", "Europe/Istanbul": "TR",
  "Asia/Tbilisi": "GE",
  "America/New_York": "US", "America/Chicago": "US", "America/Denver": "US", "America/Phoenix": "US", "America/Los_Angeles": "US",
  "America/Anchorage": "US", "Pacific/Honolulu": "US", "America/Detroit": "US", "America/Boise": "US", "America/Indiana/Indianapolis": "US",
  "America/Puerto_Rico": "US",
  "America/Toronto": "CA", "America/Vancouver": "CA", "America/Edmonton": "CA", "America/Winnipeg": "CA", "America/Halifax": "CA",
  "America/St_Johns": "CA", "America/Regina": "CA",
  "America/Mexico_City": "MX", "America/Cancun": "MX", "America/Tijuana": "MX", "America/Monterrey": "MX", "America/Merida": "MX",
  "America/Sao_Paulo": "BR", "America/Fortaleza": "BR", "America/Recife": "BR", "America/Manaus": "BR", "America/Bahia": "BR",
  "America/Argentina/Buenos_Aires": "AR", "America/Buenos_Aires": "AR", "America/Santiago": "CL", "America/Bogota": "CO", "America/Lima": "PE",
  "America/Costa_Rica": "CR",
  "Asia/Tokyo": "JP", "Asia/Seoul": "KR", "Asia/Shanghai": "CN", "Asia/Hong_Kong": "HK", "Asia/Taipei": "TW", "Asia/Singapore": "SG",
  "Asia/Bangkok": "TH", "Asia/Jakarta": "ID", "Asia/Makassar": "ID", "Asia/Pontianak": "ID", "Asia/Jayapura": "ID",
  "Asia/Ho_Chi_Minh": "VN", "Asia/Saigon": "VN", "Asia/Manila": "PH", "Asia/Kuala_Lumpur": "MY", "Asia/Kuching": "MY",
  "Asia/Kolkata": "IN", "Asia/Calcutta": "IN", "Asia/Colombo": "LK", "Asia/Kathmandu": "NP", "Asia/Dubai": "AE", "Asia/Riyadh": "SA",
  "Asia/Qatar": "QA", "Asia/Jerusalem": "IL", "Asia/Tel_Aviv": "IL", "Asia/Amman": "JO",
  "Africa/Casablanca": "MA", "Africa/Cairo": "EG", "Africa/Johannesburg": "ZA", "Africa/Nairobi": "KE", "Africa/Dar_es_Salaam": "TZ",
  "Australia/Sydney": "AU", "Australia/Melbourne": "AU", "Australia/Brisbane": "AU", "Australia/Perth": "AU", "Australia/Adelaide": "AU",
  "Australia/Hobart": "AU", "Australia/Darwin": "AU", "Pacific/Auckland": "NZ",
};

/** A country (ISO 3166 alpha-2) → its currency; null when it isn't one of ours. */
export function currencyForRegion(region: string | null | undefined): CurrencyCode | null {
  if (!region) return null;
  const code = region.toUpperCase();
  if (BY_REGION[code]) return BY_REGION[code];
  return EURO_REGIONS.has(code) ? "EUR" : null;
}
const EURO_REGIONS = new Set(["AT", "BE", "HR", "CY", "EE", "FI", "FR", "DE", "GR", "IE", "IT", "LV", "LT", "LU", "MT", "MC", "ME", "NL", "PT", "SK", "SI", "ES", "AD", "XK"]);

/** The device's time zone → currency ("Europe/Berlin" → EUR, "Asia/Makassar" → IDR); null when unknown. */
export function currencyForTimeZone(timeZone: string | null | undefined): CurrencyCode | null {
  return timeZone ? currencyForRegion(TZ_COUNTRY[timeZone]) : null;
}

/**
 * Only a language tag WITH a country decides ("de-DE" → EUR); "de" alone says nothing about where someone is. English tags never decide:
 * "en-GB" and "en-US" are what people all over the world pick for their interface – that is how a German browser ended up showing £.
 */
export function currencyForLanguages(languages: readonly string[]): CurrencyCode | null {
  for (const tag of languages) {
    const [language, ...rest] = tag.split("-");
    if (language.toLowerCase() === "en") continue;
    const region = rest.find((p) => /^[A-Z]{2}$/i.test(p));
    const currency = currencyForRegion(region);
    if (currency) return currency;
  }
  return null;
}

export const VIEWER_COUNTRY_COOKIE = "viewer_country";

/** The country the server saw for this request (proxy cookie); null locally and without the header. */
export function readViewerCountry(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${VIEWER_COUNTRY_COOKIE}=([A-Za-z]{2})`));
  return match ? match[1].toUpperCase() : null;
}

function deviceTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}
function deviceLanguages(): readonly string[] {
  if (typeof navigator === "undefined") return [];
  return navigator.languages?.length ? navigator.languages : navigator.language ? [navigator.language] : [];
}

/** What the device itself suggests: time zone, else a language tag with a country. */
export function deviceCurrency(): CurrencyCode | null {
  return currencyForTimeZone(deviceTimeZone()) ?? currencyForLanguages(deviceLanguages());
}

/** Steps 3–6 – worked out fresh each time, never saved. */
export function detectViewerCurrency(): CurrencyCode {
  return currencyForRegion(readViewerCountry()) ?? deviceCurrency() ?? "EUR";
}

const VIEWER_KEY = "simpulo:currency";
const listeners = new Set<() => void>();

/**
 * The viewer's own pick, saved as {"code":"GBP","manual":true}. Anything else under the key (the old plain "GBP" an earlier build saved
 * from the browser language) is a guess, not a pick: dropped here.
 */
export function readManualCurrency(): CurrencyCode | null {
  try {
    const raw = localStorage.getItem(VIEWER_KEY);
    if (raw === null) return null;
    try {
      const saved = JSON.parse(raw) as { code?: string; manual?: boolean } | null;
      if (saved?.manual === true && isCurrency(saved.code)) return saved.code;
    } catch {
      // not JSON – the old format
    }
    localStorage.removeItem(VIEWER_KEY);
    return null;
  } catch {
    return null;
  }
}

/** The viewer picks one (footer, filters, booking card, Settings, Dev menu): saved in this browser, everyone showing prices follows. */
export function setViewerCurrency(code: CurrencyCode) {
  try {
    localStorage.setItem(VIEWER_KEY, JSON.stringify({ code, manual: true }));
  } catch {
    // blocked – it holds until reload
  }
  state = { manual: code, detected: state?.detected ?? detectViewerCurrency() };
  listeners.forEach((listener) => listener());
}

/** Back to automatic (Dev menu "Auto"): the pick is forgotten. */
export function clearViewerCurrency() {
  try {
    localStorage.removeItem(VIEWER_KEY);
  } catch {
    // nothing saved
  }
  state = { manual: null, detected: detectViewerCurrency() };
  listeners.forEach((listener) => listener());
}

export type ViewerCurrencyState = { manual: CurrencyCode | null; detected: CurrencyCode };
let state: ViewerCurrencyState | null = null;
const SERVER_STATE: ViewerCurrencyState = { manual: null, detected: "EUR" };
export function subscribeViewerCurrency(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function viewerCurrencySnapshot(): ViewerCurrencyState {
  return (state ??= { manual: readManualCurrency(), detected: detectViewerCurrency() });
}
export function serverViewerCurrencySnapshot(): ViewerCurrencyState {
  return SERVER_STATE;
}

// ─── Labels ──────────────────────────────────────────────────────────────────────

/**
 * "€", "Rp", "฿" – a fixed table, never Intl: the server's ICU and the browser's differ (Node says "SAR", Chrome the new riyal sign "⃁"),
 * and a label rendered on both must be the same text or hydration fails. Where there's no common sign, the code itself.
 */
const SYMBOLS: Partial<Record<CurrencyCode, string>> = {
  EUR: "€", USD: "$", GBP: "£", CAD: "$", AUD: "$", NZD: "$", JPY: "¥", KRW: "₩", CNY: "¥", HKD: "$", TWD: "$", SGD: "$", THB: "฿",
  IDR: "Rp", VND: "₫", PHP: "₱", MYR: "RM", INR: "₹", LKR: "Rs", NPR: "Rs", ILS: "₪", TRY: "₺", GEL: "₾", EGP: "E£", ZAR: "R", KES: "KSh",
  TZS: "TSh", MXN: "$", BRL: "R$", ARS: "$", CLP: "$", COP: "$", PEN: "S/", CRC: "₡", SEK: "kr", NOK: "kr", DKK: "kr", ISK: "kr", PLN: "zł",
  CZK: "Kč", HUF: "Ft", RON: "lei", BGN: "лв",
};
export function currencySymbol(code: CurrencyCode | string): string {
  return SYMBOLS[code as CurrencyCode] ?? code;
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

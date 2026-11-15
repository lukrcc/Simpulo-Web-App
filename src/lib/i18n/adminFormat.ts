// The admin's numbers and dates in German format – the one place (CLAUDE.md "Admin"): 1.580 · 4.400 € · 14. Nov. · 38 % (a space before %).
// Stored dates are calendar dates / UTC timestamps, so everything formats in UTC. The app outside /admin keeps its own (i18n/format.ts).

const LOCALE = "de-DE";
const number = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });
const euro = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const compactNumber = new Intl.NumberFormat(LOCALE, { notation: "compact", maximumFractionDigits: 1 });
const dayMonth = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", timeZone: "UTC" });
const monthShort = new Intl.DateTimeFormat(LOCALE, { month: "short", timeZone: "UTC" });

const toDate = (value: string) => new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value);

/** 1.580 */
export const num = (n: number) => number.format(n);
/** 1,5 · 0,75 – up to two decimals */
export const dec = (n: number) => decimal.format(n);
/** 4.400 € */
export const eur = (n: number) => euro.format(n);
/** 38 % – from a value 0–100 */
export const pct = (n: number) => `${number.format(n)} %`;
/** 38 % – from a share 0–1; "–" without one */
export const share = (ratio: number | null) => (ratio === null ? "–" : pct(Math.round(ratio * 100)));
/** 1 Tag · 5 Tage */
export const days = (n: number) => `${number.format(n)} ${n === 1 ? "Tag" : "Tage"}`;
/** 48.200 / 1,2 Mio. */
export const compact = (n: number) => compactNumber.format(n);
/** 14. Nov. – from YYYY-MM-DD or an ISO timestamp */
export const day = (value: string) => dayMonth.format(toDate(value));
/** Nov. – from YYYY-MM */
export const month = (value: string) => monthShort.format(toDate(`${value}-01`));

const relative = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const monthLongFmt = new Intl.DateTimeFormat(LOCALE, { month: "long", timeZone: "UTC" });
/** "+3" · "−300 €" – a signed amount with a true minus sign; `as` formats the magnitude */
export const signed = (n: number, as: (n: number) => string = num) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${as(Math.abs(n))}`;
/** "+8,6 %" – from a ratio (0.086), one decimal */
export const signedPct = (ratio: number) => `${ratio > 0 ? "+" : ratio < 0 ? "−" : "±"}${relative.format(Math.abs(ratio * 100))} %`;
/** Oktober – from YYYY-MM-DD */
export const monthLong = (value: string) => monthLongFmt.format(toDate(value));

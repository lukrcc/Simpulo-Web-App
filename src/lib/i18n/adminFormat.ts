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
const monthYearFmt = new Intl.DateTimeFormat(LOCALE, { month: "long", year: "numeric", timeZone: "UTC" });
/** Februar 2027 – from YYYY-MM */
export const monthYear = (value: string) => monthYearFmt.format(toDate(`${value}-01`));

const weekdayFmt = new Intl.DateTimeFormat(LOCALE, { weekday: "long", timeZone: "UTC" });
/** Freitag – from YYYY-MM-DD */
export const weekday = (value: string) => weekdayFmt.format(toDate(value));

/** The ISO week number (Monday first) of YYYY-MM-DD. */
const isoWeek = (value: string) => {
  const d = toDate(value);
  const thursday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7)));
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  return 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / 86_400_000 / 7 - (3 - ((firstThursday.getUTCDay() + 6) % 7)) / 7);
};

const MONTHS_3 = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const WEEKDAYS_2 = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const parts = (value: string) => {
  const d = toDate(value);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), w: d.getUTCDay() };
};
const longDate = new Intl.DateTimeFormat(LOCALE, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** "Mo 1.9." – a day on the chart's axis */
export const dayShort = (value: string) => {
  const p = parts(value);
  return `${WEEKDAYS_2[p.w]} ${p.d}.${p.m + 1}.`;
};
/** "1.–7. Sep" · "29. Sep – 5. Okt" – a stretch, short */
export const rangeShort = (from: string, to: string) => {
  const a = parts(from);
  const b = parts(to);
  if (from === to) return `${a.d}. ${MONTHS_3[a.m]}`;
  return a.m === b.m ? `${a.d}.–${b.d}. ${MONTHS_3[b.m]}` : `${a.d}. ${MONTHS_3[a.m]} – ${b.d}. ${MONTHS_3[b.m]}`;
};
/** "1.–7. September 2026" · "29. September – 5. Oktober 2026" – a stretch, in full */
export const rangeLong = (from: string, to: string) => {
  const a = parts(from);
  const b = parts(to);
  const name = (v: string) => monthLongFmt.format(toDate(v));
  if (from === to) return `${a.d}. ${name(from)} ${a.y}`;
  if (a.y !== b.y) return `${a.d}. ${name(from)} ${a.y} – ${b.d}. ${name(to)} ${b.y}`;
  return a.m === b.m ? `${a.d}.–${b.d}. ${name(to)} ${b.y}` : `${a.d}. ${name(from)} – ${b.d}. ${name(to)} ${b.y}`;
};

/** The chart's axis for one bar: the label and an optional small second line (a week's "KW 36"). */
export const chartTick = (from: string, to: string, level: "day" | "week" | "month" | "quarter" | "year"): { main: string; sub: string | null } => {
  const p = parts(from);
  if (level === "day") return { main: dayShort(from), sub: null };
  if (level === "week") return { main: rangeShort(from, to), sub: `KW ${isoWeek(from)}` };
  if (level === "month") return { main: `${MONTHS_3[p.m]} ${String(p.y).slice(2)}`, sub: null };
  if (level === "quarter") return { main: `Q${Math.floor(p.m / 3) + 1} ${String(p.y).slice(2)}`, sub: null };
  return { main: String(p.y), sub: null };
};

/** The tooltip's title for one bar, with full dates: "KW 36 · 1.–7. September 2026", "September 2026", "Q3 2026 · Juli – September 2026". */
export const chartTitle = (from: string, to: string, level: "day" | "week" | "month" | "quarter" | "year"): string => {
  const p = parts(from);
  if (level === "day") return longDate.format(toDate(from));
  if (level === "week") return `KW ${isoWeek(from)} · ${rangeLong(from, to)}`;
  if (level === "month") return `${monthLongFmt.format(toDate(from))} ${p.y}`;
  if (level === "quarter") return `Q${Math.floor(p.m / 3) + 1} ${p.y} · ${rangeLong(from, to)}`;
  return String(p.y);
};

/** A period by its first day (YYYY-MM-DD): "21. Nov." · "KW 47" · "Nov." · "Q4 26" · "2026". */
export const periodLabel = (start: string, period: "day" | "week" | "month" | "quarter" | "year") =>
  period === "day"
    ? day(start)
    : period === "week"
      ? `KW ${isoWeek(start)}`
      : period === "month"
        ? month(start.slice(0, 7))
        : period === "quarter"
          ? `Q${Math.floor((Number(start.slice(5, 7)) - 1) / 3) + 1} ${start.slice(2, 4)}`
          : start.slice(0, 4);

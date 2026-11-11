"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { currencySymbol } from "@/lib/currency";
import { convertApprox } from "@/lib/rates";
import type { Currency, Stay } from "@/lib/types";
import { isCityOpen, regionShort, stayPrice } from "@/lib/utils";

type PricedStay = Pick<Stay, "accommodationStatus" | "pricePerPerson" | "budgetPerPerson" | "currency">;

/** Calendar dates are stored as YYYY-MM-DD; timestamps as ISO. Both are formatted in UTC. */
function toDate(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : new Date(value);
}

/**
 * Server (Node) and browser ICU versions differ in the spaces they emit (plain, thin, narrow no-break…), which
 * breaks hydration. Normalise every kind of whitespace to a plain space so both sides render the same text.
 */
function clean(text: string): string {
  return text.replace(/\s/g, " ");
}

/** "Feb 12 – 26" → "Feb 12–26"; ranges across months ("Feb 26 – Mar 5") keep their spaces. */
function tightRange(text: string): string {
  return clean(text).replace(/(\d) – (\d)/, "$1–$2");
}

/**
 * A money range with the currency symbol once ("€400–600", not "€400 – €600") and without Intl's own "~" for
 * equal ends (the labels add their own) – equal ends are just one amount.
 */
function moneyRange(format: Intl.NumberFormat, min: number, max: number): string {
  if (Math.round(min) === Math.round(max)) return clean(format.format(min));
  const parts = format.formatRangeToParts(min, max);
  const symbolInFront = parts.some((p) => p.type === "currency" && p.source === "startRange");
  return clean(
    parts
      .filter((p) => !(symbolInFront && p.type === "currency" && p.source === "endRange"))
      .map((p) => p.value)
      .join(""),
  )
    .replace(/\s*–\s*/, "–")
    .trim();
}

/** "2027-03-…" → "March 2027" */
const monthOf = (locale: string, date: string) => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date.slice(0, 7)}-15T00:00:00Z`));

/** Open dates: "March 2027", or a run of months "January – March 2027" (Open a House lets a host pick several in a row). */
const monthsOf = (locale: string, start: string, end: string) => {
  if (!end || end.slice(0, 7) === start.slice(0, 7)) return monthOf(locale, start);
  const at = (d: string) => new Date(`${d.slice(0, 7)}-15T00:00:00Z`);
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).formatRange(at(start), at(end));
};

/** Locale-aware number/date formatting – pure, usable on the server with getLocale(). */
export function createFormatters(locale: string) {
  const currency = (code: string) => new Intl.NumberFormat(locale, { style: "currency", currency: code, maximumFractionDigits: 0 });
  const dates = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" });
  const short = dates({ month: "short", day: "numeric" });
  const long = dates({ month: "short", day: "numeric", year: "numeric" });

  return {
    /** "€480" */
    price: (amount: number, code = "EUR") => clean(currency(code).format(amount)),
    /** "≈"-style rounded amount for approximate conversions: "A$790" */
    approx: (amount: number, code: string) =>
      clean(new Intl.NumberFormat(locale, { style: "currency", currency: code, maximumSignificantDigits: 2 }).format(amount)),
    /** "A$660–990", rounded like approx */
    approxRange: (min: number, max: number, code: string) =>
      moneyRange(new Intl.NumberFormat(locale, { style: "currency", currency: code, maximumSignificantDigits: 2 }), min, max),
    /** "€", "Rp", "฿" – for input prefixes; the fixed table (src/lib/currency.ts), the same on server and browser */
    currencySymbol: (code: string) => currencySymbol(code),
    /** "€400–600" */
    priceRange: (min: number, max: number, code = "EUR") => moneyRange(currency(code), min, max),
    /** "Feb 12–26" – null without both dates */
    shortRange: (start: string, end: string) => (start && end ? tightRange(short.formatRange(toDate(start), toDate(end))) : null),
    /** "Feb 12–26, 2027" */
    longRange: (start: string, end: string) => (start && end ? tightRange(long.formatRange(toDate(start), toDate(end))) : null),
    /** "Oct 18" */
    day: (value: string) => clean(short.format(toDate(value))),
    /** "2:32 PM" */
    time: (value: string) => clean(dates({ hour: "numeric", minute: "2-digit" }).format(toDate(value))),
    /** "German" for "de" – in the UI language */
    language: (code: string) => new Intl.DisplayNames([locale], { type: "language" }).of(code) ?? code,
  };
}

export type Formatters = ReturnType<typeof createFormatters>;

/**
 * Formatting plus the common labels built on it (plurals, "Dates TBD", price labels, "city open").
 * Only formats – user content (titles, pitches, messages) is passed through untouched.
 */
export function useFormat() {
  const locale = useLocale();
  const t = useTranslations("common");

  return useMemo(() => {
    const f = createFormatters(locale);
    return {
      ...f,
      shortRange: (start: string, end: string) => f.shortRange(start, end) ?? t("datesTbd"),
      longRange: (start: string, end: string) => f.longRange(start, end) ?? t("datesTbd"),
      /** A House's dates on one line: "Feb 12–26" – or "March 2027" while only the month is settled. */
      stayDates: (stay: Pick<Stay, "startDate" | "endDate" | "datesOpen">) => (stay.datesOpen && stay.startDate ? monthsOf(locale, stay.startDate, stay.endDate) : (f.shortRange(stay.startDate, stay.endDate) ?? t("datesTbd"))),
      /** "Feb 12–26, 2027" – or "March 2027" */
      stayDatesLong: (stay: Pick<Stay, "startDate" | "endDate" | "datesOpen">) => (stay.datesOpen && stay.startDate ? monthsOf(locale, stay.startDate, stay.endDate) : (f.longRange(stay.startDate, stay.endDate) ?? t("datesTbd"))),
      nights: (count: number) => t("nights", { count }),
      spots: (count: number) => t("spots", { count }),
      people: (count: number) => t("people", { count }),
      links: (count: number) => t("links", { count }),
      vibe: (key: Stay["vibe"]) => t(`vibes.${key}`),
      /** "34 · Spain" – the age only when it may show (`showAge`: its owner released it, or it's their own; config/privacy.ts), else "Spain". */
      ageAndCountry: (user: { age: number; country: string }, showAge: boolean) =>
        showAge && user.age > 0 ? t("ageAndCountry", { age: user.age, country: user.country }) : user.country,
      /** "Bangkok, Thailand" – or "Bali · city open". The area stays on the House page (placeLabel). */
      placeName: (stay: Pick<Stay, "city" | "region" | "location">) =>
        isCityOpen(stay) ? t("cityOpen", { region: regionShort(stay) }) : [stay.location.city, stay.location.country].filter(Boolean).join(", "),
      /** "Canggu, Bali, Indonesia" – or "Bali, Indonesia · city open" */
      placeLabel: (stay: Pick<Stay, "city" | "region">) =>
        isCityOpen(stay) ? t("cityOpen", { region: stay.region }) : [stay.city, stay.region].filter(Boolean).join(", "),
      /** The House's own currency (its host's views): "€480 pp", "€400–600 pp" or "Price set with crew" */
      priceLabel: (stay: PricedStay) => {
        const price = stayPrice(stay);
        if (price.kind === "price") return t("pricePerPersonShort", { price: f.price(price.amount, stay.currency) });
        if (price.kind === "budget") return t("budgetPerPersonShort", { range: f.priceRange(price.min, price.max, stay.currency) });
        return t("budgetTbd");
      },
      /**
       * On cards: one currency, the viewer's, in their browser's number format – "£380 pp", "£340–470 pp". Converted
       * amounts are rounded (fixed mock rates), the House's own currency stays exact.
       */
      /** One amount of the House (e.g. the place's total) in the viewer's currency: exact when it's the same, else 3 significant digits. */
      viewerAmount: (amount: number, from: Currency, code: string, numberLocale: string) => {
        const same = code === from;
        const money = new Intl.NumberFormat(numberLocale, { style: "currency", currency: code, ...(same ? { maximumFractionDigits: 0 } : { maximumSignificantDigits: 3 }) });
        return clean(money.format(convertApprox(amount, from, code as Currency)));
      },
      viewerPriceLabel: (stay: PricedStay, code: string, numberLocale: string) => {
        const price = stayPrice(stay);
        if (price.kind === "tbd") return t("budgetTbd");
        const same = code === stay.currency;
        const money = new Intl.NumberFormat(numberLocale, { style: "currency", currency: code, ...(same ? { maximumFractionDigits: 0 } : { maximumSignificantDigits: 2 }) });
        const to = (amount: number) => convertApprox(amount, stay.currency, code as Currency);
        // Another currency than the House's: converted, so "≈" in front ("≈ €480 pp"); the same one: exact, no "≈".
        const approx = same ? "" : "≈ ";
        if (price.kind === "price") return approx + t("pricePerPersonShort", { price: clean(money.format(to(price.amount))) });
        return approx + t("budgetPerPersonShort", { range: moneyRange(money, to(price.min), to(price.max)) });
      },
    };
  }, [locale, t]);
}

export type Format = ReturnType<typeof useFormat>;

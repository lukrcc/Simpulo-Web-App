"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import type { Stay } from "@/lib/types";
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
      tightRange(new Intl.NumberFormat(locale, { style: "currency", currency: code, maximumSignificantDigits: 2 }).formatRange(min, max)),
    /** "€", "A$", "฿" – for input prefixes */
    currencySymbol: (code: string) =>
      new Intl.NumberFormat(locale, { style: "currency", currency: code }).formatToParts(0).find((p) => p.type === "currency")?.value ?? code,
    /** "€400–600" */
    priceRange: (min: number, max: number, code = "EUR") => tightRange(currency(code).formatRange(min, max)),
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
      nights: (count: number) => t("nights", { count }),
      spots: (count: number) => t("spots", { count }),
      people: (count: number) => t("people", { count }),
      links: (count: number) => t("links", { count }),
      vibe: (key: Stay["vibe"]) => t(`vibes.${key}`),
      ageAndCountry: (user: { age: number; country: string }) => t("ageAndCountry", { age: user.age, country: user.country }),
      /** "Canggu" – or "Bali · city open" */
      placeName: (stay: Pick<Stay, "city" | "region">) =>
        isCityOpen(stay) ? t("cityOpen", { region: regionShort(stay) }) : stay.city,
      /** "Canggu, Bali, Indonesia" – or "Bali, Indonesia · city open" */
      placeLabel: (stay: Pick<Stay, "city" | "region">) =>
        isCityOpen(stay) ? t("cityOpen", { region: stay.region }) : [stay.city, stay.region].filter(Boolean).join(", "),
      /** "Canggu, Bali" – or "Bali · city open" */
      shortPlaceLabel: (stay: Pick<Stay, "city" | "region">) =>
        isCityOpen(stay) ? t("cityOpen", { region: regionShort(stay) }) : [stay.city, regionShort(stay)].filter(Boolean).join(", "),
      /** "€480 pp", "~€400–600 pp" or "Budget TBD" */
      priceLabel: (stay: PricedStay) => {
        const price = stayPrice(stay);
        if (price.kind === "price") return t("pricePerPersonShort", { price: f.price(price.amount, stay.currency) });
        if (price.kind === "budget") return t("budgetPerPersonShort", { range: f.priceRange(price.min, price.max, stay.currency) });
        return t("budgetTbd");
      },
    };
  }, [locale, t]);
}

export type Format = ReturnType<typeof useFormat>;

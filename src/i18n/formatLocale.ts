"use client";

import { useLocale } from "next-intl";
import { useSyncExternalStore } from "react";
import { locales } from "./config";

/**
 * Words and formats are two things (CLAUDE.md "Texte und Sprachen"): the interface speaks the UI language (en), but dates, numbers and money
 * follow the viewer's region from the browser – the UI language with the browser's region: "de-DE" → "en-DE" (English month names, German
 * order and separators: "12 Feb", "1.251,50"). Unknown to Intl: the UI language alone. Only the format locale – never for words.
 */
export function formatLocaleOf(uiLocale: string, browser: string | undefined): string {
  // Only the product's languages (i18n/config.ts): the admin's German keeps its German formats (lib/i18n/adminFormat.ts) untouched.
  if (!browser || !(locales as readonly string[]).includes(uiLocale)) return uiLocale;
  try {
    const region = new Intl.Locale(browser).maximize().region;
    if (!region) return uiLocale;
    const candidate = `${uiLocale}-${region}`;
    return Intl.DateTimeFormat.supportedLocalesOf(candidate).length && Intl.NumberFormat.supportedLocalesOf(candidate).length ? candidate : uiLocale;
  } catch {
    return uiLocale;
  }
}

const noSubscribe = () => () => {};

/** The locale for Intl formats in the browser. On the server and while hydrating the UI language (CLAUDE.md "Hydration"), right after the region's. */
export function useFormatLocale(): string {
  const ui = useLocale();
  return useSyncExternalStore(noSubscribe, () => formatLocaleOf(ui, navigator.language), () => ui);
}

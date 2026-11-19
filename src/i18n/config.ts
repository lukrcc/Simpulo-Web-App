/**
 * Supported UI languages. Adding one = add its code here and a lib/i18n/<code>.ts with the same shape as lib/i18n/en.ts.
 * Nothing else changes: the locale is picked per request (see request.ts) – there's no locale in the URL.
 */
export const locales = ["en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

/** A user's explicit choice (a future setting) wins over the browser's Accept-Language. */
export const LOCALE_COOKIE = "simpulo-locale";

/**
 * The language choice in Settings (General › Language) stays hidden until a second language exists – the account field
 * (UserSettings.language, default "en") and the cookie are ready. Turn on together with the second entry in `locales`.
 */
export const SHOW_LANGUAGE_SETTING = false;

function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/**
 * Setting first, then the best Accept-Language match ("de-AT,de;q=0.9,en;q=0.8" → "de"), then the default.
 * Pure, so it can run anywhere (request config, a proxy, tests).
 */
export function resolveLocale({ setting, acceptLanguage }: { setting?: string; acceptLanguage?: string | null }): Locale {
  if (setting && isLocale(setting)) return setting;
  const ranked = (acceptLanguage ?? "")
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { base: tag.toLowerCase().split("-")[0], q: q === undefined ? 1 : Number(q) };
    })
    .filter((entry) => entry.base && entry.q > 0)
    .toSorted((a, b) => b.q - a.q);
  return ranked.find((entry) => isLocale(entry.base))?.base as Locale | undefined ?? defaultLocale;
}

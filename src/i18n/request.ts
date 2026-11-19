import { getRequestConfig } from "next-intl/server";
import en, { type ProductMessages } from "@/lib/i18n/en";
import { defaultLocale, LOCALE_COOKIE, locales, resolveLocale, type Locale } from "./config";

/**
 * With one language there's nothing to negotiate, so pages stay static (cacheComponents). Once a second locale
 * exists, the locale comes from the user setting (cookie) or Accept-Language – that reads request data, which
 * makes rendering dynamic per request.
 */
async function requestLocale(): Promise<Locale> {
  if (locales.length === 1) return defaultLocale;
  const { cookies, headers } = await import("next/headers");
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  return resolveLocale({ setting: cookieStore.get(LOCALE_COOKIE)?.value, acceptLanguage: headerStore.get("accept-language") });
}

/**
 * The product's texts (lib/i18n/<code>.ts), imported statically – a TypeScript module the bundler knows and reloads on every save (the old
 * messages/en.json was served one save late by the dev server). A new locale gets its line here.
 */
const MESSAGES: Record<Locale, ProductMessages> = { en };

export default getRequestConfig(async () => {
  const locale = await requestLocale();
  return {
    locale,
    messages: MESSAGES[locale],
    // Stored dates are calendar dates (YYYY-MM-DD) and UTC timestamps – format them in UTC everywhere.
    timeZone: "UTC",
  };
});

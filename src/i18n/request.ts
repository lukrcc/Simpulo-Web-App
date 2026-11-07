import { getRequestConfig } from "next-intl/server";
import en from "../../messages/en.json";
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
 * The message files, imported statically: the bundler then knows them and reloads them on every save. A template import
 * (`messages/${locale}.json`) isn't watched reliably – the dev server kept serving old texts, and every new key showed as a
 * MISSING_MESSAGE error ("1 Issue" in Next's overlay). A new locale gets its line here.
 */
const MESSAGES: Record<Locale, typeof en> = { en };

export default getRequestConfig(async () => {
  const locale = await requestLocale();
  return {
    locale,
    messages: MESSAGES[locale],
    // Stored dates are calendar dates (YYYY-MM-DD) and UTC timestamps – format them in UTC everywhere.
    timeZone: "UTC",
  };
});

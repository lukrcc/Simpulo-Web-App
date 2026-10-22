import { getRequestConfig } from "next-intl/server";
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

export default getRequestConfig(async () => {
  const locale = await requestLocale();
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    // Stored dates are calendar dates (YYYY-MM-DD) and UTC timestamps – format them in UTC everywhere.
    timeZone: "UTC",
  };
});

import type messages from "../messages/en.json";
import type { AdminMessages } from "./lib/i18n/admin.de";
import type { Locale } from "./i18n/config";

// Typed message keys: a missing or misspelled key is a type error. Other locales must match en.json. The admin's texts are German and
// live in lib/i18n/admin.de.ts – provided only inside /admin (AdminFrame), typed here as the "admin" namespace.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages & { admin: AdminMessages };
  }
}

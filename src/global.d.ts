import type messages from "../messages/en.json";
import type { Locale } from "./i18n/config";

// Typed message keys: a missing or misspelled key is a type error. Other locales must match en.json.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}

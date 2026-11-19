import { createTranslator } from "next-intl";
import en from "./en";

/**
 * The product's texts outside React's providers – emails, share images, the manifest, the notification channels (CLAUDE.md "Texte und
 * Sprachen"): the same lib/i18n/en.ts, the same ICU placeholders and plurals (Intl.PluralRules), full keys ("emails.magicLink.headline").
 * Later the recipient's language (UserSettings.language) picks the messages here.
 */
export const tEn = createTranslator({ locale: "en", messages: en });

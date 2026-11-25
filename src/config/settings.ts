// Settings' list (CLAUDE.md "Settings wie iOS-Einstellungen"): groups and rows as data – a new entry is one line here, no UI change.
// Group 1 (the account card) and the last group (Log out) are fixed in the view; these are the rows between. Words in en.ts `settings.ui.*`.

export type SettingsIcon = "bell" | "shield" | "languages" | "card" | "settings" | "help" | "admin";

export interface SettingsEntry {
  id: string;
  /** Key under settings.ui */
  title: string;
  icon: SettingsIcon;
  href: string;
  /** Key under settings.ui – the grey value on the right */
  value?: string;
  /** 2 … 5: the group it sits in (1 is the account card, Log out its own group at the end) */
  group: 2 | 3 | 4 | 5;
  adminOnly?: boolean;
}

export const SETTINGS_ENTRIES: SettingsEntry[] = [
  { id: "notifications", title: "nav.notifications", icon: "bell", href: "/settings/notifications", group: 2 },
  { id: "privacy", title: "nav.privacy", icon: "shield", href: "/settings/privacy", group: 2 },
  { id: "language", title: "nav.language", icon: "languages", href: "/settings/language", value: "general.english", group: 2 },
  { id: "payments", title: "nav.payments", icon: "card", href: "/settings/payments", group: 3 },
  { id: "general", title: "nav.general", icon: "settings", href: "/settings/general", group: 3 },
  { id: "help", title: "nav.help", icon: "help", href: "/help", group: 4 },
  { id: "admin", title: "general.admin", icon: "admin", href: "/admin", group: 5, adminOnly: true },
];

/** The areas behind /settings/<area> and the pages behind one (/settings/<area>/<page>). Appearance is gone – light and dark live in the tab bar. */
export const SETTINGS_SECTIONS = ["account", "notifications", "privacy", "language", "payments", "general"] as const;
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];
export const SETTINGS_SUBPAGES = ["payments/history", "general/currency", "general/language"] as const;
export type SettingsSubpage = (typeof SETTINGS_SUBPAGES)[number];
/** Old names (and old #hash links) still land in the right place; "appearance" goes back to the list. */
export const SETTINGS_ALIASES: Record<string, SettingsSection | ""> = { payouts: "payments", verification: "payments", preferences: "general", profile: "account", appearance: "" };

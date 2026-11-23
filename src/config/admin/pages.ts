// "Eine Farbe = eine Seite" (CLAUDE.md, Apple-Art): every admin page has ONE fixed colour and ONE symbol. The colour marks only three places –
// the small square behind a card's symbol, the card titles, and the page's charts and active topic capsule; the symbol is the same in the
// side list and on the page's card in Übersicht. The colours are tokens (styles/admin-tokens.css --adm-c-<colour>, -fill; Hell and Dunkel).
// Structure only, no words.
import type { AdminIconName } from "@/components/admin/adminIcons";
import type { TopicPage } from "../admin-topics";

export const ADMIN_COLORS = ["green", "blue", "purple", "orange", "pink", "yellow", "teal", "red", "slate"] as const;
export type AdminColor = (typeof ADMIN_COLORS)[number];

/** The side list's pages (AdminShell keys) with their colour and symbol. */
export const ADMIN_PAGE_STYLE = {
  cockpit: { color: "slate", icon: "Gauge" },
  inbox: { color: "slate", icon: "Inbox" },
  zeitplan: { color: "red", icon: "CalendarRange" },
  money: { color: "green", icon: "Wallet" },
  growth: { color: "blue", icon: "TrendingUp" },
  topics: { color: "purple", icon: "Tags" },
  houses: { color: "orange", icon: "Home" },
  hosts: { color: "pink", icon: "Users" },
  marketing: { color: "yellow", icon: "Megaphone" },
  data: { color: "slate", icon: "Network" },
  labs: { color: "slate", icon: "FlaskConical" },
  vision: { color: "slate", icon: "Compass" },
  funding: { color: "teal", icon: "Landmark" },
  platform: { color: "slate", icon: "SlidersHorizontal" },
} as const satisfies Record<string, { color: AdminColor; icon: AdminIconName }>;
export type AdminPageKey = keyof typeof ADMIN_PAGE_STYLE;

/** The pages' hrefs (the side list's) – a card leading to another page takes that page's colour and symbol. */
export const ADMIN_PAGE_HREF: Readonly<Record<AdminPageKey, string>> = {
  cockpit: "/admin",
  inbox: "/admin/aufgaben",
  zeitplan: "/admin/zeitplan",
  money: "/admin/money",
  growth: "/admin/growth",
  topics: "/admin/topics",
  houses: "/admin/houses",
  hosts: "/admin/hosts",
  marketing: "/admin/marketing",
  data: "/admin/data",
  labs: "/admin/labore",
  vision: "/admin/vision",
  funding: "/admin/funding",
  platform: "/admin/platform",
};

/** The card pages (config/admin/cards) by their side-list page. */
export const TOPIC_PAGE_NAV: Readonly<Record<TopicPage, AdminPageKey>> = {
  overview: "cockpit",
  money: "money",
  growth: "growth",
  analysis: "topics",
  houses: "houses",
  hosts: "hosts",
  marketing: "marketing",
  data: "data",
  funding: "funding",
  vision: "vision",
  system: "platform",
  labs: "labs",
};

/** The page an admin href belongs to (the longest matching page href). */
export function pageOfHref(href: string): AdminPageKey | null {
  const path = href.split("?")[0];
  const hit = (Object.entries(ADMIN_PAGE_HREF) as [AdminPageKey, string][])
    .filter(([, h]) => path === h || (h !== "/admin" && path.startsWith(`${h}/`)))
    .sort((a, b) => b[1].length - a[1].length)[0];
  return hit ? hit[0] : null;
}

/** CSS custom properties for a page's colour: --adm-page (words, charts) and --adm-page-fill (the symbol's square). */
export const pageColorVars = (color: AdminColor) => ({ "--adm-page-color": `var(--adm-c-${color})`, "--adm-page-fill": `var(--adm-c-${color}-fill)` });

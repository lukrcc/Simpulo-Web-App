import type { AdminIconName } from "@/components/admin/adminIcons";

// "Karten-Inhalte als Konfiguration" (CLAUDE.md): what a page's cards show – order, title, main number, sub numbers, target, and where a
// card leads (its topic's content view `tab` with `focus`, or another page `href`). The numbers are keys into the page's number pool (built
// from lib/admin/metrics.ts by the page); the words are in lib/i18n/admin-tiles/topics.ts. Change card contents only here – the UI
// building blocks (components/admin/AdminTopics.tsx) stay stable.

export interface CardDef {
  /** The topic (?topic=) – also the title key (admin.topicCards.<page>.<topic>) unless `title` names another */
  topic: string;
  /** Its symbol (components/admin/adminIcons.ts) – unique on its page; a card leading to another page shows that page's (CLAUDE.md "Eine Farbe = eine Seite") */
  icon: AdminIconName;
  /** Another title key */
  title?: string;
  /** The page's content view that shows the topic (?tab=) */
  tab: string;
  /** What it opens with (?focus=) */
  focus?: string;
  /** A card that leads to another page */
  href?: string;
  /** The main number: a key of the page's pool */
  main: string;
  /** 1–3 sub numbers: keys of the pool (a key the pool doesn't have is left out) */
  subs?: readonly string[];
  /** A pool key shown small top right instead of the change (Labore: the status as text) */
  badge?: string;
  /** Show the main number's target bottom right (default true) */
  target?: boolean;
}

import { ADMIN_CARDS } from "./admin/cards";

// "Acht Karten" (CLAUDE.md): every admin page starts with at most eight large cards (4 × 2), one card = one topic; a click opens the topic
// view of the same page (?topic=…). Per page its topics in order and where a topic's content lives: the page's content view (`tab`) and
// what it opens with (`focus`: a number marked, a filter, a sort). The colour is the page's (config/admin/pages.ts, "Eine Farbe = eine
// Seite"); the cards differ by their symbols. Structure only – the words in lib/i18n/admin-tiles/topics.ts (admin.topicCards).

/** At most eight cards per page (4 × 2). */
export const TOPIC_PALETTE = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export interface TopicDef {
  key: string;
  /** The page's content view that shows it (?tab=) */
  tab: string;
  /** What it opens with (?focus=) */
  focus?: string;
  /** A topic that lives on another page: the card links there (Übersicht's cards, Vision › Finanzierung) */
  href?: string;
}

export type TopicPage = "overview" | "money" | "growth" | "analysis" | "houses" | "hosts" | "marketing" | "data" | "funding" | "vision" | "system" | "labs";

/** Every page's topics – derived from its cards (config/admin/cards: order, routes); nothing to keep in step by hand. */
export const ADMIN_TOPICS: Readonly<Record<TopicPage, readonly TopicDef[]>> = Object.fromEntries(
  Object.entries(ADMIN_CARDS).map(([page, cards]) => [page, cards.map((c) => ({ key: c.topic, tab: c.tab, focus: c.focus, href: c.href }))]),
) as unknown as Record<TopicPage, readonly TopicDef[]>;

/** The topic an old link (?tab=…&focus=…) lands on: the one with that tab and focus, else the first with that tab. */
export function topicOfTab(page: TopicPage, tab: string, focus: string | null): string | null {
  const list = ADMIN_TOPICS[page];
  return (list.find((x) => x.tab === tab && (x.focus ?? null) === focus) ?? list.find((x) => x.tab === tab))?.key ?? null;
}

/** Pages with more than eight topics (CLAUDE.md "Acht Karten") – empty when fine. */
export function topicClashes(): string[] {
  return Object.entries(ADMIN_TOPICS)
    // Labore (its 3 × 3 board of labs) and Geld (with Einnahmequellen) have nine.
    .filter(([page, list]) => list.length > (page === "labs" || page === "money" ? 9 : TOPIC_PALETTE.length))
    .map(([page, list]) => `${page}: ${list.length} Themen, höchstens ${TOPIC_PALETTE.length}`);
}

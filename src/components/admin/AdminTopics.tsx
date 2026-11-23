"use client";

// "Acht Karten" (CLAUDE.md, replaces the capsule rules): every admin page starts with at most eight large cards (4 × 2, filling the height
// without scrolling), one card = one topic: its main number large, 1–3 sub numbers with a short label under it, the change top right, the
// target bottom right – no running text. Neutral cards, the page's ONE colour only on the symbol's square and the title (CLAUDE.md "Eine
// Farbe = eine Seite"); the symbols tell the cards apart. A click opens the topic view of the same page (?topic=…): top left "← {Seite}",
// the topic's symbol square, beside it a slim bar with every topic as a capsule in the page's colour (the active one stronger with an edge), the period right; under it the topic's content (the page's content view, `tab`,
// opened with its `focus`). The state in the URL – ?topic= with the tab and focus it stands for (the page reads those as before); old links
// (?tab=…) land on the matching topic; the browser's back goes back.
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ADMIN_TOPICS, topicOfTab, type TopicPage } from "@/config/admin-topics";
import { ADMIN_CARDS } from "@/config/admin/cards";
import { ADMIN_PAGE_STYLE, pageColorVars, pageOfHref } from "@/config/admin/pages";
import { ADMIN_ICONS, type AdminIconName } from "./adminIcons";
import type { Change, Status } from "@/lib/admin/metrics";
import { setAdminSearch, useAdminSearch } from "@/lib/admin/urlState";
import { cn } from "@/lib/utils";
import { ChangeLine, InfoTip } from "./AdminNumbers";
import { AdminTabs } from "./AdminLayout";
import { TileValue } from "./AdminTiles";

export interface TopicCardSpec {
  /** The topic's key (config/admin-topics.ts) */
  key: string;
  info: string;
  value: ReactNode;
  /** What the main number is ("Umsatz") – small under it */
  mainLabel?: string;
  /** A second grey line under it (Labore: the guiding question) */
  caption?: string;
  /** Small top right instead of the change (Labore: the status as text) */
  badge?: ReactNode;
  change?: Change | null;
  target?: { text: string; status: Status | null };
  /** 1–3 sub numbers, each with a short label */
  subs?: readonly ({ label: string; value: ReactNode; oneLine?: boolean } | null | undefined | false)[];
}

/** The open topic (?topic=) and the ways to it; keeps ?tab/?focus in step with it, and turns an old ?tab= link into its topic. */
export function useAdminTopic(page: TopicPage) {
  const params = useAdminSearch();
  const topic = params.get("topic");
  // Vision keeps its own ?view= – the same as a tab here.
  const tab = params.get("tab") ?? params.get("view");
  const focus = params.get("focus");
  const def = topic ? ADMIN_TOPICS[page].find((x) => x.key === topic) : undefined;
  useEffect(() => {
    // An old link (?tab=… without ?topic): to its topic, the same tab and focus kept.
    if (!topic && tab) {
      const next = topicOfTab(page, tab, focus);
      if (next) setAdminSearch({ topic: next, tab, focus }, { replace: true });
      return;
    }
    // A topic without its tab (a shared ?topic= link): add the tab and focus it stands for.
    if (def && def.tab && tab !== def.tab) setAdminSearch({ tab: def.tab, focus: def.focus ?? null }, { replace: true });
  }, [page, topic, tab, focus, def]);
  const open = (key: string) => {
    const d = ADMIN_TOPICS[page].find((x) => x.key === key);
    if (d) setAdminSearch({ topic: key, tab: d.tab, focus: d.focus ?? null, view: null, block: null });
  };
  const back = () => setAdminSearch({ topic: null, tab: null, focus: null, view: null, block: null });
  return { topic: def ? def.key : null, open, back };
}

/**
 * The head's left side: on the overview the page's title, small; in a topic "← {Seite}" and the topics as capsules in their cards' colours.
 * `available`: the topics shown (a page may hide one – Analyse's depth).
 */
export function TopicHeader({ page, title }: { page: TopicPage; title: string }) {
  const t = useTranslations(`admin.topicCards.${page}` as "admin.topicCards.money");
  const tc = useTranslations("admin.topicCards");
  const { topic, open, back } = useAdminTopic(page);
  // The overview has no title of its own (CLAUDE.md "kein Seitentitel"): the side list shows where you are.
  if (!topic) return null;
  const list = ADMIN_TOPICS[page];
  const icon = ADMIN_CARDS[page].find((c) => c.topic === topic)?.icon;
  return (
    <div className="flex min-w-0 items-center gap-2">
      <button type="button" data-topic-back onClick={back} className="adm-cap adm-press shrink-0">
        <ArrowLeft aria-hidden className="size-3.5" />
        {title}
      </button>
      {/* The topic's head: the same symbol square as its card. */}
      {icon && <IconSquare icon={icon} />}
      {/* The slim bar: the smaller capsules (AdminSubTabs' size), so eight topics fit one row beside the back button and the period. */}
      <AdminTabs
        level="sub"
        label={tc("barLabel", { page: title })}
        value={topic}
        onChange={(key) => {
          const d = list.find((x) => x.key === key);
          if (d?.href) window.location.assign(d.href);
          else open(key);
        }}
        // Every topic in the page's colour (CLAUDE.md "Eine Farbe = eine Seite"), the active one stronger.
        tabs={list.map((x) => ({ value: x.key, label: t(`${x.key}` as "history"), tone: "var(--adm-page-color)" }))}
      />
    </div>
  );
}

/** Up to eight cards over the full height under the head (4 × 2; fewer cards get larger). */
export function TopicCards({ page, pool }: { page: TopicPage; /** The page's numbers by key (from lib/admin/metrics.ts) – the cards' config picks from them */ pool: NumberPool }) {
  const t = useTranslations(`admin.topicCards.${page}` as "admin.topicCards.money");
  const tc = useTranslations("admin.cockpit");
  const { open } = useAdminTopic(page);
  const list = ADMIN_TOPICS[page];
  // The cards' contents from their config (config/admin/cards/<page>.ts): main number, sub numbers, target – a key the pool lacks is left out.
  const cards = ADMIN_CARDS[page].flatMap((c): TopicCardSpec[] => {
    const main = pool[c.main];
    if (!main) return [];
    const subs = (c.subs ?? []).map((k) => pool[k]).filter((x): x is NumberEntry => Boolean(x)).map((x) => ({ label: x.label, value: x.value, oneLine: x.oneLine }));
    const badge = c.badge ? pool[c.badge]?.value : undefined;
    return [{ key: c.topic, info: main.info ?? "", value: main.value, mainLabel: main.label, caption: main.caption, badge, change: main.change, target: c.target === false ? undefined : main.target, subs }];
  });
  const defOf = (topic: string) => ADMIN_CARDS[page].find((c) => c.topic === topic);
  const titleOf = (topic: string) => defOf(topic)?.title ?? topic;
  const shown = list.flatMap((def) => {
    const card = cards.find((c) => c.key === def.key);
    return card ? [{ def, card }] : [];
  });
  // Nine (Labore) is 3 × 3.
  const cols = shown.length <= 4 ? Math.max(1, shown.length) : shown.length <= 6 || shown.length === 9 ? 3 : 4;
  const rows = Math.ceil(shown.length / cols);
  const box = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(240);
  useLayoutEffect(() => {
    const measure = () => {
      const top = box.current?.getBoundingClientRect().top;
      if (top === undefined || window.innerWidth < 1024) return setH(240);
      const gap = box.current ? parseFloat(getComputedStyle(box.current).rowGap) || 0 : 0;
      // The whole height down to the page's small bottom margin (--adm-page-bottom), shared by the rows.
      const bottom = box.current ? parseFloat(getComputedStyle(box.current).getPropertyValue("--adm-page-inset")) || 18 : 18;
      const next = Math.floor(Math.max(160, (window.innerHeight - (top + window.scrollY) - bottom - gap * (rows - 1)) / rows));
      setH((now) => (now === next ? now : next));
    };
    measure();
    const bar = document.querySelector("[data-admin-bar]");
    const observer = bar ? new ResizeObserver(measure) : null;
    if (bar) observer!.observe(bar);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [rows]);
  return (
    <div ref={box} data-topic-cards className="grid grid-cols-1 gap-(--adm-grid-gap) md:grid-cols-2 lg:grid-cols-(--cols)" style={{ "--cols": `repeat(${cols}, minmax(0, 1fr))` } as CSSProperties}>
      {shown.map(({ def, card }) => {
        const label = t(`${titleOf(def.key)}` as "history");
        const subs = (card.subs ?? []).filter((x): x is { label: string; value: ReactNode; oneLine?: boolean } => Boolean(x)).slice(0, 3);
        // Neutral cards (CLAUDE.md "Eine Farbe = eine Seite"): the page's colour only on the symbol's square and the title; a card leading to
        // another page takes that page's colour.
        const target = def.href ? pageOfHref(def.href) : null;
        const colour = target ? pageColorVars(ADMIN_PAGE_STYLE[target].color) : {};
        return (
          <div
            key={def.key}
            data-topic-card={def.key}
            style={{ ...colour, height: h } as CSSProperties}
            className="adm-tile adm-press relative flex min-w-0 flex-col overflow-hidden rounded-xl border px-5 pt-4 pb-4"
          >
            {def.href ? (
              <Link href={def.href} data-card-link aria-label={tc("openCard", { label })} className="absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)" />
            ) : (
              <button type="button" data-card-link aria-label={tc("openCard", { label })} onClick={() => open(def.key)} className="absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)" />
            )}
            {/* Top: the symbol square, the topic in the page's colour and its ⓘ left, the change right. */}
            <div className="flex min-w-0 shrink-0 items-center gap-2">
              <IconSquare icon={defOf(def.key)?.icon} />
              <span className="flex min-w-0 flex-1 items-center gap-1">
                <span className="adm-page-title truncate text-body font-semibold">{label}</span>
                <InfoTip text={card.info} />
              </span>
              {card.badge !== undefined && <span className="shrink-0 text-small whitespace-nowrap">{card.badge}</span>}
              {card.badge === undefined && card.change !== undefined && (
                <span className="shrink-0 text-small whitespace-nowrap normal-case tracking-normal">
                  <ChangeLine change={card.change} short />
                </span>
              )}
            </div>
            {/* The main number, large. */}
            <div className="adm-card-big mt-2 min-w-0 shrink-0">
              <TileValue value={card.value} className="max-w-full" />
              {card.mainLabel && card.mainLabel !== label && <p className="mt-1 truncate text-small text-muted">{card.mainLabel}</p>}
              {card.caption && <p className="mt-0.5 line-clamp-2 text-small text-muted">{card.caption}</p>}
            </div>
            {/* The sub numbers at the foot, each with its short label; the target bottom right. */}
            <dl className="mt-auto flex min-w-0 flex-col gap-1.5 pt-3">
              {subs.map((s) => (
                <div key={s.label} className="flex min-w-0 items-baseline justify-between gap-3">
                  <dt className="shrink-0 text-small text-muted">{s.label}</dt>
                  {/* Never cut: a long value wraps (right-aligned) instead of "…". */}
                  <dd className={cn("min-w-0 text-right text-body font-semibold tabular-nums text-ink", s.oneLine ? "truncate" : "[overflow-wrap:anywhere]")}>{s.value}</dd>
                </div>
              ))}
              {card.target && (
                <div className="flex justify-end pt-0.5">
                  <span data-tile-target className="inline-flex items-center gap-1 text-small whitespace-nowrap text-muted">
                    <span aria-hidden className="inline-block size-1.5 rounded-full bg-current opacity-60" />
                    {card.target.text}
                    {card.target.status && <span className="sr-only"> ({card.target.status})</span>}
                  </span>
                </div>
              )}
            </dl>
          </div>
        );
      })}
    </div>
  );
}

/** The small rounded square in the page's colour with the white symbol (a card's, a topic's head). */
export function IconSquare({ icon }: { icon?: AdminIconName }) {
  if (!icon) return null;
  const Icon = ADMIN_ICONS[icon];
  return (
    <span aria-hidden data-icon-square className="adm-icon-sq">
      <Icon />
    </span>
  );
}

/** One number of a page's pool: what it is, its value, and – as a main number – its ⓘ, change and target. */
export interface NumberEntry {
  label: string;
  value: ReactNode;
  /** A second grey line under a main number */
  caption?: string;
  /** As a sub number: one line, cut with "…" (the full text in the card's detail) */
  oneLine?: boolean;
  info?: string;
  change?: Change | null;
  target?: { text: string; status: Status | null };
}
export type NumberPool = Readonly<Record<string, NumberEntry | undefined>>;

/** A page's pool from its number list (tiles with keys) and extra numbers by key. */
export function numberPool(list: readonly ({ key: string } & NumberEntry)[], extra: Record<string, NumberEntry | null | undefined | false> = {}): NumberPool {
  const out: Record<string, NumberEntry> = {};
  for (const x of list) out[x.key] = x;
  for (const [k, v] of Object.entries(extra)) if (v) out[k] = v;
  return out;
}

/** A tile-like spec (from a page's number pool) as a sub number: its label and value. */
export const sub = (x: { label: string; value: ReactNode } | undefined | null, label?: string) => (x ? { label: label ?? x.label, value: x.value } : null);

/** A card from a page's number pool: the main number (value, change, target, ⓘ) and 1–3 sub numbers (pool entries or label/value pairs). */
export function cardOf(key: string, main: { label?: string; info: string; value: ReactNode; change?: Change | null; target?: { text: string; status: Status | null } } | undefined, ...subs: ({ label: string; value: ReactNode } | null | undefined | false)[]): TopicCardSpec | null {
  if (!main) return null;
  return { key, info: main.info, value: main.value, mainLabel: main.label, change: main.change, target: main.target, subs: subs.map((x) => (x ? { label: x.label, value: x.value } : null)) };
}

/** A page's pool of numbers by key. */
export const poolOf = <T extends { key: string }>(list: readonly T[]) => (key: string) => list.find((x) => x.key === key);

/** The page's content for a topic: only shown while one is open. */
export function TopicContent({ page, children }: { page: TopicPage; children: ReactNode }) {
  const { topic } = useAdminTopic(page);
  return topic ? <div className={cn("min-w-0")}>{children}</div> : null;
}

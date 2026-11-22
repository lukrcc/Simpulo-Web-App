"use client";

// The admin's pyramid, level 2 (CLAUDE.md "Admin-Pyramide"): the "Überblick" tab of a page – everything of that page at a glance. On top ONE
// sentence in plain words, built from the page's numbers ("Diese Woche: 645 Besucher → 12 Anfragen → 4 Buchungen."); under it ONE card per
// detail tab of the page: the tab's name as title, one main number, at most two lines more, the whole card opens its tab. No charts in the
// cards (Regel „Admin-Diagramme“). Built to fit 1440 × 900 without scrolling: at most 8 cards, four per row.
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { CSSProperties, ReactNode } from "react";
import type { ComparePeriod } from "@/config/admin";
import type { Change } from "@/lib/admin/metrics";
import { useAdminPeriod } from "@/lib/admin/period";
import { cn } from "@/lib/utils";
import { ChangeLine, InfoTip } from "./AdminNumbers";

export interface OverviewCard {
  /** The detail tab it opens (its value) – also the React key */
  key: string;
  /** The tab's name */
  title: string;
  /** The one main number (formatted); left out, the lines carry the card (e.g. "Bestes: … · Schwächstes: …") and read larger */
  value?: ReactNode;
  /** Its change against the period before (getChange), shown as the first extra line */
  change?: Change | null;
  /** At most two short lines more (with a change: one) */
  lines?: readonly ReactNode[];
  /** One sentence: what the number means and what a good value is */
  info?: string;
  /** Opens the tab: a callback (tabs in state) or a link (tabs in the URL) */
  onOpen?: () => void;
  href?: string;
}

/** At most this many cards – more would not fit 1440 × 900 without scrolling. */
export const OVERVIEW_MAX_CARDS = 8;

/** "Diese Woche" · "Diesen Monat" · "Dieses Quartal" · "Dieses Jahr" – the start of the overview's sentence for the admin's period. */
export function usePeriodLead(period?: ComparePeriod): string {
  const t = useTranslations("admin.overviewBlock.lead");
  const [global] = useAdminPeriod();
  return t(period ?? global);
}

/** Columns: as many as cards up to four; six (or nine) cards go in rows of three. */
const columnsFor = (n: number) => (n <= 4 ? Math.max(1, n) : n % 3 === 0 && n % 4 !== 0 ? 3 : 4);

export function AdminOverview({ sentence, cards, label }: { sentence: ReactNode; cards: readonly OverviewCard[]; /** The page's name, for the cards' region */ label: string }) {
  const t = useTranslations("admin.overviewBlock");
  const shown = cards.slice(0, OVERVIEW_MAX_CARDS);
  return (
    <section aria-label={label} data-admin-overview>
      <p data-overview-sentence className="rounded-xl border border-ink/8 bg-(--adm-block) px-5 py-4 text-body-lg text-ink">
        {sentence}
      </p>
      {/* As many columns as cards, at most four (three cards fill the row instead of leaving a gap; six cards are two rows of three). */}
      <ul className="mt-(--adm-inner) grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(var(--ov-cols),minmax(0,1fr))]" style={{ "--ov-cols": columnsFor(shown.length) } as CSSProperties}>
        {shown.map((card) => {
          const extra = (card.lines ?? []).slice(0, card.change !== undefined ? 1 : 2);
          const open = t("open", { tab: card.title });
          return (
            <li key={card.key} data-overview-card className="relative flex min-h-28 min-w-0 flex-col overflow-hidden rounded-xl border border-ink/8 bg-(--adm-block) px-4 pt-3.5 pb-3 transition-colors duration-150 has-[[data-card-link]:hover]:bg-(--adm-block-hover)">
              {card.href ? (
                <Link href={card.href} data-card-link aria-label={open} className="absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)" />
              ) : (
                <button type="button" data-card-link aria-label={open} onClick={card.onOpen} className="absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)" />
              )}
              <span className="flex items-center gap-1 text-eyebrow uppercase text-(--adm-label)">
                {card.title}
                <span aria-hidden> →</span>
                {card.info && <InfoTip text={card.info} />}
              </span>
              {card.value !== undefined && <span className="mt-1 text-h1 tabular-nums text-ink">{card.value}</span>}
              {card.change !== undefined && <ChangeLine change={card.change} className="mt-1 block" />}
              {extra.map((line, i) => (
                <span key={i} className={card.value === undefined ? cn("mt-1.5 truncate text-body tabular-nums", i === 0 ? "text-ink" : "text-muted") : "mt-1 truncate text-small text-muted"}>
                  {line}
                </span>
              ))}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

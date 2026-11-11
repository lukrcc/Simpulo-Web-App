"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Shelf } from "@/components/ui/Shelf";
import { cn } from "@/lib/utils";

/**
 * A calm row's head (Your houses, the profile): the title (display 24px, `text-row`) with how many beside it (muted, 24px); right "See all →"
 * when there's more than shows. The count is optional (a row like "Vibe" has none).
 */
export function RowHead({ id, title, count, seeAll, aside, className }: { id: string; title: string; count?: number; seeAll?: string; /** Right side instead of "See all" */ aside?: ReactNode; className?: string }) {
  const t = useTranslations("common.ui.rows");
  return (
    <div className={cn("flex items-baseline justify-between gap-4", className)}>
      <h2 id={id} className="flex items-baseline gap-2.5 text-row text-ink">
        {title}
        {count !== undefined && <span className="tabular-nums text-muted">{count}</span>}
      </h2>
      {seeAll && (
        <Link href={seeAll} className="group inline-flex shrink-0 items-center gap-1.5 text-body font-semibold text-ink transition-colors duration-150 hover:text-ink/70">
          {t("seeAll")}
          <ArrowRight aria-hidden className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
        </Link>
      )}
      {aside}
    </div>
  );
}

/**
 * One row: its head, 16px under it the cards in one line – each one grid column wide (`.explore-slide`, 4 at 1440px; inside `.explore-root`).
 * More than fit: swipe sideways, with the arrows; no focus curve (Shelf "flat"). `extra` closes the row (e.g. the dashed "Open a House").
 * `cols`: how many show at once – "See all" (to `seeAll`) only with more.
 */
export function CardRow({ id, title, cards, extra, cols, seeAll, count }: { id: string; title: string; cards: { key: string; node: ReactNode }[]; extra?: ReactNode; cols: number; seeAll?: string; /** Shown beside the title; default the number of cards */ count?: number }) {
  const total = cards.length + (extra ? 1 : 0);
  return (
    <section aria-labelledby={`row-${id}`}>
      <RowHead id={`row-${id}`} title={title} count={count ?? cards.length} seeAll={seeAll && total > cols ? seeAll : undefined} />
      <Shelf variant="flat" top="mt-4">
        {cards.map((c) => (
          <div key={c.key} className="explore-slide shrink-0">
            {c.node}
          </div>
        ))}
        {extra && <div className="explore-slide shrink-0">{extra}</div>}
      </Shelf>
    </section>
  );
}

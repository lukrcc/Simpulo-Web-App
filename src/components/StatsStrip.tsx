"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { StripRow } from "@/components/StripFig";
import { cn } from "@/lib/utils";

export interface StatsBlock {
  key: string;
  /** Small, in capitals */
  label: string;
  /** The large number (or a short word) */
  value: ReactNode;
  /** One grey line under it (empty: none) */
  line?: ReactNode;
  /** Where the whole block leads – or `onClick` (a window); neither: a plain block */
  href?: string;
  onClick?: () => void;
}

/**
 * The dark numbers strip (CLAUDE.md "Kennzahlen-Streifen: ein gemeinsamer Baustein") – Your houses and the profile, the same piece: one
 * height (--frame-strip-h, PageFrame `stripHeight`), equal blocks, each a small capital label, a large number and a grey line. A block is a
 * link as a whole: hovering lightens it over its full height – the first and the last to the strip's outer edges, their text still on the
 * page's edge (--strip-edge) –, a small arrow fades in top right (150ms); pressing it 0.98 (reduced motion: only the colour). Thin lines
 * between the blocks over the full height; the two beside a hovered block fade out. Dark in both modes. Phones: one sideways-scrolling row.
 */
export function StatsStrip({ blocks }: { blocks: readonly StatsBlock[] }) {
  return (
    <div
      data-surface="dark"
      data-stats-strip
      className="ember ember-strip flex items-stretch [--strip-edge:24px] sm:[--strip-edge:40px] md:h-(--frame-strip-h) split:[--strip-edge:var(--band-edge)]"
      style={{ ["--stats-cols" as string]: String(blocks.length) }}
    >
      <StripRow className="flex-1 items-stretch md:grid md:grid-cols-[repeat(var(--stats-cols),minmax(0,1fr))]">
        {blocks.map((block) => {
          const body = (
            <>
              <span className="truncate text-small uppercase text-ink/60">{block.label}</span>
              <span className="mt-1 truncate text-h1 tabular-nums text-ink">{block.value}</span>
              <span className="mt-0.5 min-h-5 truncate text-nav font-normal text-ink/70">{block.line}</span>
              {(block.href || block.onClick) && (
                <ArrowUpRight aria-hidden className="stats-arrow absolute right-4 top-4 size-4 text-ink/70" strokeWidth={2} />
              )}
            </>
          );
          const cls = cn("stats-block relative flex min-w-44 shrink-0 flex-col justify-center px-6 py-4 first:pl-(--strip-edge) last:pr-(--strip-edge) md:min-w-0", (block.href || block.onClick) && "stats-link");
          return block.href ? (
            <Link key={block.key} href={block.href} className={cls}>
              {body}
            </Link>
          ) : block.onClick ? (
            <button key={block.key} type="button" onClick={block.onClick} className={cn(cls, "text-left")}>
              {body}
            </button>
          ) : (
            <div key={block.key} className={cls}>
              {body}
            </div>
          );
        })}
      </StripRow>
    </div>
  );
}

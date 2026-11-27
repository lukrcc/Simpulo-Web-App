"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface StatsGroupBlock {
  key: string;
  /** Under the number */
  label: string;
  /** The large number (or a short word) */
  value: ReactNode;
  /** One grey line under the label ("1 to confirm"); empty: none */
  line?: ReactNode;
  /** Where the block leads – or `onClick` (a window); neither: a plain block */
  href?: string;
  onClick?: () => void;
}

/**
 * The numbers as one white group (CLAUDE.md "Profil neu geordnet – Kennzahlen als weiße Gruppe"): radius 24, the raised surface (light white,
 * dark --surface), equal columns – a large number, the label under it, a grey line under that; no lines between the columns. A block with a
 * goal is clickable as a whole (a soft fill on hover). The profile and Your houses use it (it replaced the dark strip there). Phones: 2 × 2.
 */
export function StatsGroup({ blocks, className }: { blocks: readonly StatsGroupBlock[]; className?: string }) {
  return (
    <div data-stats-group className={cn("grid grid-cols-2 gap-1 rounded-[24px] bg-surface p-2 md:grid-cols-[repeat(var(--stats-cols),minmax(0,1fr))]", className)} style={{ ["--stats-cols" as string]: String(blocks.length) }}>
      {blocks.map((block) => {
        const body = (
          <>
            <span className="block truncate text-h1 tabular-nums text-ink">{block.value}</span>
            <span className="mt-1 block truncate text-body font-medium text-ink">{block.label}</span>
            <span className="block min-h-5 truncate text-small text-muted">{block.line}</span>
          </>
        );
        const cls = cn("min-w-0 rounded-[18px] px-4 py-3 text-left", (block.href || block.onClick) && "transition-colors duration-150 hover:bg-ink/4");
        return block.href ? (
          <Link key={block.key} href={block.href} className={cls}>
            {body}
          </Link>
        ) : block.onClick ? (
          <button key={block.key} type="button" onClick={block.onClick} className={cls}>
            {body}
          </button>
        ) : (
          <div key={block.key} className={cls}>
            {body}
          </div>
        );
      })}
    </div>
  );
}

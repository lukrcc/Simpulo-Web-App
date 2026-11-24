import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FullBleedSection } from "./FullBleedSection";

/**
 * A row of cards as a borderless strip across the whole window (CLAUDE.md "Reihen randlos, einheitlicher dunkler Streifen"; replaces the
 * rounded tiles): no radius, no side margin. ONE ground for every row (.row-strip, tokens --row-strip-from/-to): a fixed gradient from near
 * black on the left to a warm dark on the right – Simpulo's orange only faintly over black, never computed from the cards' photos; words
 * light. 64px inside from the top to the title and from the cards to the foot, 64px of page before and after it. Title and "See all →" stay
 * on the page's grid; the cards start on it and run past the window's right edge (after scrolling past the left one too – the shelf's own
 * bleed), never cut at a tile's edge.
 */
export function RowTile({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <FullBleedSection inner="explore-width" padding="py-10 md:py-16" className={cn("band-dark row-strip", className ?? "my-6 md:my-16")}>
      {children}
    </FullBleedSection>
  );
}

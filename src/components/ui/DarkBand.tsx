import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FullBleedSection } from "./FullBleedSection";

/**
 * A horizontal row as a dark band (Explore's rows, Your houses' "For your next trip"): full width, HARD edges top and bottom (no fade, no
 * shadow), Ember – the pre-rendered ground (.band-dark, tokens.css). 64px of the light page before and after it, 64px inside from its top to
 * the title and from the cards to its foot (no eyebrow) – the cards and their host tabs never touch its edge. Its words turn cream by
 * themselves (subtitle 65 %, "See all"); the shelf's arrows cream 12 % circles.
 */
export function DarkBand({ children, className }: { children: ReactNode; /** Instead of the 64px before and after it (e.g. "mt-16 mb-0" at a page's end) */ className?: string }) {
  return (
    <FullBleedSection inner="explore-width" padding="py-16" className={cn("band-dark", className ?? "my-16")}>
      {children}
    </FullBleedSection>
  );
}

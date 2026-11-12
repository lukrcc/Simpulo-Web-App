import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StageBandProps {
  /** From this width on the band meets the header's bar. "lg": below that (Explore's other hero) there is no gradient. */
  from: "md" | "lg";
  className?: string;
  children: ReactNode;
}

/**
 * The stage: Explore's Spotlight (and the pre-launch hero) – on the page's own light ground, a soft glow behind the carousel (.stage-gradient):
 * no surface, no edge. Never from an image's colours, nowhere else. Full-bleed, starting right at the bottom of the header's bar: it pulls itself up by the
 * 16px the page's content starts lower, so the nav tab hangs into the gradient with no strip between them. The Host hero
 * pads its content back down by the same; the Spotlight sets its own padding (EXPLORE_SPACING).
 */
export function StageBand({ from, className, children }: StageBandProps) {
  return (
    <div data-glow-section className={cn("relative isolate", from === "md" ? "md:pt-4" : undefined, className)}>
      <div aria-hidden className={cn("stage-gradient", from === "lg" && "hidden lg:block")} />
      {children}
    </div>
  );
}

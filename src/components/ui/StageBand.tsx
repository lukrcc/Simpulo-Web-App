import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StageBandProps {
  /** From this width on the band meets the header's bar. "lg": below that (Explore's other hero) there is no gradient. */
  from: "md" | "lg";
  className?: string;
  children: ReactNode;
}

/**
 * The stage: Explore's Spotlight (and the pre-launch hero) – a .stage band (src/styles/tokens.css): in hybrid and dark the dark stage with its
 * Ember glow, full width, no rounding, a hard edge at the bottom; in light mode no surface, the old soft wash (.stage-gradient) behind it.
 * Never from an image's colours, nowhere else. Full-bleed, starting right at the bottom of the header's bar: it pulls itself up by the
 * 16px the page's content starts lower, so the nav tab hangs into the gradient with no strip between them. The Host hero
 * pads its content back down by the same; the Spotlight sets its own padding (EXPLORE_SPACING).
 */
export function StageBand({ from, className, children }: StageBandProps) {
  return (
    <div data-glow-section className={cn("stage stage-open relative isolate", from === "md" ? "md:-mt-4 md:pt-4" : "lg:-mt-4", className)}>
      <div aria-hidden className={cn("stage-gradient", from === "lg" && "hidden lg:block")} />
      {children}
    </div>
  );
}

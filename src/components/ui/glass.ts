/** Frosted-glass styles for UI layered over photos. */
export const glassPill =
  "inline-flex items-center whitespace-nowrap rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-white backdrop-blur-md";

export const glassCircle =
  "flex size-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/15 text-white backdrop-blur-md transition-colors hover:bg-white/25";

/** Readability gradient for text over images: rgba(0,0,0,0.75) at the bottom → transparent. */
export const imageGradient = "bg-linear-to-t from-black/75 via-black/30 to-transparent";

/** Muted variant for placeholder values like "Budget TBD". */
export const glassPillMuted =
  "inline-flex items-center whitespace-nowrap rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/60 backdrop-blur-md";

// Class strings for UI layered over photos.

export const glassCircle =
  "bg-transparent text-muted transition-colors duration-150 hover:bg-ink/6 hover:text-ink flex size-10 shrink-0 items-center justify-center rounded-full";

/** Readability gradient for text over images: rgba(0,0,0,0.75) at the bottom → transparent. */
export const imageGradient = "bg-linear-to-t from-ink/75 via-ink/30 to-transparent";

/** House cards: the gradient behind the text block (over the whole card), and the shadow on every line of it. */
export const cardGradient = "bg-[linear-gradient(to_top,rgba(0,0,0,0.78)_0%,rgba(0,0,0,0.55)_30%,rgba(0,0,0,0.2)_55%,rgba(0,0,0,0)_70%)]";
export const cardTextShadow = "[text-shadow:0_1px_3px_rgba(0,0,0,0.35)]";
/** The title's weight and tracking on every House card; its size is the card type's (h3; SpotlightHero h2 / h1). */
export const cardTitle = "font-bold tracking-[-0.01em] text-on-image";

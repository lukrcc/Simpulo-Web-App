// The home page's Spotlight (CLAUDE.md "Spotlight schneller + Variante eine Größe"). One switch:
//   · "step" (default, CLAUDE.md "Spotlight neu ausbalancieren"): ONE step only – the centre card about 1.12 × the others, every other card
//     the same size; the endless carousel (Embla loop), one card per swipe or arrow.
//   · "uniform" (the alternative): every card the same size (4:5), filling the room – no scaling, native endless scrolling ("Spotlight final").
export type SpotlightMode = "uniform" | "step";

export const HOME = {
  spotlightMode: "step" as SpotlightMode,
  /** "step": the others at this scale of the centre card (1 / 1.12). */
  stepNeighbourScale: 0.893,
  /** The glide from one card to the next, about 350ms ease-out (Embla's duration). */
  emblaDuration: 20,
  /** After one wheel or trackpad gesture, the next only after this long. */
  wheelLockMs: 250,
} as const;

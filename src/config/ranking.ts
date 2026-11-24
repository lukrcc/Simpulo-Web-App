// "For you" – the order of Explore's "Open Houses" and the results' default sort (lib/ranking.ts rankForYou). Each signal is a score from 0 to
// 1; a House's score is the weighted sum. These weights are a first guess with the mock data; they move once real data shows what leads to
// full Houses and people who'd live together again (the Interest ranking model, config/models.ts).
//
// NEVER a signal here: Simpulo's fee, a House's price for Simpulo, revenue or anything else that pays Simpulo more. "For you" orders by what
// fits the person – what Simpulo earns never moves a House up or down.
export const FOR_YOU_WEIGHTS = {
  /** The House's theme is one the person likes (their interests, Houses they joined, hosted or saved, what they're in for) */
  theme: 3,
  /** It starts soon (full score within SOON_DAYS.full, nothing after SOON_DAYS.none) */
  soon: 2,
  /** Someone from Your people is in it, or hosts it */
  people: 3,
  /** Spots are open (the share of spots still free) – a full House can't be joined */
  openSpots: 1.5,
  /** Just opened (full score within NEW_DAYS.full, nothing after NEW_DAYS.none) */
  newness: 1,
} as const;

export const SOON_DAYS = { full: 14, none: 120 } as const;
export const NEW_DAYS = { full: 7, none: 45 } as const;

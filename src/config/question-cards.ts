// First night's question cards (CLAUDE.md "Bogen › Ankommen"): three levels, each a few questions – structure only, the words are in
// lib/i18n/en.ts (house.questions.<level>.<id>). Asked out loud; nothing here is ever saved (only the signal "first night started").

export const QUESTION_LEVELS = ["light", "deeper", "personal"] as const;
export type QuestionLevel = (typeof QUESTION_LEVELS)[number];

/** The decks, in order. Ids are stable (a later deck may add questions; none is ever stored with an answer). */
export const QUESTION_CARDS: Readonly<Record<QuestionLevel, readonly string[]>> = {
  light: ["realReason", "secretlyGood", "bestThisYear"],
  deeper: ["inTheMiddle", "tryHere", "missNow"],
  personal: ["proudUnseen", "hopeCrew", "figuringOut"],
};

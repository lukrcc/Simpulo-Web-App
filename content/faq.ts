// The questions that stood under every "See all" page (/collections/…) until they were taken off the page (CLAUDE.md "Aufräumen – ein Design").
// Kept here for the footer and the help page later – not shown anywhere right now. The live words still sit in src/lib/i18n/en.ts
// (seo.collectionFaq, ids in src/config/seo.ts COLLECTION_FAQ); this is a copy so nothing is lost when that section is cleaned up.
// Placeholders: {name} – the collection's title ("Party Houses"); {percent} – FEE_MODEL.serviceFeePercent (src/config/policies.ts).
export const COLLECTION_FAQ_SAVED = [
  { id: "what", q: "What are {name}?", a: "Houses on Simpulo that fit this theme – shared places for a few weeks, each opened by a host who says what it's about." },
  { id: "who", q: "Who joins these Houses?", a: "People who want the same kind of trip. You see the host and the crew before you ask, and nobody is in without the host's yes." },
  { id: "cost", q: "What does it cost?", a: "Every House shows its price per person: an equal share of the place, plus Simpulo's {percent} % service fee on your share. Asking is free." },
  { id: "open", q: "Can I host one myself?", a: "Yes – open a House with this theme, set the dates and the crew size, and choose who joins." },
] as const;

// What a person agrees to (CLAUDE.md "Zustimmungen") – structure only, the words are in lib/i18n/en.ts `consent.*`.
// The versions are those in the headers of content/legal/terms.en.md and community-guidelines.en.md; the build check
// (scripts/check-legal.ts) stops when they differ. A new version there → raise it here too: everyone agrees once more
// (the Terms at the next visit or login, the guidelines before the next request or the next House).

/** terms – the Terms; age – "I'm 18 or older" (no version); guestCode / hostCode – the community guidelines, guests' and hosts' version. */
export type ConsentKind = "terms" | "age" | "guestCode" | "hostCode";
export const CONSENT_KINDS: readonly ConsentKind[] = ["terms", "age", "guestCode", "hostCode"];

export const CONSENT_DOCS = {
  terms: { version: "0.2", href: "/terms", file: "terms" },
  guestCode: { version: "0.2", href: "/community-guidelines", file: "community-guidelines" },
  hostCode: { version: "0.2", href: "/community-guidelines#hosts", file: "community-guidelines" },
} as const satisfies Record<Exclude<ConsentKind, "age">, { version: string; href: string; file: string }>;
export type VersionedConsent = keyof typeof CONSENT_DOCS;

/** The guidelines in short, before the first request (en.ts consent.code.points.<id>). */
export const GUEST_CODE_POINTS = ["respect", "noMeansNo", "harassment", "place", "report"] as const;
/** Hosts: the same, then these (before the first House they open). */
export const HOST_CODE_POINTS = ["honest", "book", "answer", "allowed"] as const;

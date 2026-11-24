// Everything Simpulo stores on a device – the one list (CLAUDE.md "Speicherung und Tracker"). Only what's needed to make Simpulo work; no
// analytics, no advertising, no identifiers for tracking – so no cookie banner. A new entry needs a decision by Lukas first: anything not
// needed makes a consent banner necessary.
//   necessary – needed for a function the person uses or a choice they made (strictly necessary: no consent needed)
//   product   – stored in production; "mock" / "dev": only with mock data (dev, demo) or only in dev – never for real users
// content/legal/cookies.en.md lists every product entry in its table; the build check (scripts/check-legal.ts) makes sure it does.

export type StorageKind = "cookie" | "localStorage" | "sessionStorage" | "indexedDB";

export interface StorageEntry {
  /** As stored ("{id}" for a part that varies) */
  name: string;
  kind: StorageKind;
  /** Why (German, for the team – the words for users are in the cookies page) */
  purpose: string;
  necessary: boolean;
  scope: "product" | "mock" | "dev";
}

export const STORAGE: readonly StorageEntry[] = [
  // ── Cookies ──
  { name: "simpulo_theme", kind: "cookie", purpose: "Hell/Dunkel/System – damit das erste Bild stimmt (1 Jahr)", necessary: true, scope: "product" },
  { name: "viewer_country", kind: "cookie", purpose: "Nur der Ländercode (vom Server), für die Währung der Preise (30 Tage)", necessary: true, scope: "product" },
  { name: "simpulo-locale", kind: "cookie", purpose: "Gewählte Sprache – erst, wenn es eine zweite gibt", necessary: true, scope: "product" },
  { name: "simpulo_preview", kind: "cookie", purpose: "Vor dem Launch: Passwort richtig eingegeben (signiert, nie das Passwort; 90 Tage)", necessary: true, scope: "product" },
  { name: "simpulo_demo", kind: "cookie", purpose: "Demo: Passwort richtig eingegeben (30 Tage)", necessary: true, scope: "mock" },
  // ── localStorage ──
  { name: "simpulo:currency", kind: "localStorage", purpose: "Selbst gewählte Währung", necessary: true, scope: "product" },
  { name: "simpulo:currency-hint", kind: "localStorage", purpose: "Hinweis „Prices in …“ schon gezeigt", necessary: true, scope: "product" },
  { name: "simpulo:house-photo-hint", kind: "localStorage", purpose: "House-Seite: Hinweis „weitere Fotos“ (Bild gleitet kurz) schon gezeigt", necessary: true, scope: "product" },
  { name: "simpulo:install-prompt:v2", kind: "localStorage", purpose: "App-Hinweis: zuletzt gezeigt und „Don't show again“", necessary: true, scope: "product" },
  { name: "simpulo:push-asked", kind: "localStorage", purpose: "Wann nach Benachrichtigungen gefragt wurde (höchstens zweimal)", necessary: true, scope: "product" },
  { name: "simpulo:install-seen:{id}", kind: "localStorage", purpose: "Welche Zusagen/Zahlungen den App-Hinweis schon ausgelöst haben", necessary: true, scope: "product" },
  { name: "simpulo:standalone-welcomed", kind: "localStorage", purpose: "Installierte App: Willkommensschritt schon gezeigt", necessary: true, scope: "product" },
  { name: "draftHouse", kind: "localStorage", purpose: "Entwurf von Open a House", necessary: true, scope: "product" },
  { name: "simpulo:house-templates", kind: "localStorage", purpose: "Als Vorlage gespeicherte Houses", necessary: true, scope: "product" },
  { name: "simpulo:idea-votes", kind: "localStorage", purpose: "Ideen-Liste: schon abgestimmt (Funktion aus)", necessary: true, scope: "product" },
  { name: "simpulo:admin:period", kind: "localStorage", purpose: "Admin: zuletzt gewählter Zeitraum", necessary: true, scope: "product" },
  { name: "simpulo:mock-user", kind: "localStorage", purpose: "Mock-Login", necessary: true, scope: "mock" },
  { name: "simpulo:mock:{version}:{phase}", kind: "localStorage", purpose: "Mock-Daten über Reloads", necessary: true, scope: "mock" },
  { name: "simpulo:growth", kind: "localStorage", purpose: "Mock: Einladungen, gespeicherte Suchen, Mock-Ereignisse", necessary: true, scope: "mock" },
  { name: "simpulo:payments", kind: "localStorage", purpose: "Mock-Zahlungen", necessary: true, scope: "mock" },
  { name: "simpulo:mock:admin:v1", kind: "localStorage", purpose: "Mock-Admin-Daten", necessary: true, scope: "mock" },
  { name: "simpulo:arc-mail:{id}", kind: "localStorage", purpose: "Mock-E-Mails des Bogens nur einmal ins Log", necessary: true, scope: "mock" },
  { name: "simpulo:phase", kind: "localStorage", purpose: "Dev-Menü: Plattform-Phase", necessary: true, scope: "dev" },
  { name: "simpulo:flags", kind: "localStorage", purpose: "Dev-Menü: Schalter", necessary: true, scope: "dev" },
  { name: "simpulo:dev", kind: "localStorage", purpose: "Dev-Menü: Einstellungen", necessary: true, scope: "dev" },
  // ── sessionStorage (gone when the tab closes) ──
  { name: "simpulo:draft:{chat}", kind: "sessionStorage", purpose: "Noch nicht gesendete Nachricht", necessary: true, scope: "product" },
  { name: "simpulo:spotlight-intro", kind: "sessionStorage", purpose: "Intro des Spotlights nur einmal je Sitzung", necessary: true, scope: "product" },
  { name: "simpulo:hero", kind: "sessionStorage", purpose: "Reihenfolge der Houses im Spotlight für diese Sitzung", necessary: true, scope: "product" },
  { name: "simpulo:in-app-hint-dismissed", kind: "sessionStorage", purpose: "Hinweis „Open in browser“ weggeklickt", necessary: true, scope: "product" },
  { name: "simpulo:tab-user", kind: "sessionStorage", purpose: "Dev-Menü „Open as …“ in diesem Tab", necessary: true, scope: "dev" },
  // ── IndexedDB ──
  { name: "simpulo-memories", kind: "indexedDB", purpose: "Hochgeladene Album-Dateien, bis es den Cloud-Speicher gibt", necessary: true, scope: "product" },
];

/**
 * Stored by older builds and no longer – removed from the browser once (lib/storage.ts removeObsoleteStorage): analytics and attribution
 * that weren't needed (first touch, landing ref, visit counts, first app start, viewed Houses, seen arc cards).
 */
export const OBSOLETE_STORAGE = {
  localStorage: ["simpulo:first-touch", "simpulo:visits", "simpulo:standalone-seen"],
  sessionStorage: ["simpulo:ref", "simpulo:visit-counted"],
  /** Prefixes */
  sessionPrefixes: ["simpulo:viewed:", "simpulo:arc-seen:"],
} as const;

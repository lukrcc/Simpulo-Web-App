// Admin › System › Backlog: the building blocks that are decided but not built (CLAUDE.md "Admin"). Edit by hand here; the status of each
// item is stored through the adapter (AdminData.backlog, lib/admin/store.ts) – the `status` below is only the start value.
// Admin texts in German (like everything in /admin).

export type BacklogPhase = "desktop" | "mobile" | "darkMode" | "backend" | "beforeLaunch" | "afterLaunch";
export type BacklogStatus = "open" | "inProgress" | "done";

export const BACKLOG_PHASES: readonly BacklogPhase[] = ["desktop", "mobile", "darkMode", "backend", "beforeLaunch", "afterLaunch"];
export const BACKLOG_STATUSES: readonly BacklogStatus[] = ["open", "inProgress", "done"];

export interface BacklogItem {
  id: string;
  title: string;
  /** One line */
  description: string;
  phase: BacklogPhase;
  status: BacklogStatus;
}

/**
 * The launch plan, section "Später" – details and decisions behind these items. TODO: enter the link to the launch plan here (it lives
 * outside the repo); empty – the note shows without a link.
 */
export const LAUNCH_PLAN_URL = "";

/**
 * Start values. Built and documented in CLAUDE.md (its own rule section) = "done"; what is decided but not built = "open". The status each
 * admin sets later is stored over these (AdminData.backlog).
 */
export const BACKLOG: readonly BacklogItem[] = [
  // ── Built (CLAUDE.md) – kept so the list shows the way ──
  { id: "house-area", title: "House-Bereich für Mitglieder", description: "Chat · Crew · Plan · Moments · Me", phase: "desktop", status: "done" },
  { id: "arc-1", title: "Bogen 1: Absicht und Crew-Seite", description: "Absicht vor der Anreise und Crew-Seite", phase: "desktop", status: "done" },
  { id: "arc-2", title: "Bogen 2: Abschlussrunde", description: "Abschlussrunde und Tag danach", phase: "desktop", status: "done" },
  { id: "arc-3", title: "Bogen 3: First night", description: "First night mit Fragenkarten", phase: "desktop", status: "done" },
  { id: "arc-4", title: "Bogen 4: 30-Tage-Frage", description: "30-Tage-Frage und Do it again", phase: "beforeLaunch", status: "done" },
  { id: "arc-5", title: "Bogen 5: House agreement", description: "House agreement", phase: "beforeLaunch", status: "done" },
  { id: "arc-6", title: "Bogen 6: Halbzeit", description: "Halbzeit, Höhepunkt, Rhythmus", phase: "afterLaunch", status: "done" },
  { id: "arc-7", title: "Bogen 7: Host-Kit", description: "Host-Kit, Founding Host, Host wirbt Host (vorbereitet)", phase: "afterLaunch", status: "done" },
  { id: "program", title: "Programm-Baukasten", description: "Tagesplan für Pro Hosts, eigene Bogen-Momente", phase: "afterLaunch", status: "done" },
  { id: "depth", title: "Soziale Tiefe", description: "Easy · Balanced · Deep (gebaut, zum Launch aus)", phase: "beforeLaunch", status: "done" },
  { id: "network", title: "Netzwerk", description: "Crew bleibt, I'm in for mit Abgleich, Jahrestag", phase: "beforeLaunch", status: "done" },
  { id: "host-at-home", title: "Host from your place", description: "Zeitfenster am eigenen Ort", phase: "afterLaunch", status: "done" },
  { id: "place-kind", title: "Art des Ortes", description: "Art des Ortes beim Eröffnen", phase: "desktop", status: "done" },
  { id: "space", title: "About the space", description: "Raum-Daten beim Eröffnen, öffentlich nur Zimmer, Bäder, Küche, draußen", phase: "desktop", status: "done" },
  { id: "chat-background", title: "Chat-Hintergrund wählbar", description: "Sechs feste Hintergründe, pro Chat und als Standard", phase: "beforeLaunch", status: "done" },
  { id: "install", title: "Installation /get", description: "/get mit QR und Installations-Hinweisen", phase: "mobile", status: "done" },
  { id: "onboarding", title: "Onboarding", description: "Gast- und Host-Onboarding, Push zum guten Moment", phase: "beforeLaunch", status: "done" },
  { id: "notify-catalog", title: "Benachrichtigungs-Katalog", description: "Alle E-Mails und Hinweise in einem Katalog, Vorschau /dev/emails", phase: "beforeLaunch", status: "done" },
  { id: "tax-journal", title: "Buchungsjournal", description: "Steuern: Journal, DATEV-CSV, PDF, Rücklage", phase: "beforeLaunch", status: "done" },
  // ── Decided, not built ──
  { id: "getting-there", title: "Getting there", description: "Gemeinsame Anreise koordinieren (Simpulo bucht nichts)", phase: "afterLaunch", status: "open" },
  { id: "host-circle", title: "Host-Kreis klein", description: "Notify me, eigener Link", phase: "beforeLaunch", status: "open" },
  { id: "mobile-pass", title: "Mobile- und iPad-Durchgang", description: "Alle Seiten auf Telefon und Tablet, Safari und Web-App, nach der Prüfmatrix", phase: "mobile", status: "open" },
  { id: "dark-mode", title: "Dark Mode D1–D3", description: "Fundament steht – die Seiten einzeln anpassen", phase: "darkMode", status: "open" },
  { id: "i18n-1", title: "Mehrsprachigkeit I1", description: "Zweite Sprache: Datei, locales, Language-Einstellung sichtbar", phase: "afterLaunch", status: "open" },
  { id: "privacy", title: "Datenschutz-Umsetzung", description: "Datenschutz-Regeln serverseitig, Speicherfristen, Auskunft und Löschung im Backend", phase: "backend", status: "open" },
  { id: "data-layer", title: "Umzugsfähigkeit (lib/data)", description: "Alle Zugriffe über lib/data, echter Adapter statt Mock", phase: "backend", status: "open" },
  { id: "width-test", title: "Breiten-Test", description: "npm run test:breiten grün über alle Seiten und Breiten", phase: "beforeLaunch", status: "open" },
  { id: "performance", title: "Performance", description: "Ladezeiten, Bildgrößen, Bundle – messen und senken", phase: "beforeLaunch", status: "open" },
  { id: "backend", title: "Backend-Phase", description: "Firebase, Stripe, Resend, Push – die Mocks ablösen", phase: "backend", status: "open" },
  { id: "day-house", title: "Nearby / Day House", description: "Houses ohne Übernachtung, Treffen in der Nähe", phase: "afterLaunch", status: "open" },
  { id: "simpulo-base", title: "Simpulo Base", description: "Nach dem Umzug", phase: "afterLaunch", status: "open" },
  { id: "liveHouseStreamers", title: "Live House für Streamer", description: "Kennzeichnung, Zustimmung je Gast, kamerafreie Zonen und Zeiten", phase: "afterLaunch", status: "open" },
];

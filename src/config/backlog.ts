// Admin › System › Backlog: the building blocks that are decided but not built (CLAUDE.md "Admin"). Edit by hand here; the status of each
// item is stored through the adapter (AdminData.backlog, lib/admin/store.ts) – the `status` below is only the start value.
// Admin texts in German (like everything in /admin).

export type BacklogPhase = "desktop" | "mobile" | "pwa" | "beforeLaunch" | "afterLaunch";
export type BacklogStatus = "open" | "inProgress" | "done";

export const BACKLOG_PHASES: readonly BacklogPhase[] = ["desktop", "mobile", "pwa", "beforeLaunch", "afterLaunch"];
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

export const BACKLOG: readonly BacklogItem[] = [
  { id: "house-area", title: "House-Bereich für Mitglieder", description: "Chat · Crew · Plan · Moments · Me", phase: "desktop", status: "open" },
  { id: "arc-1", title: "Bogen 1: Absicht und Crew-Seite", description: "Absicht vor der Anreise und Crew-Seite", phase: "desktop", status: "open" },
  { id: "arc-2", title: "Bogen 2: Abschlussrunde", description: "Abschlussrunde und Tag danach", phase: "desktop", status: "open" },
  { id: "arc-3", title: "Bogen 3: First night", description: "First night mit Fragenkarten", phase: "desktop", status: "open" },
  { id: "arc-4", title: "Bogen 4: 30-Tage-Frage", description: "30-Tage-Frage und Do it again", phase: "beforeLaunch", status: "open" },
  { id: "arc-5", title: "Bogen 5: House agreement", description: "House agreement", phase: "beforeLaunch", status: "open" },
  { id: "arc-6", title: "Bogen 6: Halbzeit", description: "Halbzeit, Höhepunkt, Rhythmus", phase: "afterLaunch", status: "open" },
  { id: "arc-7", title: "Bogen 7: Host-Kit", description: "Host-Kit und Programm-Baukasten", phase: "afterLaunch", status: "open" },
  { id: "depth", title: "Soziale Tiefe", description: "Easy · Balanced · Deep (zum Launch aus)", phase: "beforeLaunch", status: "open" },
  { id: "network", title: "Netzwerk", description: "Crew bleibt, I'm in for mit Abgleich, In deiner Stadt, Jahrestag", phase: "beforeLaunch", status: "open" },
  { id: "host-at-home", title: "Host from your place", description: "Zeitfenster am eigenen Ort", phase: "afterLaunch", status: "open" },
  { id: "place-kind", title: "Art des Ortes", description: "Art des Ortes beim Eröffnen, Explore-Reihen", phase: "desktop", status: "open" },
  { id: "getting-there", title: "Getting there", description: "Gemeinsame Anreise koordinieren", phase: "afterLaunch", status: "open" },
  { id: "host-circle", title: "Host-Kreis klein", description: "Notify me, eigener Link", phase: "beforeLaunch", status: "open" },
  { id: "chat-background", title: "Chat-Hintergrund wählbar", description: "Sechs feste Hintergründe, pro Chat und als Standard", phase: "beforeLaunch", status: "open" },
  { id: "install", title: "Installation /get", description: "/get mit QR und Installationsrate", phase: "pwa", status: "open" },
  { id: "dark-mode", title: "Dark Mode im Produkt", description: "System · Light · Dark (vor Launch, am Ende)", phase: "beforeLaunch", status: "open" },
];

// Admin › Zeitplan – the one source for the schedule: code milestones (with their tasks and goals), the marketing start and the launch,
// the journey, ideas, and the due milestones of the preparation to-dos (config/setup-todos.ts). config/marketing.ts reads the marketing start
// and the launch from here (never twice). German like every admin text. `uncertain` = still open – drawn dashed. Every to-do's status, note
// and cost and every milestone's state are stored through the adapter (AdminData.roadmapTodos, roadmapReached, roadmapMilestones).

/** A date on the plan; `uncertain` = still open (dashed). */
export interface RoadmapDate {
  date: string;
  uncertain?: boolean;
}

/** The timeline's span (Gantt, Nov 2026 – Jun 2027). */
export const ROADMAP_RANGE = { from: "2026-11-01", to: "2027-06-30" } as const;

/** Marketing starts – its four phases follow in weeks (config/marketing.ts LAUNCH_PHASES). */
export const MARKETING_START: RoadmapDate = { date: "2027-03-01" };
/** The launch, early May 2027. */
export const LAUNCH: RoadmapDate = { date: "2027-05-03" };
/** Leaving Germany, about mid-January. */
export const DEPARTURE: RoadmapDate = { date: "2027-01-15" };

/** A task of a code milestone (Zeitplan › To-dos, source „Code“) – due on its milestone's date. */
export interface MilestoneTask {
  id: string;
  title: string;
}

/**
 * Code: milestones with what is done by then; each section runs from the previous one (the first from the timeline's start). `goal`: one
 * sentence; `tasks`: the milestone's steps (a first list from the backlog and CLAUDE.md – edit freely here).
 */
export const CODE_MILESTONES: readonly { id: string; label: string; title: string; date: string; uncertain?: boolean; goal: string; tasks: readonly MilestoneTask[] }[] = [
  {
    id: "m1",
    label: "M1",
    title: "Footer + Dashboard",
    date: "2026-11-30",
    goal: "Footer-System und Admin-Dashboard sind fertig.",
    tasks: [
      { id: "footerLinks", title: "Footer-Links: jede Seite vorhanden" },
      { id: "footerPhone", title: "Footer auf Telefonen: aufklappbare Gruppen" },
      { id: "dashboardTabs", title: "Dashboard-Tabs mit echten Kennzahlen" },
      { id: "overviewFit", title: "Übersicht ohne Scrollen bei 1440 × 900" },
    ],
  },
  {
    id: "m2",
    label: "M2",
    title: "Desktop, iPad, Mobile final",
    date: "2026-12-20",
    goal: "Alle Seiten auf Telefon, Tablet und Desktop abgenommen.",
    tasks: [
      { id: "widthTest", title: "Breiten-Test grün über alle Seiten" },
      { id: "desktop", title: "Desktop abnehmen" },
      { id: "tablet", title: "iPad hochkant und quer abnehmen" },
      { id: "phone", title: "Telefon in Safari und als Web-App abnehmen" },
    ],
  },
  {
    id: "m3",
    label: "M3",
    title: "Dark Mode, Mehrsprachigkeit, Performance, Umzugsfähigkeit",
    date: "2027-01-10",
    goal: "Dunkler Modus, Sprachen vorbereitet, schnell und bereit für Firebase.",
    tasks: [
      { id: "darkMode", title: "Dark Mode: Seiten einzeln anpassen" },
      { id: "i18n", title: "Mehrsprachigkeit vorbereiten (I1)" },
      { id: "performance", title: "Performance messen und senken" },
      { id: "dataLayer", title: "Alle Zugriffe über lib/data" },
    ],
  },
  {
    id: "m4",
    label: "M4",
    title: "Firebase",
    date: "2027-02-07",
    goal: "Echte Daten statt Mock: Firebase läuft.",
    tasks: [
      { id: "project", title: "Projekt simpulo-7c099 einrichten (Staging, Produktion)" },
      { id: "firestore", title: "Firestore-Schema und Security Rules" },
      { id: "auth", title: "Authentication: Magic Link und Passkey" },
      { id: "storage", title: "Storage für Fotos" },
      { id: "functions", title: "Cloud Functions: Fristen, Statistiken, Benachrichtigungen" },
      { id: "adapter", title: "Adapter lib/data auf Firestore umstellen" },
    ],
  },
  {
    id: "m5",
    label: "M5",
    title: "Stripe Connect (Test)",
    date: "2027-02-21",
    goal: "Bezahlen und Auszahlen laufen im Testmodus.",
    tasks: [
      { id: "adapter", title: "Stripe-Adapter lib/payments/stripe.ts" },
      { id: "connect", title: "Connect Express: Onboarding der Hosts" },
      { id: "element", title: "Payment Element im Bezahl-Blatt" },
      { id: "refunds", title: "Rückerstattungen und Webhooks" },
    ],
  },
  {
    id: "m6",
    label: "M6",
    title: "PWA, Puffer, Code fertig",
    date: "2027-02-28",
    goal: "Der Code ist fertig für den Marketing-Start.",
    tasks: [
      { id: "pwa", title: "PWA: Installation und Push" },
      { id: "buffer", title: "Puffer: offene Fehler beheben" },
      { id: "freeze", title: "Code fertig – danach nur Fehlerbehebungen" },
    ],
  },
];

/** A milestone's state (Zeitplan › Meilensteine): open · läuft (today in its stretch) · erreicht (marked) · verschoben (marked). */
export type MilestoneStatus = "open" | "running" | "reached" | "postponed";

/** The journey. */
export const TRAVEL: readonly { id: string; label: string; from: string; to: string; uncertain?: boolean }[] = [
  { id: "de", label: "Deutschland", from: ROADMAP_RANGE.from, to: DEPARTURE.date },
  { id: "bangkok", label: "Bangkok", from: DEPARTURE.date, to: "2027-03-15" },
  { id: "bali", label: "Bali", from: "2027-03-15", to: ROADMAP_RANGE.to, uncertain: true },
];

/** Ideas as markers (dashed). */
export const ROADMAP_IDEAS: readonly { id: string; title: string; date: string; uncertain?: boolean }[] = [
  { id: "baliHouse", title: "Eigenes House in Bali (April)", date: "2027-04-15", uncertain: true },
];

/** When a to-do must be done – a milestone on the timeline ("later": none). */
export type TodoDue = "beforeDeparture" | "beforeLanding" | "beforeStripeLive" | "beforeFirstHouse" | "beforeLaunch" | "later";
export const TODO_DUES: readonly { id: TodoDue; label: string; date: RoadmapDate | null }[] = [
  { id: "beforeDeparture", label: "vor Abreise", date: DEPARTURE },
  { id: "beforeStripeLive", label: "vor Stripe live", date: { date: "2027-02-28", uncertain: true } },
  { id: "beforeLanding", label: "vor öffentlicher Landingpage", date: MARKETING_START },
  // The first Houses come with the phase "Founding Hosts" (week 3 from the marketing start).
  { id: "beforeFirstHouse", label: "vor erstem House", date: { date: "2027-03-15", uncertain: true } },
  { id: "beforeLaunch", label: "vor Launch", date: LAUNCH },
  { id: "later", label: "später", date: null },
];

export type TodoStatus = "open" | "inProgress" | "done" | "later";
export const TODO_STATUSES: readonly TodoStatus[] = ["open", "inProgress", "done", "later"];

/** The launch's fallback rules are in config/marketing.ts (FALLBACK_RULES) – the timeline shows them as a hint at the launch. */

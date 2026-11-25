// Admin › Marketing – the pre-launch plan (CLAUDE.md "Admin › Marketing – Pre-Launch-Plan"): every text, date and goal of the plan lives here;
// the views (components/admin/MarketingPlan.tsx) only read it. Admin language: German (Simpulo words stay English). Change the plan here.
import type { MarketingContact } from "@/lib/data/adapter";

// ─── 1 Countdown: Vorbereitung + vier Phasen, je mit Aufgaben (abhakbar) ─────────────────────────────────────────────────────────────

export interface PlanPhase {
  key: string;
  title: string;
  /** Kurz über dem Balken: "W1–2" … */
  short: string;
  /** YYYY-MM-DD, beide einschließlich */
  from: string;
  to: string;
  tasks: readonly { id: string; text: string }[];
}

export const PLAN_PHASES: readonly PlanPhase[] = [
  {
    key: "prep",
    title: "Vorbereitung",
    short: "Jan–Feb",
    from: "2027-01-04",
    to: "2027-02-28",
    tasks: [
      { id: "film", text: "Nur filmen – Material sammeln, noch nichts posten" },
      { id: "cutter", text: "Cutter finden" },
      { id: "targets", text: "300 Ziele recherchieren" },
      { id: "accounts", text: "Ende Februar: Accounts starten" },
      { id: "offerKit", text: "Founding-Angebot und Host-Kit fertig" },
    ],
  },
  {
    key: "w1",
    title: "Fundament",
    short: "W1–2",
    from: "2027-03-02",
    to: "2027-03-15",
    tasks: [
      { id: "messages", text: "100 Nachrichten (Stufe A + B)" },
      { id: "ownHouse", text: "Eigenes House eröffnen" },
    ],
  },
  {
    key: "w3",
    title: "Founding Hosts",
    short: "W3–4",
    from: "2027-03-16",
    to: "2027-03-29",
    tasks: [
      { id: "calls", text: "Videocalls mit Interessierten" },
      { id: "together", text: "Houses gemeinsam eröffnen" },
      { id: "bali", text: "Bali vor Ort" },
    ],
  },
  {
    key: "w5",
    title: "Beweis",
    short: "W5–6",
    from: "2027-03-30",
    to: "2027-04-12",
    tasks: [
      { id: "fullHouses", text: "Erste volle Houses dokumentieren" },
      { id: "stageC", text: "Stufe C vor Ort" },
    ],
  },
  {
    key: "w7",
    title: "Countdown",
    short: "W7–8",
    from: "2027-04-13",
    to: "2027-04-26",
    tasks: [
      { id: "links", text: "Hosts teilen ihre Links" },
      { id: "waitlist", text: "Warteliste füllen" },
      { id: "date", text: "Launch-Termin kommunizieren" },
    ],
  },
];

export const PLAN_LAUNCH = { date: "2027-05-03", bufferTo: "2027-05-17", label: "Launch", bufferLabel: "Puffer" } as const;

// ─── 2 Pipeline: drei Stufen mit Ziel ───────────────────────────────────────────────────────────────────────────────────────────────────

export interface Stage {
  key: "A" | "B" | "C";
  title: string;
  /** Wer, in einer Zeile */
  who: string;
  /** Wie man sie erreicht */
  how: string;
  goal: { from: number; to: number | null };
}

export const STAGES: readonly Stage[] = [
  { key: "A", title: "Creator", who: "10k–100k Follower", how: "Instagram → Call", goal: { from: 5, to: 10 } },
  { key: "B", title: "Gruppen-Anführer", who: "Laufclubs, BJJ, Yoga, Coworking/Coliving", how: "Nachricht → Call", goal: { from: 20, to: 25 } },
  { key: "C", title: "Nomaden vor Ort", who: "persönlich, Bali", how: "vor Ort ansprechen", goal: { from: 20, to: null } },
];

/**
 * Which stage a contact belongs to: Creator and Streamer → A, Community-Betreiber → B, Connector (die Leute vor Ort) → C; not judged yet:
 * 10k followers or more → A, else B. (The contacts have no "met in person" field – the kind stands in for it.)
 */
export function stageOf(contact: Pick<MarketingContact, "kind" | "followers">): Stage["key"] {
  if (contact.kind === "creator" || contact.kind === "streamer") return "A";
  if (contact.kind === "community") return "B";
  if (contact.kind === "connector") return "C";
  return contact.followers >= 10_000 ? "A" : "B";
}

/** Je Stufe die vier Schritte und welche Kontakt-Status dazu zählen. */
export const STAGE_STEPS = [
  { key: "contacts", label: "Kontakte" },
  { key: "replies", label: "Antworten", statuses: ["replied", "demo", "house"] },
  { key: "calls", label: "Gespräche", statuses: ["demo", "house"] },
  { key: "houses", label: "Houses eröffnet", statuses: ["house"] },
] as const;

/** Wochenziel der Ansprache – daneben das Ist dieser Woche (Mo–So). */
export const WEEKLY_GOAL = { messages: { from: 50, to: 80 }, calls: { from: 5, to: 10 } } as const;

// ─── 3 Bedarf: Ziel ÷ Quote = benötigte Kontakte ────────────────────────────────────────────────────────────────────────────────────

export const NEED = {
  targetHouses: 50,
  /** Die Annahme (Anteil der Angeschriebenen, die ein House eröffnen) – hier ändern */
  assumedRate: 0.05,
  /** Weitere Zeilen zum Vergleich */
  compareRates: [0.08, 0.12],
} as const;

// ─── 4 Partner: Founding-Host-Angebot ───────────────────────────────────────────────────────────────────────────────────────────────

export const FOUNDING_OFFER: readonly string[] = [
  "12 Monate keine Host-Provision",
  "Founding-Abzeichen dauerhaft",
  "Spotlight zum Launch",
  "Direkter Draht – das erste House gemeinsam aufsetzen",
  "Host-Kit: Story, QR-Code, Text",
];

// ─── 5 Content ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Videos pro Woche (Gründer-Format). */
export const VIDEOS_PER_WEEK = 3;

export const FOUNDER_FORMAT = {
  structure: [
    { at: "0–3 s", name: "Hook", text: "ein Satz, der hängen bleibt" },
    { at: "3–15 s", name: "Build", text: "woran ich gerade baue" },
    { at: "15–25 s", name: "Life", text: "wie ich dabei lebe" },
    { at: "25–35 s", name: "Insight", text: "was ich gelernt habe" },
    { at: "35–40 s", name: "Close", text: "„Find your people.“ + Logo" },
  ],
  angles: [
    { name: "Build Day", hook: "„Heute habe ich gebaut, was ich mir vor einem Jahr gewünscht hätte.“" },
    { name: "Decision", hook: "„Ich habe Nein zu einem Investor gesagt. Darum.“" },
    { name: "Place", hook: "„Dieser Tisch ist der Grund, warum es Simpulo gibt.“" },
    { name: "People", hook: "„Mit diesen drei Menschen würde ich sofort wieder zusammenziehen.“" },
    { name: "Lesson", hook: "„Allein reisen ist leicht. Allein bleiben auch.“" },
  ],
  routine: [
    { what: "Sprech-Clips", amount: "3 pro Woche, je 1 Satz in die Kamera" },
    { what: "Arbeiten", amount: "5 kurze Clips am Laptop, verschiedene Orte" },
    { what: "Bildschirm", amount: "2 Aufnahmen: was gerade gebaut wird" },
    { what: "Sport", amount: "2 Clips pro Woche" },
    { what: "Ort & Leben", amount: "5 Clips: Essen, Weg, Menschen, Licht" },
  ],
  brief: [
    "Format 9:16, 30–45 Sekunden.",
    "Ruhiger Schnitt, keine Effekte, keine schnellen Zooms.",
    "Untertitel immer (eingebrannt, ruhige Schrift).",
    "Leise Musik unter der Stimme.",
    "Am Ende 1 Sekunde Logo „simpulo.“.",
    "Aufbau: Hook (0–3 s) · Build (3–15 s) · Life (15–25 s) · Insight (25–35 s) · Close (35–40 s, „Find your people.“).",
    "3 Videos pro Woche.",
  ],
} as const;

export const MOMENTS_PROGRAM = {
  status: "nach dem Launch",
  formats: [
    { phase: "Vorher", format: "Packen & Absicht in einem Satz", when: "nach der Zahlung" },
    { phase: "Ankommen", format: "Erster Blick in das House", when: "Tag 1, „I'm here“" },
    { phase: "Mittendrin", format: "Ein Moment des Tages", when: "zur Halbzeit" },
    { phase: "Abschied", format: "Der letzte Abend, ohne Gesichter von Fremden", when: "letzter Abend" },
    { phase: "Danach", format: "Was ich mitnehme", when: "30 Tage danach" },
  ],
  rewards: [
    "Guthaben auf das nächste House",
    "Hosts: Spotlight oder weniger Provision",
    "Repost auf Simpulos Kanälen",
    "Link-Erfolg: wer über den Link bucht, zählt",
  ],
  rules: [
    "Als Werbung gekennzeichnet",
    "Einverständnis jeder Person in der Crew",
    "Repost-Rechte in den AGB",
    "Freiwillig – niemand muss",
  ],
} as const;

// ─── Beschriftungen der Ansichten ───────────────────────────────────────────────────────────────────────────────────────────────────

export const PLAN_LABELS = {
  timeline: "Pre-Launch-Plan",
  today: "heute",
  tasksOf: "Aufgaben",
  done: "erledigt",
  stages: "Stufen",
  goal: "Ziel",
  week: "Diese Woche",
  messages: "Nachrichten",
  calls: "Gespräche",
  need: "Bedarf",
  needLine: "{houses} Houses ÷ {rate} = {contacts} Kontakte",
  needNow: "Ist-Quote",
  needAssumed: "Annahme",
  needCompare: "Vergleich",
  needNoRate: "noch kein House aus der Pipeline – Ist-Quote offen",
  needWritten: "{value} angeschrieben, noch {left} zu schreiben",
  founding: "Founding-Host-Angebot",
  foundingTaken: "Plätze belegt: {taken} von {limit}",
  founderFormat: "Gründer-Format",
  structure: "Gerüst",
  angles: "Fünf Blickwinkel",
  routine: "Dreh-Routine",
  brief: "Cutter-Brief",
  copyBrief: "Brief kopieren",
  copied: "Kopiert",
  moments: "Moments-Programm",
  momentsFormats: "Formate entlang des Bogens",
  rewards: "Belohnungen",
  rules: "Regeln",
  // Unterzahlen der Karten
  phase: "Phase",
  openTasks: "offene Aufgaben",
  daysToLaunch: "Tage bis Launch",
  replyRate: "Antwortquote",
  contacts: "Kontakte",
  foundingInfo: "Founding Hosts: die ersten 50 angenommenen Hosts – 12 Monate ohne Host-Provision, Abzeichen, Spotlight zum Launch.",
  videosInfo: "Videos im Gründer-Format, die diese Woche (Mo–So) veröffentlicht wurden – Ziel 3.",
  needInfo: "Ziel 50 Houses ÷ Quote (Houses aus der Pipeline je Angeschriebene; ohne Ist die Annahme) = benötigte Kontakte.",
  neededContacts: "benötigte Kontakte",
  foundingSeats: "Founding",
  videosWeek: "Videos diese Woche",
  beforePlan: "vor dem Plan",
  launched: "gelauncht",
} as const;

// ─── Hebel: die fünf stärksten Pre-Launch-Hebel nach Wirkung ────────────────────────────────────────────────────────────────────────
// Vorbereitet für eine Karte „Hebel“ (Symbol `Zap` – `Target` trägt schon „Bedarf“). Die Seite Marketing hat bereits acht Karten
// (Regel „Acht Karten“): die Karte kommt erst, wenn eine andere ersetzt oder zusammengelegt ist.

export interface MarketingLever {
  id: string;
  rank: number;
  title: string;
  /** Welche Stufen (A · B · C) oder „alle“ */
  audience: string;
  why: string;
}

export const marketingLevers: readonly MarketingLever[] = [
  { id: "inPerson", rank: 1, title: "Persönlich vor Ort treffen", audience: "B, C", why: "Vertrauen sofort, keine Fremdheit" },
  { id: "draft", rank: 2, title: "Fertiger House-Entwurf („So sähe deins aus“)", audience: "alle", why: "Host muss nichts tun, nur Ja sagen" },
  { id: "ownBali", rank: 3, title: "Eigenes House in Bali", audience: "alle", why: "Beweis, dass es funktioniert, und Ort zum Kennenlernen" },
  { id: "dmVideo", rank: 4, title: "Persönliches Video in der DM", audience: "nur A", why: "Hebt dich aus der Masse der DMs heraus" },
  { id: "account", rank: 5, title: "Videos auf dem Simpulo-Account", audience: "alle", why: "Hintergrund, wenn jemand nachschaut" },
];

/** Die Stufen-Legende, einzeilig unter der Rangliste. */
export const leverStageLegend = "A Creator · B Gruppen-Anführer · C Nomaden vor Ort";

import type { CardDef } from "./types";

/** Marketing: Countdown · Houses & Hubs · Hebel · Pipeline · Partner · Content · Nächster Schritt · Founding Hosts. ("Warteliste" made way for
 *  "Hebel" – its numbers stay in Wachstum › Warteliste and in the Countdown; "Bedarf" made way for "Founding Hosts" – its calculation stays in
 *  the Pipeline, ?tab=pipeline&focus=forFifty.) */
export const MARKETING_CARDS: readonly CardDef[] = [
  // The pre-launch plan (config/admin/marketing-plan.ts): days to the launch, the plan's phase, its open tasks.
  { topic: "countdown", icon: "Timer", tab: "countdown", main: "launch", subs: ["planPhase", "planOpen"] },
  { topic: "housesHubs", icon: "MapPin", tab: "countdown", focus: "housesOpened", main: "housesOpened", subs: ["hubs", "filled"] },
  // The five strongest pre-launch levers by effect (config/admin/marketing-plan.ts marketingLevers): the top 3 as the card's list.
  { topic: "hebel", icon: "Zap", tab: "levers", main: "levers", subs: ["lever1", "lever2", "lever3"], target: false },
  { topic: "pipeline", icon: "Filter", tab: "pipeline", main: "contacted", subs: ["stageReplyRate", "houses"] },
  { topic: "partners", icon: "Handshake", tab: "partners", main: "founding", subs: ["activePartners", "avgShare"] },
  { topic: "content", icon: "Clapperboard", tab: "content", main: "videosWeek", subs: ["plannedWeek", "postVisits"] },
  { topic: "nextStep", icon: "ListChecks", tab: "partners", focus: "due", main: "nextStep", subs: ["openSteps", "due"] },
  // Akquise (CLAUDE.md „Marketing › Akquise“): Founding Hosts x / 100, reply rate, calls in the period – opens the Akquise view.
  { topic: "foundingHosts", icon: "Crown", tab: "akquise", main: "foundingHosts", subs: ["acqReplyRate", "acqCalls"], target: false },
];

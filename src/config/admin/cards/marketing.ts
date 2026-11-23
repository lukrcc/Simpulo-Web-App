import type { CardDef } from "./types";

/** Marketing: Countdown · Houses & Hubs · Warteliste · Pipeline · Partner · Content · Nächster Schritt · Bedarf. */
export const MARKETING_CARDS: readonly CardDef[] = [
  { topic: "countdown", icon: "Timer", tab: "countdown", main: "launch", subs: ["phase", "startOrWeek"] },
  { topic: "housesHubs", icon: "MapPin", tab: "countdown", focus: "housesOpened", main: "housesOpened", subs: ["hubs", "filled"] },
  { topic: "waitlist", icon: "Clock", tab: "countdown", focus: "waitlist", main: "waitlist", subs: ["entries"] },
  { topic: "pipeline", icon: "Filter", tab: "pipeline", main: "contacted", subs: ["replyRate", "demoRate", "houses"] },
  { topic: "partners", icon: "Handshake", tab: "partners", main: "partners", subs: ["activePartners", "avgShare"] },
  { topic: "content", icon: "Clapperboard", tab: "content", main: "shorts", subs: ["plannedWeek", "postVisits"] },
  { topic: "nextStep", icon: "ListChecks", tab: "partners", focus: "due", main: "nextStep", subs: ["openSteps", "due"] },
  { topic: "need", icon: "Target", tab: "pipeline", focus: "forFifty", main: "forFifty", subs: ["houses", "replyRate"] },
];

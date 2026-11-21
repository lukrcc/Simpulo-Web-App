// Admin › System › Launch: the checklist before the launch (CLAUDE.md "Admin › System"). Structure here, words in admin.de.ts
// (platform.launch.items.<id>). Each point is checked automatically where the code or the data can tell (components/admin/LaunchChecklist.tsx,
// lib/launchChecks.ts on the server); `manual` points can also be confirmed by hand (stored, logged) – for what only happens outside the app.

export const LAUNCH_GROUPS = ["criteria", "tech", "legal", "content"] as const;
export type LaunchGroup = (typeof LAUNCH_GROUPS)[number];

export interface LaunchPoint {
  id: string;
  group: LaunchGroup;
  /** Can be confirmed by hand when the automatic check can't see it (a live key, a run outside the app) */
  manual: boolean;
  /** Where to look or fix it */
  href?: string;
}

export const LAUNCH_POINTS: readonly LaunchPoint[] = [
  // Kriterien – lib/admin/metrics.ts launchProgress (config/admin.ts LAUNCH_CRITERIA)
  { id: "houses", group: "criteria", manual: false, href: "/admin/houses" },
  { id: "hubs", group: "criteria", manual: false, href: "/admin/topics" },
  { id: "reserved", group: "criteria", manual: false, href: "/admin/houses" },
  { id: "waitlist", group: "criteria", manual: false, href: "/admin/waitlist" },
  // Technik
  { id: "demoOff", group: "tech", manual: false },
  { id: "previewOff", group: "tech", manual: false },
  { id: "stripeLive", group: "tech", manual: true },
  { id: "emailActive", group: "tech", manual: false },
  { id: "pushActive", group: "tech", manual: false },
  { id: "widthTest", group: "tech", manual: true },
  // Recht
  { id: "noDrafts", group: "legal", manual: false, href: "/admin/waitlist" },
  { id: "impressum", group: "legal", manual: false, href: "/impressum" },
  { id: "duties", group: "legal", manual: false },
  // Inhalte
  { id: "founder", group: "content", manual: false, href: "/about" },
  { id: "help", group: "content", manual: false, href: "/help" },
  { id: "guides", group: "content", manual: false, href: "/guides" },
];

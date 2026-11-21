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
  // The real business address – until it's there, no public launch (the phase switch to Live is blocked, a live build stops).
  { id: "impressumAddress", group: "legal", manual: false, href: "/impressum" },
  { id: "impressum", group: "legal", manual: false, href: "/impressum" },
  { id: "duties", group: "legal", manual: false },
  // Inhalte
  { id: "founder", group: "content", manual: false, href: "/about" },
  { id: "help", group: "content", manual: false, href: "/help" },
  { id: "guides", group: "content", manual: false, href: "/guides" },
];

/**
 * The launch hubs: the cities Simpulo opens in first (the Founding Houses' cities – CLAUDE.md "Plattform-Phase": Bangkok and Lisbon). Before
 * the launch the footer's Places are these (lib/footerLinks.ts); later they fill up a short list. Their pages are /co-living/{slug}.
 */
export const LAUNCH_HUBS: readonly { slug: string; name: string }[] = [
  { slug: "bangkok", name: "Bangkok" },
  { slug: "lisbon", name: "Lisbon" },
];

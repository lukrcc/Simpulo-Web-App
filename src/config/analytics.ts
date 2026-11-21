// Statistics without cookies (CLAUDE.md "Speicherung und Tracker"): PostHog in the EU, cookieless – nothing is stored on the device, no ID
// that outlives the page load, no person profiles. Off until Lukas turns it on (and the project key is set as NEXT_PUBLIC_POSTHOG_KEY – a
// public project key, no secret). No Google Analytics, no Firebase Analytics, no advertising pixels – ever without a decision first.
export const ANALYTICS = {
  enabled: false,
  provider: "posthog",
  /** PostHog's EU cloud (Frankfurt) */
  host: "https://eu.i.posthog.com",
  /** Only in production builds – dev and demo log to the console */
  productionOnly: true,
} as const;

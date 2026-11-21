// Analytics: every event goes to the console; with config/analytics.ts switched on (production, key set) also to PostHog EU – cookieless:
// sent with fetch, no SDK, nothing stored on the device (no cookie, no localStorage), an id that lives only for this page load, no person
// profiles. Props are signals (ids of Houses, steps, choices) – never names, emails or free text.
import { ANALYTICS } from "@/config/analytics";
import { APP_MODE } from "./appMode";

export type AnalyticsEvent =
  | "install_prompt_shown"
  | "install_prompt_dismissed"
  | "install_prompt_turned_off"
  | "app_installed"
  | "push_prompt_shown"
  | "push_prompt_answered"
  /** The arc's signals (config/data-points.ts arc.*): a Simpulo card seen, its action done, a step skipped – ids only, never what anyone wrote */
  | "arc_card_seen"
  | "arc_action_done"
  | "arc_closing_led"
  | "memory_uploaded"
  | "waitlist_opened"
  | "waitlist_joined"
  | "waitlist_confirmed"
  | "waitlist_unsubscribed"
  | "host_application_sent"
  | "deadline_remind"
  | "report_sent"
  | "consent_given"
  | "memory_removed"
  | "arc_step_skipped";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";

/** On only when switched on, the key is set, and (by default) in production. */
export const analyticsOn = ANALYTICS.enabled && POSTHOG_KEY !== "" && (!ANALYTICS.productionOnly || APP_MODE === "production");

/** A random id for this page load only (memory) – events of one visit belong together, nothing links visits. */
let pageLoadId: string | null = null;
const visitId = () => (pageLoadId ??= typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random()).slice(2));

export function track(name: AnalyticsEvent, props: Record<string, string | number | boolean | null | undefined> = {}) {
  console.info(`[analytics] ${name}`, props);
  if (!analyticsOn || typeof window === "undefined") return;
  const body = JSON.stringify({
    api_key: POSTHOG_KEY,
    event: name,
    distinct_id: visitId(),
    properties: { ...props, $process_person_profile: false, $current_url: window.location.origin + window.location.pathname },
    timestamp: new Date().toISOString(),
  });
  // keepalive: the event still goes out when the page is left; failures are ignored (statistics never break the app).
  void fetch(`${ANALYTICS.host}/i/v0/e/`, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true, credentials: "omit" }).catch(() => undefined);
}

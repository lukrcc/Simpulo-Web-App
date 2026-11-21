// Analytics, a stub for now: every event goes to the console. A real backend replaces track() and nothing else.

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
  | "memory_removed"
  | "arc_step_skipped";

export function track(name: AnalyticsEvent, props: Record<string, string | number | boolean | null | undefined> = {}) {
  console.info(`[analytics] ${name}`, props);
}

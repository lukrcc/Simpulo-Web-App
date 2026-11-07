// Analytics, a stub for now: every event goes to the console. A real backend replaces track() and nothing else.

export type AnalyticsEvent = "install_prompt_shown" | "install_prompt_dismissed" | "app_installed" | "push_prompt_shown" | "push_prompt_answered";

export function track(name: AnalyticsEvent, props: Record<string, string | number | boolean | null | undefined> = {}) {
  console.info(`[analytics] ${name}`, props);
}

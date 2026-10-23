/** /welcome – the full-page "Complete your profile" step for logins that didn't happen inside a sheet. */
export const WELCOME_PATH = "/welcome";

/**
 * Only same-site paths are accepted as `?next=` ("/stays/s1"); anything else ("//evil.com", "https://…",
 * empty) falls back to the home page.
 */
export function safeNextPath(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}

/** Link to /welcome that continues at `next` after saving, e.g. `router.push(welcomeHref(pathname))`. */
export function welcomeHref(next?: string): string {
  const path = safeNextPath(next);
  return path === "/" ? WELCOME_PATH : `${WELCOME_PATH}?next=${encodeURIComponent(path)}`;
}

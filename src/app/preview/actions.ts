"use server";

import { cookies } from "next/headers";
import { PREVIEW_COOKIE_DAYS, previewGateOn } from "@/config/preview";
import { APP_MODE } from "@/lib/appMode";
import { DEMO_COOKIE, DEMO_COOKIE_DAYS, demoToken, sameSecret } from "@/lib/demoAuth";
import { PREVIEW_COOKIE, previewToken } from "@/lib/previewAuth";

export interface PreviewState {
  failed: boolean;
  /** Let in: where to go */
  target?: string;
}

/** A wrong password waits this long before the answer – a simple brake against many tries. */
const WRONG_DELAY_MS = 1200;

/** Back where the visitor came from – only ever a path on this site. */
function safeTarget(next: FormDataEntryValue | null): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}

/**
 * The one door for both gates (src/proxy.ts): the preview gate (SITE_PASSWORD, 90 days) and the demo (DEMO_PASSWORD, 30 days). Checked only
 * here on the server; the cookies hold a signature, never the password. Nothing is logged.
 */
export async function enterPreview(_state: PreviewState, form: FormData): Promise<PreviewState> {
  const given = form.get("password");
  const sitePassword = previewGateOn() ? process.env.SITE_PASSWORD : undefined;
  const demoPassword = APP_MODE === "demo" ? process.env.DEMO_PASSWORD : undefined;
  const site = typeof given === "string" && Boolean(sitePassword) && sameSecret(given, sitePassword!);
  const demo = typeof given === "string" && Boolean(demoPassword) && sameSecret(given, demoPassword!);
  if (!site && !demo) {
    await new Promise((resolve) => setTimeout(resolve, WRONG_DELAY_MS));
    return { failed: true };
  }
  const jar = await cookies();
  const base = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
  if (site) jar.set(PREVIEW_COOKIE, previewToken(sitePassword!), { ...base, maxAge: PREVIEW_COOKIE_DAYS * 24 * 60 * 60 });
  if (demo) jar.set(DEMO_COOKIE, demoToken(demoPassword!), { ...base, maxAge: DEMO_COOKIE_DAYS * 24 * 60 * 60 });
  return { failed: false, target: safeTarget(form.get("next")) };
}

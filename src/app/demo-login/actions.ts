"use server";

import { cookies } from "next/headers";
import { APP_MODE } from "@/lib/appMode";
import { DEMO_COOKIE, DEMO_COOKIE_DAYS, demoToken, sameSecret } from "@/lib/demoAuth";

export interface DemoLoginState {
  failed: boolean;
  /** Logged in: where to go */
  target?: string;
}

/** Back where the visitor came from – only ever a path on this site. */
function safeTarget(next: FormDataEntryValue | null): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}

export async function enterDemo(_state: DemoLoginState, form: FormData): Promise<DemoLoginState> {
  const password = process.env.DEMO_PASSWORD;
  const given = form.get("password");
  if (APP_MODE !== "demo" || !password || typeof given !== "string" || !sameSecret(given, password)) return { failed: true };
  (await cookies()).set(DEMO_COOKIE, demoToken(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DEMO_COOKIE_DAYS * 24 * 60 * 60,
  });
  return { failed: false, target: safeTarget(form.get("next")) };
}

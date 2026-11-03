import { createHmac, timingSafeEqual } from "node:crypto";

/** The demo's password check: server only. The cookie holds a signature of a fixed text, never the password. */
export const DEMO_COOKIE = "simpulo_demo";
export const DEMO_COOKIE_DAYS = 30;

/** Constant-time comparison, so response timing doesn't leak how much of it matched. */
export function sameSecret(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export const demoToken = (password: string) => createHmac("sha256", password).update("simpulo-demo-v1").digest("hex");

/** No password configured: nobody gets in. */
export function validDemoCookie(value: string | undefined): boolean {
  const password = process.env.DEMO_PASSWORD;
  return Boolean(password && value && sameSecret(value, demoToken(password)));
}

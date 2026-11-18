/*
 * The preview gate: before launch the whole site sits behind one password page (/preview, src/proxy.ts). The password is the secret
 * SITE_PASSWORD (Cloud Secret Manager "sitePassword") – never in the repo, never in the client.
 *
 * At launch: set PREVIEW_GATE to false – one line, the gate is gone.
 */
export const PREVIEW_GATE = true;

/** How long the door stays open on a device once the password was right (one cookie, signed, never the password). */
export const PREVIEW_COOKIE_DAYS = 90;

/**
 * On only in production builds with a password set: locally (next dev) it is off by default; a deployment without the secret has nothing
 * to check against and stays open (as before).
 */
export function previewGateOn(): boolean {
  return PREVIEW_GATE && process.env.NODE_ENV === "production" && Boolean(process.env.SITE_PASSWORD);
}

import { createHmac } from "node:crypto";
import { previewGateOn } from "@/config/preview";
import { sameSecret } from "@/lib/demoAuth";

/** The preview gate's cookie (config/preview.ts): a signature of a fixed text made with the secret – never the password itself. */
export const PREVIEW_COOKIE = "simpulo_preview";

export const previewToken = (password: string) => createHmac("sha256", password).update("simpulo-preview-v1").digest("hex");

/** Gate off: always valid. Gate on: the cookie must carry the signature of the current secret (a new secret locks every device out). */
export function validPreviewCookie(value: string | undefined): boolean {
  if (!previewGateOn()) return true;
  const password = process.env.SITE_PASSWORD;
  return Boolean(password && value && sameSecret(value, previewToken(password)));
}

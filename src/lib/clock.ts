// The one clock for deadlines (lib/deadlines.ts), the store's tick and countdowns (lib/useNow.ts): the real now – in dev plus the Dev menu's
// "Clock" shift (hours ahead, to walk a request to 72 hours or a payment to 48 without waiting). Never shifted outside dev.
import { readDevSetting } from "./devSettings";

const HOUR_MS = 3_600_000;

/** Now, in milliseconds – with the dev time shift. */
export function clockNow(): number {
  return Date.now() + readDevSetting("clockHours") * HOUR_MS;
}

/** Now as ISO – with the dev time shift. */
export const clockIso = () => new Date(clockNow()).toISOString();

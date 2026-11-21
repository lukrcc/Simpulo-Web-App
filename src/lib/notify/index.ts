// Notifications, one entry point: notify(userId, id, data). The catalogue (config/notifications.ts, NOTIFY_CATALOG) says which channels an
// event takes and how its email goes out; the person's switches (Settings › Notifications) can turn off the optional groups, never the
// always-on ones (bookings, account). Adapters as with lib/payments: channels/inapp (Messages › Updates), channels/push, channels/email –
// mocks today, Firebase/Resend later.
import { ALWAYS_ON, DEFAULT_NOTIFICATION_PREFS, EVENT_OF, inQuietHours, NOTIFY_CATALOG, type CatalogId, type EmailTiming, type NotificationPrefs, type OptionalCategory, type QuietHours } from "@/config/notifications";
import type { NotifyEventKey } from "@/lib/data/notifications";
import { tEn } from "@/lib/i18n/translate";
import * as email from "./channels/email";
import * as inApp from "./channels/inapp";
import * as push from "./channels/push";

export { EVENT_OF, NOTIFY_CATALOG, type CatalogId } from "@/config/notifications";

/** The catalogue entry of an in-app line. */
export const catalogOf = (key: NotifyEventKey): CatalogId => EVENT_OF[key];

export interface NotifyData extends Partial<inApp.InAppInput> {
  /** The finished line ("You're in – Fitness House Canggu"), translated by the caller – the email's headline and the in-app line */
  text?: string;
  /** The House's short name – the only detail push and the lock screen show ("New message in Surf Bali") */
  house?: string;
  /** The recipient's switches; unset = the defaults */
  prefs?: NotificationPrefs;
  /** Already a record in the store (the reducer made it, or an arc card in the chat): in-app is done */
  recorded?: boolean;
  /** Chat: whether it's still unread (checked before the collected email) */
  isUnread?: () => boolean;
  /** Absolute link for push and email (else the entry's path) */
  url?: string;
  /** The recipient's quiet hours: push waits until they end (email and the app don't) */
  quiet?: QuietHours;
  /** The email's body instead of the entry's (an admin's question to an applicant) */
  body?: string;
}

export interface Channels {
  /** Shown in Your houses › Activity – the optional groups can switch it off, the always-on ones never */
  inApp: boolean;
  push: boolean;
  email: EmailTiming | null;
}

/** Which channels this event takes for this person. */
export function channelsFor(id: CatalogId, prefs: NotificationPrefs = DEFAULT_NOTIFICATION_PREFS): Channels {
  const rule = NOTIFY_CATALOG[id];
  if (ALWAYS_ON.includes(rule.category)) return { inApp: rule.inApp, push: rule.push, email: rule.email };
  const cat = rule.category as OptionalCategory;
  const own = { ...DEFAULT_NOTIFICATION_PREFS[cat], ...prefs[cat] };
  return { inApp: rule.inApp && own.inApp, push: rule.push && own.push, email: rule.email && own.email ? rule.email : null };
}

/** The words of an entry with this House (or "your House"). */
export function catalogText(id: CatalogId, house?: string) {
  const h = house || tEn("notifications.yourHouse");
  return {
    subject: tEn(`notifications.catalog.${id}.subject`, { house: h }),
    short: tEn(`notifications.catalog.${id}.short`, { house: h }),
    body: tEn(`notifications.catalog.${id}.body`, { house: h }),
    action: tEn(`notifications.catalog.${id}.action`),
  };
}

export function notify(userId: string, id: CatalogId, data: NotifyData): Channels {
  const channels = channelsFor(id, data.prefs);
  const words = catalogText(id, data.house);
  if (!data.recorded && channels.inApp && data.key) inApp.deliver(userId, { key: data.key, values: data.values ?? {}, eventId: data.eventId ?? `${id}-${Date.now()}`, stayId: data.stayId, threadId: data.threadId, href: data.href });
  if (channels.push) {
    // Push and the lock screen: only the kind and the House – never a message's content or a name (Regel).
    const message = { title: "Simpulo", body: words.short, url: data.url };
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    if (data.quiet && inQuietHours(data.quiet, hhmm)) push.hold(userId, message, data.quiet.to);
    else push.send(userId, message);
  }
  if (channels.email) sendEmail(userId, id, channels.email, data, words);
  return channels;
}

/** Email only – for people without an account (the waitlist, a host application, a report from the form) or a ready-made line. */
export function notifyByEmail(to: string, id: CatalogId, data: Pick<NotifyData, "text" | "house" | "url" | "body"> = {}) {
  const timing = NOTIFY_CATALOG[id].email;
  if (timing) sendEmail(to, id, timing, data, catalogText(id, data.house));
}

function sendEmail(to: string, id: CatalogId, timing: EmailTiming, data: NotifyData, words: ReturnType<typeof catalogText>) {
  const item: email.EmailItem = { id, subject: words.subject, headline: data.text ?? words.subject, text: data.body ?? words.body, url: data.url ?? NOTIFY_CATALOG[id].path };
  switch (timing) {
    case "instant":
      email.send(to, item);
      break;
    case "daily":
    case "optIn":
      email.addToDaily(to, item);
      break;
    case "unreadAfter":
      email.sendIfUnread(to, item, data.isUnread ?? (() => true));
      break;
    case "weekly":
      email.addToWeekly(to, item);
      break;
  }
}

// Notifications, one entry point: notify(userId, event, data). The table in config/notifications.ts says which channels an event takes;
// the person's switches (Settings › Notifications) can turn off push and email of the optional groups, never of "bookings". Adapters
// as with lib/payments: channels/inapp (Messages › Updates), channels/push, channels/email – mocks today, Firebase/Resend later.
import { CHANNELS, DEFAULT_NOTIFICATION_PREFS, type EmailTiming, type NotificationPrefs } from "@/config/notifications";
import * as email from "./channels/email";
import * as inApp from "./channels/inapp";
import * as push from "./channels/push";
import { NotifyEvent } from "./events";

export { EVENT_OF, NotifyEvent } from "./events";

export interface NotifyData extends inApp.InAppInput {
  /** The finished line ("You're in – Fitness House Canggu"), translated by the caller */
  text: string;
  /** The recipient's switches; unset = the defaults */
  prefs?: NotificationPrefs;
  /** Already a record in the store (the reducer made it): in-app is done */
  recorded?: boolean;
  /** Chat: whether it's still unread (checked before the collected email) */
  isUnread?: () => boolean;
  /** Absolute link for push and email */
  url?: string;
}

export interface Channels {
  inApp: true;
  push: boolean;
  email: EmailTiming | null;
}

/** Which channels this event takes for this person. */
export function channelsFor(event: NotifyEvent, prefs: NotificationPrefs = DEFAULT_NOTIFICATION_PREFS): Channels {
  const rule = CHANNELS[event];
  if (rule.category === "bookings") return { inApp: true, push: rule.push, email: rule.email };
  const own = prefs[rule.category] ?? DEFAULT_NOTIFICATION_PREFS[rule.category];
  return { inApp: true, push: rule.push && own.push, email: rule.email && own.email ? rule.email : null };
}

export function notify(userId: string, event: NotifyEvent, data: NotifyData): Channels {
  const channels = channelsFor(event, data.prefs);
  if (!data.recorded) inApp.deliver(userId, data);
  if (channels.push) push.send(userId, { title: "Simpulo", body: data.text, url: data.url });
  const item: email.EmailItem = { subject: data.text, text: data.text, url: data.url, template: "notification" };
  switch (channels.email) {
    case "instant":
    case "optIn":
      email.send(userId, item);
      break;
    case "unreadAfter":
      email.sendIfUnread(userId, { ...item, template: "chatDigest" }, data.isUnread ?? (() => true));
      break;
    case "weekly":
      email.addToWeekly(userId, { ...item, template: "weeklyDigest" });
      break;
  }
  return channels;
}

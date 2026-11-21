// Push. Mock: a line in the console and the Dev menu's log (and a small toast in the demo).
// TODO(push): Firebase Cloud Messaging – send to the user's registered device tokens (getMessaging().sendEachForMulticast) from the
// server, with title, body and the link as data; drop tokens FCM reports as unregistered.
import { announceDelivery, logDelivery } from "../log";

export interface PushMessage {
  title: string;
  body: string;
  /** Where tapping it leads */
  url?: string;
}

/** Quiet hours (Settings › Notifications): the push waits until they end. Mock: logged as held; TODO(push): a scheduled send at `until`. */
export function hold(userId: string, message: PushMessage, until: string) {
  console.info("[push held]", userId, until, message);
  logDelivery({ channel: "push", userId, text: `${message.body} · held until ${until}` });
}

export function send(userId: string, message: PushMessage) {
  console.info("[push]", userId, message);
  logDelivery({ channel: "push", userId, text: message.body });
  announceDelivery("push", userId, message.body);
}

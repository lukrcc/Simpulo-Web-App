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

export function send(userId: string, message: PushMessage) {
  console.info("[push]", userId, message);
  logDelivery({ channel: "push", userId, text: message.body });
  announceDelivery("push", userId, message.body);
}

// Email. Mock: a line in the console and the Dev menu's log (and a small toast in the demo). The templates are React components in
// src/emails (preview at /dev/emails).
// TODO(email): Resend – render the template on the server (emails/*) and send it with resend.emails.send({ from, to, subject, react }),
// the chat collection as a delayed job, the weekly summary as a cron job; the unsubscribe link with a signed token.
import { CHAT_EMAIL_AFTER_MINUTES } from "@/config/notifications";
import { announceDelivery, logDelivery } from "../log";

export interface EmailItem {
  subject: string;
  /** The one line about it */
  text: string;
  /** The button's target */
  url?: string;
  /** The template it renders (emails/) */
  template: "notification" | "chatDigest" | "weeklyDigest";
}

export function send(userId: string, item: EmailItem) {
  console.info("[email]", userId, item);
  logDelivery({ channel: "email", userId, text: item.subject });
  announceDelivery("email", userId, item.subject);
}

// Chat: collected per person, sent once the first of them has been unread for an hour – then everything still unread, in one email.
const pendingChat = new Map<string, { timer: ReturnType<typeof setTimeout>; items: Array<{ item: EmailItem; isUnread: () => boolean }> }>();

export function sendIfUnread(userId: string, item: EmailItem, isUnread: () => boolean, afterMinutes = CHAT_EMAIL_AFTER_MINUTES) {
  logDelivery({ channel: "emailQueued", userId, text: item.text });
  const pending = pendingChat.get(userId);
  if (pending) {
    pending.items.push({ item, isUnread });
    return;
  }
  const timer = setTimeout(() => {
    const still = pendingChat.get(userId)?.items.filter((i) => i.isUnread()) ?? [];
    pendingChat.delete(userId);
    if (still.length === 0) return;
    const subject = still.length === 1 ? still[0].item.subject : `${still.length} unread messages on Simpulo`;
    console.info("[email] chat digest", userId, still.map((i) => i.item.text));
    logDelivery({ channel: "emailDigest", userId, text: subject });
    announceDelivery("email", userId, subject);
  }, afterMinutes * 60_000);
  pendingChat.set(userId, { timer, items: [{ item, isUnread }] });
}

/** New Houses nearby: into the weekly summary (a cron job on the server later). */
export function addToWeekly(userId: string, item: EmailItem) {
  console.info("[email] weekly summary +", userId, item.text);
  logDelivery({ channel: "emailWeekly", userId, text: item.text });
}

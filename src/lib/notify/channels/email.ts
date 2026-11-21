// Email. Mock: a line in the console and the Dev menu's log (and a small toast in the demo). The templates are React components in
// src/emails (preview of every one at /dev/emails), all on one layout (EmailLayout) – no tracking pixels, no tracked links.
// TODO(email): Resend – render the template on the server (emails/*) and send it with resend.emails.send({ from, to, subject, react }),
// the chat collection as a delayed job, the daily bundle and the weekly summary as cron jobs; the unsubscribe link with a signed token.
import { tEn } from "@/lib/i18n/translate";
import { CHAT_EMAIL_AFTER_MINUTES, DAILY_BUNDLE_HOUR, type CatalogId } from "@/config/notifications";
import { announceDelivery, logDelivery } from "../log";

export interface EmailItem {
  /** The catalogue entry (config/notifications.ts) – picks the button, the footer, the template */
  id: CatalogId;
  subject: string;
  /** The line about it (the in-app line, or the subject) */
  headline: string;
  /** The body sentence */
  text: string;
  /** The button's target */
  url?: string;
}

/** `to`: an account – or, for people without one (the waitlist, a host application, a report), their email address. */
export function send(to: string, item: EmailItem) {
  console.info("[email]", to, item);
  logDelivery({ channel: "email", userId: to, text: item.subject, url: item.url });
  announceDelivery("email", to, item.subject);
}

// ── The daily bundle: everything that isn't money or a deadline, collected per person and day into ONE email (DailyDigestEmail). ──
const daily = new Map<string, { day: string; timer: ReturnType<typeof setTimeout>; items: EmailItem[] }>();
const localDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Pure: the subject of a day's bundle. */
export function dailySubject(items: readonly EmailItem[]): string {
  return items.length === 1 ? items[0].subject : tEn("notifications.digest.subject", { count: items.length });
}

/** Pure: when the bundle an item joins goes out – today at DAILY_BUNDLE_HOUR, or tomorrow's once that hour has passed. */
export function bundleTime(now: Date): Date {
  const at = new Date(now);
  at.setHours(DAILY_BUNDLE_HOUR, 0, 0, 0);
  if (at.getTime() <= now.getTime()) at.setDate(at.getDate() + 1);
  return at;
}

export function addToDaily(to: string, item: EmailItem) {
  const now = new Date();
  const at = bundleTime(now);
  const day = localDay(at);
  logDelivery({ channel: "emailDaily", userId: to, text: item.subject });
  const pending = daily.get(to);
  if (pending && pending.day === day) {
    pending.items.push(item);
    return;
  }
  const timer = setTimeout(() => flushDaily(to), at.getTime() - now.getTime());
  daily.set(to, { day, timer, items: [item] });
}

function flushDaily(to: string) {
  const pending = daily.get(to);
  daily.delete(to);
  if (!pending || pending.items.length === 0) return;
  const subject = dailySubject(pending.items);
  console.info("[email] daily bundle", to, pending.items.map((i) => i.subject));
  logDelivery({ channel: "emailDigest", userId: to, text: subject });
  announceDelivery("email", to, subject);
}

// ── Chat: collected per person, sent once the first of them has been unread for an hour – then everything still unread, in one email. ──
const pendingChat = new Map<string, { timer: ReturnType<typeof setTimeout>; items: Array<{ item: EmailItem; isUnread: () => boolean }> }>();

export function sendIfUnread(to: string, item: EmailItem, isUnread: () => boolean, afterMinutes = CHAT_EMAIL_AFTER_MINUTES) {
  logDelivery({ channel: "emailQueued", userId: to, text: item.subject });
  const pending = pendingChat.get(to);
  if (pending) {
    pending.items.push({ item, isUnread });
    return;
  }
  const timer = setTimeout(() => {
    const still = pendingChat.get(to)?.items.filter((i) => i.isUnread()) ?? [];
    pendingChat.delete(to);
    if (still.length === 0) return;
    const subject = tEn("emails.chatDigest.subject", { count: still.length, subject: still[0].item.subject });
    console.info("[email] chat digest", to, still.map((i) => i.item.subject));
    logDelivery({ channel: "emailDigest", userId: to, text: subject });
    announceDelivery("email", to, subject);
  }, afterMinutes * 60_000);
  pendingChat.set(to, { timer, items: [{ item, isUnread }] });
}

/** New Houses near your searches: into the weekly summary (a cron job on the server later). */
export function addToWeekly(to: string, item: EmailItem) {
  console.info("[email] weekly summary +", to, item.subject);
  logDelivery({ channel: "emailWeekly", userId: to, text: item.subject });
}

// Mock notification schedule: which reminders a user would get, computed from the current data. Nothing is
// scheduled for real yet – later this becomes Cloud Functions (timers) + FCM push / email.
import { mockInstalledUsers } from "./mock-extras";
import type { NotifyEventKey } from "./store";
import type { JoinRequest, Payment, Stay, SystemEventKey, User } from "./types";

export type ReminderType = "payDue" | "payToday" | "bookingUpload" | "pendingRequests" | "arrival" | "savedSoon" | "hostOpened";

export interface Reminder {
  id: string;
  type: ReminderType;
  userId: string;
  stayId: string;
  /** When it would go out (ISO) – past dates mean "overdue, would send now" */
  due: string;
  /** Email always; push as well when the user installed the app */
  channel: "email" | "email+push";
  notifyKey: NotifyEventKey;
  values: Record<string, string | number>;
  /** Crew-related reminders also post a line into the crew chat */
  chatEvent?: SystemEventKey;
}

interface ReminderData {
  stays: Stay[];
  users: User[];
  joinRequests: JoinRequest[];
  payments: Payment[];
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
/** Rule timings */
const PAY_DUE_DAYS_BEFORE = 2;
const BOOKING_UPLOAD_HOURS = 24;
const REQUEST_ANSWER_HOURS = 48;
const ARRIVAL_DAYS_BEFORE = 3;
const SAVED_WINDOW_DAYS = 60;
const SAVED_DAYS_BEFORE = 14;
/** Host alerts: Houses an alerted host opened within this window */
const HOST_ALERT_WINDOW_DAYS = 30;

const dayStart = (date: string) => new Date(`${date}T09:00:00Z`).getTime();
const iso = (ms: number) => new Date(ms).toISOString();

function isCrew(data: ReminderData, stay: Stay, userId: string): boolean {
  return stay.hostId === userId || data.joinRequests.some((r) => r.stayId === stay.id && r.userId === userId && r.status === "accepted");
}

/** All reminders for `userId`, soonest first. */
export function computeReminders(data: ReminderData, userId: string, now = Date.now()): Reminder[] {
  const user = data.users.find((u) => u.id === userId);
  if (!user) return [];
  const channel = mockInstalledUsers.has(userId) ? "email+push" : "email";
  const name = user.name.split(" ")[0];
  const reminders: Reminder[] = [];
  const add = (r: Omit<Reminder, "id" | "userId" | "channel">) => reminders.push({ ...r, id: `${r.type}-${r.stayId}-${userId}`, userId, channel });

  for (const stay of data.stays) {
    const active = stay.status === "published" || stay.status === "booked";

    // Own open share of a locked place: two days before the deadline, and on the day.
    const mine = data.payments.find((p) => p.stayId === stay.id && p.userId === userId && p.status === "pending");
    if (mine && stay.accommodationStatus === "locked" && stay.payByDate) {
      const values = { title: stay.title, price: mine.total, payBy: stay.payByDate, name };
      add({ type: "payDue", stayId: stay.id, due: iso(dayStart(stay.payByDate) - PAY_DUE_DAYS_BEFORE * DAY), notifyKey: "reminderPayDue", values, chatEvent: "reminderPayment" });
      add({ type: "payToday", stayId: stay.id, due: iso(dayStart(stay.payByDate)), notifyKey: "reminderPayToday", values });
    }

    if (stay.hostId === userId && active) {
      // Everyone paid, no booking uploaded yet.
      const payments = data.payments.filter((p) => p.stayId === stay.id && p.status !== "refunded");
      const allPaid = payments.length > 0 && payments.every((p) => p.status === "paid");
      if (allPaid && !stay.bookingConfirmedAt) {
        const lastPaid = Math.max(...payments.map((p) => new Date(p.paidAt ?? stay.lockedAt ?? stay.createdAt).getTime()));
        add({
          type: "bookingUpload",
          stayId: stay.id,
          due: iso(lastPaid + BOOKING_UPLOAD_HOURS * HOUR),
          notifyKey: "reminderBookingUpload",
          values: { title: stay.title, hours: 48 - BOOKING_UPLOAD_HOURS },
        });
      }
      // Requests waiting for an answer.
      const pending = data.joinRequests.filter((r) => r.stayId === stay.id && r.status === "pending");
      if (pending.length > 0) {
        const oldest = Math.min(...pending.map((r) => new Date(r.createdAt).getTime()));
        add({
          type: "pendingRequests",
          stayId: stay.id,
          due: iso(oldest + REQUEST_ANSWER_HOURS * HOUR),
          notifyKey: "reminderPendingRequests",
          values: { title: stay.title, count: pending.length },
        });
      }
    }

    // Arrival countdown for the crew of a locked/booked House that hasn't started.
    if (active && stay.accommodationStatus === "locked" && isCrew(data, stay, userId) && dayStart(stay.startDate) > now) {
      add({
        type: "arrival",
        stayId: stay.id,
        due: iso(dayStart(stay.startDate) - ARRIVAL_DAYS_BEFORE * DAY),
        notifyKey: "reminderArrival",
        values: { title: stay.title, date: stay.startDate, days: ARRIVAL_DAYS_BEFORE },
        chatEvent: "reminderArrival",
      });
    }

    // Saved Houses that start soon and still take requests.
    const start = dayStart(stay.startDate);
    if (user.savedStayIds?.includes(stay.id) && stay.status === "published" && stay.acceptingRequests && start > now && start - now < SAVED_WINDOW_DAYS * DAY) {
      add({ type: "savedSoon", stayId: stay.id, due: iso(start - SAVED_DAYS_BEFORE * DAY), notifyKey: "reminderSavedSoon", values: { title: stay.title, date: stay.startDate } });
    }
  }

  // Host alerts: an alerted host opened a House recently (sent the moment it's published).
  for (const hostId of user.hostAlerts ?? []) {
    const host = data.users.find((u) => u.id === hostId);
    for (const stay of data.stays) {
      const opened = new Date(stay.createdAt).getTime();
      if (stay.hostId !== hostId || stay.status !== "published" || now - opened > HOST_ALERT_WINDOW_DAYS * DAY || !host) continue;
      add({ type: "hostOpened", stayId: stay.id, due: stay.createdAt, notifyKey: "hostOpened", values: { name: host.name.split(" ")[0], title: stay.title } });
    }
  }

  return reminders.toSorted((a, b) => a.due.localeCompare(b.due));
}

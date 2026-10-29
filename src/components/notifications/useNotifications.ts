"use client";

import { useMemo } from "react";
import { pageOf, type AppNotification, type NotificationRepository } from "@/lib/data/notifications";
import { NOTIFY_GROUP, settingsOf, useStore } from "@/lib/store";
import type { Stay } from "@/lib/types";

/**
 * The current user's notifications as a NotificationRepository – over the mock store today. Only what they see
 * in-app (Settings → Notifications → In-app); logged out: nothing.
 */
export function useNotifications(): NotificationRepository & { ready: boolean } {
  const store = useStore();
  const { currentUserId: me, notifications, users, markNotificationRead, markAllNotificationsRead } = store;
  const mine = useMemo(() => {
    if (!me) return [];
    const prefs = settingsOf(users.find((u) => u.id === me)).notifications;
    return notifications.filter((n) => n.userId === me && prefs[NOTIFY_GROUP[n.key]]?.inApp !== false);
  }, [me, notifications, users]);

  return useMemo(
    () => ({
      ready: me !== null,
      list: (query) => pageOf(mine, query),
      unreadCount: () => mine.filter((n) => !n.readAt).length,
      markRead: markNotificationRead,
      markAllRead: markAllNotificationsRead,
    }),
    [me, mine, markNotificationRead, markAllNotificationsRead],
  );
}

/** Where a notification leads: its own target, the chat for messages, the host's Manage page or the House page. */
export function hrefOf(n: AppNotification, stays: readonly Stay[], me: string | null): string | null {
  if (n.href) return n.href;
  if (n.threadId) return `/inbox/${n.threadId}`;
  const stay = n.stayId ? stays.find((s) => s.id === n.stayId) : undefined;
  if (!stay) return null;
  // "Want to do it again?" leads everyone in the crew to the past House (crew, chat, "Do it again").
  if (n.key === "doItAgain") return `/my-stays/${stay.id}`;
  return stay.hostId === me ? `/my-stays/${stay.id}` : `/house/${stay.slug}`;
}

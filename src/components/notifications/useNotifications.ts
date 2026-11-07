"use client";

import { useMemo } from "react";
import { pageOf, type AppNotification, type NotificationRepository } from "@/lib/data/notifications";
import { cardTaskOf, TASK_NOTIFICATIONS } from "@/lib/houseTasks";
import { useNow } from "@/lib/useNow";
import { unreadThreadCount, useStore } from "@/lib/store";
import type { Stay } from "@/lib/types";

/** Unread in Messages: chats (crew and direct) and Updates (the notifications) – the dot on the Messages tab and on each segment. */
export function useMessagesUnread(): { chats: number; updates: number } {
  const store = useStore();
  const repo = useNotifications();
  return { chats: unreadThreadCount(store), updates: repo.ready ? repo.unreadCount() : 0 };
}

/**
 * The current user's notifications as a NotificationRepository – over the mock store today. In-app is always on (config/notifications.ts);
 * logged out: nothing.
 */
export function useNotifications(): NotificationRepository & { ready: boolean } {
  const store = useStore();
  const { currentUserId: me, notifications, markNotificationRead, markAllNotificationsRead } = store;
  const now = useNow();
  const mine = useMemo(() => {
    if (!me) return [];
    const at = now === null ? null : new Date(now).toISOString();
    // A task that's already a button on its House's card (Your houses: pay, answer, review) shows here once, as a hint – the newest of
    // its notifications (reminders included), not every one of them.
    const taskOnCard = (n: AppNotification) => {
      const kind = TASK_NOTIFICATIONS[n.key];
      const stay = kind && at && n.stayId ? store.stays.find((s) => s.id === n.stayId) : undefined;
      return stay !== undefined && at !== null && cardTaskOf(store, stay, at)?.kind === kind ? `${stay.id}:${kind}` : null;
    };
    const seen = new Set<string>();
    return notifications
      .filter((n) => n.userId === me)
      .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
      .filter((n) => {
        const task = taskOnCard(n);
        if (!task) return true;
        if (seen.has(task)) return false;
        seen.add(task);
        return true;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the store's data is what's read
  }, [me, notifications, now, store.stays, store.joinRequests, store.payments]);

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
  if (n.threadId) return `/messages/${n.threadId}`;
  const stay = n.stayId ? stays.find((s) => s.id === n.stayId) : undefined;
  if (!stay) return null;
  // "Want to do it again?" leads everyone in the crew to the past House (crew, chat, "Do it again").
  if (n.key === "doItAgain") return `/your-houses/${stay.id}`;
  return stay.hostId === me ? `/your-houses/${stay.id}` : `/house/${stay.slug}`;
}

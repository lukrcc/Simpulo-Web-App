"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/Toast";
import { useNotificationText } from "@/i18n/events";
import { APP_MODE } from "@/lib/appMode";
import { linkBase } from "@/lib/links";
import { catalogOf, notify } from "@/lib/notify";
import { shortNameOf } from "@/lib/shortName";
import { setInAppSink } from "@/lib/notify/channels/inapp";
import { setAnnounce } from "@/lib/notify/log";
import { findUser, settingsOf, useStore } from "@/lib/store";
import { hrefOf } from "./useNotifications";

/**
 * Connects the store and lib/notify (renders nothing):
 * - every new in-app record the reducer made goes through notify() for push and email (records restored from an earlier visit, seeded
 *   ones and those notify() made itself are skipped),
 * - notify() called outside the reducer writes its in-app records into the store,
 * - in the demo, push and email to the person using the app show as a small toast ("📧 Email sent: …").
 */
export function NotifyBridge() {
  const store = useStore();
  const text = useNotificationText();
  const t = useTranslations("messages.notify");
  const showToast = useToast();
  const latest = useRef(store);
  useEffect(() => {
    latest.current = store;
  });

  const { addNotifications } = store;
  useEffect(() => {
    setInAppSink(addNotifications);
    return () => setInAppSink(null);
  }, [addNotifications]);

  useEffect(() => {
    setAnnounce((channel, userId, line) => {
      if (APP_MODE !== "demo" || userId !== latest.current.currentUserId) return;
      showToast(t(channel === "email" ? "emailSentToast" : "pushToast", { text: line }));
    });
    return () => setAnnounce(() => {});
  }, [showToast, t]);

  // Only what happens from now on is sent; set in an effect (no clock while rendering), before the one below runs.
  const since = useRef<string | null>(null);
  const done = useRef(new Set<string>());
  useEffect(() => {
    since.current = new Date().toISOString();
  }, []);

  useEffect(() => {
    const from = since.current;
    if (!from) return;
    for (const n of store.notifications) {
      if (n.mock || n.sent || n.createdAt < from || done.current.has(n.id)) continue;
      done.current.add(n.id);
      const href = hrefOf(n, store.stays, n.userId);
      const stay = n.stayId ? store.stays.find((s) => s.id === n.stayId) : undefined;
      notify(n.userId, catalogOf(n.key), {
        // Push and the lock screen show only the kind and this (the catalogue's short line) – never the text below.
        house: stay ? shortNameOf(stay) : undefined,
        key: n.key,
        values: n.values,
        eventId: n.eventId,
        stayId: n.stayId,
        threadId: n.threadId,
        href: n.href,
        text: text(n),
        prefs: settingsOf(findUser(store, n.userId)).notifications,
        quiet: settingsOf(findUser(store, n.userId)).quietHours,
        recorded: true,
        url: href ? `${linkBase()}${href}` : undefined,
        // Chat: read in Updates, or (for the person using this browser) the chat opened since.
        isUnread: () => {
          const now = latest.current;
          if (now.notifications.find((x) => x.id === n.id)?.readAt) return false;
          const readAt = n.threadId && n.userId === now.currentUserId ? now.lastReadAt[n.threadId] : undefined;
          return !readAt || readAt < n.createdAt;
        },
      });
    }
    // The store's other data is read for each new record only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.notifications]);

  return null;
}

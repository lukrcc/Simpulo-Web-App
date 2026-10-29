"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/Toast";
import { useNotificationText } from "@/i18n/events";
import { mockInstalledUsers } from "@/lib/mock-extras";
import { findUser, NOTIFY_GROUP, settingsOf, useStore } from "@/lib/store";

/**
 * Mock delivery for the store's notification outbox. Real sending would be server-side: email always, push when
 * the recipient installed the app. Here each event shows as a toast saying who got what – there's no Updates tab.
 */
export function NotificationToasts() {
  const store = useStore();
  const showToast = useToast();
  const t = useTranslations("messages.notify");
  const tCommon = useTranslations("common");
  const text = useNotificationText();
  const { notifications } = store;
  // Only events from now on – not ones that happened before this component mounted.
  const seen = useRef(notifications.length);

  useEffect(() => {
    const fresh = notifications.slice(seen.current).filter((n) => !n.mock);
    seen.current = notifications.length;
    // One line per event: its recipients' records share the eventId.
    const events = Map.groupBy(fresh, (n) => n.eventId);
    for (const records of events.values()) {
      const notification = records[0];
      // Each recipient's Settings decide the channels: email if on, push if on and the app is installed.
      const group = NOTIFY_GROUP[notification.key];
      const delivered = records
        .map(({ userId: id }) => {
          const prefs = settingsOf(findUser(store, id)).notifications[group];
          return { id, email: prefs.email, push: prefs.push && mockInstalledUsers.has(id) };
        })
        .filter((r) => r.email || r.push);
      if (delivered.length === 0) continue;
      const names = delivered.map(({ id }) => (id === store.currentUserId ? tCommon("you") : (findUser(store, id)?.name.split(" ")[0] ?? "")));
      const anyPush = delivered.some((r) => r.push);
      const anyEmail = delivered.some((r) => r.email);
      const recipients = names.length > 3 ? t("andMore", { names: names.slice(0, 2).join(", "), count: names.length - 2 }) : names.join(", ");
      const channels = anyEmail && anyPush ? t("channelEmailPush") : anyPush ? t("channelPush") : t("channelEmail");
      showToast(t("delivery", { recipients, channels, text: text(notification) }), "notify");
    }
  }, [notifications, store, showToast, t, tCommon, text]);

  return null;
}

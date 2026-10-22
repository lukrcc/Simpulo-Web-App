"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/Toast";
import { useNotificationText } from "@/i18n/events";
import { mockInstalledUsers } from "@/lib/mock-extras";
import { findUser, useStore } from "@/lib/store";

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
    const fresh = notifications.slice(seen.current);
    seen.current = notifications.length;
    for (const notification of fresh) {
      const names = notification.to.map((id) => (id === store.currentUserId ? tCommon("you") : (findUser(store, id)?.name.split(" ")[0] ?? "")));
      const anyPush = notification.to.some((id) => mockInstalledUsers.has(id));
      const recipients = names.length > 3 ? t("andMore", { names: names.slice(0, 2).join(", "), count: names.length - 2 }) : names.join(", ");
      showToast(
        t("delivery", { recipients, channels: anyPush ? t("channelEmailPush") : t("channelEmail"), text: text(notification) }),
        "notify",
      );
    }
  }, [notifications, store, showToast, t, tCommon, text]);

  return null;
}

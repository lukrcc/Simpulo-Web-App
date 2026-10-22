"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import type { AppNotification } from "@/lib/store";
import type { Message, MessageEvent } from "@/lib/types";
import { useFormat } from "./format";

/** Numbers in event values are prices or dates; format them for the active locale. */
function useEventValues() {
  const f = useFormat();
  return useCallback(
    (values: Record<string, string | number>) => ({
      ...values,
      ...(typeof values.price === "number" && { price: f.price(values.price) }),
      ...(typeof values.payBy === "string" && { payBy: f.day(values.payBy) }),
      ...(typeof values.date === "string" && { date: f.day(values.date) }),
    }),
    [f],
  );
}

/** Text of a chat message: app events are translated, everything people wrote is shown as written. */
export function useMessageText() {
  const t = useTranslations("messages.system");
  const values = useEventValues();
  return useCallback(
    (message: Pick<Message, "text"> & { event?: MessageEvent }) => (message.event ? t(message.event.key, values(message.event.values)) : message.text),
    [t, values],
  );
}

export function useNotificationText() {
  const t = useTranslations("messages.notify");
  const values = useEventValues();
  return useCallback((notification: AppNotification) => t(notification.key, values(notification.values)), [t, values]);
}

"use client";

import { Bell, CheckCircle2, CreditCard, Lock, MapPin, MessageCircle, Sparkles, UserPlus, Users, XCircle, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { useNotificationText } from "@/i18n/events";
import { typeOf, type AppNotification, type NotificationType } from "@/lib/data/notifications";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { hrefOf } from "./useNotifications";

const ICONS: Record<NotificationType, LucideIcon> = {
  request_received: UserPlus,
  request_accepted: CheckCircle2,
  request_declined: XCircle,
  crew_full: Users,
  house_locked: Lock,
  payment_due: CreditCard,
  new_message: MessageCircle,
  house_opened_in_place: MapPin,
  system: Sparkles,
};

const noSubscribe = () => () => {};
/** "Now" for relative times – browser only (the server must not read the clock): null there, the time stays empty. */
function useNow(): number | null {
  return useSyncExternalStore(noSubscribe, () => Date.now(), () => null);
}

/**
 * One notification – the same in the bell and on /notifications: type icon, title (bold while unread, with a dot),
 * one line of text, relative time. Clicking marks it read and opens what it's about.
 */
export function NotificationItem({ notification, onOpen, onRead }: { notification: AppNotification; onOpen?: () => void; onRead: (id: string) => void }) {
  const t = useTranslations("notifications");
  const text = useNotificationText();
  const format = useFormatter();
  const store = useStore();
  const now = useNow();
  const type = typeOf(notification);
  const Icon = ICONS[type] ?? Bell;
  const unread = !notification.readAt;
  const href = hrefOf(notification, store.stays, store.currentUserId);

  const body = (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-page text-ink">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-sm", unread ? "font-semibold text-ink" : "font-medium text-zinc-700")}>{t(`types.${type}`)}</span>
        <span className={cn("block truncate text-sm", unread ? "text-zinc-700" : "text-zinc-500")}>{text(notification)}</span>
        <span className="mt-0.5 block text-xs text-zinc-500">{now !== null && format.relativeTime(new Date(notification.createdAt), new Date(now))}</span>
      </span>
      {unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" role="img" aria-label={t("unread")} />}
    </>
  );
  const className = "flex items-start gap-3 rounded-xl px-3 py-3 text-left hover:bg-neutral-50";
  const open = () => {
    onRead(notification.id);
    onOpen?.();
  };
  return href ? (
    <Link href={href} onClick={open} className={className}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={open} className={cn(className, "w-full")}>
      {body}
    </button>
  );
}

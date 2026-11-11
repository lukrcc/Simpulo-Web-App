"use client";

import { Bell, CheckCircle2, CreditCard, Lock, MailOpen, MapPin, MessageCircle, RotateCcw, Sparkles, UserPlus, Users, Compass, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useNotificationText } from "@/i18n/events";
import { typeOf, type AppNotification, type NotificationType } from "@/lib/data/notifications";
import { ListRow } from "@/components/ui/ListRow";
import { useStore } from "@/lib/store";
import { cn, housePhotos } from "@/lib/utils";
import { Img } from "@/components/ui/Img";
import { similarHouses } from "@/lib/requests";
import { hrefOf } from "./useNotifications";
import { useNow } from "@/lib/useNow";

const ICONS: Record<NotificationType, LucideIcon> = {
  request_received: UserPlus,
  request_accepted: CheckCircle2,
  request_declined: Compass,
  crew_full: Users,
  house_locked: Lock,
  payment_due: CreditCard,
  new_message: MessageCircle,
  house_opened_in_place: MapPin,
  crew_invite: MailOpen,
  do_it_again: RotateCcw,
  system: Sparkles,
};


/**
 * One notification – the same in the bell and on /notifications, as a ListRow: type icon, title (bold while unread,
 * with a dot), one line of text, relative time. Clicking marks it read and opens what it's about.
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

  // A ListRow: type icon, title (semibold while unread), text, then the relative time and the unread dot on the right.
  const body = (
    <ListRow
      lead={<Icon aria-hidden />}
      title={<span className={unread ? "font-semibold" : undefined}>{t(`types.${type}`)}</span>}
      subtitle={text(notification)}
      aside={<span className="shrink-0 text-small text-muted">{now !== null && format.relativeTime(new Date(Math.min(Date.parse(notification.createdAt), now)), new Date(now))}</span>}
      action={unread ? <span className="size-2 rounded-full bg-accent" role="img" aria-label={t("unread")} /> : undefined}
    />
  );
  const className = "block px-2 text-left hover:bg-bg";
  const open = () => {
    onRead(notification.id);
    onOpen?.();
  };
  const row = href ? (
    <Link href={href} onClick={open} className={className}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={open} className={cn(className, "w-full")}>
      {body}
    </button>
  );
  // "Didn't work out": up to 3 similar Houses right under it (same city or vibe, overlapping dates, a free spot).
  const failedStay = type === "request_declined" && notification.stayId ? store.stays.find((s) => s.id === notification.stayId) : undefined;
  const similar = failedStay ? similarHouses(store.stays, failedStay, store.currentUserId) : [];
  if (similar.length === 0) return row;
  return (
    <div>
      {row}
      <ul aria-label={t("similar")} className="flex flex-wrap gap-2 pb-3 pl-[60px] pr-2">
        {similar.map((stay) => (
          <li key={stay.id}>
            <Link href={`/house/${stay.slug}`} onClick={() => onRead(notification.id)} className="flex max-w-56 items-center gap-2.5 rounded-2xl py-1 pl-1 pr-3 transition-colors hover:bg-ink/5">
              <span className="relative size-10 shrink-0 overflow-hidden rounded-[10px] bg-ink/6">
                {housePhotos(stay)[0] && <Img src={housePhotos(stay)[0]} alt="" fill sizes="40px" className="object-cover" />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-small font-semibold text-ink">{stay.title}</span>
                <span className="block truncate text-small text-muted">{format.dateTime(new Date(stay.startDate), { month: "short", day: "numeric" })} · {stay.location.city}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

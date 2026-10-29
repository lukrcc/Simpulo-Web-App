"use client";

import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { useNotifications } from "@/components/notifications/useNotifications";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/utils";

/** The panel lists this many – the rest are on /notifications. */
const PANEL_ITEMS = 10;

const phoneQuery = "(max-width: 767.98px)";
function subscribePhone(onChange: () => void) {
  const media = window.matchMedia(phoneQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
function useIsPhone(): boolean {
  return useSyncExternalStore(subscribePhone, () => window.matchMedia(phoneQuery).matches, () => false);
}

/**
 * The bell (logged in, desktop and mobile header): unread count ("9+" past nine), opening the 10 newest
 * notifications – a 380px popover on desktop, a bottom sheet on phones – with "Mark all as read" and
 * "See all notifications". Apart from Messages.
 */
export function NotificationBell() {
  const t = useTranslations("notifications");
  const repo = useNotifications();
  const isPhone = useIsPhone();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const unread = repo.unreadCount();
  const items = repo.list({ limit: PANEL_ITEMS }).items;

  useEffect(() => {
    if (!open || isPhone) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, isPhone]);

  if (!repo.ready) return null;
  const close = () => setOpen(false);

  const markAll = (
    <button
      type="button"
      onClick={repo.markAllRead}
      disabled={unread === 0}
      className="inline-flex items-center gap-1 text-sm font-medium text-zinc-600 hover:text-ink disabled:text-zinc-300"
    >
      <CheckCheck className="size-4" aria-hidden />
      {t("markAll")}
    </button>
  );
  const list =
    items.length === 0 ? (
      <p className="px-4 py-10 text-center text-sm text-zinc-500">{t("empty")}</p>
    ) : (
      <ul className="space-y-0.5">
        {items.map((n) => (
          <li key={n.id}>
            <NotificationItem notification={n} onRead={repo.markRead} onOpen={close} />
          </li>
        ))}
      </ul>
    );
  const seeAll = (
    <Link href="/notifications" onClick={close} className="block py-3 text-center text-sm font-medium text-ink hover:underline">
      {t("seeAll")}
    </Link>
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unread > 0 ? t("labelUnread", { count: unread }) : t("label")}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative flex size-9 items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-black/5 hover:text-ink"
      >
        <Bell className="size-5" aria-hidden />
        {unread > 0 && (
          <span
            aria-hidden
            className={cn(
              "absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-page bg-accent px-1 text-[10px] font-semibold leading-none text-white",
            )}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && !isPhone && (
        <div
          role="dialog"
          aria-label={t("title")}
          className="animate-fade-in absolute right-0 top-full z-50 mt-2 flex max-h-[520px] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_12px_40px_rgba(30,30,34,0.14)] ring-1 ring-black/5"
        >
          <div className="flex items-center justify-between gap-3 border-b border-black/5 px-4 py-3">
            <p className="font-semibold text-ink">{t("title")}</p>
            {markAll}
          </div>
          <div className="scroll-pane min-h-0 flex-1 p-1.5">{list}</div>
          <div className="border-t border-black/5">{seeAll}</div>
        </div>
      )}

      {/* Phones: the same list in a bottom sheet. */}
      {isPhone && (
        <Sheet open={open} onClose={close} title={t("title")}>
          <div className="-mt-2 mb-2 flex justify-end">{markAll}</div>
          <div className="-mx-2">{list}</div>
          <div className="mt-2 border-t border-black/5">{seeAll}</div>
        </Sheet>
      )}
    </div>
  );
}

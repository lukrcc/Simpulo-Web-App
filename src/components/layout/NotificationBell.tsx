"use client";

import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { useNotifications } from "@/components/notifications/useNotifications";
import { Button, buttonStyles } from "@/components/ui/ActionButton";
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
 * `variant="header"`: the desktop header's 40px circle (surface, line border); default: the bare icon (mobile header).
 */
export function NotificationBell({ variant = "plain" }: { variant?: "plain" | "header" }) {
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
    <Button variant="tertiary" size="md" onClick={repo.markAllRead} disabled={unread === 0}>
      <CheckCheck aria-hidden />
      {t("markAll")}
    </Button>
  );
  const list =
    items.length === 0 ? (
      <p className="px-4 py-10 text-center text-sm text-muted">{t("empty")}</p>
    ) : (
      <ul className="divide-y divide-line">
        {items.map((n) => (
          <li key={n.id}>
            <NotificationItem notification={n} onRead={repo.markRead} onOpen={close} />
          </li>
        ))}
      </ul>
    );
  const seeAll = (
    <Link href="/notifications" onClick={close} className={buttonStyles("tertiary", "md", "w-full py-3")}>
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
        className={cn(
          "relative flex items-center justify-center rounded-full transition-colors",
          variant === "header" ? "size-10 border border-line bg-surface text-ink hover:bg-bg" : "size-9 text-muted hover:bg-ink/5 hover:text-ink",
        )}
      >
        <Bell className="size-5" aria-hidden />
        {/* Header: an 8px accent dot (the count is in the label); elsewhere the count itself. */}
        {unread > 0 &&
          (variant === "header" ? (
            <span aria-hidden className="absolute right-1.5 top-1.5 size-2 rounded-full border border-surface bg-accent" />
          ) : (
            <span
              aria-hidden
              className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-bg bg-ink px-1 text-[10px] font-semibold leading-none text-surface"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          ))}
      </button>

      {open && !isPhone && (
        <div
          role="dialog"
          aria-label={t("title")}
          className="animate-fade-in absolute right-0 top-full z-50 mt-2 flex max-h-[520px] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-surface shadow-[0_12px_40px_color-mix(in_srgb,var(--ink)_14%,transparent)] ring-1 ring-line"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <p className="font-semibold text-ink">{t("title")}</p>
            {markAll}
          </div>
          <div className="scroll-pane min-h-0 flex-1 px-2">{list}</div>
          <div className="border-t border-line">{seeAll}</div>
        </div>
      )}

      {/* Phones: the same list in a bottom sheet. */}
      {isPhone && (
        <Sheet open={open} onClose={close} title={t("title")}>
          <div className="-mt-2 mb-2 flex justify-end">{markAll}</div>
          <div className="-mx-2">{list}</div>
          <div className="mt-2 border-t border-line">{seeAll}</div>
        </Sheet>
      )}
    </div>
  );
}

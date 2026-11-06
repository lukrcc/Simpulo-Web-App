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
import { Anchored } from "@/components/ui/Anchored";
import { headerDot } from "./header/dot";

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
 * `variant="header"`: the desktop header's 36px circle (surface, line border), marking unread with the header dot only; default: the bare icon with the count (mobile header).
 */
export function NotificationBell({ variant = "plain" }: { variant?: "plain" | "header" }) {
  const t = useTranslations("notifications");
  const repo = useNotifications();
  const isPhone = useIsPhone();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const unread = repo.unreadCount();
  const items = repo.list({ limit: PANEL_ITEMS }).items;

  useEffect(() => {
    if (!open || isPhone) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (rootRef.current && !rootRef.current.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
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
      <p className="px-4 py-10 text-center text-small text-muted">{t("empty")}</p>
    ) : (
      <ul className="">
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
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("label")}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "relative flex items-center justify-center rounded-full transition-colors",
          variant === "plain" ? "size-9 text-muted hover:bg-ink/5 hover:text-ink" : "icon-button size-8",
        )}
      >
        {unread > 0 && <span className="sr-only">{t("labelUnread", { count: unread })}</span>}
        <Bell className={variant === "plain" ? "size-5" : "size-4"} aria-hidden />
        {/* Header: the dot only (the count is in the label); elsewhere the count itself. */}
        {unread > 0 &&
          (variant !== "plain" ? (
            <span aria-hidden className={headerDot} />
          ) : (
            <span
              aria-hidden
              className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-bg bg-accent px-1 text-small font-semibold leading-none text-surface"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          ))}
      </button>

      {open && !isPhone && (
        // In a portal: the site header clips its overflow.
        <Anchored anchor={buttonRef} ref={panelRef} align="end">
          <div
            role="dialog"
            aria-label={t("title")}
            className="animate-fade-in flex max-h-[520px] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-surface shadow-[0_12px_40px_color-mix(in_srgb,var(--ink)_14%,transparent)]"
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <p className="font-semibold text-ink">{t("title")}</p>
              {markAll}
            </div>
            <div className="scroll-pane min-h-0 flex-1 px-2">{list}</div>
            <div className="">{seeAll}</div>
          </div>
        </Anchored>
      )}

      {/* Phones: the same list in a bottom sheet. */}
      {isPhone && (
        <Sheet open={open} onClose={close} title={t("title")}>
          <div className="-mt-2 mb-2 flex justify-end">{markAll}</div>
          <div className="-mx-2">{list}</div>
          <div className="mt-2 ">{seeAll}</div>
        </Sheet>
      )}
    </div>
  );
}

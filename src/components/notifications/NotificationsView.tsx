"use client";

import { CheckCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { Container } from "@/components/layout/Container";
import { buttonClass } from "@/components/ui/button";
import { Img } from "@/components/ui/Img";
import { NOTIFICATION_CATEGORIES, type AppNotification, type NotificationCategory } from "@/lib/data/notifications";
import { cn } from "@/lib/utils";
import { NotificationItem } from "./NotificationItem";
import { useNotifications } from "./useNotifications";

/** Notifications per "Load more". */
const PAGE_SIZE = 30;
const DAY_MS = 86_400_000;

type Group = "today" | "yesterday" | "week" | "earlier";

const noSubscribe = () => () => {};
/** Local midnight today – browser only (the server must not read the clock): null there, so everything is "earlier". */
function useTodayStart(): number | null {
  return useSyncExternalStore(
    noSubscribe,
    () => new Date().setHours(0, 0, 0, 0),
    () => null,
  );
}

function groupOf(createdAt: string, todayStart: number | null): Group {
  if (todayStart === null) return "earlier";
  const at = Date.parse(createdAt);
  if (at >= todayStart) return "today";
  if (at >= todayStart - DAY_MS) return "yesterday";
  if (at >= todayStart - 6 * DAY_MS) return "week";
  return "earlier";
}

/** /notifications: every notification, by day, filterable by kind, 30 at a time. */
export function NotificationsView() {
  const t = useTranslations("notifications");
  return (
    <RequireLogin title={t("loginTitle")}>
      <NotificationsList />
    </RequireLogin>
  );
}

function NotificationsList() {
  const t = useTranslations("notifications");
  const repo = useNotifications();
  const todayStart = useTodayStart();
  const [category, setCategory] = useState<NotificationCategory | null>(null);
  // Cursors of the pages loaded so far: every page is read again on each render, so reads show right away.
  const [cursors, setCursors] = useState<{ category: NotificationCategory | null; list: (string | null)[] }>({ category: null, list: [null] });
  const pageCursors = cursors.category === category ? cursors.list : [null];
  const pages = pageCursors.map((cursor) => repo.list({ category: category ?? undefined, cursor, limit: PAGE_SIZE }));
  const items = pages.flatMap((p) => p.items);
  const nextCursor = pages.at(-1)?.nextCursor ?? null;
  const groups = Map.groupBy(items, (n) => groupOf(n.createdAt, todayStart));
  const unread = repo.unreadCount();
  const nothingAtAll = category === null && items.length === 0;

  return (
    <Container page width="narrow">
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-ink">{t("title")}</h1>
        {unread > 0 && (
          <button type="button" onClick={repo.markAllRead} className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-ink">
            <CheckCheck className="size-4" aria-hidden />
            {t("markAll")}
          </button>
        )}
      </div>

      <div role="tablist" aria-label={t("title")} className="no-scrollbar mt-6 flex gap-2 overflow-x-auto">
        {[null, ...NOTIFICATION_CATEGORIES].map((c) => (
          <button
            key={c ?? "all"}
            type="button"
            role="tab"
            aria-selected={category === c}
            onClick={() => setCategory(c)}
            className={cn("h-9 shrink-0 rounded-full px-4 text-sm font-medium transition-colors", category === c ? "bg-ink text-white" : "bg-white text-ink hover:bg-zinc-100")}
          >
            {t(`tabs.${c ?? "all"}`)}
          </button>
        ))}
      </div>

      {nothingAtAll ? (
        <div className="mt-12 flex flex-col items-center text-center">
          <Img src="/icon.svg" alt="" width={72} height={72} className="size-18" />
          <p className="mt-5 max-w-sm text-zinc-600">{t("empty")}</p>
        </div>
      ) : items.length === 0 ? (
        <p className="mt-10 text-center text-sm text-zinc-500">{t("emptyTab")}</p>
      ) : (
        <div className="mt-6 space-y-6">
          {(["today", "yesterday", "week", "earlier"] as const).map((group) => {
            const list: AppNotification[] = groups.get(group) ?? [];
            if (list.length === 0) return null;
            return (
              <section key={group} aria-labelledby={`n-${group}`}>
                <h2 id={`n-${group}`} className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {t(`groups.${group}`)}
                </h2>
                <ul className="space-y-0.5 rounded-[24px] bg-white p-1.5">
                  {list.map((n) => (
                    <li key={n.id}>
                      <NotificationItem notification={n} onRead={repo.markRead} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          {nextCursor && (
            <div className="flex justify-center">
              <button type="button" onClick={() => setCursors({ category, list: [...pageCursors, nextCursor] })} className={buttonClass("secondary", "md")}>
                {t("loadMore")}
              </button>
            </div>
          )}
        </div>
      )}
    </Container>
  );
}

"use client";

import { MessageCircle, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { MasterDetail } from "@/components/layout/MasterDetail";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { ThreadPanel } from "@/components/views/ThreadView";
import { useMessageText } from "@/i18n/events";
import { useFormat } from "@/i18n/format";
import { findUser, isBlocked, isThreadUnread, useStore } from "@/lib/store";
import type { Message, Thread, User } from "@/lib/types";
import { useIsDesktop } from "@/lib/useIsDesktop";
import { cn } from "@/lib/utils";

interface ThreadRow {
  thread: Thread;
  title: string;
  /** House title for direct chats – searchable too */
  subtitle?: string;
  avatar?: User;
}

export function InboxList() {
  const t = useTranslations("messages.inbox");
  return (
    <RequireLogin title={t("loginTitle")} description={t("loginDescription")}>
      <InboxContent />
    </RequireLogin>
  );
}

const newestFirst = (a: ThreadRow, b: ThreadRow) =>
  (b.thread.messages.at(-1)?.createdAt ?? "").localeCompare(a.thread.messages.at(-1)?.createdAt ?? "");

function InboxContent() {
  const t = useTranslations("messages.inbox");
  const store = useStore();
  const me = store.currentUserId;
  const isDesktop = useIsDesktop();
  const selectedId = useSearchParams().get("id");
  const f = useFormat();
  const [query, setQuery] = useState("");

  const mine = store.threads.filter((t) => me !== null && t.participantIds.includes(me));
  // Two crews of Houses with the same title: the dates tell them apart.
  const crewTitleCount = new Map<string, number>();
  for (const thread of mine) {
    const title = thread.type === "crew" ? store.stays.find((s) => s.id === thread.stayId)?.title : undefined;
    if (title) crewTitleCount.set(title, (crewTitleCount.get(title) ?? 0) + 1);
  }

  const rows: ThreadRow[] = mine.flatMap((thread) => {
    const stay = store.stays.find((s) => s.id === thread.stayId);
    if (!stay) return [];
    if (thread.type === "crew") {
      const title =
        (crewTitleCount.get(stay.title) ?? 0) > 1
          ? t("titleWithDates", { title: stay.title, dates: f.shortRange(stay.startDate, stay.endDate) })
          : stay.title;
      return [{ thread, title, avatar: findUser(store, stay.hostId) }];
    }
    const other = findUser(store, thread.participantIds.find((id) => id !== me) ?? "");
    // Blocked: the chat is gone (crew chats stay – their messages collapse instead).
    if (other && isBlocked(store, other.id)) return [];
    return [{ thread, title: other?.name ?? t("unknown"), subtitle: stay.title, avatar: other }];
  });

  const q = query.trim().toLowerCase();
  const matches = (row: ThreadRow) => !q || row.title.toLowerCase().includes(q) || (row.subtitle?.toLowerCase().includes(q) ?? false);
  const crews = rows.filter((r) => r.thread.type === "crew" && matches(r)).toSorted(newestFirst);
  const direct = rows.filter((r) => r.thread.type === "direct" && matches(r)).toSorted(newestFirst);
  const ordered = [...crews, ...direct];

  // ?id= wins (deep links, refresh); otherwise the first row.
  const activeId = rows.some((r) => r.thread.id === selectedId) ? selectedId : (ordered[0]?.thread.id ?? null);

  if (rows.length === 0) {
    return (
      <MasterDetail
        title={t("title")}
        list={
          <EmptyState
            icon={MessageCircle}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
            action={
              <Link href="/" className={buttonClass("dark", "sm")}>
                {t("explore")}
              </Link>
            }
          />
        }
        detail={null}
      />
    );
  }

  const group = (label: string, items: ThreadRow[]) =>
    items.length > 0 && (
      <section className="mt-5">
        <h2 className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</h2>
        <ul className="space-y-0.5">
          {items.map((row) => (
            <li key={row.thread.id}>
              <ThreadRowLink row={row} active={isDesktop && row.thread.id === activeId} isDesktop={isDesktop} />
            </li>
          ))}
        </ul>
      </section>
    );

  return (
    <MasterDetail
      title={t("title")}
      detailFill
      list={
        <>
          <label className="sticky top-0 z-10 flex h-11 items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 focus-within:border-ink">
            <Search className="size-4 shrink-0 text-zinc-400" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchLabel")}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400"
            />
          </label>
          {group(t("crews"), crews)}
          {group(t("direct"), direct)}
          {ordered.length === 0 && <p className="mt-8 text-center text-sm text-zinc-500">{t("noMatch", { query: query.trim() })}</p>}
        </>
      }
      // Mounted on desktop only: on mobile it would mark the chat as read without anyone seeing it.
      detail={isDesktop && activeId ? <ThreadPanel threadId={activeId} /> : null}
    />
  );
}

function ThreadRowLink({ row, active, isDesktop }: { row: ThreadRow; active: boolean; isDesktop: boolean }) {
  const t = useTranslations("messages.inbox");
  const f = useFormat();
  const messageText = useMessageText();
  const store = useStore();
  const { thread, title, subtitle, avatar } = row;

  /** Photos and files get a hint instead of an empty preview; event lines are translated. */
  function previewText(message: Message): string {
    const text = messageText(message);
    const images = message.attachments?.filter((a) => a.kind === "image").length ?? 0;
    const file = message.attachments?.find((a) => a.kind === "file");
    if (images > 0) return text ? `📷 ${text}` : t("photos", { count: images });
    if (file) return text ? `📎 ${text}` : t("file", { name: file.name ?? t("attachment") });
    return text;
  }
  const last = thread.messages.at(-1);
  const unread = isThreadUnread(store, thread);
  const author = last?.userId === store.currentUserId ? t("you") : last?.userId && findUser(store, last.userId)?.name.split(" ")[0];
  const preview = !last
    ? t("noMessages")
    : // App lines (system, payments, lock cards) already name who did it.
      last.userId === "system" || last.event || !author
      ? previewText(last)
      : t("preview", { author, text: previewText(last) });
  // Today (UTC calendar day, like the formatters): the time; older: the day.
  const time = last && (last.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10) ? f.time(last.createdAt) : f.day(last.createdAt));

  return (
    <Link
      href={isDesktop ? `/inbox?id=${thread.id}` : `/inbox/${thread.id}`}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={cn("flex h-16 items-center gap-3 rounded-2xl px-3 transition-colors", active ? "bg-white shadow-xs" : "hover:bg-black/[0.03]")}
    >
      {avatar ? (
        <PersonPhoto src={avatar.photos[0]} alt={avatar.name} size={44} className="size-11 bg-neutral-200" />
      ) : (
        <span className="size-11 shrink-0 rounded-full bg-neutral-100" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className={cn("min-w-0 truncate text-sm", unread ? "font-bold" : "font-semibold")}>
            {title}
            {/* Direct chats: the House they're about, on the same line. */}
            {subtitle && <span className="font-normal text-neutral-400"> · {subtitle}</span>}
          </p>
          {time && <span className="shrink-0 text-xs text-neutral-400">{time}</span>}
        </div>
        <div className="flex items-center gap-2">
          <p className={cn("min-w-0 flex-1 truncate text-sm", unread ? "font-medium text-ink" : "text-neutral-500")}>{preview}</p>
          {unread && <span className="size-2.5 shrink-0 rounded-full bg-accent" aria-label={t("unread")} />}
        </div>
      </div>
    </Link>
  );
}

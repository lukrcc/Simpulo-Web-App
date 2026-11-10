"use client";

import { ChevronRight, MessageCircle, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { MasterDetail } from "@/components/layout/MasterDetail";
import { Button } from "@/components/ui/ActionButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { TabBar } from "@/components/ui/TabBar";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { useMessagesUnread, useNotifications } from "@/components/notifications/useNotifications";
import { Img } from "@/components/ui/Img";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { ThreadPanel } from "@/components/views/ThreadView";
import { useMessageText } from "@/i18n/events";
import { useFormat } from "@/i18n/format";
import { findUser, isBlocked, isThreadUnread, useStore } from "@/lib/store";
import type { Message, Thread, User } from "@/lib/types";
import { useIsDesktop } from "@/lib/useIsDesktop";
import { listItemStyles } from "@/components/ui/listSelection";
import { cn, housePhotos } from "@/lib/utils";

interface ThreadRow {
  thread: Thread;
  title: string;
  /** House title for direct chats – searchable too */
  subtitle?: string;
  /** Direct chats: the other person, in a circle */
  avatar?: User;
  /** House chats: the cover, in a rounded square, with the dates under the title */
  cover?: string;
  dates?: string;
  /** A House chat whose House is over */
  past: boolean;
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

/** More chats than this, and the search shows (as a magnifier beside the segment). */
const SEARCH_FROM = 16;
/** Updates listed at once – the newest. */
const UPDATES_LIMIT = 100;

type InboxTab = "chats" | "updates";

/**
 * /messages – one place for everything that reaches you: "Chats · Updates" at the top of the list (where the search was). Chats: the
 * House chats and direct messages as before. Updates: the notifications (there's no bell and no page of their own). A dot on each
 * segment with something unread; the search only with more than 15 chats, behind a magnifier.
 */
function InboxContent() {
  const t = useTranslations("messages.inbox");
  const store = useStore();
  const me = store.currentUserId;
  const isDesktop = useIsDesktop();
  const params = useSearchParams();
  const router = useRouter();
  const selectedId = params.get("id");
  const f = useFormat();
  const unread = useMessagesUnread();
  const [tab, setTab] = useState<InboxTab>(params.get("tab") === "updates" ? "updates" : "chats");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const [pastOpen, setPastOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  // Simpulo's own "updates" chat isn't listed: what it says is under Updates.
  const mine = store.threads.filter((t) => me !== null && t.type !== "updates" && t.participantIds.includes(me));

  const rows: ThreadRow[] = mine.flatMap((thread): ThreadRow[] => {
    const stay = store.stays.find((s) => s.id === thread.houseId);
    if (!stay) return [];
    if (thread.type === "house") {
      return [{ thread, title: stay.title, cover: housePhotos(stay, findUser(store, stay.hostId))[0], dates: f.shortRange(stay.startDate, stay.endDate), past: stay.endDate !== "" && stay.endDate < today }];
    }
    const other = findUser(store, thread.participantIds.find((id) => id !== me) ?? "");
    // Blocked: the chat is gone (crew chats stay – their messages collapse instead).
    if (other && isBlocked(store, other.id)) return [];
    return [{ thread, title: other?.name ?? t("unknown"), subtitle: stay.title, avatar: other, past: false }];
  });

  const canSearch = rows.length >= SEARCH_FROM;
  const q = canSearch ? query.trim().toLowerCase() : "";
  const matches = (row: ThreadRow) => !q || row.title.toLowerCase().includes(q) || (row.subtitle?.toLowerCase().includes(q) ?? false);
  const crews = rows.filter((r) => r.thread.type === "house" && !r.past && matches(r)).toSorted(newestFirst);
  const direct = rows.filter((r) => r.thread.type !== "house" && matches(r)).toSorted(newestFirst);
  const past = rows.filter((r) => r.past && matches(r)).toSorted(newestFirst);
  const ordered = [...crews, ...direct, ...past];

  // ?id= wins (deep links, refresh); otherwise the first row.
  const activeId = rows.some((r) => r.thread.id === selectedId) ? selectedId : (ordered[0]?.thread.id ?? null);

  function choose(next: InboxTab) {
    setTab(next);
    const url = new URLSearchParams(params.toString());
    if (next === "updates") url.set("tab", "updates");
    else url.delete("tab");
    const search = url.toString();
    router.replace(search ? `/messages?${search}` : "/messages", { scroll: false });
  }

  const list = (items: ThreadRow[]) => (
    <ul className="">
      {items.map((row) => (
        <li key={row.thread.id}>
          <ThreadRowLink row={row} active={isDesktop && row.thread.id === activeId} isDesktop={isDesktop} />
        </li>
      ))}
    </ul>
  );
  const group = (label: string, items: ThreadRow[]) =>
    items.length > 0 && (
      <section className="mt-5">
        <h2 className="mb-1 px-3 text-eyebrow uppercase text-ink/55">{label}</h2>
        {list(items)}
      </section>
    );
  // Folded, unless searching or one of its chats is the open one.
  const showPast = pastOpen || q !== "" || past.some((r) => r.thread.id === activeId);

  const chats =
    rows.length === 0 ? (
      <EmptyState
        icon={MessageCircle}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
        action={
          <Button href="/" variant="secondary">
            {t("explore")}
          </Button>
        }
      />
    ) : (
      <>
        {group(t("crews"), crews)}
        {group(t("direct"), direct)}
        {past.length > 0 && (
          <section className="mt-5">
            <button type="button" onClick={() => setPastOpen((open) => !open)} aria-expanded={showPast} className="flex min-h-8 items-center gap-1 px-3 text-small uppercase text-muted hover:text-ink">
              <ChevronRight className={cn("size-4 transition-transform duration-200 motion-reduce:transition-none", showPast && "rotate-90")} aria-hidden />
              {t("past")}
            </button>
            {showPast && list(past)}
          </section>
        )}
        {ordered.length === 0 && <p className="mt-8 text-center text-small text-muted">{t("noMatch", { query: query.trim() })}</p>}
      </>
    );

  return (
    <MasterDetail
      title={t("title")}
      fullHeight
      list={
        <>
          <div className="flex shrink-0 items-center justify-between gap-2">
            <TabBar
              label={t("segmentLabel")}
              value={tab}
              onChange={choose}
              options={[
                { value: "chats", label: t("segmentChats"), dot: unread.chats > 0 },
                { value: "updates", label: t("segmentUpdates"), dot: unread.updates > 0 },
              ]}
            />
            {tab === "chats" && canSearch && (
              <IconButton size="sm" aria-label={t("searchLabel")} aria-expanded={searching} onClick={() => setSearching((open) => !open)}>
                <Search className="size-4" aria-hidden />
              </IconButton>
            )}
          </div>
          {tab === "chats" && canSearch && searching && (
            <label className="mt-3 flex h-11 shrink-0 items-center gap-2 rounded-2xl bg-ink/5 px-4 transition-shadow focus-within:ring-2 focus-within:ring-ink/25">
              <Search className="size-4 shrink-0 text-muted" aria-hidden />
              <input
                type="search"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                aria-label={t("searchLabel")}
                className="min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-muted"
              />
            </label>
          )}
          <div className="split:scroll-pane split:-mr-3 split:min-h-0 split:flex-1 split:pr-3">{tab === "chats" ? chats : <UpdatesList />}</div>
        </>
      }
      // Mounted on desktop only: on mobile it would mark the chat as read without anyone seeing it.
      detail={isDesktop && activeId ? <ThreadPanel threadId={activeId} /> : null}
    />
  );
}

/**
 * Messages › Updates: the notifications as a calm list, newest first – icon, title, one line, the time, the orange dot while unread. A click
 * opens the House (or the chat, or the action) and marks it read; "Mark all as read" small at the top right. No filters.
 */
function UpdatesList() {
  const t = useTranslations("notifications");
  const repo = useNotifications();
  const items = repo.list({ limit: UPDATES_LIMIT }).items;
  const unread = repo.unreadCount();
  if (items.length === 0) return <p className="mt-10 px-3 text-center text-small text-muted">{t("empty")}</p>;
  return (
    <section className="mt-3">
      <div className="flex justify-end px-1">
        <button type="button" onClick={repo.markAllRead} disabled={unread === 0} className="rounded-full px-2 py-1 text-small font-semibold text-ink transition-colors duration-150 hover:bg-ink/6 disabled:text-muted disabled:hover:bg-transparent">
          {t("markAll")}
        </button>
      </div>
      <ul className="-mx-2">
        {items.map((n) => (
          <li key={n.id}>
            <NotificationItem notification={n} onRead={repo.markRead} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ThreadRowLink({ row, active, isDesktop }: { row: ThreadRow; active: boolean; isDesktop: boolean }) {
  const t = useTranslations("messages.inbox");
  const f = useFormat();
  const messageText = useMessageText();
  const store = useStore();
  const { thread, title, subtitle, avatar, cover, dates } = row;

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
  const author = last?.senderId === store.currentUserId ? t("you") : last?.senderId && findUser(store, last.senderId)?.name.split(" ")[0];
  const preview = !last
    ? t("noMessages")
    : // App lines (system, payments, lock cards) already name who did it.
      last.senderId === "system" || last.event || !author
      ? previewText(last)
      : t("preview", { author, text: previewText(last) });
  // Today (UTC calendar day, like the formatters): the time; older: the day.
  const time = last && (last.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10) ? f.time(last.createdAt) : f.day(last.createdAt));

  return (
    <Link
      href={isDesktop ? `/messages?id=${thread.id}` : `/messages/${thread.id}`}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={listItemStyles(active, "block rounded-2xl px-3")}
    >
      <span className="flex items-center gap-3 py-3">
        {cover ? (
          <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-line">
            <Img src={cover} alt="" fill sizes="48px" className="object-cover" />
          </span>
        ) : avatar ? (
          <PersonPhoto src={avatar.photos[0]} alt={avatar.name} size={48} className="size-12 shrink-0 bg-line" />
        ) : (
          <span className="size-12 shrink-0 rounded-full bg-bg" />
        )}
        <span className="block min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2 text-body text-ink">
            <span className={cn("min-w-0 truncate", unread ? "font-semibold" : "font-medium")}>
              {title}
              {/* Direct chats: the House they're about, on the same line. */}
              {subtitle && <span className="font-normal text-muted"> · {subtitle}</span>}
            </span>
            {time && <span className="shrink-0 text-small text-muted">{time}</span>}
          </span>
          {dates && <span className="block truncate text-small text-muted">{dates}</span>}
          <span className={cn("block truncate text-small", unread ? "text-ink" : "text-muted")}>{preview}</span>
        </span>
        {unread && <span className="size-2 shrink-0 rounded-full bg-accent" role="img" aria-label={t("unread")} />}
      </span>
    </Link>
  );
}

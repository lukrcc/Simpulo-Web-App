"use client";

import { listItemStyles } from "@/components/ui/listSelection";
import { useReloadOnReturn } from "@/lib/useReloadOnReturn";
import { ChevronRight, MessageCircle, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { MasterDetail } from "@/components/layout/MasterDetail";
import { Button } from "@/components/ui/ActionButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { Img } from "@/components/ui/Img";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { ThreadPanel } from "@/components/views/ThreadView";
import { useMessageText } from "@/i18n/events";
import { useFormat } from "@/i18n/format";
import { crewInOf, findUser, isBlocked, isThreadUnread, useStore } from "@/lib/store";
import type { Message, Thread, User } from "@/lib/types";
import { useIsDesktop } from "@/lib/useIsDesktop";
import { CapsuleGroup } from "@/components/ui/CapsuleGroup";
import { DIRECT_MESSAGE_POLICY } from "@/config/policies";
import { shortNameOf } from "@/lib/shortName";
import { cn, housePhotos } from "@/lib/utils";

interface ThreadRow {
  thread: Thread;
  title: string;
  /** House chats: "Dec 2–16 · 2 of 4 in"; questions: "About {shortName}" – searchable too */
  subtitle?: string;
  /** Questions: the other person, in a circle */
  avatar?: User;
  /** House chats: the cover in a rounded square; questions: the House's small badge on the face */
  cover?: string;
  /** Houses: the House is over. Questions: no new message for DIRECT_MESSAGE_POLICY.archiveAfterDays, or the House is over. */
  past: boolean;
}

type Filter = "all" | "unread";

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

/** More chats than this, and the search shows (as a magnifier beside the tabs). */
const SEARCH_FROM = 16;
const DAY_MS = 86_400_000;
/**
 * /messages – ONE list of every chat (the crews' House chats and the questions – direct chats, each about one House, DIRECT_MESSAGE_POLICY),
 * newest message first; "Past" folded at the end. On top a capsule group "All · Unread {n}" (the count an orange circle, only there). The
 * search only with more than 15 chats, behind a magnifier.
 */
function InboxContent() {
  // The installed app coming back to the front: read again (no pull-to-refresh there).
  useReloadOnReturn();
  const t = useTranslations("messages.inbox");
  const store = useStore();
  const me = store.currentUserId;
  const isDesktop = useIsDesktop();
  const params = useSearchParams();
  const selectedId = params.get("id");
  const f = useFormat();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [pastOpen, setPastOpen] = useState(false);
  const [now] = useState(() => Date.now());
  const today = new Date(now).toISOString().slice(0, 10);

  // Simpulo's own "updates" chat isn't listed: what it says is under Your houses › Activity.
  const mine = store.threads.filter((t) => me !== null && t.type !== "updates" && t.participantIds.includes(me));

  const rows: ThreadRow[] = mine.flatMap((thread): ThreadRow[] => {
    const stay = store.stays.find((s) => s.id === thread.houseId);
    if (!stay) return [];
    const over = stay.endDate !== "" && stay.endDate < today;
    const cover = housePhotos(stay, findUser(store, stay.hostId))[0];
    if (thread.type === "house") {
      return [{ thread, title: stay.title, cover, subtitle: t("houseLine", { dates: f.shortRange(stay.startDate, stay.endDate), filled: crewInOf(store, stay), total: stay.spotsTotal }), past: over }];
    }
    const other = findUser(store, thread.participantIds.find((id) => id !== me) ?? "");
    // Blocked: the chat is gone (crew chats stay – their messages collapse instead).
    if (other && isBlocked(store, other.id)) return [];
    const last = thread.messages.at(-1)?.createdAt;
    const quiet = last !== undefined && now - Date.parse(last) > DIRECT_MESSAGE_POLICY.archiveAfterDays * DAY_MS;
    return [{ thread, title: other?.name.split(" ")[0] ?? t("unknown"), subtitle: t("about", { name: shortNameOf(stay) }), avatar: other, cover, past: over || quiet }];
  });

  const isUnread = (r: ThreadRow) => !r.past && isThreadUnread(store, r.thread);
  const unreadCount = rows.filter(isUnread).length;
  const [filter, setFilter] = useState<Filter>("all");

  const canSearch = rows.length >= SEARCH_FROM;
  const q = canSearch ? query.trim().toLowerCase() : "";
  const matches = (row: ThreadRow) => !q || row.title.toLowerCase().includes(q) || (row.subtitle?.toLowerCase().includes(q) ?? false);
  const inTab = rows.filter(matches).filter((r) => filter === "all" || isUnread(r));
  const current = inTab.filter((r) => !r.past).toSorted(newestFirst);
  const past = inTab.filter((r) => r.past).toSorted(newestFirst);
  const ordered = [...current, ...past];

  // ?id= wins (deep links, refresh); otherwise the tab's first row.
  const activeId = rows.some((r) => r.thread.id === selectedId) ? selectedId : (ordered[0]?.thread.id ?? null);

  const list = (items: ThreadRow[]) => (
    <ul className="flex flex-col gap-1">
      {items.map((row) => (
        <li key={row.thread.id}>
          <ThreadRowLink row={row} active={isDesktop && row.thread.id === activeId} isDesktop={isDesktop} />
        </li>
      ))}
    </ul>
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
        {current.length > 0 && <div className="mt-4">{list(current)}</div>}
        {current.length === 0 && past.length === 0 && q === "" && <p className="mt-6 text-small text-muted">{t(filter === "unread" ? "unreadEmpty" : "housesEmpty")}</p>}
        {past.length > 0 && (
          <section className="mt-5">
            <button type="button" onClick={() => setPastOpen((open) => !open)} aria-expanded={showPast} className="flex min-h-8 items-center gap-1 text-small uppercase text-muted hover:text-ink">
              <ChevronRight className={cn("size-4 transition-transform duration-200 motion-reduce:transition-none", showPast && "rotate-90")} aria-hidden />
              {t("past")}
            </button>
            {showPast && <div className="mt-1">{list(past)}</div>}
          </section>
        )}
        {ordered.length === 0 && q !== "" && <p className="mt-8 text-center text-small text-muted">{t("noMatch", { query: query.trim() })}</p>}
      </>
    );

  return (
    <MasterDetail
      title={t("title")}
      fullHeight
      list={
        <>
          <div className="flex shrink-0 items-center justify-between gap-2">
            <CapsuleGroup
              label={t("filterLabel")}
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", content: t("filterAll") },
                {
                  value: "unread",
                  content: (
                    <span className="inline-flex items-center gap-1.5">
                      {t("filterUnread")}
                      {unreadCount > 0 && <span className="inline-flex size-4.5 items-center justify-center rounded-full bg-accent text-eyebrow leading-none tracking-normal text-on-signal tabular-nums">{unreadCount}</span>}
                    </span>
                  ),
                },
              ]}
            />
            {canSearch && (
              <IconButton size="sm" aria-label={t("searchLabel")} aria-expanded={searching} onClick={() => setSearching((open) => !open)}>
                <Search className="size-4" aria-hidden />
              </IconButton>
            )}
          </div>
          {canSearch && searching && (
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
          {/* No footer and no legal line on Messages – the one dark page, nothing light under it. */}
          <div className="split:scroll-pane split:-mr-3 split:min-h-0 split:flex-1 split:pr-3 split:pt-1">{chats}</div>
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
  const { thread, title, subtitle, avatar, cover } = row;

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
      // Chosen: the outline capsule in ink (ui/listSelection) – Messages is light like every page.
      className={listItemStyles(active, "block px-4")}
    >
      <span className="flex items-center gap-3 py-3">
        {avatar ? (
          // Questions: the person in a circle 56px, the House as a rounded-square badge 22px at the bottom right (a 2px edge in the chat's ground).
          <span className="relative size-14 shrink-0">
            <PersonPhoto src={avatar.photos[0]} alt={avatar.name} size={56} className="size-14 bg-line" />
            {cover && (
              <span className="absolute -bottom-0.5 -right-0.5 block size-5.5 overflow-hidden rounded-md ring-2 ring-(--chat-bg)">
                <Img src={cover} alt="" fill sizes="22px" className="object-cover" />
              </span>
            )}
          </span>
        ) : cover ? (
          // House chats: the House's photo in a rounded square 56px.
          <span className="relative size-14 shrink-0 overflow-hidden rounded-2xl bg-line">
            <Img src={cover} alt="" fill sizes="56px" className="object-cover" />
          </span>
        ) : (
          <span className="size-14 shrink-0 rounded-2xl bg-surface" />
        )}
        <span className="block min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2 text-body text-ink">
            <span className={cn("min-w-0 truncate", unread ? "font-semibold" : "font-medium")}>{title}</span>
            {time && <span className="shrink-0 text-small text-ink/40">{time}</span>}
          </span>
          {subtitle && <span className="block truncate text-small text-muted">{subtitle}</span>}
          {/* Unread: the preview in ink semibold, and the orange dot. */}
          <span className={cn("block truncate text-small", unread ? "font-semibold text-ink" : "text-muted")}>{preview}</span>
        </span>
        {unread && <span className="size-2 shrink-0 rounded-full bg-accent" role="img" aria-label={t("unread")} />}
      </span>
    </Link>
  );
}

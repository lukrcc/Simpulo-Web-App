"use client";

import { useReloadOnReturn } from "@/lib/useReloadOnReturn";
import { ChevronRight, LifeBuoy, MessageCircle, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { MasterDetail } from "@/components/layout/MasterDetail";
import { Button } from "@/components/ui/ActionButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Sheet } from "@/components/ui/Sheet";
import { ScrollRow } from "@/components/ui/ScrollRow";
import { HeaderViews } from "@/components/layout/header/HeaderViews";
import { usePageView } from "@/lib/pageViews";
import { Img } from "@/components/ui/Img";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { ThreadPanel } from "@/components/views/ThreadView";
import { ChatTools } from "@/components/chat/ChatInfoBar";
import { profileHref } from "@/lib/privacy";
import { useMessageText } from "@/i18n/events";
import { useFormat } from "@/i18n/format";
import { crewInOf, findUser, isBlocked, isThreadUnread, lastMessageAtOf, useStore } from "@/lib/store";
import type { Message, Thread, User } from "@/lib/types";
import { useSupportThread } from "@/lib/support/conversation";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { MEDIA } from "@/config/breakpoints";
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
  /** Simpulo Support: its mark in a circle instead of a photo */
  support?: boolean;
}

export function InboxList() {
  const t = useTranslations("messages.inbox");
  return (
    <RequireLogin title={t("loginTitle")} description={t("loginDescription")}>
      <InboxContent />
    </RequireLogin>
  );
}

/** By the chat's lastMessageAt (lib/store.tsx), the newest first. */
const newestFirst = (a: ThreadRow, b: ThreadRow) => (lastMessageAtOf(b.thread) ?? "").localeCompare(lastMessageAtOf(a.thread) ?? "");

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
  // List and chat side by side from 744px (Tablet and Desktop); phones: the list, a chat opens as its own page.
  const isDesktop = useMediaQuery(MEDIA.tabletUp);
  // The bar's views (CLAUDE.md "Kopfleiste als Seitenwerkzeug"): All · Unread · Houses · People – kept for the session.
  const [view, setView] = usePageView("messages", ["all", "unread", "houses", "people"] as const, "all");
  const [searchOpen, setSearchOpen] = useState(false);
  const params = useSearchParams();
  const selectedId = params.get("id");
  const f = useFormat();
  const [query, setQuery] = useState("");
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

  // Simpulo Support: the person's requests and ideas with the answers – one row, there once something was sent (lib/support/conversation.ts).
  const { thread: supportThread } = useSupportThread();
  const tSupport = useTranslations("help.conversation");
  if (supportThread) rows.push({ thread: supportThread, title: tSupport("title"), support: true, past: false });


  // The search lives in the window ("Search" in the bar; phones: the magnifier with many chats).
  const q = query.trim().toLowerCase();
  const matches = (row: ThreadRow) => !q || row.title.toLowerCase().includes(q) || (row.subtitle?.toLowerCase().includes(q) ?? false);
  const inTab = rows.filter(matches);
  const current = inTab.filter((r) => !r.past).toSorted(newestFirst);
  const past = inTab.filter((r) => r.past).toSorted(newestFirst);
  const ordered = [...current, ...past];

  // ?id= wins (deep links, refresh); otherwise the tab's first row.
  const activeId = rows.some((r) => r.thread.id === selectedId) ? selectedId : (ordered[0]?.thread.id ?? null);

  const list = (items: ThreadRow[]) => (
    <ul className="flex flex-col">
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
        {current.length > 0 && <div className="mt-4 md:mt-0">{list(current)}</div>}
        {current.length === 0 && past.length === 0 && q === "" && <p className="mt-6 text-small text-muted">{t("housesEmpty")}</p>}
        {past.length > 0 && (
          <section className="mt-5">
            <button type="button" onClick={() => setPastOpen((open) => !open)} aria-expanded={showPast} className="flex min-h-8 items-center gap-1 text-small text-muted hover:text-ink">
              <ChevronRight className={cn("size-4 transition-transform duration-200 motion-reduce:transition-none", showPast && "rotate-90")} aria-hidden />
              {t("past")}
            </button>
            {showPast && <div className="mt-1">{list(past)}</div>}
          </section>
        )}
        {ordered.length === 0 && q !== "" && <p className="mt-8 text-center text-small text-muted">{t("noMatch", { query: query.trim() })}</p>}
      </>
    );

  // From 744px (CLAUDE.md "Messages: Chat-Leiste oben, Chat immer offen"): no list on the left – the bar's views All · Unread · Houses · People,
  // a sideways chat strip on top (filtered by the view, the newest activity first, its last entry the magnifier that opens the full list in a
  // window), under it ONE middle axis: the chat's head, the messages and the composer, at most 760px. A chat is always open – the newest one
  // unless one is chosen (?id=).
  const strip = rows
    .filter((r) => !r.past && (view === "all" || (view === "unread" ? isThreadUnread(store, r.thread) : view === "houses" ? r.thread.type === "house" : r.thread.type !== "house")))
    .toSorted(newestFirst);
  const newest = rows.filter((r) => !r.past).toSorted(newestFirst)[0] ?? ordered[0];
  const deskActive = rows.some((r) => r.thread.id === selectedId) ? selectedId : (newest?.thread.id ?? null);

  return (
    <>
      {/* Phones: the list as before (a chat opens as its own page). */}
      <div className="md:hidden">
        <MasterDetail title={t("title")} fullHeight list={<div className="[--bleed-l:var(--page-margin)] [--bleed-r:var(--page-margin)]">{chats}</div>} detail={null} />
      </div>
      <div data-messenger data-app-pane="desktop" className="hidden h-[calc(100dvh-var(--header-h)-var(--band-h)-var(--tabbar-safe))] min-h-0 flex-col md:flex">
        <HeaderViews
          label={t("viewsLabel")}
          value={view}
          onChange={setView}
          views={[
            { value: "all", label: t("viewAll") },
            { value: "unread", label: t("viewUnread") },
            { value: "houses", label: t("viewHouses") },
            { value: "people", label: t("viewPeople") },
          ]}
        />
        {rows.length === 0 ? (
          <div className="mx-auto mt-16 max-w-[760px] px-6">{chats}</div>
        ) : (
          <>
            <ChatStrip rows={strip} activeId={deskActive} label={t("title")} onSearch={() => setSearchOpen(true)} searchLabel={t("viewSearch")} />
            {/* Mounted from 744px only: on phones it would mark the chat as read without anyone seeing it. */}
            <div className="min-h-0 flex-1">{isDesktop && deskActive && <ThreadPanel threadId={deskActive} />}</div>
          </>
        )}
      </div>
      <Sheet open={searchOpen} onClose={() => setSearchOpen(false)} title={t("searchTitle")}>
        <label className="flex h-11 items-center gap-2 rounded-full bg-(--fill) px-4 transition-shadow focus-within:shadow-[0_0_0_1.5px_var(--text)]">
          <Search className="size-4 shrink-0 text-muted" aria-hidden />
          <input type="search" autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchPlaceholder")} aria-label={t("searchLabel")} className="min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-muted" />
        </label>
        {/* A choice closes the window (the row is a link; the click bubbles here). */}
        <div className="mt-3 [--bleed-l:8px] [--bleed-r:8px]" onClick={(e) => (e.target as Element).closest("a") && setSearchOpen(false)}>
          {chats}
        </div>
      </Sheet>
    </>
  );
}

/**
 * The chat strip on top (from 744px, CLAUDE.md "Messages breiter und ruhiger"): one slim row from the page's left edge – sideways, no
 * scrollbar, a soft fade and arrow circles (ScrollRow); each entry the picture 40px (people round, Houses radius 12), the name 12px in one
 * line, a dot in the accent colour when unread; the chosen one a white surface behind the picture and its name in the primary colour – a
 * click on it opens the House's overview or the person's profile. Its last entry the magnifier (the full list in a window). At its right
 * end, on the same line, the open chat's colour dots and "···" (ChatTools).
 */
function ChatStrip({ rows, activeId, label, onSearch, searchLabel }: { rows: ThreadRow[]; activeId: string | null; label: string; onSearch: () => void; searchLabel: string }) {
  return (
    <div data-chat-strip className="flex shrink-0 items-center gap-4 py-3 pl-(--page-margin) pr-(--page-margin)">
      <ScrollRow label={label} active={activeId} className="min-w-0 flex-1 gap-1">
        {rows.map((row) => (
          <StripLink key={row.thread.id} row={row} active={row.thread.id === activeId} />
        ))}
        {/* The last entry: a circle with the magnifier – the full list in a window (search on top, Past below). */}
        <button type="button" onClick={onSearch} className="group flex w-16 shrink-0 flex-col items-center gap-1 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)">
          <span className="flex size-12 items-center justify-center rounded-full">
            <span className="flex size-10 items-center justify-center rounded-full bg-(--chat-row-on) text-ink transition-opacity group-hover:opacity-80">
              <Search aria-hidden className="size-[18px]" />
            </span>
          </span>
          <span className="w-full truncate px-1 text-center text-caption text-muted group-hover:text-ink">{searchLabel}</span>
        </button>
      </ScrollRow>
      {activeId && <ChatTools threadId={activeId} />}
    </div>
  );
}

function StripLink({ row, active }: { row: ThreadRow; active: boolean }) {
  const t = useTranslations("messages.inbox");
  const { unread } = useRowInfo(row.thread);
  // The chosen entry again: the House's overview (a House chat) or the person's profile (a question); Simpulo Support stays.
  const href = active && !row.support ? (row.thread.type === "house" ? `/houses/${row.thread.houseId}` : row.avatar ? profileHref(row.avatar.id) : `/messages?id=${row.thread.id}`) : `/messages?id=${row.thread.id}`;
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      data-active={active || undefined}
      className="group flex w-16 shrink-0 flex-col items-center gap-1 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)"
    >
      <span className={cn("rail-item relative flex size-12 items-center justify-center rounded-full", active && "is-active")}>
        <RowPicture row={row} size={40} />
        {unread && <span role="img" aria-label={t("unread")} className="absolute right-0.5 top-0.5 size-2.5 rounded-full bg-(--brand-action) ring-2 ring-(--surface-page)" />}
      </span>
      <span className={cn("w-full truncate px-1 text-center text-caption", active ? "font-medium text-ink" : "text-muted group-hover:text-ink")}>{row.title}</span>
    </Link>
  );
}

/** A row's last message as a preview line, its time (today) or day, and whether it's unread – shared by the full list and the narrow rail. */
function useRowInfo(thread: Thread) {
  const t = useTranslations("messages.inbox");
  const f = useFormat();
  const messageText = useMessageText();
  const store = useStore();

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
  return { preview, time, unread };
}

/** The row's picture: Simpulo Support's mark, a person in a circle (with the House's badge), or the House in a rounded square – 48px. */
function RowPicture({ row, size = 48 }: { row: ThreadRow; /** 48px in the lists, 40px in the chat strip */ size?: 40 | 48 }) {
  const { avatar, cover } = row;
  const box = size === 40 ? "size-10" : "size-12";
  if (row.support)
    return (
      <span className={cn("flex shrink-0 items-center justify-center rounded-full bg-ink text-inverse", box)}>
        <LifeBuoy aria-hidden className="size-5" />
      </span>
    );
  if (avatar)
    return (
      // Questions: the person in a circle 48px, the House as a rounded-square badge 20px at the bottom right (a 2px edge in the list's ground).
      <span className={cn("relative shrink-0", box)}>
        <PersonPhoto src={avatar.photos[0]} alt={avatar.name} size={size} className={cn("bg-line", box)} />
        {cover && (
          <span className="absolute -bottom-0.5 -right-0.5 block size-5 overflow-hidden rounded-md ring-2 ring-(--chat-bg)">
            <Img src={cover} alt="" fill sizes="20px" className="object-cover" />
          </span>
        )}
      </span>
    );
  if (cover)
    return (
      // House chats: the House's photo in a rounded square 48px (radius 12).
      <span className={cn("relative shrink-0 overflow-hidden rounded-xl bg-line", box)}>
        <Img src={cover} alt="" fill sizes={`${size}px`} className="object-cover" />
      </span>
    );
  return <span className={cn("shrink-0 rounded-xl bg-surface", box)} />;
}

function ThreadRowLink({ row, active, isDesktop }: { row: ThreadRow; active: boolean; isDesktop: boolean }) {
  const t = useTranslations("messages.inbox");
  const { thread, title } = row;
  const { preview, time, unread } = useRowInfo(thread);

  return (
    <Link
      href={isDesktop ? `/messages?id=${thread.id}` : `/messages/${thread.id}`}
      scroll={false}
      aria-current={active ? "page" : undefined}
      // Rows inset with radius 16; the chosen one the chat card's surface (light white, dark raised), hover half of it (globals.css
      // [data-messenger] .chat-row; CLAUDE.md "Messages: ruhige Liste").
      className="chat-row -ml-(--bleed-l) -mr-(--bleed-r) block pl-(--bleed-l) pr-(--bleed-r)"
    >
      <span className="flex items-center gap-3 py-2.5">
        {/* Unread: a dot in the accent colour left of the picture – its slot stays, so every row lines up. */}
        <span className="flex w-2 shrink-0 justify-center">{unread && <span className="size-2 rounded-full bg-(--brand-action)" role="img" aria-label={t("unread")} />}</span>
        <RowPicture row={row} />
        {/* Two lines: title left and the day grey right; the preview one line grey (unread: only the title bold). */}
        <span className="block min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2 text-body text-ink">
            <span className={cn("min-w-0 truncate", unread ? "font-semibold" : "font-medium")}>{title}</span>
            {time && <span className="shrink-0 text-small text-muted">{time}</span>}
          </span>
          <span className="block truncate text-small text-muted">{preview}</span>
        </span>
      </span>
    </Link>
  );
}

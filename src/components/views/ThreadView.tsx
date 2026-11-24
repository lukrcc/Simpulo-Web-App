"use client";

import { SearchX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type ReactNode, use, useEffect, useLayoutEffect, useRef, useState } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { DoItAgainCard } from "@/components/chat/ChatCards";
import { Composer, type ReplyDraft } from "@/components/chat/Composer";
import { MessageList, NewestFirstContext } from "@/components/chat/MessageList";
import { CrewHeader, DirectHeader } from "@/components/chat/ThreadHeader";
import { useOfferInstall } from "@/components/installPromptContext";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/ActionButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { crewThreadId, findUser, isBlocked, isCrewMember, useStore } from "@/lib/store";
import Link from "next/link";
import type { Stay, Thread } from "@/lib/types";
import { CrewVotes } from "@/components/stay/CrewVotes";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { MEDIA } from "@/config/breakpoints";
import { addTicketFollowUp } from "@/lib/admin/store";
import { SUPPORT_THREAD_ID, useSupportThread } from "@/lib/support/conversation";
import { LifeBuoy } from "lucide-react";
import { useVisualViewport } from "@/lib/useVisualViewport";
import { MESSENGER } from "@/config/messenger";

/** /messages/[threadId] – the mobile detail page. On desktop the same chat opens inside /messages. */
export function ThreadView({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = use(params);
  // From 744px the chat lives in /messages beside the list.
  const isDesktop = useMediaQuery(MEDIA.tabletUp);
  const router = useRouter();
  const t = useTranslations("messages.thread");

  useEffect(() => {
    if (isDesktop) router.replace(`/messages?id=${threadId}`);
  }, [isDesktop, threadId, router]);

  return (
    <RequireLogin title={t("loginTitle")}>
      {isDesktop ? <PageSkeleton /> : <ThreadGate threadId={threadId} embedded={false} />}
    </RequireLogin>
  );
}

/**
 * The right column of /messages on desktop. `inline`: inside another page (the past House view), which has its own
 * "Do it again" – so the chat doesn't end with one.
 */
export function ThreadPanel({ threadId, inline = false }: { threadId: string; inline?: boolean }) {
  return <ThreadGate threadId={threadId} embedded inline={inline} />;
}

function ThreadGate({ threadId, embedded, inline = false }: { threadId: string; embedded: boolean; inline?: boolean }) {
  if (threadId === SUPPORT_THREAD_ID) return <SupportContent embedded={embedded} />;
  return <ChatGate threadId={threadId} embedded={embedded} inline={inline} />;
}

/**
 * "Simpulo Support": the person's requests and ideas (each after a small line saying what it was about) and Simpulo's answers, built from
 * their tickets (lib/support/conversation.ts). Writing here follows up on the latest one. No House, no crew.
 */
function SupportContent({ embedded }: { embedded: boolean }) {
  const t = useTranslations("help.conversation");
  const { markThreadRead } = useStore();
  const { thread, latestTicketId } = useSupportThread();
  const [replyTo, setReplyTo] = useState<ReplyDraft | null>(null);
  const last = thread?.messages.at(-1)?.createdAt;
  useEffect(() => {
    if (last) markThreadRead(SUPPORT_THREAD_ID, last);
  }, [last, markThreadRead]);
  if (!thread) return <ThreadNotFound embedded={embedded} />;
  return (
    <ThreadFrame
      embedded={embedded}
      head={
        embedded ? undefined : <div className="flex h-16 items-center gap-3 px-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-inverse">
            <LifeBuoy aria-hidden className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-body font-semibold text-ink">{t("title")}</span>
            <span className="block truncate text-small text-muted">{t("subtitle")}</span>
          </span>
        </div>
      }
      composer={
        <Composer
          threadId={SUPPORT_THREAD_ID}
          placeholder={t("composer")}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          onSend={(text) => latestTicketId && addTicketFollowUp(latestTicketId, text)}
        />
      }
    >
      <MessageList thread={thread} emptyText="" onReply={() => {}} />
    </ThreadFrame>
  );
}

function ChatGate({ threadId, embedded, inline = false }: { threadId: string; embedded: boolean; inline?: boolean }) {
  const t = useTranslations("messages.thread");
  const store = useStore();
  const thread = store.threads.find((t) => t.id === threadId);
  const stay = thread && store.stays.find((s) => s.id === thread.houseId);
  // A direct chat with someone you blocked is gone – same "not found" as a missing one.
  const blockedDirect =
    thread?.type === "direct" && thread.participantIds.some((id) => id !== store.currentUserId && isBlocked(store, id));

  if (blockedDirect) return <ThreadNotFound embedded={embedded} />;
  if (thread?.type === "updates" && store.currentUserId && thread.participantIds.includes(store.currentUserId)) return <UpdatesContent key={thread.id} thread={thread} embedded={embedded} />;

  // Crew threads open up only after acceptance (participants), direct threads only to the two people in them.
  if (!thread || !stay || !store.currentUserId || !thread.participantIds.includes(store.currentUserId)) {
    const empty = (
      <EmptyState
        icon={SearchX}
        title={thread ? t("crewOnly") : t("notFound")}
        description={thread ? t("crewOnlyDescription") : undefined}
        action={
          <Button href={stay ? `/house/${stay.slug}` : "/messages"}>
            {stay ? t("viewHouse") : t("backToMessages")}
          </Button>
        }
      />
    );
    return <NotFoundFrame embedded={embedded}>{empty}</NotFoundFrame>;
  }

  return <ThreadContent key={thread.id} thread={thread} stay={stay} embedded={embedded} inline={inline} />;
}

function NotFoundFrame({ embedded, children }: { embedded: boolean; children: ReactNode }) {
  return embedded ? (
    children
  ) : (
    <Container page width="narrow">
      {children}
    </Container>
  );
}

function ThreadNotFound({ embedded }: { embedded: boolean }) {
  const t = useTranslations("messages.thread");
  return (
    <NotFoundFrame embedded={embedded}>
      <EmptyState
        icon={SearchX}
        title={t("notFound")}
        action={
          <Button href="/messages">
            {t("backToMessages")}
          </Button>
        }
      />
    </NotFoundFrame>
  );
}

/** Simpulo's lines about someone's saved searches: nothing to answer, no House. */
function UpdatesContent({ thread, embedded }: { thread: Thread; embedded: boolean }) {
  const t = useTranslations("messages");
  const { markThreadRead } = useStore();
  const messageCount = thread.messages.length;
  useEffect(() => {
    markThreadRead(thread.id);
  }, [messageCount, thread.id, markThreadRead]);
  return (
    <ThreadFrame embedded={embedded} head={embedded ? undefined : <p className="flex h-16 items-center px-5 text-h3 text-ink">{t("inbox.updates")}</p>}>
      <MessageList thread={thread} emptyText={t("thread.notFound")} onReply={() => {}} />
    </ThreadFrame>
  );
}

/**
 * The chat: messages over the whole height, the glass head and the floating glass composer over them. Both can grow (a pinned vote, a reply
 * being written), so their heights are measured and the messages keep clear of them (--chat-top, --chat-bottom).
 */
function ThreadFrame({ embedded, head, tabs, composer, children }: { embedded: boolean; head?: ReactNode; /** Later: Chat · Crew · Plan · Moments · Me – a row under the head, inside the glass (not built yet) */ tabs?: ReactNode; composer?: ReactNode; children: ReactNode }) {
  // ONE calm background (CLAUDE.md "Messenger ruhig"): the "cream" tokens – light, and their dark variant in dark mode; no backgrounds to pick.
  const theme = "cream";
  // From 744px (list and chat side by side) the variant of config/messenger.ts: 'top' – the input line at the top, the newest message right
  // under it; 'bottom' – the input line at the bottom, the newest last. The chat page on phones keeps it at the bottom.
  const top = embedded && MESSENGER.composerPosition === "top";
  // The mobile chat page follows the visual viewport (the keyboard); embedded (desktop column) it doesn't need to.
  useVisualViewport(!embedded);
  const stageRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      stage.style.setProperty("--chat-top", top ? "0px" : `${headRef.current?.offsetHeight ?? 0}px`);
      stage.style.setProperty("--chat-bottom", top ? "0px" : `${composerRef.current?.offsetHeight ?? 0}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (headRef.current) observer.observe(headRef.current);
    if (composerRef.current) observer.observe(composerRef.current);
    return () => observer.disconnect();
  }, [top]);
  const stage = top ? (
    // 'top': the input line first (a fine line under it), then what's pinned (an open vote), then the messages – the newest first.
    <div ref={stageRef} className="relative flex h-full min-h-0 flex-col overflow-hidden">
      {composer && (
        <div ref={composerRef} className="shrink-0 border-b border-ink/8 bg-(--chat-bg) px-4">
          <div className="mx-auto max-w-[920px]">{composer}</div>
        </div>
      )}
      {(head || tabs) && (
        <div ref={headRef} className="shrink-0">
          {head}
          {tabs && <div data-chat-tabs>{tabs}</div>}
        </div>
      )}
      <NewestFirstContext.Provider value>{children}</NewestFirstContext.Provider>
    </div>
  ) : (
    <div ref={stageRef} className="relative flex h-full min-h-0 flex-col overflow-hidden">
      {/* The head (phones: back, the House or person, "…"; from 744px only what's pinned) – solid, the messages scroll under it. */}
      {(head || tabs) && (
        <div ref={headRef} className="chat-glass absolute inset-x-0 top-0 z-20 flex flex-col">
          {head}
          {tabs && <div data-chat-tabs>{tabs}</div>}
        </div>
      )}
      {children}
      {composer && (
        // The input line at the bottom: the chat's ground, a fine line above it, 20px under it; centred in at most 920px like the messages.
        <div ref={composerRef} className="absolute inset-x-0 bottom-0 z-20 border-t border-ink/8 bg-(--chat-bg) px-4 pb-[max(12px,var(--safe-bottom))] pt-1">
          <div className="mx-auto max-w-[920px]">{composer}</div>
        </div>
      )}
    </div>
  );
  // From 744px: the right column on the page's ground, the same as the list's (one background, a fine vertical line between them).
  if (embedded)
    return (
      <div data-chat-theme={theme} className="chat-dark h-full min-h-0 bg-(--chat-bg)">
        {stage}
      </div>
    );

  // Mobile page (< 744px): its own screen over the whole window – no tab bar, no header; fixed to the visual viewport (--vv-top/--vv-h,
  // useVisualViewport), so with the keyboard open the field sits right on it; under the status bar's strip (--safe-top). md+: below the top
  // header. data-app-pane="always" drops the footer and main's bottom padding – the page itself never scrolls.
  return (
    <div
      data-app-pane="always"
      data-chat-theme={theme}
      className="chat-dark relative z-41 overflow-hidden bg-(--chat-bg) max-md:fixed max-md:inset-x-0 max-md:top-(--vv-top,0px) max-md:h-(--vv-h,100dvh) md:h-[calc(100dvh-var(--header-total)-var(--tabbar-safe))]"
    >
      <div className="mx-auto h-full min-h-0 w-full max-w-3xl pt-(--safe-top) md:pt-0">{stage}</div>
    </div>
  );
}

function ThreadContent({ thread, stay, embedded, inline }: { thread: Thread; stay: Stay; embedded: boolean; inline: boolean }) {
  const t = useTranslations("messages.thread");
  const store = useStore();
  const { markThreadRead } = store;
  const messageCount = thread.messages.length;
  const [replyTo, setReplyTo] = useState<ReplyDraft | null>(null);

  // Open = read; new messages while it's open too. (MessageList captured the old mark for its divider first.)
  useEffect(() => {
    markThreadRead(thread.id);
  }, [messageCount, thread.id, markThreadRead]);

  // Opening the House's group chat is one of the three moments to offer the app (the rules decide: weekly at most, can be off).
  const offerInstall = useOfferInstall();
  const houseChat = thread.type === "house" && !inline;
  useEffect(() => {
    if (houseChat) offerInstall("chat");
  }, [houseChat, thread.id, offerInstall]);

  const isHost = stay.hostId === store.currentUserId;
  const other =
    thread.type === "direct"
      ? findUser(store, thread.participantIds.find((id) => id !== store.currentUserId) ?? "")
      : undefined;
  const otherName = other?.name.split(" ")[0];
  // Over (or completed): the crew chat ends with "Do it again?". Read on the client only – this view never prerenders.
  const ended = !inline && thread.type === "house" && stay.status !== "closed" && (stay.status === "completed" || (stay.endDate !== "" && stay.endDate < new Date().toISOString().slice(0, 10)));
  // A direct chat whose guest is in the House now: it points to the House chat and stays readable (DIRECT_MESSAGE_POLICY).
  const guestId = thread.type === "direct" ? thread.participantIds.find((id) => id !== stay.hostId) : undefined;
  const guestIn = guestId !== undefined && isCrewMember(store, stay, guestId);
  const guestName = guestId ? findUser(store, guestId)?.name.split(" ")[0] : undefined;

  return (
    <ThreadFrame
      embedded={embedded}
      // From 744px the House or person, the crew, settings and "…" are the info bar under list and chat (ChatInfoBar); phones keep the head.
      head={
        <>
          {!embedded && (thread.type === "house" ? <CrewHeader stay={stay} embedded={embedded} threadId={thread.id} /> : <DirectHeader stay={stay} other={other} embedded={embedded} threadId={thread.id} />)}
          {thread.type === "house" && <CrewVotes stay={stay} pinned />}
        </>
      }
      composer={<Composer threadId={thread.id} placeholder={thread.type === "house" ? t("composerCrew") : t("composerDirect", { name: otherName ?? "" })} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />}
    >
      <MessageList
        thread={thread}
        emptyText={thread.type === "house" ? t("sayHiCrew") : otherName ? t("sayHiDirect", { name: otherName }) : t("sayHiDirectUnknown")}
        onReply={setReplyTo}
        footer={
          ended ? (
            <DoItAgainCard stay={stay} isHost={isHost} />
          ) : guestIn ? (
            <div className="mx-auto mt-6 flex max-w-[480px] flex-col items-center gap-3 rounded-[20px] bg-(--bubble-other) px-5 py-4 text-center">
              <p className="text-body text-ink">{isHost ? t("theyreIn", { name: guestName ?? "" }) : t("youreIn")}</p>
              <Link href={`/messages?id=${crewThreadId(stay.id)}`} className="press inline-flex h-9 items-center rounded-full bg-ink px-4 text-nav-main font-semibold text-inverse transition-opacity hover:opacity-90">
                {t("openHouseChat")}
              </Link>
            </div>
          ) : undefined
        }
      />
    </ThreadFrame>
  );
}

"use client";

import { SearchX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type ReactNode, use, useEffect, useLayoutEffect, useRef, useState } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { DoItAgainCard } from "@/components/chat/ChatCards";
import { Composer, type ReplyDraft } from "@/components/chat/Composer";
import { MessageList } from "@/components/chat/MessageList";
import { CrewHeader, DirectHeader } from "@/components/chat/ThreadHeader";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/ActionButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { crewThreadId, findUser, isBlocked, isCrewMember, useStore } from "@/lib/store";
import Link from "next/link";
import type { Stay, Thread } from "@/lib/types";
import { CrewVotes } from "@/components/stay/CrewVotes";
import { useIsDesktop } from "@/lib/useIsDesktop";

/** /messages/[threadId] – the mobile detail page. On desktop the same chat opens inside /messages. */
export function ThreadView({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = use(params);
  const isDesktop = useIsDesktop();
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
    <ThreadFrame embedded={embedded} head={<p className="flex h-16 items-center px-5 text-h3 text-ink">{t("inbox.updates")}</p>}>
      <MessageList thread={thread} emptyText={t("thread.notFound")} onReply={() => {}} />
    </ThreadFrame>
  );
}

/**
 * The chat: messages over the whole height, the glass head and the floating glass composer over them. Both can grow (a pinned vote, a reply
 * being written), so their heights are measured and the messages keep clear of them (--chat-top, --chat-bottom).
 */
function ThreadFrame({ embedded, head, composer, children }: { embedded: boolean; head: ReactNode; composer?: ReactNode; children: ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      stage.style.setProperty("--chat-top", `${headRef.current?.offsetHeight ?? 0}px`);
      stage.style.setProperty("--chat-bottom", `${composerRef.current?.offsetHeight ?? 0}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (headRef.current) observer.observe(headRef.current);
    if (composerRef.current) observer.observe(composerRef.current);
    return () => observer.disconnect();
  }, []);
  const stage = (
    <div ref={stageRef} className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <div ref={headRef} className="chat-glass absolute inset-x-0 top-0 z-20">
        {head}
      </div>
      {children}
      {composer && (
        // The input as its own area at the bottom: the chat's ground, a 24px fade above it (the messages never show under the field), 20px
        // under it; centred in at most 920px like the messages.
        <div ref={composerRef} className="absolute inset-x-0 bottom-0 z-20 bg-(--chat-bg) px-4 pb-[max(20px,var(--safe-bottom))] pt-1">
          <span aria-hidden className="pointer-events-none absolute inset-x-0 -top-6 h-6 bg-[linear-gradient(to_bottom,transparent,var(--chat-bg))]" />
          <div className="mx-auto max-w-[920px]">{composer}</div>
        </div>
      )}
    </div>
  );
  // Desktop: the right column, a little lighter than the page, nothing around it.
  // Desktop: the right column on the page's ground (.chat-dark keeps the chat's own small rules, light now).
  if (embedded) return <div className="chat-dark h-full min-h-0 bg-bg">{stage}</div>;

  // Mobile page: the full viewport – chat pages have no tab bar (below md; the status bar area as top padding) /
  // below the top header (md+). data-app-pane="always" drops the footer and main's bottom padding – the page
  // itself never scrolls.
  return (
    <div data-app-pane="always" className="chat-dark relative z-41 bg-bg h-dvh overflow-hidden md:h-[calc(100dvh-var(--header-total))]">
      <div className="mx-auto h-full min-h-0 w-full max-w-3xl pt-(--header-h) md:pt-0">{stage}</div>
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
      head={
        <>
          {thread.type === "house" ? <CrewHeader stay={stay} embedded={embedded} /> : <DirectHeader stay={stay} other={other} embedded={embedded} />}
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

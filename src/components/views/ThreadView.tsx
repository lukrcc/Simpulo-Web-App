"use client";

import { SearchX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type ReactNode, use, useEffect, useState } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { DoItAgainCard } from "@/components/chat/ChatCards";
import { Composer, type ReplyDraft } from "@/components/chat/Composer";
import { MessageList } from "@/components/chat/MessageList";
import { CrewHeader, DirectHeader } from "@/components/chat/ThreadHeader";
import { Container } from "@/components/layout/Container";
import { LockSheet } from "@/components/stay/LockSheet";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { findUser, isBlocked, useStore } from "@/lib/store";
import type { Stay, Thread } from "@/lib/types";
import { useIsDesktop } from "@/lib/useIsDesktop";

/** /inbox/[threadId] – the mobile detail page. On desktop the same chat opens inside /inbox. */
export function ThreadView({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = use(params);
  const isDesktop = useIsDesktop();
  const router = useRouter();
  const t = useTranslations("messages.thread");

  useEffect(() => {
    if (isDesktop) router.replace(`/inbox?id=${threadId}`);
  }, [isDesktop, threadId, router]);

  return (
    <RequireLogin title={t("loginTitle")}>
      {isDesktop ? <PageSkeleton /> : <ThreadGate threadId={threadId} embedded={false} />}
    </RequireLogin>
  );
}

/** The right column of /inbox on desktop. */
export function ThreadPanel({ threadId }: { threadId: string }) {
  return <ThreadGate threadId={threadId} embedded />;
}

function ThreadGate({ threadId, embedded }: { threadId: string; embedded: boolean }) {
  const t = useTranslations("messages.thread");
  const store = useStore();
  const thread = store.threads.find((t) => t.id === threadId);
  const stay = thread && store.stays.find((s) => s.id === thread.stayId);
  // A direct chat with someone you blocked is gone – same "not found" as a missing one.
  const blockedDirect =
    thread?.type === "direct" && thread.participantIds.some((id) => id !== store.currentUserId && isBlocked(store, id));

  if (blockedDirect) return <ThreadNotFound embedded={embedded} />;

  // Crew threads open up only after acceptance (participants), direct threads only to the two people in them.
  if (!thread || !stay || !store.currentUserId || !thread.participantIds.includes(store.currentUserId)) {
    const empty = (
      <EmptyState
        icon={SearchX}
        title={thread ? t("crewOnly") : t("notFound")}
        description={thread ? t("crewOnlyDescription") : undefined}
        action={
          <Link href={stay ? `/stays/${stay.slug}` : "/inbox"} className={buttonClass("dark", "sm")}>
            {stay ? t("viewHouse") : t("backToMessages")}
          </Link>
        }
      />
    );
    return <NotFoundFrame embedded={embedded}>{empty}</NotFoundFrame>;
  }

  return <ThreadContent key={thread.id} thread={thread} stay={stay} embedded={embedded} />;
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
          <Link href="/inbox" className={buttonClass("dark", "sm")}>
            {t("backToMessages")}
          </Link>
        }
      />
    </NotFoundFrame>
  );
}

function ThreadContent({ thread, stay, embedded }: { thread: Thread; stay: Stay; embedded: boolean }) {
  const t = useTranslations("messages.thread");
  const store = useStore();
  const { markThreadRead } = store;
  const messageCount = thread.messages.length;
  const [lockLink, setLockLink] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ReplyDraft | null>(null);

  // Open = read; new messages while it's open too. (MessageList captured the old mark for its divider first.)
  useEffect(() => {
    markThreadRead(thread.id);
  }, [messageCount, thread.id, markThreadRead]);

  const isHost = stay.hostId === store.currentUserId;
  // Only the host locks, only in the crew chat, only while the place is still open.
  const canLock = thread.type === "crew" && isHost && stay.accommodationStatus !== "locked" && stay.status !== "closed";
  const other =
    thread.type === "direct"
      ? findUser(store, thread.participantIds.find((id) => id !== store.currentUserId) ?? "")
      : undefined;
  const otherName = other?.name.split(" ")[0];
  // Over (or completed): the crew chat ends with "Do it again?". Read on the client only – this view never prerenders.
  const ended = thread.type === "crew" && stay.status !== "closed" && (stay.status === "completed" || (stay.endDate !== "" && stay.endDate < new Date().toISOString().slice(0, 10)));

  const content = (
    <>
      {thread.type === "crew" ? <CrewHeader stay={stay} embedded={embedded} /> : <DirectHeader stay={stay} other={other} embedded={embedded} />}
      <MessageList
        thread={thread}
        stay={stay}
        emptyText={thread.type === "crew" ? t("sayHiCrew") : otherName ? t("sayHiDirect", { name: otherName }) : t("sayHiDirectUnknown")}
        onLock={canLock ? setLockLink : undefined}
        onReply={setReplyTo}
        footer={ended ? <DoItAgainCard stay={stay} isHost={isHost} /> : undefined}
      />
      <Composer
        threadId={thread.id}
        placeholder={thread.type === "crew" ? t("composerCrew") : t("composerDirect", { name: otherName ?? "" })}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
      {lockLink && <LockSheet stay={stay} link={lockLink} onClose={() => setLockLink(null)} />}
    </>
  );

  if (embedded) {
    // Fills the column: header pinned on top, only the messages scroll, composer pinned at the bottom.
    return <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-page">{content}</div>;
  }

  // Mobile page: the full viewport – chat pages have no tab bar (below md; the status bar area as top padding) /
  // below the top header (md+). data-app-pane="always" drops the footer and main's bottom padding – the page
  // itself never scrolls.
  return (
    <div
      data-app-pane="always"
      className="relative z-41 flex h-dvh flex-col overflow-hidden bg-page md:h-[calc(100dvh-var(--header-h))]"
    >
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col pt-(--header-h) md:pt-0">{content}</div>
    </div>
  );
}

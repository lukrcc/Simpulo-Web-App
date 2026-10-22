"use client";

import { SearchX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { use, useEffect, useState } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { Composer, type ReplyDraft } from "@/components/chat/Composer";
import { MessageList } from "@/components/chat/MessageList";
import { CrewHeader, DirectHeader } from "@/components/chat/ThreadHeader";
import { Container } from "@/components/layout/Container";
import { LockSheet } from "@/components/stay/LockSheet";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { findUser, useStore } from "@/lib/store";
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
    return embedded ? (
      empty
    ) : (
      <Container page width="narrow">
        {empty}
      </Container>
    );
  }

  return <ThreadContent key={thread.id} thread={thread} stay={stay} embedded={embedded} />;
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

  const content = (
    <>
      {thread.type === "crew" ? <CrewHeader stay={stay} embedded={embedded} /> : <DirectHeader stay={stay} other={other} embedded={embedded} />}
      <MessageList
        thread={thread}
        stay={stay}
        emptyText={thread.type === "crew" ? t("sayHiCrew") : otherName ? t("sayHiDirect", { name: otherName }) : t("sayHiDirectUnknown")}
        onLock={canLock ? setLockLink : undefined}
        onReply={setReplyTo}
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

  // Mobile page: exactly the viewport above the floating tab bar (below md; the status bar area as top padding) /
  // below the top header (md+). data-app-pane="always" drops the footer and main's bottom padding – the page
  // itself never scrolls.
  return (
    <div
      data-app-pane="always"
      className="relative z-41 flex h-[calc(100dvh-5.5rem-env(safe-area-inset-bottom))] flex-col overflow-hidden bg-page md:h-[calc(100dvh-var(--header-h))]"
    >
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col pt-(--header-h) md:pt-0">{content}</div>
    </div>
  );
}

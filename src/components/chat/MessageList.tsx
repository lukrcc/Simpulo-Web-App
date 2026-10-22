"use client";

import { ArrowDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { PhotoLightbox } from "@/components/stay/PhotoLightbox";
import { Avatar } from "@/components/ui/Avatar";
import { useMessageText } from "@/i18n/events";
import { findUser, useStore } from "@/lib/store";
import type { Message, Stay, Thread } from "@/lib/types";
import { DayDivider, SystemLine } from "./ChatCards";
import { BOTTOM_THRESHOLD, buildRows, offsetIn } from "./chatUtils";
import type { ReplyDraft } from "./Composer";
import { MessageBubble, quoteText } from "./MessageBubble";

interface MessageListProps {
  thread: Thread;
  stay: Stay;
  /** Shown when the chat has no messages yet */
  emptyText: string;
  /** Host, crew chat, place still open: link cards get "Lock this" */
  onLock?: (url: string) => void;
  onReply: (draft: ReplyDraft) => void;
}

/**
 * The scrolling message pane: day dividers, same-sender groups, the "New messages" divider (opens scrolled there),
 * auto-scroll at the bottom, a "↓ New messages" pill when scrolled up, and the typing indicator.
 */
export function MessageList({ thread, stay, emptyText, onLock, onReply }: MessageListProps) {
  const t = useTranslations("messages.thread");
  const messageText = useMessageText();
  const store = useStore();
  const { toggleReaction } = store;
  const me = store.currentUserId;
  const paneRef = useRef<HTMLDivElement>(null);
  const unreadRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const countRef = useRef(thread.messages.length);
  const [showPill, setShowPill] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pickerId, setPickerId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null);

  // Captured once, before the thread gets marked read: the first message from someone else after the read mark.
  const [firstUnreadId] = useState(() => {
    const readAt = store.lastReadAt[thread.id];
    if (!readAt) return null;
    return thread.messages.find((m) => m.createdAt > readAt && m.userId !== me)?.id ?? null;
  });

  const rows = useMemo(() => buildRows(thread.messages, firstUnreadId), [thread.messages, firstUnreadId]);
  const byId = useMemo(() => new Map(thread.messages.map((m) => [m.id, m])), [thread.messages]);
  // Only the newest lock card can still be paid – older ones were replaced by an unlock and a new lock.
  const latestLockId = stay.accommodationStatus === "locked" ? thread.messages.findLast((m) => m.type === "lock")?.id : undefined;
  const typingUser = store.typing[thread.id] ? findUser(store, store.typing[thread.id] ?? "") : undefined;

  const scrollToBottom = useCallback((smooth: boolean) => {
    const pane = paneRef.current;
    if (pane) pane.scrollTo({ top: pane.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    setShowPill(false);
  }, []);

  // Opens at the "New messages" divider, otherwise at the bottom.
  useLayoutEffect(() => {
    const pane = paneRef.current;
    if (!pane) return;
    if (unreadRef.current) pane.scrollTop = offsetIn(pane, unreadRef.current) - 24;
    else pane.scrollTop = pane.scrollHeight;
    atBottomRef.current = pane.scrollHeight - pane.scrollTop - pane.clientHeight < BOTTOM_THRESHOLD;
  }, []);

  // New messages: follow them when at the bottom (or when they're ours), otherwise offer the pill.
  const count = thread.messages.length;
  const lastFromMe = thread.messages.at(-1)?.userId === me;
  useLayoutEffect(() => {
    if (count <= countRef.current) {
      countRef.current = count;
      return;
    }
    countRef.current = count;
    if (lastFromMe || atBottomRef.current) scrollToBottom(true);
    else setShowPill(true);
  }, [count, lastFromMe, scrollToBottom]);

  // The typing line appearing at the bottom stays in view.
  const typing = typingUser !== undefined;
  useEffect(() => {
    if (typing && atBottomRef.current) scrollToBottom(true);
  }, [typing, scrollToBottom]);

  function onScroll() {
    const pane = paneRef.current;
    if (!pane) return;
    atBottomRef.current = pane.scrollHeight - pane.scrollTop - pane.clientHeight < BOTTOM_THRESHOLD;
    if (atBottomRef.current) setShowPill(false);
  }

  const jumpTo = useCallback((messageId: string) => {
    const pane = paneRef.current;
    const el = document.getElementById(`msg-${messageId}`);
    if (!pane || !el) return;
    pane.scrollTo({ top: offsetIn(pane, el) - pane.clientHeight / 3, behavior: "smooth" });
    setHighlightId(messageId);
  }, []);

  useEffect(() => {
    if (!highlightId) return;
    const timer = setTimeout(() => setHighlightId(null), 1600);
    return () => clearTimeout(timer);
  }, [highlightId]);

  const closePicker = useCallback(() => setPickerId(null), []);

  function reply(message: Message) {
    const author = findUser(store, message.userId);
    onReply({ id: message.id, name: author?.name.split(" ")[0] ?? t("unknown"), text: quoteText(message, messageText(message), t) });
    setActiveId(null);
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={paneRef} onScroll={onScroll} className="scroll-pane h-full overflow-y-auto overscroll-contain px-3 pb-4 pt-2 md:px-4">
        {count === 0 && <p className="py-16 text-center text-sm text-zinc-500">{emptyText}</p>}
        {rows.map((row) => {
          if (row.kind === "day") return <DayDivider key={row.key} day={row.day} />;
          if (row.kind === "unread")
            return (
              <div key={row.key} ref={unreadRef} className="my-4 flex items-center gap-3 text-xs font-semibold text-accent">
                <span className="h-px flex-1 bg-accent/40" aria-hidden />
                {t("newMessages")}
                <span className="h-px flex-1 bg-accent/40" aria-hidden />
              </div>
            );
          if (row.kind === "line") return <SystemLine key={row.key} message={row.message} />;

          const { message } = row;
          const original = message.replyToId ? byId.get(message.replyToId) : undefined;
          return (
            <MessageBubble
              key={row.key}
              message={message}
              stay={stay}
              author={findUser(store, message.userId)}
              mine={message.userId === me}
              first={row.first}
              last={row.last}
              showName={thread.type === "crew" && message.userId !== me}
              replyTo={original && { message: original, author: findUser(store, original.userId) }}
              currentLock={message.id === latestLockId}
              onLock={onLock}
              active={activeId === message.id}
              picking={pickerId === message.id}
              highlighted={highlightId === message.id}
              onToggleActive={() => setActiveId((id) => (id === message.id ? null : message.id))}
              onTogglePicker={pickerId === message.id ? closePicker : () => setPickerId(message.id)}
              onReply={() => reply(message)}
              onReact={(emoji) => {
                toggleReaction(thread.id, message.id, emoji);
                setPickerId(null);
                setActiveId(null);
              }}
              onJumpTo={jumpTo}
              onOpenPhotos={(photos, index) => setLightbox({ photos, index })}
            />
          );
        })}

        {typingUser && (
          <div className="mt-3 flex items-center gap-2" aria-live="polite">
            <Avatar user={typingUser} size="sm" />
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-zinc-200 bg-white px-3 py-2">
              <span className="flex gap-1" aria-hidden>
                {[0, 150, 300].map((delay) => (
                  <span key={delay} className="size-1.5 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: `${delay}ms` }} />
                ))}
              </span>
              <span className="text-xs text-zinc-500">{t("typing", { name: typingUser.name.split(" ")[0] })}</span>
            </div>
          </div>
        )}
      </div>

      {showPill && (
        <button
          type="button"
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-black/20 hover:bg-[#2A2A30]"
        >
          <ArrowDown className="size-3.5" />
          {t("newMessages")}
        </button>
      )}

      <PhotoLightbox
        photos={lightbox?.photos ?? []}
        index={lightbox?.index ?? null}
        onIndexChange={(index) => setLightbox((l) => l && { ...l, index })}
        onClose={() => setLightbox(null)}
        alt={t("photoAlt")}
      />
    </div>
  );
}

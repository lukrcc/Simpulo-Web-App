"use client";

import { ArrowLeft, ChevronRight, SearchX, Send } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useRef, useState, type FormEvent } from "react";
import { AccommodationSection } from "@/components/stay/AccommodationSection";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusPill } from "@/components/ui/StatusPill";
import { mockPaymentStatus } from "@/lib/mock-extras";
import { findUser, getCrew, useStore } from "@/lib/store";
import type { Stay, Thread, User } from "@/lib/types";
import { cn, formatDateRange, formatDay, formatTime, stayPriceLabel } from "@/lib/utils";

export function ThreadView({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = use(params);
  const store = useStore();
  const thread = store.threads.find((t) => t.id === threadId);
  const stay = thread && store.stays.find((s) => s.id === thread.stayId);

  // Crew threads open up only after acceptance (participants), direct threads only to the two people in them.
  if (!thread || !stay || !thread.participantIds.includes(store.currentUserId)) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-16">
        <EmptyState
          icon={SearchX}
          title={thread ? "This chat is for the crew only" : "Chat not found"}
          description={thread ? "You'll get access once the host accepts your request." : undefined}
          action={
            <Link href={stay ? `/stays/${stay.slug}` : "/inbox"} className={buttonClass("primary", "sm")}>
              {stay ? "View House" : "Back to messages"}
            </Link>
          }
        />
      </div>
    );
  }

  return <ThreadContent thread={thread} stay={stay} />;
}

function ThreadContent({ thread, stay }: { thread: Thread; stay: Stay }) {
  const store = useStore();
  const { markThreadRead, sendMessage } = store;
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const messageCount = thread.messages.length;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
    markThreadRead(thread.id);
  }, [messageCount, thread.id, markThreadRead]);

  function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    sendMessage(thread.id, text);
    setText("");
  }

  const other =
    thread.type === "direct"
      ? findUser(store, thread.participantIds.find((id) => id !== store.currentUserId) ?? "")
      : undefined;

  return (
    <div className="mx-auto flex max-w-3xl flex-col md:px-6 md:pt-6">
      {thread.type === "crew" ? <CrewHeader stay={stay} /> : <DirectHeader stay={stay} other={other} />}

      <ol className="flex-1 space-y-3 px-4 py-4 md:px-0">
        {messageCount === 0 && (
          <li className="py-10 text-center text-sm text-neutral-500">
            {thread.type === "crew" ? "No messages yet – say hi to your crew 👋" : "Start the conversation 👋"}
          </li>
        )}
        {thread.messages.map((message, i) => {
          const previous = thread.messages[i - 1];
          const showDay = !previous || formatDay(previous.createdAt) !== formatDay(message.createdAt);
          const dayDivider = showDay && (
            <p className="my-4 text-center text-xs font-medium text-neutral-400">{formatDay(message.createdAt)}</p>
          );

          if (message.userId === "system") {
            return (
              <li key={message.id}>
                {dayDivider}
                <p className="mx-auto w-fit rounded-full bg-neutral-100 px-3 py-1 text-center text-xs text-neutral-500">
                  {message.text}
                </p>
              </li>
            );
          }

          const author = findUser(store, message.userId);
          const mine = message.userId === store.currentUserId;
          const showAuthor = !mine && (showDay || previous?.userId !== message.userId || previous.userId === "system");
          return (
            <li key={message.id}>
              {dayDivider}
              <div className={cn("flex items-end gap-2", mine && "flex-row-reverse")}>
                {!mine && <div className="w-8 shrink-0">{showAuthor && author && <Avatar user={author} size="sm" linked />}</div>}
                <div className={cn("max-w-[78%]", mine && "text-right")}>
                  {showAuthor && author && thread.type === "crew" && (
                    <p className="mb-0.5 px-1 text-xs text-neutral-500">{author.name.split(" ")[0]}</p>
                  )}
                  <div
                    className={cn(
                      "inline-block rounded-2xl px-4 py-2 text-left text-sm leading-relaxed break-words",
                      mine ? "rounded-br-md bg-accent text-white" : "rounded-bl-md bg-neutral-100 text-ink",
                    )}
                  >
                    {message.text}
                  </div>
                  <p className="mt-0.5 px-1 text-[10px] text-neutral-400">{formatTime(message.createdAt)}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <div ref={endRef} />

      {/* Composer – sits above the mobile tab bar */}
      <form
        onSubmit={handleSend}
        className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 flex items-center gap-2 border-t border-neutral-100 bg-white px-4 py-3 md:bottom-0 md:px-0"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={thread.type === "crew" ? "Message the crew…" : `Message ${other?.name.split(" ")[0] ?? ""}…`}
          aria-label="Message"
          className="h-11 flex-1 rounded-full border border-neutral-200 px-4 text-sm outline-none focus:border-ink"
        />
        <button type="submit" disabled={!text.trim()} aria-label="Send" className={buttonClass("primary", "md", "w-11 px-0")}>
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

const headerClass =
  "sticky top-0 z-30 border-b border-neutral-100 bg-white/95 px-4 py-3 backdrop-blur md:top-16 md:rounded-b-2xl md:px-0";

function CrewHeader({ stay }: { stay: Stay }) {
  const store = useStore();
  const crew = getCrew(store, stay);
  const paidCount = crew.filter((m) => mockPaymentStatus(stay.id, m.id) === "paid").length;

  return (
    <header className={headerClass}>
      <div className="flex items-center gap-3">
        <Link href="/inbox" aria-label="Back to messages" className="-ml-2 rounded-full p-2 hover:bg-neutral-100">
          <ArrowLeft className="size-5" />
        </Link>
        <Link href={`/stays/${stay.slug}`} className="min-w-0 flex-1">
          <p className="truncate font-semibold">{stay.title}</p>
          <p className="truncate text-xs text-neutral-500">{formatDateRange(stay.startDate, stay.endDate)}</p>
        </Link>
        <div className="flex flex-col items-end gap-0.5">
          <AvatarStack users={crew} size="xs" max={4} linked />
          <span className="text-[10px] text-neutral-400">Who&apos;s in</span>
        </div>
      </div>

      <div className="mt-3">
        <AccommodationSection stay={stay} compact />
      </div>

      <details className="group mt-2 rounded-xl bg-neutral-50 text-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 font-medium [&::-webkit-details-marker]:hidden">
          Payments
          <span className="flex items-center gap-1 text-xs font-normal text-neutral-500">
            {paidCount}/{crew.length} paid
            <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
          </span>
        </summary>
        <table className="w-full text-left">
          <thead className="text-xs text-neutral-500">
            <tr>
              <th className="px-3 py-1.5 font-medium">Name</th>
              <th className="px-3 py-1.5 font-medium">Share</th>
              <th className="px-3 py-1.5 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {crew.map((member) => (
              <tr key={member.id} className="border-t border-neutral-100">
                <td className="px-3 py-2">{member.id === store.currentUserId ? "You" : member.name.split(" ")[0]}</td>
                <td className="px-3 py-2">{stayPriceLabel(stay)}</td>
                <td className="px-3 py-2 text-right">
                  <StatusPill status={mockPaymentStatus(stay.id, member.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </header>
  );
}

function DirectHeader({ stay, other }: { stay: Stay; other?: User }) {
  return (
    <header className={headerClass}>
      <div className="flex items-center gap-3">
        <Link href="/inbox" aria-label="Back to messages" className="-ml-2 rounded-full p-2 hover:bg-neutral-100">
          <ArrowLeft className="size-5" />
        </Link>
        {other && <Avatar user={other} size="md" linked />}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{other?.name ?? "Unknown"}</p>
          <Link href={`/stays/${stay.slug}`} className="block truncate text-xs text-neutral-500 hover:underline">
            About {stay.title}
          </Link>
        </div>
      </div>
    </header>
  );
}

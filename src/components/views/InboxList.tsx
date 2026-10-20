"use client";

import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { findUser, isThreadUnread, useStore } from "@/lib/store";
import type { Thread, User } from "@/lib/types";
import { cn, formatDay } from "@/lib/utils";

interface ThreadRow {
  thread: Thread;
  title: string;
  subtitle?: string;
  avatar?: User;
}

export function InboxList() {
  const store = useStore();

  const rows: ThreadRow[] = store.threads
    .filter((t) => t.participantIds.includes(store.currentUserId))
    .flatMap((thread) => {
      const stay = store.stays.find((s) => s.id === thread.stayId);
      if (!stay) return [];
      if (thread.type === "crew") {
        return [{ thread, title: stay.title, avatar: findUser(store, stay.hostId) }];
      }
      const other = findUser(store, thread.participantIds.find((id) => id !== store.currentUserId) ?? "");
      return [{ thread, title: other?.name ?? "Unknown", subtitle: stay.title, avatar: other }];
    })
    // Crew threads first, then direct – each newest first.
    .toSorted(
      (a, b) =>
        Number(a.thread.type === "direct") - Number(b.thread.type === "direct") ||
        (b.thread.messages.at(-1)?.createdAt ?? "").localeCompare(a.thread.messages.at(-1)?.createdAt ?? ""),
    );

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 md:px-6 md:pt-10">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Messages</h1>
      <p className="mt-1 text-sm text-neutral-500">Crew chats and direct messages.</p>

      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="No chats yet"
            description="Once you host a House or get accepted, your crew chat shows up here."
            action={
              <Link href="/" className={buttonClass("primary", "sm")}>
                Explore Houses
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-neutral-100">
            {rows.map(({ thread, title, subtitle, avatar }) => {
              const last = thread.messages.at(-1);
              const unread = isThreadUnread(store, thread);
              const author = last?.userId === store.currentUserId ? "You" : last?.userId && findUser(store, last.userId)?.name.split(" ")[0];
              const preview = !last ? "No messages yet" : last.userId === "system" || !author ? last.text : `${author}: ${last.text}`;
              return (
                <li key={thread.id}>
                  <Link href={`/inbox/${thread.id}`} className="-mx-2 flex items-center gap-3 rounded-2xl px-2 py-3 hover:bg-neutral-50">
                    {avatar ? <Avatar user={avatar} size="lg" /> : <span className="size-14 shrink-0 rounded-full bg-neutral-100" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={cn("truncate", unread ? "font-bold" : "font-semibold")}>{title}</p>
                        {last && <span className="shrink-0 text-xs text-neutral-400">{formatDay(last.createdAt)}</span>}
                      </div>
                      <p className="truncate text-xs text-neutral-400">
                        {thread.type === "crew" ? "Crew chat" : `Direct · ${subtitle}`}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className={cn("min-w-0 flex-1 truncate text-sm", unread ? "font-medium text-ink" : "text-neutral-500")}>
                          {preview}
                        </p>
                        {unread && <span className="size-2.5 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

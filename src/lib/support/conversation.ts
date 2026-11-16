"use client";

// "Simpulo Support" in Messages: one conversation per person, built from their own tickets (Admin › Support, lib/admin/store.ts) – never
// stored as a thread of its own. Each request or idea is the person's message (a small line before it says what it was about), each answer
// from the team Simpulo's, follow-ups the person's again. Answering in Admin › Support makes it appear here; writing here adds a follow-up
// to the latest ticket. TODO(backend): the same from the server.
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useAdminData } from "@/lib/admin/store";
import { useStore } from "@/lib/store";
import type { Message, SupportTicket, Thread } from "@/lib/types";

/** /messages?id=support – the one support conversation of the signed-in person. */
export const SUPPORT_THREAD_ID = "support";
/** Simpulo's side of the conversation (no person behind it in the data). */
export const SUPPORT_SENDER = "simpulo-support";

/** The person's tickets that belong in the conversation, oldest first (merged duplicates live on in the other ticket). */
export function supportTicketsOf(tickets: readonly SupportTicket[], userId: string): SupportTicket[] {
  return tickets.filter((t) => t.userId === userId && !t.mergedInto).toSorted((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** The conversation as a thread for the message list; null without any ticket. `label`: the small line before each request. */
export function supportThreadOf(tickets: readonly SupportTicket[], userId: string, label: (ticket: SupportTicket) => string): Thread | null {
  const mine = supportTicketsOf(tickets, userId);
  if (mine.length === 0) return null;
  const messages: Message[] = mine.flatMap((ticket): Message[] => [
    { id: `${ticket.id}-about`, threadId: SUPPORT_THREAD_ID, senderId: "system", text: label(ticket), createdAt: ticket.createdAt },
    { id: ticket.id, threadId: SUPPORT_THREAD_ID, senderId: userId, text: ticket.message, createdAt: ticket.createdAt },
    ...ticket.replies.map((reply): Message => ({ id: reply.id, threadId: SUPPORT_THREAD_ID, senderId: reply.from === "admin" ? SUPPORT_SENDER : userId, text: reply.text, createdAt: reply.createdAt })),
  ]);
  return { id: SUPPORT_THREAD_ID, type: "support", participantIds: [userId, SUPPORT_SENDER], messages: messages.toSorted((a, b) => a.createdAt.localeCompare(b.createdAt)) };
}

/** The signed-in person's support conversation and the ticket a new message follows up on (the latest). */
export function useSupportThread(): { thread: Thread | null; latestTicketId: string | null } {
  const { tickets } = useAdminData();
  const { currentUserId } = useStore();
  const t = useTranslations("help.conversation");
  return useMemo(() => {
    if (!currentUserId) return { thread: null, latestTicketId: null };
    const mine = supportTicketsOf(tickets, currentUserId);
    return {
      thread: supportThreadOf(tickets, currentUserId, (ticket) => t(`about.${ticket.category}`)),
      latestTicketId: mine.at(-1)?.id ?? null,
    };
  }, [tickets, currentUserId, t]);
}

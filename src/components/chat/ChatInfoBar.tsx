"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { SafetyMenu } from "@/components/safety/SafetyMenu";
import { findUser, useStore } from "@/lib/store";
import { SUPPORT_THREAD_ID } from "@/lib/support/conversation";
import { useResolvedTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { CHAT_COLORS, useChatColor } from "@/lib/chatColors";
import { CrewChatMenu } from "./ThreadHeader";
import { WhosInSheet } from "./WhosInSheet";

/**
 * The open chat's tools at the chat strip's right end (CLAUDE.md "Messages breiter und ruhiger" – there is no chat head from 744px): the
 * four colour dots and "···" by role (a House: Who's in · Your stay on top of the crew menu; a question: Report · Block). Simpulo Support: none.
 */
export function ChatTools({ threadId }: { threadId: string }) {
  const t = useTranslations("messages.thread");
  const store = useStore();
  const router = useRouter();
  const dark = useResolvedTheme() === "dark";
  const [whosIn, setWhosIn] = useState(false);
  const thread = store.threads.find((x) => x.id === threadId);
  const stay = thread ? store.stays.find((s) => s.id === thread.houseId) : undefined;
  if (threadId === SUPPORT_THREAD_ID || !thread || !stay) return null;
  let menu = null;
  if (thread.type === "house") {
    const isHost = stay.hostId === store.currentUserId;
    menu = (
      <>
        <CrewChatMenu stay={stay} threadId={thread.id} extraItems={[{ label: t("whosIn"), onSelect: () => setWhosIn(true) }, ...(isHost ? [] : [{ label: t("yourStaySettings"), href: `/houses/${stay.id}?tab=plan` }])]} />
        <WhosInSheet stay={stay} open={whosIn} onClose={() => setWhosIn(false)} />
      </>
    );
  } else {
    const other = findUser(store, thread.participantIds.find((id) => id !== store.currentUserId) ?? "");
    menu = other ? <SafetyMenu target={{ kind: "user", id: other.id }} user={other} onBlocked={() => router.push("/messages")} dark={dark} /> : null;
  }
  return (
    <span data-chat-tools className="flex shrink-0 items-center gap-3">
      <ChatColorDots threadId={threadId} />
      {menu}
    </span>
  );
}

/** The four chat colours (lib/chatColors.ts): dots 14px, 8px apart, the chosen one with a fine ring, the name as a tooltip (aria-label). */
function ChatColorDots({ threadId }: { threadId: string }) {
  const t = useTranslations("messages.thread.chatColors");
  const store = useStore();
  const [color, setColor] = useChatColor(store.currentUserId, threadId);
  return (
    <span role="radiogroup" aria-label={t("label")} className="flex items-center gap-2">
      {CHAT_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={color === c}
          aria-label={t(c)}
          onClick={() => setColor(c)}
          data-tap="none"
          className={cn("size-3.5 rounded-full transition-shadow duration-150", color === c ? "shadow-[0_0_0_2px_var(--chat-bg),0_0_0_3.5px_var(--text-secondary)]" : "hover:shadow-[0_0_0_2px_var(--chat-bg),0_0_0_3.5px_var(--line)]")}
          style={{ backgroundColor: `var(--chat-color-${c})` }}
        />
      ))}
    </span>
  );
}

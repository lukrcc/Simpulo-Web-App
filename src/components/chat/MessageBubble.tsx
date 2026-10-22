"use client";

import { Reply, SmilePlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, type MouseEvent } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useMessageText } from "@/i18n/events";
import { useFormat } from "@/i18n/format";
import { messageType, useStore } from "@/lib/store";
import type { Message, Stay, User } from "@/lib/types";
import { cn, findUrls } from "@/lib/utils";
import { CARD_WIDTH, ChatLinkCard, FileRow, ImageGrid, LockCard, MessageText } from "./ChatCards";
import { QUICK_REACTIONS } from "./chatUtils";

interface MessageBubbleProps {
  message: Message;
  stay: Stay;
  author?: User;
  mine: boolean;
  /** First / last message of a same-sender group: avatar + name on the first, time under the last (mobile) */
  first: boolean;
  last: boolean;
  /** Crew chats name the sender above their group */
  showName: boolean;
  /** The message this one replies to, if it's still in the thread */
  replyTo?: { message: Message; author?: User };
  /** Only the newest lock card can still be paid */
  currentLock: boolean;
  /** Host, crew chat, place still open: link cards get "Lock this" */
  onLock?: (url: string) => void;
  /** Action bar shown (tap on touch devices); the emoji row open */
  active: boolean;
  picking: boolean;
  highlighted: boolean;
  onToggleActive: () => void;
  onTogglePicker: () => void;
  onReply: () => void;
  onReact: (emoji: string) => void;
  onJumpTo: (messageId: string) => void;
  onOpenPhotos: (photos: string[], index: number) => void;
}

/** A person's message: text bubble, photos, files, link / lock cards, the quoted reply and reaction pills. */
export function MessageBubble(props: MessageBubbleProps) {
  const { message, stay, author, mine, first, last, showName, replyTo, active, picking } = props;
  const t = useTranslations("messages.thread");
  const f = useFormat();
  const messageText = useMessageText();
  const store = useStore();
  const pickerRef = useRef<HTMLDivElement>(null);
  const { onTogglePicker } = props;

  // Outside click closes the emoji row.
  useEffect(() => {
    if (!picking) return;
    const onDown = (e: PointerEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) onTogglePicker();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [picking, onTogglePicker]);

  const type = messageType(message);
  const text = type === "lock" ? "" : messageText(message);
  const images = message.attachments?.filter((a) => a.kind === "image") ?? [];
  const files = message.attachments?.filter((a) => a.kind === "file") ?? [];
  const links = [...new Set(findUrls(text))];
  const hasCard = type === "lock" || links.length > 0;
  const time = f.time(message.createdAt);
  const bigEmoji = !replyTo && isEmojiOnly(text);

  // Touch devices have no hover: a tap on the message toggles its action bar (links and buttons keep working).
  function onTap(e: MouseEvent) {
    if ((e.target as HTMLElement).closest("a,button") || window.matchMedia("(hover: hover)").matches) return;
    props.onToggleActive();
  }

  const quote = replyTo && (
    <button
      type="button"
      onClick={() => props.onJumpTo(replyTo.message.id)}
      className={cn(
        "mb-1.5 block w-full rounded-lg border-l-2 py-1 pl-2 pr-2 text-left text-xs",
        mine ? "border-white/50 bg-white/10 text-white/75" : "border-zinc-300 bg-zinc-50 text-zinc-500",
      )}
    >
      <span className="block font-semibold">{replyTo.author?.name.split(" ")[0] ?? t("unknown")}</span>
      <span className="line-clamp-2">{quoteText(replyTo.message, messageText(replyTo.message), t)}</span>
    </button>
  );

  return (
    <div
      id={`msg-${message.id}`}
      className={cn("flex items-end gap-2", mine && "flex-row-reverse", first ? "mt-3" : "mt-0.5")}
    >
      {!mine && <div className="w-8 shrink-0 self-start">{first && author && <Avatar user={author} size="sm" linked />}</div>}

      <div
        onClick={onTap}
        className={cn(
          "group relative flex min-w-0 flex-col",
          mine ? "items-end" : "items-start",
          hasCard ? CARD_WIDTH : "max-w-[78%]",
        )}
      >
        {first && showName && author && <p className="mb-1 px-1 text-[13px] font-semibold text-ink">{author.name.split(" ")[0]}</p>}

        <div className={cn("flex flex-col gap-1.5 rounded-2xl transition-shadow", mine ? "items-end" : "items-start", props.highlighted && "ring-2 ring-accent/60 ring-offset-2")}>
          {(text || quote) && (
            <div
              className={cn(
                "max-w-full whitespace-pre-line text-left wrap-break-word",
                // Emoji-only messages read bigger, without a bubble.
                bigEmoji
                  ? "px-1 text-4xl leading-tight"
                  : cn(
                      "rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                      mine ? "rounded-br-md bg-ink text-white" : "rounded-bl-md border border-zinc-200 bg-white text-ink",
                    ),
              )}
            >
              {quote}
              {text && <MessageText text={text} mine={mine && !bigEmoji} />}
            </div>
          )}
          {images.length > 0 && (
            <ImageGrid
              images={images}
              onOpen={(i) =>
                props.onOpenPhotos(
                  images.map((img) => img.url),
                  i,
                )
              }
            />
          )}
          {files.map((file) => (
            <FileRow key={file.url} file={file} mine={mine} />
          ))}
          {links.map((url) => (
            <ChatLinkCard
              key={url}
              url={url}
              locked={stay.accommodationStatus === "locked" && stay.accommodationLink === url}
              onLock={props.onLock ? () => props.onLock?.(url) : undefined}
            />
          ))}
          {type === "lock" && message.lock && <LockCard stay={stay} lock={message.lock} current={props.currentLock} />}
        </div>

        {(message.reactions?.length ?? 0) > 0 && (
          <div className={cn("mt-1 flex flex-wrap gap-1", mine && "justify-end")}>
            {message.reactions?.map((reaction) => {
              const reacted = store.currentUserId !== null && reaction.userIds.includes(store.currentUserId);
              return (
                <button
                  key={reaction.emoji}
                  type="button"
                  onClick={() => props.onReact(reaction.emoji)}
                  aria-pressed={reacted}
                  aria-label={t("reactionLabel", { emoji: reaction.emoji, count: reaction.userIds.length })}
                  className={cn(
                    "flex h-6 items-center gap-1 rounded-full border px-2 text-xs tabular-nums transition-colors",
                    reacted ? "border-accent/40 bg-accent/10 font-medium text-ink" : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50",
                  )}
                >
                  <span>{reaction.emoji}</span>
                  {reaction.userIds.length}
                </button>
              );
            })}
          </div>
        )}

        {/* Mobile: the time under the last bubble of a group (desktop shows it in the hover bar). */}
        {(last || active) && <p className="mt-1 px-1 text-[11px] text-zinc-400 lg:hidden">{time}</p>}

        {/* Hover (desktop) / tap (touch) actions, beside the bubble. */}
        <div
          className={cn(
            "absolute top-0 z-10 items-center gap-0.5",
            mine ? "right-full pr-1.5" : "left-full pl-1.5",
            first && showName && author && "top-6",
            active || picking ? "flex" : "hidden group-hover:flex",
          )}
        >
          <span className={cn("hidden whitespace-nowrap px-1 text-[11px] text-zinc-400 lg:block", mine && "order-last")}>{time}</span>
          <div className="flex items-center rounded-full border border-zinc-200 bg-white p-0.5 shadow-sm">
            <button
              type="button"
              onClick={props.onReply}
              aria-label={t("reply")}
              title={t("reply")}
              className="flex size-7 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100"
            >
              <Reply className="size-4" />
            </button>
            <button
              type="button"
              onClick={onTogglePicker}
              aria-label={t("react")}
              title={t("react")}
              aria-expanded={picking}
              className={cn("flex size-7 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100", picking && "bg-zinc-100")}
            >
              <SmilePlus className="size-4" />
            </button>
          </div>
        </div>

        {picking && (
          <div
            ref={pickerRef}
            role="menu"
            aria-label={t("react")}
            className={cn(
              "absolute bottom-full z-20 mb-1 flex gap-0.5 rounded-full border border-zinc-200 bg-white p-1 shadow-lg",
              mine ? "right-0" : "left-0",
            )}
          >
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                role="menuitem"
                onClick={() => props.onReact(emoji)}
                aria-label={t("reactWith", { emoji })}
                className="flex size-9 items-center justify-center rounded-full text-xl transition-transform hover:scale-110 hover:bg-zinc-100"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|‍|️|\s){1,12}$/u;

/** 1–3 emoji and nothing else. */
function isEmojiOnly(text: string): boolean {
  const trimmed = text.trim();
  return trimmed !== "" && !/\d|#|\*/.test(trimmed) && EMOJI_ONLY.test(trimmed) && [...new Intl.Segmenter().segment(trimmed)].length <= 3;
}

/** What a quoted reply shows: the text, or a hint at what was sent. */
export function quoteText(message: Message, text: string, t: ReturnType<typeof useTranslations<"messages.thread">>): string {
  if (text) return text;
  if (message.attachments?.some((a) => a.kind === "image")) return t("photo");
  if (message.attachments?.length) return message.attachments[0].name ?? t("file");
  return "";
}

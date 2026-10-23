"use client";

import { Flag, Reply, SmilePlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
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
  /** First / last message of a same-sender group: avatar + name on the first, the tighter tail corner on the last */
  first: boolean;
  last: boolean;
  /** Crew chats name the sender above their group */
  showName: boolean;
  /** The message this one replies to, if it's still in the thread */
  replyTo?: { message: Message; author?: User; /** Quoted message is from someone you blocked – show no name or text */ blocked?: boolean };
  /** Only the newest lock card can still be paid */
  currentLock: boolean;
  /** Host, crew chat, place still open: link cards get "Lock this" */
  onLock?: (url: string) => void;
  /** Action bar shown (long-press on touch devices); the emoji row open */
  active: boolean;
  picking: boolean;
  highlighted: boolean;
  onToggleActive: () => void;
  onTogglePicker: () => void;
  onReply: () => void;
  onReact: (emoji: string) => void;
  /** Someone else's message: "Report" in the action bar */
  onReport?: () => void;
  onJumpTo: (messageId: string) => void;
  onOpenPhotos: (photos: string[], index: number) => void;
}

/** How long a touch has to rest on a message before its actions open. */
const LONG_PRESS_MS = 450;

/** A person's message: text bubble, photos, files, link / lock cards, the quoted reply and reaction pills. */
export function MessageBubble(props: MessageBubbleProps) {
  const { message, stay, author, mine, first, last, showName, replyTo, active, picking } = props;
  const t = useTranslations("messages.thread");
  const tSafety = useTranslations("safety");
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

  // Touch devices have no hover: a long-press on the message opens its action bar (Reply / React). Moving the
  // finger cancels it, so scrolling still works; links and buttons inside keep their normal tap.
  const press = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number } | null>(null);
  function cancelPress() {
    if (press.current) clearTimeout(press.current.timer);
    press.current = null;
  }
  function onPointerDown(e: ReactPointerEvent) {
    if (e.pointerType !== "touch" || (e.target as HTMLElement).closest("a,button")) return;
    cancelPress();
    press.current = {
      x: e.clientX,
      y: e.clientY,
      timer: setTimeout(() => {
        press.current = null;
        navigator.vibrate?.(10);
        props.onToggleActive();
      }, LONG_PRESS_MS),
    };
  }
  function onPointerMove(e: ReactPointerEvent) {
    if (press.current && Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) > 10) cancelPress();
  }
  useEffect(() => cancelPress, []);

  const quote = replyTo && (
    <button
      type="button"
      onClick={() => props.onJumpTo(replyTo.message.id)}
      className={cn(
        "mb-1 block w-full min-w-0 rounded-md border-l-[3px] bg-black/5 py-1 pl-2 pr-2.5 text-left",
        mine ? "border-accent" : "border-[#A1A1AA]",
      )}
    >
      {replyTo.blocked ? (
        <span className="line-clamp-1 text-[13px] italic leading-[18px] text-zinc-500">{tSafety("blockedMessage")}</span>
      ) : (
        <>
          <span className={cn("block truncate text-xs font-semibold", mine ? "text-accent-dark" : "text-zinc-700")}>
            {replyTo.author?.name.split(" ")[0] ?? t("unknown")}
          </span>
          <span className="line-clamp-1 text-[13px] leading-[18px] text-zinc-500">{quoteText(replyTo.message, messageText(replyTo.message), t)}</span>
        </>
      )}
    </button>
  );

  const timeStamp = <span className="text-[11px] leading-none text-black/45 tabular-nums">{time}</span>;
  const hasBubble = !bigEmoji && Boolean(text || quote);
  const reactions = message.reactions ?? [];

  return (
    <div
      id={`msg-${message.id}`}
      className={cn("flex items-end gap-2", mine && "flex-row-reverse", first ? "mt-3" : "mt-0.5", reactions.length > 0 && "mb-2")}
    >
      {!mine && <div className="w-8 shrink-0 self-start">{first && author && <Avatar user={author} size="sm" linked />}</div>}

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={cancelPress}
        onPointerCancel={cancelPress}
        // No native "copy / look up" menu on long-press – ours opens instead.
        onContextMenu={(e) => e.nativeEvent instanceof PointerEvent && e.nativeEvent.pointerType === "touch" && e.preventDefault()}
        className={cn("group relative flex min-w-0 flex-col", mine ? "items-end" : "items-start", hasCard ? CARD_WIDTH : "max-w-[70%]")}
      >
        {first && showName && author && <p className="mb-1 px-1 text-[13px] font-semibold text-ink">{author.name.split(" ")[0]}</p>}

        <div
          className={cn(
            "flex max-w-full flex-col gap-1.5 rounded-[18px] transition-shadow duration-300",
            mine ? "items-end" : "items-start",
            props.highlighted && "ring-2 ring-accent/60",
          )}
        >
          {bigEmoji && (
            // Emoji-only: no bubble, big – the time small beside it.
            <div className={cn("flex items-end gap-1.5 px-1", mine && "flex-row-reverse")}>
              <span className="text-[40px] leading-[1.15]">{text}</span>
              <span className="mb-1.5">{timeStamp}</span>
            </div>
          )}
          {hasBubble && (
            <div
              className={cn(
                "relative max-w-full rounded-[18px] px-3 pb-1.5 pt-1.5 text-left text-sm leading-5 text-ink shadow-[0_1px_1px_rgba(0,0,0,0.06)] wrap-break-word",
                mine ? "bg-[#FCE6DC]" : "bg-white",
                last && (mine ? "rounded-br-[6px]" : "rounded-bl-[6px]"),
              )}
            >
              {quote}
              {text && (
                <span className="whitespace-pre-line">
                  <MessageText text={text} mine={mine} />
                </span>
              )}
              {/* WhatsApp-style time: an invisible copy reserves room at the end of the last line (or wraps to its own),
                  the visible one sits in the bottom-right corner. */}
              <span className="invisible ml-2 inline-block text-[11px] leading-none" aria-hidden>
                {time}
              </span>
              <span className="absolute bottom-1.5 right-3">{timeStamp}</span>
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
          {/* No text bubble to carry it: the time under the photos / files / cards. */}
          {!hasBubble && !bigEmoji && <span className="px-1">{timeStamp}</span>}
        </div>

        {reactions.length > 0 && (
          // Overlaps the bubble's bottom edge (the row's bottom margin keeps it clear of the next message); under
          // media / emoji-only messages it sits below their time instead.
          <div className={cn("relative z-[1] flex flex-wrap gap-1 px-2", hasBubble ? "-mt-2" : "mt-1", mine && "justify-end")}>
            {reactions.map((reaction) => {
              const reacted = store.currentUserId !== null && reaction.userIds.includes(store.currentUserId);
              return (
                <button
                  key={reaction.emoji}
                  type="button"
                  onClick={() => props.onReact(reaction.emoji)}
                  aria-pressed={reacted}
                  aria-label={t("reactionLabel", { emoji: reaction.emoji, count: reaction.userIds.length })}
                  className={cn(
                    "flex h-6 items-center gap-1 rounded-full px-1.5 text-xs tabular-nums shadow-[0_1px_2px_rgba(0,0,0,0.12)] ring-1 transition-colors",
                    reacted ? "bg-accent-soft font-medium text-ink ring-accent/30" : "bg-white text-zinc-600 ring-black/5 hover:bg-zinc-50",
                  )}
                >
                  <span>{reaction.emoji}</span>
                  {reaction.userIds.length}
                </button>
              );
            })}
          </div>
        )}

        {/* Hover (desktop) / long-press (touch) actions, beside the bubble. */}
        <div
          className={cn(
            "absolute top-0 z-10 items-center",
            mine ? "right-full pr-1.5" : "left-full pl-1.5",
            first && showName && author && "top-6",
            active || picking ? "flex" : "hidden group-hover:flex",
          )}
        >
          <div className="flex items-center rounded-full bg-white p-0.5 shadow-sm ring-1 ring-black/5">
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
            {props.onReport && (
              <button
                type="button"
                onClick={props.onReport}
                aria-label={tSafety("report")}
                title={tSafety("report")}
                className="flex size-7 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100"
              >
                <Flag className="size-4" />
              </button>
            )}
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

/** A message from someone you blocked, collapsed to one muted row; tapping it shows the message once. */
export function BlockedMessageRow({ first, onShow }: { first: boolean; onShow: () => void }) {
  const t = useTranslations("safety");
  return (
    <div className={cn("flex items-end gap-2", first ? "mt-3" : "mt-0.5")}>
      <div className="w-8 shrink-0" />
      <button
        type="button"
        onClick={onShow}
        className="rounded-[18px] border border-dashed border-black/10 px-3 py-1.5 text-left text-[13px] italic text-zinc-500 hover:bg-white/60"
      >
        {t("blockedMessage")}
      </button>
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

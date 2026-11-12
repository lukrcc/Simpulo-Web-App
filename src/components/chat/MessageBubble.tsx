"use client";

import { Check, CheckCheck, Flag, Reply, SmilePlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useMessageText } from "@/i18n/events";
import { useFormat } from "@/i18n/format";
import { useStore } from "@/lib/store";
import type { Message, User } from "@/lib/types";
import { cn, findUrls } from "@/lib/utils";
import { ChatLinkCard, FileRow, ImageGrid, MessageText } from "./ChatCards";
import { QUICK_REACTIONS } from "./chatUtils";

interface MessageBubbleProps {
  message: Message;
  author?: User;
  mine: boolean;
  /** First / last message of a same-sender group: avatar + name on the first, the tighter tail corner on the last */
  first: boolean;
  last: boolean;
  /** Crew chats name the sender above their group */
  showName: boolean;
  /** Your own message: someone wrote after it (✓✓, cream), else only sent (✓) */
  read?: boolean;
  /** The message this one replies to, if it's still in the thread */
  replyTo?: { message: Message; author?: User; /** Quoted message is from someone you blocked – show no name or text */ blocked?: boolean };
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

/** A person's message: text bubble, photos, files, link cards, the quoted reply and reaction pills. */
export function MessageBubble(props: MessageBubbleProps) {
  const { message, author, mine, first, showName, replyTo, active, picking } = props;
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

  const text = messageText(message);
  const images = message.attachments?.filter((a) => a.kind === "image") ?? [];
  const files = message.attachments?.filter((a) => a.kind === "file") ?? [];
  const links = [...new Set(findUrls(text))];
  const hasCard = links.length > 0;
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
        // The quote: a 3px bar (yours cream 40 %, theirs cream 25 % – no orange in bubbles) on black 15 %.
        "mb-1.5 block w-full min-w-0 rounded-lg border-l-[3px] bg-shade/15 py-1 pl-2 pr-2 text-left",
        mine ? "border-ink/40" : "border-ink/25",
      )}
    >
      {replyTo.blocked ? (
        <span className={cn("line-clamp-1 text-small italic leading-[18px]", mine ? "text-ink/60" : "text-muted")}>{tSafety("blockedMessage")}</span>
      ) : (
        <>
          <span className={cn("block truncate text-small font-semibold", mine ? "text-ink" : "text-ink")}>
            {replyTo.author?.name.split(" ")[0] ?? t("unknown")}
          </span>
          <span className={cn("line-clamp-1 text-small leading-[18px]", mine ? "text-ink/70" : "text-muted")}>{quoteText(replyTo.message, messageText(replyTo.message), t)}</span>
        </>
      )}
    </button>
  );

  // The time bottom right: yours cream 55 % with ✓ (sent) or ✓✓ (read, cream 90 %); theirs cream 45 %.
  const ticks = mine && (props.read ? <CheckCheck aria-label={t("read")} className="size-3.5 text-ink/90" strokeWidth={2.25} /> : <Check aria-label={t("sent")} className="size-3.5" strokeWidth={2.25} />);
  const timeStamp = (onBubble = true) => (
    <span className={cn("inline-flex items-center gap-1 text-small leading-none tabular-nums", onBubble && mine ? "text-ink/55" : mine ? "text-ink/55" : "text-ink/45")}>
      {time}
      {ticks}
    </span>
  );
  const hasBubble = !bigEmoji && Boolean(text || quote);
  const reactions = message.reactions ?? [];

  return (
    <div
      id={`msg-${message.id}`}
      // One run of the same sender: 2px apart; a new run 12px down. The avatar only at a run's last message, the name only at its first.
      className={cn("flex items-end gap-2", mine && "flex-row-reverse", first ? "mt-3" : "mt-0.5", reactions.length > 0 && "mb-2")}
    >
      {!mine && <div className="w-8 shrink-0 self-end">{props.last && author && <Avatar user={author} size="sm" linked />}</div>}

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={cancelPress}
        onPointerCancel={cancelPress}
        // No native "copy / look up" menu on long-press – ours opens instead.
        onContextMenu={(e) => e.nativeEvent instanceof PointerEvent && e.nativeEvent.pointerType === "touch" && e.preventDefault()}
        className={cn("group relative flex min-w-0 flex-col", mine ? "items-end" : "items-start", hasCard ? "w-[min(420px,75%)]" : "max-w-[min(560px,65%)]")}
      >
        {first && showName && author && <p className="mb-1 px-1 text-small font-semibold text-ink">{author.name.split(" ")[0]}</p>}

        <div
          className={cn(
            "flex max-w-full flex-col gap-1.5 rounded-[20px] transition-shadow duration-300",
            hasCard && "w-full",
            mine ? "items-end" : "items-start",
            props.highlighted && "ring-2 ring-ink/60",
          )}
        >
          {bigEmoji && (
            // Emoji-only: no bubble, big – the time small beside it.
            <div className={cn("flex items-end gap-1.5 px-1", mine && "flex-row-reverse")}>
              <span className="text-h1 leading-[1.15] tracking-normal">{text}</span>
              <span className="mb-1.5">{timeStamp(false)}</span>
            </div>
          )}
          {hasBubble && (
            <div
              className={cn(
                "relative max-w-full rounded-[18px] px-3.5 py-2 text-left text-body leading-5 wrap-break-word",
                hasCard && "w-full",
                // Your own: graphite --bubble-own (#48423E), cream words (.bubble-own turns the tokens round); the others': --bubble-other (#ECE6DF), ink. The last of a run: a small corner (the tail)
                // on the sender's side, at the bottom.
                mine ? "bubble-own bg-(--bubble-own) text-ink" : "bg-(--bubble-other) text-ink",
                props.last && (mine ? "rounded-br-[4px]" : "rounded-bl-[4px]"),
              )}
            >
              {quote}
              {text && (
                <span className="whitespace-pre-line">
                  <MessageText text={text} />
                </span>
              )}
              {links.map((url) => (
                <ChatLinkCard key={url} url={url} mine={mine} />
              ))}
              {hasCard ? (
                <span className="mt-1 block text-right">{timeStamp()}</span>
              ) : (
                <>
                  {/* WhatsApp-style time: an invisible copy reserves room at the end of the last line (or wraps to its own),
                      the visible one sits in the bottom-right corner. */}
                  <span className={cn("invisible ml-2 inline-block text-small leading-none", mine && "pr-5")} aria-hidden>
                    {time}
                  </span>
                  <span className="absolute bottom-2 right-3.5">{timeStamp()}</span>
                </>
              )}
            </div>
          )}
          {message.contactsHidden && <p className="px-1 text-right text-small text-muted">{t("contactsHidden")}</p>}
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
          {/* No text bubble to carry it: the time under the photos / files. */}
          {!hasBubble && !bigEmoji && <span className="px-1">{timeStamp(false)}</span>}
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
                    // A small capsule --bubble-other with a 1px --chat-bg edge, overlapping the bubble's bottom.
                    "flex h-6 items-center gap-1 rounded-full border border-(--chat-bg) bg-(--bubble-other) px-1.5 text-small tabular-nums transition-colors hover:bg-surface-2",
                    reacted ? "font-semibold text-ink" : "text-ink/70",
                  )}
                >
                  <span>{reaction.emoji}</span>
                  {reaction.userIds.length}
                </button>
              );
            })}
          </div>
        )}

        {/* Hover (desktop) / long-press (touch) actions: a small glass pill on the bubble's corner. */}
        <div
          className={cn(
            "absolute z-10 items-center",
            mine ? "left-2" : "right-2",
            // On the corner, mostly above the text: on the line with the name where there is one.
            first && showName && author ? "-top-2" : "-top-5",
            active || picking ? "flex" : "hidden group-hover:flex",
          )}
        >
          <div className="glass-panel flex items-center rounded-full! p-0.5">
            <button
              type="button"
              onClick={props.onReply}
              aria-label={t("reply")}
              title={t("reply")}
              className="flex size-7 items-center justify-center rounded-full text-ink/80 hover:bg-(--chip-bg-hover)"
            >
              <Reply className="size-4" />
            </button>
            <button
              type="button"
              onClick={onTogglePicker}
              aria-label={t("react")}
              title={t("react")}
              aria-expanded={picking}
              className={cn("flex size-7 items-center justify-center rounded-full text-ink/80 hover:bg-(--chip-bg-hover)", picking && "bg-(--chip-bg-hover)")}
            >
              <SmilePlus className="size-4" />
            </button>
            {props.onReport && (
              <button
                type="button"
                onClick={props.onReport}
                aria-label={tSafety("report")}
                title={tSafety("report")}
                className="flex size-7 items-center justify-center rounded-full text-ink/80 hover:bg-(--chip-bg-hover)"
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
              "glass-panel absolute bottom-full z-20 mb-1 flex gap-0.5 rounded-full! p-1",
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
                className="flex size-9 items-center justify-center rounded-full text-h3 transition-transform hover:scale-110 hover:bg-bg"
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
        className="rounded-[18px] bg-ink/5 px-3 py-1.5 text-left text-small italic text-muted hover:bg-surface/60"
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

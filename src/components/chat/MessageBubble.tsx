"use client";

import { Check, CheckCheck, Flag, Reply, SmilePlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useMessageText } from "@/i18n/events";
import { useFormat } from "@/i18n/format";
import { useStore } from "@/lib/store";
import { nameColorOf, useOwnChatColor } from "@/lib/chatColors";
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
  /** Only the last of your own messages carries the read state (✓ sent · ✓✓ read) */
  showRead?: boolean;
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
  // Your own colour in this chat – the others' name tones avoid it.
  const ownColor = useOwnChatColor();
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
  // Touch: a short tap on the bubble (no long press, no move, not on a link or button) shows its time – again hides it.
  const [timeShown, setTimeShown] = useState(false);
  function onPointerUp(e: ReactPointerEvent) {
    if (e.pointerType === "touch" && press.current) setTimeShown((on) => !on);
    cancelPress();
  }
  useEffect(() => cancelPress, []);

  const quote = replyTo && (
    <button
      type="button"
      onClick={() => props.onJumpTo(replyTo.message.id)}
      className={cn(
        // The quote (CLAUDE.md "Farb-Token neutral"): in the others' bubble #DCDCE0 (dark #3A3A3C, --quote-bg) with a 3px bar in the secondary
        // text colour; in your graphite bubble black 15 % with a cream 40 % bar. No orange in bubbles.
        "mb-1.5 block w-full min-w-0 rounded-lg border-l-[3px] py-1 pl-2 pr-2 text-left",
        mine ? "bg-shade/15" : "bg-(--quote-bg)",
      )}
      // The bar in the quoted person's colour (CLAUDE.md "Messages breiter und ruhiger"): someone else's name tone, yours your chat colour.
      style={{ borderLeftColor: replyTo.message.senderId === store.currentUserId ? "var(--chat-color, var(--text-secondary))" : nameColorOf(replyTo.message.senderId, ownColor) }}
    >
      {replyTo.blocked ? (
        <span className={cn("line-clamp-1 text-small italic leading-[18px]", mine ? "text-ink/60" : "text-ink/80")}>{tSafety("blockedMessage")}</span>
      ) : (
        <>
          <span className={cn("block truncate text-small font-semibold", mine ? "text-ink" : "text-ink")}>
            {replyTo.author?.name.split(" ")[0] ?? t("unknown")}
          </span>
          <span className={cn("line-clamp-1 text-small leading-[18px]", mine ? "text-ink/70" : "text-ink/80")}>{quoteText(replyTo.message, messageText(replyTo.message), t)}</span>
        </>
      )}
    </button>
  );

  // The time on hover beside every bubble (CLAUDE.md "Messages: ruhiger Verlauf" – a centred time line marks gaps over 30 min, chatUtils);
  // the read state (✓ sent · ✓✓ read) only under your last own message.
  const ticks = mine && props.showRead && (props.read ? <CheckCheck aria-label={t("read")} className="size-3.5" strokeWidth={2.25} /> : <Check aria-label={t("sent")} className="size-3.5" strokeWidth={2.25} />);
  const hasBubble = !bigEmoji && Boolean(text || quote);
  const reactions = message.reactions ?? [];

  return (
    <div
      id={`msg-${message.id}`}
      // One run of the same sender: 2px apart; a new run 12px down. The avatar only at a run's last message, the name only at its first.
      className={cn("flex items-end gap-2", mine && "flex-row-reverse", first ? "mt-3" : "mt-0.5", reactions.length > 0 && "mb-2")}
    >
      {/* The avatar beside the run's last bubble – above its time line (13px + 4px); a placeholder of the same width keeps bubbles flush. */}
      {!mine && <div className="w-8 shrink-0 self-end">{props.last && author && (
          // A fine 2px ring in the person's tone round the face.
          <span className="block rounded-full" style={{ boxShadow: `0 0 0 2px ${nameColorOf(author.id, ownColor)}` }}>
            <Avatar user={author} size="sm" linked />
          </span>
        )}</div>}

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={cancelPress}
        // No native "copy / look up" menu on long-press – ours opens instead.
        onContextMenu={(e) => e.nativeEvent instanceof PointerEvent && e.nativeEvent.pointerType === "touch" && e.preventDefault()}
        className={cn("group relative flex min-w-0 flex-col", mine ? "items-end" : "items-start", hasCard ? "w-[min(420px,75%)] max-md:w-[80%]" : "max-w-[60%] max-md:max-w-[80%]")}
      >
        {/* The name over a group in the person's own tone (stable, never like your chat colour); the bubbles stay white. */}
        {first && showName && author && (
          <p className="mb-1 px-1 text-small font-semibold" style={{ color: nameColorOf(author.id, ownColor) }}>
            {author.name.split(" ")[0]}
          </p>
        )}

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
            </div>
          )}
          {hasBubble && (
            <div
              className={cn(
                "relative max-w-full rounded-[18px] px-3.5 py-2 text-left text-body leading-5 wrap-break-word",
                hasCard && "w-full",
                // Your own: graphite --bubble-own (#48423E), white words (.bubble-own); the others': white, opaque, a fine line black 4 %
                // (--bubble-other, --bubble-other-line), ink. The last of a run: a small corner (the tail) on the sender's side, at the bottom.
                mine ? "bubble-own bg-(--bubble-own) text-ink" : "bg-(--bubble-other) text-ink shadow-[inset_0_0_0_1px_var(--bubble-other-line)]",
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
        </div>
        {/* The time on hover beside the bubble (touch: a tap on the bubble, or while its actions are open – long press); the read state only
            under your last own message. */}
        <span aria-hidden className={cn("pointer-events-none absolute bottom-1 whitespace-nowrap text-small tabular-nums text-muted opacity-0 transition-opacity duration-150 group-hover:opacity-100", (active || timeShown) && "opacity-100", mine ? "right-full mr-2" : "left-full ml-2")}>
          {time}
        </span>
        {ticks && <span className={cn("mt-1 inline-flex px-1 text-muted", reactions.length > 0 && "order-last")}>{ticks}</span>}

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

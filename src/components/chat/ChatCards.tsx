"use client";

import { FileText, RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { againHref } from "@/components/create/model";
import { LinkPreviewCard } from "@/components/stay/LinkPreviewCard";
import { Button } from "@/components/ui/ActionButton";
import { cardClass } from "@/components/ui/Card";
import { Img } from "@/components/ui/Img";
import { useMessageText } from "@/i18n/events";
import { mockPreviewForUrl } from "@/lib/mock-extras";
import type { Attachment, Message, Stay } from "@/lib/types";
import { cn, splitLinks } from "@/lib/utils";
import { dayOf, formatSize } from "./chatUtils";

/** Cards (links, "Do it again?") take the full bubble column, up to this width. */
export const CARD_WIDTH = "w-full max-w-[420px]";

/** "Today", "Yesterday", otherwise "Mon, Jan 12" – centered between two thin rules. */
export function DayDivider({ day }: { day: string }) {
  const t = useTranslations("messages.thread");
  const locale = useLocale();
  const now = new Date();
  const label =
    day === dayOf(now.toISOString())
      ? t("today")
      : day === dayOf(new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
        ? t("yesterday")
        : new Intl.DateTimeFormat(locale, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));
  return (
    <div className="my-5 flex justify-center">
      <span className="rounded-full bg-surface/80 px-3 py-1 text-xs font-medium text-muted shadow-[0_1px_1px_color-mix(in_srgb,var(--ink)_6%,transparent)]">{label}</span>
    </div>
  );
}

/** An app line (senderId 'system'): centred and muted, a rule on both sides – set apart from what people write. */
export function SystemLine({ message }: { message: Message }) {
  const messageText = useMessageText();
  return (
    <div className="my-3 flex items-center gap-3 text-xs text-muted">
      <span className="h-px flex-1 bg-ink/10" aria-hidden />
      <p className="flex max-w-[80%] items-center gap-1.5 text-center">
        {messageText(message)}
      </p>
      <span className="h-px flex-1 bg-ink/10" aria-hidden />
    </div>
  );
}

/** Message text with its links clickable – ink on both bubble tints; own bubbles underline in the accent. */
export function MessageText({ text, mine }: { text: string; mine: boolean }) {
  return (
    <>
      {splitLinks(text).map((part, i) =>
        part.url ? (
          <a
            key={i}
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn("break-all text-ink underline underline-offset-2", mine ? "decoration-ink" : "decoration-muted")}
          >
            {part.text}
          </a>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

/** One image: a single thumbnail up to 320px wide; 2–4: a two-column grid (three: the first one spans the row). */
export function ImageGrid({ images, onOpen }: { images: Attachment[]; onOpen: (index: number) => void }) {
  const t = useTranslations("messages.thread");
  const shown = images.slice(0, 4);
  const single = shown.length === 1;
  return (
    <div className={cn("grid w-[320px] max-w-full gap-1 overflow-hidden rounded-xl", !single && "grid-cols-2")}>
      {shown.map((image, i) => (
        <button
          key={image.url}
          type="button"
          onClick={() => onOpen(i)}
          aria-label={t("openPhoto", { index: i + 1, count: images.length })}
          className={cn(
            "relative overflow-hidden bg-bg outline-none focus-visible:ring-2 focus-visible:ring-accent",
            single ? "aspect-[4/3]" : shown.length === 3 && i === 0 ? "col-span-2 aspect-[2/1]" : "aspect-square",
          )}
        >
          <Img src={image.url} alt={image.name ?? ""} fill sizes="320px" className="object-cover transition-transform hover:scale-[1.02]" />
          {i === 3 && images.length > 4 && (
            <span className="absolute inset-0 flex items-center justify-center bg-ink/45 text-lg font-semibold text-white">
              +{images.length - 4}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/** A PDF or other file in a bubble: icon, name, size – links to the file. */
export function FileRow({ file, mine }: { file: Attachment; mine: boolean }) {
  const t = useTranslations("messages.thread");
  const locale = useLocale();
  return (
    <a
      href={file.url}
      target="_blank"
      rel="noopener noreferrer"
      download={file.name}
      className={cn(
        "flex w-64 max-w-full items-center gap-3 rounded-[18px] px-3 py-2.5 text-left text-ink shadow-[0_1px_1px_color-mix(in_srgb,var(--ink)_6%,transparent)]",
        mine ? "bg-line hover:bg-line" : "bg-surface hover:bg-bg",
      )}
    >
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", mine ? "bg-ink/5" : "bg-bg")}>
        <FileText className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{file.name ?? t("file")}</span>
        {file.size !== undefined && <span className="block text-xs text-muted">{formatSize(file.size, locale)}</span>}
      </span>
    </a>
  );
}

/** A pasted link as a preview card. (Locking a place happens on the House page – the chat shows no booking status.) */
export function ChatLinkCard({ url }: { url: string }) {
  return (
    <div className={cn(CARD_WIDTH, cardClass, "text-left text-ink")}>
      <LinkPreviewCard href={url} preview={mockPreviewForUrl(url)} layout="row" />
    </div>
  );
}

/**
 * The crew chat's last word once the House is over: "Do it again?" – host and guests alike open the stepper with the
 * same vibe, place and spots, and the crew ready to invite.
 */
export function DoItAgainCard({ stay, isHost }: { stay: Stay; isHost: boolean }) {
  const t = useTranslations("growth.again");
  return (
    <div className="mt-6 flex justify-center">
      <div className={cn(CARD_WIDTH, cardClass, "text-center text-ink")}>
        <p className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink">
          <RotateCcw className="size-3.5" aria-hidden />
          {t("title")}
        </p>
        <p className="mt-2 text-sm text-ink">{isHost ? t("hostText", { title: stay.title }) : t("guestText")}</p>
        {/* Secondary: the chat page's one primary is Send. */}
        <Button href={againHref(stay.id)} variant="secondary" size="lg" className="mt-4 w-full">
          {t("action")}
        </Button>
      </div>
    </div>
  );
}

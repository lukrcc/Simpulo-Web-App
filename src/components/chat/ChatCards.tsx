"use client";

import { ArrowUpRight, FileText, RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { againHref } from "@/components/create/model";
import { Button } from "@/components/ui/ActionButton";
import { cardClass } from "@/components/ui/Card";
import { Img } from "@/components/ui/Img";
import { useMessageText } from "@/i18n/events";
import { previewForUrl } from "@/lib/data";
import type { Attachment, Message, Stay } from "@/lib/types";
import { linkDomain } from "@/lib/links";
import { cn, splitLinks } from "@/lib/utils";
import { dayOf, formatSize } from "./chatUtils";

/** Cards (links, "Do it again?") take the full bubble column, up to this width. */
export const CARD_WIDTH = "w-full max-w-[420px]";

/** "Today", "Yesterday", otherwise "Mon, Jan 12": small and muted, centred, nothing around it. */
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
      <span className="text-small text-muted">{label}</span>
    </div>
  );
}

/** An app line (senderId 'system'): centred and muted, a rule on both sides – set apart from what people write. */
export function SystemLine({ message }: { message: Message }) {
  const messageText = useMessageText();
  return (
    <p className="mx-auto my-3 max-w-[80%] text-center text-small text-muted">{messageText(message)}</p>
  );
}

/** Message text with its links clickable, in the bubble's own colour. A link says only its domain: the preview below has the rest. */
export function MessageText({ text }: { text: string }) {
  return (
    <>
      {splitLinks(text).map((part, i) =>
        part.url ? (
          <a
            key={i}
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all underline underline-offset-2"
          >
            {linkDomain(part.url)}
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
            "relative overflow-hidden bg-bg outline-none focus-visible:ring-2 focus-visible:ring-ink/25",
            single ? "aspect-[4/3]" : shown.length === 3 && i === 0 ? "col-span-2 aspect-[2/1]" : "aspect-square",
          )}
        >
          <Img src={image.url} alt={image.name ?? ""} fill sizes="320px" className="object-cover transition-transform hover:scale-[1.02]" />
          {i === 3 && images.length > 4 && (
            <span className="absolute inset-0 flex items-center justify-center bg-ink/45 text-body-lg font-semibold text-white">
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
        "flex w-64 max-w-full items-center gap-3 rounded-[20px] px-3 py-2.5 text-left",
        mine ? "bg-ink text-white" : "bg-(--select-bg) text-ink shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-surface",
      )}
    >
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", mine ? "bg-white/15" : "bg-ink/5")}>
        <FileText className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-medium">{file.name ?? t("file")}</span>
        {file.size !== undefined && <span className={cn("block text-small", mine ? "text-white/60" : "text-muted")}>{formatSize(file.size, locale)}</span>}
      </span>
    </a>
  );
}

/**
 * A link's preview, part of its bubble and as wide: the picture 64px, the title on one line, the domain, "Open". No box of its own.
 * (Locking a place happens on the House page – the chat shows no booking status.)
 */
export function ChatLinkCard({ url, mine }: { url: string; mine: boolean }) {
  const t = useTranslations("house.linkPreview");
  const preview = previewForUrl(url);
  return (
    <div className={cn("mt-2 flex items-center gap-3 rounded-2xl p-2", mine ? "bg-white/10" : "bg-ink/5")}>
      {preview.imageUrl && <Img src={preview.imageUrl} alt="" width={64} height={64} className="size-16 shrink-0 rounded-xl object-cover" />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-semibold">{preview.title}</p>
        <p className={cn("truncate text-small", mine ? "text-white/60" : "text-muted")}>{preview.domain}</p>
        <a href={url} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-small font-semibold underline-offset-4 hover:underline">
          {t("open")}
          <ArrowUpRight className="size-3.5" aria-hidden />
        </a>
      </div>
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
        <p className="flex items-center justify-center gap-1.5 text-eyebrow uppercase text-ink/55">
          <RotateCcw className="size-3.5" aria-hidden />
          {t("title")}
        </p>
        <p className="mt-2 text-body text-ink">{isHost ? t("hostText", { title: stay.title }) : t("guestText")}</p>
        {/* Secondary: the chat page's one primary is Send. */}
        <Button href={againHref(stay.id)} variant="secondary" size="md" className="mt-4 w-full">
          {t("action")}
        </Button>
      </div>
    </div>
  );
}

"use client";

import { Check, CircleCheck, FileText, Lock, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { createHref } from "@/components/create/model";
import { LinkPreviewCard } from "@/components/stay/LinkPreviewCard";
import { PaySheet } from "@/components/stay/PaySheet";
import { buttonClass } from "@/components/ui/button";
import { Img } from "@/components/ui/Img";
import { useToast } from "@/components/ui/Toast";
import { useMessageText } from "@/i18n/events";
import { useFormat } from "@/i18n/format";
import { mockPreviewForUrl } from "@/lib/mock-extras";
import { findUser, getMyPayment, messageType, useStore } from "@/lib/store";
import type { Attachment, LockDetails, Message, Stay } from "@/lib/types";
import { cn, splitLinks } from "@/lib/utils";
import { dayOf, formatSize } from "./chatUtils";

/** Cards (link, lock) take the full bubble column, up to this width. */
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
      <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-zinc-500 shadow-[0_1px_1px_rgba(0,0,0,0.06)]">{label}</span>
    </div>
  );
}

/** Centered app line with a rule on both sides; payments get a check so they stand out from other events. */
export function SystemLine({ message }: { message: Message }) {
  const messageText = useMessageText();
  const payment = messageType(message) === "payment";
  return (
    <div className="my-3 flex items-center gap-3 text-xs text-zinc-500">
      <span className="h-px flex-1 bg-black/10" aria-hidden />
      <p className={cn("flex max-w-[80%] items-center gap-1.5 text-center", payment && "font-medium text-emerald-700")}>
        {payment && <CircleCheck className="size-3.5 shrink-0" aria-hidden />}
        {messageText(message)}
      </p>
      <span className="h-px flex-1 bg-black/10" aria-hidden />
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
            className={cn("break-all text-ink underline underline-offset-2", mine ? "decoration-accent" : "decoration-zinc-400")}
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
            "relative overflow-hidden bg-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-accent",
            single ? "aspect-[4/3]" : shown.length === 3 && i === 0 ? "col-span-2 aspect-[2/1]" : "aspect-square",
          )}
        >
          <Img src={image.url} alt={image.name ?? ""} fill sizes="320px" className="object-cover transition-transform hover:scale-[1.02]" />
          {i === 3 && images.length > 4 && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-lg font-semibold text-white">
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
        "flex w-64 max-w-full items-center gap-3 rounded-[18px] px-3 py-2.5 text-left text-ink shadow-[0_1px_1px_rgba(0,0,0,0.06)]",
        mine ? "bg-[#FCE6DC] hover:bg-[#F9DCCF]" : "bg-white hover:bg-zinc-50",
      )}
    >
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", mine ? "bg-black/5" : "bg-zinc-100")}>
        <FileText className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{file.name ?? t("file")}</span>
        {file.size !== undefined && <span className="block text-xs text-zinc-500">{formatSize(file.size, locale)}</span>}
      </span>
    </a>
  );
}

/** A pasted link as a preview card. The host gets "Lock this" on it while the place is still open. */
export function ChatLinkCard({ url, locked, onLock }: { url: string; locked: boolean; onLock?: () => void }) {
  const t = useTranslations("messages.thread");
  return (
    <div className={cn(CARD_WIDTH, "rounded-2xl bg-white p-3 text-left text-ink shadow-[0_1px_1px_rgba(0,0,0,0.06)]")}>
      <LinkPreviewCard href={url} preview={mockPreviewForUrl(url)} layout="row" />
      {locked ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-accent">
          <Lock className="size-3.5" aria-hidden />
          {t("lockedAccommodation")}
        </p>
      ) : (
        onLock && (
          <button type="button" onClick={onLock} className={buttonClass("dark", "sm", "mt-3 w-full")}>
            <Lock className="size-3.5" />
            {t("lockThis")}
          </button>
        )
      )}
    </div>
  );
}

/** The host's lock message: the booked place, the money, the deadline – and the crew's "Pay my share". */
export function LockCard({ stay, lock, current }: { stay: Stay; lock: LockDetails; current: boolean }) {
  const t = useTranslations("messages.thread");
  const f = useFormat();
  const store = useStore();
  const [paying, setPaying] = useState(false);
  const payment = getMyPayment(store, stay.id);
  const paid = payment?.status === "paid";
  const host = findUser(store, stay.hostId);

  return (
    <div className={cn(CARD_WIDTH, "rounded-2xl bg-white p-4 text-left text-ink shadow-[0_1px_1px_rgba(0,0,0,0.06)]")}>
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
        <Lock className="size-3.5" aria-hidden />
        {host ? t("lockedBy", { name: host.name.split(" ")[0] }) : t("locked")}
      </p>
      <LinkPreviewCard href={lock.link} preview={{ ...mockPreviewForUrl(lock.link), title: lock.title }} layout="row" />
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-page px-2 py-2">
          <dt className="text-[11px] text-zinc-500">{t("total")}</dt>
          <dd className="text-sm font-semibold">{f.price(lock.total, stay.currency)}</dd>
        </div>
        <div className="rounded-xl bg-page px-2 py-2">
          <dt className="text-[11px] text-zinc-500">{t("perPerson")}</dt>
          <dd className="text-sm font-semibold">{f.price(lock.perPerson, stay.currency)}</dd>
        </div>
        <div className="rounded-xl bg-page px-2 py-2">
          <dt className="text-[11px] text-zinc-500">{t("payBy")}</dt>
          <dd className="text-sm font-semibold">{f.day(lock.payBy)}</dd>
        </div>
      </dl>
      {current && payment && (
        <button
          type="button"
          disabled={paid}
          onClick={() => setPaying(true)}
          className={buttonClass(paid ? "secondary" : "dark", "md", "mt-4 w-full")}
        >
          {paid ? (
            <>
              {t("paid")}
              <Check className="size-4 text-emerald-600" aria-hidden />
            </>
          ) : (
            t("payShare", { price: f.price(lock.perPerson, stay.currency) })
          )}
        </button>
      )}
      {!current && <p className="mt-3 text-xs text-zinc-500">{t("replaced")}</p>}
      <PaySheet stay={stay} open={paying} onClose={() => setPaying(false)} />
    </div>
  );
}

/**
 * The crew chat's last word once the House is over: "Do it again?" – the host duplicates it as a draft (new dates,
 * new crew), guests are invited to host their own next trip (prefilled with the place).
 */
export function DoItAgainCard({ stay, isHost }: { stay: Stay; isHost: boolean }) {
  const t = useTranslations("growth.again");
  const store = useStore();
  const router = useRouter();
  const showToast = useToast();

  function duplicate() {
    const id = store.duplicateStay(stay.id);
    showToast(t("copiedToast"));
    router.push(`/my-stays/${id}/edit`);
  }

  return (
    <div className="mt-6 flex justify-center">
      <div className={cn(CARD_WIDTH, "rounded-2xl bg-white p-4 text-center text-ink shadow-[0_1px_1px_rgba(0,0,0,0.06)]")}>
        <p className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
          <RotateCcw className="size-3.5" aria-hidden />
          {t("title")}
        </p>
        <p className="mt-2 text-sm text-neutral-700">{isHost ? t("hostText", { title: stay.title }) : t("guestText")}</p>
        {isHost ? (
          <button type="button" onClick={duplicate} className={buttonClass("dark", "md", "mt-4 w-full")}>
            {t("hostAction")}
          </button>
        ) : (
          <Link href={createHref({ region: stay.region })} className={buttonClass("dark", "md", "mt-4 w-full")}>
            {t("guestAction")}
          </Link>
        )}
      </div>
    </div>
  );
}

"use client";

import { ArrowLeft, Lock, LockOpen } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CrewMenu } from "@/components/stay/CrewMenu";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { CrewContacts, useHasVisibleCrewContacts } from "@/components/ui/CrewContacts";
import { Img } from "@/components/ui/Img";
import { useFormat } from "@/i18n/format";
import { mockPreviewForUrl } from "@/lib/mock-extras";
import { findUser, getCrew, getCrewLinks, getLockDetails, paymentProgress, useStore } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { WhosInSheet } from "./WhosInSheet";

/** Embedded = the desktop panel (full header); otherwise the mobile page (one line). */
function headerClass(embedded: boolean) {
  return cn("relative shrink-0 border-b border-zinc-200 bg-white", embedded ? "rounded-t-3xl px-4 py-3" : "px-3 py-2 md:px-4");
}

function BackToInbox({ embedded }: { embedded: boolean }) {
  const t = useTranslations("messages.thread");
  if (embedded) return null;
  return (
    <Link href="/inbox" aria-label={t("backToMessages")} className="-ml-1 shrink-0 rounded-full p-2 hover:bg-zinc-100">
      <ArrowLeft className="size-5" />
    </Link>
  );
}

function ProgressBar({ paid, total, className }: { paid: number; total: number; className?: string }) {
  const t = useTranslations("messages.thread");
  return (
    <div
      className={cn("overflow-hidden rounded-full bg-black/10", className)}
      role="progressbar"
      aria-label={t("payments")}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={paid}
    >
      <div className="h-full rounded-full bg-emerald-500 transition-[width]" style={{ width: `${total ? (paid / total) * 100 : 0}%` }} />
    </div>
  );
}

/** Pinned on every crew chat: dates, where the place stands, who's in – and the payment progress once locked. */
export function CrewHeader({ stay, embedded }: { stay: Stay; embedded: boolean }) {
  const t = useTranslations("messages.thread");
  const tContacts = useTranslations("common.ui.crewContacts");
  const f = useFormat();
  const store = useStore();
  const [whosIn, setWhosIn] = useState(false);
  const crew = getCrew(store, stay);
  const lock = getLockDetails(store, stay);
  const linkCount = getCrewLinks(store, stay.id).length;
  const progress = paymentProgress(store, stay.id);
  const host = findUser(store, stay.hostId);
  const showHostContacts = useHasVisibleCrewContacts(host) && host?.id !== store.currentUserId;

  const avatars = (
    <button
      type="button"
      onClick={() => setWhosIn(true)}
      aria-label={t("whosInLabel", { count: crew.length })}
      className="flex shrink-0 flex-col items-end gap-0.5 rounded-xl p-1 hover:bg-zinc-100"
    >
      <AvatarStack users={crew} size="xs" max={embedded ? 4 : 3} />
      {embedded && <span className="text-[10px] text-zinc-400">{t("whosIn")}</span>}
    </button>
  );

  return (
    <header className={headerClass(embedded)}>
      <div className={cn("flex items-center", embedded ? "gap-3" : "gap-2")}>
        <BackToInbox embedded={embedded} />
        <div className="min-w-0 flex-1">
          <Link href={`/stays/${stay.slug}`} className="block truncate font-semibold hover:underline">
            {stay.title}
          </Link>
          {embedded && <p className="truncate text-xs text-zinc-500">{f.longRange(stay.startDate, stay.endDate)}</p>}
        </div>
        {avatars}
        <CrewMenu stay={stay} afterLeaveHref="/inbox" />
      </div>

      {embedded &&
        (lock ? (
          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-page p-2 pr-3">
            <Img src={mockPreviewForUrl(lock.link).imageUrl} alt="" width={40} height={40} className="size-10 shrink-0 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 truncate text-sm font-medium">
                <Lock className="size-3.5 shrink-0 text-accent" aria-hidden />
                <span className="truncate">{lock.title}</span>
              </p>
              <p className="truncate text-xs text-zinc-500">
                {t("lockSummary", { price: f.price(lock.perPerson, stay.currency), date: f.day(lock.payBy) })}
              </p>
            </div>
            <div className="w-28 shrink-0">
              <p className="mb-1 text-right text-[11px] font-medium text-zinc-600">
                {t("paidOf", { paid: progress.paidCount, total: progress.count })}
              </p>
              <ProgressBar paid={progress.paidCount} total={progress.count} className="h-1.5" />
            </div>
          </div>
        ) : (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-600">
            <LockOpen className="size-3.5 shrink-0" aria-hidden />
            {t("accommodationOpen", { count: linkCount })}
          </p>
        ))}

      {embedded && showHostContacts && host && (
        <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
          <span className="shrink-0">
            {tContacts("reachMeOn")} · {host.name.split(" ")[0]}
          </span>
          <CrewContacts user={host} size="sm" />
          <span className="ml-auto shrink-0 text-[11px] text-zinc-400">{tContacts("crewOnly")}</span>
        </div>
      )}

      {stay.status === "closed" && (
        <p className={cn("rounded-xl bg-zinc-100 px-3 py-2 text-zinc-600", embedded ? "mt-3 text-sm" : "mt-1.5 text-xs")}>{t("closed")}</p>
      )}

      {/* Mobile: payments condensed into a thin line along the header's bottom edge. */}
      {!embedded && lock && (
        <ProgressBar paid={progress.paidCount} total={progress.count} className="absolute inset-x-0 -bottom-px h-0.5 rounded-none bg-transparent" />
      )}

      <WhosInSheet stay={stay} open={whosIn} onClose={() => setWhosIn(false)} />
    </header>
  );
}

export function DirectHeader({ stay, other, embedded }: { stay: Stay; other?: User; embedded: boolean }) {
  const t = useTranslations("messages.thread");
  return (
    <header className={headerClass(embedded)}>
      <div className={cn("flex items-center", embedded ? "gap-3" : "gap-2")}>
        <BackToInbox embedded={embedded} />
        {other && <Avatar user={other} size={embedded ? "md" : "sm"} linked />}
        <div className="min-w-0 flex-1">
          {other ? (
            <Link href={`/u/${other.id}`} className="block truncate font-semibold hover:underline">
              {other.name}
            </Link>
          ) : (
            <p className="truncate font-semibold">{t("unknown")}</p>
          )}
          <Link href={`/stays/${stay.slug}`} className="block truncate text-xs text-zinc-500 hover:underline">
            {t("about", { title: stay.title })}
          </Link>
        </div>
      </div>
    </header>
  );
}

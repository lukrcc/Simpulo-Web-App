"use client";

import { ArrowLeft, Lock, LockOpen } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { SafetyMenu } from "@/components/safety/SafetyMenu";
import { CrewMenu } from "@/components/stay/CrewMenu";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { CrewContacts, useHasVisibleCrewContacts } from "@/components/ui/CrewContacts";
import { useFormat } from "@/i18n/format";
import { findUser, getCrew, getCrewLinks, getLockDetails, paymentProgress, useStore } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { WhosInSheet } from "./WhosInSheet";

/** One 64px row – the desktop panel (rounded top) and the mobile page alike. */
function headerClass(embedded: boolean) {
  return cn(
    "relative flex h-16 shrink-0 items-center gap-2 border-b border-zinc-200 bg-white",
    embedded ? "rounded-t-3xl px-4" : "px-2 sm:px-4",
  );
}

function BackToInbox({ embedded }: { embedded: boolean }) {
  const t = useTranslations("messages.thread");
  if (embedded) return null;
  return (
    <Link href="/inbox" aria-label={t("backToMessages")} className="shrink-0 rounded-full p-2 hover:bg-zinc-100">
      <ArrowLeft className="size-5" />
    </Link>
  );
}

/** Payments once locked: a 2px line along the header's bottom edge; the taller transparent strip carries the tooltip. */
function PaymentLine({ paid, total }: { paid: number; total: number }) {
  const t = useTranslations("messages.thread");
  const label = t("paidOf", { paid, total });
  return (
    <div className="absolute inset-x-0 -bottom-px flex h-2 items-end" title={label}>
      <div
        className="h-0.5 w-full overflow-hidden bg-black/5"
        role="progressbar"
        aria-label={t("payments")}
        aria-valuetext={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={paid}
      >
        <div className="h-full bg-emerald-500 transition-[width]" style={{ width: `${total ? (paid / total) * 100 : 0}%` }} />
      </div>
    </div>
  );
}

/** Pinned on every crew chat: House + dates, where the place stands, who's in, the host's channels – one row. */
export function CrewHeader({ stay, embedded }: { stay: Stay; embedded: boolean }) {
  const t = useTranslations("messages.thread");
  const f = useFormat();
  const store = useStore();
  const [whosIn, setWhosIn] = useState(false);
  const crew = getCrew(store, stay);
  const lock = getLockDetails(store, stay);
  const linkCount = getCrewLinks(store, stay.id).length;
  const progress = paymentProgress(store, stay.id);
  const host = findUser(store, stay.hostId);
  const showHostContacts = useHasVisibleCrewContacts(host) && host?.id !== store.currentUserId;

  return (
    <>
      <header className={headerClass(embedded)}>
        <BackToInbox embedded={embedded} />

        {/* The title truncates first; the dates stay. */}
        <div className="flex min-w-0 flex-1 items-baseline gap-1.5">
          <Link href={`/stays/${stay.slug}`} className="min-w-0 truncate text-base font-semibold hover:underline">
            {stay.title}
          </Link>
          <span className="shrink-0 text-[13px] text-zinc-500">
            <span aria-hidden>· </span>
            {f.shortRange(stay.startDate, stay.endDate)}
          </span>
        </div>

        <span
          className="hidden h-7 shrink-0 items-center gap-1 rounded-full bg-zinc-100 px-2.5 text-xs font-medium text-zinc-700 sm:flex"
          title={lock ? t("lockSummary", { price: f.price(lock.perPerson, stay.currency), date: f.day(lock.payBy) }) : t("accommodationOpen", { count: linkCount })}
        >
          {lock ? <Lock className="size-3.5 text-accent" aria-hidden /> : <LockOpen className="size-3.5 text-zinc-500" aria-hidden />}
          {lock ? t("chipLocked", { price: f.price(lock.perPerson, stay.currency) }) : t("chipOpen", { count: linkCount })}
        </span>

        <button
          type="button"
          onClick={() => setWhosIn(true)}
          aria-label={t("whosInLabel", { count: crew.length })}
          title={t("whosIn")}
          className="shrink-0 rounded-full p-1 hover:bg-zinc-100"
        >
          <AvatarStack users={crew} size="xs" max={embedded ? 4 : 3} />
        </button>

        {showHostContacts && host && (
          <div className="hidden shrink-0 sm:block">
            <CrewContacts user={host} size="xs" />
          </div>
        )}

        <CrewMenu stay={stay} afterLeaveHref="/inbox" />

        {lock && <PaymentLine paid={progress.paidCount} total={progress.count} />}

        <WhosInSheet stay={stay} open={whosIn} onClose={() => setWhosIn(false)} />
      </header>

      {stay.status === "closed" && (
        <p className="shrink-0 border-b border-zinc-200 bg-zinc-50 px-4 py-1.5 text-xs text-zinc-600">{t("closed")}</p>
      )}
    </>
  );
}

export function DirectHeader({ stay, other, embedded }: { stay: Stay; other?: User; embedded: boolean }) {
  const t = useTranslations("messages.thread");
  const router = useRouter();
  return (
    <header className={headerClass(embedded)}>
      <BackToInbox embedded={embedded} />
      {other && <Avatar user={other} size="md" linked />}
      <div className="min-w-0 flex-1">
        {other ? (
          <Link href={`/u/${other.id}`} className="block truncate text-base font-semibold leading-5 hover:underline">
            {other.name}
          </Link>
        ) : (
          <p className="truncate text-base font-semibold leading-5">{t("unknown")}</p>
        )}
        <Link href={`/stays/${stay.slug}`} className="block truncate text-[13px] text-zinc-500 hover:underline">
          {t("about", { title: stay.title })}
        </Link>
      </div>
      {/* Blocking ends the chat – it's gone from the inbox, so go back there. */}
      {other && <SafetyMenu target={{ kind: "user", id: other.id }} user={other} onBlocked={() => router.push("/inbox")} className="shrink-0" />}
    </header>
  );
}

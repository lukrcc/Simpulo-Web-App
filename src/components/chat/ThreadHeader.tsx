"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { SafetyMenu } from "@/components/safety/SafetyMenu";
import { CrewMenu } from "@/components/stay/CrewMenu";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { useFormat } from "@/i18n/format";
import { getCrew, useStore } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { WhosInSheet } from "./WhosInSheet";

/** One 64px row – the desktop panel (rounded top) and the mobile page alike. */
function headerClass(embedded: boolean) {
  return cn(
    "relative flex h-16 shrink-0 items-center gap-2 border-b border-line bg-surface",
    embedded ? "rounded-t-3xl px-4" : "px-2 sm:px-4",
  );
}

function BackToInbox({ embedded }: { embedded: boolean }) {
  const t = useTranslations("messages.thread");
  if (embedded) return null;
  return (
    <Link href="/inbox" aria-label={t("backToMessages")} className="shrink-0 rounded-full p-2 hover:bg-bg">
      <ArrowLeft className="size-5" />
    </Link>
  );
}

/** Pinned on every House thread: House + dates and who's in – one row. Payment and booking status stay on the House page. */
export function CrewHeader({ stay, embedded }: { stay: Stay; embedded: boolean }) {
  const t = useTranslations("messages.thread");
  const f = useFormat();
  const store = useStore();
  const [whosIn, setWhosIn] = useState(false);
  const crew = getCrew(store, stay);

  return (
    <>
      <header className={headerClass(embedded)}>
        <BackToInbox embedded={embedded} />

        {/* The title truncates first; the dates stay. */}
        <div className="flex min-w-0 flex-1 items-baseline gap-1.5">
          <Link href={`/house/${stay.slug}`} className="min-w-0 truncate text-base font-semibold hover:underline">
            {stay.title}
          </Link>
          <span className="shrink-0 text-[13px] text-muted">
            <span aria-hidden>· </span>
            {f.shortRange(stay.startDate, stay.endDate)}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setWhosIn(true)}
          aria-label={t("whosInLabel", { count: crew.length })}
          title={t("whosIn")}
          className="shrink-0 rounded-full p-1 hover:bg-bg"
        >
          <AvatarStack users={crew} size="xs" max={embedded ? 4 : 3} />
        </button>

        <CrewMenu stay={stay} afterLeaveHref="/inbox" />

        <WhosInSheet stay={stay} open={whosIn} onClose={() => setWhosIn(false)} />
      </header>

      {stay.status === "closed" && (
        <p className="shrink-0 border-b border-line bg-bg px-4 py-1.5 text-xs text-muted">{t("closed")}</p>
      )}
    </>
  );
}

/** A 1:1 thread: the other person, and the House it's about – title and dates. */
export function DirectHeader({ stay, other, embedded }: { stay: Stay; other?: User; embedded: boolean }) {
  const t = useTranslations("messages.thread");
  const f = useFormat();
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
        <Link href={`/house/${stay.slug}`} className="block truncate text-[13px] text-muted hover:underline">
          {t("about", { title: stay.title, dates: f.shortRange(stay.startDate, stay.endDate) })}
        </Link>
      </div>
      {/* Blocking ends the chat – it's gone from the inbox, so go back there. */}
      {other && <SafetyMenu target={{ kind: "user", id: other.id }} user={other} onBlocked={() => router.push("/inbox")} className="shrink-0" />}
    </header>
  );
}

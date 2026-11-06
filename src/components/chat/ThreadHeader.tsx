"use client";

import { ArrowLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { iconButtonStyles } from "@/components/ui/IconButton";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { SafetyMenu } from "@/components/safety/SafetyMenu";
import { CrewMenu } from "@/components/stay/CrewMenu";
import { Button } from "@/components/ui/ActionButton";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { Img } from "@/components/ui/Img";
import { useFormat } from "@/i18n/format";
import { findUser, getCrew, useStore } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { cn, housePhotos } from "@/lib/utils";
import { WhosInSheet } from "./WhosInSheet";

/** One 64px row – the desktop panel and the mobile page alike. The glass is the frame's: messages scroll under it. */
function headerClass(embedded: boolean) {
  return cn("relative flex h-16 shrink-0 items-center gap-2", embedded ? "px-4" : "px-2 sm:px-4");
}

function BackToInbox({ embedded }: { embedded: boolean }) {
  const t = useTranslations("messages.thread");
  if (embedded) return null;
  return (
    <Link href="/messages" aria-label={t("backToMessages")} className={iconButtonStyles("md")}>
      <ArrowLeft className="size-5" />
    </Link>
  );
}

/**
 * Pinned on every House thread: the cover, the House, its dates and who's in; once the crew is complete the host's group chat.
 * Payment and booking status stay on the House page.
 */
export function CrewHeader({ stay, embedded }: { stay: Stay; embedded: boolean }) {
  const t = useTranslations("messages.thread");
  const f = useFormat();
  const store = useStore();
  const [whosIn, setWhosIn] = useState(false);
  const crew = getCrew(store, stay);
  const cover = housePhotos(stay, findUser(store, stay.hostId))[0];
  const groupChat = stay.spotsFilled >= stay.spotsTotal ? stay.crewGroupUrl : undefined;

  return (
    <>
      <header className={headerClass(embedded)}>
        <BackToInbox embedded={embedded} />

        {cover && (
          <span className="relative size-10 shrink-0 overflow-hidden rounded-xl bg-line">
            <Img src={cover} alt="" fill sizes="40px" className="object-cover" />
          </span>
        )}
        <div className="ml-1 min-w-0 flex-1">
          <Link href={`/house/${stay.slug}`} className="block truncate text-body font-semibold leading-5 hover:underline">
            {stay.title}
          </Link>
          <p className="truncate text-small text-muted">{t("crewMeta", { dates: f.stayDates(stay), filled: stay.spotsFilled, total: stay.spotsTotal })}</p>
        </div>

        {groupChat && (
          <Button variant="secondary" size="sm" href={groupChat} external className="max-md:hidden">
            {t("openGroupChat")}
            <ArrowUpRight aria-hidden />
          </Button>
        )}

        <button
          type="button"
          onClick={() => setWhosIn(true)}
          aria-label={t("whosInLabel", { count: crew.length })}
          title={t("whosIn")}
          className="shrink-0 rounded-full p-1 hover:bg-bg"
        >
          <AvatarStack users={crew} size="xs" max={embedded ? 4 : 3} />
        </button>

        <CrewMenu stay={stay} afterLeaveHref="/messages" />

        <WhosInSheet stay={stay} open={whosIn} onClose={() => setWhosIn(false)} />
      </header>

      {stay.status === "closed" && (
        <p className="shrink-0 px-4 pb-2 text-small text-muted">{t("closed")}</p>
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
          <Link href={`/u/${other.id}`} className="block truncate text-body font-semibold leading-5 hover:underline">
            {other.name}
          </Link>
        ) : (
          <p className="truncate text-body font-semibold leading-5">{t("unknown")}</p>
        )}
        <Link href={`/house/${stay.slug}`} className="block truncate text-small text-muted hover:underline">
          {t("about", { title: stay.title, dates: f.stayDates(stay) })}
        </Link>
      </div>
      {/* Blocking ends the chat – it's gone from the inbox, so go back there. */}
      {other && <SafetyMenu target={{ kind: "user", id: other.id }} user={other} onBlocked={() => router.push("/messages")} className="shrink-0" />}
    </header>
  );
}

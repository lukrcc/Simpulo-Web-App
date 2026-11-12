"use client";

import { useBack } from "@/components/ui/BackButton";
import { ArrowLeft, ArrowUpRight, Plus } from "lucide-react";
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
import { crewInOf, findUser, getCrew, useStore } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { cn, housePhotos } from "@/lib/utils";
import { shortNameOf } from "@/lib/shortName";
import { WhosInSheet } from "./WhosInSheet";
import { InviteSheet } from "@/components/InviteSheet";
import { useCanInvite } from "@/lib/invites";

/** One 64px row – the desktop panel and the mobile page alike. The glass is the frame's: messages scroll under it. */
function headerClass(embedded: boolean) {
  return cn("relative flex h-16 shrink-0 items-center gap-2 border-b border-ink/8", embedded ? "px-4" : "px-2 sm:px-4");
}

function BackToInbox({ embedded }: { embedded: boolean }) {
  const t = useTranslations("messages.thread");
  // history.back() when there's a page of ours behind it (the installed app has no browser back), the list otherwise.
  const back = useBack("/messages");
  if (embedded) return null;
  return (
    <Link href="/messages" onClick={back} aria-label={t("backToMessages")} className={iconButtonStyles("md")}>
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
  const [inviting, setInviting] = useState(false);
  // "+": bring someone in (components/InviteSheet) – only while a spot is free and the House hasn't started.
  const canBring = useCanInvite(stay.id);
  const tInvite = useTranslations("invite");
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
          <p className="truncate text-small text-muted">{t("crewMeta", { dates: f.stayDates(stay), filled: crewInOf(store, stay), total: stay.spotsTotal })}</p>
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

        {canBring && (
          <button type="button" onClick={() => setInviting(true)} aria-label={tInvite("title")} className={iconButtonStyles("sm")}>
            <Plus className="size-4" aria-hidden />
          </button>
        )}

        <CrewMenu stay={stay} afterLeaveHref="/messages" />

        {canBring && <InviteSheet stay={stay} open={inviting} onClose={() => setInviting(false)} />}
        <WhosInSheet stay={stay} open={whosIn} onClose={() => setWhosIn(false)} />
      </header>

      {stay.status === "closed" && (
        <p className="shrink-0 px-4 pb-2 text-small text-muted">{t("closed")}</p>
      )}
    </>
  );
}

/**
 * A question (1:1 thread): the person's avatar, their first name and muted "about {shortName}" (a link to the House – every direct chat has
 * one); right "…" (Report, Block). The host also gets "View request" when this person asked to join.
 */
export function DirectHeader({ stay, other, embedded }: { stay: Stay; other?: User; embedded: boolean }) {
  const t = useTranslations("messages.thread");
  const router = useRouter();
  const store = useStore();
  const hosting = stay.hostId === store.currentUserId;
  const request = hosting && other ? store.joinRequests.find((r) => r.stayId === stay.id && r.userId === other.id) : undefined;
  return (
    <header className={headerClass(embedded)}>
      <BackToInbox embedded={embedded} />
      {other && <Avatar user={other} size="md" linked />}
      <div className="min-w-0 flex-1">
        {other ? (
          <Link href={`/u/${other.id}`} className="block truncate text-body font-semibold leading-5 hover:underline">
            {other.name.split(" ")[0]}
          </Link>
        ) : (
          <p className="truncate text-body font-semibold leading-5">{t("unknown")}</p>
        )}
        <Link href={`/h/${stay.id}`} className="block truncate text-small text-muted hover:underline">
          {t("aboutShort", { name: shortNameOf(stay) })}
        </Link>
      </div>
      {request && (
        <Button variant="secondary" size="sm" href={`/h/${stay.id}/manage?focus=requests`}>
          {t("viewRequest")}
        </Button>
      )}
      {/* Blocking ends the chat – it's gone from the inbox, so go back there. */}
      {other && <SafetyMenu target={{ kind: "user", id: other.id }} user={other} onBlocked={() => router.push("/messages")} className="shrink-0" />}
    </header>
  );
}

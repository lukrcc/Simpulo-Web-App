"use client";

import { profileHref } from "@/lib/privacy";
import { useBack } from "@/components/ui/BackButton";
import { ArrowLeft, BellOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { iconButtonStyles } from "@/components/ui/IconButton";
import { useTranslations } from "next-intl";
import { openGetHelp } from "@/lib/support/feedback";
import { SafetyMenu } from "@/components/safety/SafetyMenu";
import { useResolvedTheme } from "@/lib/theme";
import { CrewMenu } from "@/components/stay/CrewMenu";
import { Button } from "@/components/ui/ActionButton";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { Img } from "@/components/ui/Img";
import { useFormat } from "@/i18n/format";
import { crewInOf, findUser, getCrew, getCurrentUser, settingsOf, useStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import type { Stay, User } from "@/lib/types";
import { cn, housePhotos } from "@/lib/utils";
import { shortNameOf } from "@/lib/shortName";

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
 * A House's chat head (CLAUDE.md "Messenger ruhig"): the House's picture, its name, "Feb 12–26 · 3 of 5 in" and the crew's faces – the whole
 * head (but the "…") is ONE link into the House's area (/h/[id]); no "View House" button. Right the "…" by role: the host Manage House · Edit
 * House · Stop taking requests | Mute · Get help · Report | Cancel this House (red); a guest Mute · Get help · Report | Leave House (red).
 */
export function CrewHeader({ stay, embedded, threadId }: { stay: Stay; embedded: boolean; threadId: string }) {
  const t = useTranslations("messages.thread");
  const f = useFormat();
  const store = useStore();
  const crew = getCrew(store, stay);
  const cover = housePhotos(stay, findUser(store, stay.hostId))[0];
  const muted = (settingsOf(getCurrentUser(store)).mutedThreads ?? []).includes(threadId);
  const meta = t("crewMeta", { dates: f.stayDates(stay), filled: crewInOf(store, stay), total: stay.spotsTotal });

  return (
    <>
      <header className={headerClass(embedded)}>
        <BackToInbox embedded={embedded} />
        <Link
          href={`/houses/${stay.id}`}
          aria-label={t("openHouseArea", { house: stay.title })}
          className="-my-2 flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2 transition-colors duration-150 hover:bg-ink/4 focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
        >
          <span className="relative size-10 shrink-0 overflow-hidden rounded-xl bg-line">{cover && <Img src={cover} alt="" fill sizes="40px" className="object-cover" />}</span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-body font-semibold leading-5 text-ink">{stay.title}</span>
              {muted && <BellOff aria-label={t("mutedLabel")} className="size-3.5 shrink-0 text-muted" />}
            </span>
            <span className="block truncate text-small text-muted">{meta}</span>
          </span>
          <span className="shrink-0 max-sm:hidden">
            <AvatarStack users={crew} size="xs" max={embedded ? 4 : 3} />
          </span>
        </Link>
        <CrewChatMenu stay={stay} threadId={threadId} />
      </header>

      {stay.status === "closed" && <p className="shrink-0 px-4 pb-2 text-small text-muted">{t("closed")}</p>}
    </>
  );
}

/**
 * The House chat's "…" by role (CLAUDE.md "Messenger ruhig"): the host Manage House · Edit House · Stop taking requests | Mute · Get help ·
 * Report | Cancel this House (red); a guest Mute · Get help · Report | Leave this House (red). The phone's head and the info bar share it.
 */
export function CrewChatMenu({ stay, threadId }: { stay: Stay; threadId: string }) {
  const { dark } = useChatMenu();
  const t = useTranslations("messages.thread");
  const tHelp = useTranslations("help");
  const store = useStore();
  const showToast = useToast();
  const muted = (settingsOf(getCurrentUser(store)).mutedThreads ?? []).includes(threadId);
  return (
    <CrewMenu
      stay={stay}
      afterLeaveHref="/messages"
      hideView
      dark={dark}
      helpItems={[
        {
          label: muted ? t("unmute") : t("mute"),
          onSelect: () => {
            store.toggleMuteThread(threadId);
            showToast(muted ? t("unmutedToast") : t("mutedToast"));
          },
        },
        { label: tHelp("getHelpLink"), onSelect: () => openGetHelp({ houseId: stay.id }) },
        { label: tHelp("report"), onSelect: () => openGetHelp({ houseId: stay.id, category: "safety" }) },
      ]}
    />
  );
}

/**
 * A question (1:1 thread): the person's avatar, their first name and muted "about {shortName}" (a link to the House – every direct chat has
 * one); right "…" (Report, Block). The host also gets "View request" when this person asked to join.
 */
export function DirectHeader({ stay, other, embedded }: { stay: Stay; other?: User; embedded: boolean; threadId: string }) {
  const t = useTranslations("messages.thread");
  const { dark } = useChatMenu();
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
          <Link href={profileHref(other.id)} className="block truncate text-body font-semibold leading-5 hover:underline">
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
        <Button variant="secondary" size="sm" href={`/h/${stay.id}?tab=manage&focus=requests`}>
          {t("viewRequest")}
        </Button>
      )}
      {/* Blocking ends the chat – it's gone from the inbox, so go back there. */}
      {other && (
        <span className="relative flex shrink-0">
          <SafetyMenu target={{ kind: "user", id: other.id }} user={other} onBlocked={() => router.push("/messages")} dark={dark} />
        </span>
      )}
    </header>
  );
}

/** The chat's "…" takes the tone of the chat: dark in dark mode (one calm background per mode – no chat backgrounds to pick any more). */
function useChatMenu() {
  return { dark: useResolvedTheme() === "dark" };
}

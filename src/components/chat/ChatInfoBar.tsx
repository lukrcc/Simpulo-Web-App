"use client";

import { LifeBuoy, Settings2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { SafetyMenu } from "@/components/safety/SafetyMenu";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { iconButtonStyles } from "@/components/ui/IconButton";
import { Img } from "@/components/ui/Img";
import { useFormat } from "@/i18n/format";
import { profileHref } from "@/lib/privacy";
import { shortNameOf } from "@/lib/shortName";
import { crewInOf, findUser, getCrew, useStore } from "@/lib/store";
import { SUPPORT_THREAD_ID } from "@/lib/support/conversation";
import { useResolvedTheme } from "@/lib/theme";
import { housePhotos } from "@/lib/utils";
import { CrewChatMenu } from "./ThreadHeader";

/**
 * The messenger's info bar (CLAUDE.md "Messenger – lange Info-Leiste unten"), from 744px: one flat line across list and chat, a fine line on
 * top, right above the light end of the tab bar – no capsule. A House's chat: its picture and "Fitness House Canggu · 12–26 Feb · 3 of 5 in"
 * (both a link into the House's area), the crew's faces, right the gear (the House's settings: the host Edit House, a guest "Your stay") and
 * the "…" by role. A question (1:1): the person and "About {House}", right "…" (Report, Block). Simpulo Support: its name and line.
 */
export function ChatInfoBar({ threadId }: { threadId: string | null }) {
  const t = useTranslations("messages.thread");
  const tSupport = useTranslations("help.conversation");
  const f = useFormat();
  const store = useStore();
  const router = useRouter();
  const dark = useResolvedTheme() === "dark";
  const thread = threadId ? store.threads.find((x) => x.id === threadId) : undefined;
  const stay = thread ? store.stays.find((s) => s.id === thread.houseId) : undefined;
  const row = "flex h-full min-w-0 items-center gap-3";

  let content = null;
  if (threadId === SUPPORT_THREAD_ID) {
    content = (
      <div className={row}>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-inverse">
          <LifeBuoy aria-hidden className="size-5" />
        </span>
        <span className="min-w-0 truncate text-body text-ink">
          <span className="font-semibold">{tSupport("title")}</span>
          <span className="text-muted"> · {tSupport("subtitle")}</span>
        </span>
      </div>
    );
  } else if (thread && stay && thread.type === "house") {
    const isHost = stay.hostId === store.currentUserId;
    const cover = housePhotos(stay, findUser(store, stay.hostId))[0];
    content = (
      <div className={row}>
        <Link href={`/houses/${stay.id}`} aria-label={t("openHouseArea", { house: stay.title })} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-(--focus-ring)">
          <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-line">{cover && <Img src={cover} alt="" fill sizes="40px" className="object-cover" />}</span>
          <span className="min-w-0 truncate text-body text-ink">
            <span className="font-semibold">{stay.title}</span>
            <span className="text-muted"> · {f.stayDates(stay)} · {t("inCount", { filled: crewInOf(store, stay), total: stay.spotsTotal })}</span>
          </span>
        </Link>
        <span className="shrink-0 max-lg:hidden">
          <AvatarStack users={getCrew(store, stay)} size="xs" max={5} />
        </span>
        <Link href={isHost ? `/your-houses/${stay.id}/edit` : `/houses/${stay.id}?tab=plan`} aria-label={isHost ? t("houseSettings") : t("yourStaySettings")} className={iconButtonStyles("md")}>
          <Settings2 aria-hidden className="size-5" />
        </Link>
        <CrewChatMenu stay={stay} threadId={thread.id} />
      </div>
    );
  } else if (thread && stay) {
    const other = findUser(store, thread.participantIds.find((id) => id !== store.currentUserId) ?? "");
    content = (
      <div className={row}>
        {other && <Avatar user={other} size="md" linked />}
        <span className="min-w-0 flex-1 truncate text-body text-ink">
          {other ? (
            <Link href={profileHref(other.id)} className="font-semibold hover:underline">
              {other.name.split(" ")[0]}
            </Link>
          ) : (
            <span className="font-semibold">{t("unknown")}</span>
          )}
          <Link href={`/house/${stay.slug}`} className="text-muted hover:underline">
            {" · "}
            {t("aboutShort", { name: shortNameOf(stay) })}
          </Link>
        </span>
        {other && <SafetyMenu target={{ kind: "user", id: other.id }} user={other} onBlocked={() => router.push("/messages")} dark={dark} />}
      </div>
    );
  }
  return (
    <div data-chat-info-bar className="h-16 shrink-0 bg-(--chat-bg) px-6">
      {content}
    </div>
  );
}

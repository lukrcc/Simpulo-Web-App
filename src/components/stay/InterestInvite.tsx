"use client";

import { Check, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { AvatarStack } from "@/components/ui/Avatar";
import { buttonClass } from "@/components/ui/button";
import { useToast } from "@/components/ui/Toast";
import { interestsFor } from "@/lib/interests";
import { findUser, useStore } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { cn, firstName } from "@/lib/utils";

/** First names spelled out before "and N more". */
const NAMED = 3;

/**
 * For the host of a House: "X people are interested in this – invite them" when people want its city in its start
 * month (or anytime). Invite tells all of them – notification + email – including those who opted out of being shown;
 * the host only ever sees the ones who opted in, the rest as "and N more". Nothing shows without matching interest.
 */
export function InterestInvite({ stay, className }: { stay: Stay; className?: string }) {
  const t = useTranslations("growth.invite");
  const store = useStore();
  const showToast = useToast();
  if (stay.status === "closed" || stay.status === "completed") return null;
  const matches = interestsFor(store.interests, stay).filter((i) => i.userId !== stay.hostId);
  if (matches.length === 0) return null;

  const shown = matches.flatMap((i) => {
    const user = i.visible ? findUser(store, i.userId) : undefined;
    return user ? [user] : [];
  });
  const hidden = matches.length - shown.length;
  const invitedAt = store.interestInvites[stay.id];
  const names = shown.slice(0, NAMED).map((u: User) => firstName(u));
  const more = matches.length - names.length;

  function invite() {
    store.inviteInterested(stay.id);
    showToast(t("sentToast", { count: matches.length }));
  }

  return (
    <section className={cn("rounded-[24px] bg-white p-6", className)} aria-labelledby={`invite-${stay.id}`}>
      <h2 id={`invite-${stay.id}`} className="text-lg font-semibold tracking-tight text-ink">
        {t("title", { count: matches.length })}
      </h2>
      <p className="mt-1 text-sm text-zinc-600">{t("text", { place: stay.city })}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {shown.length > 0 && <AvatarStack users={shown} size="sm" max={5} />}
        <p className="text-sm text-zinc-600">
          {names.length > 0 ? (more > 0 ? t("namesAndMore", { names: names.join(", "), count: more }) : names.join(", ")) : t("anonymous", { count: hidden })}
        </p>
      </div>
      <div className="mt-5">
        {invitedAt ? (
          <p className="flex items-center gap-2 text-sm font-medium text-ink">
            <Check className="size-4" aria-hidden />
            {t("sent", { count: matches.length })}
          </p>
        ) : (
          <button type="button" onClick={invite} className={buttonClass("dark", "md")}>
            <Send className="size-4" aria-hidden />
            {t("action")}
          </button>
        )}
      </div>
    </section>
  );
}

"use client";

import { Check, Send, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/ActionButton";
import { AvatarStack } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { cardClass } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { interestsFor } from "@/lib/interests";
import { findUser, useStore } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { cn, firstName } from "@/lib/utils";
import { ListRow } from "./DetailSection";

/** First names spelled out before "and N more". */
const NAMED = 3;

/**
 * For the host of a House: "X people are interested in this – invite them" when people want its city in its start
 * month (or anytime). Invite tells all of them – notification + email – including those who opted out of being shown;
 * the host only ever sees the ones who opted in, the rest as "and N more". Nothing shows without matching interest.
 */
/** Who wants this House's city and month (host only) – nothing for closed or completed Houses. */
function useInterest(stay: Stay) {
  const store = useStore();
  if (stay.status === "closed" || stay.status === "completed") return null;
  const matches = interestsFor(store.interests, stay).filter((i) => i.userId !== stay.hostId);
  if (matches.length === 0) return null;
  const shown = matches.flatMap((i) => {
    const user = i.visible ? findUser(store, i.userId) : undefined;
    return user ? [user] : [];
  });
  const names = shown.slice(0, NAMED).map((u: User) => firstName(u));
  return {
    matches,
    shown,
    hidden: matches.length - shown.length,
    names,
    more: matches.length - names.length,
    invitedAt: store.interestInvites[stay.id],
    invite: () => store.inviteInterested(stay.id),
  };
}

/**
 * Your houses → "Interested & invites": "N people are interested", faces and names, and "Invite them" (or that they
 * were invited). Nothing without matching interest.
 */
export function InterestLine({ stay }: { stay: Stay }) {
  const t = useTranslations("growth.invite");
  const tSection = useTranslations("houses.detail.sections");
  const showToast = useToast();
  const interest = useInterest(stay);
  if (!interest) return null;
  const { matches, shown, hidden, names, more, invitedAt } = interest;

  return (
    <ListRow
      lead={<Users aria-hidden />}
      title={tSection("interestedLine", { count: matches.length })}
      subtitle={names.length > 0 ? (more > 0 ? t("namesAndMore", { names: names.join(", "), count: more }) : names.join(", ")) : t("anonymous", { count: hidden })}
      aside={shown.length > 0 && <AvatarStack users={shown} size="xs" max={4} />}
      action={
        invitedAt ? (
          <Badge icon={<Check aria-hidden />}>{tSection("invitedThem")}</Badge>
        ) : (
          <Button
            variant="tertiary"
            onClick={() => {
              interest.invite();
              showToast(t("sentToast", { count: matches.length }));
            }}
          >
            {tSection("inviteThem")}
          </Button>
        )
      }
    />
  );
}

export function InterestInvite({ stay, className }: { stay: Stay; className?: string }) {
  const t = useTranslations("growth.invite");
  const showToast = useToast();
  const interest = useInterest(stay);
  if (!interest) return null;
  const { matches, shown, hidden, names, more, invitedAt } = interest;

  function invite() {
    interest!.invite();
    showToast(t("sentToast", { count: matches.length }));
  }

  return (
    <section className={cn(cardClass, className)} aria-labelledby={`invite-${stay.id}`}>
      <h2 id={`invite-${stay.id}`} className="text-lg font-semibold tracking-tight text-ink">
        {t("title", { count: matches.length })}
      </h2>
      <p className="mt-1 text-sm text-muted">{t("text", { place: stay.city })}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {shown.length > 0 && <AvatarStack users={shown} size="sm" max={5} />}
        <p className="text-sm text-muted">
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
          <Button variant="secondary" onClick={invite}>
            <Send aria-hidden />
            {t("action")}
          </Button>
        )}
      </div>
    </section>
  );
}

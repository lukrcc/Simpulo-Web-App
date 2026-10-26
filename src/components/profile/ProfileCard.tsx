"use client";

import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { CrewContacts } from "@/components/ui/CrewContacts";
import { LanguageChips } from "@/components/ui/LanguageChips";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { SocialRow } from "@/components/ui/SocialRow";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { useFormat } from "@/i18n/format";
import type { User } from "@/lib/types";
import { PastCrews, type PastCrewMate } from "./PastCrews";

interface ProfileCardProps {
  user: User;
  /** "1 hosted · 3 joined" – links on /profile, plain text in the Edit profile preview */
  stats?: ReactNode;
  /** Crew-only channels (after a divider and a lock) – only for viewers who may see them */
  showCrewContacts: boolean;
  pastCrewMates: PastCrewMate[];
  /** Button row at the bottom (Edit/Preview/Share, Message, Notify me …) */
  actions?: ReactNode;
}

/** The compact profile card – on /profile and, fed with the draft, as the live preview on Edit profile. */
export function ProfileCard({ user, stats, showCrewContacts, pastCrewMates, actions }: ProfileCardProps) {
  const t = useTranslations("profile");
  const tContacts = useTranslations("common.ui.crewContacts");
  const f = useFormat();

  return (
    <div className="rounded-[24px] bg-white p-6">
      {/* Header: photo left; name, meta and stats right. */}
      <div className="flex items-center gap-4">
        <PersonPhoto src={user.photos[0]} alt={user.name} size={80} className="size-20" />
        <div className="min-w-0">
          <h1 className="flex items-center gap-1 text-2xl font-bold tracking-tight">
            <span className="truncate">{user.name}</span>
            {user.verified && <VerifiedBadge />}
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {f.ageAndCountry(user)}
            {user.city && ` · ${t("basedIn", { city: user.city })}`}
          </p>
          {stats && <p className="mt-0.5 text-sm text-zinc-500">{stats}</p>}
        </div>
      </div>

      {/* One icon row: public links, then (for crew only) a divider, a lock and the crew-only channels. */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <SocialRow user={user} />
        {/* Divider, lock and channels wrap as one group, so the divider never ends up alone at a line end. */}
        {showCrewContacts && (
          <span title={tContacts("crewOnly")} className="flex items-center gap-2">
            <span aria-hidden className="mx-1 h-6 w-px bg-black/10" />
            <Lock className="size-3.5 text-zinc-400" role="img" aria-label={tContacts("crewOnly")} />
            <CrewContacts user={user} />
          </span>
        )}
      </div>
      <LanguageChips languages={user.languages} compact className="mt-3" />

      {user.bio && <p className="mt-5 border-t border-black/5 pt-5 text-base leading-[1.6] text-neutral-700">{user.bio}</p>}
      <PastCrews user={user} mates={pastCrewMates} />

      {actions && <div className="mt-5 flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

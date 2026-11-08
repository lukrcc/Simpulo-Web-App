"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { LanguageChips } from "@/components/ui/LanguageChips";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { SocialRow } from "@/components/ui/SocialRow";
import { ProHostLabel } from "@/components/ui/ProHostLabel";
import { cardClass } from "@/components/ui/Card";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { useFormat } from "@/i18n/format";
import type { User } from "@/lib/types";
import { Crews, LivedWithSection, type OwnPeople, type ProfileCrews } from "./Crews";

interface ProfileCardProps {
  user: User;
  /** "1 hosted · 3 joined" – links on /profile, plain text in the Edit profile preview */
  stats?: ReactNode;
  /** Under the bio: "People · N" (own) or "Crews" (someone else's) – null: nothing to show yet */
  crews: OwnPeople | ProfileCrews | null;
  /** Button row at the bottom (Edit/Preview/Share, Message, Notify me …) */
  actions?: ReactNode;
}

/** The compact profile card – on /profile and, fed with the draft, as the live preview on Edit profile. */
export function ProfileCard({ user, stats, crews, actions }: ProfileCardProps) {
  const t = useTranslations("profile");
  const f = useFormat();

  return (
    <div className={cardClass}>
      {/* Header: photo left; name, meta and stats right. */}
      <div className="flex items-center gap-4">
        <PersonPhoto src={user.photos[0]} alt={user.name} size={80} className="size-20" />
        <div className="min-w-0">
          <h1 className="flex items-center gap-1 text-h2">
            <span className="truncate">{user.name}</span>
            {user.verified && <VerifiedBadge />}
          </h1>
          <p className="mt-0.5 text-small text-muted">
            {f.ageAndCountry(user, true)}
            {user.city && ` · ${t("basedIn", { city: user.city })}`}
          </p>
          {stats && <p className="mt-0.5 text-small text-muted">{stats}</p>}
          <ProHostLabel user={user} className="mt-1.5" />
        </div>
      </div>

      {/* The public links, as the host ordered them (at most 4). Contact happens in Messages. */}
      <SocialRow user={user} className="mt-5" />
      <LanguageChips languages={user.languages} compact className="mt-3" />

      {user.bio && <p className="mt-5 pt-5 text-body leading-[1.6] text-ink">{user.bio}</p>}
      {crews?.kind === "own" && <LivedWithSection entries={crews.entries} />}
      {crews?.kind === "theirs" && <Crews crews={crews} />}

      {actions && <div className="mt-5 flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

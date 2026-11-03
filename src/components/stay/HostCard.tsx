import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { buttonStyles } from "@/components/ui/ActionButton";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { SocialRow } from "@/components/ui/SocialRow";
import { ProHostLabel } from "@/components/ui/ProHostLabel";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import type { User } from "@/lib/types";

/** Who's hosting. Avatar, name and "View profile" all link to the profile. */
export function HostCard({ host, action }: { host: User; /** Beside "View profile": Message */ action?: ReactNode }) {
  const t = useTranslations("house.hostCard");
  const profile = `/u/${host.id}`;

  return (
    <div className="flex gap-4">
      <Link href={profile} className="shrink-0 self-start rounded-full" aria-label={t("profile", { name: host.name })}>
        <PersonPhoto src={host.photos[0]} alt={host.name} size={72} className="size-18" />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
          <Link href={profile} className="font-semibold text-ink hover:underline">
            {t("identity", { name: host.name, age: host.age, country: host.country })}
          </Link>
          {host.verified && <VerifiedBadge />}
        </div>
        <ProHostLabel user={host} className="mt-1" />
        {host.languages.length > 0 && <p className="mt-0.5 text-small text-muted">{t("speaks", { languages: host.languages.join(", ") })}</p>}
        <SocialRow user={host} size="sm" className="mt-3" />
        {host.bio && <p className="mt-3 line-clamp-2 text-body text-ink">{host.bio}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <Link href={profile} className={buttonStyles("tertiary", "md")}>
            {t("viewProfile")}
          </Link>
          {action}
        </div>
      </div>
    </div>
  );
}

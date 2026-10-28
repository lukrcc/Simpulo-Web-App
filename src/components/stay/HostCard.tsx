import Link from "next/link";
import { useTranslations } from "next-intl";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { SocialRow } from "@/components/ui/SocialRow";
import { ProHostLabel } from "@/components/ui/ProHostLabel";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import type { User } from "@/lib/types";

/** Side card on the House page: who's hosting. Avatar, name and "View profile" all link to the profile. */
export function HostCard({ host }: { host: User }) {
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
        {host.languages.length > 0 && <p className="mt-0.5 text-sm text-zinc-500">{t("speaks", { languages: host.languages.join(", ") })}</p>}
        <SocialRow user={host} size="sm" className="mt-3" />
        {host.bio && <p className="mt-3 line-clamp-2 text-sm text-neutral-700">{host.bio}</p>}
        <Link href={profile} className="mt-2 inline-block text-sm font-medium text-ink underline underline-offset-2 hover:text-zinc-600">
          {t("viewProfile")}
        </Link>
      </div>
    </div>
  );
}

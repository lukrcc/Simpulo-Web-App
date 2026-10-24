import { BadgeCheck } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { SocialRow } from "@/components/ui/SocialRow";
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
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <Link href={profile} className="font-semibold text-ink hover:underline">
            {t("identity", { name: host.name, age: host.age, country: host.country })}
          </Link>
          {host.verified && (
            <span title={t("verified")} className="inline-flex shrink-0">
              <BadgeCheck className="size-4 text-zinc-500" role="img" aria-label={t("verified")} />
            </span>
          )}
        </div>
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

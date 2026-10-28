import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { AvatarStack } from "@/components/ui/Avatar";
import { useFormat } from "@/i18n/format";
import type { Stay, User } from "@/lib/types";
import { stayNights } from "@/lib/utils";

/** Title block: House title, "Feb 12–26, 2027 · 14 nights · Canggu, Bali", then the crew row. */
export function StayFacts({ stay, crew, action }: { stay: Stay; crew: User[]; /** Next to the title, e.g. the heart */ action?: ReactNode }) {
  const t = useTranslations("house.facts");
  const format = useFormat();
  const spotsLeft = Math.max(0, stay.spotsTotal - stay.spotsFilled);

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{stay.title}</h1>
        {action}
      </div>
      {stay.language !== "en" && (
        <p className="mt-1 text-sm text-zinc-500">{t("language", { language: format.language(stay.language) })}</p>
      )}
      <p className="mt-2 text-neutral-600">
        {t("line", {
          dates: format.longRange(stay.startDate, stay.endDate),
          nights: format.nights(stayNights(stay)),
          place: format.shortPlaceLabel(stay),
        })}
      </p>
      {stay.ageRange && <p className="mt-1 text-sm text-zinc-500">{t("ageRange", { min: stay.ageRange.min, max: stay.ageRange.max })}</p>}
      <div className="mt-4 flex items-center gap-3">
        {/* Host first, then accepted guests – each links to their profile. */}
        <AvatarStack users={crew} size="sm" max={6} linked />
        <p className="text-sm text-neutral-600">
          <span className="font-medium text-ink">
            {t("spotsIn", { filled: stay.spotsFilled, total: stay.spotsTotal })}
          </span>{" "}
          · {spotsLeft > 0 ? t("spotsLeft", { count: spotsLeft }) : t("crewComplete")}
        </p>
      </div>
    </div>
  );
}

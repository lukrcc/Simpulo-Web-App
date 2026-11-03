import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { AvatarStack } from "@/components/ui/Avatar";
import { CrewLine } from "@/components/ui/CrewLine";
import { useFormat } from "@/i18n/format";
import type { Stay, User } from "@/lib/types";
import { stageTransition } from "@/lib/houseTransition";
import { stayNights } from "@/lib/utils";

/** Title block: House title, "Feb 12–26, 2027 · 14 nights · Canggu, Bali", then the crew row. */
export function StayFacts({ stay, crew, action }: { stay: Stay; crew: User[]; /** Next to the title, e.g. the heart */ action?: ReactNode }) {
  const t = useTranslations("house.facts");
  const format = useFormat();
  // Spots held by invites from a past crew, or reserved by invite links: not open, not taken yet.
  const spotsNote = [stay.spotsInvited ? t("invited", { count: stay.spotsInvited }) : null, stay.spotsReserved ? t("reserved", { count: stay.spotsReserved }) : null].filter(Boolean).join(" · ");

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <h1 style={stageTransition("title", stay.id)} className="text-h2 tracking-tight">{stay.title}</h1>
        {action}
      </div>
      {stay.language !== "en" && (
        <p className="mt-1 text-small text-muted">{t("language", { language: format.language(stay.language) })}</p>
      )}
      <p className="mt-2 text-muted">
        {t("line", {
          dates: format.longRange(stay.startDate, stay.endDate),
          nights: format.nights(stayNights(stay)),
          place: format.placeLabel(stay),
        })}
      </p>
      {stay.ageRange && <p className="mt-1 text-small text-muted">{t("ageRange", { min: stay.ageRange.min, max: stay.ageRange.max })}</p>}
      <div className="mt-4 flex items-center gap-3">
        {/* Host first, then accepted guests – each links to their profile. */}
        <AvatarStack users={crew} size="sm" max={6} linked />
        <CrewLine stay={stay} />
        {spotsNote && <p className="min-w-0 text-small text-muted">{spotsNote}</p>}
      </div>
    </div>
  );
}

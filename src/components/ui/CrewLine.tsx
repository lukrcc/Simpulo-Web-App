import { useTranslations } from "next-intl";
import type { Stay } from "@/lib/types";
import { cn, openSpots } from "@/lib/utils";

type CrewStay = Pick<Stay, "spotsTotal" | "spotsFilled" | "spotsInvited" | "spotsReserved">;

/**
 * How many are in, everywhere a House shows: "Just opened · 4 spots" · "3 of 6 in" · "1 spot left" (accent) · "Crew complete"
 * (muted). `onDark`: over a card's photo.
 */
export function CrewLine({ stay, inCrew, onDark = false, className }: { stay: CrewStay; /** Who's in, host included (crewInOf); default the stored count, at least the host */ inCrew?: number; onDark?: boolean; className?: string }) {
  const t = useTranslations("common.ui.crewLine");
  const open = openSpots(stay);
  // The host always counts: never "0 of 4".
  const filled = Math.max(stay.spotsFilled, inCrew ?? 1, 1);
  const base = onDark ? "text-on-image/85" : "text-muted";
  if (filled >= stay.spotsTotal) return <span className={cn("text-small", onDark ? "text-on-image/60" : "text-muted", className)}>{t("complete")}</span>;
  if (open === 1) return <span className={cn("text-small font-semibold text-accent", className)}>{t("oneLeft")}</span>;
  if (filled <= 1) return <span className={cn("text-small", base, className)}>{t("justOpened", { count: open })}</span>;
  return <span className={cn("text-small", base, className)}>{t("partial", { filled, total: stay.spotsTotal })}</span>;
}

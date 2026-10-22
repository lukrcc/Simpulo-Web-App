import { Lock, LockOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFormat } from "@/i18n/format";
import type { Stay } from "@/lib/types";
import { cn } from "@/lib/utils";

/** "Locked · €480 pp" or "Accommodation open". */
export function AccommodationChip({ stay }: { stay: Stay }) {
  const t = useTranslations("house.accommodationChip");
  const format = useFormat();
  const locked = stay.accommodationStatus === "locked";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        locked ? "bg-accent-soft text-accent" : "bg-black/5 text-zinc-600",
      )}
    >
      {locked ? <Lock className="size-3" aria-hidden /> : <LockOpen className="size-3" aria-hidden />}
      {locked
        ? stay.pricePerPerson
          ? t("lockedPrice", { price: format.price(stay.pricePerPerson, stay.currency) })
          : t("locked")
        : t("open")}
    </span>
  );
}

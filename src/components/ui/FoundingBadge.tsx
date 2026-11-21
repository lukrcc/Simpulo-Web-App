import { Award } from "lucide-react";
import { useTranslations } from "next-intl";
import { FOUNDING_HOST } from "@/config/policies";
import { cn } from "@/lib/utils";

/**
 * The Founding Host mark (lib/founding.ts isFoundingHost): an award ribbon in the text's colour – beside the name on the profile, the House
 * card's host notch and the House page. Its tooltip "One of the first 50 hosts on Simpulo" (data-tooltip-info: shown on touch too, by a long
 * press). `label` adds the words "Founding Host" (the profile, the House page); the notch shows the mark alone.
 */
export function FoundingBadge({ size = 16, label = false, className }: { size?: 14 | 16; label?: boolean; className?: string }) {
  const t = useTranslations("founding");
  const tip = t("tooltip", { count: FOUNDING_HOST.limit });
  return (
    <span data-tooltip-info={tip} data-founding-badge className={cn("inline-flex shrink-0 items-center gap-1", label && "text-small font-semibold", className)}>
      <Award size={size} strokeWidth={2} aria-hidden={label} role={label ? undefined : "img"} aria-label={label ? undefined : t("label")} />
      {label && <span>{t("label")}</span>}
      <span className="sr-only">{tip}</span>
    </span>
  );
}

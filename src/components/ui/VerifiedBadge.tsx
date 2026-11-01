import { BadgeCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const ON_DARK = { filter: "drop-shadow(0 0 2px color-mix(in srgb, var(--ink) 45%, transparent))" };

/**
 * The one "ID verified" mark: lucide's scalloped BadgeCheck seal as an orange outline (16px; 14px in the notched
 * tab). `onDark`: a soft shadow behind it so it stays legible on photo overlays.
 */
export function VerifiedBadge({ size = 16, onDark = false, className }: { size?: 14 | 16; onDark?: boolean; className?: string }) {
  const t = useTranslations("common.ui");
  return (
    <span title={t("verified")} className={cn("inline-flex shrink-0 text-accent", className)}>
      <BadgeCheck size={size} strokeWidth={2} color="currentColor" fill="none" role="img" aria-label={t("verified")} style={onDark ? ON_DARK : undefined} />
    </span>
  );
}

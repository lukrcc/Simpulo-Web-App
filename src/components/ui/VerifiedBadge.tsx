import { BadgeCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const ON_DARK = { filter: "drop-shadow(0 0 2px color-mix(in srgb, var(--text) 45%, transparent))" };

/**
 * The one "ID verified" mark: lucide's scalloped BadgeCheck seal as an orange outline (16px; 14px in the notched
 * tab). `onDark`: a soft shadow behind it so it stays legible on photo overlays.
 */
export function VerifiedBadge({ size = 16, onDark = false, className }: { size?: 14 | 16; onDark?: boolean; className?: string }) {
  const t = useTranslations("common.ui");
  const tVerify = useTranslations("verification");
  // Only from Stripe Identity (User.verified, set when the ID check says "verified"); the payout onboarding doesn't set it.
  return (
    <span data-tooltip={tVerify("tooltip")} className={cn("inline-flex shrink-0 text-accent", className)}>
      <BadgeCheck size={size} strokeWidth={2} color="currentColor" fill="none" role="img" aria-label={t("verified")} style={onDark ? ON_DARK : undefined} />
    </span>
  );
}

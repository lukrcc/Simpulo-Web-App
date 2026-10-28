import { useTranslations } from "next-intl";
import { useFeatureFlag } from "@/lib/featureFlags";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

/** "Pro host · Surf coach · ISA Level 2" – small and neutral (never orange). Nothing without the hostPremium flag. */
export function ProHostLabel({ user, className }: { user: Pick<User, "isPro" | "proTitle">; className?: string }) {
  const t = useTranslations("growth.premium");
  const hostPremium = useFeatureFlag("hostPremium");
  if (!hostPremium || !user.isPro) return null;
  return (
    <p className={cn("flex min-w-0 items-center gap-1.5 text-[13px] text-zinc-600", className)}>
      <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium text-zinc-700">{t("proHost")}</span>
      {user.proTitle && <span className="truncate">{user.proTitle}</span>}
    </p>
  );
}

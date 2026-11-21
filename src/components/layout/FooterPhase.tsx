"use client";

// The large footer's parts that depend on the platform phase (config/platform.ts – read after hydration, so client-side).
import { useTranslations } from "next-intl";
import { useJoinWaitlist } from "@/components/platform/useJoinWaitlist";
import { Button } from "@/components/ui/ActionButton";
import { showsWaitlist, usePlatformPhase } from "@/config/platform";

/** Pre-launch: "Join the waitlist" on top of the large footer (the waitlist sheet). */
export function FooterWaitlist() {
  const t = useTranslations("footer.large");
  const join = useJoinWaitlist({ from: "footer" });
  if (!showsWaitlist(usePlatformPhase())) return null;
  return (
    <div className="mb-12 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-10">
      <p className="text-h3 text-ink">{t("waitlistLine")}</p>
      <Button onClick={join}>{t("waitlist")}</Button>
    </div>
  );
}

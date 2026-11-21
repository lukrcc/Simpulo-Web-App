"use client";

// The large footer's parts that depend on the platform phase (config/platform.ts – read after hydration, so client-side).
import Link from "next/link";
import { useTranslations } from "next-intl";
import { HOST_APPLY_HREF, useJoinWaitlist } from "@/components/platform/useJoinWaitlist";
import { Button } from "@/components/ui/ActionButton";
import { useOpenHouseEntry } from "@/components/platform/useOpenHouseEntry";
import { showsFoundingHosts, showsWaitlist, usePlatformPhase } from "@/config/platform";

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

/** The Host column's first link: "Open a House" – before the launch without an accepted application "Apply to host" (→ /apply). */
export function OpenHouseFooterLink({ className }: { className?: string }) {
  const entry = useOpenHouseEntry();
  return (
    <li>
      <Link href={entry.href} className={className}>
        {entry.label}
      </Link>
    </li>
  );
}

/** Pre-launch and beta: "Founding Hosts" in the Host column (→ the host application) – not beside an "Apply to host" that says the same. */
export function FoundingHostsLink({ className }: { className?: string }) {
  const t = useTranslations("footer.large");
  const entry = useOpenHouseEntry();
  if (!showsFoundingHosts(usePlatformPhase()) || !entry.allowed) return null;
  return (
    <li>
      <Link href={HOST_APPLY_HREF} className={className}>
        {t("foundingHosts")}
      </Link>
    </li>
  );
}

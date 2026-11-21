"use client";

// Re-entry (CLAUDE.md "Onboarding"): whoever left the onboarding half-way sees, on a later visit, one small card – "Finish your profile"
// (guest) or "Ready to host?" / "You're a Founding Host" (host). Once: shown means seen (onboarding.finishCardSeen / hostCardSeen), ✕ hides it.
import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/ActionButton";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { IconButton } from "@/components/ui/IconButton";
import { isFoundingHost } from "@/lib/founding";
import { hostOnboardingComplete, onboardingOpenedThisLoad, profileProgress, showsFinishCard } from "@/lib/onboarding";
import { useTodayIso } from "@/lib/birthDate";
import { getCurrentUser, useStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { useHostSteps } from "./HostOnboarding";

/** Pages where the card would be in the way (the onboarding itself, flows with their own header, admin, the password page). */
const QUIET = ["/settings/profile", "/welcome", "/create", "/admin", "/preview", "/get", "/messages/"];
/** Where the host checklist already stands (Earnings, a House's Manage) – no second reminder there. */
const HOST_QUIET = ["/your-houses/payouts", "/h/", "/apply"];

export function ResumeCard() {
  const hydrated = useHydrated();
  const store = useStore();
  const me = getCurrentUser(store);
  const today = useTodayIso();
  const path = usePathname() ?? "/";
  const steps = useHostSteps(me);
  const t = useTranslations("onboarding");
  const [closed, setClosed] = useState(false);

  const o = me?.settings?.onboarding;
  const quiet = QUIET.some((p) => path.startsWith(p));
  // Guest first: a profile left half-way. Host: an accepted Founding Host who never started, or a host onboarding left half-way.
  const guest = hydrated && !quiet && showsFinishCard(me, today);
  const host =
    hydrated &&
    !quiet &&
    !HOST_QUIET.some((p) => path.startsWith(p)) &&
    !guest &&
    !!me &&
    !onboardingOpenedThisLoad() &&
    !o?.hostCardSeen &&
    o?.host !== "done" &&
    steps.length > 0 &&
    !hostOnboardingComplete(steps) &&
    (o?.host === "started" || (o?.host === undefined && isFoundingHost(me)));
  const kind = guest ? "guest" : host ? "host" : null;

  // Shown once: mark it seen the moment it appears – it doesn't come back on the next visit, dismissed or not.
  const { setOnboarding } = store;
  // Kept once shown (it stays up after the flag flips); the flag is written in the effect below.
  const [shownKind, setShownKind] = useState<typeof kind>(null);
  if (kind && !shownKind) setShownKind(kind);
  useEffect(() => {
    if (shownKind) setOnboarding(shownKind === "guest" ? { finishCardSeen: true } : { hostCardSeen: true });
  }, [shownKind, setOnboarding]);

  const show = shownKind && !closed && me;
  if (!show) return null;
  const progress = profileProgress(me, today);
  const isGuest = shownKind === "guest";
  const href = isGuest ? "/settings/profile?setup=1" : "/welcome/host";
  return (
    <GlassPanel
      role="complementary"
      data-resume-card={shownKind}
      aria-label={isGuest ? t("finishCard.title") : t("hostCard.titleHost")}
      className="fixed bottom-[calc(var(--bottom-clear)+16px)] right-(--page-margin) z-[60] flex w-[min(360px,calc(100vw-2*var(--page-margin)))] flex-col gap-3 rounded-[20px] p-5 shadow-(--shadow-float)"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-h3 text-ink">{isGuest ? t("finishCard.title") : isFoundingHost(me) && o?.host === undefined ? t("hostCard.title") : t("hostCard.titleHost")}</p>
          <p className="mt-1 text-body text-muted">{isGuest ? t("finishCard.text", { done: progress.done, total: progress.total }) : t("hostCard.text")}</p>
        </div>
        <IconButton size="sm" aria-label={isGuest ? t("finishCard.dismiss") : t("hostCard.dismiss")} onClick={() => setClosed(true)}>
          <X className="size-4" aria-hidden />
        </IconButton>
      </div>
      <Button href={href} size="sm" className="self-start">
        {isGuest ? t("finishCard.action") : t("hostCard.action")}
      </Button>
    </GlassPanel>
  );
}

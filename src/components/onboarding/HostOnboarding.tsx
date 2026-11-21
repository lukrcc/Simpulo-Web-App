"use client";

// The host's onboarding (CLAUDE.md "Onboarding"): /welcome/host after an accepted application (pre-launch, beta) or before the first
// "Open a House" in live – welcome as (Founding) Host → save your place (Host from your place, optional) → payouts (Stripe; needed before the
// first payout, not before opening) → the first House. The same steps as a compact checklist in Manage and Earnings until all are done.
import { Check, Circle, Minus } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { Container } from "@/components/layout/Container";
import { PayoutSetupSheet } from "@/components/payouts/PayoutSetup";
import { Button } from "@/components/ui/ActionButton";
import { FoundingBadge } from "@/components/ui/FoundingBadge";
import type { HostOnboardingStep } from "@/config/onboarding";
import { isFoundingHost } from "@/lib/founding";
import { hostOnboardingComplete, hostSteps, type HostStep } from "@/lib/onboarding";
import { usePayoutAccount } from "@/lib/payments/hooks";
import { getCurrentUser, useStore } from "@/lib/store";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

/** The steps for the person signed in (payouts from the payout account). */
export function useHostSteps(me: User | undefined): HostStep[] {
  const store = useStore();
  const { status } = usePayoutAccount();
  return me ? hostSteps(store, me, status === "active") : [];
}

function StepList({ steps, me, compact = false }: { steps: HostStep[]; me: User; compact?: boolean }) {
  const t = useTranslations("onboarding.host");
  const store = useStore();
  const [payouts, setPayouts] = useState(false);
  const founding = isFoundingHost(me);
  const text = (id: HostOnboardingStep) => (id === "welcome" && founding ? "welcomeFounding" : id);
  return (
    <>
      <ol className="flex flex-col divide-y divide-ink/8 border-y border-ink/8">
        {steps.map((s) => (
          <li key={s.id} data-host-step={s.id} data-host-step-state={s.done ? "done" : s.skipped ? "skipped" : "open"} className="flex items-start gap-3 py-4">
            <span aria-hidden className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full", s.done ? "bg-ink text-(--action-text)" : "border border-ink/20 text-ink/40")}>
              {s.done ? <Check className="size-3.5" strokeWidth={3} /> : s.skipped ? <Minus className="size-3.5" /> : <Circle className="size-2" fill="currentColor" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn("text-body font-semibold", s.done || s.skipped ? "text-muted" : "text-ink")}>
                {t(`steps.${text(s.id)}.title` as "steps.welcome.title")}
                {(s.done || s.skipped) && <span className="ml-2 text-small font-normal text-muted">{s.done ? t("done") : t("skipped")}</span>}
              </p>
              {!compact && <p className="mt-0.5 text-body text-muted">{t(`steps.${text(s.id)}.text` as "steps.welcome.text")}</p>}
              {!s.done && !s.skipped && s.id !== "welcome" && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {s.id === "place" && (
                    <>
                      <Button href="/create" size="sm" variant="secondary">
                        {t("steps.place.action")}
                      </Button>
                      <Button size="sm" variant="tertiary" onClick={() => store.setOnboarding({ hostSkipped: [...new Set([...(me.settings?.onboarding?.hostSkipped ?? []), "place"])] })}>
                        {t("steps.place.skip")}
                      </Button>
                    </>
                  )}
                  {s.id === "payouts" && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => setPayouts(true)}>
                        {t("steps.payouts.action")}
                      </Button>
                      <span className="text-small text-muted">{t("steps.payouts.later")}</span>
                    </>
                  )}
                  {s.id === "house" && (
                    <Button href="/create" size="sm">
                      {t("steps.house.action")}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
      <PayoutSetupSheet open={payouts} onClose={() => setPayouts(false)} />
    </>
  );
}

export function HostOnboarding() {
  const t = useTranslations("onboarding.host");
  return (
    <RequireLogin title={t("metaTitle")}>
      <HostOnboardingContent />
    </RequireLogin>
  );
}

function HostOnboardingContent() {
  const t = useTranslations("onboarding.host");
  const store = useStore();
  const me = getCurrentUser(store);
  const steps = useHostSteps(me);
  const { setOnboarding } = store;
  const state = me?.settings?.onboarding?.host;
  // Opening this page is the welcome: started from now on (done once every step is).
  useEffect(() => {
    if (me && state === undefined) setOnboarding({ host: "started" });
  }, [me, state, setOnboarding]);
  const complete = steps.length > 0 && hostOnboardingComplete(steps);
  useEffect(() => {
    if (complete && state === "started") setOnboarding({ host: "done" });
  }, [complete, state, setOnboarding]);
  if (!me) return null;
  const founding = isFoundingHost(me);
  const done = steps.filter((s) => s.done || s.skipped).length;
  return (
    <Container page width="narrow" className="pb-(--space-section)">
      <p className="text-eyebrow uppercase text-muted">{t("eyebrow")}</p>
      <h1 className="mt-2 text-h1 text-ink">{founding ? t("titleFounding") : t("title")}</h1>
      {founding && <FoundingBadge label className="mt-2 text-ink" />}
      <p className="mt-3 text-body-lg text-muted">{t("intro")}</p>
      <p className="mt-6 text-small font-semibold text-ink">{t("progress", { done, total: steps.length })}</p>
      <div className="mt-2">
        <StepList steps={steps} me={me} />
      </div>
      {complete && <p className="mt-6 text-body font-semibold text-ink">{t("allDone")}</p>}
    </Container>
  );
}

/** The checklist in Manage and Earnings – only while host onboarding has started and isn't complete. */
export function HostChecklist() {
  const t = useTranslations("onboarding.host");
  const store = useStore();
  const me = getCurrentUser(store);
  const steps = useHostSteps(me);
  if (!me || me.settings?.onboarding?.host === undefined || steps.length === 0 || hostOnboardingComplete(steps)) return null;
  return (
    <section data-host-checklist aria-labelledby="host-checklist" className="flex flex-col gap-2">
      <h2 id="host-checklist" className="text-subhead text-ink">
        {t("checklistTitle")}
      </h2>
      <p className="text-small text-muted">
        {t("progress", { done: steps.filter((s) => s.done || s.skipped).length, total: steps.length })} ·{" "}
        <Link href="/welcome/host" className="font-semibold text-ink underline-offset-4 hover:underline">
          {t("eyebrow")} →
        </Link>
      </p>
      <StepList steps={steps} me={me} compact />
    </section>
  );
}
